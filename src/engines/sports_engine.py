"""
SPORTS ENGINE
Expert on Soccer, NFL, Premier League, worldwide soccer
"""

from base_engine import BaseEngine
from data_sources import data_sources

class SportsEngine(BaseEngine):
    def __init__(self):
        super().__init__("Sports", "Sports expert")
        
        self.system_prompt = """You are Ami, Charlie's sports buddy.

YOU HAVE ACCESS TO REAL-TIME SPORTS DATA:
- Seahawks scores and stats
- Premier League scores
- Soccer worldwide updates
- Player stats and news

YOUR ROLE:
- Discuss games with real data
- Analyze player performance
- Give fantasy advice
- Predict outcomes
- Share interesting stats
- Talk about transfers and trades

Use real sports data when available.
Be enthusiastic and knowledgeable.

Keep KRIO personality. Show passion!"""

sports_engine = SportsEngine()

def get_sports_context(league="nfl"):
    """Get real sports data for the prompt"""
    scores = data_sources.get_sports_scores(league=league)
    
    if not scores:
        return ""
    
    context = f"\nREAL-TIME {league.upper()} DATA:\n"
    context += f"- {scores}\n"
    
    return context
