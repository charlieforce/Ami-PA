#!/usr/bin/env python3
"""Batch 4: Ami suggests a session or a week from your criteria; you approve, it saves.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch4.py
"""
import os, subprocess, sys
SRC, FE = 'app.py', 'frontend/src'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

# ---------------------------------------------------------------- backend ---
src = open(SRC).read()
anchor = '@app.get("/api/report")'

if '/api/fitness/suggest' not in src:
    EP = '''@app.post("/api/fitness/suggest")
@require_password
def fitness_suggest():
    """Ami picks exercises from his own library to match what he asked for.
    Nothing is saved here - he approves first."""
    try:
        import json as _js
        d = request.get_json() or {}
        want = (d.get('criteria') or '').strip()
        scope = d.get('scope', 'session')          # 'session' or 'week'
        days = d.get('days') or []

        lib = db.query("""SELECT id, name, area, kind, equipment, knee_load, knee_twist
                          FROM exercises ORDER BY area, name""") or []
        if not lib:
            return {"error": "No exercises in the library yet"}, 400

        plan = db.query("SELECT goal, weeks, days FROM fitness_plans WHERE status='active' ORDER BY id DESC LIMIT 1")
        goal = plan[0]['goal'] if plan else 'strength and size'

        recent = db.query("""SELECT exercise_name, MAX(done_on) AS last, COUNT(*) AS times
                             FROM workout_log WHERE done_on >= date('now','-14 days')
                             GROUP BY exercise_name ORDER BY last DESC LIMIT 20""") or []
        sore = db.query("""SELECT DISTINCT exercise_name FROM workout_log
                           WHERE knee_ok = 0 AND done_on >= date('now','-60 days')""") or []

        catalogue = "\\n".join(
            str(x['id']) + ". " + x['name'] + " [" + (x['area'] or '') + "; " +
            (x['equipment'] or 'none') + "; knee " + (x['knee_load'] or 'none') +
            ("; twists" if x.get('knee_twist') else "") + "]" for x in lib)

        prompt = (
            "You are picking exercises for Charlie from HIS OWN library. Nothing else exists.\\n\\n"
            "HIS LIBRARY (use these id numbers exactly):\\n" + catalogue + "\\n\\n"
            "His goal: " + str(goal) + "\\n"
            "What he asked for: " + (want or "a sensible session") + "\\n"
            + ("Days to fill: " + ", ".join(days) + "\\n" if scope == 'week' and days else "")
            + ("Trained in the last two weeks: " + "; ".join(
                r['exercise_name'] + " (" + str(r['last'])[:10] + ")" for r in recent) + "\\n" if recent else "")
            + ("His knee complained after: " + ", ".join(r['exercise_name'] for r in sore) +
               " - avoid these unless he asked for them.\\n" if sore else "")
            + "\\nHe has a knee problem. Prefer movements marked knee none or light. If you include a "
              "heavy-knee or twisting one because he asked for it, say so plainly in the reason.\\n"
              "Do not repeat a muscle group he trained yesterday. Six to eight exercises for a session.\\n\\n"
            "Reply with ONLY this JSON, no other text:\\n"
            '{"reason": "one or two sentences, plain English, why this set", '
            '"items": [{"day": "Mon", "exercise_id": 12, "target_sets": 3, "target_reps": "8-12", '
            '"why": "a few words"}]}\\n'
            + ("Use the day names given above.\\n" if scope == 'week' and days
               else 'Use "day": "' + (days[0] if days else 'today') + '" for every item.\\n'))

        import google.genai as genai
        from google.genai import types as _t
        client = genai.Client()
        guard = gemini_guard()
        if guard:
            return {"error": "Gemini is off or over its limit - check Settings"}, 400
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
        items = []
        for it in (out.get('items') or []):
            x = known.get(it.get('exercise_id'))
            if not x:
                continue
            items.append({**it, "name": x['name'], "area": x['area'], "equipment": x['equipment'],
                          "knee_load": x['knee_load'], "knee_twist": x['knee_twist']})
        return {"status": "success", "reason": out.get('reason', ''), "items": items}
    except Exception as e:
        return {"error": str(e)[:200]}, 400


@app.post("/api/fitness/plan/add-items")
@require_password
def plan_add_items():
    """Add approved suggestions to the plan, keeping what is already there."""
    try:
        from datetime import datetime as _d
        d = request.get_json() or {}
        items = d.get('items') or []
        if not items:
            return {"error": "Nothing to add"}, 400
        p = db.query("SELECT id, days FROM fitness_plans WHERE status='active' ORDER BY id DESC LIMIT 1")
        if p:
            pid, have = p[0]['id'], [x for x in (p[0].get('days') or '').split(',') if x]
        else:
            pid = db.execute("""INSERT INTO fitness_plans (goal, weeks, days, started_on)
                                VALUES (?,?,?,?)""",
                             (d.get('goal') or 'Strength and size', 8, '',
                              _d.now().strftime('%Y-%m-%d')))
            have = []
        if d.get('replace_day'):
            for day in {it.get('day') for it in items}:
                db.execute("DELETE FROM plan_items WHERE plan_id = ? AND day = ?", (pid, day))
        pos = (db.query("SELECT COALESCE(MAX(position),0) AS p FROM plan_items WHERE plan_id = ?", (pid,))
               or [{'p': 0}])[0]['p']
        for it in items:
            pos += 1
            db.execute("""INSERT INTO plan_items (plan_id, day, exercise_id, target_sets, target_reps, position)
                          VALUES (?,?,?,?,?,?)""",
                       (pid, it.get('day'), it.get('exercise_id'), it.get('target_sets'),
                        it.get('target_reps'), pos))
            if it.get('day') and it['day'] not in have and it['day'] in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun'):
                have.append(it['day'])
        order = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
        db.execute("UPDATE fitness_plans SET days = ? WHERE id = ?",
                   (",".join(sorted(set(have), key=lambda x: order.index(x) if x in order else 9)), pid))
        return {"status": "success", "plan_id": pid, "added": len(items)}
    except Exception as e:
        return {"error": str(e)}, 400


'''
    src = src.replace(anchor, EP + anchor, 1); note(True, 'suggest endpoints')

# Ami can talk about it in chat too
o = "You can suggest exercises and talk about his training. He picks what he does."
n = ("You can suggest exercises and talk about his training. He picks what he does - and on the Fitness "
     "screen he can ask you for a session or a week and save what he likes, so point him there when he "
     "wants a plan built.")
note(o in src, 'script note'); src = src.replace(o, n, 1)

open(SRC, 'w').write(src)

# ---------------------------------------------------------------- frontend ---
p = os.path.join(FE, 'components/FitnessTab.jsx')
s = open(p).read()

o = "  const [err, setErr] = useState('');"
n = (o + "\n  const [ask, setAsk] = useState(null);\n  const [sugg, setSugg] = useState(null);"
       "\n  const [busy, setBusy] = useState(false);")
note(o in s, 'suggest state'); s = s.replace(o, n, 1)

o = "  const shown = area === 'all' ? ex : ex.filter(x => x.area === area);"
n = """  const askAmi = async () => {
    setBusy(true); setSugg(null);
    try {
      const r = await fetch(API + '/api/fitness/suggest', { method: 'POST', headers: H,
        body: JSON.stringify(ask) });
      const j = await r.json();
      if (j.error) setErr(j.error); else { setSugg(j); setErr(''); }
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const keepSuggestion = async (replaceDay) => {
    await fetch(API + '/api/fitness/plan/add-items', { method: 'POST', headers: H,
      body: JSON.stringify({ items: sugg.items, replace_day: replaceDay }) });
    setSugg(null); setAsk(null); load(); setView('plan');
  };

""" + o
note(o in s, 'suggest handlers'); s = s.replace(o, n, 1)

o = """          {!editPlan && (
            <button style={S.btn('#667eea')} onClick={() => setEditPlan(plan ? {"""
n = """          {!editPlan && !ask && (
            <button style={{ ...S.btn('#7c3aed'), marginBottom: '8px' }}
                    onClick={() => setAsk({ scope: 'session', criteria: '', days: [todayName()] })}>
              ✨ Ask Ami to build it
            </button>
          )}

          {ask && !sugg && (
            <div style={{ ...S.card, borderColor: '#7c3aed' }}>
              <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '10px' }}>
                Tell her what you want. She picks from your library and you decide what to keep.
              </div>
              <textarea style={{ ...S.input, minHeight: '70px' }}
                        placeholder="e.g. upper body, dumbbells only, 45 minutes, nothing heavy on the knee"
                        value={ask.criteria} onChange={e => setAsk({ ...ask, criteria: e.target.value })} />
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                {[['session', 'One session'], ['week', 'A whole week']].map(([k, l]) => (
                  <button key={k} style={{ ...S.chip(ask.scope === k), flex: 1 }}
                          onClick={() => setAsk({ ...ask, scope: k,
                            days: k === 'week' ? (plan && plan.days ? plan.days.split(',').filter(Boolean) : ['Mon', 'Wed', 'Fri']) : [todayName()] })}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                {DAYS.map(d => (
                  <button key={d} style={{ ...S.chip(ask.days.includes(d)), flex: 1 }}
                          onClick={() => setAsk({ ...ask,
                            days: ask.scope === 'session' ? [d]
                              : ask.days.includes(d) ? ask.days.filter(x => x !== d) : [...ask.days, d] })}>
                    {d}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={S.btn(busy ? '#2a2a2a' : '#7c3aed')} onClick={askAmi} disabled={busy}>
                  {busy ? 'She is thinking...' : 'Ask her'}
                </button>
                <button style={S.btn('#2a2a2a')} onClick={() => setAsk(null)}>Cancel</button>
              </div>
            </div>
          )}

          {sugg && (
            <div style={{ ...S.card, borderColor: '#7c3aed' }}>
              <div style={{ fontSize: '13px', color: '#ddd', lineHeight: 1.6, marginBottom: '12px' }}>
                {sugg.reason}
              </div>
              {sugg.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center',
                                      padding: '8px 0', borderTop: '1px solid #262626' }}>
                  <Figure kind={(ex.find(e => e.id === it.exercise_id) || {}).drawing} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                      {it.name} <span style={{ color: '#888', fontWeight: 400, fontSize: '12px' }}>
                        {it.day} · {it.target_sets}×{it.target_reps}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{it.why}</div>
                  </div>
                  <span style={S.knee(it.knee_load)}>
                    {it.knee_load === 'heavy' ? 'KNEE' : it.knee_load === 'light' ? 'LIGHT' : 'OK'}
                  </span>
                  <button style={S.icon} onClick={() => setSugg({ ...sugg,
                    items: sugg.items.filter((_, j) => j !== i) })}>✕</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button style={S.btn('#10b981')} onClick={() => keepSuggestion(false)}>Add to my plan</button>
                <button style={S.btn('#2a2a2a')} onClick={() => keepSuggestion(true)}>Replace those days</button>
                <button style={S.btn('#2a2a2a')} onClick={askAmi}>Try again</button>
                <button style={S.btn('#2a2a2a')} onClick={() => { setSugg(null); setAsk(null); }}>Cancel</button>
              </div>
            </div>
          )}

          {!editPlan && !ask && !sugg && (
            <button style={S.btn('#667eea')} onClick={() => setEditPlan(plan ? {"""
note(o in s, 'suggest panel'); s = s.replace(o, n, 1)
open(p, 'w').write(s)

print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:400]))
