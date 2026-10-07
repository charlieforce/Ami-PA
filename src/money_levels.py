#!/usr/bin/env python3
"""One level at a time.

Flat, this screen is already awkward: two phases, three rooms, Bo, Kakuma,
and it is October. By December it would be unusable.

So it opens on the top - GII, Personal - each showing everything beneath it.
Tap Personal and you get the Freetown house. Tap that and you get Phase I,
Phase II, and anyone working directly on the house itself. Never more than a
handful of rows, and the totals always include what is further down.

Run from the src folder with:  python3 money_levels.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

EP = '''def _spend_under(pid):
    """Everything this project and its children have quoted and spent."""
    ids = _all_under(pid)
    inlist = ",".join(str(i) for i in ids)
    q = (db.query("SELECT COALESCE(SUM(amount),0) AS s FROM job_quotes "
                  "WHERE venture_id IN (" + inlist + ")") or [{"s": 0}])[0]['s'] or 0
    p = (db.query("SELECT COALESCE(SUM(amount),0) AS s FROM job_payments "
                  "WHERE venture_id IN (" + inlist + ")") or [{"s": 0}])[0]['s'] or 0
    st = (db.query("SELECT COALESCE(SUM(r.amount),0) AS s FROM stipend_runs r "
                   "JOIN stipend_terms t ON t.id = r.term_id "
                   "WHERE t.venture_id IN (" + inlist + ")") or [{"s": 0}])[0]['s'] or 0
    comm = (db.query("SELECT COALESCE(SUM(sp.monthly),0) * 4 AS s FROM stipend_people sp "
                     "JOIN stipend_terms t ON t.id = sp.term_id "
                     "WHERE t.venture_id IN (" + inlist + ") "
                     "AND COALESCE(sp.active,1) = 1") or [{"s": 0}])[0]['s'] or 0
    return (float(q) + float(comm), float(p) + float(st))


@app.get("/api/money/level")
@require_password
def money_level():
    """What sits at this level, with everything beneath it counted in.
    No parent given means the top: GII, Personal, whatever he has."""
    try:
        parent = request.args.get('parent')
        if parent:
            pid = int(parent)
            kids = db.query("""SELECT id, name, type, stage FROM ventures
                               WHERE parent_id = ? AND COALESCE(active,1) = 1
                               ORDER BY name""", (pid,)) or []
            here = db.query("SELECT id, name FROM ventures WHERE id = ?", (pid,))
            crumbs, walk = [], pid
            for _ in range(6):
                r = db.query("SELECT id, name, parent_id FROM ventures WHERE id = ?", (walk,))
                if not r:
                    break
                crumbs.insert(0, {"id": r[0]['id'], "name": r[0]['name']})
                if not r[0].get('parent_id'):
                    break
                walk = r[0]['parent_id']
        else:
            kids = db.query("""SELECT id, name, type, stage FROM ventures
                               WHERE parent_id IS NULL AND COALESCE(active,1) = 1
                               ORDER BY name""") or []
            here, crumbs, pid = None, [], None

        rows = []
        for k in kids:
            quoted, spent = _spend_under(k['id'])
            has_kids = bool(db.query("SELECT id FROM ventures WHERE parent_id = ? "
                                     "AND COALESCE(active,1) = 1 LIMIT 1", (k['id'],)))
            rows.append({"id": k['id'], "name": k['name'],
                         "stage": k.get('stage') or '',
                         "quoted": round(quoted, 2), "spent": round(spent, 2),
                         "owed": round(quoted - spent, 2),
                         "goes_deeper": has_kids,
                         "currency": _job_currency(k['id'])})

        # anyone working directly at this level, not on a child
        people = []
        if pid:
            ps, _mat = _money_for(pid)
            people = [p for p in ps if p['quoted'] or p['paid']]

        tq = sum(r['quoted'] for r in rows) + sum(p['quoted'] for p in people)
        ts = sum(r['spent'] for r in rows) + sum(p['paid'] for p in people)
        return {"status": "success",
                "here": ({"id": here[0]['id'], "name": here[0]['name']} if here else None),
                "trail": crumbs,
                "under": rows,
                "people": people,
                "currency": (_job_currency(pid) if pid else 'USD'),
                "totals": {"quoted": round(tq, 2), "spent": round(ts, 2),
                           "owed": round(tq - ts, 2)}}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/money/level' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("one level at a time, with the totals rolled up")
else:
    print("broke: " + err)
