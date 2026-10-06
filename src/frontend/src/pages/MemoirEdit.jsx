import { useState, useRef, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const EMOTIONS = ['😊 Happy', '😢 Sad', '😡 Angry', '😰 Anxious', '😴 Tired', '🥰 Loved', '😌 Peaceful', '🏆 Proud', '😒 Frustrated', '🤔 Confused', '🥺 Vulnerable', '🎉 Excited'];
const LIFE_STAGES = ['Childhood', 'Adolescence', 'School', 'College', 'Career', 'Military', 'Travel', 'Family', 'Romance', 'Health', 'Friendship', 'Other'];

export default function MemoirEdit({ memoirId, onSave, onBack }) {
  const [title, setTitle] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [content, setContent] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [people, setPeople] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState([]);
  const [lifeStage, setLifeStage] = useState('');
  const [lesson, setLesson] = useState('');
  const [privacy, setPrivacy] = useState('Personal');
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [tempInterimText, setTempInterimText] = useState('');
  const [checking, setChecking] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toast, setToast] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (memoirId) {
      loadMemoir();
    }
  }, [memoirId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadMemoir = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/notes/${memoirId}`, {
        headers: { 'X-Ami-Password': AMI_PASSWORD },
      });
      const data = await response.json();
      setTitle(data.title || '');
      setContent(data.content || '');
      setDate(data.memoir_date || '');
      setLocation(data.memoir_location || '');
      setPeople(data.memoir_people || '');
      setLifeStage(data.memoir_life_stage || '');
      setLesson(data.memoir_lesson || '');
      setPrivacy(data.memoir_privacy || 'Personal');
      try {
        setSelectedEmotions(JSON.parse(data.memoir_emotions || '[]'));
      } catch (e) {
        setSelectedEmotions([]);
      }
      setWordCount((data.content || '').split(/\s+/).filter(w => w).length);
    } catch (err) {
      console.error('Error loading memoir:', err);
      setToast('❌ Failed to load memoir');
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (e) => {
    const text = e.target.value;
    setContent(text);
    setWordCount(text.split(/\s+/).filter(w => w).length);
  };

  const handleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setContent(prev => prev + (prev ? ' ' : '') + transcript);
        } else {
          interim += transcript;
        }
      }
      setTempInterimText(interim);
    };

    recognition.start();
  };

  const handleSpeaker = () => {
    // Check if speech is currently happening
    const isSpeaking = window.speechSynthesis.speaking || window.speechSynthesis.paused;
    
    if (isSpeaking) {
      // Stop speaking
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    
    // Start speaking
    window.speechSynthesis.cancel(); // Clear any lingering speech
    const textToSpeak = content || 'Your memoir';
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    // his own writing, read in an American woman's voice
    const _vs = window.speechSynthesis.getVoices();
    const _v = _vs.find(v => /Samantha|Google US English|Ava|Allison|Susan|Zira/.test(v.name))
            || _vs.find(v => v.lang === 'en-US');
    if (_v) utterance.voice = _v;
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleSpellCheck = async () => {
    if (!content) {
      alert('Nothing to correct');
      return;
    }
    setChecking(true);
    try {
      const response = await fetch(API + '/api/grammar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ text: content }),
      });
      const data = await response.json();
      if (data.corrected && data.corrected !== content) {
        setContent(data.corrected);
        setWordCount(data.corrected.split(/\s+/).filter(w => w).length);
        setToast('✅ Text corrected!');
      } else {
        setToast('✅ Looks perfect!');
      }
    } catch (err) {
      console.error('Spell check error:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleGenerateTitle = async () => {
    if (!content) {
      alert('Write something first');
      return;
    }
    setTransforming(true);
    try {
      const response = await fetch(API + '/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ text: content }),
      });
      const data = await response.json();
      setTitle(data.title || 'Untitled Memoir');
      setToast('✨ Title generated!');
    } catch (err) {
      console.error('Title error:', err);
    } finally {
      setTransforming(false);
    }
  };

  const handleTextTransform = async (transformType) => {
    if (!content) return;
    setTransforming(true);
    try {
      const response = await fetch(API + '/api/transform-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ text: content, transform_type: transformType }),
      });
      const data = await response.json();
      setContent(data.transformed_text || content);
      setWordCount(data.transformed_text.split(/\s+/).filter(w => w).length);
      setToast('✏️ Text ' + transformType + 'ed!');
    } catch (err) {
      console.error('Transform error:', err);
    } finally {
      setTransforming(false);
    }
  };

  const handleUpdateMemoir = async () => {
    if (!title || !content) {
      alert('Title and story are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        content,
        memoir_date: date || null,
        memoir_location: location || null,
        memoir_people: people || null,
        memoir_emotions: JSON.stringify(selectedEmotions),
        memoir_life_stage: lifeStage || null,
        memoir_lesson: lesson || null,
        memoir_privacy: privacy,
      };

      const response = await fetch(`${API}/api/notes/${memoirId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setToast('✅ Memoir updated!');
        setTimeout(() => {
          onBack?.();
        }, 1000);
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error updating memoir');
    } finally {
      setSaving(false);
    }
  };

  const toggleEmotion = (emotion) => {
    setSelectedEmotions(prev =>
      prev.includes(emotion) 
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
  };

  if (loading) {
    return <div style={{ color: '#fff', padding: '20px' }}>Loading memoir...</div>;
  }

  return (
    <div style={{ color: '#fff', maxWidth: '100%', padding: '20px', boxSizing: 'border-box' }}>
      <button onClick={onBack} style={{ padding: '10px 16px', background: '#667eea', border: 'none', color: '#fff', borderRadius: '6px', cursor: 'pointer', marginBottom: '20px', fontWeight: 'bold' }}>
        ← Back
      </button>

      <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>✏️ Edit Memoir</h2>

      <input
        type="text"
        placeholder="Memoir title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: '100%', padding: '12px', marginBottom: '15px', background: '#2a2a2a', border: '1px solid #404040', color: '#fff', borderRadius: '6px', fontSize: '16px', boxSizing: 'border-box' }}
      />

      <textarea
        placeholder="Your story..."
        value={content + tempInterimText}
        onChange={handleContentChange}
        style={{ width: '100%', minHeight: '250px', maxHeight: '500px', overflowY: 'auto', padding: '12px', fontSize: '14px', fontFamily: 'monospace', border: '1px solid #404040', borderRadius: '6px', background: '#2a2a2a', color: '#fff', boxSizing: 'border-box', marginBottom: '15px' }}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#aaa' }}>📅 When?</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '10px', background: '#2a2a2a', border: '1px solid #404040', color: '#fff', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#aaa' }}>📍 Where?</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City..." style={{ width: '100%', padding: '10px', background: '#2a2a2a', border: '1px solid #404040', color: '#fff', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#aaa' }}>👥 People</label>
        <input type="text" value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Names..." style={{ width: '100%', padding: '10px', background: '#2a2a2a', border: '1px solid #404040', color: '#fff', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#aaa' }}>🏷️ Life Stage</label>
        <select value={lifeStage} onChange={(e) => setLifeStage(e.target.value)} style={{ width: '100%', padding: '10px', background: '#2a2a2a', border: '1px solid #404040', color: '#fff', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}>
          <option value="">Select...</option>
          {LIFE_STAGES.map(stage => (
            <option key={stage} value={stage}>{stage}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontSize: '12px', color: '#aaa' }}>😊 Emotions</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {EMOTIONS.map(emotion => (
            <button
              key={emotion}
              onClick={() => toggleEmotion(emotion)}
              style={{
                padding: '8px 12px',
                background: selectedEmotions.includes(emotion) ? '#667eea' : '#2a2a2a',
                border: selectedEmotions.includes(emotion) ? '2px solid #667eea' : '1px solid #404040',
                color: '#fff',
                borderRadius: '20px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: selectedEmotions.includes(emotion) ? 'bold' : 'normal',
              }}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#aaa' }}>💡 Key Lesson</label>
        <textarea
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          placeholder="What did you learn?"
          style={{ width: '100%', padding: '10px', background: '#2a2a2a', border: '1px solid #404040', color: '#fff', borderRadius: '6px', fontSize: '14px', minHeight: '80px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#aaa' }}>🔒 Privacy</label>
        <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} style={{ width: '100%', padding: '10px', background: '#2a2a2a', border: '1px solid #404040', color: '#fff', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}>
          <option value="Personal">Personal</option>
          <option value="Family Only">Family Only</option>
          <option value="Friends">Friends</option>
          <option value="Public">Public</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px', color: '#aaa', fontSize: '12px', paddingBottom: '15px', borderBottom: '1px solid #404040' }}>
        {wordCount} words
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => handleTextTransform('expand')} disabled={transforming} style={{ padding: '12px', background: transforming ? '#555' : '#667eea', border: 'none', color: '#fff', cursor: transforming ? 'not-allowed' : 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', opacity: transforming ? 0.6 : 1 }}>
          {transforming ? '⏳' : '📝'} Expand
        </button>
        <button onClick={() => handleTextTransform('simplify')} disabled={transforming} style={{ padding: '12px', background: transforming ? '#555' : '#667eea', border: 'none', color: '#fff', cursor: transforming ? 'not-allowed' : 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', opacity: transforming ? 0.6 : 1 }}>
          {transforming ? '⏳' : '✏️'} Simplify
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <button onClick={handleVoiceInput} style={{ padding: '12px', background: isListening ? '#ef4444' : '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
          {isListening ? '⏹️ Stop' : '🎤 Record'}
        </button>
        <button onClick={handleSpellCheck} disabled={checking} style={{ padding: '12px', background: checking ? '#555' : '#667eea', border: 'none', color: '#fff', cursor: checking ? 'not-allowed' : 'pointer', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', opacity: checking ? 0.6 : 1 }}>
          {checking ? '⏳' : '✅'} Spelling & Grammar
        </button>
        <button onClick={handleSpeaker} style={{ background: speaking ? '#667eea' : 'none', border: '1px solid #667eea', color: '#667eea', fontSize: '20px', cursor: 'pointer', padding: '12px', borderRadius: '6px', fontWeight: 'bold' }}>
          {speaking ? '⏹️' : '🔊'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        <button onClick={handleGenerateTitle} disabled={transforming} style={{ padding: '12px', background: transforming ? '#555' : '#667eea', border: 'none', color: '#fff', cursor: transforming ? 'not-allowed' : 'pointer', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', opacity: transforming ? 0.6 : 1 }}>
          {transforming ? '⏳' : '✨'} Generate Title
        </button>
        <button onClick={handleUpdateMemoir} disabled={saving} style={{ padding: '12px', background: saving ? '#555' : 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', opacity: saving ? 0.6 : 1 }}>
          {saving ? '⏳' : '💾'} Update
        </button>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#22c55e', color: '#fff', padding: '12px 20px', borderRadius: '8px', zIndex: 1000, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span>{toast}</span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px', padding: 0 }}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
