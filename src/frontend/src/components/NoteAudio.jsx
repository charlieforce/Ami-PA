/* NoteAudio.jsx - the recording attached to a note, if there is one.
 *
 * Renders nothing at all when a note has no audio, so it is safe to drop
 * into any note view without conditioning the call site.
 *
 * Two details that matter more than they look:
 *
 *   preload="none".  Without it, every note in a list fetches its whole
 *   recording on render. Twenty notes at 11 MB an hour is not a page, it
 *   is a download. The browser fetches only when he presses play.
 *
 *   The password rides in the query string, because an <audio> tag cannot
 *   send a header any more than an <img> can. That is the same bargain
 *   the medical documents and exercise photos already make here, and
 *   Cloudflare Access is the real gate in front of all of it.
 *
 * Props
 *   note          the note object; only note.id and note.voice_url are read
 *   onRemoved()   optional, called after the audio is deleted
 */

import { useState } from 'react';

const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : ''));

export default function NoteAudio({ note, onRemoved }) {
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  const id = note && (note.id ?? note.note_id);
  const has = !!(note && (note.voice_url || '').trim());

  if (!id || !has || gone) return null;

  const src = `${API}/api/notes/${id}/voice?k=${encodeURIComponent(AMI_PASSWORD)}`;

  const remove = async () => {
    /* The words always survive - this drops the audio only. Worth saying
     * in the prompt, because "delete the recording" otherwise sounds like
     * it might take the note with it. */
    if (!window.confirm('Delete the recording? The note and its text stay.')) return;
    setBusy(true);
    setProblem('');
    try {
      const r = await fetch(`${API}/api/notes/${id}/voice`, {
        method: 'DELETE',
        headers: { 'X-Ami-Password': AMI_PASSWORD },
      });
      if (r.ok) {
        setGone(true);
        if (onRemoved) onRemoved(id);
      } else {
        setProblem(`Could not delete it (${r.status}).`);
      }
    } catch (e) {
      console.error(e);
      setProblem('Could not reach Ami.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      background: '#17171f',
      border: '1px solid #2a2a38',
      borderRadius: '10px',
      padding: '10px 12px',
      margin: '10px 0',
    }}>
      <div style={{
        fontSize: '11px',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '0.6px',
        fontWeight: 700,
        marginBottom: '8px',
      }}>
        🎙️ Recording
      </div>

      <audio
        controls
        preload="none"
        src={src}
        style={{ width: '100%', display: 'block' }}
        onError={() => setProblem('The recording could not be loaded.')}
      />

      {problem && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#f59e0b' }}>
          {problem}
        </p>
      )}

      <button
        onClick={remove}
        disabled={busy}
        style={{
          marginTop: '8px',
          padding: '6px 10px',
          background: 'transparent',
          border: '1px solid #3a3a4a',
          borderRadius: '4px',
          color: '#9aa0b4',
          fontSize: '11px',
          cursor: busy ? 'not-allowed' : 'pointer',
        }}
      >
        {busy ? 'Deleting…' : 'Delete recording, keep the note'}
      </button>
    </div>
  );
}
