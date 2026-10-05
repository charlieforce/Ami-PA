#!/usr/bin/env python3
"""Batch 9: swap a photo any time, and play a short clip (GIF or MP4) right on the card.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch9.py
"""
import os, sqlite3, subprocess, sys
SRC, FE = 'app.py', 'frontend/src'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

db = sqlite3.connect('data/ami_memory.db')
for sql in ["ALTER TABLE exercises ADD COLUMN clip_path TEXT",
            "ALTER TABLE exercises ADD COLUMN media_at TEXT"]:
    try: db.execute(sql)
    except Exception: pass
db.commit(); db.close()
note(True, 'clip columns')

# ---------------------------------------------------------------- backend ---
src = open(SRC).read()
anchor = '@app.get("/api/report")'

# the photo upload records when it changed, so the browser reloads it
o = """        old = db.query("SELECT photo_path FROM exercises WHERE id = ?", (ex_id,))
        db.execute("UPDATE exercises SET photo_path = ? WHERE id = ?", (path, ex_id))"""
n = """        old = db.query("SELECT photo_path FROM exercises WHERE id = ?", (ex_id,))
        db.execute("UPDATE exercises SET photo_path = ?, media_at = ? WHERE id = ?",
                   (path, _d.now().strftime('%Y%m%d%H%M%S'), ex_id))"""
note(o in src, 'photo stamp'); src = src.replace(o, n, 1)

o = """            r['has_photo'] = bool(r.get('photo_path'))
            r.pop('photo_path', None)"""
n = """            r['has_photo'] = bool(r.get('photo_path'))
            r['has_clip'] = bool(r.get('clip_path'))
            r['clip_kind'] = ('video' if str(r.get('clip_path') or '').lower().endswith(('.mp4', '.webm', '.mov'))
                              else 'gif' if r.get('clip_path') else None)
            r.pop('photo_path', None)
            r.pop('clip_path', None)"""
note(o in src, 'clip flags'); src = src.replace(o, n, 1)

if '/api/fitness/exercises/<int:ex_id>/clip' not in src:
    EP = '''@app.post("/api/fitness/exercises/<int:ex_id>/clip")
@require_password
def exercise_clip_upload(ex_id):
    """A short demo clip - GIF, MP4 or WebM - played on the card."""
    try:
        import os as _os
        from datetime import datetime as _d
        f = request.files.get('file')
        if not f:
            return {"error": "No file"}, 400
        ext = (f.filename or '').lower().rsplit('.', 1)[-1] if '.' in (f.filename or '') else ''
        if ext not in ('gif', 'mp4', 'webm', 'mov'):
            return {"error": "GIF, MP4 or WebM only"}, 400
        folder = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'data', 'exercise_photos')
        _os.makedirs(folder, exist_ok=True)
        safe = "".join(c for c in (f.filename or 'clip') if c.isalnum() or c in '._- ').strip()
        name = "clip" + str(ex_id) + "_" + _d.now().strftime('%Y%m%d%H%M%S') + "_" + safe
        path = _os.path.join(folder, name)
        f.save(path)
        old = db.query("SELECT clip_path FROM exercises WHERE id = ?", (ex_id,))
        db.execute("UPDATE exercises SET clip_path = ?, media_at = ? WHERE id = ?",
                   (path, _d.now().strftime('%Y%m%d%H%M%S'), ex_id))
        if old and old[0].get('clip_path') and old[0]['clip_path'] != path:
            try:
                _os.remove(old[0]['clip_path'])
            except Exception:
                pass
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/fitness/exercises/<int:ex_id>/clip")
def exercise_clip(ex_id):
    import os as _osx
    if (request.args.get('k') or request.headers.get('X-Ami-Password')) != _osx.getenv('AMI_PASSWORD', 'charlie'):
        return {"error": "no"}, 401
    try:
        from flask import send_file
        r = db.query("SELECT clip_path FROM exercises WHERE id = ?", (ex_id,))
        if not r or not r[0].get('clip_path') or not _osx.path.exists(r[0]['clip_path']):
            return {"error": "none"}, 404
        return send_file(r[0]['clip_path'], conditional=True)
    except Exception as e:
        return {"error": str(e)}, 400


@app.delete("/api/fitness/exercises/<int:ex_id>/clip")
@require_password
def exercise_clip_delete(ex_id):
    try:
        import os as _os
        r = db.query("SELECT clip_path FROM exercises WHERE id = ?", (ex_id,))
        if r and r[0].get('clip_path'):
            try:
                _os.remove(r[0]['clip_path'])
            except Exception:
                pass
        db.execute("UPDATE exercises SET clip_path = NULL WHERE id = ?", (ex_id,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    src = src.replace(anchor, EP + anchor, 1); note(True, 'clip endpoints')

open(SRC, 'w').write(src)

# ---------------------------------------------------------------- frontend ---
p = os.path.join(FE, 'components/FitnessTab.jsx')
s = open(p).read()

# the figure shows a clip if there is one, then a photo, then the drawing
o = """function Figure({ kind, size = 46, exId, hasPhoto, onPhoto }) {
  const [broken, setBroken] = useState(false);
  if (exId && hasPhoto && !broken) {
    return (
      <img src={API + '/api/fitness/exercises/' + exId + '/photo?k=' + (window.__amiPw || 'charlie')}
           alt="" onError={() => setBroken(true)}
           style={{ width: size, height: size, borderRadius: '8px', objectFit: 'cover',
                    flexShrink: 0, background: '#141414', cursor: onPhoto ? 'pointer' : 'default' }}
           onClick={onPhoto} />
    );
  }"""
n = """function Figure({ kind, size = 46, exId, hasPhoto, hasClip, clipKind, stamp, onPhoto }) {
  const [broken, setBroken] = useState(false);
  const v = '?k=charlie&v=' + (stamp || '1');
  const box = { width: size, height: size, borderRadius: '8px', objectFit: 'cover',
                flexShrink: 0, background: '#141414', cursor: onPhoto ? 'pointer' : 'default',
                display: 'block' };
  if (exId && hasClip && !broken) {
    if (clipKind === 'video') {
      return (
        <video src={API + '/api/fitness/exercises/' + exId + '/clip' + v}
               autoPlay loop muted playsInline onError={() => setBroken(true)}
               style={box} onClick={onPhoto} />
      );
    }
    return (
      <img src={API + '/api/fitness/exercises/' + exId + '/clip' + v} alt=""
           onError={() => setBroken(true)} style={box} onClick={onPhoto} />
    );
  }
  if (exId && hasPhoto && !broken) {
    return (
      <img src={API + '/api/fitness/exercises/' + exId + '/photo' + v}
           alt="" onError={() => setBroken(true)} style={box} onClick={onPhoto} />
    );
  }"""
note(o in s, 'figure shows clips'); s = s.replace(o, n, 1)

# library card: bigger media, upload both, replace either
o = """        <label style={{ cursor: 'pointer', position: 'relative' }} title={x.has_photo ? 'Change the photo' : 'Add your own photo'}>
          <Figure kind={x.drawing} size={72} exId={x.id} hasPhoto={x.has_photo} />
          {!x.has_photo && (
            <span style={{ position: 'absolute', right: -3, bottom: -3, background: '#667eea',
                           color: '#fff', borderRadius: '50%', width: '17px', height: '17px',
                           fontSize: '11px', lineHeight: '17px', textAlign: 'center' }}>+</span>
          )}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
            const f = e.target.files[0]; if (!f) return;
            const fd = new FormData(); fd.append('file', f);
            await fetch(API + '/api/fitness/exercises/' + x.id + '/photo',
                        { method: 'POST', headers: AUTH, body: fd });
            load();
          }} />
        </label>"""
n = """        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          <Figure kind={x.drawing} size={80} exId={x.id} hasPhoto={x.has_photo}
                  hasClip={x.has_clip} clipKind={x.clip_kind} stamp={x.media_at} />
          <div style={{ display: 'flex', gap: '4px' }}>
            <label style={{ cursor: 'pointer', fontSize: '10px', color: '#7a819e' }}
                   title={x.has_photo ? 'Change the photo' : 'Add a photo'}>
              {x.has_photo ? '🖼 swap' : '🖼 photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                const f = e.target.files[0]; if (!f) return;
                const fd = new FormData(); fd.append('file', f);
                await fetch(API + '/api/fitness/exercises/' + x.id + '/photo',
                            { method: 'POST', headers: AUTH, body: fd });
                e.target.value = ''; load();
              }} />
            </label>
            <label style={{ cursor: 'pointer', fontSize: '10px', color: '#7a819e' }}
                   title={x.has_clip ? 'Change the clip' : 'Add a short clip - GIF or MP4'}>
              {x.has_clip ? '🎬 swap' : '🎬 clip'}
              <input type="file" accept=".gif,.mp4,.webm,.mov,image/gif,video/*" style={{ display: 'none' }}
                     onChange={async (e) => {
                const f = e.target.files[0]; if (!f) return;
                const fd = new FormData(); fd.append('file', f);
                const r = await fetch(API + '/api/fitness/exercises/' + x.id + '/clip',
                            { method: 'POST', headers: AUTH, body: fd });
                const j = await r.json(); if (j.error) setErr(j.error);
                e.target.value = ''; load();
              }} />
            </label>
            {(x.has_photo || x.has_clip) && (
              <button title="Remove what is there"
                      onClick={async () => {
                        if (x.has_clip) await fetch(API + '/api/fitness/exercises/' + x.id + '/clip', { method: 'DELETE', headers: AUTH });
                        else await fetch(API + '/api/fitness/exercises/' + x.id + '/photo', { method: 'DELETE', headers: AUTH });
                        load();
                      }}
                      style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer',
                               fontSize: '10px', padding: 0 }}>✕</button>
            )}
          </div>
        </div>"""
note(o in s, 'photo and clip buttons'); s = s.replace(o, n, 1)

# plan rows play the clip too
o = """                        <Figure kind={it.drawing} size={44} exId={it.exercise_id}
                                hasPhoto={(ex.find(e => e.id === it.exercise_id) || {}).has_photo} />"""
n = """                        <Figure kind={it.drawing} size={52} exId={it.exercise_id}
                                hasPhoto={(ex.find(e => e.id === it.exercise_id) || {}).has_photo}
                                hasClip={(ex.find(e => e.id === it.exercise_id) || {}).has_clip}
                                clipKind={(ex.find(e => e.id === it.exercise_id) || {}).clip_kind}
                                stamp={(ex.find(e => e.id === it.exercise_id) || {}).media_at} />"""
note(o in s, 'plan rows play clips'); s = s.replace(o, n, 1)

s = s.replace("""<Figure kind={(ex.find(e => e.id === it.exercise_id) || {}).drawing} size={34} exId={it.exercise_id} hasPhoto={(ex.find(e => e.id === it.exercise_id) || {}).has_photo} />""",
              """<Figure kind={(ex.find(e => e.id === it.exercise_id) || {}).drawing} size={40} exId={it.exercise_id}
                            hasPhoto={(ex.find(e => e.id === it.exercise_id) || {}).has_photo}
                            hasClip={(ex.find(e => e.id === it.exercise_id) || {}).has_clip}
                            clipKind={(ex.find(e => e.id === it.exercise_id) || {}).clip_kind}
                            stamp={(ex.find(e => e.id === it.exercise_id) || {}).media_at} />""", 1)

open(p, 'w').write(s)

print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:300]))
