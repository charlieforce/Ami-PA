import React, { useState, useEffect } from 'react';

const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
// one honest address. the other tabs have "|| API + ''" in here, which
// throws a ReferenceError the moment VITE_API_URL is not set - that is
// the localhost sweep's job, not this file's.
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const H = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };

// Grouped the way you'd actually think about the compound, not
// alphabetically. "other" stays, with a box to say what it is - no fixed
// list survives a real house.
const KIND_GROUPS = [
  ['Cooling and cold', ['ac', 'fridge', 'freezer', 'fan', 'water cooler']],
  ['Power', ['generator', 'inverter', 'battery bank', 'solar',
             'stabilizer', 'wiring']],
  ['Water', ['pump', 'borehole', 'tank', 'water heater', 'water filter',
             'plumbing', 'septic', 'drainage']],
  ['Building', ['roof', 'gutters', 'exterior paint', 'windows', 'doors']],
  ['Security', ['gate motor', 'cctv', 'alarm', 'extinguisher']],
  ['Appliances', ['washing machine', 'microwave', 'cooker', 'tv',
                  'gas cylinder']],
  ['Pest', ['pest', 'termite']],
  ['Vehicles', ['vehicle', 'keke', 'bike']],
  ['', ['other']],
];

const S = {
  wrap: { padding: '12px', color: '#eee', maxWidth: '640px', margin: '0 auto' },
  card: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
    padding: '14px', marginBottom: '10px',
  },
  input: {
    width: '100%', padding: '11px', fontSize: '16px', background: '#141414',
    color: '#eee', border: '1px solid #333', borderRadius: '8px',
    boxSizing: 'border-box', marginBottom: '8px',
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
  chip: (on) => ({
    padding: '8px 14px', minHeight: '38px', borderRadius: '8px',
    cursor: 'pointer', border: on ? '1px solid #667eea' : '1px solid #333',
    background: on ? '#667eea' : '#141414', color: on ? '#fff' : '#888',
    fontSize: '13px', fontWeight: on ? 700 : 500, whiteSpace: 'nowrap',
  }),
  row: { display: 'flex', gap: '8px', marginBottom: '8px' },
  label: { fontSize: '12px', color: '#888', marginBottom: '4px' },
  tag: {
    fontSize: '11px', color: '#888', background: '#141414',
    border: '1px solid #2a2a2a', borderRadius: '5px', padding: '2px 7px',
  },
};

const money = (n) => (n == null || n === '' ? null
  : Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }));

const today = () => new Date().toISOString().slice(0, 10);

// how a due date should feel, not just what it says
function dueLook(a) {
  if ((a.status || 'active') === 'suspended') {
    return { color: '#666', text: 'suspended' };
  }
  const d = a.days_left;
  if (d == null) {
    return { color: '#666', text: a.installed_on ? 'no interval' : 'tell it when it went in' };
  }
  if (d < 0) return { color: '#e5484d', text: `${-d} day${-d === 1 ? '' : 's'} overdue` };
  if (d === 0) return { color: '#e5484d', text: 'due today' };
  if (d <= 3) return { color: '#e5484d', text: `due in ${d} day${d === 1 ? '' : 's'}` };
  if (d <= 14) return { color: '#f5a524', text: `due in ${d} days` };
  return { color: '#777', text: `due in ${d} days` };
}

export default function UpkeepTab() {
  const [assets, setAssets] = useState([]);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);       // asset id expanded
  const [detail, setDetail] = useState({});     // id -> {asset, history}
  const [mode, setMode] = useState(null);       // 'service' | 'edit' | 'add'
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const r = await fetch(`${API}/api/upkeep?all=1`, { headers: H });
      const j = await r.json();
      setAssets(j.assets || []);
    } catch (e) { setMsg('Could not reach the server.'); }
  };
  useEffect(() => { load(); }, []);

  const loadDetail = async (id) => {
    try {
      const r = await fetch(`${API}/api/upkeep/${id}`, { headers: H });
      const j = await r.json();
      setDetail((d) => ({ ...d, [id]: j }));
    } catch (e) { /* non-fatal */ }
  };

  const toggle = (id) => {
    if (open === id) { setOpen(null); setMode(null); return; }
    setOpen(id); setMode(null); setForm({});
    if (!detail[id]) loadDetail(id);
  };

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

  const logService = async (id) => {
    if (!form.done_on) { setMsg('Which day was it done?'); return; }
    const ok = await post(`/api/upkeep/${id}/service`, {
      done_on: form.done_on, what: form.what, who: form.who,
      who_phone: form.who_phone, outcome: form.outcome,
      cost: form.cost ? Number(form.cost) : null, parts: form.parts,
      notes: form.notes,
    });
    if (ok) { setMode(null); setForm({}); await load(); await loadDetail(id); }
  };

  const saveEdit = async (id) => {
    if (form.kind === 'other' && !(form.kind_other || '').trim()) {
      setMsg('What sort of thing is it?'); return;
    }
    const body = {};
    ['name', 'kind', 'place', 'brand', 'model', 'serial', 'installed_on',
      'warranty_until', 'every_months', 'notes'].forEach((k) => {
        if (form[k] !== undefined) body[k] = form[k];
      });
    if (form.kind !== undefined) body.kind = realKind(form);
    if (body.every_months) body.every_months = Number(body.every_months);
    const ok = await post(`/api/upkeep/${id}`, body);
    if (ok) { setMode(null); setForm({}); await load(); await loadDetail(id); }
  };

  // "other" on its own tells you nothing a year later, so whatever you
  // typed in the box becomes the kind
  const realKind = (f) => (f.kind === 'other'
    ? ((f.kind_other || '').trim().toLowerCase() || 'other')
    : f.kind);

  const addAsset = async () => {
    if (!form.name) { setMsg('What do you call it?'); return; }
    if (form.kind === 'other' && !(form.kind_other || '').trim()) {
      setMsg('What sort of thing is it?'); return;
    }
    const body = { ...form, kind: realKind(form) };
    delete body.kind_other;
    body.every_months = form.every_months ? Number(form.every_months) : null;
    const ok = await post('/api/upkeep', body);
    if (ok) { setMode(null); setForm({}); load(); }
  };

  const setStatus = async (id, status) => {
    if (await post(`/api/upkeep/${id}`, { status })) load();
  };

  const remove = async (id, name) => {
    // gone, not deleted - the history is the valuable part
    if (!window.confirm(`Mark "${name}" as gone? Its service history stays.`)) return;
    if (await post(`/api/upkeep/${id}/delete`, {})) { setOpen(null); load(); }
  };

  const delService = async (sid, id) => {
    if (!window.confirm('Delete this service record?')) return;
    if (await post(`/api/upkeep/service/${sid}/delete`, {})) {
      await load(); await loadDetail(id);
    }
  };

  const live = assets.filter((a) => (a.status || 'active') !== 'gone');
  const due = live.filter((a) => a.days_left != null && a.days_left <= 3
    && (a.status || 'active') !== 'suspended');

  const shown = assets.filter((a) => {
    const st = a.status || 'active';
    if (filter === 'all') return st !== 'gone';
    if (filter === 'vehicles') return st !== 'gone' && a.kind === 'vehicle';
    if (filter === 'house') return st !== 'gone' && a.kind !== 'vehicle';
    if (filter === 'suspended') return st === 'suspended';
    if (filter === 'gone') return st === 'gone';
    return true;
  });

  const field = (k, ph, type) => (
    <input style={S.input} type={type || 'text'} placeholder={ph}
      value={form[k] || ''}
      onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
  );

  // one picker, used by the add form and the edit form
  const kindPicker = () => {
    const known = KIND_GROUPS.some(([, ks]) => ks.includes(form.kind))
      && form.kind !== 'other';
    const custom = !!form.kind && !known;   // already saved as a custom word
    return (
      <>
        <div style={S.label}>What sort of thing</div>
        <select style={S.input} value={custom ? 'other' : (form.kind || '')}
          onChange={(e) => setForm({
            ...form, kind: e.target.value,
            kind_other: e.target.value === 'other' ? (form.kind_other || '') : '',
          })}>
          <option value="">pick one</option>
          {KIND_GROUPS.map(([label, ks]) => (label ? (
            <optgroup key={label} label={label}>
              {ks.map((k) => <option key={k} value={k}>{k}</option>)}
            </optgroup>
          ) : (
            ks.map((k) => <option key={k} value={k}>{k}</option>)
          )))}
        </select>
        {(form.kind === 'other' || custom) && (
          <>
            <div style={S.label}>What is it? Your own word is fine</div>
            <input style={S.input} type="text"
              placeholder="e.g. chest freezer, water bowser, pump house"
              value={form.kind_other || (custom ? form.kind : '')}
              onChange={(e) => setForm({
                ...form, kind: 'other', kind_other: e.target.value,
              })} />
          </>
        )}
      </>
    );
  };

  return (
    <div style={S.wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Upkeep</h2>
        <span style={{ fontSize: '13px', color: '#888' }}>
          {live.length} thing{live.length === 1 ? '' : 's'}
        </span>
      </div>

      {msg && (
        <div style={{ ...S.card, borderColor: '#e5484d', color: '#ff9a9a',
          fontSize: '13px' }}>{msg}</div>
      )}

      {due.length > 0 && (
        <div style={{ ...S.card, borderColor: '#e5484d' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#e5484d',
            marginBottom: '8px' }}>
            NEEDS DOING NOW
          </div>
          {due.map((a) => {
            const k = dueLook(a);
            return (
              <div key={a.id} onClick={() => toggle(a.id)}
                style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '7px 0', cursor: 'pointer', fontSize: '14px' }}>
                <span>{a.name}</span>
                <span style={{ color: k.color, fontWeight: 600 }}>{k.text}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto',
        marginBottom: '12px', paddingBottom: '2px' }}>
        {['all', 'house', 'vehicles', 'suspended', 'gone'].map((f) => (
          <button key={f} style={S.chip(filter === f)} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Everything' : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {mode === 'add' ? (
        <div style={S.card}>
          <div style={{ fontWeight: 700, marginBottom: '10px' }}>Add a thing</div>
          {field('name', 'What do you call it? e.g. Living room AC')}
          {kindPicker()}
          {field('place', 'Where is it? e.g. Freetown house')}
          <div style={S.row}>
            {field('brand', 'Brand')}
            {field('model', 'Model')}
          </div>
          {field('serial', 'Serial number (for warranty claims)')}
          <div style={S.label}>The day it went in — the clock starts here</div>
          {field('installed_on', 'YYYY-MM-DD', 'date')}
          <div style={S.label}>Warranty runs out</div>
          {field('warranty_until', 'YYYY-MM-DD', 'date')}
          <div style={S.label}>Service every how many months? (blank = sensible default)</div>
          {field('every_months', 'e.g. 6', 'number')}
          {field('notes', 'Notes')}
          <div style={S.row}>
            <button style={S.small('#667eea')} disabled={busy}
              onClick={addAsset}>Save</button>
            <button style={S.small('#333')}
              onClick={() => { setMode(null); setForm({}); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button style={{ ...S.btn('#667eea'), marginBottom: '12px' }}
          onClick={() => { setMode('add'); setForm({ installed_on: today() }); }}>
          + Add something
        </button>
      )}

      {shown.length === 0 && (
        <div style={{ ...S.card, color: '#888', fontSize: '14px' }}>
          Nothing here yet. Your vehicles come across on their own; add the
          ACs, fridge, generator and the rest with the button above.
        </div>
      )}

      {shown.map((a) => {
        const k = dueLook(a);
        const d = detail[a.id] || {};
        const isOpen = open === a.id;
        const gone = (a.status || 'active') === 'gone';
        return (
          <div key={a.id} style={{ ...S.card, opacity: gone ? 0.5 : 1,
            borderColor: isOpen ? '#667eea' : '#2a2a2a' }}>
            <div onClick={() => toggle(a.id)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{a.name}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '5px',
                    flexWrap: 'wrap' }}>
                    {a.kind && <span style={S.tag}>{a.kind}</span>}
                    {a.place && <span style={S.tag}>{a.place}</span>}
                    {a.every_months && <span style={S.tag}>every {a.every_months}m</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: k.color, fontWeight: 600, fontSize: '13px' }}>
                    {k.text}
                  </div>
                  {a.next_due_on && (
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                      {a.next_due_on}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ fontSize: '12px', color: '#888', marginTop: '9px' }}>
                {a.last_service ? (
                  <>
                    Last done {a.last_service.done_on}
                    {a.last_service.who ? ` by ${a.last_service.who}` : ''}
                    {a.last_service.cost ? ` — ${money(a.last_service.cost)} SLE` : ''}
                  </>
                ) : (
                  a.installed_on ? `Never serviced. Went in ${a.installed_on}.`
                    : 'Never serviced, and no install date.'
                )}
              </div>
              {a.last_service && a.last_service.outcome && (
                <div style={{ fontSize: '12px', color: '#c9a227', marginTop: '5px',
                  fontStyle: 'italic' }}>
                  They found: {a.last_service.outcome}
                </div>
              )}
            </div>

            {isOpen && (
              <div style={{ marginTop: '12px', borderTop: '1px solid #2a2a2a',
                paddingTop: '12px' }}>
                {mode === 'service' && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '8px' }}>
                      Record a service
                    </div>
                    <div style={S.label}>When</div>
                    {field('done_on', 'YYYY-MM-DD', 'date')}
                    {field('what', 'What was done')}
                    <div style={S.row}>
                      {field('who', 'Who did it')}
                      {field('who_phone', 'Their phone')}
                    </div>
                    <div style={S.label}>What they found — this is the bit worth having</div>
                    <textarea style={{ ...S.input, minHeight: '70px' }}
                      placeholder="e.g. gas was low, filter rotten, says the compressor is weak"
                      value={form.outcome || ''}
                      onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
                    <div style={S.row}>
                      {field('cost', 'Cost (SLE)', 'number')}
                      {field('parts', 'Parts changed')}
                    </div>
                    {field('notes', 'Anything else')}
                    <div style={S.row}>
                      <button style={S.small('#2e9e5b')} disabled={busy}
                        onClick={() => logService(a.id)}>Save service</button>
                      <button style={S.small('#333')}
                        onClick={() => { setMode(null); setForm({}); }}>Cancel</button>
                    </div>
                  </div>
                )}

                {mode === 'edit' && (
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ fontWeight: 700, marginBottom: '8px' }}>Edit</div>
                    {field('name', 'Name')}
                    {kindPicker()}
                    {field('place', 'Where it is')}
                    <div style={S.row}>
                      {field('brand', 'Brand')}
                      {field('model', 'Model')}
                    </div>
                    {field('serial', 'Serial number')}
                    <div style={S.label}>Installed</div>
                    {field('installed_on', 'YYYY-MM-DD', 'date')}
                    <div style={S.label}>Warranty until</div>
                    {field('warranty_until', 'YYYY-MM-DD', 'date')}
                    <div style={S.label}>Service every (months)</div>
                    {field('every_months', '', 'number')}
                    {field('notes', 'Notes')}
                    <div style={S.row}>
                      <button style={S.small('#667eea')} disabled={busy}
                        onClick={() => saveEdit(a.id)}>Save</button>
                      <button style={S.small('#333')}
                        onClick={() => { setMode(null); setForm({}); }}>Cancel</button>
                    </div>
                  </div>
                )}

                {!mode && (
                  <>
                    <div style={S.row}>
                      <button style={S.small('#2e9e5b')}
                        onClick={() => { setMode('service'); setForm({ done_on: today() }); }}>
                        Record a service
                      </button>
                      <button style={S.small('#333')}
                        onClick={() => { setMode('edit'); setForm({ ...a }); }}>
                        Edit
                      </button>
                    </div>
                    <div style={S.row}>
                      <button style={S.small('#444')}
                        onClick={() => setStatus(a.id,
                          (a.status || 'active') === 'suspended' ? 'active' : 'suspended')}>
                        {(a.status || 'active') === 'suspended' ? 'Un-suspend' : 'Suspend'}
                      </button>
                      <button style={S.small('#6b2525')}
                        onClick={() => remove(a.id, a.name)}>
                        Gone
                      </button>
                    </div>
                  </>
                )}

                {(a.brand || a.model || a.serial || a.warranty_until) && (
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
                    {[a.brand, a.model].filter(Boolean).join(' ')}
                    {a.serial ? ` · serial ${a.serial}` : ''}
                    {a.warranty_until ? ` · warranty to ${a.warranty_until}` : ''}
                  </div>
                )}
                {a.notes && (
                  <div style={{ fontSize: '12px', color: '#aaa', marginTop: '8px' }}>
                    {a.notes}
                  </div>
                )}

                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                    {d.times_serviced != null
                      ? `Serviced ${d.times_serviced} time${d.times_serviced === 1 ? '' : 's'}`
                      : 'History'}
                    {d.spent_total ? ` · ${money(d.spent_total)} SLE all together` : ''}
                  </div>
                  {(d.history || []).length === 0 && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Nothing recorded yet.
                    </div>
                  )}
                  {(d.history || []).map((h) => (
                    <div key={h.id} style={{ background: '#141414',
                      border: '1px solid #262626', borderRadius: '8px',
                      padding: '10px', marginBottom: '7px', fontSize: '13px' }}>
                      <div style={{ display: 'flex',
                        justifyContent: 'space-between', gap: '8px' }}>
                        <strong>{h.done_on}</strong>
                        <span style={{ color: '#888' }}>
                          {h.cost ? `${money(h.cost)} ${h.currency || 'SLE'}` : ''}
                        </span>
                      </div>
                      {h.what && <div style={{ marginTop: '4px' }}>{h.what}</div>}
                      {h.who && (
                        <div style={{ color: '#888', marginTop: '3px', fontSize: '12px' }}>
                          {h.who}{h.who_phone ? ` · ${h.who_phone}` : ''}
                        </div>
                      )}
                      {h.outcome && (
                        <div style={{ color: '#c9a227', marginTop: '5px',
                          fontStyle: 'italic', fontSize: '12px' }}>
                          Found: {h.outcome}
                        </div>
                      )}
                      {h.parts && (
                        <div style={{ color: '#888', marginTop: '3px', fontSize: '12px' }}>
                          Parts: {h.parts}
                        </div>
                      )}
                      {h.notes && (
                        <div style={{ color: '#aaa', marginTop: '3px', fontSize: '12px' }}>
                          {h.notes}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between',
                        marginTop: '7px', fontSize: '11px', color: '#666' }}>
                        <span>{h.next_due_on ? `next due ${h.next_due_on}` : ''}</span>
                        <span style={{ cursor: 'pointer', color: '#8a4a4a' }}
                          onClick={() => delService(h.id, a.id)}>delete</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div style={{ ...S.card, fontSize: '12px', color: '#777',
        marginTop: '14px' }}>
        Ami warns you three days before anything here is due, in the morning
        briefing. You can also tell her straight — <em>i serviced the
        generator today, Mohamed did it for 850</em> — and then
        <em> dem find se di gas de low</em>, which hangs on that same service.
      </div>
    </div>
  );
}
