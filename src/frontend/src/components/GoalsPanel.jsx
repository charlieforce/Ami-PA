import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const AUTH = { 'X-Ami-Password': AMI_PASSWORD };
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const S = {
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
          padding: '14px', marginBottom: '10px' },
  input: { width: '100%', padding: '10px', fontSize: '16px', background: '#141414', color: '#eee',
           border: '1px solid #333', borderRadius: '8px', marginBottom: '8px', boxSizing: 'border-box' },
  btn: (bg) => ({ padding: '11px', minHeight: '44px', background: bg, color: '#fff', border: 'none',
                  borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%' }),
  small: (bg) => ({ padding: '7px 11px', minHeight: '36px', background: bg, color: '#fff', border: 'none',
                    borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }),
  chip: (on) => ({ flex: 1, padding: '7px 2px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
                   border: '1px solid ' + (on ? '#667eea' : '#2a2a2a'),
                   background: on ? '#667eea22' : '#141414', color: on ? '#fff' : '#888', fontWeight: 600 }),
  icon: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '13px', padding: '4px 6px' },
  label: { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
           fontWeight: 700, margin: '18px 0 8px' },
};

export default function GoalsPanel() {
  const [goals, setGoals] = useState([]);
  const [quick, setQuick] = useState({});
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  const load = () => fetch(API + '/api/fitness/goals', { headers: AUTH })
    .then(r => r.json()).then(j => setGoals(j.goals || [])).catch(e => setErr(String(e)));
  useEffect(() => { load(); }, []);

  const add = async (g, amount) => {
    if (!amount) return;
    await fetch(API + '/api/fitness/goals/' + g.id + '/log', { method: 'POST', headers: H,
      body: JSON.stringify({ amount }) });
    setQuick({ ...quick, [g.id]: '' });
    load();
  };

  const save = async () => {
    const r = await fetch(API + '/api/fitness/goals', { method: 'POST', headers: H,
      body: JSON.stringify(editing) });
    const j = await r.json();
    if (j.error) setErr(j.error); else { setEditing(null); load(); }
  };

  return (
    <div>
      {err && <div style={{ background: '#7f1d1d', padding: '9px', borderRadius: '6px',
                            fontSize: '13px', marginBottom: '10px' }}>{err}</div>}

      {goals.filter(g => g.active).map(g => {
        const st = g.state || {};
        const pct = g.target ? Math.min(100, Math.round(st.done / g.target * 100)) : 0;
        const met = st.done >= g.target;
        return (
          <div key={g.id} style={{ ...S.card, borderLeft: '4px solid ' + (met ? '#10b981' : st.excused ? '#555' : '#667eea') }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>
                {g.name}
                <span style={{ fontSize: '11px', color: '#777', fontWeight: 400 }}>
                  {' '}{g.per === 'day' ? 'every ' + (g.days || 'day').replace(/,/g, ' ') : 'per week'}
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: met ? '#10b981' : '#eee' }}>
                {Math.round(st.done || 0)}<span style={{ color: '#666', fontSize: '12px' }}>/{Math.round(g.target)}</span>
              </div>
            </div>

            {st.excused ? (
              <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>Excused today — you're not well.</div>
            ) : (
              <>
                <div style={{ height: '7px', background: '#232323', borderRadius: '4px', marginTop: '9px' }}>
                  <div style={{ width: pct + '%', height: '100%', borderRadius: '4px',
                                background: met ? '#10b981' : '#667eea', transition: 'width .3s' }} />
                </div>
                {!met && st.left > 0 && (
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                    {Math.round(st.left)} to go
                  </div>
                )}
              </>
            )}

            {g.per === 'day' && (
              <div style={{ display: 'flex', gap: '3px', marginTop: '10px' }}>
                {(g.week || []).map(d => (
                  <div key={d.date} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: '26px', borderRadius: '4px', display: 'flex', alignItems: 'center',
                                  justifyContent: 'center', fontSize: '9px', fontWeight: 700,
                                  color: d.done >= g.target ? '#052e16' : '#777',
                                  background: d.excused ? '#2a2a2a'
                                    : d.done >= g.target ? '#10b981'
                                    : d.done > 0 ? '#3b3f66'
                                    : d.target_day ? '#241f1f' : '#1c1c1c' }}>
                      {d.excused ? '~' : d.done > 0 ? Math.round(d.done) : ''}
                    </div>
                    <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>{d.day}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '6px', marginTop: '11px', alignItems: 'center' }}>
              {g.per === 'day' ? (
                <>
                  {[10, 20, 25, 50].map(n => (
                    <button key={n} style={S.small('#2a2a2a')} onClick={() => add(g, n)}>+{n}</button>
                  ))}
                  <input style={{ ...S.input, marginBottom: 0, width: '62px', padding: '8px' }}
                         type="number" inputMode="numeric" placeholder="..."
                         value={quick[g.id] || ''}
                         onChange={e => setQuick({ ...quick, [g.id]: e.target.value })}
                         onKeyDown={e => { if (e.key === 'Enter') add(g, Number(quick[g.id])); }} />
                  <button style={S.small('#667eea')} onClick={() => add(g, Number(quick[g.id]))}>Add</button>
                </>
              ) : (
                <button style={S.small('#667eea')} onClick={() => add(g, 1)}>+ A session</button>
              )}
              <button style={S.icon} onClick={() => setEditing({ ...g, days: (g.days || '').split(',').filter(Boolean) })}>✎</button>
            </div>

            {(g.badges || []).length > 0 && (
              <div style={{ fontSize: '11px', color: '#fcd34d', marginTop: '9px' }}>
                {g.badges.map(b => b.badge + ' (' + Math.round(b.amount) + ')').join(' · ')}
              </div>
            )}
          </div>
        );
      })}

      {editing && (
        <div style={{ ...S.card, borderColor: '#667eea' }}>
          <input style={S.input} placeholder="Name" value={editing.name || ''}
                 onChange={e => setEditing({ ...editing, name: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '8px' }}>
            <input style={S.input} type="number" placeholder="How many" value={editing.target || ''}
                   onChange={e => setEditing({ ...editing, target: e.target.value })} />
            <select style={S.input} value={editing.per}
                    onChange={e => setEditing({ ...editing, per: e.target.value })}>
              <option value="day">a day</option>
              <option value="week">a week</option>
            </select>
          </div>
          {editing.per === 'day' && (
            <div style={{ display: 'flex', gap: '3px', marginBottom: '9px' }}>
              {DAYS.map(d => (
                <button key={d} style={S.chip((editing.days || []).includes(d))}
                        onClick={() => setEditing({ ...editing,
                          days: (editing.days || []).includes(d)
                            ? editing.days.filter(x => x !== d) : [...(editing.days || []), d] })}>
                  {d}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={S.btn('#10b981')} onClick={save}>Save</button>
            {editing.id && (
              <button style={S.btn('#3f1d1d')} onClick={async () => {
                if (!window.confirm('Drop ' + editing.name + '?')) return;
                await fetch(API + '/api/fitness/goals/' + editing.id, { method: 'DELETE', headers: AUTH });
                setEditing(null); load();
              }}>Drop it</button>
            )}
            <button style={S.btn('#2a2a2a')} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </div>
      )}

      {!editing && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button style={S.btn('#2a2a2a')}
                  onClick={() => setEditing({ name: '', target: 50, per: 'day', days: ['Mon','Tue','Wed','Thu','Fri'], kind: 'reps' })}>
            + Another goal
          </button>
          <button style={S.btn('#2a2a2a')} onClick={async () => {
            await fetch(API + '/api/fitness/goals/excuse', { method: 'POST', headers: H,
              body: JSON.stringify({ reason: 'not well' }) });
            load();
          }}>Not well today</button>
        </div>
      )}
    </div>
  );
}
