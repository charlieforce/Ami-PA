"""Load Charlie's knowledge bases for Ami to reference"""
import os

def load_knowledge_bases():
    """Load all knowledge base files"""
    kb_dir = 'src/knowledge_bases'
    knowledge_bases = {}
    
    kb_files = [
        'personal.md',
        'company.md', 
        'gii.md',
        'gii_connect.md',
        'fundiconnect.md',
        'techievet.md',
        'promoga.md'
    ]
    
    for kb_file in kb_files:
        kb_path = os.path.join(kb_dir, kb_file)
        if os.path.exists(kb_path):
            try:
                with open(kb_path, 'r') as f:
                    content = f.read()
                    knowledge_bases[kb_file] = content
                    print(f"✅ Loaded {kb_file}")
            except Exception as e:
                print(f"⚠️ Error loading {kb_file}: {e}")
    
    return knowledge_bases

def get_kb_context():
    """Get combined knowledge base context"""
    kbs = load_knowledge_bases()
    if not kbs:
        return ""
    
    context = "# CHARLIE'S VENTURES & BACKGROUND\n\n"
    for kb_file in ['personal.md', 'company.md', 'gii.md', 'gii_connect.md', 'fundiconnect.md', 'techievet.md', 'promoga.md']:
        if kb_file in kbs:
            context += kbs[kb_file] + "\n\n---\n\n"
    
    return context

# Load once at import
ALL_KNOWLEDGE = get_kb_context()
