#!/usr/bin/env python3
"""Saying it once, and knowing where you are.

A quiet loan is worth a mention. It is not worth a mention every single
morning until he does something about it - that is how a useful nudge turns
into noise he stops reading.

So: each thing she notices gets said once, then held for a fortnight.

And a job page opens with no heading. Today he knows he tapped Phase I;
in six months he will not. A title, and a notes field for what the phase
actually covers.

Run from the src folder with:  python3 money_quiet.py
"""
import sqlite3, subprocess, sys, tempfile, os

DB = os.getenv("AMI_DB_PATH", "data/ami_memory.db")

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

db = sqlite3.connect(DB)
db.execute("""CREATE TABLE IF NOT EXISTS money_said (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    what TEXT UNIQUE,
    said_on TEXT DEFAULT CURRENT_TIMESTAMP)""")
db.commit(); db.close()
print("ready")

s = open('app.py').read()
done, miss = [], []

# --- once a fortnight, not every morning ---------------------------------
o1 = """    return out[:6]"""
n1 = """    # he has heard it. leave it a fortnight before saying it again.
    fresh = []
    for o in out:
        key = (o.get('kind') or '') + '|' + (o.get('says') or '')[:60]
        try:
            seen = db.query("SELECT said_on FROM money_said WHERE what = ?", (key,))
            if seen:
                when = str(seen[0]['said_on'])[:10]
                try:
                    days = (today - _dw.strptime(when, '%Y-%m-%d')).days
                except Exception:
                    days = 99
                if days < 14:
                    continue
                db.execute("UPDATE money_said SET said_on = date('now') WHERE what = ?",
                           (key,))
            else:
                db.execute("INSERT OR IGNORE INTO money_said (what, said_on) "
                           "VALUES (?, date('now'))", (key,))
        except Exception:
            pass
        fresh.append(o)
    return fresh[:6]"""
if o1 in s:
    s = s.replace(o1, n1, 1); done.append("said once a fortnight")
else:
    miss.append("the fortnight rule")

# --- a job carries a note -------------------------------------------------
o2 = """@app.get("/api/ledger/job/<int:vid>/materials")"""
n2 = """@app.put("/api/ledger/job/<int:vid>/note")
@require_password
def ledger_job_note(vid):
    \"\"\"What this phase actually covers, in his own words.\"\"\"
    try:
        d = request.get_json() or {}
        note = str(d.get('note') or '')[:1200]
        db.execute("UPDATE ventures SET description = ? WHERE id = ?", (note, vid))
        back = db.query("SELECT description FROM ventures WHERE id = ?", (vid,))
        if not back or (back[0]['description'] or '') != note:
            return {"error": "the note did not save"}, 400
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/job/<int:vid>/materials")"""
if o2 in s:
    s = s.replace(o2, n2, 1); done.append("a job can hold a note")
else:
    miss.append("the note endpoint")

# --- and the job hands back its name and note -----------------------------
o3 = """        return {"status": "success", "project": d.get('project'),
                "totals": d.get('totals'), "materials": d.get('materials') or [],
                "people": out, "report": "\\n".join(L) if L else ''}"""
n3 = """        _v = db.query("SELECT name, description, parent_id FROM ventures WHERE id = ?",
                      (vid,))
        _pa = None
        if _v and _v[0].get('parent_id'):
            _pr = db.query("SELECT name FROM ventures WHERE id = ?", (_v[0]['parent_id'],))
            _pa = _pr[0]['name'] if _pr else None
        return {"status": "success", "project": d.get('project'),
                "name": (_v[0]['name'] if _v else ''),
                "note": (_v[0].get('description') if _v else '') or '',
                "part_of": _pa,
                "totals": d.get('totals'), "materials": d.get('materials') or [],
                "people": out, "report": "\\n".join(L) if L else ''}"""
if o3 in s:
    s = s.replace(o3, n3, 1); done.append("and hands back its name")
else:
    miss.append("the job detail")

good, err = ok(s)
if good:
    open('app.py', 'w').write(s)
    print("DONE: " + ", ".join(done))
    if miss:
        print("SKIPPED: " + ", ".join(miss))
else:
    print("broke, nothing written: " + err)
