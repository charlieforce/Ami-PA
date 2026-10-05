#!/usr/bin/env python3
"""Projects: she thinks it through, proposes the tasks, he ticks.

He described a resume site in chat on Saturday. She gave a good read and the
phases - and then asked him to list the tasks himself. That is the gap.

Three endpoints:
  think    - her honest read and the phases, nothing saved
  create   - make the project, and propose tasks from the plan
  accept   - the tasks he ticked land on the board, attached to the project

Nothing is created without him ticking it.

Run from the src folder with:  python3 projects.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

EP = '''@app.post("/api/projects/think")
@require_password
def project_think():
    """Her honest read on an idea, and the phases. Saves nothing."""
    try:
        d = request.get_json() or {}
        idea = (d.get('idea') or '').strip()
        if len(idea) < 8:
            return {"error": "tell me a bit more about it"}, 400
        existing = [r['name'] for r in (db.query(
            "SELECT name FROM ventures WHERE COALESCE(active,1)=1") or [])]
        prompt = (
            "Charlie wants to build this:\\n\\n" + idea[:1200] + "\\n\\n"
            "He already runs: " + ", ".join(existing) + ".\\n\\n"
            "Give him your honest read in three short parts:\\n"
            "1. THE TRUTH - is this crowded, is there a real edge, what would make it "
            "worth doing. Two or three sentences. Be straight with him; if it is a bad "
            "idea say so.\\n"
            "2. THE PHASES - four to six phases of actual work, in order. One line each.\\n"
            "3. THE FIRST THING - the single thing to do first, and why.\\n\\n"
            "Plain English. No jargon, no hype. Reply as plain text with those three "
            "headings.")
        import google.genai as genai
        client = genai.Client()
        resp = gemini_guard() or note_gemini_call() or _ask_gemini(client, prompt=prompt)
        note_gemini_tokens(resp)
        return {"status": "success", "thinking": (resp.text or '').strip()}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/projects/create")
@require_password
def project_create():
    """Make the project, and propose tasks. Nothing lands on the board yet."""
    try:
        import json as _j, re as _r
        d = request.get_json() or {}
        name = (d.get('name') or '').strip()
        about = (d.get('about') or '').strip()
        plan = (d.get('plan') or '').strip()
        if not name:
            return {"error": "it needs a name"}, 400

        dupe = db.query("SELECT id FROM ventures WHERE LOWER(name) = LOWER(?)", (name,))
        if dupe:
            pid = dupe[0]['id']
            made = False
        else:
            db.execute("""INSERT INTO ventures (name, description, type, stage, status,
                                                active, created_at)
                          VALUES (?, ?, 'project', 'idea', 'active', 1, CURRENT_TIMESTAMP)""",
                       (name, about or plan[:400]))
            pid = db.query("SELECT id FROM ventures WHERE LOWER(name) = LOWER(?)",
                           (name,))[0]['id']
            made = True

        proposed = []
        if plan or about:
            prompt = (
                "This is a project Charlie is starting: " + name + "\\n\\n"
                + (plan or about)[:2000] + "\\n\\n"
                "Turn this into the actual tasks. Rules:\\n"
                "- Between 4 and 10 tasks, each one a real piece of work he could start\\n"
                "- Each title under 70 characters, starting with a verb\\n"
                "- In the order he should do them\\n"
                "- No vague ones like 'plan the project' or 'do research'\\n"
                "- Nothing that is really a phase heading\\n\\n"
                'Reply with ONLY a JSON array:\\n'
                '[{"title":"Map the first 20 fundis in Freetown","why":"nothing works '
                'without supply"}]')
            import google.genai as genai
            client = genai.Client()
            resp = gemini_guard() or note_gemini_call() or _ask_gemini(client, prompt=prompt)
            note_gemini_tokens(resp)
            raw = _r.sub(r'^```(?:json)?|```$', '', (resp.text or '').strip(), flags=_r.M)
            m = _r.search(r'\\[[\\s\\S]*\\]', raw)
            if m:
                try:
                    for t in _j.loads(m.group(0))[:10]:
                        ttl = str(t.get('title') or '').strip()[:90]
                        if len(ttl) > 5:
                            proposed.append({"title": ttl,
                                             "why": str(t.get('why') or '')[:110]})
                except Exception:
                    pass

        return {"status": "success", "project_id": pid, "name": name,
                "created": made, "proposed": proposed}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/projects/accept")
@require_password
def project_accept():
    """Only the tasks he ticked."""
    try:
        d = request.get_json() or {}
        pid = d.get('project_id')
        tasks = d.get('tasks') or []
        if not pid or not tasks:
            return {"error": "nothing to add"}, 400
        made = 0
        for t in tasks:
            ttl = str(t.get('title') or '').strip()[:90]
            if len(ttl) < 4:
                continue
            if db.query("SELECT id FROM tasks WHERE title = ? AND venture_id = ?", (ttl, pid)):
                continue
            db.execute("""INSERT INTO tasks (title, description, status, priority,
                                             venture_id, source, created_at, updated_at)
                          VALUES (?, ?, 'pending', 'medium', ?, 'from_ami',
                                  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)""",
                       (ttl, str(t.get('why') or '')[:200], pid))
            made += 1
        return {"status": "success", "added": made}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/projects/<int:pid>/board")
@require_password
def project_board(pid):
    """One project: what it is, and everything on it."""
    try:
        v = db.query("SELECT * FROM ventures WHERE id = ?", (pid,))
        if not v:
            return {"error": "no such project"}, 404
        rows = db.query("""SELECT id, title, status, priority, due_date, tags, source
                           FROM tasks WHERE venture_id = ?
                           ORDER BY CASE status WHEN 'in_progress' THEN 0
                                                WHEN 'pending' THEN 1 ELSE 2 END,
                                    COALESCE(due_date, '9999')""", (pid,)) or []
        DONE = ('done', 'completed', 'complete')
        return {"status": "success",
                "project": {k: v[0].get(k) for k in
                            ('id', 'name', 'description', 'stage', 'status', 'next_action')},
                "tasks": rows,
                "counts": {"open": len([r for r in rows if r['status'] not in DONE]),
                           "done": len([r for r in rows if r['status'] in DONE]),
                           "total": len(rows)}}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/projects/think' in s:
    print("already there"); raise SystemExit
anchor = '@app.get("/api/today")'
if anchor not in s:
    print("anchor not found"); raise SystemExit
t = s.replace(anchor, EP + anchor, 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("projects: think, create, accept, board")
else:
    print("broke: " + err)
