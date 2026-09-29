import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };
const STAGES = ['idea', 'design', 'build', 'mvp', 'launched', 'scaling'];
const PAGE = 10;

const S = {
  wrap: { padding: '12px', color: '#eee' },
  bar: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' },
  tab: (on) => ({
    padding: '10px 14px', minHeight: '44px', background: on ? '#667eea' : '#2a2a2a',
    color: '#fff', border: 'none', borderRadius: '8px', fontWeight: on ? 700 : 400,
    whiteSpace: 'nowrap', fontSize: '14px', cursor: 'pointer'
  }),
  input: {
    width: '100%', padding: '12px', fontSize: '16px', background: '#1a1a1a',
    color: '#eee', border: '1px solid #333', borderRadius: '8px',
    marginBottom: '12px', boxSizing: 'border-box'
  },
  area: {
    width: '100%', padding: '12px', fontSize: '16px', background: '#1a1a1a',
    color: '#eee', border: '1px solid #333', borderRadius: '8px',
    marginBottom: '12px', boxSizing: 'border-box', minHeight: '90px',
    fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical'
  },
  vCard: (c) => ({
    background: '#1e1e1e', borderLeft: '4px solid ' + (c || '#667eea'),
    borderRadius: '8px', padding: '14px', marginBottom: '8px', cursor: 'pointer'
  }),
  pRow: {
    background: '#181818', borderLeft: '2px dashed #444', borderRadius: '6px',
    padding: '12px', marginBottom: '6px', cursor: 'pointer', minHeight: '44px'
  },
  sheet: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#121212',
    zIndex: 1000, overflowY: 'auto', padding: '16px'
  },
  btn: (bg) => ({
    flex: 1, padding: '14px', minHeight: '48px', background: bg, color: '#fff',
    border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer'
  }),
  label: {
    fontSize: '11px', color: '#888', textTransform: 'uppercase',
    letterSpacing: '0.5px', marginTop: '16px', marginBottom: '4px'
  },
  back: {
    background: 'none', border: 'none', color: '#667eea',
    fontSize: '16px', padding: '8px 0', cursor: 'pointer'
  },
  panel: {
    background: '#1a1a1a', border: '1px solid #2a2a2a',
    borderRadius: '8px', padding: '14px', marginTop: '10px'
  },
  chip: (bg) => ({
    background: bg, borderRadius: '8px', padding: '10px 8px',
    textAlign: 'center', flex: '1 1 30%', minWidth: '84px'
  })
};

const daysBetween = (a, b) => {
  if (!a) return null;
  const end = b ? new Date(b.replace(' ', 'T')) : new Date();
  return Math.round((end - new Date(a.replace(' ', 'T'))) / 86400000);
};
const dur = (a, b) => {
  const d = daysBetween(a, b);
  if (d === null) return '';
  return d < 1 ? 'today' : d === 1 ? '1 day' : d + ' days';
};
const ord = (n) => (n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th');

function Pipeline({ stage }) {
  const at = STAGES.indexOf((stage || 'idea').toLowerCase());
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '6px' }}>
      {STAGES.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <div style={{ width: '10px', height: '2px', background: i <= at ? '#667eea' : '#333' }} />}
          <div title={s} style={{
            width: i === at ? '11px' : '8px', height: i === at ? '11px' : '8px',
            borderRadius: '50%',
            background: i < at ? '#667eea' : i === at ? '#a78bfa' : '#333',
            border: i === at ? '2px solid #c4b5fd' : 'none'
          }} />
        </React.Fragment>
      ))}
      <span style={{
        marginLeft: '8px', fontSize: '11px', color: '#a78bfa',
        fontWeight: 700, textTransform: 'uppercase'
      }}>{stage || 'idea'}</span>
    </div>
  );
}

function StageRow({ h }) {
  return (
    <div style={{ borderLeft: '2px solid #667eea', paddingLeft: '10px', marginBottom: '14px' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, textTransform: 'capitalize' }}>
        {h.stage}{h.pass_number > 1 ? ' · ' + ord(h.pass_number) + ' pass' : ''}
      </div>
      <div style={{ fontSize: '12px', color: '#888' }}>
        {(h.moved_at || '').slice(0, 10)} → {h.exited_at ? h.exited_at.slice(0, 10) : 'current'}
        {' · '}{dur(h.moved_at, h.exited_at)}
      </div>
      {h.outcome && <div style={{ fontSize: '13px', color: '#34d399', marginTop: '4px' }}>→ {h.outcome}</div>}
      {h.blockers && <div style={{ fontSize: '13px', color: '#f87171', marginTop: '4px' }}>⚠️ {h.blockers}</div>}
      {h.notes && <div style={{ fontSize: '13px', color: '#bbb', marginTop: '4px', lineHeight: 1.5 }}>{h.notes}</div>}
    </div>
  );
}

const activityStrip = (a) => {
  if (!a) return null;
  const bits = [];
  if (a.open_tasks > 0) bits.push({ t: a.open_tasks + ' open', c: '#667eea' });
  if (a.done_tasks > 0) bits.push({ t: a.done_tasks + ' done', c: '#10b981' });
  if (a.days_in_stage != null) {
    bits.push({ t: a.days_in_stage + 'd in stage',
                c: a.days_in_stage > 90 ? '#f59e0b' : '#888' });
  }
  if (a.days_quiet != null && a.days_quiet > 14) {
    bits.push({ t: 'quiet ' + a.days_quiet + 'd', c: '#f87171' });
  }
  if (a.open_tasks === 0 && a.done_tasks === 0) {
    bits.push({ t: 'no tasks', c: '#666' });
  }
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
      {a.stalled && (
        <span style={{ fontSize: '10px', background: '#f59e0b20', color: '#f59e0b',
                       padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>
          STALLED
        </span>
      )}
      {bits.map((b, i) => (
        <span key={i} style={{ fontSize: '10px', color: b.c }}>{b.t}</span>
      ))}
    </div>
  );
};

export default function VenturesProjectsTab() {
  const [view, setView] = useState('all');
  const [ventures, setVentures] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sync, setSync] = useState({ dirty: 1 });
  const [syncing, setSyncing] = useState(false);
  const [q, setQ] = useState('');
  const [activity, setActivity] = useState({});
  const [showArchived, setShowArchived] = useState(false);

  const loadActivity = async () => {
    try {
      const r = await fetch(API + '/api/admin/ventures/activity', { headers: H });
      const j = await r.json();
      const m = {};
      (j.ventures || []).forEach(v => { m[v.id] = v; });
      setActivity(m);
    } catch (e) { /* non-fatal */ }
  };

  const toggleArchive = async (item, e) => {
    e.stopPropagation();
    const a = activity[item.id];
    const next = !(a && a.archived);
    if (next && !window.confirm(`Put ${item.name} aside? It stays in the data, just out of the way.`)) return;
    try {
      await fetch(API + '/api/admin/ventures/' + item.id + '/archive', {
        method: 'PUT', headers: H, body: JSON.stringify({ archived: next })
      });
      await loadActivity();
    } catch (err) { /* non-fatal */ }
  };

  useEffect(() => { loadActivity(); }, []);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeStage, setActiveStage] = useState(null);
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(null);
  const [advancing, setAdvancing] = useState(null);
  const [outcome, setOutcome] = useState('');
  const [lifecycle, setLifecycle] = useState(false);
  const [rep, setRep] = useState(null);
  const [repLoading, setRepLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const r = await fetch(API + '/api/admin/ventures', { headers: H });
      const d = await r.json();
      if (d.error) { setErr(d.error); setLoading(false); return; }
      setVentures(d.ventures || []);
      setProjects(d.projects || []);
      setSync(d.sync || { dirty: 1 });
      setErr('');
    } catch (e) { setErr(String(e)); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const loadReport = async () => {
    setRepLoading(true);
    try {
      const r = await fetch(API + '/api/admin/ventures/report', { headers: H });
      const d = await r.json();
      if (d.error) setErr(d.error); else setRep(d);
    } catch (e) { setErr(String(e)); }
    setRepLoading(false);
  };

  const goReport = () => { setView('report'); if (!rep) loadReport(); };

  const fetchHistory = async (id) => {
    try {
      const r = await fetch(API + '/api/admin/ventures/' + id + '/history', { headers: H });
      const d = await r.json();
      return d.history || [];
    } catch { return []; }
  };

  const openItem = async (it) => {
    setOpen(it); setActiveStage(null); setLifecycle(false); setAdvancing(null);
    setHistory(await fetchHistory(it.id));
  };

  const recordFor = (stage) => {
    const all = history.filter(h => (h.stage || '').toLowerCase() === stage);
    return all.length ? all[all.length - 1] : null;
  };

  const selectStage = (stage) => {
    setActiveStage(stage); setLifecycle(false); setAdvancing(null);
    const r = recordFor(stage);
    setDraft(r ? { notes: r.notes || '', blockers: r.blockers || '', outcome: r.outcome || '' } : {});
    setSaved(false);
  };

  const saveStageRecord = async () => {
    const r = recordFor(activeStage);
    if (!r) return;
    try {
      const res = await fetch(API + '/api/admin/stage-record/' + r.id, {
        method: 'PUT', headers: H, body: JSON.stringify(draft)
      });
      const d = await res.json();
      if (d.error) { setErr(d.error); return; }
      setHistory(await fetchHistory(open.id));
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      setRep(null); load();
    } catch (e) { setErr(String(e)); }
  };

  const confirmAdvance = async () => {
    try {
      const res = await fetch(API + '/api/admin/ventures/' + open.id + '/stage', {
        method: 'POST', headers: H, body: JSON.stringify({ stage: advancing, outcome })
      });
      const d = await res.json();
      if (d.error) { setErr(d.error); return; }
      setOpen({ ...open, stage: advancing });
      setHistory(await fetchHistory(open.id));
      setAdvancing(null); setOutcome(''); setActiveStage(null);
      setRep(null); load();
    } catch (e) { setErr(String(e)); }
  };

  const doSync = async () => {
    setSyncing(true);
    try {
      await fetch(API + '/api/admin/ami/sync-ventures', { method: 'POST', headers: H });
      await load();
    } catch (e) { setErr(String(e)); }
    setSyncing(false);
  };

  const save = async () => {
    if (!editing.name || !editing.name.trim()) { setErr('Name is required'); return; }
    const method = editing.id ? 'PUT' : 'POST';
    const url = editing.id ? API + '/api/admin/ventures/' + editing.id : API + '/api/admin/ventures';
    try {
      const r = await fetch(url, { method, headers: H, body: JSON.stringify(editing) });
      const d = await r.json();
      if (d.error) { setErr(d.error); return; }
      setEditing(null); setOpen(null); setRep(null); load();
    } catch (e) { setErr(String(e)); }
  };

  const del = async (it) => {
    const kids = projects.filter(p => p.parent_id === it.id).length;
    const msg = kids
      ? 'Delete ' + it.name + '? Its ' + kids + ' project(s) will become standalone.'
      : 'Delete ' + it.name + '?';
    if (!window.confirm(msg)) return;
    try {
      await fetch(API + '/api/admin/ventures/' + it.id, { method: 'DELETE', headers: H });
      setOpen(null); setRep(null); load();
    } catch (e) { setErr(String(e)); }
  };

  const match = (x) => !q || [x.name, x.team_members, x.description, x.for_whom]
    .filter(Boolean).join(' ').toLowerCase().includes(q.toLowerCase());

  if (loading) return <div style={S.wrap}>Loading ventures and projects…</div>;

  const fv = ventures.filter(match);
  const fp = projects.filter(match);
  const standalone = fp.filter(p => !p.parent_id);
  const current = (open && open.stage ? open.stage : '').toLowerCase();
  const rec = activeStage ? recordFor(activeStage) : null;

  const VCard = (v) => (
    <div key={v.id} style={{ ...S.vCard(v.color),
                             opacity: activity[v.id] && activity[v.id].archived ? 0.45 : 1 }}
         onClick={() => openItem(v)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ fontWeight: 700, fontSize: '16px' }}>🏢 {v.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: '#667eea', fontWeight: 600, textTransform: 'capitalize' }}>{v.stage}</div>
          <button onClick={(e) => toggleArchive(v, e)}
            title={activity[v.id] && activity[v.id].archived ? 'Bring it back' : 'Put it aside'}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer',
                     fontSize: '13px', padding: '2px 4px' }}>
            {activity[v.id] && activity[v.id].archived ? '\u21A9' : '\u25CB'}
          </button>
        </div>
      </div>
      {activityStrip(activity[v.id])}
      <Pipeline stage={v.stage} />
    </div>
  );

  const PRow = (p, indent) => (
    <div key={p.id} style={{ ...S.pRow, marginLeft: indent ? '16px' : 0,
                             opacity: activity[p.id] && activity[p.id].archived ? 0.45 : 1 }}
         onClick={() => openItem(p)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, minWidth: 0 }}>
          {indent && <span style={{ color: '#555' }}>↳ </span>}📁 {p.name}
          {p.for_whom && <span style={{ fontSize: '11px', color: '#f59e0b', marginLeft: '6px' }}>👤 {p.for_whom}</span>}
        </div>
        <button onClick={(e) => toggleArchive(p, e)}
          title={activity[p.id] && activity[p.id].archived ? 'Bring it back' : 'Put it aside'}
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer',
                   fontSize: '13px', padding: '2px 4px', flexShrink: 0 }}>
          {activity[p.id] && activity[p.id].archived ? '\u21A9' : '\u25CB'}
        </button>
      </div>
      {activityStrip(activity[p.id])}
      <Pipeline stage={p.stage} />
    </div>
  );

  const stuckSorted = rep ? [...(rep.stuck || [])].sort(
    (a, b) => (daysBetween(b.since) || 0) - (daysBetween(a.since) || 0)) : [];

  return (
    <div style={S.wrap}>
      {err && (
        <div style={{ background: '#7f1d1d', padding: '10px', borderRadius: '6px', marginBottom: '10px', fontSize: '13px' }}>
          ⚠️ {err}
        </div>
      )}

      <button onClick={doSync} disabled={syncing} style={{
        width: '100%', padding: '12px', minHeight: '48px',
        background: sync.dirty ? '#d97706' : '#1f2937', color: '#fff', border: 'none',
        borderRadius: '8px', fontSize: '14px', fontWeight: 600, marginBottom: '12px', cursor: 'pointer'
      }}>
        {syncing ? '⏳ Syncing…' : sync.dirty ? '🔄 Sync Ami — changes pending' : '✅ Ami is up to date'}
      </button>

      <div style={S.bar}>
        <button style={S.tab(view === 'all')} onClick={() => { setView('all'); setLimit(PAGE); }}>
          📋 All ({fv.length + fp.length})
        </button>
        <button style={S.tab(view === 'ventures')} onClick={() => setView('ventures')}>
          🏢 Ventures ({fv.length})
        </button>
        <button style={S.tab(view === 'projects')} onClick={() => { setView('projects'); setLimit(PAGE); }}>
          📁 Projects ({fp.length})
        </button>
        <button style={S.tab(view === 'report')} onClick={goReport}>📊 Report</button>
      </div>

      {view !== 'report' && (
        <>
          <input style={S.input} placeholder="🔍 Search by name, team, details…"
            value={q} onChange={e => { setQ(e.target.value); setLimit(PAGE); }} />

          <button onClick={() => setEditing({ type: view === 'ventures' ? 'venture' : 'project', stage: 'idea', name: '' })}
            style={{ ...S.btn('#059669'), width: '100%', marginBottom: '12px' }}>
            ➕ Add {view === 'ventures' ? 'venture' : 'project'}
          </button>
        </>
      )}

      {view === 'all' && (
        <>
          {fv.map(v => (
            <div key={v.id}>
              {VCard(v)}
              {fp.filter(p => p.parent_id === v.id).map(p => PRow(p, true))}
            </div>
          ))}
          {standalone.length > 0 && (
            <>
              <div style={{ ...S.label, borderTop: '1px solid #2a2a2a', paddingTop: '14px' }}>
                Standalone projects ({standalone.length})
              </div>
              {standalone.slice(0, limit).map(p => PRow(p, false))}
              {standalone.length > limit && (
                <button onClick={() => setLimit(limit + PAGE)} style={{ ...S.btn('#2a2a2a'), width: '100%', marginTop: '8px' }}>
                  Load more ({standalone.length - limit} left)
                </button>
              )}
            </>
          )}
          {fv.length === 0 && fp.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
              Nothing here yet. Add your first venture or project.
            </div>
          )}
        </>
      )}

      {view === 'ventures' && (fv.length ? fv.map(VCard)
        : <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>No ventures yet.</div>)}

      {view === 'projects' && (
        <>
          {fp.slice(0, limit).map(p => PRow(p, false))}
          {fp.length > limit && (
            <button onClick={() => setLimit(limit + PAGE)} style={{ ...S.btn('#2a2a2a'), width: '100%', marginTop: '8px' }}>
              Load more ({fp.length - limit} left)
            </button>
          )}
          {fp.length === 0 && <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>No projects yet.</div>}
        </>
      )}

      {/* PORTFOLIO REPORT */}
      {view === 'report' && (
        <>
          <button onClick={loadReport} style={{ ...S.btn('#2a2a2a'), width: '100%', marginBottom: '12px' }}>
            {repLoading ? '⏳ Loading…' : '↻ Refresh report'}
          </button>

          {!rep && !repLoading && <div style={{ color: '#666', textAlign: 'center', padding: '30px' }}>No data yet.</div>}

          {rep && (
            <>
              <div style={S.label}>Where everything sits</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {STAGES.map(s => (
                  <div key={s} style={S.chip(rep.stage_counts[s] ? '#1e1e3f' : '#1a1a1a')}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: rep.stage_counts[s] ? '#a78bfa' : '#444' }}>
                      {rep.stage_counts[s] || 0}
                    </div>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'capitalize' }}>{s}</div>
                  </div>
                ))}
              </div>

              {stuckSorted.length > 0 && (
                <>
                  <div style={S.label}>Longest in current stage</div>
                  {stuckSorted.slice(0, 5).map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', gap: '8px',
                      padding: '10px 0', borderBottom: '1px solid #222', fontSize: '14px'
                    }}>
                      <span>{s.item}</span>
                      <span style={{ color: '#888', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {s.stage} · {dur(s.since)}
                      </span>
                    </div>
                  ))}
                </>
              )}

              {rep.blockers && rep.blockers.length > 0 && (
                <>
                  <div style={S.label}>Open blockers ({rep.blockers.length})</div>
                  {rep.blockers.map((b, i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #222' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        {b.item} <span style={{ color: '#888', textTransform: 'capitalize' }}>· {b.stage}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#f87171', marginTop: '2px' }}>⚠️ {b.blockers}</div>
                    </div>
                  ))}
                </>
              )}

              {rep.regressed && rep.regressed.length > 0 && (
                <>
                  <div style={S.label}>Went backwards</div>
                  {rep.regressed.map((r, i) => (
                    <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #222', fontSize: '14px' }}>
                      {r.item} <span style={{ color: '#f59e0b' }}>· {r.stage} ({ord(r.pass_number)} pass)</span>
                    </div>
                  ))}
                </>
              )}

              <div style={{ ...S.label, marginTop: '24px' }}>Every item, full history</div>
              {(rep.items || []).map(it => (
                <div key={it.id} style={{ ...S.panel, marginBottom: '8px' }}>
                  <div onClick={() => setExpanded({ ...expanded, [it.id]: !expanded[it.id] })}
                    style={{ cursor: 'pointer', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>
                        {it.type === 'venture' ? '🏢' : '📁'} {it.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        {it.parent_name ? it.parent_name + ' · ' : ''}
                        <span style={{ textTransform: 'capitalize' }}>{it.stage}</span>
                        {it.since ? ' · ' + dur(it.since) : ''}
                        {it.for_whom ? ' · for ' + it.for_whom : ''}
                      </div>
                    </div>
                    <span style={{ color: '#667eea', fontSize: '18px' }}>{expanded[it.id] ? '−' : '+'}</span>
                  </div>

                  {expanded[it.id] && (
                    <div style={{ marginTop: '12px' }}>
                      {(it.history || []).length === 0
                        ? <div style={{ fontSize: '13px', color: '#666' }}>No stages recorded.</div>
                        : (it.history || []).map(h => <StageRow key={h.id} h={h} />)}
                      {it.next_action && (
                        <div style={{ fontSize: '13px', color: '#34d399' }}>⚡ Next: {it.next_action}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ height: '40px' }} />
            </>
          )}
        </>
      )}

      {/* DETAIL SHEET */}
      {open && !editing && (
        <div style={S.sheet}>
          <button onClick={() => setOpen(null)} style={S.back}>← Back</button>

          <div style={{ fontSize: '11px', color: '#888' }}>
            {open.type === 'venture' ? '🏢 VENTURE' : '📁 PROJECT'}
          </div>
          <h2 style={{ margin: '4px 0 8px' }}>{open.name}</h2>
          {open.parent_name && <div style={{ fontSize: '13px', color: '#667eea' }}>Part of 🏢 {open.parent_name}</div>}
          {open.for_whom && <div style={{ fontSize: '13px', color: '#f59e0b' }}>👤 Built for {open.for_whom}</div>}
          <Pipeline stage={open.stage} />

          <div style={S.label}>Stages — tap to view</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {STAGES.map(s => {
              const visited = history.some(h => (h.stage || '').toLowerCase() === s);
              const isCurrent = s === current;
              const isActive = s === activeStage;
              return (
                <button key={s} onClick={() => selectStage(s)} style={{
                  padding: '10px 12px', minHeight: '44px', fontSize: '13px',
                  borderRadius: '6px', cursor: 'pointer', textTransform: 'capitalize',
                  background: isActive ? '#4c1d95' : isCurrent ? '#667eea' : visited ? '#2a2a2a' : '#1a1a1a',
                  color: (visited || isCurrent) ? '#fff' : '#666',
                  border: isActive ? '2px solid #a78bfa' : '1px solid #2a2a2a'
                }}>
                  {s}{isCurrent ? ' ●' : ''}
                </button>
              );
            })}
          </div>

          <button onClick={() => { setLifecycle(!lifecycle); setActiveStage(null); setAdvancing(null); }}
            style={{ ...S.btn('#2a2a2a'), width: '100%', marginTop: '10px' }}>
            {lifecycle ? '✕ Close lifecycle' : '📊 Lifecycle of ' + open.name}
          </button>

          {lifecycle && (
            <div style={S.panel}>
              <div style={{ fontWeight: 700, marginBottom: '10px' }}>Full lifecycle</div>
              {history.length === 0 && <div style={{ color: '#666', fontSize: '13px' }}>No stages recorded yet.</div>}
              {history.map(h => <StageRow key={h.id} h={h} />)}
            </div>
          )}

          {activeStage && !lifecycle && (
            <div style={S.panel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, textTransform: 'capitalize', fontSize: '15px' }}>
                  {activeStage}
                  {rec && rec.pass_number > 1 && (
                    <span style={{ fontSize: '11px', color: '#a78bfa', marginLeft: '6px' }}>
                      {ord(rec.pass_number)} pass
                    </span>
                  )}
                </div>
                {activeStage === current && <span style={{ fontSize: '11px', color: '#667eea' }}>CURRENT</span>}
              </div>

              {rec ? (
                <>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', marginBottom: '10px' }}>
                    Entered {(rec.moved_at || '').slice(0, 10)}
                    {rec.exited_at ? ' · exited ' + rec.exited_at.slice(0, 10) : ''}
                    {' · '}{dur(rec.moved_at, rec.exited_at)}
                  </div>

                  <div style={S.label}>Notes for this stage</div>
                  <textarea style={S.area} value={draft.notes || ''}
                    placeholder="What happened during this phase?"
                    onChange={e => setDraft({ ...draft, notes: e.target.value })} />

                  <div style={S.label}>Blockers</div>
                  <textarea style={{ ...S.area, minHeight: '60px' }} value={draft.blockers || ''}
                    placeholder="What held this phase up?"
                    onChange={e => setDraft({ ...draft, blockers: e.target.value })} />

                  <div style={S.label}>Outcome</div>
                  <input style={S.input} value={draft.outcome || ''}
                    placeholder="One line: how did this phase end?"
                    onChange={e => setDraft({ ...draft, outcome: e.target.value })} />

                  <button onClick={saveStageRecord} style={{ ...S.btn(saved ? '#047857' : '#059669'), width: '100%' }}>
                    {saved ? '✓ Saved' : '💾 Save stage notes'}
                  </button>

                  {activeStage !== current && (
                    <button onClick={() => { setAdvancing(activeStage); setOutcome(''); }}
                      style={{ ...S.btn('#2a2a2a'), width: '100%', marginTop: '8px' }}>
                      ↻ Return to {activeStage} (new pass)
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: '13px', color: '#888', margin: '10px 0' }}>
                    Not reached yet. Nothing recorded for this stage.
                  </div>
                  <button onClick={() => { setAdvancing(activeStage); setOutcome(''); }}
                    style={{ ...S.btn('#667eea'), width: '100%' }}>
                    → Move to {activeStage}
                  </button>
                </>
              )}
            </div>
          )}

          {advancing && (
            <div style={{ ...S.panel, border: '1px solid #667eea' }}>
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>
                Move to <span style={{ textTransform: 'capitalize' }}>{advancing}</span>?
              </div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                Closes <span style={{ textTransform: 'capitalize' }}>{current}</span> and starts a new record.
              </div>
              <div style={S.label}>How did {current} end? (optional)</div>
              <input style={S.input} value={outcome} placeholder="One line, or leave blank"
                onChange={e => setOutcome(e.target.value)} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn('#059669')} onClick={confirmAdvance}>Confirm move</button>
                <button style={S.btn('#2a2a2a')} onClick={() => setAdvancing(null)}>Cancel</button>
              </div>
            </div>
          )}

          {open.description && (<><div style={S.label}>Details / PRD</div>
            <div style={{ fontSize: '14px', lineHeight: 1.6 }}>{open.description}</div></>)}
          {open.problem_solves && (<><div style={S.label}>Problem it solves</div>
            <div style={{ fontSize: '14px', lineHeight: 1.6 }}>{open.problem_solves}</div></>)}
          {open.team_members && (<><div style={S.label}>Team</div>
            <div style={{ fontSize: '14px' }}>👥 {open.team_members}</div></>)}
          {open.risks && open.risks !== '[]' && (<><div style={S.label}>Risks</div>
            <div style={{ fontSize: '14px', color: '#f87171' }}>⚠️ {open.risks}</div></>)}
          {open.next_action && (<><div style={S.label}>Next action</div>
            <div style={{ fontSize: '14px', color: '#34d399' }}>⚡ {open.next_action}</div></>)}
          {open.website && (<><div style={S.label}>Link</div>
            <a href={open.website} target="_blank" rel="noreferrer" style={{ color: '#667eea', fontSize: '14px' }}>🔗 {open.website}</a></>)}
          {open.repo_url && (<><div style={S.label}>Repo</div>
            <a href={open.repo_url} target="_blank" rel="noreferrer" style={{ color: '#667eea', fontSize: '14px' }}>💻 {open.repo_url}</a></>)}

          <div style={{ display: 'flex', gap: '8px', marginTop: '24px', paddingBottom: '40px' }}>
            <button style={S.btn('#667eea')} onClick={() => setEditing({ ...open })}>✏️ Edit details</button>
            <button style={S.btn('#7f1d1d')} onClick={() => del(open)}>🗑 Delete</button>
          </div>
        </div>
      )}

      {/* EDIT SHEET */}
      {editing && (
        <div style={S.sheet}>
          <button onClick={() => setEditing(null)} style={S.back}>← Cancel</button>
          <h2>{editing.id ? 'Edit ' + editing.name : 'New item'}</h2>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
            Item details. Stage notes are edited from the stage itself.
          </div>

          <div style={S.label}>Name</div>
          <input style={S.input} value={editing.name || ''}
            onChange={e => setEditing({ ...editing, name: e.target.value })} />

          <div style={S.label}>Details / PRD</div>
          <textarea style={S.area} value={editing.description || ''}
            onChange={e => setEditing({ ...editing, description: e.target.value })} />

          <div style={S.label}>Problem it solves</div>
          <textarea style={{ ...S.area, minHeight: '60px' }} value={editing.problem_solves || ''}
            onChange={e => setEditing({ ...editing, problem_solves: e.target.value })} />

          {[['team_members', 'Team'], ['risks', 'Risks'], ['next_action', 'Next action'],
            ['for_whom', 'Built for'], ['website', 'URL'], ['repo_url', 'Repo']].map(f => (
            <div key={f[0]}>
              <div style={S.label}>{f[1]}</div>
              <input style={S.input} value={editing[f[0]] || ''}
                onChange={e => setEditing({ ...editing, [f[0]]: e.target.value })} />
            </div>
          ))}

          <div style={S.label}>Type</div>
          <select style={S.input} value={editing.type || 'project'}
            onChange={e => setEditing({ ...editing, type: e.target.value })}>
            <option value="venture">Venture</option>
            <option value="project">Project</option>
          </select>

          {!editing.id && (
            <>
              <div style={S.label}>Starting stage</div>
              <select style={S.input} value={editing.stage || 'idea'}
                onChange={e => setEditing({ ...editing, stage: e.target.value })}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </>
          )}

          <div style={S.label}>Parent venture</div>
          <select style={S.input} value={editing.parent_id || ''}
            onChange={e => setEditing({ ...editing, parent_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">— Standalone —</option>
            {ventures.filter(v => v.id !== editing.id).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>

          <button style={{ ...S.btn('#059669'), width: '100%', marginTop: '16px', marginBottom: '40px' }} onClick={save}>
            💾 Save
          </button>
        </div>
      )}
    </div>
  );
}
