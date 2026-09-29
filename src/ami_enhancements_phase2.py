#!/usr/bin/env python3
"""AMI ENHANCEMENTS - PHASE 2: Advanced Intelligence"""

from datetime import datetime

# 5. CONTEXT-AWARE KB LOADING
class ContextAwareKBLoader:
    def __init__(self, kb_dir="src/knowledge_bases"):
        self.kb_dir = kb_dir
        self.venture_keywords = {
            'gii': ['gii', 'global impact', 'nonprofit', 'sierra leone'],
            'gii_connect': ['gii connect', 'edtech', 'multilingual'],
            'fundiconnect': ['fundiconnect', 'nairobi', 'marketplace'],
            'techievet': ['techievet', 'project management', 'claude', 'mo'],
            'promoga': ['promoga', 'fitness', 'toronto', 'cya']
        }
    
    def detect_venture(self, text):
        text_lower = text.lower()
        detected = []
        for venture, keywords in self.venture_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    detected.append(venture)
                    break
        return list(set(detected))

# 6. RISK MATRIX & DEPENDENCY TRACKING
class RiskMatrix:
    def __init__(self):
        self.critical_blockers = [
            {'venture': 'TechieVet', 'risk': 'Mo backend unavailable', 'severity': 'CRITICAL'},
            {'venture': 'FundiConnect', 'risk': 'Testing deadline June 27', 'severity': 'CRITICAL'}
        ]
        self.dependencies = [
            {'primary': 'Jackson/Nelson', 'dependent': 'GII Connect & FundiConnect', 'severity': 'HIGH'},
            {'primary': 'Mo', 'dependent': 'TechieVet', 'severity': 'CRITICAL'}
        ]
    
    def get_critical_blockers(self):
        return self.critical_blockers
    
    def get_dependencies(self):
        return self.dependencies

# 7. GRANT COUNTDOWN TIMER
class GrantCountdown:
    def __init__(self):
        self.grants = [
            {'name': 'LINGUA Africa', 'amount': '$250K+$400K', 'date': '2026-07-01', 'priority': 'CRITICAL'},
            {'name': 'AWS Imagine', 'amount': '$200K+$100K', 'date': '2026-09-30', 'priority': 'HIGH'},
            {'name': 'D-Prize', 'amount': 'Varies', 'date': '2026-10-15', 'priority': 'MEDIUM'},
            {'name': 'DRK Foundation', 'amount': 'TBD', 'date': '2026-12-31', 'priority': 'HIGH'},
        ]
    
    def days_until(self, date_str):
        decision_date = datetime.strptime(date_str, '%Y-%m-%d')
        today = datetime.now()
        return (decision_date - today).days
    
    def get_countdown(self):
        countdown = []
        for grant in self.grants:
            days = self.days_until(grant['date'])
            if days <= 7:
                icon = "⏰"
            elif days <= 30:
                icon = "📅"
            else:
                icon = "📋"
            countdown.append({'name': grant['name'], 'days': days, 'icon': icon, 'priority': grant['priority']})
        return sorted(countdown, key=lambda x: x['days'])

# 8. 2027 TARGETS PROGRESS DASHBOARD
class TargetsProgressDashboard:
    def __init__(self):
        self.targets = {
            'GII Learners': {'current': 3348, 'target': 5000, 'pct': 67},
            'GII Teachers': {'current': 16, 'target': 100, 'pct': 16},
            'Mandatory Schools': {'current': 2, 'target': 5, 'pct': 40},
            'Revenue Pipeline': {'current': 0, 'target': 950000, 'pct': 0}
        }
    
    def progress_bar(self, pct, width=15):
        filled = int(width * pct / 100)
        return f"[{'█'*filled}{'░'*(width-filled)}] {pct}%"
    
    def get_dashboard(self):
        dashboard = ""
        for metric, data in self.targets.items():
            dashboard += f"{metric}: {self.progress_bar(data['pct'])}\n"
        return dashboard

# 9. TEAM AVAILABILITY DASHBOARD
class TeamAvailabilityDashboard:
    def __init__(self):
        self.team = [
            {'name': 'Jackson', 'role': 'Frontend', 'ventures': ['GII Connect', 'FundiConnect'], 'status': '✅', 'capacity': '90%'},
            {'name': 'Nelson', 'role': 'Backend', 'ventures': ['GII Connect', 'FundiConnect'], 'status': '✅', 'capacity': '90%'},
            {'name': 'Mo', 'role': 'Python/Flask', 'ventures': ['TechieVet'], 'status': '🚨', 'capacity': '0%'},
            {'name': 'Thanuganesh', 'role': 'Analytics', 'ventures': ['Promoga'], 'status': '✅', 'capacity': '85%'},
            {'name': 'Violet', 'role': 'CYA Lead', 'ventures': ['Promoga'], 'status': '🟡', 'capacity': '75%'}
        ]
    
    def get_availability(self):
        return self.team

# 10. WEB NEWS RELEVANCE SCORING
class NewsRelevanceScorer:
    def __init__(self):
        self.venture_keywords = {
            'TechieVet': ['Claude', 'AI', 'project management'],
            'GII': ['Sierra Leone', 'education', 'Africa'],
            'FundiConnect': ['Kenya', 'Nairobi', 'artisan'],
            'Promoga': ['fitness', 'Toronto', 'yoga'],
        }
    
    def score_relevance(self, headline):
        scores = {}
        headline_lower = headline.lower()
        for venture, keywords in self.venture_keywords.items():
            matches = sum(1 for kw in keywords if kw.lower() in headline_lower)
            score = min(100, (matches / len(keywords) * 100)) if keywords else 0
            scores[venture] = score
        return scores
    
    def filter_relevant_news(self, news_items, min_score=50):
        relevant = []
        for headline in news_items:
            scores = self.score_relevance(headline)
            max_score = max(scores.values()) if scores else 0
            if max_score >= min_score:
                top_venture = max(scores.items(), key=lambda x: x[1])
                relevant.append({'headline': headline, 'venture': top_venture[0], 'score': top_venture[1]})
        return relevant

if __name__ == "__main__":
    print("="*70)
    print("🚀 AMI ENHANCEMENTS - PHASE 2: ADVANCED INTELLIGENCE")
    print("="*70)
    
    print("\n5️⃣  CONTEXT-AWARE KB LOADING")
    kb_loader = ContextAwareKBLoader()
    ventures = kb_loader.detect_venture("Mo is blocking TechieVet backend")
    print(f"   ✅ Detected ventures: {ventures}")
    
    print("\n6️⃣  RISK MATRIX & DEPENDENCIES")
    risk = RiskMatrix()
    blockers = risk.get_critical_blockers()
    print(f"   ✅ Critical blockers identified: {len(blockers)}")
    for blocker in blockers:
        print(f"      🔴 {blocker['venture']}: {blocker['risk']}")
    
    print("\n7️⃣  GRANT COUNTDOWN TIMER")
    grants = GrantCountdown()
    countdown = grants.get_countdown()
    print(f"   ✅ Active grants tracked: {len(countdown)}")
    for grant in countdown[:3]:
        print(f"      {grant['icon']} {grant['name']}: {grant['days']} days")
    
    print("\n8️⃣  2027 TARGETS PROGRESS")
    targets = TargetsProgressDashboard()
    dashboard = targets.get_dashboard()
    print("   ✅ Key metrics:")
    for line in dashboard.split('\n')[:3]:
        if line:
            print(f"      {line}")
    
    print("\n9️⃣  TEAM AVAILABILITY")
    team = TeamAvailabilityDashboard()
    members = team.get_availability()
    print("   ✅ Team status:")
    for member in members:
        print(f"      {member['status']} {member['name']:12} ({member['capacity']})")
    
    print("\n🔟 WEB NEWS RELEVANCE SCORING")
    scorer = NewsRelevanceScorer()
    test_news = [
        "Claude AI releases new reasoning",
        "Sierra Leone education updates",
        "Tech startup IPO"
    ]
    relevant = scorer.filter_relevant_news(test_news, min_score=25)
    print(f"   ✅ Relevance scoring: {len(relevant)}/3 relevant")
    for news in relevant:
        print(f"      {news['venture']}: {news['headline'][:50]}... ({int(news['score'])}%)")
    
    print("\n" + "="*70)
    print("✨ PHASE 2 COMPLETE!")
    print("="*70 + "\n")
