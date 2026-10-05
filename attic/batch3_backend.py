#!/usr/bin/env python3
"""Batch 3 backend: fitness (library, plans, logging, progress) + medical fixes.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch3_backend.py
"""
import sqlite3, subprocess, sys

SRC = 'app.py'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

# ---------------------------------------------------------------- database ---
db = sqlite3.connect('data/ami_memory.db')
for sql in [
    # gym assessment: the extra fields he asked for
    "ALTER TABLE body_measurements ADD COLUMN glutes_in REAL",
    "ALTER TABLE body_measurements ADD COLUMN lower_belly_in REAL",
    "ALTER TABLE body_measurements ADD COLUMN plank_secs INTEGER",
    "ALTER TABLE body_measurements ADD COLUMN pushups_1min INTEGER",
    "ALTER TABLE body_measurements ADD COLUMN squats_1min INTEGER",
    "ALTER TABLE body_measurements ADD COLUMN situps_1min INTEGER",
    "ALTER TABLE body_measurements ADD COLUMN cardio_activity TEXT",
    "ALTER TABLE body_measurements ADD COLUMN cardio_distance TEXT",
    "ALTER TABLE body_measurements ADD COLUMN cardio_time TEXT",
    "ALTER TABLE body_measurements ADD COLUMN sleep_hours REAL",
    "ALTER TABLE body_measurements ADD COLUMN concerns TEXT",
    # fitness
    """CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, area TEXT, kind TEXT,
        equipment TEXT, how_to TEXT, knee_load TEXT DEFAULT 'none', knee_twist INTEGER DEFAULT 0,
        drawing TEXT, video_url TEXT, mine INTEGER DEFAULT 0)""",
    """CREATE TABLE IF NOT EXISTS fitness_plans (
        id INTEGER PRIMARY KEY, goal TEXT NOT NULL, weeks INTEGER DEFAULT 8,
        days TEXT, started_on DATE, status TEXT DEFAULT 'active', notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""",
    """CREATE TABLE IF NOT EXISTS plan_items (
        id INTEGER PRIMARY KEY, plan_id INTEGER NOT NULL, day TEXT NOT NULL,
        exercise_id INTEGER NOT NULL, target_sets INTEGER, target_reps TEXT, position INTEGER DEFAULT 0)""",
    """CREATE TABLE IF NOT EXISTS workout_log (
        id INTEGER PRIMARY KEY, done_on DATE NOT NULL, exercise_id INTEGER,
        exercise_name TEXT, sets INTEGER, reps TEXT, weight_lbs REAL,
        distance TEXT, duration TEXT, how_it_felt TEXT, knee_ok INTEGER,
        notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""",
]:
    try: db.execute(sql)
    except Exception: pass

# ------------------------------------------------------- exercise library ---
# drawing: a short key the screen turns into a simple figure
EX = [
 # name, area, kind, equipment, knee_load, knee_twist, drawing, how_to
 ("Barbell Bench Press","upper","strength","barbell, bench","none",0,"bench",
  "Flat on the bench, feet down. Lower the bar to mid-chest, elbows about 45 degrees, press back up."),
 ("Incline Dumbbell Press","upper","strength","dumbbells, bench","none",0,"bench",
  "Bench at 30 degrees. Press the dumbbells up and slightly together, lower to chest height."),
 ("Dumbbell Shoulder Press","upper","strength","dumbbells","none",0,"press",
  "Seated or standing. Press overhead without arching the back, lower to ear height."),
 ("Lat Pulldown","upper","strength","cable machine","none",0,"pull",
  "Wide grip, chest up. Pull the bar to your collarbone, squeeze the back, control it up."),
 ("Seated Cable Row","upper","strength","cable machine","none",0,"row",
  "Back straight, pull the handle to your belly, elbows past your ribs, squeeze."),
 ("Barbell Row","upper","strength","barbell","light",0,"row",
  "Hinge at the hips, back flat. Pull the bar to your lower ribs, lower under control."),
 ("Pull-up","upper","strength","bar","none",0,"pull",
  "Hang with straight arms. Pull until your chin passes the bar. Use a band if needed."),
 ("Dumbbell Curl","upper","strength","dumbbells","none",0,"curl",
  "Elbows at your sides. Curl up, squeeze, lower slowly. No swinging."),
 ("Hammer Curl","upper","strength","dumbbells","none",0,"curl",
  "Palms facing each other. Curl up, lower slowly. Builds the forearm too."),
 ("Triceps Pushdown","upper","strength","cable machine","none",0,"press",
  "Elbows locked at your sides. Push down until arms are straight, control it back."),
 ("Overhead Triceps Extension","upper","strength","dumbbell","none",0,"press",
  "One dumbbell behind the head, elbows pointing up. Extend, lower slowly."),
 ("Lateral Raise","upper","strength","dumbbells","none",0,"press",
  "Slight bend in the elbows. Raise to shoulder height, lower slowly."),
 ("Face Pull","upper","strength","cable machine","none",0,"pull",
  "Rope at face height. Pull to your forehead, elbows high. Good for the shoulders."),
 ("Chest Fly","upper","strength","dumbbells, bench","none",0,"bench",
  "Slight bend in the elbows, open wide, bring together above the chest."),
 ("Push-up","upper","strength","none","none",0,"pushup",
  "Body in a straight line, hands under the shoulders. Lower the chest, press up."),
 ("Dip","upper","strength","parallel bars","none",0,"press",
  "Lower until the upper arms are parallel, press back up. Lean forward for chest."),
 ("Leg Press","lower","strength","machine","heavy",0,"legpress",
  "Feet shoulder width. Lower to a comfortable depth, press through the heels. Never lock the knees hard."),
 ("Barbell Back Squat","lower","strength","barbell, rack","heavy",0,"squat",
  "Bar on the upper back, brace, sit down and back, drive up through the middle of the foot."),
 ("Goblet Squat","lower","strength","dumbbell","heavy",0,"squat",
  "Hold a dumbbell at the chest. Squat down between the knees, chest tall."),
 ("Romanian Deadlift","lower","strength","barbell","light",0,"hinge",
  "Soft knees, push the hips back, bar close to the legs, feel the hamstrings, stand tall."),
 ("Hip Thrust","lower","strength","barbell, bench","light",0,"hinge",
  "Shoulders on the bench, bar over the hips. Drive up, squeeze the glutes, lower slowly."),
 ("Leg Curl","lower","strength","machine","light",0,"legcurl",
  "Curl the heels toward the glutes, squeeze, lower slowly. Hamstrings."),
 ("Leg Extension","lower","strength","machine","heavy",0,"legext",
  "Straighten the legs against the pad. Loads the front of the knee - go light."),
 ("Walking Lunge","lower","strength","dumbbells","heavy",1,"lunge",
  "Step forward, both knees to 90, drive up. The knee tracks over the foot."),
 ("Step-up","lower","strength","box, dumbbells","heavy",0,"stepup",
  "Step up fully, control the way down. Keep the knee in line with the toes."),
 ("Calf Raise","lower","strength","machine or step","light",0,"calf",
  "Rise onto the toes, pause at the top, lower slowly."),
 ("Glute Bridge","lower","strength","none","light",0,"hinge",
  "On your back, feet flat. Drive the hips up, squeeze, lower."),
 ("Cable Kickback","lower","strength","cable machine","light",0,"hinge",
  "Ankle strap, push the leg back from the hip, squeeze the glute."),
 ("Plank","core","strength","none","none",0,"plank",
  "Forearms and toes, body in a line, brace the middle. Hold."),
 ("Side Plank","core","strength","none","none",0,"plank",
  "On one forearm, hips lifted, body in a line. Hold both sides."),
 ("Dead Bug","core","strength","none","none",0,"core",
  "On your back, opposite arm and leg out, lower back pressed down."),
 ("Cable Woodchop","core","strength","cable machine","light",1,"core",
  "Rotate from the middle, arms straight. Twisting movement - go easy with a knee issue."),
 ("Hanging Knee Raise","core","strength","bar","none",0,"core",
  "Hang, raise the knees to the chest, lower under control."),
 ("Sit-up","core","strength","none","light",0,"core",
  "Knees bent, feet down. Curl up, lower with control."),
 ("Farmer's Carry","full","strength","dumbbells","light",0,"carry",
  "Heavy weight in each hand, walk tall, shoulders back."),
 ("Deadlift","full","strength","barbell","light",0,"hinge",
  "Bar over mid-foot, flat back, push the floor away, stand tall."),
 ("Walking","cardio","cardio","none","none",0,"walk",
  "Steady pace. Easiest on the knee."),
 ("Jogging","cardio","cardio","none","heavy",0,"run",
  "Steady run. Impact on the knee each stride."),
 ("Stationary Bike","cardio","cardio","bike","light",0,"bike",
  "Seat high enough that the knee is not over-bent at the bottom."),
 ("Swimming","cardio","cardio","pool","none",0,"swim",
  "No impact at all. Breaststroke kick can stress the inside of the knee."),
 ("Rowing Machine","cardio","cardio","rower","light",0,"row",
  "Legs, then back, then arms. Reverse on the way in."),
 ("Elliptical","cardio","cardio","machine","none",0,"walk",
  "Low impact, keeps the heart rate up without pounding the knee."),
 ("Stair Climber","cardio","cardio","machine","heavy",0,"stepup",
  "Tall posture, do not lean on the rails."),
 ("Jump Rope","cardio","cardio","rope","heavy",0,"run",
  "Light landings. High impact on the knee."),
]
for e in EX:
    try:
        db.execute("""INSERT OR IGNORE INTO exercises
                      (name, area, kind, equipment, knee_load, knee_twist, drawing, how_to)
                      VALUES (?,?,?,?,?,?,?,?)""",
                   (e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7]))
    except Exception:
        pass
db.commit()
n_ex = db.execute("SELECT COUNT(*) FROM exercises").fetchone()[0]
db.close()
note(True, 'db + ' + str(n_ex) + ' exercises')

# ---------------------------------------------------------------- backend ---
src = open(SRC).read()
anchor = '@app.get("/api/report")'

# --- measurements: new fields, edit, progress -------------------------------
o = """_MEAS_FIELDS = ['weight_lbs', 'height_in', 'body_fat', 'chest_in', 'waist_in', 'hips_in',
                'bicep_l_in', 'bicep_r_in', 'thigh_l_in', 'thigh_r_in', 'neck_in',
                'shoulders_in', 'calf_in', 'forearm_in']"""
n = """_MEAS_FIELDS = ['weight_lbs', 'height_in', 'body_fat', 'chest_in', 'waist_in', 'hips_in',
                'glutes_in', 'lower_belly_in', 'bicep_l_in', 'bicep_r_in', 'thigh_l_in',
                'thigh_r_in', 'neck_in', 'shoulders_in', 'calf_in', 'forearm_in',
                'plank_secs', 'pushups_1min', 'squats_1min', 'situps_1min', 'sleep_hours']
_MEAS_TEXT = ['cardio_activity', 'cardio_distance', 'cardio_time', 'concerns']"""
note(o in src, 'measurement fields'); src = src.replace(o, n, 1)

o = """        mid = db.execute(\"\"\"INSERT INTO body_measurements
                            (taken_on, place, notes, \"\"\" + ", ".join(_MEAS_FIELDS) + \"\"\")
                            VALUES (?,?,?,\"\"\" + ",".join("?" for _ in _MEAS_FIELDS) + \"\"\")\"\"\",
                         tuple([d.get('taken_on'), d.get('place'), d.get('notes')] + vals))
        return {"status": "success", "id": mid}"""
n = """        from datetime import datetime as _dt
        taken = (d.get('taken_on') or '').strip() or _dt.now().strftime('%Y-%m-%d')
        txt = [d.get(f) for f in _MEAS_TEXT]
        cols = ", ".join(_MEAS_FIELDS + _MEAS_TEXT)
        marks = ",".join("?" for _ in (_MEAS_FIELDS + _MEAS_TEXT))
        if d.get('id'):
            sets = ", ".join(c + " = ?" for c in ['taken_on', 'place', 'notes'] + _MEAS_FIELDS + _MEAS_TEXT)
            db.execute("UPDATE body_measurements SET " + sets + " WHERE id = ?",
                       tuple([taken, d.get('place'), d.get('notes')] + vals + txt + [d['id']]))
            return {"status": "success", "id": d['id']}
        mid = db.execute("INSERT INTO body_measurements (taken_on, place, notes, " + cols + ") "
                         "VALUES (?,?,?," + marks + ")",
                         tuple([taken, d.get('place'), d.get('notes')] + vals + txt))
        return {"status": "success", "id": mid}"""
note(o in src, 'measurement save + edit'); src = src.replace(o, n, 1)

# conversions only apply to length and weight
o = """            if cm and f.endswith('_in'):
                v = round(v / 2.54, 1)
            elif cm and f == 'weight_lbs':
                v = round(v * 2.20462, 1)"""
n = """            if cm and f.endswith('_in'):
                v = round(v / 2.54, 1)
            elif cm and f == 'weight_lbs':
                v = round(v * 2.20462, 1)
            elif f in ('plank_secs', 'pushups_1min', 'squats_1min', 'situps_1min'):
                v = int(v)"""
note(o in src, 'conversion guard'); src = src.replace(o, n, 1)

# --- fitness endpoints -------------------------------------------------------
if '/api/fitness/exercises' not in src:
    EP = '''@app.get("/api/fitness/exercises")
@require_password
def list_exercises():
    try:
        rows = db.query("SELECT * FROM exercises ORDER BY area, name") or []
        return {"status": "success", "exercises": rows}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/fitness/exercises")
@require_password
def add_exercise():
    try:
        d = request.get_json() or {}
        if not (d.get('name') or '').strip():
            return {"error": "Name required"}, 400
        db.execute("""INSERT OR IGNORE INTO exercises
                      (name, area, kind, equipment, how_to, knee_load, knee_twist, video_url, mine)
                      VALUES (?,?,?,?,?,?,?,?,1)""",
                   (d['name'].strip(), d.get('area'), d.get('kind', 'strength'), d.get('equipment'),
                    d.get('how_to'), d.get('knee_load', 'none'), 1 if d.get('knee_twist') else 0,
                    d.get('video_url')))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/fitness/plan")
@require_password
def get_plan():
    """The current plan with its exercises, and how this week is going."""
    try:
        from datetime import datetime as _d, timedelta as _td
        p = db.query("SELECT * FROM fitness_plans WHERE status = 'active' ORDER BY id DESC LIMIT 1")
        if not p:
            return {"status": "success", "plan": None}
        plan = p[0]
        items = db.query("""SELECT pi.*, e.name, e.area, e.equipment, e.knee_load, e.knee_twist,
                                   e.drawing, e.how_to
                            FROM plan_items pi JOIN exercises e ON e.id = pi.exercise_id
                            WHERE pi.plan_id = ? ORDER BY pi.day, pi.position, pi.id""",
                         (plan['id'],)) or []
        by_day = {}
        for it in items:
            by_day.setdefault(it['day'], []).append(it)
        plan['by_day'] = by_day

        monday = (_d.now() - _td(days=_d.now().weekday())).strftime('%Y-%m-%d')
        wk = db.query("""SELECT DISTINCT done_on FROM workout_log WHERE done_on >= ?""", (monday,)) or []
        plan['sessions_this_week'] = len(wk)
        plan['planned_days'] = len([d for d in (plan.get('days') or '').split(',') if d])
        if plan.get('started_on'):
            try:
                plan['week_number'] = max(1, ((_d.now().date() -
                    _d.strptime(str(plan['started_on'])[:10], '%Y-%m-%d').date()).days // 7) + 1)
            except Exception:
                pass
        return {"status": "success", "plan": plan}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/fitness/plan")
@require_password
def save_plan():
    """Create or update the plan. Items replace what was there; history is untouched."""
    try:
        from datetime import datetime as _d
        d = request.get_json() or {}
        days = ",".join(d.get('days') or [])
        if d.get('id'):
            db.execute("""UPDATE fitness_plans SET goal=?, weeks=?, days=?, notes=? WHERE id=?""",
                       (d.get('goal'), d.get('weeks', 8), days, d.get('notes'), d['id']))
            pid = d['id']
        else:
            db.execute("UPDATE fitness_plans SET status='done' WHERE status='active'")
            pid = db.execute("""INSERT INTO fitness_plans (goal, weeks, days, started_on, notes)
                                VALUES (?,?,?,?,?)""",
                             (d.get('goal') or 'Get stronger', d.get('weeks', 8), days,
                              d.get('started_on') or _d.now().strftime('%Y-%m-%d'), d.get('notes')))
        if 'items' in d:
            db.execute("DELETE FROM plan_items WHERE plan_id = ?", (pid,))
            for i, it in enumerate(d['items']):
                db.execute("""INSERT INTO plan_items (plan_id, day, exercise_id, target_sets, target_reps, position)
                              VALUES (?,?,?,?,?,?)""",
                           (pid, it.get('day'), it.get('exercise_id'), it.get('target_sets'),
                            it.get('target_reps'), i))
        return {"status": "success", "id": pid}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/fitness/log")
@require_password
def list_workouts():
    try:
        rows = db.query("SELECT * FROM workout_log ORDER BY done_on DESC, id DESC LIMIT 80") or []
        return {"status": "success", "log": rows}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/fitness/log")
@require_password
def add_workout():
    try:
        from datetime import datetime as _d
        d = request.get_json() or {}
        name = d.get('exercise_name')
        if not name and d.get('exercise_id'):
            r = db.query("SELECT name FROM exercises WHERE id = ?", (d['exercise_id'],))
            name = r[0]['name'] if r else None
        if not name:
            return {"error": "Which exercise?"}, 400
        wid = db.execute("""INSERT INTO workout_log
                            (done_on, exercise_id, exercise_name, sets, reps, weight_lbs,
                             distance, duration, how_it_felt, knee_ok, notes)
                            VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                         (d.get('done_on') or _d.now().strftime('%Y-%m-%d'), d.get('exercise_id'), name,
                          d.get('sets'), d.get('reps'), d.get('weight_lbs'), d.get('distance'),
                          d.get('duration'), d.get('how_it_felt'),
                          None if d.get('knee_ok') is None else (1 if d.get('knee_ok') else 0),
                          d.get('notes')))
        return {"status": "success", "id": wid}
    except Exception as e:
        return {"error": str(e)}, 400


@app.delete("/api/fitness/log/<int:wid>")
@require_password
def delete_workout(wid):
    try:
        db.execute("DELETE FROM workout_log WHERE id = ?", (wid,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/fitness/progress")
@require_password
def fitness_progress():
    """Best lift per exercise now against a month ago, and how often he trains."""
    try:
        from datetime import datetime as _d, timedelta as _td
        month = (_d.now() - _td(days=30)).strftime('%Y-%m-%d')
        two = (_d.now() - _td(days=60)).strftime('%Y-%m-%d')
        now = db.query("""SELECT exercise_name, MAX(weight_lbs) AS best, MAX(done_on) AS last
                          FROM workout_log WHERE done_on >= ? AND weight_lbs IS NOT NULL
                          GROUP BY exercise_name""", (month,)) or []
        before = {r['exercise_name']: r['best'] for r in (db.query(
            """SELECT exercise_name, MAX(weight_lbs) AS best FROM workout_log
               WHERE done_on >= ? AND done_on < ? AND weight_lbs IS NOT NULL
               GROUP BY exercise_name""", (two, month)) or [])}
        lifts = []
        for r in now:
            prev = before.get(r['exercise_name'])
            lifts.append({"exercise": r['exercise_name'], "best": r['best'], "was": prev,
                          "change": (round(r['best'] - prev, 1) if prev else None)})
        weeks = db.query("""SELECT strftime('%Y-%W', done_on) AS wk, COUNT(DISTINCT done_on) AS days
                            FROM workout_log WHERE done_on >= ?
                            GROUP BY wk ORDER BY wk DESC LIMIT 8""", (two,)) or []
        return {"status": "success", "lifts": sorted(lifts, key=lambda x: -(x['change'] or 0)),
                "weeks": weeks}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    src = src.replace(anchor, EP + anchor, 1); note(True, 'fitness endpoints')

# --- Ami knows the plan and the training ------------------------------------
o = """            _sz = db.query("SELECT region, kind, label, value FROM garment_sizes ORDER BY region") or []"""
n = """            try:
                _pl = db.query("SELECT * FROM fitness_plans WHERE status = 'active' ORDER BY id DESC LIMIT 1")
                if _pl:
                    _p0 = _pl[0]
                    context += ("\\nTraining plan: " + str(_p0.get('goal')) + ", " +
                                str(_p0.get('weeks')) + " weeks, on " +
                                (_p0.get('days') or 'no days set').replace(',', ', ') + ".")
                    from datetime import datetime as _d7, timedelta as _td7
                    _mon = (_d7.now() - _td7(days=_d7.now().weekday())).strftime('%Y-%m-%d')
                    _sess = db.query("SELECT COUNT(DISTINCT done_on) AS n FROM workout_log WHERE done_on >= ?", (_mon,))
                    _last = db.query("SELECT exercise_name, done_on FROM workout_log ORDER BY done_on DESC, id DESC LIMIT 5") or []
                    context += (" Sessions this week: " + str((_sess[0]['n'] if _sess else 0)) + ".")
                    if _last:
                        context += (" Last worked: " + "; ".join(
                            x['exercise_name'] + " (" + str(x['done_on'])[:10] + ")" for x in _last[:4]) + ".")
                    context += ("\\nYou can suggest exercises and talk about his training. He picks what he does. "
                                "He has a knee problem - exercises are marked for knee load in his library, and "
                                "anything about his knee itself is for his doctor or physio, not you.")
            except Exception:
                pass

            _sz = db.query("SELECT region, kind, label, value FROM garment_sizes ORDER BY region") or []"""
note(o in src, 'fitness in context'); src = src.replace(o, n, 1)

open(SRC, 'w').write(src)
print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:400]))
