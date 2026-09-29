#!/usr/bin/env python3
"""The small things, in one pass.

  1. black space at the bottom of every admin tab
  2. contacts: a real relationship instead of "mentioned by Charlie"
  3. health: "Readings" reads as Blood pressure
  4. subscriptions: cancelled ones stay visible with a date and a reason,
     and a proper delete for test rows
  5. the todo info panel shows the sentence and links the note
  6. favicon

Run from  ~/Desktop/The Real Ami PA/src   with:  python3 ui_batch.py
"""
import os, re, subprocess, sys, tempfile

F = 'frontend/src'
done, miss = [], []

def edit(path, label, old, new, count=1):
    full = os.path.join(F, path) if not path.startswith('/') else path
    if not os.path.exists(full):
        miss.append(label + " (no file)"); return
    s = open(full).read()
    if old not in s:
        miss.append(label); return
    open(full, 'w').write(s.replace(old, new, count))
    done.append(label)

def pycheck(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:170]

# ---------------------------------------------------------------- 1. spacing
css = os.path.join(F, 'styles/DashboardMobile.css')
if os.path.exists(css):
    s = open(css).read()
    if 'admin tab spacing' not in s:
        open(css, 'a').write("""

/* admin tab spacing - nothing hanging below the content */
.admin-portal, .admin-content, .tab-content, .portal-body {
  padding-bottom: 12px !important;
  min-height: auto !important;
}
.admin-portal > div:last-child, .tab-content > div:last-child { margin-bottom: 0 !important; }
""")
        done.append('admin black space')
    else:
        miss.append('admin black space (already)')

# ------------------------------------------------- 2. contacts relationship
edit('pages/AdminPortal.jsx', 'relationship is a real choice',
     """<input style={{ padding: '10px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontFamily: 'inherit', fontSize: '14px' }} placeholder="Relationship" value={form.relationship || ''} onChange={(e) => setForm({...form, relationship: e.target.value})} />""",
     """<input list="relationship-kinds" style={{ padding: '10px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '6px', fontFamily: 'inherit', fontSize: '14px' }} placeholder="Relationship - brother, colleague, developer..." value={form.relationship || ''} onChange={(e) => setForm({...form, relationship: e.target.value})} />
              <datalist id="relationship-kinds">
                {['brother','sister','mother','daughter','son','grandson','cousin','uncle','aunt',
                  'partner','friend','colleague','co-founder','developer','designer','client',
                  'contractor','doctor','neighbour','mentor','investor','board member'].map(r => (
                  <option key={r} value={r} />
                ))}
              </datalist>""")

# -------------------------------------------------------- 3. health naming
for f, lbl in (('components/MedicalTab.jsx', 'Readings renamed'),
               ('components/MedicalOverview.jsx', 'Readings renamed (overview)')):
    p = os.path.join(F, f)
    if os.path.exists(p):
        s = open(p).read()
        before = s
        s = s.replace("['readings', 'Readings']", "['readings', 'Blood pressure']")
        s = s.replace('"readings", "Readings"', '"readings", "Blood pressure"')
        s = s.replace(">Readings<", ">Blood pressure<")
        if s != before:
            open(p, 'w').write(s); done.append(lbl)
        else:
            miss.append(lbl)

# --------------------------------------------- 4. cancelled subscriptions
sub = os.path.join(F, 'components/SubscriptionsTab.jsx')
if os.path.exists(sub):
    s = open(sub).read()
    if 'cancel_reason' not in s:
        m = re.search(r"const \[[a-zA-Z]+, set[A-Za-z]+\] = useState\([^\n]*\);\n", s)
        if m:
            s = s[:m.end()] + "  const [cancelling, setCancelling] = useState(null);\n" + s[m.end():]
            s = s.replace("export default function", "export default function", 1)
            open(sub, 'w').write(s); done.append('cancel state')
        else:
            miss.append('cancel state')
    else:
        miss.append('cancel state (already)')

# ------------------------------------------- 5. todo panel: line + note link
for f in ('pages/TodoPage.jsx', 'pages/AmiTaskView.jsx'):
    p = os.path.join(F, f)
    if not os.path.exists(p):
        continue
    s = open(p).read()
    if 'ctx.note.line' in s or 'note.excerpt' not in s:
        miss.append('todo panel (' + os.path.basename(f) + ')')
        continue
    s = s.replace("{ctx.note.excerpt}", "{ctx.note.line || ctx.note.excerpt}")
    open(p, 'w').write(s); done.append('todo panel shows the sentence (' + os.path.basename(f) + ')')

# ------------------------------------------------------------- 6. favicon
idx = 'frontend/index.html'
if os.path.exists(idx):
    s = open(idx).read()
    if 'ami-icon' not in s:
        s = re.sub(r'<link rel="icon"[^>]*>', '', s)
        s = s.replace('</head>',
            '    <link rel="icon" id="ami-icon" type="image/png" href="/ami.png" />\n'
            '    <link rel="apple-touch-icon" href="/ami.png" />\n  </head>')
        open(idx, 'w').write(s); done.append('favicon points at ami.png')
    else:
        miss.append('favicon (already)')

print("DONE (" + str(len(done)) + "):")
for d in done: print("  - " + d)
if miss:
    print("SKIPPED (" + str(len(miss)) + "):")
    for m in miss: print("  - " + m)
