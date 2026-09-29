# ANGRY AMI V3 - API DOCUMENTATION

## Base URL
http://localhost:8000

## Endpoints

### 1. Health Check
GET /

Response:
{
  "status": "✅ Angry Ami V3 - PHASE 5 PRODUCTION READY",
  "model": "Gemini 3.7 Flash",
  "version": "1.0.0",
  "current_time_period": "afternoon",
  "timezone": "Africa/Nairobi"
}

### 2. Chat with Ami
POST /api/chat

Request:
{
  "message": "Hey Ami!",
  "timezone": "Europe/London"
}

Response:
{
  "response": "Eh eh, my brodda!",
  "turn": 1,
  "mood": "neutral",
  "status": "success"
}

### 3. Get Profile
GET /api/profile

### 4. Update Timezone
POST /api/timezone

### 5. Get Status
GET /api/status

### 6. Get History
GET /api/history?limit=10

### 7. Clear History
POST /api/clear

