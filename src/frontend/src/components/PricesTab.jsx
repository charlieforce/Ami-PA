import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API = import.meta.env.VITE_API_URL || API + '';
const AUTH = { 'X-Ami-Password': AMI_PASSWORD };
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };
const today = () => new Date().toISOString().split('T')[0];

const CCY = ['SLE', 'KES', 'GHS', 'NGN', 'ZAR', 'RWF', 'USD', 'AED', 'GBP', 'EUR', 'CAD', 'MXN'];

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
}
const MARKETS = ['street market', 'local shop', 'supermarket', 'mall', 'online', 'hardware store',
                 'direct from supplier', 'hotel', 'restaurant', 'other'];
const CAT_ICON = { building: '🧱', labour: '👷', electronics: '📺', appliance: '🔌', furniture: '🛋',
                   transport: '🚕', stay: '🏨', food: '🍚', services: '✂️' };
const money = (n) => n == null ? '' : '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
const local = (n, c) => (c || '') + ' ' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });

const S = {
  wrap: { padding: '12px', color: '#eee', maxWidth: '760px', margin: '0 auto' },
  tabs: { display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto' },
  tab: (on) => ({ padding: '10px 14px', minHeight: '44px', borderRadius: '8px', border: 'none',
    background: on ? '#667eea' : '#2a2a2a', color: '#fff', fontSize: '13px',
    fontWeight: on ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }),
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
    padding: '14px', marginBottom: '10px' },
  input: { width: '100%', padding: '11px', fontSize: '16px', background: '#141414', color: '#eee',
    border: '1px solid #333', borderRadius: '8px', marginBottom: '8px', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
  btn: (bg) => ({ padding: '12px', minHeight: '46px', background: bg, color: '#fff', border: 'none',
    borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', width: '100%' }),
  label: { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
    fontWeight: 700, margin: '18px 0 8px' },
  icon: { background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px', padding: '4px 8px' },
  empty: { color: '#666', fontSize: '13px', padding: '24px 0', textAlign: 'center', lineHeight: 1.6 },
  big: { fontSize: '19px', fontWeight: 700, color: '#f2f2f2' },
  usd: { fontSize: '13px', color: '#10b981', fontWeight: 600 },
  fx: { fontSize: '10px', color: '#666', marginTop: '2px' },
  pill: (kind) => ({ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
    background: kind === 'high' ? '#14532d' : kind === 'medium' ? '#78350f' : '#3f1d1d',
    color: kind === 'high' ? '#86efac' : kind === 'medium' ? '#fcd34d' : '#fca5a5' })
};

export default function PricesTab() {
  const [view, setView] = useState('recent');
  const [entries, setEntries] = useState([]);
  const [items, setItems] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({});
  const [rate, setRate] = useState(null);
  const [cmpItem, setCmpItem] = useState('');
  const [cmpBy, setCmpBy] = useState('country');
  const [cmp, setCmp] = useState(null);
  const [check, setCheck] = useState({ item: '', price: '', currency: 'SLE', city: '' });
  const [checkOut, setCheckOut] = useState(null);
  const [err, setErr] = useState('');
  const [priceShow, setPriceShow] = useState(15);
  const [bulk, setBulk] = useState(null);
  const [bulkRows, setBulkRows] = useState([{ item_name: '', local_price: '', unit: '' }]);
  const [whereFilter, setWhereFilter] = useState('');
  const [ccyList, setCcyList] = useState([]);
  const [places, setPlaces] = useState({ countries: [], cities: [] });
  const [projects, setProjects] = useState([]);
  const [newProject, setNewProject] = useState(null);
  const [everywhere, setEverywhere] = useState(null);

  const load = async () => {
    try {
      const [e, i] = await Promise.all([
        fetch(API + '/api/prices', { headers: AUTH }).then(r => r.json()),
        fetch(API + '/api/prices/items', { headers: AUTH }).then(r => r.json())
      ]);
      setEntries(e.entries || []); setItems(i.items || []); setErr('');
      const c = await fetch(API + '/api/prices/currencies', { headers: AUTH }).then(r => r.json());
      setCcyList(c.currencies || []);
      setPlaces({ countries: c.countries || [], cities: c.cities || [] });
      const pj = await fetch(API + '/api/prices/projects', { headers: AUTH }).then(r => r.json());
      setProjects(pj.projects || []);
    } catch (x) { setErr(String(x)); }
  };
  useEffect(() => { load(); }, []);

  // the rough USD figure, live as he types
  useEffect(() => {
    if (!adding || !form.currency) { setRate(null); return; }
    fetch(API + '/api/prices/fx?currency=' + form.currency, { headers: AUTH })
      .then(r => r.json()).then(j => setRate(j.rate_to_usd ? j : null)).catch(() => setRate(null));
  }, [adding, form.currency]);

  const save = async () => {
    if (!form.item_name || !form.local_price) { setErr('Item and price, at least'); return; }
    const r = await fetch(API + '/api/prices', { method: 'POST', headers: H, body: JSON.stringify(form) });
    const j = await r.json();
    if (j.error) { setErr(j.error); return; }
    setAdding(false); setForm({}); setErr(''); load();
  };

  const runCompare = async () => {
    if (!cmpItem) return;
    const r = await fetch(API + '/api/prices/compare?item=' + encodeURIComponent(cmpItem) + '&by=' + cmpBy,
                          { headers: AUTH });
    const j = await r.json();
    setCmp(j.rows ? j : null);
  };

  const runCheck = async () => {
    if (!check.item || !check.price) return;
    const q = new URLSearchParams({ item: check.item, price: check.price,
                                    currency: check.currency, city: check.city || '' });
    const r = await fetch(API + '/api/prices/fair?' + q, { headers: AUTH });
    setCheckOut(await r.json());
  };

  const preview = rate && form.local_price
    ? Math.round(Number(form.local_price) * rate.rate_to_usd * 100) / 100 : null;

  const logged = [...new Set(entries.map(e => e.item_name))];

  return (
    <div style={S.wrap}>
      <h1 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700 }}>💰 Prices</h1>
      <div style={{ fontSize: '12px', color: '#777', marginBottom: '12px' }}>
        What you paid, where, and roughly what it was in dollars.
      </div>
      {err && <div style={{ background: '#7f1d1d', padding: '10px', borderRadius: '6px',
                            marginBottom: '10px', fontSize: '13px' }}>{err}</div>}

      <div style={S.tabs}>
        {[['recent', 'Recent'], ['everywhere', 'Everywhere'], ['compare', 'Compare'],
          ['check', 'Is it fair?'], ['projects', 'What for']].map(([k, l]) => (
          <button key={k} style={S.tab(view === k)} onClick={() => { setView(k); setAdding(false); }}>{l}</button>
        ))}
      </div>

      {/* ------------------------------- RECENT ------------------------------- */}
      {view === 'recent' && (
        <>
          {!adding && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={S.btn('#667eea')} onClick={() => {
                setAdding(true); setForm({ currency: 'SLE', observed_on: today(), quantity: 1, price_type: 'paid' });
              }}>+ One price</button>
              <button style={S.btn('#2a2a2a')} onClick={() => {
                setBulk({ currency: 'SLE', city: '', country: '', observed_on: today(),
                          market_type: '', price_type: 'paid' });
                setBulkRows([{ item_name: '', local_price: '', unit: '' }]);
              }}>+ Several at once</button>
            </div>
          )}

          {bulk && (
            <div style={{ ...S.card, borderColor: '#667eea', marginTop: '10px' }}>
              <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '10px' }}>
                Set where you are once, then run through the items.
              </div>
              <datalist id="bulk-cities">{(places.cities || []).map(c => <option key={c} value={c} />)}</datalist>
              <datalist id="bulk-countries">{(places.countries || []).map(c => <option key={c} value={c} />)}</datalist>
              <datalist id="bulk-items">{(items || []).map(i => <option key={i.id} value={i.name} />)}</datalist>
              <div style={S.row2}>
                <input style={S.input} list="bulk-cities" placeholder="City"
                       value={bulk.city} onChange={e => setBulk({ ...bulk, city: e.target.value })} />
                <input style={S.input} list="bulk-countries" placeholder="Country"
                       value={bulk.country} onChange={e => setBulk({ ...bulk, country: e.target.value })} />
              </div>
              <CurrencyPick value={bulk.currency} list={ccyList}
                            onChange={v => setBulk({ ...bulk, currency: v })} style={{ marginBottom: '8px' }} />
              <div style={S.row2}>
                <select style={S.input} value={bulk.market_type}
                        onChange={e => setBulk({ ...bulk, market_type: e.target.value })}>
                  <option value="">Where from? (optional)</option>
                  {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <input style={S.input} type="date" value={bulk.observed_on}
                       onChange={e => setBulk({ ...bulk, observed_on: e.target.value })} />
              </div>

              <div style={S.label}>Items</div>
              {bulkRows.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.9fr 30px',
                                      gap: '6px', marginBottom: '6px' }}>
                  <input style={{ ...S.input, marginBottom: 0 }} list="bulk-items" placeholder="What"
                         value={r.item_name} onChange={e => {
                           const v = [...bulkRows]; v[i] = { ...r, item_name: e.target.value };
                           const m = items.find(x => x.name.toLowerCase() === e.target.value.toLowerCase());
                           if (m && !r.unit) v[i].unit = m.standard_unit;
                           setBulkRows(v);
                         }} />
                  <input style={{ ...S.input, marginBottom: 0 }} type="number" inputMode="decimal"
                         placeholder="Price" value={r.local_price}
                         onChange={e => { const v = [...bulkRows]; v[i] = { ...r, local_price: e.target.value };
                                          if (i === bulkRows.length - 1 && e.target.value)
                                            v.push({ item_name: '', local_price: '', unit: '' });
                                          setBulkRows(v); }} />
                  <input style={{ ...S.input, marginBottom: 0 }} placeholder="Unit"
                         value={r.unit} onChange={e => { const v = [...bulkRows]; v[i] = { ...r, unit: e.target.value }; setBulkRows(v); }} />
                  <button style={S.icon} onClick={() => setBulkRows(bulkRows.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
              <button style={{ padding: '9px 13px', minHeight: '38px', marginBottom: '10px', background: '#2a2a2a',
                               color: '#aaa', border: 'none', borderRadius: '8px', fontSize: '12px',
                               cursor: 'pointer' }}
                      onClick={() => setBulkRows([...bulkRows, { item_name: '', local_price: '', unit: '' }])}>
                + Another line
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn('#10b981')} onClick={async () => {
                  const rows = bulkRows.filter(r => r.item_name.trim() && r.local_price);
                  if (!rows.length) { setErr('Nothing to save'); return; }
                  const r = await fetch(API + '/api/prices/bulk', { method: 'POST', headers: H,
                    body: JSON.stringify({ ...bulk, items: rows }) });
                  const j = await r.json();
                  if (j.error) { setErr(j.error); return; }
                  setBulk(null); setBulkRows([{ item_name: '', local_price: '', unit: '' }]);
                  setErr(''); load();
                }}>Save {bulkRows.filter(r => r.item_name.trim() && r.local_price).length} prices</button>
                <button style={S.btn('#2a2a2a')} onClick={() => setBulk(null)}>Cancel</button>
              </div>
            </div>
          )}

          {adding && (
            <div style={{ ...S.card, borderColor: '#667eea', marginTop: '10px' }}>
              <input style={S.input} list="price-items" placeholder="What is it? (cement, hotel night, taxi ride)"
                     value={form.item_name || ''}
                     onChange={e => {
                       const v = e.target.value;
                       const m = items.find(i => i.name.toLowerCase() === v.toLowerCase());
                       setForm({ ...form, item_name: v, unit: m ? m.standard_unit : form.unit,
                                 category: m ? m.category : form.category });
                     }} />
              <datalist id="price-items">
                {items.map(i => <option key={i.id} value={i.name}>{i.category} · {i.standard_unit}</option>)}
              </datalist>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
                <input style={S.input} type="number" step="0.01" inputMode="decimal" placeholder="Price"
                       value={form.local_price || ''} onChange={e => setForm({ ...form, local_price: e.target.value })} />
                <CurrencyPick value={form.currency} list={ccyList}
                              onChange={v => setForm({ ...form, currency: v })}
                              style={{ marginBottom: '8px' }} />
              </div>

              {preview != null && (
                <div style={{ background: '#141c18', border: '1px solid #1f3a2c', borderRadius: '8px',
                              padding: '10px', marginBottom: '8px' }}>
                  <div style={S.big}>{local(form.local_price, form.currency)}</div>
                  <div style={S.usd}>≈ {money(preview)}</div>
                  <div style={S.fx}>
                    1 {form.currency} = ${rate.rate_to_usd.toFixed(5)} · {rate.source} · {rate.date}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '8px' }}>
                <input style={S.input} type="number" step="0.01" placeholder="How many"
                       value={form.quantity || 1} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                <input style={S.input} placeholder="Unit (50kg bag, night, km)"
                       value={form.unit || ''} onChange={e => setForm({ ...form, unit: e.target.value })} />
              </div>

              <div style={S.row2}>
                <input style={S.input} list="all-cities" placeholder="City (Freetown, Nairobi)"
                       value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} />
                <input style={S.input} list="all-countries" placeholder="Country"
                       value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })} />
                <datalist id="all-cities">{places.cities.map(c => <option key={c} value={c} />)}</datalist>
                <datalist id="all-countries">{places.countries.map(c => <option key={c} value={c} />)}</datalist>
              </div>

              <div style={S.row2}>
                <select style={S.input} value={form.market_type || ''}
                        onChange={e => setForm({ ...form, market_type: e.target.value })}>
                  <option value="">Where from? (optional)</option>
                  {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select style={S.input} value={form.price_type || 'paid'}
                        onChange={e => setForm({ ...form, price_type: e.target.value })}>
                  <option value="paid">What I paid</option>
                  <option value="asking">What they asked</option>
                  <option value="seen">Just saw it</option>
                </select>
              </div>

              <div style={S.row2}>
                <input style={S.input} type="date" value={form.observed_on || today()}
                       onChange={e => setForm({ ...form, observed_on: e.target.value })} />
                <input style={S.input} placeholder="Brand or spec (optional)"
                       value={form.spec || ''} onChange={e => setForm({ ...form, spec: e.target.value })} />
              </div>
              <select style={S.input} value={form.project_id === undefined ? 'auto' : String(form.project_id)}
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
                     value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />

              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn('#10b981')} onClick={save}>Save</button>
                <button style={S.btn('#2a2a2a')} onClick={() => { setAdding(false); setForm({}); setErr(''); }}>Cancel</button>
              </div>
            </div>
          )}

          {!adding && entries.length === 0 && (
            <div style={S.empty}>
              Nothing logged yet.<br />
              Add a price here, or just tell Ami: "cement is 2000 leones in Freetown".
            </div>
          )}

          {!adding && !bulk && entries.length > 4 && (
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '4px 0 10px' }}>
              <button style={{ padding: '7px 13px', minHeight: '34px', borderRadius: '16px', flexShrink: 0,
                               border: '1px solid ' + (!whereFilter ? '#667eea' : '#2c2c3a'),
                               background: !whereFilter ? '#262040' : '#1d1d26',
                               color: !whereFilter ? '#a78bfa' : '#8b8b9e', fontSize: '12px',
                               cursor: 'pointer' }}
                      onClick={() => setWhereFilter('')}>Everywhere</button>
              {[...new Set(entries.map(e => e.country).filter(Boolean))].map(c => (
                <button key={c} style={{ padding: '7px 13px', minHeight: '34px', borderRadius: '16px', flexShrink: 0,
                                       border: '1px solid ' + (whereFilter === c ? '#667eea' : '#2c2c3a'),
                                       background: whereFilter === c ? '#262040' : '#1d1d26',
                                       color: whereFilter === c ? '#a78bfa' : '#8b8b9e',
                                       fontSize: '12px', cursor: 'pointer' }}
                        onClick={() => setWhereFilter(c)}>{c}</button>
              ))}
            </div>
          )}
          {!adding && !bulk && entries.filter(e => !whereFilter || e.country === whereFilter).slice(0, priceShow).map(e => (
            <div key={e.id} style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>
                    {(CAT_ICON[e.category] || '•') + ' ' + e.item_name}
                    {e.price_type === 'asking' && (
                      <span style={{ fontSize: '10px', color: '#fcd34d', marginLeft: '6px' }}>ASKING</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    {[e.city, e.country, e.market_type].filter(Boolean).join(' · ')}
                    {e.spec ? ' · ' + e.spec : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={S.big}>{local(e.local_price, e.currency)}</div>
                  {e.usd_price != null && <div style={S.usd}>≈ {money(e.usd_price)}</div>}
                  <div style={S.fx}>
                    {e.quantity > 1 ? e.quantity + ' × ' : ''}{e.unit || ''}
                    {e.per_unit_usd && e.quantity > 1 ? ' · ' + money(e.per_unit_usd) + ' each' : ''}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            marginTop: '8px', borderTop: '1px solid #232323', paddingTop: '6px' }}>
                <span style={S.fx}>
                  {String(e.observed_on || '').slice(0, 10)}
                  {e.fx_rate ? ' · 1 ' + e.currency + ' = $' + Number(e.fx_rate).toFixed(5) : ''}
                  {e.fx_source ? ' · ' + e.fx_source : ''}
                </span>
                <button style={S.icon} onClick={async () => {
                  if (!window.confirm('Delete this?')) return;
                  await fetch(API + '/api/prices/' + e.id, { method: 'DELETE', headers: AUTH });
                  load();
                }}>✕</button>
              </div>
              {e.notes && e.notes !== 'from chat' && (
                <div style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>{e.notes}</div>
              )}
            </div>
          ))}
          {!adding && !bulk && entries.filter(e => !whereFilter || e.country === whereFilter).length > priceShow && (
            <button onClick={() => setPriceShow(priceShow + 15)}
                    style={{ width: '100%', padding: '12px', minHeight: '44px', marginTop: '6px',
                             background: '#2a2a2a', color: '#aaa', border: 'none',
                             borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
              Show more ({entries.length - priceShow} more)
            </button>
          )}
          {priceShow > 15 && (
            <button onClick={() => setPriceShow(15)}
                    style={{ width: '100%', padding: '9px', marginTop: '6px',
                             background: 'transparent', color: '#6b6b7c',
                             border: '1px solid #2c2c3a', borderRadius: '8px',
                             fontSize: '12px', cursor: 'pointer' }}>
              Show less
            </button>
          )}
        </>
      )}

      {/* ------------------------------ EVERYWHERE ---------------------------- */}
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

      {/* ------------------------------- COMPARE ------------------------------ */}
      {view === 'compare' && (
        <>
          <div style={S.card}>
            <input style={S.input} list="logged-items" placeholder="Which item?"
                   value={cmpItem} onChange={e => setCmpItem(e.target.value)} />
            <datalist id="logged-items">
              {logged.map(n => <option key={n} value={n} />)}
            </datalist>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {[['country', 'By country'], ['city', 'By city']].map(([k, l]) => (
                <button key={k} onClick={() => setCmpBy(k)}
                        style={{ flex: 1, padding: '9px', minHeight: '40px', borderRadius: '8px',
                                 border: '1px solid ' + (cmpBy === k ? '#667eea' : '#2a2a2a'),
                                 background: cmpBy === k ? '#667eea22' : '#141414',
                                 color: cmpBy === k ? '#fff' : '#999', fontSize: '13px',
                                 fontWeight: 600, cursor: 'pointer' }}>{l}</button>
              ))}
            </div>
            <button style={S.btn('#667eea')} onClick={runCompare}>Compare</button>
          </div>

          {cmp && cmp.rows.length === 0 && (
            <div style={S.empty}>Nothing logged for that yet.</div>
          )}

          {cmp && cmp.rows.length > 0 && (
            <>
              <div style={S.label}>{cmp.item} · per {cmp.rows[0].unit || 'unit'} · cheapest first</div>
              {cmp.rows.map((r, i) => {
                const best = cmp.rows[0].median;
                const diff = best ? Math.round((r.median - best) / best * 100) : 0;
                return (
                  <div key={r.where} style={{ ...S.card,
                       borderLeft: '4px solid ' + (i === 0 ? '#10b981' : diff > 25 ? '#ef4444' : '#78350f') }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 700 }}>{r.where}</div>
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>
                          {r.count} {r.count === 1 ? 'entry' : 'entries'} · last {r.latest_on}
                          {r.count > 1 ? ' · ' + money(r.min) + '–' + money(r.max) : ''}
                        </div>
                        <div style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>
                          last paid {local(r.latest_local, r.latest_currency)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '19px', fontWeight: 700,
                                      color: i === 0 ? '#10b981' : '#f2f2f2' }}>{money(r.median)}</div>
                        <div style={{ fontSize: '11px', color: i === 0 ? '#10b981' : '#888' }}>
                          {i === 0 ? 'cheapest' : '+' + diff + '%'}
                        </div>
                        <span style={{ ...S.pill(r.confidence), display: 'inline-block', marginTop: '4px' }}>
                          {r.confidence.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: '11px', color: '#666', lineHeight: 1.6, marginTop: '10px' }}>
                These are your own prices only, converted at the rate on the day you logged each one.
                Anything marked LOW rests on very few entries — treat it as a hint, not a fact.
              </div>
            </>
          )}
        </>
      )}

      {/* ------------------------------- FAIR CHECK --------------------------- */}
      {view === 'check' && (
        <>
          <div style={S.card}>
            <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '10px' }}>
              Someone quoted you something. Is it in line with what you have paid before?
            </div>
            <input style={S.input} list="logged-items2" placeholder="What is it?"
                   value={check.item} onChange={e => setCheck({ ...check, item: e.target.value })} />
            <datalist id="logged-items2">{logged.map(n => <option key={n} value={n} />)}</datalist>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '8px' }}>
              <input style={S.input} type="number" inputMode="decimal" placeholder="They want..."
                     value={check.price} onChange={e => setCheck({ ...check, price: e.target.value })} />
              <CurrencyPick value={check.currency} list={ccyList}
                            onChange={v => setCheck({ ...check, currency: v })}
                            style={{ marginBottom: '8px' }} />
            </div>
            <input style={S.input} placeholder="City (optional)"
                   value={check.city} onChange={e => setCheck({ ...check, city: e.target.value })} />
            <button style={S.btn('#667eea')} onClick={runCheck}>Check it</button>
          </div>

          {checkOut && (
            <div style={{ ...S.card, borderColor:
                 checkOut.verdict && checkOut.verdict.startsWith('above') ? '#7f1d1d'
                 : checkOut.verdict === 'below your usual' ? '#14532d' : '#2a2a2a' }}>
              <div style={S.big}>{local(check.price, check.currency)}</div>
              {checkOut.usd != null && <div style={{ ...S.usd, fontSize: '15px' }}>≈ {money(checkOut.usd)}</div>}
              <div style={{ fontSize: '15px', fontWeight: 700, marginTop: '10px',
                            color: checkOut.verdict && checkOut.verdict.startsWith('above') ? '#fca5a5'
                                   : checkOut.verdict === 'below your usual' ? '#86efac' : '#ddd' }}>
                {checkOut.verdict === 'no history' ? "You have nothing logged for this yet."
                 : checkOut.verdict === 'not enough history' ? "Too few entries to say."
                 : "That is " + checkOut.verdict + "."}
              </div>
              {checkOut.stats && (
                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px', lineHeight: 1.7 }}>
                  Your median: <strong style={{ color: '#ddd' }}>{money(checkOut.stats.median)}</strong><br />
                  Usual range: {money(checkOut.stats.q1)} – {money(checkOut.stats.q3)}<br />
                  Based on {checkOut.stats.count} {checkOut.stats.count === 1 ? 'entry' : 'entries'}
                  {checkOut.scope && checkOut.scope !== 'everywhere' ? ' in ' + checkOut.scope : ' anywhere'} ·
                  last {checkOut.stats.latest_on}
                </div>
              )}
            </div>
          )}
        </>
      )}
      <div style={{ height: '40px' }} />
    </div>
  );
}
