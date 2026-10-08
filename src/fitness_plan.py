#!/usr/bin/env python3
"""A training plan from his own exercises, for however long he asks.

He told her: Monday, Wednesday, Friday, Saturday. Easy on Friday because
there is no rest day before Saturday. Stretch and cardio every day. Three
months. Only exercises already in his library.

She built one day, because the screen only let him pick one.

So: he writes what he wants in plain words, she reads his 59 exercises and
builds the whole thing. Nothing invented - every movement is one he already
has, with his knees respected.

Run from the src folder with:  python3 fitness_plan.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

EP = '''@app.post("/api/fitness/plan-from-words")
@require_password
def fitness_plan_from_words():
    """He says what he wants. She builds it from what he has."""
    try:
        import json as _jf, re as _rf
        d = request.get_json() or {}
        asked = (d.get('prompt') or d.get('text') or '').strip()
        if len(asked) < 8:
            return {"error": "tell me what you want"}, 400

        mine = db.query("""SELECT id, name, area, kind, equipment, knee_load, knee_twist
                           FROM exercises ORDER BY area, name""") or []
        if not mine:
            return {"error": "no exercises in the library yet"}, 400

        lib = []
        for e in mine:
            bits = [str(e['id']) + ". " + str(e['name'])]
            if e.get('area'):
                bits.append("(" + str(e['area'])
                            + ((", " + str(e['kind'])) if e.get('kind') else "") + ")")
            if str(e.get('knee_load') or '').lower() in ('high', 'heavy'):
                bits.append("[hard on knees]")
            if str(e.get('knee_twist') or '').lower() in ('yes', 'high', 'true', '1'):
                bits.append("[twists the knee]")
            lib.append(" ".join(bits))

        # how long, and which days - read from what he wrote, with sane defaults
        weeks = 4
        m = _rf.search(r"(\\d{1,2})\\s*(week|month)", asked.lower())
        if m:
            weeks = int(m.group(1)) * (4 if m.group(2) == 'month' else 1)
        weeks = max(1, min(weeks, 26))

        days = [dn for dn in ('monday', 'tuesday', 'wednesday', 'thursday',
                              'friday', 'saturday', 'sunday') if dn in asked.lower()]
        if not days:
            days = ['monday', 'wednesday', 'friday']

        prompt = (
            "Build Charlie a training plan. These are the ONLY exercises he has - "
            "use nothing else, and refer to each by its number:\\n\\n"
            + "\\n".join(lib) + "\\n\\n"
            "What he asked for:\\n" + asked[:700] + "\\n\\n"
            "Rules:\\n"
            "- " + str(weeks) + " weeks, training on: " + ", ".join(days) + "\\n"
            "- His knees are bad. Nothing marked [hard on knees] or [twists the knee] "
            "unless he explicitly asked for it.\\n"
            "- If two training days run back to back, make the first one lighter.\\n"
            "- 5 to 8 movements a day including any warmup and cooldown he asked for.\\n"
            "- Vary it across the weeks - do not repeat the same day over and over.\\n"
            "- Sets and reps that suit a man in his forties coming back steadily.\\n\\n"
            'Reply with ONLY a JSON object:\\n'
            '{"name":"short plan name",'
            '"days":[{"week":1,"day":"monday","items":['
            '{"id":12,"sets":3,"reps":"10","note":"slow on the way down"}]}]}'
        )

        import google.genai as genai
        client = genai.Client()
        resp = gemini_guard() or note_gemini_call() or _ask_gemini(client, prompt=prompt)
        note_gemini_tokens(resp)
        raw = _rf.sub(r'^```(?:json)?|```$', '', (resp.text or '').strip(), flags=_rf.M)
        mm = _rf.search(r'\\{[\\s\\S]*\\}', raw)
        if not mm:
            return {"error": "could not read the plan back"}, 400
        got = _jf.loads(mm.group(0))

        known = {e['id'] for e in mine}
        name = str(got.get('name') or 'Training plan')[:60]
        db.execute("""INSERT INTO fitness_plans (goal, weeks, days, started_on, status, notes)
                      VALUES (?, ?, ?, date('now'), 'active', ?)""",
                   (name, weeks, len(days), asked[:400]))
        pr = db.query("SELECT id FROM fitness_plans ORDER BY id DESC LIMIT 1")
        if not pr:
            return {"error": "the plan did not save"}, 400
        pid = pr[0]['id']

        made = 0
        for dayblock in (got.get('days') or []):
            wk = int(dayblock.get('week') or 1)
            dy = str(dayblock.get('day') or '')[:12].lower()
            for n, it in enumerate(dayblock.get('items') or []):
                try:
                    eid = int(it.get('id'))
                except Exception:
                    continue
                if eid not in known:
                    continue        # she invented one - skip it
                db.execute("""INSERT INTO plan_items (plan_id, day, exercise_id, target_sets,
                                                      target_reps, position, week, note)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                           (pid, dy, eid, it.get('sets'), str(it.get('reps') or ''),
                            n, wk, str(it.get('note') or '')[:120]))
                made += 1

        if not made:
            db.execute("DELETE FROM fitness_plans WHERE id = ?", (pid,))
            return {"error": "nothing usable came back"}, 400

        return {"status": "success", "plan_id": pid, "name": name,
                "weeks": weeks, "days": days, "movements": made}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/fitness/plan/<int:pid>")
@require_password
def fitness_plan_read(pid):
    """The plan, week by week."""
    try:
        p = db.query("SELECT * FROM fitness_plans WHERE id = ?", (pid,))
        if not p:
            return {"error": "no such plan"}, 404
        rows = db.query("""SELECT pi.week, pi.day, pi.target_sets, pi.target_reps, pi.note,
                                  e.name, e.area
                           FROM plan_items pi
                           JOIN exercises e ON e.id = pi.exercise_id
                           WHERE pi.plan_id = ?
                           ORDER BY pi.week, pi.position""", (pid,)) or []
        weeks = {}
        for r in rows:
            w = weeks.setdefault(r['week'] or 1, {})
            w.setdefault(r['day'] or '', []).append({
                "name": r['name'], "area": r['area'],
                "sets": r['target_sets'], "reps": r['target_reps'],
                "note": r['note']})
        return {"status": "success",
                "plan": {"id": p[0]['id'], "name": p[0]['goal'],
                         "weeks": p[0]['weeks'], "started": p[0]['started_on']},
                "by_week": weeks}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/fitness/plans")
@require_password
def fitness_plans_list():
    try:
        rows = db.query("""SELECT f.id, f.goal, f.weeks, f.started_on, f.status,
                                  (SELECT COUNT(*) FROM plan_items p WHERE p.plan_id = f.id)
                                    AS movements
                           FROM fitness_plans f ORDER BY f.id DESC LIMIT 12""") or []
        return {"status": "success", "plans": rows}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/fitness/plan-from-words' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("a plan from his own words, built from his own exercises")
else:
    print("broke: " + err)
