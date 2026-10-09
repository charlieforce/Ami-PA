#!/usr/bin/env python3
"""Keeping the people list from growing wild.

Every person loaded on every open, each one triggering its own balance
calculation. Fine at eight. At eighty it is eighty sets of queries before
the screen draws anything.

So: the ones with money outstanding first, capped, and the quiet ones
behind a count he can tap.

Run from the src folder with:  python3 people_paging.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

s = open('app.py').read()

o = '''@app.get("/api/ledger/people")
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
        return {"error": str(e)}, 400'''

n = '''@app.get("/api/ledger/people")
@require_password
def ledger_people():
    """Everyone he has money with. The live ones first, and only as many as
    a screen can usefully hold - the rest come when he asks for them."""
    try:
        lim = min(int(request.args.get('limit') or 40), 200)
        want_quiet = str(request.args.get('quiet') or '') == '1'
        hunt = (request.args.get('q') or '').strip()

        sql = ("SELECT id, name, what_they_do FROM ledger_people "
               "WHERE COALESCE(active,1) = 1 ")
        args = []
        if hunt:
            sql += "AND LOWER(name) LIKE LOWER(?) "
            args.append('%' + hunt + '%')
        sql += "ORDER BY name"
        rows = db.query(sql, tuple(args)) or []

        live, quiet = [], []
        for r in rows:
            bal = _ledger_balance(r['id'])
            has = any(abs(b['net']) > 0.01 for b in bal.values()) if bal else False
            entry = {"id": r['id'], "name": r['name'],
                     "what_they_do": r.get('what_they_do') or '',
                     "balances": (bal if has else {}), "quiet": not has}
            (live if has else quiet).append(entry)

        live.sort(key=lambda x: -max(
            (abs(b.get('usd') or b.get('net') or 0) for b in x['balances'].values()),
            default=0))

        if want_quiet:
            shown = quiet[:lim]
            return {"status": "success", "people": shown,
                    "more": max(0, len(quiet) - len(shown)), "showing": "quiet"}

        shown = live[:lim]
        return {"status": "success", "people": shown,
                "more": max(0, len(live) - len(shown)),
                "quiet_count": len(quiet)}
    except Exception as e:
        return {"error": str(e)}, 400'''

if o in s:
    t = s.replace(o, n, 1)
    good, err = ok(t)
    if good:
        open('app.py', 'w').write(t)
        print("the people list loads the live ones first, capped")
    else:
        print("broke: " + err)
else:
    print("anchor not found - the endpoint may have changed")
