import { useState, useEffect } from 'react';
import MemoirCapture from './MemoirCapture';
import MemoirLibrary from './MemoirLibrary';
import MemoirEdit from './MemoirEdit';
import MemoirView from './MemoirView';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function MemoirApp() {
  const [memoirs, setMemoirs] = useState([]);
  const [view, setView] = useState('library'); // 'library', 'capture', 'edit', 'view'
  const [selectedMemoir, setSelectedMemoir] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Fetch all memoirs
  const fetchMemoirs = async () => {
    setLoading(true);
    try {
      const response = await fetch(API + '/api/notes', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      if (response.ok) {
        const data = await response.json();
        const memoirNotes = (data.notes || []).filter(n => n.capture_type === 'Memoir');
        setMemoirs(memoirNotes);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemoirs();
  }, []);

  // Navigation handlers
  const handleNewMemoir = () => {
    setSelectedMemoir(null);
    setView('capture');
  };

  const handleEditMemoir = (memoir) => {
    setSelectedMemoir(memoir);
    setView('edit');
  };

  const handleViewMemoir = (memoir) => {
    setSelectedMemoir(memoir);
    setView('view');
  };

  const handleSaveMemoir = () => {
    setToast('✅ Memoir saved!');
    setTimeout(() => setToast(null), 2000);
    fetchMemoirs();
    setView('library');
  };

  return (
    <div style={{minHeight: '100vh', background: '#0f0f1e'}}>
      {/* Navigation */}
      <div style={{background: '#1a1a2e', padding: '20px', borderBottom: '2px solid #667eea'}}>
        <div style={{maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff'}}>
          <h1 style={{margin: 0, fontSize: '28px'}}>📖 My Memoirs</h1>
          {view === 'library' && (
            <button 
              onClick={handleNewMemoir}
              style={{padding: '10px 20px', background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px'}}
            >
              ✍️ New Memoir
            </button>
          )}
          {view !== 'library' && (
            <button 
              onClick={() => setView('library')}
              style={{padding: '10px 20px', background: '#2a2a3e', border: '1px solid #667eea', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px'}}
            >
              ← Back to Library
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{maxWidth: '1200px', margin: '0 auto', padding: '20px'}}>
        {view === 'library' && <MemoirLibrary memoirs={memoirs} onView={handleViewMemoir} onEdit={handleEditMemoir} onNew={handleNewMemoir} />}
        {view === 'capture' && <MemoirCapture onSave={handleSaveMemoir} onCancel={() => setView('library')} />}
        {view === 'edit' && selectedMemoir && <MemoirEdit memoirId={selectedMemoir.id} onSave={handleSaveMemoir} onBack={() => setView('library')} />}
        {view === 'view' && selectedMemoir && <MemoirView memoir={selectedMemoir} onEdit={() => handleEditMemoir(selectedMemoir)} onBack={() => setView('library')} />}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{position: 'fixed', bottom: '20px', right: '20px', background: '#22c55e', color: '#fff', padding: '12px 20px', borderRadius: '8px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '12px'}}>
          <span>{toast}</span>
          <button onClick={() => setToast(null)} style={{background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px', padding: 0}}>×</button>
        </div>
      )}
    </div>
  );
}

