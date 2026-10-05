"""
BASE ENGINE CLASS
All 11 specialized engines inherit from this
"""

class BaseEngine:
    def __init__(self, name, description):
        self.name = name
        self.description = description
        self.system_prompt = ""
    
    def get_system_prompt(self):
        """Returns the specialized system prompt for this engine"""
        return self.system_prompt
    
    def process(self, user_input, context):
        """Process user input and return response"""
        raise NotImplementedError("Subclasses must implement process()")
    
    def prepare_context(self, charlie_profile, mood, time_context, timezone):
        """Prepare context for Gemini"""
        return f"""
Charlie's Context:
- Mood: {mood}
- Time: {time_context}
- Timezone: {timezone}
- Profile: {charlie_profile}
"""

# All engines will inherit from BaseEngine
