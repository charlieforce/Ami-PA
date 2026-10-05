#!/usr/bin/env python3
"""Batch 5: week-by-week programmes. Ami plans every week with its own sets and reps;
you can open any week and change it. Run from the src folder:  python3 batch5.py
"""
import os, sqlite3, subprocess, sys
SRC, FE = 'app.py', 'frontend/src'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

# ---------------------------------------------------------------- database ---
db = sqlite3.connect('data/ami_memory.db')
for sql in [
    "ALTER TABLE plan_items ADD COLUMN week INTEGER DEFAULT 1",
    "ALTER TABLE plan_items ADD COLUMN target_weight REAL",
    "ALTER TABLE plan_items ADD COLUMN note TEXT",
    "ALTER TABLE fitness_plans ADD COLUMN per_week INTEGER DEFAULT 3",
    "ALTER TABLE fitness_plans ADD COLUMN progression TEXT",
    "ALTER TABLE workout_log ADD COLUMN week INTEGER",
]:
    try: db.execute(sql)
    except Exception: pass
db.execute("UPDATE plan_items SET week = 1 WHERE week IS NULL")
db.commit(); db.close()
note(True, 'db columns')

# ---------------------------------------------------------------- backend ---
src = open(SRC).read()
anchor = '@app.get("/api/report")'

# --- the plan now knows about weeks ------------------------------------------
o = """        items = db.query(\"\"\"SELECT pi.*, e.name, e.area, e.equipment, e.knee_load, e.knee_twist,
                                   e.drawing, e.how_to
                            FROM plan_items pi JOIN exercises e ON e.id = pi.exercise_id
                            WHERE pi.plan_id = ? ORDER BY pi.day, pi.position, pi.id\"\"\",
                         (plan['id'],)) or []
        by_day = {}
        for it in items:
            by_day.setdefault(it['day'], []).append(it)
        plan['by_day'] = by_day"""
n = """        items = db.query(\"\"\"SELECT pi.*, e.name, e.area, e.equipment, e.knee_load, e.knee_twist,
                                   e.drawing, e.how_to
                            FROM plan_items pi JOIN exercises e ON e.id = pi.exercise_id
                            WHERE pi.plan_id = ? ORDER BY pi.week, pi.day, pi.position, pi.id\"\"\",
                         (plan['id'],)) or []
        by_week = {}
        for it in items:
            by_week.setdefault(int(it.get('week') or 1), {}).setdefault(it['day'], []).append(it)
        plan['by_week'] = by_week
        plan['weeks_planned'] = sorted(by_week.keys())"""
note(o in src, 'plan by week'); src = src.replace(o, n, 1)

o = """        if plan.get('started_on'):
            try:
                plan['week_number'] = max(1, ((_d.now().date() -
                    _d.strptime(str(plan['started_on'])[:10], '%Y-%m-%d').date()).days // 7) + 1)
            except Exception:
                pass
        return {"status": "success", "plan": plan}"""
n = """        wk = 1
        if plan.get('started_on'):
            try:
                wk = max(1, ((_d.now().date() -
                    _d.strptime(str(plan['started_on'])[:10], '%Y-%m-%d').date()).days // 7) + 1)
            except Exception:
                pass
        plan['week_number'] = min(wk, plan.get('weeks') or wk)
        plan['by_day'] = by_week.get(plan['week_number'], by_week.get(1, {}))
        return {"status": "success", "plan": plan}"""
note(o in src, 'current week'); src = src.replace(o, n, 1)

# saving keeps the week on each item
o = """            for i, it in enumerate(d['items']):
                db.execute(\"\"\"INSERT INTO plan_items (plan_id, day, exercise_id, target_sets, target_reps, position)
                              VALUES (?,?,?,?,?,?)\"\"\",
                           (pid, it.get('day'), it.get('exercise_id'), it.get('target_sets'),
                            it.get('target_reps'), i))"""
n = """            for i, it in enumerate(d['items']):
                db.execute(\"\"\"INSERT INTO plan_items
                              (plan_id, week, day, exercise_id, target_sets, target_reps, target_weight, note, position)
                              VALUES (?,?,?,?,?,?,?,?,?)\"\"\",
                           (pid, int(it.get('week') or 1), it.get('day'), it.get('exercise_id'),
                            it.get('target_sets'), it.get('target_reps'), it.get('target_weight'),
                            it.get('note'), i))"""
note(o in src, 'save with week'); src = src.replace(o, n, 1)

o = """            db.execute(\"\"\"UPDATE fitness_plans SET goal=?, weeks=?, days=?, notes=? WHERE id=?\"\"\",
                       (d.get('goal'), d.get('weeks', 8), days, d.get('notes'), d['id']))"""
n = """            db.execute(\"\"\"UPDATE fitness_plans SET goal=?, weeks=?, days=?, notes=?,
                          per_week=?, progression=? WHERE id=?\"\"\",
                       (d.get('goal'), d.get('weeks', 8), days, d.get('notes'),
                        d.get('per_week'), d.get('progression'), d['id']))"""
note(o in src, 'plan fields'); src = src.replace(o, n, 1)

o = """            pid = db.execute(\"\"\"INSERT INTO fitness_plans (goal, weeks, days, started_on, notes)
                                VALUES (?,?,?,?,?)\"\"\",
                             (d.get('goal') or 'Get stronger', d.get('weeks', 8), days,
                              d.get('started_on') or _d.now().strftime('%Y-%m-%d'), d.get('notes')))"""
n = """            pid = db.execute(\"\"\"INSERT INTO fitness_plans
                                (goal, weeks, days, started_on, notes, per_week, progression)
                                VALUES (?,?,?,?,?,?,?)\"\"\",
                             (d.get('goal') or 'Get stronger', d.get('weeks', 8), days,
                              d.get('started_on') or _d.now().strftime('%Y-%m-%d'), d.get('notes'),
                              d.get('per_week'), d.get('progression')))"""
note(o in src, 'plan create'); src = src.replace(o, n, 1)

# --- a whole programme, week by week -----------------------------------------
if '/api/fitness/programme' not in src:
    EP = '''@app.post("/api/fitness/programme")
@require_password
def fitness_programme():
    """A full programme: every week planned, sets and reps progressing. Nothing saved until he approves."""
    try:
        import json as _js
        d = request.get_json() or {}
        weeks = max(1, min(int(d.get('weeks') or 8), 16))
        per_week = max(1, min(int(d.get('per_week') or 3), 7))
        days = d.get('days') or ['Mon', 'Wed', 'Fri'][:per_week]
        want = (d.get('criteria') or '').strip()
        goal = (d.get('goal') or 'strength and size').strip()

        lib = db.query("""SELECT id, name, area, equipment, knee_load, knee_twist
                          FROM exercises ORDER BY area, name""") or []
        if not lib:
            return {"error": "No exercises in the library"}, 400
        catalogue = "\\n".join(
            str(x['id']) + ". " + x['name'] + " [" + (x['area'] or '') + "; " +
            (x['equipment'] or 'none') + "]" for x in lib)

        last = db.query("""SELECT exercise_name, MAX(weight_lbs) AS best FROM workout_log
                           WHERE weight_lbs IS NOT NULL AND done_on >= date('now','-60 days')
                           GROUP BY exercise_name""") or []

        prompt = (
            "Write a complete " + str(weeks) + "-week training programme for Charlie, "
            + str(per_week) + " sessions a week on: " + ", ".join(days) + ".\\n\\n"
            "Goal: " + goal + "\\n"
            + ("What he asked for: " + want + "\\n" if want else "")
            + ("What he is currently lifting: " + "; ".join(
                r['exercise_name'] + " " + str(r['best']) + "lb" for r in last) + "\\n" if last else "")
            + "\\nUSE ONLY these exercises, by id:\\n" + catalogue + "\\n\\n"
            "Make it a real programme: the same core movements repeating so he can progress, with sets "
            "and reps changing week to week - higher reps early, heavier and lower later, and an easier "
            "week if the programme is long enough to need one. Five to seven exercises per session.\\n\\n"
            "Reply with ONLY this JSON and nothing else:\\n"
            '{"summary": "two or three sentences on the shape of the programme and how to progress it", '
            '"weeks": [{"week": 1, "focus": "a few words", "items": ['
            '{"day": "Mon", "exercise_id": 12, "target_sets": 3, "target_reps": "10-12", "note": ""}]}]}\\n'
            "Every week from 1 to " + str(weeks) + " must be there.")

        import google.genai as genai
        from google.genai import types as _t
        if gemini_guard():
            return {"error": "Gemini is off or over its limit - check Settings"}, 400
        client = genai.Client()
        note_gemini_call()
        resp = client.models.generate_content(
            model="gemini-3.7-flash", contents=prompt,
            config=_t.GenerateContentConfig(thinking_config=_t.ThinkingConfig(thinking_level='low')))
        note_gemini_tokens(resp)
        raw = (resp.text or '').strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            raw = raw[4:] if raw.lower().startswith('json') else raw
        out = _js.loads(raw)

        known = {x['id']: x for x in lib}
        clean = []
        for w in (out.get('weeks') or []):
            items = []
            for it in (w.get('items') or []):
                x = known.get(it.get('exercise_id'))
                if not x:
                    continue
                items.append({**it, "week": int(w.get('week') or 1), "name": x['name'],
                              "area": x['area'], "equipment": x['equipment'],
                              "knee_load": x['knee_load']})
            if items:
                clean.append({"week": int(w.get('week') or 1), "focus": w.get('focus', ''), "items": items})
        if not clean:
            return {"error": "She could not build that one - try different wording"}, 400
        return {"status": "success", "summary": out.get('summary', ''),
                "weeks": sorted(clean, key=lambda z: z['week']),
                "days": days, "per_week": per_week, "goal": goal}
    except Exception as e:
        return {"error": str(e)[:200]}, 400


@app.post("/api/fitness/programme/save")
@require_password
def save_programme():
    """Replace the plan with an approved programme."""
    try:
        from datetime import datetime as _d
        d = request.get_json() or {}
        wk = d.get('weeks') or []
        if not wk:
            return {"error": "Nothing to save"}, 400
        db.execute("UPDATE fitness_plans SET status='done' WHERE status='active'")
        pid = db.execute("""INSERT INTO fitness_plans
                            (goal, weeks, days, started_on, per_week, progression, status)
                            VALUES (?,?,?,?,?,?,'active')""",
                         (d.get('goal') or 'Strength and size', len(wk),
                          ",".join(d.get('days') or []), d.get('started_on') or _d.now().strftime('%Y-%m-%d'),
                          d.get('per_week'), d.get('summary')))
        pos = 0
        for w in wk:
            for it in (w.get('items') or []):
                pos += 1
                db.execute("""INSERT INTO plan_items
                              (plan_id, week, day, exercise_id, target_sets, target_reps, note, position)
                              VALUES (?,?,?,?,?,?,?,?)""",
                           (pid, int(w.get('week') or 1), it.get('day'), it.get('exercise_id'),
                            it.get('target_sets'), it.get('target_reps'), it.get('note'), pos))
        return {"status": "success", "plan_id": pid, "weeks": len(wk)}
    except Exception as e:
        return {"error": str(e)}, 400


@app.put("/api/fitness/plan/item/<int:item_id>")
@require_password
def update_plan_item(item_id):
    try:
        d = request.get_json() or {}
        sets, vals = [], []
        for f in ['day', 'week', 'target_sets', 'target_reps', 'target_weight', 'note']:
            if f in d:
                sets.append(f + " = ?"); vals.append(d[f])
        if sets:
            vals.append(item_id)
            db.execute("UPDATE plan_items SET " + ", ".join(sets) + " WHERE id = ?", tuple(vals))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.delete("/api/fitness/plan/item/<int:item_id>")
@require_password
def delete_plan_item(item_id):
    try:
        db.execute("DELETE FROM plan_items WHERE id = ?", (item_id,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    src = src.replace(anchor, EP + anchor, 1); note(True, 'programme endpoints')

# Ami knows which week he is in
o = """                    context += ("\\nTraining plan: " + str(_p0.get('goal')) + ", " +
                                str(_p0.get('weeks')) + " weeks, on " +
                                (_p0.get('days') or 'no days set').replace(',', ', ') + ".")"""
n = """                    from datetime import datetime as _d8
                    _wknum = 1
                    try:
                        _wknum = max(1, ((_d8.now().date() - _d8.strptime(
                            str(_p0['started_on'])[:10], '%Y-%m-%d').date()).days // 7) + 1)
                    except Exception:
                        pass
                    context += ("\\nTraining plan: " + str(_p0.get('goal')) + ", week " + str(_wknum) +
                                " of " + str(_p0.get('weeks')) + ", on " +
                                (_p0.get('days') or 'no days set').replace(',', ', ') + ".")
                    if _p0.get('progression'):
                        context += " How it progresses: " + str(_p0['progression'])[:300]"""
note(o in src, 'week in context'); src = src.replace(o, n, 1)

open(SRC, 'w').write(src)

# ---------------------------------------------------------------- frontend ---
p = os.path.join(FE, 'components/FitnessTab.jsx')
s = open(p).read()

o = "  const [busy, setBusy] = useState(false);"
n = (o + "\n  const [prog2, setProg2] = useState(null);\n  const [showWeek, setShowWeek] = useState(null);"
       "\n  const [buildAsk, setBuildAsk] = useState(null);")
note(o in s, 'programme state'); s = s.replace(o, n, 1)

o = "  const askAmi = async () => {"
n = """  const buildProgramme = async () => {
    setBusy(true); setProg2(null);
    try {
      const r = await fetch(API + '/api/fitness/programme', { method: 'POST', headers: H,
        body: JSON.stringify(buildAsk) });
      const j = await r.json();
      if (j.error) setErr(j.error); else { setProg2(j); setErr(''); setShowWeek(1); }
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const keepProgramme = async () => {
    await fetch(API + '/api/fitness/programme/save', { method: 'POST', headers: H,
      body: JSON.stringify(prog2) });
    setProg2(null); setBuildAsk(null); load();
  };

  const editItem = async (id, patch) => {
    await fetch(API + '/api/fitness/plan/item/' + id, { method: 'PUT', headers: H,
      body: JSON.stringify(patch) });
    load();
  };

  const dropItem = async (id) => {
    await fetch(API + '/api/fitness/plan/item/' + id, { method: 'DELETE', headers: AUTH });
    load();
  };

  const askAmi = async () => {"""
note(o in s, 'programme handlers'); s = s.replace(o, n, 1)

# the build-a-programme button and panel, above the single-session one
o = """          {!editPlan && !ask && (
            <button style={{ ...S.btn('#7c3aed'), marginBottom: '8px' }}"""
n = """          {!editPlan && !ask && !buildAsk && !prog2 && (
            <button style={{ ...S.btn('#4f46e5'), marginBottom: '8px' }}
                    onClick={() => setBuildAsk({ goal: (plan && plan.goal) || 'Strength and size',
                                                 weeks: 8, per_week: 3, days: ['Mon', 'Wed', 'Fri'], criteria: '' })}>
              📋 Build me a full programme
            </button>
          )}

          {buildAsk && !prog2 && (
            <div style={{ ...S.card, borderColor: '#4f46e5' }}>
              <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '10px' }}>
                She plans every week - sets and reps progressing - and you can change any of it after.
              </div>
              <input style={S.input} placeholder="Goal" value={buildAsk.goal}
                     onChange={e => setBuildAsk({ ...buildAsk, goal: e.target.value })} />
              <div style={S.row2}>
                <input style={S.input} type="number" placeholder="How many weeks" value={buildAsk.weeks}
                       onChange={e => setBuildAsk({ ...buildAsk, weeks: parseInt(e.target.value, 10) || 8 })} />
                <input style={S.input} type="number" placeholder="Sessions a week" value={buildAsk.per_week}
                       onChange={e => setBuildAsk({ ...buildAsk, per_week: parseInt(e.target.value, 10) || 3 })} />
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                {DAYS.map(d => (
                  <button key={d} style={{ ...S.chip(buildAsk.days.includes(d)), flex: 1 }}
                          onClick={() => setBuildAsk({ ...buildAsk,
                            days: buildAsk.days.includes(d) ? buildAsk.days.filter(x => x !== d) : [...buildAsk.days, d] })}>
                    {d}
                  </button>
                ))}
              </div>
              <textarea style={{ ...S.input, minHeight: '60px' }}
                        placeholder="Anything else - equipment, what to avoid, what to focus on"
                        value={buildAsk.criteria} onChange={e => setBuildAsk({ ...buildAsk, criteria: e.target.value })} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn(busy ? '#2a2a2a' : '#4f46e5')} onClick={buildProgramme} disabled={busy}>
                  {busy ? 'Building it...' : 'Build it'}
                </button>
                <button style={S.btn('#2a2a2a')} onClick={() => setBuildAsk(null)}>Cancel</button>
              </div>
            </div>
          )}

          {prog2 && (
            <div style={{ ...S.card, borderColor: '#4f46e5' }}>
              <div style={{ fontSize: '13px', color: '#ddd', lineHeight: 1.6, marginBottom: '10px' }}>
                {prog2.summary}
              </div>
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '8px' }}>
                {prog2.weeks.map(w => (
                  <button key={w.week} style={S.chip(showWeek === w.week)} onClick={() => setShowWeek(w.week)}>
                    W{w.week}
                  </button>
                ))}
              </div>
              {prog2.weeks.filter(w => w.week === showWeek).map(w => (
                <div key={w.week}>
                  <div style={{ fontSize: '12px', color: '#a5b4fc', marginBottom: '6px' }}>{w.focus}</div>
                  {(buildAsk.days || []).map(dy => {
                    const its = w.items.filter(i => i.day === dy);
                    if (!its.length) return null;
                    return (
                      <div key={dy} style={{ borderTop: '1px solid #262626', paddingTop: '8px', marginTop: '6px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#667eea' }}>{dy}</div>
                        {its.map((it, i) => (
                          <div key={i} style={{ fontSize: '13px', padding: '3px 0' }}>
                            {it.name} <span style={{ color: '#888' }}>{it.target_sets}×{it.target_reps}</span>
                            {it.note ? <span style={{ color: '#666', fontSize: '11px' }}> · {it.note}</span> : null}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button style={S.btn('#10b981')} onClick={keepProgramme}>Use this programme</button>
                <button style={S.btn('#2a2a2a')} onClick={buildProgramme}>Build another</button>
                <button style={S.btn('#2a2a2a')} onClick={() => { setProg2(null); setBuildAsk(null); }}>Cancel</button>
              </div>
            </div>
          )}

          {!editPlan && !ask && !buildAsk && !prog2 && (
            <button style={{ ...S.btn('#7c3aed'), marginBottom: '8px' }}"""
note(o in s, 'programme panel'); s = s.replace(o, n, 1)

# the plan view shows weeks, and each line can be changed
o = """          {plan && !editPlan && Object.keys(plan.by_day || {}).map(d => (
            <div key={d}>
              <div style={S.label}>{d}</div>
              {plan.by_day[d].map(it => ExCard({ ...it, id: it.exercise_id,
                kind: it.area === 'cardio' ? 'cardio' : 'strength' }, true))}
            </div>
          ))}"""
n = """          {plan && !editPlan && !buildAsk && !prog2 && (() => {
            const wks = plan.weeks_planned || [1];
            const cur = showWeek || plan.week_number || 1;
            const dayMap = (plan.by_week || {})[cur] || {};
            return (
              <>
                {wks.length > 1 && (
                  <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', padding: '10px 0' }}>
                    {wks.map(w => (
                      <button key={w} style={S.chip(cur === w)} onClick={() => setShowWeek(w)}>
                        W{w}{w === plan.week_number ? ' •' : ''}
                      </button>
                    ))}
                  </div>
                )}
                {plan.progression && (
                  <div style={{ fontSize: '12px', color: '#aaa', lineHeight: 1.6, marginBottom: '10px' }}>
                    {plan.progression}
                  </div>
                )}
                {Object.keys(dayMap).map(d => (
                  <div key={d}>
                    <div style={S.label}>{d}</div>
                    {dayMap[d].map(it => (
                      <div key={it.id} style={{ ...S.card, display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <Figure kind={it.drawing} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600 }}>{it.name}</div>
                          {it.note && <div style={{ fontSize: '11px', color: '#888' }}>{it.note}</div>}
                        </div>
                        <input style={{ ...S.input, width: '46px', marginBottom: 0, padding: '7px' }}
                               defaultValue={it.target_sets || ''}
                               onBlur={e => editItem(it.id, { target_sets: e.target.value })} />
                        <input style={{ ...S.input, width: '64px', marginBottom: 0, padding: '7px' }}
                               defaultValue={it.target_reps || ''}
                               onBlur={e => editItem(it.id, { target_reps: e.target.value })} />
                        <button style={S.small('#667eea')}
                                onClick={() => { setLogging({ ...it, id: it.exercise_id }); setForm({ done_on: today(), sets: it.target_sets, reps: it.target_reps }); }}>
                          Log
                        </button>
                        <button style={S.icon} onClick={() => dropItem(it.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                ))}
                {!Object.keys(dayMap).length && (
                  <div style={S.empty}>Nothing planned for week {cur}.</div>
                )}
              </>
            );
          })()}"""
note(o in s, 'plan week view'); s = s.replace(o, n, 1)
open(p, 'w').write(s)

print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:400]))
