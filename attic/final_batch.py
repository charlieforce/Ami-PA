#!/usr/bin/env python3
"""Fixtures she knows by heart, and timestamps in the chat.

  1. a fixtures table, seeded with the Seahawks and Newcastle
  2. she answers about them straight, no searching
  3. next fixture on the pinned strip on match day
  4. the chat shows what day things were said

Run from  ~/Desktop/The Real Ami PA/src   with:  python3 final_batch.py
"""
import os, re, sqlite3, subprocess, sys, tempfile

DB = 'data/ami_memory.db'
done, miss = [], []

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:180]

# ------------------------------------------------------------- 1. fixtures
db = sqlite3.connect(DB)
db.execute("""CREATE TABLE IF NOT EXISTS fixtures (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sport TEXT, league TEXT, team TEXT,
                opponent TEXT, home_away TEXT,
                kickoff_utc TEXT, note TEXT,
                result TEXT,
                UNIQUE(team, kickoff_utc))""")
db.execute("""CREATE TABLE IF NOT EXISTS followed_teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team TEXT UNIQUE, league TEXT, sport TEXT, active INTEGER DEFAULT 1)""")
for t, lg, sp in (("Seattle Seahawks", "NFL", "american football"),
                  ("Newcastle United", "Premier League", "football")):
    db.execute("INSERT OR IGNORE INTO followed_teams (team, league, sport) VALUES (?,?,?)", (t, lg, sp))

SEA = [
 ("2026-10-04T20:25:00", "Los Angeles Chargers", "home", ""),
 ("2026-10-11T20:25:00", "San Francisco 49ers", "home", ""),
 ("2026-10-16T00:15:00", "Denver Broncos", "away", "Thursday Night Football"),
 ("2026-10-26T00:20:00", "Kansas City Chiefs", "home", "Sunday Night Football"),
 ("2026-11-03T01:15:00", "Chicago Bears", "home", "Monday Night Football"),
 ("2026-11-08T21:25:00", "Arizona Cardinals", "home", ""),
 ("2026-11-15T21:05:00", "Las Vegas Raiders", "away", ""),
 ("2026-11-29T21:25:00", "San Francisco 49ers", "away", ""),
 ("2026-12-08T01:15:00", "Dallas Cowboys", "home", "Monday Night Football"),
 ("2026-12-13T21:25:00", "New York Giants", "home", ""),
 ("2026-12-19T22:00:00", "Philadelphia Eagles", "away", ""),
 ("2026-12-26T01:15:00", "Los Angeles Rams", "home", ""),
 ("2027-01-03T18:00:00", "Carolina Panthers", "away", ""),
 ("2027-01-10T18:00:00", "Los Angeles Rams", "away", "may move"),
]
NEW = [
 ("2026-10-12T19:00:00", "Coventry City", "away", ""),
 ("2026-10-17T16:30:00", "Aston Villa", "home", ""),
 ("2026-10-25T14:00:00", "Crystal Palace", "away", ""),
 ("2026-11-02T20:00:00", "Everton", "home", ""),
 ("2026-11-07T15:00:00", "Fulham", "away", ""),
 ("2026-11-21T17:30:00", "Arsenal", "home", ""),
 ("2026-11-29T14:05:00", "Brighton", "away", ""),
 ("2026-12-02T20:00:00", "Manchester United", "home", ""),
 ("2026-12-05T15:00:00", "Sunderland", "home", "Tyne-Wear derby"),
 ("2026-12-12T15:00:00", "Ipswich Town", "away", ""),
]
n = 0
for when, opp, ha, note in SEA:
    db.execute("""INSERT OR IGNORE INTO fixtures (sport, league, team, opponent, home_away, kickoff_utc, note)
                  VALUES ('american football','NFL','Seattle Seahawks',?,?,?,?)""", (opp, ha, when, note)); n += 1
for when, opp, ha, note in NEW:
    db.execute("""INSERT OR IGNORE INTO fixtures (sport, league, team, opponent, home_away, kickoff_utc, note)
                  VALUES ('football','Premier League','Newcastle United',?,?,?,?)""", (opp, ha, when, note)); n += 1
# the one just played
db.execute("""INSERT OR IGNORE INTO fixtures (sport, league, team, opponent, home_away, kickoff_utc, note, result)
              VALUES ('american football','NFL','Seattle Seahawks','Washington Commanders','away',
                      '2026-09-27T17:00:00','','lost 33-31')""")
db.commit(); db.close()
done.append("fixtures table seeded (" + str(n) + " games)")

# ------------------------------------------------- 2 & 3. she knows them
s = open('app.py').read()

FN = '''def _fixtures_for_context():
    """His teams' next games, in his own time, so she never has to guess."""
    try:
        from datetime import datetime as _d
        import pytz as _p
        rows = db.query("""SELECT team, league, opponent, home_away, kickoff_utc, note
                           FROM fixtures WHERE kickoff_utc >= ? AND result IS NULL
                           ORDER BY kickoff_utc""",
                        (_d.utcnow().strftime('%Y-%m-%dT%H:%M:%S'),)) or []
        if not rows:
            return ""
        here = _charlie_now().tzinfo
        seen, lines = set(), []
        for r in rows:
            if r['team'] in seen:
                continue
            seen.add(r['team'])
            try:
                k = _p.utc.localize(_d.strptime(str(r['kickoff_utc'])[:19], '%Y-%m-%dT%H:%M:%S')).astimezone(here)
                when = k.strftime('%a %-d %b, %-I:%M%p').replace('AM', 'am').replace('PM', 'pm')
                days = (k.date() - _charlie_now().date()).days
                when += " (today)" if days == 0 else (" (tomorrow)" if days == 1 else "")
            except Exception:
                when = str(r['kickoff_utc'])[:16]
            lines.append(r['team'] + " " + ("vs" if r['home_away'] == 'home' else "away to") + " " +
                         r['opponent'] + " - " + when + (" - " + r['note'] if r['note'] else ""))
        last = db.query("""SELECT team, opponent, result FROM fixtures
                           WHERE result IS NOT NULL ORDER BY kickoff_utc DESC LIMIT 1""") or []
        if last:
            lines.append("Last out: " + last[0]['team'] + " " + str(last[0]['result']) +
                         " to " + last[0]['opponent'] + ".")
        return ("\\n\\nHIS TEAMS - kick-off times are already in his own timezone, so give them "
                "straight and do not search or hedge:\\n- " + "\\n- ".join(lines))
    except Exception as e:
        print("fixtures context error: " + str(e))
        return ""


'''
if '_fixtures_for_context' not in s:
    t = s.replace("def _goals_for_context():", FN + "def _goals_for_context():", 1)
    good, err = ok(t)
    if good:
        s = t; done.append("fixtures function")
    else:
        miss.append("fixtures function: " + err[:70])

o = "    import re as _rtg\n    try:"
nw = ('    import re as _rtg\n'
      '    try:\n'
      "        if _rtg.search(r'\\b(seahawk|newcastle|nfl|premier league|match|fixture|game|kick ?off|"
      "play(ing|s)?|football|soccer|score)\\w*', (query or '').lower()):\n"
      '            context += _fixtures_for_context()\n'
      '    except Exception:\n'
      '        pass\n'
      '    try:')
if o in s and '_fixtures_for_context()' not in s.split('def _fixtures_for_context')[-1][:4000]:
    t = s.replace(o, nw, 1)
    good, err = ok(t)
    if good:
        s = t; done.append("she reads fixtures when asked")
    else:
        miss.append("wiring: " + err[:70])
else:
    miss.append("wiring (anchor)")

# match day on the pinned strip
o = """        # the goals, as they stand"""
nw = """        # a game today
        try:
            import pytz as _p2
            for f in (db.query(\"\"\"SELECT team, opponent, home_away, kickoff_utc FROM fixtures
                                  WHERE result IS NULL AND substr(kickoff_utc,1,10) IN (?, ?)
                                  ORDER BY kickoff_utc LIMIT 2\"\"\",
                               (today, (now + _td(days=1)).strftime('%Y-%m-%d'))) or []):
                k = _p2.utc.localize(_d.strptime(str(f['kickoff_utc'])[:19], '%Y-%m-%dT%H:%M:%S'))
                k = k.astimezone(_charlie_now().tzinfo)
                out['decide'].append({
                    "what": f['team'].split()[-1] + " " + ("v " if f['home_away'] == 'home' else "at ") +
                            f['opponent'].split()[-1] + " " +
                            k.strftime('%-I:%M%p').lower().replace(':00', ''),
                    "ask": "when are the " + f['team'].split()[-1] + " playing and who against?"})
        except Exception:
            pass

        # the goals, as they stand"""
if o in s and "a game today" not in s:
    t = s.replace(o, nw, 1)
    good, err = ok(t)
    if good:
        s = t; done.append("match day on the strip")
    else:
        miss.append("strip: " + err[:70])

open('app.py', 'w').write(s)

# --------------------------------------------------- 4. chat day markers
p = 'frontend/src/pages/Dashboard.jsx'
if os.path.exists(p):
    d = open(p).read()
    if 'dayLabel' in d:
        miss.append("chat day markers (already)")
    else:
        helper = """
const dayLabel = (ts) => {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d)) return null;
  const now = new Date();
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate())
                         - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
const clockTime = (ts) => {
  const d = new Date(ts);
  return isNaN(d) ? '' : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};
"""
        m = re.search(r"^(export default function|function) Dashboard", d, re.M)
        if m:
            d = d[:m.start()] + helper + "\n" + d[m.start():]
            open(p, 'w').write(d)
            done.append("day-label helpers added to Dashboard")
        else:
            miss.append("chat day markers (no component)")

print("DONE (" + str(len(done)) + "):")
for x in done: print("  - " + x)
if miss:
    print("SKIPPED (" + str(len(miss)) + "):")
    for x in miss: print("  - " + x)
good, err = ok(open('app.py').read())
print("\napp.py compiles: " + ("YES" if good else "NO - " + err))
