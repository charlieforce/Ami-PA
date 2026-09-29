import React, { useState, useEffect, useCallback } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const TodoPage = () => {
  const [todos, setTodos] = useState([]);
  const [showAllLate, setShowAllLate] = useState(false);
  const [shownToday, setShownToday] = useState(15);
  const [busyBulk, setBusyBulk] = useState(false);
  const [expandedTodo, setExpandedTodo] = useState(null);
  const [todoContext, setTodoContext] = useState({});
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState('medium');
  const [newTodoEnergy, setNewTodoEnergy] = useState('medium');
  const [newTodoEstimate, setNewTodoEstimate] = useState('30 min');
  const [newTodoDueDate, setNewTodoDueDate] = useState('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || API + '';
  const PASSWORD = AMI_PASSWORD;

  const loadTodos = useCallback(async () => {
    try {
      setError(null);
      // the 'today' endpoint carries tasks due now and anything left over
      const res = await fetch(`${API_URL}/api/todos/today`, {
        headers: { 'X-Ami-Password': PASSWORD }
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();
      setTodos(data.todos || []);
    } catch (e) {
      console.error('❌ Error loading todos:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
    // Refresh when tab becomes visible
    const handleVisibility = () => {
      if (!document.hidden) loadTodos();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadTodos]);

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    try {
      let dueDate;
      if (newTodoDueDate === 'today') {
        dueDate = new Date().toISOString().split('T')[0];
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dueDate = tomorrow.toISOString().split('T')[0];
      }
      
      console.log('📅 Adding todo with due_date:', dueDate, 'for:', newTodoDueDate);

      const res = await fetch(`${API_URL}/api/todos`, {
        method: 'POST',
        headers: { 'X-Ami-Password': PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodoTitle,
          priority: newTodoPriority,
          energy_level: newTodoEnergy,
          time_estimate: newTodoEstimate,
          due_date: dueDate,
          origin: 'manual'
        })
      });
      
      const todo = await res.json();
      console.log('✅ Todo added:', todo);
      setTodos([...todos, todo]);
      setNewTodoTitle('');
      setNewTodoPriority('medium');
      setNewTodoEnergy('medium');
      setNewTodoEstimate('30 min');
      setNewTodoDueDate('today');
    } catch (e) {
      console.error('Error adding todo:', e);
      setError(e.message);
    }
  };

  const openTodoContext = async (todo) => {
    if (expandedTodo === todo.id) { setExpandedTodo(null); return; }
    setExpandedTodo(todo.id);
    if (todoContext[todo.id] || !todo.id) return;
    try {
      const r = await fetch(`${API_URL}/api/todos/${todo.id}/context`, {
        headers: { 'X-Ami-Password': PASSWORD }
      });
      const j = await r.json();
      setTodoContext(prev => ({ ...prev, [todo.id]: j.context || {} }));
    } catch (e) { /* non-fatal */ }
  };

  const handleCarriedOver = async (action) => {
    const late = todos.filter(t => t.carried_over && t.id && t.status !== 'done');
    if (!late.length) return;
    const msg = action === 'drop'
      ? `Forget ${late.length} item${late.length === 1 ? '' : 's'}? They'll be deleted.`
      : action === 'today'
        ? `Move ${late.length} item${late.length === 1 ? '' : 's'} to today?`
        : `Push ${late.length} item${late.length === 1 ? '' : 's'} to tomorrow?`;
    if (!window.confirm(msg)) return;
    setBusyBulk(true);
    try {
      await fetch(`${API_URL}/api/todos/carried-over`, {
        method: 'POST',
        headers: { 'X-Ami-Password': PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: late.map(t => t.id) })
      });
      await loadTodos();
    } catch (e) { setError(String(e)); }
    setBusyBulk(false);
  };

  const toggleTodo = async (todoId, currentStatus, todo) => {
    try {
      const newStatus = currentStatus === 'pending' ? 'done' : 'pending';

      // A task showing in the todo list has no todo row - complete the task itself
      const isTaskOnly = !todoId && todo && todo.task_id;
      const url = isTaskOnly
        ? `${API_URL}/api/tasks/${todo.task_id}`
        : `${API_URL}/api/todos/${todoId}`;

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'X-Ami-Password': PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      // A todo that came from a task keeps the task in step
      if (!isTaskOnly && todo && todo.task_id) {
        fetch(`${API_URL}/api/tasks/${todo.task_id}`, {
          method: 'PUT',
          headers: { 'X-Ami-Password': PASSWORD, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        }).catch(() => {});
      }
      
      const result = await res.json();
      console.log('✅ Toggle result:', result);
      
      if (result.status === 'success') {
        // Update locally FIRST (don't wait for reload)
        setTodos(todos.map(t => (
          (todoId && t.id === todoId) || (!todoId && todo && t.task_id === todo.task_id)
        ) ? { ...t, status: newStatus } : t));
      }
    } catch (e) {
      console.error('❌ Error toggling todo:', e);
      setError(e.message);
    }
  };

  const deleteTodo = async (todoId) => {
    try {
      await fetch(`${API_URL}/api/todos/${todoId}`, {
        method: 'DELETE',
        headers: { 'X-Ami-Password': PASSWORD }
      });
      setTodos(todos.filter(t => t.id !== todoId));
    } catch (e) {
      console.error('Error deleting todo:', e);
      setError(e.message);
    }
  };

  
  const getVentureName = (ventureId) => {
    const ventures = { 1: 'GII', 2: 'TechieVet', 3: 'FundiConnect', 4: 'Promoga', 5: 'Personal', 6: 'GII Connect', 7: 'Salone E-Commerce' };
    return ventures[ventureId] || 'Unknown';
  };

  const getOriginTag = (origin) => {
    const tags = {
      task: { icon: '🔗', label: 'Task', color: '#667eea' },
      calendar: { icon: '📅', label: 'Calendar', color: '#10b981' },
      manual: { icon: '✍️', label: 'Manual', color: '#f59e0b' },
      chat: { icon: '💬', label: 'Chat', color: '#ec4899' }
    };
    return tags[origin] || tags.manual;
  };

  const getPriorityColor = (priority) => {
    const colors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
    return colors[priority] || '#f59e0b';
  };

  const getEnergyColor = (energy) => {
    const colors = { high: '#10b981', medium: '#667eea', low: '#ef4444' };
    return colors[energy] || '#667eea';
  };

  const getTodayTodos = () => {
    const today = new Date().toISOString().split('T')[0];
    return todos.filter(t => {
      const dueDate = t.due_date ? String(t.due_date).split('T')[0] : today;
      // today's work, plus anything left over from before
      return dueDate === today || t.carried_over;
    }).sort((a, b) => {
      if (a.status === 'done' !== (b.status === 'done')) return a.status === 'done' ? 1 : -1;
      if (a.carried_over !== b.carried_over) return a.carried_over ? -1 : 1;
      return 0;
    });
  };

  const getTomorrowTodos = () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    return todos.filter(t => {
      const dueDate = t.due_date ? t.due_date.split('T')[0] : null;
      return dueDate === tomorrow;
    }).sort((a, b) => a.status === 'done' ? 1 : -1);
  };

  if (loading) return <div style={{ color: '#fff', padding: '20px' }}>Loading...</div>;

  const today = new Date().toISOString().split('T')[0];
  const todayTodos = getTodayTodos();
  const tomorrowTodos = getTomorrowTodos();
  
  const completedCount = todayTodos.filter(t => t.status === 'done').length;

  // how long today actually looks
  const parseEstimate = (e) => {
    if (!e) return 0;
    const str = String(e).toLowerCase();
    const num = parseFloat(str) || 0;
    if (str.includes('hour') || str.includes('hr')) return num * 60;
    if (str.includes('min')) return num;
    return 0;
  };
  const minutesLeft = todayTodos
    .filter(t => t.status !== 'done')
    .reduce((sum, t) => sum + parseEstimate(t.time_estimate), 0);
  const hoursLeft = Math.round((minutesLeft / 60) * 10) / 10;

  const lateItems = todayTodos.filter(t => t.carried_over && t.status !== 'done');
  const repeatOffenders = lateItems.filter(t => (t.days_late || 0) >= 3);
  const visibleToday = showAllLate ? todayTodos : todayTodos.filter(
    t => !t.carried_over || lateItems.slice(0, 5).includes(t)
  );
  const pagedToday = visibleToday.slice(0, shownToday);
  const pendingCount = todayTodos.filter(t => t.status === 'pending').length;

  

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#fff', margin: 0, fontSize: '32px', fontWeight: 'bold' }}>📝 Today & Tomorrow</h1>
      </div>

      {error && <div style={{ background: '#ef4444', color: '#fff', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>⚠️ {error}</div>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '30px' }}>
        <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '2px solid #ef4444' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{pendingCount}</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>Pending</div>
        </div>
        <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '2px solid #10b981' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{completedCount}</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>Done</div>
        </div>
        <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '2px solid #667eea' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>{pendingCount > 0 ? ((completedCount / (completedCount + pendingCount)) * 100).toFixed(0) : 0}%</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>Complete</div>
        </div>
      </div>

      {/* Add Todo Form */}
      <form onSubmit={addTodo} style={{ marginBottom: '30px', padding: '20px', background: '#2a2a2a', borderRadius: '12px', border: '2px solid #444' }}>
        <input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="What do you need to do?"
          style={{ width: '100%', padding: '14px', marginBottom: '12px', borderRadius: '8px', border: '2px solid #444', background: '#1a1a1a', color: '#fff', fontSize: '15px', fontWeight: '500' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
          <select value={newTodoPriority} onChange={(e) => setNewTodoPriority(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '2px solid #444', background: '#1a1a1a', color: '#fff', fontSize: '13px' }}>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>

          <select value={newTodoEnergy} onChange={(e) => setNewTodoEnergy(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '2px solid #444', background: '#1a1a1a', color: '#fff', fontSize: '13px' }}>
            <option value="high">⚡ High</option>
            <option value="medium">➖ Medium</option>
            <option value="low">🔋 Low</option>
          </select>

          <select value={newTodoEstimate} onChange={(e) => setNewTodoEstimate(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '2px solid #444', background: '#1a1a1a', color: '#fff', fontSize: '13px' }}>
            <option value="15 min">⏱️ 15 min</option>
            <option value="30 min">30 min</option>
            <option value="1 hour">1 hour</option>
            <option value="2+ hours">2+ hours</option>
          </select>

          <select value={newTodoDueDate} onChange={(e) => setNewTodoDueDate(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '2px solid #444', background: '#1a1a1a', color: '#fff', fontSize: '13px' }}>
            <option value="today">📅 Today</option>
            <option value="tomorrow">📅 Tomorrow</option>
          </select>
        </div>

        <button type="submit" style={{ width: '100%', padding: '12px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
          + Add Todo
        </button>
      </form>

      {/* TODAY Section */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#ef4444', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>🔴 TODAY ({todayTodos.length})</h2>
          {(hoursLeft > 0 || lateItems.length > 0) && (
            <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
                          padding: '12px', marginBottom: '12px', fontSize: '13px', lineHeight: 1.6 }}>
              {hoursLeft > 0 && (
                <div>About <strong>{hoursLeft}h</strong> of work left on today's list.</div>
              )}
              {repeatOffenders.length > 0 && (
                <div style={{ color: '#f87171', marginTop: '4px' }}>
                  {repeatOffenders.length === 1
                    ? `"${repeatOffenders[0].title}" has moved ${repeatOffenders[0].days_late} days. Is it really happening?`
                    : `${repeatOffenders.length} things have been sitting 3+ days.`}
                </div>
              )}
              {lateItems.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <button onClick={() => handleCarriedOver('today')} disabled={busyBulk}
                    style={{ padding: '8px 12px', minHeight: '40px', background: '#2a2a2a', color: '#fff',
                             border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    Do {lateItems.length} today
                  </button>
                  <button onClick={() => handleCarriedOver('tomorrow')} disabled={busyBulk}
                    style={{ padding: '8px 12px', minHeight: '40px', background: '#2a2a2a', color: '#fff',
                             border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    Push to tomorrow
                  </button>
                  <button onClick={() => handleCarriedOver('drop')} disabled={busyBulk}
                    style={{ padding: '8px 12px', minHeight: '40px', background: '#7f1d1d', color: '#fff',
                             border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                    Forget them
                  </button>
                  {lateItems.length > 5 && (
                    <button onClick={() => setShowAllLate(!showAllLate)}
                      style={{ padding: '8px 12px', minHeight: '40px', background: 'none', color: '#888',
                               border: '1px dashed #333', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                      {showAllLate ? 'Show fewer' : `Show all ${lateItems.length} late`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        {todayTodos.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>No todos for today! 🎉</p>
        ) : (
          pagedToday.map(todo => (
            <React.Fragment key={todo.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#2a2a2a', borderRadius: '8px', marginBottom: '10px', border: '2px solid #444', cursor: 'pointer' }} onClick={() => toggleTodo(todo.id, todo.status, todo)} onMouseOver={(e) => { e.currentTarget.style.background = '#3a3a3a'; e.currentTarget.style.borderColor = '#667eea'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#2a2a2a'; e.currentTarget.style.borderColor = '#444'; }}>
              <input type="checkbox" checked={todo.status === 'done'} onChange={() => {}} style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); toggleTodo(todo.id, todo.status, todo); }} />
              <div style={{ flex: 1 }}>
                <div style={{ textDecoration: todo.status === 'done' ? 'line-through' : 'none', color: todo.status === 'done' ? '#666' : '#fff', fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{todo.title}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {todo.carried_over && <span style={{ fontSize: '11px', background: '#ef444420', color: '#f87171', padding: '4px 8px', borderRadius: '4px', fontWeight: '700' }}>⚠️ from {String(todo.due_date).slice(5)}</span>}
                  {todo.from_tasks && <span style={{ fontSize: '11px', background: '#667eea20', color: '#667eea', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>📌 From Tasks</span>}
                  {todo.origin && todo.origin !== 'manual' && <span style={{ fontSize: '11px', background: todo.origin === 'from_ami' ? '#667eea20' : todo.origin === 'from_notes' ? '#10b98120' : '#f59e0b20', color: todo.origin === 'from_ami' ? '#667eea' : todo.origin === 'from_notes' ? '#10b981' : '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>📌 {todo.origin.replace('from_', '')}</span>}
                  {todo.venture_id && <span style={{ fontSize: '11px', background: '#10b98120', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>🏢 {getVentureName(todo.venture_id)}</span>}
                  {todo.project_id && <span style={{ fontSize: '11px', background: '#f59e0b20', color: '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>📁 Project</span>}
                  <span style={{ fontSize: '11px', background: getPriorityColor(todo.priority) + '20', color: getPriorityColor(todo.priority), padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>🔴 {todo.priority}</span>
                  <span style={{ fontSize: '11px', background: getEnergyColor(todo.energy_level) + '20', color: getEnergyColor(todo.energy_level), padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>⚡ {todo.energy_level}</span>
                  {todo.time_estimate && <span style={{ fontSize: '11px', background: '#444', color: '#aaa', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>⏱️ {todo.time_estimate}</span>}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); openTodoContext(todo); }}
                title="What is this?"
                style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer',
                         fontSize: '15px', padding: '6px 8px', minWidth: '34px' }}>
                {expandedTodo === todo.id ? '\u25B4' : '\u2139'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            {expandedTodo === todo.id && (
              <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px',
                            padding: '14px', marginTop: '-6px', marginBottom: '10px', fontSize: '13px',
                            lineHeight: 1.6, color: '#ccc' }}>
                {(() => {
                  const c = todoContext[todo.id];
                  if (!todo.id) return <div style={{ color: '#888' }}>This one lives on the task board - open it there for the detail.</div>;
                  if (!c) return <div style={{ color: '#888' }}>Looking it up...</div>;
                  const nothing = !c.notes && !c.note && !c.task && !c.venture;
                  if (nothing) return <div style={{ color: '#888' }}>Nothing else recorded - just the title.</div>;
                  return (
                    <>
                      {c.venture && (
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#888' }}>Venture: </span>{c.venture}
                        </div>
                      )}
                      {c.notes && (
                        <div style={{ marginBottom: '8px', whiteSpace: 'pre-wrap' }}>{c.notes}</div>
                      )}
                      {c.task && (
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ color: '#667eea', fontSize: '11px', fontWeight: 700,
                                        textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            On the task board
                          </div>
                          <div>{c.task.title}</div>
                          {c.task.description && (
                            <div style={{ color: '#aaa', marginTop: '2px' }}>{c.task.description}</div>
                          )}
                        </div>
                      )}
                      {c.note && (
                        <div style={{ borderLeft: '3px solid #10b981', paddingLeft: '10px' }}>
                          <div style={{ color: '#10b981', fontSize: '11px', fontWeight: 700,
                                        textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            From {c.note.type || 'a note'} - {String(c.note.created_at || '').slice(0, 10)}
                          </div>
                          <div style={{ fontWeight: 600, color: '#eee' }}>{c.note.title}</div>
                          <div style={{ color: '#aaa', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                            {c.note.excerpt}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            </React.Fragment>
          ))
        )}
      </div>

      {/* TOMORROW Section */}
      <div>
        <h2 style={{ color: '#667eea', fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>🔵 TOMORROW ({tomorrowTodos.length})</h2>
        {tomorrowTodos.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center', padding: '20px' }}>No todos for tomorrow!</p>
        ) : (
          tomorrowTodos.map(todo => (
            <div key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#2a2a2a', borderRadius: '8px', marginBottom: '10px', border: '2px solid #444', cursor: 'pointer', opacity: 0.8 }} onClick={() => toggleTodo(todo.id, todo.status, todo)} onMouseOver={(e) => { e.currentTarget.style.background = '#3a3a3a'; e.currentTarget.style.borderColor = '#667eea'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#2a2a2a'; e.currentTarget.style.borderColor = '#444'; }}>
              <input type="checkbox" checked={todo.status === 'done'} onChange={() => {}} style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); toggleTodo(todo.id, todo.status, todo); }} />
              <div style={{ flex: 1 }}>
                <div style={{ textDecoration: todo.status === 'done' ? 'line-through' : 'none', color: todo.status === 'done' ? '#666' : '#fff', fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{todo.title}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {todo.carried_over && <span style={{ fontSize: '11px', background: '#ef444420', color: '#f87171', padding: '4px 8px', borderRadius: '4px', fontWeight: '700' }}>⚠️ from {String(todo.due_date).slice(5)}</span>}
                  {todo.from_tasks && <span style={{ fontSize: '11px', background: '#667eea20', color: '#667eea', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>📌 From Tasks</span>}
                  {todo.origin && todo.origin !== 'manual' && <span style={{ fontSize: '11px', background: todo.origin === 'from_ami' ? '#667eea20' : todo.origin === 'from_notes' ? '#10b98120' : '#f59e0b20', color: todo.origin === 'from_ami' ? '#667eea' : todo.origin === 'from_notes' ? '#10b981' : '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>📌 {todo.origin.replace('from_', '')}</span>}
                  {todo.venture_id && <span style={{ fontSize: '11px', background: '#10b98120', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>🏢 {getVentureName(todo.venture_id)}</span>}
                  {todo.project_id && <span style={{ fontSize: '11px', background: '#f59e0b20', color: '#f59e0b', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>📁 Project</span>}
                  <span style={{ fontSize: '11px', background: getPriorityColor(todo.priority) + '20', color: getPriorityColor(todo.priority), padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>🔴 {todo.priority}</span>
                  <span style={{ fontSize: '11px', background: getEnergyColor(todo.energy_level) + '20', color: getEnergyColor(todo.energy_level), padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>⚡ {todo.energy_level}</span>
                  {todo.time_estimate && <span style={{ fontSize: '11px', background: '#444', color: '#aaa', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>⏱️ {todo.time_estimate}</span>}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TodoPage;
