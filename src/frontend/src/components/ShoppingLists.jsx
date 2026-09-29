import React, { useState, useEffect } from 'react';
import { 
  getShoppingLists, 
  createShoppingList, 
  addShoppingItem, 
  toggleShoppingItem,
  carryShoppingList,
  deleteShoppingList 
} from '../utils/api';
import '../styles/ShoppingLists.css';

function ShoppingLists({ amiImage }) {
  const [lists, setLists] = useState([]);
  const [newListName, setNewListName] = useState('');
  const [newItemText, setNewItemText] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedList, setExpandedList] = useState(null);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      const data = await getShoppingLists();
      setLists(data.shopping_lists || []);
    } catch (err) {
      console.error('Error loading lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const list = await createShoppingList(newListName);
      setLists([...lists, { ...list, items: [], completed: 0, total: 0, progress: 0 }]);
      setNewListName('');
    } catch (err) {
      console.error('Error creating list:', err);
    }
  };

  const handleAddItem = async (listId, e) => {
    e.preventDefault();
    const itemText = newItemText[listId];
    if (!itemText?.trim()) return;

    try {
      const item = await addShoppingItem(listId, itemText);
      setLists(lists.map(lst => 
        lst.id === listId 
          ? { 
              ...lst, 
              items: [...lst.items, item],
              total: lst.total + 1,
              progress: ((lst.completed) / (lst.total + 1) * 100)
            }
          : lst
      ));
      setNewItemText({ ...newItemText, [listId]: '' });
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  const handleToggleItem = async (listId, itemId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await toggleShoppingItem(itemId, newStatus);
      
      setLists(lists.map(lst => 
        lst.id === listId 
          ? {
              ...lst,
              items: lst.items.map(item => 
                item.id === itemId 
                  ? { ...item, is_checked: newStatus }
                  : item
              ),
              completed: newStatus ? lst.completed + 1 : lst.completed - 1,
              progress: ((newStatus ? lst.completed + 1 : lst.completed - 1) / lst.total * 100)
            }
          : lst
      ));
    } catch (err) {
      console.error('Error toggling item:', err);
    }
  };

  const handleCarryList = async (listId) => {
    try {
      await carryShoppingList(listId);
      setLists(lists.filter(lst => lst.id !== listId));
      loadLists();
      alert('Carried to tomorrow! 📦');
    } catch (err) {
      console.error('Error carrying list:', err);
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Delete this list?')) return;

    try {
      await deleteShoppingList(listId);
      setLists(lists.filter(lst => lst.id !== listId));
    } catch (err) {
      console.error('Error deleting list:', err);
    }
  };

  if (loading) {
    return <div className="shopping-loading">Loading shopping lists...</div>;
  }

  return (
    <div className="shopping-lists">
      <div className="shopping-header">
        <h2>🛒 DAILY SHOPPING</h2>
        <p>Create lists for today's shopping trips</p>
      </div>

      {/* Create New List */}
      <form onSubmit={handleCreateList} className="create-list-form">
        <input
          type="text"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="e.g., Grocery, House, Travel..."
          className="list-input"
        />
        <button type="submit" className="create-btn">+ Add List</button>
      </form>

      {/* Shopping Cards Grid */}
      <div className="shopping-grid">
        {lists.length === 0 ? (
          <p className="empty-state">No shopping lists yet. Create one above! 🛍️</p>
        ) : (
          lists.map(list => (
            <div 
              key={list.id} 
              className={`shopping-card ${expandedList === list.id ? 'expanded' : ''}`}
              onClick={() => expandedList === list.id ? setExpandedList(null) : setExpandedList(list.id)}
            >
              {/* Card Header */}
              <div className="card-header">
                <h3>🛒 {list.name}</h3>
                <span className="card-count">{list.completed}/{list.total}</span>
              </div>

              {/* Progress Circle */}
              <div className="progress-circle-container">
                <svg className="progress-circle" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" className="progress-bg" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    className="progress-fill"
                    style={{
                      strokeDashoffset: 282.6 - (list.progress / 100) * 282.6
                    }}
                  />
                  <text x="50" y="60" className="progress-text">
                    {Math.round(list.progress)}%
                  </text>
                </svg>
              </div>

              {/* Expanded Content */}
              {expandedList === list.id && (
                <div className="card-expanded">
                  {/* Items List */}
                  <div className="items-list">
                    {list.items.length === 0 ? (
                      <p className="no-items">No items yet</p>
                    ) : (
                      list.items.map(item => (
                        <div key={item.id} className="shopping-item">
                          <input
                            type="checkbox"
                            checked={item.is_checked}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleItem(list.id, item.id, item.is_checked);
                            }}
                            className="item-checkbox"
                          />
                          <span className={`item-title ${item.is_checked ? 'checked' : ''}`}>
                            {item.title}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Item Form */}
                  <form 
                    onSubmit={(e) => {
                      e.stopPropagation();
                      handleAddItem(list.id, e);
                    }}
                    className="add-item-form"
                  >
                    <input
                      type="text"
                      value={newItemText[list.id] || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        setNewItemText({ ...newItemText, [list.id]: e.target.value });
                      }}
                      placeholder="Add item..."
                      className="item-input"
                    />
                    <button type="submit" className="add-item-btn">+</button>
                  </form>

                  {/* List Actions */}
                  <div className="card-actions">
                    <button 
                      className="action-btn carry"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCarryList(list.id);
                      }}
                    >
                      📦 Carry
                    </button>
                    <button 
                      className="action-btn done"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteList(list.id);
                      }}
                    >
                      ✓ Done
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteList(list.id);
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Ami Encouragement */}
      {lists.length > 0 && (
        <div className="shopping-encouragement">
          {amiImage && (
            <>
              <img src={amiImage} alt="Ami" className="ami-small" />
              <div className="ami-label">Angry Ami</div>
            </>
          )}
          <p>Get your shopping done! Check those items off! 🛍️💪</p>
        </div>
      )}
    </div>
  );
}

export default ShoppingLists;
