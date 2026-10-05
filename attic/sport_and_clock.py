#!/usr/bin/env python3
"""The clock answers itself, and the sport earns its place.

  1. "what time is it" never touches the model - instant, free, cannot fail
  2. a clash warning when a kick-off lands on top of something of his
  3. the result waiting for him in the morning, since the games are late here
  4. a word when the kick-off is at an unholy hour where he is

She does not do analysis or predictions. She says what happened and when,
and gets out of the way.

Run from the src folder with:  python3 sport_and_clock.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

s = open('app.py').read()
done, miss = [], []

def go(label, old, new):
    global s
    if old not in s:
        miss.append(label); return
    t = s.replace(old, new, 1)
    good, err = ok(t)
    if good: s = t; done.append(label)
    else: miss.append(label + " BROKE: " + err.strip().split(chr(10))[-1][:70])

# ------------------------------------------------- 1. the clock, answered flat
go('the clock answers itself',
   "    _conv_note = _instant_conversion(query)",
   "    _clock_now = _instant_time(query)\n"
   "    if _clock_now:\n"
   "        try:\n"
   "            db.execute(\"INSERT INTO conversations (user_message, ami_response) VALUES (?,?)\",\n"
   "                       (query, _clock_now))\n"
   "        except Exception:\n"
   "            pass\n"
   "        return {\"status\": \"success\", \"response\": _clock_now, \"role\": \"ami\"}\n"
   "    _conv_note = _instant_conversion(query)")

# ------------------------------------------- 2, 3, 4. what she does with sport
FN = '''def _sport_for_briefing():
    """His teams only, today only: when they play, what it clashes with, and
    how last night went. No analysis - he has the internet for that."""
    try:
        from datetime import datetime as _d, timedelta as _td
        import pytz as _p
        now = _charlie_now()
        here = now.tzinfo
        today = now.strftime('%Y-%m-%d')
        lines = []

        mine = [r['team'] for r in (db.query(
            "SELECT team FROM followed_teams WHERE active = 1") or [])]
        if not mine:
            return ""
        marks = ",".join("?" for _ in mine)

        # --- how it went while he slept -------------------------------------
        since = (_d.utcnow() - _td(hours=36)).strftime('%Y-%m-%dT%H:%M:%S')
        for r in (db.query("""SELECT team, opponent, home_away, score, kickoff_utc
                              FROM fixtures
                              WHERE team IN (""" + marks + """)
                                AND result IS NOT NULL AND kickoff_utc >= ?
                              ORDER BY kickoff_utc DESC LIMIT 3""",
                           tuple(mine) + (since,)) or []):
            sc = str(r.get('score') or '').strip()
            if not sc or '-' not in sc:
                continue
            try:
                away_s, home_s = [int(x) for x in sc.split('-')[:2]]
            except Exception:
                continue
            his = home_s if r['home_away'] == 'home' else away_s
            theirs = away_s if r['home_away'] == 'home' else home_s
            verdict = ("won" if his > theirs else ("lost" if his < theirs else "drew"))
            lines.append(r['team'] + " " + verdict + " " + str(his) + "-" + str(theirs) +
                         " " + ("against " if r['home_away'] == 'home' else "away to ") +
                         r['opponent'] + ".")

        # --- playing today ---------------------------------------------------
        for r in (db.query("""SELECT team, opponent, home_away, kickoff_utc, league
                              FROM fixtures
                              WHERE team IN (""" + marks + """)
                                AND result IS NULL AND substr(kickoff_utc,1,10) >= ?
                                AND substr(kickoff_utc,1,10) <= ?
                              ORDER BY kickoff_utc LIMIT 3""",
                           tuple(mine) + (today, (now + _td(days=1)).strftime('%Y-%m-%d'))) or []):
            try:
                k = _p.utc.localize(_d.strptime((str(r['kickoff_utc'])[:19] + ':00')[:19],
                                                '%Y-%m-%dT%H:%M:%S')).astimezone(here)
            except Exception:
                continue
            when = k.strftime('%-I:%M%p').lower().replace(':00', '')
            day = "today" if k.date() == now.date() else "tomorrow"
            bit = (r['team'] + " " + ("v " if r['home_away'] == 'home' else "away to ") +
                   r['opponent'] + " " + day + " at " + when)

            # an unholy hour where he actually is
            if k.hour >= 23 or k.hour < 6:
                bit += " - that is the middle of the night here"

            # does it land on top of something of his?
            try:
                cal = str(get_calendar_for_ami() or '')
                import re as _r2
                for m2 in _r2.finditer(r'([^\\n]{3,60}?)\\s*-\\s*(\\d{4}-\\d{2}-\\d{2})T(\\d{2}):(\\d{2})', cal):
                    if m2.group(2) != k.strftime('%Y-%m-%d'):
                        continue
                    ev = _d.strptime(m2.group(2) + " " + m2.group(3) + ":" + m2.group(4),
                                     '%Y-%m-%d %H:%M')
                    gap = abs((ev - k.replace(tzinfo=None)).total_seconds()) / 3600.0
                    if gap < 2.5:
                        bit += (" - that sits on top of " + m2.group(1).strip()[:34] +
                                " at " + m2.group(3) + ":" + m2.group(4))
                        break
            except Exception:
                pass
            lines.append(bit + ".")

        if not lines:
            return ""
        return ("\\n\\nHIS TEAMS TODAY (say it in one short line in the briefing, nothing more - "
                "no analysis, no predictions, and if they lost do not dwell on it):\\n- "
                + "\\n- ".join(lines))
    except Exception as e:
        print("sport briefing error: " + str(e))
        return ""


'''
go('what she says about his teams', "def _fixtures_for_context():", FN + "def _fixtures_for_context():")

# it goes in the morning briefing
for anchor in ("def generate_morning_briefing_text():",):
    if anchor in s and '_sport_for_briefing()' not in s.split(anchor)[-1][:3000]:
        i = s.find(anchor)
        j = s.find("\n", s.find("\n", i) + 1)
        go('it reaches the briefing',
           s[i:j],
           s[i:j] + "\n    try:\n        _sport_line = _sport_for_briefing()\n    except Exception:\n        _sport_line = ''")

open('app.py', 'w').write(s)
print("DONE (" + str(len(done)) + "): " + ", ".join(done))
if miss: print("SKIPPED (" + str(len(miss)) + "): " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("app.py compiles: " + ("YES" if good else "NO - " + err))
