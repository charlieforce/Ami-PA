#!/usr/bin/env python3
"""Asking Ami about the money, and telling her about it.

Standing on the site in Freetown with a phone, he is not going to open a
screen and fill in a form. He will say "I paid Mr Allie 1000" and expect it
to be true afterwards.

Four things she can do:
  "how much do I owe Mr Allie"          -> quoted, paid, outstanding
  "I paid Mr Allie 1000"                -> recorded, and the new balance
  "Mr Allie says the grounds is 6500 now" -> the quote moves, the old kept
  "what has the house cost me"          -> the whole job, rolled up

She never claims a payment she did not record. Every one is read back from
the table before she says a word.

Run from the src folder with:  python3 money_chat.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

FN = '''def _money_person(name):
    """Find whoever he means, across every job. Returns (person, project)."""
    nm = (name or '').strip().lower()
    if len(nm) < 2:
        return None, None
    rows = db.query("""SELECT p.id, p.name, p.trade, p.venture_id, v.name AS project
                       FROM job_people p
                       LEFT JOIN ventures v ON v.id = p.venture_id
                       WHERE COALESCE(p.active,1) = 1""") or []
    for r in rows:
        if str(r['name']).lower() == nm:
            return r, r.get('project')
    for r in rows:
        if nm in str(r['name']).lower() or str(r['name']).lower() in nm:
            return r, r.get('project')
    # by first name, which is how he talks
    first = nm.split()[0]
    for r in rows:
        if first and first in str(r['name']).lower().split():
            return r, r.get('project')
    return None, None


def _money_sum(person_id, venture_id):
    """Quoted, paid, owed - worked out, never stored."""
    q = (db.query("""SELECT COALESCE(SUM(amount),0) AS s FROM job_quotes
                     WHERE person_id = ?""", (person_id,)) or [{"s": 0}])[0]['s'] or 0
    p = (db.query("""SELECT COALESCE(SUM(amount),0) AS s FROM job_payments
                     WHERE person_id = ?""", (person_id,)) or [{"s": 0}])[0]['s'] or 0
    return float(q), float(p), float(q) - float(p)


def _money_from_chat(query):
    """Money talk about a job. Returns a reply, or None to carry on."""
    import re as _rm
    from datetime import datetime as _dm
    q = (query or '').strip()
    low = q.lower()
    if len(low) < 6 or len(low) > 200:
        return None
    if not _rm.search(r"\\b(owe|owed|paid|pay|paying|cost|quote[ds]?|spent|budget|"
                      r"charge[ds]?|balance)\\b", low):
        return None

    money = r"(?:usd|\\$|sle|le|ksh|gh[sc])?\\s*([\\d][\\d,]*(?:\\.\\d+)?)\\s*(?:usd|dollars?|sle|le|k)?"

    # --- he paid someone -------------------------------------------------
    m = _rm.search(r"\\b(?:i\\s+)?(?:just\\s+)?(?:paid|sent|gave)\\s+"
                   r"([a-z][a-z .'-]{1,28}?)\\s+" + money, low)
    if m:
        who, amount = m.group(1).strip(), m.group(2).replace(',', '')
        person, project = _money_person(who)
        if not person:
            return ("A no get " + who.title() + " pan any job yet, bo. Add am first "
                    "and a go track wetin yu pay am.")
        try:
            amt = float(amount)
        except Exception:
            return None
        if amt <= 0:
            return None
        db.execute("""INSERT INTO job_payments (venture_id, person_id, amount, kind,
                                                what, paid_on)
                      VALUES (?, ?, ?, 'labour', ?, ?)""",
                   (person['venture_id'], person['id'], amt, q[:80],
                    _dm.now().strftime('%Y-%m-%d')))
        if not db.query("""SELECT id FROM job_payments WHERE person_id = ? AND amount = ?
                           ORDER BY id DESC LIMIT 1""", (person['id'], amt)):
            return "A try for write am down but e no save. Try from di screen, bo."
        quoted, paid, owed = _money_sum(person['id'], person['venture_id'])
        return ("\\U0001F4B0 Noted: " + "{:,.0f}".format(amt) + " to " + person['name']
                + ". Dat make " + "{:,.0f}".format(paid) + " paid, "
                + "{:,.0f}".format(owed) + " still owing pan " + str(project or 'di job')
                + ".")

    # --- a quote moved ---------------------------------------------------
    m = _rm.search(r"([a-z][a-z .'-]{1,28}?)\\s+(?:say|says|said|wan|wants?|now)\\s+"
                   r"(?:di\\s+|the\\s+)?([a-z ]{3,30}?)\\s+(?:go\\s+)?(?:is|will be|cost|"
                   r"costs?|na)\\s+" + money, low)
    if m:
        who, what, amount = m.group(1).strip(), m.group(2).strip(), m.group(3).replace(',', '')
        person, project = _money_person(who)
        if person:
            rows = db.query("""SELECT id, what, amount FROM job_quotes
                               WHERE person_id = ?""", (person['id'],)) or []
            hit = None
            for r in rows:
                if what in str(r['what']).lower() or str(r['what']).lower() in what:
                    hit = r
                    break
            if hit:
                try:
                    new = float(amount)
                except Exception:
                    return None
                was = float(hit['amount'] or 0)
                if abs(new - was) > 0.004:
                    db.execute("""INSERT INTO job_quote_history (quote_id, was, now_is, why)
                                  VALUES (?, ?, ?, ?)""", (hit['id'], was, new, q[:120]))
                    db.execute("UPDATE job_quotes SET amount = ? WHERE id = ?",
                               (new, hit['id']))
                    pct = ((new - was) / was * 100) if was else 0
                    return ("\\U0001F4C8 " + str(hit['what']) + ": was "
                            + "{:,.0f}".format(was) + ", now " + "{:,.0f}".format(new)
                            + " (" + "{:+.0f}".format(pct) + "%). A don keep di first "
                            "number so yu go know next time.")

    # --- what does he owe someone ----------------------------------------
    m = _rm.search(r"\\b(?:how much (?:do )?i owe|what (?:do )?i owe|owe)\\s+"
                   r"([a-z][a-z .'-]{1,28}?)\\s*\\??$", low)
    if m:
        person, project = _money_person(m.group(1).strip())
        if not person:
            return None
        quoted, paid, owed = _money_sum(person['id'], person['venture_id'])
        if not quoted and not paid:
            return ("Nothing down for " + person['name'] + " yet, bo.")
        line = (person['name'] + ": quoted " + "{:,.0f}".format(quoted)
                + ", paid " + "{:,.0f}".format(paid) + ", owing "
                + "{:,.0f}".format(owed) + ".")
        moved = db.query("""SELECT q.what, h.was, q.amount FROM job_quote_history h
                            JOIN job_quotes q ON q.id = h.quote_id
                            WHERE q.person_id = ? ORDER BY h.id DESC LIMIT 1""",
                         (person['id'],))
        if moved:
            m0 = moved[0]
            line += (" Mind yu, " + str(m0['what']) + " start at "
                     + "{:,.0f}".format(float(m0['was'] or 0)) + ".")
        return line

    # --- what has the whole job cost -------------------------------------
    m = _rm.search(r"\\b(?:how much|what)\\s+(?:has|have|did|do)?\\s*"
                   r"(?:di\\s+|the\\s+)?([a-z][a-z ]{2,30}?)\\s+"
                   r"(?:cost|spent|taken|eat)\\b", low)
    if m:
        name = m.group(1).strip()
        v = db.query("""SELECT id, name FROM ventures
                        WHERE LOWER(name) LIKE ? AND COALESCE(active,1) = 1
                        ORDER BY LENGTH(name) LIMIT 1""", ('%' + name + '%',))
        if v:
            pid = v[0]['id']
            ids = _all_under(pid)
            inlist = ",".join(str(i) for i in ids)
            quoted = (db.query("SELECT COALESCE(SUM(amount),0) AS s FROM job_quotes "
                               "WHERE venture_id IN (" + inlist + ")")
                      or [{"s": 0}])[0]['s'] or 0
            paid = (db.query("SELECT COALESCE(SUM(amount),0) AS s FROM job_payments "
                             "WHERE venture_id IN (" + inlist + ")")
                    or [{"s": 0}])[0]['s'] or 0
            stip = (db.query("SELECT COALESCE(SUM(r.amount),0) AS s FROM stipend_runs r "
                             "JOIN stipend_terms t ON t.id = r.term_id "
                             "WHERE t.venture_id IN (" + inlist + ")")
                    or [{"s": 0}])[0]['s'] or 0
            out = float(paid) + float(stip)
            if not quoted and not out:
                return None
            return (str(v[0]['name']) + ": " + "{:,.0f}".format(out) + " don go out, "
                    + "{:,.0f}".format(float(quoted) - float(paid)) + " still owing.")

    return None


'''

s = open('app.py').read()
done, miss = [], []

if '_money_from_chat' in s:
    miss.append("already there")
else:
    t = s.replace("def _instant_time(", FN + "def _instant_time(", 1)
    good, err = ok(t)
    if good: s = t; done.append("the money talk")
    else: miss.append("function: " + err[:90])

    o = """        # finishing or removing something that already exists"""
    n = """        # money on a job - what he owes, what he paid, what a quote became
        try:
            _m = _money_from_chat(query)
        except Exception as _em:
            print("money from chat: " + str(_em)[:70])
            _m = None
        if _m:
            try:
                db.execute("INSERT INTO conversations (user_message, ami_response) VALUES (?,?)",
                           (query, _m))
            except Exception:
                pass
            return {"status": "success", "response": _m, "role": "ami",
                    "engines_used": ["job_money"]}

        # finishing or removing something that already exists"""
    if o in s:
        t = s.replace(o, n, 1)
        good, err = ok(t)
        if good: s = t; done.append("wired into chat")
        else: miss.append("wiring: " + err[:90])
    else:
        miss.append("wiring (anchor)")

open('app.py', 'w').write(s)
print("DONE: " + ", ".join(done))
if miss: print("SKIPPED: " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("app.py compiles: " + ("YES" if good else "NO - " + err))
