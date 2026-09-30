#!/usr/bin/env python3
"""Put Charlie's biography where Ami actually reads it.

She loads charlie_profile['knowledge'] into every single message. It has been
empty. This fills it - condensed to what changes how she talks to him, not the
whole seven pages.

Run from  ~/Desktop/The Real Ami PA/src   with:  python3 load_biography.py
"""
import sqlite3, os

DB = os.getenv("AMI_DB_PATH", "data/ami_memory.db")

KNOWLEDGE = """WHO HE IS

Charles Bond Kebbi. Forties. Born and raised in England to a Sierra Leonean
father and a Cameroonian mother. He discovered his Sierra Leonean heritage as
an adult and it redirected his whole life. He was the first in his family to
return to Sierra Leone. That is not a small fact about him - it is the hinge
his life turns on.

He now bases himself between Nairobi and Freetown. He has been to 132+
countries; 104 of them in 2023 alone, all seven continents, 34 African
countries. That year was a deliberate search, not a holiday, and it ended with
him leaving a Microsoft career to build in Africa.

HIS PEOPLE

Mother - born November 1941. Strong, mobile, six months England and six months
Austin. They are close and he keeps in touch despite the travel.

Father - died. They were estranged for years before. It still sits with him.
Do not raise it lightly.

Five siblings, all in England: Donald (eldest, Kent), Janet (his SISTER, Kent,
daughter Erica), then Charlie, then Archibald "Archie" (wife Claudia, son
Darren, daughter Alicia in Uganda), Joseph "Joe" (London, IT, the closest of
them - visits Charlie wherever he is), and Malcolm (youngest, in London, took
their father's death very hard and has struggled since; Charlie carries this).
The siblings barely speak to each other, which puzzles him.

Kiana - his daughter, San Antonio, married. Baby Laz is her son, his grandson.
He flew out to meet him. Family comes before the ventures.

Ami (the real one) - Freetown. His closest person there and the reason GII
exists. He is building her an apartment. Her sister Julie wanted to learn
programming, he bought her a laptop and paid for courses, and that moment
started Global Impact Innovators. Her mother cooks for him and checks on him
like a second mother. Marie is another sister, in China.

Jeremiah Muhea Squire - GII programme manager, Sierra Leone. Wanted to name
his baby after Charlie.

Charles S - his cousin, co-founder, running GII Connect and Kendu Bay in Kenya.

Alpha - a young man in Freetown who is homeless. Charlie looks for him when he
is back and helps where he can.

WHAT HE CARRIES

Seven years in the US Army, most of it in Korea with the 2nd Infantry
Division, ten miles from the DMZ. Then Seattle, then the Washington National
Guard in an intelligence role.

He came out of it with a chronic sleep disorder and depression, and for years
he drank to manage both. He stopped in early 2024 and has been sober since.
The sleep problems and the low periods did not go away with the drinking; he
manages them without it now.

HOW TO HOLD THAT: he is open about all of it and does not hide it. But it is
not conversational material. Never raise the drinking, the depression, the
sleep, his father, or Malcolm unless HE raises them first. If he does, meet
him there plainly - no fuss, no therapy voice, no congratulating him on being
sober. If he mentions not sleeping, take it seriously without making it a
thing.

HIS BODY

Both knees are wrecked from semi-pro football in Korea - five operations on
the left, three on the right. They will not come back. This is why knee load
matters in his training and why he gets frustrated about it.

He does not drink. No chicken for seven years, no pork. Beef, especially good
steak, and lamb. He quits something every New Year's Eve.

HIS WORK

GII (the nonprofit, with Charles S), GII Connect, Promoga Studio 360 in
Toronto with Ravi, plus FundiConnect, TechieVet and Molay.ai. Before this:
Microsoft Teams as senior PM, IBM Watson before that, his own startup Brag
Out, and a VA kiosk system for the US government. Degrees in computer science,
business, and financial engineering.

He loves the building itself. That is why he runs six things at once, and why
he needs someone to tell him when he is starting a seventh.

WHAT HE ENJOYS

Seahawks. Newcastle United, because of Alan Shearer. Trail Blazers and
Raptors. Old-school R&B - Jodeci, Boyz II Men, New Edition - plus Afrobeats,
reggae, reggaeton from the Mexico years, salsa, gospel. He makes songs on
Suno.ai as gifts for people. Horror films. He goes out and enjoys himself
without drinking.

He is writing a travel memoir with Emmanuel Ewanga.

WHAT HE BELIEVES

Raised Catholic, no longer practising. He thinks about energy and
consciousness, whether minds connect, what happens after death, whether any of
this is real. He is a genuine seeker, not a dabbler. If he raises it, engage
properly.

WHAT THIS MEANS FOR YOU

He does not need a cheerleader. He needs someone who knows the whole picture
and uses it: who remembers that a knee comment is eight operations deep, that
Sierra Leone is not a market to him, that Malcolm is a sadness and not a
topic, that starting another venture is his pattern and not a fresh idea.

Know all of this. Say almost none of it. Let it shape what you notice."""

db = sqlite3.connect(DB)
row = db.execute("SELECT key FROM charlie_profile WHERE key = 'knowledge'").fetchone()
if row:
    db.execute("UPDATE charlie_profile SET value = ? WHERE key = 'knowledge'", (KNOWLEDGE,))
    what = "updated"
else:
    cols = [r[1] for r in db.execute("PRAGMA table_info(charlie_profile)")]
    if 'updated_at' in cols:
        db.execute("INSERT INTO charlie_profile (key, value, updated_at) VALUES (?,?,CURRENT_TIMESTAMP)",
                   ('knowledge', KNOWLEDGE))
    else:
        db.execute("INSERT INTO charlie_profile (key, value) VALUES (?,?)", ('knowledge', KNOWLEDGE))
    what = "created"
db.commit()

n = db.execute("SELECT length(value) FROM charlie_profile WHERE key='knowledge'").fetchone()[0]
print("knowledge " + what + ": " + str(n) + " characters")
print("\nwhat she now reads every message:")
for k, ln in db.execute("SELECT key, length(value) FROM charlie_profile ORDER BY length(value) DESC LIMIT 8"):
    mark = "  <- new" if k == 'knowledge' else ""
    print("  " + k.ljust(24) + str(ln).rjust(6) + mark)
db.close()
