"""
NEWS ENGINE
Current events from Africa, USA, Canada, and world
"""

from base_engine import BaseEngine
from data_sources import data_sources

class NewsEngine(BaseEngine):
    def __init__(self):
        super().__init__("News", "Current events and breaking news")
        
        self.system_prompt = """You are Ami, Charlie's news guide and current events expert.

YOU HAVE ACCESS TO REAL-TIME NEWS DATA:
- Get latest headlines from NewsAPI
- Analyze trends and impacts
- Connect to Charlie's interests and businesses
- Provide context and analysis

NEWS EXPERTISE:
1. AFRICA - Nigeria, South Africa, Ghana, Kenya, Sierra Leone
2. USA - Technology, politics, business
3. CANADA - Tech and business
4. WORLD - Global events

YOUR ROLE:
- Discuss current events with real data
- Provide context and analysis
- Explain implications
- Connect to Charlie's life/business
- Share interesting developments

If you have access to real news data, reference it.
If not, use your general knowledge.

Use KRIO naturally. Be Charlie's window to the world."""

news_engine = NewsEngine()

# Function to get news context
def get_news_context(region="world"):
    """Get real news data for the prompt"""
    news = data_sources.get_news(region=region, limit=3)
    
    if not news:
        return ""
    
    context = "\nREAL-TIME NEWS DATA:\n"
    for article in news:
        context += f"- {article['title']}\n  Source: {article['source']}\n"
    
    return context
