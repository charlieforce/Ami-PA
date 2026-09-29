import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };

const S = {
  wrap: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderLeft: '4px solid #f59e0b',
    borderRadius: '10px', padding: '14px', marginBottom: '16px'
  },
  head: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    cursor: 'pointer', minHeight: '40px', gap: '10px'
  },
  title: { fontSize: '14px', fontWeight: 700, color: '#f59e0b' },
  sub: { fontSize: '12px', color: '#888', marginTop: '2px' },
  pair: {
    background: '#141414', border: '1px solid #2a2a2a', borderRadius: '8px',
    padding: '12px', marginTop: '10px'
  },
  side: (chosen) => ({
    flex: 1, minWidth: 0, padding: '10px', borderRadius: '8px', cursor: 'pointer',
    background: chosen ? '#10b98118' : '#1e1e1e',
    border: '2px solid ' + (chosen ? '#10b981' : '#333')
  }),
  name: { fontSize: '13px', fontWeight: 600, color: '#eee', wordBreak: 'break-word' },
  date: { fontSize: '11px', color: '#888', marginTop: '2px' },
  btn: (bg) => ({
    padding: '9px 12px', minHeight: '40px', background: bg, color: '#fff',
    border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
  }),
  note: { fontSize: '11px', color: '#666', marginTop: '8px', lineHeight: 1.5 }
};

export default function BirthdayDuplicates({ onMerged }) {
  const [pairs, setPairs] = useState([]);
  const [open, setOpen] = useState(false);
  const [keepChoice, setKeepChoice] = useState({});
  const [dismissed, setDismissed] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const r = await fetch(`${API}/api/birthdays/possible-duplicates`, { headers: H });
      const j = await r.json();
      setPairs(j.pairs || []);
    } catch (e) { /* non-fatal */ }
  };

  useEffect(() => { load(); }, []);

  const key = (p) => `${p.a.id}-${p.b.id}`;

  const merge = async (p) => {
    const chosen = keepChoice[key(p)] || p.a.id;
    const other = chosen === p.a.id ? p.b.id : p.a.id;
    setBusy(true);
    try {
      await fetch(`${API}/api/birthdays/merge`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ keep_id: chosen, drop_id: other })
      });
      await load();
      if (onMerged) onMerged();
    } catch (e) { /* non-fatal */ }
    setBusy(false);
  };

  const live = pairs.filter(p => !dismissed.includes(key(p)));
  if (live.length === 0) return null;

  return (
    <div style={S.wrap}>
      <div style={S.head} onClick={() => setOpen(!open)}>
        <div>
          <div style={S.title}>
            {live.length} {live.length === 1 ? 'pair' : 'pairs'} might be the same person
          </div>
          <div style={S.sub}>Tap to look through them</div>
        </div>
        <span style={{ color: '#f59e0b', fontSize: '18px' }}>{open ? '−' : '+'}</span>
      </div>

      {open && live.map(p => {
        const k = key(p);
        const chosen = keepChoice[k] || p.a.id;
        return (
          <div key={k} style={S.pair}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={S.side(chosen === p.a.id)}
                   onClick={() => setKeepChoice({ ...keepChoice, [k]: p.a.id })}>
                <div style={S.name}>{p.a.name}</div>
                <div style={S.date}>{p.a.date}</div>
              </div>
              <div style={S.side(chosen === p.b.id)}
                   onClick={() => setKeepChoice({ ...keepChoice, [k]: p.b.id })}>
                <div style={S.name}>{p.b.name}</div>
                <div style={S.date}>{p.b.date}</div>
              </div>
            </div>

            {!p.same_date && (
              <div style={S.note}>
                Different dates — so these are probably two people. Only merge if you know otherwise.
              </div>
            )}
            {p.same_date && (
              <div style={{ ...S.note, color: '#10b981' }}>
                Same date — very likely the same person.
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button style={S.btn('#10b981')} onClick={() => merge(p)} disabled={busy}>
                Merge, keep the one selected
              </button>
              <button style={S.btn('#2a2a2a')}
                      onClick={() => setDismissed([...dismissed, k])}>
                Different people
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
