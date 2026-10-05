#!/usr/bin/env python3
"""Say something about the API spend only when it is worth saying.

Four cents a day is wallpaper. He stops seeing it, and then he misses the
day it matters. So: nothing on a normal day, and on an odd one it turns up
on the strip AND in the evening close-out, while he can still remember what
he did that caused it.

Unusual means any of:
  - today is 3x the normal day (median of the last 14) and over 20 cents
  - the month has passed half the budget
  - the calls today are 3x normal

Run from the src folder with:  python3 spend_watch.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

FN = '''def _spend_out_of_the_ordinary():
    """None on a normal day. Otherwise a short line saying what is odd."""
    try:
        rows = db.query("""SELECT DATE(created_at) d,
                                  ROUND(SUM(est_cost), 4) c,
                                  COUNT(*) n
                           FROM api_usage_logs
                           WHERE created_at >= date('now','-14 days')
                           GROUP BY DATE(created_at)
                           ORDER BY d""") or []
        if not rows:
            return None
        from datetime import datetime as _d
        today = _charlie_now().strftime('%Y-%m-%d')
        cur = next((r for r in rows if str(r['d']) == today), None)
        if not cur:
            return None
        spent = float(cur['c'] or 0)
        calls = int(cur['n'] or 0)

        past = sorted(float(r['c'] or 0) for r in rows if str(r['d']) != today)
        past_n = sorted(int(r['n'] or 0) for r in rows if str(r['d']) != today)
        if len(past) < 3:
            return None
        usual = past[len(past) // 2]
        usual_n = past_n[len(past_n) // 2] or 1

        # the month against the budget
        mrow = db.query("""SELECT ROUND(COALESCE(SUM(est_cost),0),2) t FROM api_usage_logs
                           WHERE created_at >= date('now','start of month')""")
        month = float(mrow[0]['t'] if mrow else 0)
        budget = 25.0
        try:
            b = db.query("SELECT value FROM cost_settings WHERE key='monthly_budget'")
            if b:
                budget = float(b[0]['value'])
        except Exception:
            pass

        why = []
        if spent >= 0.20 and usual > 0 and spent >= usual * 3:
            why.append("today is $" + ("%.2f" % spent) + ", about "
                       + str(int(round(spent / usual))) + " times a normal day")
        if budget and month >= budget * 0.5:
            why.append("$" + ("%.2f" % month) + " of the $" + ("%.0f" % budget)
                       + " month gone")
        if calls >= usual_n * 3 and calls > 200:
            why.append(str(calls) + " calls today against about " + str(usual_n) + " usually")
        if not why:
            return None
        return "API spend: " + "; ".join(why) + "."
    except Exception:
        return None


'''

s = open('app.py').read()
done, miss = [], []

if '_spend_out_of_the_ordinary' in s:
    miss.append("already there")
else:
    t = s.replace("def _evening_closeout():", FN + "def _evening_closeout():", 1)
    good, err = ok(t)
    if good: s = t; done.append("the watcher")
    else: miss.append("watcher: " + err[:80])

    # on the strip, only when it is odd
    o = """        # a tablet taken every so many days, due today"""
    n = """        # the API spend, only when it is out of the ordinary
        try:
            _sp = _spend_out_of_the_ordinary()
            if _sp:
                out['decide'].append({"what": _sp, "ask": "what is my api cost"})
        except Exception:
            pass

        # a tablet taken every so many days, due today"""
    if o in s:
        t = s.replace(o, n, 1)
        good, err = ok(t)
        if good: s = t; done.append("on the strip")
        else: miss.append("strip: " + err[:80])
    else:
        miss.append("strip (anchor)")

    # and in the close-out that same evening
    o2 = """        if not bits:
            return ""
        return ("\\n\\nHOW HIS DAY WENT"""
    n2 = """        try:
            _sp = _spend_out_of_the_ordinary()
            if _sp:
                bits.append(_sp + " Worth knowing tonight while he remembers today.")
        except Exception:
            pass

        if not bits:
            return ""
        return ("\\n\\nHOW HIS DAY WENT"""
    if o2 in s:
        t = s.replace(o2, n2, 1)
        good, err = ok(t)
        if good: s = t; done.append("in the close-out")
        else: miss.append("closeout: " + err[:80])
    else:
        miss.append("closeout (anchor)")

open('app.py', 'w').write(s)
print("DONE: " + ", ".join(done))
if miss: print("SKIPPED: " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("app.py compiles: " + ("YES" if good else "NO - " + err))
