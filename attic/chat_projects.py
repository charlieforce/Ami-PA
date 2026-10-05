#!/usr/bin/env python3
"""From chat: "do it" after she has written a plan.

He describes something, she gives her read and the phases - she already does
this well. Then he says "do it" or "set it up" and she creates the project,
proposes the tasks, and tells him they are waiting to be ticked.

Nothing lands on the board until he ticks it.

Run from the src folder with:  python3 chat_projects.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

FN = '''def _maybe_make_project(query, session_id=None):
    """He said "do it" after she laid out a plan. Make the project, propose the
    tasks, and tell him where to tick them. Returns a reply or None."""
    import re as _r
    low = (query or '').strip().lower().rstrip('.!')
    if len(low) > 70:
        return None
    if not _r.search(r"^(ok(ay)?,? )?(yes,? )?(lets?|let us|go|do|set|make|create|build|"
                     r"start)\\b.{0,40}$", low):
        return None
    if not _r.search(r"\\b(do it|set (it|that) up|make (it|that|the project)|create (it|that|"
                     r"the project)|lets do it|go ahead|build it|start it|set up the project|"
                     r"add the project|make the project)\\b", low):
        return None

    # what was she just talking about?
    rows = db.query("""SELECT user_message, ami_response FROM conversations
                       WHERE DATE(timestamp) >= date('now','-1 day')
                       ORDER BY id DESC LIMIT 6""") or []
    plan, idea = None, None
    for r in rows:
        resp = str(r.get('ami_response') or '')
        if len(resp) > 400 and _r.search(r"(phase|1\\.|first|step|scope|mvp|roadmap|"
                                         r"build|launch)", resp, _r.I):
            plan = resp
            idea = str(r.get('user_message') or '')
            break
    if not plan:
        return None

    # a name for it
    try:
        import google.genai as genai
        client = genai.Client()
        resp = gemini_guard() or note_gemini_call() or _ask_gemini(
            client, prompt=("Charlie asked for this:\\n" + idea[:400] +
                            "\\n\\nGive it a short project name - two to four words, no "
                            "quotes, no punctuation, nothing else. Just the name."))
        note_gemini_tokens(resp)
        name = (resp.text or '').strip().strip('"\\'').split(chr(10))[0][:60]
    except Exception:
        name = (idea[:40] or 'New project').strip()
    if len(name) < 3:
        return None

    # make it, and propose the tasks
    try:
        with app.test_request_context(
                '/api/projects/create', method='POST',
                json={"name": name, "about": idea[:400], "plan": plan[:2500]},
                headers={'X-Ami-Password': AMI_PASSWORD}):
            out = project_create()
        d = out[0] if isinstance(out, tuple) else out
        if not isinstance(d, dict) or d.get('error'):
            return None
    except Exception as e:
        print("project from chat failed: " + str(e)[:70])
        return None

    n = len(d.get('proposed') or [])
    if not n:
        return ("A don open **" + d['name'] + "** for yu projects, bo. "
                "A no fit pull clean tasks from di plan - open am and add dem yusef.")

    lines = [("\\u2705 **" + d['name'] + "** don open, and a don draft "
              + str(n) + " task" + ("s" if n != 1 else "") + " from di plan:")]
    for t in (d['proposed'] or [])[:8]:
        lines.append("  \\u00b7 " + t['title'])
    lines.append("")
    lines.append("Dem never touch yu board yet. Go Projects, tick di ones wey make sense, "
                 "and drop di rest. Na yu get di last word.")
    return chr(10).join(lines)


'''

s = open('app.py').read()
done, miss = [], []

if '_maybe_make_project' in s:
    miss.append("already there")
else:
    t = s.replace("def _instant_time(", FN + "def _instant_time(", 1)
    good, err = ok(t)
    if good: s = t; done.append("the maker")
    else: miss.append("maker: " + err[:90])

    o = """        # a meeting he mentions in passing is a commitment, not small talk"""
    n = """        # "do it" after she has laid out a plan
        try:
            _proj = _maybe_make_project(query, session_id)
        except Exception:
            _proj = None
        if _proj:
            try:
                db.execute("INSERT INTO conversations (user_message, ami_response) VALUES (?,?)",
                           (query, _proj))
            except Exception:
                pass
            return {"status": "success", "response": _proj, "role": "ami",
                    "engines_used": ["project"]}

        # a meeting he mentions in passing is a commitment, not small talk"""
    if o in s:
        t = s.replace(o, n, 1)
        good, err = ok(t)
        if good: s = t; done.append("wired into chat")
        else: miss.append("wiring: " + err[:90])
    else:
        miss.append("wiring (anchor)")

open('app.py', 'w').write(s)
print("DONE: " + ", ".join(done))
if miss: print("SKIPPED: " + ", ".join(miss))
good, err = ok(open('app.py').read())
print("app.py compiles: " + ("YES" if good else "NO - " + err))
