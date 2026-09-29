import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };

const S = {
  wrap: { padding: '12px', color: '#eee' },
  label: {
    fontSize: '11px', color: '#888', textTransform: 'uppercase',
    letterSpacing: '0.5px', marginTop: '18px', marginBottom: '6px'
  },
  input: {
    width: '100%', padding: '12px', fontSize: '16px', background: '#1a1a1a',
    color: '#eee', border: '1px solid #333', borderRadius: '8px',
    marginBottom: '10px', boxSizing: 'border-box'
  },
  btn: (bg) => ({
    flex: 1, padding: '14px', minHeight: '48px', background: bg, color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer'
  }),
  card: {
    background: '#1a1a1a', border: '1px solid #2a2a2a',
    borderRadius: '8px', padding: '14px', marginTop: '10px'
  },
  dialRow: { marginBottom: '18px' },
  dialHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' },
  dialName: { fontSize: '14px', fontWeight: 600 },
  dialVal: { fontSize: '13px', color: '#a78bfa', fontWeight: 700 },
  dialHint: { fontSize: '11px', color: '#666', marginTop: '4px', lineHeight: 1.5 },
  slider: { width: '100%', minHeight: '44px', accentColor: '#667eea' }
};

const DIALS = [
  ['response_length', 'Length', ['Two or three sentences', 'A short paragraph', 'Expansive, explores the idea']],
  ['proactivity', 'Proactivity', ['Answers and stops', 'Adds one observation', 'Surfaces patterns and risks unasked']],
  ['directness', 'Directness', ['Encouraging and supportive', 'Honest but gentle', 'Tells you straight, no cheerleading']],
  ['krio_level', 'Krio', ['Mostly English', 'Even mix', 'Heavy Krio, her natural voice']],
  ['humor_level', 'Humour', ['Straight, minimal joking', 'Light touch', 'Playful and quick']],
  ['formality', 'Formality', ['Casual, like a close friend', 'Relaxed but respectful', 'Formal and professional']]
];

const band = (v) => (v <= 3 ? 0 : v <= 6 ? 1 : 2);

export default function WhoAmiIsTab() {
  const [p, setP] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testMsg, setTestMsg] = useState('How is GII doing?');
  const [testReply, setTestReply] = useState('');
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const r = await fetch(API + '/api/admin/personality', { headers: H });
      const j = await r.json();
      if (j.error) setErr(j.error);
      else { setP(j.personality); setErr(''); }
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => { setP({ ...p, [k]: v }); setDirty(true); setSaved(false); };

  const save = async () => {
    try {
      const r = await fetch(API + '/api/admin/personality', {
        method: 'PUT', headers: H, body: JSON.stringify(p)
      });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { setErr(String(e)); }
  };

  const runTest = async () => {
    if (!testMsg.trim()) return;
    setTesting(true);
    setTestReply('');
    try {
      const r = await fetch(API + '/api/chat/orchestrated', {
        method: 'POST', headers: H, body: JSON.stringify({ message: testMsg })
      });
      const j = await r.json();
      setTestReply(j.response || j.error || 'No reply');
    } catch (e) { setTestReply('Error: ' + String(e)); }
    setTesting(false);
  };

  if (loading) return <div style={S.wrap}>Loading…</div>;
  if (!p) return <div style={S.wrap}>Could not load Ami's personality.</div>;

  return (
    <div style={S.wrap}>
      {err && (
        <div style={{ background: '#7f1d1d', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px' }}>
          ⚠️ {err}
        </div>
      )}

      <div style={{ ...S.card, marginTop: 0 }}>
        <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#bbb' }}>
          These shape how Ami talks to you. Change a dial, save, then try a message
          in the test box below to hear the difference.
        </div>
      </div>

      <div style={S.label}>Dials</div>
      {DIALS.map(([key, name, hints]) => {
        const v = p[key] === undefined || p[key] === null ? 5 : p[key];
        return (
          <div key={key} style={S.dialRow}>
            <div style={S.dialHead}>
              <span style={S.dialName}>{name}</span>
              <span style={S.dialVal}>{v}</span>
            </div>
            <input
              type="range" min="0" max="10" value={v} style={S.slider}
              onChange={(e) => set(key, parseInt(e.target.value, 10))}
            />
            <div style={S.dialHint}>{hints[band(v)]}</div>
          </div>
        );
      })}

      <div style={S.label}>Tone</div>
      <select style={S.input} value={p.tone || 'warm-friendly'} onChange={(e) => set('tone', e.target.value)}>
        <option value="warm-friendly">Warm and friendly</option>
        <option value="calm-steady">Calm and steady</option>
        <option value="sharp-focused">Sharp and focused</option>
        <option value="playful">Playful</option>
      </select>

      <div style={S.label}>Energy</div>
      <select style={S.input} value={p.energy_level || 'balanced'} onChange={(e) => set('energy_level', e.target.value)}>
        <option value="low">Low — measured, unhurried</option>
        <option value="balanced">Balanced</option>
        <option value="high">High — driven, urgent</option>
      </select>

      <div style={S.label}>Signature phrases</div>
      <input
        style={S.input}
        value={p.signature_phrases || ''}
        placeholder="Kusheh, De man, no wahala"
        onChange={(e) => set('signature_phrases', e.target.value)}
      />
      <div style={{ ...S.dialHint, marginTop: '-6px', marginBottom: '10px' }}>
        Comma separated. She rotates these rather than opening the same way every time.
      </div>

      <div style={S.label}>What she cares about</div>
      <input
        style={S.input}
        value={p.passion_topics || ''}
        placeholder="Building Africa, GII's mission, Newcastle"
        onChange={(e) => set('passion_topics', e.target.value)}
      />

      <button
        style={{ ...S.btn(saved ? '#047857' : dirty ? '#059669' : '#2a2a2a'), width: '100%', marginTop: '10px' }}
        onClick={save}
        disabled={!dirty && !saved}
      >
        {saved ? '✓ Saved' : dirty ? '💾 Save changes' : 'No changes'}
      </button>

      <div style={S.label}>Test her voice</div>
      <input
        style={S.input}
        value={testMsg}
        placeholder="Type something to ask her"
        onChange={(e) => setTestMsg(e.target.value)}
      />
      <button style={{ ...S.btn('#667eea'), width: '100%' }} onClick={runTest} disabled={testing}>
        {testing ? '⏳ Asking…' : '▶ Send test message'}
      </button>

      {dirty && (
        <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '8px' }}>
          Save first — the test uses her saved settings.
        </div>
      )}

      {testReply && (
        <div style={S.card}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>AMI SAYS</div>
          <div style={{ fontSize: '14px', lineHeight: 1.7 }}>{testReply}</div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '10px' }}>
            This is a real message — it lands in your chat history too.
          </div>
        </div>
      )}

      <div style={{ height: '40px' }} />
    </div>
  );
}
