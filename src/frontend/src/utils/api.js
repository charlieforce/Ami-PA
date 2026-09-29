import axios from 'axios';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';

const API_URL = import.meta.env.VITE_API_URL || API + '';
const API_PASSWORD = import.meta.env.VITE_API_PASSWORD || AMI_PASSWORD;

let storedPassword = null;

// Set password after login
export const setPassword = (pwd) => {
  storedPassword = pwd;
  localStorage.setItem('ami_password', pwd);
};

// Get password from storage
export const getPassword = () => {
  return storedPassword || localStorage.getItem('ami_password');
};

// Verify password
export const verifyPassword = async (password) => {
  try {
    const response = await axios.post(`${API_URL}/api/auth/verify`, 
      { password },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    return response.data;
  } catch (error) {
    return { authenticated: false, error: error.message };
  }
};

// Chat with Ami
export const chatWithAmi = async (message) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/chat`,
      {
        message: message,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      {
        headers: {
          'X-Ami-Password': password,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get morning briefing (from DB via scheduler)
export const getMorningBriefing = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/briefing/today`,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    return { found: false, items: [] };
  }
};

// Get all tasks
export const getTasks = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/tasks`,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    return [];
  }
};

// Get Ami identity
export const getAmiIdentity = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/ami/identity`);
    return response.data;
  } catch (error) {
    return {};
  }
};

// Get today's TODOs
export const getTodayTodos = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/todos/today`,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    return { todos: [], completed: 0, total: 0, progress: 0 };
  }
};

// Create new TODO
export const createTodo = async (title) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/todos`,
      { title },
      {
        headers: {
          'X-Ami-Password': password,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update TODO status
export const updateTodo = async (todoId, status) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.put(`${API_URL}/api/todos/${todoId}`,
      { status },
      {
        headers: {
          'X-Ami-Password': password,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete TODO
export const deleteTodo = async (todoId) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.delete(`${API_URL}/api/todos/${todoId}`,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Parse voice command
export const parseVoiceCommand = async (text) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/commands/parse`,
      { text },
      {
        headers: {
          'X-Ami-Password': password,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get shopping lists
export const getShoppingLists = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/shopping/lists`,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    return { shopping_lists: [], total: 0 };
  }
};

// Create shopping list
export const createShoppingList = async (name) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/shopping/lists`,
      { name },
      {
        headers: {
          'X-Ami-Password': password,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Add item to shopping list
export const addShoppingItem = async (listId, title) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/shopping/lists/${listId}/items`,
      { title },
      {
        headers: {
          'X-Ami-Password': password,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Toggle shopping item
export const toggleShoppingItem = async (itemId, isChecked) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.put(`${API_URL}/api/shopping/items/${itemId}`,
      { is_checked: isChecked },
      {
        headers: {
          'X-Ami-Password': password,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Carry shopping list to tomorrow
export const carryShoppingList = async (listId) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.put(`${API_URL}/api/shopping/lists/${listId}/carry`,
      {},
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete shopping list
export const deleteShoppingList = async (listId) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.delete(`${API_URL}/api/shopping/lists/${listId}`,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get evening reminder TODOs
export const getEveningReminder = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/reminders/evening`,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Check if it's 10 PM
export const checkReminderTime = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/reminders/check-time`,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Defer all pending TODOs to tomorrow
export const deferTodosToTomorrow = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/reminders/defer-to-tomorrow`,
      {},
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get all reminders
export const getAllReminders = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/reminders/all`,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    return { reminders: { birthdays: [], calendar_events: [], personal_reminders: [], task_reminders: [] } };
  }
};

// Create reminder
export const createReminder = async (reminderData) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/reminders/create`,
      reminderData,
      {
        headers: {
          'X-Ami-Password': password,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get upcoming reminders
export const getUpcomingReminders = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/reminders/upcoming`,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    return { reminders: [], count: 0 };
  }
};

// Complete reminder
export const completeReminder = async (reminderId) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/reminders/${reminderId}/complete`,
      {},
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Snooze reminder
export const snoozeReminder = async (reminderId, snoozeType) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/reminders/${reminderId}/snooze`,
      { snooze_type: snoozeType },
      {
        headers: {
          'X-Ami-Password': password,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete reminder
export const deleteReminder = async (reminderId) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.delete(`${API_URL}/api/reminders/${reminderId}`,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create note
export const createNote = async (noteData) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/notes/create`,
      noteData,
      {
        headers: {
          'X-Ami-Password': password,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Correct note
export const correctNote = async (noteId) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/notes/${noteId}/correct`,
      {},
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Analyze note
export const analyzeNote = async (noteId) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/notes/${noteId}/analyze`,
      {},
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Process brainstorm
export const processBrainstorm = async (noteId) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/notes/${noteId}/process-brainstorm`,
      {},
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Extract lists
export const extractLists = async (noteId) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/notes/${noteId}/extract-lists`,
      {},
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get all notes
export const getAllNotes = async (mode = null, status = null) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    let url = `${API_URL}/api/notes`;
    const params = new URLSearchParams();
    if (mode) params.append('mode', mode);
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await axios.get(url,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    return { notes: [], count: 0 };
  }
};

// Get single note
export const getNote = async (noteId) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/notes/${noteId}`,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete/archive note
export const updateNote = async (noteId, noteData) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/notes/${noteId}/update`, noteData, {
      headers: { 'X-Ami-Password': password }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const deleteNote = async (noteId) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.delete(`${API_URL}/api/notes/${noteId}`,
      {
        headers: {
          'X-Ami-Password': password
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Briefing endpoints
export const getTodaysMeetings = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/briefing/meetings-today`, {
      headers: { 'X-Ami-Password': password }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getTomorrowsMeetings = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/briefing/meetings-tomorrow`, {
      headers: { 'X-Ami-Password': password }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Briefing endpoints
export const getTodayBriefing = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/briefing/today`, {
      headers: { 'X-Ami-Password': password }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const generateMorningBriefing = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/briefing/generate-morning-text`, {
      headers: { 'X-Ami-Password': password }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const storeBriefingMessage = async (type, briefing) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/briefing/store-message`, 
      { type, briefing },
      { headers: { 'X-Ami-Password': password } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const generateEveningBriefing = async () => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.get(`${API_URL}/api/briefing/today`, {
      headers: { 'X-Ami-Password': password }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const chatAboutNews = async (topic) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/chat/news`, 
      { topic },
      { headers: { 'X-Ami-Password': password } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const orchestratedChat = async (message) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  
  try {
    const response = await axios.post(`${API_URL}/api/chat/orchestrated`, 
      { message },
      { headers: { 'X-Ami-Password': password } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

// Same chat, but her words arrive as she writes them.
// onDelta gets each new piece of text; resolves with the same object orchestratedChat returns.
export const orchestratedChatStream = async (message, onDelta) => {
  const password = getPassword();
  if (!password) throw new Error('Not authenticated');
  const res = await fetch(`${API_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'X-Ami-Password': password, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  if (!res.ok || !res.body) {
    const e = new Error('stream unavailable');
    e.beforeSend = true;
    throw e;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let final = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) !== -1) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 2);
      if (!line.startsWith('data: ')) continue;
      const evt = JSON.parse(line.slice(6));
      if (evt.type === 'delta') onDelta(evt.text);
      else if (evt.type === 'done') final = evt.data;
    }
  }
  if (!final) throw new Error('stream ended early');
  return final;
};

// Tasks API
export async function getAllTasks() {
  const response = await fetch('/api/tasks', {
    headers: { 'X-Ami-Password': AMI_PASSWORD }
  });
  return response.json();
}

export async function getTodayTasks() {
  const response = await fetch('/api/tasks/today', {
    headers: { 'X-Ami-Password': AMI_PASSWORD }
  });
  return response.json();
}

export async function getTask(taskId) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    headers: { 'X-Ami-Password': AMI_PASSWORD }
  });
  return response.json();
}

export async function createTask(taskData) {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
  });
  return response.json();
}

export async function updateTask(taskId, taskData) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
  });
  return response.json();
}

export async function deleteTask(taskId) {
  const response = await fetch(`/api/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { 'X-Ami-Password': AMI_PASSWORD }
  });
  return response.json();
}

export async function getTasksStats() {
  const response = await fetch('/api/tasks/stats', {
    headers: { 'X-Ami-Password': AMI_PASSWORD }
  });
  return response.json();
}

export async function getProjects() {
  const response = await fetch('/api/projects', {
    headers: { 'X-Ami-Password': AMI_PASSWORD }
  });
  return response.json();
}

export async function createProject(projectData) {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData)
  });
  return response.json();
}

export async function getProjectTasks(projectId) {
  const response = await fetch(`/api/tasks/project/${projectId}`, {
    headers: { 'X-Ami-Password': AMI_PASSWORD }
  });
  return response.json();
}
