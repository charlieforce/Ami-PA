#!/usr/bin/env python3
"""Batch 1: layout shell, proactive messages, subscriptions, blood sugar, lipids rename, learning.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch1.py
"""
import os, re, sqlite3, subprocess, sys

SRC = 'app.py'
FE = 'frontend/src'
done, skipped = [], []

def note(ok, label):
    (done if ok else skipped).append(label)

# ---------------------------------------------------------------- database ---
db = sqlite3.connect('data/ami_memory.db')
for sql in [
    "ALTER TABLE subscriptions ADD COLUMN due_day INTEGER",
    "ALTER TABLE subscriptions ADD COLUMN due_month INTEGER",
    "ALTER TABLE subscriptions ADD COLUMN cancelled_on DATE",
    "ALTER TABLE health_readings ADD COLUMN test_type TEXT",
    "ALTER TABLE conversations ADD COLUMN seen INTEGER DEFAULT 0",
]:
    try:
        db.execute(sql)
    except Exception:
        pass
db.execute("UPDATE conversations SET seen = 1 WHERE seen IS NULL OR seen = 0")
db.execute("""UPDATE subscriptions SET due_day = CAST(strftime('%d', next_renewal) AS INTEGER)
              WHERE next_renewal IS NOT NULL AND due_day IS NULL""")
db.commit(); db.close()
note(True, 'db columns')

# ---------------------------------------------------------------- backend ---
src = open(SRC).read()

# 1. proactive messages: what Ami has sent that he has not seen
if '/api/chat/proactive' not in src:
    anchor = '@app.get("/api/report")'
    EP = '''@app.get("/api/chat/proactive")
@require_password
def proactive_messages():
    """Messages Ami sent on her own - reminders, nudges, warnings - that he has not seen yet."""
    try:
        rows = db.query("""SELECT id, ami_response, timestamp FROM conversations
                           WHERE (user_message IS NULL OR user_message = '')
                             AND COALESCE(seen, 0) = 0
                             AND ami_response IS NOT NULL AND TRIM(ami_response) != ''
                             AND timestamp >= datetime('now', '-3 days')
                           ORDER BY id LIMIT 20""") or []
        return {"status": "success", "messages": [
            {"id": r['id'], "text": r['ami_response'], "at": r['timestamp']} for r in rows]}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/chat/proactive/seen")
@require_password
def proactive_seen():
    try:
        ids = (request.get_json(silent=True) or {}).get('ids') or []
        ids = [int(i) for i in ids][:50]
        if ids:
            db.execute("UPDATE conversations SET seen = 1 WHERE id IN (" +
                       ",".join("?" for _ in ids) + ")", tuple(ids))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    src = src.replace(anchor, EP + anchor, 1)
    note(True, 'proactive endpoints')

# 2. subscriptions: due day/month, notes, cancel
o = """                            (name, amount, currency, cycle, next_renewal, paid_with, category, cancel_url, notes)
                            VALUES (?,?,?,?,?,?,?,?,?)\"\"\",
                         (d['name'].strip(), float(d['amount']), d.get('currency') or 'USD',
                          d.get('cycle') or 'monthly', d.get('next_renewal'), d.get('paid_with'),
                          d.get('category'), d.get('cancel_url'), d.get('notes')))"""
n = """                            (name, amount, currency, cycle, next_renewal, due_day, due_month,
                             paid_with, category, cancel_url, notes)
                            VALUES (?,?,?,?,?,?,?,?,?,?,?)\"\"\",
                         (d['name'].strip(), float(d['amount']), d.get('currency') or 'USD',
                          d.get('cycle') or 'monthly', d.get('next_renewal'),
                          d.get('due_day'), d.get('due_month'), d.get('paid_with'),
                          d.get('category'), d.get('cancel_url'), d.get('notes')))"""
note(o in src, 'subscription insert')
src = src.replace(o, n, 1)

o = """        fields = ['name', 'amount', 'currency', 'cycle', 'next_renewal', 'paid_with',
                  'category', 'cancel_url', 'notes', 'status']"""
n = """        fields = ['name', 'amount', 'currency', 'cycle', 'next_renewal', 'due_day', 'due_month',
                  'paid_with', 'category', 'cancel_url', 'notes', 'status', 'cancelled_on']"""
note(o in src, 'subscription update fields')
src = src.replace(o, n, 1)

# renewal rolls from due_day when there is one
o = """            nd = _d.strptime(str(r['next_renewal'])[:10], '%Y-%m-%d').date()
            moved = False
            while nd < today:
                nd = _next_after(nd, r.get('cycle') or 'monthly')
                moved = True"""
n = """            nd = _d.strptime(str(r['next_renewal'])[:10], '%Y-%m-%d').date()
            moved = False
            while nd < today:
                nd = _next_after(nd, r.get('cycle') or 'monthly')
                moved = True
            if r.get('due_day'):
                import calendar as _cal2
                _dd = min(int(r['due_day']), _cal2.monthrange(nd.year, nd.month)[1])
                if nd.day != _dd:
                    nd = nd.replace(day=_dd)
                    moved = True"""
note(o in src, 'renewal follows due day')
src = src.replace(o, n, 1)

o = """        rows = db.query("SELECT id, next_renewal, cycle FROM subscriptions WHERE status = 'active' AND next_renewal IS NOT NULL") or []"""
n = """        rows = db.query("SELECT id, next_renewal, cycle, due_day FROM subscriptions WHERE status = 'active' AND next_renewal IS NOT NULL") or []"""
note(o in src, 'roll query')
src = src.replace(o, n, 1)

# 3. blood sugar: test type with its own range
o = """        rid = db.execute(\"\"\"INSERT INTO health_readings
                            (kind, value, unit, value_mmol, value_mgdl, context,
                             taken_at, where_taken, clinic, city, notes)
                            VALUES (?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP),?,?,?,?)\"\"\",
                         (kind, val, unit, val_mmol, val_mgdl, d.get('context'),
                          d.get('taken_at'), d.get('where_taken'),
                          d.get('clinic'), d.get('city'), d.get('notes')))"""
n = """        rid = db.execute(\"\"\"INSERT INTO health_readings
                            (kind, value, unit, value_mmol, value_mgdl, context, test_type,
                             taken_at, where_taken, clinic, city, notes)
                            VALUES (?,?,?,?,?,?,?,COALESCE(?, CURRENT_TIMESTAMP),?,?,?,?)\"\"\",
                         (kind, val, unit, val_mmol, val_mgdl, d.get('context'), d.get('test_type'),
                          d.get('taken_at'), d.get('where_taken'),
                          d.get('clinic'), d.get('city'), d.get('notes')))"""
note(o in src, 'blood sugar test type')
src = src.replace(o, n, 1)

# 4. learning: Ami asks when a class day changes
o = "Get to know his people."
n = ("If he says a class has moved to a different day, or that he missed one, say you will update it and "
     "tell him to change the days on the Learning screen - you cannot change it yourself yet. "
     "Get to know his people.")
note(o in src, 'learning day changes')
src = src.replace(o, n, 1)

open(SRC, 'w').write(src)

# ---------------------------------------------------------------- frontend ---
# 5. the page shell: fixed header, scrolling content, nothing pushed off
css = 'styles/DashboardMobile.css'
if os.path.exists(os.path.join(FE, css)):
    p = os.path.join(FE, css)
    s = open(p).read()
    if 'ami-app-shell' not in s:
        s += """

/* One shell for every page: header stays, only the content scrolls. */
.dashboard-mobile {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.mobile-header {
  flex: 0 0 auto;
  position: relative !important;
  z-index: 100;
  background: #1a1a1a;
  padding-top: env(safe-area-inset-top, 0px);
}
.ami-app-shell {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
}
/* modals keep their own heading visible */
.ami-modal, [class*="modal"] > div {
  max-height: 88dvh;
}
"""
        open(p, 'w').write(s)
        note(True, 'shell css')

# wrap everything below the header in the shell
p = os.path.join(FE, 'pages/Dashboard.jsx')
s = open(p).read()
mark = "      {/* Header - Fixed Top */}"
if 'ami-app-shell' not in s and mark in s:
    i = s.find(mark)
    j = s.find("\n      </div>\n", i)          # end of the header block
    j = s.find("\n", j + 14)
    tail = s.rstrip()
    k = tail.rfind("    </div>\n  );")
    if j != -1 and k != -1:
        s = s[:j + 1] + '      <div className="ami-app-shell">\n' + s[j + 1:k] + '      </div>\n' + s[k:]
        open(p, 'w').write(s)
        note(True, 'shell wrap')
    else:
        note(False, 'shell wrap')
else:
    note(False, 'shell wrap (already there?)')

# 6. proactive messages appear in the chat
s = open(p).read()
if 'proactive' not in s:
    anchor = "  const scrollToBottom = () => {"
    BLOCK = """  // Anything Ami sent on her own - reminders firing, nudges, warnings - shows up here.
  useEffect(() => {
    let stop = false;
    const pull = async () => {
      if (document.hidden || stop) return;
      try {
        const r = await fetch(`${API_URL}/api/chat/proactive`, { headers: { 'X-Ami-Password': PASSWORD } });
        const j = await r.json();
        const fresh = j.messages || [];
        if (fresh.length) {
          setMessages(prev => [...prev, ...fresh.map(m => ({ role: 'ami', text: m.text }))]);
          fetch(`${API_URL}/api/chat/proactive/seen`, {
            method: 'POST',
            headers: { 'X-Ami-Password': PASSWORD, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: fresh.map(m => m.id) })
          }).catch(() => {});
        }
      } catch (e) { /* offline - try again next time */ }
    };
    pull();
    const t = setInterval(pull, 60000);
    return () => { stop = true; clearInterval(t); };
  }, []);

"""
    if anchor in s:
        s = s.replace(anchor, BLOCK + anchor, 1)
        open(p, 'w').write(s)
        note(True, 'proactive in chat')
    else:
        note(False, 'proactive in chat')

# 7. Cholesterol tab renamed to Lipids
p = os.path.join(FE, 'components/MedicalTab.jsx')
s = open(p).read()
o = ">Cholesterol</button>"
note(o in s, 'lipids rename')
s = s.replace(o, ">Lipids</button>", 1)

# 8. blood sugar form: test type with the right range
o = """                <select style={S.input} value={form.context || 'fasting'}
                        onChange={e => setForm({ ...form, context: e.target.value })}>
                  <option value="fasting">Fasting</option>
                  <option value="before a meal">Before a meal</option>
                  <option value="2h after eating">2h after eating</option>
                  <option value="random">Any time</option>
                </select>"""
n = """                <select style={S.input} value={form.context || 'fasting'}
                        onChange={e => setForm({ ...form, context: e.target.value, test_type: e.target.value })}>
                  <option value="fasting">Fasting (normal 3.9-5.5 mmol/L)</option>
                  <option value="before a meal">Before a meal (4.0-5.9)</option>
                  <option value="2h after eating">2h after eating (under 7.8)</option>
                  <option value="random">Random, any time (4.0-8.0)</option>
                </select>"""
note(o in s, 'blood sugar ranges')
s = s.replace(o, n, 1)
open(p, 'w').write(s)

# ---------------------------------------------------------------- report ---
print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:400]))
