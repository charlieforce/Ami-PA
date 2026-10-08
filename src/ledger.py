#!/usr/bin/env python3
"""One ledger. Everything else was three half-models.

Yesterday there were quotes, payments and stipends - each built for one case,
none of them fitting a loan. That was the clue the shape was wrong.

What all of it actually is: money owed between Charlie and one person, moving
both ways over time.

  Mr Allie quotes 5,000        -> he is owed 5,000
  Charlie pays him 1,000       -> he is owed 4,000
  Ingie lends 5,000 CAD        -> she is owed 5,000
  Ingie buys the flight, 1,300 -> she is owed 6,300
  Ingie buys Bo laptops, 2,400 -> she is owed 8,700, and Bo has an expense
  Charlie sends her 500        -> she is owed 8,200
  Jeremiah borrows 20,000      -> he owes 20,000
  Jeremiah repays 500          -> he owes 19,500

Same table, same arithmetic, two directions. A project is a tag on the line,
not a separate world - so the Freetown house still groups its people, and
"who do I owe" cuts across everything.

Run from the src folder with:  python3 ledger.py
"""
import sqlite3, subprocess, sys, tempfile, os

DB = os.getenv("AMI_DB_PATH", "data/ami_memory.db")

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

db = sqlite3.connect(DB)

# the people he has money with - builders, friends, volunteers, anyone
db.execute("""CREATE TABLE IF NOT EXISTS ledger_people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    what_they_do TEXT,
    phone TEXT,
    contact_id INTEGER,
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")

# every line of money, both directions
#   kind:  agreed    - what was promised (a quote, a stipend term)
#          paid      - money Charlie sent
#          bought    - something they bought for him, or for a project
#          lent      - money Charlie lent out
#          borrowed  - money Charlie took
#          repaid    - money coming back
#          forgiven  - written off, with a reason
#   who_owes: 'them' or 'me' - which way this line pushes the balance
db.execute("""CREATE TABLE IF NOT EXISTS ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER,
    venture_id INTEGER,
    kind TEXT,
    who_owes TEXT,
    amount REAL,
    currency TEXT DEFAULT 'USD',
    note TEXT,
    happened_on TEXT,
    agreement_id INTEGER,
    interest_rate REAL,
    repay_amount REAL,
    repay_every TEXT,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")

# when an agreed figure moves, the first number is the one worth keeping
db.execute("""CREATE TABLE IF NOT EXISTS ledger_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER,
    was REAL,
    now_is REAL,
    why TEXT,
    changed_at TEXT DEFAULT CURRENT_TIMESTAMP)""")

for sql in ("CREATE INDEX IF NOT EXISTS ix_le_person ON ledger_entries(person_id)",
            "CREATE INDEX IF NOT EXISTS ix_le_venture ON ledger_entries(venture_id)",
            "CREATE INDEX IF NOT EXISTS ix_le_when ON ledger_entries(happened_on)"):
    db.execute(sql)
db.commit()

# ---- carry the old data across, so nothing is lost ------------------------
c = db.cursor()
moved = 0
try:
    c.execute("SELECT COUNT(*) FROM ledger_entries")
    if c.fetchone()[0] == 0:
        c.execute("SELECT id, venture_id, name, trade, phone, notes FROM job_people")
        old_people = c.fetchall()
        idmap = {}
        for oid, vid, name, trade, phone, notes in old_people:
            c.execute("""INSERT INTO ledger_people (name, what_they_do, phone, notes)
                         VALUES (?,?,?,?)""", (name, trade, phone, notes))
            idmap[oid] = c.lastrowid
        c.execute("""SELECT person_id, venture_id, what, amount, currency, agreed_on,
                            notes, id FROM job_quotes""")
        for pid, vid, what, amt, cur, on, notes, qid in c.fetchall():
            c.execute("""INSERT INTO ledger_entries (person_id, venture_id, kind, who_owes,
                         amount, currency, note, happened_on)
                         VALUES (?,?,'agreed','them',?,?,?,?)""",
                      (idmap.get(pid), vid, amt, cur or 'USD', what, on))
            moved += 1
            c.execute("SELECT was, now_is, why, changed_at FROM job_quote_history WHERE quote_id=?",
                      (qid,))
            for was, now_is, why, when in c.fetchall():
                c.execute("""INSERT INTO ledger_changes (entry_id, was, now_is, why, changed_at)
                             VALUES (?,?,?,?,?)""", (c.lastrowid, was, now_is, why, when))
        c.execute("""SELECT person_id, venture_id, amount, currency, kind, what, paid_on
                     FROM job_payments""")
        for pid, vid, amt, cur, knd, what, on in c.fetchall():
            c.execute("""INSERT INTO ledger_entries (person_id, venture_id, kind, who_owes,
                         amount, currency, note, happened_on)
                         VALUES (?,?,'paid','them',?,?,?,?)""",
                      (idmap.get(pid), vid, amt, cur or 'USD', what, on))
            moved += 1
        db.commit()
except Exception as e:
    print("  (nothing to carry over: " + str(e)[:60] + ")")

db.close()
print("ledger ready" + ((" - carried " + str(moved) + " old lines across") if moved else ""))

EP = '''def _ledger_balance(person_id, currency=None):
    """What stands between him and this person. Positive means they owe him."""
    rows = db.query("""SELECT kind, who_owes, amount, currency, status
                       FROM ledger_entries WHERE person_id = ?""", (person_id,)) or []
    by_cur = {}
    for r in rows:
        if str(r.get('status')) == 'forgiven':
            continue
        cur = (r.get('currency') or 'USD').upper()[:4]
        amt = float(r.get('amount') or 0)
        k = str(r.get('kind') or '')
        side = str(r.get('who_owes') or 'them')
        b = by_cur.setdefault(cur, {"they_owe": 0.0, "he_owes": 0.0})
        if side == 'me':
            # money he took, or something they bought for him
            if k in ('borrowed', 'bought', 'agreed'):
                b['he_owes'] += amt
            elif k in ('repaid', 'paid'):
                b['he_owes'] -= amt
        else:
            # work they agreed to do, or money he lent them
            if k in ('agreed', 'lent'):
                b['they_owe'] += amt
            elif k in ('paid', 'repaid'):
                b['they_owe'] -= amt
            elif k == 'bought':
                b['he_owes'] += amt
    out = {}
    for cur, b in by_cur.items():
        net = round(b['they_owe'] - b['he_owes'], 2)
        out[cur] = {"they_owe": round(b['they_owe'], 2),
                    "he_owes": round(b['he_owes'], 2),
                    "net": net,
                    "usd": _in_usd(abs(net), cur)}
    return out


@app.get("/api/ledger/people")
@require_password
def ledger_people():
    """Everyone he has money with, and where each stands."""
    try:
        rows = db.query("""SELECT id, name, what_they_do FROM ledger_people
                           WHERE COALESCE(active,1) = 1 ORDER BY name""") or []
        out = []
        for r in rows:
            bal = _ledger_balance(r['id'])
            if not bal:
                out.append({"id": r['id'], "name": r['name'],
                            "what_they_do": r.get('what_they_do') or '',
                            "balances": {}, "quiet": True})
                continue
            out.append({"id": r['id'], "name": r['name'],
                        "what_they_do": r.get('what_they_do') or '',
                        "balances": bal, "quiet": False})
        return {"status": "success", "people": out}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/ledger/person")
@require_password
def ledger_add_person():
    try:
        d = request.get_json() or {}
        name = (d.get('name') or '').strip()[:60]
        if len(name) < 2:
            return {"error": "they need a name"}, 400
        if db.query("SELECT id FROM ledger_people WHERE LOWER(name) = LOWER(?)", (name,)):
            return {"error": "you already have someone by that name"}, 400
        cid, full = _find_contact(name)
        db.execute("""INSERT INTO ledger_people (name, what_they_do, phone, contact_id, notes)
                      VALUES (?,?,?,?,?)""",
                   (full or name, (d.get('what_they_do') or '')[:40],
                    (d.get('phone') or '')[:30], cid, (d.get('notes') or '')[:200]))
        r = db.query("SELECT id FROM ledger_people ORDER BY id DESC LIMIT 1")
        return {"status": "success", "id": (r[0]['id'] if r else None)}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/ledger/entry")
@require_password
def ledger_add_entry():
    """One line of money. Everything is one of these."""
    try:
        from datetime import datetime as _dl
        d = request.get_json() or {}
        pid = d.get('person_id')
        kind = (d.get('kind') or '').strip().lower()
        amount = float(d.get('amount') or 0)
        if not pid or kind not in ('agreed', 'paid', 'bought', 'lent', 'borrowed',
                                   'repaid', 'forgiven'):
            return {"error": "who, and what kind of line"}, 400
        if amount <= 0 and kind != 'forgiven':
            return {"error": "how much?"}, 400
        side = d.get('who_owes')
        if not side:
            side = 'me' if kind in ('borrowed', 'bought') else 'them'
        db.execute("""INSERT INTO ledger_entries (person_id, venture_id, kind, who_owes,
                      amount, currency, note, happened_on, interest_rate,
                      repay_amount, repay_every)
                      VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                   (int(pid), d.get('venture_id'), kind, side, amount,
                    (d.get('currency') or 'USD').upper()[:4], (d.get('note') or '')[:200],
                    d.get('happened_on') or _dl.now().strftime('%Y-%m-%d'),
                    d.get('interest_rate'), d.get('repay_amount'),
                    (d.get('repay_every') or None)))
        r = db.query("SELECT id FROM ledger_entries ORDER BY id DESC LIMIT 1")
        if not r:
            return {"error": "it did not save"}, 400
        return {"status": "success", "id": r[0]['id'],
                "balance": _ledger_balance(int(pid))}
    except Exception as e:
        return {"error": str(e)}, 400


@app.put("/api/ledger/entry/<int:eid>")
@require_password
def ledger_change_entry(eid):
    """An agreed figure moved. Keep the first number - it is the useful one."""
    try:
        d = request.get_json() or {}
        r = db.query("SELECT amount, kind, person_id FROM ledger_entries WHERE id = ?", (eid,))
        if not r:
            return {"error": "no such line"}, 404
        was = float(r[0]['amount'] or 0)
        if 'amount' in d:
            new = float(d.get('amount') or 0)
            if new > 0 and abs(new - was) > 0.004:
                db.execute("""INSERT INTO ledger_changes (entry_id, was, now_is, why)
                              VALUES (?,?,?,?)""", (eid, was, new, (d.get('why') or '')[:160]))
                db.execute("UPDATE ledger_entries SET amount = ? WHERE id = ?", (new, eid))
        for f, col in (('note', 'note'), ('happened_on', 'happened_on'),
                       ('venture_id', 'venture_id'), ('repay_amount', 'repay_amount'),
                       ('repay_every', 'repay_every'), ('interest_rate', 'interest_rate')):
            if f in d:
                db.execute("UPDATE ledger_entries SET " + col + " = ? WHERE id = ?",
                           (d[f], eid))
        return {"status": "success", "balance": _ledger_balance(r[0]['person_id'])}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/ledger/entry/<int:eid>/forgive")
@require_password
def ledger_forgive(eid):
    """He told them not to worry about it. Recorded, never deleted - the
    reporting has to stay honest."""
    try:
        d = request.get_json() or {}
        why = (d.get('why') or '').strip()[:200]
        r = db.query("SELECT person_id, amount FROM ledger_entries WHERE id = ?", (eid,))
        if not r:
            return {"error": "no such line"}, 404
        db.execute("UPDATE ledger_entries SET status = 'forgiven', note = "
                   "COALESCE(note,'') || ' [written off: ' || ? || ']' WHERE id = ?",
                   (why or 'no reason given', eid))
        back = db.query("SELECT status FROM ledger_entries WHERE id = ?", (eid,))
        if not back or str(back[0]['status']) != 'forgiven':
            return {"error": "it did not save"}, 400
        return {"status": "success", "balance": _ledger_balance(r[0]['person_id'])}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/person/<int:pid>")
@require_password
def ledger_person(pid):
    """One account, itemised, newest last so it reads like a statement."""
    try:
        p = db.query("SELECT * FROM ledger_people WHERE id = ?", (pid,))
        if not p:
            return {"error": "no such person"}, 404
        _lim = min(int(request.args.get('limit') or 60), 200)
        rows = db.query("""SELECT e.*, v.name AS project FROM ledger_entries e
                           LEFT JOIN ventures v ON v.id = e.venture_id
                           WHERE e.person_id = ?
                           ORDER BY e.happened_on DESC, e.id DESC LIMIT ?""",
                        (pid, _lim)) or []
        older = (db.query("SELECT COUNT(*) AS n FROM ledger_entries WHERE person_id = ?",
                          (pid,)) or [{"n": 0}])[0]['n'] - len(rows)
        lines = []
        for r in rows:
            lines.append({
                "id": r['id'], "kind": r['kind'], "who_owes": r['who_owes'],
                "amount": r['amount'], "currency": r['currency'],
                "usd": _in_usd(r['amount'], r['currency']),
                "note": r.get('note') or '', "on": r.get('happened_on'),
                "project": r.get('project'), "status": r.get('status'),
                "moved": (db.query("""SELECT was, now_is, why FROM ledger_changes
                                      WHERE entry_id = ? ORDER BY id""", (r['id'],)) or []),
            })
        return {"status": "success",
                "person": {"id": p[0]['id'], "name": p[0]['name'],
                           "what_they_do": p[0].get('what_they_do') or '',
                           "phone": p[0].get('phone') or ''},
                "balances": _ledger_balance(pid),
                "lines": lines,
                "older_not_shown": max(0, older)}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/overview")
@require_password
def ledger_overview():
    """Who owes him, who he owes, across everything."""
    try:
        people = db.query("""SELECT id, name, what_they_do FROM ledger_people
                             WHERE COALESCE(active,1) = 1""") or []
        owed_to_him, he_owes = [], []
        for p in people:
            for cur, b in (_ledger_balance(p['id']) or {}).items():
                if abs(b['net']) < 0.01:
                    continue
                row = {"id": p['id'], "name": p['name'],
                       "what_they_do": p.get('what_they_do') or '',
                       "amount": abs(b['net']), "currency": cur,
                       "usd": b['usd']}
                (owed_to_him if b['net'] > 0 else he_owes).append(row)
        owed_to_him.sort(key=lambda x: -(x['usd'] or x['amount']))
        he_owes.sort(key=lambda x: -(x['usd'] or x['amount']))
        return {"status": "success",
                "they_owe_him": owed_to_him,
                "he_owes": he_owes,
                "totals_usd": {
                    "they_owe": round(sum(x['usd'] or 0 for x in owed_to_him), 2),
                    "he_owes": round(sum(x['usd'] or 0 for x in he_owes), 2)}}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/loans")
@require_password
def ledger_loans():
    """Only the lending, both ways, with what is left and when it clears."""
    try:
        from datetime import datetime as _dn
        rows = db.query("""SELECT e.*, p.name FROM ledger_entries e
                           JOIN ledger_people p ON p.id = e.person_id
                           WHERE e.kind IN ('lent','borrowed')
                           ORDER BY e.happened_on DESC""") or []
        out = []
        for r in rows:
            pid = r['person_id']
            principal = float(r['amount'] or 0)
            back = (db.query("""SELECT COALESCE(SUM(amount),0) AS s FROM ledger_entries
                                WHERE person_id = ? AND kind = 'repaid'
                                  AND COALESCE(currency,'USD') = ?""",
                             (pid, r['currency'] or 'USD')) or [{"s": 0}])[0]['s'] or 0
            left = round(principal - float(back), 2)
            per = float(r.get('repay_amount') or 0)
            months = (int(left / per) + (1 if left % per else 0)) if per > 0 and left > 0 else None
            out.append({
                "id": r['id'], "who": r['name'],
                "direction": ("he lent" if r['kind'] == 'lent' else "he borrowed"),
                "principal": principal, "repaid": round(float(back), 2),
                "left": max(0, left), "currency": r['currency'],
                "usd_left": _in_usd(max(0, left), r['currency']),
                "note": r.get('note') or '', "since": r.get('happened_on'),
                "repay_amount": r.get('repay_amount'),
                "repay_every": r.get('repay_every'),
                "months_to_clear": months,
                "interest_rate": r.get('interest_rate'),
                "status": r.get('status')})
        return {"status": "success", "loans": out}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/project/<int:vid>")
@require_password
def ledger_project(vid):
    """What this job has cost, who is on it, and where estimates moved."""
    try:
        ids = _all_under(vid)
        inlist = ",".join(str(i) for i in ids)
        v = db.query("SELECT name FROM ventures WHERE id = ?", (vid,))
        rows = db.query("""SELECT e.*, p.name FROM ledger_entries e
                           LEFT JOIN ledger_people p ON p.id = e.person_id
                           WHERE e.venture_id IN (""" + inlist + """)
                           ORDER BY e.happened_on""") or []
        folk, agreed, paid, bought = {}, 0.0, 0.0, 0.0
        cur = 'USD'
        for r in rows:
            cur = r.get('currency') or cur
            amt = float(r.get('amount') or 0)
            who = r.get('name') or 'materials'
            f = folk.setdefault(who, {"agreed": 0.0, "paid": 0.0, "bought": 0.0})
            if str(r.get('status')) == 'forgiven':
                continue
            if r['kind'] == 'agreed':
                f['agreed'] += amt; agreed += amt
            elif r['kind'] == 'paid':
                f['paid'] += amt; paid += amt
            elif r['kind'] == 'bought':
                f['bought'] += amt; bought += amt
        moved = db.query("""SELECT c.was, c.now_is, c.why, e.note, p.name
                            FROM ledger_changes c
                            JOIN ledger_entries e ON e.id = c.entry_id
                            LEFT JOIN ledger_people p ON p.id = e.person_id
                            WHERE e.venture_id IN (""" + inlist + """)
                            ORDER BY c.id DESC LIMIT 12""") or []
        return {"status": "success",
                "project": (v[0]['name'] if v else ''),
                "currency": cur,
                "people": [{"name": k, "agreed": round(x['agreed'], 2),
                            "paid": round(x['paid'], 2), "bought": round(x['bought'], 2),
                            "owed": round(x['agreed'] - x['paid'], 2)}
                           for k, x in sorted(folk.items())],
                "totals": {"agreed": round(agreed, 2), "paid": round(paid, 2),
                           "bought": round(bought, 2),
                           "spent": round(paid + bought, 2),
                           "owed": round(agreed - paid, 2),
                           "usd_spent": _in_usd(paid + bought, cur)},
                "moved": moved}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/ledger/entry' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("one ledger: people, entries, balances, loans, projects, the overview")
else:
    print("broke: " + err)
