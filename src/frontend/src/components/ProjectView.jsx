import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const AUTH = { 'X-Ami-Password': AMI_PASSWORD };
const H = { 'Content-Type': 'application/json', ...AUTH };

const S = {
  wrap: { padding: '16px 14px 30px' },
  card: {
    background: '#fff', border: '1px solid #e6e6ee', borderRadius: '10px',
    padding: '14px', marginBottom: '10px', cursor: 'pointer',
  },
  name: { fontSize: '15px', fontWeight: 700, color: '#1a1a1a' },
  sub: { fontSize: '12px', color: '#777', marginTop: '3px' },
  pill: (bg, fg) => ({
    display: 'inline-block', padding: '2px 9px', borderRadius: '11px',
    fontSize: '11px', fontWeight: 600, background: bg, color: fg, marginLeft: '6px',
  }),
  back: {
    background: 'none', border: 'none', color: '#4f46e5', fontSize: '13px',
    cursor: 'pointer', padding: '0 0 10px', fontWeight: 600,
  },
  row: {
    display: 'flex', gap: '10px', alignItems: 'flex-start',
    padding: '10px 0', borderBottom: '1px solid #f0f0f4',
  },
  input: {
    width: '100%', padding: '9px 11px', border: '1px solid #ddd',
    borderRadius: '7px', fontSize: '13px', boxSizing: 'border-box',
  },
  btn: (bg) => ({
    padding: '10px 15px', background: bg, color: '#fff', border: 'none',
    borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600,
  }),
  label: {
    fontSize: '11px', color: '#888', textTransform: 'uppercase',
    letterSpacing: '0.6px', fontWeight: 700, margin: '18px 0 8px',
  },
  empty: { fontSize: '13px', color: '#999', fontStyle: 'italic', padding: '12px 0' },
};

export default function ProjectView() {
  const [projects, setProjects] = useState(null);
  const [open, setOpen] = useState(null);       // the project being looked at
  const [board, setBoard] = useState(null);
  const [waiting, setWaiting] = useState([]);
  const [edits, setEdits] = useState({});        // id -> {keep, title, note}
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [newTask, setNewTask] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [adding, setAdding] = useState(false);
  const [fresh, setFresh] = useState({ name: '', about: '' });
  const [docs, setDocs] = useState([]);
  const [genNote, setGenNote] = useState('');

  const loadDocs = async (pid) => {
    try {
      const r = await fetch(API + '/api/projects/' + pid + '/documents', { headers: AUTH });
      const j = await r.json();
      setDocs(j.documents || []);
    } catch (e) { /* not important enough to shout about */ }
  };

  const uploadDoc = async (file) => {
    if (!file) return;
    setBusy(true); setGenNote('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', file.name);
      await fetch(API + '/api/projects/' + open + '/document',
                  { method: 'POST', headers: AUTH, body: fd });
      await loadDocs(open);
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const generateTasks = async () => {
    setBusy(true); setGenNote('');
    try {
      const r = await fetch(API + '/api/projects/' + open + '/generate',
                            { method: 'POST', headers: H });
      const j = await r.json();
      setGenNote(j.note || (j.proposed?.length
        ? 'Drafted ' + j.proposed.length + ' from ' + (j.from || 'what you wrote')
          + ' - tick what is right.'
        : 'Nothing new to draft.'));
      await loadOne(open);
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const makeProject = async () => {
    if (fresh.name.trim().length < 3) return;
    setBusy(true);
    try {
      const r = await fetch(API + '/api/projects/create', {
        method: 'POST', headers: H,
        body: JSON.stringify({ name: fresh.name.trim(), about: fresh.about.trim(),
                               plan: fresh.about.trim() }) });
      const j = await r.json();
      setAdding(false); setFresh({ name: '', about: '' });
      await loadList();
      if (j.project_id) setOpen(j.project_id);
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const loadList = async () => {
    setErr('');
    try {
      const r = await fetch(API + '/api/project-board', { headers: AUTH });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setProjects(j.projects || []);
    } catch (e) { setErr(String(e)); }
  };

  const loadOne = async (pid) => {
    setBoard(null); setWaiting([]); setEdits({}); setErr('');
    try {
      const [b, w] = await Promise.all([
        fetch(API + '/api/projects/' + pid + '/board', { headers: AUTH }).then(r => r.json()),
        fetch(API + '/api/projects/waiting', { headers: AUTH }).then(r => r.json()),
      ]);
      if (b.error) { setErr(b.error); return; }
      setBoard(b);
      setForm({ name: b.project.name, about: b.project.description || '' });
      setWaiting((w.waiting || []).filter(x => x.venture_id === pid));
    } catch (e) { setErr(String(e)); }
  };

  useEffect(() => { loadList(); }, []);
  useEffect(() => { if (open) { loadOne(open); loadDocs(open); } }, [open]);

  const setEdit = (id, patch) =>
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));

  const decide = async () => {
    const keep = waiting
      .filter(w => edits[w.id]?.keep)
      .map(w => ({ id: w.id, title: edits[w.id]?.title ?? w.title,
                   note: edits[w.id]?.note ?? w.why }));
    const drop = waiting.filter(w => !edits[w.id]?.keep).map(w => w.id);
    if (!keep.length && !drop.length) return;
    setBusy(true);
    try {
      await fetch(API + '/api/projects/waiting/decide', {
        method: 'POST', headers: H, body: JSON.stringify({ keep, drop }) });
      await loadOne(open);
      await loadList();
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const addTask = async () => {
    if (newTask.trim().length < 3) return;
    setBusy(true);
    try {
      await fetch(API + '/api/projects/' + open + '/task', {
        method: 'POST', headers: H, body: JSON.stringify({ title: newTask.trim() }) });
      setNewTask('');
      await loadOne(open);
      await loadList();
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const saveProject = async () => {
    setBusy(true);
    try {
      await fetch(API + '/api/projects/' + open, {
        method: 'PUT', headers: H, body: JSON.stringify(form) });
      setEditing(false);
      await loadOne(open);
      await loadList();
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  // ---------------------------------------------------------------- the list
  if (!open) {
    if (err) return <div style={S.wrap}><div style={S.empty}>{err}</div></div>;
    if (!projects) return <div style={S.wrap}><div style={S.empty}>Loading...</div></div>;
    const byId = {};
    projects.forEach(p => { byId[p.id] = p; });
    const busyOnes = projects.filter(p => p.open_n > 0 || p.waiting_n > 0);
    const quiet = projects.filter(p => p.open_n === 0 && p.waiting_n === 0);
    const Card = (p) => (
      <div key={p.id} style={S.card} onClick={() => setOpen(p.id)}>
        <div style={S.name}>
          {p.name}
          {p.waiting_n > 0 && (
            <span style={S.pill('#fef3c7', '#92400e')}>{p.waiting_n} to look at</span>
          )}
        </div>
        <div style={S.sub}>
          {p.parent_id && byId[p.parent_id] ? 'under ' + byId[p.parent_id].name + ' \u00b7 ' : ''}
          {p.open_n} open{p.done_n ? ' \u00b7 ' + p.done_n + ' done' : ''}
          {p.stage ? ' \u00b7 ' + p.stage : ''}
        </div>
      </div>
    );
    return (
      <div style={S.wrap}>
        {!adding ? (
          <button style={{ ...S.btn('#4f46e5'), width: '100%', marginBottom: '14px' }}
                  onClick={() => setAdding(true)}>
            + New project
          </button>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '10px',
                        padding: '14px', marginBottom: '14px' }}>
            <input style={{ ...S.input, marginBottom: '8px', fontWeight: 600 }}
                   placeholder="What is it called?" value={fresh.name}
                   onChange={e => setFresh({ ...fresh, name: e.target.value })} />
            <textarea style={{ ...S.input, minHeight: '70px', marginBottom: '8px' }}
                      placeholder="What is it, and what needs doing? The more you write, the better the tasks she drafts."
                      value={fresh.about}
                      onChange={e => setFresh({ ...fresh, about: e.target.value })} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={S.btn('#4f46e5')} onClick={makeProject} disabled={busy}>
                {busy ? 'Working...' : 'Create, and draft the tasks'}
              </button>
              <button style={{ ...S.btn('#eee'), color: '#444' }}
                      onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        )}
        {busyOnes.length > 0 && <div style={{ ...S.label, marginTop: 0 }}>In motion</div>}
        {busyOnes.map(Card)}
        {quiet.length > 0 && <div style={S.label}>Nothing on these</div>}
        {quiet.map(Card)}
      </div>
    );
  }

  // ------------------------------------------------------------- one project
  if (err) return <div style={S.wrap}><div style={S.empty}>{err}</div></div>;
  if (!board) return <div style={S.wrap}><div style={S.empty}>Loading...</div></div>;

  const DONE = ['done', 'completed', 'complete'];
  const live = (board.tasks || []).filter(t => !DONE.includes(t.status));
  const finished = (board.tasks || []).filter(t => DONE.includes(t.status));

  return (
    <div style={S.wrap}>
      <button style={S.back} onClick={() => { setOpen(null); setEditing(false); }}>
        &#8592; All projects
      </button>

      {!editing ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between',
                        alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ fontSize: '19px', fontWeight: 700 }}>{board.project.name}</div>
            <button onClick={() => setEditing(true)}
                    style={{ background: 'none', border: 'none', color: '#4f46e5',
                             cursor: 'pointer', fontSize: '13px' }}>Edit</button>
          </div>
          {board.project.description && (
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
              {board.project.description}
            </div>
          )}
        </div>
      ) : (
        <div>
          <input style={{ ...S.input, marginBottom: '8px', fontWeight: 600 }}
                 value={form.name || ''}
                 onChange={e => setForm({ ...form, name: e.target.value })} />
          <textarea style={{ ...S.input, minHeight: '64px', marginBottom: '8px' }}
                    value={form.about || ''}
                    onChange={e => setForm({ ...form, about: e.target.value })} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={S.btn('#4f46e5')} onClick={saveProject} disabled={busy}>Save</button>
            <button style={{ ...S.btn('#eee'), color: '#444' }}
                    onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* the document the project actually runs on */}
      <div style={S.label}>The paperwork</div>
      {docs.length === 0 && (
        <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
          No PRD or spec attached. She will work from the description instead.
        </div>
      )}
      {docs.map(d => (
        <div key={d.id} style={{ fontSize: '13px', padding: '6px 0', color: '#444' }}>
          \uD83D\uDCC4 {d.title}
        </div>
      ))}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
        <label style={{ ...S.btn('#eee'), color: '#444', cursor: 'pointer',
                        display: 'inline-block' }}>
          Attach a document
          <input type="file" style={{ display: 'none' }}
                 accept=".pdf,.txt,.md,.doc,.docx"
                 onChange={e => uploadDoc(e.target.files?.[0])} />
        </label>
        <button style={S.btn('#4f46e5')} onClick={generateTasks} disabled={busy}>
          {busy ? 'Reading...' : 'Draft the tasks'}
        </button>
      </div>
      {genNote && (
        <div style={{ fontSize: '12px', color: '#4f46e5', marginTop: '8px' }}>{genNote}</div>
      )}

      {/* what she drafted, waiting on him */}
      {waiting.length > 0 && (
        <>
          <div style={S.label}>She drafted these &mdash; nothing is on your board yet</div>
          {waiting.map(w => {
            const e = edits[w.id] || {};
            return (
              <div key={w.id} style={{ background: '#fffbeb', border: '1px solid #fde68a',
                                       borderRadius: '9px', padding: '12px',
                                       marginBottom: '8px' }}>
                <label style={{ display: 'flex', gap: '9px', alignItems: 'flex-start',
                                cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!e.keep}
                         onChange={ev => setEdit(w.id, { keep: ev.target.checked })}
                         style={{ marginTop: '4px' }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <input style={{ ...S.input, fontWeight: 600, marginBottom: '6px' }}
                           value={e.title ?? w.title}
                           onChange={ev => setEdit(w.id, { title: ev.target.value })} />
                    <input style={{ ...S.input, fontSize: '12px' }}
                           placeholder="your own note on this"
                           value={e.note ?? (w.why || '')}
                           onChange={ev => setEdit(w.id, { note: ev.target.value })} />
                  </span>
                </label>
              </div>
            );
          })}
          <button style={{ ...S.btn('#4f46e5'), width: '100%' }} onClick={decide} disabled={busy}>
            {busy ? 'Working...' : 'Add the ticked ones, drop the rest'}
          </button>
        </>
      )}

      {/* add one yourself */}
      <div style={S.label}>Add a task</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input style={S.input} value={newTask} placeholder="What needs doing?"
               onChange={e => setNewTask(e.target.value)}
               onKeyDown={e => { if (e.key === 'Enter') addTask(); }} />
        <button style={S.btn('#10b981')} onClick={addTask} disabled={busy}>Add</button>
      </div>

      {/* what is on it */}
      <div style={S.label}>On this project ({live.length})</div>
      {live.length === 0 && <div style={S.empty}>Nothing open.</div>}
      {live.map(t => (
        <div key={t.id} style={S.row}>
          <span style={{ fontSize: '13px', flex: 1, minWidth: 0 }}>{t.title}</span>
          <span style={{ fontSize: '11px', color: '#999', flexShrink: 0 }}>
            {t.status === 'in_progress' ? 'in progress' : ''}
            {t.due_date ? ' ' + String(t.due_date).slice(5, 10) : ''}
          </span>
        </div>
      ))}

      {finished.length > 0 && (
        <>
          <div style={S.label}>Finished ({finished.length})</div>
          {finished.slice(0, 6).map(t => (
            <div key={t.id} style={{ ...S.row, opacity: 0.55 }}>
              <span style={{ fontSize: '13px', textDecoration: 'line-through' }}>{t.title}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
