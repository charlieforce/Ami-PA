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
  label: {
    fontSize: '11px', color: '#888', textTransform: 'uppercase',
    letterSpacing: '0.5px', marginTop: '18px', marginBottom: '6px'
  },
  input: {
    width: '100%', padding: '12px', fontSize: '16px', background: '#1a1a1a',
    color: '#eee', border: '1px solid #333', borderRadius: '8px',
    marginBottom: '10px', boxSizing: 'border-box'
  },
  area: {
    width: '100%', padding: '12px', fontSize: '16px', background: '#1a1a1a',
    color: '#eee', border: '1px solid #333', borderRadius: '8px',
    marginBottom: '10px', boxSizing: 'border-box', minHeight: '90px',
    fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical'
  },
  btn: (bg) => ({
    flex: 1, padding: '14px', minHeight: '48px', background: bg, color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer'
  }),
  card: {
    background: '#1a1a1a', border: '1px solid #2a2a2a',
    borderRadius: '8px', padding: '14px', marginBottom: '8px'
  },
  chip: {
    background: '#2a2a2a', borderRadius: '6px', padding: '4px 10px',
    fontSize: '12px', color: '#ccc', display: 'inline-block', margin: '0 6px 6px 0'
  },
  del: {
    background: 'none', border: 'none', color: '#f87171',
    fontSize: '18px', cursor: 'pointer', padding: '4px 8px', minHeight: '44px', minWidth: '44px'
  },
  hint: { fontSize: '11px', color: '#666', marginTop: '-6px', marginBottom: '12px', lineHeight: 1.5 }
};

const ago = (ts) => {
  if (!ts) return '';
  const d = Math.round((new Date() - new Date(String(ts).replace(' ', 'T'))) / 86400000);
  return d < 1 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago';
};

const ME_FIELDS = [
  ['current_focus', 'What you are driving at right now', 'One or two lines. She weighs everything against this — what serves it matters more.', true],
  ['never_do', 'Things she should never do', 'Prohibitions land harder than instructions. One per line.', true],
  ['address_me', 'How she should address you', 'Bo, Charlie, DeMan, or a mix.', false],
  ['rhythms', 'Your rhythms', 'When you work, when you are done, how you travel. She fits what she says to where you are in the day.', true],
  ['key_people', 'Who matters and where they belong', 'One per line: Ami — Freetown, GII operations, the renovation. Then when Freetown comes up and Ami has not, she can ask after her.', true],
  ['charlie_personal', 'Who you are', 'The main profile she reads. Identity, family, habits, dreams, values.', true],
  ['aliases', 'What people call you', 'DeMan, Charlie, Charles Bond Kebbi — so she knows they all mean you.', false],
  ['contact_details', 'Contact details', 'Emails, numbers, LinkedIn — whatever she may need when drafting for you.', true]
];

export default function WhatAmiKnowsTab() {
  const [view, setView] = useState('people');
  const [d, setD] = useState(null);
  const [me, setMe] = useState({});
  const [meDirty, setMeDirty] = useState(false);
  const [meSaved, setMeSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [mode, setMode] = useState(null);
  const [corr, setCorr] = useState({ incorrect_text: '', correct_text: '', context: '' });
  const [fact, setFact] = useState('');
  const [newInterest, setNewInterest] = useState('');

  const load = async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch(API + '/api/admin/what-ami-knows', { headers: H }),
        fetch(API + '/api/admin/about-me', { headers: H })
      ]);
      const j1 = await r1.json();
      const j2 = await r2.json();
      if (j1.error) setErr(j1.error); else { setD(j1); setErr(''); }
      if (!j2.error) setMe(j2.about || {});
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveMe = async () => {
    try {
      const body = {};
      ME_FIELDS.forEach(f => { if (me[f[0]] !== undefined) body[f[0]] = me[f[0]]; });
      const r = await fetch(API + '/api/admin/about-me', {
        method: 'PUT', headers: H, body: JSON.stringify(body)
      });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setMeDirty(false);
      setMeSaved(true);
      setTimeout(() => setMeSaved(false), 2000);
    } catch (e) { setErr(String(e)); }
  };

  const addCorrection = async () => {
    if (!corr.correct_text.trim()) { setErr('Tell her the right version'); return; }
    try {
      const r = await fetch(API + '/api/admin/corrections', {
        method: 'POST', headers: H, body: JSON.stringify(corr)
      });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setCorr({ incorrect_text: '', correct_text: '', context: '' });
      setMode(null);
      load();
    } catch (e) { setErr(String(e)); }
  };

  const addFact = async () => {
    if (!fact.trim()) { setErr('Type what you want her to know'); return; }
    try {
      const r = await fetch(API + '/api/admin/learned-facts', {
        method: 'POST', headers: H, body: JSON.stringify({ fact, category: 'taught' })
      });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setFact('');
      setMode(null);
      load();
    } catch (e) { setErr(String(e)); }
  };

  const addInterest = async () => {
    if (!newInterest.trim()) return;
    try {
      const r = await fetch(API + '/api/admin/interests', {
        method: 'POST', headers: H, body: JSON.stringify({ value: newInterest.trim() })
      });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setNewInterest('');
      setErr('');
      load();
    } catch (e) { setErr(String(e)); }
  };

  const delInterest = async (id) => {
    await fetch(API + '/api/admin/interests/' + id, { method: 'DELETE', headers: H });
    load();
  };

  const delCorrection = async (id) => {
    if (!window.confirm('Remove this correction? She may get it wrong again.')) return;
    await fetch(API + '/api/admin/corrections/' + id, { method: 'DELETE', headers: H });
    load();
  };

  const delFact = async (id) => {
    if (!window.confirm('Make her forget this?')) return;
    await fetch(API + '/api/admin/learned-facts/' + id, { method: 'DELETE', headers: H });
    load();
  };

  if (loading) return <div style={S.wrap}>Loading…</div>;
  if (!d) return <div style={S.wrap}>Could not load.</div>;

  const ventures = (d.items || []).filter(i => i.type === 'venture');
  const projects = (d.items || []).filter(i => i.type === 'project');

  return (
    <div style={S.wrap}>
      {err && (
        <div style={{ background: '#7f1d1d', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px' }}>
          ⚠️ {err}
        </div>
      )}

      <div style={{ ...S.card, marginBottom: '14px' }}>
        <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#bbb' }}>
          What Ami holds about you and your world. She adds to it herself when you tell her
          something durable in conversation. Your tasks, todos, reminders and calendar are not
          here — those live in Ami's view.
        </div>
      </div>

      <div style={S.bar}>
        <button style={S.tab(view === 'people')} onClick={() => setView('people')}>
          👥 People ({(d.people || []).length})
        </button>
        <button style={S.tab(view === 'me')} onClick={() => setView('me')}>🧍 About me</button>
        <button style={S.tab(view === 'work')} onClick={() => setView('work')}>
          📁 Work ({(d.items || []).length})
        </button>
        <button style={S.tab(view === 'teach')} onClick={() => setView('teach')}>
          ✏️ Teach her ({(d.corrections || []).length + (d.facts || []).length})
        </button>
      </div>

      {view === 'people' && (
        <>
          {(d.people || []).map(p => (
            <div key={p.id} style={S.card}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>{p.name}</div>
              {p.aliases && (
                <div style={{ fontSize: '11px', color: '#a78bfa', marginTop: '2px' }}>
                  also called: {p.aliases}
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                {[p.relationship, p.venture, p.location].filter(Boolean).join(' · ')}
              </div>
              {p.background && (
                <div style={{ fontSize: '13px', lineHeight: 1.6, marginTop: '8px', color: '#ddd' }}>
                  {p.background}
                </div>
              )}
              {p.updated_at && (
                <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                  updated {ago(p.updated_at)}
                </div>
              )}
            </div>
          ))}
          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Edit these in Contacts. She updates them herself when you tell her something new.
          </div>
        </>
      )}

      {view === 'me' && (
        <>
          {ME_FIELDS.map(([key, title, hint, big]) => (
            <div key={key}>
              <div style={S.label}>{title}</div>
              {big ? (
                <textarea
                  style={{ ...S.area, minHeight: key === 'charlie_personal' ? '300px' : key === 'current_focus' ? '70px' : '110px' }}
                  value={me[key] || ''}
                  onChange={e => { setMe({ ...me, [key]: e.target.value }); setMeDirty(true); setMeSaved(false); }}
                />
              ) : (
                <input
                  style={S.input}
                  value={me[key] || ''}
                  placeholder="DeMan, Charlie, Charles Bond Kebbi"
                  onChange={e => { setMe({ ...me, [key]: e.target.value }); setMeDirty(true); setMeSaved(false); }}
                />
              )}
              <div style={S.hint}>{hint}</div>
            </div>
          ))}

          <button
            style={{ ...S.btn(meSaved ? '#047857' : meDirty ? '#059669' : '#2a2a2a'), width: '100%' }}
            onClick={saveMe}
            disabled={!meDirty && !meSaved}
          >
            {meSaved ? '✓ Saved' : meDirty ? '💾 Save' : 'No changes'}
          </button>

          <div style={S.label}>Your interests</div>
          <div style={S.hint}>
            Things you like and enjoy talking about. Different from what drives you —
            that lives under Who Ami Is.
          </div>
          <div style={{ marginBottom: '10px' }}>
            {(d.interests || []).map((i) => (
              <span key={i.id} style={{ ...S.chip, paddingRight: '4px' }}>
                {i.value}
                <button
                  onClick={() => delInterest(i.id)}
                  style={{ background: 'none', border: 'none', color: '#f87171',
                           cursor: 'pointer', fontSize: '14px', padding: '0 6px' }}
                >×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              style={{ ...S.input, marginBottom: 0 }}
              value={newInterest}
              placeholder="Fishing, horror films, history…"
              onChange={e => setNewInterest(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addInterest(); }}
            />
            <button
              style={{ ...S.btn('#059669'), flex: '0 0 90px' }}
              onClick={addInterest}
            >Add</button>
          </div>
        </>
      )}

      {view === 'work' && (
        <>
          <div style={S.label}>Ventures</div>
          {ventures.map((v, i) => (
            <div key={i} style={{ ...S.card, padding: '10px 14px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>🏢 {v.name}</span>
              <span style={{ fontSize: '12px', color: '#a78bfa', marginLeft: '8px', textTransform: 'capitalize' }}>
                {v.stage}
              </span>
            </div>
          ))}

          <div style={S.label}>Projects</div>
          {projects.map((p, i) => (
            <div key={i} style={{ ...S.card, padding: '10px 14px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>📁 {p.name}</span>
              <span style={{ fontSize: '12px', color: '#a78bfa', marginLeft: '8px', textTransform: 'capitalize' }}>
                {p.stage}
              </span>
              {p.for_whom && (
                <span style={{ fontSize: '11px', color: '#f59e0b', marginLeft: '8px' }}>
                  for {p.for_whom}
                </span>
              )}
            </div>
          ))}

          {d.sync && (
            <div style={{ fontSize: '12px', color: d.sync.dirty ? '#f59e0b' : '#666', marginTop: '12px' }}>
              {d.sync.dirty
                ? 'Changes pending — sync her from the Projects tab.'
                : 'She is up to date with these.'}
            </div>
          )}
        </>
      )}

      {view === 'teach' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              style={S.btn(mode === 'fact' ? '#4c1d95' : '#059669')}
              onClick={() => setMode(mode === 'fact' ? null : 'fact')}
            >
              ➕ Teach a fact
            </button>
            <button
              style={S.btn(mode === 'corr' ? '#4c1d95' : '#2a2a2a')}
              onClick={() => setMode(mode === 'corr' ? null : 'corr')}
            >
              ✏️ Correct her
            </button>
          </div>

          {mode === 'fact' && (
            <div style={{ ...S.card, border: '1px solid #059669' }}>
              <div style={S.label}>Something she should know</div>
              <textarea
                style={{ ...S.area, minHeight: '70px' }}
                value={fact}
                placeholder="The Seahawks are also called the Hawks"
                onChange={e => setFact(e.target.value)}
              />
              <div style={S.hint}>
                Facts about you, your world, or anything she should carry forward.
              </div>
              <button style={{ ...S.btn('#059669'), width: '100%' }} onClick={addFact}>
                💾 Save fact
              </button>
            </div>
          )}

          {mode === 'corr' && (
            <div style={{ ...S.card, border: '1px solid #667eea' }}>
              <div style={S.label}>She keeps saying (optional)</div>
              <input
                style={S.input} value={corr.incorrect_text}
                placeholder="The wrong version"
                onChange={e => setCorr({ ...corr, incorrect_text: e.target.value })}
              />
              <div style={S.label}>She should say</div>
              <input
                style={S.input} value={corr.correct_text}
                placeholder="The right version"
                onChange={e => setCorr({ ...corr, correct_text: e.target.value })}
              />
              <div style={S.label}>Why (optional)</div>
              <input
                style={S.input} value={corr.context}
                placeholder="Helps her understand rather than just memorise"
                onChange={e => setCorr({ ...corr, context: e.target.value })}
              />
              <button style={{ ...S.btn('#667eea'), width: '100%' }} onClick={addCorrection}>
                💾 Save correction
              </button>
            </div>
          )}

          {(d.facts || []).length > 0 && (
            <>
              <div style={S.label}>Facts she holds</div>
              {(d.facts || []).map(f => (
                <div key={f.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px' }}>{f.fact}</div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      {f.category} · {ago(f.timestamp)}
                    </div>
                  </div>
                  <button style={S.del} onClick={() => delFact(f.id)}>🗑</button>
                </div>
              ))}
            </>
          )}

          <div style={S.label}>Corrections</div>
          {(d.corrections || []).length === 0 && (
            <div style={{ fontSize: '13px', color: '#666' }}>
              Nothing corrected yet. When she gets something wrong twice, fix it here.
            </div>
          )}
          {(d.corrections || []).map(c => (
            <div key={c.id} style={{ ...S.card, display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ minWidth: 0 }}>
                {c.incorrect_text && (
                  <div style={{ fontSize: '13px', color: '#f87171', textDecoration: 'line-through' }}>
                    {c.incorrect_text}
                  </div>
                )}
                <div style={{ fontSize: '14px', color: '#34d399', fontWeight: 600, marginTop: '2px' }}>
                  {c.correct_text}
                </div>
                {c.context && (
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{c.context}</div>
                )}
                {c.category && <span style={{ ...S.chip, marginTop: '6px' }}>{c.category}</span>}
              </div>
              <button style={S.del} onClick={() => delCorrection(c.id)}>🗑</button>
            </div>
          ))}
        </>
      )}

      <div style={{ height: '40px' }} />
    </div>
  );
}
