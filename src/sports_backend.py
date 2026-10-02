#!/usr/bin/env python3
"""Fixtures that look after themselves.

Pulls full schedules from ESPN's public feed - no key, no account. Playoffs
appear when they are set, next season appears when it starts, and games that
have been played get their score and drop out of what is coming.

His teams are flagged, so Ami leads with Seattle and Newcastle but can answer
about anyone.

Run from the src folder with:  python3 sports_backend.py
"""
import sqlite3, subprocess, sys, tempfile, os

DB = os.getenv("AMI_DB_PATH", "data/ami_memory.db")

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

# ------------------------------------------------------------------ tables --
db = sqlite3.connect(DB)
for stmt in (
    """CREATE TABLE IF NOT EXISTS fixtures (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         sport TEXT, league TEXT, team TEXT, opponent TEXT,
         home_away TEXT, kickoff_utc TEXT, note TEXT, result TEXT,
         espn_id TEXT, status TEXT, score TEXT,
         UNIQUE(team, kickoff_utc))""",
    """CREATE TABLE IF NOT EXISTS followed_teams (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         team TEXT UNIQUE, league TEXT, sport TEXT, active INTEGER DEFAULT 1)""",
):
    db.execute(stmt)
for c in ('espn_id TEXT', 'status TEXT', 'score TEXT'):
    try:
        db.execute("ALTER TABLE fixtures ADD COLUMN " + c)
    except Exception:
        pass
for t, lg, sp in (("Seattle Seahawks", "NFL", "american football"),
                  ("Newcastle United", "Premier League", "football"),
                  ("Portland Trail Blazers", "NBA", "basketball"),
                  ("Toronto Raptors", "NBA", "basketball"),
                  ("Sierra Leone", "AFCON", "football")):
    db.execute("INSERT OR IGNORE INTO followed_teams (team, league, sport) VALUES (?,?,?)", (t, lg, sp))
db.commit(); db.close()
print("tables ready, teams seeded")

# ----------------------------------------------------------------- the code --
FN = '''ESPN_LEAGUES = [
    ("NFL", "american football", "football/nfl"),
    ("Premier League", "football", "soccer/eng.1"),
    ("NBA", "basketball", "basketball/nba"),
    ("Champions League", "football", "soccer/uefa.champions"),
    ("AFCON", "football", "soccer/caf.nations"),
]


def refresh_fixtures(weeks_ahead=6):
    """Pull the real schedules. Safe to run any time - it updates rather than duplicates."""
    import urllib.request as _u, json as _j
    from datetime import datetime as _d, timedelta as _td
    got, updated = 0, 0
    try:
        mine = {r['team'].lower() for r in (db.query(
            "SELECT team FROM followed_teams WHERE active = 1") or [])}
    except Exception:
        mine = set()

    for league, sport, path in ESPN_LEAGUES:
        for wk in range(weeks_ahead):
            day = (_d.utcnow() + _td(weeks=wk)).strftime('%Y%m%d')
            end = (_d.utcnow() + _td(weeks=wk, days=6)).strftime('%Y%m%d')
            url = ("https://site.api.espn.com/apis/site/v2/sports/" + path +
                   "/scoreboard?dates=" + day + "-" + end)
            try:
                with _u.urlopen(url, timeout=20) as r:
                    data = _j.loads(r.read().decode())
            except Exception as e:
                print("fixtures: " + league + " week " + str(wk) + " - " + str(e)[:50])
                continue
            for ev in (data.get('events') or []):
                try:
                    eid = str(ev.get('id') or '')
                    when = str(ev.get('date') or '')[:19].replace('Z', '')
                    comp = (ev.get('competitions') or [{}])[0]
                    sides = comp.get('competitors') or []
                    if len(sides) < 2:
                        continue
                    home = next((c for c in sides if c.get('homeAway') == 'home'), sides[0])
                    away = next((c for c in sides if c.get('homeAway') == 'away'), sides[1])
                    hn = (home.get('team') or {}).get('displayName') or ''
                    an = (away.get('team') or {}).get('displayName') or ''
                    st = ((ev.get('status') or {}).get('type') or {})
                    done = bool(st.get('completed'))
                    state = st.get('description') or ''
                    score = None
                    if done or st.get('state') == 'in':
                        score = str(away.get('score') or '') + "-" + str(home.get('score') or '')
                    note = (comp.get('notes') or [{}])[0].get('headline', '') if comp.get('notes') else ''

                    for team, opp, ha in ((hn, an, 'home'), (an, hn, 'away')):
                        if not team:
                            continue
                        was = db.query("SELECT id FROM fixtures WHERE espn_id = ? AND team = ?",
                                       (eid, team))
                        if was:
                            db.execute("""UPDATE fixtures SET status = ?, score = ?,
                                          result = ?, kickoff_utc = ? WHERE id = ?""",
                                       (state, score,
                                        (score if done else None), when, was[0]['id']))
                            updated += 1
                        else:
                            db.execute("""INSERT OR IGNORE INTO fixtures
                                          (sport, league, team, opponent, home_away,
                                           kickoff_utc, note, result, espn_id, status, score)
                                          VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                                       (sport, league, team, opp, ha, when, note,
                                        (score if done else None), eid, state, score))
                            got += 1
                except Exception:
                    continue
    print("fixtures: " + str(got) + " new, " + str(updated) + " updated")
    return {"new": got, "updated": updated}


'''

HELPERS = '''@app.get("/api/sports")
@require_password
def sports_board():
    """What is on - his teams first, then everyone else."""
    try:
        from datetime import datetime as _d, timedelta as _td
        import pytz as _p
        scope = request.args.get('when', 'week')
        span = {'today': 1, 'week': 8, 'month': 31}.get(scope, 8)
        now_utc = _d.utcnow()
        until = (now_utc + _td(days=span)).strftime('%Y-%m-%dT%H:%M:%S')
        since = (now_utc - _td(hours=6)).strftime('%Y-%m-%dT%H:%M:%S')

        mine = {r['team'] for r in (db.query(
            "SELECT team FROM followed_teams WHERE active = 1") or [])}
        rows = db.query("""SELECT * FROM fixtures
                           WHERE kickoff_utc >= ? AND kickoff_utc <= ?
                           ORDER BY kickoff_utc""", (since, until)) or []

        here = _charlie_now().tzinfo
        seen, out = set(), []
        for r in rows:
            pair = tuple(sorted([r['team'], r['opponent'] or ''])) + (r['kickoff_utc'],)
            is_mine = r['team'] in mine
            if pair in seen and not is_mine:
                continue
            seen.add(pair)
            try:
                k = _p.utc.localize(_d.strptime(str(r['kickoff_utc'])[:19],
                                                '%Y-%m-%dT%H:%M:%S')).astimezone(here)
                local = k.strftime('%a %-d %b, %-I:%M%p').replace('AM', 'am').replace('PM', 'pm')
                dd = (k.date() - _charlie_now().date()).days
                when = "today" if dd == 0 else ("tomorrow" if dd == 1 else local)
            except Exception:
                local, when = str(r['kickoff_utc'])[:16], ''
            out.append({"league": r['league'], "team": r['team'], "opponent": r['opponent'],
                        "home_away": r['home_away'], "local": local, "when": when,
                        "mine": is_mine, "status": r.get('status'), "score": r.get('score'),
                        "played": bool(r.get('result'))})
        out.sort(key=lambda x: (not x['mine'], x['local']))
        return {"status": "success", "games": out,
                "teams": sorted(mine), "scope": scope}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/sports/refresh")
@require_password
def sports_refresh():
    try:
        return {"status": "success", **refresh_fixtures()}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/sports/teams")
@require_password
def sports_add_team():
    """Follow or unfollow a team."""
    try:
        d = request.get_json() or {}
        nm = (d.get('team') or '').strip()
        if not nm:
            return {"error": "needs a team"}, 400
        if d.get('remove'):
            db.execute("DELETE FROM followed_teams WHERE LOWER(team) = LOWER(?)", (nm,))
        else:
            db.execute("""INSERT OR IGNORE INTO followed_teams (team, league, sport)
                          VALUES (?,?,?)""", (nm, d.get('league') or '', d.get('sport') or ''))
        return {"status": "success",
                "teams": [r['team'] for r in (db.query(
                    "SELECT team FROM followed_teams WHERE active = 1 ORDER BY team") or [])]}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
done, miss = [], []

if 'def refresh_fixtures' in s:
    miss.append("refresh_fixtures (already there)")
else:
    t = s.replace("def _fixtures_for_context():", FN + "def _fixtures_for_context():", 1)
    good, err = ok(t)
    if good: s = t; done.append("the fetcher")
    else: miss.append("fetcher: " + err[:70])

if '/api/sports' in s:
    miss.append("endpoints (already there)")
else:
    t = s.replace('@app.get("/api/today")', HELPERS + '@app.get("/api/today")', 1)
    good, err = ok(t)
    if good: s = t; done.append("the endpoints")
    else: miss.append("endpoints: " + err[:70])

# her context: played games drop off, and she knows about everyone
o = """        rows = db.query(\"\"\"SELECT team, league, opponent, home_away, kickoff_utc, note
                           FROM fixtures WHERE kickoff_utc >= ? AND result IS NULL
                           ORDER BY kickoff_utc\"\"\","""
n = """        rows = db.query(\"\"\"SELECT f.team, f.league, f.opponent, f.home_away, f.kickoff_utc, f.note
                           FROM fixtures f
                           JOIN followed_teams t ON LOWER(t.team) = LOWER(f.team)
                           WHERE f.kickoff_utc >= ? AND f.result IS NULL AND t.active = 1
                           ORDER BY f.kickoff_utc\"\"\","""
if o in s:
    t = s.replace(o, n, 1)
    good, err = ok(t)
    if good: s = t; done.append("her context uses his teams")
    else: miss.append("context: " + err[:70])
else:
    miss.append("context (anchor)")

# keep it fresh
o2 = "            scheduler.add_job(lambda: interval_med_nudge(), 'interval', minutes=120,"
n2 = ("            scheduler.add_job(lambda: refresh_fixtures(), 'interval', hours=12,\n"
      "                              id='fixtures_refresh', replace_existing=True)\n" + o2)
if o2 in s and "id='fixtures_refresh'" not in s:
    t = s.replace(o2, n2, 1)
    good, err = ok(t)
    if good: s = t; done.append("refreshes twice a day")
    else: miss.append("schedule: " + err[:70])

open('app.py', 'w').write(s)
print("DONE: " + ", ".join(done))
if miss: print("SKIPPED: " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("app.py compiles: " + ("YES" if good else "NO - " + err))
