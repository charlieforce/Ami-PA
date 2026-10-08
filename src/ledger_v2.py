#!/usr/bin/env python3
"""Two hands.

"You borrowed 5,000" is how a programmer thinks. He reads it as two columns:
what came in, and what went back. The difference between them is what he owes.

Also: how the money moved. 500 CAD on 9 November by e-transfer is a different
fact from 500 CAD in cash, and when he is checking against Ingie's own record
that is the detail that settles it.

And a job should list its people so he can tap through to one, rather than
being a wall of text with nowhere to go.

Run from the src folder with:  python3 ledger_v2.py
"""
import sqlite3, subprocess, sys, tempfile, os

DB = os.getenv("AMI_DB_PATH", "data/ami_memory.db")

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

db = sqlite3.connect(DB)
have = {r[1] for r in db.execute("PRAGMA table_info(ledger_entries)")}
if 'how_sent' not in have:
    db.execute("ALTER TABLE ledger_entries ADD COLUMN how_sent TEXT")
    print("  added how_sent")
db.commit(); db.close()
print("ready")

EP = '''HOW_SENT = ['cash', 'bank transfer', 'mobile money', 'PayPal', 'e-transfer',
            'cheque', 'other']


@app.get("/api/ledger/how-sent")
@require_password
def ledger_how_sent():
    return {"status": "success", "ways": HOW_SENT}


@app.get("/api/ledger/account/<int:pid>")
@require_password
def ledger_account(pid):
    """Two hands: what came in, what went back, and the difference.

    Gifts show on the incoming side so he can see them, but they never
    count toward what he owes.
    """
    try:
        p = db.query("SELECT * FROM ledger_people WHERE id = ?", (pid,))
        if not p:
            return {"error": "no such person"}, 404
        _lim = min(int(request.args.get('limit') or 40), 200)
        rows = db.query("""SELECT e.*, v.name AS project FROM ledger_entries e
                           LEFT JOIN ventures v ON v.id = e.venture_id
                           WHERE e.person_id = ?
                           ORDER BY e.happened_on DESC, e.id DESC LIMIT ?""",
                        (pid, _lim)) or []
        total = (db.query("SELECT COUNT(*) AS n FROM ledger_entries WHERE person_id = ?",
                          (pid,)) or [{"n": 0}])[0]['n']

        came_in, went_back, gifts = [], [], []
        for r in rows:
            line = {"id": r['id'], "kind": r['kind'], "amount": r['amount'],
                    "currency": r['currency'], "usd": _in_usd(r['amount'], r['currency']),
                    "note": r.get('note') or '', "on": r.get('happened_on'),
                    "how_sent": r.get('how_sent') or '', "project": r.get('project'),
                    "status": r.get('status'),
                    "moved": (db.query("""SELECT was, now_is, why FROM ledger_changes
                                          WHERE entry_id = ? ORDER BY id""",
                                       (r['id'],)) or [])}
            k = str(r['kind'])
            if k == 'gift':
                gifts.append(line)
            elif k in ('paid', 'repaid'):
                went_back.append(line)
            else:
                came_in.append(line)

        bal = _ledger_balance(pid)
        return {"status": "success",
                "person": {"id": p[0]['id'], "name": p[0]['name'],
                           "what_they_do": p[0].get('what_they_do') or '',
                           "phone": p[0].get('phone') or ''},
                "balances": bal,
                "came_in": came_in,
                "went_back": went_back,
                "gifts": gifts,
                "older_not_shown": max(0, total - len(rows)),
                "ways": HOW_SENT}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/job/<int:vid>")
@require_password
def ledger_job(vid):
    """The job's figures, plus who is on it so he can tap through."""
    try:
        d = ledger_project(vid)
        if isinstance(d, tuple):
            d = d[0]
        if not isinstance(d, dict) or d.get('error'):
            return {"error": "could not read that job"}, 400
        ids = _all_under(vid)
        inlist = ",".join(str(i) for i in ids)
        folk = db.query("""SELECT DISTINCT p.id, p.name, p.what_they_do
                           FROM ledger_entries e
                           JOIN ledger_people p ON p.id = e.person_id
                           WHERE e.venture_id IN (""" + inlist + """)
                           ORDER BY p.name""") or []
        out = []
        for f in folk:
            bal = _ledger_balance(f['id'])
            first = list(bal.items())[0] if bal else None
            out.append({"id": f['id'], "name": f['name'],
                        "what_they_do": f.get('what_they_do') or '',
                        "currency": (first[0] if first else ''),
                        "net": (first[1]['net'] if first else 0)})
        title, L = _report_project(vid)
        return {"status": "success", "project": d.get('project'),
                "totals": d.get('totals'), "materials": d.get('materials') or [],
                "people": out, "report": "\\n".join(L) if L else ''}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
done = []
if '/api/ledger/account/' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
# the entry endpoint should keep how_sent
o = """                    d.get('happened_on') or _dl.now().strftime('%Y-%m-%d'),
                    d.get('interest_rate'), d.get('repay_amount'),
                    (d.get('repay_every') or None)))"""
n = """                    d.get('happened_on') or _dl.now().strftime('%Y-%m-%d'),
                    d.get('interest_rate'), d.get('repay_amount'),
                    (d.get('repay_every') or None)))
        if d.get('how_sent'):
            _last = db.query("SELECT id FROM ledger_entries ORDER BY id DESC LIMIT 1")
            if _last:
                db.execute("UPDATE ledger_entries SET how_sent = ? WHERE id = ?",
                           (str(d['how_sent'])[:30], _last[0]['id']))"""
if o in t:
    t = t.replace(o, n, 1); done.append("how it was sent is kept")
# and editing a line can change it
o2 = """        for f, col in (('note', 'note'), ('happened_on', 'happened_on'),
                       ('venture_id', 'venture_id'), ('repay_amount', 'repay_amount'),
                       ('repay_every', 'repay_every'), ('interest_rate', 'interest_rate')):"""
n2 = """        for f, col in (('note', 'note'), ('happened_on', 'happened_on'),
                       ('venture_id', 'venture_id'), ('repay_amount', 'repay_amount'),
                       ('repay_every', 'repay_every'), ('interest_rate', 'interest_rate'),
                       ('how_sent', 'how_sent')):"""
if o2 in t:
    t = t.replace(o2, n2, 1); done.append("and can be changed")
# the statement shows how it moved
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("two-sided account, how it was sent, and a job's people: " + ", ".join(done))
else:
    print("broke: " + err)
