#!/usr/bin/env python3
"""Batch 6: your own photo on any exercise, a demo-video button, clearer drawings.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch6.py
"""
import os, sqlite3, subprocess, sys
SRC, FE = 'app.py', 'frontend/src'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

db = sqlite3.connect('data/ami_memory.db')
for sql in ["ALTER TABLE exercises ADD COLUMN photo_path TEXT"]:
    try: db.execute(sql)
    except Exception: pass
db.commit(); db.close()
note(True, 'photo column')

# ---------------------------------------------------------------- backend ---
src = open(SRC).read()
anchor = '@app.get("/api/report")'

if '/api/fitness/exercises/<int:ex_id>/photo' not in src:
    EP = '''@app.post("/api/fitness/exercises/<int:ex_id>/photo")
@require_password
def exercise_photo_upload(ex_id):
    """Charlie's own photo for an exercise - kept beside his other uploads."""
    try:
        import os as _os
        from datetime import datetime as _d
        f = request.files.get('file')
        if not f:
            return {"error": "No file"}, 400
        folder = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'data', 'exercise_photos')
        _os.makedirs(folder, exist_ok=True)
        safe = "".join(c for c in (f.filename or 'photo.jpg') if c.isalnum() or c in '._- ').strip()
        name = str(ex_id) + "_" + _d.now().strftime('%Y%m%d%H%M%S') + "_" + safe
        path = _os.path.join(folder, name)
        f.save(path)
        old = db.query("SELECT photo_path FROM exercises WHERE id = ?", (ex_id,))
        db.execute("UPDATE exercises SET photo_path = ? WHERE id = ?", (path, ex_id))
        if old and old[0].get('photo_path') and old[0]['photo_path'] != path:
            try:
                _os.remove(old[0]['photo_path'])
            except Exception:
                pass
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/fitness/exercises/<int:ex_id>/photo")
@require_password
def exercise_photo(ex_id):
    try:
        import os as _os
        from flask import send_file
        r = db.query("SELECT photo_path FROM exercises WHERE id = ?", (ex_id,))
        if not r or not r[0].get('photo_path') or not _os.path.exists(r[0]['photo_path']):
            return {"error": "none"}, 404
        return send_file(r[0]['photo_path'])
    except Exception as e:
        return {"error": str(e)}, 400


@app.delete("/api/fitness/exercises/<int:ex_id>/photo")
@require_password
def exercise_photo_delete(ex_id):
    try:
        import os as _os
        r = db.query("SELECT photo_path FROM exercises WHERE id = ?", (ex_id,))
        if r and r[0].get('photo_path'):
            try:
                _os.remove(r[0]['photo_path'])
            except Exception:
                pass
        db.execute("UPDATE exercises SET photo_path = NULL WHERE id = ?", (ex_id,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    src = src.replace(anchor, EP + anchor, 1); note(True, 'photo endpoints')

# the exercise list should say whether a photo exists
o = """        rows = db.query("SELECT * FROM exercises ORDER BY area, name") or []
        return {"status": "success", "exercises": rows}"""
n = """        rows = db.query("SELECT * FROM exercises ORDER BY area, name") or []
        for r in rows:
            r['has_photo'] = bool(r.get('photo_path'))
            r.pop('photo_path', None)
        return {"status": "success", "exercises": rows}"""
note(o in src, 'has_photo flag'); src = src.replace(o, n, 1)

# uploads folder goes into the nightly backup
o = """            med = _os.path.join(data_dir, 'medical')
            if _os.path.isdir(med):
                t.add(med, arcname='medical')"""
n = """            for _sub in ('medical', 'exercise_photos'):
                _p = _os.path.join(data_dir, _sub)
                if _os.path.isdir(_p):
                    t.add(_p, arcname=_sub)"""
note(o in src, 'photos in backup'); src = src.replace(o, n, 1)

open(SRC, 'w').write(src)

# ---------------------------------------------------------------- frontend ---
p = os.path.join(FE, 'components/FitnessTab.jsx')
s = open(p).read()

# clearer figures
o = "function Figure({ kind, size = 46 }) {"
i = s.find(o)
j = s.find("export default function FitnessTab", i)
if i != -1 and j != -1:
    NEW = '''function Figure({ kind, size = 46, exId, hasPhoto, onPhoto }) {
  const [broken, setBroken] = useState(false);
  if (exId && hasPhoto && !broken) {
    return (
      <img src={API + '/api/fitness/exercises/' + exId + '/photo?k=' + (window.__amiPw || 'charlie')}
           alt="" onError={() => setBroken(true)}
           style={{ width: size, height: size, borderRadius: '8px', objectFit: 'cover',
                    flexShrink: 0, background: '#141414', cursor: onPhoto ? 'pointer' : 'default' }}
           onClick={onPhoto} />
    );
  }
  const c = '#9aa3c7', m = '#5a6punk';
  const P = (d, w = 2.2) => <path d={d} stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  const G = (d, w = 3) => <path d={d} stroke="#4a5170" strokeWidth={w} fill="none" strokeLinecap="round" />;
  const head = (x, y, r = 4.2) => <circle cx={x} cy={y} r={r} stroke={c} strokeWidth="2.2" fill="none" />;
  const bar = (x1, y, x2) => <g><line x1={x1} y1={y} x2={x2} y2={y} stroke="#4a5170" strokeWidth="2.5" />
      <circle cx={x1} cy={y} r="3" fill="#4a5170" /><circle cx={x2} cy={y} r="3" fill="#4a5170" /></g>;
  const art = {
    bench: <>{G("M6 40h36")}{head(15, 28)}{P("M15 32l16 2")}{P("M20 33l-3-9M26 34l-3-9")}{bar(12, 22, 30)}</>,
    press: <>{head(24, 13)}{P("M24 17v15")}{P("M24 20l-8-6M24 20l8-6")}{bar(13, 13, 35)}{P("M24 32l-6 12M24 32l6 12")}</>,
    pull: <>{bar(8, 8, 40)}{head(24, 20)}{P("M24 24v12")}{P("M24 25l-9-14M24 25l9-14")}{P("M24 36l-5 9M24 36l5 9")}</>,
    row: <>{head(13, 19)}{P("M13 23l13 3")}{P("M26 26l9-3")}{bar(31, 22, 39)}{P("M13 23l-2 15")}{P("M26 26l1 13")}</>,
    curl: <>{head(24, 12)}{P("M24 16v15")}{P("M24 20l-7 7 3 5M24 20l7 7-3 5")}{bar(15, 32, 33)}{P("M24 31l-5 13M24 31l5 13")}</>,
    pushup: <>{head(11, 25)}{P("M11 29l27 7", 2.6)}{P("M15 31v11M34 36v8")}{G("M6 44h38")}</>,
    squat: <>{head(24, 10)}{bar(9, 16, 39)}{P("M24 15v9")}{P("M24 24l-7 8v10M24 24l7 8v10")}{G("M12 44h24")}</>,
    legpress: <>{G("M4 22v18")}{P("M6 34h13v-13", 2.6)}{head(31, 31)}{P("M31 34l-11 2")}{P("M31 34v9")}</>,
    hinge: <>{head(12, 15)}{P("M12 19l13 7")}{P("M25 26v15")}{P("M14 22l-1 10")}{bar(8, 33, 20)}</>,
    lunge: <>{head(21, 10)}{P("M21 14v12")}{P("M21 26l-9 9v7M21 26l9 10v6")}{G("M8 44h30")}</>,
    stepup: <>{G("M26 44h16v-13H26z")}{head(16, 13)}{P("M16 17v12")}{P("M16 29l-4 13M16 29l12 3")}</>,
    legcurl: <>{G("M6 26h22")}{head(11, 22)}{P("M28 28q8 2 9 8", 2.4)}</>,
    legext: <>{G("M8 28h16")}{head(13, 24)}{P("M24 29l13-7", 2.4)}</>,
    calf: <>{G("M12 44h24")}{head(24, 11)}{P("M24 15v18")}{P("M24 33l-4 9M24 33l4 9")}{P("M18 42h12", 2)}</>,
    plank: <>{head(9, 27)}{P("M9 31l29 9", 2.6)}{P("M11 33v9M36 40v4")}{G("M4 44h40")}</>,
    core: <>{head(12, 33)}{P("M12 33h13")}{P("M25 33l9-11")}{P("M25 33l6 9")}{G("M6 44h36")}</>,
    carry: <>{head(24, 10)}{P("M24 14v17")}{P("M24 16l-8 3M24 16l8 3")}{bar(11, 22, 19)}{bar(29, 22, 37)}{P("M24 31l-5 13M24 31l5 13")}</>,
    walk: <>{head(24, 10)}{P("M24 14v14")}{P("M24 18l-7 5M24 18l7 4")}{P("M24 28l-7 15M24 28l6 15")}</>,
    run: <>{head(27, 10)}{P("M27 14l-5 13")}{P("M22 18l-8 3M22 18l10 6")}{P("M22 27l-9 13M22 27l11 9")}</>,
    bike: <><circle cx="12" cy="36" r="7.5" stroke="#4a5170" strokeWidth="2.2" fill="none" /><circle cx="36" cy="36" r="7.5" stroke="#4a5170" strokeWidth="2.2" fill="none" />{P("M12 36l10-13h9l5 13")}{head(25, 14)}</>,
    swim: <>{head(11, 21)}{P("M11 25l14 4")}{P("M25 29l12-7")}{P("M4 38q7-5 14 0t14 0t12 0", 2)}</>,
  };
  return (
    <svg viewBox="0 0 48 48" width={size} height={size}
         onClick={onPhoto}
         style={{ flexShrink: 0, background: '#141414', borderRadius: '8px',
                  cursor: onPhoto ? 'pointer' : 'default' }}>
      {art[kind] || art.walk}
    </svg>
  );
}

'''
    s = s[:i] + NEW + s[j:]
    note(True, 'clearer figures')

# photo upload + demo link on each exercise card
o = """      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <Figure kind={x.drawing} />"""
n = """      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <label style={{ cursor: 'pointer', position: 'relative' }} title={x.has_photo ? 'Change the photo' : 'Add your own photo'}>
          <Figure kind={x.drawing} exId={x.id} hasPhoto={x.has_photo} />
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
note(o in s, 'photo upload'); s = s.replace(o, n, 1)

o = """            <button style={S.small(doneToday.has(x.name) ? '#14532d' : '#667eea')}"""
n = """            <a href={'https://www.youtube.com/results?search_query=' + encodeURIComponent('how to ' + x.name + ' proper form')}
               target="_blank" rel="noreferrer"
               style={{ ...S.small('#2a2a2a'), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              ▶ Watch
            </a>
            <button style={S.small(doneToday.has(x.name) ? '#14532d' : '#667eea')}"""
note(o in s, 'demo link'); s = s.replace(o, n, 1)

# the plan rows use the photo too
o = """                        <Figure kind={it.drawing} size={34} />"""
n = """                        <Figure kind={it.drawing} size={34} exId={it.exercise_id}
                                hasPhoto={(ex.find(e => e.id === it.exercise_id) || {}).has_photo} />"""
note(o in s, 'plan rows use photos'); s = s.replace(o, n, 1)

s = s.replace("<Figure kind={(ex.find(e => e.id === it.exercise_id) || {}).drawing} size={34} />",
              "<Figure kind={(ex.find(e => e.id === it.exercise_id) || {}).drawing} size={34} "
              "exId={it.exercise_id} hasPhoto={(ex.find(e => e.id === it.exercise_id) || {}).has_photo} />", 1)

# typo guard: the colour constant above must be valid
s = s.replace("const c = '#9aa3c7', m = '#5a6punk';", "const c = '#9aa3c7';")
open(p, 'w').write(s)

print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:300]))
