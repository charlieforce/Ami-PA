#!/usr/bin/env python3
"""Paying from where you are, and materials that behave like materials.

Two things were wrong.

First, to pay Jimmy for Promoga work he had to leave the job, find Jimmy
under People, and add a line - which then had no idea it belonged to
Promoga. Paying should happen on the job page, and know where it came from.

Second, materials were a single number. But cement is "200 bags at 2.50",
and real life goes: the price rises to 3.00, the count goes to 250, he buys
200 now and the rest in December. One amount cannot hold that.

So a material gets a quantity and a unit price, and buying part of it is a
purchase against the line - leaving the rest outstanding.

Run from the src folder with:  python3 job_pay.py
"""
import sqlite3, subprocess, sys, tempfile, os

DB = os.getenv("AMI_DB_PATH", "data/ami_memory.db")

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

db = sqlite3.connect(DB)
have = {r[1] for r in db.execute("PRAGMA table_info(ledger_entries)")}
for col, decl in (("quantity", "REAL"), ("unit", "TEXT"), ("unit_price", "REAL"),
                  ("against_id", "INTEGER")):
    if col not in have:
        db.execute("ALTER TABLE ledger_entries ADD COLUMN " + col + " " + decl)
        print("  added " + col)
db.commit(); db.close()
print("ready")

EP = '''@app.post("/api/ledger/pay")
@require_password
def ledger_quick_pay():
    """Four fields: how much, when, how it went, a note. Everything else is
    known already - who, which job, which currency."""
    try:
        from datetime import datetime as _dp
        d = request.get_json() or {}
        pid = d.get('person_id')
        amount = float(d.get('amount') or 0)
        if not pid or amount <= 0:
            return {"error": "who, and how much"}, 400
        vid = d.get('venture_id')
        cur = (d.get('currency') or '').upper()[:4]
        if not cur:
            r = db.query("""SELECT currency FROM ledger_entries WHERE person_id = ?
                            ORDER BY id DESC LIMIT 1""", (pid,))
            cur = ((r[0]['currency'] if r else None) or
                   (_job_currency(vid) if vid else 'USD')).upper()[:4]
        bal = _ledger_balance(int(pid))
        owes_him = any(b['net'] > 0 for b in bal.values())
        kind = 'paid' if owes_him else 'repaid'
        db.execute("""INSERT INTO ledger_entries (person_id, venture_id, kind, who_owes,
                      amount, currency, note, happened_on, how_sent)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                   (int(pid), vid, kind, ('them' if owes_him else 'me'), amount, cur,
                    (d.get('note') or '')[:200],
                    d.get('happened_on') or _dp.now().strftime('%Y-%m-%d'),
                    (d.get('how_sent') or '')[:30]))
        if not db.query("""SELECT id FROM ledger_entries WHERE person_id = ? AND amount = ?
                           ORDER BY id DESC LIMIT 1""", (pid, amount)):
            return {"error": "it did not save"}, 400
        return {"status": "success", "balance": _ledger_balance(int(pid))}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/ledger/job/<int:vid>/material")
@require_password
def ledger_job_material(vid):
    """200 bags of cement at 2.50. Quantity and price, not one number."""
    try:
        from datetime import datetime as _dm
        d = request.get_json() or {}
        what = (d.get('what') or '').strip()[:120]
        qty = float(d.get('quantity') or 0)
        price = float(d.get('unit_price') or 0)
        if len(what) < 2 or qty <= 0 or price <= 0:
            return {"error": "what, how many, and how much each"}, 400
        cur = (d.get('currency') or '').upper()[:4] or _job_currency(vid)
        db.execute("""INSERT INTO ledger_entries (person_id, venture_id, kind, who_owes,
                      amount, currency, note, happened_on, quantity, unit, unit_price)
                      VALUES (NULL, ?, 'agreed', 'them', ?, ?, ?, ?, ?, ?, ?)""",
                   (vid, round(qty * price, 2), cur, what,
                    d.get('happened_on') or _dm.now().strftime('%Y-%m-%d'),
                    qty, (d.get('unit') or '')[:20], price))
        r = db.query("SELECT id FROM ledger_entries ORDER BY id DESC LIMIT 1")
        return {"status": "success", "id": (r[0]['id'] if r else None)}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/ledger/material/<int:eid>/got")
@require_password
def ledger_material_got(eid):
    """He bought some of it. Maybe at a different price than planned, maybe
    not all of it. Both are normal."""
    try:
        from datetime import datetime as _dg
        d = request.get_json() or {}
        r = db.query("SELECT * FROM ledger_entries WHERE id = ?", (eid,))
        if not r:
            return {"error": "no such line"}, 404
        line = r[0]
        qty = float(d.get('quantity') or line.get('quantity') or 0)
        price = float(d.get('unit_price') or line.get('unit_price') or 0)
        if qty <= 0 or price <= 0:
            return {"error": "how many, and at what price"}, 400
        db.execute("""INSERT INTO ledger_entries (person_id, venture_id, kind, who_owes,
                      amount, currency, note, happened_on, quantity, unit, unit_price,
                      against_id, how_sent)
                      VALUES (NULL, ?, 'paid', 'them', ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                   (line['venture_id'], round(qty * price, 2), line['currency'],
                    (d.get('note') or line.get('note') or '')[:200],
                    d.get('happened_on') or _dg.now().strftime('%Y-%m-%d'),
                    qty, line.get('unit'), price, eid, (d.get('how_sent') or '')[:30]))
        got = (db.query("""SELECT COALESCE(SUM(quantity),0) AS q FROM ledger_entries
                           WHERE against_id = ?""", (eid,)) or [{"q": 0}])[0]['q'] or 0
        want = float(line.get('quantity') or 0)
        return {"status": "success", "got": float(got), "wanted": want,
                "still_to_get": max(0, round(want - float(got), 2))}
    except Exception as e:
        return {"error": str(e)}, 400


@app.put("/api/ledger/material/<int:eid>")
@require_password
def ledger_material_change(eid):
    """The price went up, or he needs more of them. Keep what it was."""
    try:
        d = request.get_json() or {}
        r = db.query("SELECT quantity, unit_price, amount FROM ledger_entries WHERE id = ?",
                     (eid,))
        if not r:
            return {"error": "no such line"}, 404
        qty = float(d.get('quantity') if d.get('quantity') is not None
                    else (r[0]['quantity'] or 0))
        price = float(d.get('unit_price') if d.get('unit_price') is not None
                      else (r[0]['unit_price'] or 0))
        was = float(r[0]['amount'] or 0)
        now = round(qty * price, 2)
        if abs(now - was) > 0.004:
            db.execute("""INSERT INTO ledger_changes (entry_id, was, now_is, why)
                          VALUES (?,?,?,?)""", (eid, was, now, (d.get('why') or '')[:160]))
        db.execute("""UPDATE ledger_entries SET quantity = ?, unit_price = ?, amount = ?
                      WHERE id = ?""", (qty, price, now, eid))
        if 'what' in d:
            db.execute("UPDATE ledger_entries SET note = ? WHERE id = ?",
                       (str(d['what'])[:120], eid))
        return {"status": "success", "was": was, "now": now}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/job/<int:vid>/materials")
@require_password
def ledger_job_materials(vid):
    """What is on order, what has arrived, what is still to come."""
    try:
        ids = _all_under(vid)
        inlist = ",".join(str(i) for i in ids)
        rows = db.query("""SELECT * FROM ledger_entries
                           WHERE venture_id IN (""" + inlist + """)
                             AND person_id IS NULL AND against_id IS NULL
                           ORDER BY id DESC""") or []
        out = []
        for r in rows:
            got = (db.query("""SELECT COALESCE(SUM(quantity),0) AS q,
                                      COALESCE(SUM(amount),0) AS a
                               FROM ledger_entries WHERE against_id = ?""",
                            (r['id'],)) or [{"q": 0, "a": 0}])[0]
            want = float(r.get('quantity') or 0)
            have = float(got.get('q') or 0)
            out.append({
                "id": r['id'], "what": r.get('note') or 'item',
                "quantity": want, "unit": r.get('unit') or '',
                "unit_price": r.get('unit_price'),
                "amount": r.get('amount'), "currency": r.get('currency'),
                "usd": _in_usd(r.get('amount'), r.get('currency')),
                "got": have, "spent_so_far": round(float(got.get('a') or 0), 2),
                "still_to_get": max(0, round(want - have, 2)) if want else 0,
                "done": bool(want and have >= want) or (str(r['kind']) == 'paid'),
                "moved": (db.query("""SELECT was, now_is, why FROM ledger_changes
                                      WHERE entry_id = ? ORDER BY id""", (r['id'],)) or []),
            })
        return {"status": "success", "materials": out}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/ledger/pay' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("quick pay, and materials with a quantity and a price")
else:
    print("broke: " + err)
