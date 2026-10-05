#!/usr/bin/env python3
"""Attach the PRD to the project, and draft tasks from it.

A typed summary is a poor stand-in for the document that already says what
the project is. So: attach it, and she reads the real thing.

No PRD? The description still works - a bathroom renovation has no PRD and
should not need one.

Run from the src folder with:  python3 project_docs.py
"""
import sqlite3, subprocess, sys, tempfile, os

DB = os.getenv("AMI_DB_PATH", "data/ami_memory.db")

def ok(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

# ------------------------------------------------------------------ table --
db = sqlite3.connect(DB)
db.execute("""CREATE TABLE IF NOT EXISTS project_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venture_id INTEGER,
    title TEXT,
    kind TEXT DEFAULT 'prd',
    file_path TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)""")
db.commit(); db.close()
os.makedirs('data/project_docs', exist_ok=True)
print("table and folder ready")

EP = '''@app.post("/api/projects/<int:pid>/document")
@require_password
def project_add_document(pid):
    """Attach a PRD, a spec, a quote - whatever the project actually runs on."""
    try:
        import os as _os
        from datetime import datetime as _dd
        f = request.files.get('file')
        if not f or not f.filename:
            return {"error": "no file"}, 400
        _os.makedirs('data/project_docs', exist_ok=True)
        safe = _dd.now().strftime('%Y%m%d%H%M%S') + "_" + _os.path.basename(f.filename)[:60]
        path = _os.path.join('data/project_docs', safe)
        f.save(path)
        db.execute("""INSERT INTO project_documents (venture_id, title, kind, file_path, notes)
                      VALUES (?, ?, ?, ?, ?)""",
                   (pid, request.form.get('title') or f.filename,
                    request.form.get('kind') or 'prd', path,
                    request.form.get('notes') or ''))
        return {"status": "success", "file": safe}
    except Exception as e:
        return {"error": str(e)}, 400


@app.get("/api/projects/<int:pid>/documents")
@require_password
def project_documents(pid):
    try:
        rows = db.query("""SELECT id, title, kind, created_at FROM project_documents
                           WHERE venture_id = ? ORDER BY id DESC""", (pid,)) or []
        return {"status": "success", "documents": rows}
    except Exception as e:
        return {"error": str(e)}, 400


@app.delete("/api/projects/document/<int:did>")
@require_password
def project_remove_document(did):
    try:
        import os as _os
        r = db.query("SELECT file_path FROM project_documents WHERE id = ?", (did,))
        if r:
            try:
                _os.remove(r[0]['file_path'])
            except Exception:
                pass
        db.execute("DELETE FROM project_documents WHERE id = ?", (did,))
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}, 400


@app.post("/api/projects/<int:pid>/generate")
@require_password
def project_generate_tasks(pid):
    """Draft tasks from whatever the project has - the PRD if there is one,
    the description if there is not."""
    try:
        import json as _j, re as _r, os as _os, base64 as _b64
        v = db.query("SELECT name, description FROM ventures WHERE id = ?", (pid,))
        if not v:
            return {"error": "no such project"}, 404
        name = v[0]['name']
        about = v[0].get('description') or ''

        docs = db.query("""SELECT title, file_path FROM project_documents
                           WHERE venture_id = ? ORDER BY id DESC LIMIT 2""", (pid,)) or []
        already = [r['title'] for r in (db.query(
            "SELECT title FROM tasks WHERE venture_id = ?", (pid,)) or [])]

        ask = ("This is Charlie's project: " + name + "\\n\\n"
               + ("What it is: " + about[:900] + "\\n\\n" if about else "")
               + ("Already on the board, do not repeat these: "
                  + "; ".join(already[:20]) + "\\n\\n" if already else "")
               + "Turn this into the actual work. Rules:\\n"
               "- Between 4 and 12 tasks, each a real piece of work he could start\\n"
               "- Each title under 70 characters, starting with a verb\\n"
               "- In the order he should do them\\n"
               "- Nothing vague like 'plan the project' or 'do research'\\n"
               "- Nothing that is really a phase heading\\n\\n"
               'Reply with ONLY a JSON array:\\n'
               '[{"title":"Map the first 20 fundis in Freetown","why":"nothing works '
               'without supply"}]')

        parts = [ask]
        used_doc = None
        for dmeta in docs:
            p = dmeta.get('file_path') or ''
            if not p or not _os.path.exists(p):
                continue
            ext = p.lower().rsplit('.', 1)[-1]
            try:
                if ext == 'pdf':
                    from google.genai import types as _gt
                    with open(p, 'rb') as fh:
                        parts.append(_gt.Part.from_bytes(data=fh.read(),
                                                         mime_type='application/pdf'))
                    used_doc = dmeta['title']
                elif ext in ('txt', 'md'):
                    with open(p, 'r', errors='ignore') as fh:
                        parts.append("\\n\\nTHE DOCUMENT (" + str(dmeta['title']) + "):\\n"
                                     + fh.read()[:12000])
                    used_doc = dmeta['title']
            except Exception as _e:
                print("could not read " + p + ": " + str(_e)[:60])
            if used_doc:
                break

        if not used_doc and len(about) < 25:
            return {"status": "success", "proposed": [],
                    "note": "Tell me a bit more about it, or attach the PRD."}

        import google.genai as genai
        client = genai.Client()
        resp = gemini_guard() or note_gemini_call() or _ask_gemini(
            client, prompt=(parts if len(parts) > 1 else ask))
        note_gemini_tokens(resp)
        raw = _r.sub(r'^```(?:json)?|```$', '', (resp.text or '').strip(), flags=_r.M)
        m = _r.search(r'\\[[\\s\\S]*\\]', raw)
        proposed = []
        if m:
            try:
                for t in _j.loads(m.group(0))[:12]:
                    ttl = str(t.get('title') or '').strip()[:90]
                    if len(ttl) > 5 and ttl not in already:
                        proposed.append({"title": ttl, "why": str(t.get('why') or '')[:110]})
            except Exception:
                pass

        for t in proposed:
            try:
                if not db.query("SELECT id FROM proposed_tasks WHERE venture_id = ? "
                                "AND title = ? AND status = 'waiting'", (pid, t['title'])):
                    db.execute("INSERT INTO proposed_tasks (venture_id, title, why) "
                               "VALUES (?, ?, ?)", (pid, t['title'], t['why']))
            except Exception:
                pass

        return {"status": "success", "proposed": proposed,
                "from": used_doc or "what you wrote",
                "note": ("" if proposed else "Nothing clear enough to draft from.")}
    except Exception as e:
        return {"error": str(e)}, 400


'''

s = open('app.py').read()
if '/api/projects/<int:pid>/generate' in s:
    print("already there"); raise SystemExit
t = s.replace('@app.get("/api/today")', EP + '@app.get("/api/today")', 1)
good, err = ok(t)
if good:
    open('app.py', 'w').write(t)
    print("attach a document, list, remove, and generate from it")
else:
    print("broke: " + err)
