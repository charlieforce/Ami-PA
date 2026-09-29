import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SettingsPage() {
  const [ventures, setVentures] = useState([]);
  const [tags, setTags] = useState([]);
  const [projects, setProjects] = useState([]);
  
  // Ventures
  const [newVentureName, setNewVentureName] = useState('');
  const [newVentureDesc, setNewVentureDesc] = useState('');
  const [newVentureColor, setNewVentureColor] = useState('#667eea');
  const [editingVenture, setEditingVenture] = useState(null);
  const [ventureSearch, setVentureSearch] = useState('');
  
  // Tags
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#667eea');
  const [editingTag, setEditingTag] = useState(null);
  const [tagSearch, setTagSearch] = useState('');
  
  // Projects
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#667eea');
  const [newProjectVenture, setNewProjectVenture] = useState(1);
  const [editingProject, setEditingProject] = useState(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [selectedProjectTags, setSelectedProjectTags] = useState([]);
  const [projectTagsMap, setProjectTagsMap] = useState({});
  
  // Edit mode
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [currentTimezone, setCurrentTimezone] = useState('Africa/Nairobi');
  const timezones = ['Africa/Nairobi', 'Africa/Freetown', 'America/Toronto', 'America/New_York', 'Europe/London', 'Asia/Singapore', 'Australia/Sydney'];

  useEffect(() => {
    loadVentures();
    loadTags();
    loadProjects();
    loadTimezone();
  }, []);

  const loadTimezone = async () => {
    try {
      const res = await fetch(API + '/api/timezone', { headers: { 'X-Ami-Password': AMI_PASSWORD } });
      const json = await res.json();
      setCurrentTimezone(json.timezone || 'Africa/Nairobi');
    } catch (e) {
      console.error('Error:', e);
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

  const loadVentures = async () => {
    try {
      const res = await fetch(API + '/api/admin/ventures', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setVentures(json.ventures || []);
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const loadTags = async () => {
    try {
      const res = await fetch(API + '/api/tags', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setTags(json.tags || []);
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const loadProjectTags = async (projectId) => {
    try {
      const res = await fetch(API + '/api/projects/' + projectId + '/tags', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setProjectTagsMap(prev => ({ ...prev, [projectId]: json.tags || [] }));
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await fetch(API + '/api/projects', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setProjects(json.projects || []);
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const createVenture = async () => {
    if (!newVentureName.trim()) { alert('Venture name required'); return; }
    try {
      const res = await fetch(API + '/api/admin/ventures', {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newVentureName, description: newVentureDesc, color: newVentureColor })
      });
      if (res.ok) {
        setNewVentureName('');
        setNewVentureDesc('');
        setNewVentureColor('#667eea');
        await loadVentures();
      }
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const updateVenture = async (ventureId) => {
    try {
      await fetch(`${API}/api/admin/ventures/${ventureId}`, {
        method: 'PUT',
        headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc, color: editColor })
      });
      setEditingVenture(null);
      await loadVentures();
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const deleteVenture = async (ventureId) => {
    if (!window.confirm('Delete venture?')) return;
    try {
      await fetch(`${API}/api/admin/ventures/${ventureId}`, {
        method: 'DELETE',
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      await loadVentures();
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) { alert('Tag name required'); return; }
    try {
      const res = await fetch(API + '/api/tags', {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName, color: newTagColor })
      });
      if (res.ok) {
        setNewTagName('');
        setNewTagColor('#667eea');
        await loadTags();
      }
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const updateTag = async (tagId) => {
    try {
      await fetch(`${API}/api/tags/${tagId}`, {
        method: 'PUT',
        headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, color: editColor })
      });
      setEditingTag(null);
      await loadTags();
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const deleteTag = async (tagId) => {
    try {
      await fetch(`${API}/api/tags/${tagId}`, { method: 'DELETE', headers: { 'X-Ami-Password': AMI_PASSWORD } });
      await loadTags();
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) { alert('Project name required'); return; }
    try {
      const res = await fetch(API + '/api/projects', {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, color: newProjectColor, venture_id: newProjectVenture })
      });
      if (res.ok) {
        setNewProjectName('');
        setNewProjectColor('#667eea');
        setNewProjectVenture(1);
        await loadProjects();
      }
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const updateProject = async (projectId) => {
    try {
      await fetch(`${API}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, color: editColor })
      });
      setEditingProject(null);
      await loadProjects();
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const deleteProject = async (projectId) => {
    try {
      await fetch(`${API}/api/projects/${projectId}`, { method: 'DELETE', headers: { 'X-Ami-Password': AMI_PASSWORD } });
      await loadProjects();
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const inputStyle = { width: '100%', padding: '14px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '8px', boxSizing: 'border-box', fontSize: '16px', color: '#1a1a1a' };

  const filteredVentures = ventures.filter(v => v.name.toLowerCase().includes(ventureSearch.toLowerCase()));
  const filteredTags = tags.filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()));
  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()));

  const toggleProjectTag = (tagId) => {
    setSelectedProjectTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const getVentureName = (ventureId) => {
    const v = ventures.find(v => v.id === ventureId);
    return v ? v.name : 'Unknown';
  };

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh', padding: '16px', maxWidth: '100%', margin: '0 auto', '@media (min-width: 768px)': { maxWidth: '800px', padding: '24px' } }}>
      <h1 style={{ color: '#1a1a1a', marginBottom: '24px', fontSize: '24px', '@media (min-width: 768px)': { fontSize: '32px' } }}>⚙️ Settings & Configuration</h1>

      {/* TIMEZONE SECTION */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '2px solid #ec4899' }}>
        <h2 style={{ color: '#ec4899', marginTop: 0, fontSize: '16px' }}>🌍 Timezone</h2>
        <p style={{ color: '#999', fontSize: '13px', marginBottom: '16px' }}>Charlie'''s current location timezone</p>
        <select value={currentTimezone} onChange={(e) => updateTimezone(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box', fontSize: '14px', color: '#1a1a1a', marginBottom: '12px' }}>
          {timezones.map(tz => (<option key={tz} value={tz}>{tz}</option>))}
        </select>
        <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', fontSize: '12px', color: '#666' }}>📍 Current: <strong>{currentTimezone}</strong></div>
      </div>

      {/* VENTURES SECTION */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '2px solid #667eea' }}>
        <h2 style={{ color: '#667eea', marginTop: 0, fontSize: '16px' }}>🏢 Ventures</h2>
        
        <h4 style={{ color: '#1a1a1a', marginTop: '16px' }}>Create New Venture</h4>
        <input type="text" placeholder="Venture name..." value={newVentureName} onChange={(e) => setNewVentureName(e.target.value)} style={inputStyle} />
        <input type="text" placeholder="Description..." value={newVentureDesc} onChange={(e) => setNewVentureDesc(e.target.value)} style={inputStyle} />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input type="color" value={newVentureColor} onChange={(e) => setNewVentureColor(e.target.value)} style={{ width: '60px', height: '50px', minHeight: '44px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }} />
          <input type="text" value={newVentureColor} onChange={(e) => setNewVentureColor(e.target.value)} style={{...inputStyle, marginBottom: 0, flex: 1}} />
        </div>
        <button onClick={createVenture} style={{ width: '100%', padding: '14px 16px', minHeight: '48px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>+ Create Venture</button>

        <h4 style={{ color: '#1a1a1a', marginTop: '20px' }}>Ventures ({ventures.length})</h4>
        <input type="text" placeholder="Search..." value={ventureSearch} onChange={(e) => setVentureSearch(e.target.value)} style={inputStyle} />
        {filteredVentures.map(v => (
          <div key={v.id} style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editingVenture === v.id ? (
              <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px' }} />
                <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} style={{ width: '50px', height: '36px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }} />
                <button onClick={() => updateVenture(v.id)} style={{ padding: '10px 14px', minHeight: '44px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Save</button>
                <button onClick={() => setEditingVenture(null)} style={{ padding: '10px 14px', minHeight: '44px', background: '#ddd', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Cancel</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                  <div style={{ width: '24px', height: '24px', background: v.color, borderRadius: '4px' }}></div>
                  <div>
                    <div style={{ color: '#1a1a1a', fontSize: '14px', fontWeight: '600' }}>{v.name}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>{v.description}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => { setEditingVenture(v.id); setEditName(v.name); setEditDesc(v.description); setEditColor(v.color); }} style={{ padding: '10px 14px', minHeight: '44px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Edit</button>
                  <button onClick={() => deleteVenture(v.id)} style={{ padding: '10px 14px', minHeight: '44px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* PROJECTS SECTION */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '2px solid #10b981' }}>
        <h2 style={{ color: '#10b981', marginTop: 0, fontSize: '16px' }}>📁 Projects</h2>
        
        <h4 style={{ color: '#1a1a1a', marginTop: '16px' }}>Create New Project</h4>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '4px' }}>TAGS (optional)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', padding: '8px', background: '#f9f9f9', borderRadius: '6px', border: '1px solid #ddd' }}>
          {tags.map(t => (
            <button key={t.id} onClick={() => toggleProjectTag(t.id)} style={{ padding: '6px 12px', background: selectedProjectTags.includes(t.id) ? t.color : '#f0f0f0', color: selectedProjectTags.includes(t.id) ? '#fff' : '#1a1a1a', border: '2px solid ' + (selectedProjectTags.includes(t.id) ? t.color : '#ddd'), borderRadius: '20px', cursor: 'pointer', fontSize: '11px', fontWeight: selectedProjectTags.includes(t.id) ? '600' : '400', transition: 'all 0.2s' }}>{t.name}</button>
          ))}
        </div>
        
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '4px' }}>VENTURE</label>
        <select value={newProjectVenture} onChange={(e) => setNewProjectVenture(parseInt(e.target.value))} style={inputStyle}>
          {ventures.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <input type="text" placeholder="Project name..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} style={inputStyle} />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input type="color" value={newProjectColor} onChange={(e) => setNewProjectColor(e.target.value)} style={{ width: '60px', height: '50px', minHeight: '44px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }} />
          <input type="text" value={newProjectColor} onChange={(e) => setNewProjectColor(e.target.value)} style={{...inputStyle, marginBottom: 0, flex: 1}} />
        </div>
        <button onClick={createProject} style={{ width: '100%', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ Create Project</button>

        <h4 style={{ color: '#1a1a1a', marginTop: '20px' }}>Projects ({projects.length})</h4>
        <input type="text" placeholder="Search..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} style={inputStyle} />
        {filteredProjects.map(p => (
          <div key={p.id} style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editingProject === p.id ? (
              <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px' }} />
                <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} style={{ width: '50px', height: '36px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }} />
                <button onClick={() => updateProject(p.id)} style={{ padding: '10px 14px', minHeight: '44px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Save</button>
                <button onClick={() => setEditingProject(null)} style={{ padding: '10px 14px', minHeight: '44px', background: '#ddd', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Cancel</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                  <div style={{ width: '24px', height: '24px', background: p.color, borderRadius: '4px' }}></div>
                  <div>
                    <div style={{ color: '#1a1a1a', fontSize: '14px', fontWeight: '600' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: '#999' }}>🏢 {getVentureName(p.venture_id)}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => { setEditingProject(p.id); setEditName(p.name); setEditColor(p.color); }} style={{ padding: '4px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                  <button onClick={() => deleteProject(p.id)} style={{ padding: '10px 14px', minHeight: '44px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* TAGS SECTION */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '2px solid #f59e0b' }}>
        <h2 style={{ color: '#f59e0b', marginTop: 0, fontSize: '16px' }}>🏷️ Tags</h2>
        
        <h4 style={{ color: '#1a1a1a', marginTop: '16px' }}>Create New Tag</h4>
        <input type="text" placeholder="Tag name..." value={newTagName} onChange={(e) => setNewTagName(e.target.value)} style={inputStyle} />
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input type="color" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} style={{ width: '60px', height: '50px', minHeight: '44px', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer' }} />
          <input type="text" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} style={{...inputStyle, marginBottom: 0, flex: 1}} />
        </div>
        <button onClick={createTag} style={{ width: '100%', padding: '12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ Create Tag</button>

        <h4 style={{ color: '#1a1a1a', marginTop: '20px' }}>Tags ({tags.length})</h4>
        <input type="text" placeholder="Search..." value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} style={inputStyle} />
        {filteredTags.map(t => (
          <div key={t.id} style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {editingTag === t.id ? (
              <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '12px' }} />
                <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} style={{ width: '50px', height: '36px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }} />
                <button onClick={() => updateTag(t.id)} style={{ padding: '10px 14px', minHeight: '44px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Save</button>
                <button onClick={() => setEditingTag(null)} style={{ padding: '10px 14px', minHeight: '44px', background: '#ddd', color: '#333', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Cancel</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1 }}>
                  <div style={{ width: '24px', height: '24px', background: t.color, borderRadius: '4px' }}></div>
                  <span style={{ color: '#1a1a1a', fontSize: '14px' }}>{t.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => { setEditingTag(t.id); setEditName(t.name); setEditColor(t.color); }} style={{ padding: '4px 10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Edit</button>
                  <button onClick={() => deleteTag(t.id)} style={{ padding: '10px 14px', minHeight: '44px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
