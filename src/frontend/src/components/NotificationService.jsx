// Request notification permission once on app load
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Show browser notification
export const showNotification = (title, options = {}) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '🔔',
      badge: '🔔',
      ...options
    });
  }
};

// Check reminders and show notifications
export const checkReminderNotifications = async (reminders) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

  reminders.forEach(reminder => {
    // Check if reminder is due TODAY and time has passed
    if (reminder.due_date === today && reminder.due_time <= currentTime) {
      // Don't notify if already shown (use localStorage to track)
      const notifiedKey = `notified_${reminder.id}`;
      if (!localStorage.getItem(notifiedKey)) {
        showNotification(`🔔 ${reminder.title}`, {
          body: reminder.description || `Due at ${reminder.due_time}`,
          tag: `reminder_${reminder.id}`
        });
        localStorage.setItem(notifiedKey, 'true');
      }
    }
  });
};
