import React, { useState, useEffect } from 'react';

const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : ''));
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };

const S = {
  wrap: { padding: '2px 0', color: '#eee' },
  card: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
    padding: '14px', marginBottom: '10px',
  },
  input: {
    width: '100%', padding: '12px', fontSize: '16px', background: '#141414',
    color: '#eee', border: '1px solid #333', borderRadius: '8px',
    marginBottom: '8px', boxSizing: 'border-box',
  },
  area: {
    width: '100%', padding: '12px', fontSize: '16px', background: '#141414',
    color: '#eee', border: '1px solid #333', borderRadius: '8px',
    marginBottom: '8px', boxSizing: 'border-box', minHeight: '66px',
    fontFamily: 'inherit',
  },
  btn: (bg) => ({
    padding: '12px', minHeight: '46px', background: bg, color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
    cursor: 'pointer', width: '100%',
  }),
  small: (bg) => ({
    padding: '8px 12px', minHeight: '38px', background: bg, color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', flex: 1,
  }),
  row: { display: 'flex', gap: '8px', marginBottom: '8px' },
  label: { fontSize: '12px', color: '#888', marginBottom: '4px' },
  tag: {
    fontSize: '11px', color: '#9aa', background: '#141414',
    border: '1px solid #2a2a2a', borderRadius: '5px', padding: '2px 7px',
  },
};

const today = () => new Date().toISOString().slice(0, 10);

const BLANK = {
  venture_id: '', title: '', discovered: '', did: '', next_time: '',
  cost_note: '', happened_on: today(),
};

export default function LessonsSection({ ventureId }) {
  const [rows, setRows] = useState([]);
  const [ventures, setVentures] = useState([]);
  const [pick, setPick] = useState(ventureId ? String(ventureId) : 'all');
  const [form, setForm] = useState(null);     // null = form closed
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async (who) => {
    const w = who === undefined ? pick : who;
    try {
      const q = (w && w !== 'all') ? `?venture_id=${w}` : '';
      const r = await fetch(`${API}/api/lessons${q}`, { headers: H });
      const j = await r.json();
      setRows(j.lessons || []);
    } catch (e) { setMsg('Could not reach the server.'); }
  };

  useEffect(() => {
    load(pick);
    (async () => {
      try {
        const r = await fetch(`${API}/api/admin/ventures`, { headers: H });
        const j = await r.json();
        // this endpoint has been shaped a few ways - take whichever it is
        const list = j.ventures || j.items || j.data || [];
        setVentures(Array.isArray(list) ? list : []);
      } catch (e) { /* the dropdown just stays empty */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pick]);

  const post = async (url, body) => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`${API}${url}`,
        { method: 'POST', headers: H, body: JSON.stringify(body || {}) });
      const j = await r.json();
      if (j.error) { setMsg(j.error); return false; }
      return true;
    } catch (e) { setMsg('That did not save.'); return false; } finally { setBusy(false); }
  };

  const save = async () => {
    const f = form;
    if (!f.title.trim() && !f.discovered.trim()) {
      setMsg('What is the lesson?'); return;
    }
    const body = { ...f };
    body.venture_id = f.venture_id ? Number(f.venture_id) : null;
    const ok = editing
      ? await post(`/api/lessons/${editing}`, body)
      : await post('/api/lessons', body);
    if (ok) { setForm(null); setEditing(null); load(); }
  };

  const remove = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    if (await post(`/api/lessons/${id}/delete`, {})) load();
  };

  const openEdit = (l) => {
    setEditing(l.id);
    setForm({
      venture_id: l.venture_id ? String(l.venture_id) : '',
      title: l.title || '', discovered: l.discovered || '',
      did: l.did || '', next_time: l.next_time || '',
      cost_note: l.cost_note || '', happened_on: l.happened_on || today(),
    });
  };

  const field = (k, ph, type) => (
    <input style={S.input} type={type || 'text'} placeholder={ph}
      value={form[k] || ''}
      onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
  );
  const area = (k, ph) => (
    <textarea style={S.area} placeholder={ph} value={form[k] || ''}
      onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
  );

  const noNext = rows.filter((l) => !(l.next_time || '').trim()).length;

  return (
    <div style={S.wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '10px', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '17px' }}>Lessons Learned</h3>
        <span style={{ fontSize: '13px', color: '#888' }}>
          {rows.length}
        </span>
      </div>

      {msg && (
        <div style={{ ...S.card, borderColor: '#e5484d', color: '#ff9a9a',
          fontSize: '13px' }}>{msg}</div>
      )}

      {!ventureId && (
        <select style={S.input} value={pick}
          onChange={(e) => setPick(e.target.value)}>
          <option value="all">Every project</option>
          {ventures.map((v) => (
            <option key={v.id} value={String(v.id)}>{v.name}</option>
          ))}
        </select>
      )}

      {form ? (
        <div style={S.card}>
          <div style={{ fontWeight: 700, marginBottom: '10px' }}>
            {editing ? 'Edit the lesson' : 'Write down a lesson'}
          </div>

          <div style={S.label}>Which project</div>
          <select style={S.input} value={form.venture_id}
            onChange={(e) => setForm({ ...form, venture_id: e.target.value })}>
            <option value="">not tied to one</option>
            {ventures.map((v) => (
              <option key={v.id} value={String(v.id)}>{v.name}</option>
            ))}
          </select>

          <div style={S.label}>In one line</div>
          {field('title', 'e.g. cement arrived before the price was agreed')}

          <div style={S.label}>What was discovered</div>
          {area('discovered', 'What actually happened, and how you found out')}

          <div style={S.label}>What was done about it</div>
          {area('did', 'The fix, the conversation, what it took')}

          <div style={S.label}>
            Next time — the part that pays you back
          </div>
          {area('next_time', 'e.g. agree the price per bag before anything is delivered')}

          <div style={S.row}>
            <div style={{ flex: 1 }}>
              <div style={S.label}>What it cost</div>
              {field('cost_note', 'money, days, a relationship')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={S.label}>When</div>
              {field('happened_on', '', 'date')}
            </div>
          </div>

          <div style={S.row}>
            <button style={S.small('#667eea')} disabled={busy} onClick={save}>
              {editing ? 'Save' : 'Keep it'}
            </button>
            <button style={S.small('#333')}
              onClick={() => { setForm(null); setEditing(null); setMsg(''); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button style={{ ...S.btn('#667eea'), marginBottom: '10px' }}
          onClick={() => {
            setEditing(null);
            setForm({ ...BLANK,
              venture_id: ventureId ? String(ventureId)
                : (pick !== 'all' ? pick : '') });
          }}>
          + Write down a lesson
        </button>
      )}

      {rows.length === 0 && !form && (
        <div style={{ ...S.card, color: '#888', fontSize: '14px' }}>
          Nothing here yet. You can also just tell Ami — <em>lesson learned
          on the Freetown house: the cement came before we agreed a price,
          so from now on I agree price per bag up front</em> — and it lands
          here.
        </div>
      )}

      {noNext > 0 && (
        <div style={{ ...S.card, borderColor: '#5a4a1a', color: '#d8b24c',
          fontSize: '13px' }}>
          {noNext} {noNext === 1 ? 'lesson has' : 'lessons have'} no
          “next time” yet. Those are just stories until they say what
          changes.
        </div>
      )}

      {rows.map((l) => (
        <div key={l.id} style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', minWidth: 0 }}>
              {l.title || '(no title)'}
            </div>
            <div style={{ fontSize: '11px', color: '#666', flexShrink: 0 }}>
              {l.happened_on || ''}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '6px',
            flexWrap: 'wrap' }}>
            {l.venture_name && <span style={S.tag}>{l.venture_name}</span>}
            {l.cost_note && <span style={S.tag}>cost: {l.cost_note}</span>}
          </div>

          {l.discovered && (
            <div style={{ marginTop: '9px', fontSize: '13px' }}>
              <span style={{ color: '#888' }}>Discovered — </span>
              {l.discovered}
            </div>
          )}
          {l.did && (
            <div style={{ marginTop: '6px', fontSize: '13px' }}>
              <span style={{ color: '#888' }}>Did — </span>{l.did}
            </div>
          )}
          {l.next_time ? (
            <div style={{ marginTop: '8px', fontSize: '13px',
              color: '#7fd1a0', borderLeft: '2px solid #2e7d52',
              paddingLeft: '9px' }}>
              <strong>Next time</strong> — {l.next_time}
            </div>
          ) : (
            <div style={{ marginTop: '8px', fontSize: '12px',
              color: '#8a7a3a' }}>
              No “next time” written yet.
            </div>
          )}

          <div style={{ ...S.row, marginTop: '10px', marginBottom: 0 }}>
            <button style={S.small('#333')} onClick={() => openEdit(l)}>
              Edit
            </button>
            <button style={S.small('#6b2525')}
              onClick={() => remove(l.id, l.title)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
