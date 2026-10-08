import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const PW = import.meta.env.VITE_API_PASSWORD || 'charlie';
const AUTH = { 'X-Ami-Password': PW };
const H = { 'Content-Type': 'application/json', ...AUTH };

const n0 = (v) => Math.round(Number(v) || 0).toLocaleString();
const WORDS = {
  agreed: 'agreed', paid: 'you paid', bought: 'they bought', lent: 'Loan out',
  borrowed: 'Loan', repaid: 'repaid', forgiven: 'written off', gift: 'a gift',
};

const S = {
  wrap: { padding: '14px 12px 40px', color: '#e8e8f0' },
  card: { background: '#17171f', border: '1px solid #26262f', borderRadius: '10px',
          padding: '13px', marginBottom: '9px' },
  name: { fontSize: '15px', fontWeight: 700 },
  sub: { fontSize: '12px', color: '#8b8b9e', marginTop: '3px' },
  label: { fontSize: '11px', color: '#777', textTransform: 'uppercase',
           letterSpacing: '0.6px', fontWeight: 700, margin: '16px 0 8px' },
  input: { width: '100%', padding: '10px 12px', background: '#0f0f16',
           border: '1px solid #2c2c3a', borderRadius: '8px', color: '#e8e8f0',
           fontSize: '14px', boxSizing: 'border-box', marginBottom: '8px' },
  btn: (bg) => ({ padding: '10px 15px', background: bg, color: '#fff', border: 'none',
                  borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }),
  tab: (on) => ({ padding: '7px 13px', borderRadius: '16px', fontSize: '12px',
                  cursor: 'pointer', border: '1px solid ' + (on ? '#4f46e5' : '#2c2c3a'),
                  background: on ? '#1d1d3a' : 'transparent',
                  color: on ? '#a5a5ff' : '#888', flexShrink: 0, fontWeight: 600 }),
  line: { display: 'flex', justifyContent: 'space-between', gap: '10px',
          padding: '10px 0', borderBottom: '1px solid #1f1f28', cursor: 'pointer' },
};

export default function MoneyTab() {
  const [view, setView] = useState('people');
  const [people, setPeople] = useState([]);
  const [loans, setLoans] = useState([]);
  const [projects, setProjects] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [acct, setAcct] = useState(null);
  const [openProject, setOpenProject] = useState(null);
  const [projReport, setProjReport] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState('');
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(null);
  const [edit, setEdit] = useState({});
  const [report, setReport] = useState('');

  const load = async () => {
    setErr('');
    try {
      if (view === 'people') {
        const r = await fetch(API + '/api/ledger/people', { headers: AUTH });
        setPeople((await r.json()).people || []);
      } else if (view === 'loans') {
        const r = await fetch(API + '/api/ledger/loans', { headers: AUTH });
        setLoans((await r.json()).loans || []);
      } else {
        const r = await fetch(API + '/api/project-board', { headers: AUTH });
        setProjects((await r.json()).projects || []);
      }
    } catch (e) { setErr(String(e)); }
  };

  const loadAcct = async (id) => {
    setAcct(null); setReport(''); setAdding(''); setEditing(null);
    try {
      const r = await fetch(API + '/api/ledger/account/' + id, { headers: AUTH });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setAcct(j);
    } catch (e) { setErr(String(e)); }
  };

  useEffect(() => { load(); }, [view]);
  useEffect(() => { if (openId) loadAcct(openId); }, [openId]);
  useEffect(() => {
    if (!openProject) { setProjReport(''); return; }
    (async () => {
      try {
        const r = await fetch(API + '/api/ledger/report?what=project&id=' + openProject,
                              { headers: AUTH });
        setProjReport((await r.json()).report || '');
      } catch (e) { setErr(String(e)); }
    })();
  }, [openProject]);

  const save = async (path, body, method = 'POST') => {
    setBusy(true);
    try {
      const r = await fetch(API + path, { method, headers: H, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.error) { setErr(j.error); setBusy(false); return; }
      setForm({}); setAdding(''); setEditing(null);
      if (openId) await loadAcct(openId);
      await load();
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const removeLine = async (eid) => {
    if (!window.confirm('Take this line off for good?')) return;
    setBusy(true);
    try {
      await fetch(API + '/api/ledger/entry/' + eid, { method: 'DELETE', headers: AUTH });
      setEditing(null);
      await loadAcct(openId);
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const getReport = async (what, id) => {
    setBusy(true);
    try {
      const r = await fetch(API + '/api/ledger/report?what=' + what + (id ? '&id=' + id : ''),
                            { headers: AUTH });
      setReport((await r.json()).report || '');
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const getPdf = async (what, id, name) => {
    setBusy(true);
    try {
      const r = await fetch(API + '/api/ledger/report.pdf?what=' + what + (id ? '&id=' + id : ''),
                            { headers: AUTH });
      const b = await r.blob();
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = u; a.download = (name || 'money') + '.pdf'; a.click();
      URL.revokeObjectURL(u);
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  if (openId && acct) {
    const bal = Object.entries(acct.balances || {});
    return (
      <div style={S.wrap}>
        <button onClick={() => { setOpenId(null); setAcct(null); }}
                style={{ background: 'none', border: 'none', color: '#8b8bff',
                         cursor: 'pointer', fontSize: '13px', padding: '0 0 10px' }}>
          &#8592; Everyone
        </button>
        <div style={{ fontSize: '19px', fontWeight: 700 }}>{acct.person.name}</div>
        {acct.person.what_they_do && <div style={S.sub}>{acct.person.what_they_do}</div>}

        {bal.map(([cur, b]) => (Math.abs(b.net) < 0.01 ? null : (
          <div key={cur} style={{ ...S.card, marginTop: '12px' }}>
            <div style={{ fontSize: '11px', color: '#8b8b9e', textTransform: 'uppercase',
                          letterSpacing: '0.6px', fontWeight: 700 }}>
              {b.net > 0 ? 'They owe you' : 'You owe them'}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700,
                          color: b.net > 0 ? '#10b981' : '#f59e0b' }}>
              {n0(Math.abs(b.net))} <span style={{ fontSize: '15px' }}>{cur}</span>
            </div>
            {b.usd && cur !== 'USD' && <div style={S.sub}>about {n0(b.usd)} USD</div>}
          </div>
        )))}

        {adding !== 'entry' ? (
          <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
            <button style={{ ...S.btn('#10b981'), flex: 1 }}
                    onClick={() => { setAdding('entry');
                                     setForm({ kind: 'paid', currency: (bal[0] || ['USD'])[0] }); }}>
              + Add a line
            </button>
            <button style={S.btn('#2a2a35')} onClick={() => getReport('person', openId)}>Report</button>
            <button style={S.btn('#2a2a35')}
                    onClick={() => getPdf('person', openId, acct.person.name)}>PDF</button>
          </div>
        ) : (
          <div style={{ ...S.card, marginTop: '12px', borderColor: '#3a3a5a' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {[['paid', 'I paid them'], ['repaid', 'They paid me'], ['agreed', 'We agreed'],
                ['lent', 'I lent them'], ['borrowed', 'I borrowed'],
                ['bought', 'They bought'], ['gift', 'A gift']].map(([k, lbl]) => (
                <button key={k} style={S.tab(form.kind === k)}
                        onClick={() => setForm({ ...form, kind: k })}>{lbl}</button>
              ))}
            </div>
            <input style={S.input} type="number" placeholder="How much?" autoFocus
                   onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
            <input style={S.input} placeholder="Currency" value={form.currency || ''}
                   onChange={e => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            <input style={S.input} placeholder="What was it for?"
                   onChange={e => setForm({ ...form, note: e.target.value })} />
            <input style={S.input} type="date"
                   onChange={e => setForm({ ...form, happened_on: e.target.value })} />
            {['paid', 'repaid'].includes(form.kind) && (
              <select style={S.input} value={form.how_sent || ''}
                      onChange={e => setForm({ ...form, how_sent: e.target.value })}>
                <option value="">How did it go?</option>
                {(acct.ways || []).map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={S.btn('#10b981')} disabled={busy}
                      onClick={() => save('/api/ledger/entry', { ...form, person_id: openId })}>
                Save
              </button>
              <button style={S.btn('#2a2a35')}
                      onClick={() => { setAdding(''); setForm({}); }}>Cancel</button>
            </div>
          </div>
        )}

        {/* two hands: what came in, what went back */}
        {['came_in', 'went_back', 'gifts'].map(side => {
          const rows = acct[side] || [];
          if (!rows.length) return null;
          const heading = side === 'came_in' ? 'What came in'
                        : side === 'went_back' ? 'What went back'
                        : 'Gifts (not counted)';
          return (
            <div key={side}>
              <div style={S.label}>{heading}</div>
              {rows.map(l => (
                editing === l.id ? (
                  <div key={l.id} style={{ ...S.card, borderColor: '#3a3a5a' }}>
                    <input style={S.input} type="number" defaultValue={l.amount}
                           onChange={e => setEdit({ ...edit, amount: Number(e.target.value) })} />
                    <input style={S.input} defaultValue={l.note} placeholder="What was it for?"
                           onChange={e => setEdit({ ...edit, note: e.target.value })} />
                    <input style={S.input} type="date" defaultValue={l.on}
                           onChange={e => setEdit({ ...edit, happened_on: e.target.value })} />
                    {side === 'went_back' && (
                      <select style={S.input} defaultValue={l.how_sent || ''}
                              onChange={e => setEdit({ ...edit, how_sent: e.target.value })}>
                        <option value="">How did it go?</option>
                        {(acct.ways || []).map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    )}
                    {l.kind === 'agreed' && (
                      <input style={S.input} placeholder="Why did the figure change?"
                             onChange={e => setEdit({ ...edit, why: e.target.value })} />
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button style={S.btn('#4f46e5')} disabled={busy}
                              onClick={() => save('/api/ledger/entry/' + l.id, edit, 'PUT')}>
                        Save
                      </button>
                      <button style={S.btn('#2a2a35')}
                              onClick={() => { setEditing(null); setEdit({}); }}>Cancel</button>
                      <button style={{ ...S.btn('#3a1f1f'), marginLeft: 'auto' }}
                              onClick={() => removeLine(l.id)}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <div key={l.id} style={S.line}
                       onClick={() => { setEditing(l.id); setEdit({}); }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px' }}>
                        {l.note || WORDS[l.kind] || l.kind}
                      </div>
                      <div style={{ fontSize: '11px', color: '#777' }}>
                        {String(l.on || '').slice(0, 10)}
                        {l.how_sent ? ' \u00b7 ' + l.how_sent : ''}
                        {l.project ? ' \u00b7 ' + l.project : ''}
                        {l.status === 'forgiven' ? ' \u00b7 written off' : ''}
                      </div>
                      {(l.moved || []).map((m, k) => (
                        <div key={k} style={{ fontSize: '11px', color: '#f59e0b' }}>
                          was {n0(m.was)}, now {n0(m.now_is)}{m.why ? ' \u2014 ' + m.why : ''}
                        </div>
                      ))}
                    </div>
                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '14px',
                                    color: side === 'went_back' ? '#10b981'
                                         : side === 'gifts' ? '#a78bfa' : '#e8e8f0',
                                    textDecoration: l.status === 'forgiven'
                                      ? 'line-through' : 'none' }}>
                        {side === 'went_back' ? '\u2212' : ''}{n0(l.amount)} {l.currency}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666' }}>tap to change</div>
                    </div>
                  </div>
                )
              ))}
            </div>
          );
        })}

        {acct.older_not_shown > 0 && (
          <div style={{ fontSize: '12px', color: '#777', marginTop: '10px' }}>
            {acct.older_not_shown} older lines not shown
          </div>
        )}

        {report && (
          <div style={{ ...S.card, marginTop: '14px' }}>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#ccc',
                          fontFamily: 'ui-monospace, monospace', margin: 0 }}>{report}</pre>
            <button style={{ ...S.btn('#2a2a35'), marginTop: '10px', fontSize: '12px' }}
                    onClick={() => navigator.clipboard?.writeText(report)}>Copy</button>
          </div>
        )}
      </div>
    );
  }

  if (openProject) {
    return (
      <div style={S.wrap}>
        <button onClick={() => setOpenProject(null)}
                style={{ background: 'none', border: 'none', color: '#8b8bff',
                         cursor: 'pointer', fontSize: '13px', padding: '0 0 10px' }}>
          &#8592; All jobs
        </button>
        {projReport ? (
          <div style={S.card}>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#ddd',
                          fontFamily: 'ui-monospace, monospace', margin: 0 }}>{projReport}</pre>
          </div>
        ) : <div style={{ color: '#777', fontSize: '13px' }}>Loading...</div>}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={S.btn('#2a2a35')}
                  onClick={() => navigator.clipboard?.writeText(projReport)}>Copy</button>
          <button style={S.btn('#4f46e5')}
                  onClick={() => getPdf('project', openProject, 'job')}>PDF</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.wrap}>
      {err && (
        <div style={{ ...S.card, borderColor: '#5f2a2a', color: '#f0a5a5', fontSize: '13px' }}
             onClick={() => setErr('')}>{err}</div>
      )}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {[['people', 'People'], ['loans', 'Lending'], ['projects', 'Jobs']].map(([k, lbl]) => (
          <button key={k} style={S.tab(view === k)} onClick={() => setView(k)}>{lbl}</button>
        ))}
        <button style={{ ...S.tab(false), marginLeft: 'auto' }}
                onClick={() => getReport('all')}>Everything</button>
      </div>

      {view === 'people' && (
        <>
          {adding === 'person' ? (
            <div style={S.card}>
              <input style={S.input} placeholder="Their name" autoFocus
                     onChange={e => setForm({ ...form, name: e.target.value })} />
              <input style={S.input} placeholder="What they do"
                     onChange={e => setForm({ ...form, what_they_do: e.target.value })} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn('#4f46e5')} disabled={busy}
                        onClick={() => save('/api/ledger/person', form)}>Add</button>
                <button style={S.btn('#2a2a35')}
                        onClick={() => { setAdding(''); setForm({}); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button style={{ ...S.btn('#2a2a35'), marginBottom: '12px', width: '100%' }}
                    onClick={() => { setAdding('person'); setForm({}); }}>+ Someone new</button>
          )}
          {people.filter(p => !p.quiet).map(p => {
            const b = Object.entries(p.balances || {})[0];
            const net = b ? b[1].net : 0;
            return (
              <div key={p.id} style={{ ...S.card, cursor: 'pointer' }} onClick={() => setOpenId(p.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={S.name}>{p.name}</div>
                    {p.what_they_do && <div style={S.sub}>{p.what_they_do}</div>}
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700,
                                  color: net > 0 ? '#10b981' : '#f59e0b' }}>
                      {n0(Math.abs(net))} {b ? b[0] : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#777' }}>
                      {net > 0 ? 'they owe you' : 'you owe'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {people.filter(p => p.quiet).length > 0 && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              {people.filter(p => p.quiet).map(p => (
                <span key={p.id} onClick={() => setOpenId(p.id)}
                      style={{ cursor: 'pointer', marginRight: '10px' }}>{p.name} &middot;</span>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'loans' && (
        <>
          {loans.length === 0 && (
            <div style={{ fontSize: '13px', color: '#777' }}>Nothing lent either way.</div>
          )}
          {loans.map(l => (
            <div key={l.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={S.name}>{l.who}</div>
                  <div style={S.sub}>
                    {l.direction} {n0(l.principal)} {l.currency}{l.note ? ' \u00b7 ' + l.note : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700,
                                color: l.direction === 'he lent' ? '#10b981' : '#f59e0b' }}>
                    {n0(l.left)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#777' }}>left</div>
                </div>
              </div>
              {l.months_to_clear ? (
                <div style={{ fontSize: '12px', color: '#8b8b9e', marginTop: '6px' }}>
                  {n0(l.repay_amount)} a {l.repay_every || 'month'} &middot; clears in{' '}
                  {l.months_to_clear} months
                </div>
              ) : null}
            </div>
          ))}
          <button style={{ ...S.btn('#2a2a35'), marginTop: '10px' }}
                  onClick={() => getReport('loans')}>Report on the lending</button>
        </>
      )}

      {view === 'projects' && projects.map(p => (
        <div key={p.id} style={{ ...S.card, cursor: 'pointer' }} onClick={() => setOpenProject(p.id)}>
          <div style={S.name}>{p.name}</div>
          <div style={S.sub}>tap for what it has cost</div>
        </div>
      ))}

      {report && (
        <div style={{ ...S.card, marginTop: '14px' }}>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#ccc',
                        fontFamily: 'ui-monospace, monospace', margin: 0 }}>{report}</pre>
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button style={{ ...S.btn('#2a2a35'), fontSize: '12px' }}
                    onClick={() => navigator.clipboard?.writeText(report)}>Copy</button>
            <button style={{ ...S.btn('#2a2a35'), fontSize: '12px' }}
                    onClick={() => setReport('')}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
