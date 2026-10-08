#!/usr/bin/env python3
"""Adding work to a job, from the job's own page.

"We just agreed a revamp of the Promoga website" - and there was nowhere to
put it. The job showed what already existed and offered no way in.

So: tap a job, add whoever is doing the work, say what you agreed, and it
lands on both the job and that person's account.

Run from the src folder with:  python3 job_work.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

EP = '''@app.post("/api/ledger/job/<int:vid>/work")
@require_password
def ledger_job_add_work(vid):
    """Somebody is doing something on this job for an agreed amount.

    Takes either an existing person_id, or a name - in which case they are
    added to the book first, matched against his contacts.
    """
    try:
        from datetime import datetime as _dj
        d = request.get_json() or {}
        pid = d.get('person_id')
        if not pid:
            name = (d.get('name') or '').strip()[:60]
            if len(name) < 2:
                return {"error": "who is doing it?"}, 400
            found = db.query("SELECT id FROM ledger_people WHERE LOWER(name) = LOWER(?)",
                             (name,))
            if found:
                pid = found[0]['id']
            else:
                cid, full = _find_contact(name)
                db.execute("""INSERT INTO ledger_people (name, what_they_do, contact_id)
                              VALUES (?, ?, ?)""",
                           (full or name, (d.get('what_they_do') or '')[:40], cid))
                r = db.query("SELECT id FROM ledger_people ORDER BY id DESC LIMIT 1")
                if not r:
                    return {"error": "could not add them"}, 400
                pid = r[0]['id']

        amount = float(d.get('amount') or 0)
        what = (d.get('what') or d.get('note') or '').strip()[:160]
        if amount <= 0 or len(what) < 2:
            return {"error": "what was agreed, and for how much?"}, 400

        cur = (d.get('currency') or '').upper()[:4]
        if not cur:
            cur = _job_currency(vid)
        db.execute("""INSERT INTO ledger_entries (person_id, venture_id, kind, who_owes,
                      amount, currency, note, happened_on)
                      VALUES (?, ?, 'agreed', 'them', ?, ?, ?, ?)""",
                   (int(pid), vid, amount, cur, what,
                    d.get('happened_on') or _dj.now().strftime('%Y-%m-%d')))
        if not db.query("""SELECT id FROM ledger_entries WHERE person_id = ?
                           AND venture_id = ? AND note = ? ORDER BY id DESC LIMIT 1""",
                        (pid, vid, what)):
            return {"error": "it did not save"}, 400
        return {"status": "success", "person_id": pid}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/ledger/job/<int:vid>/thing")
@require_password
def ledger_job_add_thing(vid):
    """Something to buy for the job - no person attached. A fridge, cement."""
    try:
        from datetime import datetime as _dj
        d = request.get_json() or {}
        amount = float(d.get('amount') or 0)
        what = (d.get('what') or '').strip()[:160]
        if amount <= 0 or len(what) < 2:
            return {"error": "what is it, and roughly how much?"}, 400
        got = bool(d.get('got_it'))
        cur = (d.get('currency') or '').upper()[:4] or _job_currency(vid)
        db.execute("""INSERT INTO ledger_entries (person_id, venture_id, kind, who_owes,
                      amount, currency, note, happened_on)
                      VALUES (NULL, ?, ?, 'them', ?, ?, ?, ?)""",
                   (vid, ('paid' if got else 'agreed'), amount, cur, what,
                    d.get('happened_on') or _dj.now().strftime('%Y-%m-%d')))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/jobs")
@require_password
def ledger_jobs():
    """Every job, with what is on it. The quiet ones are marked so the
    screen can tuck them away rather than listing thirty ventures."""
    try:
        rows = db.query("""SELECT v.id, v.name, v.parent_id,
                                  (SELECT COUNT(*) FROM ledger_entries e
                                   WHERE e.venture_id = v.id) AS lines,
                                  (SELECT COALESCE(SUM(amount),0) FROM ledger_entries e2
                                   WHERE e2.venture_id = v.id AND e2.kind = 'agreed')
                                    AS agreed,
                                  (SELECT COALESCE(SUM(amount),0) FROM ledger_entries e3
                                   WHERE e3.venture_id = v.id
                                     AND e3.kind IN ('paid','bought')) AS spent
                           FROM ventures v
                           WHERE COALESCE(v.active,1) = 1
                           ORDER BY lines DESC, v.name""") or []
        out = []
        for r in rows:
            a, sp = float(r['agreed'] or 0), float(r['spent'] or 0)
            out.append({"id": r['id'], "name": r['name'],
                        "agreed": round(a, 2), "spent": round(sp, 2),
                        "owed": round(a - sp, 2),
                        "currency": _job_currency(r['id']),
                        "quiet": not r['lines']})
        return {"status": "success", "jobs": out}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/ledger/job/<int:vid>/work' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("work and things can be added straight onto a job")
else:
    print("broke: " + err)
