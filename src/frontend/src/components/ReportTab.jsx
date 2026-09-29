import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };

const S = {
  wrap: { padding: '12px', color: '#eee', maxWidth: '760px', margin: '0 auto' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '10px', marginBottom: '14px', flexWrap: 'wrap' },
  h1: { margin: 0, fontSize: '20px', fontWeight: 700 },
  toggle: (on) => ({
    padding: '9px 14px', minHeight: '42px', borderRadius: '8px', border: 'none',
    background: on ? '#667eea' : '#2a2a2a', color: '#fff',
    fontSize: '13px', fontWeight: on ? 700 : 500, cursor: 'pointer'
  }),
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a',
          borderRadius: '10px', padding: '14px', marginBottom: '10px' },
  label: { fontSize: '11px', color: '#888', textTransform: 'uppercase',
           letterSpacing: '0.5px', marginTop: '20px', marginBottom: '8px', fontWeight: 700 },
  big: { fontSize: '28px', fontWeight: 700, lineHeight: 1 },
  small: { fontSize: '11px', color: '#888', marginTop: '3px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
         padding: '10px 0', borderBottom: '1px solid #222', gap: '10px', fontSize: '14px' },
  read: { background: '#1a1a2e', border: '1px solid #2d2d4a', borderLeft: '4px solid #667eea',
          borderRadius: '10px', padding: '16px', marginBottom: '16px',
          fontSize: '14px', lineHeight: 1.75, whiteSpace: 'pre-wrap' },
  btn: (bg) => ({ padding: '12px', minHeight: '46px', background: bg, color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '14px',
                  fontWeight: 600, cursor: 'pointer' }),
  warn: { color: '#f87171' },
  good: { color: '#10b981' },
  empty: { fontSize: '13px', color: '#666', padding: '8px 0' }
};

const Bar = ({ value, max, colour }) => (
  <div style={{ flex: 1, height: '8px', background: '#2a2a2a', borderRadius: '4px', overflow: 'hidden' }}>
    <div style={{ width: max > 0 ? Math.round((value / max) * 100) + '%' : '0%',
                  height: '100%', background: colour, borderRadius: '4px' }} />
  </div>
);

export default function ReportTab() {
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState(null);
  const [read, setRead] = useState('');
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState(false);
  const [err, setErr] = useState('');

  const load = async (p) => {
    setLoading(true); setRead(''); setErr('');
    try {
      const r = await fetch(`${API}/api/report?period=${p}`, { headers: H });
      const j = await r.json();
      if (j.error) setErr(j.error); else setData(j);
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  };

  useEffect(() => { load(period); }, [period]);

  const getRead = async () => {
    if (!data) return;
    setReading(true);
    try {
      const r = await fetch(`${API}/api/report/read`, {
        method: 'POST', headers: H, body: JSON.stringify({ report: data })
      });
      const j = await r.json();
      setRead(j.read || j.error || 'No read available.');
    } catch (e) { setRead('Could not get her read: ' + String(e)); }
    setReading(false);
  };

  const download = () => {
    if (!data) return;
    const L = [];
    L.push(`# Work report - last ${data.days} days`);
    L.push(`Generated ${String(data.generated_at).slice(0, 16).replace('T', ' ')}`);
    L.push('');
    if (read) { L.push('## What this says'); L.push(read); L.push(''); }
    L.push('## Movement');
    L.push(`- Completed: ${data.movement.completed} (previous period: ${data.movement.completed_previous})`);
    L.push(`- Started: ${data.movement.started}`);
    L.push(`- Created: ${data.movement.created}`);
    L.push(`- Net change to the pile: ${data.movement.net > 0 ? '+' : ''}${data.movement.net}`);
    L.push('');
    L.push('## Where the attention went');
    Object.entries(data.attention || {}).forEach(([k, v]) => L.push(`- ${k}: ${v} completed`));
    if ((data.neglected || []).length) {
      L.push('');
      L.push('## Open work, nothing finished');
      data.neglected.forEach(v => L.push(`- ${v}`));
    }
    if ((data.stale || []).length) {
      L.push('');
      L.push('## Sitting untouched');
      data.stale.forEach(t => L.push(`- ${t.title} (${t.days} days, ${t.venture})`));
    }
    if ((data.slipping || []).length) {
      L.push('');
      L.push('## Keeps slipping');
      data.slipping.forEach(t => L.push(`- ${t.title} - moved ${t.times} times`));
    }
    if ((data.overdue || []).length) {
      L.push('');
      L.push('## Overdue');
      data.overdue.forEach(t => L.push(`- ${t.title} (due ${t.due})`));
    }
    L.push('');
    L.push('## Does captured work get done?');
    Object.entries(data.by_source || {}).forEach(([k, v]) =>
      L.push(`- ${k}: ${v.done} of ${v.total} completed`));

    const blob = new Blob([L.join('\n')], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `work-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
  };

  if (loading) return <div style={S.wrap}>Working it out…</div>;
  if (err) return <div style={S.wrap}>⚠️ {err}</div>;
  if (!data) return <div style={S.wrap}>Nothing to report yet.</div>;

  const m = data.movement;
  const trend = m.completed - m.completed_previous;
  const maxAttention = Math.max(1, ...Object.values(data.attention || {}));

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <h1 style={S.h1}>📊 What's actually happening</h1>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button style={S.toggle(period === 'week')} onClick={() => setPeriod('week')}>Week</button>
          <button style={S.toggle(period === 'month')} onClick={() => setPeriod('month')}>Month</button>
        </div>
      </div>

      {read ? (
        <div style={S.read}>
          <button onClick={() => setRead('')}
            style={{ float: 'right', background: 'none', border: 'none', color: '#888',
                     fontSize: '20px', cursor: 'pointer', padding: '0 0 8px 12px', lineHeight: 1 }}>
            ×
          </button>
          {read}
        </div>
      ) : (
        <button style={{ ...S.btn('#667eea'), width: '100%', marginBottom: '16px' }}
                onClick={getRead} disabled={reading}>
          {reading ? '⏳ Ami is reading it…' : "Ask Ami what this says"}
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <div style={S.card}>
          <div style={{ ...S.big, color: '#10b981' }}>{m.completed}</div>
          <div style={S.small}>finished</div>
          {m.completed_previous > 0 && (
            <div style={{ ...S.small, color: trend >= 0 ? '#10b981' : '#f87171' }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)} vs last
            </div>
          )}
        </div>
        <div style={S.card}>
          <div style={{ ...S.big, color: '#f59e0b' }}>{m.started}</div>
          <div style={S.small}>started</div>
        </div>
        <div style={S.card}>
          <div style={{ ...S.big, color: m.net > 0 ? '#f87171' : '#10b981' }}>
            {m.net > 0 ? '+' : ''}{m.net}
          </div>
          <div style={S.small}>net to the pile</div>
        </div>
      </div>

      {m.net > 3 && (
        <div style={{ ...S.card, borderLeft: '4px solid #f87171' }}>
          <span style={S.warn}>You added {m.created} and finished {m.completed}.</span>{' '}
          The pile is growing faster than you're clearing it.
        </div>
      )}

      <div style={S.label}>Where the work actually went</div>
      {Object.keys(data.attention || {}).length === 0 ? (
        <div style={S.empty}>Nothing completed this period.</div>
      ) : (
        Object.entries(data.attention).sort((a, b) => b[1] - a[1]).map(([name, n]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', width: '110px', flexShrink: 0 }}>{name}</span>
            <Bar value={n} max={maxAttention} colour="#667eea" />
            <span style={{ fontSize: '13px', width: '24px', textAlign: 'right' }}>{n}</span>
          </div>
        ))
      )}

      {(data.neglected || []).length > 0 && (
        <>
          <div style={S.label}>Open work, nothing finished</div>
          {data.neglected.map(v => (
            <div key={v} style={{ ...S.card, borderLeft: '4px solid #f59e0b', marginBottom: '6px' }}>
              <strong>{v}</strong>
              <div style={S.small}>
                {data.open_by_venture[v]} open, none completed in this period
              </div>
            </div>
          ))}
        </>
      )}

      {(data.slipping || []).length > 0 && (
        <>
          <div style={S.label}>Keeps slipping</div>
          {data.slipping.map(t => (
            <div key={t.id} style={S.row}>
              <span>{t.title}</span>
              <span style={{ ...S.warn, fontSize: '12px', whiteSpace: 'nowrap' }}>
                moved {t.times}×
              </span>
            </div>
          ))}
        </>
      )}

      {(data.stale || []).length > 0 && (
        <>
          <div style={S.label}>Sitting untouched</div>
          {data.stale.map(t => (
            <div key={t.id} style={S.row}>
              <span style={{ minWidth: 0 }}>{t.title}</span>
              <span style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap' }}>
                {t.days}d
              </span>
            </div>
          ))}
        </>
      )}

      {(data.stuck || []).length > 0 && (
        <>
          <div style={S.label}>Started but past its date</div>
          {data.stuck.map(t => (
            <div key={t.id} style={S.row}>
              <span>{t.title}</span>
              <span style={{ ...S.warn, fontSize: '12px', whiteSpace: 'nowrap' }}>{t.due}</span>
            </div>
          ))}
        </>
      )}

      <div style={S.label}>Does captured work get done?</div>
      {Object.entries(data.by_source || {}).map(([src, v]) => {
        const pct = v.total > 0 ? Math.round((v.done / v.total) * 100) : 0;
        const nice = src === 'from_notes' ? 'From notes'
          : src === 'from_ami' ? 'From chat with Ami' : 'Created by hand';
        return (
          <div key={src} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', width: '140px', flexShrink: 0 }}>{nice}</span>
            <Bar value={v.done} max={v.total} colour={pct >= 50 ? '#10b981' : pct >= 20 ? '#f59e0b' : '#f87171'} />
            <span style={{ fontSize: '12px', color: '#888', width: '52px', textAlign: 'right' }}>
              {v.done}/{v.total}
            </span>
          </div>
        );
      })}

      <div style={S.label}>Todos</div>
      <div style={S.card}>
        {data.todos.completed} done · <span style={S.warn}>{data.todos.missed} never got done</span> · {data.todos.total} total
      </div>

      <div style={S.label}>What you captured</div>
      <div style={S.card}>
        {Object.entries(data.notes || {}).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'Nothing written down this period.'}
      </div>

      <button style={{ ...S.btn('#2a2a2a'), width: '100%', marginTop: '20px' }} onClick={download}>
        ⬇️ Save this report
      </button>

      <div style={{ height: '40px' }} />
    </div>
  );
}
