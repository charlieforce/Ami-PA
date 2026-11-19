import { useState, useEffect, useCallback, useRef } from 'react';
import VoiceDictation, { discardSession } from '../../components/VoiceDictation';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : ''));

import '../NoteFormStyles.css';

/* Dictation rewritten 19 November.  What changed and why:
 *
 *   startVoiceInput (VoiceService) gave live text and kept NO audio, so a
 *   misheard name could never be checked against anything.  Now the audio
 *   is recorded alongside, chunked to IndexedDB so a backgrounded phone
 *   cannot lose it, and sent to /api/ami/transcribe for an accurate pass
 *   that replaces the rough one.  If that fails the live text stays.
 *
 *   voiceStartContentRef captured `content` when the mic opened and then
 *   wrote startContent + finalText - so ANYTHING TYPED WHILE DICTATING
 *   WAS DISCARDED.  Now functional updates, and the transcript replaces
 *   only its own insertion, and only if it is still there untouched.
 *
 *   The final-result callback set isListening(false), making dictation
 *   one-shot: pause for breath and it ended.  The new component restarts
 *   recognition itself and keeps recording throughout.
 *
 *   value={content + tempInterimText} put the interim guess into the
 *   textarea's value while onChange wrote only to content.  The interim
 *   now lives in the dictation panel, so the box holds only real text.
 *
 * The upload helper below is deliberately local for now.  It is wanted in
 * BrainstormForm and QuickNotesForm too, and gets lifted into one shared
 * place when those are done - rather than becoming a fourth copy first.
 */

export default function MeetingNotesForm({ onSave, onAnalysed }) {
  const [title, setTitle] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [content, setContent] = useState('');
  const [attendees, setAttendees] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [lastTime, setLastTime] = useState(null);

  // he meets the same people often. what they owed him is what goes quiet.
  useEffect(() => {
    const who = (attendees || '').split(/[,;]/)[0].trim();
    if (who.length < 2) { setLastTime(null); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(API + '/api/meetings/history?who=' + encodeURIComponent(who),
                              { headers: { 'X-Ami-Password': AMI_PASSWORD } });
        const j = await r.json();
        const h = (j.history || [])[0];
        setLastTime(h && (h.he_owed?.length || h.waiting_on?.length || h.decided?.length)
                    ? h : null);
      } catch (e) { setLastTime(null); }
    }, 700);
    return () => clearTimeout(t);
  }, [attendees]);
  const [duration, setDuration] = useState('');
  const [transcript, setTranscript] = useState('');
  const [nextMeeting, setNextMeeting] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkingGrammar, setCheckingGrammar] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const [dictationStatus, setDictationStatus] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const insertedRef = useRef('');

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

  /* ---------------------------------------------------------- dictation */

  const onDictationComplete = useCallback(async ({ session, text: live, interim, blob }) => {
    const draft = [live, interim].filter(Boolean).join(' ').trim();

    /* The note has to be usable before the transcript arrives, so the live
     * text goes in immediately. */
    if (draft) {
      insertedRef.current = draft;
      setContent(prev => (prev ? prev + ' ' : '') + draft);
    }

    if (!blob) {
      setDictationStatus(draft ? '' : 'Nothing was recorded.');
      return;
    }

    setDictationStatus(draft ? 'Tidying up the transcript…' : 'Transcribing…');

    try {
      const formData = new FormData();
      /* Safari records mp4, not webm. The old code hardcoded webm, which
       * mislabels the file for whatever reads it next. */
      const ext = (blob.type || '').includes('mp4') ? 'm4a' : 'webm';
      formData.append('audio', blob, `meeting.${ext}`);

      const response = await fetch(API + '/api/ami/transcribe', {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD },
        body: formData,
      });

      if (!response.ok) {
        setDictationStatus(draft
          ? `Kept the live text — transcription failed (${response.status}).`
          : `Transcription failed (${response.status}).`);
        return;
      }

      const data = await response.json();
      const accurate = (data.transcript || '').trim();
      if (!accurate) {
        setDictationStatus(draft ? 'Kept the live text.' : 'Nothing was heard.');
        return;
      }

      const mine = insertedRef.current;
      setContent(prev =>
        (mine && prev.includes(mine))
          ? prev.replace(mine, accurate)
          : (prev ? prev + ' ' : '') + accurate
      );
      insertedRef.current = '';
      setDictationStatus('');

      /* Only now are the local chunks redundant. Until this point they are
       * the only copy that survives a crash. */
      discardSession(session);
    } catch (err) {
      console.error(err);
      setDictationStatus(draft
        ? 'Kept the live text — could not reach Ami.'
        : 'Could not reach Ami to transcribe that.');
    }
  }, []);

  /* ------------------------------------------------------------ speech */

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
        setDictationStatus('');
        insertedRef.current = '';
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
      {lastTime && (
        <div style={{ background: '#1d1d28', border: '1px solid #33334a',
                      borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase',
                        letterSpacing: '0.6px', fontWeight: 700, marginBottom: '6px' }}>
            Last time ({lastTime.when})
          </div>
          {(lastTime.waiting_on || []).map((x, i) => (
            <div key={'w' + i} style={{ fontSize: '13px', color: '#a78bfa' }}>
              You were waiting on: {typeof x === 'string' ? x : (x.what || x.title || '')}
            </div>
          ))}
          {(lastTime.he_owed || []).map((x, i) => (
            <div key={'o' + i} style={{ fontSize: '13px', color: '#f59e0b' }}>
              You said you would: {typeof x === 'string' ? x : (x.what || x.title || '')}
            </div>
          ))}
          {(lastTime.decided || []).slice(0, 2).map((x, i) => (
            <div key={'d' + i} style={{ fontSize: '13px', color: '#10b981' }}>
              Agreed: {typeof x === 'string' ? x : (x.what || x.title || '')}
            </div>
          ))}
        </div>
      )}
      <h2>📝 Meeting Notes</h2>

      <input
        type="text"
        placeholder="Meeting Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="form-input"
      />

      <div style={{ background: '#17171f', border: '1px solid #2a2a38',
                    borderRadius: '10px', padding: '10px 12px', marginBottom: '10px' }}>
        <VoiceDictation
          onComplete={onDictationComplete}
          onError={(e) => setDictationStatus(e.message)}
        />
        {dictationStatus && (
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#9aa0b4' }}>
            {dictationStatus}
          </p>
        )}
      </div>

      <textarea
        placeholder="Meeting notes..."
        value={content}
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
        <button onClick={() => { if (transcript.trim()) { setContent(prev => prev + '\n\n---TRANSCRIPT---\n' + transcript); setTranscript(''); } }} style={{ marginTop: '8px', padding: '8px 12px', background: '#666', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '12px' }}>✅ Add Transcript</button>
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
