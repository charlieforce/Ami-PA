#!/usr/bin/env python3
"""Batch 11: Ami logs what you tell her, and visit documents attach properly.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch11.py
"""
import os, subprocess, sys
SRC, FE = 'app.py', 'frontend/src'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

src = open(SRC).read()
anchor = '@app.get("/api/report")'

# ------------------------------------------------- chat actions: logging -----
if 'def _log_from_chat' not in src:
    FN = '''def _log_from_chat(text):
    """He tells her something happened - record it. Returns a line to acknowledge, or None.
    Plain patterns only, no Gemini call, so it is instant."""
    import re as _r
    from datetime import datetime as _d
    t = (text or '').strip()
    low = t.lower()
    said = []

    try:
        # blood pressure: "BP 128/82", "blood pressure was 128 over 82"
        m = _r.search(r'\\b(?:bp|blood pressure)\\b[^0-9]{0,20}(\\d{2,3})\\s*(?:/|over)\\s*(\\d{2,3})', low)
        if m:
            sys_, dia = int(m.group(1)), int(m.group(2))
            if 60 <= sys_ <= 260 and 30 <= dia <= 160:
                p = _r.search(r'\\bpulse\\b[^0-9]{0,10}(\\d{2,3})', low)
                db.execute("""INSERT INTO bp_readings (systolic, diastolic, pulse, where_taken)
                              VALUES (?,?,?,?)""",
                           (sys_, dia, int(p.group(1)) if p else None,
                            'clinic' if 'clinic' in low or 'pharmacy' in low else 'home'))
                said.append("BP " + str(sys_) + "/" + str(dia) + " saved")

        # blood sugar: "sugar was 5.6", "blood sugar 101 mg/dl"
        m = _r.search(r'\\b(?:blood sugar|sugar|glucose)\\b[^0-9]{0,20}(\\d{1,3}(?:\\.\\d)?)', low)
        if m:
            v = float(m.group(1))
            unit = 'mg/dL' if ('mg' in low or v > 30) else 'mmol/L'
            mmol = round(v / 18.0, 1) if unit == 'mg/dL' else v
            mgdl = round(v, 0) if unit == 'mg/dL' else round(v * 18.0, 0)
            ctx = ('fasting' if 'fasting' in low else
                   '2h after eating' if 'after eat' in low or 'after food' in low else 'random')
            db.execute("""INSERT INTO health_readings (kind, value, unit, value_mmol, value_mgdl,
                                                       context, test_type, where_taken)
                          VALUES ('blood_sugar',?,?,?,?,?,?,?)""",
                       (v, unit, mmol, mgdl, ctx, ctx,
                        'pharmacy' if 'pharmacy' in low else 'clinic' if 'clinic' in low else 'home'))
            said.append("blood sugar " + str(v) + " " + unit + " saved")

        # water: "drank a litre", "had 500ml"
        m = _r.search(r'\\b(?:drank|drink|had)\\b[^0-9a-z]{0,10}(a|an|half a|\\d+(?:\\.\\d+)?)\\s*'
                      r'(litre|liter|l|ml|glass|glasses|bottle|bottles)\\b', low)
        if m and 'water' in low:
            raw = m.group(1)
            n = 0.5 if raw == 'half a' else (1.0 if raw in ('a', 'an') else float(raw))
            unit = m.group(2)
            litres = (n / 1000.0 if unit == 'ml' else
                      n * 0.25 if unit.startswith('glass') else
                      n * 0.5 if unit.startswith('bottle') else n)
            db.execute("INSERT INTO water_log (litres, logged_on) VALUES (?, ?)",
                       (round(litres, 2), _d.now().strftime('%Y-%m-%d')))
            said.append(str(round(litres, 2)) + "L of water logged")

        # medication taken: "took my evening pill", "took my amlodipine"
        if _r.search(r'\\b(took|taken|swallowed)\\b', low) and _r.search(
                r'\\b(pill|meds?|medication|tablet|dose|bp med)\\b', low):
            meds = db.query("SELECT id, name, frequency FROM medications WHERE stopped_on IS NULL") or []
            slot = ('evening' if 'evening' in low or 'night' in low else
                    'morning' if 'morning' in low else
                    ('evening' if _d.now().hour >= 14 else 'morning'))
            today = _d.now().strftime('%Y-%m-%d')
            hit = [m2 for m2 in meds if (m2['name'] or '').lower() in low] or meds
            for m2 in hit[:3]:
                db.execute("""INSERT OR IGNORE INTO medication_log (medication_id, slot, taken_on)
                              VALUES (?,?,?)""", (m2['id'], slot, today))
            if hit:
                said.append(("marked " + hit[0]['name'] if len(hit) == 1 else "marked your meds")
                            + " taken this " + slot)

        # exercise: "did 3 sets of 10 on bench at 135", "walked 5km in 45 minutes"
        ex_rows = db.query("SELECT id, name, kind FROM exercises") or []
        found = None
        for e in ex_rows:
            nm = (e['name'] or '').lower()
            if nm and nm in low:
                found = e
                break
        if not found:
            for e in ex_rows:
                first = (e['name'] or '').lower().split()[-1]
                if len(first) >= 4 and _r.search(r'(?<![a-z])' + _r.escape(first) + r'(?![a-z])', low):
                    found = e
                    break
        if found and _r.search(r'\\b(did|done|finished|ran|walked|swam|rowed|cycled|lifted|hit)\\b', low):
            sets = _r.search(r'(\\d{1,2})\\s*(?:sets?|x)\\b', low)
            reps = _r.search(r'(?:x|of|by)\\s*(\\d{1,3})\\b', low)
            wt = _r.search(r'(\\d{1,4}(?:\\.\\d)?)\\s*(?:lb|lbs|pounds|kg|kilos)\\b', low)
            dist = _r.search(r'(\\d+(?:\\.\\d+)?)\\s*(km|k|miles?|m)\\b', low)
            dur = _r.search(r'(\\d{1,3}:\\d{2}|\\d{1,3})\\s*(?:min|mins|minutes)\\b', low)
            w = None
            if wt:
                w = float(wt.group(1))
                if 'kg' in wt.group(0) or 'kilo' in wt.group(0):
                    w = round(w * 2.20462, 1)
            db.execute("""INSERT INTO workout_log
                          (done_on, exercise_id, exercise_name, sets, reps, weight_lbs, distance, duration)
                          VALUES (?,?,?,?,?,?,?,?)""",
                       (_d.now().strftime('%Y-%m-%d'), found['id'], found['name'],
                        int(sets.group(1)) if sets else None, reps.group(1) if reps else None, w,
                        (dist.group(0) if dist else None), (dur.group(0) if dur else None)))
            said.append(found['name'] + " logged")
    except Exception as e:
        print("chat log error: " + str(e))
        return None

    if not said:
        return None
    return ("YOU JUST LOGGED THIS FOR HIM: " + "; ".join(said) +
            ". Say it in one short clause inside your normal reply - do not make it the subject.")


'''
    src = src.replace(anchor, FN + anchor, 1); note(True, 'chat logging')

o = "    _course_note = None if _is_question else _course_day_change(query)"
n = o + "\n    _log_note = None if _is_question else _log_from_chat(query)"
note(o in src, 'log hook'); src = src.replace(o, n, 1)

o = """    if _course_note:
        context += "\\n\\n" + _course_note"""
n = o + """
    if _log_note:
        context += "\\n\\n" + _log_note"""
note(o in src, 'log note in context'); src = src.replace(o, n, 1)

o = """You cannot yet log health readings, water, exercise, doses, courses or subscriptions from chat - tell him in one line where to do it."""
n = ("""You can log what he tells you: blood pressure, blood sugar, water, a medication dose taken, and a """
     """workout. Say so briefly when you do. Subscriptions and new courses still need the screen.""")
note(o in src, 'script updated'); src = src.replace(o, n, 1)

# ------------------------------------------------- visit documents -----------
o = """        return {"status": "success", "id": did}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/medical/documents/<int:did>")"""
n = """        return {"status": "success", "id": did, "title": request.form.get('title') or safe}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 400


@app.get("/api/medical/documents/<int:did>/view")
def medical_document_view(did):
    \"\"\"Open a document in the browser - the address carries the password, as an <img> cannot.\"\"\"
    import os as _osx
    if (request.args.get('k') or request.headers.get('X-Ami-Password')) != _osx.getenv('AMI_PASSWORD', 'charlie'):
        return {"error": "no"}, 401
    try:
        from flask import send_file
        r = db.query("SELECT file_path, title FROM medical_documents WHERE id = ?", (did,))
        if not r or not _osx.path.exists(r[0]['file_path']):
            return {"error": "Not found"}, 404
        return send_file(r[0]['file_path'], conditional=True)
    except Exception as e:
        return {"error": str(e)}, 400


@app.delete("/api/medical/documents/<int:did>/remove")
@require_password
def medical_document_remove(did):
    try:
        import os as _os
        r = db.query("SELECT file_path FROM medical_documents WHERE id = ?", (did,))
        if r and r[0].get('file_path'):
            try:
                _os.remove(r[0]['file_path'])
            except Exception:
                pass
        db.execute("DELETE FROM medical_documents WHERE id = ?", (did,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/medical/documents/<int:did>")"""
note(o in src, 'document view route'); src = src.replace(o, n, 1)

# visits return their documents with kind and size
o = """            r['documents'] = db.query(
                "SELECT id, title, kind, file_path FROM medical_documents WHERE visit_id = ?",
                (r['id'],)) or []"""
n = """            _docs = db.query(
                "SELECT id, title, kind, file_path FROM medical_documents WHERE visit_id = ?",
                (r['id'],)) or []
            import os as _osd
            for _dd in _docs:
                _fp = _dd.pop('file_path', '') or ''
                _dd['ext'] = _fp.lower().rsplit('.', 1)[-1] if '.' in _fp else ''
                _dd['is_image'] = _dd['ext'] in ('jpg', 'jpeg', 'png', 'gif', 'webp', 'heic')
                try:
                    _dd['kb'] = round(_osd.path.getsize(_fp) / 1024)
                except Exception:
                    _dd['kb'] = None
            r['documents'] = _docs"""
note(o in src, 'documents detail'); src = src.replace(o, n, 1)

open(SRC, 'w').write(src)

# ---------------------------------------------------------------- frontend ---
p = os.path.join(FE, 'components/MedicalTab.jsx')
s = open(p).read()

o = """                  {(v.documents || []).length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      {v.documents.map(d => (
                        <a key={d.id} href={`${API}/api/medical/documents/${d.id}`}
                           style={{ fontSize: '12px', color: '#667eea', marginRight: '10px' }}>
                          📎 {d.title}
                        </a>
                      ))}
                    </div>
                  )}"""
n = """                  {(v.documents || []).length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                      {v.documents.map(d => (
                        <div key={d.id} style={{ border: '1px solid #2a2a2a', borderRadius: '8px',
                                                 padding: '6px', width: '92px', textAlign: 'center' }}>
                          <a href={`${API}/api/medical/documents/${d.id}/view?k=charlie`}
                             target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                            {d.is_image ? (
                              <img src={`${API}/api/medical/documents/${d.id}/view?k=charlie`} alt=""
                                   style={{ width: '78px', height: '62px', objectFit: 'cover',
                                            borderRadius: '5px', display: 'block', background: '#222' }} />
                            ) : (
                              <div style={{ width: '78px', height: '62px', borderRadius: '5px',
                                            background: '#232323', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontSize: '22px' }}>
                                {d.ext === 'pdf' ? '📄' : '📎'}
                              </div>
                            )}
                            <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px',
                                          overflow: 'hidden', textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap' }}>{d.title}</div>
                          </a>
                          <button onClick={async () => {
                                    if (!window.confirm('Remove ' + d.title + '?')) return;
                                    await fetch(API + '/api/medical/documents/' + d.id + '/remove',
                                                { method: 'DELETE', headers: AUTH });
                                    load();
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#666',
                                           fontSize: '10px', cursor: 'pointer', padding: '2px' }}>remove</button>
                        </div>
                      ))}
                    </div>
                  )}"""
note(o in s, 'document thumbnails'); s = s.replace(o, n, 1)

# upload: report failures instead of failing quietly
o = """                <input type="file" style={{ display: 'none' }} onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append('file', file);
                  fd.append('visit_id', v.id);
                  fd.append('title', file.name);
                  try {
                    await fetch(API + '/api/medical/documents', { method: 'POST', headers: AUTH, body: fd });
                    load();
                  } catch (err) { setErr(String(err)); }
                }} />"""
n = """                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx,image/*,application/pdf"
                       style={{ display: 'none' }} onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  if (file.size > 25 * 1024 * 1024) { setErr('That file is over 25MB'); return; }
                  const fd = new FormData();
                  fd.append('file', file);
                  fd.append('visit_id', v.id);
                  fd.append('title', file.name);
                  try {
                    const r = await fetch(API + '/api/medical/documents', { method: 'POST', headers: AUTH, body: fd });
                    const j = await r.json();
                    if (j.error) setErr('Upload failed: ' + j.error); else setErr('');
                    e.target.value = '';
                    load();
                  } catch (err) { setErr(String(err)); }
                }} />"""
note(o in s, 'upload feedback'); s = s.replace(o, n, 1)
open(p, 'w').write(s)

print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:300]))
