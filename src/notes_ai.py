#!/usr/bin/env python3
"""The Notes AI buttons, which call endpoints that were never built.

Every button in the note toolbar - expand, tone, professional, grammar,
transcribe - posts to a path that does not exist. So they all fail silently
and nothing happens.

Three endpoints, one job each:
  grammar-check  fix the spelling and grammar, change nothing else
  ai-transform   expand it, tighten it, make it professional, change the tone
  transcribe     turn a voice recording into text

Run from the src folder with:  python3 notes_ai.py
"""
import subprocess, sys, tempfile, os

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

EP = '''@app.post("/api/ami/grammar-check")
@require_password
def ami_grammar_check():
    """Fix what is wrong, change nothing else. His voice stays his."""
    try:
        d = request.get_json() or {}
        text = (d.get('text') or '').strip()
        if len(text) < 2:
            return {"error": "nothing to check"}, 400
        if len(text) > 8000:
            text = text[:8000]
        import google.genai as genai
        client = genai.Client()
        prompt = ("Fix the spelling, grammar and punctuation in this. Do NOT rewrite it, "
                  "do NOT change his wording, do NOT make it more formal, do NOT add "
                  "anything. If a sentence is already correct, leave it exactly as it is.\\n\\n"
                  + text + "\\n\\nReply with ONLY the corrected text, nothing else.")
        resp = gemini_guard() or note_gemini_call() or _ask_gemini(client, prompt=prompt)
        note_gemini_tokens(resp)
        fixed = (resp.text or '').strip()
        return {"status": "success", "corrected": fixed or text,
                "changed": fixed.strip() != text.strip()}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/ami/ai-transform")
@require_password
def ami_ai_transform():
    """Expand it, tighten it, change its tone. One job, named by the caller."""
    try:
        d = request.get_json() or {}
        text = (d.get('text') or '').strip()
        what = (d.get('action') or d.get('mode') or '').strip().lower()
        if len(text) < 2:
            return {"error": "nothing to work with"}, 400
        if len(text) > 8000:
            text = text[:8000]

        jobs = {
            'expand': ("Take these rough notes and write them out properly - full "
                       "sentences, the thinking filled in, nothing invented. Keep every "
                       "point he made. Keep his voice."),
            'shorten': ("Cut this down to its essentials. Keep every point, lose the "
                        "padding. Keep his voice."),
            'summarize': ("Three or four lines saying what this is about and what "
                          "matters in it."),
            'summarise': ("Three or four lines saying what this is about and what "
                          "matters in it."),
            'professional': ("Rewrite this so he could send it to a colleague or a "
                             "partner. Clear and businesslike, but still him - not "
                             "stiff, no corporate filler."),
            'casual': "Loosen this up. Plain, easy, how he would say it to a friend.",
            'friendly': "Warm this up a little, without being sugary.",
            'direct': "Make this direct and plain. Say the thing. No hedging.",
            'bullets': ("Turn this into a short list of points. One line each, no "
                        "sub-bullets."),
            'tone': "Keep what it says, but make it read more naturally.",
            'fix': ("Fix the spelling and grammar only. Change nothing else about "
                    "the wording."),
        }
        job = jobs.get(what)
        if not job:
            job = ("Tidy this up without changing what it says or how he sounds.")

        import google.genai as genai
        client = genai.Client()
        prompt = (job + "\\n\\nHis note:\\n" + text +
                  "\\n\\nReply with ONLY the new text. No preamble, no explanation, "
                  "no markdown fences.")
        resp = gemini_guard() or note_gemini_call() or _ask_gemini(client, prompt=prompt)
        note_gemini_tokens(resp)
        out = (resp.text or '').strip()
        import re as _rx
        out = _rx.sub(r'^```[a-z]*\\n|\\n```$', '', out).strip()
        return {"status": "success", "result": out or text, "text": out or text,
                "action": what or "tidy"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/ami/transcribe")
@require_password
def ami_transcribe():
    """A voice recording into text. The browser usually does this itself, but
    this is here for when it sends the audio instead."""
    try:
        import base64 as _b64
        d = request.get_json(silent=True) or {}
        audio_b64 = d.get('audio') or ''
        mime = d.get('mime') or 'audio/webm'

        f = request.files.get('audio') if not audio_b64 else None
        if f:
            raw = f.read()
            mime = f.mimetype or mime
        elif audio_b64:
            if ',' in audio_b64[:80]:
                audio_b64 = audio_b64.split(',', 1)[1]
            raw = _b64.b64decode(audio_b64)
        else:
            # the browser already did it - just hand the text back
            said = (d.get('text') or '').strip()
            if said:
                return {"status": "success", "text": said, "transcript": said}
            return {"error": "no audio"}, 400

        if len(raw) > 18 * 1024 * 1024:
            return {"error": "that recording is too long"}, 400

        from google.genai import types as _gt
        import google.genai as genai
        client = genai.Client()
        parts = [_gt.Part.from_bytes(data=raw, mime_type=mime),
                 "Write out exactly what is said in this recording. Plain text only, "
                 "no commentary, no timestamps. If nothing is audible, reply with "
                 "nothing at all."]
        resp = gemini_guard() or note_gemini_call() or _ask_gemini(client, prompt=parts)
        note_gemini_tokens(resp)
        said = (resp.text or '').strip()
        return {"status": "success", "text": said, "transcript": said}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/ami/ai-transform' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("three endpoints built: grammar-check, ai-transform, transcribe")
else:
    print("broke: " + err)
