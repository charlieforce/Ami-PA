import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const SOURCE_BADGE = {
  from_ami: { label: '💬 Ami', bg: '#8b5cf620', fg: '#a78bfa' },
  from_notes: { label: '📝 Note', bg: '#06b6d420', fg: '#22d3ee' },
  from_birthdays: { label: '🎂 Birthday', bg: '#ec489920', fg: '#f472b6' },
  manual: { label: '✍️ You', bg: '#44444460', fg: '#999' }
};

const sourceChip = (src) => {
  const b = SOURCE_BADGE[src] || SOURCE_BADGE.manual;
  return (
    <span style={{ fontSize: '11px', background: b.bg, color: b.fg,
                   padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
      {b.label}
    </span>
  );
};

const AmiTaskView = () => {
  const [showMore_filteredTasks, setShowMore_filteredTasks] = useState(15);
  const [taskAnalysis, setTaskAnalysis] = useState(null);
  const [todoAnalysis, setTodoAnalysis] = useState(null);
  const [reminderAnalysis, setReminderAnalysis] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [todos, setTodos] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expandedSection, setExpandedSection] = useState(null);
  const [filterVenture, setFilterVenture] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAllAnalysis = async () => {
    try {
      const headers = { 'X-Ami-Password': AMI_PASSWORD };
      
      // Fetch analysis
      const [tasksAna, todosAna, remindersAna] = await Promise.all([
        fetch(API + '/api/tasks/analysis', { headers }).then(r => r.json()),
        fetch(API + '/api/todos/analysis', { headers }).then(r => r.json()),
        fetch(API + '/api/reminders/analysis', { headers }).then(r => r.json())
      ]);
      
      // Fetch detailed data
      const [todosList, tasksList, calendarData] = await Promise.all([
        fetch(API + '/api/todos', { headers }).then(r => r.json()).then(d => d.todos || []),
        fetch(API + '/api/tasks', { headers }).then(r => r.json()).then(d => d.tasks || []),
        fetch(API + '/api/calendar', { headers }).then(r => r.json()).then(d => d.events || [])
      ]);
      
      setTaskAnalysis(tasksAna);
      setTodoAnalysis(todosAna);
      setReminderAnalysis(remindersAna);
      setTodos(todosList);
      setTasks(tasksList);
      // Filter calendar events for next 14 days
      const today = new Date();
      const twoWeeksLater = new Date(today.getTime() + 14*24*60*60*1000);
      const upcomingNotes = calendarData.filter(event => {
        const eventDate = new Date(event.start);
        return eventDate >= today && eventDate <= twoWeeksLater;
      });
      console.log('📅 Calendar data received:', calendarData);
      console.log('📅 Upcoming events:', upcomingNotes);
      setCalendar(upcomingNotes);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching analysis:', e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalysis();
  }, []);

  const getOriginTag = (origin) => {
    const tags = {
      task: { icon: '🔗', label: 'Task', color: '#667eea' },
      calendar: { icon: '📅', label: 'Calendar', color: '#10b981' },
      manual: { icon: '✍️', label: 'Manual', color: '#f59e0b' },
      chat: { icon: '💬', label: 'Chat', color: '#ec4899' }
    };
    return tags[origin] || tags.manual;
  };

  const getVentureName = (ventureId) => {
    const ventures = { 1: 'GII', 2: 'TechieVet', 3: 'FundiConnect', 4: 'Promoga', 5: 'Personal', 6: 'GII Connect', 7: 'Salone E-Commerce' };
    return ventures[ventureId] || 'Unknown';
  };

  const getPriorityColor = (priority) => {
    const colors = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
    return colors[priority] || '#f59e0b';
  };

  const getEnergyColor = (energy) => {
    const colors = { high: '#10b981', medium: '#667eea', low: '#ef4444' };
    return colors[energy] || '#667eea';
  };

  const filteredTasks = filterVenture ? tasks.filter(t => t.venture_id === filterVenture) : tasks;

  if (loading) return <div style={{ color: '#fff', padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#fff', marginBottom: '30px', fontSize: '28px', fontWeight: 'bold' }}>😠 Ami's Dashboard</h1>

      {/* TODOS SECTION - MAIN */}
      {todoAnalysis && (
        <div style={{ marginBottom: '20px' }}>
          <div 
            onClick={() => setExpandedSection(expandedSection === 'todos' ? null : 'todos')}
            style={{ 
              background: '#2a3d2a', 
              border: '2px solid #10b981', 
              borderRadius: '12px', 
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: expandedSection === 'todos' ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981', margin: '0 0 16px 0' }}>
              ✅ TODOS (Today & Tomorrow) {expandedSection === 'todos' ? '▼' : '▶'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: '#1a2a1a', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{todoAnalysis.total_todos}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Total</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#1a2a1a', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>{todoAnalysis.status_breakdown?.pending}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Pending</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#1a2a1a', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{todoAnalysis.status_breakdown?.done}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Done</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#1a2a1a', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{todoAnalysis.completion_rate.toFixed(1)}%</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Complete</div>
              </div>
            </div>
          </div>

          {/* EXPANDED TODOS LIST */}
          {expandedSection === 'todos' && (
            <div style={{ background: '#1a2a1a', border: '2px solid #10b981', borderRadius: '0 0 12px 12px', padding: '20px', marginTop: '-2px', borderTop: 'none' }}>
              {todos.map(todo => (
                <div key={todo.id} style={{ 
                  padding: '14px', 
                  background: '#2a2a2a', 
                  borderRadius: '8px', 
                  marginBottom: '10px',
                  borderLeft: `4px solid ${getPriorityColor(todo.priority)}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        textDecoration: todo.status === 'done' ? 'line-through' : 'none',
                        color: todo.status === 'done' ? '#666' : '#fff',
                        fontSize: '15px',
                        fontWeight: '600',
                        marginBottom: '8px'
                      }}>
                        {todo.title}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {(() => {
                          const origin = getOriginTag(todo.origin);
                          return <span style={{ fontSize: '11px', background: origin.color + '20', color: origin.color, padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>{origin.icon} {origin.label}</span>;
                        })()}
                        <span style={{ fontSize: '11px', background: getPriorityColor(todo.priority) + '20', color: getPriorityColor(todo.priority), padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>🔴 {todo.priority}</span>
                        <span style={{ fontSize: '11px', background: getEnergyColor(todo.energy_level) + '20', color: getEnergyColor(todo.energy_level), padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>⚡ {todo.energy_level}</span>
                        {todo.time_estimate && <span style={{ fontSize: '11px', background: '#444', color: '#aaa', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>⏱️ {todo.time_estimate}</span>}
                        <span style={{ fontSize: '11px', background: todo.status === 'done' ? '#10b98120' : '#ef444420', color: todo.status === 'done' ? '#10b981' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                          {todo.status === 'done' ? '✅ Done' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TASKS SECTION */}
      {taskAnalysis && (
        <div style={{ marginBottom: '20px' }}>
          <div 
            onClick={() => setExpandedSection(expandedSection === 'tasks' ? null : 'tasks')}
            style={{ 
              background: '#2a2a2a', 
              border: '2px solid #667eea', 
              borderRadius: '12px', 
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: expandedSection === 'tasks' ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#667eea', margin: '0 0 16px 0' }}>
              📋 TASKS {expandedSection === 'tasks' ? '▼' : '▶'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: '#1a1a1a', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea' }}>{taskAnalysis.total_tasks}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Total</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#1a1a1a', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>{taskAnalysis.status_breakdown?.pending}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Pending</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#1a1a1a', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{taskAnalysis.status_breakdown?.done}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Done</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#1a1a1a', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea' }}>{taskAnalysis.completion_rate.toFixed(1)}%</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Complete</div>
              </div>
            </div>
          </div>

          {/* EXPANDED TASKS LIST */}
          {expandedSection === 'tasks' && (
            <div style={{ background: '#1a1a1a', border: '2px solid #667eea', borderRadius: '0 0 12px 12px', padding: '20px', marginTop: '-2px', borderTop: 'none' }}>
              {filteredTasks.slice(0, showMore_filteredTasks).map(task => (
                <div key={task.id} style={{ 
                  padding: '14px', 
                  background: '#2a2a2a', 
                  borderRadius: '8px', 
                  marginBottom: '10px',
                  borderLeft: `4px solid ${getPriorityColor(task.priority)}`
                }}>
                  <div style={{ 
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    color: task.status === 'done' ? '#666' : '#fff',
                    fontSize: '15px',
                    fontWeight: '600',
                    marginBottom: '8px'
                  }}>
                    {task.title}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', background: getPriorityColor(task.priority) + '20', color: getPriorityColor(task.priority), padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>🔴 {task.priority}</span>
                    {task.due_date && <span style={{ fontSize: '11px', background: '#444', color: '#aaa', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>📅 {task.due_date}</span>}
                    <span style={{ fontSize: '11px', background: task.status === 'done' ? '#10b98120' : '#ef444420', color: task.status === 'done' ? '#10b981' : '#ef4444', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>
                      {task.status === 'done' ? '✅ Done' : '⏳ Pending'}
                    </span>
                    {sourceChip(task.source)}
                  </div>
                </div>
              ))}
          {filteredTasks.length > showMore_filteredTasks && (
            <button onClick={() => setShowMore_filteredTasks(showMore_filteredTasks + 15)}
                    style={{ width: '100%', padding: '12px', minHeight: '44px', marginTop: '8px',
                             background: '#2a2a2a', color: '#aaa', border: 'none',
                             borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
              Show more ({filteredTasks.length - showMore_filteredTasks} more)
            </button>
          )}
          {showMore_filteredTasks > 15 && (
            <button onClick={() => setShowMore_filteredTasks(15)}
                    style={{ width: '100%', padding: '9px', marginTop: '6px',
                             background: 'transparent', color: '#6b6b7c',
                             border: '1px solid #2c2c3a', borderRadius: '8px',
                             fontSize: '12px', cursor: 'pointer' }}>
              Show less
            </button>
          )}
            </div>
          )}
        </div>
      )}

      {/* REMINDERS SECTION */}
      {reminderAnalysis && (
        <div style={{ marginBottom: '20px' }}>
          <div 
            onClick={() => setExpandedSection(expandedSection === 'reminders' ? null : 'reminders')}
            style={{ 
              background: '#3d3a2a', 
              border: '2px solid #f59e0b', 
              borderRadius: '12px', 
              padding: '20px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: expandedSection === 'reminders' ? 'scale(1.02)' : 'scale(1)'
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b', margin: '0 0 16px 0' }}>
              🔔 REMINDERS {expandedSection === 'reminders' ? '▼' : '▶'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '12px', background: '#2a2820', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{reminderAnalysis.total_reminders}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Total</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#2a2820', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{reminderAnalysis.status_breakdown?.pending}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Pending</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#2a2820', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>{reminderAnalysis.status_breakdown?.completed}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Completed</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px', background: '#2a2820', borderRadius: '8px' }}>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#f59e0b' }}>{reminderAnalysis.completion_rate.toFixed(1)}%</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>Complete</div>
              </div>
            </div>
            {expandedSection === 'reminders' && reminderAnalysis?.reminders && reminderAnalysis.reminders.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #444' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b', margin: '0 0 12px 0' }}>📌 Top Reminders</h3>
                {reminderAnalysis.reminders.map(reminder => (
                  <div key={reminder.id} style={{ 
                    background: '#2a2820', 
                    padding: '12px', 
                    marginBottom: '8px', 
                    borderRadius: '8px', 
                    border: '1px solid #444',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = '#3a3820'} onMouseLeave={(e) => e.currentTarget.style.background = '#2a2820'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{reminder.title}</div>
                        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '8px' }}>📅 {reminder.due_date} at {reminder.due_time}</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          {sourceChip(reminder.source)}
                          {reminder.from_tasks && <span style={{ fontSize: '10px', background: '#667eea20', color: '#667eea', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>📌 From Tasks</span>}
                          {reminder.venture_id && <span style={{ fontSize: '10px', background: '#10b98120', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>🏢 {getVentureName(reminder.venture_id)}</span>}
                          {reminder.project_id && <span style={{ fontSize: '10px', background: '#f59e0b20', color: '#f59e0b', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>📁 Project</span>}
                          <span style={{ fontSize: '10px', background: reminder.priority === 'high' ? '#ef444420' : reminder.priority === 'medium' ? '#f59e0b20' : '#10b98120', color: reminder.priority === 'high' ? '#ef4444' : reminder.priority === 'medium' ? '#f59e0b' : '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                            {reminder.priority === 'high' ? '🔴 High' : reminder.priority === 'medium' ? '🟡 Medium' : '🟢 Low'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* TRAVELS + WORLD CLOCKS SECTION */}
      <div style={{ marginBottom: '20px' }}>
        <div 
          onClick={() => setExpandedSection(expandedSection === 'travels' ? null : 'travels')}
          style={{ 
            background: '#2a3a3a', 
            border: '2px solid #667eea', 
            borderRadius: '12px', 
            padding: '20px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#667eea', marginBottom: '8px' }}>✈️ Travels & World Clocks</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#aaa' }}>Current time across the world</p>
          </div>
          <span style={{ fontSize: '14px', color: '#667eea' }}>{expandedSection === 'travels' ? '▼' : '▶'}</span>
        </div>

        {expandedSection === 'travels' && (
          <div style={{ background: '#1a1a1a', padding: '20px', marginTop: '12px', borderRadius: '8px', border: '1px solid #404040' }}>
            <TravelsList />
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #404040' }}>
              <h3 style={{ color: '#fff', marginTop: 0, marginBottom: '16px' }}>🌍 World Clocks</h3>
              <WorldClocks />
            </div>
          </div>
        )}
      </div>

      {/* CALENDAR SECTION - NEXT 14 DAYS */}
      {calendar && calendar.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div 
            onClick={() => setExpandedSection(expandedSection === 'calendar' ? null : 'calendar')}
            style={{ 
              background: '#2a3a2a', 
              border: '2px solid #10b981', 
              borderRadius: '12px', 
              padding: '20px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>📅 Calendar - Next 14 Days</h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#aaa' }}>{calendar.length} events scheduled</p>
            </div>
            <span style={{ fontSize: '20px' }}>{expandedSection === 'calendar' ? '▼' : '▶'}</span>
          </div>
          {expandedSection === 'calendar' && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #444' }}>
              {calendar.map(event => (
                <div key={event.id} style={{ 
                  background: '#2a2820', 
                  padding: '12px', 
                  marginBottom: '8px', 
                  borderRadius: '8px', 
                  border: '1px solid #444'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '4px' }}>{event.title}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>📅 {new Date(event.start).toLocaleDateString()} {new Date(event.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  {event.location && <div style={{ fontSize: '12px', color: '#10b981' }}>📍 {event.location}</div>}
                  {event.description && <div style={{ fontSize: '12px', color: '#ccc', marginTop: '4px', maxHeight: '60px', overflow: 'hidden' }}>{event.description}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AMI'S FEEDBACK */}
      <div style={{ background: '#2a3a3d', border: '2px solid #3b82f6', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#3b82f6', margin: '0 0 12px 0' }}>💡 Ami's Feedback</h3>
        <p style={{ fontSize: '14px', color: '#ffffff', margin: 0, lineHeight: '1.6' }}>
          You're crushing it! 💪 
          {taskAnalysis?.total_tasks} tasks ({taskAnalysis?.completion_rate.toFixed(0)}% done), 
          {todoAnalysis?.total_todos} todos for today/tomorrow ({todoAnalysis?.completion_rate.toFixed(0)}% progress), 
          and {reminderAnalysis?.total_reminders} reminders. 
          Focus on the 🔴 HIGH priority items first! Keep that momentum going! 🚀
        </p>
      </div>
    </div>
  );
};



// Travels List Component
function TravelsList() {
  const [schedule, setSchedule] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const res = await fetch(API + '/api/timezone/schedule', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setSchedule(json.schedule || []);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ color: '#aaa' }}>Loading travels...</div>;

  const today = new Date().toISOString().slice(0, 10);
  const ahead = schedule.filter(e => String(e.travel_date || '').slice(0, 10) >= today);
  const been = schedule.filter(e => String(e.travel_date || '').slice(0, 10) < today)
                       .sort((a, b) => String(b.travel_date).localeCompare(String(a.travel_date)));

  const Row = (entry, past) => (
    <div key={entry.id} style={{ background: past ? '#232323' : '#2a2a2a', padding: '12px',
                                 borderRadius: '8px', opacity: past ? 0.65 : 1 }}>
      <div style={{ fontSize: '13px', fontWeight: '700', color: past ? '#bbb' : '#fff' }}>
        {past ? '\u2713' : '\uD83D\uDCC5'} {entry.travel_date}
      </div>
      <div style={{ fontSize: '12px', color: past ? '#888' : '#667eea', marginTop: '4px' }}>
        \uD83C\uDF0D {entry.timezone}
      </div>
      {entry.location && (
        <div style={{ fontSize: '11px', color: past ? '#777' : '#10b981', marginTop: '2px' }}>
          {entry.location}
        </div>
      )}
      {entry.notes && (
        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>{entry.notes}</div>
      )}
    </div>
  );

  return (
    <div>
      <h3 style={{ color: '#fff', marginTop: 0 }}>📅 Still to come</h3>
      {ahead.length === 0 ? (
        <div style={{ color: '#999', fontSize: '13px', padding: '10px 0' }}>
          Nothing booked after this.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ahead.map(e => Row(e, false))}
        </div>
      )}

      {been.length > 0 && (
        <>
          <h3 style={{ color: '#888', marginTop: '18px', fontSize: '14px' }}>
            Where you have been ({been.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {been.slice(0, 6).map(e => Row(e, true))}
          </div>
        </>
      )}
    </div>
  );
}

function _TravelsListOld() {
  const schedule = [];
  return (
    <div>
      <h3 style={{ color: '#fff', marginTop: 0 }}>📅 Upcoming Travels</h3>
      {schedule.length === 0 ? (
        <div style={{ color: '#999', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No travels scheduled. Add one in Admin Portal → Travels!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {schedule.map(entry => (
            <div key={entry.id} style={{ background: '#2a2a2a', padding: '12px', borderRadius: '6px', border: '1px solid #404040' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>📅 {entry.travel_date}</div>
              <div style={{ fontSize: '12px', color: '#667eea', marginTop: '4px' }}>🌍 {entry.timezone}</div>
              {entry.location && <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>📍 {entry.location}</div>}
              {entry.notes && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>💬 {entry.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// World Clocks Component
function WorldClocks() {
  const cities = [
    { name: 'Nairobi', tz: 'Africa/Nairobi', emoji: '🇰🇪' },
    { name: 'Freetown', tz: 'Africa/Freetown', emoji: '🇸🇱' },
    { name: 'London', tz: 'Europe/London', emoji: '🇬🇧' },
    { name: 'New York', tz: 'America/New_York', emoji: '🗽' },
    { name: 'Denver', tz: 'America/Denver', emoji: '🏔️' },
    { name: 'Seattle', tz: 'America/Los_Angeles', emoji: '☔' },
    { name: 'Cancun', tz: 'America/Mexico_City', emoji: '🌴' },
    { name: 'Tokyo', tz: 'Asia/Tokyo', emoji: '🇯🇵' }
  ];

  const [times, setTimes] = React.useState({});
  const [currentTz, setCurrentTz] = React.useState('Africa/Nairobi');
  const [weather, setWeather] = React.useState({});

  React.useEffect(() => {
    loadCurrentTz();
    
    const updateTimes = () => {
      const newTimes = {};
      cities.forEach(city => {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: city.tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        const time = formatter.format(now);
        newTimes[city.tz] = time;
      });
      setTimes(newTimes);
    };
    
    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const loadWeather = async () => {
      try {
        const res = await fetch(API + '/api/weather/world', {
          headers: { 'X-Ami-Password': AMI_PASSWORD }
        });
        const json = await res.json();
        const map = {};
        (json.weather || []).forEach(w => { map[w.city] = w; });
        setWeather(map);
      } catch (e) {
        console.error('Weather error:', e);
      }
    };
    loadWeather();
    const wi = setInterval(loadWeather, 1200000);
    return () => clearInterval(wi);
  }, []);

  const WICON = {
    sunny: '\u2600\uFE0F', cloudy: '\u2601\uFE0F', rain: '\uD83C\uDF27\uFE0F',
    drizzle: '\uD83C\uDF26\uFE0F', storm: '\u26C8\uFE0F', snow: '\uD83C\uDF28\uFE0F',
    mist: '\uD83C\uDF2B\uFE0F'
  };

  const loadCurrentTz = async () => {
    try {
      const res = await fetch(API + '/api/timezone', { headers: { 'X-Ami-Password': AMI_PASSWORD } });
      const json = await res.json();
      setCurrentTz(json.timezone || 'Africa/Nairobi');
    } catch (e) {
      console.error('Error:', e);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
      {cities.map(city => (
        <div key={city.tz} style={{ background: currentTz === city.tz ? '#10b98130' : '#2a2a2a', padding: '12px', borderRadius: '8px', border: currentTz === city.tz ? '2px solid #10b981' : '1px solid #404040', textAlign: 'center', boxShadow: currentTz === city.tz ? '0 0 12px #10b98140' : 'none' }}>
          <div style={{ fontSize: '24px', marginBottom: '4px' }}>{city.emoji}</div>
          <div style={{ fontSize: '11px', color: currentTz === city.tz ? '#10b981' : '#aaa', marginBottom: '6px', fontWeight: currentTz === city.tz ? '700' : '600' }}>{city.name} {currentTz === city.tz && '✓'}</div>
          <div style={{ fontSize: '14px', color: currentTz === city.tz ? '#10b981' : '#667eea', fontWeight: 'bold', fontFamily: 'monospace' }}>{times[city.tz] || '--:--:--'}</div>
          {weather[city.name] && weather[city.name].temp !== null && (
            <div style={{ fontSize: '12px', color: '#aaa', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #ffffff15' }}>
              <span style={{ fontSize: '14px' }}>{WICON[weather[city.name].icon] || '\u2601\uFE0F'}</span>
              <span style={{ marginLeft: '4px', fontWeight: '600', color: '#ddd' }}>{weather[city.name].temp}°C</span>
              <div style={{ fontSize: '11px', color: '#ccc', marginTop: '3px', textTransform: 'capitalize', fontWeight: '600' }}>
                {weather[city.name].conditions}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default AmiTaskView;
