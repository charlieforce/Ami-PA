#!/usr/bin/env python3
"""Batch 8: show uploaded photos, tailor measurement sheets, richer plan rows,
start-and-end drawings, and Ami keeping Aminata's facts fixed.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch8.py
"""
import os, sqlite3, subprocess, sys
SRC, FE = 'app.py', 'frontend/src'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

# ---------------------------------------------------------------- database ---
db = sqlite3.connect('data/ami_memory.db')
try:
    db.execute("""CREATE TABLE IF NOT EXISTS tailor_measurements (
        id INTEGER PRIMARY KEY, region TEXT NOT NULL, taken_on DATE, tailor TEXT, notes TEXT,
        shoulder REAL, chest REAL, tummy REAL, waist REAL, hips REAL, thigh REAL, knee REAL,
        trouser_length REAL, top_length REAL, sleeve_length REAL, sleeve_round REAL, neck REAL,
        units TEXT DEFAULT 'in', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
except Exception:
    pass
db.commit(); db.close()
note(True, 'tailor table')

# ---------------------------------------------------------------- backend ---
src = open(SRC).read()
anchor = '@app.get("/api/report")'

# 1. the photo route accepts the password in the address, since an <img> cannot send a header
o = '''@app.get("/api/fitness/exercises/<int:ex_id>/photo")
@require_password
def exercise_photo(ex_id):'''
n = '''@app.get("/api/fitness/exercises/<int:ex_id>/photo")
def exercise_photo(ex_id):
    # an <img> tag cannot send a header, so the password comes in the address here
    import os as _osx
    if (request.args.get('k') or request.headers.get('X-Ami-Password')) != _osx.getenv('AMI_PASSWORD', 'charlie'):
        return {"error": "no"}, 401'''
note(o in src, 'photo auth'); src = src.replace(o, n, 1)

# 2. tailor measurement sheets
if '/api/medical/tailor' not in src:
    EP = '''_TAILOR_FIELDS = ['shoulder', 'chest', 'tummy', 'waist', 'hips', 'thigh', 'knee',
                  'trouser_length', 'top_length', 'sleeve_length', 'sleeve_round', 'neck']


@app.get("/api/medical/tailor")
@require_password
def list_tailor():
    try:
        rows = db.query("SELECT * FROM tailor_measurements ORDER BY taken_on DESC, id DESC") or []
        return {"status": "success", "sheets": rows}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/medical/tailor")
@require_password
def add_tailor():
    """A full set of tailor's measurements, kept per country - they measure differently."""
    try:
        from datetime import datetime as _d
        d = request.get_json() or {}
        if not (d.get('region') or '').strip():
            return {"error": "Which country?"}, 400
        cm = str(d.get('units') or 'in').lower().startswith('cm')
        vals = []
        for f in _TAILOR_FIELDS:
            v = d.get(f)
            if v in (None, ''):
                vals.append(None)
                continue
            v = float(v)
            vals.append(round(v / 2.54, 1) if cm else v)
        if d.get('id'):
            sets = ", ".join(c + " = ?" for c in ['region', 'taken_on', 'tailor', 'notes'] + _TAILOR_FIELDS)
            db.execute("UPDATE tailor_measurements SET " + sets + " WHERE id = ?",
                       tuple([d['region'].strip(), d.get('taken_on'), d.get('tailor'), d.get('notes')]
                             + vals + [d['id']]))
            return {"status": "success", "id": d['id']}
        tid = db.execute("INSERT INTO tailor_measurements (region, taken_on, tailor, notes, units, " +
                         ", ".join(_TAILOR_FIELDS) + ") VALUES (?,?,?,?,'in'," +
                         ",".join("?" for _ in _TAILOR_FIELDS) + ")",
                         tuple([d['region'].strip(), d.get('taken_on') or _d.now().strftime('%Y-%m-%d'),
                                d.get('tailor'), d.get('notes')] + vals))
        return {"status": "success", "id": tid}
    except Exception as e:
        return {"error": str(e)}, 400


@app.delete("/api/medical/tailor/<int:tid>")
@require_password
def delete_tailor(tid):
    try:
        db.execute("DELETE FROM tailor_measurements WHERE id = ?", (tid,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    src = src.replace(anchor, EP + anchor, 1); note(True, 'tailor endpoints')

# 3. Ami gets the tailor sheets, and keeps Aminata's facts fixed
o = """            if _sz:
                context += ("\\nHis sizes: " """
n = """            _tl = db.query(\"\"\"SELECT * FROM tailor_measurements ORDER BY taken_on DESC\"\"\") or []
            if _tl:
                _names = {'shoulder': 'shoulder to shoulder', 'chest': 'chest', 'tummy': 'tummy',
                          'waist': 'waist', 'hips': 'hips', 'thigh': 'thigh', 'knee': 'knee',
                          'trouser_length': 'trouser length', 'top_length': 'top length',
                          'sleeve_length': 'sleeve length', 'sleeve_round': 'round sleeve',
                          'neck': 'round neck'}
                for _t0 in _tl[:3]:
                    _parts = [_names[k] + " " + str(_t0[k]) for k in _names if _t0.get(k) is not None]
                    if _parts:
                        context += ("\\nTailor measurements, " + str(_t0['region']) + " (" +
                                    str(_t0.get('taken_on') or '')[:10] + ", inches): " + ", ".join(_parts))
                context += ("\\nIf a tailor asks, read these out plainly in inches. Use the set for that "
                            "country if he has one - they measure differently.")

            if _sz:
                context += ("\\nHis sizes: " """
note(o in src, 'tailor in context'); src = src.replace(o, n, 1)

o = "Talk about people the way a friend would"
n = ("When you describe someone, the FACTS stay the same every time - their work, their family, what they "
     "are like. Only the telling changes. Never drop a detail you gave before or invent a new one.\\n"
     "Talk about people the way a friend would")
note(o in src, 'fixed facts rule'); src = src.replace(o, n, 1)

open(SRC, 'w').write(src)

# ---------------------------------------------------------------- frontend ---
# 4. plan rows carry the photo, how-to and video
p = os.path.join(FE, 'components/FitnessTab.jsx')
s = open(p).read()

o = """                      <div key={it.id} style={{ ...S.card, display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Figure kind={it.drawing} size={34} exId={it.exercise_id}
                                hasPhoto={(ex.find(e => e.id === it.exercise_id) || {}).has_photo} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>{it.name}</div>
                          {it.note && <div style={{ fontSize: '11px', color: '#888' }}>{it.note}</div>}
                        </div>"""
n = """                      <div key={it.id} style={{ ...S.card, display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Figure kind={it.drawing} size={44} exId={it.exercise_id}
                                hasPhoto={(ex.find(e => e.id === it.exercise_id) || {}).has_photo} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>{it.name}</div>
                          {it.note && <div style={{ fontSize: '11px', color: '#888' }}>{it.note}</div>}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '3px' }}>
                            <button onClick={() => setOpen(open === 'p' + it.id ? null : 'p' + it.id)}
                                    style={{ background: 'none', border: 'none', color: '#667eea',
                                             fontSize: '11px', cursor: 'pointer', padding: 0 }}>
                              {open === 'p' + it.id ? 'hide' : 'how to'}
                            </button>
                            <a href={'https://www.youtube.com/results?search_query=' + encodeURIComponent('how to ' + it.name + ' proper form')}
                               target="_blank" rel="noreferrer"
                               style={{ color: '#667eea', fontSize: '11px', textDecoration: 'none' }}>▶ watch</a>
                          </div>
                          {open === 'p' + it.id && it.how_to && (
                            <div style={{ fontSize: '12px', color: '#bbb', lineHeight: 1.5, marginTop: '6px' }}>
                              {it.how_to}
                            </div>
                          )}
                        </div>"""
note(o in s, 'plan rows richer'); s = s.replace(o, n, 1)

# bigger figures in the library so a photo is actually legible
o = "          <Figure kind={x.drawing} exId={x.id} hasPhoto={x.has_photo} />"
n = "          <Figure kind={x.drawing} size={72} exId={x.id} hasPhoto={x.has_photo} />"
note(o in s, 'bigger library figure'); s = s.replace(o, n, 1)

# start-and-end drawings for the movements where it matters
o = "    press: <>"
n = """    pushdown: <><g opacity="0.45">{head(14, 14)}{P("M14 18v14")}{P("M14 20l7 4")}{bar(18, 24, 26)}</g>
      {head(30, 14)}{P("M30 18v14")}{P("M30 20l6 10")}{bar(33, 30, 41)}
      <text x="12" y="45" fontSize="7" fill="#5a6180">start</text>
      <text x="28" y="45" fontSize="7" fill="#5a6180">end</text></>,
    press: <>"""
note(o in s, 'start-end drawing'); s = s.replace(o, n, 1)
open(p, 'w').write(s)

# 5. tailor sheet in Health -> Body
p = os.path.join(FE, 'components/MedicalTab.jsx')
s = open(p).read()

o = "  const [sizeForm, setSizeForm] = useState(null);"
n = o + "\n  const [tailor, setTailor] = useState([]);\n  const [tailorForm, setTailorForm] = useState(null);"
note(o in s, 'tailor state'); s = s.replace(o, n, 1)

o = """        const sz = await fetch(API + '/api/medical/sizes', { headers: AUTH }).then(x => x.json());
        setSizes(sz.sizes || {});"""
n = o + """
        const tl = await fetch(API + '/api/medical/tailor', { headers: AUTH }).then(x => x.json());
        setTailor(tl.sheets || []);"""
note(o in s, 'tailor load'); s = s.replace(o, n, 1)

o = """                <button style={S.btn('#2a2a2a')} onClick={() => setSizeForm({ region: 'Nigeria', kind: 'Shirt' })}>
                  + Size
                </button>"""
n = o + """
                <button style={S.btn('#2a2a2a')} onClick={() => setTailorForm({ region: 'Nigeria', units: 'in', taken_on: today() })}>
                  + Tailor
                </button>"""
note(o in s, 'tailor button'); s = s.replace(o, n, 1)

TAILOR = """            {tailorForm && (() => {
              const T = [['shoulder', 'Shoulder to shoulder'], ['chest', 'Chest circumference'],
                         ['tummy', 'Tummy circumference'], ['waist', 'Waist circumference'],
                         ['hips', 'Hip circumference'], ['thigh', 'Thigh circumference'],
                         ['knee', 'Knee circumference'], ['trouser_length', 'Trouser length'],
                         ['top_length', 'Top length'], ['sleeve_length', 'Sleeve length'],
                         ['sleeve_round', 'Round sleeve / bicep'], ['neck', 'Round neck']];
              return (
                <div style={S.card}>
                  <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '8px' }}>
                    A full set from a tailor. Kept per country - they measure differently.
                  </div>
                  <div style={S.row2}>
                    <input style={S.input} placeholder="Country (Nigeria, Kenya...)"
                           value={tailorForm.region || ''} onChange={e => setTailorForm({ ...tailorForm, region: e.target.value })} />
                    <select style={S.input} value={tailorForm.units || 'in'}
                            onChange={e => setTailorForm({ ...tailorForm, units: e.target.value })}>
                      <option value="in">Inches</option>
                      <option value="cm">Centimetres</option>
                    </select>
                  </div>
                  <div style={S.row2}>
                    <input style={S.input} type="date" value={tailorForm.taken_on || today()}
                           onChange={e => setTailorForm({ ...tailorForm, taken_on: e.target.value })} />
                    <input style={S.input} placeholder="Tailor's name (optional)"
                           value={tailorForm.tailor || ''} onChange={e => setTailorForm({ ...tailorForm, tailor: e.target.value })} />
                  </div>
                  {T.map(([k, lbl]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ flex: 1, fontSize: '13px', color: '#ccc' }}>{lbl}</span>
                      <input style={{ ...S.input, width: '90px', marginBottom: 0 }} type="number" step="0.25"
                             value={tailorForm[k] || ''} onChange={e => setTailorForm({ ...tailorForm, [k]: e.target.value })} />
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button style={S.btn('#10b981')} onClick={async () => {
                      await fetch(API + '/api/medical/tailor', { method: 'POST', headers: H, body: JSON.stringify(tailorForm) });
                      setTailorForm(null); load();
                    }}>Save</button>
                    <button style={S.btn('#2a2a2a')} onClick={() => setTailorForm(null)}>Cancel</button>
                  </div>
                </div>
              );
            })()}

            {tailor.length > 0 && (
              <>
                <div style={S.label}>Tailor measurements</div>
                {tailor.map(t => {
                  const T = [['shoulder', 'Shoulder to shoulder'], ['chest', 'Chest'], ['tummy', 'Tummy'],
                             ['waist', 'Waist'], ['hips', 'Hips'], ['thigh', 'Thigh'], ['knee', 'Knee'],
                             ['trouser_length', 'Trouser length'], ['top_length', 'Top length'],
                             ['sleeve_length', 'Sleeve length'], ['sleeve_round', 'Round sleeve'], ['neck', 'Round neck']];
                  return (
                    <div key={t.id} style={S.card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#667eea' }}>
                          {t.region}
                          <span style={{ color: '#888', fontWeight: 400, fontSize: '11px' }}>
                            {' '}{String(t.taken_on || '').slice(0, 10)}{t.tailor ? ' · ' + t.tailor : ''}
                          </span>
                        </div>
                        <span style={{ display: 'flex', gap: '4px' }}>
                          <button style={S.icon} onClick={() => setTailorForm({ ...t, units: 'in' })}>✎</button>
                          <button style={S.icon} onClick={() => del('/api/medical/tailor/' + t.id, 'sheet')}>✕</button>
                        </span>
                      </div>
                      <div style={{ marginTop: '8px' }}>
                        {T.filter(([k]) => t[k] != null).map(([k, lbl]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between',
                                                fontSize: '13px', padding: '3px 0', borderTop: '1px solid #222' }}>
                            <span style={{ color: '#bbb' }}>{lbl}</span>
                            <strong>{t[k]}"</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

"""
o = "            {Object.keys(sizes).length > 0 && ("
note(o in s, 'tailor view'); s = s.replace(o, TAILOR + o, 1)
open(p, 'w').write(s)

print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:300]))
