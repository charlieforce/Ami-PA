import React, { useState, useEffect } from 'react';
import { getAllTasks, getTodayTodos } from '../utils/api';
import '../styles/DashboardTiles.css';

export default function DashboardTiles() {
  const [reminderCount, setReminderCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [todoCount, setTodoCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const t = await getAllTasks();
      const pending_tasks = t.tasks.filter(x => x.status === 'pending').length;
      setTaskCount(pending_tasks);
      
      const td = await getTodayTodos();
      setTodoCount(td.total || 0);
      setReminderCount(Math.ceil(td.total / 2));
    } catch (e) {
      console.error('Error:', e);
    }
  };

  return (
    <div className='dashboard-tiles'>
      <div className='tile'>
        <div className='tile-icon'>🔔</div>
        <div className='tile-content'>
          <h3>TODAY</h3>
          <p className='tile-number'>{reminderCount}</p>
          <p className='tile-label'>Reminders</p>
        </div>
      </div>

      <div className='tile'>
        <div className='tile-icon'>📋</div>
        <div className='tile-content'>
          <h3>TASKS</h3>
          <p className='tile-number'>{taskCount}</p>
          <p className='tile-label'>Pending</p>
        </div>
      </div>

      <div className='tile'>
        <div className='tile-icon'>✅</div>
        <div className='tile-content'>
          <h3>TODO</h3>
          <p className='tile-number'>{todoCount}</p>
          <p className='tile-label'>Items</p>
        </div>
      </div>
    </div>
  );
}