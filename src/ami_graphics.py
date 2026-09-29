#!/usr/bin/env python3
"""Graphics & Visualization Module for Ami PA"""

class AmiGraphics:
    """Generate beautiful ASCII graphics"""
    
    @staticmethod
    def progress_bar(current, target, width=30, label=""):
        pct = min(100, (current / target * 100)) if target > 0 else 0
        filled = int(width * pct / 100)
        bar = '█' * filled + '░' * (width - filled)
        
        if pct >= 85:
            color_icon = '🟢'
        elif pct >= 70:
            color_icon = '🟡'
        else:
            color_icon = '🔴'
        
        return f"{label}\n  {color_icon} [{bar}] {pct:.0f}% ({current:.0f}/{target:.0f})"
    
    @staticmethod
    def venture_dashboard(ventures):
        dashboard = "\n╔════════════════════════════════════════════════════════════════╗\n"
        dashboard += "║                   🎯 VENTURE HEALTH DASHBOARD                  ║\n"
        dashboard += "╚════════════════════════════════════════════════════════════════╝\n\n"
        
        for venture in sorted(ventures, key=lambda x: x['score'], reverse=True):
            name = venture['venture'].upper()
            score = venture['score']
            
            if score >= 85:
                status = '🟢 HEALTHY'
                bar = '█' * 26
            elif score >= 70:
                status = '🟡 MONITOR'
                bar = '█' * 20 + '░' * 6
            else:
                status = '🔴 CRITICAL'
                bar = '█' * 8 + '░' * 18
            
            dashboard += f"  {name:15} {status}  [{bar}] {score:3.0f}/100\n"
        
        return dashboard
    
    @staticmethod
    def table(headers, rows, title=""):
        if title:
            table_str = f"\n{title}\n"
        else:
            table_str = "\n"
        
        col_widths = [len(h) for h in headers]
        for row in rows:
            for i, cell in enumerate(row):
                col_widths[i] = max(col_widths[i], len(str(cell)))
        
        table_str += "┌"
        for width in col_widths:
            table_str += "─" * (width + 2) + "┬"
        table_str = table_str[:-1] + "┐\n"
        
        table_str += "│"
        for i, header in enumerate(headers):
            table_str += f" {header:^{col_widths[i]}} │"
        table_str += "\n"
        
        table_str += "├"
        for width in col_widths:
            table_str += "─" * (width + 2) + "┼"
        table_str = table_str[:-1] + "┤\n"
        
        for row in rows:
            table_str += "│"
            for i, cell in enumerate(row):
                table_str += f" {str(cell):^{col_widths[i]}} │"
            table_str += "\n"
        
        table_str += "└"
        for width in col_widths:
            table_str += "─" * (width + 2) + "┴"
        table_str = table_str[:-1] + "┘\n"
        
        return table_str
    
    @staticmethod
    def grant_countdown_display(grants):
        display = "\n╔════════════════════════════════════════════════════════════════╗\n"
        display += "║                   💰 GRANT COUNTDOWN TIMER 💰                  ║\n"
        display += "╠════════════════════════════════════════════════════════════════╣\n"
        
        for grant in grants:
            days = grant['days_until']
            name = grant['name']
            amount = grant['amount']
            icon = grant['icon']
            
            if days <= 0:
                time_str = f"DECIDED ({abs(days)} ago)"
                icon = "✅"
            elif days == 1:
                time_str = "TOMORROW!"
            elif days <= 7:
                time_str = f"{days} days ⚡"
            else:
                time_str = f"{days} days"
            
            display += f"║ {icon} {name:20} {amount:15}  {time_str:20} ║\n"
        
        display += "╚════════════════════════════════════════════════════════════════╝\n"
        return display
    
    @staticmethod
    def team_status_display(team):
        display = "\n╔════════════════════════════════════════════════════════════════╗\n"
        display += "║                    👥 TEAM AVAILABILITY 👥                     ║\n"
        display += "╠════════════════════════════════════════════════════════════════╣\n"
        
        for member in team:
            status = member['status']
            name = member['name']
            capacity = member['capacity']
            ventures = ', '.join(member.get('ventures', [])[:2])
            
            cap_pct = int(capacity.rstrip('%'))
            cap_filled = int(15 * cap_pct / 100)
            cap_bar = '█' * cap_filled + '░' * (15 - cap_filled)
            
            display += f"║ {status} {name:12} [{cap_bar}] {capacity:5}  {ventures:25} ║\n"
        
        display += "╚════════════════════════════════════════════════════════════════╝\n"
        return display
    
    @staticmethod
    def opportunities_display(opportunities):
        display = "\n╔════════════════════════════════════════════════════════════════╗\n"
        display += "║                  💡 CROSS-VENTURE OPPORTUNITIES 💡             ║\n"
        display += "╠════════════════════════════════════════════════════════════════╣\n"
        
        for opp in opportunities:
            impact_icon = '🔥' if opp['impact'] == 'HIGH' else '⚡'
            display += f"║ {impact_icon} {opp['title']:58} ║\n"
            display += f"║   → {opp['description']:56} ║\n"
            display += f"║   Status: {opp['status']:50} ║\n"
            display += f"║ ────────────────────────────────────────────────────────────────────── ║\n"
        
        display += "╚════════════════════════════════════════════════════════════════╝\n"
        return display

if __name__ == "__main__":
    print("="*70)
    print("🎨 AMI GRAPHICS & VISUALIZATION MODULE")
    print("="*70)
    
    graphics = AmiGraphics()
    
    print("\n📊 PROGRESS BAR:")
    print(graphics.progress_bar(3348, 5000, label="GII Learners"))
    
    print("\n🎯 VENTURE DASHBOARD:")
    ventures = [
        {'venture': 'gii', 'score': 92},
        {'venture': 'fundiconnect', 'score': 88},
        {'venture': 'promoga', 'score': 82},
        {'venture': 'gii_connect', 'score': 78},
        {'venture': 'techievet', 'score': 35},
    ]
    print(graphics.venture_dashboard(ventures))
    
    print("\n📋 TABLE:")
    headers = ['Venture', 'Status', 'Score', 'Action']
    rows = [
        ['GII', '✅ Active', '92/100', 'Monitor'],
        ['FundiConnect', '⏰ Testing', '88/100', 'Track June 27'],
        ['TechieVet', '🚨 Blocked', '35/100', 'Confirm Mo']
    ]
    print(graphics.table(headers, rows, "VENTURE STATUS"))
    
    print("\n💰 GRANT COUNTDOWN:")
    grants = [
        {'name': 'LINGUA Africa', 'amount': '$250K+$400K', 'days_until': -55, 'icon': '✅'},
        {'name': 'AWS Imagine', 'amount': '$200K+$100K', 'days_until': 36, 'icon': '📋'},
        {'name': 'D-Prize', 'amount': 'Varies', 'days_until': 51, 'icon': '📋'},
    ]
    print(graphics.grant_countdown_display(grants))
    
    print("\n👥 TEAM STATUS:")
    team = [
        {'status': '✅', 'name': 'Jackson', 'capacity': '90%', 'ventures': ['GII Connect', 'FundiConnect']},
        {'status': '✅', 'name': 'Nelson', 'capacity': '90%', 'ventures': ['GII Connect', 'FundiConnect']},
        {'status': '🚨', 'name': 'Mo', 'capacity': '0%', 'ventures': ['TechieVet']},
    ]
    print(graphics.team_status_display(team))
    
    print("\n💡 OPPORTUNITIES:")
    opps = [
        {'title': 'GII Learners → FundiConnect Artisans', 'description': 'Graduates become artisans', 'impact': 'HIGH', 'status': 'Ready'},
        {'title': 'GII Connect for Promoga', 'description': 'Studio instructor training', 'impact': 'MEDIUM', 'status': 'Explore'},
    ]
    print(graphics.opportunities_display(opps))
    
    print("\n" + "="*70)
    print("✨ GRAPHICS MODULE READY!")
    print("="*70 + "\n")
