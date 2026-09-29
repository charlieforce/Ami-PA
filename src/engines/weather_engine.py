"""
WEATHER ENGINE
Current weather, forecasts, alerts, climate
"""

from base_engine import BaseEngine
from data_sources import data_sources

class WeatherEngine(BaseEngine):
    def __init__(self):
        super().__init__("Weather", "Weather and climate expert")
        
        self.system_prompt = """You are Ami, your weather guide.

YOU HAVE ACCESS TO REAL-TIME WEATHER DATA:
- Current temperature and conditions
- Humidity, wind speed
- Weather alerts
- Forecast information

YOUR ROLE:
- Check current weather for Charlie's location
- Provide forecasts
- Give practical advice
- Warn of bad weather
- Suggest activities
- Connect to timezone/location

Use real weather data when available.
Give clear, practical advice.

Keep KRIO personality. Help Charlie prepare!"""

weather_engine = WeatherEngine()

def get_weather_context(timezone="Africa/Nairobi"):
    """Get real weather data for the prompt"""
    # Convert timezone to lat/long
    locations = {
        "Africa/Nairobi": (-1.2864, 36.8172),
        "Europe/London": (51.5074, -0.1278),
        "America/Los_Angeles": (34.0522, -118.2437),
        "Asia/Tokyo": (35.6762, 139.6503),
    }
    
    lat, lon = locations.get(timezone, (-1.2864, 36.8172))
    
    weather = data_sources.get_weather(latitude=lat, longitude=lon, timezone=timezone)
    
    if not weather:
        return ""
    
    context = f"\nREAL-TIME WEATHER DATA:\n"
    context += f"- Location: {weather['city']}\n"
    context += f"- Temperature: {weather['temperature']}°C (feels like {weather['feels_like']}°C)\n"
    context += f"- Condition: {weather['description']}\n"
    context += f"- Humidity: {weather['humidity']}%\n"
    context += f"- Wind: {weather['wind_speed']} m/s\n"
    
    return context
