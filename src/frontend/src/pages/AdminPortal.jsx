import React, { useState, useEffect } from 'react';
import AnalyticsTab from './AnalyticsTab';
import VenturesProjectsTabNew from '../components/VenturesProjectsTab';
import EnginesCostTab from '../components/EnginesCostTab';
import WhoAmiIsTab from '../components/WhoAmiIsTab';
import WhatAmiKnowsTab from '../components/WhatAmiKnowsTab';
import SettingsTab from '../components/SettingsTab';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';



const PLACE_TZ = {
  'sierra leone': 'Africa/Freetown', 'freetown': 'Africa/Freetown', 'bo': 'Africa/Freetown',
  'kenya': 'Africa/Nairobi', 'nairobi': 'Africa/Nairobi', 'kisumu': 'Africa/Nairobi',
  'ghana': 'Africa/Accra', 'accra': 'Africa/Accra',
  'rwanda': 'Africa/Kigali', 'kigali': 'Africa/Kigali',
  'south africa': 'Africa/Johannesburg', 'johannesburg': 'Africa/Johannesburg',
  'cape town': 'Africa/Johannesburg',
  'nigeria': 'Africa/Lagos', 'lagos': 'Africa/Lagos',
  'cameroon': 'Africa/Douala', 'douala': 'Africa/Douala', 'yaounde': 'Africa/Douala',
  'uganda': 'Africa/Kampala', 'tanzania': 'Africa/Dar_es_Salaam',
  'ethiopia': 'Africa/Addis_Ababa', 'senegal': 'Africa/Dakar', 'liberia': 'Africa/Monrovia',
  'guinea': 'Africa/Conakry', 'ivory coast': 'Africa/Abidjan',
  'uk': 'Europe/London', 'england': 'Europe/London', 'london': 'Europe/London',
  'usa': 'America/New_York', 'new york': 'America/New_York',
  'texas': 'America/Chicago', 'austin': 'America/Chicago', 'san antonio': 'America/Chicago',
  'seattle': 'America/Los_Angeles', 'washington': 'America/Los_Angeles',
  'canada': 'America/Toronto', 'toronto': 'America/Toronto',
  'mexico': 'America/Mexico_City',
  'dubai': 'Asia/Dubai', 'uae': 'Asia/Dubai', 'india': 'Asia/Kolkata',
  'singapore': 'Asia/Singapore', 'australia': 'Australia/Sydney'
};

const tzForPlace = (place) => {
  const p = (place || '').toLowerCase().trim();
  if (!p) return null;
  if (PLACE_TZ[p]) return PLACE_TZ[p];
  for (const k of Object.keys(PLACE_TZ)) {
    if (p.includes(k)) return PLACE_TZ[k];
  }
  return null;
};

function TimezoneTabContent() {
  const [currentTimezone, setCurrentTimezone] = React.useState('Africa/Nairobi');
  const [schedule, setSchedule] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [travelDate, setTravelDate] = React.useState('');
  const [travelTz, setTravelTz] = React.useState('Africa/Nairobi');
  const [travelLocation, setTravelLocation] = React.useState('');
  const [travelNotes, setTravelNotes] = React.useState('');
  
  const timezones = [
    'Africa/Nairobi',
    'Africa/Freetown', 
    'Africa/Douala',
    'Africa/Lagos',
    'Africa/Cairo',
    'America/Los_Angeles',
    'America/Denver',
    'America/Toronto',
    'America/Chicago',
    'America/New_York',
    'America/Mexico_City',
    'America/Sao_Paulo',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Moscow',
    'Asia/Dubai',
    'Asia/Bangkok',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Asia/Hong_Kong',
    'Asia/India',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland'
  ];

  React.useEffect(() => {
    loadTimezone();
    loadSchedule();
  }, []);

  const [pastShow, setPastShow] = React.useState(5);

  const editTravel = async (entry) => {
    const when = window.prompt('Date for ' + (entry.location || 'this trip') + ' (YYYY-MM-DD)',
                               String(entry.travel_date).slice(0, 10));
    if (!when) return;
    await fetch(API + '/api/timezone/schedule/' + entry.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
      body: JSON.stringify({ travel_date: when, timezone: entry.timezone,
                             location: entry.location, notes: entry.notes })
    });
    loadSchedule(); loadTimezone();
  };

  const loadTimezone = async () => {
    try {
      const res = await fetch(API + '/api/timezone', { headers: { 'X-Ami-Password': AMI_PASSWORD } });
      const json = await res.json();
      setCurrentTimezone(json.timezone || 'Africa/Nairobi');
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const loadSchedule = async () => {
    try {
      const res = await fetch(API + '/api/timezone/schedule', { headers: { 'X-Ami-Password': AMI_PASSWORD } });
      const json = await res.json();
      setSchedule(json.schedule || []);
      setLoading(false);
    } catch (e) {
      console.error('Error:', e);
      setLoading(false);
    }
  };

  const updateTimezone = async (tz) => {
    try {
      await fetch(API + '/api/timezone', { method: 'PUT', headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' }, body: JSON.stringify({ timezone: tz }) });
      setCurrentTimezone(tz);
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const addTravel = async () => {
    const guess = tzForPlace(travelLocation);
    if (guess && travelTz && guess !== travelTz) {
      if (!window.confirm(`${travelLocation} is usually ${guess}, but you have ${travelTz}. Save it anyway?`)) return;
    }
    if (!travelDate || !travelTz) { alert('Date and timezone required'); return; }
    try {
      await fetch(API + '/api/timezone/schedule', { method: 'POST', headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' }, body: JSON.stringify({ travel_date: travelDate, timezone: travelTz, location: travelLocation, notes: travelNotes }) });
      setTravelDate('');
      setTravelTz('Africa/Nairobi');
      setTravelLocation('');
      setTravelNotes('');
      await loadSchedule();
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const deleteTravel = async (id) => {
    try {
      await fetch(`${API}/api/timezone/schedule/${id}`, { method: 'DELETE', headers: { 'X-Ami-Password': AMI_PASSWORD } });
      await loadSchedule();
    } catch (e) {
      console.error('Error:', e);
    }
  };

  if (loading) return <div style={{ color: '#fff', padding: '20px' }}>Loading...</div>;

  return (
    <div>
      {/* WHERE SHE THINKS YOU ARE */}
      <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '16px', border: '1px solid #404040', marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', color: '#aaa' }}>🌍 Ami has your clock set to</div>
        <div style={{ fontSize: '18px', color: '#10b981', fontWeight: '700', margin: '4px 0' }}>{currentTimezone}</div>
        <div style={{ fontSize: '11px', color: '#777' }}>
          She works this out from the list below and moves with you. To change it, change your travel dates.
        </div>
      </div>

      {/* TRAVEL SCHEDULE */}
      <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #404040', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0, color: '#667eea' }}>✈️ My Travels</h3>
        
        <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #404040' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Travel Date</label>
          <input type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} style={{ width: '100%', padding: '8px', background: '#1a1a1a', color: '#fff', border: '1px solid #404040', borderRadius: '6px', marginBottom: '12px', boxSizing: 'border-box' }} />
          
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>My Travels</label>
          <select value={travelTz} onChange={(e) => setTravelTz(e.target.value)} style={{ width: '100%', padding: '8px', background: '#1a1a1a', color: '#fff', border: '1px solid #404040', borderRadius: '6px', marginBottom: '12px', boxSizing: 'border-box' }}>
            {timezones.map(tz => (<option key={tz} value={tz}>{tz}</option>))}
          </select>
          
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Location (optional)</label>
          <input type="text" placeholder="e.g., South Africa, London" value={travelLocation} onChange={(e) => {
                const v = e.target.value;
                setTravelLocation(v);
                const tz = tzForPlace(v);
                if (tz) setTravelTz(tz);
              }} style={{ width: '100%', padding: '8px', background: '#1a1a1a', color: '#fff', border: '1px solid #404040', borderRadius: '6px', marginBottom: '12px', boxSizing: 'border-box' }} />
          
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Notes (optional)</label>
          <input type="text" placeholder="e.g., Conference, vacation" value={travelNotes} onChange={(e) => setTravelNotes(e.target.value)} style={{ width: '100%', padding: '8px', background: '#1a1a1a', color: '#fff', border: '1px solid #404040', borderRadius: '6px', marginBottom: '12px', boxSizing: 'border-box' }} />
          
          <button onClick={addTravel} style={{ width: '100%', padding: '10px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Travel Entry</button>
        </div>

        {/* SCHEDULE LIST */}
        {schedule.length === 0 ? (
          <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No travel entries yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {schedule.filter(e => String(e.travel_date).slice(0, 10) >= new Date().toISOString().slice(0, 10)).map(entry => (
              <div key={entry.id} style={{ background: '#2a2a2a', padding: '12px', borderRadius: '6px',
                            opacity: String(entry.travel_date).slice(0, 10) < new Date().toISOString().slice(0, 10) ? 0.45 : 1,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>
                    📅 {String(entry.travel_date).slice(0, 10)}
                    {String(entry.travel_date).slice(0, 10) < new Date().toISOString().slice(0, 10) && (
                      <span style={{ fontSize: '10px', color: '#10b981', marginLeft: '8px' }}>been there</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#667eea', marginBottom: '4px' }}>🌍 {entry.timezone}</div>
                  {entry.location && <div style={{ fontSize: '11px', color: '#aaa' }}>📍 {entry.location}</div>}
                  {entry.notes && <div style={{ fontSize: '11px', color: '#aaa' }}>📝 {entry.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button onClick={() => editTravel(entry)} style={{ background: 'transparent', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: '14px', padding: '4px 6px' }}>✎</button>
                  <button onClick={() => deleteTravel(entry.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '4px 6px' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {schedule.filter(e => String(e.travel_date).slice(0, 10) < new Date().toISOString().slice(0, 10)).length > 0 && (
          <div style={{ marginTop: '18px' }}>
            <div style={{ fontSize: '12px', color: '#777', marginBottom: '8px', fontWeight: 600 }}>
              Trips already taken
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {schedule
                .filter(e => String(e.travel_date).slice(0, 10) < new Date().toISOString().slice(0, 10))
                .sort((a, b) => String(b.travel_date).localeCompare(String(a.travel_date)))
                .slice(0, pastShow)
                .map(entry => (
                <div key={entry.id} style={{ background: '#222', padding: '9px 12px', borderRadius: '6px',
                              opacity: 0.6, display: 'flex', justifyContent: 'space-between',
                              alignItems: 'center', gap: '8px' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '13px', color: '#ccc' }}>
                      {entry.location || entry.timezone}
                    </span>
                    <span style={{ fontSize: '11px', color: '#777', marginLeft: '8px' }}>
                      {String(entry.travel_date).slice(0, 10)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button onClick={() => editTravel(entry)} style={{ background: 'transparent', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: '13px', padding: '4px 6px' }}>✎</button>
                    <button onClick={() => deleteTravel(entry.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', padding: '4px 6px' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            {schedule.filter(e => String(e.travel_date).slice(0, 10) < new Date().toISOString().slice(0, 10)).length > pastShow && (
              <button onClick={() => setPastShow(pastShow + 10)}
                      style={{ width: '100%', padding: '10px', marginTop: '8px', background: '#2a2a2a',
                               color: '#888', border: 'none', borderRadius: '6px', fontSize: '12px',
                               cursor: 'pointer' }}>
                Show more trips
              </button>
            )}
          {pastShow > 5 && (
            <button onClick={() => setPastShow(5)}
                    style={{ width: '100%', padding: '9px', marginTop: '6px',
                             background: 'transparent', color: '#6b6b7c',
                             border: '1px solid #2c2c3a', borderRadius: '8px',
                             fontSize: '12px', cursor: 'pointer' }}>
              Show less
            </button>
          )}
          </div>
        )}
      </div>
    </div>
  );
}


function ContactsManager() {
  const [contacts, setContacts] = React.useState([]);
  const [filteredContacts, setFilteredContacts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [displayCount, setDisplayCount] = React.useState(20);
  const [editingId, setEditingId] = React.useState(null);
  const [openCtx, setOpenCtx] = React.useState(null);
  const [contactCtx, setContactCtx] = React.useState({});

  const loadContext = async (c) => {
    if (openCtx === c.id) { setOpenCtx(null); return; }
    setOpenCtx(c.id);
    if (contactCtx[c.id]) return;
    try {
      const r = await fetch(`${API}/api/admin/contacts/${c.id}/context`, {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const j = await r.json();
      setContactCtx(prev => ({ ...prev, [c.id]: j.context || {} }));
    } catch (e) { /* non-fatal */ }
  };


  const [showModal, setShowModal] = React.useState(false);
  
  const itemsPerPage = 20;
  
  const [form, setForm] = React.useState({
    name: '', email: '', phone: '', location: '', relationship: '', aliases: '', private_notes: '',
    background: '', birthday: '', venture: ''
  });

  React.useEffect(() => {
    loadContacts();
  }, []);

  // Search/filter effect
  React.useEffect(() => {
    const query = searchQuery.toLowerCase();
    if (!query) {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter(c =>
        (c.name?.toLowerCase() || '').includes(query) ||
        (c.email?.toLowerCase() || '').includes(query) ||
        (c.phone?.toLowerCase() || '').includes(query) ||
        (c.location?.toLowerCase() || '').includes(query) ||
        (c.relationship?.toLowerCase() || '').includes(query) ||
        (c.aliases?.toLowerCase() || '').includes(query) ||
        (c.venture?.toLowerCase() || '').includes(query)
      );
      setFilteredContacts(filtered);
    }
    setDisplayCount(20); // Reset to first page on search
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    try {
      const res = await fetch(API + '/api/admin/contacts', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setContacts(json.contacts || []);
      setFilteredContacts(json.contacts || []);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setForm({ name: '', email: '', phone: '', location: '', relationship: '', aliases: '', private_notes: '', background: '', birthday: '', venture: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const openEditForm = (contact) => {
    setForm(contact);
    setEditingId(contact.id);
    setShowModal(true);
  };

  const saveContact = async () => {
    if (!form.name.trim()) { alert('Name required'); return; }

    // six months from now he will not remember whether he added this person
    if (!editingId) {
      try {
        const chk = await fetch(API + '/api/contacts/check?name='
                                + encodeURIComponent(form.name.trim()),
                                { headers: { 'X-Ami-Password': AMI_PASSWORD } });
        const cj = await chk.json();
        const hits = cj.existing || [];
        if (hits.length) {
          const who = hits.map(h => '  \u00b7 ' + h.name + (h.who ? ' - ' + h.who : ''))
                          .join('\n');
          const go = window.confirm(
            'You already have:\n\n' + who +
            '\n\nIs this a different person? Press OK to add them anyway, ' +
            'or Cancel to go and edit the one you have.');
          if (!go) return;
        }
      } catch (e) { /* if the check fails, do not block him */ }
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `${API}/api/admin/contacts/${editingId}`
        : API + '/api/admin/contacts';
      
      const res = await fetch(url, {
        method: method,
        headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save');
      }
      
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', location: '', relationship: '', aliases: '', private_notes: '', background: '', birthday: '', venture: '' });
      await loadContacts();
      alert('✅ Contact saved!');
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const deleteContact = async (id) => {
    if (!window.confirm('Delete this contact?')) return;
    try {
      await fetch(`${API}/api/admin/contacts/${id}`, {
        method: 'DELETE',
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      await loadContacts();
    } catch (e) {
      alert('Error');
    }
  };

  // Display subset
  const visibleContacts = filteredContacts.slice(0, displayCount);
  const hasMore = displayCount < filteredContacts.length;

  if (loading) return <div style={{ padding: '20px', color: '#aaa' }}>Loading contacts...</div>;

  return (
    <div>
      <h2>👥 Contacts ({filteredContacts.length})</h2>
      
      {/* Search & Add */}
      <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="🔍 Search by name, email, phone, location..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '12px', background: '#2a2a2a', color: '#fff', border: '1px solid #404040', borderRadius: '8px' }} 
        />
        <button 
          onClick={openAddForm} 
          style={{ padding: '12px 20px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ➕ Add Contact
        </button>
      </div>

      {/* Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflowY: 'auto', border: '1px solid #404040' }}>
            <h3 style={{ marginTop: 0 }}>{editingId ? '✏️ Edit Contact' : '➕ Add Contact'}</h3>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <input type="text" placeholder="Full Name *" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} style={{ padding: '10px', background: '#2a2a2a', color: '#fff', border: '1px solid #404040', borderRadius: '6px' }} />
              <input type="email" placeholder="Email" value={form.email || ''} onChange={(e) => setForm({...form, email: e.target.value})} style={{ padding: '10px', background: '#2a2a2a', color: '#fff', border: '1px solid #404040', borderRadius: '6px' }} />
              <input type="tel" placeholder="Phone" value={form.phone || ''} onChange={(e) => setForm({...form, phone: e.target.value})} style={{ padding: '10px', background: '#2a2a2a', color: '#fff', border: '1px solid #404040', borderRadius: '6px' }} />
              <input type="text" placeholder="Location" value={form.location || ''} onChange={(e) => setForm({...form, location: e.target.value})} style={{ padding: '10px', background: '#2a2a2a', color: '#fff', border: '1px solid #404040', borderRadius: '6px' }} />
              <input type="text" list="relationship-kinds" placeholder="Relationship - brother, colleague, developer..." value={form.relationship || ''} onChange={(e) => setForm({...form, relationship: e.target.value})} style={{ padding: '10px', background: '#2a2a2a', color: '#fff', border: '1px solid #404040', borderRadius: '6px', fontFamily: 'inherit', fontSize: '14px' }} />
              <datalist id="relationship-kinds">{['brother','sister','mother','daughter','son','grandson','cousin','uncle','aunt','partner','friend','colleague','co-founder','developer','designer','client','contractor','doctor','neighbour','mentor','investor','board member'].map(r => <option key={r} value={r} />)}</datalist>
              <input type="text" placeholder="Relationship (friend, family, colleague, etc.)" value={form.relationship || ''} onChange={(e) => setForm({...form, relationship: e.target.value})} style={{ padding: '10px', background: '#2a2a2a', color: '#fff', border: '1px solid #404040', borderRadius: '6px' }} />
              <input type="text" placeholder="Also known as (Mack, cousin, JMS) - comma separated" value={form.aliases || ''} onChange={(e) => setForm({...form, aliases: e.target.value})} style={{ padding: '10px', background: '#2a2a2a', color: '#fff', border: '1px solid #404040', borderRadius: '6px' }} />
              <textarea placeholder="Private note - only Ami sees this, and she never repeats it (health, relationship, money...)" value={form.private_notes || ''} onChange={(e) => setForm({...form, private_notes: e.target.value})} rows={3} style={{ padding: '10px', background: '#1f1a2e', color: '#fff', border: '1px solid #5b4a8a', borderRadius: '6px', fontFamily: 'inherit', fontSize: '14px' }} />
              <label className="close-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#ccc', padding: '8px 0', cursor: 'pointer' }}><input type="checkbox" checked={!!form.close} onChange={(e) => setForm({...form, close: e.target.checked ? 1 : 0})} style={{ width: '18px', height: '18px', accentColor: '#667eea' }} />Close to me - Ami asks after them if they have not come up in a while</label>
              <input type="text" placeholder="Venture" value={form.venture || ''} onChange={(e) => setForm({...form, venture: e.target.value})} style={{ padding: '10px', background: '#2a2a2a', color: '#fff', border: '1px solid #404040', borderRadius: '6px' }} />
              <input type="text" placeholder="Birthday - 03-22 or 1998-03-22" value={form.birthday || ''} onChange={(e) => setForm({...form, birthday: e.target.value})} style={{ padding: '10px', background: '#2a2a2a', color: '#fff', border: '1px solid #404040', borderRadius: '6px' }} />
              <textarea placeholder="Notes" value={form.background || ''} onChange={(e) => setForm({...form, background: e.target.value})} style={{ padding: '10px', background: '#2a2a2a', color: '#fff', border: '1px solid #404040', borderRadius: '6px', minHeight: '100px', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
              <button onClick={saveContact} style={{ padding: '12px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>💾 Save</button>
              <button onClick={() => setShowModal(false)} style={{ padding: '12px', background: '#404040', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✕ Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Contact List - Compact */}
      <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
        {visibleContacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>No contacts found</div>
        ) : (
          visibleContacts.map(c => (
            <React.Fragment key={c.id}>
            <div 
              onClick={() => openEditForm(c)} 
              style={{ background: '#1a1a1a', padding: '12px', borderRadius: '6px', border: '1px solid #404040', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {[c.relationship, c.location].filter(x => x).join(' • ') || ''}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); loadContext(c); }}
                title="What's open with them"
                style={{ padding: '6px 10px', background: '#2a2a2a', color: '#aaa', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '8px', flexShrink: 0 }}>
                {openCtx === c.id ? '\u25B4' : '\u2139'}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteContact(c.id); }} 
                style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '8px', flexShrink: 0 }}>🗑️</button>
            </div>

            {openCtx === c.id && (
              <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: '6px',
                            padding: '12px', marginTop: '-4px', marginBottom: '8px',
                            fontSize: '12px', lineHeight: 1.6, color: '#bbb' }}>
                {(() => {
                  const x = contactCtx[c.id];
                  if (!x) return <span style={{ color: '#777' }}>Looking...</span>;
                  const empty = !(x.open_tasks || []).length && !(x.open_todos || []).length
                    && !(x.reminders || []).length && !(x.notes || []).length
                    && !(x.meetings || []).length && !x.birthday && !(x.family || []).length;
                  if (empty) return <span style={{ color: '#777' }}>Nothing open with them right now.</span>;
                  return (
                    <>
                      {x.days_since !== null && x.days_since !== undefined && (
                        <div style={{ marginBottom: '8px',
                                      color: x.days_since > 21 ? '#f59e0b' : '#888' }}>
                          Last came up {x.days_since === 0 ? 'today'
                            : x.days_since === 1 ? 'yesterday'
                            : x.days_since + ' days ago'}
                          {x.days_since > 21 ? ' - been a while.' : ''}
                        </div>
                      )}

                      {(x.meetings || []).length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#a78bfa', fontWeight: 700 }}>Coming up: </span>
                          {x.meetings.join(' · ')}
                        </div>
                      )}

                      {(x.open_tasks || []).length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#667eea', fontWeight: 700 }}>Open tasks</span>
                          {x.open_tasks.map(t => (
                            <div key={t.id} style={{ paddingLeft: '8px' }}>
                              • {t.title}{t.due_date ? ' (' + String(t.due_date).slice(0, 10) + ')' : ''}
                            </div>
                          ))}
                        </div>
                      )}

                      {(x.open_todos || []).length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#10b981', fontWeight: 700 }}>Todos</span>
                          {x.open_todos.map(t => (
                            <div key={t.id} style={{ paddingLeft: '8px' }}>• {t.title}</div>
                          ))}
                        </div>
                      )}

                      {(x.reminders || []).length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#f59e0b', fontWeight: 700 }}>Reminders</span>
                          {x.reminders.map(t => (
                            <div key={t.id} style={{ paddingLeft: '8px' }}>• {t.title}</div>
                          ))}
                        </div>
                      )}

                      {(x.notes || []).length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#22d3ee', fontWeight: 700 }}>They come up in</span>
                          {x.notes.map(nt => (
                            <div key={nt.id} style={{ paddingLeft: '8px' }}>
                              • {nt.title} <span style={{ color: '#666' }}>
                                ({nt.capture_type}, {String(nt.created_at).slice(0, 10)})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(x.family || []).length > 0 && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#f472b6', fontWeight: 700 }}>Family</span>
                          {x.family.map((f, i) => (
                            <div key={i} style={{ paddingLeft: '8px' }}>
                              • {f.name}{f.label ? <span style={{ color: '#888' }}> — {f.reverse ? f.label : 'their ' + f.label}</span> : null}
                              {f.birthday ? <span style={{ color: '#f472b6' }}> 🎂 {f.birthday}</span> : null}
                            </div>
                          ))}
                        </div>
                      )}

                      {x.birthday && (
                        <div style={{ color: '#f472b6' }}>🎂 {x.birthday.date}</div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            </React.Fragment>
          ))
        )}
      </div>

      {/* Load More */}
      {hasMore && (
        <button 
          onClick={() => setDisplayCount(displayCount + itemsPerPage)}
          style={{ width: '100%', padding: '12px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '12px' }}>
          📥 Load More ({displayCount}/{filteredContacts.length})
        </button>
      )}
    </div>
  );
}


function AdminPortal() {
  const [activeTab, setActiveTab] = React.useState(null);

  const tabs = [
    { id: 'ventures', label: '📁 Projects', color: '#667eea' },
    { id: 'contacts', label: '👥 Contacts', color: '#ec4899' },
    { id: 'timezone', label: '✈️ My Travels', color: '#f59e0b' },
    { id: 'personality', label: '🎭 Who Ami Is', color: '#14b8a6' },
    { id: 'learn-me', label: '🧠 What Ami Knows', color: '#06b6d4' },
    { id: 'engines-cost', label: '💰 Engines & Cost', color: '#8b5cf6' },
    { id: 'settings', label: '⚙️ Settings', color: '#10b981' },
  ];

  return (
    <div style={{ padding: '20px', color: '#fff', minHeight: '100vh', background: '#0a0a0a' }}>
      
      {/* HOME PAGE - GRID OF TABS */}
      {!activeTab && (
        <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>⚙️ Admin Portal</h1>
          <p style={{ color: '#aaa', textAlign: 'center', marginBottom: '40px' }}>Manage Ami and your data</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '30px 20px',
                  background: `linear-gradient(135deg, ${tab.color}20 0%, ${tab.color}05 100%)`,
                  border: `2px solid ${tab.color}`,
                  borderRadius: '12px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${tab.color}30`;
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 8px 16px ${tab.color}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `linear-gradient(135deg, ${tab.color}20 0%, ${tab.color}05 100%)`;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE TAB - FULL PAGE */}
      {activeTab && (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <button
            onClick={() => setActiveTab(null)}
            style={{
              padding: '8px 16px',
              background: '#404040',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginBottom: '20px',
              fontSize: '12px'
            }}
          >
            ← Back to Admin
          </button>

          {activeTab === 'ventures' && <VenturesProjectsTabNew />}
          {activeTab === 'settings' && <SettingsTab />}
          {activeTab === 'timezone' && <TimezoneTabContent />}
          {activeTab === 'engines-cost' && <EnginesCostTab />}
          {activeTab === 'personality' && <WhoAmiIsTab />}
          {activeTab === 'contacts' && <ContactsManager />}
          {activeTab === 'learn-me' && <WhatAmiKnowsTab />}
        </div>
      )}
    </div>
  );
}


export default AdminPortal;
