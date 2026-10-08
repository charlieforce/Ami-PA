#!/usr/bin/env python3
"""Talking to her about the money.

Standing on the site, or just off a call with Ingie, he is not going to open
a screen. He will say what happened and expect it to be true afterwards.

  "I sent Ingie 500"              -> recorded, and the new balance
  "what does Jeremiah owe me"     -> principal, repaid, left, when it clears
  "what do I owe Ingie"           -> the balance, and what it is made of
  "Ingie bought me a flight 1300" -> a purchase on his behalf
  "I lent Musa 2000"              -> a new loan
  "Jeremiah paid me 500"          -> a repayment
  "who owes me money"             -> everyone, both directions
  "forget what Musa owes me"      -> written off, with the reason kept

Nothing is claimed until it has been read back from the table.

Run from the src folder with:  python3 ledger_chat.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

FN = '''def _ledger_person_by_name(name):
    """Whoever he means. Falls back to his contacts so "Ingie" finds her."""
    nm = (name or '').strip().lower()
    if len(nm) < 2:
        return None
    rows = db.query("""SELECT id, name FROM ledger_people
                       WHERE COALESCE(active,1) = 1""") or []
    for r in rows:
        if str(r['name']).lower() == nm:
            return r
    for r in rows:
        if nm in str(r['name']).lower() or str(r['name']).lower().startswith(nm):
            return r
    first = nm.split()[0]
    for r in rows:
        if first in str(r['name']).lower().split():
            return r
    return None


def _ledger_say(pid, name):
    """Where it stands with this person, in one line."""
    bal = _ledger_balance(pid)
    parts = []
    for cur, b in bal.items():
        if abs(b['net']) < 0.01:
            continue
        if b['net'] > 0:
            parts.append(name + " still owe yu " + _money_s(b['net'], cur))
        else:
            parts.append("yu still owe " + name + " " + _money_s(-b['net'], cur))
    return "; ".join(parts) if parts else ("Yu and " + name + " dey level.")


def _ledger_from_chat(query):
    """Money between him and someone. Returns a reply, or None."""
    import re as _rl
    from datetime import datetime as _dl
    q = (query or '').strip()
    low = q.lower()
    if len(low) < 6 or len(low) > 220:
        return None
    if not _rl.search(r"\\b(owe|owes|owed|paid|pay|sent|send|lent|lend|loan|borrow|"
                      r"borrowed|repay|repaid|gave|give|gift|bought|buy|balance|"
                      r"write off|forget what)\\b", low):
        return None

    MONEY = (r"(?:usd|\\$|sle|le|cad|ksh|gh[sc])?\\s*([\\d][\\d,]*(?:\\.\\d+)?)\\s*"
             r"(usd|dollars?|sle|leones?|cad|ksh|ghs)?")

    def _cur(word, person_id=None):
        w = (word or '').lower()
        if w.startswith('cad'):
            return 'CAD'
        if w.startswith(('sle', 'leone')):
            return 'SLE'
        if w.startswith('ksh'):
            return 'KES'
        if w.startswith('gh'):
            return 'GHS'
        if w.startswith(('usd', 'dollar')) or w == '$':
            return 'USD'
        if person_id:
            r = db.query("""SELECT currency FROM ledger_entries WHERE person_id = ?
                            ORDER BY id DESC LIMIT 1""", (person_id,))
            if r:
                return (r[0]['currency'] or 'USD').upper()[:4]
        return 'USD'

    def _add(person, kind, amount, cur, note, side=None):
        db.execute("""INSERT INTO ledger_entries (person_id, kind, who_owes, amount,
                      currency, note, happened_on)
                      VALUES (?,?,?,?,?,?,?)""",
                   (person['id'], kind,
                    side or ('me' if kind in ('borrowed', 'bought') else 'them'),
                    amount, cur, note[:160], _dl.now().strftime('%Y-%m-%d')))
        return bool(db.query("""SELECT id FROM ledger_entries WHERE person_id = ?
                                AND amount = ? ORDER BY id DESC LIMIT 1""",
                             (person['id'], amount)))

    # --- he sent money to someone ----------------------------------------
    m = _rl.search(r"\\b(?:i\\s+)?(?:just\\s+)?(?:sent|paid|gave)\\s+"
                   r"([a-z][a-z .'-]{1,28}?)\\s+" + MONEY, low)
    if m and 'gift' not in low:
        person = _ledger_person_by_name(m.group(1))
        if not person:
            return ("A no get " + m.group(1).strip().title() + " pan mi book yet, bo. "
                    "Add am first and a go track am.")
        amt = float(m.group(2).replace(',', ''))
        cur = _cur(m.group(3), person['id'])
        bal = _ledger_balance(person['id'])
        owes_him = any(b['net'] > 0 for b in bal.values())
        kind = 'paid' if owes_him else 'repaid'
        if not _add(person, kind, amt, cur, q, side=('them' if owes_him else 'me')):
            return "A try for write am down but e no save, bo."
        return ("\\U0001F4B0 " + _money_s(amt, cur) + " to " + person['name']
                + ". " + _ledger_say(person['id'], person['name']))

    # --- someone paid him -------------------------------------------------
    m = _rl.search(r"\\b([a-z][a-z .'-]{1,28}?)\\s+(?:paid|sent|gave)\\s+mi?e?\\s+" + MONEY, low)
    if m:
        person = _ledger_person_by_name(m.group(1))
        if person:
            amt = float(m.group(2).replace(',', ''))
            cur = _cur(m.group(3), person['id'])
            if not _add(person, 'repaid', amt, cur, q, side='them'):
                return "A try for write am down but e no save, bo."
            return ("\\U0001F4B0 " + person['name'] + " pay " + _money_s(amt, cur)
                    + ". " + _ledger_say(person['id'], person['name']))

    # --- he lent, or took, money -----------------------------------------
    m = _rl.search(r"\\bi\\s+(?:just\\s+)?(lent|loaned|borrowed)\\s+"
                   r"(?:from\\s+)?([a-z][a-z .'-]{1,28}?)\\s+" + MONEY, low)
    if not m:
        m2 = _rl.search(r"\\b([a-z][a-z .'-]{1,28}?)\\s+(?:lent|loaned)\\s+mi?e?\\s+" + MONEY, low)
        if m2:
            person = _ledger_person_by_name(m2.group(1))
            if person:
                amt = float(m2.group(2).replace(',', ''))
                cur = _cur(m2.group(3), person['id'])
                if not _add(person, 'borrowed', amt, cur, q):
                    return "A try for write am down but e no save, bo."
                return ("\\U0001F4DD Yu borrow " + _money_s(amt, cur) + " from "
                        + person['name'] + ". " + _ledger_say(person['id'], person['name']))
    if m:
        word, who, amount, curw = m.group(1), m.group(2), m.group(3), m.group(4)
        person = _ledger_person_by_name(who)
        if not person:
            return ("A no get " + who.strip().title() + " pan mi book. Add am first, bo.")
        amt = float(amount.replace(',', ''))
        cur = _cur(curw, person['id'])
        kind = 'borrowed' if word == 'borrowed' else 'lent'
        if not _add(person, kind, amt, cur, q):
            return "A try for write am down but e no save, bo."
        verb = ("Yu borrow " if kind == 'borrowed' else "Yu lend ")
        return ("\\U0001F4DD " + verb + _money_s(amt, cur)
                + (" from " if kind == 'borrowed' else " to ") + person['name']
                + ". " + _ledger_say(person['id'], person['name']))

    # --- someone bought something for him ---------------------------------
    m = _rl.search(r"\\b([a-z][a-z .'-]{1,28}?)\\s+(?:bought|buy|got)\\s+(?:mi?e?\\s+)?"
                   r"(.{2,34}?)\\s+(?:for\\s+)?" + MONEY, low)
    if m:
        person = _ledger_person_by_name(m.group(1))
        if person:
            amt = float(m.group(3).replace(',', ''))
            cur = _cur(m.group(4), person['id'])
            if not _add(person, 'bought', amt, cur, m.group(2).strip()):
                return "A try for write am down but e no save, bo."
            return ("\\U0001F4DD " + person['name'] + " buy " + m.group(2).strip()
                    + " - " + _money_s(amt, cur) + ". "
                    + _ledger_say(person['id'], person['name']))

    # --- a gift -----------------------------------------------------------
    m = _rl.search(r"\\b(?:i\\s+)?(?:gave|give)\\s+([a-z][a-z .'-]{1,28}?)\\s+"
                   + MONEY + r".{0,20}\\bgift\\b", low)
    if not m:
        m = _rl.search(r"\\bgift\\b.{0,20}?([a-z][a-z .'-]{1,28}?)\\s+" + MONEY, low)
    if m:
        person = _ledger_person_by_name(m.group(1))
        if person:
            amt = float(m.group(2).replace(',', ''))
            cur = _cur(m.group(3), person['id'])
            if not _add(person, 'gift', amt, cur, q, side='them'):
                return "A try for write am down but e no save, bo."
            return ("\\U0001F381 Gift to " + person['name'] + ": " + _money_s(amt, cur)
                    + ". E no dey pan di balance.")

    # --- what does X owe me, or what do I owe X ---------------------------
    m = _rl.search(r"\\b(?:how much (?:do(?:es)? )?)?(?:what )?(?:do(?:es)? )?"
                   r"(?:i\\s+owe\\s+)?([a-z][a-z .'-]{1,28}?)\\s*"
                   r"(?:owes?\\s+mi?e?)?\\s*\\??$", low)
    if _rl.search(r"\\bowe", low) and m:
        who = m.group(1).strip()
        who = _rl.sub(r"^(what|how much|do|does|i|me|mi)\\s+", "", who).strip()
        person = _ledger_person_by_name(who)
        if person:
            line = _ledger_say(person['id'], person['name'])
            loan = db.query("""SELECT amount, currency, repay_amount FROM ledger_entries
                               WHERE person_id = ? AND kind IN ('lent','borrowed')
                               ORDER BY id DESC LIMIT 1""", (person['id'],))
            if loan and loan[0].get('repay_amount'):
                bal = _ledger_balance(person['id'])
                for cur, b in bal.items():
                    per = float(loan[0]['repay_amount'] or 0)
                    if per > 0 and abs(b['net']) > 0:
                        n = int(abs(b['net']) / per) + (1 if abs(b['net']) % per else 0)
                        line += " At " + "{:,.0f}".format(per) + " a month na " + str(n) + " months."
                        break
            return line

    # --- who owes me, altogether ------------------------------------------
    if _rl.search(r"\\bwho\\s+(?:owes?|dey owe)\\s+mi?e?\\b", low):
        d = ledger_overview()
        if isinstance(d, tuple):
            d = d[0]
        them = d.get('they_owe_him') or []
        if not them:
            return "Nobody owe yu anything right now, bo."
        return ("Dem wey owe yu: "
                + "; ".join(x['name'] + " " + _money_s(x['amount'], x['currency'])
                            for x in them[:8]) + ".")

    if _rl.search(r"\\bwho\\s+(?:do\\s+)?i\\s+owe\\b|\\bwhat\\s+do\\s+i\\s+owe\\b", low):
        d = ledger_overview()
        if isinstance(d, tuple):
            d = d[0]
        mine = d.get('he_owes') or []
        if not mine:
            return "Yu no owe anybody, bo."
        return ("Yu owe: " + "; ".join(x['name'] + " " + _money_s(x['amount'], x['currency'])
                                       for x in mine[:8]) + ".")

    return None


'''

s = open('app.py').read()
done, miss = [], []

if '_ledger_from_chat' in s:
    miss.append("already there")
else:
    t = s.replace("def _money_breakdown(", FN + "def _money_breakdown(", 1)
    good, err = ok(t)
    if good: s = t; done.append("the money talk")
    else: miss.append("function: " + err[:90])

    o = "        # money on a job - what he owes, what he paid, what a quote became"
    n = """        # the ledger - what he sent, what he owes, who owes him
        try:
            _lg = _ledger_from_chat(query)
        except Exception as _elg:
            print("ledger from chat: " + str(_elg)[:70])
            _lg = None
        if _lg:
            try:
                db.execute("INSERT INTO conversations (user_message, ami_response) VALUES (?,?)",
                           (query, _lg))
            except Exception:
                pass
            return {"status": "success", "response": _lg, "role": "ami",
                    "engines_used": ["ledger"]}

        # money on a job - what he owes, what he paid, what a quote became"""
    if o in s:
        t = s.replace(o, n, 1)
        good, err = ok(t)
        if good: s = t; done.append("wired in ahead of the old one")
        else: miss.append("wiring: " + err[:90])
    else:
        miss.append("wiring (anchor)")

open('app.py', 'w').write(s)
print("DONE: " + ", ".join(done))
if miss: print("SKIPPED: " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("app.py compiles: " + ("YES" if good else "NO - " + err))
