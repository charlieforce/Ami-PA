#!/usr/bin/env python3
"""Questions the app can answer itself.

A count is a count. A price he logged is a price he logged. Sending those to
a language model costs money, takes a second, and can fail when someone
else's servers are busy - for an answer the database already holds exactly.

What stays with Ami: anything that needs joining up or judgement. "What's on
today" is a small briefing and she does it better. "How many pushups" is a
number.

Run from the src folder with:  python3 instant_answers.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

FN = '''def _instant_lookup(text):
    """A number or a stored fact, straight from the database. None = let Ami handle it."""
    import re as _r
    low = (text or '').strip().lower().rstrip('?.! ')
    if not low or len(low) > 90:
        return None

    # --- how many of something have I done today -------------------------
    m = _r.search(r"how many ([a-z\\- ]{3,20}?)s? (have i|did i|i)\\s*(done|did|do)?"
                  r"\\s*(today|so far|this morning)?$", low)
    if m:
        what = m.group(1).strip().rstrip('s')
        try:
            rows = db.query("""SELECT g.name, g.target,
                                      COALESCE(SUM(l.amount), 0) AS done
                               FROM fitness_goals g
                               LEFT JOIN goal_log l
                                 ON l.goal_id = g.id AND l.done_on = date('now')
                               WHERE g.active = 1 AND LOWER(g.name) LIKE ?
                               GROUP BY g.id""", ('%' + what + '%',))
            if rows:
                g = rows[0]
                d, t = int(g['done'] or 0), int(g['target'] or 0)
                if d == 0:
                    return "None yet today, bo. " + str(t) + " " + g['name'].lower() + " to go."
                if t and d >= t:
                    return (g['name'] + ": " + str(d) + " of " + str(t) + " - yu don finish am. "
                            "\\U0001F4AA")
                return (g['name'] + ": " + str(d) + " of " + str(t) + " so far. "
                        + str(t - d) + " left.")
        except Exception:
            pass

    # --- how much is X / what did I pay for X ----------------------------
    m = _r.search(r"(?:how much (?:is|was|did i pay for)|what did i pay for|"
                  r"what(?:'s| is) the price of)\\s+([a-z][a-z \\-]{1,24})$", low)
    if m:
        item = m.group(1).strip()
        try:
            rows = db.query("""SELECT item_name, local_price, currency, city, country,
                                      usd_price, observed_on
                               FROM price_entries
                               WHERE LOWER(item_name) LIKE ?
                               ORDER BY observed_on DESC LIMIT 3""", ('%' + item + '%',))
            if rows:
                bits = []
                for r0 in rows:
                    where = r0.get('city') or r0.get('country') or ''
                    bits.append(str(r0['local_price']).rstrip('0').rstrip('.') + " "
                                + str(r0['currency'] or '')
                                + (" for " + where if where else "")
                                + (" ($" + str(round(r0['usd_price'], 2)) + ")"
                                   if r0.get('usd_price') else "")
                                + " on " + str(r0['observed_on'])[:10])
                return rows[0]['item_name'] + ": " + "; ".join(bits) + "."
            return "A no get any price for " + item + " inside mi list yet, bo."
        except Exception:
            pass

    # --- how many tasks / todos / reminders do I have ---------------------
    m = _r.search(r"how many (tasks?|todos?|to-?dos?|reminders?)"
                  r"(?: do i have| have i got| dey| left)?$", low)
    if m:
        kind = m.group(1).rstrip('s').replace('-', '')
        try:
            if kind.startswith('task'):
                n = db.query("SELECT COUNT(*) c FROM tasks "
                             "WHERE status NOT IN ('done','cancelled','completed')")
                return str(n[0]['c']) + " tasks still open, bo."
            if kind.startswith('todo'):
                n = db.query("SELECT COUNT(*) c FROM todos WHERE status = 'pending'")
                return str(n[0]['c']) + " todos waiting."
            n = db.query("SELECT COUNT(*) c FROM reminders "
                         "WHERE status != 'completed' AND due_date >= date('now')")
            return str(n[0]['c']) + " reminders coming up."
        except Exception:
            pass

    # --- how much have I spent on the API ---------------------------------
    if _r.search(r"(api|gemini) (cost|spend|spent|bill)|how much.*(api|gemini)", low):
        try:
            r0 = db.query("""SELECT ROUND(COALESCE(SUM(est_cost),0),2) t,
                                    COUNT(*) n FROM api_usage_logs
                             WHERE DATE(created_at) = date('now')""")
            r1 = db.query("""SELECT ROUND(COALESCE(SUM(est_cost),0),2) t
                             FROM api_usage_logs
                             WHERE created_at >= date('now','start of month')""")
            return ("$" + str(r0[0]['t']) + " today across " + str(r0[0]['n'])
                    + " calls, $" + str(r1[0]['t']) + " this month.")
        except Exception:
            pass

    # --- how much water -----------------------------------------------------
    if _r.search(r"how much water|water (so far|today|left)", low):
        try:
            r0 = db.query("""SELECT COALESCE(SUM(litres),0) l FROM water_log
                             WHERE logged_on = date('now')""")
            got = round(float(r0[0]['l'] or 0), 2)
            tgt = 2.7
            try:
                t0 = db.query("SELECT value FROM charlie_profile WHERE key='water_target'")
                if t0:
                    tgt = float(t0[0]['value'])
            except Exception:
                pass
            if got >= tgt:
                return str(got) + "L down - yu don pass di target. \\U0001F4A7"
            return (str(got) + "L of " + str(tgt) + "L so far. "
                    + str(round(tgt - got, 2)) + "L to go.")
        except Exception:
            pass

    return None


'''

s = open('app.py').read()
done, miss = [], []

if '_instant_lookup' in s:
    miss.append("already there")
else:
    t = s.replace("def _instant_time(", FN + "def _instant_time(", 1)
    good, err = ok(t)
    if good:
        s = t; done.append("the lookups")
    else:
        miss.append("lookups: " + err[:80])

    o = """        # the clock needs no model
        _clock_now = _instant_time(query)"""
    n = """        # a number is a number - no model needed
        try:
            _fast = _instant_lookup(query)
        except Exception:
            _fast = None
        if _fast:
            try:
                db.execute("INSERT INTO conversations (user_message, ami_response) VALUES (?,?)",
                           (query, _fast))
            except Exception:
                pass
            return {"status": "success", "response": _fast, "role": "ami",
                    "engines_used": ["lookup"]}

        # the clock needs no model
        _clock_now = _instant_time(query)"""
    if o in s:
        t = s.replace(o, n, 1)
        good, err = ok(t)
        if good:
            s = t; done.append("wired into chat")
        else:
            miss.append("wiring: " + err[:80])
    else:
        miss.append("wiring (anchor)")

open('app.py', 'w').write(s)
print("DONE: " + ", ".join(done))
if miss: print("SKIPPED: " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("app.py compiles: " + ("YES" if good else "NO - " + err))
