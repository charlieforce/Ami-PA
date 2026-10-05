#!/usr/bin/env python3
"""The report, finished.

  - every number compared with the period before
  - one honest line at the top
  - what he said he would do, and did not
  - the people he has not spoken about
  - what he talks about against what he actually touched
  - and the two bugs: nothing showing as stuck, quiet ventures with no number

Run from  ~/Desktop/The Real Ami PA/src   with:  python3 report_v3.py
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

# ---- 1. stuck: measure from when it was made, not last touched --------------
go('stuck counts properly',
"""        stuck = []
        for t in t_open + d_open:
            d0 = _day(t.get('updated_at')) or _day(t.get('created_at'))""",
"""        stuck = []
        for t in t_open + d_open:
            d0 = _day(t.get('created_at')) or _day(t.get('updated_at'))""")

# ---- 2. quiet ventures: say how long, even with nothing on the board --------
go('quiet ventures get a number',
"""            if not mine:
                quiet.append({"venture": nm, "last_touched": None, "days_quiet": None,
                              "open": 0, "note": "nothing on the board at all"})
                continue""",
"""            if not mine:
                quiet.append({"venture": nm, "last_touched": None, "days_quiet": 999,
                              "open": 0, "note": "nothing on the board at all"})
                continue""")

# ---- 3. everything else, added before the return ----------------------------
EXTRA = '''
        # ---- the same numbers, for the period before this one ---------------
        was_made = [t for t in tasks if before <= _day(t.get('created_at')) < since]
        was_made += [t for t in todos if before <= _day(t.get('created_at')) < since]
        was_late = 0
        for t in t_open + d_open:
            dd = _day(t.get('due_date'))
            if dd and dd < since:
                was_late += 1
        out['movement']['made_before'] = len(was_made)
        out['movement']['late_before'] = was_late
        out['movement']['late_change'] = len(late) - was_late

        # ---- what he said he would do ---------------------------------------
        said = []
        try:
            import re as _rs
            rows = db.query("""SELECT user_message, timestamp FROM conversations
                               WHERE DATE(timestamp) >= ? AND user_message IS NOT NULL
                                 AND TRIM(user_message) != ''
                               ORDER BY id""", (since,)) or []
            openish = [(t.get('title') or '').lower() for t in (t_open + d_open)]
            for r in rows:
                msg = str(r.get('user_message') or '')
                for m in _rs.finditer(r"\\b(?:i(?:'| a)?ll|i will|i am going to|i'm going to|"
                                      r"i need to|i have to|i should|let me)\\s+([a-z][^.,;!?]{6,70})",
                                      msg, _rs.I):
                    what = m.group(1).strip().rstrip('.')
                    if len(what) < 8:
                        continue
                    key = [w for w in what.lower().split() if len(w) > 4][:3]
                    if key and any(all(k in o for k in key) for o in openish):
                        continue          # it is on a board, so it is tracked
                    done_words = ('did', 'done', 'finished', 'sorted', 'called', 'sent')
                    if any(w in msg.lower() for w in done_words):
                        continue
                    said.append({"said": what[:80], "on": _day(r.get('timestamp'))})
            seen, keep = set(), []
            for x in said:
                k = x['said'].lower()[:28]
                if k not in seen:
                    seen.add(k); keep.append(x)
            out['said_he_would'] = keep[-8:]
        except Exception as _e:
            out['said_he_would'] = []

        # ---- people he has not spoken about ---------------------------------
        try:
            out['not_spoken_of'] = [
                {"name": r['name'], "who": r.get('relationship') or '',
                 "last": _day(r.get('last_mentioned')) or 'not in a while'}
                for r in (db.query("""SELECT name, relationship, last_mentioned FROM contacts
                                      WHERE close = 1
                                        AND (last_mentioned IS NULL
                                             OR last_mentioned <= date('now','-14 days'))
                                      ORDER BY COALESCE(last_mentioned, '2000-01-01') LIMIT 5""") or [])]
        except Exception:
            out['not_spoken_of'] = []

        # ---- what he talks about, against what he touched -------------------
        try:
            talk = {}
            convo = db.query("""SELECT user_message FROM conversations
                                WHERE DATE(timestamp) >= ?""", (since,)) or []
            blob = " ".join(str(c.get('user_message') or '') for c in convo).lower()
            for vid, nm in ventures.items():
                first = nm.split()[0].lower()
                if len(first) < 3:
                    continue
                mentions = blob.count(first)
                touched = attention.get(nm, {}).get('touched', 0)
                if mentions or touched:
                    talk[nm] = {"talked_about": mentions, "worked_on": touched}
            out['talk_vs_work'] = dict(sorted(
                talk.items(), key=lambda kv: -(kv[1]['talked_about'] - kv[1]['worked_on']))[:6])
        except Exception:
            out['talk_vs_work'] = {}

        # ---- one line he cannot misread -------------------------------------
        try:
            mv = out['movement']
            bits = []
            if mv['finished'] == 0 and mv['made'] > 0:
                bits.append("You made " + str(mv['made']) + " and finished none")
            else:
                d0 = mv['finished'] - mv['finished_before']
                bits.append("You finished " + str(mv['finished']) +
                            (" (up " + str(d0) + ")" if d0 > 0 else
                             (" (down " + str(-d0) + ")" if d0 < 0 else "")) +
                            " and made " + str(mv['made']))
            if mv.get('late'):
                ch = mv.get('late_change', 0)
                bits.append(str(mv['late']) + " overdue" +
                            (", " + str(ch) + " more than last time" if ch > 0 else
                             (", " + str(-ch) + " fewer" if ch < 0 else ", same as last time")))
            top = list(out['attention'].keys())
            if top:
                bits.append(top[0] + " had your attention")
            nq = len([q for q in out['gone_quiet'] if (q.get('days_quiet') or 0) > days])
            if nq:
                bits.append(str(nq) + " venture" + ("s" if nq != 1 else "") + " had none")
            body_missed = [k for k, v in (out.get('body') or {}).items()
                           if v.get('per') == 'day' and (v.get('days_logged') or 0) < 3]
            if body_missed:
                bits.append(", ".join(body_missed) + " barely logged")
            out['headline'] = ". ".join(bits) + "."
        except Exception:
            out['headline'] = ""

'''
go('the five additions',
   "        return {\"status\": \"success\", **out}\n    except Exception as e:\n        import traceback as _tb",
   EXTRA + "        return {\"status\": \"success\", **out}\n    except Exception as e:\n        import traceback as _tb")

# ---- 4. Ami reads it ---------------------------------------------------------
FN = '''def _report_for_context():
    """The week at a glance, so she can bring it up herself."""
    try:
        import json as _j
        from flask import current_app as _ca
        with app.test_request_context('/api/report2?period=week',
                                      headers={'X-Ami-Password': AMI_PASSWORD}):
            r = work_report_v2()
        d = r[0] if isinstance(r, tuple) else r
        if not isinstance(d, dict) or d.get('error'):
            return ""
        bits = ["\\n\\nHIS WEEK SO FAR (only bring this up if he asks, or if it answers "
                "what he just said):"]
        if d.get('headline'):
            bits.append("- " + d['headline'])
        q = [x['venture'] for x in (d.get('gone_quiet') or []) if (x.get('days_quiet') or 0) > 7]
        if q:
            bits.append("- nothing moved on: " + ", ".join(q[:4]))
        sw = d.get('said_he_would') or []
        if sw:
            bits.append("- he said he would: " + "; ".join(x['said'] for x in sw[:3]))
        ns = d.get('not_spoken_of') or []
        if ns:
            bits.append("- has not mentioned: " + ", ".join(x['name'].split()[0] for x in ns[:3]))
        return "\\n".join(bits)
    except Exception:
        return ""


'''
go('she can read the report', "def _goals_for_context():", FN + "def _goals_for_context():")

go('the report reaches her',
   "    import re as _rtg\n    try:",
   "    import re as _rtg\n"
   "    try:\n"
   "        if _rtg.search(r'\\b(how (am i|did i|is it) (doing|going)|my week|this week|report|"
   "progress|where am i|how are things|what have i (done|been))\\w*', (query or '').lower()):\n"
   "            context += _report_for_context()\n"
   "    except Exception:\n"
   "        pass\n"
   "    try:")

open('app.py', 'w').write(s)
print("DONE (" + str(len(done)) + "): " + ", ".join(done))
if miss:
    print("MISSED (" + str(len(miss)) + "): " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("\napp.py compiles: " + ("YES" if good else "NO - " + err))
