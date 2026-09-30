#!/usr/bin/env python3
"""The backend half: reminders that repeat on odd cycles, and a way to stop one.

Run from  ~/Desktop/The Real Ami PA/src   with:  python3 finish_five_backend.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:200]

s = open('app.py').read()
done, miss = [], []

# the roll-forward understands the new cycles
o = """            WHERE recurring IN ('daily', 'weekly', 'monthly', 'yearly')"""
n = """            WHERE recurring IN ('daily', 'weekly', 'monthly', 'yearly',
                                'every_2_days', 'twice_weekly', 'every_10_days', 'every_14_days')"""
if o in s:
    t = s.replace(o, n, 1)
    good, err = ok(t)
    if good: s = t; done.append('the odd cycles are recognised')
    else: miss.append('cycles: ' + err[:60])
else:
    miss.append('cycles (anchor)')

# and knows how far forward to move
o2 = "            if reminder[6] == 'daily':"
n2 = """            _gaps = {'every_2_days': 2, 'twice_weekly': 3, 'every_10_days': 10,
                     'every_14_days': 14}
            if reminder[6] in _gaps:
                new_date = old_date + timedelta(days=_gaps[reminder[6]])
            elif reminder[6] == 'daily':"""
if o2 in s:
    t = s.replace(o2, n2, 1)
    good, err = ok(t)
    if good: s = t; done.append('it moves forward by the right number of days')
    else: miss.append('roll forward: ' + err[:60])
else:
    miss.append('roll forward (anchor)')

# a way to stop one repeating without deleting the record
if '/api/reminders/<int:rid>/stop' not in s:
    EP = '''@app.post("/api/reminders/<int:rid>/stop")
@require_password
def stop_reminder_repeating(rid):
    """Stop it coming back, but keep the record of it."""
    try:
        db.execute("UPDATE reminders SET recurring = 'none' WHERE id = ?", (rid,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    anchor = '@app.get("/api/today")'
    if anchor in s:
        t = s.replace(anchor, EP + anchor, 1)
        good, err = ok(t)
        if good: s = t; done.append('a repeat can be switched off')
        else: miss.append('stop endpoint: ' + err[:60])
    else:
        miss.append('stop endpoint (anchor)')

open('app.py', 'w').write(s)
print("DONE (" + str(len(done)) + "): " + ", ".join(done))
if miss: print("SKIPPED: " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("app.py compiles: " + ("YES" if good else "NO - " + err))
