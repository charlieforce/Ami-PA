import { useState } from 'react';

export default function MemoirLibrary({ memoirs, onView, onEdit, onNew }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMemoirs = memoirs.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.preview.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Search */}
      <div style={{marginBottom: '25px'}}>
        <input 
          type="text" 
          placeholder="Search your memoirs..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{width: '100%', padding: '12px', background: '#1a1a2e', border: '1px solid #333', color: '#fff', borderRadius: '8px', fontSize: '14px'}}
        />
      </div>

      {/* Grid */}
      {filteredMemoirs.length === 0 ? (
        <div style={{textAlign: 'center', padding: '60px', color: '#666'}}>
          <p style={{fontSize: '18px'}}>📚 No memoirs yet</p>
          <button 
            onClick={onNew}
            style={{marginTop: '20px', padding: '10px 20px', background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold'}}
          >
            ✍️ Create Your First Memoir
          </button>
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
          {filteredMemoirs.map(memoir => (
            <div 
              key={memoir.id}
              onClick={() => onView(memoir)}
              style={{background: '#1a1a2e', padding: '20px', borderRadius: '10px', cursor: 'pointer', border: '1px solid #333', transition: 'all 0.3s', transform: 'translateY(0)'}}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#667eea';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#333';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <h3 style={{margin: '0 0 8px 0', color: '#fff'}}>{memoir.title}</h3>
              <p style={{color: '#888', fontSize: '12px', margin: '0 0 10px 0'}}>📅 {memoir.created_at}</p>
              <p style={{color: '#ccc', fontSize: '13px', margin: 0, overflow: 'hidden', maxHeight: '50px', lineHeight: '1.5'}}>{memoir.preview}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
