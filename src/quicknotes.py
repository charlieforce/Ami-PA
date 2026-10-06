#!/usr/bin/env python3
"""Quick notes that go somewhere.

He is in a market, or at an airport, and he taps something out in ten seconds.
Today it lands in a list he never opens again.

So: read what he wrote and put it where it belongs.
  "remember to call Ravi"            -> a reminder
  "research this for the blog"       -> a task
  "Priya's birthday is 14 March"     -> his birthday list
  "Jeremiah's wife is expecting"     -> something Ami simply knows

The note is always kept as well. Nothing is lost, and she says in one line
where it went so he can correct her.

Run from the src folder with:  python3 quicknotes.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

EP = '''def _place_quick_note(text):
    """Work out what he meant and put it there. Returns (where, what, said)."""
    import re as _rq
    from datetime import datetime as _dq, timedelta as _tq

    raw = (text or '').strip()
    low = raw.lower()
    if len(raw) < 3:
        return (None, None, None)

    # --- a birthday ------------------------------------------------------
    m = _rq.search(r"([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)(?:'s)?\\s+(?:birthday|bday|born)"
                   r"\\s*(?:is|on|:)?\\s*"
                   r"(\\d{1,2})(?:st|nd|rd|th)?\\s+([A-Za-z]{3,9})", raw)
    if not m:
        m = _rq.search(r"([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)?)(?:'s)?\\s+(?:birthday|bday)"
                       r"\\s*(?:is|on|:)?\\s*([A-Za-z]{3,9})\\s+(\\d{1,2})", raw)
        if m:
            who, mon, day = m.group(1), m.group(2), m.group(3)
        else:
            who = None
    else:
        who, day, mon = m.group(1), m.group(2), m.group(3)
    if who:
        try:
            when = _dq.strptime(mon[:3] + " " + str(int(day)), "%b %d")
            md = when.strftime('%m-%d')
            if not db.query("SELECT id FROM user_birthdays WHERE LOWER(name) = LOWER(?)", (who,)):
                db.execute("INSERT INTO user_birthdays (name, date) VALUES (?, ?)", (who, md))
            return ('birthday', who + " - " + when.strftime('%-d %B'),
                    "\\U0001F382 " + who + "'s birthday is down for "
                    + when.strftime('%-d %B') + ".")
        except Exception:
            pass

    # --- something to do -------------------------------------------------
    todo_words = _rq.search(r"\\b(remember to|don'?t forget|remind me|must|need to|"
                            r"have to|call|ring|pay|buy|book|send|email|order|collect|"
                            r"pick up|drop off|turn off|turn on|check|confirm|chase)\\b", low)
    work_words = _rq.search(r"\\b(research|look into|read|write|draft|design|build|"
                            r"blog|post|article|idea for|explore|investigate)\\b", low)

    if todo_words and not work_words:
        what = _rq.sub(r"^(remember to|don'?t forget to|don'?t forget|remind me to|"
                       r"remind me|i (must|need to|have to)|must|need to)\\s+", "",
                       raw, flags=_rq.I).strip(' .,')
        if len(what) < 3:
            what = raw
        what = what[0].upper() + what[1:]
        when = _dq.now().strftime('%Y-%m-%d')
        at = '09:00'
        tm = _rq.search(r"\\b(?:at\\s+)?(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)\\b", low)
        if tm:
            h = int(tm.group(1)) % 12 + (12 if tm.group(3) == 'pm' else 0)
            at = "%02d:%s" % (h, tm.group(2) or '00')
        if 'tomorrow' in low:
            when = (_dq.now() + _tq(days=1)).strftime('%Y-%m-%d')
        db.execute("""INSERT INTO reminders (title, due_date, due_time, status, priority,
                                             type, created_at)
                      VALUES (?, ?, ?, 'pending', 'normal', 'general', CURRENT_TIMESTAMP)""",
                   (what[:90], when, at))
        if db.query("SELECT id FROM reminders WHERE title = ? ORDER BY id DESC LIMIT 1",
                    (what[:90],)):
            nice = "today" if when == _dq.now().strftime('%Y-%m-%d') else "tomorrow"
            return ('reminder', what, "\\u23F0 " + what + " - " + nice + ".")

    # --- something to work on --------------------------------------------
    if work_words:
        what = raw.strip(' .,')
        what = what[0].upper() + what[1:]
        db.execute("""INSERT INTO tasks (title, status, priority, source, created_at, updated_at)
                      VALUES (?, 'pending', 'medium', 'from_notes',
                              CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)""", (what[:90],))
        if db.query("SELECT id FROM tasks WHERE title = ? ORDER BY id DESC LIMIT 1",
                    (what[:90],)):
            return ('task', what, "\\U0001F4CB On the board: " + what[:70] + ".")

    # --- something she should simply know ---------------------------------
    try:
        db.execute("""INSERT INTO learned_facts (fact, source, created_at)
                      VALUES (?, 'quick note', CURRENT_TIMESTAMP)""", (raw[:300],))
        return ('known', raw[:60],
                "\\U0001F9E0 A don hold dat one for mi head: " + raw[:70] + ".")
    except Exception:
        return (None, None, None)


@app.post("/api/notes/quick")
@require_password
def quick_note():
    """One box, four destinations. The note is always kept too."""
    try:
        d = request.get_json() or {}
        text = (d.get('text') or d.get('content') or '').strip()
        if len(text) < 2:
            return {"error": "nothing there"}, 400

        db.execute("""INSERT INTO notes (title, content, capture_type, created_at, updated_at)
                      VALUES (?, ?, 'quick', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)""",
                   (text[:70], text))

        where, what, said = _place_quick_note(text)
        return {"status": "success", "kept": True,
                "where": where, "what": what,
                "said": said or "\\U0001F4DD Saved."}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/notes/quick' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("quick notes now go somewhere")
else:
    print("broke: " + err)
