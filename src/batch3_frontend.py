#!/usr/bin/env python3
"""Batch 3 frontend: wire up Fitness, fix the Body tab, visit uploads, overview periods.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch3_frontend.py
(FitnessTab.jsx must already be in frontend/src/components/)
"""
import os
FE = 'frontend/src'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

# ---- 1. Fitness tab into the app -------------------------------------------
p = os.path.join(FE, 'pages/Dashboard.jsx')
s = open(p).read()
if "import FitnessTab" not in s:
    parts = s.split('\n')
    last = max(i for i, l in enumerate(parts[:40]) if l.startswith('import '))
    parts.insert(last + 1, "import FitnessTab from '../components/FitnessTab';")
    s = '\n'.join(parts)
    note(True, 'fitness import')

o = """            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('medical')}>"""
n = """            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('fitness')}>
              <div style={{fontSize: '28px', marginBottom: '6px'}}>\U0001F4AA</div>
              <div style={{fontWeight: 'bold', color: '#1a1a1a'}}>Fitness</div>
              <div style={{fontSize: '12px', color: '#666'}}>Plan, exercises, progress</div>
            </div>

""" + o
if o in s and "setActiveTab('fitness')" not in s:
    s = s.replace(o, n, 1); note(True, 'fitness tile')

o2 = "      {activeTab === 'medical' && <MedicalTab />}"
if o2 in s and "activeTab === 'fitness'" not in s:
    s = s.replace(o2, "      {activeTab === 'fitness' && <FitnessTab />}\n" + o2, 1)
    note(True, 'fitness route')
open(p, 'w').write(s)

# ---- 2. MedicalTab: body tab name clash, new fields, edit, uploads, periods --
p = os.path.join(FE, 'components/MedicalTab.jsx')
s = open(p).read()

# the Water tab and the Body tab both answered to 'body' - rename the water one
o = "<button style={S.tab(view === 'body')} onClick={() => { setView('body'); setAdding(false); }}>Water & moving</button>"
if o in s:
    s = s.replace(o, "<button style={S.tab(view === 'water')} onClick={() => { setView('water'); setAdding(false); }}>Water & moving</button>", 1)
    note(True, 'water tab renamed')
o = "      {view === 'body' && (\n        <>\n          <div style={S.card}>\n            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>"
if o in s:
    s = s.replace(o, o.replace("view === 'body'", "view === 'water'"), 1)
    note(True, 'water view renamed')

# assessment form: the fields he asked for
o = """                <div style={S.row2}>
                  {F.map(([k, lbl]) => (
                    <input key={k} style={S.input} type="number" step="0.1" placeholder={lbl}
                           value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                  ))}
                </div>"""
n = """                <div style={S.row2}>
                  {F.map(([k, lbl]) => (
                    <input key={k} style={S.input} type="number" step="0.1" placeholder={lbl}
                           value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })} />
                  ))}
                </div>
                <div style={{ ...S.label, marginTop: '10px' }}>Strength and endurance</div>
                <div style={S.row2}>
                  <input style={S.input} type="number" placeholder="Plank hold (seconds)"
                         value={form.plank_secs || ''} onChange={e => setForm({ ...form, plank_secs: e.target.value })} />
                  <input style={S.input} type="number" placeholder="Push-ups in 1 min"
                         value={form.pushups_1min || ''} onChange={e => setForm({ ...form, pushups_1min: e.target.value })} />
                </div>
                <div style={S.row2}>
                  <input style={S.input} type="number" placeholder="Squats in 1 min"
                         value={form.squats_1min || ''} onChange={e => setForm({ ...form, squats_1min: e.target.value })} />
                  <input style={S.input} type="number" placeholder="Sit-ups in 1 min"
                         value={form.situps_1min || ''} onChange={e => setForm({ ...form, situps_1min: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                  <input style={S.input} placeholder="Cardio (run, swim, row)"
                         value={form.cardio_activity || ''} onChange={e => setForm({ ...form, cardio_activity: e.target.value })} />
                  <input style={S.input} placeholder="Distance"
                         value={form.cardio_distance || ''} onChange={e => setForm({ ...form, cardio_distance: e.target.value })} />
                  <input style={S.input} placeholder="Time"
                         value={form.cardio_time || ''} onChange={e => setForm({ ...form, cardio_time: e.target.value })} />
                </div>
                <div style={S.row2}>
                  <input style={S.input} type="number" step="0.5" placeholder="Sleep, hours a night"
                         value={form.sleep_hours || ''} onChange={e => setForm({ ...form, sleep_hours: e.target.value })} />
                  <input style={S.input} placeholder="Any health concerns?"
                         value={form.concerns || ''} onChange={e => setForm({ ...form, concerns: e.target.value })} />
                </div>
                <textarea style={{ ...S.input, minHeight: '60px' }} placeholder="Notes"
                          value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />"""
note(o in s, 'assessment fields'); s = s.replace(o, n, 1)

# show the new values on each assessment card, and an edit button
o = """        const F = [['weight_lbs', 'Weight', 'lb'], ['body_fat', 'Body fat', '%'], ['height_in', 'Height', 'in'],"""
n = """        const F = [['weight_lbs', 'Weight', 'lb'], ['body_fat', 'Body fat', '%'], ['height_in', 'Height', 'in'],
                   ['glutes_in', 'Glutes', 'in'], ['lower_belly_in', 'Lower belly', 'in'],
                   ['plank_secs', 'Plank', 's'], ['pushups_1min', 'Push-ups', ''],
                   ['squats_1min', 'Squats', ''], ['situps_1min', 'Sit-ups', ''],
                   ['sleep_hours', 'Sleep', 'h'],"""
note(o in s, 'assessment display fields'); s = s.replace(o, n, 1)

o = """                  <button style={S.icon} onClick={() => del('/api/medical/measurements/' + m.id, 'assessment')}>✕</button>"""
n = """                  <span style={{ display: 'flex', gap: '4px' }}>
                    <button style={S.icon} title="Edit" onClick={() => { setForm({ ...m, units: 'in' }); setAdding(true); }}>✎</button>
                    <button style={S.icon} onClick={() => del('/api/medical/measurements/' + m.id, 'assessment')}>✕</button>
                  </span>"""
note(o in s, 'assessment edit'); s = s.replace(o, n, 1)

o = """                {m.notes && <div style={{ fontSize: '12px', color: '#aaa', marginTop: '8px' }}>{m.notes}</div>}"""
n = """                {(m.cardio_activity || m.concerns || m.notes) && (
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: '10px', lineHeight: 1.6 }}>
                    {m.cardio_activity && <div>Cardio: {m.cardio_activity} {m.cardio_distance} {m.cardio_time ? 'in ' + m.cardio_time : ''}</div>}
                    {m.concerns && <div style={{ color: '#f59e0b' }}>Concerns: {m.concerns}</div>}
                    {m.notes && <div>{m.notes}</div>}
                  </div>
                )}"""
note(o in s, 'assessment extras shown'); s = s.replace(o, n, 1)

# visits: make the attach button obvious and show what is attached
o = """              <label style={{ fontSize: '12px', color: '#667eea', cursor: 'pointer',
                              display: 'inline-block', marginTop: '10px' }}>
                + Attach a scan or letter"""
n = """              <label style={{ fontSize: '12px', color: '#fff', cursor: 'pointer', background: '#2a2a2a',
                              display: 'inline-block', marginTop: '10px', padding: '8px 12px',
                              borderRadius: '6px', fontWeight: 600 }}>
                + Attach a PDF, scan or photo"""
note(o in s, 'visit upload button'); s = s.replace(o, n, 1)

open(p, 'w').write(s)

# ---- 3. Overview: period switch --------------------------------------------
p = os.path.join(FE, 'components/MedicalOverview.jsx')
s = open(p).read()
o = "  const [split, setSplit] = useState(false);"
n = o + "\n  const [period, setPeriod] = useState(90);"
note(o in s, 'overview period state'); s = s.replace(o, n, 1)

o = "  const ordered = [...readings].slice(0, 30).reverse();"
n = """  const cutoff = new Date(Date.now() - period * 86400000).toISOString().slice(0, 10);
  const inPeriod = readings.filter(r => String(r.taken_at || '').slice(0, 10) >= cutoff);
  const ordered = [...inPeriod].slice(0, 60).reverse();"""
note(o in s, 'overview period filter'); s = s.replace(o, n, 1)

o = """      <div style={S.grid}>"""
n = """      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', overflowX: 'auto' }}>
        {[[7, 'Week'], [30, 'Month'], [90, 'Quarter'], [365, 'Year'], [3650, 'All']].map(([d, l]) => (
          <button key={d} onClick={() => setPeriod(d)}
                  style={{ padding: '7px 12px', minHeight: '34px', borderRadius: '16px', cursor: 'pointer',
                           border: '1px solid ' + (period === d ? '#667eea' : '#2a2a2a'),
                           background: period === d ? '#667eea22' : '#1a1a1a',
                           color: period === d ? '#fff' : '#999', fontSize: '12px', fontWeight: 600 }}>
            {l}
          </button>
        ))}
      </div>

      <div style={S.grid}>"""
note(o in s, 'overview period chips'); s = s.replace(o, n, 1)

# counts follow the chosen period
o = "    const last = readings.slice(0, 30);"
n = "    const last = inPeriod;"
note(o in s, 'overview counts'); s = s.replace(o, n, 1)
open(p, 'w').write(s)

print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
