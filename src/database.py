"""
DATABASE MODULE
SQLite database for storing Charlie's profile, memories, and learning
"""

import sqlite3
from datetime import datetime
import os

class Database:
    def __init__(self, db_path=None):
        import os as _os
        if db_path is None:
            db_path = _os.getenv("AMI_DB_PATH", "data/ami_memory.db")
        self.db_path = db_path
        # Create data folder if it doesn't exist
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.init_db()
    
    def init_db(self):
        """Initialize database with all tables"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Conversations table
        c.execute('''CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            turn INTEGER,
            user_message TEXT,
            ami_response TEXT,
            mood TEXT,
            time_period TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Charlie's profile table
        c.execute('''CREATE TABLE IF NOT EXISTS charlie_profile (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE,
            value TEXT,
            category TEXT,
            confidence REAL DEFAULT 0.8,
            source TEXT,
            learned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Learned topics/facts
        c.execute('''CREATE TABLE IF NOT EXISTS learned_facts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fact TEXT,
            category TEXT,
            confidence REAL,
            mentioned_in_turn INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Timezone settings
        c.execute('''CREATE TABLE IF NOT EXISTS timezone_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timezone TEXT,
            set_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Mood history
        c.execute('''CREATE TABLE IF NOT EXISTS mood_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mood TEXT,
            confidence REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Interests
        c.execute('''CREATE TABLE IF NOT EXISTS interests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            interest TEXT,
            category TEXT,
            mentioned_count INTEGER DEFAULT 1,
            confidence REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Family/Friends
        c.execute('''CREATE TABLE IF NOT EXISTS people (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            relationship TEXT,
            details TEXT,
            confidence REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Companies/Projects
        c.execute('''CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            type TEXT,
            details TEXT,
            status TEXT,
            confidence REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )''')
        
        conn.commit()
        conn.close()
    
    def save_conversation(self, turn, user_msg, ami_msg, mood, time_period):
        """Save conversation to database"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''INSERT INTO conversations 
                     (turn, user_message, ami_response, mood, time_period)
                     VALUES (?, ?, ?, ?, ?)''',
                  (turn, user_msg, ami_msg, mood, time_period))
        conn.commit()
        conn.close()
    
    def save_profile_fact(self, key, value, category, confidence=0.8, source="learned"):
        """Save or update a profile fact"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        # Check if key exists
        c.execute('SELECT id FROM charlie_profile WHERE key = ?', (key,))
        existing = c.fetchone()
        
        if existing:
            c.execute('''UPDATE charlie_profile 
                        SET value = ?, confidence = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE key = ?''',
                     (value, confidence, key))
        else:
            c.execute('''INSERT INTO charlie_profile 
                        (key, value, category, confidence, source)
                        VALUES (?, ?, ?, ?, ?)''',
                     (key, value, category, confidence, source))
        
        conn.commit()
        conn.close()
    
    def save_learned_fact(self, fact, category, confidence, turn):
        """Save a learned fact"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''INSERT INTO learned_facts 
                     (fact, category, confidence, mentioned_in_turn)
                     VALUES (?, ?, ?, ?)''',
                  (fact, category, confidence, turn))
        conn.commit()
        conn.close()
    
    def save_mood_history(self, mood, confidence):
        """Save mood to history"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''INSERT INTO mood_history (mood, confidence)
                     VALUES (?, ?)''',
                  (mood, confidence))
        conn.commit()
        conn.close()
    
    def set_timezone(self, timezone):
        """Set current timezone"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''INSERT INTO timezone_settings (timezone)
                     VALUES (?)''', (timezone,))
        conn.commit()
        conn.close()
    
    def get_current_timezone(self):
        """Get most recent timezone setting"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''SELECT timezone FROM timezone_settings 
                     ORDER BY set_at DESC LIMIT 1''')
        result = c.fetchone()
        conn.close()
        
        if result:
            return result[0]
        return "Africa/Nairobi"  # default
    
    def get_profile_context(self):
        """Get all profile info + knowledge bases formatted for Gemini prompt"""
        import os
        
        # Load knowledge bases
        kb_context = ""
        kb_dir = 'src/knowledge_bases'
        kb_files = ['personal.md', 'company.md', 'gii.md', 'gii_connect.md', 'fundiconnect.md', 'techievet.md', 'promoga.md']
        
        for kb_file in kb_files:
            kb_path = os.path.join(kb_dir, kb_file)
            if os.path.exists(kb_path):
                try:
                    with open(kb_path, 'r') as f:
                        kb_context += f.read() + "\n\n---\n\n"
                except:
                    pass
        
        # Also get learned profile
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT key, value FROM charlie_profile WHERE confidence > 0.5 ORDER BY updated_at DESC")
        facts = c.fetchall()
        conn.close()

        learned_context = "CHARLIE'S PROFILE (Learned from conversations):\n"
        if facts:
            for key, value in facts:
                learned_context += f"- {key}: {value}\n"
        else:
            learned_context = "No profile data yet."

        return kb_context + "\n\n" + learned_context

    def get_profile_dict(self):
        """Get profile as dictionary"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''SELECT key, value, confidence FROM charlie_profile 
                     WHERE confidence > 0.5 ORDER BY category''')
        facts = c.fetchall()
        conn.close()
        
        profile = {}
        for key, value, confidence in facts:
            profile[key] = {"value": value, "confidence": confidence}
        
        return profile
    
    def save_person(self, name, relationship, details, confidence=0.8):
        """Save person (family/friend) info"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute('''INSERT OR REPLACE INTO people 
                     (name, relationship, details, confidence)
                     VALUES (?, ?, ?, ?)''',
                  (name, relationship, details, confidence))
        
        conn.commit()
        conn.close()
    
    def save_project(self, name, type_, details, status, confidence=0.8):
        """Save project/company info"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute('''INSERT OR REPLACE INTO projects 
                     (name, type, details, status, confidence)
                     VALUES (?, ?, ?, ?, ?)''',
                  (name, type_, details, status, confidence))
        
        conn.commit()
        conn.close()

    def find_birthday(self, name):
        """Find birthday by name"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT * FROM birthdays WHERE LOWER(name) LIKE LOWER(?)', (f'%{name}%',))
        results = c.fetchall()
        conn.close()
        return results
    
    def add_birthday(self, name, date, relationship="friend"):
        """Add or update birthday"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            INSERT OR REPLACE INTO birthdays (name, date, relationship)
            VALUES (?, ?, ?)
        ''', (name.strip(), date, relationship))
        conn.commit()
        conn.close()
    
    def get_all_birthdays(self):
        """Get all birthdays"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT * FROM birthdays ORDER BY date')
        results = c.fetchall()
        conn.close()
        return results
    def add_task(self, title, description="", status="backend", priority="medium", due_date=None, category="personal"):
        """Add a new task"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            INSERT INTO tasks (title, description, status, priority, due_date, category)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (title, description, status, priority, due_date, category))
        conn.commit()
        task_id = c.lastrowid
        conn.close()
        return task_id
    
    def get_all_tasks(self):
        """Get all tasks"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM tasks ORDER BY priority DESC, due_date')
        results = c.fetchall()
        conn.close()
        return [dict(row) for row in results]
    
    def get_tasks_by_status(self, status):
        """Get tasks filtered by status"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM tasks WHERE status = ? ORDER BY priority DESC, due_date', (status,))
        results = c.fetchall()
        conn.close()
        return [dict(row) for row in results]
    
    def update_task_status(self, task_id, new_status):
        """Update task status (backend/progress/done)"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''
            UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (new_status, task_id))
        conn.commit()
        conn.close()
    
    def get_task(self, task_id):
        """Get single task by ID"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM tasks WHERE id = ?', (task_id,))
        result = c.fetchone()
        conn.close()
        return dict(result) if result else None
    
    def get_tasks_by_due_date(self, target_date):
        """Get tasks due on specific date"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM tasks WHERE due_date = ? ORDER BY priority DESC', (target_date,))
        results = c.fetchall()
        conn.close()
        return [dict(row) for row in results]
    
    def get_overdue_tasks(self):
        """Get overdue tasks"""
        from datetime import datetime
        today = datetime.now().date()
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM tasks WHERE due_date < ? AND status != "done" ORDER BY due_date', (today,))
        results = c.fetchall()
        conn.close()
        return [dict(row) for row in results]
    
    def get_tasks_due_this_week(self):
        """Get tasks due this week"""
        from datetime import datetime, timedelta
        today = datetime.now().date()
        
        # Calculate Friday of this week (or next Friday if today is weekend)
        days_until_friday = 4 - today.weekday()  # Monday=0, Sunday=6
        
        # If negative (after Friday), go to next Friday
        if days_until_friday < 0:
            days_until_friday += 7
        
        friday = today + timedelta(days=days_until_friday)
        
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM tasks WHERE due_date <= ? AND due_date >= ? AND status != "done" ORDER BY due_date', (friday, today))
        results = c.fetchall()
        conn.close()
        return [dict(row) for row in results]
    
    def get_tasks_by_project(self, project):
        """Get tasks for specific project"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT * FROM tasks WHERE category = ? ORDER BY priority DESC, due_date', (project,))
        results = c.fetchall()
        conn.close()
        return [dict(row) for row in results]






    
    def create_todo_list(self, title):
        """Create a new to-do list"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('INSERT INTO todo_lists (title) VALUES (?)', (title,))
        conn.commit()
        list_id = c.lastrowid
        conn.close()
        return list_id
    
    def add_todo_item(self, list_id, item_text, order_num=None):
        """Add item to to-do list"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        if order_num is None:
            c.execute('SELECT MAX(order_num) FROM todo_items WHERE list_id = ?', (list_id,))
            result = c.fetchone()[0]
            order_num = (result or 0) + 1
        
        c.execute('INSERT INTO todo_items (list_id, item_text, order_num) VALUES (?, ?, ?)',
                  (list_id, item_text, order_num))
        conn.commit()
        item_id = c.lastrowid
        conn.close()
        return item_id
    
    def get_todo_list(self, list_id):
        """Get to-do list with all items"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        c.execute('SELECT * FROM todo_lists WHERE id = ?', (list_id,))
        list_row = c.fetchone()
        
        c.execute('SELECT * FROM todo_items WHERE list_id = ? ORDER BY order_num', (list_id,))
        items = c.fetchall()
        
        conn.close()
        
        if not list_row:
            return None
        
        return {
            "id": list_row["id"],
            "title": list_row["title"],
            "status": list_row["status"],
            "created_date": list_row["created_date"],
            "items": [dict(item) for item in items]
        }
    
    def check_todo_item(self, item_id, is_checked=True):
        """Check/uncheck a to-do item"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        checked_date = "CURRENT_TIMESTAMP" if is_checked else "NULL"
        c.execute(f'''
            UPDATE todo_items 
            SET is_checked = ?, checked_date = {checked_date}
            WHERE id = ?
        ''', (1 if is_checked else 0, item_id))
        
        conn.commit()
        conn.close()
    
    def get_active_todo_lists(self):
        """Get all active to-do lists"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        c.execute('SELECT * FROM todo_lists WHERE status = "active" ORDER BY created_date DESC')
        lists = c.fetchall()
        
        conn.close()
        return [dict(list_row) for list_row in lists]
    
    def delete_todo_list(self, list_id):
        """Delete to-do list and its items"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute('DELETE FROM todo_items WHERE list_id = ?', (list_id,))
        c.execute('DELETE FROM todo_lists WHERE id = ?', (list_id,))
        
        conn.commit()
        conn.close()


    
    def add_todo_item(self, list_id, item_text, notes=None, order_num=None):
        """Add item to to-do list"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        if order_num is None:
            c.execute('SELECT MAX(order_num) FROM todo_items WHERE list_id = ?', (list_id,))
            result = c.fetchone()[0]
            order_num = (result or 0) + 1
        
        c.execute('INSERT INTO todo_items (list_id, item_text, order_num, notes) VALUES (?, ?, ?, ?)',
                  (list_id, item_text, order_num, notes))
        conn.commit()
        item_id = c.lastrowid
        conn.close()
        return item_id
    
    def rename_todo_list(self, list_id, new_title):
        """Rename to-do list"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('UPDATE todo_lists SET title = ? WHERE id = ?', (new_title, list_id))
        conn.commit()
        conn.close()
    
    def update_item_notes(self, item_id, notes):
        """Update item notes"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('UPDATE todo_items SET notes = ? WHERE id = ?', (notes, item_id))
        conn.commit()
        conn.close()


    
    def create_reminder(self, task_id, due_date):
        """Create a reminder for a task"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("""
            INSERT INTO reminders (task_id, due_date)
            VALUES (?, ?)
        """, (task_id, due_date))
        conn.commit()
        reminder_id = c.lastrowid
        conn.close()
        return reminder_id
    
    def get_reminders_to_send(self):
        """Get reminders that need to be sent"""
        from datetime import datetime, timedelta
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)
        
        c.execute("""
            SELECT r.*, t.title, t.status 
            FROM reminders r
            JOIN tasks t ON r.task_id = t.id
            WHERE r.due_date IN (?, ?)
            AND r.is_sent = 0
            AND r.snooze_until IS NULL
            ORDER BY r.escalation_level DESC
        """, (today, tomorrow))
        
        results = c.fetchall()
        conn.close()
        return [dict(row) for row in results]
    
    def update_reminder_sent(self, reminder_id, escalation_level):
        """Mark reminder as sent and update escalation"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("""
            UPDATE reminders 
            SET last_sent_date = CURRENT_TIMESTAMP,
                escalation_level = ?
            WHERE id = ?
        """, (escalation_level, reminder_id))
        conn.commit()
        conn.close()
    
    def snooze_reminder(self, reminder_id, snooze_until):
        """Snooze a reminder until specific time"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("""
            UPDATE reminders 
            SET snooze_until = ?
            WHERE id = ?
        """, (snooze_until, reminder_id))
        conn.commit()
        conn.close()
    
    def get_user_preferences(self):
        """Get user reminder preferences"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        
        c.execute("SELECT * FROM reminder_preferences ORDER BY id DESC LIMIT 1")
        result = c.fetchone()
        
        conn.close()
        return dict(result) if result else None
    
    def set_user_preferences(self, **prefs):
        """Set user reminder preferences"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        
        c.execute("DELETE FROM reminder_preferences")
        
        c.execute("""
            INSERT INTO reminder_preferences 
            (quiet_hours_start, quiet_hours_end, reminder_frequency, escalation_intensity,
             morning_briefing_time, enable_morning_briefing, enable_daily_digest, 
             digest_day, digest_time, timezone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            prefs.get("quiet_hours_start", "22:00"),
            prefs.get("quiet_hours_end", "07:00"),
            prefs.get("reminder_frequency", "smart"),
            prefs.get("escalation_intensity", "moderate"),
            prefs.get("morning_briefing_time", "08:00"),
            prefs.get("enable_morning_briefing", 1),
            prefs.get("enable_daily_digest", 1),
            prefs.get("digest_day", "sunday"),
            prefs.get("digest_time", "18:00"),
            prefs.get("timezone", "UTC")
        ))
        
        conn.commit()
        conn.close()
    
    def log_habit(self, task_id, completed_early=False, time_to_complete_hours=None, context=""):
        """Log task completion for habit tracking"""
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("""
            INSERT INTO habit_tracking (task_id, completion_date, completed_early, time_to_complete_hours, context)
            VALUES (?, DATE("now"), ?, ?, ?)
        """, (task_id, 1 if completed_early else 0, time_to_complete_hours, context))
        conn.commit()
        conn.close()
    
    def get_habit_stats(self, days=7):
        """Get habit completion stats for last N days"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

    def query(self, sql, params=()):
        """Execute query and return all results as list of dicts"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(sql, params)
            results = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return results
        except Exception as e:
            print(f"Query error: {e}")
            return []

    def query_one(self, sql, params=()):
        """Execute query and return single result as dict"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(sql, params)
            result = cursor.fetchone()
            conn.close()
            return dict(result) if result else None
        except Exception as e:
            print(f"Query one error: {e}")
            return None

    def execute(self, sql, params=()):
        """Execute statement and return last insert id"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(sql, params)
            conn.commit()
            last_id = cursor.lastrowid
            conn.close()
            return last_id
        except Exception as e:
            print(f"Execute error: {e}")
            return None

        
        c.execute("""
            SELECT 
                COUNT(*) as total_completed,
                SUM(CASE WHEN completed_early = 1 THEN 1 ELSE 0 END) as early_completions,
                AVG(time_to_complete_hours) as avg_time
            FROM habit_tracking
            WHERE completion_date >= DATE("now", "-" || ? || " days")
        """, (days,))
        
        result = c.fetchone()
        conn.close()
        return dict(result) if result else None



    def get_all_tasks(self):
        """Get all tasks"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM tasks ORDER BY due_date ASC")
        results = c.fetchall()
        conn.close()
        return [dict(row) for row in results]


# Initialize database
db = Database()

def init_tables():
    """Initialize database tables"""
    cursor = db.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS todo_lists (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_date TIMESTAMP,
            status TEXT DEFAULT 'active'
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS todo_items (
            id INTEGER PRIMARY KEY,
            list_id INTEGER NOT NULL,
            item_text TEXT NOT NULL,
            is_checked INTEGER DEFAULT 0,
            order_num INTEGER,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            checked_date TIMESTAMP,
            FOREIGN KEY(list_id) REFERENCES todo_lists(id)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'backend',
            priority TEXT DEFAULT 'medium',
            category TEXT,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            due_date DATE,
            context TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS birthdays (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            date TEXT NOT NULL,
            year_of_birth INTEGER,
            relationship TEXT,
            added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_reminded DATE,
            notes TEXT
        )
    ''')
    
    db.commit()


def init_tables():
    """Initialize database tables"""
    cursor = db.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'backend',
            priority TEXT DEFAULT 'medium',
            category TEXT,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            due_date DATE,
            context TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS birthdays (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            date TEXT NOT NULL,
            year_of_birth INTEGER,
            relationship TEXT,
            added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_reminded DATE,
            notes TEXT
        )
    ''')
    
    db.commit()
