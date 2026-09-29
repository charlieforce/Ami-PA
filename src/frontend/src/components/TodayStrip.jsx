import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const AUTH = { 'X-Ami-Password': AMI_PASSWORD };

export default function TodayStrip({ onAsk }) {
  const [d, setD] = useState(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const pull = () => fetch(API + '/api/today', { headers: AUTH })
      .then(r => r.json()).then(j => { if (!j.error) setD(j); }).catch(() => {});
    pull();
    const t = setInterval(pull, 300000);
    return () => clearInterval(t);
  }, []);

  if (!d || hidden) return null;
  const nothing = !(d.next || []).length && !d.late && !(d.decide || []).length && !(d.goals || []).length;
  if (nothing) return null;

  const tap = (q) => { if (onAsk) onAsk(q); };
  const pill = {
    display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '7px 11px',
    background: '#202030', border: '1px solid #2e2e45', borderRadius: '14px',
    fontSize: '12px', color: '#d6d6e0', cursor: 'pointer', whiteSpace: 'nowrap',
    flexShrink: 0, minHeight: '34px', WebkitTapHighlightColor: 'transparent'
  };

  return (
    <div style={{ background: '#151520', borderBottom: '1px solid #26263a',
                  padding: '8px 10px 7px', position: 'sticky', top: 0, zIndex: 80,  
                  WebkitOverflowScrolling: 'touch' }}>
      <button onClick={() => setHidden(true)} title="Hide until next time"
              style={{ position: 'absolute', right: '2px', top: '2px', background: 'none',
                       border: 'none', color: '#4a4a5c', fontSize: '15px', cursor: 'pointer',
                       padding: '8px 10px', lineHeight: 1, zIndex: 2 }}>×</button>

      {(d.next || []).length > 0 && (
        <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', paddingRight: '22px',
                      scrollbarWidth: 'none', marginBottom: (d.late || (d.decide||[]).length) ? '7px' : 0 }}>
          {d.next.map((n, i) => (
            <div key={i} style={{ ...pill, borderColor: n.soon ? '#5a4a8a' : '#2e2e45',
                                  background: n.soon ? '#262040' : '#202030' }}
                 onClick={() => tap('tell me about ' + n.title)}>
              <span style={{ color: n.soon ? '#a78bfa' : '#8b8b9e', fontWeight: 700 }}>{n.at}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{n.title}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', paddingRight: '22px',
                    alignItems: 'center', scrollbarWidth: 'none' }}>
        {d.late && (
          <div style={{ ...pill, borderColor: '#5c3030', background: '#2a1d1d', color: '#f0a5a5' }}
               onClick={() => tap("what's overdue and which one matters most?")}>
            {d.late.count} late
            {d.late.days > 2 && <span style={{ color: '#8a6060' }}>· {d.late.days}d</span>}
          </div>
        )}

        {(d.decide || []).map((x, i) => (
          <div key={i} style={{ ...pill, borderColor: '#5c4a26', background: '#282018', color: '#e8c98a' }}
               onClick={() => tap(x.ask)}>
            {x.what}
          </div>
        ))}

        {(d.goals || []).length > 0 && (
          <div style={{ ...pill, gap: '8px' }} onClick={() => tap('how are my goals today?')}>
            {d.goals.map(g => {
              const done = g.done >= g.target;
              return (
                <span key={g.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%',
                                 background: g.excused ? '#4a4a5c' : done ? '#10b981'
                                   : g.done > 0 ? '#667eea' : '#3a3a4a' }} />
                  <span style={{ color: done ? '#10b981' : '#8b8b9e', fontSize: '11px' }}>
                    {g.name}{done ? ' done' : ' ' + g.done + '/' + g.target}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
