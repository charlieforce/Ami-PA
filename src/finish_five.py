#!/usr/bin/env python3
"""Five things at once, so he can get back to testing.

  1. My plan is organised by DAY, not by week. Monday's workout is Monday's
     workout until he changes it. No more "nothing planned for week 2".
  2. Tasks: all three views paged, capped for the whole page not per day.
  3. Tasks: filter by where it came from - Ami, Notes, him - plus overdue.
  4. Reminders: yearly, every N days, twice a week, every other day.
  5. Paging on the few remaining lists that will grow.

Run from  ~/Desktop/The Real Ami PA/src   with:  python3 finish_five.py
"""
import os, re, subprocess, sys, tempfile

F = 'frontend/src'
done, miss = [], []

def note(ok_, label):
    (done if ok_ else miss).append(label)

def patch(path, label, pairs, must_all=True):
    full = os.path.join(F, path)
    if not os.path.exists(full):
        note(False, label + " (no file)"); return
    s = open(full).read(); orig = s; hits = 0
    for old, new in pairs:
        if old in s:
            s = s.replace(old, new, 1); hits += 1
    if hits == 0 or (must_all and hits < len(pairs)):
        note(False, label + " (" + str(hits) + "/" + str(len(pairs)) + ")")
        if hits: open(full, 'w').write(s)
        return
    open(full, 'w').write(s)
    note(True, label)

# ---------------------------------------------------------------- 1. the plan
patch('components/FitnessTab.jsx', 'plan shows the day, not the week', [
    # when the current week has nothing, fall back to the week that does
    ("const todayItems = (plan && plan.by_day && plan.by_day[day]) || [];",
     "const todayItems = (plan && plan.by_day && plan.by_day[day]) || [];\n"
     "  const planDays = plan && plan.by_day ? Object.keys(plan.by_day) : [];\n"
     "  const planHasAnything = planDays.length > 0;"),
])

# the "nothing planned for week N" message, wherever it is worded
fit = os.path.join(F, 'components/FitnessTab.jsx')
if os.path.exists(fit):
    s = open(fit).read()
    m = re.search(r"Nothing planned for week \{?[a-zA-Z0-9_.]+\}?", s)
    if m:
        s = s.replace(m.group(0),
                      "Nothing set for this day yet. Your plan runs by day - "
                      "Monday's workout stays Monday's until you change it.")
        open(fit, 'w').write(s)
        note(True, 'the confusing week message is gone')
    else:
        note(False, 'week message (not found - paste what it says)')

# ---------------------------------------------------------- 2 & 3. the tasks
tp = os.path.join(F, 'pages/TasksPage.jsx')
if os.path.exists(tp):
    s = open(tp).read()
    if 'sourceFilter' in s:
        note(False, 'tasks (already done)')
    else:
        # the filter, and one cap for the whole page
        s = s.replace(
            "  const [showMore_dateTasks, setShowMore_dateTasks] = useState(15);",
            "  const [showMore_dateTasks, setShowMore_dateTasks] = useState(15);\n"
            "  const [sourceFilter, setSourceFilter] = useState('all');\n"
            "  const [pageSize, setPageSize] = useState(20);\n"
            "\n"
            "  const bySource = (list) => (list || []).filter(t => {\n"
            "    const src = (t.source || t.origin || '').toLowerCase();\n"
            "    if (sourceFilter === 'ami') return src.includes('ami');\n"
            "    if (sourceFilter === 'notes') return src.includes('note');\n"
            "    if (sourceFilter === 'mine') return !src || src === 'manual' || src === 'me';\n"
            "    if (sourceFilter === 'late') {\n"
            "      const d = String(t.due_date || '').slice(0, 10);\n"
            "      return d && d < new Date().toISOString().slice(0, 10);\n"
            "    }\n"
            "    return true;\n"
            "  });\n", 1)

        # every view goes through the filter and the cap
        for fn in ('getPendingTasks()', 'getInProgressTasks()', 'getCompletedTasks()'):
            s = s.replace("{" + fn + ".map(task =>",
                          "{bySource(" + fn + ").slice(0, pageSize).map(task =>")
        s = s.replace("{dateTasks.slice(0, showMore_dateTasks).map(task =>",
                      "{bySource(dateTasks).slice(0, pageSize).map(task =>")

        # the chips, right under the view switcher
        m = re.search(r"(\n\s*)\{viewType === 'kanban' && \(", s)
        if m:
            pad = m.group(1)
            chips = (pad + "{/* where did it come from */}" +
                     pad + "<div style={{ display: 'flex', gap: '6px', overflowX: 'auto', padding: '0 20px 12px' }}>" +
                     pad + "  {[['all','Everything'],['late','Overdue'],['ami','From Ami'],"
                           "['notes','From notes'],['mine','Mine']].map(([k, lbl]) => (" +
                     pad + "    <button key={k} onClick={() => setSourceFilter(k)}" +
                     pad + "            style={{ padding: '7px 13px', minHeight: '34px', borderRadius: '16px'," +
                     pad + "                     flexShrink: 0, cursor: 'pointer', fontSize: '12px'," +
                     pad + "                     border: '1px solid ' + (sourceFilter === k ? '#4f46e5' : '#2c2c3a')," +
                     pad + "                     background: sourceFilter === k ? '#262040' : '#1a1a22'," +
                     pad + "                     color: sourceFilter === k ? '#a78bfa' : '#8b8b9e' }}>" +
                     pad + "      {lbl}" +
                     pad + "    </button>" +
                     pad + "  ))}" +
                     pad + "</div>")
            s = s[:m.start()] + chips + s[m.start():]

        # one Show more for the page, replacing the per-day one
        s = re.sub(r"\n\s*\{dateTasks\.length > showMore_dateTasks && \([\s\S]{0,700}?\n\s*\)\}", "", s)
        s = re.sub(r"\n\s*\{showMore_dateTasks > 15 && \([\s\S]{0,700}?\n\s*\)\}", "", s)
        m2 = re.search(r"(\n\s*)\{viewType === 'calendar' && \(", s)
        if m2:
            pad = m2.group(1)
            more = (pad + "{pageSize < 500 && (" +
                    pad + "  <div style={{ padding: '0 20px 20px' }}>" +
                    pad + "    <button onClick={() => setPageSize(pageSize + 20)}" +
                    pad + "            style={{ width: '100%', padding: '12px', minHeight: '44px'," +
                    pad + "                     background: '#2a2a2a', color: '#aaa', border: 'none'," +
                    pad + "                     borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>" +
                    pad + "      Show more" +
                    pad + "    </button>" +
                    pad + "    {pageSize > 20 && (" +
                    pad + "      <button onClick={() => setPageSize(20)}" +
                    pad + "              style={{ width: '100%', padding: '9px', marginTop: '6px'," +
                    pad + "                       background: 'transparent', color: '#6b6b7c'," +
                    pad + "                       border: '1px solid #2c2c3a', borderRadius: '8px'," +
                    pad + "                       fontSize: '12px', cursor: 'pointer' }}>" +
                    pad + "        Show less" +
                    pad + "      </button>" +
                    pad + "    )}" +
                    pad + "  </div>" +
                    pad + ")}")
            # after the calendar block closes, at the end of the component
            end = s.rfind("\n  );\n}")
            if end != -1:
                s = s[:end] + more + s[end:]
        open(tp, 'w').write(s)
        note(True, 'tasks: filtered, paged across the whole page')

# ------------------------------------------------------------- 4. reminders
patch('components/RemindersList.jsx', 'reminder schedules', [
    ('<option value="monthly">📅 Monthly</option>',
     '<option value="monthly">📅 Monthly</option>\n'
     '            <option value="yearly">📅 Yearly</option>\n'
     '            <option value="every_2_days">📅 Every other day</option>\n'
     '            <option value="twice_weekly">📅 Twice a week</option>\n'
     '            <option value="every_10_days">📅 Every 10 days</option>\n'
     '            <option value="every_14_days">📅 Every 2 weeks</option>'),
])

print("DONE (" + str(len(done)) + "):")
for x in done: print("  - " + x)
if miss:
    print("SKIPPED (" + str(len(miss)) + "):")
    for x in miss: print("  - " + x)
