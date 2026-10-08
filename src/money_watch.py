#!/usr/bin/env python3
"""Her noticing things, and the rest of what makes this useful.

A record you have to interrogate is only half of it. She has the data now,
so she should be the one to speak first:

  a loan with nothing repaid in three months
  a quote that has drifted more than a fifth
  a job where the spend has passed what was agreed
  a repayment due this week
  a material bought at well over the estimate

Plus: what is coming over the next few months, a search across every line,
and a spreadsheet out for GII's accounts.

Run from the src folder with:  python3 money_watch.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

EP = '''def _money_worth_saying():
    """Things about the money he would want flagged. Quiet when all is well."""
    from datetime import datetime as _dw, timedelta as _tw
    out = []
    today = _charlie_now().replace(tzinfo=None)

    # a loan going quiet
    try:
        loans = db.query("""SELECT e.id, e.person_id, e.amount, e.currency, e.happened_on,
                                   e.repay_amount, e.repay_every, p.name
                            FROM ledger_entries e
                            JOIN ledger_people p ON p.id = e.person_id
                            WHERE e.kind IN ('lent','borrowed')
                              AND COALESCE(e.status,'open') = 'open'""") or []
        for l in loans:
            last = db.query("""SELECT MAX(happened_on) AS d FROM ledger_entries
                               WHERE person_id = ? AND kind = 'repaid'""",
                            (l['person_id'],))
            when = (last[0]['d'] if last else None) or l.get('happened_on')
            if not when:
                continue
            try:
                gap = (today - _dw.strptime(str(when)[:10], '%Y-%m-%d')).days
            except Exception:
                continue
            if gap >= 90:
                out.append({"kind": "quiet loan", "who": l['name'],
                            "says": l['name'] + " - nothing moved on that loan in "
                                    + str(gap // 30) + " months."})
    except Exception:
        pass

    # a quote that has drifted
    try:
        moved = db.query("""SELECT c.was, c.now_is, e.note, p.name, v.name AS job
                            FROM ledger_changes c
                            JOIN ledger_entries e ON e.id = c.entry_id
                            LEFT JOIN ledger_people p ON p.id = e.person_id
                            LEFT JOIN ventures v ON v.id = e.venture_id
                            WHERE c.changed_at >= date('now','-60 days')""") or []
        for m in moved:
            was, now = float(m['was'] or 0), float(m['now_is'] or 0)
            if was > 0 and (now - was) / was >= 0.2:
                out.append({"kind": "drift",
                            "says": (str(m.get('name') or 'that quote') + " - "
                                     + str(m.get('note') or 'the work') + " went from "
                                     + "{:,.0f}".format(was) + " to "
                                     + "{:,.0f}".format(now) + ", "
                                     + "{:+.0f}".format((now - was) / was * 100) + "%.")})
    except Exception:
        pass

    # a job spending past what was agreed
    try:
        jobs = db.query("""SELECT v.name,
                                  (SELECT COALESCE(SUM(amount),0) FROM ledger_entries e
                                   WHERE e.venture_id = v.id AND e.kind = 'agreed') AS agreed,
                                  (SELECT COALESCE(SUM(amount),0) FROM ledger_entries e2
                                   WHERE e2.venture_id = v.id
                                     AND e2.kind IN ('paid','bought')) AS spent
                           FROM ventures v WHERE COALESCE(v.active,1) = 1""") or []
        for j in jobs:
            a, sp = float(j['agreed'] or 0), float(j['spent'] or 0)
            if a > 0 and sp > a * 1.05:
                out.append({"kind": "over",
                            "says": (str(j['name']) + " has gone past what was agreed - "
                                     + "{:,.0f}".format(sp) + " out against "
                                     + "{:,.0f}".format(a) + ".")})
    except Exception:
        pass

    # a repayment due about now
    try:
        due = db.query("""SELECT e.person_id, e.repay_amount, e.currency, p.name
                          FROM ledger_entries e
                          JOIN ledger_people p ON p.id = e.person_id
                          WHERE e.kind IN ('lent','borrowed')
                            AND COALESCE(e.repay_amount,0) > 0
                            AND COALESCE(e.status,'open') = 'open'""") or []
        for d in due:
            last = db.query("""SELECT MAX(happened_on) AS d FROM ledger_entries
                               WHERE person_id = ? AND kind = 'repaid'""", (d['person_id'],))
            when = last[0]['d'] if last else None
            if not when:
                continue
            try:
                gap = (today - _dw.strptime(str(when)[:10], '%Y-%m-%d')).days
            except Exception:
                continue
            if 28 <= gap <= 45:
                out.append({"kind": "due",
                            "says": (str(d['name']) + " - "
                                     + "{:,.0f}".format(float(d['repay_amount'] or 0))
                                     + " " + str(d['currency'] or '')
                                     + " is about due.")})
    except Exception:
        pass
    return out[:6]


@app.get("/api/ledger/watch")
@require_password
def ledger_watch():
    try:
        return {"status": "success", "notes": _money_worth_saying()}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/coming")
@require_password
def ledger_coming():
    """What he is on the hook for over the next few months."""
    try:
        months = max(1, min(int(request.args.get('months') or 3), 24))
        owed = {}
        rows = db.query("""SELECT e.currency, e.kind, e.amount, e.who_owes, e.status
                           FROM ledger_entries e""") or []
        for r in rows:
            if str(r.get('status')) in ('forgiven', 'done'):
                continue
            cur = (r.get('currency') or 'USD').upper()[:4]
            amt = float(r.get('amount') or 0)
            k, side = str(r['kind']), str(r.get('who_owes') or 'them')
            b = owed.setdefault(cur, 0.0)
            if side == 'me' and k in ('borrowed', 'bought', 'agreed'):
                owed[cur] = b + amt
            elif side == 'me' and k in ('repaid', 'paid'):
                owed[cur] = b - amt
            elif side == 'them' and k == 'agreed':
                owed[cur] = b + amt
            elif side == 'them' and k == 'paid':
                owed[cur] = b - amt
        stip = (db.query("""SELECT COALESCE(SUM(monthly),0) AS s FROM stipend_people
                            WHERE COALESCE(active,1) = 1""") or [{"s": 0}])[0]['s'] or 0
        subs = (db.query("""SELECT COALESCE(SUM(amount),0) AS s FROM subscriptions
                            WHERE status = 'active' AND cycle = 'monthly'""")
                or [{"s": 0}])[0]['s'] or 0
        out = []
        total_usd = 0.0
        for cur, amt in owed.items():
            if amt <= 0.01:
                continue
            u = _in_usd(amt, cur) or 0
            total_usd += u
            out.append({"currency": cur, "amount": round(amt, 2), "usd": u})
        return {"status": "success", "months": months,
                "owed_now": sorted(out, key=lambda x: -(x['usd'] or 0)),
                "stipends_a_month": round(float(stip), 2),
                "subscriptions_a_month": round(float(subs), 2),
                "owed_usd": round(total_usd, 2)}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/search")
@require_password
def ledger_search():
    """When did I pay for the doors? Across every line."""
    try:
        q = (request.args.get('q') or '').strip()
        if len(q) < 2:
            return {"status": "success", "found": []}
        rows = db.query("""SELECT e.*, p.name AS person, v.name AS job
                           FROM ledger_entries e
                           LEFT JOIN ledger_people p ON p.id = e.person_id
                           LEFT JOIN ventures v ON v.id = e.venture_id
                           WHERE LOWER(COALESCE(e.note,'')) LIKE LOWER(?)
                              OR LOWER(COALESCE(p.name,'')) LIKE LOWER(?)
                              OR LOWER(COALESCE(v.name,'')) LIKE LOWER(?)
                           ORDER BY e.happened_on DESC LIMIT 40""",
                        ('%' + q + '%', '%' + q + '%', '%' + q + '%')) or []
        return {"status": "success",
                "found": [{"id": r['id'], "kind": r['kind'], "amount": r['amount'],
                           "currency": r['currency'], "note": r.get('note') or '',
                           "on": r.get('happened_on'), "person": r.get('person'),
                           "person_id": r.get('person_id'), "job": r.get('job'),
                           "how_sent": r.get('how_sent') or ''} for r in rows]}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/export.csv")
@require_password
def ledger_export():
    """Every line, for a spreadsheet or an accountant."""
    try:
        from flask import Response
        import io as _ic, csv as _cs
        where, args = "", []
        vid = request.args.get('job')
        if vid:
            ids = _all_under(int(vid))
            where = " WHERE e.venture_id IN (" + ",".join(str(i) for i in ids) + ")"
        rows = db.query("""SELECT e.happened_on, p.name AS person, v.name AS job,
                                  e.kind, e.amount, e.currency, e.note, e.how_sent,
                                  e.quantity, e.unit, e.unit_price, e.status
                           FROM ledger_entries e
                           LEFT JOIN ledger_people p ON p.id = e.person_id
                           LEFT JOIN ventures v ON v.id = e.venture_id"""
                        + where + " ORDER BY e.happened_on, e.id") or []
        buf = _ic.StringIO()
        w = _cs.writer(buf)
        w.writerow(['date', 'person', 'job', 'what happened', 'amount', 'currency',
                    'about USD', 'note', 'how it moved', 'quantity', 'unit',
                    'price each', 'status'])
        for r in rows:
            w.writerow([r.get('happened_on'), r.get('person') or '', r.get('job') or '',
                        r.get('kind'), r.get('amount'), r.get('currency'),
                        _in_usd(r.get('amount'), r.get('currency')) or '',
                        r.get('note') or '', r.get('how_sent') or '',
                        r.get('quantity') or '', r.get('unit') or '',
                        r.get('unit_price') or '', r.get('status') or 'open'])
        return Response(buf.getvalue(), mimetype='text/csv',
                        headers={'Content-Disposition':
                                 'attachment; filename=money.csv'})
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/ledger/watch' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
# and she carries it into the strip
o = """        # what he is learning today - named if one or two, counted if more"""
n = """        # money worth mentioning - a loan gone quiet, a quote that drifted
        try:
            for _mw in (_money_worth_saying() or [])[:2]:
                out['decide'].append({"what": _mw['says'][:70],
                                      "ask": "what do I owe and who owes me?"})
        except Exception:
            pass

        # what he is learning today - named if one or two, counted if more"""
if o in t:
    t = t.replace(o, n, 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("she notices; plus what is coming, search, and a spreadsheet out")
else:
    print("broke: " + err)
