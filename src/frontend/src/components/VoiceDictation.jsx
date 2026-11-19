/* VoiceDictation.jsx - the one place in the app that opens the microphone.
 *
 * Design: claude/notes-dictation-design.md, 7 November.  The decisions
 * this file implements, and why, because each one came from a measured
 * result rather than a preference:
 *
 *   ONE STREAM, TWO CONSUMERS.  getUserMedia is called once.  MediaRecorder
 *   gets the audio, SpeechRecognition gets live words.  Measured 7 Nov on
 *   the real origin: no contention, audio actually ran FASTER with both
 *   running (12,986 -> 17,147 bytes/sec).  Four separate SpeechRecognition
 *   implementations already exist in this app and one MediaRecorder; this
 *   component is meant to end that, so do not add a fifth.
 *
 *   CHUNKS TO INDEXEDDB, NOT MEMORY.  A phone suspends a backgrounded tab
 *   and a recording held in memory dies with it.  Every chunk is written
 *   as it arrives.  This is the single most likely way the feature loses
 *   trust, so it is not an optimisation.
 *
 *   WAIT BEFORE FREEZING THE TEXT.  The 7 Nov test logged a final
 *   recognition result arriving HALF A SECOND after everything was
 *   stopped.  Closing eagerly drops the last sentence.
 *
 *   RESTART RECOGNITION WHEN IT ENDS ITSELF.  It did not stop once in the
 *   15-second test, but it will over twenty minutes - Chrome ends a
 *   session after a stretch of silence.  Without the restart, a meeting
 *   gets live text for the first few minutes and silence after.
 *
 *   THE NOTE MUST BE USABLE BEFORE THE TRANSCRIPT ARRIVES.  onComplete
 *   fires with the live text and the audio; the caller saves immediately
 *   and swaps in the accurate transcript later, keeping the live version
 *   if transcription fails.
 *
 * Deliberately knows nothing about this app: no API calls, no auth, no
 * note shape.  It records and hands back.  The caller does the rest, so
 * this file can be tested on its own and cannot break notes.
 *
 * Props
 *   onComplete({ text, interim, blob, mimeType, durationMs, chunkCount })
 *   onError(Error)            optional
 *   onStateChange(state)      optional - idle|arming|recording|finishing|error
 *   lang                      default 'en-US'.  English only, by decision:
 *                             Krio is poorly supported and the words that
 *                             would break are people's names.
 *   maxMs                     hard stop, default 2 hours
 *   className
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import './VoiceDictation.css';

const DB_NAME = 'ami-dictation';
const DB_VERSION = 1;
const STORE = 'chunks';
const TIMESLICE_MS = 3000;
const TRAILING_WAIT_MS = 1200;   // measured worst case was ~500ms
const DEFAULT_MAX_MS = 2 * 60 * 60 * 1000;

/* ---------------------------------------------------------------- store */

function openDb() {
  return new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(e);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        os.createIndex('session', 'session', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putChunk(db, session, seq, blob) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({ session, seq, blob });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function readChunks(db, session) {
  return new Promise((resolve, reject) => {
    const out = [];
    const tx = db.transaction(STORE, 'readonly');
    const idx = tx.objectStore(STORE).index('session');
    const cur = idx.openCursor(IDBKeyRange.only(session));
    cur.onsuccess = () => {
      const c = cur.result;
      if (c) {
        out.push(c.value);
        c.continue();
      } else {
        out.sort((a, b) => a.seq - b.seq);
        resolve(out.map((r) => r.blob));
      }
    };
    cur.onerror = () => reject(cur.error);
    tx.onerror = () => reject(tx.error);
  });
}

function dropSession(db, session) {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    const idx = tx.objectStore(STORE).index('session');
    const cur = idx.openCursor(IDBKeyRange.only(session));
    cur.onsuccess = () => {
      const c = cur.result;
      if (c) {
        c.delete();
        c.continue();
      }
    };
    tx.oncomplete = resolve;
    tx.onerror = resolve;          // best effort; never block a save
  });
}

/* Any earlier session still sitting in the store is a recording that was
 * interrupted - a killed tab, a crash, a closed laptop.  The caller is
 * told so it can offer them back rather than silently binning them. */
export async function orphanedSessions() {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const seen = new Map();
      const tx = db.transaction(STORE, 'readonly');
      const cur = tx.objectStore(STORE).openCursor();
      cur.onsuccess = () => {
        const c = cur.result;
        if (c) {
          const v = c.value;
          const e = seen.get(v.session) || { session: v.session, chunks: 0 };
          e.chunks += 1;
          seen.set(v.session, e);
          c.continue();
        } else {
          resolve([...seen.values()]);
        }
      };
      cur.onerror = () => resolve([]);
      tx.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function recoverSession(session) {
  const db = await openDb();
  const parts = await readChunks(db, session);
  if (!parts.length) return null;
  return new Blob(parts, { type: parts[0].type || 'audio/webm' });
}

export async function discardSession(session) {
  try {
    const db = await openDb();
    await dropSession(db, session);
  } catch { /* nothing to do */ }
}

/* ------------------------------------------------------------- support */

function pickRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const wanted = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',                 // Safari
    'audio/ogg;codecs=opus',
  ];
  for (const t of wanted) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch { /* older browsers throw */ }
  }
  return '';
}

export function dictationSupport() {
  const secure =
    typeof window !== 'undefined' &&
    (window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');
  const media = !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  );
  return {
    secure,
    canRecord: secure && media,
    canLiveText: secure && !!pickRecognition(),
  };
}

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/* ---------------------------------------------------------- component */

export default function VoiceDictation({
  onComplete,
  onError,
  onStateChange,
  lang = 'en-US',
  maxMs = DEFAULT_MAX_MS,
  className = '',
}) {
  const [state, setState] = useState('idle');
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [problem, setProblem] = useState('');

  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const recogRef = useRef(null);
  const dbRef = useRef(null);
  const sessionRef = useRef('');
  const seqRef = useRef(0);
  const startedRef = useRef(0);
  const tickRef = useRef(null);
  const wantRecogRef = useRef(false);
  const recogEndedRef = useRef(false);
  const finalRef = useRef('');

  const support = useRef(dictationSupport()).current;

  const move = useCallback(
    (s) => {
      setState(s);
      if (onStateChange) onStateChange(s);
    },
    [onStateChange]
  );

  const fail = useCallback(
    (e) => {
      setProblem(e && e.message ? e.message : String(e));
      move('error');
      if (onError) onError(e instanceof Error ? e : new Error(String(e)));
    },
    [move, onError]
  );

  /* release everything; safe to call twice */
  const teardown = useCallback(() => {
    wantRecogRef.current = false;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    try {
      if (recogRef.current) recogRef.current.stop();
    } catch { /* already stopped */ }
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch { /* already stopped */ }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch { /* ignore */ }
      });
      streamRef.current = null;
    }
  }, []);

  useEffect(() => teardown, [teardown]);

  /* ------------------------------------------------------------ start */

  const start = useCallback(async () => {
    if (state === 'recording' || state === 'arming') return;

    if (!support.secure) {
      fail(new Error(
        'The microphone needs a secure connection. Open Ami over https, ' +
        'not an http address.'
      ));
      return;
    }
    if (!support.canRecord) {
      fail(new Error('This browser cannot record audio.'));
      return;
    }

    setProblem('');
    setFinalText('');
    setInterim('');
    finalRef.current = '';
    seqRef.current = 0;
    setElapsed(0);
    move('arming');

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          /* Mono at 24 kbps: ~180 KB a minute, ~11 MB an hour. The browser
           * default is often 128 kbps stereo - music quality, for one
           * voice, at five times the size. */
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (e) {
      /* NotAllowedError is a refusal, NotFoundError is no microphone -
       * worth telling apart, because one is fixable in settings. */
      if (e && e.name === 'NotAllowedError') {
        fail(new Error('Microphone permission was refused.'));
      } else if (e && e.name === 'NotFoundError') {
        fail(new Error('No microphone found.'));
      } else {
        fail(e);
      }
      return;
    }
    streamRef.current = stream;

    const session = `s${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionRef.current = session;

    try {
      dbRef.current = await openDb();
    } catch (e) {
      /* Private browsing and blocked site data both land here.  Recording
       * can still go ahead in memory; say so rather than refusing. */
      dbRef.current = null;
      setProblem(
        'Storage is unavailable, so this recording is held in memory. ' +
        'Keep this tab in front until you stop.'
      );
    }

    const memoryChunks = [];
    const mimeType = pickMimeType();

    let rec;
    try {
      rec = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 24000,
      });
    } catch (e) {
      teardown();
      fail(e);
      return;
    }
    recorderRef.current = rec;

    rec.ondataavailable = (ev) => {
      if (!ev.data || !ev.data.size) return;
      const seq = seqRef.current++;
      if (dbRef.current) {
        putChunk(dbRef.current, session, seq, ev.data).catch(() => {
          memoryChunks.push(ev.data);     // fall back rather than lose it
        });
      } else {
        memoryChunks.push(ev.data);
      }
    };
    rec.onerror = (ev) => fail(ev.error || new Error('Recorder failed.'));

    /* ----- live words, on the same stream ----- */
    const Recog = pickRecognition();
    if (Recog) {
      const r = new Recog();
      r.continuous = true;
      r.interimResults = true;
      r.lang = lang;
      r.onresult = (ev) => {
        let add = '';
        let pending = '';
        for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
          const res = ev.results[i];
          if (res.isFinal) add += res[0].transcript;
          else pending += res[0].transcript;
        }
        if (add) {
          finalRef.current = (finalRef.current + ' ' + add.trim()).trim();
          setFinalText(finalRef.current);
        }
        setInterim(pending);
      };
      r.onerror = (ev) => {
        /* 'no-speech' and 'aborted' are routine and must not kill the
         * recording - the audio is the thing that matters. */
        if (ev && ev.error && ev.error !== 'no-speech' && ev.error !== 'aborted') {
          setProblem('Live text stopped (' + ev.error + '). Still recording.');
        }
      };
      r.onend = () => {
        recogEndedRef.current = true;
        if (wantRecogRef.current) {
          /* Chrome ends a session after a stretch of silence.  Without
           * this, a long meeting gets live text only at the start. */
          try { r.start(); recogEndedRef.current = false; } catch { /* racing stop */ }
        }
      };
      recogRef.current = r;
      wantRecogRef.current = true;
      recogEndedRef.current = false;
      try { r.start(); } catch { /* already started */ }
    }

    startedRef.current = Date.now();
    rec.start(TIMESLICE_MS);
    move('recording');

    tickRef.current = setInterval(() => {
      const ms = Date.now() - startedRef.current;
      setElapsed(ms);
      if (ms >= maxMs) stop();          // eslint-disable-line no-use-before-define
    }, 250);

    recorderRef.current._memoryChunks = memoryChunks;
  }, [state, support, lang, maxMs, move, fail, teardown]);

  /* ------------------------------------------------------------- stop */

  const stop = useCallback(async () => {
    if (state !== 'recording') return;
    move('finishing');

    const durationMs = Date.now() - startedRef.current;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    /* Stop recognition first and give it room to deliver what it already
     * heard.  Measured: a final result arrived ~500ms after stop. */
    wantRecogRef.current = false;
    try { if (recogRef.current) recogRef.current.stop(); } catch { /* ignore */ }

    const rec = recorderRef.current;
    const recStopped = new Promise((resolve) => {
      if (!rec || rec.state === 'inactive') { resolve(); return; }
      rec.onstop = () => resolve();
      try { rec.stop(); } catch { resolve(); }
    });

    await Promise.all([
      recStopped,
      new Promise((r) => setTimeout(r, TRAILING_WAIT_MS)),
    ]);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch { /* ignore */ }
      });
      streamRef.current = null;
    }

    const session = sessionRef.current;
    const mimeType = (rec && rec.mimeType) || pickMimeType() || 'audio/webm';

    let parts = [];
    try {
      if (dbRef.current) parts = await readChunks(dbRef.current, session);
    } catch { /* fall through to memory */ }
    const mem = (rec && rec._memoryChunks) || [];
    if (!parts.length && mem.length) parts = mem;

    const blob = parts.length ? new Blob(parts, { type: mimeType }) : null;
    const text = finalRef.current.trim();
    const tail = interim.trim();

    setInterim('');
    move('idle');

    if (onComplete) {
      onComplete({
        session,
        text,
        interim: tail,
        blob,
        mimeType,
        durationMs,
        chunkCount: parts.length,
      });
    }

    /* The caller owns the blob now.  Keep the chunks until it says the
     * note is saved - discardSession(session) - so a failed save still
     * has the audio behind it. */
  }, [state, interim, move, onComplete]);

  /* ------------------------------------------------------------- view */

  const live = (finalText + (interim ? ' ' + interim : '')).trim();
  const recording = state === 'recording';
  const busy = state === 'arming' || state === 'finishing';

  return (
    <div className={`vd ${className}`}>
      <div className="vd-row">
        <button
          type="button"
          className={`vd-btn ${recording ? 'vd-btn-stop' : 'vd-btn-rec'}`}
          onClick={recording ? stop : start}
          disabled={busy || !support.canRecord}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          {recording ? '■' : '●'}
        </button>

        <div className="vd-meta">
          {state === 'arming' && <span>asking for the microphone…</span>}
          {state === 'finishing' && <span>finishing…</span>}
          {recording && (
            <span className="vd-time">
              <span className="vd-dot" aria-hidden="true" /> {fmt(elapsed)}
            </span>
          )}
          {state === 'idle' && !live && <span>Tap to dictate</span>}
          {state === 'idle' && live && <span>Stopped</span>}
        </div>
      </div>

      {!support.canRecord && (
        <p className="vd-warn">
          {support.secure
            ? 'This browser cannot record audio.'
            : 'Open Ami over https to use the microphone.'}
        </p>
      )}

      {support.canRecord && !support.canLiveText && state === 'idle' && (
        <p className="vd-note">
          This browser has no live transcription, so words appear after you
          stop rather than as you speak. The recording itself is unaffected.
        </p>
      )}

      {problem && <p className="vd-warn">{problem}</p>}

      {(live || recording) && (
        <div className="vd-text" aria-live="polite">
          {finalText}
          {interim && <span className="vd-interim"> {interim}</span>}
          {recording && !live && <span className="vd-hint">listening…</span>}
        </div>
      )}
    </div>
  );
}
