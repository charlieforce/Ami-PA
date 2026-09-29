import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };
const CYCLES = [['weekly', 'week'], ['monthly', 'month'], ['quarterly', 'quarter'], ['yearly', 'year']];
const PER_MONTH = { weekly: 52 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

const S = {
  wrap: { padding: '12px', color: '#eee', maxWidth: '640px', margin: '0 auto' },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px', marginBottom: '10px' },
  input: { width: '100%', padding: '11px', fontSize: '16px', background: '#141414', color: '#eee',
           border: '1px solid #333', borderRadius: '8px', boxSizing: 'border-box', marginBottom: '8px' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  btn: (bg) => ({ padding: '12px', minHeight: '46px', background: bg, color: '#fff', border: 'none',
                  borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%' }),
  small: (bg) => ({ padding: '8px 12px', minHeight: '38px', background: bg, color: '#fff', border: 'none',
                    borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }),
  label: { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
           fontWeight: 700, margin: '18px 0 8px' }
};

const money = (n) => '$' + Number(n || 0).toFixed(2);
const empty = { name: '', amount: '', cycle: 'monthly', next_renewal: '', paid_with: '', category: '', cancel_url: '' };

export default function SubscriptionsTab() {
  const [subs, setSubs] = useState([]);
  const [cancelling, setCancelling] = useState(null);
  const [form, setForm] = useState(null);
  const [showCancelled, setShowCancelled] = useState(false);

  const load = async () => {
    try {
      const r = await fetch(API + '/api/subscriptions', { headers: H });
      const j = await r.json();
      setSubs(j.subscriptions || []);
    } catch (e) { /* non-fatal */ }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim() || form.amount === '') return;
    const body = { ...form, currency: 'USD' };
    if (form.id) {
      await fetch(API + '/api/subscriptions/' + form.id, { method: 'PUT', headers: H, body: JSON.stringify(body) });
    } else {
      await fetch(API + '/api/subscriptions', { method: 'POST', headers: H, body: JSON.stringify(body) });
    }
    setForm(null); load();
  };

  const setStatus = async (s, status, why) => {
    await fetch(API + '/api/subscriptions/' + s.id, { method: 'PUT', headers: H, body: JSON.stringify({ status, cancel_reason: why || undefined, cancelled_on: status === 'cancelled' ? new Date().toISOString().slice(0, 10) : null }) });
    load();
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete ${s.name} completely? Marking it cancelled keeps the record.`)) return;
    await fetch(API + '/api/subscriptions/' + s.id, { method: 'DELETE', headers: H });
    load();
  };

  const active = subs.filter(s => s.status === 'active');
  const cancelled = subs.filter(s => s.status !== 'active');
  const monthly = active.reduce((t, s) => t + (s.amount || 0) * (PER_MONTH[s.cycle] || 1), 0);
  const saved = cancelled.reduce((t, s) => t + (s.amount || 0) * (PER_MONTH[s.cycle] || 1) * 12, 0);
  const soon = active.filter(s => s.days_until != null && s.days_until <= 7);

  const dueColour = (d) => d == null ? '#888' : d <= 1 ? '#f87171' : d <= 3 ? '#f59e0b' : '#888';
  const dueText = (d) => d == null ? 'no date set' : d === 0 ? 'renews today'
    : d === 1 ? 'renews tomorrow' : 'renews in ' + d + ' days';

  const Form = () => (
    <div style={{ ...S.card, borderColor: '#667eea' }}>
      <input style={S.input} placeholder="What is it (Netflix, Notion...)" value={form.name}
             onChange={e => setForm({ ...form, name: e.target.value })} />
      <div style={S.row2}>
        <input style={S.input} type="number" step="0.01" placeholder="Amount in USD" value={form.amount}
               onChange={e => setForm({ ...form, amount: e.target.value })} />
        <select style={S.input} value={form.cycle} onChange={e => setForm({ ...form, cycle: e.target.value })}>
          {CYCLES.map(([v, l]) => <option key={v} value={v}>Every {l}</option>)}
        </select>
      </div>
      <div style={S.row2}>
        <input style={S.input} type="date" value={form.next_renewal || ''}
               onChange={e => setForm({ ...form, next_renewal: e.target.value })} />
        <input style={S.input} placeholder="Paid with (Visa 4417)" value={form.paid_with || ''}
               onChange={e => setForm({ ...form, paid_with: e.target.value })} />
      </div>
      <input style={S.input} placeholder="Category (work, entertainment...)" value={form.category || ''}
             onChange={e => setForm({ ...form, category: e.target.value })} />
      <input style={S.input} placeholder="Cancel link (optional)" value={form.cancel_url || ''}
             onChange={e => setForm({ ...form, cancel_url: e.target.value })} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button style={S.btn('#10b981')} onClick={save}>{form.id ? 'Save changes' : 'Add'}</button>
        <button style={S.btn('#2a2a2a')} onClick={() => setForm(null)}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div style={S.wrap}>
      <h1 style={{ margin: '0 0 14px 0', fontSize: '20px', fontWeight: 700 }}>💳 Subscriptions</h1>

      <div style={{ ...S.card, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#667eea' }}>{money(monthly)}</div>
          <div style={{ fontSize: '11px', color: '#888' }}>a month · {money(monthly * 12)} a year</div>
        </div>
        <div style={{ fontSize: '12px', color: '#888', textAlign: 'right' }}>
          {active.length} active
          {soon.length > 0 && <div style={{ color: '#f59e0b' }}>{soon.length} renewing this week</div>}
        </div>
      </div>

      {form ? Form() : (
        <button style={{ ...S.btn('#667eea'), marginBottom: '10px' }} onClick={() => setForm({ ...empty })}>
          + Add a subscription
        </button>
      )}

      {active.length === 0 && !form && (
        <div style={{ color: '#666', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
          Nothing tracked yet. Add them as you find them on your statements.
        </div>
      )}

      {active.map(s => (
        <div key={s.id} style={{ ...S.card, borderLeft: '4px solid ' + dueColour(s.days_until) }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: '12px', color: dueColour(s.days_until), marginTop: '2px' }}>
                {dueText(s.days_until)}{s.next_renewal ? ' · ' + String(s.next_renewal).slice(0, 10) : ''}
              </div>
              <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>
                {[s.paid_with, s.category].filter(Boolean).join(' · ')}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{money(s.amount)}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                per {(CYCLES.find(c => c[0] === s.cycle) || ['', 'month'])[1]}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
            {s.cancel_url && (
              <a href={s.cancel_url} target="_blank" rel="noreferrer"
                 style={{ ...S.small('#7f1d1d'), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                Cancel it ↗
              </a>
            )}
            <button style={S.small('#2a2a2a')} onClick={() => {
              const why = window.prompt('Cancelling ' + s.name + ' - why? (for your record)');
              if (why === null) return;
              setStatus(s, 'cancelled', why);
            }}>Mark cancelled</button>
            <button style={S.small('#2a2a2a')} onClick={() => setForm({ ...empty, ...s })}>Edit</button>
            <button style={{ ...S.small('transparent'), color: '#777' }} onClick={() => remove(s)}>✕</button>
          </div>
        </div>
      ))}

      {cancelled.length > 0 && (
        <>
          <div style={{ ...S.label, cursor: 'pointer' }} onClick={() => setShowCancelled(!showCancelled)}>
            Cancelled ({cancelled.length}) · saving {money(saved)} a year {showCancelled ? '▴' : '▾'}
          </div>
          {showCancelled && cancelled.map(s => (
            <div key={s.id} style={{ ...S.card, opacity: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', textDecoration: 'line-through' }}>{s.name}</div>
                {s.cancelled_on && (
                  <div style={{ fontSize: '11px', color: '#f0a5a5' }}>
                    Cancelled {String(s.cancelled_on).slice(0, 10)}
                  </div>
                )}
                {s.cancel_reason && (
                  <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>{s.cancel_reason}</div>
                )}
                <div style={{ fontSize: '11px', color: '#888' }}>{money(s.amount)} per {(CYCLES.find(c => c[0] === s.cycle) || ['', 'month'])[1]}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button style={S.small('#2a2a2a')} onClick={() => setStatus(s, 'active')}>Restart</button>
                <button style={S.small('#3f1d1d')} onClick={() => remove(s)}>Delete</button>
              </div>
            </div>
          ))}
        </>
      )}

      <div style={{ fontSize: '11px', color: '#666', lineHeight: 1.6, marginTop: '14px' }}>
        Ami warns you 72, 48 and 24 hours before each renewal. Once a date passes it moves to the next one on its own.
      </div>
    </div>
  );
}
