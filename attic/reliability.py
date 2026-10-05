#!/usr/bin/env python3
"""Make creating things reliable, and make it impossible for her to claim
something was done when it was not.

  1. "add X to my todo" and its variants
  2. compound requests - "create 2 tasks. One to X and 2. Y"
  3. more than one reminder from one sentence
  4. shopping list from chat
  5. a backstop: a confirmation with nothing behind it is rewritten

Run from  ~/Desktop/The Real Ami PA/src   with:  python3 reliability.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:200]

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

# ---- 1. the phrasings the parser was missing --------------------------------
go('more todo phrasings',
   """    (r'^(?:hey |ok |okay |please |pls |can you |could you |would you )*(?:add|put|stick|throw)\\s+(.+?)\\s+(?:on|to|in|onto)\\s+(?:my |the )?(?:todo|to-do|to do)s?(?:\\s+list)?$', 'todo'),""",
   """    (r'^(?:hey |ok |okay |please |pls |can you |could you |would you )*(?:add|put|stick|throw)\\s+(.+?)\\s+(?:on|to|in|onto)\\s+(?:my |the )?(?:todo|to-do|to do)s?(?:\\s+list)?$', 'todo'),
    # "add to my todo to call Ami" / "put on my todo list to ring the bank"
    (r'^(?:hey |ok |okay |please |pls |can you |could you |would you )*(?:add|put|stick|throw)\\s+(?:it\\s+)?(?:on|to|in|onto)\\s+(?:my |the )?(?:todo|to-do|to do)s?(?:\\s+list)?\\s*(?:,|:)?\\s*(?:to\\s+)?(.+)$', 'todo'),
    # "I need to X" / "don't let me forget to X"
    (r'^(?:hey |ok |okay )*(?:i need to|i have to|i must|dont let me forget to|don\\'t let me forget to)\\s+(.+)$', 'todo'),""")

# ---- 2 & 3 & 4. several things from one sentence ----------------------------
FN = '''def _split_requests(text):
    """One sentence can ask for several things. Return the pieces, or None."""
    import re as _r
    t = (text or '').strip()
    if len(t) < 12:
        return None
    parts = []

    # "create 2 tasks. One to X and 2. Y"  /  "1. X 2. Y"
    numbered = _r.split(r'(?:^|\\s)(?:\\d\\s*[.)]|one\\s+to|two\\s+to|first|second)\\s+', t, flags=_r.I)
    lead = numbered[0].lower() if numbered else ''
    kind = None
    if _r.search(r'\\btasks?\\b', lead): kind = 'task'
    elif _r.search(r'\\btodos?\\b|\\bto-?do\\b', lead): kind = 'todo'
    elif _r.search(r'\\bremind', lead): kind = 'reminder'
    if kind and len(numbered) > 2:
        for p in numbered[1:]:
            p = p.strip(' .,;and')
            p = _r.sub(r'^(?:and\\s+)?', '', p).strip()
            if 4 < len(p) < 160:
                parts.append((kind, p))
        if len(parts) > 1:
            return parts

    # "remind me ... 24 hours before and on the 21st"
    m = _r.search(r'\\bremind me\\b\\s+(?:to\\s+)?(.+)', t, _r.I)
    if m and _r.search(r'\\b(\\d{1,2}|24|48|72)\\s*(?:hours?|hrs?|days?)\\s+(?:before|ahead)\\b', t, _r.I) \\
           and _r.search(r'\\band\\b.{0,20}\\bon\\b', t, _r.I):
        return [('reminder_pair', t)]

    # "add bread, milk and sugar to my shopping list"
    m = _r.search(r'\\b(?:add|put|buy|get)\\s+(.+?)\\s+(?:to|on)\\s+(?:my |the )?shopping\\s*list\\b', t, _r.I)
    if not m:
        m = _r.search(r'\\bshopping list\\b.{0,20}?\\b(?:buy|get|add)\\s+(.+)$', t, _r.I)
    if m:
        items = [x.strip(' .') for x in _r.split(r',|\\band\\b', m.group(1)) if 1 < len(x.strip()) < 60]
        if items:
            return [('shopping', i) for i in items]
    return None


def _make_many(text):
    """Handle a request for several things at once. Returns a line to say, or None."""
    from datetime import datetime as _d, timedelta as _td
    import re as _r
    parts = _split_requests(text)
    if not parts:
        return None
    made, kind0 = [], parts[0][0]
    try:
        if kind0 == 'shopping':
            lst = db.query("SELECT id, name FROM shopping_lists ORDER BY id DESC LIMIT 1") or []
            if lst:
                lid = lst[0]['id']
            else:
                lid = db.execute("INSERT INTO shopping_lists (name) VALUES ('Shopping')")
            for _k, item in parts:
                try:
                    db.execute("INSERT INTO shopping_items (list_id, name, status) VALUES (?,?,'pending')",
                               (lid, item.title()))
                    made.append(item)
                except Exception:
                    try:
                        db.execute("INSERT INTO shopping_items (list_id, item, status) VALUES (?,?,'pending')",
                                   (lid, item.title()))
                        made.append(item)
                    except Exception as _e2:
                        print("shopping insert failed: " + str(_e2)[:60])
            if not made:
                return None
            return ("YOU JUST ADDED TO HIS SHOPPING LIST: " + ", ".join(made) +
                    ". Say it in one short clause.")

        if kind0 == 'reminder_pair':
            m = _r.search(r'\\bon\\s+(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?([A-Za-z]+)', text)
            when = None
            if m:
                try:
                    from dateutil import parser as _dp
                    when = _dp.parse(m.group(1) + " " + m.group(2), fuzzy=True,
                                     default=_d.now()).date()
                    if when < _d.now().date():
                        when = when.replace(year=when.year + 1)
                except Exception:
                    when = None
            if not when:
                return None
            ahead = _r.search(r'(\\d{1,3})\\s*(hours?|hrs?|days?)\\s+(?:before|ahead)', text, _r.I)
            gap = 1
            if ahead:
                n = int(ahead.group(1))
                gap = max(1, round(n / 24)) if 'h' in ahead.group(2).lower() else n
            what = _r.sub(r'.*?\\bremind me\\s+(?:to\\s+)?', '', text, flags=_r.I)
            what = _r.split(r'\\.|,|\\bremind me\\b', what)[0].strip(' .')[:120]
            if len(what) < 4:
                return None
            what = what[0].upper() + what[1:]
            for d0, tag in ((when - _td(days=gap), " (heads-up)"), (when, "")):
                db.execute("""INSERT INTO reminders (title, due_date, due_time, priority, status, source)
                              VALUES (?,?,?,'medium','pending','from_ami')""",
                           (what + tag, d0.strftime('%Y-%m-%d'), '09:00'))
                made.append(d0.strftime('%-d %b'))
            return ("YOU JUST SET TWO REMINDERS: " + what + " on " + " and ".join(made) +
                    ". Say it in one short clause.")

        for kind, title in parts:
            title = title.strip()
            if not title:
                continue
            title = title[0].upper() + title[1:]
            if kind == 'task':
                db.execute("""INSERT INTO tasks (title, status, priority, source)
                              VALUES (?, 'todo', 'medium', 'from Ami')""", (title,))
            else:
                db.execute("""INSERT INTO todos (title, status, due_date, origin)
                              VALUES (?, 'pending', ?, 'from_ami')""",
                           (title, (_d.now() + _td(days=1)).strftime('%Y-%m-%d')))
            made.append(title)
        if not made:
            return None
        return ("YOU JUST MADE " + str(len(made)) + " " + kind0 + "s: " + "; ".join(made) +
                ". Say it in one short clause - do not list them all back.")
    except Exception as e:
        print("make many failed: " + str(e))
        return None


'''
go('several things at once', "def _log_from_chat(text):", FN + "def _log_from_chat(text):")

go('several things wired in',
   "    _plan_note = _make_tasks_from_plan(query)",
   "    _plan_note = _make_tasks_from_plan(query)\n"
   "    _many_note = None if _is_question else _make_many(query)")

go('several things in her reply',
   '    if _plan_note:\n        context += "\\n\\n" + _plan_note',
   '    if _plan_note:\n        context += "\\n\\n" + _plan_note\n'
   '    if _many_note:\n        context += "\\n\\n" + _many_note')

# ---- 5. the backstop --------------------------------------------------------
BACKSTOP = '''def _claims_without_doing(reply, did_something):
    """She must not say she saved something when nothing was saved."""
    import re as _r
    if did_something or not reply:
        return reply
    claim = _r.compile(
        r"(a don (lock|set|put|save|add|log)|don lock am|i\\'?ve (added|set|saved|logged)|"
        r"(have|has) been (added|set|saved|logged)|added to your|dey (yu|di) list|"
        r"pan (yu|di) (list|board)|\\u2705|task added|reminder set|todo added|on di board)", _r.I)
    if not claim.search(reply):
        return reply
    print("BLOCKED a false confirmation: " + reply[:70])
    kept = [ln for ln in reply.split("\\n") if not claim.search(ln)]
    rest = "\\n".join(kept).strip()
    honest = ("A nor save am, bo - say am again plain so a go lock am properly: "
              "'remind me to X tomorrow' or 'add X to my todos'.")
    return (rest + "\\n\\n" + honest) if len(rest) > 25 else honest


'''
go('backstop function', "def _log_from_chat(text):", BACKSTOP + "def _log_from_chat(text):")

open('app.py', 'w').write(s)
print("\nAPPLIED (" + str(len(done)) + "): " + ", ".join(done))
if miss:
    print("MISSED (" + str(len(miss)) + "): " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("\napp.py compiles: " + ("YES" if good else "NO " + err))
