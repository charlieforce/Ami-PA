import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const ShoppingListsNew = () => {
  const [lists, setLists] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [expandedList, setExpandedList] = useState(null);
  const [newItemData, setNewItemData] = useState({});
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || API + '';
  const PASSWORD = AMI_PASSWORD;
  const CATEGORIES = ['Grocery', 'Dairy', 'Frozen', 'Household', 'Other'];

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      const res = await fetch(`${API_URL}/api/shopping/lists`, {
        headers: { 'X-Ami-Password': PASSWORD }
      });
      const data = await res.json();
      setLists(data.shopping_lists || []);
    } catch (e) {
      console.error('Error loading lists:', e);
    } finally {
      setLoading(false);
    }
  };

  const createList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/shopping/lists`, {
        method: 'POST',
        headers: { 'X-Ami-Password': PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newListName })
      });
      const list = await res.json();
      setLists([...lists, { ...list, items: [], completed: 0, total: 0, progress: 0 }]);
      setNewListName('');
    } catch (e) {
      console.error('Error creating list:', e);
    }
  };

  const addItem = async (listId, e) => {
    e.preventDefault();
    const itemData = newItemData[listId];
    if (!itemData?.title?.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/shopping/lists/${listId}/items`, {
        method: 'POST',
        headers: { 'X-Ami-Password': PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: itemData.title,
          quantity: itemData.quantity || '1',
          unit: itemData.unit || 'pieces',
          price: parseFloat(itemData.price) || 0,
          category: itemData.category || 'Other',
          notes: itemData.notes || ''
        })
      });
      const item = await res.json();
      setLists(lists.map(lst => 
        lst.id === listId 
          ? { 
              ...lst, 
              items: [...(lst.items || []), item],
              total: lst.total + 1,
              progress: ((lst.completed) / (lst.total + 1) * 100)
            }
          : lst
      ));
      setNewItemData({ ...newItemData, [listId]: {} });
    } catch (e) {
      console.error('Error adding item:', e);
    }
  };

  const toggleItem = async (itemId, listId) => {
    try {
      await fetch(`${API_URL}/api/shopping/items/${itemId}`, {
        method: 'PUT',
        headers: { 'X-Ami-Password': PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      loadLists();
    } catch (e) {
      console.error('Error toggling item:', e);
    }
  };

  const deleteList = async (listId) => {
    if (!window.confirm('Delete this list?')) return;
    try {
      await fetch(`${API_URL}/api/shopping/lists/${listId}`, {
        method: 'DELETE',
        headers: { 'X-Ami-Password': PASSWORD }
      });
      setLists(lists.filter(l => l.id !== listId));
    } catch (e) {
      console.error('Error deleting list:', e);
    }
  };

  const carryList = async (listId) => {
    try {
      const res = await fetch(`${API_URL}/api/shopping/lists/${listId}/carry`, {
        method: 'PUT',
        headers: { 'X-Ami-Password': PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const result = await res.json();
      if (result.new_list_id) {
        alert(`✅ ${result.message}`);
        loadLists();
      } else {
        alert('✅ All items checked!');
      }
    } catch (e) {
      console.error('Error carrying list:', e);
    }
  };

  const getTotalPrice = (items) => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 1;
      return sum + (item.price * qty);
    }, 0);
  };

  const groupItemsByCategory = (items) => {
    const grouped = {};
    items.forEach(item => {
      const cat = item.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });
    return grouped;
  };

  if (loading) return <div style={{ color: '#fff', padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ color: '#fff', marginBottom: '24px', fontSize: '32px', fontWeight: 'bold' }}>🛒 Shopping Lists</h1>

      {/* Create List Form */}
      <form onSubmit={createList} style={{ marginBottom: '32px', display: 'flex', gap: '12px' }}>
        <input
          type="text"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="e.g., Grocery, Vacation, Car..."
          style={{ flex: 1, padding: '14px 16px', borderRadius: '8px', border: '2px solid #444', background: '#2a2a2a', color: '#fff', fontSize: '15px', fontWeight: '500' }}
        />
        <button type="submit" style={{ padding: '14px 32px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', transition: 'all 0.2s' }} onMouseOver={(e) => e.target.style.background = '#5568d3'} onMouseOut={(e) => e.target.style.background = '#667eea'}>
          + Add List
        </button>
      </form>

      {/* Shopping Lists Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
        {lists.map(list => (
          <div key={list.id} style={{ background: '#2a2a2a', border: '2px solid #444', borderRadius: '12px', padding: '20px', color: '#fff', overflow: 'hidden' }}>
            {/* List Header - BIG CLICKABLE AREA */}
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '16px', 
                cursor: 'pointer',
                padding: '12px',
                margin: '-12px -12px 16px -12px',
                borderRadius: '8px',
                background: expandedList === list.id ? '#3a3a3a' : 'transparent',
                transition: 'all 0.2s'
              }} 
              onClick={() => setExpandedList(expandedList === list.id ? null : list.id)}
              onMouseOver={(e) => e.currentTarget.style.background = '#3a3a3a'}
              onMouseOut={(e) => e.currentTarget.style.background = expandedList === list.id ? '#3a3a3a' : 'transparent'}
            >
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>📦 {list.name}</h3>
              <span style={{ fontSize: '14px', background: '#667eea', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold' }}>
                {list.completed}/{list.total}
              </span>
            </div>

            {/* Progress Bar */}
            <div style={{ background: '#444', height: '10px', borderRadius: '6px', marginBottom: '16px', overflow: 'hidden' }}>
              <div style={{ background: '#10b981', height: '100%', width: `${list.progress}%`, transition: 'width 0.3s' }}></div>
            </div>

            {/* Expanded View */}
            {expandedList === list.id && (
              <div style={{ marginTop: '16px' }}>
                {/* Total Price */}
                {list.items.length > 0 && (
                  <div style={{ background: '#3a3a3a', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '16px', textAlign: 'center', border: '2px solid #667eea' }}>
                    💰 Total: <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '20px' }}>{getTotalPrice(list.items).toFixed(0)}</span>
                  </div>
                )}

                {/* Items by Category */}
                {list.items.length === 0 ? (
                  <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center' }}>No items yet</p>
                ) : (
                  Object.entries(groupItemsByCategory(list.items)).map(([category, items]) => (
                    <div key={category} style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#aaa', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
                        📁 {category} ({items.length})
                      </div>
                      {items.map(item => (
                        <div 
                          key={item.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            padding: '14px', 
                            background: '#1a1a1a', 
                            borderRadius: '8px', 
                            marginBottom: '8px', 
                            cursor: 'pointer',
                            border: '2px solid #444',
                            transition: 'all 0.2s'
                          }}
                          onClick={() => toggleItem(item.id, list.id)}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#2a2a2a';
                            e.currentTarget.style.borderColor = '#667eea';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = '#1a1a1a';
                            e.currentTarget.style.borderColor = '#444';
                          }}
                        >
                          {/* Checkbox - BIG & CLEAR */}
                          <input 
                            type="checkbox" 
                            checked={item.is_checked} 
                            onChange={() => {}} 
                            style={{ width: '22px', height: '22px', cursor: 'pointer', flexShrink: 0 }} 
                          />
                          {/* Item Details */}
                          <div style={{ flex: 1 }}>
                            <div style={{ textDecoration: item.is_checked ? 'line-through' : 'none', color: item.is_checked ? '#666' : '#fff', fontSize: '15px', fontWeight: '600' }}>
                              {item.quantity} {item.unit} — {item.title}
                            </div>
                            {item.notes && <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>💬 {item.notes}</div>}
                          </div>
                          {/* Price */}
                          {item.price > 0 && (
                            <div style={{ fontSize: '14px', color: '#10b981', fontWeight: 'bold', textAlign: 'right' }}>
                              💰 {(item.price * (parseFloat(item.quantity) || 1)).toFixed(0)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                )}

                {/* Add Item Form */}
                <form onSubmit={(e) => addItem(list.id, e)} style={{ marginTop: '16px', padding: '16px', background: '#1a1a1a', borderRadius: '8px', border: '2px solid #444' }}>
                  <input type="text" value={newItemData[list.id]?.title || ''} onChange={(e) => setNewItemData({ ...newItemData, [list.id]: { ...newItemData[list.id], title: e.target.value } })} placeholder="Item name" style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '2px solid #444', background: '#2a2a2a', color: '#fff', fontSize: '14px' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input type="text" value={newItemData[list.id]?.quantity || '1'} onChange={(e) => setNewItemData({ ...newItemData, [list.id]: { ...newItemData[list.id], quantity: e.target.value } })} placeholder="Qty" style={{ padding: '10px', borderRadius: '6px', border: '2px solid #444', background: '#2a2a2a', color: '#fff', fontSize: '14px' }} />
                    <input type="text" value={newItemData[list.id]?.unit || 'pieces'} onChange={(e) => setNewItemData({ ...newItemData, [list.id]: { ...newItemData[list.id], unit: e.target.value } })} placeholder="Unit" style={{ padding: '10px', borderRadius: '6px', border: '2px solid #444', background: '#2a2a2a', color: '#fff', fontSize: '14px' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input type="number" value={newItemData[list.id]?.price || 0} onChange={(e) => setNewItemData({ ...newItemData, [list.id]: { ...newItemData[list.id], price: e.target.value } })} placeholder="Price" style={{ padding: '10px', borderRadius: '6px', border: '2px solid #444', background: '#2a2a2a', color: '#fff', fontSize: '14px' }} />
                    <select value={newItemData[list.id]?.category || 'Other'} onChange={(e) => setNewItemData({ ...newItemData, [list.id]: { ...newItemData[list.id], category: e.target.value } })} style={{ padding: '10px', borderRadius: '6px', border: '2px solid #444', background: '#2a2a2a', color: '#fff', fontSize: '14px' }}>
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  <input type="text" value={newItemData[list.id]?.notes || ''} onChange={(e) => setNewItemData({ ...newItemData, [list.id]: { ...newItemData[list.id], notes: e.target.value } })} placeholder="Notes (optional)" style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '6px', border: '2px solid #444', background: '#2a2a2a', color: '#fff', fontSize: '14px' }} />

                  <button type="submit" style={{ width: '100%', padding: '12px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s' }} onMouseOver={(e) => e.target.style.background = '#5568d3'} onMouseOut={(e) => e.target.style.background = '#667eea'}>
                    + Add Item
                  </button>
                </form>

                {/* Action Buttons - BIG & CLEAR */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
                  <button 
                    onClick={() => carryList(list.id)} 
                    style={{ 
                      padding: '14px', 
                      background: '#f59e0b', 
                      color: '#1a1a1a', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#e8910d'}
                    onMouseOut={(e) => e.target.style.background = '#f59e0b'}
                  >
                    📦 Carry Next
                  </button>
                  <button 
                    onClick={() => deleteList(list.id)} 
                    style={{ 
                      padding: '14px', 
                      background: '#ef4444', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#dc2626'}
                    onMouseOut={(e) => e.target.style.background = '#ef4444'}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {lists.length === 0 && (
        <div style={{ textAlign: 'center', color: '#aaa', padding: '60px 20px', fontSize: '16px' }}>
          No shopping lists yet. Create one above! 🛍️
        </div>
      )}
    </div>
  );
};

export default ShoppingListsNew;
