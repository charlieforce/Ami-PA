#!/usr/bin/env python3
"""The rest of the money feature.

What a quote needs beyond a number:
  - what was actually agreed, in words, because six weeks later nobody
    remembers whether the carpenter said he would supply the wood
  - rough dates, both movable, neither required
  - a photo of what the place looked like when they shook hands
  - and a flag when something has gone quiet: agreed two months ago, no
    payment, no word. Either it is done and unbilled, or it has stalled.

Plus a report he can send on WhatsApp, which means a PDF.

Run from the src folder with:  python3 money_more.py
"""
import sqlite3, subprocess, sys, tempfile, os

DB = os.getenv("AMI_DB_PATH", "data/ami_memory.db")

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

db = sqlite3.connect(DB)
have = {r[1] for r in db.execute("PRAGMA table_info(job_quotes)")}
for col, decl in (("agreed_what", "TEXT"), ("starts_on", "TEXT"), ("ends_on", "TEXT")):
    if col not in have:
        db.execute("ALTER TABLE job_quotes ADD COLUMN " + col + " " + decl)
        print("  added job_quotes." + col)
db.execute("""CREATE TABLE IF NOT EXISTS job_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER,
    venture_id INTEGER,
    file_path TEXT,
    caption TEXT,
    taken_on TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
db.commit(); db.close()
os.makedirs('data/job_photos', exist_ok=True)
print("quote detail and photos ready")

EP = '''@app.put("/api/money/quote/<int:qid>/detail")
@require_password
def money_quote_detail(qid):
    """What was agreed, and roughly when. Both dates movable."""
    try:
        d = request.get_json() or {}
        sets, vals = [], []
        for f, col in (('agreed', 'agreed_what'), ('starts_on', 'starts_on'),
                       ('ends_on', 'ends_on'), ('notes', 'notes'),
                       ('what', 'what')):
            if f in d:
                sets.append(col + " = ?")
                vals.append((str(d[f])[:600]) if f in ('agreed', 'notes') else d[f])
        if not sets:
            return {"error": "nothing to change"}, 400
        vals.append(qid)
        db.execute("UPDATE job_quotes SET " + ", ".join(sets) + " WHERE id = ?", tuple(vals))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/money/quote/<int:qid>/photo")
@require_password
def money_quote_photo(qid):
    """What it looked like when they agreed. Settles arguments later."""
    try:
        import os as _os
        from datetime import datetime as _dp
        f = request.files.get('file') or request.files.get('photo')
        if not f or not f.filename:
            return {"error": "no photo"}, 400
        _os.makedirs('data/job_photos', exist_ok=True)
        safe = _dp.now().strftime('%Y%m%d%H%M%S') + "_" + _os.path.basename(f.filename)[:50]
        path = _os.path.join('data/job_photos', safe)
        f.save(path)
        q = db.query("SELECT venture_id FROM job_quotes WHERE id = ?", (qid,))
        db.execute("""INSERT INTO job_photos (quote_id, venture_id, file_path, caption, taken_on)
                      VALUES (?, ?, ?, ?, ?)""",
                   (qid, (q[0]['venture_id'] if q else None), path,
                    (request.form.get('caption') or '')[:140],
                    request.form.get('taken_on') or _dp.now().strftime('%Y-%m-%d')))
        return {"status": "success", "file": safe}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/money/quote/<int:qid>/photos")
@require_password
def money_quote_photos(qid):
    try:
        rows = db.query("""SELECT id, caption, taken_on FROM job_photos
                           WHERE quote_id = ? ORDER BY id DESC""", (qid,)) or []
        return {"status": "success", "photos": rows}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/money/photo/<int:fid>")
@require_password
def money_photo_file(fid):
    try:
        from flask import send_file
        r = db.query("SELECT file_path FROM job_photos WHERE id = ?", (fid,))
        if not r:
            return {"error": "no such photo"}, 404
        return send_file(r[0]['file_path'])
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/money/<int:pid>/quiet")
@require_password
def money_gone_quiet(pid):
    """Agreed a while back, nothing paid, nothing said. Finished and
    unbilled, or stalled - either way he should know."""
    try:
        ids = _all_under(pid)
        inlist = ",".join(str(i) for i in ids)
        rows = db.query("""SELECT q.id, q.what, q.amount, q.agreed_on, q.created_at,
                                  p.name,
                                  (SELECT COUNT(*) FROM job_payments y
                                   WHERE y.quote_id = q.id) AS payments,
                                  (SELECT MAX(paid_on) FROM job_payments y2
                                   WHERE y2.person_id = q.person_id) AS last_paid
                           FROM job_quotes q
                           JOIN job_people p ON p.id = q.person_id
                           WHERE q.venture_id IN (""" + inlist + """)
                             AND COALESCE(q.status,'agreed') NOT IN ('done','cancelled')
                           ORDER BY q.id""") or []
        from datetime import datetime as _dq
        today = _dq.now()
        quiet = []
        for r in rows:
            when = str(r.get('agreed_on') or r.get('created_at') or '')[:10]
            if not when:
                continue
            try:
                days = (today - _dq.strptime(when, '%Y-%m-%d')).days
            except Exception:
                continue
            if days >= 45 and not (r['payments'] or 0):
                quiet.append({"quote_id": r['id'], "who": r['name'], "what": r['what'],
                              "amount": r['amount'], "agreed": when, "days": days})
        return {"status": "success", "quiet": quiet}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/money/<int:pid>/report.pdf")
@require_password
def money_report_pdf(pid):
    """The same report, as something he can send on WhatsApp."""
    try:
        from flask import send_file
        import io as _io
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas as _canvas

        v = db.query("SELECT name FROM ventures WHERE id = ?", (pid,))
        title = v[0]['name'] if v else 'Job'
        people, materials = _money_for(pid)
        quoted = sum(p['quoted'] for p in people)
        paid = sum(p['paid'] for p in people)
        cur = _job_currency(pid)

        buf = _io.BytesIO()
        c = _canvas.Canvas(buf, pagesize=A4)
        W, Hh = A4
        y = Hh - 25 * mm

        c.setFont("Helvetica-Bold", 17)
        c.drawString(20 * mm, y, title)
        y -= 7 * mm
        from datetime import datetime as _dr
        c.setFont("Helvetica", 9)
        c.setFillGray(0.45)
        c.drawString(20 * mm, y, "Where the money stands, " + _dr.now().strftime('%-d %B %Y'))
        c.setFillGray(0)
        y -= 12 * mm

        c.setFont("Helvetica", 11)
        for label, val in (("Quoted in total", quoted),
                           ("Paid out", paid),
                           ("Materials", materials),
                           ("Still owed", quoted - paid)):
            c.drawString(20 * mm, y, label)
            c.drawRightString(W - 20 * mm, y, _money_line(val, cur))
            y -= 6.5 * mm
        y -= 5 * mm

        c.setFont("Helvetica-Bold", 12)
        c.drawString(20 * mm, y, "Who is owed what")
        y -= 7 * mm
        c.setFont("Helvetica", 10)
        for p in sorted(people, key=lambda x: -x['owed']):
            if not (p['quoted'] or p['paid']):
                continue
            if y < 35 * mm:
                c.showPage(); y = Hh - 25 * mm; c.setFont("Helvetica", 10)
            c.drawString(22 * mm, y,
                         p['name'] + ((" - " + p['trade']) if p['trade'] else ""))
            c.drawRightString(W - 20 * mm, y,
                              "owed " + "{:,.0f}".format(p['owed']))
            y -= 5 * mm
            c.setFillGray(0.45)
            c.setFont("Helvetica", 8.5)
            c.drawString(26 * mm, y, "quoted " + "{:,.0f}".format(p['quoted'])
                         + ", paid " + "{:,.0f}".format(p['paid']))
            c.setFillGray(0)
            c.setFont("Helvetica", 10)
            y -= 7 * mm

        moved = [(p, d) for p in people for d in p['drift']]
        if moved:
            y -= 4 * mm
            c.setFont("Helvetica-Bold", 12)
            c.drawString(20 * mm, y, "Where the estimates moved")
            y -= 7 * mm
            c.setFont("Helvetica", 9.5)
            for p, d in moved:
                if y < 30 * mm:
                    c.showPage(); y = Hh - 25 * mm; c.setFont("Helvetica", 9.5)
                first = float(d['first'] or 0)
                now = float(d['now'] or 0)
                pct = (" (" + "{:+.0f}".format((now - first) / first * 100) + "%)") if first else ""
                c.drawString(22 * mm, y, p['name'] + " - " + str(d['what']) + ": "
                             + "{:,.0f}".format(first) + " then " + "{:,.0f}".format(now) + pct)
                y -= 5 * mm
                if d['why']:
                    c.setFillGray(0.45)
                    c.setFont("Helvetica", 8.5)
                    c.drawString(26 * mm, y, str(d['why'])[:95])
                    c.setFillGray(0)
                    c.setFont("Helvetica", 9.5)
                    y -= 6 * mm

        c.showPage()
        c.save()
        buf.seek(0)
        safe = "".join(ch for ch in title if ch.isalnum() or ch in " -_").strip()[:40]
        return send_file(buf, mimetype='application/pdf', as_attachment=True,
                         download_name=(safe or "job") + " money.pdf")
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/money/quote/<int:qid>/detail' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("quote detail, photos, the gone-quiet check, and the PDF")
else:
    print("broke: " + err)
