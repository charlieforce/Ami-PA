#!/usr/bin/env python3
"""Batch 7: she moves a class day when you tell her; thumbs-down opens a correction.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch7.py
"""
import os, subprocess, sys
SRC, FE = 'app.py', 'frontend/src'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

src = open(SRC).read()
anchor = '@app.get("/api/report")'

# ---- 1. "Spanish moved to Thursday" -----------------------------------------
if 'def _course_day_change' not in src:
    FN = '''_DAY_WORDS = {'mon': 'Mon', 'monday': 'Mon', 'tue': 'Tue', 'tues': 'Tue', 'tuesday': 'Tue',
              'wed': 'Wed', 'weds': 'Wed', 'wednesday': 'Wed', 'thu': 'Thu', 'thur': 'Thu',
              'thurs': 'Thu', 'thursday': 'Thu', 'fri': 'Fri', 'friday': 'Fri',
              'sat': 'Sat', 'saturday': 'Sat', 'sun': 'Sun', 'sunday': 'Sun'}


def _course_day_change(text):
    """'Spanish moved to Thursday' / 'no more Spanish on Tuesday' - update the days.
    Returns a short line to say back, or None if this was not about a class day."""
    try:
        import re as _r
        t = (text or '').lower()
        if not _r.search(r'\\b(class|lesson|course|moved|move|switch|changed|no more|dropped|cancel)\\b', t):
            return None
        courses = db.query("SELECT id, title, days FROM course_schedule") or []
        if not courses:
            return None
        hit = None
        for c in courses:
            name = (c['title'] or '').lower().strip()
            if name and _r.search(r'(?<![a-z])' + _r.escape(name) + r'(?![a-z])', t):
                hit = c
                break
        if not hit:
            return None
        days = [d for d in (hit.get('days') or '').split(',') if d]
        found = []
        for w, d in _DAY_WORDS.items():
            if _r.search(r'(?<![a-z])' + w + r'(?![a-z])', t) and d not in found:
                found.append(d)
        if not found:
            return None
        removing = bool(_r.search(r'\\b(no more|not on|dropped|cancel|stop)\\b', t))
        order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        if removing:
            new = [d for d in days if d not in found]
            action = "took " + hit['title'] + " off " + ", ".join(found)
        elif _r.search(r'\\b(moved|move|switch|changed|now on)\\b', t) and len(found) == 1 and len(days) == 1:
            new = found
            action = "moved " + hit['title'] + " to " + found[0]
        elif _r.search(r'\\b(moved|move|switch|changed)\\b', t) and len(found) == 2:
            new = [found[1] if d == found[0] else d for d in days]
            if found[1] not in new:
                new.append(found[1])
            action = "moved " + hit['title'] + " from " + found[0] + " to " + found[1]
        else:
            new = sorted(set(days + found), key=lambda x: order.index(x) if x in order else 9)
            action = hit['title'] + " is now on " + ", ".join(new)
        new = sorted(set(new), key=lambda x: order.index(x) if x in order else 9)
        db.execute("UPDATE course_schedule SET days = ? WHERE id = ?", (",".join(new), hit['id']))
        return ("COURSE UPDATED: you " + action + ". It now runs " +
                (", ".join(new) if new else "on no days") +
                ". Say so in one short clause inside your normal reply.")
    except Exception as e:
        print("course day change error: " + str(e))
        return None


'''
    src = src.replace(anchor, FN + anchor, 1); note(True, 'course day function')

o = "    _learned = None if _is_question else extract_durable_facts(query)"
n = (o + "\n    _course_note = None if _is_question else _course_day_change(query)")
note(o in src, 'course hook'); src = src.replace(o, n, 1)

o = """    if _learned:
        context += ("\\n\\nYOU JUST SAVED THIS TO MEMORY: " + _learned +"""
n = """    if _course_note:
        context += "\\n\\n" + _course_note
    if _learned:
        context += ("\\n\\nYOU JUST SAVED THIS TO MEMORY: " + _learned +"""
note(o in src, 'course note in context'); src = src.replace(o, n, 1)

o = ("If he says a class has moved to a different day, or that he missed one, say you will update it and "
     "tell him to change the days on the Learning screen - you cannot change it yourself yet. ")
n = ("If he tells you a class has moved day, you update it yourself - just say so briefly. ")
note(o in src, 'script updated'); src = src.replace(o, n, 1)

# ---- 2. thumbs-down correction ----------------------------------------------
if '/api/chat/correct' not in src:
    EP = '''@app.post("/api/chat/correct")
@require_password
def chat_correct():
    """He tapped thumbs-down and told her what she should have said."""
    try:
        d = request.get_json() or {}
        wrong = (d.get('wrong') or '').strip()
        right = (d.get('right') or '').strip()
        if not right:
            return {"error": "What should she have said?"}, 400
        db.execute("""INSERT INTO corrections (incorrect_text, correct_text, context, category, applied)
                      VALUES (?,?,?,?,0)""",
                   (wrong[:400], right[:600], (d.get('note') or 'corrected in chat')[:200],
                    d.get('category') or 'facts'))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    src = src.replace(anchor, EP + anchor, 1); note(True, 'correction endpoint')

open(SRC, 'w').write(src)

# ---- frontend: thumbs-down on her messages ----------------------------------
p = os.path.join(FE, 'pages/Dashboard.jsx')
s = open(p).read()

if 'correcting' not in s:
    o = "  const [isOffline, setIsOffline] = useState("
    n = ("  const [correcting, setCorrecting] = useState(null);\n"
         "  const [correction, setCorrection] = useState('');\n" + o)
    s = s.replace(o, n, 1); note(True, 'correction state')

# the thumbs-down button on each of her messages
import re
m = re.search(r"\{msg\.role === 'ami'[^\n]*\n", s)
o2 = """                      <img src={amiImage} alt="Ami" className="msg-avatar" />"""
n2 = o2 + """
                      {msg.text && msg.text.length > 20 && (
                        <button title="She got this wrong"
                                onClick={() => { setCorrecting(msg.text); setCorrection(''); }}
                                style={{ background: 'none', border: 'none', color: '#555',
                                         cursor: 'pointer', fontSize: '13px', padding: '2px 6px',
                                         alignSelf: 'flex-start' }}>👎</button>
                      )}"""
if o2 in s and 'She got this wrong' not in s:
    s = s.replace(o2, n2, 1); note(True, 'thumbs-down button')

# the correction box
o3 = "      {isOffline && ("
n3 = """      {correcting && (
        <div onClick={() => setCorrecting(null)}
             style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
               style={{ background: '#1a1a1a', borderRadius: '12px', padding: '16px',
                        width: '100%', maxWidth: '520px', border: '1px solid #333' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#eee', marginBottom: '10px' }}>
              What should she have said?
            </div>
            <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.5, marginBottom: '10px',
                          maxHeight: '90px', overflowY: 'auto', background: '#141414',
                          padding: '8px', borderRadius: '6px' }}>
              {correcting}
            </div>
            <textarea autoFocus value={correction} onChange={e => setCorrection(e.target.value)}
                      placeholder="The right answer, or what she got wrong"
                      style={{ width: '100%', minHeight: '90px', padding: '10px', fontSize: '15px',
                               background: '#141414', color: '#eee', border: '1px solid #333',
                               borderRadius: '8px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={async () => {
                        if (!correction.trim()) return;
                        await fetch('http://localhost:8000/api/chat/correct', {
                          method: 'POST',
                          headers: { 'X-Ami-Password': 'charlie', 'Content-Type': 'application/json' },
                          body: JSON.stringify({ wrong: correcting, right: correction })
                        });
                        setCorrecting(null); setCorrection('');
                        setMessages(prev => [...prev, { role: 'ami', text: 'Noted, bo - a done save di correct one.' }]);
                      }}
                      style={{ flex: 1, padding: '12px', minHeight: '46px', background: '#10b981',
                               color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px',
                               fontWeight: 600, cursor: 'pointer' }}>
                Save it
              </button>
              <button onClick={() => setCorrecting(null)}
                      style={{ padding: '12px 18px', minHeight: '46px', background: '#2a2a2a',
                               color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px',
                               cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

""" + o3
if o3 in s and 'What should she have said?' not in s:
    s = s.replace(o3, n3, 1); note(True, 'correction box')

open(p, 'w').write(s)

print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:300]))
