import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const S = {
  wrap: { padding: '12px', color: '#eee', maxWidth: '640px', margin: '0 auto' },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
          padding: '14px', marginBottom: '10px' },
  input: { width: '100%', padding: '11px', fontSize: '16px', background: '#141414', color: '#eee',
           border: '1px solid #333', borderRadius: '8px', boxSizing: 'border-box' },
  chip: (on, today) => ({
    flex: 1, minWidth: 0, padding: '10px 0', minHeight: '42px', borderRadius: '8px', cursor: 'pointer',
    border: today ? '1px solid #667eea' : '1px solid #333',
    background: on ? '#667eea' : '#141414', color: on ? '#fff' : '#777',
    fontSize: '12px', fontWeight: on ? 700 : 500
  }),
  btn: (bg) => ({ padding: '12px', minHeight: '46px', background: bg, color: '#fff', border: 'none',
                  borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%' })
};

const todayName = () => DAYS[(new Date().getDay() + 6) % 7];

export default function LearningTab() {
  const [courses, setCourses] = useState([]);
  const [title, setTitle] = useState('');
  const [days, setDays] = useState([]);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');

  const load = async () => {
    try {
      const r = await fetch(API + '/api/courses', { headers: H });
      const j = await r.json();
      setCourses(j.courses || []);
    } catch (e) { /* non-fatal */ }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!title.trim()) return;
    await fetch(API + '/api/courses', { method: 'POST', headers: H, body: JSON.stringify({ title, days }) });
    setTitle(''); setDays([]); load();
  };

  const toggleDay = async (c, d) => {
    const next = c.day_list.includes(d) ? c.day_list.filter(x => x !== d) : [...c.day_list, d];
    setCourses(courses.map(x => x.id === c.id ? { ...x, day_list: next } : x));
    await fetch(API + '/api/courses/' + c.id, { method: 'PUT', headers: H, body: JSON.stringify({ days: next }) });
  };

  const rename = async (c) => {
    if (draft.trim() && draft.trim() !== c.title) {
      await fetch(API + '/api/courses/' + c.id, { method: 'PUT', headers: H, body: JSON.stringify({ title: draft.trim() }) });
    }
    setEditing(null); load();
  };

  const remove = async (c) => {
    if (!window.confirm(`Remove ${c.title}?`)) return;
    await fetch(API + '/api/courses/' + c.id, { method: 'DELETE', headers: H });
    load();
  };

  const today = todayName();
  const onToday = courses.filter(c => c.day_list.includes(today));

  return (
    <div style={S.wrap}>
      <h1 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700 }}>📚 Learning</h1>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '14px' }}>
        {onToday.length ? `Today: ${onToday.map(c => c.title).join(', ')}` : 'Nothing scheduled today.'}
      </div>

      {courses.map(c => (
        <div key={c.id} style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            {editing === c.id ? (
              <input style={{ ...S.input, marginRight: '8px' }} value={draft} autoFocus
                     onChange={e => setDraft(e.target.value)}
                     onBlur={() => rename(c)} onKeyDown={e => e.key === 'Enter' && rename(c)} />
            ) : (
              <div style={{ fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
                   onClick={() => { setEditing(c.id); setDraft(c.title); }}>{c.title}</div>
            )}
            <button onClick={() => remove(c)}
                    style={{ background: 'none', border: 'none', color: '#777', cursor: 'pointer', fontSize: '15px' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {DAYS.map(d => (
              <button key={d} style={S.chip(c.day_list.includes(d), d === today)} onClick={() => toggleDay(c, d)}>{d}</button>
            ))}
          </div>
          {c.day_list.length === 0 && (
            <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>No days set - Ami stays quiet about this one.</div>
          )}
        </div>
      ))}

      <div style={{ ...S.card, borderStyle: 'dashed' }}>
        <input style={{ ...S.input, marginBottom: '10px' }} placeholder="Course name (Spanish, Python...)"
               value={title} onChange={e => setTitle(e.target.value)} />
        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
          {DAYS.map(d => (
            <button key={d} style={S.chip(days.includes(d), d === today)}
                    onClick={() => setDays(days.includes(d) ? days.filter(x => x !== d) : [...days, d])}>{d}</button>
          ))}
        </div>
        <button style={S.btn('#667eea')} onClick={add}>+ Add course</button>
      </div>

      <div style={{ fontSize: '11px', color: '#666', lineHeight: 1.6, marginTop: '10px' }}>
        Tap a day to switch it on or off - it saves straight away. Tap a name to rename it.
        Ami mentions a course the evening before and on the day, and you can ask her for help with it.
      </div>
    </div>
  );
}
