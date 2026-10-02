import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const AUTH = { 'X-Ami-Password': AMI_PASSWORD };
const H = { 'Content-Type': 'application/json', ...AUTH };

const S = {
  page: { padding: '14px 12px 30px', color: '#e8e8f0' },
  head: { fontSize: '19px', fontWeight: 700, marginBottom: '2px' },
  sub: { fontSize: '11px', color: '#6b6b7c', marginBottom: '14px' },
  tabs: { display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto' },
  tab: (on) => ({
    padding: '8px 14px', minHeight: '36px', borderRadius: '16px', flexShrink: 0,
    border: '1px solid ' + (on ? '#4f46e5' : '#2c2c3a'),
    background: on ? '#262040' : '#1a1a22',
    color: on ? '#a78bfa' : '#8b8b9e', fontSize: '12px', cursor: 'pointer',
  }),
  card: {
    background: '#1a1a22', border: '1px solid #26263a', borderRadius: '10px',
    padding: '14px', marginBottom: '12px',
  },
  label: {
    fontSize: '11px', color: '#6b6b7c', textTransform: 'uppercase',
    letterSpacing: '0.6px', marginBottom: '9px', fontWeight: 600,
  },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    padding: '7px 0', borderBottom: '1px solid #222230', gap: '10px',
  },
  num: { fontSize: '25px', fontWeight: 700, lineHeight: 1.1 },
  small: { fontSize: '11px', color: '#777' },
  empty: { fontSize: '12px', color: '#5a5a6b', fontStyle: 'italic', padding: '4px 0' },
};

const tone = (n, good) => (n === 0 ? '#8b8b9e' : good ? '#10b981' : '#f0a5a5');

function Change({ now, was, lowerIsBetter }) {
  if (was == null) return null;
  const d = now - was;
  if (d === 0) return <span style={S.small}> · same as last time</span>;
  const better = lowerIsBetter ? d < 0 : d > 0;
  return (
    <span style={{ fontSize: '11px', color: better ? '#10b981' : '#f0a5a5' }}>
      {' · '}{d > 0 ? '+' : ''}{d} on last time
    </span>
  );
}

export default function ReportTab() {
  const [period, setPeriod] = useState('week');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [read, setRead] = useState('');
  const [reading, setReading] = useState(false);

  const load = async (p) => {
    setD(null); setErr(''); setRead('');
    try {
      const r = await fetch(API + '/api/report2?period=' + p, { headers: AUTH });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setD(j);
    } catch (e) { setErr(String(e)); }
  };

  useEffect(() => { load(period); }, [period]);

  const askAmi = async () => {
    if (!d) return;
    setReading(true);
    try {
      const r = await fetch(API + '/api/report/read', {
        method: 'POST', headers: H, body: JSON.stringify({ report: d }) });
      const j = await r.json();
      setRead(j.read || j.error || 'Nothing to add.');
    } catch (e) { setRead('Could not reach her: ' + String(e)); }
    setReading(false);
  };

  if (err) return <div style={S.page}><div style={{ ...S.card, borderColor: '#5c3030' }}>{err}</div></div>;
  if (!d) return <div style={S.page}><div style={S.empty}>Working it out...</div></div>;

  const m = d.movement || {};
  const quiet = (d.gone_quiet || []);
  const talk = Object.entries(d.talk_vs_work || {});
  const gap = talk.filter(([, v]) => v.talked_about > v.worked_on);

  return (
    <div style={S.page}>
      <div style={S.head}>How things are going</div>
      <div style={S.sub}>{d.from} to {d.to}</div>

      <div style={S.tabs}>
        {[['week', 'This week'], ['fortnight', 'Two weeks'],
          ['month', 'This month'], ['quarter', 'Three months']].map(([k, l]) => (
          <button key={k} style={S.tab(period === k)} onClick={() => setPeriod(k)}>{l}</button>
        ))}
      </div>

      {/* the one line */}
      {d.headline && (
        <div style={{ ...S.card, background: '#1d1a2e', borderColor: '#3a3357' }}>
          <div style={{ fontSize: '14px', lineHeight: 1.55, color: '#e8e4f5' }}>{d.headline}</div>
        </div>
      )}

      {/* the numbers */}
      <div style={S.card}>
        <div style={S.label}>What moved</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
          <div>
            <div style={{ ...S.num, color: tone(m.finished, true) }}>{m.finished ?? 0}</div>
            <div style={S.small}>finished</div>
            <div><Change now={m.finished} was={m.finished_before} /></div>
          </div>
          <div>
            <div style={{ ...S.num, color: '#8b8b9e' }}>{m.made ?? 0}</div>
            <div style={S.small}>made</div>
            <div><Change now={m.made} was={m.made_before} /></div>
          </div>
          <div>
            <div style={{ ...S.num, color: tone(m.late, false) }}>{m.late ?? 0}</div>
            <div style={S.small}>overdue</div>
            <div><Change now={m.late} was={m.late_before} lowerIsBetter /></div>
          </div>
        </div>
        <div style={{ ...S.small, marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #222230' }}>
          {m.open_now} still open · {m.in_flight} in flight · {m.tasks_open} tasks, {m.todos_open} todos
        </div>
      </div>

      {/* talk against work - the one that stings */}
      {gap.length > 0 && (
        <div style={S.card}>
          <div style={S.label}>Talked about, not worked on</div>
          {gap.map(([nm, v]) => (
            <div key={nm} style={S.row}>
              <span style={{ fontSize: '13px' }}>{nm}</span>
              <span style={S.small}>
                said {v.talked_about}× · touched {v.worked_on}×
              </span>
            </div>
          ))}
        </div>
      )}

      {/* gone quiet */}
      {quiet.length > 0 && (
        <div style={S.card}>
          <div style={S.label}>Nothing moved on these</div>
          {quiet.map((q, i) => (
            <div key={i} style={S.row}>
              <span style={{ fontSize: '13px' }}>{q.venture}</span>
              <span style={S.small}>
                {q.note ? q.note : (q.days_quiet + ' days quiet' + (q.open ? ' · ' + q.open + ' open' : ''))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* what he said he would do */}
      {(d.said_he_would || []).length > 0 && (
        <div style={S.card}>
          <div style={S.label}>You said you would</div>
          {d.said_he_would.map((x, i) => (
            <div key={i} style={S.row}>
              <span style={{ fontSize: '13px' }}>{x.said}</span>
              <span style={S.small}>{x.on}</span>
            </div>
          ))}
          <div style={{ ...S.small, marginTop: '8px' }}>
            Not on any board. Either do them or let them go.
          </div>
        </div>
      )}

      {/* slipping */}
      {(d.slipping || []).length > 0 && (
        <div style={S.card}>
          <div style={S.label}>Slipping</div>
          {d.slipping.slice(0, 6).map((x, i) => (
            <div key={i} style={S.row}>
              <span style={{ fontSize: '13px', minWidth: 0 }}>{x.title}</span>
              <span style={{ fontSize: '11px', color: '#f0a5a5', flexShrink: 0 }}>
                {x.days_late}d late
              </span>
            </div>
          ))}
        </div>
      )}

      {/* stuck */}
      {(d.stuck || []).length > 0 && (
        <div style={S.card}>
          <div style={S.label}>Sitting untouched</div>
          {d.stuck.slice(0, 6).map((x, i) => (
            <div key={i} style={S.row}>
              <span style={{ fontSize: '13px', minWidth: 0 }}>{x.title}</span>
              <span style={S.small}>{x.days}d</span>
            </div>
          ))}
        </div>
      )}

      {/* the people */}
      {(d.not_spoken_of || []).length > 0 && (
        <div style={S.card}>
          <div style={S.label}>Haven't come up lately</div>
          {d.not_spoken_of.map((p, i) => (
            <div key={i} style={S.row}>
              <span style={{ fontSize: '13px' }}>{p.name}</span>
              <span style={S.small}>{p.who}{p.last !== 'not in a while' ? ' · ' + p.last : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* the body */}
      {Object.keys(d.body || {}).length > 0 && (
        <div style={S.card}>
          <div style={S.label}>Your own body</div>
          {Object.entries(d.body).map(([nm, v]) => (
            <div key={nm} style={S.row}>
              <span style={{ fontSize: '13px' }}>{nm}</span>
              <span style={{ fontSize: '12px',
                             color: v.days_logged >= (v.per === 'day' ? 5 : 1) ? '#10b981' : '#f0a5a5' }}>
                {v.days_logged} day{v.days_logged === 1 ? '' : 's'} logged
              </span>
            </div>
          ))}
        </div>
      )}

      {/* health */}
      {d.health && Object.keys(d.health).length > 0 && (
        <div style={S.card}>
          <div style={S.label}>Health</div>
          <div style={S.row}>
            <span style={{ fontSize: '13px' }}>Blood pressure</span>
            <span style={{ fontSize: '12px', color: d.health.bp_readings ? '#e8e8f0' : '#f0a5a5' }}>
              {d.health.bp_readings
                ? d.health.bp_average + ' average · ' + d.health.bp_readings + ' reading' +
                  (d.health.bp_readings === 1 ? '' : 's')
                : 'not taken once'}
            </span>
          </div>
          <div style={S.row}>
            <span style={{ fontSize: '13px' }}>Medication</span>
            <span style={S.small}>{d.health.doses_logged} doses ticked · {d.health.medications} on the go</span>
          </div>
        </div>
      )}

      {/* money */}
      {d.money && (
        <div style={S.card}>
          <div style={S.label}>Money going out</div>
          <div style={S.row}>
            <span style={{ fontSize: '13px' }}>Subscriptions</span>
            <span style={{ fontSize: '13px' }}>
              ${d.money.monthly_total} a month <span style={S.small}>· {d.money.subscriptions}</span>
            </span>
          </div>
          {(d.money.renewing_soon || []).map((r, i) => (
            <div key={i} style={S.row}>
              <span style={{ fontSize: '12px', color: '#aaa' }}>{r.name}</span>
              <span style={S.small}>${r.amount} on {r.on}</span>
            </div>
          ))}
          {d.money.prices_logged > 0 && (
            <div style={{ ...S.small, marginTop: '8px' }}>
              {d.money.prices_logged} prices logged this period
            </div>
          )}
        </div>
      )}

      {/* coming */}
      {(d.coming || []).length > 0 && (
        <div style={S.card}>
          <div style={S.label}>Coming up</div>
          {d.coming.map((c, i) => (
            <div key={i} style={S.row}>
              <span style={{ fontSize: '13px' }}>{c.where}</span>
              <span style={S.small}>{c.on}</span>
            </div>
          ))}
        </div>
      )}

      {/* her read on it */}
      <button onClick={askAmi} disabled={reading}
              style={{ width: '100%', padding: '13px', minHeight: '46px', marginTop: '4px',
                       background: reading ? '#2a2a2a' : '#4f46e5', color: '#fff',
                       border: 'none', borderRadius: '9px', fontSize: '14px',
                       cursor: reading ? 'default' : 'pointer' }}>
        {reading ? 'She is looking...' : 'What does Ami make of this?'}
      </button>
      {read && (
        <div style={{ ...S.card, marginTop: '12px', background: '#1d1a2e', borderColor: '#3a3357' }}>
          <div style={{ fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{read}</div>
          <button onClick={() => setRead('')}
                  style={{ marginTop: '10px', background: 'none', border: 'none',
                           color: '#6b6b7c', fontSize: '12px', cursor: 'pointer', padding: 0 }}>
            clear
          </button>
        </div>
      )}
    </div>
  );
}
