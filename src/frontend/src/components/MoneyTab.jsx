import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const PW = import.meta.env.VITE_API_PASSWORD || 'charlie';
const AUTH = { 'X-Ami-Password': PW };
const H = { 'Content-Type': 'application/json', ...AUTH };

const n0 = (v) => Math.round(Number(v) || 0).toLocaleString();

const S = {
  wrap: { padding: '14px 12px 40px', color: '#e8e8f0' },
  card: {
    background: '#17171f', border: '1px solid #26262f', borderRadius: '10px',
    padding: '13px', marginBottom: '9px',
  },
  name: { fontSize: '15px', fontWeight: 700 },
  sub: { fontSize: '12px', color: '#8b8b9e', marginTop: '3px' },
  label: {
    fontSize: '11px', color: '#777', textTransform: 'uppercase',
    letterSpacing: '0.6px', fontWeight: 700, margin: '18px 0 8px',
  },
  input: {
    width: '100%', padding: '9px 11px', background: '#0f0f16',
    border: '1px solid #2c2c3a', borderRadius: '7px', color: '#e8e8f0',
    fontSize: '13px', boxSizing: 'border-box', marginBottom: '8px',
  },
  btn: (bg) => ({
    padding: '9px 14px', background: bg, color: '#fff', border: 'none',
    borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600,
  }),
  quiet: { fontSize: '12px', color: '#777', cursor: 'pointer', padding: '8px 0' },
};

export default function MoneyTab() {
  const [at, setAt] = useState(null);          // which project we are inside
  const [data, setData] = useState(null);
  const [showQuiet, setShowQuiet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState('');
  const [form, setForm] = useState({});
  const [report, setReport] = useState('');
  const [sleeping, setSleeping] = useState([]);
  const [naming, setNaming] = useState(false);
  const [fresh, setFresh] = useState('');

  // a new job, here or inside whatever he is looking at
  const newProject = async () => {
    if (fresh.trim().length < 2) return;
    setBusy(true);
    try {
      await fetch(API + '/api/projects/create', {
        method: 'POST', headers: H,
        body: JSON.stringify({ name: fresh.trim(), parent_id: at || null,
                               about: '', skip_tasks: true }),
      });
      setFresh(''); setNaming(false);
      await load(at);
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const load = async (pid) => {
    setErr(''); setReport('');
    try {
      const url = API + '/api/money/level' + (pid ? '?parent=' + pid : '');
      const r = await fetch(url, { headers: AUTH });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setData(j);
      if (pid) {
        try {
          const q = await fetch(API + '/api/money/' + pid + '/quiet', { headers: AUTH });
          const qj = await q.json();
          setSleeping(qj.quiet || []);
        } catch (e) { setSleeping([]); }
      } else {
        setSleeping([]);
      }
    } catch (e) { setErr(String(e)); }
  };

  useEffect(() => { load(at); }, [at]);

  const post = async (path, body) => {
    setBusy(true);
    try {
      await fetch(API + path, { method: 'POST', headers: H, body: JSON.stringify(body) });
      setForm({}); setAdding('');
      await load(at);
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const changeQuote = async (qid, amount, why) => {
    setBusy(true);
    try {
      await fetch(API + '/api/money/quote/' + qid, {
        method: 'PUT', headers: H, body: JSON.stringify({ amount, why }) });
      await load(at);
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const makeReport = async () => {
    setBusy(true);
    try {
      const r = await fetch(API + '/api/money/' + at + '/report', { headers: AUTH });
      const j = await r.json();
      setReport(j.report || '');
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const makePdf = async () => {
    setBusy(true);
    try {
      const r = await fetch(API + '/api/money/' + at + '/report.pdf', { headers: AUTH });
      const b = await r.blob();
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = u;
      a.download = ((data?.here?.name) || 'job') + ' money.pdf';
      a.click();
      URL.revokeObjectURL(u);
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  if (err) return <div style={S.wrap}><div style={{ color: '#f0a5a5' }}>{err}</div></div>;
  if (!data) return <div style={S.wrap}><div style={{ color: '#777' }}>Loading...</div></div>;

  const t = data.totals || {};
  const busyOnes = (data.under || []).filter(r => r.quoted || r.spent);
  const idle = (data.under || []).filter(r => !r.quoted && !r.spent);

  return (
    <div style={S.wrap}>
      {/* a new job */}
      {!naming ? (
        <button style={{ ...S.btn('#2a2a35'), marginBottom: '12px', fontSize: '12px' }}
                onClick={() => setNaming(true)}>
          + New {at ? 'inside this' : 'project'}
        </button>
      ) : (
        <div style={S.card}>
          <input style={S.input} value={fresh} autoFocus
                 placeholder={at ? 'Name it' : 'Name it - the chicken farm, say'}
                 onChange={e => setFresh(e.target.value)}
                 onKeyDown={e => { if (e.key === 'Enter') newProject(); }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={S.btn('#4f46e5')} onClick={newProject} disabled={busy}>Create</button>
            <button style={S.btn('#2a2a35')} onClick={() => setNaming(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* where we are */}
      {(data.trail || []).length > 0 && (
        <div style={{ fontSize: '12px', color: '#8b8b9e', marginBottom: '10px' }}>
          <span onClick={() => setAt(null)}
                style={{ cursor: 'pointer', color: '#8b8bff' }}>All</span>
          {(data.trail || []).map((c, i) => (
            <span key={c.id}>
              {' / '}
              <span onClick={() => setAt(c.id)}
                    style={{ cursor: 'pointer',
                             color: i === data.trail.length - 1 ? '#e8e8f0' : '#8b8bff' }}>
                {c.name}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* the number */}
      {(t.quoted || t.spent) ? (
        <div style={{ ...S.card, marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: '#8b8b9e', textTransform: 'uppercase',
                        letterSpacing: '0.6px', fontWeight: 700 }}>
            Still owed{data.here ? ' on ' + data.here.name : ' altogether'}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700,
                        color: t.owed > 0 ? '#f59e0b' : '#10b981' }}>
            {n0(t.owed)}
          </div>
          <div style={S.sub}>
            quoted {n0(t.quoted)} &middot; paid {n0(t.spent)}
          </div>
        </div>
      ) : null}

      {/* anything gone quiet */}
      {sleeping.length > 0 && (
        <div style={{ ...S.card, borderColor: '#4a3a1a', background: '#1f1a10' }}>
          <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700,
                        marginBottom: '6px' }}>
            Gone quiet
          </div>
          {sleeping.map(q => (
            <div key={q.quote_id} style={{ fontSize: '12px', color: '#d8c49a' }}>
              {q.who} &mdash; {q.what}, agreed {q.days} days ago, nothing paid
            </div>
          ))}
        </div>
      )}

      {/* what is under here */}
      {busyOnes.map(r => (
        <div key={r.id} style={{ ...S.card, cursor: 'pointer' }} onClick={() => setAt(r.id)}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={S.name}>{r.name}{r.goes_deeper ? ' \u203a' : ''}</div>
              <div style={S.sub}>quoted {n0(r.quoted)} &middot; paid {n0(r.spent)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: 700,
                            color: r.owed > 0 ? '#f59e0b' : '#10b981' }}>{n0(r.owed)}</div>
              <div style={{ fontSize: '11px', color: '#777' }}>owed</div>
            </div>
          </div>
        </div>
      ))}

      {idle.length > 0 && (
        <>
          <div style={S.quiet} onClick={() => setShowQuiet(!showQuiet)}>
            {showQuiet ? 'Hide' : 'Show'} the {idle.length} with nothing on them
          </div>
          {showQuiet && idle.map(r => (
            <div key={r.id} style={{ ...S.card, opacity: 0.6, cursor: 'pointer' }}
                 onClick={() => setAt(r.id)}>
              <div style={S.name}>{r.name}{r.goes_deeper ? ' \u203a' : ''}</div>
            </div>
          ))}
        </>
      )}

      {/* people working at this level */}
      {(data.people || []).length > 0 && <div style={S.label}>Working on this directly</div>}
      {(data.people || []).map(p => (
        <div key={p.id} style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={S.name}>{p.name}</div>
              {p.trade && <div style={S.sub}>{p.trade}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: 700,
                            color: p.owed > 0 ? '#f59e0b' : '#10b981' }}>{n0(p.owed)}</div>
              <div style={{ fontSize: '11px', color: '#777' }}>owed</div>
            </div>
          </div>

          {(p.quotes || []).map(q => (
            <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between',
                                     padding: '8px 0', borderBottom: '1px solid #1f1f28',
                                     fontSize: '13px' }}>
              <span style={{ color: '#bbb' }}>{q.what}</span>
              <span>
                {n0(q.amount)}
                <button onClick={() => {
                          const v = prompt('What is it now?', q.amount);
                          if (!v) return;
                          changeQuote(q.id, Number(v), prompt('Why did it change?') || '');
                        }}
                        style={{ background: 'none', border: 'none', color: '#8b8bff',
                                 cursor: 'pointer', marginLeft: '8px', fontSize: '12px' }}>
                  change
                </button>
              </span>
            </div>
          ))}

          {(p.drift || []).map((d, i) => (
            <div key={i} style={{ fontSize: '12px', color: '#f59e0b', marginTop: '6px' }}>
              {d.what}: started at {n0(d.first)}, now {n0(d.now)}
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

      {/* forms */}
      {at && adding === 'person' && (
        <div style={S.card}>
          <input style={S.input} placeholder="Name"
                 onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={S.input} placeholder="Trade - builder, carpenter, plumber"
                 onChange={e => setForm({ ...form, trade: e.target.value })} />
          <button style={S.btn('#4f46e5')} disabled={busy}
                  onClick={() => post('/api/money/' + at + '/person', form)}>Add</button>
        </div>
      )}
      {at && adding === 'quote' && (
        <div style={S.card}>
          <input style={S.input} placeholder="What is the work?"
                 onChange={e => setForm({ ...form, what: e.target.value })} />
          <input style={S.input} placeholder="How much?" type="number"
                 onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
          <textarea style={{ ...S.input, minHeight: '60px' }}
                    placeholder="What exactly was agreed? Who supplies what?"
                    onChange={e => setForm({ ...form, notes: e.target.value })} />
          <button style={S.btn('#4f46e5')} disabled={busy}
                  onClick={() => post('/api/money/' + at + '/quote', form)}>Save</button>
        </div>
      )}
      {at && adding === 'payment' && (
        <div style={S.card}>
          <input style={S.input} placeholder="How much?" type="number"
                 onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
          <input style={S.input} placeholder="What for?"
                 onChange={e => setForm({ ...form, what: e.target.value })} />
          <button style={S.btn('#10b981')} disabled={busy}
                  onClick={() => post('/api/money/' + at + '/payment', form)}>Record</button>
        </div>
      )}

      {at && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          {!adding ? (
            <button style={S.btn('#2a2a35')}
                    onClick={() => { setAdding('person'); setForm({}); }}>+ Someone</button>
          ) : (
            <button style={S.btn('#2a2a35')}
                    onClick={() => { setAdding(''); setForm({}); }}>Cancel</button>
          )}
          <button style={S.btn('#4f46e5')} onClick={makeReport} disabled={busy}>
            Create report
          </button>
          <button style={S.btn('#2a2a35')} onClick={makePdf} disabled={busy}>PDF</button>
        </div>
      )}

      {report && (
        <div style={{ ...S.card, marginTop: '12px' }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#ccc',
                        fontFamily: 'inherit', margin: 0 }}>{report}</pre>
          <button style={{ ...S.btn('#2a2a35'), marginTop: '10px', fontSize: '12px' }}
                  onClick={() => navigator.clipboard?.writeText(report)}>Copy it</button>
        </div>
      )}
    </div>
  );
}
