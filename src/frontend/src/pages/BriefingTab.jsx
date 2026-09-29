import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const H = { 'X-Ami-Password': AMI_PASSWORD };

const ICON = { 'Sierra Leone': '🇸🇱', 'Africa news': '🌍', 'Afrobeats': '🎶', 'Seattle Seahawks': '🏈',
  'NFL': '🏟️', 'world news': '🌐', 'US politics': '🇺🇸', 'technology news': '💻', 'startup funding': '💰',
  'celebrity news': '⭐', 'Cameroon': '🇨🇲', 'Kenya news': '🇰🇪', 'Premier League': '⚽' };
const NAME = { 'Africa news': 'Africa', 'world news': 'World', 'technology news': 'Tech',
  'startup funding': 'Startups', 'celebrity news': 'Celebrity', 'Kenya news': 'Kenya', 'Seattle Seahawks': 'Seahawks' };
const nice = (t) => NAME[t] || t;
const ago = (h) => h == null ? '' : h < 1 ? 'just now' : h < 24 ? h + 'h ago' : Math.round(h / 24) + 'd ago';
const madeAt = (s) => {
  try { return new Date(String(s).replace(' ', 'T') + 'Z').toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  catch (e) { return ''; }
};

const S = {
  wrap: { padding: '12px', color: '#eee', maxWidth: '720px', margin: '0 auto' },
  seg: { display: 'flex', background: '#1a1a1a', borderRadius: '10px', padding: '3px', border: '1px solid #2a2a2a' },
  segBtn: (on, dis) => ({ flex: 1, padding: '9px 14px', minHeight: '40px', border: 'none', borderRadius: '8px',
    background: on ? '#667eea' : 'transparent', color: dis ? '#444' : on ? '#fff' : '#aaa',
    fontSize: '13px', fontWeight: 600, cursor: dis ? 'default' : 'pointer' }),
  chips: { display: 'flex', gap: '6px', overflowX: 'auto', padding: '12px 0 4px', scrollbarWidth: 'none' },
  chip: (on) => ({ flexShrink: 0, padding: '8px 12px', minHeight: '36px', borderRadius: '18px', cursor: 'pointer',
    border: '1px solid ' + (on ? '#667eea' : '#2a2a2a'), background: on ? '#667eea22' : '#1a1a1a',
    color: on ? '#fff' : '#aaa', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }),
  groupHead: { fontSize: '12px', color: '#888', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.6px', margin: '22px 0 8px' },
  card: (open) => ({ background: '#1a1a1a', border: '1px solid ' + (open ? '#3a3f5c' : '#2a2a2a'),
    borderRadius: '12px', marginBottom: '8px', overflow: 'hidden', cursor: 'pointer',
    WebkitTapHighlightColor: 'transparent' }),
  thumb: { width: '76px', height: '76px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, background: '#222' },
  title: { fontSize: '15px', fontWeight: 700, lineHeight: 1.35, color: '#f2f2f2' },
  meta: { fontSize: '11px', color: '#888', marginTop: '4px' },
  teaser: { fontSize: '13px', color: '#aaa', lineHeight: 1.5, marginTop: '6px',
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  para: { color: '#ddd', fontSize: '15px', lineHeight: 1.7, margin: '0 0 12px' },
  newTag: { fontSize: '10px', fontWeight: 700, color: '#10b981', background: '#10b98120', padding: '2px 6px',
    borderRadius: '4px', marginLeft: '6px', verticalAlign: 'middle' }
};

function Story({ s, isNew, hero }) {
  const [open, setOpen] = useState(false);
  const [paras, setParas] = useState(null);
  const [imgOk, setImgOk] = useState(true);
  const img = s.image && imgOk;
  const teaser = s.description && s.description.length > 40 && !/, \d+h ago$/.test(s.description)
    ? s.description : null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && paras === null) {
      if (!s.url) { setParas([]); return; }
      fetch(API + '/api/news/excerpt?url=' + encodeURIComponent(s.url), { headers: H })
        .then(r => r.json()).then(j => setParas(j.paragraphs || [])).catch(() => setParas([]));
    }
  };

  const body = paras && paras.length ? paras : (teaser ? [teaser] : []);

  return (
    <div style={S.card(open)} onClick={toggle}>
      {hero && img && (
        <img src={s.image} alt="" referrerPolicy="no-referrer" onError={() => setImgOk(false)}
             style={{ width: '100%', height: '190px', objectFit: 'cover', display: 'block', background: '#222' }} />
      )}
      <div style={{ display: 'flex', gap: '12px', padding: '12px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={S.title}>{s.title}{isNew && <span style={S.newTag}>NEW</span>}</div>
          <div style={S.meta}>{[s.source, ago(s.hours)].filter(Boolean).join(' · ')}</div>
          {!open && teaser && <div style={S.teaser}>{teaser}</div>}
        </div>
        {!hero && img && (
          <img src={s.image} alt="" referrerPolicy="no-referrer" onError={() => setImgOk(false)} style={S.thumb} />
        )}
      </div>

      {open && (
        <div style={{ padding: '10px 12px 4px', borderTop: '1px solid #242424' }}>
          {paras === null
            ? <div style={{ color: '#777', fontSize: '13px', marginBottom: '12px' }}>Getting the story...</div>
            : body.length
              ? body.map((p, i) => <p key={i} style={S.para}>{p}</p>)
              : <div style={{ color: '#777', fontSize: '13px', marginBottom: '12px' }}>Nothing more to show for this one.</div>}
        </div>
      )}

      <div style={{ textAlign: 'center', color: '#555', fontSize: '12px', lineHeight: 1, paddingBottom: '6px' }}>
        {open ? '▴' : '▾'}
      </div>
    </div>
  );
}

export default function BriefingTab() {
  const [list, setList] = useState([]);
  const [slot, setSlot] = useState(null);
  const [topic, setTopic] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API + '/api/briefings/today', { headers: H })
      .then(r => r.json())
      .then(j => {
        const b = j.briefings || [];
        setList(b);
        setSlot(b.find(x => x.type === 'evening') ? 'evening' : b.find(x => x.type === 'morning') ? 'morning' : null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cur = list.find(b => b.type === slot);
  const morning = list.find(b => b.type === 'morning');
  const stories = (cur && cur.stories) || null;
  const topics = stories ? Object.keys(stories).filter(t => (stories[t] || []).length) : [];
  const total = topics.reduce((n, t) => n + stories[t].length, 0);
  const seenMorning = new Set(slot === 'evening' && morning && morning.stories
    ? Object.values(morning.stories).flat().map(s => s.title) : []);
  const isNew = (s) => slot === 'evening' && seenMorning.size > 0 && !seenMorning.has(s.title);

  if (loading) return <div style={{ ...S.wrap, color: '#777' }}>Loading...</div>;

  if (!cur) {
    return (
      <div style={S.wrap}>
        <h1 style={{ fontSize: '20px', margin: '0 0 10px' }}>📰 Briefing</h1>
        <div style={{ ...S.card(false), padding: '14px', color: '#888', cursor: 'default' }}>
          Nothing yet today. The morning briefing lands at 7am, the evening one at 9pm.
        </div>
      </div>
    );
  }

  const shown = topic === 'All' ? topics : topics.filter(t => t === topic);
  let heroUsed = false;

  return (
    <div style={S.wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
        <h1 style={{ fontSize: '20px', margin: 0 }}>📰 Briefing</h1>
        <div style={{ ...S.seg, minWidth: '190px' }}>
          {['morning', 'evening'].map(t => {
            const has = !!list.find(b => b.type === t);
            return (
              <button key={t} style={S.segBtn(slot === t, !has)} disabled={!has}
                      onClick={() => { setSlot(t); setTopic('All'); }}>
                {t === 'morning' ? '☀️ Morning' : '🌙 Evening'}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ fontSize: '12px', color: '#777', marginTop: '6px' }}>
        Made {madeAt(cur.at)}{total ? ' · ' + total + ' stories · tap one to open it' : ''}
      </div>

      {stories ? (
        <>
          <div style={S.chips}>
            <button style={S.chip(topic === 'All')} onClick={() => setTopic('All')}>All</button>
            {topics.map(t => (
              <button key={t} style={S.chip(topic === t)} onClick={() => setTopic(t)}>
                {(ICON[t] || '•') + ' ' + nice(t)} <span style={{ color: '#666' }}>{stories[t].length}</span>
              </button>
            ))}
          </div>

          {shown.map(t => (
            <div key={t}>
              <div style={S.groupHead}>{(ICON[t] || '') + ' ' + nice(t)}</div>
              {stories[t].map((s, i) => {
                const hero = !heroUsed && topic === 'All' && !!s.image;
                if (hero) heroUsed = true;
                return <Story key={slot + t + i} s={s} isNew={isNew(s)} hero={hero} />;
              })}
            </div>
          ))}
        </>
      ) : (
        <div style={{ ...S.card(false), padding: '14px', whiteSpace: 'pre-wrap', fontSize: '13px',
                      lineHeight: 1.6, color: '#ccc', marginTop: '12px', cursor: 'default' }}>
          {cur.text}
        </div>
      )}
      <div style={{ height: '40px' }} />
    </div>
  );
}
