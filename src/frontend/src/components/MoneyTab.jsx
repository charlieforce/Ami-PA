import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const PW = import.meta.env.VITE_API_PASSWORD || 'charlie';
const AUTH = { 'X-Ami-Password': PW };
const H = { 'Content-Type': 'application/json', ...AUTH };

const money = (n, cur) => {
  const v = Math.round(Number(n) || 0).toLocaleString();
  return cur && cur !== 'USD' ? v + ' ' + cur : v;
};

const S = {
  wrap: { padding: '14px 12px 40px', color: '#e8e8f0' },
  card: {
    background: '#17171f', border: '1px solid #26262f', borderRadius: '10px',
    padding: '13px', marginBottom: '10px',
  },
  name: { fontSize: '15px', fontWeight: 700 },
  sub: { fontSize: '12px', color: '#8b8b9e', marginTop: '3px' },
  big: { fontSize: '22px', fontWeight: 700, letterSpacing: '-0.3px' },
  label: {
    fontSize: '11px', color: '#777', textTransform: 'uppercase',
    letterSpacing: '0.6px', fontWeight: 700, margin: '18px 0 8px',
  },
  input: {
    width: '100%', padding: '9px 11px', background: '#0f0f16',
    border: '1px solid #2c2c3a', borderRadius: '7px', color: '#e8e8f0',
    fontSize: '13px', boxSizing: 'border-box',
  },
  btn: (bg) => ({
    padding: '9px 14px', background: bg, color: '#fff', border: 'none',
    borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600,
  }),
  bar: (pct, colour) => ({
    height: '6px', borderRadius: '3px', background: '#26262f',
    overflow: 'hidden', marginTop: '7px',
    backgroundImage: 'linear-gradient(90deg,' + colour + ' ' + pct + '%,#26262f ' + pct + '%)',
  }),
  row: {
    display: 'flex', justifyContent: 'space-between', gap: '10px',
    padding: '9px 0', borderBottom: '1px solid #1f1f28', fontSize: '13px',
  },
};

export default function MoneyTab() {
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(null);
  const [board, setBoard] = useState(null);
  const [report, setReport] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState('');        // 'person' | 'quote' | 'payment'
  const [form, setForm] = useState({});

  const load = async () => {
    try {
      const r = await fetch(API + '/api/project-board', { headers: AUTH });
      const j = await r.json();
      setProjects(j.projects || []);
    } catch (e) { setErr(String(e)); }
  };

  const loadBoard = async (pid) => {
    setBoard(null); setReport('');
    try {
      const r = await fetch(API + '/api/money/' + pid, { headers: AUTH });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setBoard(j);
    } catch (e) { setErr(String(e)); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (open) loadBoard(open); }, [open]);

  const post = async (path, body) => {
    setBusy(true);
    try {
      await fetch(API + path, { method: 'POST', headers: H, body: JSON.stringify(body) });
      setForm({}); setAdding('');
      await loadBoard(open);
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const changeQuote = async (qid, amount, why) => {
    setBusy(true);
    try {
      await fetch(API + '/api/money/quote/' + qid, {
        method: 'PUT', headers: H, body: JSON.stringify({ amount, why }) });
      await loadBoard(open);
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const getReport = async () => {
    setBusy(true);
    try {
      const r = await fetch(API + '/api/money/' + open + '/report', { headers: AUTH });
      const j = await r.json();
      setReport(j.report || '');
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  // ------------------------------------------------------------- the list
  if (!open) {
    return (
      <div style={S.wrap}>
        <div style={{ ...S.label, marginTop: 0 }}>What the jobs are costing</div>
        {projects.length === 0 && (
          <div style={{ fontSize: '13px', color: '#777' }}>No projects yet.</div>
        )}
        {projects.map(p => (
          <div key={p.id} style={{ ...S.card, cursor: 'pointer' }} onClick={() => setOpen(p.id)}>
            <div style={S.name}>{p.name}</div>
            <div style={S.sub}>
              {p.open_n} open{p.done_n ? ' \u00b7 ' + p.done_n + ' done' : ''}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // --------------------------------------------------------- one job
  if (err) return <div style={S.wrap}><div style={{ color: '#f0a5a5' }}>{err}</div></div>;
  if (!board) return <div style={S.wrap}><div style={{ color: '#777' }}>Loading...</div></div>;

  const t = board.totals || {};
  const pct = t.quoted ? Math.min(100, Math.round((t.paid_labour / t.quoted) * 100)) : 0;
  const over = (t.spent || 0) > (t.quoted || 0);

  return (
    <div style={S.wrap}>
      <button onClick={() => setOpen(null)}
              style={{ background: 'none', border: 'none', color: '#8b8bff',
                       cursor: 'pointer', fontSize: '13px', padding: '0 0 10px' }}>
        &#8592; All jobs
      </button>

      <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '2px' }}>
        {board.project}
      </div>

      {/* the one number he wants */}
      <div style={{ ...S.card, marginTop: '12px' }}>
        <div style={{ fontSize: '11px', color: '#8b8b9e', textTransform: 'uppercase',
                      letterSpacing: '0.6px', fontWeight: 700 }}>
          Still owed
        </div>
        <div style={{ ...S.big, color: over ? '#f59e0b' : '#e8e8f0' }}>
          {money(t.still_owed)}
        </div>
        <div style={S.sub}>
          quoted {money(t.quoted)} &middot; paid {money(t.paid_labour)}
          {t.materials ? ' \u00b7 materials ' + money(t.materials) : ''}
        </div>
        <div style={S.bar(pct, over ? '#f59e0b' : '#10b981')} />
      </div>

      {/* who is on it */}
      <div style={S.label}>Who is on it</div>
      {(board.people || []).length === 0 && (
        <div style={{ fontSize: '13px', color: '#777', marginBottom: '8px' }}>
          Nobody added yet.
        </div>
      )}
      {(board.people || []).map(p => (
        <div key={p.id} style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={S.name}>{p.name}</div>
              {p.trade && <div style={S.sub}>{p.trade}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: 700,
                            color: p.owed > 0 ? '#f59e0b' : '#10b981' }}>
                {money(p.owed)}
              </div>
              <div style={{ fontSize: '11px', color: '#777' }}>owed</div>
            </div>
          </div>
          <div style={{ ...S.sub, marginTop: '6px' }}>
            quoted {money(p.quoted)} &middot; paid {money(p.paid)}
          </div>

          {(p.quotes || []).map(q => (
            <div key={q.id} style={S.row}>
              <span style={{ color: '#bbb' }}>{q.what}</span>
              <span>
                {money(q.amount)}
                <button onClick={() => {
                          const v = prompt('What is it now?', q.amount);
                          if (!v) return;
                          const w = prompt('Why did it change?') || '';
                          changeQuote(q.id, Number(v), w);
                        }}
                        style={{ background: 'none', border: 'none', color: '#8b8bff',
                                 cursor: 'pointer', marginLeft: '8px', fontSize: '12px' }}>
                  change
                </button>
              </span>
            </div>
          ))}

          {/* where it moved - the number worth having */}
          {(p.drift || []).map((d, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#f59e0b', marginTop: '6px' }}>
              {d.what}: started at {money(d.first)}, now {money(d.now)}
              {d.first ? ' (' + (d.now > d.first ? '+' : '')
                       + Math.round(((d.now - d.first) / d.first) * 100) + '%)' : ''}
              {d.why ? ' \u2014 ' + d.why : ''}
            </div>
          ))}

          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button style={{ ...S.btn('#2a2a35'), fontSize: '12px', padding: '7px 11px' }}
                    onClick={() => { setAdding('quote'); setForm({ person_id: p.id }); }}>
              + Quote
            </button>
            <button style={{ ...S.btn('#10b981'), fontSize: '12px', padding: '7px 11px' }}
                    onClick={() => { setAdding('payment'); setForm({ person_id: p.id }); }}>
              + Payment
            </button>
          </div>
        </div>
      ))}

      {/* the forms */}
      {adding === 'person' && (
        <div style={S.card}>
          <input style={{ ...S.input, marginBottom: '8px' }} placeholder="Name"
                 onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={{ ...S.input, marginBottom: '8px' }} placeholder="Trade (builder, plumber)"
                 onChange={e => setForm({ ...form, trade: e.target.value })} />
          <button style={S.btn('#4f46e5')} disabled={busy}
                  onClick={() => post('/api/money/' + open + '/person', form)}>Add</button>
        </div>
      )}
      {adding === 'quote' && (
        <div style={S.card}>
          <input style={{ ...S.input, marginBottom: '8px' }} placeholder="What is the work?"
                 onChange={e => setForm({ ...form, what: e.target.value })} />
          <input style={{ ...S.input, marginBottom: '8px' }} placeholder="How much?" type="number"
                 onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
          <button style={S.btn('#4f46e5')} disabled={busy}
                  onClick={() => post('/api/money/' + open + '/quote', form)}>Save</button>
        </div>
      )}
      {adding === 'payment' && (
        <div style={S.card}>
          <input style={{ ...S.input, marginBottom: '8px' }} placeholder="How much?" type="number"
                 onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
          <input style={{ ...S.input, marginBottom: '8px' }} placeholder="What for?"
                 onChange={e => setForm({ ...form, what: e.target.value })} />
          <button style={S.btn('#10b981')} disabled={busy}
                  onClick={() => post('/api/money/' + open + '/payment', form)}>Record</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        {!adding && (
          <button style={S.btn('#2a2a35')} onClick={() => { setAdding('person'); setForm({}); }}>
            + Someone
          </button>
        )}
        {adding && (
          <button style={S.btn('#2a2a35')} onClick={() => { setAdding(''); setForm({}); }}>
            Cancel
          </button>
        )}
        <button style={S.btn('#4f46e5')} onClick={getReport} disabled={busy}>
          Report for Aminata
        </button>
      </div>

      {report && (
        <div style={{ ...S.card, marginTop: '12px' }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#ccc',
                        fontFamily: 'inherit', margin: 0 }}>{report}</pre>
          <button style={{ ...S.btn('#2a2a35'), marginTop: '10px', fontSize: '12px' }}
                  onClick={() => navigator.clipboard?.writeText(report)}>
            Copy it
          </button>
        </div>
      )}
    </div>
  );
}
