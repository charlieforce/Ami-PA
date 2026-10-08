#!/usr/bin/env python3
"""Being able to change a payment, not just a quote.

He meant to type 200 and typed 245. Right now there is no way back - the
quote can move but the payment is set in stone, which is the wrong way
round: a quote changing is a real event worth recording, a typo is not.

So: edit any line, delete one that should not exist, and a tidier way to
read a person's account.

Run from the src folder with:  python3 ledger_edit.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

EP = '''@app.delete("/api/ledger/entry/<int:eid>")
@require_password
def ledger_delete_entry(eid):
    """A line that should never have been there. Not the same as forgiving
    a debt - this is a typo, not a decision."""
    try:
        r = db.query("SELECT person_id FROM ledger_entries WHERE id = ?", (eid,))
        if not r:
            return {"error": "no such line"}, 404
        pid = r[0]['person_id']
        db.execute("DELETE FROM ledger_changes WHERE entry_id = ?", (eid,))
        db.execute("DELETE FROM ledger_entries WHERE id = ?", (eid,))
        if db.query("SELECT id FROM ledger_entries WHERE id = ?", (eid,)):
            return {"error": "it did not go"}, 400
        return {"status": "success", "balance": _ledger_balance(pid) if pid else {}}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/entry/<int:eid>")
@require_password
def ledger_one_entry(eid):
    try:
        r = db.query("""SELECT e.*, v.name AS project, p.name AS person
                        FROM ledger_entries e
                        LEFT JOIN ventures v ON v.id = e.venture_id
                        LEFT JOIN ledger_people p ON p.id = e.person_id
                        WHERE e.id = ?""", (eid,))
        if not r:
            return {"error": "no such line"}, 404
        e = dict(r[0])
        e['moved'] = db.query("""SELECT was, now_is, why, changed_at FROM ledger_changes
                                 WHERE entry_id = ? ORDER BY id""", (eid,)) or []
        e['usd'] = _in_usd(e.get('amount'), e.get('currency'))
        return {"status": "success", "entry": e}
    except Exception as e:
        return {"error": str(e)}, 400


@app.put("/api/ledger/person/<int:pid>")
@require_password
def ledger_edit_person(pid):
    """Their name, what they do, a phone number once he learns it."""
    try:
        d = request.get_json() or {}
        sets, vals = [], []
        for f, col in (('name', 'name'), ('what_they_do', 'what_they_do'),
                       ('phone', 'phone'), ('notes', 'notes')):
            if f in d:
                sets.append(col + " = ?")
                vals.append(str(d[f])[:200])
        if 'name' in d:
            cid, _full = _find_contact(str(d['name']))
            if cid:
                sets.append("contact_id = ?")
                vals.append(cid)
        if not sets:
            return {"error": "nothing to change"}, 400
        vals.append(pid)
        db.execute("UPDATE ledger_people SET " + ", ".join(sets) + " WHERE id = ?",
                   tuple(vals))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/ledger/entry/<int:eid>' in s and 'ledger_delete_entry' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("a line can be changed, or removed when it was a mistake")
else:
    print("broke: " + err)
