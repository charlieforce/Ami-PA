#!/usr/bin/env python3
"""The reports. Different covers on the same ledger.

Aminata wants the Freetown house. Charles S wants Bo. Jeremiah might want his
own loan statement. Charlie wants to know what he owes altogether, and what
the house really cost against what he was told it would.

Four reports, each as readable text and as a PDF he can send on WhatsApp:
  person   - one account, itemised, like a bank statement
  project  - a job: who, what was agreed, what went out, where it drifted
  loans    - lending both ways, what is left, when it clears
  all      - who owes him, who he owes, in USD so it compares

Run from the src folder with:  python3 ledger_reports.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

EP = '''def _money_s(amount, currency):
    """1,500 SLE (~61 USD). Plain when it is already dollars."""
    cur = (currency or 'USD').upper()[:4]
    base = "{:,.0f}".format(float(amount or 0)) + " " + cur
    if cur == 'USD':
        return base
    u = _in_usd(amount, cur)
    return base + ((" (~" + "{:,.0f}".format(u) + " USD)") if u else "")


def _report_person(pid):
    """One account, the way a statement reads."""
    p = db.query("SELECT * FROM ledger_people WHERE id = ?", (pid,))
    if not p:
        return None, []
    rows = db.query("""SELECT e.*, v.name AS project FROM ledger_entries e
                       LEFT JOIN ventures v ON v.id = e.venture_id
                       WHERE e.person_id = ?
                       ORDER BY e.happened_on, e.id""", (pid,)) or []
    name = p[0]['name']
    L = [name]
    if p[0].get('what_they_do'):
        L.append(str(p[0]['what_they_do']))
    L.append("")
    bal = _ledger_balance(pid)
    for cur, b in bal.items():
        if abs(b['net']) < 0.01:
            continue
        if b['net'] > 0:
            L.append(name + " owes you " + _money_s(b['net'], cur))
        else:
            L.append("You owe " + name + " " + _money_s(-b['net'], cur))
    L.append("")
    L.append("Every line")
    WORDS = {'agreed': 'agreed', 'paid': 'you paid', 'bought': 'they bought',
             'lent': 'you lent', 'borrowed': 'you borrowed', 'repaid': 'repaid',
             'forgiven': 'written off'}
    for r in rows:
        tag = "  " + str(r.get('happened_on') or '')[:10] + "  "
        tag += (WORDS.get(r['kind'], r['kind']) + " ").ljust(14)
        tag += "{:,.0f}".format(float(r['amount'] or 0)).rjust(10) + " " + (r['currency'] or '')
        if r.get('note'):
            tag += "   " + str(r['note'])[:44]
        if str(r.get('status')) == 'forgiven':
            tag += "   [written off]"
        L.append(tag)
    moved = db.query("""SELECT c.was, c.now_is, c.why, e.note FROM ledger_changes c
                        JOIN ledger_entries e ON e.id = c.entry_id
                        WHERE e.person_id = ? ORDER BY c.id""", (pid,)) or []
    if moved:
        L.append("")
        L.append("Where the figure moved")
        for m in moved:
            was, now = float(m['was'] or 0), float(m['now_is'] or 0)
            pct = (" (" + "{:+.0f}".format((now - was) / was * 100) + "%)") if was else ""
            L.append("  " + str(m.get('note') or 'the work') + ": "
                     + "{:,.0f}".format(was) + " then " + "{:,.0f}".format(now) + pct
                     + (("  - " + str(m['why'])) if m.get('why') else ""))
    return name, L


def _report_project(vid):
    """A job, for whoever is asking about it."""
    d = ledger_project(vid)
    if isinstance(d, tuple):
        d = d[0]
    if not isinstance(d, dict) or d.get('error'):
        return None, []
    cur = d.get('currency') or 'USD'
    t = d.get('totals') or {}
    L = [str(d.get('project') or 'The job')]
    from datetime import datetime as _dr
    L.append("Where the money stands, " + _dr.now().strftime('%-d %B %Y'))
    L.append("")
    L.append("Agreed in total   " + _money_s(t.get('agreed'), cur))
    L.append("Paid out          " + _money_s(t.get('paid'), cur))
    if t.get('bought'):
        L.append("Bought for it     " + _money_s(t.get('bought'), cur))
    L.append("Still owed        " + _money_s(t.get('owed'), cur))
    L.append("")
    L.append("Who is on it")
    for p in sorted(d.get('people') or [], key=lambda x: -x['owed']):
        if not (p['agreed'] or p['paid'] or p['bought']):
            continue
        line = "  " + str(p['name'])[:22].ljust(23)
        line += "agreed " + "{:,.0f}".format(p['agreed']).rjust(9)
        line += "   paid " + "{:,.0f}".format(p['paid']).rjust(9)
        line += "   owed " + "{:,.0f}".format(p['owed']).rjust(9)
        L.append(line)
    if d.get('moved'):
        L.append("")
        L.append("Where the estimates moved")
        for m in d['moved']:
            was, now = float(m['was'] or 0), float(m['now_is'] or 0)
            pct = (" (" + "{:+.0f}".format((now - was) / was * 100) + "%)") if was else ""
            L.append("  " + str(m.get('name') or '') + " - " + str(m.get('note') or '')
                     + ": " + "{:,.0f}".format(was) + " then " + "{:,.0f}".format(now) + pct
                     + (("  - " + str(m['why'])) if m.get('why') else ""))
    return str(d.get('project') or 'job'), L


def _report_loans():
    d = ledger_loans()
    if isinstance(d, tuple):
        d = d[0]
    L = ["Lending", ""]
    out_, in_ = [], []
    for l in (d.get('loans') or []):
        (out_ if l['direction'] == 'he lent' else in_).append(l)
    if out_:
        L.append("Money you lent")
        for l in out_:
            s = "  " + str(l['who'])[:20].ljust(21) + _money_s(l['principal'], l['currency'])
            s += "   left " + "{:,.0f}".format(l['left'])
            if l.get('months_to_clear'):
                s += "   clears in " + str(l['months_to_clear']) + " months"
            L.append(s)
            if l.get('note'):
                L.append("      " + str(l['note'])[:60])
        L.append("")
    if in_:
        L.append("Money you took")
        for l in in_:
            s = "  " + str(l['who'])[:20].ljust(21) + _money_s(l['principal'], l['currency'])
            s += "   left " + "{:,.0f}".format(l['left'])
            L.append(s)
            if l.get('note'):
                L.append("      " + str(l['note'])[:60])
    if not out_ and not in_:
        L.append("Nothing lent either way.")
    return "Lending", L


def _report_all():
    d = ledger_overview()
    if isinstance(d, tuple):
        d = d[0]
    t = d.get('totals_usd') or {}
    from datetime import datetime as _dr
    L = ["Where everything stands", _dr.now().strftime('%-d %B %Y'), ""]
    L.append("Owed to you     ~" + "{:,.0f}".format(t.get('they_owe') or 0) + " USD")
    L.append("You owe         ~" + "{:,.0f}".format(t.get('he_owes') or 0) + " USD")
    L.append("")
    if d.get('they_owe_him'):
        L.append("They owe you")
        for x in d['they_owe_him']:
            L.append("  " + str(x['name'])[:22].ljust(23) + _money_s(x['amount'], x['currency']))
    if d.get('he_owes'):
        L.append("")
        L.append("You owe them")
        for x in d['he_owes']:
            L.append("  " + str(x['name'])[:22].ljust(23) + _money_s(x['amount'], x['currency']))
    return "Everything", L


@app.get("/api/ledger/report")
@require_password
def ledger_report():
    """person / project / loans / all - as text he can read or send."""
    try:
        what = (request.args.get('what') or 'all').lower()
        if what == 'person':
            title, L = _report_person(int(request.args.get('id')))
        elif what == 'project':
            title, L = _report_project(int(request.args.get('id')))
        elif what == 'loans':
            title, L = _report_loans()
        else:
            title, L = _report_all()
        if not L:
            return {"error": "nothing to report on"}, 404
        return {"status": "success", "title": title, "report": "\\n".join(L)}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/ledger/report.pdf")
@require_password
def ledger_report_pdf():
    """The same, as something to send on WhatsApp."""
    try:
        from flask import send_file
        import io as _io
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas as _cv

        what = (request.args.get('what') or 'all').lower()
        if what == 'person':
            title, L = _report_person(int(request.args.get('id')))
        elif what == 'project':
            title, L = _report_project(int(request.args.get('id')))
        elif what == 'loans':
            title, L = _report_loans()
        else:
            title, L = _report_all()
        if not L:
            return {"error": "nothing to report on"}, 404

        buf = _io.BytesIO()
        c = _cv.Canvas(buf, pagesize=A4)
        W, Hh = A4
        y = Hh - 24 * mm
        c.setFont("Helvetica-Bold", 16)
        c.drawString(20 * mm, y, str(L[0])[:60])
        y -= 10 * mm
        for line in L[1:]:
            if y < 22 * mm:
                c.showPage(); y = Hh - 24 * mm
            s = str(line)
            if not s.strip():
                y -= 3.5 * mm
                continue
            indented = s.startswith('  ')
            heading = (not indented) and len(s) < 46 and not any(ch.isdigit() for ch in s[:4])
            c.setFont("Helvetica-Bold" if heading else "Helvetica",
                      11 if heading else 9.5)
            if indented:
                c.setFillGray(0.2)
            c.drawString((24 if indented else 20) * mm, y, s.strip()[:104])
            c.setFillGray(0)
            y -= (6.5 if heading else 5) * mm
        c.showPage(); c.save(); buf.seek(0)
        safe = "".join(ch for ch in str(title) if ch.isalnum() or ch in " -_").strip()[:40]
        return send_file(buf, mimetype='application/pdf', as_attachment=True,
                         download_name=(safe or "money") + ".pdf")
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/ledger/report' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("four reports, as text and as PDF")
else:
    print("broke: " + err)
