#!/usr/bin/env python3
"""Batch 15: nudges said once, not every reply. A late-morning water nudge and an
evening close-out on the day. Each is dropped from her prompt once it has been said.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch15.py
"""
import subprocess, sys, tempfile, os, sqlite3
SRC = 'app.py'

def compiles(text):
    fd, path = tempfile.mkstemp(suffix='.py')
    with os.fdopen(fd, 'w') as f:
        f.write(text)
    r = subprocess.run([sys.executable, '-m', 'py_compile', path], capture_output=True, text=True)
    os.unlink(path)
    return r.returncode == 0, (r.stderr or '')[:200]

db = sqlite3.connect('data/ami_memory.db')
try:
    db.execute("""CREATE TABLE IF NOT EXISTS nudge_log (
        id INTEGER PRIMARY KEY, kind TEXT NOT NULL, said_on DATE NOT NULL,
        said_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(kind, said_on))""")
except Exception:
    pass
db.commit(); db.close()

src = open(SRC).read()
kept, failed, missed = [], [], []

def apply(label, fn):
    global src
    try:
        out = fn(src)
    except Exception as e:
        missed.append(label + " (" + str(e)[:40] + ")"); return
    if out is None or out == src:
        missed.append(label); return
    good, err = compiles(out)
    if good:
        src = out; kept.append(label)
    else:
        failed.append(label + " -> " + err.strip().split('\n')[-1][:80])

def swap(t, old, new):
    return t.replace(old, new, 1) if old in t else None

# ---- 1. the helper that decides whether a nudge is due --------------------
HELPER = '''def _nudge_due(kind):
    """True only if this nudge has not been given today."""
    from datetime import datetime as _d
    try:
        today = _charlie_now().strftime('%Y-%m-%d')
    except Exception:
        today = _d.now().strftime('%Y-%m-%d')
    try:
        return not db.query("SELECT id FROM nudge_log WHERE kind = ? AND said_on = ?", (kind, today))
    except Exception:
        return False


def _nudge_said(kind):
    from datetime import datetime as _d
    try:
        today = _charlie_now().strftime('%Y-%m-%d')
    except Exception:
        today = _d.now().strftime('%Y-%m-%d')
    try:
        db.execute("INSERT OR IGNORE INTO nudge_log (kind, said_on) VALUES (?,?)", (kind, today))
    except Exception:
        pass


def _day_closeout():
    """Evening: how the day actually went - water, movement, the session if one was planned."""
    from datetime import datetime as _d
    try:
        now = _charlie_now().replace(tzinfo=None)
    except Exception:
        now = _d.now()
    today = now.strftime('%Y-%m-%d')
    bits = []
    try:
        w = db.query("SELECT ROUND(SUM(litres),2) AS l FROM water_log WHERE logged_on = ?", (today,))
        drunk = (w[0]['l'] if w and w[0].get('l') else 0) or 0
        tg = db.query("SELECT value FROM personal_settings_kv WHERE key = 'water_target'") or []
        target = float(tg[0]['value']) if tg and tg[0].get('value') else 2.7
        if drunk < target * 0.75:
            bits.append("water is at " + str(drunk) + " of " + str(target) + " litres")
    except Exception:
        pass
    try:
        day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][now.weekday()]
        pl = db.query("SELECT id, days FROM fitness_plans WHERE status='active' ORDER BY id DESC LIMIT 1")
        planned = bool(pl and day in (pl[0].get('days') or ''))
        did = db.query("SELECT id FROM workout_log WHERE done_on = ? LIMIT 1", (today,))
        if planned and not did:
            bits.append("today was a training day and nothing is logged")
        elif did:
            bits.append("training is logged")
    except Exception:
        pass
    try:
        meds = db.query("""SELECT m.name FROM medications m WHERE m.stopped_on IS NULL
                           AND NOT EXISTS (SELECT 1 FROM medication_log l
                                           WHERE l.medication_id = m.id AND l.taken_on = ?)""", (today,))
        if meds:
            bits.append("not ticked off today: " + ", ".join(m['name'] for m in meds[:3]))
    except Exception:
        pass
    if not bits:
        return None
    return ("CLOSING THE DAY (say this ONCE, at the end of your reply, as a friend closing out the day - "
            "not a lecture, one or two short lines, and never again today): " + "; ".join(bits))


'''
apply('nudge helpers', lambda t: swap(t, 'def _log_from_chat(text):', HELPER + 'def _log_from_chat(text):'))

# ---- 2. the water block only appears in the late-morning window -----------
def water_window(t):
    i = t.find('Water: he is on ')
    if i == -1:
        return None
    ls = t.rfind('\n', 0, i)
    le = t.find('\n', i)
    line = t[ls + 1:le]
    indent = line[:len(line) - len(line.lstrip())]
    guarded = (indent + "if 11 <= _hr_now() <= 14 and _nudge_due('water'):\n"
               + indent + "    " + line.strip() + "\n"
               + indent + "    _nudge_said('water')")
    return t[:ls + 1] + guarded + t[le:]

# only safe if that line is a single statement - check first
_i = src.find('Water: he is on ')
if _i != -1:
    _ls = src.rfind('\n', 0, _i)
    _le = src.find('\n', _i)
    _line = src[_ls + 1:_le]
    if _line.count('(') == _line.count(')') and _line.strip().startswith(('water_note', 'parts.append', 'bits.append', 'context', '_w')):
        apply('water nudge once, late morning', water_window)
    else:
        missed.append('water nudge once (line shape: ' + _line.strip()[:50] + ')')
else:
    missed.append('water nudge once (not found)')

# the hour helper
apply('hour helper', lambda t: swap(t, 'def _nudge_due(kind):',
    '''def _hr_now():
    from datetime import datetime as _d
    try:
        return _charlie_now().hour
    except Exception:
        return _d.now().hour


def _nudge_due(kind):'''))

# ---- 3. the evening close-out -------------------------------------------
def add_closeout(t):
    o = "    if _log_note:\n        context += \"\\n\\n\" + _log_note"
    if o not in t or '_day_closeout()' in t:
        return None
    n = o + """
    if _hr_now() >= 18 and _nudge_due('closeout'):
        _co = _day_closeout()
        if _co:
            context += "\\n\\n" + _co
            _nudge_said('closeout')"""
    return t.replace(o, n, 1)

apply('evening close-out', add_closeout)

# ---- 4. the script says it plainly ---------------------------------------
apply('script line', lambda t: swap(t,
    "2. Say it when it matters.",
    "A nudge marked to say ONCE is said once and never repeated that day - not in the next reply, not later. "
    "If it is not in front of you, it has already been said.\n"
    "2. Say it when it matters."))

open(SRC, 'w').write(src)
print("\nKEPT (" + str(len(kept)) + "): " + ", ".join(kept))
if failed:
    print("ROLLED BACK:\n  " + "\n  ".join(failed))
if missed:
    print("NOT APPLIED: " + ", ".join(missed))
good, err = compiles(src)
print("\napp.py compiles: " + ("YES" if good else "NO " + err))
