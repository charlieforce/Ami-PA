#!/usr/bin/env python3
"""Notifications for meetings, ten minutes before.

He forgets meetings. The strip helps when he opens the app and Ami helps when
he talks to her, but neither reaches him when the phone is in his pocket.

What counts as a meeting: something on his calendar at a specific time that
is not a block. His blocks are marked - an envelope for the email catch-ups,
sunglasses for Decompress - and all-day entries are never meetings.

Run from the src folder with:  python3 notify.py
"""
import sqlite3, subprocess, sys, tempfile, os

DB = os.getenv("AMI_DB_PATH", "data/ami_memory.db")

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

db = sqlite3.connect(DB)
db.execute("""CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT UNIQUE,
    p256dh TEXT,
    auth TEXT,
    label TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_ok TEXT)""")
db.execute("""CREATE TABLE IF NOT EXISTS push_sent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT, ref TEXT, sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(kind, ref))""")
db.commit(); db.close()
print("tables ready")

EP = '''@app.get("/api/push/key")
@require_password
def push_key():
    """The browser needs this before it can subscribe."""
    try:
        import webpush as _wp
        return {"status": "success", "key": _wp.make_keys('data/vapid_private.pem')}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/push/subscribe")
@require_password
def push_subscribe():
    """His phone, once he has said yes."""
    try:
        d = request.get_json() or {}
        sub = d.get('subscription') or d
        ep = sub.get('endpoint')
        keys = sub.get('keys') or {}
        if not ep or not keys.get('p256dh'):
            return {"error": "not a subscription"}, 400
        db.execute("""INSERT OR REPLACE INTO push_subscriptions
                      (endpoint, p256dh, auth, label)
                      VALUES (?, ?, ?, ?)""",
                   (ep, keys['p256dh'], keys.get('auth'), d.get('label') or 'phone'))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/push/test")
@require_password
def push_test():
    """Send one now, so he can see it works."""
    try:
        n = _push_all("Ami", "This is what a reminder will look like.", "test")
        return {"status": "success", "sent": n}
    except Exception as e:
        return {"error": str(e)}, 400


def _push_all(title, body, tag="ami", loud=True):
    """Send to every device he has subscribed. Returns how many got through."""
    try:
        import webpush as _wp, json as _j
    except Exception as e:
        print("push: " + str(e)[:60])
        return 0
    subs = db.query("SELECT * FROM push_subscriptions") or []
    if not subs:
        return 0
    payload = _j.dumps({"title": title, "body": body, "tag": tag, "loud": bool(loud)})
    sent = 0
    for s in subs:
        sub = {"endpoint": s['endpoint'],
               "keys": {"p256dh": s['p256dh'], "auth": s['auth']}}
        good, code, msg = _wp.send(sub, payload, 'data/vapid_private.pem',
                                   urgency=("high" if loud else "normal"))
        if good:
            sent += 1
            db.execute("UPDATE push_subscriptions SET last_ok = CURRENT_TIMESTAMP "
                       "WHERE id = ?", (s['id'],))
        elif code in (404, 410):
            # the browser has forgotten this subscription - drop it
            db.execute("DELETE FROM push_subscriptions WHERE id = ?", (s['id'],))
            print("push: dropped a dead subscription")
        else:
            print("push failed (" + str(code) + "): " + str(msg)[:90])
    return sent


def _is_a_meeting(title):
    """His blocks are marked. Everything else at a set time is a meeting."""
    import re as _rm
    t = str(title or '')
    if not t.strip():
        return False
    # the markers he uses for his own blocks
    if _rm.search(r'[\\U0001F4E7\\U0001F60E]', t):          # envelope, sunglasses
        return False
    if _rm.search(r"\\b(decompress|lunch|break|focus|gym|workout|travel|flight|"
                  r"stay at|birthday|holiday|leave|rest)\\b", t.lower()):
        return False
    return True


def meeting_notifications():
    """Ten minutes before anything that looks like a meeting."""
    try:
        from datetime import datetime as _dn, timedelta as _tn
        import re as _rn
        if in_dnd():
            return
        now = _charlie_now().replace(tzinfo=None)
        cal = str(get_calendar_for_ami() or '')
        for m in _rn.finditer(r'[^\\n]*?([^\\n•]{3,70}?)\\s*-\\s*'
                              r'(\\d{4}-\\d{2}-\\d{2})T(\\d{2}):(\\d{2})', cal):
            title = m.group(1).strip(' •')
            if not _is_a_meeting(title):
                continue
            try:
                when = _dn.strptime(m.group(2) + " " + m.group(3) + ":" + m.group(4),
                                    '%Y-%m-%d %H:%M')
            except Exception:
                continue
            mins = (when - now).total_seconds() / 60.0
            if not (0 < mins <= 11):
                continue
            ref = m.group(2) + m.group(3) + m.group(4) + title[:20]
            if db.query("SELECT id FROM push_sent WHERE kind='meeting' AND ref=?", (ref,)):
                continue
            db.execute("INSERT OR IGNORE INTO push_sent (kind, ref) VALUES ('meeting', ?)",
                       (ref,))
            n = _push_all(title, "Starts in " + str(int(round(mins))) + " minutes.",
                          "meeting", loud=True)
            print("meeting notification: " + title[:40] + " -> " + str(n) + " device(s)")
    except Exception as e:
        print("meeting notifications error: " + str(e)[:80])


'''

s = open('app.py').read()
done, miss = [], []

if '/api/push/subscribe' in s:
    miss.append("already there")
else:
    t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
    good, err = ok(t)
    if good: s = t; done.append("endpoints and the sender")
    else: miss.append("endpoints: " + err[:90])

    o = "            scheduler.add_job(lambda: kickoff_nudge(), 'interval', minutes=5,"
    n = ("            scheduler.add_job(lambda: meeting_notifications(), 'interval', minutes=2,\n"
         "                              id='meeting_push', replace_existing=True)\n" + o)
    if o in s:
        t = s.replace(o, n, 1)
        good, err = ok(t)
        if good: s = t; done.append("checked every two minutes")
        else: miss.append("schedule: " + err[:90])
    else:
        miss.append("schedule (anchor)")

open('app.py', 'w').write(s)
print("DONE: " + ", ".join(done))
if miss: print("SKIPPED: " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("app.py compiles: " + ("YES" if good else "NO - " + err))
