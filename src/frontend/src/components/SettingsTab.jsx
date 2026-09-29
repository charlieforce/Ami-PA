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
    borderRadius: '8px', padding: '14px', marginBottom: '8px'
  },
  hint: { fontSize: '11px', color: '#666', marginTop: '-6px', marginBottom: '12px', lineHeight: 1.5 },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: '12px', padding: '12px 0', borderBottom: '1px solid #222', minHeight: '52px'
  },
  toggle: (on) => ({
    width: '52px', height: '30px', borderRadius: '15px', border: 'none',
    background: on ? '#059669' : '#3f3f46', cursor: 'pointer', position: 'relative',
    flexShrink: 0, padding: 0, transition: 'background 0.15s'
  }),
  knob: (on) => ({
    position: 'absolute', top: '3px', left: on ? '25px' : '3px',
    width: '24px', height: '24px', borderRadius: '50%', background: '#fff',
    transition: 'left 0.15s'
  })
};

const CRITICAL = {
  gemini_calls: 'Turning this off stops every AI response. Ami can still show your data but cannot talk.',
  chat_enabled: 'Turning this off disables chat with Ami entirely.'
};

export default function SettingsTab() {
  const [personal, setPersonal] = useState(null);
  const [features, setFeatures] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [backupInfo, setBackupInfo] = useState(null);
  const [backingUp, setBackingUp] = useState(false);
  const [showRestore, setShowRestore] = useState(false);

  const loadBackup = async () => {
    try {
      const r = await fetch(API + '/api/admin/backup', { headers: H });
      setBackupInfo(await r.json());
    } catch (e) { /* non-fatal */ }
  };
  useEffect(() => { loadBackup(); }, []);

  const backupNow = async () => {
    setBackingUp(true);
    try {
      const r = await fetch(API + '/api/admin/backup', { method: 'POST', headers: H });
      const j = await r.json();
      if (!j.ok) setErr('Backup failed: ' + (j.error || 'unknown'));
      await loadBackup();
    } catch (e) { setErr(String(e)); }
    setBackingUp(false);
  };

  const load = async () => {
    try {
      const [r1, r2] = await Promise.all([
        fetch(API + '/api/admin/settings/personal', { headers: H }),
        fetch(API + '/api/admin/features', { headers: H })
      ]);
      const j1 = await r1.json();
      const j2 = await r2.json();
      if (j1.settings) setPersonal(j1.settings);
      setFeatures(j2.features || []);
      setErr('');
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => { setPersonal({ ...personal, [k]: v }); setDirty(true); setSaved(false); };

  const savePersonal = async () => {
    try {
      const r = await fetch(API + '/api/admin/settings/personal', {
        method: 'PUT', headers: H, body: JSON.stringify(personal)
      });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setDirty(false); setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { setErr(String(e)); }
  };

  const toggle = async (f) => {
    const next = f.enabled ? 0 : 1;
    if (next === 0 && CRITICAL[f.name]) {
      if (!window.confirm(CRITICAL[f.name] + '\n\nTurn it off?')) return;
    }
    try {
      const r = await fetch(API + '/api/admin/features/' + f.id, {
        method: 'PUT', headers: H, body: JSON.stringify({ enabled: next })
      });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setFeatures(features.map(x => x.id === f.id ? { ...x, enabled: next } : x));
    } catch (e) { setErr(String(e)); }
  };

  if (loading) return <div style={S.wrap}>Loading…</div>;

  return (
    <div style={S.wrap}>
      {err && (
        <div style={{ background: '#7f1d1d', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px' }}>
          ⚠️ {err}
        </div>
      )}

      <div style={S.card}>
        <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#bbb' }}>
          How the app behaves. Your profile and what Ami knows about you live under
          What Ami Knows; her voice lives under Who Ami Is.
        </div>
      </div>

      {personal && (
        <>
          <div style={S.label}>Your working day</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Start</div>
              <input
                style={S.input} type="time"
                value={personal.work_hours_start || '09:00'}
                onChange={e => set('work_hours_start', e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>End</div>
              <input
                style={S.input} type="time"
                value={personal.work_hours_end || '18:00'}
                onChange={e => set('work_hours_end', e.target.value)}
              />
            </div>
          </div>
          <div style={S.hint}>
            Ami uses these to judge when to push work at you and when to ease off.
          </div>

          <div style={S.label}>Quiet hours</div>
          <input
            style={S.input}
            value={personal.do_not_disturb_hours || ''}
            placeholder="22:00-06:00"
            onChange={e => set('do_not_disturb_hours', e.target.value)}
          />
          <div style={S.hint}>
            Inside this window Ami keeps it short and does not raise work unless you do.
            Leave blank for none.
          </div>

          <div style={S.label}>Language</div>
          <select
            style={S.input}
            value={personal.language_preference || 'en-krio'}
            onChange={e => set('language_preference', e.target.value)}
          >
            <option value="en-krio">English and Krio</option>
            <option value="en">English only</option>
            <option value="krio">Krio mostly</option>
          </select>

          <div style={S.row}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Notifications</div>
              <div style={{ fontSize: '11px', color: '#888' }}>Reminders and alerts</div>
            </div>
            <button
              style={S.toggle(!!personal.notifications_enabled)}
              onClick={() => set('notifications_enabled', personal.notifications_enabled ? 0 : 1)}
            >
              <span style={S.knob(!!personal.notifications_enabled)} />
            </button>
          </div>

          <button
            style={{ ...S.btn(saved ? '#047857' : dirty ? '#059669' : '#2a2a2a'), width: '100%', marginTop: '14px' }}
            onClick={savePersonal}
            disabled={!dirty && !saved}
          >
            {saved ? '✓ Saved' : dirty ? '💾 Save your day' : 'No changes'}
          </button>
        </>
      )}

      <div style={{ borderTop: '1px solid #2a2a2a', marginTop: '24px' }} />
      <div style={S.label}>Features</div>
      <div style={S.hint}>
        These take effect immediately. No save needed.
      </div>
      {features.map(f => (
        <div key={f.id} style={S.row}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {String(f.name).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </div>
            <div style={{ fontSize: '11px', color: CRITICAL[f.name] ? '#f59e0b' : '#888', lineHeight: 1.4 }}>
              {f.description}
            </div>
          </div>
          <button style={S.toggle(!!f.enabled)} onClick={() => toggle(f)}>
            <span style={S.knob(!!f.enabled)} />
          </button>
        </div>
      ))}

      <div style={S.label}>Backups</div>
      <div style={S.card}>
        <div style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.6 }}>
          {backupInfo && backupInfo.last_ok
            ? <>Last backup: <strong>{String(backupInfo.last_ok).slice(0, 16)}</strong>. Runs every night at 2am and keeps two weeks, on this Mac and in iCloud.</>
            : 'No backup yet.'}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button style={S.btn(backingUp ? '#2a2a2a' : '#059669')} onClick={backupNow} disabled={backingUp}>
            {backingUp ? 'Backing up...' : 'Back up now'}
          </button>
          <button style={S.btn('#2a2a2a')} onClick={() => setShowRestore(!showRestore)}>
            How to restore
          </button>
        </div>
        {showRestore && (
          <div style={{ fontSize: '12px', color: '#aaa', lineHeight: 1.7, marginTop: '12px' }}>
            1. Open iCloud Drive → AmiPA-Backups and pick the most recent file.<br />
            2. Double-click it to unpack. You get ami_memory.db and a medical folder.<br />
            3. Stop the app (close the terminal running Flask).<br />
            4. Copy ami_memory.db over src/data/ami_memory.db, and the medical folder into src/data/.<br />
            5. Start Flask again.
          </div>
        )}
      </div>

      <div style={{ ...S.card, marginTop: '18px' }}>
        <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
          Spend limits and the cost breaker are under Engines and Cost.
          Timezone and travel are under Travel and Time.
        </div>
      </div>

      <div style={{ height: '40px' }} />
    </div>
  );
}
