#!/usr/bin/env python3
"""Rebuild the report so it tells the truth, and tells it about everything.

The old one only looked at tasks, only counted things marked done inside the
window, and read a history table that is empty. So it said "0 completed" when
there was work, and ignored 17 todos entirely.

The new one covers: work (tasks AND todos), where the attention went, what is
stuck, what is slipping, the ventures that went quiet, health, the body goals,
money going out, and what is coming. Ami reads all of it.

Run from  ~/Desktop/The Real Ami PA/src   with:  python3 rebuild_report.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

NEW = '''@app.get("/api/report2")
@require_password
def work_report_v2():
    """Everything at a glance - what moved, what stalled, and what needs him."""
    try:
        from datetime import datetime as _d, timedelta as _td
        period = request.args.get('period', 'week')
        days = {'week': 7, 'fortnight': 14, 'month': 30, 'quarter': 90}.get(period, 7)
        now = _charlie_now().replace(tzinfo=None)
        today = now.strftime('%Y-%m-%d')
        since = (now - _td(days=days)).strftime('%Y-%m-%d')
        before = (now - _td(days=days * 2)).strftime('%Y-%m-%d')

        def _day(v):
            return str(v or '')[:10]

        out = {"period": period, "days": days, "generated_at": now.isoformat(),
               "from": since, "to": today}

        ventures = {r['id']: r['name'] for r in (db.query("SELECT id, name FROM ventures") or [])}
        tasks = db.query("SELECT * FROM tasks") or []
        todos = db.query("SELECT * FROM todos") or []

        DONE = ('done', 'completed', 'complete')
        OPEN = ('todo', 'pending', 'in_progress', 'doing', 'blocked')

        # ---- what actually moved, across BOTH boards ------------------------
        t_done = [t for t in tasks if (t.get('status') or '') in DONE
                  and _day(t.get('updated_at')) >= since]
        d_done = [t for t in todos if (t.get('status') or '') in DONE
                  and _day(t.get('completed_at') or t.get('updated_at')) >= since]
        t_made = [t for t in tasks if _day(t.get('created_at')) >= since]
        d_made = [t for t in todos if _day(t.get('created_at')) >= since]
        was_done = [t for t in tasks if (t.get('status') or '') in DONE
                    and before <= _day(t.get('updated_at')) < since]
        was_done += [t for t in todos if (t.get('status') or '') in DONE
                     and before <= _day(t.get('completed_at') or t.get('updated_at')) < since]

        t_open = [t for t in tasks if (t.get('status') or '') in OPEN]
        d_open = [t for t in todos if (t.get('status') or '') in OPEN]
        in_flight = [t for t in tasks if (t.get('status') or '') == 'in_progress']

        out['movement'] = {
            "finished": len(t_done) + len(d_done),
            "finished_before": len(was_done),
            "made": len(t_made) + len(d_made),
            "open_now": len(t_open) + len(d_open),
            "in_flight": len(in_flight),
            "net": (len(t_made) + len(d_made)) - (len(t_done) + len(d_done)),
            "tasks_open": len(t_open), "todos_open": len(d_open),
        }

        # ---- where the attention went (everything touched, not just finished)
        attention = {}
        for t in tasks:
            if _day(t.get('updated_at')) >= since or _day(t.get('created_at')) >= since:
                nm = ventures.get(t.get('venture_id')) or 'Not tied to a venture'
                a = attention.setdefault(nm, {"touched": 0, "finished": 0, "open": 0})
                a['touched'] += 1
                if (t.get('status') or '') in DONE:
                    a['finished'] += 1
                elif (t.get('status') or '') in OPEN:
                    a['open'] += 1
        out['attention'] = dict(sorted(attention.items(),
                                       key=lambda kv: -kv[1]['touched'])[:8])

        # ---- the ventures that have gone quiet ------------------------------
        quiet = []
        for vid, nm in ventures.items():
            mine = [t for t in tasks if t.get('venture_id') == vid]
            if not mine:
                quiet.append({"venture": nm, "last_touched": None, "days_quiet": None,
                              "open": 0, "note": "nothing on the board at all"})
                continue
            last = max((_day(t.get('updated_at')) or _day(t.get('created_at')) or '')
                       for t in mine)
            try:
                gap = (now.date() - _d.strptime(last, '%Y-%m-%d').date()).days
            except Exception:
                gap = None
            if gap is None or gap > days:
                quiet.append({"venture": nm, "last_touched": last, "days_quiet": gap,
                              "open": len([t for t in mine if (t.get('status') or '') in OPEN])})
        out['gone_quiet'] = sorted(quiet, key=lambda v: -(v['days_quiet'] or 9999))[:6]

        # ---- what is stuck --------------------------------------------------
        stuck = []
        for t in t_open + d_open:
            d0 = _day(t.get('updated_at')) or _day(t.get('created_at'))
            if not d0:
                continue
            try:
                age = (now.date() - _d.strptime(d0, '%Y-%m-%d').date()).days
            except Exception:
                continue
            if age > 14:
                stuck.append({"title": (t.get('title') or '')[:70], "days": age,
                              "venture": ventures.get(t.get('venture_id')) or ''})
        out['stuck'] = sorted(stuck, key=lambda x: -x['days'])[:8]

        # ---- what is slipping -----------------------------------------------
        late = []
        for t in t_open + d_open:
            dd = _day(t.get('due_date'))
            if dd and dd < today:
                try:
                    by = (now.date() - _d.strptime(dd, '%Y-%m-%d').date()).days
                except Exception:
                    continue
                late.append({"title": (t.get('title') or '')[:70], "days_late": by,
                             "venture": ventures.get(t.get('venture_id')) or ''})
        out['slipping'] = sorted(late, key=lambda x: -x['days_late'])[:8]
        out['movement']['late'] = len(late)

        # ---- his body -------------------------------------------------------
        body = {}
        try:
            for g in (db.query("SELECT * FROM fitness_goals WHERE active = 1") or []):
                hit = db.query("""SELECT COUNT(DISTINCT done_on) c FROM goal_log
                                  WHERE goal_id = ? AND done_on >= ?""", (g['id'], since))
                body[g['name']] = {"target": g.get('target'), "per": g.get('per'),
                                   "days_logged": (hit[0]['c'] if hit else 0)}
        except Exception:
            pass
        out['body'] = body

        # ---- his health ------------------------------------------------------
        health = {}
        try:
            bp = db.query("""SELECT systolic, diastolic, taken_at FROM bp_readings
                             WHERE DATE(taken_at) >= ? ORDER BY taken_at""", (since,)) or []
            if bp:
                health['bp_readings'] = len(bp)
                health['bp_average'] = (str(round(sum(b['systolic'] for b in bp) / len(bp))) + "/"
                                        + str(round(sum(b['diastolic'] for b in bp) / len(bp))))
                health['bp_latest'] = str(bp[-1]['systolic']) + "/" + str(bp[-1]['diastolic'])
            else:
                health['bp_readings'] = 0
            meds = db.query("SELECT COUNT(*) c FROM medications WHERE stopped_on IS NULL")
            taken = db.query("""SELECT COUNT(*) c FROM medication_log WHERE taken_on >= ?""", (since,))
            health['medications'] = meds[0]['c'] if meds else 0
            health['doses_logged'] = taken[0]['c'] if taken else 0
        except Exception:
            pass
        out['health'] = health

        # ---- money going out -------------------------------------------------
        money = {}
        try:
            subs = db.query("""SELECT name, amount, currency, cycle, next_renewal
                               FROM subscriptions WHERE status = 'active'""") or []
            per_month = {'monthly': 1, 'yearly': 1 / 12.0, 'quarterly': 1 / 3.0, 'weekly': 4.33}
            money['subscriptions'] = len(subs)
            money['monthly_total'] = round(sum((s.get('amount') or 0)
                                               * per_month.get(s.get('cycle'), 1) for s in subs), 2)
            money['renewing_soon'] = [
                {"name": s['name'], "amount": s.get('amount'), "on": _day(s.get('next_renewal'))}
                for s in subs if _day(s.get('next_renewal')) and _day(s['next_renewal'])
                <= (now + _td(days=14)).strftime('%Y-%m-%d')]
            pr = db.query("SELECT COUNT(*) c FROM price_entries WHERE observed_on >= ?", (since,))
            money['prices_logged'] = pr[0]['c'] if pr else 0
        except Exception:
            pass
        out['money'] = money

        # ---- what is coming ---------------------------------------------------
        try:
            out['coming'] = [
                {"where": r['location'], "on": _day(r['travel_date'])}
                for r in (db.query("""SELECT location, travel_date FROM timezone_schedule
                                      WHERE travel_date >= date('now')
                                        AND travel_date LIKE '____-__-__'
                                      ORDER BY travel_date LIMIT 4""") or [])]
        except Exception:
            out['coming'] = []

        return {"status": "success", **out}
    except Exception as e:
        import traceback as _tb
        _tb.print_exc()
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/report2' in s:
    print("already there"); raise SystemExit

t = s.replace('@app.get("/api/report")', NEW + '@app.get("/api/report")', 1)
good, err = ok(t)
if not good:
    print("BROKE, not written: " + err); raise SystemExit
open('app.py', 'w').write(t)
print("the new report is in, at /api/report2")
print("the old one is untouched, so nothing breaks while you look at the new one")
