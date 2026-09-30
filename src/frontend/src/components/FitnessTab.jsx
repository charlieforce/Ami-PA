import React, { useState, useEffect } from 'react';
import GoalsPanel from './GoalsPanel';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const AUTH = { 'X-Ami-Password': AMI_PASSWORD };
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const AREAS = [['all', 'All'], ['upper', 'Upper'], ['lower', 'Lower'], ['core', 'Core'],
               ['cardio', 'Cardio'], ['full', 'Full body'], ['warmup', 'Warm-up'], ['cooldown', 'Stretches']];
const today = () => new Date().toISOString().split('T')[0];
const todayName = () => DAYS[(new Date().getDay() + 6) % 7];

const S = {
  wrap: { padding: '12px', color: '#eee', maxWidth: '760px', margin: '0 auto' },
  tabs: { display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto' },
  tab: (on) => ({ padding: '10px 14px', minHeight: '44px', borderRadius: '8px', border: 'none',
    background: on ? '#667eea' : '#2a2a2a', color: '#fff', fontSize: '13px',
    fontWeight: on ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }),
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
    padding: '14px', marginBottom: '10px' },
  input: { width: '100%', padding: '11px', fontSize: '16px', background: '#141414', color: '#eee',
    border: '1px solid #333', borderRadius: '8px', marginBottom: '8px', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  btn: (bg) => ({ padding: '12px', minHeight: '46px', background: bg, color: '#fff', border: 'none',
    borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%' }),
  small: (bg) => ({ padding: '8px 12px', minHeight: '38px', background: bg, color: '#fff',
    border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }),
  chip: (on) => ({ padding: '7px 11px', minHeight: '34px', borderRadius: '16px', cursor: 'pointer',
    border: '1px solid ' + (on ? '#667eea' : '#2a2a2a'), background: on ? '#667eea22' : '#141414',
    color: on ? '#fff' : '#999', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }),
  label: { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
    fontWeight: 700, margin: '18px 0 8px' },
  icon: { background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '15px', padding: '4px 8px' },
  empty: { color: '#666', fontSize: '13px', padding: '20px 0', textAlign: 'center' },
  knee: (level, twist) => ({
    fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
    background: level === 'heavy' ? '#7f1d1d' : level === 'light' ? '#78350f' : '#14532d',
    color: level === 'heavy' ? '#fca5a5' : level === 'light' ? '#fcd34d' : '#86efac'
  })
};

/* ---- simple figures, drawn rather than fetched ---- */
function Figure({ kind, size = 46, exId, hasPhoto, hasClip, clipKind, stamp, onPhoto }) {
  const [broken, setBroken] = useState(false);
  const v = '?k=charlie&v=' + (stamp || '1');
  const box = { width: size, height: size, borderRadius: '8px', objectFit: 'cover',
                flexShrink: 0, background: '#141414', cursor: onPhoto ? 'pointer' : 'default',
                display: 'block' };
  if (exId && hasClip && !broken) {
    if (clipKind === 'video') {
      return (
        <video src={API + '/api/fitness/exercises/' + exId + '/clip' + v}
               autoPlay loop muted playsInline onError={() => setBroken(true)}
               style={box} onClick={onPhoto} />
      );
    }
    return (
      <img src={API + '/api/fitness/exercises/' + exId + '/clip' + v} alt=""
           onError={() => setBroken(true)} style={box} onClick={onPhoto} />
    );
  }
  if (exId && hasPhoto && !broken) {
    return (
      <img src={API + '/api/fitness/exercises/' + exId + '/photo' + v}
           alt="" onError={() => setBroken(true)} style={box} onClick={onPhoto} />
    );
  }
  const c = '#9aa3c7';
  const P = (d, w = 2.2) => <path d={d} stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  const G = (d, w = 3) => <path d={d} stroke="#4a5170" strokeWidth={w} fill="none" strokeLinecap="round" />;
  const head = (x, y, r = 4.2) => <circle cx={x} cy={y} r={r} stroke={c} strokeWidth="2.2" fill="none" />;
  const bar = (x1, y, x2) => <g><line x1={x1} y1={y} x2={x2} y2={y} stroke="#4a5170" strokeWidth="2.5" />
      <circle cx={x1} cy={y} r="3" fill="#4a5170" /><circle cx={x2} cy={y} r="3" fill="#4a5170" /></g>;
  const art = {
    bench: <>{G("M6 40h36")}{head(15, 28)}{P("M15 32l16 2")}{P("M20 33l-3-9M26 34l-3-9")}{bar(12, 22, 30)}</>,
    pushdown: <><g opacity="0.45">{head(14, 14)}{P("M14 18v14")}{P("M14 20l7 4")}{bar(18, 24, 26)}</g>
      {head(30, 14)}{P("M30 18v14")}{P("M30 20l6 10")}{bar(33, 30, 41)}
      <text x="12" y="45" fontSize="7" fill="#5a6180">start</text>
      <text x="28" y="45" fontSize="7" fill="#5a6180">end</text></>,
    press: <>{head(24, 13)}{P("M24 17v15")}{P("M24 20l-8-6M24 20l8-6")}{bar(13, 13, 35)}{P("M24 32l-6 12M24 32l6 12")}</>,
    pull: <>{bar(8, 8, 40)}{head(24, 20)}{P("M24 24v12")}{P("M24 25l-9-14M24 25l9-14")}{P("M24 36l-5 9M24 36l5 9")}</>,
    row: <>{head(13, 19)}{P("M13 23l13 3")}{P("M26 26l9-3")}{bar(31, 22, 39)}{P("M13 23l-2 15")}{P("M26 26l1 13")}</>,
    curl: <>{head(24, 12)}{P("M24 16v15")}{P("M24 20l-7 7 3 5M24 20l7 7-3 5")}{bar(15, 32, 33)}{P("M24 31l-5 13M24 31l5 13")}</>,
    pushup: <>{head(11, 25)}{P("M11 29l27 7", 2.6)}{P("M15 31v11M34 36v8")}{G("M6 44h38")}</>,
    squat: <>{head(24, 10)}{bar(9, 16, 39)}{P("M24 15v9")}{P("M24 24l-7 8v10M24 24l7 8v10")}{G("M12 44h24")}</>,
    legpress: <>{G("M4 22v18")}{P("M6 34h13v-13", 2.6)}{head(31, 31)}{P("M31 34l-11 2")}{P("M31 34v9")}</>,
    hinge: <>{head(12, 15)}{P("M12 19l13 7")}{P("M25 26v15")}{P("M14 22l-1 10")}{bar(8, 33, 20)}</>,
    lunge: <>{head(21, 10)}{P("M21 14v12")}{P("M21 26l-9 9v7M21 26l9 10v6")}{G("M8 44h30")}</>,
    stepup: <>{G("M26 44h16v-13H26z")}{head(16, 13)}{P("M16 17v12")}{P("M16 29l-4 13M16 29l12 3")}</>,
    legcurl: <>{G("M6 26h22")}{head(11, 22)}{P("M28 28q8 2 9 8", 2.4)}</>,
    legext: <>{G("M8 28h16")}{head(13, 24)}{P("M24 29l13-7", 2.4)}</>,
    calf: <>{G("M12 44h24")}{head(24, 11)}{P("M24 15v18")}{P("M24 33l-4 9M24 33l4 9")}{P("M18 42h12", 2)}</>,
    plank: <>{head(9, 27)}{P("M9 31l29 9", 2.6)}{P("M11 33v9M36 40v4")}{G("M4 44h40")}</>,
    core: <>{head(12, 33)}{P("M12 33h13")}{P("M25 33l9-11")}{P("M25 33l6 9")}{G("M6 44h36")}</>,
    carry: <>{head(24, 10)}{P("M24 14v17")}{P("M24 16l-8 3M24 16l8 3")}{bar(11, 22, 19)}{bar(29, 22, 37)}{P("M24 31l-5 13M24 31l5 13")}</>,
    walk: <>{head(24, 10)}{P("M24 14v14")}{P("M24 18l-7 5M24 18l7 4")}{P("M24 28l-7 15M24 28l6 15")}</>,
    run: <>{head(27, 10)}{P("M27 14l-5 13")}{P("M22 18l-8 3M22 18l10 6")}{P("M22 27l-9 13M22 27l11 9")}</>,
    bike: <><circle cx="12" cy="36" r="7.5" stroke="#4a5170" strokeWidth="2.2" fill="none" /><circle cx="36" cy="36" r="7.5" stroke="#4a5170" strokeWidth="2.2" fill="none" />{P("M12 36l10-13h9l5 13")}{head(25, 14)}</>,
    swim: <>{head(11, 21)}{P("M11 25l14 4")}{P("M25 29l12-7")}{P("M4 38q7-5 14 0t14 0t12 0", 2)}</>,
  };
  return (
    <svg viewBox="0 0 48 48" width={size} height={size}
         onClick={onPhoto}
         style={{ flexShrink: 0, background: '#141414', borderRadius: '8px',
                  cursor: onPhoto ? 'pointer' : 'default' }}>
      {art[kind] || art.walk}
    </svg>
  );
}

export default function FitnessTab() {
  const [view, setView] = useState('today');
  const [ex, setEx] = useState([]);
  const [plan, setPlan] = useState(null);
  const [log, setLog] = useState([]);
  const [prog, setProg] = useState({ lifts: [], weeks: [] });
  const [area, setArea] = useState('all');
  const [open, setOpen] = useState(null);
  const [logging, setLogging] = useState(null);
  const [form, setForm] = useState({});
  const [editPlan, setEditPlan] = useState(null);
  const [err, setErr] = useState('');
  const [ask, setAsk] = useState(null);
  const [sugg, setSugg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [prog2, setProg2] = useState(null);
  const [showWeek, setShowWeek] = useState(null);
  const [buildAsk, setBuildAsk] = useState(null);
  const [showCount, setShowCount] = useState(12);
  const [copyFrom, setCopyFrom] = useState(null);
  const [logDays, setLogDays] = useState([]);

  const load = async () => {
    try {
      const [e, p, l, g] = await Promise.all([
        fetch(API + '/api/fitness/exercises', { headers: AUTH }).then(r => r.json()),
        fetch(API + '/api/fitness/plan', { headers: AUTH }).then(r => r.json()),
        fetch(API + '/api/fitness/log', { headers: AUTH }).then(r => r.json()),
        fetch(API + '/api/fitness/progress', { headers: AUTH }).then(r => r.json())
      ]);
      setEx(e.exercises || []); setPlan(p.plan || null);
      setLog(l.log || []); setProg({ lifts: g.lifts || [], weeks: g.weeks || [] });
      setErr('');
    } catch (x) { setErr(String(x)); }
  };
  useEffect(() => { load(); }, []);

  const saveLog = async () => {
    if (!logging) return;
    await fetch(API + '/api/fitness/log', { method: 'POST', headers: H,
      body: JSON.stringify({ ...form, exercise_id: logging.exercise_id || logging.id,
                             exercise_name: logging.name, done_on: form.done_on || today() }) });
    setLogging(null); setForm({}); load();
  };

  const savePlan = async () => {
    await fetch(API + '/api/fitness/plan', { method: 'POST', headers: H, body: JSON.stringify(editPlan) });
    setEditPlan(null); load();
  };

  const buildProgramme = async () => {
    setBusy(true); setProg2(null);
    try {
      const r = await fetch(API + '/api/fitness/programme', { method: 'POST', headers: H,
        body: JSON.stringify(buildAsk) });
      const j = await r.json();
      if (j.error) setErr(j.error); else { setProg2(j); setErr(''); setShowWeek(1); }
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const keepProgramme = async () => {
    await fetch(API + '/api/fitness/programme/save', { method: 'POST', headers: H,
      body: JSON.stringify(prog2) });
    setProg2(null); setBuildAsk(null); load();
  };

  const editItem = async (id, patch) => {
    await fetch(API + '/api/fitness/plan/item/' + id, { method: 'PUT', headers: H,
      body: JSON.stringify(patch) });
    load();
  };

  const dropItem = async (id) => {
    await fetch(API + '/api/fitness/plan/item/' + id, { method: 'DELETE', headers: AUTH });
    load();
  };

  const askAmi = async () => {
    setBusy(true); setSugg(null);
    try {
      const r = await fetch(API + '/api/fitness/suggest', { method: 'POST', headers: H,
        body: JSON.stringify(ask) });
      const j = await r.json();
      if (j.error) setErr(j.error); else { setSugg(j); setErr(''); }
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const keepSuggestion = async (replaceDay) => {
    await fetch(API + '/api/fitness/plan/add-items', { method: 'POST', headers: H,
      body: JSON.stringify({ items: sugg.items, replace_day: replaceDay }) });
    setSugg(null); setAsk(null); load(); setView('plan');
  };

  const shown = area === 'all' ? ex : ex.filter(x => x.area === area);
  const day = todayName();
  const todayItems = (plan && plan.by_day && plan.by_day[day]) || [];
  const planDays = plan && plan.by_day ? Object.keys(plan.by_day) : [];
  const planHasAnything = planDays.length > 0;
  const doneToday = new Set(log.filter(l => String(l.done_on).slice(0, 10) === today()).map(l => l.exercise_name));

  const ExCard = (x, inPlan) => (
    <div key={x.id + (inPlan ? 'p' : 'l')} style={S.card}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          <Figure kind={x.drawing} size={80} exId={x.exercise_id || x.id} hasPhoto={x.has_photo}
                  hasClip={x.has_clip} clipKind={x.clip_kind} stamp={x.media_at} />
          <div style={{ display: 'flex', gap: '4px' }}>
            <label style={{ cursor: 'pointer', fontSize: '10px', color: '#7a819e' }}
                   title={x.has_photo ? 'Change the photo' : 'Add a photo'}>
              {x.has_photo ? '🖼 swap' : '🖼 photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                const f = e.target.files[0]; if (!f) return;
                const fd = new FormData(); fd.append('file', f);
                await fetch(API + '/api/fitness/exercises/' + x.id + '/photo',
                            { method: 'POST', headers: AUTH, body: fd });
                e.target.value = ''; load();
              }} />
            </label>
            <label style={{ cursor: 'pointer', fontSize: '10px', color: '#7a819e' }}
                   title={x.has_clip ? 'Change the clip' : 'Add a short clip - GIF or MP4'}>
              {x.has_clip ? '🎬 swap' : '🎬 clip'}
              <input type="file" accept=".gif,.mp4,.webm,.mov,image/gif,video/*" style={{ display: 'none' }}
                     onChange={async (e) => {
                const f = e.target.files[0]; if (!f) return;
                const fd = new FormData(); fd.append('file', f);
                const r = await fetch(API + '/api/fitness/exercises/' + x.id + '/clip',
                            { method: 'POST', headers: AUTH, body: fd });
                const j = await r.json(); if (j.error) setErr(j.error);
                e.target.value = ''; load();
              }} />
            </label>
            {(x.has_photo || x.has_clip) && (
              <button title="Remove what is there"
                      onClick={async () => {
                        if (x.has_clip) await fetch(API + '/api/fitness/exercises/' + x.id + '/clip', { method: 'DELETE', headers: AUTH });
                        else await fetch(API + '/api/fitness/exercises/' + x.id + '/photo', { method: 'DELETE', headers: AUTH });
                        load();
                      }}
                      style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer',
                               fontSize: '10px', padding: 0 }}>✕</button>
            )}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>{x.name}</div>
            <span style={S.knee(x.knee_load)}>
              {x.knee_load === 'heavy' ? 'KNEE: HEAVY' : x.knee_load === 'light' ? 'KNEE: LIGHT' : 'KNEE OK'}
              {x.knee_twist ? ' · TWIST' : ''}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
            {[x.area, x.equipment].filter(Boolean).join(' · ')}
            {inPlan && x.target_sets ? ' · target ' + x.target_sets + '×' + (x.target_reps || '') : ''}
          </div>
          {x.last_time && (
            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '3px' }}>
              Last time: {x.last_time.sets ? x.last_time.sets + '×' + (x.last_time.reps || '') : ''}
              {x.last_time.weight_lbs ? ' at ' + x.last_time.weight_lbs + 'lb' : ''}
              {x.last_time.distance ? ' ' + x.last_time.distance : ''}
              {x.last_time.duration ? ' in ' + x.last_time.duration : ''}
              {' · ' + String(x.last_time.done_on).slice(5, 10)}
            </div>
          )}
          {open === x.id + (inPlan ? 'p' : 'l') && x.how_to && (
            <div style={{ fontSize: '13px', color: '#bbb', lineHeight: 1.6, marginTop: '8px' }}>{x.how_to}</div>
          )}
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button style={S.small('#2a2a2a')} onClick={() => setOpen(open === x.id + (inPlan ? 'p' : 'l') ? null : x.id + (inPlan ? 'p' : 'l'))}>
              {open === x.id + (inPlan ? 'p' : 'l') ? 'Hide' : 'How to'}
            </button>
            <a href={'https://www.youtube.com/results?search_query=' + encodeURIComponent('how to ' + x.name + ' proper form')}
               target="_blank" rel="noreferrer"
               style={{ ...S.small('#2a2a2a'), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              ▶ Watch
            </a>
            <button style={S.small(doneToday.has(x.name) ? '#14532d' : '#667eea')}
                    onClick={() => { setLogging(x); setForm({ done_on: today(), sets: x.target_sets, reps: x.target_reps }); }}>
              {doneToday.has(x.name) ? '✓ Logged - add another' : 'Log it'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.wrap}>
      <h1 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700 }}>💪 Fitness</h1>
      {err && <div style={{ background: '#7f1d1d', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px' }}>{err}</div>}

      <div style={S.tabs}>
        {[['today', 'Today'], ['goals', 'Goals'], ['plan', 'My plan'], ['library', 'Exercises'], ['progress', 'Progress']].map(([k, l]) => (
          <button key={k} style={S.tab(view === k)} onClick={() => { setView(k); setLogging(null); }}>{l}</button>
        ))}
      </div>

      {logging && (
        <div style={{ ...S.card, borderColor: '#667eea' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>{logging.name}</div>
          {logging.kind === 'cardio' ? (
            <div style={S.row2}>
              <input style={S.input} placeholder="Distance (1km, 500m)" value={form.distance || ''}
                     onChange={e => setForm({ ...form, distance: e.target.value })} />
              <input style={S.input} placeholder="Time (24:30)" value={form.duration || ''}
                     onChange={e => setForm({ ...form, duration: e.target.value })} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <input style={S.input} type="number" placeholder="Sets" value={form.sets || ''}
                     onChange={e => setForm({ ...form, sets: e.target.value })} />
              <input style={S.input} placeholder="Reps" value={form.reps || ''}
                     onChange={e => setForm({ ...form, reps: e.target.value })} />
              <input style={S.input} type="number" step="0.5" placeholder="Weight lb" value={form.weight_lbs || ''}
                     onChange={e => setForm({ ...form, weight_lbs: e.target.value })} />
            </div>
          )}
          <div style={S.row2}>
            <select style={S.input} value={form.how_it_felt || 'fine'}
                    onChange={e => setForm({ ...form, how_it_felt: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="fine">Fine</option>
              <option value="hard">Hard</option>
              <option value="too much">Too much</option>
            </select>
            <select style={S.input} value={form.knee_ok === undefined ? '' : String(form.knee_ok)}
                    onChange={e => setForm({ ...form, knee_ok: e.target.value === '' ? undefined : e.target.value === 'true' })}>
              <option value="">Knee - no comment</option>
              <option value="true">Knee was fine</option>
              <option value="false">Knee complained</option>
            </select>
          </div>
          <input style={S.input} type="date" value={form.done_on || today()}
                 onChange={e => setForm({ ...form, done_on: e.target.value })} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={S.btn('#10b981')} onClick={saveLog}>Save</button>
            <button style={S.btn('#2a2a2a')} onClick={() => { setLogging(null); setForm({}); }}>Cancel</button>
          </div>
        </div>
      )}

      {view === 'goals' && !logging && <GoalsPanel />}

      {/* ---------------- TODAY ---------------- */}
      {view === 'today' && !logging && (
        <>
          {plan ? (
            <div style={{ ...S.card, borderLeft: '4px solid #667eea' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>{plan.goal}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                Week {plan.week_number || 1} of {plan.weeks} · {plan.sessions_this_week} of {plan.planned_days} sessions this week
              </div>
            </div>
          ) : (
            <div style={S.card}>
              <div style={{ fontSize: '13px', color: '#ccc' }}>No plan yet. Set one up in My plan — or ask Ami what she'd suggest.</div>
            </div>
          )}

          <div style={S.label}>{day} {todayItems.length ? '' : '- rest day'}</div>
          {todayItems.length > 0 && (
            <div style={{ fontSize: '12px', color: '#a78bfa', marginBottom: '8px' }}>
              Warm up first - leg swings, arm circles, a few bodyweight squats. Two minutes.
            </div>
          )}
          {todayItems.map(it => ExCard({ ...it, id: it.exercise_id,
            kind: it.area === 'cardio' ? 'cardio' : 'strength' }, true))}
          {todayItems.length > 0 && (
            <div style={{ fontSize: '12px', color: '#a78bfa', margin: '4px 0 12px' }}>
              And stretch after - hamstrings, quads, hip flexors. Thirty seconds each.
            </div>
          )}
          {!todayItems.length && (
            <div style={S.empty}>Nothing planned today. Log anything you do from Exercises.</div>
          )}

          {log.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={S.label}>Recent</div>
                <button style={{ ...S.small('#2a2a2a'), marginTop: '14px' }} onClick={async () => {
                  const r = await fetch(API + '/api/fitness/log/days', { headers: AUTH });
                  const j = await r.json(); setLogDays(j.days || []); setCopyFrom('pick');
                }}>Repeat a session</button>
              </div>
              {copyFrom === 'pick' && (
                <div style={S.card}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                    Which day do you want to do again? It logs the lot for today.
                  </div>
                  {logDays.map(d => (
                    <div key={d.done_on} style={{ display: 'flex', justifyContent: 'space-between',
                                                  alignItems: 'center', padding: '7px 0',
                                                  borderTop: '1px solid #242424' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13px' }}>{String(d.done_on).slice(0, 10)} · {d.n} logged</div>
                        <div style={{ fontSize: '11px', color: '#777', overflow: 'hidden',
                                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.what}</div>
                      </div>
                      <button style={S.small('#10b981')} onClick={async () => {
                        await fetch(API + '/api/fitness/log/copy', { method: 'POST', headers: H,
                          body: JSON.stringify({ from: d.done_on, to: today() }) });
                        setCopyFrom(null); load();
                      }}>Do it again</button>
                    </div>
                  ))}
                  <button style={{ ...S.btn('#2a2a2a'), marginTop: '10px' }} onClick={() => setCopyFrom(null)}>Cancel</button>
                </div>
              )}
              {log.slice(0, 8).map(l => (
                <div key={l.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between',
                                         alignItems: 'center', padding: '10px 14px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{l.exercise_name}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {String(l.done_on).slice(0, 10)}
                      {l.sets ? ' · ' + l.sets + '×' + (l.reps || '') : ''}
                      {l.weight_lbs ? ' · ' + l.weight_lbs + 'lb' : ''}
                      {l.distance ? ' · ' + l.distance : ''}{l.duration ? ' in ' + l.duration : ''}
                      {l.how_it_felt ? ' · ' + l.how_it_felt : ''}
                      {l.knee_ok === 0 ? ' · knee complained' : ''}
                    </div>
                  </div>
                  <button style={S.icon} onClick={async () => {
                    await fetch(API + '/api/fitness/log/' + l.id, { method: 'DELETE', headers: AUTH }); load();
                  }}>✕</button>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* ---------------- PLAN ---------------- */}
      {view === 'plan' && !logging && (
        <>
          {!editPlan && !ask && !buildAsk && !prog2 && (
            <button style={{ ...S.btn('#4f46e5'), marginBottom: '8px' }}
                    onClick={() => setBuildAsk({ goal: (plan && plan.goal) || 'Strength and size',
                                                 weeks: 8, per_week: 3, days: ['Mon', 'Wed', 'Fri'], criteria: '' })}>
              📋 Build me a full programme
            </button>
          )}

          {buildAsk && !prog2 && (
            <div style={{ ...S.card, borderColor: '#4f46e5' }}>
              <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '10px' }}>
                She plans every week - sets and reps progressing - and you can change any of it after.
              </div>
              <input style={S.input} placeholder="Goal" value={buildAsk.goal}
                     onChange={e => setBuildAsk({ ...buildAsk, goal: e.target.value })} />
              <div style={S.row2}>
                <input style={S.input} type="number" placeholder="How many weeks" value={buildAsk.weeks}
                       onChange={e => setBuildAsk({ ...buildAsk, weeks: parseInt(e.target.value, 10) || 8 })} />
                <input style={S.input} type="number" placeholder="Sessions a week" value={buildAsk.per_week}
                       onChange={e => setBuildAsk({ ...buildAsk, per_week: parseInt(e.target.value, 10) || 3 })} />
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                {DAYS.map(d => (
                  <button key={d} style={{ ...S.chip(buildAsk.days.includes(d)), flex: 1 }}
                          onClick={() => setBuildAsk({ ...buildAsk,
                            days: buildAsk.days.includes(d) ? buildAsk.days.filter(x => x !== d) : [...buildAsk.days, d] })}>
                    {d}
                  </button>
                ))}
              </div>
              <textarea style={{ ...S.input, minHeight: '60px' }}
                        placeholder="Anything else - equipment, what to avoid, what to focus on"
                        value={buildAsk.criteria} onChange={e => setBuildAsk({ ...buildAsk, criteria: e.target.value })} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn(busy ? '#2a2a2a' : '#4f46e5')} onClick={buildProgramme} disabled={busy}>
                  {busy ? 'Building it...' : 'Build it'}
                </button>
                <button style={S.btn('#2a2a2a')} onClick={() => setBuildAsk(null)}>Cancel</button>
              </div>
            </div>
          )}

          {prog2 && (
            <div style={{ ...S.card, borderColor: '#4f46e5' }}>
              <div style={{ fontSize: '13px', color: '#ddd', lineHeight: 1.6, marginBottom: '10px' }}>
                {prog2.summary}
              </div>
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '8px' }}>
                {prog2.weeks.map(w => (
                  <button key={w.week} style={S.chip(showWeek === w.week)} onClick={() => setShowWeek(w.week)}>
                    W{w.week}
                  </button>
                ))}
              </div>
              {prog2.weeks.filter(w => w.week === showWeek).map(w => (
                <div key={w.week}>
                  <div style={{ fontSize: '12px', color: '#a5b4fc', marginBottom: '6px' }}>{w.focus}</div>
                  {(buildAsk.days || []).map(dy => {
                    const its = w.items.filter(i => i.day === dy);
                    if (!its.length) return null;
                    return (
                      <div key={dy} style={{ borderTop: '1px solid #262626', paddingTop: '8px', marginTop: '6px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#667eea' }}>{dy}</div>
                        {its.map((it, i) => (
                          <div key={i} style={{ fontSize: '13px', padding: '3px 0' }}>
                            {it.name} <span style={{ color: '#888' }}>{it.target_sets}×{it.target_reps}</span>
                            {it.note ? <span style={{ color: '#666', fontSize: '11px' }}> · {it.note}</span> : null}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button style={S.btn('#10b981')} onClick={keepProgramme}>Use this programme</button>
                <button style={S.btn('#2a2a2a')} onClick={buildProgramme}>Build another</button>
                <button style={S.btn('#2a2a2a')} onClick={() => { setProg2(null); setBuildAsk(null); }}>Cancel</button>
              </div>
            </div>
          )}

          {!editPlan && !ask && !buildAsk && !prog2 && (
            <button style={{ ...S.btn('#7c3aed'), marginBottom: '8px' }}
                    onClick={() => setAsk({ scope: 'session', criteria: '', days: [todayName()] })}>
              ✨ Ask Ami to build it
            </button>
          )}

          {ask && !sugg && (
            <div style={{ ...S.card, borderColor: '#7c3aed' }}>
              <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '10px' }}>
                Tell her what you want. She picks from your library and you decide what to keep.
              </div>
              <textarea style={{ ...S.input, minHeight: '70px' }}
                        placeholder="e.g. upper body, dumbbells only, 45 minutes, nothing heavy on the knee"
                        value={ask.criteria} onChange={e => setAsk({ ...ask, criteria: e.target.value })} />
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                {[['session', 'One session'], ['week', 'A whole week']].map(([k, l]) => (
                  <button key={k} style={{ ...S.chip(ask.scope === k), flex: 1 }}
                          onClick={() => setAsk({ ...ask, scope: k,
                            days: k === 'week' ? (plan && plan.days ? plan.days.split(',').filter(Boolean) : ['Mon', 'Wed', 'Fri']) : [todayName()] })}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                {DAYS.map(d => (
                  <button key={d} style={{ ...S.chip(ask.days.includes(d)), flex: 1 }}
                          onClick={() => setAsk({ ...ask,
                            days: ask.scope === 'session' ? [d]
                              : ask.days.includes(d) ? ask.days.filter(x => x !== d) : [...ask.days, d] })}>
                    {d}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn(busy ? '#2a2a2a' : '#7c3aed')} onClick={askAmi} disabled={busy}>
                  {busy ? 'She is thinking...' : 'Ask her'}
                </button>
                <button style={S.btn('#2a2a2a')} onClick={() => setAsk(null)}>Cancel</button>
              </div>
            </div>
          )}

          {sugg && (
            <div style={{ ...S.card, borderColor: '#7c3aed' }}>
              <div style={{ fontSize: '13px', color: '#ddd', lineHeight: 1.6, marginBottom: '12px' }}>
                {sugg.reason}
              </div>
              {sugg.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center',
                                      padding: '8px 0', borderTop: '1px solid #262626' }}>
                  <Figure kind={(ex.find(e => e.id === it.exercise_id) || {}).drawing} size={40} exId={it.exercise_id}
                            hasPhoto={(ex.find(e => e.id === it.exercise_id) || {}).has_photo}
                            hasClip={(ex.find(e => e.id === it.exercise_id) || {}).has_clip}
                            clipKind={(ex.find(e => e.id === it.exercise_id) || {}).clip_kind}
                            stamp={(ex.find(e => e.id === it.exercise_id) || {}).media_at} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                      {it.name} <span style={{ color: '#888', fontWeight: 400, fontSize: '12px' }}>
                        {it.day} · {it.target_sets}×{it.target_reps}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{it.why}</div>
                  </div>
                  <span style={S.knee(it.knee_load)}>
                    {it.knee_load === 'heavy' ? 'KNEE' : it.knee_load === 'light' ? 'LIGHT' : 'OK'}
                  </span>
                  <button style={S.icon} onClick={() => setSugg({ ...sugg,
                    items: sugg.items.filter((_, j) => j !== i) })}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button style={S.btn('#10b981')} onClick={() => keepSuggestion(false)}>Add to my plan</button>
                <button style={S.btn('#2a2a2a')} onClick={() => keepSuggestion(true)}>Replace those days</button>
                <button style={S.btn('#2a2a2a')} onClick={askAmi}>Try again</button>
                <button style={S.btn('#2a2a2a')} onClick={() => { setSugg(null); setAsk(null); }}>Cancel</button>
              </div>
            </div>
          )}

          {!editPlan && !ask && !sugg && (
            <button style={S.btn('#667eea')} onClick={() => setEditPlan(plan ? {
              id: plan.id, goal: plan.goal, weeks: plan.weeks,
              days: (plan.days || '').split(',').filter(Boolean),
              items: Object.entries(plan.by_day || {}).flatMap(([d, arr]) =>
                arr.map(a => ({ day: d, exercise_id: a.exercise_id, target_sets: a.target_sets, target_reps: a.target_reps })))
            } : { goal: 'Strength and size', weeks: 8, days: ['Mon', 'Wed', 'Fri'], items: [] })}>
              {plan ? 'Edit the plan' : 'Set up a plan'}
            </button>
          )}

          {editPlan && (
            <div style={S.card}>
              <input style={S.input} placeholder="Goal" value={editPlan.goal || ''}
                     onChange={e => setEditPlan({ ...editPlan, goal: e.target.value })} />
              <div style={S.row2}>
                <input style={S.input} type="number" placeholder="Weeks" value={editPlan.weeks || 8}
                       onChange={e => setEditPlan({ ...editPlan, weeks: parseInt(e.target.value, 10) || 8 })} />
                <div />
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                {DAYS.map(d => (
                  <button key={d} style={{ ...S.chip(editPlan.days.includes(d)), flex: 1 }}
                          onClick={() => setEditPlan({ ...editPlan,
                            days: editPlan.days.includes(d) ? editPlan.days.filter(x => x !== d) : [...editPlan.days, d] })}>
                    {d}
                  </button>
                ))}
              </div>
              {editPlan.days.map(d => (
                <div key={d} style={{ borderTop: '1px solid #262626', paddingTop: '10px', marginTop: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#667eea', marginBottom: '6px' }}>{d}</div>
                  {editPlan.items.filter(i => i.day === d).map((i, idx) => {
                    const x = ex.find(e => e.id === i.exercise_id) || {};
                    return (
                      <div key={d + idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ flex: 1, fontSize: '13px' }}>{x.name}</span>
                        <input style={{ ...S.input, width: '52px', marginBottom: 0 }} placeholder="sets"
                               value={i.target_sets || ''} onChange={e => setEditPlan({ ...editPlan,
                                 items: editPlan.items.map(z => z === i ? { ...z, target_sets: e.target.value } : z) })} />
                        <input style={{ ...S.input, width: '62px', marginBottom: 0 }} placeholder="reps"
                               value={i.target_reps || ''} onChange={e => setEditPlan({ ...editPlan,
                                 items: editPlan.items.map(z => z === i ? { ...z, target_reps: e.target.value } : z) })} />
                        <button style={S.icon} onClick={() => setEditPlan({ ...editPlan,
                          items: editPlan.items.filter(z => z !== i) })}>✕</button>
                      </div>
                    );
                  })}
                  <select style={{ ...S.input, marginTop: '4px' }} value=""
                          onChange={e => { if (!e.target.value) return;
                            setEditPlan({ ...editPlan, items: [...editPlan.items,
                              { day: d, exercise_id: parseInt(e.target.value, 10), target_sets: 3, target_reps: '8-12' }] }); }}>
                    <option value="">+ Add an exercise to {d}</option>
                    {ex.map(x => <option key={x.id} value={x.id}>
                      {x.name}{x.knee_load === 'heavy' ? ' (knee: heavy)' : ''}
                    </option>)}
                  </select>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button style={S.btn('#10b981')} onClick={savePlan}>Save the plan</button>
                <button style={S.btn('#2a2a2a')} onClick={() => setEditPlan(null)}>Cancel</button>
              </div>
            </div>
          )}

          {plan && !editPlan && !buildAsk && !prog2 && (() => {
            const wks = plan.weeks_planned || [1];
            const cur = showWeek || plan.week_number || 1;
            const dayMap = (plan.by_week || {})[cur] || {};
            return (
              <>
                {wks.length > 1 && (
                  <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', padding: '10px 0' }}>
                    {wks.map(w => (
                      <button key={w} style={S.chip(cur === w)} onClick={() => setShowWeek(w)}>
                        W{w}{w === plan.week_number ? ' •' : ''}
                      </button>
                    ))}
                  </div>
                )}
                {plan.progression && (
                  <div style={{ fontSize: '12px', color: '#aaa', lineHeight: 1.6, marginBottom: '10px' }}>
                    {plan.progression}
                  </div>
                )}
                {Object.keys(dayMap).map(d => (
                  <div key={d}>
                    <div style={S.label}>{d}</div>
                    {dayMap[d].map(it => (
                      <div key={it.id} style={{ ...S.card, display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Figure kind={it.drawing} size={52} exId={it.exercise_id}
                                hasPhoto={(ex.find(e => e.id === it.exercise_id) || {}).has_photo}
                                hasClip={(ex.find(e => e.id === it.exercise_id) || {}).has_clip}
                                clipKind={(ex.find(e => e.id === it.exercise_id) || {}).clip_kind}
                                stamp={(ex.find(e => e.id === it.exercise_id) || {}).media_at} />
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
                        </div>
                        <select style={{ ...S.input, width: '66px', marginBottom: 0, padding: '7px' }}
                                value={it.day} onChange={e => editItem(it.id, { day: e.target.value })}
                                title="Move it to another day">
                          {DAYS.map(dd => <option key={dd} value={dd}>{dd}</option>)}
                        </select>
                        <input style={{ ...S.input, width: '46px', marginBottom: 0, padding: '7px' }}
                               defaultValue={it.target_sets || ''}
                               onBlur={e => editItem(it.id, { target_sets: e.target.value })} />
                        <input style={{ ...S.input, width: '64px', marginBottom: 0, padding: '7px' }}
                               defaultValue={it.target_reps || ''}
                               onBlur={e => editItem(it.id, { target_reps: e.target.value })} />
                        <button style={S.small('#667eea')}
                                onClick={() => { setLogging({ ...it, id: it.exercise_id }); setForm({ done_on: today(), sets: it.target_sets, reps: it.target_reps }); }}>
                          Log
                        </button>
                        <button style={S.icon} onClick={() => dropItem(it.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                ))}
                {!Object.keys(dayMap).length && (
                  <div style={S.empty}>Nothing set for this day yet. Your plan runs by day - Monday's workout stays Monday's until you change it..</div>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* ---------------- LIBRARY ---------------- */}
      {view === 'library' && !logging && (
        <>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px' }}>
            {AREAS.map(([k, l]) => (
              <button key={k} style={S.chip(area === k)} onClick={() => setArea(k)}>{l}</button>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px', lineHeight: 1.5 }}>
            Knee marks show how much each movement loads or twists the knee. They're information, not advice —
            what's right for your knee is between you and your physio.
          </div>
          {shown.slice(0, showCount).map(x => ExCard(x, false))}
          {shown.length > showCount && (
            <button style={S.btn('#2a2a2a')} onClick={() => setShowCount(showCount + 12)}>
              Show more ({shown.length - showCount} left)
            </button>
          )}
          {showCount > 12 && (
            <button onClick={() => setShowCount(12)}
                    style={{ width: '100%', padding: '9px', marginTop: '6px',
                             background: 'transparent', color: '#6b6b7c',
                             border: '1px solid #2c2c3a', borderRadius: '8px',
                             fontSize: '12px', cursor: 'pointer' }}>
              Show less
            </button>
          )}
        </>
      )}

      {/* ---------------- PROGRESS ---------------- */}
      {view === 'progress' && !logging && (
        <>
          <div style={S.label}>Sessions per week</div>
          <div style={S.card}>
            {prog.weeks.length ? (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '70px' }}>
                {[...prog.weeks].reverse().map(w => (
                  <div key={w.wk} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: Math.max(4, w.days * 16) + 'px', background: '#667eea', borderRadius: '3px' }} />
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>{w.days}</div>
                  </div>
                ))}
              </div>
            ) : <div style={S.empty}>Nothing logged yet.</div>}
          </div>

          <div style={S.label}>Best lift, last 30 days</div>
          {prog.lifts.length ? prog.lifts.map(l => (
            <div key={l.exercise} style={{ ...S.card, display: 'flex', justifyContent: 'space-between',
                                           alignItems: 'center', padding: '10px 14px' }}>
              <span style={{ fontSize: '14px' }}>{l.exercise}</span>
              <span style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '15px', fontWeight: 700 }}>{l.best}lb</span>
                {l.change != null && (
                  <span style={{ fontSize: '11px', marginLeft: '8px', color: l.change > 0 ? '#10b981' : '#f59e0b' }}>
                    {l.change > 0 ? '+' : ''}{l.change} vs month before
                  </span>
                )}
              </span>
            </div>
          )) : <div style={S.empty}>Log a few sessions with weights and this fills in.</div>}

          <div style={{ fontSize: '11px', color: '#666', marginTop: '14px', lineHeight: 1.6 }}>
            Your gym assessments live in Health → Body. Ami sees both, so you can ask her how the training
            and the measurements line up.
          </div>
        </>
      )}
      <div style={{ height: '40px' }} />
    </div>
  );
}
