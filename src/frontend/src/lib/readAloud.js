// Reading a note back. His own writing, in English, so an American woman's
// voice - not the Krio accent the chat would have needed.

let chosen = null;

const pick = () => {
  if (chosen) return chosen;
  const all = window.speechSynthesis.getVoices();
  if (!all.length) return null;
  // the good American women, in order of preference
  const wanted = ['Samantha', 'Google US English', 'Ava', 'Allison', 'Susan', 'Zira'];
  for (const name of wanted) {
    const v = all.find(x => x.name.includes(name));
    if (v) { chosen = v; return v; }
  }
  // otherwise any American voice
  chosen = all.find(v => v.lang === 'en-US') || all.find(v => v.lang.startsWith('en')) || null;
  return chosen;
};

// voices load late in some browsers
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => { chosen = null; pick(); };
}

export function readAloud(text, { onStart, onEnd } = {}) {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text));
  const v = pick();
  if (v) u.voice = v;
  u.lang = 'en-US';
  u.rate = 0.98;
  u.pitch = 1.0;
  u.volume = 1;
  if (onStart) u.onstart = onStart;
  if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
  window.speechSynthesis.speak(u);
}

export function stopReading() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}
