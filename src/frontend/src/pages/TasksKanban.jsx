import React, { useState, useEffect } from 'react';
import SourceBadge from '../components/SourceBadge';
import SettingsPage from './SettingsPage';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let VENTURE_NAMES = {};

const isOverdue = (task) => {
  if (!task.due_date || task.status === 'done') return false;
  const today = new Date().toISOString().split('T')[0];
  return String(task.due_date) < today;
};

const isToday = (task) => {
  if (!task.due_date) return false;
  return String(task.due_date) === new Date().toISOString().split('T')[0];
};

const ventureChip = (task) => {
  const name = VENTURE_NAMES[task.venture_id];
  if (!name) return null;
  return (
    <span style={{ fontSize: '11px', background: '#667eea20', color: '#818cf8',
                   padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
      {name}
    </span>
  );
};

const NOTE_TYPE_BADGE = {
  'My Thoughts': { icon: '\uD83D\uDCAD', label: 'Thought', colour: '#a78bfa' },
  'Meeting Notes': { icon: '\uD83E\uDD1D', label: 'Meeting', colour: '#60a5fa' },
  'Brainstorm': { icon: '\uD83D\uDCA1', label: 'Brainstorm', colour: '#fbbf24' },
  'Quick Notes': { icon: '\uD83D\uDCCC', label: 'Quick', colour: '#34d399' },
  'Memoir': { icon: '\uD83D\uDCD6', label: 'Memoir', colour: '#f472b6' }
};

const shortDate = (ts) => {
  if (!ts) return '';
  const d = new Date(String(ts).replace(' ', 'T'));
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const originChip = (task) => {
  if (!task.source || task.source === 'manual') return null;
  let b;
  if (task.source === 'from_ami') {
    b = { icon: '\uD83D\uDCAC', label: 'Ami', colour: '#a78bfa' };
  } else if (task.source === 'from_notes') {
    b = NOTE_TYPE_BADGE[task.note_type] || { icon: '\uD83D\uDCDD', label: 'Note', colour: '#22d3ee' };
  } else {
    return null;
  }
  return (
    <span style={{ fontSize: '11px', background: b.colour + '20', color: b.colour,
                   padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
      {b.icon} {b.label}{task.created_at ? ' \u00B7 ' + shortDate(task.created_at) : ''}
    </span>
  );
};

export default function TasksKanban({ amiImage }) {
  const [isNarrow, setIsNarrow] = React.useState(
    typeof window !== 'undefined' && window.innerWidth < 820
  );
  const [activeCol, setActiveCol] = React.useState('pending');
  const [showAllDone, setShowAllDone] = React.useState(false);
  const [sourceNote, setSourceNote] = React.useState(null);
  const [showNoteFull, setShowNoteFull] = React.useState(false);
  React.useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 820);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [tasks, setTasks] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [ventures, setVentures] = useState([]);
  const [projects, setProjects] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [aiBreakdownLoading, setAiBreakdownLoading] = useState(false);
  const [tags, setTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('kanban');
  const [itemsPerPage] = useState(8);
  const [displayedPending, setDisplayedPending] = useState(8);
  const [displayedProgress, setDisplayedProgress] = useState(8);
  const [displayedDone, setDisplayedDone] = useState(5);
  const [statusFilter, setStatusFilter] = useState('all');
  const [ventureFilters, setVentureFilters] = useState([]);
  const [priorityFilters, setPriorityFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [sourceFilters, setSourceFilters] = useState([]);
  const [dueDateFilters, setDueDateFilters] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [draggedTask, setDraggedTask] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [sortBy, setSortBy] = useState('due_date');
  const [attachments, setAttachments] = useState({});
  const [uploadingFile, setUploadingFile] = useState(null);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMenuMobile, setShowMenuMobile] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [prioritySearch, setPrioritySearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [showOrganizer, setShowOrganizer] = useState(false);
  const [organizerLoading, setOrganizerLoading] = useState(false);
  const [organizerSuggestions, setOrganizerSuggestions] = useState([]);
  const [organizerMode, setOrganizerMode] = useState('group');
  const [groupSuggestions, setGroupSuggestions] = useState([]);
  const [groupPicked, setGroupPicked] = useState({});
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupNote, setGroupNote] = useState('');

  const runGrouping = async () => {
    if (groupBusy) return;
    setGroupBusy(true); setGroupNote(''); setGroupSuggestions([]); setGroupPicked({});
    try {
      const r = await fetch(API + '/api/tasks/group', { method: 'POST', headers: { 'X-Ami-Password': AMI_PASSWORD } });
      const j = await r.json();
      setGroupSuggestions(j.suggestions || []);
      setGroupNote(j.note || j.error || '');
    } catch (e) { setGroupNote(String(e)); }
    setGroupBusy(false);
  };

  const applyGrouping = async () => {
    const picks = groupSuggestions.filter((_, i) => groupPicked[i]);
    if (!picks.length) { setShowOrganizer(false); return; }
    setGroupBusy(true);
    try {
      await fetch(API + '/api/tasks/group/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json',
                                   'X-Ami-Password': AMI_PASSWORD },
        body: JSON.stringify({ apply: picks }) });
      setShowOrganizer(false);
      loadTasks();
    } catch (e) { setGroupNote(String(e)); }
    setGroupBusy(false);
  };
  const [selectedSuggestions, setSelectedSuggestions] = useState({});
  const [statusSearch, setStatusSearch] = useState('');
  
  const priorities = ['low', 'medium', 'high'];
  const statuses = ['pending', 'in_progress', 'done'];
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    notes: '',
    tags: [],
    venture_id: 1,
    project_id: 1,
    time_spent_hours: 0,
    status: 'pending'
  });

  useEffect(() => {
    loadTasks();
    loadVentures();
    loadProjects();
    loadTags();
  }, [formData.venture_id]);

  useEffect(() => {
    if (!showSettings) {
      loadProjects();
      loadTags();
    }
  }, [showSettings]);

  const loadTasks = async () => {
    try {
      const res = await fetch(API + '/api/tasks', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setTasks((json.tasks || []).map(t => ({
        ...t,
        tags: t.tags ? t.tags.split(',').filter(x => x) : []
      })));
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const loadProjects = async () => {
    try {
      // The real projects live in the ventures table with type='project'
      const res = await fetch(API + '/api/admin/ventures', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      const all = json.projects || [];
      // show the ones under this venture, plus any standalone ones
      const mine = all.filter(p => !p.parent_id || p.parent_id === formData.venture_id);
      setProjects(mine.length ? mine : all);
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const loadVentures = async () => {
    try {
      const res = await fetch(API + '/api/admin/ventures', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setVentures(json.ventures || []);
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const loadSubtasks = async (taskId) => {
    try {
      const res = await fetch(`${API}/api/tasks/${taskId}/subtasks`, {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setSubtasks(json.subtasks || []);
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const addSubtask = async () => {
    if (!newSubtaskTitle.trim() || !editingTask) return;
    try {
      await fetch(`${API}/api/tasks/${editingTask.id}/subtasks`, {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtaskTitle, status: 'pending' })
      });
      setNewSubtaskTitle('');
      loadSubtasks(editingTask.id);
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const aiBreakdown = async () => {
    if (!formData.description) { alert('Add description first'); return; }
    setAiBreakdownLoading(true);
    try {
      const res = await fetch(API + '/api/tasks/ai-breakdown', {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formData.title, description: formData.description })
      });
      const json = await res.json();
      if (json.subtasks) {
        // Set subtasks from AI
        setSubtasks(json.subtasks.map((s, i) => ({ id: i, title: s.title, status: 'pending' })));
      }
    } catch (e) {
      console.error('Error:', e);
      alert('AI breakdown failed');
    } finally {
      setAiBreakdownLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const res = await fetch(API + '/api/tags', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setTags(json.tags || []);
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const generateDescription = async () => {
    if (!formData.title) { alert('Add title first'); return; }
    setGeneratingDesc(true);
    try {
      const res = await fetch(API + '/api/ai/generate-description', {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formData.title })
      });
      const json = await res.json();
      setFormData({...formData, description: json.description || ''});
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setGeneratingDesc(false);
    }
  };

  const loadAttachments = async (taskId) => {
    try {
      const res = await fetch(`${API}/api/tasks/${taskId}/attachments`, {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setAttachments({...attachments, [taskId]: json.attachments || []});
    } catch (e) {
      console.error('Error loading attachments:', e);
    }
  };

  const uploadFile = async (taskId, file) => {
    if (!file) return;
    const formDataObj = new FormData();
    formDataObj.append('file', file);
    try {
      setUploadingFile(taskId);
      const res = await fetch(`${API}/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD },
        body: formDataObj
      });
      if (res.ok) {
        await loadAttachments(taskId);
        alert('✅ File uploaded!');
      } else {
        alert('❌ Upload failed');
      }
    } catch (e) {
      console.error('Upload error:', e);
      alert('❌ Upload error');
    } finally {
      setUploadingFile(null);
    }
  };

  const toggleTag = (tagName) => {
    if (formData.tags.includes(tagName)) {
      setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagName) });
    } else {
      setFormData({ ...formData, tags: [...formData.tags, tagName] });
    }
  };

  const addOrUpdateTask = async () => {
    if (!formData.title) { alert('Title required'); return; }
    try {
      const url = editingTask ? `${API}/api/tasks/${editingTask.id}` : API + '/api/tasks';
      const method = editingTask ? 'PUT' : 'POST';
      await fetch(url, {
        method,
        headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tags: formData.tags.join(','), status: editingTask?.status || formData.status })
      });
      
      await loadTasks();
      
      if (!editingTask) {
        const tasks = await fetch(API + '/api/tasks', { headers: { 'X-Ami-Password': AMI_PASSWORD } }).then(r => r.json());
        const newTask = tasks.tasks.find(t => t.title === formData.title && t.status === formData.status);
        if (newTask) {
          await loadAttachments(newTask.id);
          setEditingTask(newTask);
          return;
        }
      }
      
      setShowAddModal(false);
      setEditingTask(null);
      resetForm();
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
      notes: '',
      tags: [],
      project_id: 1,
      time_spent_hours: 0,
      status: 'pending'
    });
    setTagSearch('');
    setPrioritySearch('');
    setProjectSearch('');
    setStatusSearch('');
  };

  const deleteTask = async (taskId, e) => {
    e.stopPropagation();
    if (window.confirm('Delete task?')) {
      try {
        await fetch(`${API}/api/tasks/${taskId}`, {
          method: 'DELETE',
          headers: { 'X-Ami-Password': AMI_PASSWORD }
        });
        loadTasks();
      } catch (e) {
        console.error('Error:', e);
      }
    }
  };

  const moveTask = async (taskId, newStatus) => {
    try {
      const payload = { status: newStatus };

      // Committing to a task means giving it a date
      if (newStatus === 'in_progress') {
        const t = tasks.find(x => x.id === taskId);
        if (t && !t.due_date) {
          const suggested = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
          const entered = window.prompt(
            `When will "${t.title}" be done?\n\nYYYY-MM-DD, or leave blank to cancel.`,
            suggested
          );
          if (!entered || !/^\d{4}-\d{2}-\d{2}$/.test(entered.trim())) return;
          payload.due_date = entered.trim();
        }
      }

      await fetch(`${API}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      loadTasks();
    } catch (e) {
      console.error('Error moving task:', e);
    }
  };

  const loadMoreCards = (status) => {
    if (status === 'pending') setDisplayedPending(prev => prev + itemsPerPage);
    if (status === 'in_progress') setDisplayedProgress(prev => prev + itemsPerPage);
    if (status === 'done') setDisplayedDone(prev => prev + itemsPerPage);
  };

  const handleDragStart = (task, e) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (newStatus, e) => {
    e.preventDefault();
    if (draggedTask) {
      moveTask(draggedTask.id, newStatus);
      setDraggedTask(null);
    }
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
  };

  const bulkMoveTask = async (newStatus) => {
    for (const taskId of selectedTasks) {
      await moveTask(taskId, newStatus);
    }
    setSelectedTasks([]);
  };

  const bulkDeleteTask = async () => {
    if (window.confirm(`Delete ${selectedTasks.length} tasks?`)) {
      for (const taskId of selectedTasks) {
        await deleteTask(taskId);
      }
      setSelectedTasks([]);
    }
  };

  const sortTasks = (tasksToSort) => {
    const sorted = [...tasksToSort];
    if (sortBy === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      sorted.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));
    } else if (sortBy === 'due_date') {
      sorted.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });
    } else if (sortBy === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    }
    return sorted;
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setSourceNote(null);
    setShowNoteFull(false);
    if (task.note_id) {
      fetch(`${API}/api/tasks/${task.id}/source-note`, {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      })
        .then(r => r.json())
        .then(d => setSourceNote(d.note || null))
        .catch(() => {});
    }
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      due_date: task.due_date || '',
      notes: task.notes || '',
      tags: task.tags || [],
      project_id: task.project_id || 1,
      time_spent_hours: task.time_spent_hours || 0,
      status: task.status || 'pending'
    });
    loadAttachments(task.id);
    setShowAddModal(true);
  };

  let filtered = tasks.filter(t => {
    const query = searchQuery.toLowerCase().trim();
    
    // Venture filter
    if (ventureFilters.length > 0) {
      const vn = VENTURE_NAMES[t.venture_id] || '__none__';
      if (!ventureFilters.includes(vn)) return false;
    }

    // Priority filter
    if (priorityFilters.length > 0 && !priorityFilters.includes(t.priority)) return false;
    
    // Status filter
    if (statusFilters.length > 0 && !statusFilters.includes(t.status)) return false;

    // Where it came from
    if (sourceFilters.length > 0) {
      const src = (t.source || 'manual').toLowerCase();
      const mine = !src || src === 'manual' || src === 'me';
      const ok = sourceFilters.some(f =>
        (f === 'ami' && src.includes('ami')) ||
        (f === 'notes' && src.includes('note')) ||
        (f === 'mine' && mine));
      if (!ok) return false;
    }
    
    // Due date filter
    if (dueDateFilters.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = t.due_date ? new Date(t.due_date) : null;
      let matchesDueDate = false;
      
      if (dueDateFilters.includes('overdue') && dueDate && dueDate < today) matchesDueDate = true;
      if (dueDateFilters.includes('today') && dueDate && dueDate.toDateString() === today.toDateString()) matchesDueDate = true;
      if (dueDateFilters.includes('this week') && dueDate && dueDate > today && dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) matchesDueDate = true;
      if (dueDateFilters.includes('later') && dueDate && dueDate > new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) matchesDueDate = true;
      
      if (!matchesDueDate) return false;
    }
    
    if (!query) return true;
    
    const matchesText = t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query));
    const project = projects.find(p => String(p.id) === String(t.project_id));
    const matchesProject = project && project.name.toLowerCase().includes(query);
    const ventureName = VENTURE_NAMES[t.venture_id] || '';
    const matchesVenture = ventureName.toLowerCase().includes(query);
    const matchesTags = t.tags && t.tags.some(tag => String(tag).toLowerCase().includes(query));
    const matchesPriority = t.priority && t.priority.toLowerCase().includes(query);
    const matchesStatus = t.status && t.status.toLowerCase().includes(query);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = t.due_date ? new Date(t.due_date) : null;
    
    let matchesDueDate = false;
    if (query === 'today' && dueDate && dueDate.toDateString() === today.toDateString()) matchesDueDate = true;
    if (query === 'tomorrow' && dueDate && dueDate.toDateString() === tomorrow.toDateString()) matchesDueDate = true;
    if (query === 'overdue' && dueDate && dueDate < today) matchesDueDate = true;
    if (query === 'this week' && dueDate && dueDate > today && dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) matchesDueDate = true;
    if (query === 'no due date' && !t.due_date) matchesDueDate = true;

    return matchesText || matchesProject || matchesVenture || matchesTags || matchesPriority || matchesStatus || matchesDueDate;
  });

  // overdue always floats to the top, then whatever sortBy says
  const withOverdueFirst = (list) => {
    const sorted = sortTasks(list);
    return [...sorted.filter(isOverdue), ...sorted.filter(t => !isOverdue(t))];
  };

  const pending = withOverdueFirst(filtered.filter(t => t.status === 'pending'));
  const progress = withOverdueFirst(filtered.filter(t => t.status === 'in_progress'));

  // Completed work older than two weeks drops out of view
  const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
  const allDone = filtered.filter(t => t.status === 'done');
  const done = showAllDone
    ? allDone
    : allDone.filter(t => !t.updated_at || String(t.updated_at).slice(0, 10) >= twoWeeksAgo);
  
  const pendingFiltered = statusFilter === 'all' || statusFilter === 'pending' ? pending : [];
  const progressFiltered = statusFilter === 'all' || statusFilter === 'in_progress' ? progress : [];
  const doneFiltered = statusFilter === 'all' || statusFilter === 'done' ? done : [];
  
  const sortedPending = sortTasks(pendingFiltered);
  const sortedProgress = sortTasks(progressFiltered);
  const sortedDone = sortTasks(doneFiltered);
  
  const displayPending = sortedPending.slice(0, displayedPending);
  const displayProgress = sortedProgress.slice(0, displayedProgress);
  const displayDone = sortedDone.slice(0, displayedDone);

  const statusConfig = {
    pending: { label: 'Backlog', color: '#8b8b8b', bgColor: '#f0f0f0' },
    in_progress: { label: 'In Progress', color: '#0066cc', bgColor: '#cce5ff' },
    done: { label: 'Complete', color: '#00aa00', bgColor: '#ccffcc' }
  };

  const priorityConfig = {
    high: { label: 'High', color: '#dd0000', bg: '#ffcccc' },
    medium: { label: 'Medium', color: '#ff8800', bg: '#ffe6cc' },
    low: { label: 'Low', color: '#00aa00', bg: '#ccffcc' }
  };

  const getTagColor = (tagName) => {
    const tag = tags.find(t => t.name === tagName);
    return tag ? tag.color : '#667eea';
  };

  const TaskCard = ({ task }) => {
    const priority = priorityConfig[task.priority] || { label: 'None', color: '#999', bg: '#eee' };
  
  const runOrganizer = async () => {
    setOrganizerLoading(true);
    try {
      const response = await fetch(API + '/api/tasks/organize', {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const data = await response.json();
      setOrganizerSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Organizer error:', error);
      alert('Error running organizer');
    } finally {
      setOrganizerLoading(false);
    }
  };

  const applyOrganizer = async () => {
    const accepted = organizerSuggestions.filter((_, i) => selectedSuggestions[i]);
    try {
      const response = await fetch(API + '/api/tasks/organize/apply', {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestions: accepted })
      });
      const data = await response.json();
      alert(`Applied ${data.applied} changes!`);
      setShowOrganizer(false);
      setOrganizerSuggestions([]);
      loadTasks();
    } catch (error) {
      console.error('Apply error:', error);
    }
  };

  if (showOrganizer) {
    const groups = organizerMode === 'group' ? groupSuggestions : [];
    const tabStyle = (on) => ({
      padding: '8px 14px', borderRadius: '16px', cursor: 'pointer', fontSize: '13px',
      border: '1px solid ' + (on ? '#4f46e5' : '#ddd'),
      background: on ? '#eef2ff' : '#fff',
      color: on ? '#4f46e5' : '#666',
    });
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '16px' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '22px',
                      maxWidth: '620px', width: '100%', maxHeight: '86vh',
                      overflowY: 'auto' }}>
          <h2 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>
            Sort out the board
          </h2>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button style={tabStyle(organizerMode === 'group')}
                    onClick={() => { setOrganizerMode('group');
                                     if (!groupSuggestions.length && !groupBusy)
                                       runGrouping(); }}>
              What belongs together
            </button>
            <button style={tabStyle(organizerMode === 'text')}
                    onClick={() => { setOrganizerMode('text');
                                     if (!organizerSuggestions.length) runOrganizer(); }}>
              Tidy the wording
            </button>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '16px',
                        border: '1px solid #eee', borderRadius: '8px', padding: '10px' }}>

            {organizerMode === 'group' && groupBusy && (
              <p style={{ textAlign: 'center', color: '#999' }}>Looking at the board...</p>
            )}

            {organizerMode === 'group' && !groupBusy && groups.length === 0 && (
              <p style={{ textAlign: 'center', color: '#999' }}>
                {groupNote || 'Nothing stood out as belonging together.'}
              </p>
            )}

            {organizerMode === 'group' && groups.map((g, i) => (
              <div key={i} style={{ background: '#f9fafb', padding: '12px',
                                    marginBottom: '8px', borderRadius: '8px' }}>
                <label style={{ display: 'flex', gap: '9px', cursor: 'pointer',
                                alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={groupPicked[i] || false}
                         onChange={(e) => setGroupPicked({ ...groupPicked, [i]: e.target.checked })}
                         style={{ marginTop: '4px' }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
                                   color: g.kind === 'duplicate' ? '#b45309' : '#4f46e5' }}>
                      {g.kind === 'duplicate' ? 'THE SAME THING TWICE'
                        : g.kind === 'group' ? 'THESE GO TOGETHER'
                        : 'THIS BELONGS TO ' + String(g.venture || '').toUpperCase()}
                    </span>
                    <div style={{ fontWeight: 600, fontSize: '14px', margin: '2px 0', color: '#1a1a1a' }}>
                      {g.label}{g.venture ? ' • ' + g.venture : ''}
                    </div>
                    {(g.titles || []).map((t, k) => (
                      <div key={k} style={{ fontSize: '12px', color: '#555' }}>• {t}</div>
                    ))}
                    {g.why && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{g.why}</div>
                    )}
                  </span>
                </label>
              </div>
            ))}

            {organizerMode === 'text' && organizerSuggestions.length === 0 && (
              <p style={{ textAlign: 'center', color: '#999' }}>Nothing to tidy.</p>
            )}

            {organizerMode === 'text' && organizerSuggestions.map((sugg, idx) => (
              <div key={idx} style={{ background: '#f9fafb', padding: '12px',
                                      marginBottom: '8px', borderRadius: '8px' }}>
                <label style={{ display: 'flex', gap: '9px', cursor: 'pointer',
                                alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={selectedSuggestions[idx] || false}
                         onChange={(e) => setSelectedSuggestions({ ...selectedSuggestions,
                                                                   [idx]: e.target.checked })}
                         style={{ marginTop: '4px' }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px',
                                   color: '#4f46e5' }}>
                      {String(sugg.type || '').toUpperCase()}
                    </span>
                    {sugg.current && (
                      <div style={{ fontSize: '13px', margin: '2px 0' }}>{sugg.current}</div>
                    )}
                    {sugg.suggested && (
                      <div style={{ fontSize: '13px', color: '#059669' }}>
                        \u2192 {sugg.suggested}
                      </div>
                    )}
                    {sugg.reason && (
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                        {sugg.reason}
                      </div>
                    )}
                  </span>
                </label>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowOrganizer(false)}
                    style={{ padding: '10px 16px', background: '#eee', border: 'none',
                             borderRadius: '8px', cursor: 'pointer' }}>
              Close
            </button>
            <button onClick={organizerMode === 'group' ? applyGrouping : applyOrganizer}
                    style={{ padding: '10px 18px', background: '#4f46e5', color: '#fff',
                             border: 'none', borderRadius: '8px', cursor: 'pointer',
                             fontWeight: 600 }}>
              Apply what I ticked
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div draggable="true" onDragStart={(e) => handleDragStart(task, e)} onDragEnd={(e) => { setDraggedTask(null); e.currentTarget.dataset.dragged = '1'; setTimeout(() => { if (e.currentTarget) e.currentTarget.dataset.dragged = ''; }, 200); }} style={{ background: '#1e1e1e', borderLeft: '4px solid ' + (task.status === 'done' ? '#10b981' : task.status === 'in_progress' ? '#f59e0b' : '#6b7280'), border: draggedTask?.id === task.id ? '2px solid #667eea' : '1px solid #333', borderRadius: '8px', padding: '16px', marginBottom: '12px', cursor: draggedTask?.id === task.id ? 'grabbing' : 'grab', transition: 'all 0.2s', boxShadow: draggedTask?.id === task.id ? '0 8px 16px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0,0,0,0.08)', opacity: draggedTask?.id === task.id ? 0.7 : 1 }} onClick={(e) => { if (e.currentTarget.dataset.dragged === '1') return; openEditModal(task); }} onMouseEnter={(e) => e.currentTarget.style.boxShadow = draggedTask?.id === task.id ? '0 8px 16px rgba(102, 126, 234, 0.3)' : '0 4px 8px rgba(0,0,0,0.12)'} onMouseLeave={(e) => e.currentTarget.style.boxShadow = draggedTask?.id === task.id ? '0 8px 16px rgba(102, 126, 234, 0.3)' : '0 1px 3px rgba(0,0,0,0.08)'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px', gap: '8px' }}>
          <input type="checkbox" checked={selectedTasks.includes(task.id)} onChange={(e) => toggleTaskSelection(task.id)} onClick={(e) => e.stopPropagation()} style={{ cursor: 'pointer', width: '18px', height: '18px', marginTop: '2px' }} />
          <button
            onClick={(e) => { e.stopPropagation(); moveTask(task.id, task.status === 'done' ? 'pending' : 'done'); }}
            title={task.status === 'done' ? 'Move back' : 'Mark complete'}
            style={{ background: 'none', border: '2px solid ' + (task.status === 'done' ? '#10b981' : '#555'),
                     borderRadius: '50%', width: '22px', height: '22px', minWidth: '22px',
                     cursor: 'pointer', color: '#10b981', fontSize: '13px', lineHeight: 1,
                     padding: 0, marginRight: '8px', flexShrink: 0 }}
          >
            {task.status === 'done' ? '\u2713' : ''}
          </button>
          <strong style={{ color: task.status === 'done' ? '#777' : '#eee', fontSize: '14px', flex: 1,
                           lineHeight: 1.4,
                           textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.title}</strong>
          <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id, e); }} style={{ background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <span style={{ background: priority.bg, color: priority.color, padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{priority.label}</span>
          {originChip(task)}
          {task.due_date && (
            <span style={{ color: isOverdue(task) ? '#f87171' : isToday(task) ? '#fbbf24' : '#aaa',
                           fontSize: '11px', fontWeight: isOverdue(task) ? 700 : 400 }}>
              {isOverdue(task) ? '\u26A0\uFE0F Overdue: ' : isToday(task) ? 'Today: ' : 'Due: '}{task.due_date}
            </span>
          )}
          {ventureChip(task)}
          {task.time_spent_hours > 0 && <span style={{ color: '#667eea', fontSize: '11px' }}>{task.time_spent_hours}h</span>}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {task.status === 'pending' && <button onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'in_progress'); }} title="Move to In Progress" style={{ background: '#9ca3af', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>→</button>}
          {task.status === 'in_progress' && <button onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'pending'); }} title="Move to Pending" style={{ background: '#9ca3af', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>←</button>}
          {task.status === 'in_progress' && <button onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'done'); }} title="Move to Complete" style={{ background: '#9ca3af', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>→</button>}
          {task.status === 'done' && <button onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'in_progress'); }} title="Move to In Progress" style={{ background: '#9ca3af', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>←</button>}
        </div>
        {task.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {task.tags.map(tag => (
              <span key={tag} style={{ background: getTagColor(tag), color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const KanbanColumn = ({ title, status, tasks }) => {
    const config = statusConfig[status];
    return (
      <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(status, e)} style={{ flex: 1, minWidth: '300px', background: config.bgColor, borderRadius: '8px', padding: '16px', minHeight: '600px' }}>
        <div style={{ marginBottom: '16px' }}>
          <span style={{ background: config.color, color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>{config.label} ({tasks.length})</span>
        </div>
        {tasks.length === 0 ? <p style={{ color: '#999', textAlign: 'center', marginTop: '50px' }}>No tasks</p> : tasks.map(t => <TaskCard key={t.id} task={t} />)}
      </div>
    );
  };

  const SearchableDropdown = ({ label, value, onChange, options, searchValue, onSearchChange }) => {
    const filtered = options.filter(opt => opt.toLowerCase().includes(searchValue.toLowerCase()));
    return (
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a', fontWeight: 'bold', fontSize: '12px' }}>{label}</label>
        <input type="text" placeholder="Search..." value={searchValue} onChange={(e) => onSearchChange(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '6px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box', fontSize: '14px', color: '#1a1a1a', background: '#ffffff' }} />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {filtered.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); onSearchChange(''); }} style={{ background: value === opt ? '#667eea' : '#f0f0f0', color: value === opt ? 'white' : '#1a1a1a', padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{opt}</button>
          ))}
        </div>
      </div>
    );
  };

  const TagDropdown = ({ label, selectedTags, onToggle, searchValue, onSearchChange }) => {
    const filtered = tags.filter(tag => tag.name.toLowerCase().includes(searchValue.toLowerCase()));
    return (
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a', fontWeight: 'bold', fontSize: '12px' }}>{label}</label>
        <input type="text" placeholder="Search tags..." value={searchValue} onChange={(e) => onSearchChange(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '6px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box', fontSize: '14px', color: '#1a1a1a', background: '#ffffff' }} />
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {filtered.map(tag => (
            <button key={tag.name} onClick={() => onToggle(tag.name)} style={{ background: selectedTags.includes(tag.name) ? tag.color : '#f0f0f0', color: selectedTags.includes(tag.name) ? 'white' : '#1a1a1a', padding: '6px 12px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{tag.name}</button>
          ))}
        </div>
      </div>
    );
  };

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '12px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box', fontSize: '14px', color: '#1a1a1a', background: '#ffffff' };

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh', padding: '16px' }}>
      <div style={{ position: 'sticky', top: 0, background: 'white', zIndex: 100, padding: '16px', borderRadius: '8px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', color: '#1a1a1a', background: '#ffffff' }} />
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', color: '#1a1a1a', cursor: 'pointer', background: '#ffffff' }}>
            <option value="kanban">Kanban</option>
            <option value="list">List</option>
            <option value="calendar">Calendar</option>
          </select>
          {/* Hamburger Menu Button */}
          <button onClick={() => setShowMenuMobile(!showMenuMobile)} style={{ padding: '10px 14px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px' }}>☰ Menu</button>
          
          {/* Menu Expanded */}
          {showMenuMobile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px' }}>
              <button onClick={() => { setEditingTask(null); resetForm(); setShowAddModal(true); setShowMenuMobile(false); }} style={{ padding: '10px 16px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ New Task</button>
              <button onClick={() => { setShowSettings(!showSettings); setShowMenuMobile(false); }} style={{ padding: '10px 16px', background: '#555', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>⚙️ Settings</button>
              <button onClick={() => { setShowOrganizer(true); setOrganizerMode('group'); runGrouping(); setShowMenuMobile(false); }} disabled={groupBusy} style={{ padding: '10px 16px', background: groupBusy ? '#999' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{groupBusy ? '⏳ Looking...' : '🧹 Sort out the board'}</button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ background: 'white', padding: '12px 20px', borderBottom: '1px solid #ddd', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setStatusFilter('all')} style={{ padding: '8px 16px', background: statusFilter === 'all' ? '#667eea' : '#f0f0f0', color: statusFilter === 'all' ? 'white' : '#1a1a1a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>📊 All ({filtered.length})</button>
        <button onClick={() => setStatusFilter('pending')} style={{ padding: '8px 16px', background: statusFilter === 'pending' ? '#667eea' : '#f0f0f0', color: statusFilter === 'pending' ? 'white' : '#1a1a1a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>📋 Pending ({pending.length})</button>
        <button onClick={() => setStatusFilter('in_progress')} style={{ padding: '8px 16px', background: statusFilter === 'in_progress' ? '#667eea' : '#f0f0f0', color: statusFilter === 'in_progress' ? 'white' : '#1a1a1a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>⏳ Progress ({progress.length})</button>
        <button onClick={() => setStatusFilter('done')} style={{ padding: '8px 16px', background: statusFilter === 'done' ? '#667eea' : '#f0f0f0', color: statusFilter === 'done' ? 'white' : '#1a1a1a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>✅ Done ({done.length})</button>
      </div>

      {/* Filter Panel */}
      <div style={{ background: '#f9f9f9', padding: '12px 20px', borderBottom: '1px solid #ddd' }}>
        <button onClick={() => setShowFilters(!showFilters)} style={{ padding: '8px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>🔽 {showFilters ? 'Hide' : 'Show'} Filters</button>
        
        {showFilters && (
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Venture Filter */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Venture</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                {[...new Set(tasks.map(t => VENTURE_NAMES[t.venture_id]).filter(Boolean))].sort().map(v => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#1a1a1a' }}>
                    <input type="checkbox" checked={ventureFilters.includes(v)} onChange={(e) => setVentureFilters(e.target.checked ? [...ventureFilters, v] : ventureFilters.filter(x => x !== v))} style={{ cursor: 'pointer' }} />
                    <span style={{ color: '#1a1a1a' }}>{v}</span>
                  </label>
                ))}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#666' }}>
                  <input type="checkbox" checked={ventureFilters.includes('__none__')} onChange={(e) => setVentureFilters(e.target.checked ? [...ventureFilters, '__none__'] : ventureFilters.filter(x => x !== '__none__'))} style={{ cursor: 'pointer' }} />
                  <span style={{ color: '#666' }}>Not assigned</span>
                </label>
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Priority</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {['high', 'medium', 'low'].map(p => (
                  <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#1a1a1a' }}>
                    <input type="checkbox" checked={priorityFilters.includes(p)} onChange={(e) => setPriorityFilters(e.target.checked ? [...priorityFilters, p] : priorityFilters.filter(x => x !== p))} style={{ cursor: 'pointer' }} />
                    <span style={{ color: '#1a1a1a' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Where it came from */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 8px 0' }}>Came from</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[{val: 'ami', label: '\uD83D\uDCAC From Ami'},
                  {val: 'notes', label: '\uD83D\uDCDD From notes'},
                  {val: 'mine', label: '\u270D\uFE0F Added by me'}].map(f => (
                  <label key={f.val} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={sourceFilters.includes(f.val)}
                      onChange={(e) => setSourceFilters(e.target.checked
                        ? [...sourceFilters, f.val]
                        : sourceFilters.filter(x => x !== f.val))} />
                    <span style={{ color: '#1a1a1a' }}>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Status</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[{val: 'pending', label: 'Pending'}, {val: 'in_progress', label: 'In Progress'}, {val: 'done', label: 'Done'}].map(s => (
                  <label key={s.val} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#1a1a1a' }}>
                    <input type="checkbox" checked={statusFilters.includes(s.val)} onChange={(e) => setStatusFilters(e.target.checked ? [...statusFilters, s.val] : statusFilters.filter(x => x !== s.val))} style={{ cursor: 'pointer' }} />
                    <span style={{ color: '#1a1a1a' }}>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Due Date Filter */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#666', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Due Date</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {['overdue', 'today', 'this week', 'later'].map(d => (
                  <label key={d} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#1a1a1a' }}>
                    <input type="checkbox" checked={dueDateFilters.includes(d)} onChange={(e) => setDueDateFilters(e.target.checked ? [...dueDateFilters, d] : dueDateFilters.filter(x => x !== d))} style={{ cursor: 'pointer' }} />
                    <span style={{ color: '#1a1a1a' }}>{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedTasks.length > 0 && (
        <div style={{ background: '#667eea', padding: '12px 20px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>✓ {selectedTasks.length} Task{selectedTasks.length !== 1 ? 's' : ''} Selected</span>
          <select onChange={(e) => { if (e.target.value) bulkMoveTask(e.target.value); e.target.value = ''; }} style={{ padding: '8px 12px', background: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            <option value="">Move to...</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <button onClick={bulkDeleteTask} style={{ padding: '8px 14px', background: '#ff4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>🗑️ Delete</button>
          <button onClick={() => setSelectedTasks([])} style={{ padding: '8px 14px', background: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Clear</button>
        </div>
      )}

      {/* Sort Toolbar */}
      <div style={{ background: '#f9f9f9', padding: '14px 20px', borderBottom: '1px solid #e0e0e0', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontWeight: '600', fontSize: '13px', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📊 Sort:</span>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '10px 14px', background: 'white', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', color: '#1a1a1a', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <option value="due_date">📅 Due Date (Soonest)</option>
          <option value="priority">⚡ Priority (High→Low)</option>
          <option value="title">🔤 Title (A→Z)</option>
        </select>
      </div>

      {showSettings ? (<SettingsPage />) : (<>{viewMode === 'kanban' && (
        isNarrow ? (
          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              {[['pending', 'Backlog', pending.length],
                ['in_progress', 'In Progress', progress.length],
                ['done', 'Complete', done.length]].map(([key, label, count]) => (
                <button
                  key={key}
                  onClick={() => setActiveCol(key)}
                  style={{ flex: 1, padding: '10px 6px', minHeight: '48px',
                           background: activeCol === key ? '#667eea' : '#2a2a2a',
                           color: '#fff', border: 'none', borderRadius: '8px',
                           fontSize: '13px', fontWeight: activeCol === key ? 700 : 500,
                           cursor: 'pointer', lineHeight: 1.3 }}
                >
                  {label}
                  <div style={{ fontSize: '17px', fontWeight: 700, marginTop: '2px' }}>{count}</div>
                </button>
              ))}
            </div>

            {activeCol === 'pending' && (
              <div>
                <KanbanColumn title="Backlog" status="pending" tasks={displayPending} />
                {(displayedPending < pending.length || displayedPending > 8) && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    {displayedPending < pending.length && (
                      <button onClick={() => loadMoreCards('pending')}
                        style={{ flex: 1, padding: '12px', minHeight: '46px',
                                background: '#2a2a2a', color: '#fff', border: 'none',
                                borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                        Load more ({pending.length - displayedPending} left)
                      </button>
                    )}
                    {displayedPending > 8 && (
                      <button onClick={() => setDisplayedPending(8)}
                        style={{ flex: '0 0 auto', padding: '12px 16px', minHeight: '46px',
                                background: 'transparent', color: '#8b8b9e',
                                border: '1px solid #2c2c3a', borderRadius: '8px',
                                cursor: 'pointer', fontSize: '13px' }}>
                        Less
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {activeCol === 'in_progress' && (
              <div>
                <KanbanColumn title="In Progress" status="in_progress" tasks={displayProgress} />
                {(displayedProgress < progress.length || displayedProgress > 8) && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    {displayedProgress < progress.length && (
                      <button onClick={() => loadMoreCards('in_progress')}
                        style={{ flex: 1, padding: '12px', minHeight: '46px',
                                background: '#2a2a2a', color: '#fff', border: 'none',
                                borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                        Load more ({progress.length - displayedProgress} left)
                      </button>
                    )}
                    {displayedProgress > 8 && (
                      <button onClick={() => setDisplayedProgress(8)}
                        style={{ flex: '0 0 auto', padding: '12px 16px', minHeight: '46px',
                                background: 'transparent', color: '#8b8b9e',
                                border: '1px solid #2c2c3a', borderRadius: '8px',
                                cursor: 'pointer', fontSize: '13px' }}>
                        Less
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            {activeCol === 'done' && (
              <div>
                <button onClick={() => setShowAllDone(!showAllDone)}
                  style={{ width: '100%', padding: '8px', marginBottom: '8px', minHeight: '40px',
                           background: 'none', color: '#888', border: '1px dashed #333',
                           borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  {showAllDone ? 'Show recent only' : 'Show everything ever completed'}
                </button>
                <KanbanColumn title="Complete" status="done" tasks={displayDone} />
                {(displayedDone < done.length || displayedDone > 5) && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    {displayedDone < done.length && (
                      <button onClick={() => loadMoreCards('done')}
                        style={{ flex: 1, padding: '12px', minHeight: '46px',
                                background: '#2a2a2a', color: '#fff', border: 'none',
                                borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                        Load more ({done.length - displayedDone} left)
                      </button>
                    )}
                    {displayedDone > 5 && (
                      <button onClick={() => setDisplayedDone(5)}
                        style={{ flex: '0 0 auto', padding: '12px 16px', minHeight: '46px',
                                background: 'transparent', color: '#8b8b9e',
                                border: '1px solid #2c2c3a', borderRadius: '8px',
                                cursor: 'pointer', fontSize: '13px' }}>
                        Less
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
            <div style={{ width: '350px', minHeight: '600px', display: 'flex', flexDirection: 'column', flex: '0 0 auto' }}>
              <KanbanColumn title={`Backlog (${pending.length})`} status="pending" tasks={displayPending} />
              {displayedPending < pending.length && (
                <button onClick={() => loadMoreCards('pending')}
                  style={{ width: '100%', marginTop: '10px', padding: '10px 20px', background: '#2a2a2a',
                           color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Load More
                </button>
              )}
            </div>
            <div style={{ width: '350px', minHeight: '600px', display: 'flex', flexDirection: 'column', flex: '0 0 auto' }}>
              <KanbanColumn title={`In Progress (${progress.length})`} status="in_progress" tasks={displayProgress} />
              {displayedProgress < progress.length && (
                <button onClick={() => loadMoreCards('in_progress')}
                  style={{ width: '100%', marginTop: '10px', padding: '10px 20px', background: '#2a2a2a',
                           color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Load More
                </button>
              )}
            </div>
            <div style={{ width: '350px', minHeight: '600px', display: 'flex', flexDirection: 'column', flex: '0 0 auto' }}>
              <KanbanColumn title={`Complete (${done.length})`} status="done" tasks={displayDone} />
              {displayedDone < done.length && (
                <button onClick={() => loadMoreCards('done')}
                  style={{ width: '100%', marginTop: '10px', padding: '10px 20px', background: '#2a2a2a',
                           color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  Load More
                </button>
              )}
            </div>
          </div>
        )
      )}{viewMode === 'list' && (
        <div style={{ padding: '20px', maxWidth: '100%' }}>
          <h2 style={{ color: '#1a1a1a', marginBottom: '20px' }}>All Tasks ({filtered.length})</h2>
          
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#666', fontSize: '14px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase' }}>📋 Pending ({pending.length})</h3>
            {pending.map(t => (
              <div key={t.id} onClick={() => openEditModal(t)} style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', margin: '0 0 4px 0', color: '#1a1a1a', fontWeight: '500' }}>{t.title}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', background: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#10b981', color: 'white', padding: '2px 6px', borderRadius: '3px' }}>{t.priority}</span>
                    {t.due_date && <span style={{ fontSize: '10px', color: '#666' }}>Due: {t.due_date}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); moveTask(t.id, 'in_progress'); }} title="Move to In Progress" style={{ background: '#9ca3af', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>→</button>
                  <button onClick={() => deleteTask(t.id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
          
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#666', fontSize: '14px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase' }}>🔄 In Progress ({progress.length})</h3>
            {progress.map(t => (
              <div key={t.id} style={{ background: '#e3f2fd', padding: '12px', borderRadius: '6px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', margin: '0 0 4px 0', color: '#1a1a1a', fontWeight: '500' }}>{t.title}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', background: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#10b981', color: 'white', padding: '2px 6px', borderRadius: '3px' }}>{t.priority}</span>
                    {t.due_date && <span style={{ fontSize: '10px', color: '#666' }}>Due: {t.due_date}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); moveTask(t.id, 'pending'); }} title="Move to Pending" style={{ background: '#9ca3af', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>←</button>
                  <button onClick={(e) => { e.stopPropagation(); moveTask(t.id, 'done'); }} title="Move to Complete" style={{ background: '#9ca3af', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>→</button>
                  <button onClick={() => deleteTask(t.id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
          
          <div>
            <h3 style={{ color: '#666', fontSize: '14px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase' }}>✅ Complete ({done.length})</h3>
            {done.map(t => (
              <div key={t.id} style={{ background: '#e8f5e9', padding: '12px', borderRadius: '6px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', margin: '0 0 4px 0', color: '#1a1a1a', fontWeight: '500', textDecoration: 'line-through' }}>{t.title}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '3px' }}>{t.priority}</span>
                    {t.due_date && <span style={{ fontSize: '10px', color: '#666' }}>Due: {t.due_date}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={(e) => { e.stopPropagation(); moveTask(t.id, 'in_progress'); }} title="Move to In Progress" style={{ background: '#9ca3af', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>←</button>
                  <button onClick={() => deleteTask(t.id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}{viewMode === 'calendar' && (
        <div style={{ padding: '20px', maxWidth: '100%' }}>
          <h2 style={{ color: '#1a1a1a', marginBottom: '20px' }}>Calendar View</h2>
          
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const weekEnd = new Date(today);
            weekEnd.setDate(weekEnd.getDate() + 7);
            
            const overdue = filtered.filter(t => t.due_date && new Date(t.due_date) < today);
            const todayTasks = filtered.filter(t => t.due_date && new Date(t.due_date).toDateString() === today.toDateString());
            const tomorrowTasks = filtered.filter(t => t.due_date && new Date(t.due_date).toDateString() === tomorrow.toDateString());
            const thisWeek = filtered.filter(t => t.due_date && new Date(t.due_date) > tomorrow && new Date(t.due_date) <= weekEnd);
            const later = filtered.filter(t => t.due_date && new Date(t.due_date) > weekEnd);
            const noDueDate = filtered.filter(t => !t.due_date);
            
            const TaskRow = ({ task }) => (
              <div key={task.id} onClick={() => openEditModal(task)} style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', margin: '0 0 6px 0', color: '#1a1a1a', fontWeight: '500' }}>{task.title}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', background: task.status === 'pending' ? '#ef4444' : task.status === 'in_progress' ? '#f59e0b' : '#10b981', color: 'white', padding: '2px 6px', borderRadius: '3px', fontWeight: '600' }}>{task.status.toUpperCase()}</span>
                    <span style={{ fontSize: '10px', background: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#10b981', color: 'white', padding: '2px 6px', borderRadius: '3px', fontWeight: '600' }}>⚡ {task.priority}</span>
                    {task.due_date && <span style={{ fontSize: '10px', color: '#666', fontWeight: '500' }}>{task.due_date}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {task.status === 'pending' && <button onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'in_progress'); }} title="Move to In Progress" style={{ background: '#9ca3af', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>→</button>}
                  {task.status === 'in_progress' && <><button onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'pending'); }} title="Move to Pending" style={{ background: '#9ca3af', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>←</button><button onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'done'); }} title="Move to Complete" style={{ background: '#9ca3af', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>→</button></>}
                  {task.status === 'done' && <button onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'in_progress'); }} title="Move to In Progress" style={{ background: '#9ca3af', color: '#000', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>←</button>}
                  <button onClick={() => deleteTask(task.id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px' }}>Delete</button>
                </div>
              </div>
            );
            
          
  // AI Organizer Modal

  return (
              <>
                {overdue.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <div style={{ background: '#fee2e2', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', border: '2px solid #ef4444' }}>
                      <h3 style={{ color: '#991b1b', fontSize: '13px', fontWeight: '700', margin: 0 }}>🚨 OVERDUE ({overdue.length})</h3>
                    </div>
                    {overdue.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).map(t => <TaskRow task={t} />)}
                  </div>
                )}
                
                {todayTasks.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <div style={{ background: '#fef3c7', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', border: '2px solid #f59e0b' }}>
                      <h3 style={{ color: '#92400e', fontSize: '13px', fontWeight: '700', margin: 0 }}>📅 TODAY ({todayTasks.length})</h3>
                    </div>
                    {todayTasks.map(t => <TaskRow task={t} />)}
                  </div>
                )}
                
                {tomorrowTasks.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <div style={{ background: '#dbeafe', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', border: '2px solid #3b82f6' }}>
                      <h3 style={{ color: '#1e40af', fontSize: '13px', fontWeight: '700', margin: 0 }}>⏭️  TOMORROW ({tomorrowTasks.length})</h3>
                    </div>
                    {tomorrowTasks.map(t => <TaskRow task={t} />)}
                  </div>
                )}
                
                {thisWeek.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <div style={{ background: '#dbeafe', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', border: '2px solid #3b82f6' }}>
                      <h3 style={{ color: '#1e40af', fontSize: '13px', fontWeight: '700', margin: 0 }}>📆 THIS WEEK ({thisWeek.length})</h3>
                    </div>
                    {thisWeek.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).map(t => <TaskRow task={t} />)}
                  </div>
                )}
                
                {later.length > 0 && (
                  <div style={{ marginBottom: '30px' }}>
                    <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', border: '2px solid #10b981' }}>
                      <h3 style={{ color: '#15803d', fontSize: '13px', fontWeight: '700', margin: 0 }}>⏰ LATER ({later.length})</h3>
                    </div>
                    {later.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).map(t => <TaskRow task={t} />)}
                  </div>
                )}
                
                {noDueDate.length > 0 && (
                  <div>
                    <div style={{ background: '#f3f4f6', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', border: '2px solid #9ca3af' }}>
                      <h3 style={{ color: '#4b5563', fontSize: '13px', fontWeight: '700', margin: 0 }}>❓ NO DUE DATE ({noDueDate.length})</h3>
                    </div>
                    {noDueDate.map(t => <TaskRow task={t} />)}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}</>)}

            {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#1a1a1a', margin: '0 0 12px 0' }}>{editingTask ? 'Edit Task' : 'New Task'}</h2>

            {sourceNote && (
              <div style={{ background: '#f0f4ff', border: '1px solid #c7d2fe', borderLeft: '4px solid #667eea',
                            borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#667eea', fontWeight: 700, textTransform: 'uppercase',
                              letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Came from {sourceNote.type || 'a note'}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>{sourceNote.title}</div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                  {String(sourceNote.created_at || '').slice(0, 10)}
                </div>
                <div style={{ fontSize: '13px', color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                              maxHeight: showNoteFull ? 'none' : '64px', overflow: 'hidden' }}>
                  {sourceNote.excerpt}
                </div>
                <button onClick={() => setShowNoteFull(!showNoteFull)}
                  style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer',
                           fontSize: '12px', fontWeight: 600, padding: '6px 0 0 0' }}>
                  {showNoteFull ? 'Show less' : 'Read the note'}
                </button>
              </div>
            )}
            <label style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a', fontWeight: 'bold', fontSize: '12px' }}>TITLE</label>
            <input type="text" placeholder="Task title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} style={inputStyle} />
            <label style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a', fontWeight: 'bold', fontSize: '12px' }}>DESCRIPTION</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <button onClick={generateDescription} disabled={generatingDesc} style={{ flex: 1, padding: '8px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{generatingDesc ? 'Generating...' : '✨ AI Generate'}</button>
              <button onClick={aiBreakdown} disabled={aiBreakdownLoading || !formData.description} style={{ flex: 1, padding: '8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{aiBreakdownLoading ? 'Breaking...' : '🧠 Break Down'}</button>
            </div>
            <textarea placeholder="Details..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} style={{...inputStyle, minHeight: '80px'}} />
            <label style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a', fontWeight: 'bold', fontSize: '12px' }}>DUE DATE</label>
            <input type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} style={inputStyle} />
            <label style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a', fontWeight: 'bold', fontSize: '12px' }}>PRIORITY</label>
            <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} style={inputStyle}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <label style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a', fontWeight: 'bold', fontSize: '12px' }}>STATUS</label>
            <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} style={inputStyle}>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
            <label style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a', fontWeight: 'bold', fontSize: '12px' }}>VENTURE</label>
            <select value={formData.venture_id} onChange={(e) => setFormData({...formData, venture_id: parseInt(e.target.value), project_id: null})} style={inputStyle}>
              {ventures.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <label style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a', fontWeight: 'bold', fontSize: '12px' }}>PROJECT</label>
            <input type="text" placeholder="Search projects..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '6px', border: '1px solid #ddd', borderRadius: '6px', boxSizing: 'border-box', fontSize: '14px', color: '#1a1a1a', background: '#ffffff' }} />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).map(p => (
                <button key={p.id} onClick={() => { setFormData({...formData, project_id: p.id}); setProjectSearch(''); }} style={{ background: formData.project_id === p.id ? p.color : '#f0f0f0', color: formData.project_id === p.id ? 'white' : '#1a1a1a', padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>{p.name}</button>
              ))}
            </div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a', fontWeight: 'bold', fontSize: '12px' }}>HOURS</label>
            <input type="number" placeholder="0" value={formData.time_spent_hours} onChange={(e) => setFormData({...formData, time_spent_hours: parseFloat(e.target.value) || 0})} style={inputStyle} />
            <TagDropdown label="TAGS" selectedTags={formData.tags} onToggle={toggleTag} searchValue={tagSearch} onSearchChange={setTagSearch} />
            <div style={{ marginBottom: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#1a1a1a', fontWeight: 'bold', fontSize: '12px' }}>FILES <span style={{ fontWeight: 'normal', color: '#999' }}>(optional)</span></label>
              {editingTask ? (<><input type="file" onChange={(e) => uploadFile(editingTask.id, e.target.files[0])} style={{ marginBottom: '8px', color: '#1a1a1a' }} />{uploadingFile === editingTask.id && <p style={{ fontSize: '12px', color: '#667eea' }}>⏳ Uploading...</p>}{(attachments[editingTask.id] || []).length > 0 && <div><p style={{ fontSize: '12px', color: '#1a1a1a', marginBottom: '8px', fontWeight: 'bold' }}>Attached Files:</p>{(attachments[editingTask.id] || []).map(att => (<div key={att.id} style={{ padding: '8px', background: '#fff', borderRadius: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}><span style={{ color: '#1a1a1a' }}>📎 {att.filename}</span><a href={`${API}/api/attachments/${att.id}`} download style={{ color: '#667eea', textDecoration: 'none', fontSize: '11px' }}>Download</a></div>))}</div>}</>) : (<p style={{ fontSize: '12px', color: '#999' }}>💾 Save task first to add files</p>)}
            </div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a', fontWeight: 'bold', fontSize: '12px' }}>SUBTASKS</label>
            {editingTask && (
              <div style={{ marginBottom: '12px', padding: '12px', background: '#f5f5f5', borderRadius: '6px' }}>
                {subtasks.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    {subtasks.map((st, idx) => (
                      <div key={idx} style={{ padding: '8px', background: '#fff', borderRadius: '4px', marginBottom: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" defaultChecked={st.status === 'done'} onChange={(e) => {}} style={{ cursor: 'pointer' }} />
                        <span style={{ flex: 1, color: st.status === 'done' ? '#ccc' : '#1a1a1a', textDecoration: st.status === 'done' ? 'line-through' : 'none' }}>{st.title}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="text" placeholder="New subtask..." value={newSubtaskTitle} onChange={(e) => setNewSubtaskTitle(e.target.value)} style={{ flex: 1, padding: '6px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px' }} />
                  <button onClick={addSubtask} style={{ padding: '6px 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>+</button>
                </div>
              </div>
            )}
            {!editingTask && <p style={{ fontSize: '12px', color: '#999', marginBottom: '12px' }}>💾 Save task first to add subtasks</p>}

            <label style={{ display: 'block', marginBottom: '4px', color: '#1a1a1a', fontWeight: 'bold', fontSize: '12px' }}>NOTES</label>
            <textarea placeholder="Notes..." value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} style={{...inputStyle, minHeight: '60px', marginBottom: '20px'}} />
            <div style={{ display: 'flex', gap: '10px' }}><button onClick={addOrUpdateTask} style={{ flex: 1, background: '#667eea', color: 'white', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button><button onClick={() => setShowAddModal(false)} style={{ flex: 1, background: '#ddd', color: '#333', padding: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}