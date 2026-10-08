#!/usr/bin/env python3
"""The last two: receipts, and the screen for what she notices.

He photographs the transfer confirmation anyway. Attached to the payment it
settles any argument six months later about whether the money went.

And everything she notices - the quiet loan, the drifted quote, the job
over its agreement - has been sitting in an endpoint nothing shows.

Run from the src folder with:  python3 money_last.py
"""
import sqlite3, subprocess, sys, tempfile, os

DB = os.getenv("AMI_DB_PATH", "data/ami_memory.db")

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

db = sqlite3.connect(DB)
db.execute("""CREATE TABLE IF NOT EXISTS ledger_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER,
    file_path TEXT,
    caption TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
db.commit(); db.close()
os.makedirs('data/receipts', exist_ok=True)
print("receipts table and folder ready")

EP = '''@app.post("/api/ledger/entry/<int:eid>/receipt")
@require_password
def ledger_add_receipt(eid):
    """The photo of the transfer, or the paper from the shop."""
    try:
        import os as _or
        from datetime import datetime as _dr
        f = request.files.get('file') or request.files.get('photo')
        if not f or not f.filename:
            return {"error": "no file"}, 400
        if not db.query("SELECT id FROM ledger_entries WHERE id = ?", (eid,)):
            return {"error": "no such line"}, 404
        _or.makedirs('data/receipts', exist_ok=True)
        safe = (_dr.now().strftime('%Y%m%d%H%M%S') + "_"
                + _or.path.basename(f.filename)[:50])
        path = _or.path.join('data/receipts', safe)
        f.save(path)
        db.execute("""INSERT INTO ledger_receipts (entry_id, file_path, caption)
                      VALUES (?, ?, ?)""",
                   (eid, path, (request.form.get('caption') or '')[:140]))
        n = (db.query("SELECT COUNT(*) AS n FROM ledger_receipts WHERE entry_id = ?",
                      (eid,)) or [{"n": 0}])[0]['n']
        return {"status": "success", "receipts": n}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/entry/<int:eid>/receipts")
@require_password
def ledger_receipts(eid):
    try:
        rows = db.query("""SELECT id, caption, created_at FROM ledger_receipts
                           WHERE entry_id = ? ORDER BY id""", (eid,)) or []
        return {"status": "success", "receipts": rows}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/receipt/<int:rid>")
@require_password
def ledger_receipt_file(rid):
    try:
        from flask import send_file
        r = db.query("SELECT file_path FROM ledger_receipts WHERE id = ?", (rid,))
        if not r:
            return {"error": "no such receipt"}, 404
        return send_file(r[0]['file_path'])
    except Exception as e:
        return {"error": str(e)}, 400


@app.delete("/api/ledger/receipt/<int:rid>")
@require_password
def ledger_drop_receipt(rid):
    try:
        import os as _or
        r = db.query("SELECT file_path FROM ledger_receipts WHERE id = ?", (rid,))
        if r:
            try:
                _or.remove(r[0]['file_path'])
            except Exception:
                pass
        db.execute("DELETE FROM ledger_receipts WHERE id = ?", (rid,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/ledger/entry/<int:eid>/receipt' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
# the account should say which lines have one
o = """            line = {"id": r['id'], "kind": r['kind'], "amount": r['amount'],"""
n = """            _rc = (db.query("SELECT COUNT(*) AS n FROM ledger_receipts WHERE entry_id = ?",
                            (r['id'],)) or [{"n": 0}])[0]['n']
            line = {"id": r['id'], "receipts": _rc,
                    "kind": r['kind'], "amount": r['amount'],"""
if o in t:
    t = t.replace(o, n, 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("receipts can be attached to any line")
else:
    print("broke: " + err)
