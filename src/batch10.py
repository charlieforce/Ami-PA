#!/usr/bin/env python3
"""Batch 10: stretches, media in Today, show-more, move an exercise between days,
last time's numbers, copy a session.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch10.py
"""
import os, sqlite3, subprocess, sys
SRC, FE = 'app.py', 'frontend/src'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

# ---------------------------------------------------- stretches into the library
db = sqlite3.connect('data/ami_memory.db')
STRETCH = [
 ("Leg Swings","warmup","mobility","none","light",0,"walk",
  "Hold something steady. Swing one leg forward and back 10 times, then side to side. Both legs. Wakes the hips up."),
 ("Arm Circles","warmup","mobility","none","none",0,"press",
  "Arms out to the sides. Small circles forward 15, backward 15, then bigger ones."),
 ("Cat-Cow","warmup","mobility","none","light",0,"core",
  "On hands and knees. Arch the back and look up, then round it and tuck the chin. Slow, 10 times."),
 ("Hip Circles","warmup","mobility","none","light",0,"hinge",
  "Hands on hips, feet apart. Circle the hips one way 10 times, then the other."),
 ("Shoulder Pass-through","warmup","mobility","band or stick","none",0,"press",
  "Wide grip on a band or broomstick. Lift it over your head and behind you, and back. 10 slow."),
 ("Bodyweight Squat (warm-up)","warmup","mobility","none","light",0,"squat",
  "Ten slow squats with no weight, only as deep as is comfortable. Gets blood into the legs."),
 ("Ankle Rolls","warmup","mobility","none","light",0,"calf",
  "Roll each ankle 10 times each way. Easy to skip, and it matters for the knee."),
 ("Hamstring Stretch","cooldown","mobility","none","light",0,"hinge",
  "Sit with one leg out. Reach toward the toes without rounding hard. Hold 30 seconds each side."),
 ("Quad Stretch","cooldown","mobility","none","light",0,"walk",
  "Stand, pull one heel to the glute, knees together. Hold 30 seconds each side."),
 ("Hip Flexor Stretch","cooldown","mobility","none","light",0,"lunge",
  "Half-kneel, tuck the hips under, lean forward gently. Hold 30 seconds each side."),
 ("Chest Doorway Stretch","cooldown","mobility","doorway","none",0,"press",
  "Forearm on the door frame, step through gently. Hold 30 seconds each side."),
 ("Child's Pose","cooldown","mobility","none","light",0,"core",
  "Kneel, sit back on the heels, reach the arms forward. Hold a minute and breathe."),
 ("Calf Stretch","cooldown","mobility","wall","light",0,"calf",
  "Hands on the wall, one leg back with the heel down. Hold 30 seconds each side."),
 ("Glute Stretch","cooldown","mobility","none","light",0,"hinge",
  "On your back, ankle over the opposite knee, pull the thigh toward you. 30 seconds each side."),
 ("Shoulder Cross-body Stretch","cooldown","mobility","none","none",0,"press",
  "Pull one arm across the chest with the other. Hold 30 seconds each side."),
]
for e in STRETCH:
    try:
        db.execute("""INSERT OR IGNORE INTO exercises
                      (name, area, kind, equipment, knee_load, knee_twist, drawing, how_to)
                      VALUES (?,?,?,?,?,?,?,?)""", e)
    except Exception:
        pass
db.commit()
n_all = db.execute("SELECT COUNT(*) FROM exercises").fetchone()[0]
db.close()
note(True, str(len(STRETCH)) + ' stretches (' + str(n_all) + ' total)')

# ---------------------------------------------------------------- backend ---
src = open(SRC).read()
anchor = '@app.get("/api/report")'

# plan items carry the media flags and last time's numbers
o = """        items = db.query(\"\"\"SELECT pi.*, e.name, e.area, e.equipment, e.knee_load, e.knee_twist,
                                   e.drawing, e.how_to
                            FROM plan_items pi JOIN exercises e ON e.id = pi.exercise_id
                            WHERE pi.plan_id = ? ORDER BY pi.week, pi.day, pi.position, pi.id\"\"\",
                         (plan['id'],)) or []"""
n = """        items = db.query(\"\"\"SELECT pi.*, e.name, e.area, e.equipment, e.knee_load, e.knee_twist,
                                   e.drawing, e.how_to, e.media_at,
                                   (e.photo_path IS NOT NULL) AS has_photo,
                                   (e.clip_path IS NOT NULL) AS has_clip,
                                   CASE WHEN LOWER(COALESCE(e.clip_path,'')) LIKE '%.mp4'
                                          OR LOWER(COALESCE(e.clip_path,'')) LIKE '%.webm'
                                          OR LOWER(COALESCE(e.clip_path,'')) LIKE '%.mov'
                                        THEN 'video'
                                        WHEN e.clip_path IS NOT NULL THEN 'gif' END AS clip_kind
                            FROM plan_items pi JOIN exercises e ON e.id = pi.exercise_id
                            WHERE pi.plan_id = ? ORDER BY pi.week, pi.day, pi.position, pi.id\"\"\",
                         (plan['id'],)) or []
        for _it in items:
            _lw = db.query(\"\"\"SELECT sets, reps, weight_lbs, distance, duration, done_on
                               FROM workout_log WHERE exercise_name = ?
                               ORDER BY done_on DESC, id DESC LIMIT 1\"\"\", (_it['name'],))
            _it['last_time'] = _lw[0] if _lw else None"""
note(o in src, 'plan media + last time'); src = src.replace(o, n, 1)

# copy a whole session
if '/api/fitness/log/copy' not in src:
    EP = '''@app.post("/api/fitness/log/copy")
@require_password
def copy_session():
    """Log everything again from a previous day."""
    try:
        from datetime import datetime as _d
        d = request.get_json() or {}
        src_day = d.get('from')
        to_day = d.get('to') or _d.now().strftime('%Y-%m-%d')
        if not src_day:
            return {"error": "Which day to copy?"}, 400
        rows = db.query("""SELECT exercise_id, exercise_name, sets, reps, weight_lbs, distance, duration
                           FROM workout_log WHERE done_on = ? ORDER BY id""", (src_day,)) or []
        if not rows:
            return {"error": "Nothing logged that day"}, 400
        for r in rows:
            db.execute("""INSERT INTO workout_log
                          (done_on, exercise_id, exercise_name, sets, reps, weight_lbs, distance, duration, notes)
                          VALUES (?,?,?,?,?,?,?,?,?)""",
                       (to_day, r.get('exercise_id'), r.get('exercise_name'), r.get('sets'), r.get('reps'),
                        r.get('weight_lbs'), r.get('distance'), r.get('duration'),
                        'copied from ' + str(src_day)[:10]))
        return {"status": "success", "copied": len(rows)}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/fitness/log/days")
@require_password
def log_days():
    try:
        rows = db.query("""SELECT done_on, COUNT(*) AS n, GROUP_CONCAT(exercise_name, ', ') AS what
                           FROM workout_log GROUP BY done_on ORDER BY done_on DESC LIMIT 15""") or []
        return {"status": "success", "days": rows}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    src = src.replace(anchor, EP + anchor, 1); note(True, 'copy session')

# Ami on stretching
o = "You can suggest exercises and talk about his training."
n = ("He never stretches - it is his blind spot. When training comes up, remind him to warm up before and "
     "stretch after, once, lightly, not every time. His library has warm-up and cool-down movements.\\n"
     "You can suggest exercises and talk about his training.")
note(o in src, 'stretch reminder'); src = src.replace(o, n, 1)

open(SRC, 'w').write(src)

# ---------------------------------------------------------------- frontend ---
p = os.path.join(FE, 'components/FitnessTab.jsx')
s = open(p).read()

# areas now include warm-up and cool-down
o = """const AREAS = [['all', 'All'], ['upper', 'Upper'], ['lower', 'Lower'], ['core', 'Core'],
               ['cardio', 'Cardio'], ['full', 'Full body']];"""
n = """const AREAS = [['all', 'All'], ['upper', 'Upper'], ['lower', 'Lower'], ['core', 'Core'],
               ['cardio', 'Cardio'], ['full', 'Full body'], ['warmup', 'Warm-up'], ['cooldown', 'Stretches']];"""
note(o in s, 'stretch filters'); s = s.replace(o, n, 1)

o = "  const [buildAsk, setBuildAsk] = useState(null);"
n = (o + "\n  const [showCount, setShowCount] = useState(12);\n  const [copyFrom, setCopyFrom] = useState(null);"
       "\n  const [logDays, setLogDays] = useState([]);")
note(o in s, 'more/copy state'); s = s.replace(o, n, 1)

# Today: use the plan's own media and show last time
o = """          <div style={S.label}>{day} {todayItems.length ? '' : '- rest day'}</div>
          {todayItems.map(it => ExCard({ ...it, id: it.exercise_id, kind: it.area === 'cardio' ? 'cardio' : 'strength' }, true))}"""
n = """          <div style={S.label}>{day} {todayItems.length ? '' : '- rest day'}</div>
          {todayItems.length > 0 && (
            <div style={{ fontSize: '12px', color: '#a78bfa', marginBottom: '8px' }}>
              Warm up first - leg swings, arm circles, a few bodyweight squats. Two minutes.
            </div>
          )}
          {todayItems.map(it => ExCard({ ...it, id: it.exercise_id,
            kind: it.area === 'cardio' ? 'cardio' : 'strength' }, true))}
          {todayItems.length > 0 && (
            <div style={{ fontSize: '12px', color: '#a78bfa', margin: '4px 0 12px' }}>
              And stretch after - hamstrings, quads, hip flexors. Thirty seconds each.
            </div>
          )}"""
note(o in s, 'warm-up and cool-down lines'); s = s.replace(o, n, 1)

# ExCard: media from the item itself, and last time's numbers
o = """  const ExCard = (x, inPlan) => (
    <div key={x.id + (inPlan ? 'p' : 'l')} style={S.card}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <Figure kind={x.drawing} />"""
n = """  const ExCard = (x, inPlan) => (
    <div key={x.id + (inPlan ? 'p' : 'l')} style={S.card}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <Figure kind={x.drawing} size={64} exId={x.exercise_id || x.id}
                hasPhoto={x.has_photo} hasClip={x.has_clip} clipKind={x.clip_kind} stamp={x.media_at} />"""
note(o in s, 'today media'); s = s.replace(o, n, 1)

o = """          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
            {[x.area, x.equipment].filter(Boolean).join(' · ')}
            {inPlan && x.target_sets ? ' · ' + x.target_sets + ' x ' + (x.target_reps || '') : ''}
          </div>"""
n = """          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
            {[x.area, x.equipment].filter(Boolean).join(' · ')}
            {inPlan && x.target_sets ? ' · target ' + x.target_sets + '×' + (x.target_reps || '') : ''}
          </div>
          {x.last_time && (
            <div style={{ fontSize: '11px', color: '#10b981', marginTop: '3px' }}>
              Last time: {x.last_time.sets ? x.last_time.sets + '×' + (x.last_time.reps || '') : ''}
              {x.last_time.weight_lbs ? ' at ' + x.last_time.weight_lbs + 'lb' : ''}
              {x.last_time.distance ? ' ' + x.last_time.distance : ''}
              {x.last_time.duration ? ' in ' + x.last_time.duration : ''}
              {' · ' + String(x.last_time.done_on).slice(5, 10)}
            </div>
          )}"""
note(o in s, 'last time on card'); s = s.replace(o, n, 1)

# library: show more
o = "          {shown.map(x => ExCard(x, false))}"
n = """          {shown.slice(0, showCount).map(x => ExCard(x, false))}
          {shown.length > showCount && (
            <button style={S.btn('#2a2a2a')} onClick={() => setShowCount(showCount + 12)}>
              Show more ({shown.length - showCount} left)
            </button>
          )}"""
note(o in s, 'show more'); s = s.replace(o, n, 1)

# plan rows: move an exercise to another day
o = """                        <input style={{ ...S.input, width: '46px', marginBottom: 0, padding: '7px' }}
                               defaultValue={it.target_sets || ''}
                               onBlur={e => editItem(it.id, { target_sets: e.target.value })} />"""
n = """                        <select style={{ ...S.input, width: '66px', marginBottom: 0, padding: '7px' }}
                                value={it.day} onChange={e => editItem(it.id, { day: e.target.value })}
                                title="Move it to another day">
                          {DAYS.map(dd => <option key={dd} value={dd}>{dd}</option>)}
                        </select>
                        <input style={{ ...S.input, width: '46px', marginBottom: 0, padding: '7px' }}
                               defaultValue={it.target_sets || ''}
                               onBlur={e => editItem(it.id, { target_sets: e.target.value })} />"""
note(o in s, 'move between days'); s = s.replace(o, n, 1)

# copy a session
o = """          {log.length > 0 && (
            <>
              <div style={S.label}>Recent</div>"""
n = """          {log.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={S.label}>Recent</div>
                <button style={{ ...S.small('#2a2a2a'), marginTop: '14px' }} onClick={async () => {
                  const r = await fetch(API + '/api/fitness/log/days', { headers: AUTH });
                  const j = await r.json(); setLogDays(j.days || []); setCopyFrom('pick');
                }}>Repeat a session</button>
              </div>
              {copyFrom === 'pick' && (
                <div style={S.card}>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                    Which day do you want to do again? It logs the lot for today.
                  </div>
                  {logDays.map(d => (
                    <div key={d.done_on} style={{ display: 'flex', justifyContent: 'space-between',
                                                  alignItems: 'center', padding: '7px 0',
                                                  borderTop: '1px solid #242424' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13px' }}>{String(d.done_on).slice(0, 10)} · {d.n} logged</div>
                        <div style={{ fontSize: '11px', color: '#777', overflow: 'hidden',
                                      textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.what}</div>
                      </div>
                      <button style={S.small('#10b981')} onClick={async () => {
                        await fetch(API + '/api/fitness/log/copy', { method: 'POST', headers: H,
                          body: JSON.stringify({ from: d.done_on, to: today() }) });
                        setCopyFrom(null); load();
                      }}>Do it again</button>
                    </div>
                  ))}
                  <button style={{ ...S.btn('#2a2a2a'), marginTop: '10px' }} onClick={() => setCopyFrom(null)}>Cancel</button>
                </div>
              )}"""
note(o in s, 'repeat a session'); s = s.replace(o, n, 1)
open(p, 'w').write(s)

print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:300]))
