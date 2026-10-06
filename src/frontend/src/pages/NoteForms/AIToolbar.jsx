import { useState } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AIToolbar({ text, setText, disabled = false }) {
  const [processing, setProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  // GRAMMAR & SPELLING CHECK
  const checkGrammar = async () => {
    if (!text.trim()) return;
    setProcessing(true);
    try {
      const response = await fetch(API + '/api/ami/grammar-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ text }),
      });
      if (response.ok) {
        const data = await response.json();
        alert(data.result || 'Grammar check complete');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  // TEXT-TO-SPEECH
  const readAloud = () => {
    if (!text.trim()) return;
    const utterance = new SpeechSynthesisUtterance(text);
    // his own writing, read in an American woman's voice
    const _vs = window.speechSynthesis.getVoices();
    const _v = _vs.find(v => /Samantha|Google US English|Ava|Allison|Susan|Zira/.test(v.name))
            || _vs.find(v => v.lang === 'en-US');
    if (_v) utterance.voice = _v;
    utterance.lang = 'en-US';
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
  };

  // VOICE INPUT - RECORD AUDIO
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        await transcribeAudio(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (blob) => {
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob);

      const response = await fetch(API + '/api/ami/transcribe', {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setText(text + (text ? ' ' : '') + data.transcript);
      }
    } catch (err) {
      console.error(err);
      alert('Transcription failed');
    } finally {
      setProcessing(false);
    }
  };

  // AI TRANSFORMS
  const aiTransform = async (transform) => {
    if (!text.trim()) return;
    setProcessing(true);
    try {
      const response = await fetch(API + '/api/ami/ai-transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ text, transform }),
      });
      if (response.ok) {
        const data = await response.json();
        setText(data.result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="ai-toolbar">
      <div className="ai-buttons">
        <button 
          onClick={checkGrammar} 
          disabled={processing || disabled}
          className="ai-btn"
          title="Check grammar & spelling"
        >
          ✅ Grammar
        </button>

        <button 
          onClick={readAloud}
          disabled={disabled}
          className="ai-btn"
          title="Read text aloud"
        >
          🔊 Read
        </button>

        <button 
          onClick={window.speechSynthesis.speaking ? stopReading : () => {}}
          disabled={!window.speechSynthesis.speaking || disabled}
          className="ai-btn"
          title="Stop reading"
        >
          ⏹️ Stop
        </button>

        {!isRecording ? (
          <button 
            onClick={startRecording} 
            disabled={processing || disabled}
            className="ai-btn"
            title="Record audio"
          >
            🎤 Record
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="ai-btn recording"
            title="Stop recording"
          >
            ⏹️ Stop Rec
          </button>
        )}
      </div>

      <div className="ai-transforms">
        <button onClick={() => aiTransform('expand')} disabled={processing || disabled} className="ai-btn-small">Expand</button>
        <button onClick={() => aiTransform('simplify')} disabled={processing || disabled} className="ai-btn-small">Simplify</button>
        <button onClick={() => aiTransform('professional')} disabled={processing || disabled} className="ai-btn-small">Professional</button>
        <button onClick={() => aiTransform('casual')} disabled={processing || disabled} className="ai-btn-small">Casual</button>
      </div>
    </div>
  );
}
