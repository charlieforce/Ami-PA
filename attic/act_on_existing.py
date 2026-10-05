#!/usr/bin/env python3
"""She can make things. Now she can finish and remove them.

"Mark Make milk as done" came back with "a no get any task like that" when
the task existed. "Delete the task you just created" came back saying she had
removed "Fix the gate" - which she had not, and which was not what he asked
about either.

Both are the same gap: she can create, but cannot act on what is already
there, so the model invents a confirmation.

This finds the real thing, does it, and says exactly what happened. If it
cannot find it, it says so plainly and lists what is close.

Run from the src folder with:  python3 act_on_existing.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

FN = '''def _find_item(name, only_open=True):
    """Find what he means across tasks, todos and reminders. Best match or None."""
    name = (name or '').strip().strip('"\\'').lower()
    if len(name) < 3:
        return None
    OPEN_T = "status NOT IN ('done','completed','cancelled')"
    found = []
    try:
        for row in (db.query("SELECT id, title, status FROM tasks WHERE "
                             + (OPEN_T if only_open else "1=1")) or []):
            found.append(('task', row['id'], row['title'] or ''))
        for row in (db.query("SELECT id, title, status FROM todos WHERE "
                             + ("status = 'pending'" if only_open else "1=1")) or []):
            found.append(('todo', row['id'], row['title'] or ''))
        for row in (db.query("SELECT id, title, status FROM reminders WHERE "
                             + ("status != 'completed'" if only_open else "1=1")) or []):
            found.append(('reminder', row['id'], row['title'] or ''))
    except Exception:
        return None

    # exact, then starts-with, then contains, then most words shared
    for kind, i, t in found:
        if t.lower().strip() == name:
            return (kind, i, t)
    for kind, i, t in found:
        if t.lower().startswith(name) or name.startswith(t.lower()):
            return (kind, i, t)
    for kind, i, t in found:
        if name in t.lower() or t.lower() in name:
            return (kind, i, t)
    words = {w for w in name.split() if len(w) > 2}
    if words:
        best, score = None, 0
        for kind, i, t in found:
            tw = {w for w in t.lower().split() if len(w) > 2}
            n = len(words & tw)
            if n > score and n >= max(1, len(words) // 2):
                best, score = (kind, i, t), n
        if best:
            return best
    return None


def _act_on_existing(query):
    """Finish it, remove it, or reopen it. Returns a reply, or None to carry on."""
    import re as _r
    low = (query or '').strip().lower().rstrip('.!')
    if len(low) > 120:
        return None

    # what does he want done?
    if _r.search(r"\\b(delete|remove|bin|get rid of|take .* off|scrap|cancel)\\b", low):
        action = 'delete'
    elif _r.search(r"\\b(done|complete[d]?|finished|ticked?|mark .* off|sorted|"
                   r"i did|i've done|i have done)\\b", low):
        action = 'done'
    elif _r.search(r"\\b(reopen|undo|not done|put .* back)\\b", low):
        action = 'reopen'
    else:
        return None
    if '?' in low:
        return None

    # the one she just made?
    if _r.search(r"\\b(that one|the one you just|you just (made|created|added)|"
                 r"the last one|that task|that todo)\\b", low):
        last = db.query("""SELECT id, title FROM tasks
                           WHERE DATE(created_at) >= date('now','-1 day')
                           ORDER BY id DESC LIMIT 1""")
        if not last:
            return ("A no sabi which one yu mean, bo - tell mi di name and a go sort am.")
        kind, i, title = 'task', last[0]['id'], last[0]['title']
    else:
        # pull the name out of what he said
        m = _r.search(r"(?:delete|remove|bin|scrap|cancel|complete|finish|tick off|"
                      r"mark(?: the)?|mark off)\\s+(?:the\\s+|my\\s+|that\\s+)?"
                      r"(?:task|todo|to-?do|reminder)?\\s*"
                      r"[\\"\\']?([a-z0-9][^\\"\\']{2,60}?)[\\"\\']?\\s*"
                      r"(?:\\s+(?:as\\s+)?(?:done|complete[d]?|finished|off))?$", low)
        if not m:
            m = _r.search(r"^(?:i\\s+)?(?:have\\s+|i've\\s+)?(?:done|finished)\\s+"
                          r"(?:the\\s+|my\\s+)?(.{3,60})$", low)
        if not m:
            return None
        raw = m.group(1).strip()
        raw = _r.sub(r"^(the|my|that|a|an)\\s+", "", raw)
        raw = _r.sub(r"\\s+(task|todo|to-?do|reminder)$", "", raw)
        hit = _find_item(raw, only_open=(action != 'reopen'))
        if not hit:
            near = db.query("""SELECT title FROM tasks
                               WHERE status NOT IN ('done','completed','cancelled')
                               ORDER BY id DESC LIMIT 3""") or []
            msg = "A no fit find \\"" + raw[:40] + "\\" pan mi list, bo."
            if near:
                msg += " Di last tree wey dey: " + "; ".join(
                    str(r['title'])[:34] for r in near) + "."
            return msg
        kind, i, title = hit

    tbl = {'task': 'tasks', 'todo': 'todos', 'reminder': 'reminders'}[kind]
    try:
        if action == 'delete':
            db.execute("DELETE FROM " + tbl + " WHERE id = ?", (i,))
            gone = not db.query("SELECT id FROM " + tbl + " WHERE id = ?", (i,))
            if not gone:
                return "A try for komot am but e no gree. Try from di screen, bo."
            return "\\U0001F5D1 Komot: " + title + "."
        if action == 'reopen':
            db.execute("UPDATE " + tbl + " SET status = 'pending' WHERE id = ?", (i,))
            return "\\u21a9 Put back pan di list: " + title + "."
        done_val = 'completed' if kind == 'reminder' else 'done'
        db.execute("UPDATE " + tbl + " SET status = ? WHERE id = ?", (done_val, i))
        row = db.query("SELECT status FROM " + tbl + " WHERE id = ?", (i,))
        if not row or str(row[0]['status']) != done_val:
            return "A try for tick am but e no save. Try from di screen, bo."
        return "\\u2705 Done: " + title + "."
    except Exception as e:
        print("act on existing failed: " + str(e)[:70])
        return None


'''

s = open('app.py').read()
done, miss = [], []

if '_act_on_existing' in s:
    miss.append("already there")
else:
    t = s.replace("def _instant_time(", FN + "def _instant_time(", 1)
    good, err = ok(t)
    if good: s = t; done.append("the finder and the doer")
    else: miss.append("functions: " + err[:90])

    o = """        # a meeting he mentions in passing is a commitment, not small talk"""
    n = """        # finishing or removing something that already exists
        try:
            _acted = _act_on_existing(query)
        except Exception:
            _acted = None
        if _acted:
            try:
                db.execute("INSERT INTO conversations (user_message, ami_response) VALUES (?,?)",
                           (query, _acted))
            except Exception:
                pass
            return {"status": "success", "response": _acted, "role": "ami",
                    "engines_used": ["task_action"]}

        # a meeting he mentions in passing is a commitment, not small talk"""
    if o in s:
        t = s.replace(o, n, 1)
        good, err = ok(t)
        if good: s = t; done.append("wired in")
        else: miss.append("wiring: " + err[:90])
    else:
        miss.append("wiring (anchor)")

open('app.py', 'w').write(s)
print("DONE: " + ", ".join(done))
if miss: print("SKIPPED: " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("app.py compiles: " + ("YES" if good else "NO - " + err))
