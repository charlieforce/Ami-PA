"""Google Calendar Integration - Ami's access to Charlie's schedule"""

import os
import pickle
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from datetime import datetime, timedelta
import json

class CalendarIntegration:
    """Handle Google Calendar read access for Ami"""
    
    SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
    
    def __init__(self, credentials_file='credentials.json', token_file='token.pickle'):
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.service = None
        print(f"CalendarIntegration.__init__ called with:")
        print(f"  credentials_file={self.credentials_file}")
        print(f"  token_file={self.token_file}")
        self.authenticate()
    
    def authenticate(self):
        """Authenticate with Google Calendar API"""
        print(f"DEBUG: credentials_file = {self.credentials_file}")
        print(f"DEBUG: token_file = {self.token_file}")
        print(f"DEBUG: token_file exists? {os.path.exists(self.token_file)}")
        print(f"DEBUG: credentials_file exists? {os.path.exists(self.credentials_file)}")
        creds = None
        
        # Load existing token
        if os.path.exists(self.token_file):
            with open(self.token_file, 'rb') as token:
                creds = pickle.load(token)
        
        # If no valid credentials, get new ones
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(self.credentials_file):
                    print(f"⚠️ {self.credentials_file} not found!")
                    return
                
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_file, self.SCOPES)
                creds = flow.run_local_server(port=8080)
            
            # Save token for next run
            with open(self.token_file, 'wb') as token:
                pickle.dump(creds, token)
        
        # Build service
        self.service = build('calendar', 'v3', credentials=creds)
        print("✅ Google Calendar authenticated!")
    
    def get_upcoming_events(self, days=7):
        """Get upcoming events for next N days"""
        try:
            if not self.service:
                return []
            
            now = datetime.utcnow().isoformat() + 'Z'
            later = (datetime.utcnow() + timedelta(days=days)).isoformat() + 'Z'
            
            events_result = self.service.events().list(
                calendarId='primary',
                timeMin=now,
                timeMax=later,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            return events
        except Exception as e:
            print(f"⚠️ Error getting calendar events: {e}")
            return []
    
    def detect_critical_deadlines(self):
        """Detect grant deadlines and venture meetings"""
        events = self.get_upcoming_events(days=30)
        
        critical_items = []
        
        for event in events:
            title = event.get('summary', '')
            start = event.get('start', {})
            start_time = start.get('dateTime', start.get('date', ''))
            
            # Parse date
            try:
                if 'T' in str(start_time):
                    event_date = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                else:
                    event_date = datetime.fromisoformat(start_time)
            except:
                event_date = None
            
            # Detect grant deadlines
            if any(word in title.lower() for word in ['grant', 'deadline', 'application', 'submit', 'lingua', 'aws', 'drk']):
                days_until = (event_date.date() - datetime.utcnow().date()).days if event_date else None
                critical_items.append({
                    'type': 'grant_deadline',
                    'title': title,
                    'date': start_time,
                    'days_until': days_until,
                    'priority': 'high' if days_until and days_until <= 7 else 'medium'
                })
            
            # Detect venture meetings
            elif any(word in title.lower() for word in ['gii', 'fundi', 'techievet', 'promoga', 'meeting', 'call', 'standup']):
                critical_items.append({
                    'type': 'venture_meeting',
                    'title': title,
                    'date': start_time,
                    'priority': 'high'
                })
        
        return critical_items
    
    def format_for_ami(self):
        """Format calendar data for Ami's context"""
        events = self.get_upcoming_events(days=14)
        
        if not events:
            return "No upcoming events in next 14 days."
        
        context = "# CHARLIE'S UPCOMING CALENDAR (Next 14 days)\n\n"
        
        for event in events:
            title = event.get('summary', 'Untitled')
            start = event.get('start', {})
            time = start.get('dateTime', start.get('date', 'All day'))
            
            # Highlight important items
            if any(word in title.lower() for word in ['grant', 'deadline', 'gii', 'fundi', 'techievet', 'promoga', 'meeting']):
                context += f"🔴 **{title}** - {time}\n"
            else:
                context += f"- {title}: {time}\n"
        
        return context

