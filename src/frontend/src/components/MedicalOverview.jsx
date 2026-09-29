import React, { useState } from 'react';

const S = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '10px' },
  tile: (accent) => ({
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderLeft: '4px solid ' + accent,
    borderRadius: '10px', padding: '12px'
  }),
  tileLabel: { fontSize: '10px', color: '#888', textTransform: 'uppercase',
               letterSpacing: '0.5px', fontWeight: 700 },
  tileBig: { fontSize: '22px', fontWeight: 700, lineHeight: 1.2, marginTop: '4px' },
  tileSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
          padding: '14px', marginBottom: '10px' },
  head: { fontSize: '12px', color: '#aaa', fontWeight: 700 },
  sub: { fontSize: '10px', color: '#666', marginBottom: '10px' },
  toggle: (on) => ({
    padding: '6px 10px', minHeight: '32px', borderRadius: '6px', border: 'none',
    background: on ? '#2f3550' : 'transparent', color: on ? '#fff' : '#777',
    fontSize: '11px', fontWeight: 600, cursor: 'pointer'
  }),
  btn: (bg) => ({ padding: '12px', minHeight: '46px', background: bg, color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '14px',
                  fontWeight: 600, cursor: 'pointer', width: '100%' }),
  emergency: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#fff',
    zIndex: 2000, overflowY: 'auto', padding: '20px', color: '#111'
  },
  eRow: { borderBottom: '1px solid #ddd', padding: '10px 0' },
  eLabel: { fontSize: '11px', color: '#666', textTransform: 'uppercase',
            letterSpacing: '0.5px', fontWeight: 700 }
};

const bpBand = (sys, dia) => {
  if (sys >= 180 || dia >= 120) return { name: 'Very high', colour: '#dc2626' };
  if (sys >= 140 || dia >= 90) return { name: 'High (stage 2)', colour: '#f87171' };
  if (sys >= 130 || dia >= 80) return { name: 'High (stage 1)', colour: '#f59e0b' };
  if (sys >= 120) return { name: 'Elevated', colour: '#fbbf24' };
  if (sys < 90 || dia < 60) return { name: 'Low', colour: '#22d3ee' };
  return { name: 'Normal', colour: '#10b981' };
};

const sugarBand = (mmol, context) => {
  if (!mmol) return null;
  const fasting = (context || '').includes('fasting') || (context || '').includes('before');
  if (mmol < 3.9) return { name: 'Low', colour: '#22d3ee' };
  if (fasting) {
    if (mmol < 5.6) return { name: 'Normal', colour: '#10b981' };
    if (mmol < 7.0) return { name: 'Raised', colour: '#f59e0b' };
    return { name: 'High', colour: '#f87171' };
  }
  if (mmol < 7.8) return { name: 'Normal', colour: '#10b981' };
  if (mmol < 11.1) return { name: 'Raised', colour: '#f59e0b' };
  return { name: 'High', colour: '#f87171' };
};

const BAND_KEY = [
  ['Normal', 'under 120/80', '#10b981'],
  ['Elevated', '120-129', '#fbbf24'],
  ['Stage 1', '130-139 or 80-89', '#f59e0b'],
  ['Stage 2', '140+ or 90+', '#f87171']
];

const hourOf = (ts) => {
  const h = parseInt(String(ts || '').slice(11, 13), 10);
  return isNaN(h) ? 12 : h;
};
const isMorning = (r) => hourOf(r.taken_at) < 12;

function Chart({ series, markers = [], labels = [], bands = [], height = 150 }) {
  const all = series.flatMap(s => s.points.filter(p => p != null));
  if (all.length < 2) {
    return <div style={{ color: '#666', fontSize: '12px', padding: '24px 0', textAlign: 'center' }}>
      Two readings needed before a line means anything.
    </div>;
  }
  const W = 320, padL = 24, padR = 6, padB = 18, padT = 8;
  const lo = Math.floor((Math.min(...all) - 6) / 5) * 5;
  const hi = Math.ceil((Math.max(...all) + 6) / 5) * 5;
  const span = hi - lo || 1;
  const n = Math.max(...series.map(s => s.points.length));

  const x = (i) => padL + (i * (W - padL - padR)) / Math.max(1, n - 1);
  const y = (v) => padT + (1 - (v - lo) / span) * (height - padT - padB);
  const ticks = [lo, Math.round(lo + span / 2), hi];

  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {bands.map((b, i) => {
        const top = Math.max(padT, y(Math.min(b.to, hi)));
        const bot = Math.min(height - padB, y(Math.max(b.from, lo)));
        if (bot <= top) return null;
        return <rect key={i} x={padL} y={top} width={W - padL - padR} height={bot - top}
                     fill={b.colour} opacity="0.07" />;
      })}

      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="#2a2a2a" strokeWidth="1" />
          <text x="2" y={y(t) + 3} fontSize="8" fill="#666">{t}</text>
        </g>
      ))}

      {markers.map((m, i) => (
        m.index >= 0 ? (
          <g key={i}>
            <line x1={x(m.index)} y1={padT} x2={x(m.index)} y2={height - padB}
                  stroke="#a78bfa" strokeWidth="1" strokeDasharray="3,3" />
            <text x={x(m.index) + 3} y={padT + 8} fontSize="7.5" fill="#a78bfa">{m.label}</text>
          </g>
        ) : null
      ))}

      {series.map((s, si) => {
        const pts = s.points
          .map((p, i) => (p == null ? null : `${x(i)},${y(p)}`))
          .filter(Boolean).join(' ');
        return (
          <g key={si}>
            <polyline fill="none" stroke={s.colour} strokeWidth="2"
                      strokeLinejoin="round" strokeLinecap="round" points={pts} />
            {s.points.map((p, i) => (
              p == null ? null : <circle key={i} cx={x(i)} cy={y(p)} r="2.5" fill={s.colour} />
            ))}
          </g>
        );
      })}

      {labels.map((l, i) => {
        const step = Math.max(1, Math.ceil(labels.length / 5));
        return i % step === 0
          ? <text key={i} x={x(i)} y={height - 5} fontSize="8" fill="#666" textAnchor="middle">{l}</text>
          : null;
      })}
    </svg>
  );
}

export default function MedicalOverview({ meds, readings, sugars, water, exSummary, doses, conds, allergies }) {
  const [showCard, setShowCard] = useState(false);
  const [split, setSplit] = useState(false);
  const [period, setPeriod] = useState(90);

  const lastBp = readings[0];
  const lastSugar = sugars[0];
  const notTaken = doses.filter(d => !d.taken);
  const cutoff = new Date(Date.now() - period * 86400000).toISOString().slice(0, 10);
  const inPeriod = readings.filter(r => String(r.taken_at || '').slice(0, 10) >= cutoff);
  const ordered = [...inPeriod].slice(0, 60).reverse();

  const days = [...new Set(ordered.map(r => String(r.taken_at || '').slice(0, 10)))];

  const bpData = () => {
    if (!split) {
      return {
        series: [
          { points: ordered.map(r => r.systolic), colour: '#667eea' },
          { points: ordered.map(r => r.diastolic), colour: '#22d3ee' }
        ],
        labels: ordered.map(r => String(r.taken_at || '').slice(5, 10))
      };
    }
    const pick = (day, morning) => {
      const hit = ordered.find(r => String(r.taken_at || '').slice(0, 10) === day
                                    && isMorning(r) === morning);
      return hit ? hit.systolic : null;
    };
    return {
      series: [
        { points: days.map(d => pick(d, true)), colour: '#fbbf24' },
        { points: days.map(d => pick(d, false)), colour: '#818cf8' }
      ],
      labels: days.map(d => d.slice(5))
    };
  };

  const medMarkers = () => {
    const axis = split ? days : ordered.map(r => String(r.taken_at || '').slice(0, 10));
    return meds
      .filter(m => m.started_on)
      .map(m => {
        const start = String(m.started_on).slice(0, 10);
        const idx = axis.findIndex(d => d >= start);
        return idx > 0 ? { index: idx, label: 'started ' + String(m.name).slice(0, 12) } : null;
      })
      .filter(Boolean)
      .slice(0, 2);
  };

  const bandCount = () => {
    const last = inPeriod;
    if (!last.length) return null;
    const normal = last.filter(r => bpBand(r.systolic, r.diastolic).name === 'Normal').length;
    return { normal, total: last.length };
  };

  const morningVsEvening = () => {
    const m = readings.filter(isMorning);
    const e = readings.filter(r => !isMorning(r));
    if (m.length < 3 || e.length < 3) return null;
    const avg = (l) => Math.round(l.reduce((s, r) => s + r.systolic, 0) / l.length);
    const am = avg(m), pm = avg(e);
    if (Math.abs(am - pm) < 4) return 'Mornings and evenings run about the same.';
    return am > pm
      ? `Mornings run about ${am - pm} higher than evenings (${am} against ${pm}).`
      : `Evenings run about ${pm - am} higher than mornings (${pm} against ${am}).`;
  };

  const sugarData = () => {
    const r = [...sugars].slice(0, 20).reverse();
    return {
      series: [{ points: r.map(x => x.value_mmol || x.value), colour: '#f59e0b' }],
      labels: r.map(x => String(x.taken_at || '').slice(5, 10))
    };
  };

  const bpTrend = () => {
    if (readings.length < 6) return null;
    const recent = readings.slice(0, 5), before = readings.slice(5, 10);
    if (!before.length) return null;
    const a = recent.reduce((s, r) => s + r.systolic, 0) / recent.length;
    const b = before.reduce((s, r) => s + r.systolic, 0) / before.length;
    const d = Math.round(a - b);
    if (Math.abs(d) < 3) return { t: 'steady', c: '#888' };
    return { t: (d > 0 ? '↑' : '↓') + Math.abs(d) + ' on the five before', c: d > 0 ? '#f59e0b' : '#10b981' };
  };

  const target = water.target || 2.7;
  const waterPct = Math.min(100, Math.round((water.today / target) * 100));

  return (
    <>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', overflowX: 'auto' }}>
        {[[7, 'Week'], [30, 'Month'], [90, 'Quarter'], [365, 'Year'], [3650, 'All']].map(([d, l]) => (
          <button key={d} onClick={() => setPeriod(d)}
                  style={{ padding: '7px 12px', minHeight: '34px', borderRadius: '16px', cursor: 'pointer',
                           border: '1px solid ' + (period === d ? '#667eea' : '#2a2a2a'),
                           background: period === d ? '#667eea22' : '#1a1a1a',
                           color: period === d ? '#fff' : '#999', fontSize: '12px', fontWeight: 600 }}>
            {l}
          </button>
        ))}
      </div>

      <div style={S.grid}>
        <div style={S.tile(lastBp ? bpBand(lastBp.systolic, lastBp.diastolic).colour : '#667eea')}>
          <div style={S.tileLabel}>Blood pressure</div>
          <div style={{ ...S.tileBig,
                        color: lastBp ? bpBand(lastBp.systolic, lastBp.diastolic).colour : '#667eea' }}>
            {lastBp ? `${lastBp.systolic}/${lastBp.diastolic}` : '—'}
          </div>
          <div style={S.tileSub}>
            {lastBp ? bpBand(lastBp.systolic, lastBp.diastolic).name : 'nothing recorded'}
          </div>
          {bpTrend() && <div style={{ fontSize: '11px', color: bpTrend().c }}>{bpTrend().t}</div>}
        </div>

        <div style={S.tile(lastSugar
          ? ((sugarBand(lastSugar.value_mmol || lastSugar.value, lastSugar.context) || {}).colour || '#f59e0b')
          : '#f59e0b')}>
          <div style={S.tileLabel}>Blood sugar</div>
          <div style={{ ...S.tileBig, color: lastSugar
            ? ((sugarBand(lastSugar.value_mmol || lastSugar.value, lastSugar.context) || {}).colour || '#f59e0b')
            : '#f59e0b' }}>
            {lastSugar ? lastSugar.value : '—'}
            {lastSugar && <span style={{ fontSize: '11px', color: '#888' }}> {lastSugar.unit}</span>}
          </div>
          <div style={S.tileSub}>
            {lastSugar
              ? ((sugarBand(lastSugar.value_mmol || lastSugar.value, lastSugar.context) || {}).name || '')
                + (lastSugar.context ? ' · ' + lastSugar.context : '')
              : 'nothing recorded'}
          </div>
        </div>

        <div style={S.tile(water.today >= target ? '#10b981' : '#22d3ee')}>
          <div style={S.tileLabel}>Water today</div>
          <div style={{ ...S.tileBig, color: water.today >= target ? '#10b981' : '#22d3ee' }}>
            {water.today}L
          </div>
          <div style={{ height: '6px', background: '#2a2a2a', borderRadius: '3px',
                        overflow: 'hidden', marginTop: '6px' }}>
            <div style={{ width: waterPct + '%', height: '100%',
                          background: water.today >= target ? '#10b981' : '#22d3ee' }} />
          </div>
          <div style={S.tileSub}>of {target}L</div>
        </div>

        <div style={S.tile(exSummary.days_since > 3 ? '#f87171' : '#10b981')}>
          <div style={S.tileLabel}>Last moved</div>
          <div style={{ ...S.tileBig, color: exSummary.days_since > 3 ? '#f87171' : '#10b981' }}>
            {exSummary.days_since === 0 ? 'Today'
              : exSummary.days_since === 1 ? 'Yesterday'
              : exSummary.days_since != null ? exSummary.days_since + 'd ago' : '—'}
          </div>
          <div style={S.tileSub}>
            {exSummary.this_week ? exSummary.this_week + ' this week' : 'nothing this week'}
          </div>
        </div>
      </div>

      {notTaken.length > 0 && (
        <div style={{ ...S.card, borderLeft: '4px solid #f59e0b' }}>
          <div style={{ ...S.head, marginBottom: '6px' }}>Not taken yet today</div>
          {notTaken.map((d, i) => (
            <div key={i} style={{ fontSize: '13px', padding: '3px 0' }}>
              {d.name}{d.dose ? ' ' + d.dose : ''} <span style={{ color: '#888' }}>· {d.slot}</span>
            </div>
          ))}
        </div>
      )}

      {readings.length >= 2 && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={S.head}>Blood pressure</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button style={S.toggle(!split)} onClick={() => setSplit(false)}>All</button>
              <button style={S.toggle(split)} onClick={() => setSplit(true)}>AM / PM</button>
            </div>
          </div>
          <div style={S.sub}>
            {split
              ? 'Systolic only, morning against evening'
              : 'Systolic and diastolic, last ' + Math.min(30, readings.length) + ' readings'}
          </div>

          <Chart
            {...bpData()}
            markers={medMarkers()}
            bands={[
              { from: 0, to: 120, colour: '#10b981' },
              { from: 120, to: 130, colour: '#fbbf24' },
              { from: 130, to: 140, colour: '#f59e0b' },
              { from: 140, to: 999, colour: '#f87171' }
            ]}
          />

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
            {split ? (
              <>
                <span style={{ fontSize: '10px', color: '#fbbf24' }}>● morning</span>
                <span style={{ fontSize: '10px', color: '#818cf8' }}>● evening</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '10px', color: '#667eea' }}>● systolic</span>
                <span style={{ fontSize: '10px', color: '#22d3ee' }}>● diastolic</span>
              </>
            )}
            {medMarkers().length > 0 && (
              <span style={{ fontSize: '10px', color: '#a78bfa' }}>┊ medication started</span>
            )}
          </div>

          {bandCount() && (
            <div style={{ fontSize: '12px', color: '#bbb', marginTop: '10px' }}>
              <strong style={{ color: '#10b981' }}>{bandCount().normal}</strong> of your last{' '}
              {bandCount().total} readings sat in the normal band.
            </div>
          )}
          {morningVsEvening() && (
            <div style={{ fontSize: '12px', color: '#bbb', marginTop: '4px' }}>
              {morningVsEvening()}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
            {BAND_KEY.map(([name, range, colour]) => (
              <div key={name} style={{ fontSize: '10px', color: '#888' }}>
                <span style={{ color: colour, fontWeight: 700 }}>●</span> {name}
                <span style={{ color: '#555' }}> {range}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '10px', color: '#555', marginTop: '8px', lineHeight: 1.5 }}>
            These are the usual categories, not a verdict on you. One reading means little —
            the pattern is what matters, and that's a conversation for your doctor.
          </div>
        </div>
      )}

      {sugars.length >= 2 && (
        <div style={S.card}>
          <div style={S.head}>Blood sugar</div>
          <div style={S.sub}>mmol/L, last {Math.min(20, sugars.length)} readings</div>
          <Chart
            {...sugarData()}
            bands={[
              { from: 0, to: 5.6, colour: '#10b981' },
              { from: 5.6, to: 7.0, colour: '#f59e0b' },
              { from: 7.0, to: 99, colour: '#f87171' }
            ]}
          />
          <div style={{ fontSize: '10px', color: '#555', marginTop: '8px', lineHeight: 1.5 }}>
            Fasting: under 5.6 normal · 5.6-6.9 raised · 7.0+ high. After eating the ranges sit higher.
          </div>
        </div>
      )}

      <button style={{ ...S.btn('#7f1d1d'), marginTop: '6px' }} onClick={() => setShowCard(true)}>
        🆘 Emergency card
      </button>

      {showCard && (
        <div style={S.emergency}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Medical information</h2>
            <button onClick={() => setShowCard(false)}
                    style={{ background: 'none', border: 'none', fontSize: '26px',
                             cursor: 'pointer', color: '#111' }}>×</button>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '14px' }}>
            Charles Bond Kebbi · show this to a medic
          </div>

          <div style={S.eRow}>
            <div style={S.eLabel}>Allergies</div>
            {allergies.length === 0
              ? <div style={{ fontSize: '15px' }}>None known</div>
              : allergies.map(a => (
                  <div key={a.id} style={{ fontSize: '15px', fontWeight: 600 }}>
                    {a.name}
                    {a.reaction ? <span style={{ fontWeight: 400 }}> — {a.reaction}</span> : null}
                    {a.severity ? <span style={{ color: '#b91c1c' }}> ({a.severity})</span> : null}
                  </div>
                ))}
          </div>

          <div style={S.eRow}>
            <div style={S.eLabel}>Current medication</div>
            {meds.filter(m => m.current).length === 0
              ? <div style={{ fontSize: '15px' }}>None</div>
              : meds.filter(m => m.current).map(m => (
                  <div key={m.id} style={{ fontSize: '15px' }}>
                    <strong>{m.name}</strong>
                    {m.generic_name ? ' (' + m.generic_name + ')' : ''}
                    {m.dose ? ' ' + m.dose : ''}
                    {m.frequency ? ', ' + m.frequency : ''}
                  </div>
                ))}
          </div>

          <div style={S.eRow}>
            <div style={S.eLabel}>Conditions</div>
            {conds.filter(c => c.status !== 'resolved').length === 0
              ? <div style={{ fontSize: '15px' }}>None recorded</div>
              : conds.filter(c => c.status !== 'resolved').map(c => (
                  <div key={c.id} style={{ fontSize: '15px' }}>
                    {c.name}{c.since ? ' (since ' + String(c.since).slice(0, 10) + ')' : ''}
                  </div>
                ))}
          </div>

          {lastBp && (
            <div style={S.eRow}>
              <div style={S.eLabel}>Last blood pressure</div>
              <div style={{ fontSize: '15px' }}>
                {lastBp.systolic}/{lastBp.diastolic} on {String(lastBp.taken_at || '').slice(0, 10)}
              </div>
            </div>
          )}

          <div style={{ fontSize: '11px', color: '#666', marginTop: '20px' }}>
            Kept by the patient. Not a clinical record.
          </div>
        </div>
      )}
    </>
  );
}
