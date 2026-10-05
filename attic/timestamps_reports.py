#!/usr/bin/env python3
"""Chat timestamps, and reports built for the doctor you are actually seeing.

  1. every message remembers when it was said
  2. the chat shows Today / Yesterday / the date, and a time on each message
  3. report presets - tick what a given doctor needs, save it, reuse it

Run from  ~/Desktop/The Real Ami PA/src   with:  python3 timestamps_reports.py
"""
import os, re, sqlite3, subprocess, sys, tempfile

DB = 'data/ami_memory.db'
DASH = 'frontend/src/pages/Dashboard.jsx'
done, miss = [], []

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:180]

# ------------------------------------------------- 1. messages get a time
d = open(DASH).read()
before = d

# any object with role + text gets an "at"
d = re.sub(r"\{\s*role:\s*'user',\s*text:\s*([^}]+?)\s*\}",
           lambda m: "{ role: 'user', text: " + m.group(1).rstrip() + ", at: new Date().toISOString() }", d)
d = re.sub(r"\{\s*role:\s*'ami',\s*text:\s*([^}]+?)\s*\}",
           lambda m: "{ role: 'ami', text: " + m.group(1).rstrip() + ", at: new Date().toISOString() }", d)
d = d.replace(", at: new Date().toISOString(), at: new Date().toISOString() }",
              ", at: new Date().toISOString() }")
if d != before:
    done.append("messages carry a time")
else:
    miss.append("messages carry a time")

# history from the server keeps its own time
d = d.replace("role: m.role === 'user' ? 'user' : 'ami',",
              "role: m.role === 'user' ? 'user' : 'ami', at: m.created_at || m.timestamp,")
if "at: m.created_at" in d:
    done.append("history keeps its time")

# --------------------------------------------- 2. day markers and clocks
o = """{messages.map((msg, idx) => (
                  <div key={idx} className={`message ${msg.role}`}>"""
n = """{messages.map((msg, idx) => {
                  const thisDay = dayLabel(msg.at);
                  const lastDay = idx > 0 ? dayLabel(messages[idx - 1].at) : null;
                  const showDay = thisDay && thisDay !== lastDay;
                  return (
                  <React.Fragment key={idx}>
                  {showDay && (
                    <div style={{ textAlign: 'center', margin: '14px 0 8px', fontSize: '11px',
                                  color: '#6b6b7c', letterSpacing: '0.4px' }}>
                      <span style={{ background: '#1d1d26', padding: '4px 12px', borderRadius: '11px' }}>
                        {thisDay}
                      </span>
                    </div>
                  )}
                  <div className={`message ${msg.role}`} title={msg.at ? clockTime(msg.at) : ''}>"""
if o in d and 'showDay' not in d:
    d = d.replace(o, n, 1)
    # close the fragment where the map closed
    m = re.search(r"\n(\s*)\)\)\}\s*\n(\s*)<div ref=\{messagesEndRef\}", d)
    if not m:
        m = re.search(r"\n(\s*)\)\)\}", d[d.find('showDay'):])
        if m:
            at = d.find('showDay') + m.start()
            d = d[:at] + "\n" + m.group(1) + "  </React.Fragment>\n" + m.group(1) + "  );\n" + m.group(1) + "})}" + d[at + len(m.group(0)):]
            done.append("day markers (check the close tag)")
    else:
        d = (d[:m.start()] + "\n" + m.group(1) + "</React.Fragment>\n" + m.group(1) + ");\n" +
             m.group(1) + "})}\n" + m.group(2) + "<div ref={messagesEndRef}" + d[m.end():])
        done.append("day markers in the chat")
else:
    miss.append("day markers")

# a quiet time under each of her replies
o2 = """                      {msg.role === 'ami' && msg.text && msg.text.length > 20 && !correctedMsgs.includes(msg.text) && ("""
n2 = """                      {msg.at && (
                        <span style={{ fontSize: '10px', color: '#5a5a6b', marginLeft: '8px' }}>
                          {clockTime(msg.at)}
                        </span>
                      )}
                      {msg.role === 'ami' && msg.text && msg.text.length > 20 && !correctedMsgs.includes(msg.text) && ("""
if o2 in d:
    d = d.replace(o2, n2, 1); done.append("a time on each message")
else:
    miss.append("a time on each message")

open(DASH, 'w').write(d)

# ------------------------------------------- 3. what this doctor needs
db = sqlite3.connect(DB)
db.execute("""CREATE TABLE IF NOT EXISTS report_presets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE,
                sections TEXT,
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
for nm, sec, note in (
    ("Everything", "bp,lipids,sugar,meds,conditions,allergies,visits,measurements,weight,exercise,water", "the full picture"),
    ("Blood pressure doctor", "bp,lipids,sugar,meds,conditions,allergies,visits", "heart and pressure - no knee"),
    ("Knee / orthopaedic", "conditions,measurements,exercise,visits,meds,allergies", "the injury and how you move"),
    ("New doctor, first visit", "conditions,meds,allergies,bp,lipids,visits", "the basics anyone would ask for"),
):
    db.execute("INSERT OR IGNORE INTO report_presets (name, sections, note) VALUES (?,?,?)", (nm, sec, note))
db.commit(); db.close()
done.append("report presets seeded")

s = open('app.py').read()
if '/api/medical/report/presets' not in s:
    EP = '''@app.get("/api/medical/report/presets")
@require_password
def report_presets():
    """The tick-lists he has saved for different doctors."""
    try:
        return {"status": "success",
                "presets": db.query("SELECT * FROM report_presets ORDER BY id") or []}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/medical/report/presets")
@require_password
def save_report_preset():
    """Save or update one - name it after the doctor or the reason."""
    try:
        d = request.get_json() or {}
        nm = (d.get('name') or '').strip()
        if not nm:
            return {"error": "needs a name"}, 400
        secs = d.get('sections')
        if isinstance(secs, list):
            secs = ",".join(secs)
        if db.query("SELECT id FROM report_presets WHERE name = ?", (nm,)):
            db.execute("UPDATE report_presets SET sections = ?, note = ? WHERE name = ?",
                       (secs, d.get('note'), nm))
        else:
            db.execute("INSERT INTO report_presets (name, sections, note) VALUES (?,?,?)",
                       (nm, secs, d.get('note')))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.delete("/api/medical/report/presets/<int:pid>")
@require_password
def delete_report_preset(pid):
    try:
        db.execute("DELETE FROM report_presets WHERE id = ?", (pid,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    t = s.replace('@app.get("/api/medical/report")', EP + '@app.get("/api/medical/report")', 1)
    good, err = ok(t)
    if good:
        s = t; done.append("preset endpoints")
    else:
        miss.append("preset endpoints: " + err[:70])

open('app.py', 'w').write(s)

print("DONE (" + str(len(done)) + "):")
for x in done: print("  - " + x)
if miss:
    print("SKIPPED (" + str(len(miss)) + "):")
    for x in miss: print("  - " + x)
good, err = ok(open('app.py').read())
print("\napp.py compiles: " + ("YES" if good else "NO - " + err))
