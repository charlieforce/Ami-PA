#!/usr/bin/env python3
"""Removing a person or a job, without losing anything that mattered.

Jacob was going to do the kitchen, then Peter came in with a better price.
Jacob never did a day's work and was never paid - so he should just go.

But if Jacob had taken a deposit, deleting him would erase the fact that
money left the account. That has to stay, whatever happens to the name.

So: nothing has happened, it deletes. Money has moved, it archives - off the
list, still in the reports.

Run from the src folder with:  python3 ledger_remove.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

EP = '''@app.delete("/api/ledger/person/<int:pid>")
@require_password
def ledger_remove_person(pid):
    """Gone if nothing happened. Archived if it did."""
    try:
        p = db.query("SELECT name FROM ledger_people WHERE id = ?", (pid,))
        if not p:
            return {"error": "no such person"}, 404
        name = p[0]['name']
        moved = (db.query("""SELECT COUNT(*) AS n FROM ledger_entries
                             WHERE person_id = ?
                               AND kind IN ('paid','repaid','bought','lent','borrowed')""",
                          (pid,)) or [{"n": 0}])[0]['n']
        if moved:
            db.execute("UPDATE ledger_people SET active = 0 WHERE id = ?", (pid,))
            back = db.query("SELECT active FROM ledger_people WHERE id = ?", (pid,))
            if not back or back[0]['active']:
                return {"error": "could not archive them"}, 400
            return {"status": "success", "what_happened": "archived",
                    "says": (name + " is off the list, but the " + str(moved)
                             + " things that actually moved are kept.")}
        db.execute("DELETE FROM ledger_entries WHERE person_id = ?", (pid,))
        db.execute("DELETE FROM ledger_people WHERE id = ?", (pid,))
        if db.query("SELECT id FROM ledger_people WHERE id = ?", (pid,)):
            return {"error": "could not remove them"}, 400
        return {"status": "success", "what_happened": "deleted",
                "says": name + " is gone. Nothing had moved."}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/ledger/person/<int:pid>/restore")
@require_password
def ledger_restore_person(pid):
    try:
        db.execute("UPDATE ledger_people SET active = 1 WHERE id = ?", (pid,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/archived")
@require_password
def ledger_archived():
    """The ones put away, in case he wants them back."""
    try:
        folk = db.query("""SELECT id, name, what_they_do FROM ledger_people
                           WHERE COALESCE(active,1) = 0 ORDER BY name""") or []
        jobs = db.query("""SELECT id, name FROM ventures
                           WHERE COALESCE(active,1) = 0 ORDER BY name""") or []
        return {"status": "success", "people": folk, "jobs": jobs}
    except Exception as e:
        return {"error": str(e)}, 400


@app.delete("/api/ledger/job/<int:vid>")
@require_password
def ledger_remove_job(vid):
    """Same rule. And a job with parts under it is never simply deleted."""
    try:
        v = db.query("SELECT name FROM ventures WHERE id = ?", (vid,))
        if not v:
            return {"error": "no such job"}, 404
        name = v[0]['name']
        kids = (db.query("SELECT COUNT(*) AS n FROM ventures WHERE parent_id = ?",
                         (vid,)) or [{"n": 0}])[0]['n']
        lines = (db.query("SELECT COUNT(*) AS n FROM ledger_entries WHERE venture_id = ?",
                          (vid,)) or [{"n": 0}])[0]['n']
        if kids or lines:
            db.execute("UPDATE ventures SET active = 0 WHERE id = ?", (vid,))
            back = db.query("SELECT active FROM ventures WHERE id = ?", (vid,))
            if not back or back[0]['active']:
                return {"error": "could not archive it"}, 400
            bits = []
            if lines:
                bits.append(str(lines) + " lines of money")
            if kids:
                bits.append(str(kids) + " parts under it")
            return {"status": "success", "what_happened": "archived",
                    "says": (name + " is off the list - it still has "
                             + " and ".join(bits) + ".")}
        db.execute("DELETE FROM ventures WHERE id = ?", (vid,))
        if db.query("SELECT id FROM ventures WHERE id = ?", (vid,)):
            return {"error": "could not remove it"}, 400
        return {"status": "success", "what_happened": "deleted",
                "says": name + " is gone. Nothing was on it."}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/ledger/job/<int:vid>/restore")
@require_password
def ledger_restore_job(vid):
    try:
        db.execute("UPDATE ventures SET active = 1 WHERE id = ?", (vid,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if 'ledger_remove_person' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("people and jobs can be removed, or put away when they have history")
else:
    print("broke: " + err)
