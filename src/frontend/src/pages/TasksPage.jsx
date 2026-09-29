import React, { useState, useEffect } from 'react';
import { getAllTasks, createTask, updateTask, deleteTask, getTasksStats } from '../utils/api';

function TasksPage({ amiImage }) {
  const [showMore_dateTasks, setShowMore_dateTasks] = useState(15);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, progress: 0 });
  const [viewType, setViewType] = useState('kanban');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await getAllTasks();
      setTasks(data.tasks || []);
      const statsData = await getTasksStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      await createTask({
        title: newTaskTitle,
        priority: newTaskPriority,
        status: 'pending'
      });
      setNewTaskTitle('');
      setNewTaskPriority('medium');
      loadTasks();
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };

  const handleMoveTask = async (taskId, newStatus) => {
    try {
      await updateTask(taskId, { status: newStatus });
      loadTasks();
    } catch (err) {
      console.error('Error moving task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(taskId);
      loadTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const getPendingTasks = () => tasks.filter(t => t.status === 'pending');
  const getInProgressTasks = () => tasks.filter(t => t.status === 'in-progress');
  const getCompletedTasks = () => tasks.filter(t => t.status === 'done');

  const tasksByDate = {};
  tasks.forEach(task => {
    const date = task.due_date || 'No Date';
    if (!tasksByDate[date]) tasksByDate[date] = [];
    tasksByDate[date].push(task);
  });

  if (loading) return <div style={{ padding: '20px', color: '#fff' }}>⏳ Loading...</div>;

  const TaskCard = ({ task }) => (
    <div style={{ background: '#3a3a3a', padding: '12px', borderRadius: '6px', border: '1px solid #444', marginBottom: '10px' }}>
      <p style={{ fontSize: '13px', margin: '0 0 8px 0', color: '#fff', fontWeight: '500' }}>{task.title}</p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', background: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#10b981', padding: '2px 6px', borderRadius: '3px', color: '#fff' }}>{task.priority}</span>
        {task.due_date && <span style={{ fontSize: '10px', background: '#555', padding: '2px 6px', borderRadius: '3px', color: '#ccc' }}>{task.due_date}</span>}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {task.status !== 'pending' && <button onClick={() => handleMoveTask(task.id, 'pending')} style={{ fontSize: '10px', padding: '4px 8px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '3px', cursor: 'pointer' }}>← Pending</button>}
        {task.status !== 'in-progress' && <button onClick={() => handleMoveTask(task.id, 'in-progress')} style={{ fontSize: '10px', padding: '4px 8px', background: '#f59e0b', border: 'none', color: '#fff', borderRadius: '3px', cursor: 'pointer' }}>→ Progress</button>}
        {task.status !== 'done' && <button onClick={() => handleMoveTask(task.id, 'done')} style={{ fontSize: '10px', padding: '4px 8px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '3px', cursor: 'pointer' }}>✓ Done</button>}
        <button onClick={() => handleDeleteTask(task.id)} style={{ fontSize: '10px', padding: '4px 8px', background: '#555', border: 'none', color: '#fff', borderRadius: '3px', cursor: 'pointer' }}>🗑️</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a1a', color: '#fff', paddingBottom: '100px' }}>
      {/* HEADER */}
      <div style={{ padding: '20px', borderBottom: '1px solid #444', background: '#2a2a2a' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', margin: 0 }}>📋 Tasks</h1>
          <select value={viewType} onChange={(e) => setViewType(e.target.value)} style={{ padding: '10px 14px', background: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>
            <option value="kanban">🎯 Kanban</option>
            <option value="list">📝 List</option>
            <option value="calendar">📅 Calendar</option>
          </select>
        </div>

        {/* ADD TASK */}
        <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px' }}>
          <input type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Add new task..." style={{ flex: 1, padding: '10px 12px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '6px', color: '#fff', fontSize: '13px' }} />
          <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} style={{ padding: '10px 12px', background: '#1a1a1a', border: '1px solid #444', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px' }}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button type="submit" style={{ padding: '10px 16px', background: '#10b981', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>➕</button>
        </form>
      </div>

      {/* STATS */}
      <div style={{ padding: '16px 20px', background: '#2a2a2a', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', borderBottom: '1px solid #444' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>Total</p>
          <p style={{ fontSize: '16px', fontWeight: '600', margin: '4px 0 0 0' }}>{stats.total}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>Pending</p>
          <p style={{ fontSize: '16px', fontWeight: '600', margin: '4px 0 0 0' }}>{stats.pending}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>Done</p>
          <p style={{ fontSize: '16px', fontWeight: '600', margin: '4px 0 0 0' }}>{stats.completed}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>Progress</p>
          <p style={{ fontSize: '16px', fontWeight: '600', margin: '4px 0 0 0' }}>{Math.round(stats.progress)}%</p>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewType === 'kanban' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', padding: '20px' }}>
          <div style={{ background: '#2a2a2a', borderRadius: '8px', padding: '16px', border: '2px solid #ef4444' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', margin: '0 0 12px 0' }}>📋 Pending ({getPendingTasks().length})</h3>
            {getPendingTasks().map(task => <TaskCard key={task.id} task={task} />)}
          </div>

          <div style={{ background: '#2a2a3a', borderRadius: '8px', padding: '16px', border: '2px solid #f59e0b' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', margin: '0 0 12px 0' }}>🔄 In Progress ({getInProgressTasks().length})</h3>
            {getInProgressTasks().map(task => <TaskCard key={task.id} task={task} />)}
          </div>

          <div style={{ background: '#2a3a2a', borderRadius: '8px', padding: '16px', border: '2px solid #10b981' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '600', color: '#fff', margin: '0 0 12px 0' }}>✅ Completed ({getCompletedTasks().length})</h3>
            {getCompletedTasks().map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewType === 'list' && (
        <div style={{ padding: '20px', maxWidth: '800px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#999', marginBottom: '12px' }}>PENDING</h2>
          {getPendingTasks().map(task => <TaskCard key={task.id} task={task} />)}

          <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#999', marginTop: '20px', marginBottom: '12px' }}>IN PROGRESS</h2>
          {getInProgressTasks().map(task => <TaskCard key={task.id} task={task} />)}

          <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#999', marginTop: '20px', marginBottom: '12px' }}>COMPLETED</h2>
          {getCompletedTasks().map(task => <TaskCard key={task.id} task={task} />)}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {viewType === 'calendar' && (
        <div style={{ padding: '20px' }}>
          {Object.entries(tasksByDate).map(([date, dateTasks]) => (
            <div key={date} style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: '600', color: '#999', marginBottom: '8px' }}>📅 {date}</h3>
              {dateTasks.slice(0, showMore_dateTasks).map(task => <TaskCard key={task.id} task={task} />)}
          {dateTasks.length > showMore_dateTasks && (
            <button onClick={() => setShowMore_dateTasks(showMore_dateTasks + 15)}
                    style={{ width: '100%', padding: '12px', minHeight: '44px', marginTop: '8px',
                             background: '#2a2a2a', color: '#aaa', border: 'none',
                             borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>
              Show more ({dateTasks.length - showMore_dateTasks} more)
            </button>
          )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TasksPage;
