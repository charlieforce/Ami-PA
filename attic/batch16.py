#!/usr/bin/env python3
"""Batch 16: the bugs the day of testing found.
1. "going" no longer means travel - safety comes first
2. prices save without needing the word "paid"
3. exercises match properly, and cardio verbs work
4. the false birthday fact removed
5. birthdays mentioned once a day, not in every reply
6. the repeat line only fires on a real repeat, and still answers
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch16.py
"""
import subprocess, sys, tempfile, os, sqlite3
SRC = 'app.py'

def compiles(text):
    fd, p = tempfile.mkstemp(suffix='.py')
    os.write(fd, text.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p)
    return r.returncode == 0, (r.stderr or '')[:200]

kept, failed, missed = [], [], []
src = open(SRC).read()

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

# --------------------------------------------------------------------------
# 1. "going" on its own is not travel. A place name has to follow.
# --------------------------------------------------------------------------
apply('travel needs a destination', lambda t: swap(t,
    """    if not any(word in message_lower for word in ['travel', 'going to', 'trip to', 'flying to', 'heading to', 'visiting', 'going', 'leaving for']):
        return None""",
    """    # "going" on its own is not travel - he says it about everything. A destination has to follow,
    # and anything that sounds like stopping medication is never a trip.
    import re as _rt
    if _rt.search(r"\\b(skip|stop|quit|miss|pause|come off|get off)\\b[^.]{0,30}"
                  r"\\b(med|meds|medication|pill|pills|tablet|dose|treatment)\\b", message_lower):
        return None
    if not any(word in message_lower for word in
               ['travel', 'trip to', 'flying to', 'flight to', 'heading to', 'leaving for',
                'traveling to', 'travelling to', 'visiting']):
        _going = _rt.search(r"\\b(?:going|moving|headed)\\s+to\\s+([A-Z][a-zA-Z]{2,})", message)
        if not _going:
            return None
        _known = ['sierra leone', 'kenya', 'ghana', 'nigeria', 'south africa', 'rwanda', 'uae',
                  'dubai', 'usa', 'uk', 'canada', 'mexico', 'cameroon', 'tanzania', 'uganda',
                  'freetown', 'nairobi', 'accra', 'lagos', 'johannesburg', 'kigali', 'london',
                  'toronto', 'seattle', 'san antonio', 'austin', 'bo', 'kenema', 'mombasa']
        _cand = _going.group(1).lower()
        if _cand not in _known and not _rt.search(
                r"\\b(on|in|next|this|for)\\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\\d|monday|"
                r"tuesday|wednesday|thursday|friday|saturday|sunday|week|month)", message_lower):
            return None
        return None if len(_cand) < 3 else _travel_continue(message, message_lower)
    return _travel_continue(message, message_lower)


def _travel_continue(message, message_lower):
    import re
    from dateutil import parser as date_parser"""))

# --------------------------------------------------------------------------
# 2. a price does not need the word "paid"
# --------------------------------------------------------------------------
apply('prices without a verb', lambda t: swap(t,
    """        if _r.search(r'\\\\b(paid|pay|cost|costs|bought|buy|price|charging|charged|asking|quoted)\\\\b', low):""",
    """        if (_r.search(r'\\\\b(paid|pay|cost|costs|bought|buy|price|charging|charged|asking|quoted|'
                      r'went for|selling|sells|is|was|na)\\\\b', low)
                and not _r.search(r'\\\\b(what|how much|convert|worth|fair|cheap|expensive)\\\\b', low)):"""))

# --------------------------------------------------------------------------
# 3. exercises: match on the whole name, and let cardio verbs stand alone
# --------------------------------------------------------------------------
apply('exercise matching', lambda t: swap(t,
    """        if not found:
            for e in ex_rows:
                first = (e['name'] or '').lower().split()[-1]
                if len(first) >= 4 and _r.search(r'(?<![a-z])' + _r.escape(first) + r'(?![a-z])', low):
                    found = e
                    break""",
    """        if not found:
            # longest name first, so "bench press" beats "press"
            for e in sorted(ex_rows, key=lambda x: -len(x['name'] or '')):
                nm = (e['name'] or '').lower()
                core = nm.split(',')[0].strip()
                if len(core) >= 5 and core in low:
                    found = e
                    break
        if not found:
            # "walked 5km", "swam", "ran" - the activity is the verb
            _verbs = {'walk': 'Walking', 'walked': 'Walking', 'jog': 'Jogging', 'jogged': 'Jogging',
                      'ran': 'Jogging', 'run': 'Jogging', 'swam': 'Swimming', 'swim': 'Swimming',
                      'cycled': 'Stationary Bike', 'rowed': 'Rowing Machine', 'skipped': 'Jump Rope'}
            for w, nm in _verbs.items():
                if _r.search(r'(?<![a-z])' + w + r'(?![a-z])', low):
                    hit = [e for e in ex_rows if (e['name'] or '') == nm]
                    if hit:
                        found = hit[0]
                        break"""))

apply('cardio counts as done', lambda t: swap(t,
    """        if found and _r.search(r'\\\\b(did|done|finished|ran|walked|swam|rowed|cycled|lifted|hit)\\\\b', low):""",
    """        if found and _r.search(r'\\\\b(did|done|finished|ran|run|walked|walk|swam|swim|rowed|cycled|'
                               r'lifted|hit|knocked out|got in|managed)\\\\b', low):"""))

# --------------------------------------------------------------------------
# 5. a birthday is mentioned once a day, not in every reply
# --------------------------------------------------------------------------
def birthday_once(t):
    i = t.find('birthday_context')
    if i == -1:
        return None
    j = t.find('=', i)
    line_start = t.rfind('\n', 0, i) + 1
    indent = t[line_start:i]
    if not indent.strip() == '' or '_nudge_due' in t[max(0, i - 300):i]:
        return None
    o = t[line_start:t.find('\n', i)]
    if 'birthday_context' not in o or '=' not in o:
        return None
    guard = (o + "\n" + indent + "if birthday_context and not _nudge_due('birthdays'):\n"
             + indent + "    birthday_context = ''\n"
             + indent + "elif birthday_context:\n"
             + indent + "    _nudge_said('birthdays')")
    return t[:line_start] + guard + t[t.find('\n', i):]

apply('birthdays once a day', birthday_once)

# --------------------------------------------------------------------------
# 6. the repeat line only on a real repeat, and she still answers
# --------------------------------------------------------------------------
apply('repeat line tightened', lambda t: swap(t,
    """WHEN HE ASKS AGAIN
If he asked the same thing recently, notice it once and lightly""",
    """WHEN HE ASKS AGAIN
Only say this when he has asked the SAME question, not a different question about the same subject. If he asks about his blood pressure after asking about doctor visits, that is a new question - just answer it.
When he genuinely has asked again, say it warmly and then ANSWER IT PROPERLY - "yu don ask mi dat, but make a tell yu again" and then the full answer. Never use it to give him a thinner reply than you would have the first time, and never make him feel caught out.
If he asked the same thing recently, notice it once and lightly"""))

open(SRC, 'w').write(src)

# --------------------------------------------------------------------------
# 4. the false birthday fact
# --------------------------------------------------------------------------
try:
    db = sqlite3.connect('data/ami_memory.db')
    rows = db.execute("SELECT id, fact FROM learned_facts WHERE LOWER(fact) LIKE '%birthday is march 3%'").fetchall()
    for r in rows:
        db.execute("DELETE FROM learned_facts WHERE id = ?", (r[0],))
    db.commit(); db.close()
    kept.append('false birthday removed (' + str(len(rows)) + ')')
except Exception as e:
    missed.append('false birthday (' + str(e)[:40] + ')')

print("\nKEPT (" + str(len(kept)) + "): " + ", ".join(kept))
if failed:
    print("ROLLED BACK:\n  " + "\n  ".join(failed))
if missed:
    print("NOT APPLIED: " + ", ".join(missed))
good, err = compiles(open(SRC).read())
print("\napp.py compiles: " + ("YES" if good else "NO " + err))
