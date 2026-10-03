#!/usr/bin/env python3
"""Telling her about a meeting should put it somewhere.

"have a meeting with Ravi at 12 tomorrow" is a commitment, not small talk.
She cannot write to his Google Calendar, so it goes in reminders - and she
says plainly that he still needs to add it to the calendar himself.

Run from the src folder with:  python3 meetings.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

FN = '''def _parse_meeting(text):
    """A meeting he mentions in passing. Returns (title, date, time) or None."""
    import re as _r
    from datetime import datetime as _d, timedelta as _td
    low = (text or '').strip().lower().rstrip('.!')
    if not low or len(low.split()) > 18 or '?' in low:
        return None

    # it has to look like an appointment
    kind = _r.search(r"\\b(meeting|meet|call|catch ?up|session|appointment|interview|"
                     r"seeing|see|lunch|dinner|coffee|drinks|sync|standup|review)\\b", low)
    if not kind:
        return None
    # and be his, not a question or someone else's
    if _r.search(r"\\b(did|should i|do i|can you|what|when is|who)\\b", low[:14]):
        return None

    now = _charlie_now().replace(tzinfo=None)

    # --- the day --------------------------------------------------------
    when = None
    if _r.search(r"\\btomorrow\\b", low):
        when = now + _td(days=1)
    elif _r.search(r"\\btoday|this (morning|afternoon|evening)|tonight\\b", low):
        when = now
    else:
        days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
        for i, d in enumerate(days):
            if _r.search(r"\\b" + d + r"\\b", low):
                ahead = (i - now.weekday()) % 7
                if ahead == 0:
                    ahead = 7
                when = now + _td(days=ahead)
                break
    if when is None:
        m = _r.search(r"\\bon (?:the )?(\\d{1,2})(?:st|nd|rd|th)?\\b", low)
        if m:
            try:
                dd = int(m.group(1))
                when = now.replace(day=dd)
                if when < now:
                    when = (when.replace(day=1) + _td(days=32)).replace(day=dd)
            except Exception:
                when = None
    if when is None:
        return None

    # --- the time -------------------------------------------------------
    hh, mm = None, 0
    m = _r.search(r"\\b(?:at |by |around )?(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)\\b", low)
    if m:
        hh = int(m.group(1)) % 12
        mm = int(m.group(2) or 0)
        if m.group(3) == 'pm':
            hh += 12
    else:
        m = _r.search(r"\\b(?:at|by|around)\\s+(\\d{1,2})(?::(\\d{2}))?\\b", low)
        if m:
            hh = int(m.group(1))
            mm = int(m.group(2) or 0)
            # "at 12" and "at 1" mean midday and one in the afternoon
            if hh < 8:
                hh += 12
    if hh is None:
        if 'morning' in low:
            hh = 9
        elif 'afternoon' in low:
            hh = 14
        elif 'evening' in low or 'tonight' in low:
            hh = 19
        else:
            return None          # no time at all - let Ami ask

    # --- who with -------------------------------------------------------
    who = None
    m = _r.search(r"\\bwith\\s+([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+)?)", text or '')
    if m:
        who = m.group(1).strip()
    else:
        m = _r.search(r"\\b(?:seeing|see|meet)\\s+([A-Z][a-zA-Z]+)", text or '')
        if m:
            who = m.group(1).strip()

    label = kind.group(1).strip()
    label = {'catch up': 'Catch up', 'catchup': 'Catch up'}.get(label, label.capitalize())
    title = label + (" with " + who if who else "")
    return (title, when.strftime('%Y-%m-%d'), "%02d:%02d" % (hh, mm))


'''

s = open('app.py').read()
done, miss = [], []

if '_parse_meeting' in s:
    miss.append("already there")
else:
    t = s.replace("def fast_parse_creation(", FN + "def fast_parse_creation(", 1)
    good, err = ok(t)
    if good: s = t; done.append("the meeting parser")
    else: miss.append("parser: " + err[:80])

    # it runs before anything else decides this is just conversation
    o = """        # a number is a number - no model needed"""
    n = """        # a meeting he mentions in passing is a commitment, not small talk
        try:
            _mt = _parse_meeting(query)
        except Exception:
            _mt = None
        if _mt:
            _ttl, _dt, _tm = _mt
            _dupe = db.query(\"\"\"SELECT id FROM reminders
                                WHERE title = ? AND due_date = ?\"\"\", (_ttl, _dt))
            if not _dupe:
                db.execute(\"\"\"INSERT INTO reminders
                              (title, due_date, due_time, priority, type, status, created_at)
                              VALUES (?, ?, ?, 'normal', 'meeting', 'pending', CURRENT_TIMESTAMP)\"\"\",
                           (_ttl, _dt, _tm))
            from datetime import datetime as _dm
            _nice = _dm.strptime(_dt, '%Y-%m-%d').strftime('%A %-d %B')
            _h = int(_tm[:2]); _ampm = 'am' if _h < 12 else 'pm'
            _h12 = _h % 12 or 12
            _clock = str(_h12) + (":" + _tm[3:] if _tm[3:] != '00' else '') + _ampm
            _say = ("\\u2705 " + _ttl + " - " + _nice + " at " + _clock
                    + ". A put am for yu reminders, but add am to yu calendar yusef - "
                    + "a no get write access dey.")
            try:
                db.execute("INSERT INTO conversations (user_message, ami_response) VALUES (?,?)",
                           (query, _say))
            except Exception:
                pass
            return {"status": "success", "response": _say, "role": "ami",
                    "engines_used": ["creation"], "context": {"created": _ttl}}

        # a number is a number - no model needed"""
    if o in s:
        t = s.replace(o, n, 1)
        good, err = ok(t)
        if good: s = t; done.append("wired in")
        else: miss.append("wiring: " + err[:80])
    else:
        miss.append("wiring (anchor)")

open('app.py', 'w').write(s)
print("DONE: " + ", ".join(done))
if miss: print("SKIPPED: " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("app.py compiles: " + ("YES" if good else "NO - " + err))
