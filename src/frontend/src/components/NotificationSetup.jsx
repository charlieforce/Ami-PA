import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const AUTH = { 'X-Ami-Password': AMI_PASSWORD };
const H = { 'Content-Type': 'application/json', ...AUTH };

// the key arrives as base64url; the browser wants raw bytes
const toBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

export default function NotificationSetup() {
  const [state, setState] = useState('checking');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready
        .then(r => r.pushManager.getSubscription())
        .then(s => setState(s ? 'on' : 'off'))
        .catch(() => setState('off'));
    } else if (Notification.permission === 'denied') {
      setState('blocked');
    } else {
      setState('off');
    }
  }, []);

  const turnOn = async () => {
    setState('working'); setNote('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState('blocked'); return; }

      const keyRes = await fetch(API + '/api/push/key', { headers: AUTH });
      const { key } = await keyRes.json();
      if (!key) throw new Error('no key from the server');

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toBytes(key),
      });

      await fetch(API + '/api/push/subscribe', {
        method: 'POST', headers: H,
        body: JSON.stringify({ subscription: sub.toJSON(), label: 'phone' }),
      });
      setState('on');
      setNote('Done. Ten minutes before a meeting, your phone will tell you.');
    } catch (e) {
      setState('off');
      setNote(String(e).slice(0, 120));
    }
  };

  const testIt = async () => {
    setNote('Sending...');
    try {
      const r = await fetch(API + '/api/push/test', { method: 'POST', headers: H });
      const j = await r.json();
      setNote(j.sent ? 'Sent. It should arrive in a second.' : 'Nothing went out.');
    } catch (e) { setNote(String(e).slice(0, 120)); }
  };

  const box = {
    background: '#1a1a22', border: '1px solid #2c2c3a', borderRadius: '10px',
    padding: '14px', marginBottom: '12px', color: '#e8e8f0',
  };
  const btn = (bg) => ({
    padding: '11px 16px', background: bg, color: '#fff', border: 'none',
    borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 600,
  });

  return (
    <div style={box}>
      <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
        Meeting reminders
      </div>
      <div style={{ fontSize: '12px', color: '#8b8b9e', marginBottom: '12px' }}>
        Your phone tells you ten minutes before a meeting, whether the app is open or not.
      </div>

      {state === 'unsupported' && (
        <div style={{ fontSize: '13px', color: '#f0a5a5' }}>
          This browser cannot do notifications. On iPhone, add the app to your home
          screen first.
        </div>
      )}

      {state === 'blocked' && (
        <div style={{ fontSize: '13px', color: '#f0a5a5' }}>
          Notifications are blocked. Turn them back on for this app in your phone's
          settings, then come back.
        </div>
      )}

      {(state === 'off' || state === 'working') && (
        <button style={btn('#4f46e5')} onClick={turnOn} disabled={state === 'working'}>
          {state === 'working' ? 'Setting up...' : 'Turn them on'}
        </button>
      )}

      {state === 'on' && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#10b981' }}>✓ On</span>
          <button style={{ ...btn('#2a2a2a'), fontSize: '12px', padding: '8px 12px' }}
                  onClick={testIt}>
            Send me one now
          </button>
        </div>
      )}

      {note && (
        <div style={{ fontSize: '12px', color: '#8b8b9e', marginTop: '10px' }}>{note}</div>
      )}
    </div>
  );
}
