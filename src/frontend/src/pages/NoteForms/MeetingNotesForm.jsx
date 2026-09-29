import { useState, useEffect, useRef } from 'react';
import { startVoiceInput } from '../../services/VoiceService';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

import '../NoteFormStyles.css';

export default function MeetingNotesForm({ onSave, onAnalysed }) {
  const [title, setTitle] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [content, setContent] = useState('');
  const [attendees, setAttendees] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [duration, setDuration] = useState('');
  const [transcript, setTranscript] = useState('');
  const [nextMeeting, setNextMeeting] = useState('');
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
      const americanFemale = availableVoices.findIndex(v => 
        (v.lang.includes('en-US')) && 
        (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman'))
      );
      if (americanFemale !== -1) setSelectedVoiceIndex(americanFemale);
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const handleVoiceInput = () => {
    if (isListening) {
      handleStopVoice();
      return;
    }
    setIsListening(true);
    setTempInterimText('');
    voiceStartContentRef.current = content;
    
    const result = startVoiceInput(
      (finalText) => {
        setContent(voiceStartContentRef.current + (voiceStartContentRef.current ? ' ' : '') + finalText);
        setTempInterimText('');
        setIsListening(false);
      },
      (error) => {
        console.error('Voice error:', error);
        setTempInterimText('');
        setIsListening(false);
      },
      (interimText) => {
        setTempInterimText(interimText);
      }
    );
    voiceRecognitionRef.current = result;
  };

  const handleStopVoice = () => {
    setIsListening(false);
    if (voiceRecognitionRef.current) {
      voiceRecognitionRef.current.stop();
    }
  };

  const speakText = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    if (!content.trim()) {
      alert('No text to read!');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    if (voices[selectedVoiceIndex]) {
      utterance.voice = voices[selectedVoiceIndex];
    }
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
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
        setContent(data.corrected);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingGrammar(false);
    }
  };

  

  const handleTextTransform = async (transformType, textToTransform) => {
    if (!textToTransform.trim()) {
      alert('Please write something first!');
      return;
    }
    setTransforming(true);
    try {
      const endpoint = `/api/text-${transformType}`;
      const response = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ text: textToTransform }),
      });
      const data = await response.json();
      if (response.ok) {
        setContent(data.transformed);
      } else {
        alert('Error transforming text');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTransforming(false);
    }
  };

  const handleGenerateTitle = async (textToUse) => {
    if (!textToUse.trim()) {
      alert('Please write something first!');
      return;
    }
    setTransforming(true);
    try {
      const response = await fetch(API + '/api/text-generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ text: textToUse }),
      });
      const data = await response.json();
      if (response.ok) {
        setTitle(data.title);
      } else {
        alert('Error generating title');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTransforming(false);
    }
  };

const handleTone = async (tone) => {
  if (!content.trim()) return;
  setTransforming(true);
  try {
    const response = await fetch(API + '/api/text-tone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
      body: JSON.stringify({ text: content, tone }),
    });
    const data = await response.json();
    if (response.ok) {
      setContent(data.transformed);
    }
  } catch (err) {
    console.error(err);
  } finally {
    setTransforming(false);
  }
};

const handleBulletPoints = async () => {
  if (!content.trim()) return;
  setTransforming(true);
  try {
    const response = await fetch(API + '/api/text-bullet-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
      body: JSON.stringify({ text: content }),
    });
    const data = await response.json();
    if (response.ok) {
      setContent(data.transformed);
    }
  } catch (err) {
    console.error(err);
  } finally {
    setTransforming(false);
  }
};

const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in title and content');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(API + '/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ami-Password': AMI_PASSWORD,
        },
        body: JSON.stringify({
          title,
          content,
          capture_type: 'Meeting Notes',
          meeting_attendees: attendees,
          meeting_time: meetingTime,
          meeting_duration: duration,
          next_meeting: nextMeeting,
        }),
      });

      if (response.ok) {
        const saved = await response.json().catch(() => ({}));
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
        setContent('');
        setAttendees('');
        setMeetingTime('');
        setDuration('');
        setNextMeeting('');
        onSave?.();
      } else {
        alert('Error saving note');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error saving note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="note-form meeting-notes-form">
      <h2>📝 Meeting Notes</h2>
      
      <input
        type="text"
        placeholder="Meeting Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="form-input"
      />

      <textarea
        placeholder="Meeting notes..."
        value={content + tempInterimText}
        onChange={(e) => setContent(e.target.value)}
        className="form-textarea"
        spellCheck="true"
      />

      <div className="field-group">
        <label>📝 Paste Teams/Zoom Transcript</label>
        <textarea
          placeholder="Paste meeting transcript here..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="form-textarea"
          style={{ minHeight: '120px' }}
        />
        <button onClick={() => { if (transcript.trim()) { setContent(content + '\n\n---TRANSCRIPT---\n' + transcript); setTranscript(''); } }} style={{ marginTop: '8px', padding: '8px 12px', background: '#666', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>✅ Add Transcript</button>
      </div>

      <div className="meeting-fields">
        <div className="field-group">
          <label>👥 Attendees</label>
          <input
            type="text"
            placeholder="John, Sarah, Mike..."
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="field-group">
          <label>🕐 Meeting Time</label>
          <input
            type="datetime-local"
            value={meetingTime}
            onChange={(e) => setMeetingTime(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="field-group">
          <label>⏱️ Duration</label>
          <input
            type="text"
            placeholder="e.g., 1 hour"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="field-group">
          <label>📞 Next Meeting</label>
          <input
            type="datetime-local"
            value={nextMeeting}
            onChange={(e) => setNextMeeting(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button onClick={speakText} style={{ padding: '10px 14px', background: speaking ? '#10b981' : '#10b981', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>{speaking ? '⏹️' : '🔊'}</button>
        <button onClick={handleVoiceInput} style={{ padding: '10px 14px', background: isListening ? '#ef4444' : '#667eea', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}>{isListening ? '⏹️ STOP' : '🎤'}</button>
        <button onClick={() => handleGrammarCheck(content)} disabled={checkingGrammar} style={{ padding: '10px 14px', background: checkingGrammar ? '#888' : '#10b981', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>{checkingGrammar ? '⏳ Checking...' : '✅ Grammar'}</button>
        <button onClick={() => handleTextTransform('expand', content)} disabled={transforming} style={{ padding: '10px 14px', background: transforming ? '#888' : '#3b82f6', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>{transforming ? '⏳ Expanding...' : '📝 Expand'}</button>
        <button onClick={() => handleTextTransform('professional', content)} disabled={transforming} style={{ padding: '10px 14px', background: transforming ? '#888' : '#3b82f6', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>{transforming ? '⏳ Processing...' : '💼 Professional'}</button>
        <button onClick={() => handleTextTransform('simplify', content)} disabled={transforming} style={{ padding: '10px 14px', background: transforming ? '#888' : '#3b82f6', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>{transforming ? '⏳ Simplifying...' : '✏️ Simplify'}</button>
        <button onClick={() => handleBulletPoints()} disabled={transforming} style={{ padding: '10px 14px', background: transforming ? '#888' : '#3b82f6', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>{transforming ? '⏳ Formatting...' : '📋 Bullets'}</button>
        <button onClick={() => handleGenerateTitle(content)} disabled={transforming} style={{ padding: '10px 14px', background: transforming ? '#888' : '#3b82f6', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>{transforming ? '⏳ Generating...' : '✨ Title'}</button>
        <button onClick={() => handleTone('formal')} disabled={transforming} style={{ padding: '10px 14px', background: transforming ? '#888' : '#3b82f6', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>{transforming ? '⏳ Changing...' : '📋 Tone'}</button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="save-btn"
      >
        {saving ? '⏳ Saving...' : '💾 Save & Analyze'}
      </button>
    </div>
  );
}
