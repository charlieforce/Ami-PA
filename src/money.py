#!/usr/bin/env python3
"""Tracking what a project actually costs, and what he was told it would cost.

The Freetown house ran on a spreadsheet and a notebook. Mr Allie quotes 5000
for the grounds, asks for 1000 after a month, and three months later the
grounds cost 6500. Aminata pays them and keeps her own book. Nobody can say
what is outstanding without an afternoon of adding up.

So: people, what they quoted, what they have been paid, and what materials
cost. Kept per project, so the next build can be compared to the last.

The part that matters most is the drift. A quote that changes is not noise -
it is the single most useful number he has, because next time he will know
to add thirty percent to whatever anyone tells him.

Run from the src folder with:  python3 money.py
"""
import sqlite3, subprocess, sys, tempfile, os

DB = os.getenv("AMI_DB_PATH", "data/ami_memory.db")

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

db = sqlite3.connect(DB)

# who is on the job - Mr Allie, the paint guy, the wells guy
db.execute("""CREATE TABLE IF NOT EXISTS job_people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venture_id INTEGER,
    name TEXT,
    trade TEXT,
    phone TEXT,
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")

# a piece of work, and what it was quoted at
db.execute("""CREATE TABLE IF NOT EXISTS job_quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venture_id INTEGER,
    person_id INTEGER,
    what TEXT,
    amount REAL,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'agreed',
    agreed_on TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")

# every time that quote changed, and why. this is the useful bit.
db.execute("""CREATE TABLE IF NOT EXISTS job_quote_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER,
    was REAL,
    now_is REAL,
    why TEXT,
    changed_at TEXT DEFAULT CURRENT_TIMESTAMP)""")

# money out, against a quote or just materials
db.execute("""CREATE TABLE IF NOT EXISTS job_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venture_id INTEGER,
    person_id INTEGER,
    quote_id INTEGER,
    amount REAL,
    currency TEXT DEFAULT 'USD',
    kind TEXT DEFAULT 'labour',
    what TEXT,
    paid_on TEXT,
    paid_by TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")

for sql in ("CREATE INDEX IF NOT EXISTS ix_jq_v ON job_quotes(venture_id)",
            "CREATE INDEX IF NOT EXISTS ix_jp_v ON job_payments(venture_id)",
            "CREATE INDEX IF NOT EXISTS ix_jpe_v ON job_people(venture_id)"):
    db.execute(sql)
db.commit(); db.close()
print("four tables ready: people, quotes, quote history, payments")

EP = '''def _money_for(pid):
    """Everything about one project's money, worked out rather than stored."""
    people = db.query("""SELECT id, name, trade FROM job_people
                         WHERE venture_id = ? AND COALESCE(active,1) = 1
                         ORDER BY name""", (pid,)) or []
    out = []
    for p in people:
        quotes = db.query("""SELECT id, what, amount, status FROM job_quotes
                             WHERE person_id = ? AND venture_id = ?
                             ORDER BY id""", (p['id'], pid)) or []
        quoted = sum(float(q['amount'] or 0) for q in quotes)
        paid = (db.query("""SELECT COALESCE(SUM(amount),0) AS s FROM job_payments
                            WHERE person_id = ? AND venture_id = ?""",
                         (p['id'], pid)) or [{"s": 0}])[0]['s'] or 0
        drift = []
        for q in quotes:
            h = db.query("""SELECT was, now_is, why, changed_at FROM job_quote_history
                            WHERE quote_id = ? ORDER BY id""", (q['id'],)) or []
            if h:
                drift.append({"what": q['what'], "first": h[0]['was'],
                              "now": q['amount'],
                              "moves": len(h),
                              "why": h[-1].get('why') or ''})
        out.append({
            "id": p['id'], "name": p['name'], "trade": p.get('trade') or '',
            "quoted": round(quoted, 2), "paid": round(float(paid), 2),
            "owed": round(quoted - float(paid), 2),
            "quotes": [{"id": q['id'], "what": q['what'],
                        "amount": q['amount'], "status": q['status']} for q in quotes],
            "drift": drift,
        })
    materials = (db.query("""SELECT COALESCE(SUM(amount),0) AS s FROM job_payments
                             WHERE venture_id = ? AND kind != 'labour'""",
                          (pid,)) or [{"s": 0}])[0]['s'] or 0
    return out, round(float(materials), 2)


@app.get("/api/money/<int:pid>")
@require_password
def money_board(pid):
    """What this job has cost, and what is still owed."""
    try:
        v = db.query("SELECT name FROM ventures WHERE id = ?", (pid,))
        people, materials = _money_for(pid)
        quoted = sum(p['quoted'] for p in people)
        paid = sum(p['paid'] for p in people)
        return {"status": "success",
                "project": (v[0]['name'] if v else ''),
                "people": people,
                "materials": materials,
                "totals": {"quoted": round(quoted, 2),
                           "paid_labour": round(paid, 2),
                           "materials": materials,
                           "spent": round(paid + materials, 2),
                           "still_owed": round(quoted - paid, 2)}}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/money/<int:pid>/person")
@require_password
def money_add_person(pid):
    """Mr Allie. The paint guy. The wells guy."""
    try:
        d = request.get_json() or {}
        name = (d.get('name') or '').strip()[:60]
        if len(name) < 2:
            return {"error": "he needs a name"}, 400
        if db.query("SELECT id FROM job_people WHERE venture_id = ? AND LOWER(name) = LOWER(?)",
                    (pid, name)):
            return {"error": "you already have someone by that name on this job"}, 400
        db.execute("""INSERT INTO job_people (venture_id, name, trade, phone, notes)
                      VALUES (?, ?, ?, ?, ?)""",
                   (pid, name, (d.get('trade') or '')[:40], (d.get('phone') or '')[:30],
                    (d.get('notes') or '')[:200]))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/money/<int:pid>/quote")
@require_password
def money_add_quote(pid):
    """What he said it would cost."""
    try:
        d = request.get_json() or {}
        who = d.get('person_id')
        what = (d.get('what') or '').strip()[:90]
        amount = float(d.get('amount') or 0)
        if not who or not what or amount <= 0:
            return {"error": "who, what, and how much"}, 400
        db.execute("""INSERT INTO job_quotes (venture_id, person_id, what, amount,
                                              currency, agreed_on, notes)
                      VALUES (?, ?, ?, ?, ?, ?, ?)""",
                   (pid, int(who), what, amount, (d.get('currency') or 'USD')[:4],
                    d.get('agreed_on') or None, (d.get('notes') or '')[:200]))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.put("/api/money/quote/<int:qid>")
@require_password
def money_change_quote(qid):
    """It went up. Keep what it was - that is the number worth having."""
    try:
        d = request.get_json() or {}
        new = float(d.get('amount') or 0)
        if new <= 0:
            return {"error": "how much now?"}, 400
        r = db.query("SELECT amount, what FROM job_quotes WHERE id = ?", (qid,))
        if not r:
            return {"error": "no such quote"}, 404
        was = float(r[0]['amount'] or 0)
        if abs(was - new) > 0.004:
            db.execute("""INSERT INTO job_quote_history (quote_id, was, now_is, why)
                          VALUES (?, ?, ?, ?)""",
                       (qid, was, new, (d.get('why') or '')[:140]))
        db.execute("UPDATE job_quotes SET amount = ? WHERE id = ?", (new, qid))
        return {"status": "success", "was": was, "now": new,
                "over": round(new - was, 2)}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/money/<int:pid>/payment")
@require_password
def money_add_payment(pid):
    """Money out. Aminata pays them; he records it."""
    try:
        d = request.get_json() or {}
        amount = float(d.get('amount') or 0)
        if amount <= 0:
            return {"error": "how much?"}, 400
        from datetime import datetime as _dp
        db.execute("""INSERT INTO job_payments (venture_id, person_id, quote_id, amount,
                                                currency, kind, what, paid_on, paid_by, notes)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                   (pid, d.get('person_id'), d.get('quote_id'), amount,
                    (d.get('currency') or 'USD')[:4], (d.get('kind') or 'labour')[:20],
                    (d.get('what') or '')[:90],
                    d.get('paid_on') or _dp.now().strftime('%Y-%m-%d'),
                    (d.get('paid_by') or '')[:40], (d.get('notes') or '')[:200]))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/money/<int:pid>/report")
@require_password
def money_report(pid):
    """The thing he sends Aminata. Who is owed what, and where the
    estimates moved."""
    try:
        v = db.query("SELECT name FROM ventures WHERE id = ?", (pid,))
        people, materials = _money_for(pid)
        quoted = sum(p['quoted'] for p in people)
        paid = sum(p['paid'] for p in people)

        lines = []
        name = v[0]['name'] if v else 'the job'
        lines.append(name)
        lines.append("")
        lines.append("Quoted in total: " + ("%,.0f" % quoted).replace(",", ",") + " USD")
        lines.append("Paid out so far: " + ("%,.0f" % paid) + " USD labour, "
                     + ("%,.0f" % materials) + " USD materials")
        lines.append("Still owed:      " + ("%,.0f" % (quoted - paid)) + " USD")
        lines.append("")
        lines.append("Who is owed what")
        for p in sorted(people, key=lambda x: -x['owed']):
            if p['quoted'] or p['paid']:
                lines.append("  " + p['name'] + (" (" + p['trade'] + ")" if p['trade'] else "")
                             + " - quoted " + ("%,.0f" % p['quoted'])
                             + ", paid " + ("%,.0f" % p['paid'])
                             + ", owed " + ("%,.0f" % p['owed']))

        moved = [(p, d) for p in people for d in p['drift']]
        if moved:
            lines.append("")
            lines.append("Where the estimates moved")
            for p, d in moved:
                first = float(d['first'] or 0)
                now = float(d['now'] or 0)
                pct = (" (" + ("%+.0f" % ((now - first) / first * 100)) + "%)") if first else ""
                lines.append("  " + p['name'] + " - " + str(d['what']) + ": "
                             + ("%,.0f" % first) + " then " + ("%,.0f" % now) + pct
                             + (" - " + d['why'] if d['why'] else ""))

        return {"status": "success", "report": "\\n".join(lines),
                "people": people, "materials": materials,
                "totals": {"quoted": round(quoted, 2), "paid": round(paid, 2),
                           "materials": materials,
                           "still_owed": round(quoted - paid, 2)}}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/money/compare")
@require_password
def money_compare():
    """What the last job cost, against this one. So he knows what to expect."""
    try:
        rows = db.query("""SELECT v.id, v.name,
                                  (SELECT COALESCE(SUM(amount),0) FROM job_quotes q
                                   WHERE q.venture_id = v.id) AS quoted,
                                  (SELECT COALESCE(SUM(amount),0) FROM job_payments p
                                   WHERE p.venture_id = v.id) AS spent
                           FROM ventures v
                           WHERE EXISTS (SELECT 1 FROM job_payments p WHERE p.venture_id = v.id)
                              OR EXISTS (SELECT 1 FROM job_quotes q WHERE q.venture_id = v.id)
                           ORDER BY v.name""") or []
        out = []
        for r in rows:
            q = float(r['quoted'] or 0)
            s = float(r['spent'] or 0)
            out.append({"id": r['id'], "name": r['name'],
                        "quoted": round(q, 2), "spent": round(s, 2),
                        "over_by": round(s - q, 2),
                        "over_pct": (round((s - q) / q * 100) if q else None)})
        return {"status": "success", "jobs": out}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/money/' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("the money board, the report, and the comparison across jobs")
else:
    print("broke: " + err)
