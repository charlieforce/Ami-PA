#!/usr/bin/env python3
"""The Organizer: find what belongs together.

Tasks arrive from four places - chat, notes, the board, Ami herself - and
none of them know about each other. Five tasks about FundiConnect sit in a
pile with everything else.

So the button asks one question: what belongs together, and what is the
same thing twice? He ticks what is right; nothing moves without him.

Run from the src folder with:  python3 organizer.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

EP = '''@app.post("/api/tasks/group")
@require_password
def group_tasks():
    """Look at the open board and say what belongs together. Suggests only."""
    try:
        import json as _j, re as _r
        tasks = db.query("""SELECT id, title, description, venture_id, due_date, source
                            FROM tasks
                            WHERE status NOT IN ('done','cancelled','completed')
                            ORDER BY created_at DESC LIMIT 60""") or []
        if len(tasks) < 2:
            return {"status": "success", "suggestions": [],
                    "note": "Not enough on the board to group yet."}

        ventures = {r['id']: r['name'] for r in (db.query(
            "SELECT id, name FROM ventures WHERE COALESCE(active,1)=1") or [])}

        lines = []
        for t in tasks:
            v = ventures.get(t.get('venture_id'))
            lines.append(str(t['id']) + ". " + str(t['title'])[:90]
                         + (" [" + v + "]" if v else " [no venture]"))

        prompt = (
            "These are the open tasks on one person's board. They were added from "
            "different places at different times, so related work is scattered.\\n\\n"
            + "\\n".join(lines)
            + "\\n\\nHis ventures and projects: " + ", ".join(ventures.values())
            + "\\n\\nFind THREE kinds of thing, and nothing else:\\n"
            "1. GROUP - several tasks that are clearly one piece of work. Say which "
            "venture if one fits, or name the piece of work.\\n"
            "2. DUPLICATE - two tasks that are the same thing worded differently.\\n"
            "3. ASSIGN - a task with no venture that clearly belongs to one.\\n\\n"
            "Only say something when you are confident. Two unrelated tasks that both "
            "mention a person are NOT a group. If nothing is clear, return an empty list.\\n\\n"
            "Reply with ONLY a JSON array, no other text:\\n"
            '[{"kind":"group","label":"FundiConnect launch","venture":"FundiConnect",'
            '"task_ids":[3,7,12],"why":"all the vetting and pilot work"},\\n'
            ' {"kind":"duplicate","label":"Call Ravi","task_ids":[4,19],'
            '"why":"same call, worded twice"},\\n'
            ' {"kind":"assign","label":"Vet the first 20 fundis","venture":"FundiConnect",'
            '"task_ids":[3],"why":"clearly FundiConnect work"}]')

        import google.genai as genai
        client = genai.Client()
        resp = gemini_guard() or note_gemini_call() or _ask_gemini(client, prompt=prompt)
        note_gemini_tokens(resp)
        raw = (resp.text or '').strip()
        raw = _r.sub(r'^```(?:json)?|```$', '', raw, flags=_r.M).strip()
        m = _r.search(r'\\[[\\s\\S]*\\]', raw)
        if not m:
            return {"status": "success", "suggestions": [],
                    "note": "Nothing stood out as belonging together."}
        try:
            found = _j.loads(m.group(0))
        except Exception:
            return {"status": "success", "suggestions": [],
                    "note": "Could not read the suggestions."}

        by_id = {t['id']: t for t in tasks}
        out = []
        for f in found[:8]:
            ids = [i for i in (f.get('task_ids') or []) if i in by_id]
            if len(ids) < (2 if f.get('kind') in ('group', 'duplicate') else 1):
                continue
            out.append({
                "kind": f.get('kind'),
                "label": str(f.get('label') or '')[:70],
                "venture": f.get('venture'),
                "why": str(f.get('why') or '')[:110],
                "task_ids": ids,
                "titles": [str(by_id[i]['title'])[:70] for i in ids],
            })
        return {"status": "success", "suggestions": out,
                "note": ("" if out else "Nothing stood out as belonging together.")}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/tasks/group/apply")
@require_password
def group_apply():
    """Apply only what he ticked."""
    try:
        d = request.get_json() or {}
        picks = d.get('apply') or []
        grouped = merged = assigned = 0
        for p in picks:
            kind = p.get('kind')
            ids = [int(i) for i in (p.get('task_ids') or [])]
            if not ids:
                continue
            vid = None
            if p.get('venture'):
                v = db.query("SELECT id FROM ventures WHERE LOWER(name) = LOWER(?)",
                             (p['venture'],))
                vid = v[0]['id'] if v else None

            if kind in ('group', 'assign'):
                for i in ids:
                    if vid:
                        db.execute("UPDATE tasks SET venture_id = ? WHERE id = ?", (vid, i))
                    if kind == 'group' and p.get('label'):
                        db.execute("UPDATE tasks SET tags = ? WHERE id = ?",
                                   (str(p['label'])[:60], i))
                grouped += len(ids) if kind == 'group' else 0
                assigned += len(ids) if kind == 'assign' else 0

            elif kind == 'duplicate' and len(ids) > 1:
                keep = min(ids)
                for i in ids:
                    if i != keep:
                        db.execute("UPDATE tasks SET status = 'cancelled', "
                                   "notes = COALESCE(notes,'') || ' (merged into #' || ? || ')' "
                                   "WHERE id = ?", (keep, i))
                        merged += 1
        return {"status": "success", "grouped": grouped,
                "merged": merged, "assigned": assigned}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/tasks/group' in s:
    print("already there"); raise SystemExit
anchor = '@app.get("/api/today")'
if anchor not in s:
    print("anchor not found"); raise SystemExit
t = s.replace(anchor, EP + anchor, 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("the organizer is in: /api/tasks/organize and /organize/apply")
else:
    print("broke: " + err)
