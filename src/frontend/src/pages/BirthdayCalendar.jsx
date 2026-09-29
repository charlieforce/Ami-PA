import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import BirthdayDuplicates from '../components/BirthdayDuplicates';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function BirthdayCalendar() {
  const [birthdays, setBirthdays] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterZodiac, setFilterZodiac] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [contactsList, setContactsList] = useState([]);
  const [familyOf, setFamilyOf] = useState('');
  const [familyLabel, setFamilyLabel] = useState('');
  const [linkIds, setLinkIds] = useState([]);

  useEffect(() => {
    fetch(API + '/api/admin/contacts', { headers: { 'X-Ami-Password': AMI_PASSWORD } })
      .then(r => r.json()).then(j => setContactsList(j.contacts || [])).catch(() => {});
  }, []);

  const loadLinkFor = async (bid) => {
    setFamilyOf(''); setFamilyLabel(''); setLinkIds([]);
    try {
      const r = await fetch(API + '/api/links?birthday_id=' + bid, { headers: { 'X-Ami-Password': AMI_PASSWORD } });
      const j = await r.json();
      const links = j.links || [];
      setLinkIds(links.map(l => l.id));
      if (links[0]) { setFamilyOf(String(links[0].contact_id)); setFamilyLabel(links[0].label || ''); }
    } catch (e) { /* non-fatal */ }
  };

  const saveLink = async (bid) => {
    const h = { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' };
    for (const id of linkIds) {
      await fetch(API + '/api/links/' + id, { method: 'DELETE', headers: h });
    }
    if (familyOf && bid) {
      await fetch(API + '/api/links', { method: 'POST', headers: h,
        body: JSON.stringify({ person_kind: 'birthday', person_id: bid, contact_id: Number(familyOf), label: familyLabel }) });
    }
    setFamilyOf(''); setFamilyLabel(''); setLinkIds([]);
  };
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    year: '',
    relationship: 'friend',
    notes: ''
  });

  const itemsPerPage = 15;
  const zodiacSigns = [
    'Aries ♈', 'Taurus ♉', 'Gemini ♊', 'Cancer ♋', 'Leo ♌', 'Virgo ♍',
    'Libra ♎', 'Scorpio ♏', 'Sagittarius ♑', 'Capricorn ♑', 'Aquarius ♒', 'Pisces ♓'
  ];

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  useEffect(() => {
    loadBirthdays();
  }, []);

  const loadBirthdays = async () => {
    try {
      const res = await fetch(API + '/api/birthdays', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const data = await res.json();
      setBirthdays(data.birthdays || []);
      
      const upRes = await fetch(API + '/api/birthdays/upcoming', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const upData = await upRes.json();
      setUpcoming(upData.upcoming || []);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBirthday = async () => {
    if (!formData.name || !formData.date) {
      alert('Name and date required!');
      return;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `${API}/api/birthdays/${editingId}`
        : API + '/api/birthdays';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        let savedId = editingId;
        try { const j = await res.clone().json(); savedId = editingId || j.id; } catch (e) { /* ignore */ }
        await saveLink(savedId);
        loadBirthdays();
        setFormData({ name: '', date: '', year: '', relationship: 'friend', notes: '' });
        setEditingId(null);
        setShowForm(false);
        setCurrentPage(1);
      }
    } catch (e) {
      alert('Error saving birthday');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this birthday?')) return;
    
    try {
      await fetch(`${API}/api/birthdays/${id}`, {
        method: 'DELETE',
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      loadBirthdays();
    } catch (e) {
      alert('Error deleting');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    doc.setFontSize(20);
    doc.text('🎂 Birthday Calendar', 20, yPos);
    yPos += 12;

    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Total: ${filteredBirthdays.length}`, 20, yPos);
    yPos += 16;

    doc.setLineWidth(0.5);
    doc.line(20, yPos, 190, yPos);
    yPos += 8;

    const toExport = [...filteredBirthdays].sort((a, b) => {
      const [aMonth] = a.date.split('-');
      const [bMonth] = b.date.split('-');
      return parseInt(aMonth) - parseInt(bMonth);
    });

    toExport.forEach(b => {
      if (yPos > pageHeight - 20) {
        doc.addPage();
        yPos = 15;
      }

      const [month, day] = b.date.split('-');
      const dateStr = `${months[parseInt(month) - 1]} ${day}${b.year ? ', ' + b.year : ''}`;
      
      const isUpcoming = upcoming.some(u => u.id === b.id);
      if (isUpcoming) {
        doc.setFillColor(16, 185, 129);
        doc.rect(20, yPos - 2, 170, 12, 'F');
        doc.setTextColor(0, 0, 0);
      }
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(`${b.name}`, 24, yPos + 3);
      
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text(`${dateStr} • ${b.zodiac}`, 24, yPos + 8);
      
      doc.setTextColor(0, 0, 0);
      yPos += 13;
    });

    doc.save(`birthdays-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredBirthdays = birthdays.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         b.date.includes(searchQuery);
    const [month] = b.date.split('-');
    const matchesMonth = filterMonth === 'all' || parseInt(month) === parseInt(filterMonth);
    const matchesZodiac = filterZodiac === 'all' || b.zodiac.includes(filterZodiac);
    return matchesSearch && matchesMonth && matchesZodiac;
  });

  const totalPages = Math.ceil(filteredBirthdays.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedBirthdays = filteredBirthdays.slice(startIdx, startIdx + itemsPerPage);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading birthdays...</div>;

  return (
    <div style={{ padding: '15px', maxWidth: '800px', margin: '0 auto' }}>
      <BirthdayDuplicates onMerged={loadBirthdays} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>🎂 {filteredBirthdays.length} Birthdays</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '10px 14px',
              background: '#667eea',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              minHeight: '44px',
              fontSize: '14px'
            }}
          >
            + Add
          </button>
          <button
            onClick={exportToPDF}
            style={{
              padding: '10px 14px',
              background: '#f59e0b',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              minHeight: '44px',
              fontSize: '14px'
            }}
          >
            📥 PDF
          </button>
        </div>
      </div>

      {/* UPCOMING BIRTHDAYS */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: '20px', padding: '12px', background: '#1a2a1a', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>🎉 Upcoming ({upcoming.length})</div>
          <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '8px' }}>
            {upcoming.map(b => (
              <div key={b.id} style={{ fontSize: '13px', color: '#fff', padding: '4px 0' }}>
                {b.days_until === 0 ? '🎁 TODAY' : `In ${b.days_until} day${b.days_until > 1 ? 's' : ''}`}: <strong>{b.name}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS */}
      <div style={{ marginBottom: '20px', display: 'grid', gap: '10px' }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: '10px',
            background: '#2a2a2a',
            color: '#fff',
            border: '1px solid #404040',
            borderRadius: '6px',
            fontSize: '14px',
            minHeight: '44px'
          }}
        />
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <select
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '10px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #404040',
              borderRadius: '4px',
              cursor: 'pointer',
              minHeight: '44px',
              fontSize: '13px'
            }}
          >
            <option value="all">All Months</option>
            {months.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>

          <select
            value={filterZodiac}
            onChange={(e) => {
              setFilterZodiac(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '10px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #404040',
              borderRadius: '4px',
              cursor: 'pointer',
              minHeight: '44px',
              fontSize: '13px'
            }}
          >
            <option value="all">All Zodiacs</option>
            {zodiacSigns.map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      </div>

      {/* BIRTHDAY LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {paginatedBirthdays.map((b, idx) => {
          const [month, day] = b.date.split('-');
          const isUpcoming = upcoming.some(u => u.id === b.id);
          
          return (
            <div
              key={b.id}
              style={{
                padding: '12px 14px',
                background: isUpcoming ? '#1a2a1a' : (idx % 2 === 0 ? '#0a0a0a' : '#101010'),
                borderLeft: isUpcoming ? '4px solid #10b981' : '4px solid transparent',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #222',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => !isUpcoming && (e.currentTarget.style.background = '#151515')}
              onMouseLeave={(e) => !isUpcoming && (e.currentTarget.style.background = idx % 2 === 0 ? '#0a0a0a' : '#101010')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '2px' }}>
                  {b.name}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {months[parseInt(month) - 1]} {day}{b.year && `, ${b.year}`} • {b.zodiac}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginLeft: '10px' }}>
                <button
                  onClick={() => {
                    setFormData(b);
                    setEditingId(b.id);
                    loadLinkFor(b.id);
                    setShowForm(true);
                  }}
                  style={{
                    padding: '6px 10px',
                    background: '#667eea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    minHeight: '36px'
                  }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  style={{
                    padding: '6px 10px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    minHeight: '36px'
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '8px 12px',
              background: currentPage === 1 ? '#333' : '#667eea',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === 1 ? 'default' : 'pointer',
              minHeight: '40px'
            }}
          >
            ← Prev
          </button>
          
          <div style={{ fontSize: '14px', color: '#aaa', minWidth: '100px', textAlign: 'center' }}>
            Page {currentPage} of {totalPages}
          </div>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 12px',
              background: currentPage === totalPages ? '#333' : '#667eea',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === totalPages ? 'default' : 'pointer',
              minHeight: '40px'
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '15px',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginTop: 0 }}>
              {editingId ? '✏️ Edit Birthday' : '🎂 Add Birthday'}
            </h3>

            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '10px',
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #404040',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                minHeight: '44px'
              }}
            />

            <input
              type="text"
              placeholder="Date (MM-DD)"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '10px',
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #404040',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                minHeight: '44px'
              }}
            />

            <input
              type="text"
              placeholder="Year (optional)"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '10px',
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #404040',
                borderRadius: '4px',
                fontSize: '14px',
                boxSizing: 'border-box',
                minHeight: '44px'
              }}
            />

            <select
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '10px',
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #404040',
                borderRadius: '4px',
                cursor: 'pointer',
                minHeight: '44px',
                fontSize: '14px'
              }}
            >
              <option value="friend">Friend</option>
              <option value="family">Family</option>
              <option value="colleague">Colleague</option>
              <option value="other">Other</option>
            </select>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
              <select value={familyOf} onChange={(e) => setFamilyOf(e.target.value)}
                      style={{ width: '100%', padding: '10px', background: '#2a2a2a', color: '#fff',
                               border: '1px solid #404040', borderRadius: '4px', minHeight: '44px' }}>
                <option value="">Family of... (optional)</option>
                {contactsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="Who they are to them (son)" value={familyLabel}
                     onChange={(e) => setFamilyLabel(e.target.value)} disabled={!familyOf}
                     style={{ width: '100%', padding: '10px', background: '#2a2a2a', color: '#fff',
                              border: '1px solid #404040', borderRadius: '4px', minHeight: '44px',
                              boxSizing: 'border-box', opacity: familyOf ? 1 : 0.5 }} />
            </div>

            <textarea
              placeholder="Notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '15px',
                background: '#2a2a2a',
                color: '#fff',
                border: '1px solid #404040',
                borderRadius: '4px',
                fontSize: '13px',
                minHeight: '70px',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAddBirthday}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  minHeight: '44px'
                }}
              >
                {editingId ? '✅ Update' : '✅ Add'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ name: '', date: '', year: '', relationship: 'friend', notes: '' });
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  minHeight: '44px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
