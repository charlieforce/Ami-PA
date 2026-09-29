import React, { useState, useEffect } from 'react';
import { getEveningReminder, checkReminderTime, deferTodosToTomorrow } from '../utils/api';
import '../styles/EveningReminder.css';

function EveningReminder({ amiImage, onTodosDeferred }) {
  const [showReminder, setShowReminder] = useState(false);
  const [uncompletedTodos, setUncompletedTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reminderChecked, setReminderChecked] = useState(false);

  useEffect(() => {
    let interval = null;

    const start = () => {
      if (interval) return;
      // every 5 minutes is plenty for a once-a-day 9pm check
      interval = setInterval(checkAndShowReminder, 300000);
    };
    const stop = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAndShowReminder();
        start();
      } else {
        stop();
      }
    };

    checkAndShowReminder();
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const checkAndShowReminder = async () => {
    try {
      // Only check if we haven't already shown reminder today
      if (reminderChecked) return;

      const timeCheck = await checkReminderTime();
      
      if (timeCheck.is_evening_time) {
        const reminderData = await getEveningReminder();
        
        if (reminderData.has_uncompleted && reminderData.count > 0) {
          setUncompletedTodos(reminderData.todos);
          setShowReminder(true);
          setReminderChecked(true);
        }
      }
    } catch (err) {
      console.error('Error checking reminder:', err);
    }
  };

  const handleDeferToTomorrow = async () => {
    setLoading(true);
    try {
      await deferTodosToTomorrow();
      setShowReminder(false);
      if (onTodosDeferred) {
        onTodosDeferred();
      }
    } catch (err) {
      console.error('Error deferring todos:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!showReminder) return null;

  return (
    <div className="evening-reminder-overlay">
      <div className="evening-reminder-modal">
        <div className="reminder-header">
          {amiImage && (
            <>
              <img src={amiImage} alt="Ami" className="reminder-ami" />
              <div className="ami-label">Angry Ami</div>
            </>
          )}
          <h2>🌙 EVENING CHECK-IN</h2>
        </div>

        <div className="reminder-message">
          <p>Yo Charlie! It's 10 PM. You still got <strong>{uncompletedTodos.length}</strong> TODOs left today!</p>
          <p>Let's see what's left...</p>
        </div>

        <div className="uncompleted-list">
          <div className="uncompleted-header">
            <h3>📋 UNCOMPLETED:</h3>
          </div>
          {uncompletedTodos.map((todo, idx) => (
            <div key={idx} className="uncompleted-item">
              <span className="uncompleted-icon">☐</span>
              <span className="uncompleted-text">{todo.title}</span>
            </div>
          ))}
        </div>

        <div className="reminder-actions">
          <div className="ami-suggestion">
            <p>💡 Quick decision: Can you finish these tonight? Or push to tomorrow?</p>
          </div>

          <div className="action-buttons">
            <button 
              className="btn-defer"
              onClick={handleDeferToTomorrow}
              disabled={loading}
            >
              {loading ? '⏳ Deferring...' : '📦 Push to Tomorrow'}
            </button>
            <button 
              className="btn-dismiss"
              onClick={() => setShowReminder(false)}
              disabled={loading}
            >
              ✓ I'll finish them
            </button>
          </div>
        </div>

        <div className="reminder-footer">
          <p>Get some rest soon, yeah? You're crushing it! 💪🔥</p>
        </div>
      </div>
    </div>
  );
}

export default EveningReminder;
