import { useState, useEffect, useRef } from 'react';
import { startVoiceInput } from '../../services/VoiceService';
import '../NoteFormStyles.css';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function BrainstormForm({ onSave, onAnalysed }) {
  const [title, setTitle] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [ideas, setIdeas] = useState(['']);
  const [saving, setSaving] = useState(false);
  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [tempInterimText, setTempInterimText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const voiceRecognitionRef = useRef(null);
  const voiceStartContentRef = useRef('');



  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      const americanFemale = availableVoices.findIndex(v => (v.lang.includes('en-US')) && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman')));
      if (americanFemale !== -1) setSelectedVoiceIndex(americanFemale);
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const handleVoiceInput = () => {
    if (isListening) { handleStopVoice(); return; }
    setIsListening(true);
    setTempInterimText('');
    voiceStartContentRef.current = challenge;
    const result = startVoiceInput((finalText) => {
      setChallenge(voiceStartContentRef.current + (voiceStartContentRef.current ? ' ' : '') + finalText);
      setTempInterimText('');
      setIsListening(false);
    }, (error) => {
      console.error('Voice error:', error);
      setTempInterimText('');
      setIsListening(false);
    }, (interimText) => {
      setTempInterimText(interimText);
    });
    voiceRecognitionRef.current = result;
  };

  const handleStopVoice = () => {
    setIsListening(false);
    if (voiceRecognitionRef.current) voiceRecognitionRef.current.stop();
  };

  const speakText = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (!challenge.trim()) { alert('No text to read!'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(challenge);
    // his own writing, read in an American woman's voice
    const _vs = window.speechSynthesis.getVoices();
    const _v = _vs.find(v => /Samantha|Google US English|Ava|Allison|Susan|Zira/.test(v.name))
            || _vs.find(v => v.lang === 'en-US');
    if (_v) utterance.voice = _v;
    utterance.lang = 'en-US';
    if (voices[selectedVoiceIndex]) utterance.voice = voices[selectedVoiceIndex];
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const updateIdea = (i, text) => {
    const newIdeas = [...ideas];
    newIdeas[i] = text;
    setIdeas(newIdeas);
  };

  const addIdea = () => {
    setIdeas([...ideas, '']);
  };

  const removeIdea = (i) => {
    setIdeas(ideas.filter((_, idx) => idx !== i));
  };

  
  const handleGrammarCheck = async (textToCheck) => {
    if (!textToCheck.trim()) {
      alert('Please write something first!');
      return;
    }
    setCheckingGrammar(true);
    try {
      const response = await fetch(API + '/api/grammar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ text: textToCheck }),
      });
      const data = await response.json();
      if (response.ok) {
        setStory(data.corrected);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingGrammar(false);
    }
  };

  const handleTextTransform = async (transformType, textToTransform) => {
    if (!textToTransform.trim()) return;
    setTransforming(true);
    try {
      const response = await fetch(`${API}/api/text-${transformType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ text: textToTransform }),
      });
      const data = await response.json();
      if (response.ok) {
        setStory(data.transformed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTransforming(false);
    }
  };

  const handleGenerateTitle = async (textToUse) => {
    if (!textToUse.trim()) return;
    setTransforming(true);
    try {
      const response = await fetch(API + '/api/text-generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ text: textToUse }),
      });
      const data = await response.json();
      if (response.ok && data.title) {
        setTitle(data.title);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTransforming(false);
    }
  };

const handleSave = async () => {
    if (!title.trim() || !challenge.trim()) {
      alert('Need title and challenge!');
      return;
    }

    const ideaList = ideas.filter(i => i.trim()).map((idea, i) => `${i+1}. ${idea}`).join('\n');
    const content = `Challenge: ${challenge}\n\nIdeas:\n${ideaList}`;

    setSaving(true);
    try {
      const res = await fetch(API + '/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ title, content, capture_type: 'Brainstorm' }),
      });
      if (res.ok) {
        const saved = await res.json().catch(() => ({}));
        const newId = saved.id || saved.note_id;
        try {
          const ar = await fetch(API + '/api/notes/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
            body: JSON.stringify({ title, content })
          });
          const aj = await ar.json();
          if (aj.extracted && newId) {
            await fetch(`${API}/api/notes/${newId}/analysis`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
              body: JSON.stringify({ analysis: {
                ...aj.extracted,
                pushed: { tasks: [], reminders: [], todos: [] },
                dismissed: { tasks: [], reminders: [], todos: [] }
              } })
            });
          }
          if (onAnalysed && newId) {
            onAnalysed({ id: newId, title, content });
          }
        } catch (e) {
          console.error('Analysis failed:', e);
        }
        setTitle('');
        setChallenge('');
        setIdeas(['']);
        onSave?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="brainstorm-clean">
      <input 
        type="text" 
        placeholder="Brainstorm Title" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)} 
        className="brain-title"
      />
      
      <textarea 
        placeholder="What's the challenge?" 
        value={challenge + tempInterimText} 
        onChange={(e) => setChallenge(e.target.value)} 
        className="brain-textarea"
      />

      <div className="ideas-list">
        {ideas.map((idea, i) => (
          <div key={i} className="idea-row">
            <input
              type="text"
              placeholder={`Idea ${i + 1}`}
              value={idea}
              onChange={(e) => updateIdea(i, e.target.value)}
              className="idea-text"
            />
            {ideas.length > 1 && (
              <button onClick={() => removeIdea(i)} className="remove-btn">✕</button>
            )}
          </div>
        ))}
      </div>

      <button onClick={addIdea} className="add-btn">+ Add Idea</button>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button onClick={speakText} style={{ padding: '10px 14px', background: speaking ? '#10b981' : '#10b981', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>{speaking ? '⏹️' : '🔊'}</button>
        <button onClick={handleVoiceInput} style={{ padding: '10px 14px', background: isListening ? '#ef4444' : '#667eea', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{isListening ? '⏹️ STOP' : '🎤'}</button>
        <button onClick={() => handleGrammarCheck(challenge)} disabled={checkingGrammar} style={{ padding: '10px 14px', background: checkingGrammar ? '#888' : '#10b981', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>{checkingGrammar ? '⏳ Checking...' : '✅ Grammar'}</button>
        <button onClick={() => handleTextTransform('expand', challenge)} disabled={transforming} style={{ padding: '10px 14px', background: transforming ? '#888' : '#3b82f6', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>📝 Expand</button>
        <button onClick={() => handleTextTransform('professional', challenge)} disabled={transforming} style={{ padding: '10px 14px', background: transforming ? '#888' : '#3b82f6', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>💼 Professional</button>
        <button onClick={() => handleTextTransform('simplify', challenge)} disabled={transforming} style={{ padding: '10px 14px', background: transforming ? '#888' : '#3b82f6', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>✏️ Simplify</button>
        <button onClick={() => handleGenerateTitle(challenge)} disabled={transforming} style={{ padding: '10px 14px', background: transforming ? '#888' : '#3b82f6', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>✨ Title</button>
      </div>

      <button onClick={handleSave} disabled={saving} className="save-btn">
        {saving ? '⏳ Saving...' : '💾 Save'}
      </button>
    </div>
  );
}
