import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const AUTH = { 'X-Ami-Password': AMI_PASSWORD };
const H = { 'Content-Type': 'application/json', ...AUTH };

const BADGE = {
  'NFL': '🏈', 'NBA': '🏀', 'Premier League': '⚽',
  'Champions League': '⭐', 'AFCON': '🌍',
};

const S = {
  page: { padding: '14px 12px 30px', color: '#e8e8f0' },
  head: { fontSize: '19px', fontWeight: 700, marginBottom: '10px' },
  chips: { display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto' },
  chip: (on) => ({
    padding: '8px 14px', minHeight: '36px', borderRadius: '16px', flexShrink: 0,
    border: '1px solid ' + (on ? '#4f46e5' : '#2c2c3a'),
    background: on ? '#262040' : '#1a1a22',
    color: on ? '#a78bfa' : '#8b8b9e', fontSize: '12px', cursor: 'pointer',
  }),
  label: {
    fontSize: '11px', color: '#6b6b7c', textTransform: 'uppercase',
    letterSpacing: '0.6px', margin: '16px 0 8px', fontWeight: 600,
  },
  game: (mine) => ({
    background: mine ? '#1d1a2e' : '#1a1a22',
    border: '1px solid ' + (mine ? '#3a3357' : '#26263a'),
    borderRadius: '10px', padding: '11px 13px', marginBottom: '8px',
  }),
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' },
  small: { fontSize: '11px', color: '#777' },
  empty: { fontSize: '12px', color: '#5a5a6b', fontStyle: 'italic', padding: '10px 0' },
};

export default function SportsTab() {
  const [scope, setScope] = useState('week');
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [show, setShow] = useState(12);
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = async (w) => {
    setD(null); setErr('');
    try {
      const r = await fetch(API + '/api/sports?when=' + w, { headers: AUTH });
      const j = await r.json();
      if (j.error) { setErr(j.error); return; }
      setD(j);
    } catch (e) { setErr(String(e)); }
  };

  useEffect(() => { load(scope); }, [scope]);

  const refresh = async () => {
    setBusy(true);
    try {
      await fetch(API + '/api/sports/refresh', { method: 'POST', headers: H });
      await load(scope);
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  if (err) return <div style={S.page}><div style={{ ...S.game(false), borderColor: '#5c3030' }}>{err}</div></div>;
  if (!d) return <div style={S.page}><div style={S.empty}>Looking...</div></div>;

  const all = d.games || [];
  const leagues = [...new Set(all.map(g => g.league))];
  const mine = all.filter(g => g.mine);                       // always, whatever the filter
  const rest = all.filter(g => !g.mine &&
                              (leagueFilter === 'all' || g.league === leagueFilter));
  const restShown = rest.slice(0, show);

  const Game = ({ g }) => (
    <div style={{ ...S.game(g.mine),
                  ...(g.mine ? { borderLeft: '3px solid #a78bfa', padding: '13px 13px 13px 12px' } : {}) }}>
      <div style={S.row}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: g.mine ? 700 : 500 }}>
            {BADGE[g.league] || '•'} {g.team}
            <span style={{ color: '#6b6b7c', fontWeight: 400 }}>
              {' '}{g.home_away === 'home' ? 'v' : 'at'}{' '}
            </span>
            {g.opponent}
          </div>
          <div style={S.small}>{g.league}{g.status ? ' · ' + g.status : ''}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {g.score ? (
            <div style={{ fontSize: '15px', fontWeight: 700,
                          color: g.played ? '#8b8b9e' : '#10b981' }}>{g.score}</div>
          ) : null}
          <div style={{ fontSize: '11px',
                        color: g.when === 'today' ? '#a78bfa' : '#8b8b9e' }}>
            {g.when === 'today' || g.when === 'tomorrow' ? g.when : ''}
          </div>
          <div style={S.small}>{g.local}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.head}>Sport</div>

      <div style={S.chips}>
        {[['today', 'Today'], ['week', 'This week'], ['month', 'This month']].map(([k, l]) => (
          <button key={k} style={S.chip(scope === k)} onClick={() => setScope(k)}>{l}</button>
        ))}
        <button style={{ ...S.chip(false), marginLeft: 'auto' }} onClick={refresh} disabled={busy}>
          {busy ? 'fetching...' : '↻ refresh'}
        </button>
      </div>

      {leagues.length > 1 && (
        <div style={{ ...S.chips, marginTop: '-4px' }}>
          <button style={S.chip(leagueFilter === 'all')}
                  onClick={() => { setLeagueFilter('all'); setShow(12); }}>
            All sport
          </button>
          {leagues.map(l => (
            <button key={l} style={S.chip(leagueFilter === l)}
                    onClick={() => { setLeagueFilter(l); setShow(12); }}>
              {BADGE[l] || ''} {l}
            </button>
          ))}
        </div>
      )}

      {mine.length > 0 && (
        <>
          <div style={{ ...S.label, color: '#a78bfa' }}>Your teams</div>
          {mine.map((g, i) => <Game key={'m' + i} g={g} />)}
        </>
      )}

      {rest.length > 0 && (
        <>
          <div style={S.label}>Everything else</div>
          {restShown.map((g, i) => <Game key={'r' + i} g={g} />)}
          {rest.length > show && (
            <button onClick={() => setShow(show + 12)}
                    style={{ width: '100%', padding: '11px', marginTop: '4px',
                             background: '#2a2a2a', color: '#aaa', border: 'none',
                             borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
              Show more ({rest.length - show} more)
            </button>
          )}
          {show > 12 && (
            <button onClick={() => setShow(12)}
                    style={{ width: '100%', padding: '9px', marginTop: '6px',
                             background: 'transparent', color: '#6b6b7c',
                             border: '1px solid #2c2c3a', borderRadius: '8px',
                             fontSize: '12px', cursor: 'pointer' }}>
              Show less
            </button>
          )}
        </>
      )}

      {mine.length === 0 && rest.length === 0 && (
        <div style={S.empty}>
          Nothing in this window. Try a wider one, or press refresh to pull the schedules.
        </div>
      )}

      <div style={{ ...S.small, marginTop: '18px', lineHeight: 1.6 }}>
        Following: {(d.teams || []).join(' · ')}
        <br />
        Times are wherever you are. Schedules update twice a day on their own,
        so playoffs and next season turn up without you doing anything.
      </div>
    </div>
  );
}
