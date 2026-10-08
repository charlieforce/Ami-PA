import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const PW = import.meta.env.VITE_API_PASSWORD || 'charlie';
const AUTH = { 'X-Ami-Password': PW };
const H = { 'Content-Type': 'application/json', ...AUTH };

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday',
              'friday', 'saturday', 'sunday'];

const S = {
  wrap: { padding: '14px 12px 40px', color: '#e8e8f0' },
  card: {
    background: '#17171f', border: '1px solid #26262f', borderRadius: '10px',
    padding: '13px', marginBottom: '10px',
  },
  label: {
    fontSize: '11px', color: '#777', textTransform: 'uppercase',
    letterSpacing: '0.6px', fontWeight: 700, margin: '16px 0 8px',
  },
  input: {
    width: '100%', padding: '10px 12px', background: '#0f0f16',
    border: '1px solid #2c2c3a', borderRadius: '8px', color: '#e8e8f0',
    fontSize: '13px', boxSizing: 'border-box', minHeight: '90px',
  },
  btn: (bg) => ({
    padding: '10px 15px', background: bg, color: '#fff', border: 'none',
    borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600,
  }),
  chip: (on) => ({
    padding: '6px 12px', borderRadius: '15px', fontSize: '12px', cursor: 'pointer',
    border: '1px solid ' + (on ? '#4f46e5' : '#2c2c3a'),
    background: on ? '#1d1d3a' : 'transparent',
    color: on ? '#a5a5ff' : '#888', flexShrink: 0, fontWeight: 600,
  }),
};

export default function PlanTab() {
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(null);
  const [plan, setPlan] = useState(null);
  const [week, setWeek] = useState(1);
  const [asking, setAsking] = useState(false);
  const [words, setWords] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const loadList = async () => {
    try {
      const r = await fetch(API + '/api/fitness/plans', { headers: AUTH });
      const j = await r.json();
      setPlans(j.plans || []);
      if (!open && (j.plans || []).length) setOpen(j.plans[0].id);
    } catch (e) { setErr(String(e)); }
  };

  const loadPlan = async (id) => {
    setPlan(null);
    try {
      const r = await fetch(API + '/api/fitness/plan/' + id, { headers: AUTH });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setPlan(j); setWeek(1);
    } catch (e) { setErr(String(e)); }
  };

  useEffect(() => { loadList(); }, []);
  useEffect(() => { if (open) loadPlan(open); }, [open]);

  const build = async () => {
    if (words.trim().length < 10) return;
    setBusy(true); setErr('');
    try {
      const r = await fetch(API + '/api/fitness/plan-from-words', {
        method: 'POST', headers: H, body: JSON.stringify({ prompt: words.trim() }) });
      const j = await r.json();
      if (j.error) { setErr(j.error); setBusy(false); return; }
      setWords(''); setAsking(false);
      await loadList();
      setOpen(j.plan_id);
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const weeks = plan ? Object.keys(plan.by_week || {}).map(Number).sort((a, b) => a - b) : [];
  const thisWeek = plan ? (plan.by_week || {})[String(week)] || {} : {};
  const dayNames = Object.keys(thisWeek).sort(
    (a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));

  return (
    <div style={S.wrap}>
      {err && (
        <div style={{ ...S.card, borderColor: '#5f2a2a', color: '#f0a5a5', fontSize: '13px' }}>
          {err}
        </div>
      )}

      {/* ask her for one */}
      {!asking ? (
        <button style={{ ...S.btn('#4f46e5'), width: '100%', marginBottom: '14px' }}
                onClick={() => setAsking(true)}>
          Ask Ami for a plan
        </button>
      ) : (
        <div style={S.card}>
          <textarea style={S.input} value={words} autoFocus
                    placeholder={'Which days, how long, anything to watch. For example:\n\n'
                      + '"Monday, Wednesday, Friday and Saturday. Easy on Friday because '
                      + 'Saturday follows. Stretch and cardio every day. Three months."'}
                    onChange={e => setWords(e.target.value)} />
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button style={S.btn('#4f46e5')} onClick={build} disabled={busy}>
              {busy ? 'She is working...' : 'Build it'}
            </button>
            <button style={S.btn('#2a2a35')} onClick={() => setAsking(false)}>Cancel</button>
          </div>
          <div style={{ fontSize: '11px', color: '#777', marginTop: '8px' }}>
            She only uses exercises already in your library, and leaves out anything
            hard on your knees.
          </div>
        </div>
      )}

      {/* which plan */}
      {plans.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '12px' }}>
          {plans.map(p => (
            <button key={p.id} style={S.chip(p.id === open)} onClick={() => setOpen(p.id)}>
              {p.goal}
            </button>
          ))}
        </div>
      )}

      {plans.length === 0 && !asking && (
        <div style={{ fontSize: '13px', color: '#777' }}>
          No plan yet. Ask her for one.
        </div>
      )}

      {/* the plan itself */}
      {plan && (
        <>
          <div style={{ fontSize: '17px', fontWeight: 700 }}>{plan.plan.name}</div>
          <div style={{ fontSize: '12px', color: '#8b8b9e', marginTop: '2px' }}>
            {plan.plan.weeks} weeks &middot; started {String(plan.plan.started || '').slice(0, 10)}
          </div>

          {weeks.length > 1 && (
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto',
                          margin: '12px 0' }}>
              {weeks.map(w => (
                <button key={w} style={S.chip(w === week)} onClick={() => setWeek(w)}>
                  Week {w}
                </button>
              ))}
            </div>
          )}

          {dayNames.length === 0 && (
            <div style={{ fontSize: '13px', color: '#777', marginTop: '12px' }}>
              Nothing in this week.
            </div>
          )}

          {dayNames.map(day => (
            <div key={day} style={S.card}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px',
                            textTransform: 'capitalize' }}>
                {day}
                <span style={{ fontSize: '11px', color: '#777', fontWeight: 400 }}>
                  {'  ' + thisWeek[day].length + ' movements'}
                </span>
              </div>
              {thisWeek[day].map((x, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                      gap: '10px', padding: '7px 0',
                                      borderBottom: i === thisWeek[day].length - 1
                                        ? 'none' : '1px solid #1f1f28' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px' }}>{x.name}</div>
                    {x.note && (
                      <div style={{ fontSize: '11px', color: '#777' }}>{x.note}</div>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#8b8b9e', whiteSpace: 'nowrap' }}>
                    {x.sets ? x.sets + ' \u00d7 ' : ''}{x.reps}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
