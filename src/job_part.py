#!/usr/bin/env python3
"""Adding a part to a job without leaving it.

Phase III belongs under the Freetown house. Today that means going to
Ventures, creating it, setting its parent, and coming back - when he is
already standing on the house page thinking about exactly that.

Run from the src folder with:  python3 job_part.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

EP = '''@app.post("/api/ledger/job/<int:vid>/part")
@require_password
def ledger_job_add_part(vid):
    """A phase, a room, a stage - a job inside this job."""
    try:
        d = request.get_json() or {}
        name = (d.get('name') or '').strip()[:60]
        if len(name) < 2:
            return {"error": "what is it called?"}, 400
        if db.query("""SELECT id FROM ventures WHERE LOWER(name) = LOWER(?)
                       AND parent_id = ?""", (name, vid)):
            return {"error": "that one is already under here"}, 400
        parent = db.query("SELECT name, type FROM ventures WHERE id = ?", (vid,))
        if not parent:
            return {"error": "no such job"}, 404
        db.execute("""INSERT INTO ventures (name, description, type, stage, parent_id, active)
                      VALUES (?, ?, ?, 'planning', ?, 1)""",
                   (name, (d.get('note') or '')[:600],
                    (parent[0].get('type') or 'project'), vid))
        r = db.query("""SELECT id FROM ventures WHERE name = ? AND parent_id = ?
                        ORDER BY id DESC LIMIT 1""", (name, vid))
        if not r:
            return {"error": "it did not save"}, 400
        return {"status": "success", "id": r[0]['id'], "under": parent[0]['name']}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/ledger/job/<int:vid>/part' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("a part can be added from the job itself")
else:
    print("broke: " + err)
