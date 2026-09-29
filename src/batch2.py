#!/usr/bin/env python3
"""Batch 2: medication times, body measurements, garment sizes, meeting nudges.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch2.py
"""
import os, sqlite3, subprocess, sys

SRC, FE = 'app.py', 'frontend/src'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

# ---------------------------------------------------------------- database ---
db = sqlite3.connect('data/ami_memory.db')
for sql in [
    "ALTER TABLE medications ADD COLUMN times TEXT",
    """CREATE TABLE IF NOT EXISTS body_measurements (
        id INTEGER PRIMARY KEY, taken_on DATE NOT NULL, place TEXT, notes TEXT,
        weight_lbs REAL, height_in REAL, body_fat REAL,
        chest_in REAL, waist_in REAL, hips_in REAL,
        bicep_l_in REAL, bicep_r_in REAL, thigh_l_in REAL, thigh_r_in REAL,
        neck_in REAL, shoulders_in REAL, calf_in REAL, forearm_in REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""",
    """CREATE TABLE IF NOT EXISTS garment_sizes (
        id INTEGER PRIMARY KEY, region TEXT NOT NULL, kind TEXT NOT NULL,
        label TEXT, value TEXT, notes TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(region, kind, label))""",
    """CREATE TABLE IF NOT EXISTS meeting_alerts (
        id INTEGER PRIMARY KEY, event_key TEXT NOT NULL, kind TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(event_key, kind))""",
]:
    try: db.execute(sql)
    except Exception as e: print("db note:", str(e)[:60])
db.commit(); db.close()
note(True, 'db tables')

# ---------------------------------------------------------------- backend ---
src = open(SRC).read()
anchor = '@app.get("/api/report")'

# 1. medications carry their own times
o = """                            (name, generic_name, dose, frequency, timing, what_for,
                             prescribed_by, started_on, notes)
                            VALUES (?,?,?,?,?,?,?,?,?)\"\"\",
                         (d.get('name'), d.get('generic_name'), d.get('dose'),
                          d.get('frequency'), d.get('timing'), d.get('what_for'),
                          d.get('prescribed_by'), d.get('started_on'), d.get('notes')))"""
n = """                            (name, generic_name, dose, frequency, timing, times, what_for,
                             prescribed_by, started_on, notes)
                            VALUES (?,?,?,?,?,?,?,?,?,?)\"\"\",
                         (d.get('name'), d.get('generic_name'), d.get('dose'),
                          d.get('frequency'), d.get('timing'), d.get('times'), d.get('what_for'),
                          d.get('prescribed_by'), d.get('started_on'), d.get('notes')))"""
note(o in src, 'medication insert'); src = src.replace(o, n, 1)

o = """        fields = ['name', 'generic_name', 'dose', 'frequency', 'timing', 'what_for',
                  'prescribed_by', 'started_on', 'stopped_on', 'notes']"""
n = """        fields = ['name', 'generic_name', 'dose', 'frequency', 'timing', 'times', 'what_for',
                  'prescribed_by', 'started_on', 'stopped_on', 'notes']"""
note(o in src, 'medication update'); src = src.replace(o, n, 1)

# nudge at each medication's own time
if 'def medication_time_nudge' not in src:
    a2 = "def fire_due_reminders():"
    FN = '''def medication_time_nudge():
    """Runs every 5 minutes: nudge for any dose whose time has just come."""
    try:
        from datetime import datetime as _d
        if in_dnd():
            return
        now = _charlie_now().replace(tzinfo=None)
        today = now.strftime('%Y-%m-%d')
        meds = db.query("""SELECT id, name, dose, frequency, times FROM medications
                           WHERE stopped_on IS NULL AND times IS NOT NULL AND TRIM(times) != ''""") or []
        taken = {(t['medication_id'], t['slot']) for t in
                 (db.query("SELECT medication_id, slot FROM medication_log WHERE taken_on = ?", (today,)) or [])}
        due = []
        for m in meds:
            slots = [x.strip() for x in (m.get('times') or '').split(',') if x.strip()]
            for idx, hhmm in enumerate(slots):
                try:
                    t = _d.strptime(hhmm[:5], '%H:%M')
                except Exception:
                    continue
                mins = (now.hour * 60 + now.minute) - (t.hour * 60 + t.minute)
                if not (0 <= mins <= 30):
                    continue
                slot = 'morning' if len(slots) == 1 else ('morning' if idx == 0 else
                        'evening' if idx == len(slots) - 1 else 'midday')
                if (m['id'], slot) in taken:
                    continue
                if db.query("""SELECT id FROM medication_log WHERE medication_id = ? AND slot = ?
                               AND taken_on = ?""", (m['id'], slot, today)):
                    continue
                if db.query("""SELECT id FROM meeting_alerts WHERE event_key = ? AND kind = 'med'""",
                            (str(m['id']) + '|' + slot + '|' + today,)):
                    continue
                db.execute("INSERT OR IGNORE INTO meeting_alerts (event_key, kind) VALUES (?, 'med')",
                           (str(m['id']) + '|' + slot + '|' + today,))
                due.append(m['name'] + ((" " + m['dose']) if m.get('dose') else ""))
        if due:
            msg = "\\U0001F48A " + ("Time for " + due[0] + "." if len(due) == 1
                                    else "Time for: " + ", ".join(due) + ".")
            db.execute("INSERT INTO conversations (user_message, ami_response) VALUES (?, ?)", ("", msg))
            print("medication nudge sent: " + str(len(due)))
    except Exception as e:
        print("medication time nudge error: " + str(e))


'''
    src = src.replace(a2, FN + a2, 1); note(True, 'medication time nudge')

# 2. meetings: 24 hours before, and 15 minutes before
if 'def meeting_nudges' not in src:
    a2 = "def fire_due_reminders():"
    FN = '''def meeting_nudges():
    """A word the day before a meeting, and again 15 minutes out."""
    try:
        import re as _r
        from datetime import datetime as _d, timedelta as _td
        if in_dnd():
            return
        cal = str(get_calendar_for_ami() or '')
        now = _charlie_now().replace(tzinfo=None)
        soon, tomorrow = [], []
        for line in cal.split('\\n'):
            m = _r.search(r'(\\d{4}-\\d{2}-\\d{2})T(\\d{2}):(\\d{2})', line)
            if not m:
                continue
            title = _r.sub(r'\\s*-\\s*\\d{4}-\\d{2}-\\d{2}T.*$', '', line).strip('\\u2022 ').strip()
            if not title or 'birthday' in title.lower():
                continue
            try:
                when = _d.strptime(m.group(1) + ' ' + m.group(2) + ':' + m.group(3), '%Y-%m-%d %H:%M')
            except Exception:
                continue
            mins = (when - now).total_seconds() / 60.0
            key = m.group(0) + '|' + title[:40]
            if 0 < mins <= 20:
                kind = 'soon'
            elif 1380 < mins <= 1500:
                kind = 'day'
            else:
                continue
            if db.query("SELECT id FROM meeting_alerts WHERE event_key = ? AND kind = ?", (key, kind)):
                continue
            db.execute("INSERT OR IGNORE INTO meeting_alerts (event_key, kind) VALUES (?, ?)", (key, kind))
            (soon if kind == 'soon' else tomorrow).append(
                title + " at " + when.strftime('%-I:%M%p').lower())
        msgs = []
        if soon:
            msgs.append("\\U0001F514 " + ("; ".join(soon)) + " - starting soon.")
        if tomorrow:
            msgs.append("\\U0001F4C5 Tomorrow: " + "; ".join(tomorrow) + ".")
        for msg in msgs:
            db.execute("INSERT INTO conversations (user_message, ami_response) VALUES (?, ?)", ("", msg))
        if msgs:
            print("meeting nudges sent: " + str(len(msgs)))
    except Exception as e:
        print("meeting nudge error: " + str(e))


'''
    src = src.replace(a2, FN + a2, 1); note(True, 'meeting nudges')

o = "        scheduler.add_job(fire_due_reminders, 'interval', minutes=5, id='reminder_firer', replace_existing=True)"
n = o + """
        try:
            scheduler.add_job(lambda: medication_time_nudge(), 'interval', minutes=5,
                              id='med_times', replace_existing=True)
            scheduler.add_job(lambda: meeting_nudges(), 'interval', minutes=10,
                              id='meeting_nudges', replace_existing=True)
        except Exception as _mn2:
            print('nudges not scheduled: ' + str(_mn2))"""
note(o in src and "id='med_times'" not in src, 'nudges scheduled'); src = src.replace(o, n, 1)

# 3. measurements and sizes endpoints
if '/api/medical/measurements' not in src:
    EP = '''_MEAS_FIELDS = ['weight_lbs', 'height_in', 'body_fat', 'chest_in', 'waist_in', 'hips_in',
                'bicep_l_in', 'bicep_r_in', 'thigh_l_in', 'thigh_r_in', 'neck_in',
                'shoulders_in', 'calf_in', 'forearm_in']


@app.get("/api/medical/measurements")
@require_password
def list_measurements():
    """Assessments newest first, each with the change since the one before."""
    try:
        rows = db.query("SELECT * FROM body_measurements ORDER BY taken_on DESC, id DESC") or []
        for i, r in enumerate(rows):
            prev = rows[i + 1] if i + 1 < len(rows) else None
            r['change'] = {}
            if prev:
                for f in _MEAS_FIELDS:
                    if r.get(f) is not None and prev.get(f) is not None:
                        d = round(float(r[f]) - float(prev[f]), 1)
                        if d:
                            r['change'][f] = d
        return {"status": "success", "measurements": rows}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/medical/measurements")
@require_password
def add_measurement():
    """Values come in inches and pounds; centimetres and kilos are converted on the way in."""
    try:
        d = request.get_json() or {}
        cm = str(d.get('units') or 'in').lower().startswith('cm')
        vals = []
        for f in _MEAS_FIELDS:
            v = d.get(f)
            if v in (None, ''):
                vals.append(None)
                continue
            v = float(v)
            if cm and f.endswith('_in'):
                v = round(v / 2.54, 1)
            elif cm and f == 'weight_lbs':
                v = round(v * 2.20462, 1)
            vals.append(v)
        mid = db.execute("""INSERT INTO body_measurements
                            (taken_on, place, notes, """ + ", ".join(_MEAS_FIELDS) + """)
                            VALUES (?,?,?,""" + ",".join("?" for _ in _MEAS_FIELDS) + """)""",
                         tuple([d.get('taken_on'), d.get('place'), d.get('notes')] + vals))
        return {"status": "success", "id": mid}
    except Exception as e:
        return {"error": str(e)}, 400


@app.delete("/api/medical/measurements/<int:mid>")
@require_password
def delete_measurement(mid):
    try:
        db.execute("DELETE FROM body_measurements WHERE id = ?", (mid,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/medical/sizes")
@require_password
def list_sizes():
    try:
        rows = db.query("SELECT * FROM garment_sizes ORDER BY region, kind, label") or []
        out = {}
        for r in rows:
            out.setdefault(r['region'], []).append(r)
        return {"status": "success", "sizes": out}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/medical/sizes")
@require_password
def add_size():
    try:
        d = request.get_json() or {}
        if not (d.get('region') or '').strip() or not (d.get('kind') or '').strip():
            return {"error": "region and kind required"}, 400
        db.execute("""INSERT INTO garment_sizes (region, kind, label, value, notes, updated_at)
                      VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)
                      ON CONFLICT(region, kind, label) DO UPDATE SET
                        value = excluded.value, notes = excluded.notes, updated_at = CURRENT_TIMESTAMP""",
                   (d['region'].strip(), d['kind'].strip(), (d.get('label') or '').strip(),
                    (d.get('value') or '').strip(), d.get('notes')))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.delete("/api/medical/sizes/<int:sid>")
@require_password
def delete_size(sid):
    try:
        db.execute("DELETE FROM garment_sizes WHERE id = ?", (sid,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    src = src.replace(anchor, EP + anchor, 1); note(True, 'measurement + size endpoints')

# 4. Ami knows the latest measurements, his sizes, and today's meetings
o = """            if _bp:
                context += "\\nLast BP readings: " """
n = """            _ms = db.query(\"\"\"SELECT * FROM body_measurements ORDER BY taken_on DESC LIMIT 1\"\"\") or []
            if _ms:
                _m0 = _ms[0]
                _bits = []
                for _f, _lbl in [('weight_lbs', 'weight'), ('body_fat', 'body fat %'), ('chest_in', 'chest'),
                                 ('waist_in', 'waist'), ('bicep_r_in', 'bicep'), ('thigh_r_in', 'thigh')]:
                    if _m0.get(_f) is not None:
                        _bits.append(_lbl + " " + str(_m0[_f]) + ("lb" if _f == 'weight_lbs' else
                                     ("%" if _f == 'body_fat' else "in")))
                if _bits:
                    context += ("\\nLast body measurements (" + str(_m0.get('taken_on'))[:10] + "): " +
                                ", ".join(_bits) + ". Inches and pounds.")

            _sz = db.query("SELECT region, kind, label, value FROM garment_sizes ORDER BY region") or []
            if _sz:
                context += ("\\nHis sizes: " + "; ".join(
                    s['region'] + " " + s['kind'] + (" " + s['label'] if s.get('label') else "") +
                    ": " + str(s.get('value')) for s in _sz[:25]) +
                    ". If a tailor or someone asks for his measurements, give them straight.")

            if _bp:
                context += "\\nLast BP readings: " """
note(o in src, 'measurements in context'); src = src.replace(o, n, 1)

# today's meetings named in the morning briefing
o = ("\"THEN, in a short final paragraph, tell him what HIS day looks like - what is \"")
n = ("\"THEN, in a short final paragraph, tell him what HIS day looks like. Name every meeting today "
     "with its time, then what is \"")
note(o in src, 'meetings in briefing'); src = src.replace(o, n, 1)

open(SRC, 'w').write(src)

# ---------------------------------------------------------------- frontend ---
p = os.path.join(FE, 'components/MedicalTab.jsx')
s = open(p).read()

# medication form: times
o = """              <div style={S.row2}>
                <input style={S.input} placeholder="When (morning, with food)"
                       value={form.timing || ''} onChange={e => setForm({ ...form, timing: e.target.value })} />"""
n = """              <input style={S.input} placeholder="Times, 24h, comma separated - 08:00, 20:00"
                     value={form.times || ''} onChange={e => setForm({ ...form, times: e.target.value })} />
              <div style={S.row2}>
                <input style={S.input} placeholder="When (morning, with food)"
                       value={form.timing || ''} onChange={e => setForm({ ...form, timing: e.target.value })} />"""
note(o in s, 'medication times field'); s = s.replace(o, n, 1)

o = """                  {m.on_it_for && ("""
n = """                  {m.times && <div style={{ fontSize: '11px', color: '#a78bfa' }}>⏰ {m.times}</div>}
                  {m.on_it_for && ("""
note(o in s, 'medication times shown'); s = s.replace(o, n, 1)

# Body tab
o = """        <button style={S.tab(view === 'lipids')}"""
n = """        <button style={S.tab(view === 'body')} onClick={() => { setView('body'); setAdding(false); }}>Body</button>
        <button style={S.tab(view === 'lipids')}"""
note(o in s, 'body tab button'); s = s.replace(o, n, 1)

o = "  const [lipids, setLipids] = useState([]);"
n = (o + "\n  const [meas, setMeas] = useState([]);\n  const [sizes, setSizes] = useState({});"
       "\n  const [sizeForm, setSizeForm] = useState(null);")
note(o in s, 'body state'); s = s.replace(o, n, 1)

o = """        const lp = await fetch(API + '/api/medical/lipids', { headers: AUTH }).then(x => x.json());
        setLipids(lp.panels || []);"""
n = o + """
        const ms = await fetch(API + '/api/medical/measurements', { headers: AUTH }).then(x => x.json());
        setMeas(ms.measurements || []);
        const sz = await fetch(API + '/api/medical/sizes', { headers: AUTH }).then(x => x.json());
        setSizes(sz.sizes || {});"""
note(o in s, 'body load'); s = s.replace(o, n, 1)

MEAS = """      {view === 'body' && (() => {
        const F = [['weight_lbs', 'Weight', 'lb'], ['body_fat', 'Body fat', '%'], ['height_in', 'Height', 'in'],
                   ['neck_in', 'Neck', 'in'], ['shoulders_in', 'Shoulders', 'in'], ['chest_in', 'Chest', 'in'],
                   ['waist_in', 'Waist', 'in'], ['hips_in', 'Hips', 'in'],
                   ['bicep_l_in', 'Bicep L', 'in'], ['bicep_r_in', 'Bicep R', 'in'],
                   ['forearm_in', 'Forearm', 'in'], ['thigh_l_in', 'Thigh L', 'in'],
                   ['thigh_r_in', 'Thigh R', 'in'], ['calf_in', 'Calf', 'in']];
        const SIZE_KINDS = ['Shirt', 'Trouser', 'Suit', 'Kaftan/Agbada', 'Dress shoe', 'Trainers', 'Hat'];
        const REGIONS = ['Nigeria', 'Kenya', 'Sierra Leone', 'UK', 'US', 'EU'];
        return (
          <>
            {!adding && !sizeForm && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                <button style={S.btn('#667eea')} onClick={() => { setAdding(true); setForm({ units: 'in', taken_on: today() }); }}>
                  + Assessment
                </button>
                <button style={S.btn('#2a2a2a')} onClick={() => setSizeForm({ region: 'Nigeria', kind: 'Shirt' })}>
                  + Size
                </button>
              </div>
            )}

            {adding && (
              <div style={S.card}>
                <div style={S.row2}>
                  <input style={S.input} type="date" value={form.taken_on || today()}
                         onChange={e => setForm({ ...form, taken_on: e.target.value })} />
                  <select style={S.input} value={form.units || 'in'}
                          onChange={e => setForm({ ...form, units: e.target.value })}>
                    <option value="in">Inches / pounds</option>
                    <option value="cm">Centimetres / kilos</option>
                  </select>
                </div>
                <input style={S.input} placeholder="Where (gym, clinic)" value={form.place || ''}
                       onChange={e => setForm({ ...form, place: e.target.value })} />
                <div style={{ fontSize: '11px', color: '#888', margin: '4px 0 8px' }}>
                  Fill in only what they measured. Centimetres are converted to inches.
                </div>
                <div style={S.row2}>
                  {F.map(([k, lbl]) => (
                    <input key={k} style={S.input} type="number" step="0.1" placeholder={lbl}
                           value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={S.btn('#10b981')} onClick={() => post('/api/medical/measurements', form)}>Save</button>
                  <button style={S.btn('#2a2a2a')} onClick={() => { setAdding(false); setForm({}); }}>Cancel</button>
                </div>
              </div>
            )}

            {sizeForm && (
              <div style={S.card}>
                <div style={S.row2}>
                  <select style={S.input} value={sizeForm.region}
                          onChange={e => setSizeForm({ ...sizeForm, region: e.target.value })}>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select style={S.input} value={sizeForm.kind}
                          onChange={e => setSizeForm({ ...sizeForm, kind: e.target.value })}>
                    {SIZE_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div style={S.row2}>
                  <input style={S.input} placeholder="Part (sleeve, collar) - optional"
                         value={sizeForm.label || ''} onChange={e => setSizeForm({ ...sizeForm, label: e.target.value })} />
                  <input style={S.input} placeholder="Size (16.5, 42, UK 10)"
                         value={sizeForm.value || ''} onChange={e => setSizeForm({ ...sizeForm, value: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={S.btn('#10b981')} onClick={async () => {
                    await fetch(API + '/api/medical/sizes', { method: 'POST', headers: H, body: JSON.stringify(sizeForm) });
                    setSizeForm(null); load();
                  }}>Save</button>
                  <button style={S.btn('#2a2a2a')} onClick={() => setSizeForm(null)}>Cancel</button>
                </div>
              </div>
            )}

            {meas.map(m => (
              <div key={m.id} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>
                    {String(m.taken_on).slice(0, 10)}
                    {m.place ? <span style={{ color: '#888', fontWeight: 400 }}> · {m.place}</span> : null}
                  </div>
                  <button style={S.icon} onClick={() => del('/api/medical/measurements/' + m.id, 'assessment')}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '10px' }}>
                  {F.filter(([k]) => m[k] != null).map(([k, lbl, unit]) => {
                    const ch = (m.change || {})[k];
                    const down = ['weight_lbs', 'waist_in', 'body_fat', 'hips_in'].includes(k);
                    const good = ch == null ? null : (down ? ch < 0 : ch > 0);
                    return (
                      <div key={k}>
                        <div style={{ fontSize: '10px', color: '#888' }}>{lbl}</div>
                        <div style={{ fontSize: '15px', fontWeight: 700 }}>{m[k]}<span style={{ fontSize: '10px', color: '#888' }}>{unit}</span></div>
                        {ch != null && (
                          <div style={{ fontSize: '10px', color: good ? '#10b981' : '#f59e0b' }}>
                            {ch > 0 ? '+' : ''}{ch}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {m.notes && <div style={{ fontSize: '12px', color: '#aaa', marginTop: '8px' }}>{m.notes}</div>}
              </div>
            ))}

            {Object.keys(sizes).length > 0 && (
              <>
                <div style={S.label}>Sizes</div>
                {Object.keys(sizes).map(region => (
                  <div key={region} style={S.card}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#667eea', marginBottom: '6px' }}>{region}</div>
                    {sizes[region].map(z => (
                      <div key={z.id} style={{ display: 'flex', justifyContent: 'space-between',
                                               fontSize: '13px', padding: '4px 0' }}>
                        <span>{z.kind}{z.label ? ' · ' + z.label : ''}</span>
                        <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <strong>{z.value}</strong>
                          <button style={S.icon} onClick={() => del('/api/medical/sizes/' + z.id, 'size')}>✕</button>
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}

            {meas.length === 0 && !adding && (
              <div style={S.empty}>No assessments yet. Add one after your gym check.</div>
            )}
          </>
        );
      })()}

"""
o = "      {view === 'lipids' && ("
note(o in s, 'body view'); s = s.replace(o, MEAS + o, 1)
open(p, 'w').write(s)

# ---------------------------------------------------------------- report ---
print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:400]))
