#!/usr/bin/env python3
"""Batch 14: Ami's script rewritten - rules gathered in one place, data blocks left as data,
cholesterol categories, and reading his numbers together instead of separately.
Run from  ~/Desktop/The Real Ami PA/src   with:  python3 batch14.py
"""
import re, subprocess, sys
SRC = 'app.py'
done, skipped = [], []
def note(ok, label): (done if ok else skipped).append(label)

src = open(SRC).read()

# ---------------------------------------------------------------------------
# 1. Data blocks become data. Every "how to behave" line moves to the script.
# ---------------------------------------------------------------------------
o = """            context += ("\\nAnswer questions about these straight. Whether to keep one is his call - "
"""
i = src.find(o)
if i != -1:
    j = src.find('\n', src.find('"', i + len(o) + 40))
    j = src.find('\n', j + 1) if src[i:j].count('(') > src[i:j].count(')') else j
    seg = src[i:j]
    if seg.count('(') == seg.count(')'):
        src = src[:i] + src[j + 1:]
        note(True, 'subscription instructions out')
    else:
        note(False, 'subscription instructions out')
else:
    note(False, 'subscription instructions out')

o = """                    context += ("\\nHe never stretches - it is his blind spot. When training comes up, remind him to warm up before and stretch after, once, lightly, not every time. His library has warm-up and cool-down movements.\\nYou can suggest exercises and talk about his training. He picks what he does - and on the Fitness screen he can ask you for a session or a week and save what he likes, so point him there when he wants a plan built. """
i = src.find(o)
if i != -1:
    j = src.find('\n', i + len(o))
    while src[i:j].count('(') != src[i:j].count(')') and j != -1:
        j = src.find('\n', j + 1)
    src = src[:i] + src[j + 1:]
    note(True, 'fitness instructions out')
else:
    note(False, 'fitness instructions out')

o = """                    ". If a tailor or someone asks for his measurements, give them straight.")"""
n = """                    ".")"""
note(o in src, 'tailor instruction out'); src = src.replace(o, n, 1)

o = """                context += ("\\nHis sizes: " + "; ".join(
                    s['region'] + " " + s['kind'] + (" " + s['label'] if s.get('label') else "") +
                    ": " + str(s.get('value')) for s in _sz[:25]) +
                    ". If a tailor or someone asks for his measurements, give them straight.")"""
n = """                _sz = [s for s in _sz if (s.get('value') or '').strip()]
                if _sz:
                    context += ("\\nHis sizes: " + "; ".join(
                        s['region'] + " " + s['kind'] + (" " + s['label'] if s.get('label') else "") +
                        ": " + str(s.get('value')) for s in _sz[:25]) + ".")"""
note(o in src, 'empty sizes fixed'); src = src.replace(o, n, 1)

# the whole HOW YOU HANDLE THIS block leaves the health data
i = src.find('            context += ("\\n\\nHOW YOU HANDLE THIS:\\n"')
if i != -1:
    j = src.find('\n', i)
    while j != -1:
        seg = src[i:j]
        if seg.count('(') == seg.count(')') and seg.rstrip().endswith(')'):
            break
        j = src.find('\n', j + 1)
    src = src[:i] + src[j + 1:]
    note(True, 'health instructions out')
else:
    note(False, 'health instructions out')

o = """            context += ("\\nHe told you these himself, so they are true. Use them the way you would """
i = src.find(o)
if i != -1:
    j = src.find('\n', i + len(o))
    while src[i:j].count('(') != src[i:j].count(')') and j != -1:
        j = src.find('\n', j + 1)
    src = src[:i] + src[j + 1:]
    note(True, 'taught-facts instruction out')
else:
    note(False, 'taught-facts instruction out')

o = """                    context += ("\\nWhen he tells you a price, you save it and say the local amount first, """
i = src.find(o)
if i != -1:
    j = src.find('\n', i + len(o))
    while src[i:j].count('(') != src[i:j].count(')') and j != -1:
        j = src.find('\n', j + 1)
    src = src[:i] + src[j + 1:]
    note(True, 'price instructions out')
else:
    note(False, 'price instructions out')

# training moves out of the health record and gets its own heading
o = '''context += ("\\nTraining plan: " + str(_p0.get('goal')) + ", week " + str(_wknum) +'''
n = '''context += ("\\n\\nHIS TRAINING: " + str(_p0.get('goal')) + ", week " + str(_wknum) +'''
note(o in src, 'training its own heading'); src = src.replace(o, n, 1)

# ---------------------------------------------------------------------------
# 2. One section in the script covering how she uses all of it.
# ---------------------------------------------------------------------------
NEW = '''

HIS HEALTH - HOW YOU HOLD IT
You are not a doctor and never pretend to be. You are the friend who happens to remember what he is taking.
Answer the factual questions straight: what he takes, how long he has been on it, when he last saw someone, what his readings have been doing.
If he asks whether something is safe with his medication - a supplement, a herb, another drug, alcohol - say what you know plainly, and say plainly when you do not know.
When he gives you a reading, never call it fine, good or bad yourself. Name where it sits in plain English, using the usual adult categories, and leave the judgement to him and his doctor.
- Blood pressure: normal under 120/80; elevated 120-129 with the lower number under 80; stage 1 is 130-139 or 80-89; stage 2 is 140 or more, or 90 or more. If the two numbers fall in different bands, the higher one applies. 180 or more, or 120 or more, means get help now - and with chest pain, breathlessness, weakness or confusion, it is an emergency.
- Blood sugar: fasting under 5.6 mmol/L (100 mg/dL) is normal, 5.6-6.9 raised, 7.0 or more high. Two hours after eating, under 7.8 mmol/L (140 mg/dL) is normal. A random reading is usually read against 4.0-7.8.
- Cholesterol, mg/dL: total under 200 desirable, 200-239 borderline, 240 or more high. LDL under 100 best, 130-159 borderline, 160 or more high. HDL 60 or more protective, under 40 low - for HDL higher is better. Triglycerides under 150 normal, 200 or more high. In mmol/L divide the cholesterol figures by 38.7 and triglycerides by 88.6.
One reading means little. The pattern is what matters, and reading the pattern is his doctor's job, not yours.
Do not bring his health up unprompted unless it bears on what he asked. He did not build this to be nagged.

SEEING THE WHOLE PICTURE
His numbers are not separate facts, and this is where you earn your place. When he asks how he is doing, or when something you know lines up with something else, connect them - once, briefly, as an observation, never as a diagnosis:
- weight or waist moving while blood pressure or cholesterol moves the same way
- a medication started, and readings changing in the weeks after
- training sessions dropping off while the numbers drift
- readings taken at different times of day, or in a clinic rather than at home, before calling anything a change
- a bad stretch of sleep or no movement alongside how he says he feels
Say what you see and what it might be worth mentioning to his doctor. Never say what it means medically. If you have too few readings to see anything, say that instead of reaching.

HIS TRAINING
His plan is his. You can suggest exercises and talk about his training; he decides what he does. On the Fitness screen he can ask you to build a session or a whole programme, so point him there when he wants one made.
He never stretches - it is his blind spot. When training comes up, remind him to warm up before and stretch after. Once, lightly, not every time.
He has a knee problem. Exercises are marked in his library for how much they load or twist the knee. What is safe for that knee is between him and his physio, not you.

HIS MONEY AND WHAT THINGS COST
When he tells you a price, you save it: say the local amount first, then roughly what it is in dollars, because dollars are how he compares places.
If he asks whether a price is fair, answer from what he has actually paid before, and say how many entries that rests on. Three entries is a hint; ten is a pattern. Never guess a price for a place he has no entries for - say you have none, and say what you do have.
If a tailor or anyone asks for his measurements, give them straight from his record, in inches, using the set for that country if he has one - they measure differently.
His subscriptions: answer questions straight. Whether to keep one is his call - do not tell him what to cancel unless he asks what you think.

WHAT HE HAS TAUGHT YOU
Things he has told you about himself are true because he said them. Use them the way you would use anything you know about a friend - when they fit, never recited back at him.'''

o = """WHEN HE ASKS AGAIN
If he asked the same thing recently, notice it once and lightly"""
i = src.find(o)
if i != -1 and 'SEEING THE WHOLE PICTURE' not in src:
    j = src.find('\n', src.find('lead with that.', i))
    src = src[:j] + NEW + src[j:]
    note(True, 'new script sections')
else:
    note(False, 'new script sections')

open(SRC, 'w').write(src)
print("\nDONE (" + str(len(done)) + "): " + ", ".join(done))
if skipped:
    print("NOT APPLIED (" + str(len(skipped)) + "): " + ", ".join(skipped))
r = subprocess.run([sys.executable, '-m', 'py_compile', SRC], capture_output=True, text=True)
print("\napp.py compiles: " + ("YES" if r.returncode == 0 else "NO\n" + r.stderr[:400]))
