import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };

const S = {
  wrap: { padding: '12px', color: '#eee' },
  bar: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' },
  tab: (on) => ({
    padding: '10px 14px', minHeight: '44px', background: on ? '#667eea' : '#2a2a2a',
    color: '#fff', border: 'none', borderRadius: '8px', fontWeight: on ? 700 : 400,
    whiteSpace: 'nowrap', fontSize: '14px', cursor: 'pointer'
  }),
  pill: (on) => ({
    padding: '8px 12px', minHeight: '40px', background: on ? '#4c1d95' : '#1a1a1a',
    color: on ? '#fff' : '#888', border: '1px solid #2a2a2a', borderRadius: '6px',
    fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap'
  }),
  label: {
    fontSize: '11px', color: '#888', textTransform: 'uppercase',
    letterSpacing: '0.5px', marginTop: '18px', marginBottom: '6px'
  },
  card: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px',
    padding: '12px', flex: '1 1 30%', minWidth: '100px'
  },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: '8px', padding: '12px 0', borderBottom: '1px solid #222', minHeight: '44px'
  },
  big: { fontSize: '22px', fontWeight: 700, color: '#a78bfa' },
  small: { fontSize: '10px', color: '#888', textTransform: 'uppercase' },
  input: {
    width: '100%', padding: '12px', fontSize: '16px', background: '#1a1a1a',
    color: '#eee', border: '1px solid #333', borderRadius: '8px',
    marginBottom: '10px', boxSizing: 'border-box'
  },
  btn: (bg) => ({
    flex: 1, padding: '14px', minHeight: '48px', background: bg, color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer'
  })
};

const DOT = {
  healthy: { c: '#10b981', t: 'Healthy' },
  slow: { c: '#f59e0b', t: 'Slow' },
  degraded: { c: '#f59e0b', t: 'Degraded' },
  failing: { c: '#ef4444', t: 'Failing' },
  unused: { c: '#3f3f46', t: 'Never used' },
  legacy: { c: '#6366f1', t: 'Legacy name' }
};

const money = (n) => '$' + Number(n || 0).toFixed(2);
const cents = (n) => {
  const v = Number(n || 0);
  return v < 0.01 ? (v * 100).toFixed(3) + '¢' : '$' + v.toFixed(3);
};
const ago = (ts) => {
  if (!ts) return 'never';
  const d = Math.round((new Date() - new Date(String(ts).replace(' ', 'T'))) / 3600000);
  return d < 1 ? 'just now' : d < 24 ? d + 'h ago' : Math.round(d / 24) + 'd ago';
};

const FIELDS = [
  ['monthly_budget', 'Monthly budget ($)', 'Ami warns at 50, 80 and 100%'],
  ['daily_hard_limit', 'Daily hard limit ($)', 'Gemini calls stop when this is hit'],
  ['hourly_alarm', 'Hourly alarm ($)', 'Ami shouts if an hour crosses this'],
  ['input_per_million', 'Input $ per 1M tokens', 'Update when Gemini reprices'],
  ['output_per_million', 'Output $ per 1M tokens', 'Update when Gemini reprices']
];

export default function EnginesCostTab() {
  const [mode, setMode] = useState('health');
  const [period, setPeriod] = useState('7d');
  const [d, setD] = useState(null);
  const [form, setForm] = useState({});
  const [savedMsg, setSavedMsg] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async (p) => {
    setLoading(true);
    try {
      const r = await fetch(API + '/api/admin/engines-cost?period=' + (p || period), { headers: H });
      const j = await r.json();
      if (j.error) setErr(j.error);
      else { setD(j); setForm(j.settings || {}); setErr(''); }
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  };
  useEffect(() => { load(period); }, [period]);

  const saveSettings = async () => {
    try {
      const body = {};
      FIELDS.forEach(f => { if (form[f[0]] !== undefined && form[f[0]] !== '') body[f[0]] = Number(form[f[0]]); });
      const r = await fetch(API + '/api/admin/cost-settings', { method: 'PUT', headers: H, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setSavedMsg(true); setTimeout(() => setSavedMsg(false), 2000);
      load(period);
    } catch (e) { setErr(String(e)); }
  };

  if (loading && !d) return <div style={S.wrap}>Loading…</div>;

  const cost = d ? d.cost : {};
  const bud = d ? d.budget : {};
  const cv = d ? d.conversation : {};
  const maxDaily = d && d.daily && d.daily.length ? Math.max(...d.daily.map(x => x.calls || 0)) : 1;
  const pct = Math.min(100, bud.pct || 0);
  const barColor = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#10b981';

  return (
    <div style={S.wrap}>
      {err && (
        <div style={{ background: '#7f1d1d', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px' }}>
          ⚠️ {err}
        </div>
      )}

      <div style={S.bar}>
        <button style={S.tab(mode === 'health')} onClick={() => setMode('health')}>⚙️ Health</button>
        <button style={S.tab(mode === 'cost')} onClick={() => setMode('cost')}>💰 Cost</button>
        <button style={S.tab(mode === 'settings')} onClick={() => setMode('settings')}>🛡️ Limits</button>
      </div>

      {mode !== 'settings' && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {['24h', '7d', '30d'].map(p => (
            <button key={p} style={S.pill(period === p)} onClick={() => setPeriod(p)}>{p}</button>
          ))}
          <button style={S.pill(false)} onClick={() => load(period)}>↻</button>
        </div>
      )}

      {mode === 'health' && d && (
        <>
          <div style={S.label}>Engines ({d.engines.filter(e => e.calls > 0).length} active of {d.engines.length})</div>
          {d.engines.map(e => {
            const k = DOT[e.state] || DOT.unused;
            return (
              <div key={e.engine_name} style={S.row}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: k.c, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, textTransform: 'capitalize' }}>
                      {e.engine_name.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>
                      {k.t}{e.calls ? ' · ' + ago(e.last_used) : ''}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{e.calls}×</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>
                    {e.avg_ms !== null && e.avg_ms !== undefined ? e.avg_ms + 'ms' : '—'}
                    {e.success_rate !== null && e.success_rate !== undefined ? ' · ' + e.success_rate + '%' : ''}
                  </div>
                </div>
              </div>
            );
          })}

          {d.errors && d.errors.length > 0 && (
            <>
              <div style={S.label}>Recent errors</div>
              {d.errors.map((e, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #222' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{e.engine_name}</div>
                  <div style={{ fontSize: '12px', color: '#f87171' }}>{e.error_message}</div>
                  <div style={{ fontSize: '11px', color: '#666' }}>{(e.created_at || '').slice(0, 16)}</div>
                </div>
              ))}
            </>
          )}

          {d.slowest && d.slowest.length > 0 && (
            <>
              <div style={S.label}>Slowest endpoints</div>
              {d.slowest.map((s, i) => (
                <div key={i} style={S.row}>
                  <div style={{ fontSize: '14px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.endpoint}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: s.worst_ms > 2000 ? '#ef4444' : '#f59e0b' }}>
                      {s.worst_ms}ms
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>avg {s.avg_ms}ms · {s.calls}×</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {d.engines.filter(e => e.state === 'unused').length > 0 && (
            <div style={{ ...S.card, marginTop: '18px', flex: 'none' }}>
              <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                {d.engines.filter(e => e.state === 'unused').length} engines have not fired in this window.
                If that holds over a few weeks of normal use, they are not earning their place.
              </div>
            </div>
          )}
          <div style={{ height: '40px' }} />
        </>
      )}

      {mode === 'cost' && d && (
        <>
          <div style={S.label}>This month</div>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: barColor }}>{money(bud.spent)}</div>
              <div style={{ fontSize: '13px', color: '#888' }}>of {money(bud.limit)}</div>
            </div>
            <div style={{ background: '#0f0f0f', borderRadius: '4px', height: '10px', marginTop: '10px', overflow: 'hidden' }}>
              <div style={{ width: Math.max(1, pct) + '%', background: barColor, height: '100%' }} />
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>{bud.pct}% used</div>
          </div>

          <div style={S.label}>What a conversation costs</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <div style={S.card}>
              <div style={S.big}>{cents(cv.avg_cost)}</div>
              <div style={S.small}>per chat</div>
            </div>
            <div style={S.card}>
              <div style={S.big}>{cv.avg_in}</div>
              <div style={S.small}>tokens in</div>
            </div>
            <div style={S.card}>
              <div style={S.big}>{cv.avg_out}</div>
              <div style={S.small}>tokens out</div>
            </div>
          </div>
          {cv.count > 0 && (
            <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
              From {cv.count} measured conversation{cv.count === 1 ? '' : 's'}.
              At this rate, 100 chats a day costs about {money((cv.avg_cost || 0) * 100 * 30)} a month.
            </div>
          )}

          <div style={S.label}>How this is worked out</div>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '14px', fontSize: '13px', lineHeight: 1.7, color: '#bbb' }}>
            <p style={{ margin: '0 0 10px' }}>
              Google charges by the <strong style={{ color: '#eee' }}>token</strong>, not by the message.
              A token is roughly three quarters of a word, so 100 tokens is about 75 words.
              Punctuation and spaces count too.
            </p>
            <p style={{ margin: '0 0 10px' }}>
              Every message has two halves. <strong style={{ color: '#eee' }}>Tokens in</strong> is
              everything sent to Gemini: your question plus all the context Ami attaches to it, which
              is your notes, tasks, contacts, ventures, her personality and her Krio guide.
              That is why a short question still sends about {cv.avg_in || 2000} tokens.
              <strong style={{ color: '#eee' }}> Tokens out</strong> is only her reply, which is why it is much smaller.
            </p>
            <p style={{ margin: '0 0 10px' }}>
              Input and output are priced differently. Right now that is
              ${(d.settings && d.settings.input_per_million) || 0.30} per million tokens in
              and ${(d.settings && d.settings.output_per_million) || 2.50} per million out,
              which you can change under Limits whenever Google reprices.
            </p>
            <p style={{ margin: 0 }}>
              So one conversation costs about ({cv.avg_in} ÷ 1,000,000 × input rate) plus
              ({cv.avg_out} ÷ 1,000,000 × output rate), which lands at {cents(cv.avg_cost)}.
              A million tokens sounds enormous because it is: you would need roughly{' '}
              {cv.avg_in ? Math.round(1000000 / (cv.avg_in + cv.avg_out)).toLocaleString() : '450'} conversations
              to use one up.
            </p>
          </div>

          <div style={S.label}>Spend ({period})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <div style={S.card}>
              <div style={S.big}>{money(cost.total)}</div>
              <div style={S.small}>total</div>
            </div>
            <div style={S.card}>
              <div style={{ ...S.big, color: '#10b981' }}>{cost.free_pct}%</div>
              <div style={S.small}>free (DB)</div>
            </div>
            <div style={S.card}>
              <div style={{ ...S.big, color: '#f59e0b' }}>{cost.gemini_calls}</div>
              <div style={S.small}>paid calls</div>
            </div>
          </div>

          <div style={S.label}>What costs money</div>
          {d.endpoints.filter(e => e.gemini > 0).length === 0 && (
            <div style={{ fontSize: '13px', color: '#666' }}>No paid calls in this window.</div>
          )}
          {d.endpoints.filter(e => e.gemini > 0).map((e, i) => (
            <div key={i} style={S.row}>
              <div style={{ fontSize: '14px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {e.endpoint}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>{money(e.cost)}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{e.gemini} of {e.calls}</div>
              </div>
            </div>
          ))}

          <div style={S.label}>Busiest endpoints</div>
          {d.endpoints.slice(0, 8).map((e, i) => (
            <div key={i} style={S.row}>
              <div style={{ fontSize: '14px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {e.endpoint}
              </div>
              <div style={{ fontSize: '13px', color: '#888', flexShrink: 0 }}>{e.calls}×</div>
            </div>
          ))}

          <div style={S.label}>Last 14 days</div>
          {d.daily.map((x, i) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' }}>
                <span>{x.day}</span>
                <span>{x.calls}× · {x.gemini} paid</span>
              </div>
              <div style={{ background: '#1a1a1a', borderRadius: '3px', height: '6px', marginTop: '3px' }}>
                <div style={{
                  width: Math.max(2, (x.calls / maxDaily) * 100) + '%',
                  background: x.gemini > 0 ? '#f59e0b' : '#667eea',
                  height: '100%', borderRadius: '3px'
                }} />
              </div>
            </div>
          ))}

          <div style={{ ...S.card, marginTop: '18px', flex: 'none' }}>
            <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
              Every figure here comes from real token counts returned by Gemini.
              Estimated at the rates under Limits.
            </div>
          </div>
          <div style={{ height: '40px' }} />
        </>
      )}

      {mode === 'settings' && (
        <>
          <div style={{ ...S.card, flex: 'none', marginBottom: '14px' }}>
            <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
              The daily hard limit stops every Gemini call once it is reached, so a runaway loop
              cannot drain your account. Ami also messages you when spend spikes.
            </div>
          </div>

          {FIELDS.map(f => (
            <div key={f[0]}>
              <div style={S.label}>{f[1]}</div>
              <input
                style={S.input}
                type="number"
                step="0.01"
                value={form[f[0]] !== undefined ? form[f[0]] : ''}
                onChange={e => setForm({ ...form, [f[0]]: e.target.value })}
              />
              <div style={{ fontSize: '11px', color: '#666', marginTop: '-6px', marginBottom: '12px' }}>{f[2]}</div>
            </div>
          ))}

          <div style={S.label}>Breaker</div>
          <select
            style={S.input}
            value={form.breaker_enabled !== undefined ? String(form.breaker_enabled) : '1'}
            onChange={e => setForm({ ...form, breaker_enabled: Number(e.target.value) })}
          >
            <option value="1">On — stop calls at the daily limit</option>
            <option value="0">Off — never block calls</option>
          </select>

          <button
            style={{ ...S.btn(savedMsg ? '#047857' : '#059669'), width: '100%', marginTop: '10px', marginBottom: '40px' }}
            onClick={saveSettings}
          >
            {savedMsg ? '✓ Saved' : '💾 Save limits'}
          </button>
        </>
      )}
    </div>
  );
}
