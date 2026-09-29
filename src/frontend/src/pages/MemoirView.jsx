import { useState, useEffect, useRef } from 'react';
import MemoirDocument from './MemoirDocument';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function MemoirView({ memoir, onEdit, onBack }) {
  const [fullMemoir, setFullMemoir] = useState(memoir);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [html2pdfReady, setHtml2pdfReady] = useState(false);
  const [showDocumentView, setShowDocumentView] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakingRef = useRef(false);

  useEffect(() => {
    // Load html2pdf library
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => {
      console.log('html2pdf loaded');
      setHtml2pdfReady(true);
    };
    script.onerror = () => {
      console.error('Failed to load html2pdf');
    };
    document.head.appendChild(script);

    // Load Caveat font
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }, []);

  useEffect(() => {
    const fetchFull = async () => {
      try {
        const response = await fetch(`${API}/api/notes/${memoir.id}`, {
          headers: { 'X-Ami-Password': AMI_PASSWORD }
        });
        if (response.ok) {
          const data = await response.json();
          setFullMemoir(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFull();
  }, [memoir.id]);

  if (showDocumentView) return <MemoirDocument memoirId={memoir.id} onBack={() => setShowDocumentView(false)} />;

  if (loading) return <div style={{color: '#fff', padding: '40px'}}>Loading memoir...</div>;

  const emotions = Array.isArray(fullMemoir.memoir_emotions) 
    ? fullMemoir.memoir_emotions 
    : [];

  const handleDelete = async () => {
    if (!confirm('Delete this memoir forever?')) return;
    try {
      await fetch(`${API}/api/notes/${fullMemoir.id}`, {
        method: 'DELETE',
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      onBack();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleExportPDF = async () => {
    if (!html2pdfReady) {
      alert('PDF library still loading... try again in a moment');
      return;
    }

    const element = document.getElementById('memoir-content');
    if (!element) return;

    try {
      const { html2pdf } = window;
      if (!html2pdf) {
        alert('PDF library not available');
        return;
      }

      const opt = {
        margin: 10,
        filename: `${fullMemoir.title}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };

      html2pdf().set(opt).from(element).save();
      console.log('PDF exported successfully');
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to export PDF: ' + err.message);
    }
  };

  return (
    <div style={{color: '#fff', maxWidth: '900px', margin: '0 auto', paddingBottom: '40px'}}>
      <div style={{marginBottom: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
        <button 
          onClick={() => setShowDocumentView(true)}
          style={{padding: '10px 16px', background: '#8b5cf6', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px'}}
        >
          📖 View as Document
        </button>

        <button 
          onClick={() => onEdit(fullMemoir)}
          style={{padding: '10px 16px', background: '#667eea', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px'}}
        >
          ✏️ Edit
        </button>
        <button 
          onClick={handleDelete}
          style={{padding: '10px 16px', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px'}}
        >
          🗑️ Delete
        </button>
      </div>

      <div id="memoir-content" style={{background: 'linear-gradient(135deg, #1a1a2e, #2a2a3e)', padding: '50px', borderRadius: '12px', color: '#fff'}}>
        
        <h1 style={{margin: '0 0 10px 0', fontSize: '40px', background: 'linear-gradient(135deg, #667eea, #764ba2)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>
          {fullMemoir.title}
        </h1>
        <p style={{color: '#888', margin: '0 0 40px 0', fontSize: '13px'}}>📅 {fullMemoir.created_at}</p>

        {(fullMemoir.memoir_date || fullMemoir.memoir_location || fullMemoir.memoir_people || fullMemoir.memoir_life_stage) && (
          <div style={{display: 'flex', gap: '15px', marginBottom: '40px', flexWrap: 'wrap'}}>
            {fullMemoir.memoir_date && (
              <div style={{flex: 1, minWidth: '150px', background: '#0f0f1e', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #f59e0b'}}>
                <p style={{color: '#f59e0b', fontSize: '11px', margin: '0 0 8px 0', textTransform: 'uppercase'}}>📅 When</p>
                <p style={{margin: 0, fontSize: '14px'}}>{fullMemoir.memoir_date}</p>
              </div>
            )}
            {fullMemoir.memoir_location && (
              <div style={{flex: 1, minWidth: '150px', background: '#0f0f1e', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #06b6d4'}}>
                <p style={{color: '#06b6d4', fontSize: '11px', margin: '0 0 8px 0', textTransform: 'uppercase'}}>📍 Where</p>
                <p style={{margin: 0, fontSize: '14px'}}>{fullMemoir.memoir_location}</p>
              </div>
            )}
            {fullMemoir.memoir_people && (
              <div style={{flex: 1, minWidth: '150px', background: '#0f0f1e', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #ec4899'}}>
                <p style={{color: '#ec4899', fontSize: '11px', margin: '0 0 8px 0', textTransform: 'uppercase'}}>👥 Who</p>
                <p style={{margin: 0, fontSize: '14px'}}>{fullMemoir.memoir_people}</p>
              </div>
            )}
            {fullMemoir.memoir_life_stage && (
              <div style={{flex: 1, minWidth: '150px', background: '#0f0f1e', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #8b5cf6'}}>
                <p style={{color: '#8b5cf6', fontSize: '11px', margin: '0 0 8px 0', textTransform: 'uppercase'}}>🏷️ Life Stage</p>
                <p style={{margin: 0, fontSize: '14px'}}>{fullMemoir.memoir_life_stage}</p>
              </div>
            )}
          </div>
        )}

        <div style={{background: '#0f0f1e', padding: '40px', borderRadius: '12px', marginBottom: '40px', borderLeft: '4px solid #667eea', lineHeight: '2', fontFamily: 'Caveat, cursive', fontSize: '22px', color: '#e0e0e0', minHeight: '250px'}}>
          <p style={{whiteSpace: 'pre-wrap', margin: 0}}>{fullMemoir.content}</p>
        </div>

        {emotions.length > 0 && (
          <div style={{marginBottom: '40px'}}>
            <p style={{color: '#10b981', fontSize: '12px', margin: '0 0 15px 0', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px'}}>😊 Emotional Sentiment</p>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '12px'}}>
              {emotions.map((e, i) => (
                <div key={i} style={{background: 'linear-gradient(135deg, #667eea, #764ba2)', padding: '10px 18px', borderRadius: '25px', fontSize: '13px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'}}>
                  {e}
                </div>
              ))}
            </div>
          </div>
        )}

        {fullMemoir.memoir_lesson && (
          <div style={{background: '#0f0f1e', padding: '25px', borderRadius: '12px', marginBottom: '40px', borderLeft: '4px solid #06b6d4'}}>
            <p style={{color: '#06b6d4', fontSize: '12px', margin: '0 0 12px 0', textTransform: 'uppercase', fontWeight: 'bold'}}>💡 Key Lesson</p>
            <p style={{margin: 0, fontSize: '15px', lineHeight: '1.7'}}>{fullMemoir.memoir_lesson}</p>
          </div>
        )}

        {fullMemoir.memoir_privacy && (
          <div style={{background: '#0f0f1e', padding: '15px', borderRadius: '8px', marginBottom: '40px', borderLeft: '3px solid #8b5cf6', display: 'inline-block'}}>
            <p style={{color: '#8b5cf6', fontSize: '11px', margin: '0 0 6px 0'}}>🔒 Privacy</p>
            <p style={{margin: 0, fontWeight: 'bold'}}>{fullMemoir.memoir_privacy}</p>
          </div>
        )}
      </div>
    </div>
  );
}