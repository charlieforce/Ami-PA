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
  const [job, setJob] = useState(null);
  const [jobAdd, setJobAdd] = useState('');
  const [jobForm, setJobForm] = useState({});
  const [payWho, setPayWho] = useState(null);
  const [pay, setPay] = useState({});
  const [mats, setMats] = useState([]);
  const [gotWhat, setGotWhat] = useState(null);
  const [got, setGot] = useState({});
  const [cameFrom, setCameFrom] = useState(null);
  const [watchNotes, setWatchNotes] = useState([]);
  const [coming, setComing] = useState(null);
  const [hunt, setHunt] = useState('');
  const [found, setFound] = useState(null);
  const [newLoan, setNewLoan] = useState(false);
  const [loanForm, setLoanForm] = useState({});
  const [openGroups, setOpenGroups] = useState({});
  const [editMat, setEditMat] = useState(null);
  const [matForm, setMatForm] = useState({});
  const [editNote, setEditNote] = useState(false);
  const [noteText, setNoteText] = useState('');

  const load = async () => {
    setErr('');
    try {
      if (view === 'people') {
        const r = await fetch(API + '/api/ledger/people', { headers: AUTH });
        setPeople((await r.json()).people || []);
      } else if (view === 'loans') {
        const r = await fetch(API + '/api/ledger/lending', { headers: AUTH });
        setLoans(await r.json());
      } else {
        const r = await fetch(API + '/api/ledger/jobs', { headers: AUTH });
        setProjects((await r.json()).jobs || []);
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

  useEffect(() => {
    (async () => {
      try {
        const w = await fetch(API + '/api/ledger/watch', { headers: AUTH });
        setWatchNotes((await w.json()).notes || []);
        const c = await fetch(API + '/api/ledger/coming', { headers: AUTH });
        setComing(await c.json());
      } catch (e) { /* not worth shouting about */ }
    })();
  }, []);

  // searching across every line
  useEffect(() => {
    if (hunt.trim().length < 2) { setFound(null); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(API + '/api/ledger/search?q=' + encodeURIComponent(hunt.trim()),
                              { headers: AUTH });
        setFound((await r.json()).found || []);
      } catch (e) { setFound([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [hunt]);
  useEffect(() => { if (openId) loadAcct(openId); }, [openId]);
  useEffect(() => {
    if (!openProject) { setProjReport(''); return; }
    (async () => {
      try {
        const r = await fetch(API + '/api/ledger/job/' + openProject,
                              { headers: AUTH });
        const j = await r.json();
        setJob(j);
        setProjReport(j.report || '');
        try {
          const rm = await fetch(API + '/api/ledger/job/' + openProject + '/materials',
                                 { headers: AUTH });
          setMats((await rm.json()).materials || []);
        } catch (e) { setMats([]); }
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

  const dropPerson = async () => {
    if (!window.confirm('Remove this person? Anything that actually moved is kept.')) return;
    setBusy(true);
    try {
      const r = await fetch(API + '/api/ledger/person/' + openId,
                            { method: 'DELETE', headers: AUTH });
      const j = await r.json();
      if (j.error) { setErr(j.error); } else { setErr(j.says || ''); }
      setOpenId(null); setAcct(null);
      await load();
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const dropJob = async () => {
    if (!window.confirm('Remove this job? Anything on it is kept.')) return;
    setBusy(true);
    try {
      const r = await fetch(API + '/api/ledger/job/' + openProject,
                            { method: 'DELETE', headers: AUTH });
      const j = await r.json();
      if (j.error) { setErr(j.error); } else { setErr(j.says || ''); }
      setOpenProject(null); setJob(null);
      await load();
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const markDone = async (eid, undo) => {
    setBusy(true);
    try {
      await fetch(API + '/api/ledger/entry/' + eid + '/done', {
        method: 'POST', headers: H, body: JSON.stringify(undo ? { undo: '1' } : {}) });
      setEditing(null);
      if (openId) await loadAcct(openId);
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
        <button onClick={() => {
                  setOpenId(null); setAcct(null);
                  if (cameFrom) { setOpenProject(cameFrom); setCameFrom(null); }
                }}
                style={{ background: 'none', border: 'none', color: '#8b8bff',
                         cursor: 'pointer', fontSize: '13px', padding: '0 0 10px' }}>
          &#8592; {cameFrom ? 'Back to the job' : 'Everyone'}
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

        {/* two buttons, two jobs */}
        {!adding && (
          <div style={{ display: 'flex', gap: '8px', margin: '12px 0', flexWrap: 'wrap' }}>
            <button style={{ ...S.btn('#f59e0b'), flex: 1 }}
                    onClick={() => { setAdding('item');
                                     setForm({ kind: 'borrowed',
                                               currency: (bal[0] || ['USD'])[0] }); }}>
              + Something came in
            </button>
            <button style={{ ...S.btn('#10b981'), flex: 1 }}
                    onClick={() => { setAdding('payment');
                                     setForm({ kind: 'repaid',
                                               currency: (bal[0] || ['USD'])[0] }); }}>
              + I sent money
            </button>
          </div>
        )}
        {!adding && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
            <button style={{ ...S.btn('#2a2a35'), fontSize: '12px' }}
                    onClick={() => getReport('person', openId)}>Report</button>
            <button style={{ ...S.btn('#2a2a35'), fontSize: '12px' }}
                    onClick={() => getPdf('person', openId, acct.person.name)}>PDF</button>
            <button style={{ ...S.btn('#2a2a35'), fontSize: '12px', marginLeft: 'auto',
                             color: '#b88' }}
                    onClick={dropPerson}>Remove</button>
          </div>
        )}

        {adding === 'item' && (
          <div style={{ ...S.card, borderColor: '#4a3a1a' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              What came in
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap',
                          marginBottom: '10px' }}>
              {[['borrowed', 'A loan'], ['bought', 'They bought something'],
                ['agreed', 'We agreed work'], ['lent', 'I lent them'],
                ['gift', 'A gift']].map(([k, lbl]) => (
                <button key={k} style={S.tab(form.kind === k)}
                        onClick={() => setForm({ ...form, kind: k })}>{lbl}</button>
              ))}
            </div>
            <input style={S.input} type="number" placeholder="How much?" autoFocus
                   onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
            <input style={S.input} placeholder="Currency" value={form.currency || ''}
                   onChange={e => setForm({ ...form,
                                            currency: e.target.value.toUpperCase() })} />
            <input style={S.input} placeholder="What was it for?"
                   onChange={e => setForm({ ...form, note: e.target.value })} />
            <input style={S.input} type="date"
                   onChange={e => setForm({ ...form, happened_on: e.target.value })} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={S.btn('#f59e0b')} disabled={busy}
                      onClick={() => save('/api/ledger/entry',
                                          { ...form, person_id: openId })}>Save</button>
              <button style={S.btn('#2a2a35')}
                      onClick={() => { setAdding(''); setForm({}); }}>Cancel</button>
            </div>
          </div>
        )}

        {adding === 'payment' && (
          <div style={{ ...S.card, borderColor: '#1f3a2a' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
              What you sent
            </div>
            <input style={S.input} type="number" autoFocus
                   placeholder={bal[0] ? 'How much? (owing '
                                 + n0(Math.abs(bal[0][1].net)) + ')' : 'How much?'}
                   onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
            <input style={S.input} placeholder="Currency" value={form.currency || ''}
                   onChange={e => setForm({ ...form,
                                            currency: e.target.value.toUpperCase() })} />
            <input style={S.input} type="date"
                   onChange={e => setForm({ ...form, happened_on: e.target.value })} />
            <select style={S.input} value={form.how_sent || ''}
                    onChange={e => setForm({ ...form, how_sent: e.target.value })}>
              <option value="">How did you send it?</option>
              {(acct.ways || ['cash', 'bank transfer', 'mobile money', 'PayPal',
                              'e-transfer', 'cheque', 'other']).map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
            <input style={S.input} placeholder="Note"
                   onChange={e => setForm({ ...form, note: e.target.value })} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={S.btn('#10b981')} disabled={busy}
                      onClick={() => save('/api/ledger/pay',
                                          { ...form, person_id: openId })}>Record it</button>
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
              <div style={{ ...S.card, marginTop: '14px',
                            borderLeft: '3px solid ' + (side === 'went_back' ? '#10b981'
                                                      : side === 'gifts' ? '#a78bfa'
                                                      : '#f59e0b') }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                            alignItems: 'baseline', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700 }}>{heading}</span>
                <span style={{ fontSize: '13px', color: '#8b8b9e' }}>
                  {n0(rows.reduce((t, x) => t + (Number(x.amount) || 0), 0))}
                  {' '}{rows[0] ? rows[0].currency : ''}
                </span>
              </div>
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
                      {l.kind === 'agreed' && (
                        <button style={S.btn(l.status === 'done' ? '#2a2a35' : '#1f3a2a')}
                                onClick={() => markDone(l.id, l.status === 'done')}>
                          {l.status === 'done' ? 'Not finished after all' : 'Mark finished'}
                        </button>
                      )}
                      <label style={{ ...S.btn('#2a2a35'), cursor: 'pointer' }}>
                        {l.receipts ? l.receipts + ' receipt' + (l.receipts > 1 ? 's' : '')
                                    : 'Add a receipt'}
                        <input type="file" style={{ display: 'none' }}
                               accept="image/*,.pdf"
                               onChange={async (ev) => {
                                 const f = ev.target.files && ev.target.files[0];
                                 if (!f) return;
                                 setBusy(true);
                                 try {
                                   const fd = new FormData();
                                   fd.append('file', f);
                                   await fetch(API + '/api/ledger/entry/' + l.id + '/receipt',
                                               { method: 'POST', headers: AUTH, body: fd });
                                   await loadAcct(openId);
                                 } catch (e) { setErr(String(e)); }
                                 setBusy(false);
                               }} />
                      </label>
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
                        {l.status === 'done' ? ' \u00b7 finished and settled' : ''}
                        {l.receipts ? ' \u00b7 \uD83D\uDCCE' + l.receipts : ''}
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
                                    opacity: l.status === 'done' ? 0.55 : 1,
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
        {job && (
          <>
            <div style={{ fontSize: '20px', fontWeight: 700 }}>{job.name}</div>
            {job.part_of && (
              <div style={{ fontSize: '12px', color: '#8b8b9e', marginTop: '2px' }}>
                part of {job.part_of}
              </div>
            )}
            {job.totals && (job.totals.agreed || job.totals.spent) ? (
              <div style={{ fontSize: '13px', color: '#8b8b9e', marginTop: '6px' }}>
                {n0(job.totals.agreed)} agreed &middot; {n0(job.totals.spent)} paid
                &middot;{' '}
                <span style={{ color: job.totals.owed > 0 ? '#f59e0b' : '#10b981' }}>
                  {n0(job.totals.owed)} still owed
                </span>
              </div>
            ) : null}

            {editNote ? (
              <div style={{ ...S.card, marginTop: '10px', borderColor: '#3a3a5a' }}>
                <textarea style={{ ...S.input, minHeight: '90px' }} autoFocus
                          defaultValue={job.note || ''}
                          placeholder="What does this cover? Anything you would want to
                                       remember in six months."
                          onChange={e => setNoteText(e.target.value)} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={S.btn('#4f46e5')} disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            try {
                              await fetch(API + '/api/ledger/job/' + openProject + '/note', {
                                method: 'PUT', headers: H,
                                body: JSON.stringify({ note: noteText }) });
                              setEditNote(false);
                              const r = await fetch(API + '/api/ledger/job/' + openProject,
                                                    { headers: AUTH });
                              const j = await r.json();
                              setJob(j); setProjReport(j.report || '');
                            } catch (e) { setErr(String(e)); }
                            setBusy(false);
                          }}>Save</button>
                  <button style={S.btn('#2a2a35')}
                          onClick={() => setEditNote(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ ...S.card, marginTop: '10px', cursor: 'pointer' }}
                   onClick={() => { setEditNote(true); setNoteText(job.note || ''); }}>
                <div style={{ fontSize: '13px',
                              color: job.note ? '#ccc' : '#666',
                              whiteSpace: 'pre-wrap' }}>
                  {job.note || 'Add a note about this one'}
                </div>
              </div>
            )}
          </>
        )}

        {job && job.people && job.people.length > 0 && (
          <>
            <div style={S.label}>Who is on it</div>
            {job.people.map(p => (
              <div key={p.id} style={{ ...S.card, cursor: 'pointer' }}
                   onClick={() => { setOpenProject(null); setOpenId(p.id); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={S.name}>{p.name}</div>
                    {p.what_they_do && <div style={S.sub}>{p.what_they_do}</div>}
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700,
                                  color: p.net > 0 ? '#10b981' : '#f59e0b' }}>
                      {n0(Math.abs(p.net))} {p.currency}
                    </div>
                    <div style={{ fontSize: '11px', color: '#777' }}>
                      {p.net > 0 ? 'owed' : 'you owe'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '9px' }}>
                  <button style={{ ...S.btn('#10b981'), fontSize: '12px', padding: '7px 13px' }}
                          onClick={(ev) => { ev.stopPropagation();
                                             setPayWho(p.id); setPay({}); }}>
                    Pay
                  </button>
                  <button style={{ ...S.btn('#2a2a35'), fontSize: '12px', padding: '7px 13px' }}
                          onClick={(ev) => { ev.stopPropagation();
                                             setCameFrom(openProject);
                                             setOpenProject(null); setOpenId(p.id); }}>
                    Open account
                  </button>
                </div>

                {payWho === p.id && (
                  <div style={{ marginTop: '10px', paddingTop: '10px',
                                borderTop: '1px solid #26262f' }}
                       onClick={(ev) => ev.stopPropagation()}>
                    <input style={S.input} type="number" autoFocus
                           placeholder={'How much? (owing ' + n0(Math.abs(p.net)) + ')'}
                           onChange={e => setPay({ ...pay, amount: Number(e.target.value) })} />
                    <input style={S.input} type="date"
                           onChange={e => setPay({ ...pay, happened_on: e.target.value })} />
                    <select style={S.input} value={pay.how_sent || ''}
                            onChange={e => setPay({ ...pay, how_sent: e.target.value })}>
                      <option value="">How did it go?</option>
                      {['cash', 'bank transfer', 'mobile money', 'PayPal', 'e-transfer',
                        'cheque', 'other'].map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <input style={S.input} placeholder="Note"
                           onChange={e => setPay({ ...pay, note: e.target.value })} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={S.btn('#10b981')} disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  await fetch(API + '/api/ledger/pay', {
                                    method: 'POST', headers: H,
                                    body: JSON.stringify({ ...pay, person_id: p.id,
                                                           venture_id: openProject }) });
                                  setPayWho(null); setPay({});
                                  const r = await fetch(API + '/api/ledger/job/' + openProject,
                                                        { headers: AUTH });
                                  const j = await r.json();
                                  setJob(j); setProjReport(j.report || '');
                                } catch (e) { setErr(String(e)); }
                                setBusy(false);
                              }}>Record it</button>
                      <button style={S.btn('#2a2a35')}
                              onClick={() => { setPayWho(null); setPay({}); }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {mats.length > 0 && (
          <>
            <div style={S.label}>Materials and equipment</div>
            {mats.map(m => (
              <div key={m.id} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={S.name}>{m.what}</div>
                    <div style={S.sub}>
                      {m.quantity ? n0(m.quantity) + (m.unit ? ' ' + m.unit : '') : ''}
                      {m.unit_price ? ' at ' + m.unit_price : ''}
                      {m.quantity ? ' \u00b7 got ' + n0(m.got) : ''}
                      {m.still_to_get ? ' \u00b7 ' + n0(m.still_to_get) + ' still to come' : ''}
                    </div>
                    {(m.moved || []).map((mv, k) => (
                      <div key={k} style={{ fontSize: '11px', color: '#f59e0b' }}>
                        was {n0(mv.was)}, now {n0(mv.now_is)}
                        {mv.why ? ' \u2014 ' + mv.why : ''}
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700,
                                  color: m.done ? '#10b981' : '#e8e8f0' }}>
                      {n0(m.amount)} {m.currency}
                    </div>
                    <div style={{ fontSize: '11px', color: '#777' }}>
                      {m.done ? 'got it' : 'still to get'}
                    </div>
                  </div>
                </div>

                {editMat === m.id ? (
                  <div style={{ marginTop: '10px', paddingTop: '10px',
                                borderTop: '1px solid #26262f' }}>
                    <input style={S.input} defaultValue={m.what} placeholder="What is it?"
                           onChange={e => setMatForm({ ...matForm, what: e.target.value })} />
                    <input style={S.input} type="number" defaultValue={m.quantity || ''}
                           placeholder="How many?"
                           onChange={e => setMatForm({ ...matForm,
                                                       quantity: Number(e.target.value) })} />
                    <input style={S.input} type="number"
                           defaultValue={m.unit_price || m.amount}
                           placeholder="Price each"
                           onChange={e => setMatForm({ ...matForm,
                                                   unit_price: Number(e.target.value) })} />
                    <input style={S.input} placeholder="Why did it change?"
                           onChange={e => setMatForm({ ...matForm, why: e.target.value })} />
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button style={S.btn('#4f46e5')} disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  await fetch(API + '/api/ledger/material/' + m.id, {
                                    method: 'PUT', headers: H,
                                    body: JSON.stringify({
                                      ...matForm,
                                      quantity: matForm.quantity || m.quantity || 1,
                                      unit_price: matForm.unit_price
                                                  || m.unit_price || m.amount }) });
                                  setEditMat(null); setMatForm({});
                                  const rm = await fetch(API + '/api/ledger/job/'
                                             + openProject + '/materials', { headers: AUTH });
                                  setMats((await rm.json()).materials || []);
                                } catch (e) { setErr(String(e)); }
                                setBusy(false);
                              }}>Save</button>
                      <button style={S.btn('#2a2a35')}
                              onClick={() => { setEditMat(null); setMatForm({}); }}>
                        Cancel
                      </button>
                      <button style={{ ...S.btn('#3a1f1f'), marginLeft: 'auto' }}
                              onClick={async () => {
                                if (!window.confirm('Take this off for good?')) return;
                                setBusy(true);
                                try {
                                  await fetch(API + '/api/ledger/entry/' + m.id,
                                              { method: 'DELETE', headers: AUTH });
                                  setEditMat(null);
                                  const rm = await fetch(API + '/api/ledger/job/'
                                             + openProject + '/materials', { headers: AUTH });
                                  setMats((await rm.json()).materials || []);
                                } catch (e) { setErr(String(e)); }
                                setBusy(false);
                              }}>Remove</button>
                    </div>
                  </div>
                ) : gotWhat === m.id ? (
                  <div style={{ marginTop: '10px', paddingTop: '10px',
                                borderTop: '1px solid #26262f' }}>
                    <input style={S.input} type="number"
                           placeholder={'How many? (' + n0(m.still_to_get || m.quantity)
                                        + ' outstanding)'}
                           onChange={e => setGot({ ...got, quantity: Number(e.target.value) })} />
                    <input style={S.input} type="number"
                           placeholder={'Price each (was ' + (m.unit_price || '?') + ')'}
                           onChange={e => setGot({ ...got,
                                                   unit_price: Number(e.target.value) })} />
                    <select style={S.input} value={got.how_sent || ''}
                            onChange={e => setGot({ ...got, how_sent: e.target.value })}>
                      <option value="">How did you pay?</option>
                      {['cash', 'bank transfer', 'mobile money', 'PayPal', 'e-transfer',
                        'cheque', 'other'].map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={S.btn('#10b981')} disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  await fetch(API + '/api/ledger/material/' + m.id + '/got', {
                                    method: 'POST', headers: H, body: JSON.stringify(got) });
                                  setGotWhat(null); setGot({});
                                  const rm = await fetch(API + '/api/ledger/job/' + openProject
                                                         + '/materials', { headers: AUTH });
                                  setMats((await rm.json()).materials || []);
                                } catch (e) { setErr(String(e)); }
                                setBusy(false);
                              }}>Got it</button>
                      <button style={S.btn('#2a2a35')}
                              onClick={() => { setGotWhat(null); setGot({}); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '9px' }}>
                    {!m.done && (
                      <button style={{ ...S.btn('#10b981'), fontSize: '12px',
                                       padding: '7px 13px' }}
                              onClick={() => { setGotWhat(m.id);
                                setGot({ quantity: m.still_to_get || m.quantity || 1,
                                         unit_price: m.unit_price || m.amount }); }}>
                        {m.quantity ? 'I got some' : 'I bought it'}
                      </button>
                    )}
                    <button style={{ ...S.btn('#2a2a35'), fontSize: '12px',
                                     padding: '7px 13px' }}
                            onClick={() => { setEditMat(m.id); setMatForm({}); }}>
                      Change
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {jobAdd === 'work' ? (
          <div style={{ ...S.card, borderColor: '#3a3a5a' }}>
            <input style={S.input} placeholder="Who is doing it?" autoFocus
                   onChange={e => setJobForm({ ...jobForm, name: e.target.value })} />
            <input style={S.input} placeholder="What they do - developer, builder"
                   onChange={e => setJobForm({ ...jobForm, what_they_do: e.target.value })} />
            <input style={S.input} placeholder="What is the work? - website revamp"
                   onChange={e => setJobForm({ ...jobForm, what: e.target.value })} />
            <input style={S.input} type="number" placeholder="Agreed how much?"
                   onChange={e => setJobForm({ ...jobForm, amount: Number(e.target.value) })} />
            <input style={S.input} placeholder="Currency"
                   onChange={e => setJobForm({ ...jobForm,
                                               currency: e.target.value.toUpperCase() })} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={S.btn('#4f46e5')} disabled={busy}
                      onClick={async () => {
                        await save('/api/ledger/job/' + openProject + '/work', jobForm);
                        setJobAdd(''); setJobForm({});
                        const r = await fetch(API + '/api/ledger/job/' + openProject,
                                              { headers: AUTH });
                        const j = await r.json(); setJob(j); setProjReport(j.report || '');
                      }}>Save</button>
              <button style={S.btn('#2a2a35')}
                      onClick={() => { setJobAdd(''); setJobForm({}); }}>Cancel</button>
            </div>
          </div>
        ) : jobAdd === 'thing' ? (
          <div style={{ ...S.card, borderColor: '#3a3a5a' }}>
            <input style={S.input} placeholder="What is it? - cement, fridge" autoFocus
                   onChange={e => setJobForm({ ...jobForm, what: e.target.value })} />
            <input style={S.input} type="number" placeholder="How many?"
                   onChange={e => setJobForm({ ...jobForm,
                                               quantity: Number(e.target.value) })} />
            <input style={S.input} placeholder="Bags, litres, pieces"
                   onChange={e => setJobForm({ ...jobForm, unit: e.target.value })} />
            <input style={S.input} type="number" placeholder="Price each"
                   onChange={e => setJobForm({ ...jobForm,
                                               unit_price: Number(e.target.value) })} />
            <label style={{ fontSize: '13px', color: '#8b8b9e', display: 'block',
                            marginBottom: '8px' }}>
              <input type="checkbox" style={{ marginRight: '6px' }}
                     onChange={e => setJobForm({ ...jobForm, got_it: e.target.checked })} />
              already got it
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={S.btn('#4f46e5')} disabled={busy}
                      onClick={async () => {
                        await save('/api/ledger/job/' + openProject + '/material', jobForm);
                        setJobAdd(''); setJobForm({});
                        const r = await fetch(API + '/api/ledger/job/' + openProject,
                                              { headers: AUTH });
                        const j = await r.json(); setJob(j); setProjReport(j.report || '');
                      }}>Save</button>
              <button style={S.btn('#2a2a35')}
                      onClick={() => { setJobAdd(''); setJobForm({}); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', margin: '12px 0',
                        flexWrap: 'wrap' }}>
            <button style={{ ...S.btn('#4f46e5'), flex: 1 }}
                    onClick={() => { setJobAdd('work'); setJobForm({}); }}>
              + Work
            </button>
            <button style={{ ...S.btn('#2a2a35'), flex: 1 }}
                    onClick={() => { setJobAdd('thing'); setJobForm({}); }}>
              + Something to buy
            </button>
            <button style={{ ...S.btn('#2a2a35'), width: '100%' }}
                    onClick={() => { setJobAdd('part'); setJobForm({}); }}>
              + A part of this job (a phase, a room)
            </button>
          </div>
        )}

        {jobAdd === 'part' && (
          <div style={{ ...S.card, borderColor: '#3a3a5a' }}>
            <input style={S.input} placeholder="What is it called? - Phase III, Roof" autoFocus
                   onChange={e => setJobForm({ ...jobForm, name: e.target.value })} />
            <textarea style={{ ...S.input, minHeight: '70px' }}
                      placeholder="What does it cover?"
                      onChange={e => setJobForm({ ...jobForm, note: e.target.value })} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={S.btn('#4f46e5')} disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const r = await fetch(API + '/api/ledger/job/' + openProject
                                                + '/part', { method: 'POST', headers: H,
                                                  body: JSON.stringify(jobForm) });
                          const j = await r.json();
                          if (j.error) { setErr(j.error); }
                          setJobAdd(''); setJobForm({});
                          await load();
                          if (j.id) setOpenProject(j.id);
                        } catch (e) { setErr(String(e)); }
                        setBusy(false);
                      }}>Create it</button>
              <button style={S.btn('#2a2a35')}
                      onClick={() => { setJobAdd(''); setJobForm({}); }}>Cancel</button>
            </div>
          </div>
        )}

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
          <button style={{ ...S.btn('#2a2a35'), marginLeft: 'auto', color: '#b88' }}
                  onClick={dropJob}>Remove this job</button>
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
      {watchNotes.length > 0 && (
        <div style={{ ...S.card, borderLeft: '3px solid #f59e0b', background: '#1f1a10' }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.6px',
                        marginBottom: '6px' }}>
            Worth knowing
          </div>
          {watchNotes.map((w, i) => (
            <div key={i} style={{ fontSize: '13px', color: '#d8c49a', padding: '2px 0' }}>
              {w.says}
            </div>
          ))}
        </div>
      )}

      {coming && (coming.owed_usd > 0 || coming.stipends_a_month > 0) && (
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
                        alignItems: 'baseline' }}>
            <span style={{ fontSize: '12px', color: '#8b8b9e' }}>Owed altogether</span>
            <span style={{ fontSize: '19px', fontWeight: 700 }}>
              ~{n0(coming.owed_usd)} USD
            </span>
          </div>
          {(coming.owed_now || []).length > 1 && (
            <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>
              {(coming.owed_now || []).map(x => n0(x.amount) + ' ' + x.currency).join('  \u00b7  ')}
            </div>
          )}
          {(coming.stipends_a_month > 0 || coming.subscriptions_a_month > 0) && (
            <div style={{ fontSize: '12px', color: '#777', marginTop: '6px' }}>
              every month: {coming.stipends_a_month > 0
                ? n0(coming.stipends_a_month) + ' in stipends' : ''}
              {coming.stipends_a_month > 0 && coming.subscriptions_a_month > 0 ? ' \u00b7 ' : ''}
              {coming.subscriptions_a_month > 0
                ? n0(coming.subscriptions_a_month) + ' USD in subscriptions' : ''}
            </div>
          )}
        </div>
      )}

      <input style={{ ...S.input, marginBottom: '12px' }} value={hunt}
             placeholder="Find anything - a name, a note, a job"
             onChange={e => setHunt(e.target.value)} />

      {found && (
        <div style={S.card}>
          <div style={{ fontSize: '11px', color: '#777', textTransform: 'uppercase',
                        letterSpacing: '0.6px', fontWeight: 700, marginBottom: '6px' }}>
            {found.length} found
          </div>
          {found.map(f => (
            <div key={f.id} style={{ ...S.line, cursor: f.person_id ? 'pointer' : 'default' }}
                 onClick={() => { if (f.person_id) { setHunt(''); setFound(null);
                                                     setOpenId(f.person_id); } }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13px' }}>{f.note || f.kind}</div>
                <div style={{ fontSize: '11px', color: '#777' }}>
                  {String(f.on || '').slice(0, 10)}
                  {f.person ? ' \u00b7 ' + f.person : ''}
                  {f.job ? ' \u00b7 ' + f.job : ''}
                  {f.how_sent ? ' \u00b7 ' + f.how_sent : ''}
                </div>
              </div>
              <div style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                {n0(f.amount)} {f.currency}
              </div>
            </div>
          ))}
          {found.length === 0 && (
            <div style={{ fontSize: '13px', color: '#777' }}>Nothing matches that.</div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {[['people', 'People'], ['loans', 'Loans'], ['projects', 'Jobs']].map(([k, lbl]) => (
          <button key={k} style={S.tab(view === k)} onClick={() => setView(k)}>{lbl}</button>
        ))}
        <button style={{ ...S.tab(false), marginLeft: 'auto' }}
                onClick={() => getReport('all')}>Everything</button>
        <button style={S.tab(false)}
                onClick={async () => {
                  try {
                    const r = await fetch(API + '/api/ledger/export.csv', { headers: AUTH });
                    const b = await r.blob();
                    const u = URL.createObjectURL(b);
                    const a = document.createElement('a');
                    a.href = u; a.download = 'money.csv'; a.click();
                    URL.revokeObjectURL(u);
                  } catch (e) { setErr(String(e)); }
                }}>CSV</button>
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

      {view === 'loans' && (() => {
        const run = (loans && loans.running) || [];
        const done = (loans && loans.cleared) || [];
        const Row = (l, gone) => (
          <div key={l.person_id + l.currency}
               style={{ ...S.card, cursor: 'pointer', opacity: gone ? 0.55 : 1 }}
               onClick={() => setOpenId(l.person_id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ minWidth: 0 }}>
                <div style={S.name}>{l.who}</div>
                <div style={S.sub}>
                  {l.direction} &middot; {l.loans} {l.loans === 1 ? 'loan' : 'loans'},{' '}
                  {n0(l.borrowed)} {l.currency}
                  {l.repaid ? ' \u00b7 ' + n0(l.repaid) + ' back' : ''}
                </div>
                {l.since && (
                  <div style={{ fontSize: '11px', color: '#666' }}>since {l.since}</div>
                )}
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                <div style={{ fontSize: '17px', fontWeight: 700,
                              color: gone ? '#777'
                                   : (l.direction === 'you lent them' ? '#10b981' : '#f59e0b') }}>
                  {gone ? 'cleared' : n0(l.left)}
                </div>
                {!gone && (
                  <div style={{ fontSize: '11px', color: '#777' }}>
                    {l.currency} left
                    {l.usd_left && l.currency !== 'USD'
                      ? ' \u00b7 ~' + n0(l.usd_left) + ' USD' : ''}
                  </div>
                )}
              </div>
            </div>
            {l.months_to_clear ? (
              <div style={{ fontSize: '12px', color: '#8b8b9e', marginTop: '6px' }}>
                {n0(l.repay_amount)} a {l.repay_every || 'month'} &middot; clears in{' '}
                {l.months_to_clear} months
              </div>
            ) : null}
          </div>
        );
        return (
          <>
            {newLoan ? (
              <div style={{ ...S.card, borderColor: '#3a3a5a' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  <button style={S.tab(loanForm.kind !== 'borrowed')}
                          onClick={() => setLoanForm({ ...loanForm, kind: 'lent' })}>
                    I lent them
                  </button>
                  <button style={S.tab(loanForm.kind === 'borrowed')}
                          onClick={() => setLoanForm({ ...loanForm, kind: 'borrowed' })}>
                    They lent me
                  </button>
                </div>
                <input style={S.input} placeholder="Who?" autoFocus
                       onChange={e => setLoanForm({ ...loanForm, name: e.target.value })} />
                <input style={S.input} type="number" placeholder="How much?"
                       onChange={e => setLoanForm({ ...loanForm,
                                                    amount: Number(e.target.value) })} />
                <input style={S.input} placeholder="Currency - SLE, CAD, USD"
                       onChange={e => setLoanForm({ ...loanForm,
                                               currency: e.target.value.toUpperCase() })} />
                <input style={S.input} placeholder="What is it for?"
                       onChange={e => setLoanForm({ ...loanForm, note: e.target.value })} />
                <input style={S.input} type="date"
                       onChange={e => setLoanForm({ ...loanForm,
                                                    happened_on: e.target.value })} />
                <input style={S.input} type="number"
                       placeholder="Paying back how much a month? (leave empty if no plan)"
                       onChange={e => setLoanForm({ ...loanForm,
                                                    repay_amount: Number(e.target.value),
                                                    repay_every: 'month' })} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={S.btn('#4f46e5')} disabled={busy}
                          onClick={async () => {
                            if (!loanForm.name || !loanForm.amount) return;
                            setBusy(true);
                            try {
                              let pid = null;
                              const pr = await fetch(API + '/api/ledger/people',
                                                     { headers: AUTH });
                              const all = (await pr.json()).people || [];
                              const hit = all.find(x => (x.name || '').toLowerCase()
                                              .includes(loanForm.name.trim().toLowerCase()));
                              if (hit) { pid = hit.id; }
                              else {
                                const mk = await fetch(API + '/api/ledger/person', {
                                  method: 'POST', headers: H,
                                  body: JSON.stringify({ name: loanForm.name.trim() }) });
                                pid = (await mk.json()).id;
                              }
                              if (pid) {
                                await fetch(API + '/api/ledger/entry', {
                                  method: 'POST', headers: H,
                                  body: JSON.stringify({ ...loanForm, person_id: pid,
                                                 kind: loanForm.kind || 'lent' }) });
                              }
                              setNewLoan(false); setLoanForm({});
                              await load();
                            } catch (e) { setErr(String(e)); }
                            setBusy(false);
                          }}>Save</button>
                  <button style={S.btn('#2a2a35')}
                          onClick={() => { setNewLoan(false); setLoanForm({}); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button style={{ ...S.btn('#4f46e5'), width: '100%', marginBottom: '12px' }}
                      onClick={() => { setNewLoan(true); setLoanForm({ kind: 'lent' }); }}>
                + New loan
              </button>
            )}
            {run.length === 0 && done.length === 0 && (
              <div style={{ fontSize: '13px', color: '#777' }}>
                Nothing lent either way. Add a loan from someone's account.
              </div>
            )}
            {run.map(l => Row(l, false))}
            {done.length > 0 && (
              <>
                <div style={S.label}>Cleared</div>
                {done.map(l => Row(l, true))}
              </>
            )}
            {(run.length > 0 || done.length > 0) && (
              <button style={{ ...S.btn('#2a2a35'), marginTop: '10px' }}
                      onClick={() => getReport('loans')}>Report on the lending</button>
            )}
          </>
        );
      })()}

      {view === 'projects' && (() => {
        const byId = {};
        projects.forEach(j => { byId[j.id] = j; });
        const kidsOf = (id) => projects
          .filter(j => (j.parent_id || null) === id)
          .sort((a, b) => a.name.localeCompare(b.name));
        const liveUnder = (id) => {
          const me = byId[id];
          if (me && (me.agreed || me.spent)) return true;
          return kidsOf(id).some(k => liveUnder(k.id));
        };
        const Row = (j, depth) => {
          const kids = kidsOf(j.id);
          const isTop = depth === 0;
          const open = isTop ? !!openGroups[j.id] : true;
          return (
            <div key={j.id}>
              <div style={{ ...S.card, marginLeft: (depth * 13) + 'px', cursor: 'pointer',
                            background: isTop ? '#1b1b24' : '#17171f',
                            borderLeft: depth ? '2px solid #2c2c3a' : '1px solid #26262f' }}
                   onClick={() => {
                     if (isTop && kids.length) {
                       setOpenGroups({ ...openGroups, [j.id]: !openGroups[j.id] });
                     } else { setOpenProject(j.id); }
                   }}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', gap: '10px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...S.name, fontSize: isTop ? '16px' : '15px' }}>
                      {isTop && kids.length ? (open ? '\u25be ' : '\u25b8 ') : ''}{j.name}
                    </div>
                    <div style={S.sub}>
                      {j.agreed || j.spent
                        ? 'agreed ' + n0(j.agreed) + ' \u00b7 paid ' + n0(j.spent)
                        : (kids.length ? kids.length + ' parts' : 'nothing on it yet')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {(j.agreed || j.spent) ? (
                      <div>
                        <div style={{ fontSize: isTop ? '17px' : '15px', fontWeight: 700,
                                      color: j.owed > 0 ? '#f59e0b' : '#10b981' }}>
                          {n0(j.owed > 0 ? j.owed : j.spent)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#777' }}>
                          {j.currency} {j.owed > 0 ? 'owed' : 'spent'}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                {isTop && kids.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                    <span style={{ color: '#8b8bff' }}
                          onClick={(ev) => { ev.stopPropagation(); setOpenProject(j.id); }}>
                      open it
                    </span>
                  </div>
                )}
              </div>
              {open && j.to_buy_n > 0 && (
                <div style={{ ...S.card, marginLeft: ((depth + 1) * 13) + 'px',
                              cursor: 'pointer', background: '#1a1626',
                              borderLeft: '2px solid #6d4aa8' }}
                     onClick={() => setOpenProject(j.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ ...S.name, color: '#c4a7f0' }}>Things to buy</div>
                      <div style={S.sub}>
                        {j.to_buy_n} {j.to_buy_n === 1 ? 'item' : 'items'} on the list
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#c4a7f0' }}>
                        {n0(j.to_buy)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#777' }}>
                        {j.currency} to find
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {open && kids.map(k => Row(k, depth + 1))}
            </div>
          );
        };
        const tops = kidsOf(null);
        const busy = tops.filter(t => liveUnder(t.id));
        const idle = tops.filter(t => !liveUnder(t.id));
        return (
          <div>
            {busy.map(t => Row(t, 0))}
            {idle.length > 0 && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '14px' }}>
                Nothing on these yet:{' '}
                {idle.map(t => (
                  <span key={t.id} onClick={() => setOpenProject(t.id)}
                        style={{ cursor: 'pointer', marginRight: '8px',
                                 color: '#8b8bff' }}>{t.name}</span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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
