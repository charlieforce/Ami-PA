/* AIToolbar.jsx - the toolbar above a note's text field.
 *
 * Rewritten 19 November: the recording path now goes through
 * VoiceDictation, which owns getUserMedia once for the whole app.
 * Grammar, read-aloud and the four transforms are unchanged.
 *
 * Four real bugs in the old recording path, for the record:
 *
 *   setText(text + ...) closed over `text` as it was when Record was
 *   pressed, so anything typed WHILE dictating was overwritten when the
 *   transcript came back.  Now a functional update, and the transcript
 *   replaces only its own inserted text.
 *
 *   The stream was never stopped - no getTracks().stop() - so the
 *   microphone stayed open and the browser's recording indicator stayed
 *   lit after Stop.
 *
 *   recorder.start() with no timeslice means ondataavailable fires once,
 *   at the end, with everything held in a plain array.  A backgrounded
 *   phone loses the whole recording.
 *
 *   `if (response.ok)` with no else: a 401 or a 500 produced silence.
 *   alert() only ran on a thrown exception, which an HTTP error is not.
 */

import { useCallback, useRef, useState } from 'react';
import VoiceDictation, { discardSession } from '../../components/VoiceDictation';

const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : ''));

export default function AIToolbar({ text, setText, disabled = false }) {
  const [processing, setProcessing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState('');
  const insertedRef = useRef('');

  /* ------------------------------------------------ grammar & spelling */
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
      } else {
        alert('Grammar check failed (' + response.status + ')');
      }
    } catch (err) {
      console.error(err);
      alert('Grammar check failed');
    } finally {
      setProcessing(false);
    }
  };

  /* ------------------------------------------------------ read aloud */
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
    /* speechSynthesis does not re-render React, so the Stop button has to
     * be driven by state rather than by reading .speaking at render time. */
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  /* -------------------------------------------------------- dictation */

  /* Two stages, deliberately.  The live text lands in the box the moment
   * recording stops, so the note is usable immediately; the accurate
   * transcript swaps itself in when it arrives.  If the upload or the
   * transcription fails, the live version simply stays - it is never
   * cleared in the hope of something better. */
  const onDictationComplete = useCallback(async ({ session, text: live, interim, blob }) => {
    const draft = [live, interim].filter(Boolean).join(' ').trim();

    if (draft) {
      insertedRef.current = draft;
      setText(prev => (prev ? prev + ' ' : '') + draft);
    }

    if (!blob) {
      setStatus(draft ? '' : 'Nothing was recorded.');
      return;
    }

    setProcessing(true);
    setStatus(draft ? 'Tidying up the transcript…' : 'Transcribing…');

    try {
      const formData = new FormData();
      /* Name the file so the extension matches what was actually recorded.
       * Safari produces mp4, not webm, and the old code hardcoded webm. */
      const ext = (blob.type || '').includes('mp4') ? 'm4a' : 'webm';
      formData.append('audio', blob, `dictation.${ext}`);

      const response = await fetch(API + '/api/ami/transcribe', {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD },
        body: formData,
      });

      if (!response.ok) {
        /* Silence here is what made the old version baffling: you spoke,
         * nothing appeared, and nothing said why. */
        setStatus(
          draft
            ? `Kept the live text — transcription failed (${response.status}).`
            : `Transcription failed (${response.status}).`
        );
        return;
      }

      const data = await response.json();
      const accurate = (data.transcript || '').trim();

      if (!accurate) {
        setStatus(draft ? 'Kept the live text.' : 'Nothing was heard.');
        return;
      }

      if (insertedRef.current) {
        /* Replace only our own insertion, and only if it is still there
         * untouched - if he has edited it since, leave his version alone
         * and append instead. */
        const mine = insertedRef.current;
        setText(prev =>
          prev.includes(mine)
            ? prev.replace(mine, accurate)
            : (prev ? prev + ' ' : '') + accurate
        );
      } else {
        setText(prev => (prev ? prev + ' ' : '') + accurate);
      }

      insertedRef.current = '';
      setStatus('');

      /* The text is safely in the box, so the local chunks can go.
       * Until this point they are the only copy that survives a crash. */
      discardSession(session);
    } catch (err) {
      console.error(err);
      setStatus(
        draft
          ? 'Kept the live text — could not reach Ami.'
          : 'Could not reach Ami to transcribe that.'
      );
    } finally {
      setProcessing(false);
    }
  }, [setText]);

  /* --------------------------------------------------- AI transforms */
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
      } else {
        alert('That transform failed (' + response.status + ')');
      }
    } catch (err) {
      console.error(err);
      alert('That transform failed');
    } finally {
      setProcessing(false);
    }
  };

  /* --------------------------------------------------------- render */
  return (
    <div className="ai-toolbar">
      <div className="ai-dictation">
        <VoiceDictation
          onComplete={onDictationComplete}
          onError={(e) => setStatus(e.message)}
        />
        {status && <p className="ai-status">{status}</p>}
      </div>

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
          disabled={disabled || speaking}
          className="ai-btn"
          title="Read text aloud"
        >
          🔊 Read
        </button>

        <button
          onClick={stopReading}
          disabled={!speaking || disabled}
          className="ai-btn"
          title="Stop reading"
        >
          ⏹️ Stop
        </button>
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
