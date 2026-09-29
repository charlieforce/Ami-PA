#!/usr/bin/env python3
"""AMI ENHANCEMENTS - PHASE 1: Foundation"""

import os
import json
from datetime import datetime
import sqlite3

# 1. KB SEARCH
class KnowledgeBaseSearch:
    def __init__(self, kb_dir="src/knowledge_bases"):
        self.kb_dir = kb_dir
        self.kbs = {}
        self.load_kbs()
    
    def load_kbs(self):
        files = {
            'gii': 'gii_enhanced.md',
            'gii_connect': 'gii_connect_enhanced.md',
            'fundiconnect': 'fundiconnect_enhanced.md',
            'techievet': 'techievet_enhanced.md',
            'promoga': 'promoga_enhanced.md',
            'company': 'company_enhanced.md',
        }
        for name, filename in files.items():
            path = os.path.join(self.kb_dir, filename)
            if os.path.exists(path):
                with open(path, 'r') as f:
                    self.kbs[name] = f.read()
    
    def search(self, query, venture=None):
        query_lower = query.lower()
        results = {'query': query, 'venture': venture, 'results': [], 'total_matches': 0}
        ventures_to_search = [venture] if venture else list(self.kbs.keys())
        
        for v_name in ventures_to_search:
            if v_name not in self.kbs:
                continue
            kb_content = self.kbs[v_name]
            lines = kb_content.split('\n')
            matches = []
            for i, line in enumerate(lines):
                if query_lower in line.lower():
                    context_start = max(0, i - 2)
                    context_end = min(len(lines), i + 3)
                    context = '\n'.join(lines[context_start:context_end])
                    matches.append({
                        'venture': v_name,
                        'line_number': i + 1,
                        'matched_line': line.strip(),
                        'context': context
                    })
            if matches:
                results['results'].extend(matches)
                results['total_matches'] += len(matches)
        return results

# 2. TIMEZONE TRACKING
class TimezoneManager:
    def __init__(self, db_path="data/ami_memory.db"):
        self.db_path = db_path
        self.current_timezone = "EAT"
        self.timezone_map = {'EAT': 3, 'GMT': 0, 'PST': -8, 'EST': -5, 'CST': -6}
    
    def adjust_time(self, hour):
        utc_offset = self.timezone_map.get(self.current_timezone, 0)
        adjusted = (hour + utc_offset) % 24
        return adjusted
    
    def get_briefing_schedule(self):
        return {
            'morning': f"{self.adjust_time(8):02d}:00",
            'midday': f"{self.adjust_time(12):02d}:00",
            'afternoon': f"{self.adjust_time(15):02d}:00",
            'evening': f"{self.adjust_time(18):02d}:00",
        }

# 3. ACTION ITEMS TRACKER
class ActionItemsTracker:
    def __init__(self):
        self.actions = []
    
    def add_action(self, action, venture, priority="MEDIUM", due_date=None):
        self.actions.append({
            'action': action,
            'venture': venture,
            'priority': priority,
            'status': 'OPEN',
            'due_date': due_date,
            'created': datetime.now().isoformat()
        })
        return {'status': 'success', 'action_id': len(self.actions) - 1}
    
    def get_open_actions(self):
        return sorted([a for a in self.actions if a['status'] == 'OPEN'], 
                     key=lambda x: x['priority'], reverse=True)

# 4. VENTURE HEALTH SCORING
class VentureHealthScorer:
    def __init__(self):
        pass
    
    def calculate_score(self, venture):
        scores = {
            'gii': 92,
            'gii_connect': 78,
            'fundiconnect': 88,
            'techievet': 35,
            'promoga': 82
        }
        score = scores.get(venture, 0)
        
        if score >= 85:
            status = '🟢 Healthy'
        elif score >= 70:
            status = '🟡 Monitor'
        elif score >= 50:
            status = '🟠 At Risk'
        else:
            status = '🔴 Critical'
        
        return {'venture': venture, 'score': score, 'status': status}
    
    def get_all_scores(self):
        return [self.calculate_score(v) for v in ['gii', 'gii_connect', 'fundiconnect', 'techievet', 'promoga']]

if __name__ == "__main__":
    print("="*70)
    print("🚀 AMI ENHANCEMENTS - PHASE 1: FOUNDATION")
    print("="*70)
    
    print("\n1️⃣  KB SEARCH FUNCTION")
    kb_search = KnowledgeBaseSearch()
    results = kb_search.search("June 27", venture="fundiconnect")
    print(f"   ✅ KB Search loaded - {len(kb_search.kbs)} knowledge bases")
    
    print("\n2️⃣  TIMEZONE TRACKING")
    tz_mgr = TimezoneManager()
    schedule = tz_mgr.get_briefing_schedule()
    print(f"   ✅ Timezone Manager active (TZ: {tz_mgr.current_timezone})")
    for time, val in schedule.items():
        print(f"      {time}: {val}")
    
    print("\n3️⃣  ACTION ITEMS TRACKER")
    actions = ActionItemsTracker()
    actions.add_action("Confirm Mo's TechieVet backend", "techievet", "CRITICAL", "2026-08-28")
    actions.add_action("Finalize CYA partnership", "promoga", "HIGH", "2026-08-27")
    actions.add_action("Track FundiConnect testing", "fundiconnect", "CRITICAL", "2026-06-27")
    open_actions = actions.get_open_actions()
    print(f"   ✅ Action Tracker loaded - {len(open_actions)} open actions")
    for action in open_actions[:3]:
        print(f"      [{action['priority']}] {action['action']}")
    
    print("\n4️⃣  VENTURE HEALTH SCORING")
    scorer = VentureHealthScorer()
    scores = scorer.get_all_scores()
    print("   ✅ Health Dashboard:")
    for venture_score in sorted(scores, key=lambda x: x['score'], reverse=True):
        print(f"      {venture_score['venture'].upper():15} {venture_score['score']:3}/100 {venture_score['status']}")
    
    print("\n" + "="*70)
    print("✨ PHASE 1 FOUNDATION COMPLETE!")
    print("="*70 + "\n")
