#!/usr/bin/env python3
"""Three things that were one confused thing.

  1. The Briefing TAB keeps the news, refreshed 7am and 9pm. A screen he visits.
  2. AMI mentions the news on his first message after 7am. Not a dump - a line.
  3. The EVENING is not news at all. It is a close-out: what moved, what
     slipped, what tomorrow starts with. At 9pm, or when he says goodnight,
     whichever comes first.

Run from the src folder with:  python3 briefings.py
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

# ---------------------------------------------------- the close-out itself --
FN = '''def _evening_closeout():
    """How the day actually went. No news - he has the briefing tab for that."""
    try:
        from datetime import datetime as _d, timedelta as _td
        now = _charlie_now().replace(tzinfo=None)
        today = now.strftime('%Y-%m-%d')
        tomorrow = (now + _td(days=1)).strftime('%Y-%m-%d')
        bits = []

        # what moved
        try:
            dn = db.query("""SELECT COUNT(*) c FROM tasks
                             WHERE status IN ('done','completed')
                               AND DATE(updated_at) = ?""", (today,))
            dn2 = db.query("""SELECT COUNT(*) c FROM todos
                              WHERE status IN ('done','completed')
                                AND DATE(COALESCE(completed_at, updated_at)) = ?""", (today,))
            n = (dn[0]['c'] if dn else 0) + (dn2[0]['c'] if dn2 else 0)
            if n:
                bits.append("Finished " + str(n) + " thing" + ("s" if n != 1 else "") + " today.")
        except Exception:
            pass

        # what is still open and was due today
        try:
            late = db.query("""SELECT title FROM tasks
                               WHERE status NOT IN ('done','cancelled','completed')
                                 AND due_date = ? LIMIT 3""", (today,)) or []
            if late:
                bits.append("Still open from today: "
                            + ", ".join(str(r['title'])[:42] for r in late) + ".")
        except Exception:
            pass

        # the body
        try:
            for g in (db.query("SELECT * FROM fitness_goals WHERE active = 1") or []):
                if (g.get('per') or '') != 'day':
                    continue
                dn = db.query("""SELECT COALESCE(SUM(amount),0) a FROM goal_log
                                 WHERE goal_id = ? AND done_on = ?""", (g['id'], today))
                got = int(dn[0]['a'] or 0) if dn else 0
                tgt = int(g.get('target') or 0)
                if tgt and got < tgt:
                    bits.append(g['name'] + " " + str(got) + " of " + str(tgt) + ".")
        except Exception:
            pass

        # medication not ticked
        try:
            meds = db.query("""SELECT id, name FROM medications
                               WHERE stopped_on IS NULL
                                 AND COALESCE(schedule_kind,'daily') = 'daily'""") or []
            taken = {t['medication_id'] for t in (db.query(
                "SELECT medication_id FROM medication_log WHERE taken_on = ?", (today,)) or [])}
            miss_m = [m['name'] for m in meds if m['id'] not in taken]
            if miss_m:
                bits.append("Not ticked: " + ", ".join(miss_m) + ".")
        except Exception:
            pass

        # what tomorrow starts with
        try:
            cal = str(get_calendar_for_ami() or '')
            import re as _r
            first = None
            for m in _r.finditer(r'([^\\n]{3,55}?)\\s*-\\s*(\\d{4}-\\d{2}-\\d{2})T(\\d{2}):(\\d{2})', cal):
                if m.group(2) == tomorrow:
                    first = (m.group(1).strip(), m.group(3) + ":" + m.group(4))
                    break
            if first:
                bits.append("Tomorrow starts with " + first[0] + " at " + first[1] + ".")
        except Exception:
            pass

        # anything due tomorrow
        try:
            due = db.query("""SELECT title FROM reminders
                              WHERE due_date = ? AND status != 'completed' LIMIT 2""",
                           (tomorrow,)) or []
            if due:
                bits.append("Tomorrow: " + ", ".join(str(r['title'])[:40] for r in due) + ".")
        except Exception:
            pass

        if not bits:
            return ""
        return ("\\n\\nHOW HIS DAY WENT (give him this as a short, warm close-out in your own "
                "voice - a few lines, no lists, no news, and do not nag about what he missed):\\n- "
                + "\\n- ".join(bits))
    except Exception as e:
        print("closeout error: " + str(e))
        return ""


def send_evening_closeout():
    """9pm, or when he says goodnight - whichever comes first. Once a day."""
    try:
        from datetime import datetime as _d
        now = _charlie_now().replace(tzinfo=None)
        today = now.strftime('%Y-%m-%d')
        already = db.query("""SELECT id FROM conversations
                              WHERE DATE(timestamp) = ? AND ami_response LIKE ?""",
                           (today, '\\U0001F319%'))
        if already:
            return False
        note = _evening_closeout()
        if not note:
            return False
        try:
            engines = route_query("close out my day")
            text = synthesize_response("[Close out his day warmly.]" + note, engines, {})
        except Exception:
            text = note.split(":\\n- ", 1)[-1].replace("\\n- ", " ")
        db.execute("INSERT INTO conversations (user_message, ami_response) VALUES (?, ?)",
                   ("", "\\U0001F319 " + str(text)[:1200]))
        print("evening close-out sent")
        return True
    except Exception as e:
        print("evening close-out error: " + str(e))
        return False


'''
go('the close-out', "def schedule_evening_briefing():", FN + "def schedule_evening_briefing():")

# --------------------------------------- 9pm sends the close-out, not news --
go('9pm is the close-out',
   "        scheduler.add_job(schedule_evening_briefing, _Cron(hour=21, minute=0, timezone=tzn),\n"
   "                          id='evening_briefing', replace_existing=True)",
   "        scheduler.add_job(schedule_evening_briefing, _Cron(hour=21, minute=0, timezone=tzn),\n"
   "                          id='evening_briefing', replace_existing=True)\n"
   "        scheduler.add_job(send_evening_closeout, _Cron(hour=21, minute=5, timezone=tzn),\n"
   "                          id='evening_closeout', replace_existing=True)")

# ------------------------------------------- goodnight brings it forward ----
go('goodnight brings it forward',
   "        # the clock needs no model\n        _clock_now = _instant_time(query)",
   "        # saying goodnight brings the close-out forward\n"
   "        try:\n"
   "            import re as _rgn\n"
   "            if _rgn.search(r\"\\b(goodnight|good night|night night|turning in|\"\n"
   "                           r\"going to bed|off to bed|gn)\\b\", (query or '').lower()):\n"
   "                send_evening_closeout()\n"
   "        except Exception:\n"
   "            pass\n\n"
   "        # the clock needs no model\n        _clock_now = _instant_time(query)")

# ------------------------- the news reaches him on his first message after 7 --
FNM = '''def _news_for_first_message():
    """One line of news on his first message after 7am - not the whole briefing."""
    try:
        from datetime import datetime as _d
        now = _charlie_now().replace(tzinfo=None)
        if now.hour < 7:
            return ""
        today = now.strftime('%Y-%m-%d')
        earlier = db.query("""SELECT id FROM conversations
                              WHERE DATE(timestamp) = ?
                                AND TRIM(COALESCE(user_message,'')) != ''
                                AND TIME(timestamp) >= '07:00:00'
                              LIMIT 2""", (today,)) or []
        if len(earlier) > 1:
            return ""          # not his first any more
        br = db.query("""SELECT briefing_text FROM briefing_messages
                         WHERE DATE(date_created) = ? ORDER BY id DESC LIMIT 1""", (today,))
        if not br:
            return ""
        return ("\\n\\nTHIS MORNING'S NEWS (his first message today - work ONE line of what "
                "matters most into your reply, naturally, then carry on. Do not list it all, "
                "he has the Briefing tab for that):\\n"
                + str(br[0]['briefing_text'])[:2500])
    except Exception:
        return ""


'''
go('the news, once, in the morning', "def _report_for_context():", FNM + "def _report_for_context():")

go('wired into her context',
   "    try:\n        if _rtg.search(r'\\b(how (am i|did i|is it) (doing|going)",
   "    try:\n        context += _news_for_first_message()\n    except Exception:\n        pass\n"
   "    try:\n        if _rtg.search(r'\\b(how (am i|did i|is it) (doing|going)")

open('app.py', 'w').write(s)
print("DONE (" + str(len(done)) + "): " + ", ".join(done))
if miss: print("SKIPPED (" + str(len(miss)) + "): " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("app.py compiles: " + ("YES" if good else "NO - " + err))
