import { useState } from 'react';
import '../NoteFormStyles.css';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function QuickListForm({ onSave }) {
  const [title, setTitle] = useState('');
  const [items, setItems] = useState([{ text: '', quantity: 1, category: '', priority: 'Medium', checked: false }]);
  const [saving, setSaving] = useState(false);

  const addItem = () => {
    setItems([...items, { text: '', quantity: 1, category: '', priority: 'Medium', checked: false }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim() || items.filter(i => i.text.trim()).length === 0) {
      alert('Please fill in list title and add at least one item');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(API + '/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Ami-Password': AMI_PASSWORD,
        },
        body: JSON.stringify({
          title,
          content: JSON.stringify(items),
          capture_type: 'Quick List',
        }),
      });

      if (response.ok) {
        setTitle('');
        setItems([{ text: '', quantity: 1, category: '', priority: 'Medium', checked: false }]);
        onSave?.();
      } else {
        alert('Error saving list');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error saving list');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="note-form quicklist-form">
      <h2>☑️ Quick List</h2>
      
      <input
        type="text"
        placeholder="List Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="form-input"
      />

      <div className="list-section">
        {items.map((item, idx) => (
          <div key={idx} className="list-item">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) => updateItem(idx, 'checked', e.target.checked)}
              className="item-checkbox"
            />
            
            <input
              type="text"
              placeholder="Item..."
              value={item.text}
              onChange={(e) => updateItem(idx, 'text', e.target.value)}
              className="form-input"
              style={{ textDecoration: item.checked ? 'line-through' : 'none' }}
            />
            
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value))}
              className="item-qty"
              placeholder="Qty"
            />

            <select
              value={item.priority}
              onChange={(e) => updateItem(idx, 'priority', e.target.value)}
              className="item-priority"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>

            <button onClick={() => removeItem(idx)} className="remove-btn">🗑️</button>
          </div>
        ))}
        
        <button onClick={addItem} className="add-item-btn">➕ Add Item</button>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="save-btn"
      >
        {saving ? '⏳ Saving...' : '💾 Save'}
      </button>
    </div>
  );
}
