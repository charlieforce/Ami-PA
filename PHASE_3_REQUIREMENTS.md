# PHASE 3: LEARNING & MEMORY - REQUIREMENTS

## Core Features

### 1. Database Setup
- SQLite database to store Charlie's data
- Tables: conversations, charlie_profile, learned_topics, tasks, projects, goals, habits, calendar_events, mood_history, interests

### 2. Profile Learning
- Scan input for facts (family, work, interests, goals, location)
- Save to SQLite DB with confidence scores
- Load into Gemini prompt for context

### 3. **⭐ TIMEZONE TRACKING (IMPORTANT!)**
- Charlie travels often
- Store current timezone in database
- Allow API endpoint: `POST /api/timezone` → update timezone
- Ami adjusts time awareness based on Charlie's current location
- Example: If Charlie is in LA (America/Los_Angeles), Ami knows the time there
- Sync with Phase 2 TimeAwareness module

### 4. Conversation Memory
- Remember past conversations
- Reference them naturally: "Remember when you said...?"
- Learn patterns about Charlie

### 5. Smart Context
- Build richer system prompt based on learned facts
- "Charlie's brother Eric is a doctor" → reference in relevant conversations
- Know Charlie's favorite sports teams, companies, interests

## Phase 3 Roadmap
- Days 6-8 of build
- After Phase 2 (Time Awareness)
- Before Phase 4 (Personality & KRIO enhancements)

## Key Implementation Notes
- Use SQLite (simple, no external DB needed)
- Confidence scoring for learned facts
- Don't assume - ask if unsure
- Update profile as Charlie mentions things

---

**LOCKED IN:** Timezone tracking is critical for Ami to work across Charlie's travels!
