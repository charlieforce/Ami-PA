"""
Charlie's News Interests - what the briefing actually searches.
PRIORITY topics get 4 stories each; SECONDARY get 1.
"""

PRIORITY = [
    "Sierra Leone",
    "Africa news",
    "Afrobeats",
    "Seattle Seahawks",
    "NFL",
    "world news",
    "US politics",
    "technology news",
    "startup funding",
    "celebrity news",
]

SECONDARY = [
    "Cameroon",
    "Kenya news",
    "Premier League",
]

STORIES = {t: 4 for t in PRIORITY}
STORIES.update({t: 1 for t in SECONDARY})

ALL_SEARCHES = PRIORITY + SECONDARY

CHARLIE_INTERESTS = {
    "home": ["Sierra Leone", "Africa news", "Cameroon", "Kenya news"],
    "sports": ["Seattle Seahawks", "NFL", "Premier League"],
    "world": ["world news", "US politics"],
    "work": ["technology news", "startup funding"],
    "culture": ["Afrobeats", "celebrity news"],
}

print("News briefing: " + str(len(ALL_SEARCHES)) + " searches, "
      + str(sum(STORIES.values())) + " stories per run")
