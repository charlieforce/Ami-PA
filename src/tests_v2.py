#!/usr/bin/env python3
"""The checks that would have caught this week.

The suite passes 79 things and still missed every real bug: a function that
existed but was never scheduled, a context slot empty for a month, a briefing
on the wrong timezone, 35,000 characters of prompt, a column that did not
exist, and a whole modal defined inside every task card.

They are all the same shape - the thing exists, and does nothing. So these
check behaviour rather than existence.

Run from the src folder with:  python3 tests_v2.py
"""
import subprocess, sys, tempfile, os

def compiles(t):
    fd, p = tempfile.mkstemp(suffix='.py'); os.write(fd, t.encode()); os.close(fd)
    r = subprocess.run([sys.executable, '-m', 'py_compile', p], capture_output=True, text=True)
    os.unlink(p); return r.returncode == 0, (r.stderr or '')[:220]

BLOCK = '''

def check_actually_does_something():
    """Everything here exists because something passed a test and did nothing."""
    import re, glob
    head("Does it actually do anything?")
    src = open(SRC).read()

    # --- a job that is never scheduled will never run ----------------------
    defined = set(re.findall(r'^def (\\\\w*(?:nudge|briefing|reminder|refresh|backup|'
                             r'review|notification|closeout|warnings)\\\\w*)\\\\(', src, re.M))
    wired = set(re.findall(r"add_job\\\\((?:lambda:\\\\s*)?(\\\\w+)", src))
    wired |= set(re.findall(r"id='(\\\\w+)'", src))
    orphans = sorted(d for d in defined
                     if d not in wired and not any(d in w or w in d for w in wired))
    if orphans:
        bad("every scheduled job runs", "never scheduled: " + ", ".join(orphans[:4]))
    else:
        ok("every scheduled job runs", str(len(defined)) + " of them")

    # --- a slot she reads, with nothing in it, is invisible -----------------
    keys = set(re.findall(r'charlie_profile WHERE key = \\\\?", \\\\("(\\\\w+)"', src))
    keys |= set(re.findall(r"charlie_profile WHERE key = '(\\\\w+)'", src))
    empty = []
    for k in sorted(keys):
        if k in ('water_target',):      # the app has a sensible default
            continue
        r = q("SELECT length(value) AS n FROM charlie_profile WHERE key = ?", (k,))
        if not r or not (r[0].get('n') or 0):
            empty.append(k)
    if empty:
        bad("nothing she reads is empty", "empty: " + ", ".join(empty))
    else:
        ok("nothing she reads is empty", str(len(keys)) + " slots")

    # --- writing to a column that does not exist fails quietly --------------
    wrong = []
    for m in re.finditer(r"INSERT INTO (\\\\w+)\\\\s*\\\\(([^)]{3,220})\\\\)", src):
        table, cols = m.group(1), m.group(2)
        if '(' in cols or 'SELECT' in cols.upper():
            continue
        have = {r.get('name') for r in (q("PRAGMA table_info(" + table + ")") or [])}
        if not have:
            continue
        for c in [x.strip().strip(chr(39)).strip(chr(34)) for x in cols.split(',')]:
            if c and c not in have:
                wrong.append(table + "." + c)
    if wrong:
        bad("every insert matches its table", ", ".join(sorted(set(wrong))[:4]))
    else:
        ok("every insert matches its table")

    # --- four ways of calling the model means a fix lands in one ------------
    direct = len(re.findall(r"client\\\\.models\\\\.generate_content\\\\(", src))
    if direct > 2:
        bad("one door to the model", str(direct) + " direct calls")
    else:
        ok("one door to the model")

    # --- a component defined inside a component kills the page --------------
    nested = []
    for path in glob.glob('frontend/src/**/*.jsx', recursive=True):
        try:
            js = open(path).read()
        except Exception:
            continue
        for m in re.finditer(r"\\\\n  const ([A-Z]\\\\w+) = \\\\(\\\\{[^}]*\\\\}\\\\) => \\\\{", js):
            after = js[m.end():m.end() + 9000]
            r_at = after.find('return (')
            f_at = after.find('const run')
            if 0 <= f_at < r_at:
                nested.append(os.path.basename(path) + ":" + m.group(1))
    if nested:
        bad("nothing nested inside a component", ", ".join(nested[:3]))
    else:
        ok("nothing nested inside a component")

    # --- she must never claim a save she did not make -----------------------
    before = (q("SELECT COUNT(*) AS c FROM tasks") or [{"c": 0}])[0].get('c')
    s, body = call("POST", "/api/chat/orchestrated",
                   {"message": "delete the task about painting the moon"}, timeout=90)
    after = (q("SELECT COUNT(*) AS c FROM tasks") or [{"c": 0}])[0].get('c')
    said = str((body or {}).get('response', '')).lower()
    if after != before:
        bad("no false claims", "it removed something that was never asked for")
    elif any(w in said for w in ('komot:', 'deleted', 'removed:', 'done:')):
        bad("no false claims", "she said she removed something that is not there")
    else:
        ok("no false claims", "says she cannot find it, removes nothing")

    # --- the prompt crept to 35,000 characters unnoticed --------------------
    import subprocess as _sp
    try:
        out = _sp.run(["grep", "-a", "PROMPT SIZE", LOG], capture_output=True,
                      text=True, timeout=10).stdout.strip().split("\\\\n")[-1]
        n = int(re.search(r"PROMPT SIZE: (\\\\d+)", out).group(1))
        if n > 30000:
            bad("the prompt has not crept", str(n) + " characters")
        else:
            ok("the prompt has not crept", str(n) + " characters")
    except Exception:
        skip("the prompt has not crept", "nothing in the log yet")
'''

s = open('run_tests.py').read()
if 'check_actually_does_something' in s:
    print("already there"); raise SystemExit

# it needs to know where app.py and the log are
if 'SRC = ' not in s:
    s = s.replace("def ok(name, extra=\"\"):",
                  "SRC = 'app.py'\nLOG = '/tmp/flask.log'\n\ndef ok(name, extra=\"\"):", 1)

s = s.replace("\nif __name__", BLOCK + "\nif __name__", 1)
s = s.replace("        check_deploy_ready()",
              "        check_deploy_ready()\n        check_actually_does_something()", 1)

good, err = compiles(s)
if good:
    open('run_tests.py', 'w').write(s)
    print("seven behaviour checks added, in the shape your suite uses")
else:
    print("broke, not written: " + err)
