import { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function MemoirDocument({ memoirId, onBack }) {
  const [memoir, setMemoir] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemoir = async () => {
      try {
        const response = await fetch(`${API}/api/notes/${memoirId}`, {
          headers: { 'X-Ami-Password': AMI_PASSWORD }
        });
        if (response.ok) {
          const data = await response.json();
          setMemoir(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMemoir();
  }, [memoirId]);

  if (loading) return <div style={{color: '#fff', padding: '40px'}}>Loading...</div>;
  if (!memoir) return <div style={{color: '#fff', padding: '40px'}}>Memoir not found</div>;

  const emotions = Array.isArray(memoir.memoir_emotions) ? memoir.memoir_emotions : [];

  const handleExportWord = async () => {
    try {
      const response = await fetch(`${API}/api/notes/${memoirId}/export-docx`, {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${memoir.title}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Export failed');
      }
    } catch (err) {
      alert('Export error: ' + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{background: '#000', color: '#000', minHeight: '100vh', padding: '40px 0'}}>
      <div style={{position: 'fixed', top: 0, left: 0, right: 0, background: '#1a1a1a', padding: '15px 20px', display: 'flex', gap: '10px', zIndex: 1000, borderBottom: '1px solid #333', flexWrap: 'wrap'}}>
        <button onClick={onBack} style={{padding: '8px 14px', background: '#667eea', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px'}}>
          ← Back
        </button>
        <button onClick={handlePrint} style={{padding: '8px 14px', background: '#667eea', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px'}}>
          🖨️ Print
        </button>
        <button onClick={handleExportWord} style={{padding: '8px 14px', background: '#3b82f6', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px'}}>
          📄 Download as Word
        </button>
      </div>

      <div id="memoir-document" style={{maxWidth: '850px', margin: '80px auto 40px', background: '#fff', padding: '60px', lineHeight: '1.8', fontFamily: 'Georgia, serif', color: '#000', boxShadow: '0 0 20px rgba(0,0,0,0.3)'}}>
        
        <div style={{textAlign: 'center', marginBottom: '80px', paddingBottom: '40px', borderBottom: '1px solid #ddd'}}>
          <h1 style={{fontSize: '48px', margin: '40px 0 20px 0', fontWeight: 'bold'}}>{memoir.title}</h1>
          <p style={{fontSize: '16px', color: '#666'}}>A memoir</p>
          <p style={{fontSize: '14px', color: '#999', margin: '20px 0'}}>Created {new Date(memoir.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {(memoir.memoir_date || memoir.memoir_location || memoir.memoir_people || memoir.memoir_life_stage) && (
          <div style={{background: '#f9f9f9', padding: '30px', borderRadius: '8px', marginBottom: '40px', borderLeft: '4px solid #667eea'}}>
            <h3 style={{margin: '0 0 20px 0', fontSize: '16px', fontWeight: 'bold', color: '#333'}}>The Memory</h3>
            {memoir.memoir_date && <p style={{margin: '8px 0'}}><strong>When:</strong> {memoir.memoir_date}</p>}
            {memoir.memoir_location && <p style={{margin: '8px 0'}}><strong>Where:</strong> {memoir.memoir_location}</p>}
            {memoir.memoir_people && <p style={{margin: '8px 0'}}><strong>Who:</strong> {memoir.memoir_people}</p>}
            {memoir.memoir_life_stage && <p style={{margin: '8px 0'}}><strong>Life Stage:</strong> {memoir.memoir_life_stage}</p>}
          </div>
        )}

        <div style={{marginBottom: '50px', fontSize: '16px', lineHeight: '1.9', whiteSpace: 'pre-wrap', fontFamily: 'Caveat, cursive', fontSize: '20px'}}>
          {memoir.content}
        </div>

        {emotions.length > 0 && (
          <div style={{marginBottom: '40px'}}>
            <h3 style={{fontSize: '16px', fontWeight: 'bold', margin: '0 0 15px 0'}}>Emotions</h3>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
              {emotions.map((e, i) => (
                <span key={i} style={{background: '#f0f0f0', padding: '8px 14px', borderRadius: '20px', fontSize: '14px', border: '1px solid #ddd'}}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}

        {memoir.memoir_lesson && (
          <div style={{marginBottom: '40px', background: '#f9f9f9', padding: '25px', borderRadius: '8px', borderLeft: '4px solid #667eea'}}>
            <h3 style={{margin: '0 0 15px 0', fontSize: '16px', fontWeight: 'bold'}}>Key Lesson</h3>
            <p style={{margin: 0, fontSize: '15px', lineHeight: '1.7'}}>{memoir.memoir_lesson}</p>
          </div>
        )}

        <div style={{marginTop: '60px', paddingTop: '30px', borderTop: '1px solid #ddd', textAlign: 'center', color: '#999', fontSize: '12px'}}>
          <p>{memoir.memoir_privacy}</p>
          <p>End of Memoir</p>
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: #fff; }
          #memoir-document { box-shadow: none; margin: 0; }
          @page { size: A4; margin: 20mm; }
        }
      `}</style>
    </div>
  );
}
