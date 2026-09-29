#!/usr/bin/env python3
"""Batch 13 frontend: searchable currency/country/city, projects, an Everywhere view.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch13_frontend.py
"""
import os
FE = 'frontend/src'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

p = os.path.join(FE, 'components/PricesTab.jsx')
s = open(p).read()

# 1. a searchable picker instead of a fixed list
o = """const CCY = ['SLE', 'KES', 'GHS', 'NGN', 'ZAR', 'RWF', 'USD', 'AED', 'GBP', 'EUR', 'CAD', 'MXN'];"""
n = """const CCY = ['SLE', 'KES', 'GHS', 'NGN', 'ZAR', 'RWF', 'USD', 'AED', 'GBP', 'EUR', 'CAD', 'MXN'];

/* Type to find any currency. The ones he actually uses sit at the top. */
function CurrencyPick({ value, onChange, list, style }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const all = list && list.length ? list : CCY.map(c => ({ code: c, name: c, mine: true }));
  const mine = all.filter(c => c.mine);
  const hits = q.trim()
    ? all.filter(c => (c.code + ' ' + (c.name || '')).toLowerCase().includes(q.toLowerCase())).slice(0, 40)
    : mine;
  return (
    <div style={{ position: 'relative', ...(style || {}) }}>
      <button onClick={() => { setOpen(!open); setQ(''); }}
              style={{ width: '100%', padding: '11px', fontSize: '16px', background: '#141414',
                       color: '#eee', border: '1px solid #333', borderRadius: '8px',
                       textAlign: 'left', cursor: 'pointer', minHeight: '46px' }}>
        {value || 'Currency'} <span style={{ float: 'right', color: '#666' }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', zIndex: 60, top: '50px', left: 0, right: 0,
                      background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px',
                      maxHeight: '260px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                 placeholder="Type a currency or code"
                 style={{ width: '100%', padding: '10px', fontSize: '15px', background: '#141414',
                          color: '#eee', border: 'none', borderBottom: '1px solid #2a2a2a',
                          boxSizing: 'border-box' }} />
          {!q && <div style={{ fontSize: '10px', color: '#666', padding: '6px 10px 2px',
                               textTransform: 'uppercase', letterSpacing: '0.5px' }}>Yours</div>}
          {hits.map(c => (
            <div key={c.code} onClick={() => { onChange(c.code); setOpen(false); }}
                 style={{ padding: '10px', fontSize: '14px', cursor: 'pointer',
                          borderTop: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>{c.code}</strong> <span style={{ color: '#888' }}>{c.name !== c.code ? c.name : ''}</span></span>
            </div>
          ))}
          {!hits.length && <div style={{ padding: '12px', color: '#777', fontSize: '13px' }}>Nothing matches.</div>}
        </div>
      )}
    </div>
  );
}"""
note(o in s, 'currency picker'); s = s.replace(o, n, 1)

o = "  const [err, setErr] = useState('');"
n = (o + "\n  const [ccyList, setCcyList] = useState([]);\n  const [places, setPlaces] = useState({ countries: [], cities: [] });"
       "\n  const [projects, setProjects] = useState([]);\n  const [newProject, setNewProject] = useState(null);"
       "\n  const [everywhere, setEverywhere] = useState(null);")
note(o in s, 'new state'); s = s.replace(o, n, 1)

o = """      setEntries(e.entries || []); setItems(i.items || []); setErr('');"""
n = """      setEntries(e.entries || []); setItems(i.items || []); setErr('');
      const c = await fetch(API + '/api/prices/currencies', { headers: AUTH }).then(r => r.json());
      setCcyList(c.currencies || []);
      setPlaces({ countries: c.countries || [], cities: c.cities || [] });
      const pj = await fetch(API + '/api/prices/projects', { headers: AUTH }).then(r => r.json());
      setProjects(pj.projects || []);"""
note(o in s, 'load lists'); s = s.replace(o, n, 1)

# the form uses the picker and the place lists
o = """                <select style={S.input} value={form.currency || 'SLE'}
                        onChange={e => setForm({ ...form, currency: e.target.value })}>
                  {CCY.map(c => <option key={c} value={c}>{c}</option>)}
                </select>"""
n = """                <CurrencyPick value={form.currency} list={ccyList}
                              onChange={v => setForm({ ...form, currency: v })}
                              style={{ marginBottom: '8px' }} />"""
note(o in s, 'form picker'); s = s.replace(o, n, 1)

o = """                <input style={S.input} placeholder="City (Freetown, Nairobi)"
                       value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} />
                <input style={S.input} placeholder="Country"
                       value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} />"""
n = """                <input style={S.input} list="all-cities" placeholder="City (Freetown, Nairobi)"
                       value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} />
                <input style={S.input} list="all-countries" placeholder="Country"
                       value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} />
                <datalist id="all-cities">{places.cities.map(c => <option key={c} value={c} />)}</datalist>
                <datalist id="all-countries">{places.countries.map(c => <option key={c} value={c} />)}</datalist>"""
note(o in s, 'place suggestions'); s = s.replace(o, n, 1)

# what it was bought for
o = """              <input style={S.input} placeholder="Notes (optional)"
                     value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />"""
n = """              <select style={S.input} value={form.project_id === undefined ? 'auto' : String(form.project_id)}
                      onChange={e => setForm({ ...form, project_id: e.target.value === 'auto' ? 'auto'
                                               : e.target.value === '' ? null : parseInt(e.target.value, 10) })}>
                <option value="auto">
                  {projects.find(p => p.status === 'active')
                    ? 'For: ' + projects.find(p => p.status === 'active').name
                    : 'Not for anything in particular'}
                </option>
                {projects.map(p => <option key={p.id} value={p.id}>For: {p.name}</option>)}
                <option value="">Not for anything in particular</option>
              </select>
              <input style={S.input} placeholder="Note on this one (bulk buy, price jumped, rainy season)"
                     value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />"""
note(o in s, 'project on entry'); s = s.replace(o, n, 1)

# the tabs gain Everywhere and Projects
o = """        {[['recent', 'Recent'], ['compare', 'Compare'], ['check', 'Is it fair?']].map(([k, l]) => ("""
n = """        {[['recent', 'Recent'], ['everywhere', 'Everywhere'], ['compare', 'Compare'],
          ['check', 'Is it fair?'], ['projects', 'What for']].map(([k, l]) => ("""
note(o in s, 'new tabs'); s = s.replace(o, n, 1)

o = "      {/* ------------------------------- COMPARE ------------------------------ */}"
n = """      {/* ------------------------------ EVERYWHERE ---------------------------- */}
      {view === 'everywhere' && (() => {
        if (everywhere === null) {
          fetch(API + '/api/prices/overview', { headers: AUTH })
            .then(r => r.json()).then(j => setEverywhere(j.items || [])).catch(() => setEverywhere([]));
          return <div style={S.empty}>Working it out...</div>;
        }
        if (!everywhere.length) {
          return (
            <div style={S.empty}>
              Nothing to compare yet.<br />
              Log the same thing in two different places and it shows up here.
            </div>
          );
        }
        return (
          <>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px', lineHeight: 1.6 }}>
              Everything you have priced in more than one place, biggest difference first.
            </div>
            {everywhere.map(it => (
              <div key={it.item} style={S.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>{it.item}</div>
                  <div style={{ fontSize: '12px', color: it.spread_pct > 30 ? '#fca5a5' : '#888' }}>
                    {it.spread_pct}% spread
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#777', margin: '2px 0 8px' }}>
                  per {it.unit || 'unit'} · cheapest in {it.cheapest}
                </div>
                {it.places.map((pl, i) => {
                  const top = it.places[it.places.length - 1].median;
                  const w = top ? Math.max(8, Math.round(pl.median / top * 100)) : 10;
                  return (
                    <div key={pl.where} style={{ marginBottom: '7px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#ccc' }}>
                          {pl.where}
                          <span style={{ color: '#666', fontSize: '10px' }}> · {pl.count}</span>
                        </span>
                        <span style={{ color: i === 0 ? '#10b981' : '#ddd', fontWeight: 600 }}>
                          {money(pl.median)}
                        </span>
                      </div>
                      <div style={{ height: '6px', background: '#232323', borderRadius: '3px', marginTop: '3px' }}>
                        <div style={{ width: w + '%', height: '100%', borderRadius: '3px',
                                      background: i === 0 ? '#10b981' : i === it.places.length - 1 ? '#ef4444' : '#667eea' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        );
      })()}

      {/* ------------------------------- PROJECTS ----------------------------- */}
      {view === 'projects' && (
        <>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px', lineHeight: 1.6 }}>
            Give what you are buying for a name, and everything you log while it is open joins it.
            No need to write it on each thing.
          </div>
          {!newProject && (
            <button style={S.btn('#667eea')} onClick={() => setNewProject({ name: '', about: '' })}>
              + Something I am buying for
            </button>
          )}
          {newProject && (
            <div style={{ ...S.card, borderColor: '#667eea', marginTop: '10px' }}>
              <input style={S.input} placeholder="Name (Freetown house, Nairobi office)"
                     value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} />
              <input style={S.input} placeholder="What it is (optional)"
                     value={newProject.about} onChange={e => setNewProject({ ...newProject, about: e.target.value })} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn('#10b981')} onClick={async () => {
                  const r = await fetch(API + '/api/prices/projects', { method: 'POST', headers: H,
                    body: JSON.stringify(newProject) });
                  const j = await r.json();
                  if (j.error) setErr(j.error); else { setNewProject(null); load(); }
                }}>Save</button>
                <button style={S.btn('#2a2a2a')} onClick={() => setNewProject(null)}>Cancel</button>
              </div>
            </div>
          )}
          {projects.map(pr => (
            <div key={pr.id} style={{ ...S.card,
                 borderLeft: '4px solid ' + (pr.status === 'active' ? '#10b981' : '#333') }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>{pr.name}</div>
                  {pr.about && <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>{pr.about}</div>}
                  <div style={{ fontSize: '11px', color: '#777', marginTop: '4px' }}>
                    {pr.entries || 0} things{pr.spent_usd ? ' · about ' + money(pr.spent_usd) : ''}
                    {pr.status === 'active' ? ' · open, new prices join this' : ' · closed'}
                  </div>
                </div>
                <button style={S.icon} onClick={async () => {
                  await fetch(API + '/api/prices/projects', { method: 'POST', headers: H,
                    body: JSON.stringify({ ...pr, status: pr.status === 'active' ? 'done' : 'active' }) });
                  load();
                }}>{pr.status === 'active' ? 'close' : 'reopen'}</button>
              </div>
            </div>
          ))}
          {!projects.length && !newProject && (
            <div style={S.empty}>Nothing yet. A build, a trip, an office fit-out.</div>
          )}
        </>
      )}

      {/* ------------------------------- COMPARE ------------------------------ */}"""
note(o in s, 'everywhere + projects views'); s = s.replace(o, n, 1)

# the check screen uses the picker too
o = """              <select style={S.input} value={check.currency}
                      onChange={e => setCheck({ ...check, currency: e.target.value })}>
                {CCY.map(c => <option key={c} value={c}>{c}</option>)}
              </select>"""
n = """              <CurrencyPick value={check.currency} list={ccyList}
                            onChange={v => setCheck({ ...check, currency: v })}
                            style={{ marginBottom: '8px' }} />"""
note(o in s, 'check picker'); s = s.replace(o, n, 1)
open(p, 'w').write(s)

print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
