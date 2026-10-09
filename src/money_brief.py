#!/usr/bin/env python3
"""The money in the morning, and noticing when a thing cost more than planned.

Two small ones.

The watch has been feeding the strip but not the morning briefing - and a
loan gone quiet for seven months is exactly what he wants with his coffee,
not something to find by tapping into a tab.

And we record the price moving on a material but nothing reads it back. If
the cement came in at twice the estimate, that is worth a word.

Run from the src folder with:  python3 money_brief.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

s = open('app.py').read()
done, miss = [], []

# --- 1. a thing that cost more than he planned for ------------------------
o1 = """    # a repayment due about now"""
n1 = """    # something bought at well over the estimate
    try:
        over = db.query(\"\"\"SELECT b.note, b.amount AS paid, b.quantity AS got,
                                  b.unit_price AS price_paid, a.unit_price AS price_said,
                                  b.currency, v.name AS job
                           FROM ledger_entries b
                           JOIN ledger_entries a ON a.id = b.against_id
                           LEFT JOIN ventures v ON v.id = b.venture_id
                           WHERE b.against_id IS NOT NULL
                             AND b.happened_on >= date('now','-60 days')\"\"\") or []
        for o in over:
            said = float(o.get('price_said') or 0)
            paid = float(o.get('price_paid') or 0)
            if said > 0 and paid > said * 1.15:
                out.append({"kind": "dearer",
                            "says": (str(o.get('note') or 'that') + " came in at "
                                     + "{:,.2f}".format(paid) + " each, not "
                                     + "{:,.2f}".format(said) + " - "
                                     + "{:+.0f}".format((paid - said) / said * 100) + "%"
                                     + ((" on " + str(o['job'])) if o.get('job') else "")
                                     + ".")})
    except Exception:
        pass

    # a repayment due about now"""
if o1 in s:
    s = s.replace(o1, n1, 1); done.append("a thing that cost more")
else:
    miss.append("the dearer check")

# --- 2. the money reaches the morning briefing ----------------------------
o2 = """def _news_for_first_message():"""
n2 = """def _money_for_briefing():
    \"\"\"One or two lines about the money, for the morning. Quiet when there
    is nothing worth saying - he does not need a daily finance report.\"\"\"
    try:
        notes = _money_worth_saying() or []
        if not notes:
            return ""
        return ("\\n\\nTHE MONEY (mention it plainly, one line each, only if it fits "
                "naturally): " + "; ".join(n['says'] for n in notes[:2]))
    except Exception:
        return ""


def _news_for_first_message():"""
if o2 in s:
    s = s.replace(o2, n2, 1); done.append("the briefing helper")
else:
    miss.append("the briefing helper")

good, err = ok(s)
if good:
    open('app.py', 'w').write(s)
    print("DONE: " + ", ".join(done))
    if miss:
        print("SKIPPED: " + ", ".join(miss))
else:
    print("broke, nothing written: " + err)
