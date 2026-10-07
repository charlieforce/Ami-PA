import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };

const KINDS = [
  { key: 'tasks', label: 'Tasks', icon: '✅', colour: '#667eea',
    endpoint: '/api/tasks/from-note', lands: 'Backlog' },
  { key: 'reminders', label: 'Reminders', icon: '🔔', colour: '#f59e0b',
    endpoint: '/api/reminders/from-note', lands: 'Reminders' },
  { key: 'todos', label: 'Todos', icon: '📋', colour: '#10b981',
    endpoint: '/api/todos/from-note', lands: 'Tomorrow' }
];

const S = {
  panel: { marginTop: '16px' },
  head: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: '10px', gap: '10px', flexWrap: 'wrap'
  },
  section: { marginBottom: '20px' },
  sectionHead: {
    fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.5px', marginBottom: '8px'
  },
  row: (done, dismissed) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px', background: dismissed ? '#161616' : '#232323',
    borderRadius: '8px', marginBottom: '6px', minHeight: '52px',
    opacity: dismissed ? 0.45 : 1
  }),
  title: (done, dismissed) => ({
    flex: 1, fontSize: '14px', minWidth: 0, wordBreak: 'break-word',
    textDecoration: (done || dismissed) ? 'line-through' : 'none',
    color: done ? '#10b981' : dismissed ? '#666' : '#eee'
  }),
  edit: {
    flex: 1, padding: '8px 10px', fontSize: '16px', background: '#111',
    color: '#eee', border: '1px solid #444', borderRadius: '6px', minWidth: 0
  },
  push: (colour, done) => ({
    padding: '8px 14px', minHeight: '40px', borderRadius: '6px', border: 'none',
    background: done ? '#1f2937' : colour, color: done ? '#10b981' : '#fff',
    fontSize: '13px', fontWeight: 600, cursor: done ? 'default' : 'pointer',
    whiteSpace: 'nowrap', flexShrink: 0
  }),
  icon: {
    background: 'none', border: 'none', color: '#777', cursor: 'pointer',
    fontSize: '15px', padding: '6px 8px', minWidth: '36px', minHeight: '40px', flexShrink: 0
  },
  addRow: { display: 'flex', gap: '8px', marginTop: '8px' },
  addInput: {
    flex: 1, padding: '10px 12px', fontSize: '16px', background: '#1a1a1a',
    color: '#eee', border: '1px dashed #444', borderRadius: '8px', minWidth: 0
  },
  btn: (bg) => ({
    padding: '10px 14px', minHeight: '44px', background: bg, color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap'
  }),
  lands: { fontSize: '11px', color: '#10b981', marginLeft: '6px' },
  empty: { fontSize: '13px', color: '#666', padding: '10px 0' },
  stamp: { fontSize: '11px', color: '#666' }
};

export default function NoteAnalysisPanel({ note, onAnalysed }) {
  const [data, setData] = useState(null);
  const [pushed, setPushed] = useState({ tasks: [], reminders: [], todos: [] });
  const [dismissed, setDismissed] = useState({ tasks: [], reminders: [], todos: [] });
  const [analysedAt, setAnalysedAt] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (note?.id) loadStored(); }, [note?.id]);

  const loadStored = async () => {
    try {
      const r = await fetch(`${API}/api/notes/${note.id}/analysis`, { headers: H });
      const j = await r.json();
      if (j.analysis) {
        setData(j.analysis);
        setPushed(j.analysis.pushed || { tasks: [], reminders: [], todos: [] });
        setDismissed(j.analysis.dismissed || { tasks: [], reminders: [], todos: [] });
        setAnalysedAt(j.analysed_at);
      } else {
        setData(null);
      }
    } catch (e) { setErr(String(e)); }
  };

  const persist = async (next) => {
    try {
      await fetch(`${API}/api/notes/${note.id}/analysis`, {
        method: 'PUT', headers: H, body: JSON.stringify({ analysis: next })
      });
    } catch (e) { /* non-fatal */ }
  };

  const runAnalysis = async () => {
    setBusy(true); setErr('');
    try {
      const r = await fetch(`${API}/api/notes/analyze`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ title: note.title, content: note.content || note.preview })
      });
      const j = await r.json();
      const extracted = j.extracted || {};
      const fresh = {
        ...extracted,
        pushed: { tasks: [], reminders: [], todos: [] },
        dismissed: { tasks: [], reminders: [], todos: [] }
      };
      setData(fresh);
      setPushed(fresh.pushed);
      setDismissed(fresh.dismissed);
      setAnalysedAt(new Date().toISOString());
      await persist(fresh);
      if (onAnalysed) onAnalysed();
    } catch (e) { setErr('Analysis failed'); }
    setBusy(false);
  };

  const items = (kind) => (data && Array.isArray(data[kind])) ? data[kind] : [];

  const isPushed = (kind, title) => (pushed[kind] || []).includes(title);
  const isDismissed = (kind, title) => (dismissed[kind] || []).includes(title);

  const pushItem = async (kind, title) => {
    if (isPushed(kind, title)) return;
    const cfg = KINDS.find(k => k.key === kind);
    setBusy(true);
    try {
      const r = await fetch(API + cfg.endpoint, {
        method: 'POST', headers: H,
        body: JSON.stringify({ title, note_id: note.id })
      });
      if (!r.ok) { setErr(`Could not push to ${cfg.label}`); setBusy(false); return; }
      const nextPushed = { ...pushed, [kind]: [...(pushed[kind] || []), title] };
      setPushed(nextPushed);
      const next = { ...data, pushed: nextPushed, dismissed };
      setData(next);
      await persist(next);
      setErr('');
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const pushAll = async (kind) => {
    const pending = items(kind)
      .map(i => i.title)
      .filter(t => !isPushed(kind, t) && !isDismissed(kind, t));
    for (const t of pending) {
      await pushItem(kind, t);
    }
  };

  const toggleDismiss = async (kind, title) => {
    const list = dismissed[kind] || [];
    const nextList = list.includes(title) ? list.filter(t => t !== title) : [...list, title];
    const nextDismissed = { ...dismissed, [kind]: nextList };
    setDismissed(nextDismissed);
    const next = { ...data, pushed, dismissed: nextDismissed };
    setData(next);
    await persist(next);
  };

  const saveEdit = async (kind, oldTitle) => {
    const newTitle = draft.trim();
    setEditing(null);
    if (!newTitle || newTitle === oldTitle) return;
    const next = {
      ...data,
      [kind]: items(kind).map(i => i.title === oldTitle ? { ...i, title: newTitle } : i),
      pushed, dismissed
    };
    setData(next);
    await persist(next);
  };

  const addItem = async (kind) => {
    const title = (adding[kind] || '').trim();
    if (!title) return;
    const next = {
      ...data,
      [kind]: [...items(kind), { title, added_by_charlie: true }],
      pushed, dismissed
    };
    setData(next);
    setAdding({ ...adding, [kind]: '' });
    await persist(next);
  };

  if (!note) return null;

  const total = KINDS.reduce((n, k) => n + items(k.key).length, 0);
  const pushedCount = KINDS.reduce((n, k) => n + (pushed[k.key] || []).length, 0);

  return (
    <div style={S.panel}>

      {/* a meeting leaves more behind than action items */}
      {(() => {
        const a = (note && note.analysis) || {};
        const bits = [
          ['Who was there', a.attendees, '#8b8b9e'],
          ['What was decided', a.decisions, '#10b981'],
          ['You said you would', a.he_owes, '#f59e0b'],
          ['Waiting on someone', a.waiting_on, '#a78bfa'],
        ].filter(b => Array.isArray(b[1]) && b[1].length);
        if (!bits.length) return null;
        return (
          <div style={{ marginBottom: '14px', padding: '12px',
                        background: 'rgba(255,255,255,0.04)', borderRadius: '10px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.6px', color: '#777',
                          textTransform: 'uppercase', fontWeight: 700,
                          marginBottom: '8px' }}>
              What came out of the room
            </div>
            {bits.map(b => (
              <div key={b[0]} style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: b[2], fontWeight: 600 }}>{b[0]}</div>
                {b[1].map((x, n) => (
                  <div key={n} style={{ fontSize: '13px', color: '#ddd', paddingLeft: '8px' }}>
                    {typeof x === 'string' ? x : (x.what || x.title || x.name || '')}
                    {x && x.who ? ' - ' + x.who : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })()}
      {err && (
        <div style={{ background: '#7f1d1d', padding: '8px 10px', borderRadius: '6px',
                      marginBottom: '10px', fontSize: '13px' }}>⚠️ {err}</div>
      )}

      <div style={S.head}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700 }}>
            {data ? `${pushedCount} of ${total} pushed` : 'Not analysed yet'}
          </div>
          {analysedAt && (
            <div style={S.stamp}>analysed {String(analysedAt).slice(0, 16).replace('T', ' ')}</div>
          )}
        </div>
        <button style={S.btn(data ? '#2a2a2a' : '#667eea')} onClick={runAnalysis} disabled={busy}>
          {busy ? '⏳ Working…' : data ? '↻ Re-analyse' : '✨ Analyse this note'}
        </button>
      </div>

      {!data && (
        <div style={S.empty}>
          Run the analysis to pull out tasks, reminders and todos.
        </div>
      )}

      {data && KINDS.map(cfg => {
        const list = items(cfg.key);
        const pending = list.filter(i => !isPushed(cfg.key, i.title) && !isDismissed(cfg.key, i.title));
        return (
          <div key={cfg.key} style={S.section}>
            <div style={{ ...S.sectionHead, color: cfg.colour,
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{cfg.icon} {cfg.label} ({list.length})</span>
              {pending.length > 1 && (
                <button style={{ ...S.btn(cfg.colour), padding: '6px 10px', minHeight: '36px', fontSize: '12px' }}
                        onClick={() => pushAll(cfg.key)} disabled={busy}>
                  Push all {pending.length}
                </button>
              )}
            </div>

            {list.length === 0 && <div style={S.empty}>Nothing found. Add one below.</div>}

            {list.map((item, i) => {
              const done = isPushed(cfg.key, item.title);
              const gone = isDismissed(cfg.key, item.title);
              const isEditing = editing === cfg.key + i;
              return (
                <div key={i} style={S.row(done, gone)}>
                  {isEditing ? (
                    <>
                      <input
                        style={S.edit} value={draft} autoFocus
                        onChange={e => setDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(cfg.key, item.title); }}
                      />
                      <button style={S.icon} onClick={() => saveEdit(cfg.key, item.title)}>✓</button>
                      <button style={S.icon} onClick={() => setEditing(null)}>✕</button>
                    </>
                  ) : (
                    <>
                      <span style={S.title(done, gone)}>
                        {item.title}
                        {item.added_by_charlie && (
                          <span style={{ fontSize: '10px', color: '#a78bfa', marginLeft: '6px' }}>added</span>
                        )}
                        {done && <span style={S.lands}>→ {cfg.lands}</span>}
                      </span>

                      {!done && !gone && (
                        <button style={S.icon}
                                onClick={() => { setEditing(cfg.key + i); setDraft(item.title); }}>✎</button>
                      )}
                      {!done && (
                        <button style={S.icon} title={gone ? 'Bring back' : 'Not needed'}
                                onClick={() => toggleDismiss(cfg.key, item.title)}>
                          {gone ? '↩' : '✕'}
                        </button>
                      )}
                      {!gone && (
                        <button style={S.push(cfg.colour, done)}
                                onClick={() => pushItem(cfg.key, item.title)}
                                disabled={done || busy}>
                          {done ? '✓ Pushed' : 'Push'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            <div style={S.addRow}>
              <input
                style={S.addInput}
                placeholder={`Add a ${cfg.label.toLowerCase().slice(0, -1)} Ami missed…`}
                value={adding[cfg.key] || ''}
                onChange={e => setAdding({ ...adding, [cfg.key]: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') addItem(cfg.key); }}
              />
              <button style={S.btn('#2a2a2a')} onClick={() => addItem(cfg.key)}>Add</button>
            </div>
          </div>
        );
      })}

      {data && (
        <div style={{ fontSize: '11px', color: '#666', lineHeight: 1.6, marginTop: '4px' }}>
          Tasks land in the Backlog with no date — you schedule them on the task board.
          Todos are due tomorrow.
        </div>
      )}
    </div>
  );
}
