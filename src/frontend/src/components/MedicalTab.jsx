import React, { useState, useEffect } from 'react';
import MedicalOverview from './MedicalOverview';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };
const AUTH = { 'X-Ami-Password': AMI_PASSWORD };

const S = {
  wrap: { padding: '12px', color: '#eee', maxWidth: '760px', margin: '0 auto' },
  tabs: { display: 'flex', gap: '6px', marginBottom: '16px', overflowX: 'auto' },
  tab: (on) => ({
    padding: '10px 14px', minHeight: '44px', borderRadius: '8px', border: 'none',
    background: on ? '#667eea' : '#2a2a2a', color: '#fff', fontSize: '13px',
    fontWeight: on ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
  }),
  card: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
    padding: '14px', marginBottom: '10px'
  },
  label: {
    fontSize: '11px', color: '#888', textTransform: 'uppercase',
    letterSpacing: '0.5px', marginTop: '16px', marginBottom: '6px', fontWeight: 700
  },
  input: {
    width: '100%', padding: '11px', fontSize: '16px', background: '#1a1a1a',
    color: '#eee', border: '1px solid #333', borderRadius: '8px',
    marginBottom: '8px', boxSizing: 'border-box'
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  btn: (bg) => ({
    padding: '12px', minHeight: '46px', background: bg, color: '#fff', border: 'none',
    borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%'
  }),
  icon: {
    background: 'none', border: 'none', color: '#777', cursor: 'pointer',
    fontSize: '15px', padding: '4px 8px'
  },
  big: { fontSize: '26px', fontWeight: 700, lineHeight: 1 },
  small: { fontSize: '11px', color: '#888', marginTop: '3px' },
  empty: { color: '#666', fontSize: '13px', padding: '16px 0', textAlign: 'center' },
  note: { fontSize: '11px', color: '#666', lineHeight: 1.6, marginTop: '14px' }
};

const today = () => new Date().toISOString().split('T')[0];
const nowTime = () => new Date().toTimeString().slice(0, 5);

const REPORT_BITS = [
  ['bp', 'Blood pressure'], ['lipids', 'Cholesterol'], ['sugar', 'Blood sugar'],
  ['meds', 'Medications'], ['conditions', 'Conditions'], ['allergies', 'Allergies'],
  ['visits', 'Visits'], ['measurements', 'Measurements'], ['weight', 'Weight'],
  ['exercise', 'Exercise'], ['water', 'Water'],
];

export default function MedicalTab() {
  const [view, setView] = useState('overview');
  const [reportOpen, setReportOpen] = useState(false);
  const [presets, setPresets] = useState([]);
  const [reportFor, setReportFor] = useState('');
  const [picked, setPicked] = useState([]);
  const [meds, setMeds] = useState([]);
  const [readings, setReadings] = useState([]);
  const [summary, setSummary] = useState({});
  const [conds, setConds] = useState([]);
  const [visits, setVisits] = useState([]);
  const [visitQ, setVisitQ] = useState('');
  const [visitShow, setVisitShow] = useState(12);
  const [allergies, setAllergies] = useState([]);
  const [doses, setDoses] = useState([]);
  const [sugars, setSugars] = useState([]);
  const [lipids, setLipids] = useState([]);
  const [meas, setMeas] = useState([]);
  const [sizes, setSizes] = useState({});
  const [sizeForm, setSizeForm] = useState(null);
  const [tailor, setTailor] = useState([]);
  const [tailorForm, setTailorForm] = useState(null);
  const [water, setWater] = useState({ today: 0, target: 2.7, week: [] });
  const [sessions, setSessions] = useState([]);
  const [exSummary, setExSummary] = useState({});
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({});

  const load = async () => {
    try {
      const [m, r, c, v, a] = await Promise.all([
        fetch(API + '/api/medical/medications', { headers: AUTH }).then(x => x.json()),
        fetch(API + '/api/medical/readings', { headers: AUTH }).then(x => x.json()),
        fetch(API + '/api/medical/conditions', { headers: AUTH }).then(x => x.json()),
        fetch(API + '/api/medical/visits', { headers: AUTH }).then(x => x.json()),
        fetch(API + '/api/medical/allergies', { headers: AUTH }).then(x => x.json())
      ]);
      setMeds(m.medications || []);
      setReadings(r.readings || []);
      setSummary(r.summary || {});
      setConds(c.conditions || []);
      setVisits(v.visits || []);
      setAllergies(a.allergies || []);
      try {
        const dz = await fetch(API + '/api/medical/due-today', { headers: AUTH }).then(x => x.json());
        setDoses(dz.doses || []);
        const sg = await fetch(API + '/api/medical/tracked?kind=blood_sugar', { headers: AUTH }).then(x => x.json());
        setSugars(sg.readings || []);
        const lp = await fetch(API + '/api/medical/lipids', { headers: AUTH }).then(x => x.json());
        setLipids(lp.panels || []);
        const ms = await fetch(API + '/api/medical/measurements', { headers: AUTH }).then(x => x.json());
        setMeas(ms.measurements || []);
        const sz = await fetch(API + '/api/medical/sizes', { headers: AUTH }).then(x => x.json());
        setSizes(sz.sizes || {});
        const tl = await fetch(API + '/api/medical/tailor', { headers: AUTH }).then(x => x.json());
        setTailor(tl.sheets || []);
        const wt = await fetch(API + '/api/medical/water', { headers: AUTH }).then(x => x.json());
        setWater(wt);
        const ex = await fetch(API + '/api/medical/exercise', { headers: AUTH }).then(x => x.json());
        setSessions(ex.sessions || []); setExSummary(ex.summary || {});
      } catch (e) { /* non-fatal */ }
      setErr('');
    } catch (e) { setErr(String(e)); }
  };

  useEffect(() => { load(); }, []);

  const post = async (path, body) => {
    try {
      const r = await fetch(API + path, { method: 'POST', headers: H, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.error) { setErr(j.error); return false; }
      setForm({}); setAdding(false);
      await load();
      return true;
    } catch (e) { setErr(String(e)); return false; }
  };

  const del = async (path, what) => {
    if (!window.confirm(`Delete this ${what}?`)) return;
    try {
      await fetch(API + path, { method: 'DELETE', headers: AUTH });
      await load();
    } catch (e) { setErr(String(e)); }
  };

  const trend = () => {
    const { recent_systolic: rs, previous_systolic: ps } = summary;
    if (!rs || !ps) return null;
    const diff = rs - ps;
    if (Math.abs(diff) < 3) return { text: 'about the same as the fortnight before', colour: '#888' };
    return {
      text: `${Math.abs(diff)} ${diff > 0 ? 'higher' : 'lower'} than the fortnight before`,
      colour: diff > 0 ? '#f59e0b' : '#10b981'
    };
  };

  return (
    <div style={S.wrap}>
      <h1 style={{ margin: '0 0 14px 0', fontSize: '20px', fontWeight: 700 }}>🩺 Health</h1>

      {err && (
        <div style={{ background: '#7f1d1d', padding: '10px', borderRadius: '6px',
                      marginBottom: '10px', fontSize: '13px' }}>⚠️ {err}</div>
      )}

      <button style={{ ...S.btn('#2a2a2a'), marginBottom: reportOpen ? '8px' : '14px' }}
              onClick={async () => {
                const open = !reportOpen;
                setReportOpen(open);
                if (open && !presets.length) {
                  try {
                    const r = await fetch(API + '/api/medical/report/presets', { headers: AUTH });
                    const j = await r.json();
                    setPresets(j.presets || []);
                    const first = (j.presets || [])[0];
                    if (first) { setReportFor(first.name); setPicked((first.sections || '').split(',')); }
                  } catch (e) { setErr(String(e)); }
                }
              }}>
        📄 Make a record for the doctor
      </button>

      {reportOpen && (
        <div style={{ ...S.card, marginBottom: '14px', borderColor: '#667eea' }}>
          <div style={S.label}>Who is it for?</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {presets.map(pr => (
              <button key={pr.id}
                      style={{ padding: '7px 12px', minHeight: '34px', borderRadius: '16px',
                               border: '1px solid ' + (reportFor === pr.name ? '#667eea' : '#2c2c3a'),
                               background: reportFor === pr.name ? '#262040' : '#1d1d26',
                               color: reportFor === pr.name ? '#a78bfa' : '#8b8b9e',
                               fontSize: '12px', cursor: 'pointer' }}
                      onClick={() => { setReportFor(pr.name); setPicked((pr.sections || '').split(',')); }}>
                {pr.name}
              </button>
            ))}
          </div>

          <div style={S.label}>What goes in</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {REPORT_BITS.map(([k, lbl]) => {
              const on = picked.includes(k);
              return (
                <button key={k}
                        style={{ padding: '6px 11px', minHeight: '32px', borderRadius: '8px',
                                 border: '1px solid ' + (on ? '#10b981' : '#2c2c3a'),
                                 background: on ? '#10281f' : '#1d1d26',
                                 color: on ? '#10b981' : '#6b6b7c', fontSize: '12px', cursor: 'pointer' }}
                        onClick={() => setPicked(on ? picked.filter(x => x !== k) : [...picked, k])}>
                  {on ? '✓ ' : ''}{lbl}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button style={S.btn('#10b981')} onClick={async () => {
              try {
                const q = '?sections=' + encodeURIComponent(picked.join(',')) +
                          '&for=' + encodeURIComponent(reportFor || '');
                const r = await fetch(API + '/api/medical/report' + q, { headers: AUTH });
                if (!r.ok) { setErr('Could not build the report'); return; }
                const blob = await r.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'health-' + (reportFor || 'record').toLowerCase().replace(/[^a-z0-9]+/g, '-')
                             + '-' + today() + '.pdf';
                a.click();
              } catch (e) { setErr(String(e)); }
            }}>Make it</button>
            <button style={S.btn('#2a2a2a')} onClick={async () => {
              const nm = window.prompt('Save this tick-list as?', reportFor || 'My doctor');
              if (!nm) return;
              await fetch(API + '/api/medical/report/presets', { method: 'POST', headers: H,
                body: JSON.stringify({ name: nm, sections: picked }) });
              const r = await fetch(API + '/api/medical/report/presets', { headers: AUTH });
              const j = await r.json();
              setPresets(j.presets || []); setReportFor(nm);
            }}>Save this set</button>
            <button style={S.btn('#2a2a2a')} onClick={() => setReportOpen(false)}>Close</button>
          </div>
        </div>
      )}

      <div style={S.tabs}>
        <button style={S.tab(view === 'overview')} onClick={() => { setView('overview'); setAdding(false); }}>Overview</button>
        <button style={S.tab(view === 'readings')} onClick={() => { setView('readings'); setAdding(false); }}>Blood pressure</button>
        <button style={S.tab(view === 'meds')} onClick={() => { setView('meds'); setAdding(false); }}>Medications</button>
        <button style={S.tab(view === 'conds')} onClick={() => { setView('conds'); setAdding(false); }}>Conditions</button>
        <button style={S.tab(view === 'visits')} onClick={() => { setView('visits'); setAdding(false); }}>Visits</button>
        <button style={S.tab(view === 'water')} onClick={() => { setView('water'); setAdding(false); }}>Water & moving</button>
        <button style={S.tab(view === 'sugar')} onClick={() => { setView('sugar'); setAdding(false); }}>Blood sugar</button>
        <button style={S.tab(view === 'body')} onClick={() => { setView('body'); setAdding(false); }}>Body</button>
        <button style={S.tab(view === 'lipids')} onClick={() => { setView('lipids'); setAdding(false); }}>Lipids</button>
        <button style={S.tab(view === 'allergies')} onClick={() => { setView('allergies'); setAdding(false); }}>Allergies</button>
      </div>

      {view === 'overview' && (
        <MedicalOverview
          meds={meds} readings={readings} sugars={sugars} water={water}
          exSummary={exSummary} doses={doses} conds={conds} allergies={allergies}
          onGo={setView}
        />
      )}

      {/* ---------------- READINGS ---------------- */}
      {view === 'readings' && (
        <>
          {summary.count > 0 && (
            <div style={S.card}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'baseline' }}>
                <div>
                  <div style={{ ...S.big, color: '#667eea' }}>
                    {summary.recent_systolic}/{summary.recent_diastolic}
                  </div>
                  <div style={S.small}>average, last 14 readings</div>
                </div>
              </div>
              {trend() && (
                <div style={{ fontSize: '12px', color: trend().colour, marginTop: '8px' }}>
                  {trend().text}
                </div>
              )}
              <div style={S.small}>
                Last taken {String(summary.last_taken || '').slice(0, 16).replace('T', ' ')}
              </div>
            </div>
          )}

          {!adding && (
            <button style={S.btn('#667eea')} onClick={() => { setAdding(true); setForm({ taken_at: '', where_taken: 'home' }); }}>
              + Record a reading
            </button>
          )}

          {adding && (
            <div style={S.card}>
              <div style={S.row2}>
                <input style={S.input} type="number" placeholder="Systolic (top)"
                       value={form.systolic || ''} onChange={e => setForm({ ...form, systolic: e.target.value })} />
                <input style={S.input} type="number" placeholder="Diastolic (bottom)"
                       value={form.diastolic || ''} onChange={e => setForm({ ...form, diastolic: e.target.value })} />
              </div>
              <div style={S.row2}>
                <input style={S.input} type="number" placeholder="Pulse (optional)"
                       value={form.pulse || ''} onChange={e => setForm({ ...form, pulse: e.target.value })} />
                <select style={S.input} value={form.where_taken || 'home'}
                        onChange={e => setForm({ ...form, where_taken: e.target.value })}>
                  <option value="home">At home</option>
                  <option value="clinic">At a clinic</option>
                  <option value="pharmacy">At a pharmacy</option>
                </select>
              </div>
              {form.where_taken && form.where_taken !== 'home' && (
                <div style={S.row2}>
                  <input style={S.input} placeholder="Clinic or pharmacy name"
                         value={form.clinic || ''} onChange={e => setForm({ ...form, clinic: e.target.value })} />
                  <input style={S.input} placeholder="City"
                         value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
              )}
              <div style={S.row2}>
                <input style={S.input} type="date"
                       value={form.date_part || today()}
                       onChange={e => setForm({ ...form, date_part: e.target.value })} />
                <input style={S.input} type="time"
                       value={form.time_part || nowTime()}
                       onChange={e => setForm({ ...form, time_part: e.target.value })} />
              </div>
              <input style={S.input} placeholder="Anything worth noting (optional)"
                     value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn('#10b981')} onClick={() => post('/api/medical/readings', {
                  ...form,
                  taken_at: (form.date_part || today()) + ' ' + (form.time_part || nowTime()) + ':00'
                })}>Save</button>
                <button style={S.btn('#2a2a2a')} onClick={() => { setAdding(false); setForm({}); }}>Cancel</button>
              </div>
            </div>
          )}

          {readings.length === 0 && !adding && (
            <div style={S.empty}>No readings yet.</div>
          )}

          {readings.map(r => (
            <div key={r.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between',
                                     alignItems: 'center', padding: '12px 14px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>
                  {r.systolic}/{r.diastolic}
                  {r.pulse ? <span style={{ fontSize: '12px', color: '#888' }}> · {r.pulse} bpm</span> : null}
                </div>
                <div style={S.small}>
                  {String(r.taken_at || '').slice(0, 16).replace('T', ' ')}
                  {(r.clinic || r.city) ? ' · ' + [r.clinic, r.city].filter(Boolean).join(', ')
                    : r.where_taken ? ' · ' + r.where_taken : ''}
                  {r.notes ? ' · ' + r.notes : ''}
                </div>
              </div>
              <button style={S.icon} onClick={() => del('/api/medical/readings/' + r.id, 'reading')}>✕</button>
            </div>
          ))}
        </>
      )}

      {/* ---------------- MEDICATIONS ---------------- */}
      {view === 'meds' && (
        <>
          {!adding && (
            <button style={S.btn('#667eea')} onClick={() => { setAdding(true); setForm({ started_on: today() }); }}>
              + Add a medication
            </button>
          )}

          {adding && (
            <div style={S.card}>
              <input style={S.input} placeholder="Name on the box"
                     value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input style={S.input} placeholder="Generic name (what a pharmacist would call it)"
                     value={form.generic_name || ''} onChange={e => setForm({ ...form, generic_name: e.target.value })} />
              <div style={S.row2}>
                <input style={S.input} placeholder="Dose (10mg)"
                       value={form.dose || ''} onChange={e => setForm({ ...form, dose: e.target.value })} />
                <select style={S.input} value={form.frequency || ''}
                        onChange={e => setForm({ ...form, frequency: e.target.value })}>
                  <option value="">How often...</option>
                  <option value="once a day">Once a day</option>
                  <option value="twice a day">Twice a day</option>
                  <option value="three times a day">Three times a day</option>
                  <option value="every other day">Every other day</option>
                  <option value="once a week">Once a week</option>
                  <option value="as needed">As needed</option>
                </select>
              </div>
              <select style={S.input} value={form.schedule_kind || 'daily'}
                      onChange={e => setForm({ ...form, schedule_kind: e.target.value })}>
                <option value="daily">Every day</option>
                <option value="interval">Every so many days</option>
                <option value="as_needed">Only when needed</option>
              </select>
              {(form.schedule_kind || 'daily') === 'interval' ? (
                <>
                  <div style={S.row2}>
                    <input style={S.input} type="number" placeholder="Every how many days"
                           value={form.every_days || ''}
                           onChange={e => setForm({ ...form, every_days: e.target.value })} />
                    <input style={S.input} type="number" placeholder="Up to (optional)"
                           value={form.every_days_max || ''}
                           onChange={e => setForm({ ...form, every_days_max: e.target.value })} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                    For 2 tablets every 10 to 14 days: put 10 and 14.
                  </div>
                </>
              ) : (form.schedule_kind === 'daily' ? (
                <input style={S.input} placeholder="Times, 24h, comma separated - 08:00, 20:00"
                       value={form.times || ''} onChange={e => setForm({ ...form, times: e.target.value })} />
              ) : null)}
              <div style={S.row2}>
                <input style={S.input} type="date" placeholder="Started"
                       value={form.started_on || ''} onChange={e => setForm({ ...form, started_on: e.target.value })} />
                <input style={S.input} type="date" placeholder="Course ends (optional)"
                       value={form.ends_on || ''} onChange={e => setForm({ ...form, ends_on: e.target.value })} />
              </div>
              <textarea style={{ ...S.input, minHeight: '54px' }}
                        placeholder="Notes - what the doctor said, side effects, anything"
                        value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
              <div style={S.row2}>
                <input style={S.input} placeholder="When (morning, with food)"
                       value={form.timing || ''} onChange={e => setForm({ ...form, timing: e.target.value })} />
                <input style={S.input} placeholder="What it's for"
                       value={form.what_for || ''} onChange={e => setForm({ ...form, what_for: e.target.value })} />
              </div>
              <div style={S.row2}>
                <input style={S.input} placeholder="Who prescribed it"
                       value={form.prescribed_by || ''} onChange={e => setForm({ ...form, prescribed_by: e.target.value })} />
                <input style={S.input} type="date"
                       value={form.started_on || ''} onChange={e => setForm({ ...form, started_on: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn('#10b981')} onClick={() => post('/api/medical/medications', form)}>Save</button>
                <button style={S.btn('#2a2a2a')} onClick={() => { setAdding(false); setForm({}); }}>Cancel</button>
              </div>
            </div>
          )}

          {doses.length > 0 && !adding && (
            <div style={S.card}>
              <div style={{ ...S.label, marginTop: 0 }}>Today</div>
              {doses.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px',
                                      padding: '8px 0', borderBottom: i === doses.length - 1 ? 'none' : '1px solid #222' }}>
                  <button
                    onClick={async () => {
                      await fetch(API + '/api/medical/taken', {
                        method: 'POST', headers: H,
                        body: JSON.stringify({ medication_id: d.medication_id, slot: d.slot, undo: d.taken })
                      });
                      load();
                    }}
                    style={{ width: '24px', height: '24px', minWidth: '24px', borderRadius: '50%',
                             border: '2px solid ' + (d.taken ? '#10b981' : '#555'),
                             background: 'none', color: '#10b981', cursor: 'pointer',
                             fontSize: '13px', lineHeight: 1, padding: 0 }}>
                    {d.taken ? '✓' : ''}
                  </button>
                  <span style={{ flex: 1, fontSize: '14px',
                                 color: d.taken ? '#777' : '#eee',
                                 textDecoration: d.taken ? 'line-through' : 'none' }}>
                    {d.name}{d.dose ? ' ' + d.dose : ''}
                  </span>
                  <span style={{ fontSize: '11px', color: '#888' }}>{d.slot}</span>
                </div>
              ))}
            </div>
          )}

          {meds.length === 0 && !adding && <div style={S.empty}>Nothing recorded yet.</div>}

          {meds.map(m => (
            <div key={m.id} style={{ ...S.card, opacity: m.current ? 1 : 0.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>
                    {m.name}
                    {m.dose ? <span style={{ color: '#888', fontWeight: 400 }}> {m.dose}</span> : null}
                  </div>
                  {m.generic_name && <div style={S.small}>{m.generic_name}</div>}
                  <div style={S.small}>
                    {[m.frequency, m.timing, m.what_for ? 'for ' + m.what_for : null]
                      .filter(Boolean).join(' · ')}
                  </div>
                  {m.times && m.schedule_kind !== 'interval' && (
                    <div style={{ fontSize: '11px', color: '#a78bfa' }}>⏰ {m.times}</div>
                  )}
                  {m.schedule_kind === 'interval' && (
                    <div style={{ fontSize: '11px', color: '#a78bfa' }}>
                      Every {m.every_days}{m.every_days_max && m.every_days_max !== m.every_days ? '-' + m.every_days_max : ''} days
                      {m.ends_on ? ' · until ' + String(m.ends_on).slice(0, 10) : ''}
                    </div>
                  )}
                  {m.stopped_on && (
                    <div style={{ fontSize: '11px', color: '#777' }}>
                      Stopped {String(m.stopped_on).slice(0, 10)} - kept for the record
                    </div>
                  )}
                  {m.notes && <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{m.notes}</div>}
                  {m.on_it_for && (
                    <div style={{ fontSize: '12px', color: '#667eea', marginTop: '4px' }}>
                      On it {m.on_it_for}{m.prescribed_by ? ' · ' + m.prescribed_by : ''}
                    </div>
                  )}
                  {!m.current && <div style={{ fontSize: '11px', color: '#888' }}>stopped {String(m.stopped_on).slice(0, 10)}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {m.current && (
                    <button style={S.icon} title="Mark as stopped"
                            onClick={async () => {
                              await fetch(API + '/api/medical/medications/' + m.id, {
                                method: 'PUT', headers: H,
                                body: JSON.stringify({ stopped_on: today() })
                              });
                              load();
                            }}>⏹</button>
                  )}
                  <button style={S.icon} onClick={() => del('/api/medical/medications/' + m.id, 'medication')}>✕</button>
                </div>
              </div>
            </div>
          ))}

          <div style={S.note}>
            Ami knows what you're on, so you can ask her whether something is safe alongside it —
            she'll tell you what she knows and when to check with a pharmacist.
          </div>
        </>
      )}

      {/* ---------------- CONDITIONS ---------------- */}
      {view === 'conds' && (
        <>
          {!adding && (
            <button style={S.btn('#667eea')} onClick={() => { setAdding(true); setForm({ status: 'active' }); }}>
              + Add a condition
            </button>
          )}

          {adding && (
            <div style={S.card}>
              <input style={S.input} placeholder="What it is"
                     value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
              <div style={S.row2}>
                <input style={S.input} type="date" placeholder="Since"
                       value={form.since || ''} onChange={e => setForm({ ...form, since: e.target.value })} />
                <select style={S.input} value={form.status || 'active'}
                        onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Ongoing</option>
                  <option value="resolved">Resolved</option>
                  <option value="monitoring">Keeping an eye on it</option>
                </select>
              </div>
              <textarea style={{ ...S.input, minHeight: '70px' }} placeholder="Anything worth recording"
                        value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn('#10b981')} onClick={() => post('/api/medical/conditions', form)}>Save</button>
                <button style={S.btn('#2a2a2a')} onClick={() => { setAdding(false); setForm({}); }}>Cancel</button>
              </div>
            </div>
          )}

          {conds.length === 0 && !adding && <div style={S.empty}>Nothing recorded yet.</div>}

          {conds.map(c => (
            <div key={c.id} style={{ ...S.card, opacity: c.status === 'resolved' ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>{c.name}</div>
                  <div style={S.small}>
                    {c.status === 'resolved' ? 'resolved' : c.status}
                    {c['for'] ? ' · ' + c['for'] : ''}
                  </div>
                  {c.notes && <div style={{ fontSize: '13px', color: '#bbb', marginTop: '6px' }}>{c.notes}</div>}
                </div>
                <button style={S.icon} onClick={() => del('/api/medical/conditions/' + c.id, 'condition')}>✕</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ---------------- VISITS ---------------- */}
      {view === 'visits' && (
        <>
          {!adding && (
            <button style={S.btn('#667eea')} onClick={() => { setAdding(true); setForm({ visit_date: today() }); }}>
              + Record a visit
            </button>
          )}

          {adding && (
            <div style={S.card}>
              <div style={S.row2}>
                <input style={S.input} type="date"
                       value={form.visit_date || ''} onChange={e => setForm({ ...form, visit_date: e.target.value })} />
                <input style={S.input} placeholder="Who you saw"
                       value={form.seen_by || ''} onChange={e => setForm({ ...form, seen_by: e.target.value })} />
              </div>
              <input style={S.input} placeholder="Where"
                     value={form.place || ''} onChange={e => setForm({ ...form, place: e.target.value })} />
              <input style={S.input} placeholder="Why you went"
                     value={form.reason || ''} onChange={e => setForm({ ...form, reason: e.target.value })} />
              <textarea style={{ ...S.input, minHeight: '80px' }} placeholder="What they said"
                        value={form.what_they_said || ''} onChange={e => setForm({ ...form, what_they_said: e.target.value })} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn('#10b981')} onClick={() => post('/api/medical/visits', form)}>Save</button>
                <button style={S.btn('#2a2a2a')} onClick={() => { setAdding(false); setForm({}); }}>Cancel</button>
              </div>
            </div>
          )}

          {visits.length > 4 && !adding && (
            <input style={S.input} placeholder="Search visits - doctor, reason, clinic"
                   value={visitQ} onChange={e => { setVisitQ(e.target.value); setVisitShow(12); }} />
          )}
          {visits.length === 0 && !adding && (
            <div style={S.empty}>
              No visits yet. Add one, save it, and the button to attach scans and letters appears on its card.
            </div>
          )}

          {visits
            .filter(v => !visitQ || [v.seen_by, v.reason, v.place, v.what_they_said, v.visit_date]
              .filter(Boolean).join(' ').toLowerCase().includes(visitQ.toLowerCase()))
            .slice(0, visitShow)
            .map(v => (
            <div key={v.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>
                    {v.reason || 'Visit'}
                    {(v.documents || []).length > 0 && (
                      <span style={{ fontSize: '11px', color: '#667eea', fontWeight: 600, marginLeft: '7px' }}>
                        📎 {v.documents.length}
                      </span>
                    )}
                  </div>
                  <div style={S.small}>
                    {[String(v.visit_date).slice(0, 10), v.seen_by, v.place].filter(Boolean).join(' · ')}
                  </div>
                  {v.what_they_said && (
                    <div style={{ fontSize: '13px', color: '#bbb', marginTop: '8px', whiteSpace: 'pre-wrap' }}>
                      {v.what_they_said}
                    </div>
                  )}
                  {(v.documents || []).length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {v.documents.map(d => (
                        <div key={d.id} style={{ border: '1px solid #2a2a2a', borderRadius: '8px',
                                                 padding: '6px', width: '92px', textAlign: 'center' }}>
                          <a href={`${API}/api/medical/documents/${d.id}/view?k=charlie`}
                             target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                            {d.is_image ? (
                              <img src={`${API}/api/medical/documents/${d.id}/view?k=charlie`} alt=""
                                   style={{ width: '78px', height: '62px', objectFit: 'cover',
                                            borderRadius: '5px', display: 'block', background: '#222' }} />
                            ) : (
                              <div style={{ width: '78px', height: '62px', borderRadius: '5px',
                                            background: '#232323', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontSize: '22px' }}>
                                {d.ext === 'pdf' ? '📄' : '📎'}
                              </div>
                            )}
                            <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px',
                                          overflow: 'hidden', textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap' }}>{d.title}</div>
                          </a>
                          <button onClick={async () => {
                                    if (!window.confirm('Remove ' + d.title + '?')) return;
                                    await fetch(API + '/api/medical/documents/' + d.id + '/remove',
                                                { method: 'DELETE', headers: AUTH });
                                    load();
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#666',
                                           fontSize: '10px', cursor: 'pointer', padding: '2px' }}>remove</button>
                        </div>
                      ))}
          {visits.filter(v => !visitQ || [v.seen_by, v.reason, v.place, v.what_they_said, v.visit_date]
              .filter(Boolean).join(' ').toLowerCase().includes(visitQ.toLowerCase())).length > visitShow && (
            <button style={S.btn('#2a2a2a')} onClick={() => setVisitShow(visitShow + 12)}>
              Show more visits
            </button>
          )}
          {visitShow > 12 && (
            <button onClick={() => setVisitShow(12)}
                    style={{ width: '100%', padding: '9px', marginTop: '6px',
                             background: 'transparent', color: '#6b6b7c',
                             border: '1px solid #2c2c3a', borderRadius: '8px',
                             fontSize: '12px', cursor: 'pointer' }}>
              Show less
            </button>
          )}
                    </div>
                  )}
                </div>
                <button style={S.icon} onClick={() => del('/api/medical/visits/' + v.id, 'visit')}>✕</button>
              </div>

              <label style={{ fontSize: '12px', color: '#fff', cursor: 'pointer', background: '#2a2a2a',
                              display: 'inline-block', marginTop: '10px', padding: '8px 12px',
                              borderRadius: '6px', fontWeight: 600 }}>
                + Attach a PDF, scan or photo
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx,image/*,application/pdf"
                       style={{ display: 'none' }} onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.size > 25 * 1024 * 1024) { setErr('That file is over 25MB'); return; }
                  const fd = new FormData();
                  fd.append('file', file);
                  fd.append('visit_id', v.id);
                  fd.append('title', file.name);
                  try {
                    const r = await fetch(API + '/api/medical/documents', { method: 'POST', headers: AUTH, body: fd });
                    const j = await r.json();
                    if (j.error) setErr('Upload failed: ' + j.error); else setErr('');
                    e.target.value = '';
                    load();
                  } catch (err) { setErr(String(err)); }
                }} />
              </label>
            </div>
          ))}
        </>
      )}

      {view === 'water' && (
        <>
          <div style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ ...S.big, color: water.today >= water.target ? '#10b981' : '#667eea' }}>
                {water.today}L
              </div>
              <div style={S.small}>of {water.target}L today</div>
            </div>
            <div style={{ height: '10px', background: '#2a2a2a', borderRadius: '5px',
                          overflow: 'hidden', marginTop: '10px' }}>
              <div style={{ width: Math.min(100, Math.round((water.today / water.target) * 100)) + '%',
                            height: '100%', background: water.today >= water.target ? '#10b981' : '#667eea' }} />
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
              {[0.25, 0.5, 0.75, 1].map(l => (
                <button key={l} onClick={async () => {
                  await fetch(API + '/api/medical/water', { method: 'POST', headers: H,
                    body: JSON.stringify({ litres: l }) });
                  load();
                }} style={{ flex: 1, padding: '12px 8px', minHeight: '46px', background: '#2a2a2a',
                            color: '#fff', border: 'none', borderRadius: '8px',
                            fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                  +{l}L
                </button>
              ))}
              <button onClick={async () => {
                await fetch(API + '/api/medical/water/last', { method: 'DELETE', headers: AUTH });
                load();
              }} style={{ padding: '12px', minHeight: '46px', background: 'none', color: '#777',
                          border: '1px solid #333', borderRadius: '8px', cursor: 'pointer' }}>↩</button>
            </div>
            <div style={{ display: 'flex', gap: '3px', marginTop: '14px', alignItems: 'flex-end', height: '40px' }}>
              {(water.week || []).map(d => (
                <div key={d.day} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: Math.max(3, Math.round((d.litres / water.target) * 36)) + 'px',
                                background: d.litres >= water.target ? '#10b981' : '#3a3a3a',
                                borderRadius: '2px' }} />
                  <div style={{ fontSize: '9px', color: '#666', marginTop: '3px' }}>{d.day.slice(8)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={S.label}>Moving</div>
          {exSummary.days_since !== null && exSummary.days_since !== undefined && (
            <div style={{ ...S.card, borderLeft: '4px solid ' + (exSummary.days_since > 3 ? '#f59e0b' : '#10b981') }}>
              {exSummary.this_week} {exSummary.this_week === 1 ? 'session' : 'sessions'} this week
              {exSummary.minutes ? ', ' + exSummary.minutes + ' minutes' : ''}.
              {' '}Last one {exSummary.days_since === 0 ? 'today' : exSummary.days_since === 1 ? 'yesterday' : exSummary.days_since + ' days ago'}.
            </div>
          )}

          {!adding && (
            <button style={S.btn('#667eea')} onClick={() => { setAdding(true); setForm({ how_it_felt: 'fine' }); }}>
              + Log a session
            </button>
          )}

          {adding && (
            <div style={S.card}>
              <input style={S.input} placeholder="What did you do?"
                     value={form.kind || ''} onChange={e => setForm({ ...form, kind: e.target.value })} />
              <div style={S.row2}>
                <input style={S.input} type="number" placeholder="Minutes"
                       value={form.minutes || ''} onChange={e => setForm({ ...form, minutes: e.target.value })} />
                <select style={S.input} value={form.how_it_felt || 'fine'}
                        onChange={e => setForm({ ...form, how_it_felt: e.target.value })}>
                  <option value="easy">Easy</option>
                  <option value="fine">Fine</option>
                  <option value="hard">Hard work</option>
                  <option value="struggled">Struggled</option>
                </select>
              </div>
              <input style={S.input} type="date" value={form.done_on || today()}
                     onChange={e => setForm({ ...form, done_on: e.target.value })} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn('#10b981')} onClick={() => post('/api/medical/exercise', form)}>Save</button>
                <button style={S.btn('#2a2a2a')} onClick={() => { setAdding(false); setForm({}); }}>Cancel</button>
              </div>
            </div>
          )}

          {sessions.map(x => (
            <div key={x.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between',
                                     alignItems: 'center', padding: '12px 14px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>{x.kind}</div>
                <div style={S.small}>
                  {String(x.done_on).slice(0, 10)}
                  {x.minutes ? ' · ' + x.minutes + ' min' : ''}
                  {x.how_it_felt ? ' · ' + x.how_it_felt : ''}
                </div>
              </div>
              <button style={S.icon} onClick={() => del('/api/medical/exercise/' + x.id, 'session')}>✕</button>
            </div>
          ))}
        </>
      )}

      {view === 'sugar' && (
        <>
          {!adding && (
            <button style={S.btn('#667eea')} onClick={() => { setAdding(true); setForm({ unit: 'mmol/L', context: 'fasting', where_taken: 'pharmacy' }); }}>
              + Record a reading
            </button>
          )}

          {adding && (
            <div style={S.card}>
              <div style={S.row2}>
                <input style={S.input} type="number" step="0.1" placeholder="Reading"
                       value={form.value || ''} onChange={e => setForm({ ...form, value: e.target.value })} />
                <select style={S.input} value={form.unit || 'mmol/L'}
                        onChange={e => setForm({ ...form, unit: e.target.value })}>
                  <option value="mmol/L">mmol/L</option>
                  <option value="mg/dL">mg/dL</option>
                </select>
              </div>
              <div style={S.row2}>
                <select style={S.input} value={form.context || 'fasting'}
                        onChange={e => setForm({ ...form, context: e.target.value, test_type: e.target.value })}>
                  <option value="fasting">Fasting (normal 3.9-5.5 mmol/L)</option>
                  <option value="before a meal">Before a meal (4.0-5.9)</option>
                  <option value="2h after eating">2h after eating (under 7.8)</option>
                  <option value="random">Random, any time (4.0-8.0)</option>
                </select>
                <select style={S.input} value={form.where_taken || 'pharmacy'}
                        onChange={e => setForm({ ...form, where_taken: e.target.value })}>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="home">At home</option>
                  <option value="clinic">Clinic</option>
                </select>
              </div>
              {(form.where_taken || 'pharmacy') !== 'home' && (
                <div style={S.row2}>
                  <input style={S.input} placeholder="Clinic or pharmacy name"
                         value={form.clinic || ''} onChange={e => setForm({ ...form, clinic: e.target.value })} />
                  <input style={S.input} placeholder="City"
                         value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} />
                </div>
              )}
              <div style={S.row2}>
                <input style={S.input} type="date" value={form.date_part || today()}
                       onChange={e => setForm({ ...form, date_part: e.target.value })} />
                <input style={S.input} type="time" value={form.time_part || nowTime()}
                       onChange={e => setForm({ ...form, time_part: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn('#10b981')} onClick={() => post('/api/medical/tracked', {
                  ...form, kind: 'blood_sugar',
                  taken_at: (form.date_part || today()) + ' ' + (form.time_part || nowTime()) + ':00'
                })}>Save</button>
                <button style={S.btn('#2a2a2a')} onClick={() => { setAdding(false); setForm({}); }}>Cancel</button>
              </div>
            </div>
          )}

          {sugars.length === 0 && !adding && <div style={S.empty}>Nothing recorded yet.</div>}

          {sugars.map(sg => (
            <div key={sg.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between',
                                      alignItems: 'center', padding: '12px 14px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>
                  {sg.value} {sg.unit}
                  <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>
                    {sg.unit === 'mmol/L' ? sg.value_mgdl + ' mg/dL' : sg.value_mmol + ' mmol/L'}
                  </span>
                </div>
                <div style={S.small}>
                  {String(sg.taken_at || '').slice(0, 16).replace('T', ' ')}
                  {sg.context ? ' · ' + sg.context : ''}
                  {(sg.clinic || sg.city) ? ' · ' + [sg.clinic, sg.city].filter(Boolean).join(', ')
                    : sg.where_taken ? ' · ' + sg.where_taken : ''}
                </div>
              </div>
              <button style={S.icon} onClick={() => del('/api/medical/tracked/' + sg.id, 'reading')}>✕</button>
            </div>
          ))}
        </>
      )}

      {view === 'body' && (() => {
        const F = [['weight_lbs', 'Weight', 'lb'], ['body_fat', 'Body fat', '%'], ['height_in', 'Height', 'in'],
                   ['glutes_in', 'Glutes', 'in'], ['lower_belly_in', 'Lower belly', 'in'],
                   ['plank_secs', 'Plank', 's'], ['pushups_1min', 'Push-ups', ''],
                   ['squats_1min', 'Squats', ''], ['situps_1min', 'Sit-ups', ''],
                   ['sleep_hours', 'Sleep', 'h'],
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
                <button style={S.btn('#2a2a2a')} onClick={() => setTailorForm({ region: 'Nigeria', units: 'in', taken_on: today() })}>
                  + Tailor
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
                          value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
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
                  <span style={{ display: 'flex', gap: '4px' }}>
                    <button style={S.icon} title="Edit" onClick={() => { setForm({ ...m, units: 'in' }); setAdding(true); }}>✎</button>
                    <button style={S.icon} onClick={() => del('/api/medical/measurements/' + m.id, 'assessment')}>✕</button>
                  </span>
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
                {(m.cardio_activity || m.concerns || m.notes) && (
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: '10px', lineHeight: 1.6 }}>
                    {m.cardio_activity && <div>Cardio: {m.cardio_activity} {m.cardio_distance} {m.cardio_time ? 'in ' + m.cardio_time : ''}</div>}
                    {m.concerns && <div style={{ color: '#f59e0b' }}>Concerns: {m.concerns}</div>}
                    {m.notes && <div>{m.notes}</div>}
                  </div>
                )}
              </div>
            ))}

            {tailorForm && (() => {
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

      {view === 'lipids' && (
        <>
          {!adding && (
            <button style={S.btn('#667eea')} onClick={() => { setAdding(true); setForm({ unit: 'mmol/L', fasting: true, taken_on: today() }); }}>
              + Add a cholesterol test
            </button>
          )}

          {adding && (
            <div style={S.card}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                Copy the numbers off the lab sheet. Some clinics only test total - leave the rest blank.
              </div>
              <select style={S.input} value={form.unit || 'mmol/L'}
                      onChange={e => setForm({ ...form, unit: e.target.value })}>
                <option value="mmol/L">mmol/L (Kenya, UK, most of the world)</option>
                <option value="mg/dL">mg/dL (US labs)</option>
              </select>
              <div style={S.row2}>
                <input style={S.input} type="number" step="0.1" placeholder="Total"
                       value={form.total || ''} onChange={e => setForm({ ...form, total: e.target.value })} />
                <input style={S.input} type="number" step="0.1" placeholder="LDL"
                       value={form.ldl || ''} onChange={e => setForm({ ...form, ldl: e.target.value })} />
              </div>
              <div style={S.row2}>
                <input style={S.input} type="number" step="0.1" placeholder="HDL"
                       value={form.hdl || ''} onChange={e => setForm({ ...form, hdl: e.target.value })} />
                <input style={S.input} type="number" step="0.1" placeholder="Triglycerides"
                       value={form.trig || ''} onChange={e => setForm({ ...form, trig: e.target.value })} />
              </div>
              <div style={S.row2}>
                <input style={S.input} placeholder="Clinic or lab name"
                       value={form.clinic || ''} onChange={e => setForm({ ...form, clinic: e.target.value })} />
                <input style={S.input} placeholder="City"
                       value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <input style={S.input} type="date" value={form.taken_on || today()}
                     onChange={e => setForm({ ...form, taken_on: e.target.value })} />
              <label style={{ fontSize: '13px', color: '#ccc', display: 'flex', gap: '8px',
                              alignItems: 'center', marginBottom: '10px' }}>
                <input type="checkbox" checked={!!form.fasting}
                       onChange={e => setForm({ ...form, fasting: e.target.checked })} />
                I was fasting
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn('#10b981')} onClick={() => post('/api/medical/lipids', form)}>Save</button>
                <button style={S.btn('#2a2a2a')} onClick={() => { setAdding(false); setForm({}); }}>Cancel</button>
              </div>
            </div>
          )}

          {lipids.length === 0 && !adding && <div style={S.empty}>No cholesterol tests recorded.</div>}

          {lipids.map(p => (
            <div key={p.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginBottom: '10px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600 }}>
                  {String(p.taken_on || '').slice(0, 10)}
                  <span style={{ fontSize: '11px', color: '#888', fontWeight: 400 }}>
                    {p.fasting ? ' · fasting' : ''}
                    {(p.clinic || p.city) ? ' · ' + [p.clinic, p.city].filter(Boolean).join(', ') : ''}
                  </span>
                </div>
                <button style={S.icon} onClick={() => del('/api/medical/lipids/' + p.id, 'test')}>✕</button>
              </div>

              {[
                ['total', 'Total', 'All the cholesterol in your blood.', 'total_mgdl'],
                ['ldl', 'LDL', 'The kind that builds up in arteries. Lower is better.', 'ldl_mgdl'],
                ['hdl', 'HDL', 'The kind that clears it away. Higher is better.', 'hdl_mgdl'],
                ['trig', 'Triglycerides', 'Fat from food. Rises with sugar, refined carbs and alcohol.', 'trig_mgdl']
              ].map(([k, label, hint, mg]) => (
                p[mg] ? (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px',
                                        padding: '8px 0', borderTop: '1px solid #222' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{label}</div>
                      <div style={{ fontSize: '10px', color: '#666' }}>{hint}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700,
                                    color: (p.bands[k] || {}).colour || '#eee' }}>
                        {p.mmol[k]} <span style={{ fontSize: '10px', color: '#888', fontWeight: 400 }}>mmol/L</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#888' }}>
                        {Math.round(p[mg])} mg/dL · {(p.bands[k] || {}).name}
                      </div>
                    </div>
                  </div>
                ) : null
              ))}

              {p.total_mgdl && !p.ldl_mgdl && !p.hdl_mgdl && (
                <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
                  Total only. A full lipid panel next time would show whether a high total is the
                  good kind (HDL) or the kind to bring down (LDL).
                </div>
              )}
            </div>
          ))}

          <div style={S.note}>
            Desirable: total under 5.2 mmol/L (200 mg/dL), LDL under 2.6 (100), HDL above 1.0 (40),
            triglycerides under 1.7 (150). General adult ranges - your doctor may set different
            targets for you, especially with blood pressure in the picture.
          </div>
        </>
      )}

      {view === 'allergies' && (
        <>
          {!adding && (
            <button style={S.btn('#667eea')} onClick={() => { setAdding(true); setForm({}); }}>
              + Add an allergy
            </button>
          )}

          {adding && (
            <div style={S.card}>
              <input style={S.input} placeholder="What you react to"
                     value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input style={S.input} placeholder="What happens"
                     value={form.reaction || ''} onChange={e => setForm({ ...form, reaction: e.target.value })} />
              <select style={S.input} value={form.severity || ''}
                      onChange={e => setForm({ ...form, severity: e.target.value })}>
                <option value="">How bad...</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="anaphylaxis">Anaphylaxis</option>
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn('#10b981')} onClick={() => post('/api/medical/allergies', form)}>Save</button>
                <button style={S.btn('#2a2a2a')} onClick={() => { setAdding(false); setForm({}); }}>Cancel</button>
              </div>
            </div>
          )}

          {allergies.length === 0 && !adding && <div style={S.empty}>None recorded.</div>}

          {allergies.map(a => (
            <div key={a.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between',
                                     alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{a.name}</div>
                <div style={S.small}>{[a.reaction, a.severity].filter(Boolean).join(' · ')}</div>
              </div>
              <button style={S.icon} onClick={() => del('/api/medical/allergies/' + a.id, 'allergy')}>✕</button>
            </div>
          ))}
        </>
      )}

      <div style={S.note}>
        This is your own record, kept on your machine. Ami remembers it so you don't have to,
        but she isn't a doctor and won't pretend to be.
      </div>
      <div style={{ height: '40px' }} />
    </div>
  );
}
