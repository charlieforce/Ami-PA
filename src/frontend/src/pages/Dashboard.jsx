import TodayStrip from '../components/TodayStrip';
import React, { useState, useEffect, useRef } from 'react';
import { startVoiceInput } from '../services/VoiceService';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

import { chatWithAmi, getMorningBriefing, getAmiIdentity, getTodayTodos, parseVoiceCommand, createTodo, getTodayBriefing, generateMorningBriefing, storeBriefingMessage, generateEveningBriefing, chatAboutNews, orchestratedChat, orchestratedChatStream } from '../utils/api';
import TodoPage from './TodoPage';
import BriefingPage from './BriefingPage';
import TasksKanban from './TasksKanban';
import BriefingTab from './BriefingTab';
import SettingsPage from './SettingsPage';
import ShoppingListsNew from '../components/ShoppingListsNew';
import EveningReminder from '../components/EveningReminder';
import RemindersList from '../components/RemindersList';
import MorningBriefingModal from '../components/MorningBriefingModal';
import NotesTab from './NotesTab';
import BirthdayCalendar from './BirthdayCalendar';
import TestPage from './TestPage';
import AmiTaskView from './AmiTaskView';
import Calendar from './Calendar';
import AdminPortal from './AdminPortal';
import '../styles/DashboardMobile.css';
import ReportTab from '../components/ReportTab';
import SportsTab from '../components/SportsTab';
import MedicalTab from '../components/MedicalTab';
import LearningTab from '../components/LearningTab';
import SubscriptionsTab from '../components/SubscriptionsTab';
import FitnessTab from '../components/FitnessTab';
import PricesTab from '../components/PricesTab';



const dayLabel = (ts) => {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d)) return null;
  const now = new Date();
  const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate())
                         - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
const clockTime = (ts) => {
  const d = new Date(ts);
  return isNaN(d) ? '' : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

function Dashboard({ onLogout }) {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [amiGreeting, setAmiGreeting] = useState('');
  const [briefing, setBriefing] = useState(null);
  const [showBriefing, setShowBriefing] = useState(false);
  const [amiImage, setAmiImage] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [correcting, setCorrecting] = useState(null);
  const [correction, setCorrection] = useState('');
  const [correctedMsgs, setCorrectedMsgs] = useState([]);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [chatSearch, setChatSearch] = React.useState('');
  const [searchHits, setSearchHits] = React.useState([]);

  const runChatSearch = async (q) => {
    setChatSearch(q);
    if (q.trim().length < 2) { setSearchHits([]); return; }
    try {
      const r = await fetch(API + '/api/chat/search?q=' + encodeURIComponent(q),
                            { headers: { 'X-Ami-Password': AMI_PASSWORD } });
      const j = await r.json();
      setSearchHits(j.hits || []);
    } catch (e) { setSearchHits([]); }
  };

  const [viewingDay, setViewingDay] = React.useState(null);

  const openDay = async (day) => {
    try {
      const r = await fetch(API + '/api/chat/history?day=' + encodeURIComponent(day),
                            { headers: { 'X-Ami-Password': AMI_PASSWORD } });
      const j = await r.json();
      setMessages(j.messages || []);
      setViewingDay(day);
      setSearchOpen(false);
      setChatSearch(''); setSearchHits([]);
    } catch (e) { /* stay where we are */ }
  };

  const backToToday = async () => {
    setViewingDay(null);
    await loadTodaysChat();
  };

  const loadTodaysChat = async () => {
    try {
      const r = await fetch(API + '/api/chat/history', {
        headers: { 'X-Ami-Password': AMI_PASSWORD } });
      const j = await r.json();
      if (j.messages && j.messages.length) setMessages(j.messages);
    } catch (e) { /* a fresh screen is fine */ }
  };

  useEffect(() => { loadTodaysChat(); }, []);

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  const [activeTab, setActiveTab] = useState(() => {
    const validTabs = ['home', 'today', 'tasks', 'todos', 'notes', 'shopping', 'reminders', 'briefing', 'amiView', 'admin', 'birthdays', 'menu'];
    const saved = localStorage.getItem('activeTab');
    return validTabs.includes(saved) ? saved : 'home';
  });
  
  // Save activeTab to localStorage when it changes
  
  const syncTasksToTodos = async () => {
    try {
      const res = await fetch(API + '/api/todos/sync-from-tasks', {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const result = await res.json();
      console.log('✅ Tasks synced:', result.synced);
    } catch (e) {
      console.error('Sync error:', e);
    }
  };

  const syncCalendarToTodos = async () => {
    try {
      const res = await fetch(API + '/api/todos/sync-from-calendar', {
        method: 'POST',
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const result = await res.json();
      console.log('✅ Calendar synced:', result.synced);
    } catch (e) {
      console.error('Sync error:', e);
    }
  };

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);
  const [briefingMessage, setBriefingMessage] = useState('');
  const [selectedNews, setSelectedNews] = useState(null);
  const [eveningBriefing, setEveningBriefing] = useState('');
  
  const [showMorningBriefing, setShowMorningBriefing] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [todoCount, setTodoCount] = useState(0);
  const [todayStats, setTodayStats] = useState({ completed: 0, total: 0, progress: 0 });
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const recognition = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-detect and update timezone on app load

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const t = await fetch('/api/tasks', { headers: { 'X-Ami-Password': AMI_PASSWORD } }).then(r => r.json());
        const pending = t.tasks ? t.tasks.filter(x => x.status === 'pending').length : 0;
        setTaskCount(pending);
        
        const td = await fetch('/api/todos/today', { headers: { 'X-Ami-Password': AMI_PASSWORD } }).then(r => r.json());
        setTodoCount(td.total || 0);
      } catch (e) {
        console.error('Error loading counts:', e);
      }
    };
    loadCounts();
  }, []);


  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    fetch(API + '/api/timezone/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ami-Password': AMI_PASSWORD
      },
      body: JSON.stringify({ timezone })
    }).catch(e => console.log('Timezone updated:', timezone));
  }, []);


  const silenceTimeout = useRef(null);

  
  
  const handleNewsClick = (newsTitle) => {
    setSelectedNews(newsTitle);
    const userMessage = { role: 'user', text: `Tell me more about: ${newsTitle}` };
    setMessages([...messages, userMessage]);
    
    chatAboutNews(newsTitle)
      .then(data => {
        const amiMessage = { role: 'ami', text: data.response, at: new Date().toISOString() };
        setMessages(prev => [...prev, amiMessage]);
      })
      .catch(err => console.error('News chat error:', err));
  };

  // Briefing is delivered by Ami in chat, once per slot - see orchestrated_chat

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const identity = await getAmiIdentity();
        setAmiGreeting(identity.greeting || "Yo Charlie! Ready to crush it?");
        setAmiImage('/ami.png');
        
        const todos = await getTodayTodos();
        setTodayStats(todos);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      }
    };

    initDashboard();
    
    // Setup speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;
      recognition.current.language = 'en-US';

      recognition.current.onstart = () => {
        console.log('Listening started');
      };

      recognition.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Show interim transcript (what's being heard)
        if (interimTranscript) {
          setTranscript(interimTranscript);
        }

        // Set final message when speech ends
        if (finalTranscript) {
          setMessage(prev => prev + finalTranscript);
          setTranscript('');

          // Auto-send after 2 seconds of silence
          clearTimeout(silenceTimeout.current);
          silenceTimeout.current = setTimeout(() => {
            if (finalTranscript.trim()) {
              handleSendMessage(finalTranscript.trim());
            }
          }, 2000);
        }
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };

      recognition.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    
  return () => clearInterval(timer);
  }, [])
;

  // Anything Ami sent on her own - reminders firing, nudges, warnings - shows up here.
  useEffect(() => {
    let stop = false;
    const pull = async () => {
      if (document.hidden || stop) return;
      try {
        const r = await fetch(API + '/api/chat/proactive', { headers: { 'X-Ami-Password': AMI_PASSWORD } });
        const j = await r.json();
        const fresh = j.messages || [];
        if (fresh.length) {
          setMessages(prev => [...prev, ...fresh.map(m => ({ role: 'ami', text: m.text, at: new Date().toISOString() }))]);
          // a soft chime and a count on the tab, so they are not missed while looking elsewhere
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            [880, 1320].forEach((hz, i) => {
              const o = ctx.createOscillator(), g = ctx.createGain();
              o.type = 'sine'; o.frequency.value = hz;
              g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
              g.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + i * 0.18 + 0.02);
              g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.30);
              o.connect(g); g.connect(ctx.destination);
              o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.32);
            });
          } catch (e) { /* browser not ready for sound yet */ }
          if (document.hidden) {
            const base = document.title.replace(/^\(\d+\)\s*/, '');
            const n = (parseInt((document.title.match(/^\((\d+)\)/) || [])[1] || 0, 10)) + fresh.length;
            document.title = '(' + n + ') ' + base;
            const clear = () => {
              if (!document.hidden) {
                document.title = document.title.replace(/^\(\d+\)\s*/, '');
                document.removeEventListener('visibilitychange', clear);
              }
            };
            document.addEventListener('visibilitychange', clear);
          }
          fetch(API + '/api/chat/proactive/seen', {
            method: 'POST',
            headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: fresh.map(m => m.id) })
          }).catch(() => {});
        }
      } catch (e) { /* offline - try again next time */ }
    };
    pull();
    const t = setInterval(pull, 60000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  const [showJump, setShowJump] = useState(false);

  const chatBox = () => {
    const end = messagesEndRef.current;
    let el = end ? end.parentElement : null;
    while (el && el !== document.body && el !== document.documentElement) {
      const oy = window.getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el;
      el = el.parentElement;
    }
    return null;
  };

  useEffect(() => {
    const el = chatBox();
    if (!el) return;
    const onScroll = () => {
      const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowJump(fromBottom > 240);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [messages.length]);

  const scrollToBottom = () => {
    // scroll only the chat box, never the whole page - so the header stays where it is
    const end = messagesEndRef.current;
    let el = end ? end.parentElement : null;
    while (el && el !== document.body && el !== document.documentElement) {
      const oy = window.getComputedStyle(el).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) {
        el.scrollTop = el.scrollHeight;
        return;
      }
      el = el.parentElement;
    }
    // no scrolling box found - the page itself scrolls, so bring the last message into view gently
    end?.scrollIntoView({ block: 'end' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMicClick = () => {
    if (recognition.current) {
      if (isListening) {
        recognition.current.stop();
        setIsListening(false);
        setTranscript('');
      } else {
        setMessage('');
        setTranscript('');
        recognition.current.start();
        setIsListening(true);
      }
    }
  };

  
  // Detect if message is a potential todo
  const detectTodoPattern = (text) => {
    const patterns = [
      /i\s+(have\s+to|need\s+to|should|gotta|must)\s+(.+?)(?:tomorrow|today|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\.|$)/i,
      /(?:tomorrow|today|next)\s+i\s+(?:need\s+to|have\s+to|should|gotta)\s+(.+?)(?:\.|$)/i,
      /remind\s+me\s+(?:to)?\s+(.+?)(?:tomorrow|today|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\.|$)/i
    ];
    
    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const todoTitle = match[match.length - 1]?.trim() || text;
        const hasTomorrow = /tomorrow/.test(text);
        const hasHigh = /urgent|important|critical|asap|immediately|now/.test(text);
        
        return {
          detected: true,
          title: todoTitle.substring(0, 100),
          due_date: hasTomorrow ? new Date(Date.now() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          priority: hasHigh ? 'high' : 'medium'
        };
      }
    }
    return { detected: false };
  };

  const handleAddTodoFromChat = async (todoData) => {
    try {
      const res = await fetch(API + '/api/todos/from-chat', {
        method: 'POST',
        headers: { 
          'X-Ami-Password': AMI_PASSWORD,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(todoData)
      });
      const result = await res.json();
      if (result.status === 'success') {
        setMessages(prev => [...prev, {
          role: 'ami',
          at: new Date().toISOString(),
          text: `✅ ${result.message}\n\n${todoData.title}\n🔴 Priority: ${todoData.priority}\n📅 Due: ${todoData.due_date}`
        }]);
      }
    } catch (e) {
      console.error('Error adding todo:', e);
    }
  };

const handleSendMessage = async (msgToSend = null) => {
    const finalMessage = msgToSend || message;
    
    if (!finalMessage.trim()) return;

    if (isOffline) {
      setMessages(prev => [...prev,
        { role: 'user', text: finalMessage, at: new Date().toISOString() },
        { role: 'ami', text: "No connection right now, bo. Everything you saved is still here to read - I'll be back when you're online.", at: new Date().toISOString() }
      ]);
      setMessage('');
      return;
    }

    // Show message IMMEDIATELY (non-blocking)
    setMessages(prev => [...prev, { role: 'user', text: finalMessage, at: new Date().toISOString() }]);
    setMessage('');
    setTranscript('');
    setTimeout(() => inputRef.current?.focus(), 100);

    // Her words appear as she writes them; the finished reply replaces the draft at the end.
    const sid = Date.now() + Math.random();
    let started = false;
    const showFinal = (text) => {
      setMessages(prev => started
        ? prev.map(m => m._sid === sid ? { role: 'ami', text, at: m.at || new Date().toISOString() } : m)
        : [...prev, { role: 'ami', text, at: new Date().toISOString() }]);
    };
    orchestratedChatStream(finalMessage, (piece) => {
      if (!started) {
        started = true;
        setMessages(prev => [...prev, { role: 'ami', text: piece, _sid: sid, at: new Date().toISOString() }]);
      } else {
        setMessages(prev => prev.map(m => m._sid === sid ? { ...m, text: m.text + piece } : m));
      }
    })
      .then(final => showFinal(final.response || 'Eh bai!'))
      .catch(err => {
        console.error('Chat stream error:', err);
        if (err && err.beforeSend) {
          // streaming not available - nothing was processed, safe to use the ordinary route
          orchestratedChat(finalMessage)
            .then(r => showFinal(r.response))
            .catch(() => setMessages(prev => [...prev, { role: 'error', text: 'Connection error' }]));
        } else {
          setMessages(prev => [...prev, { role: 'error', text: 'Connection dropped - she may still have answered. Refresh to check.' }]);
        }
      });
  };

  // Detect if message is a potential task
  const detectTaskPattern = (text) => {
    const patterns = [
      /(?:need\s+to|have\s+to|should|gotta|must|finish|complete|build|create|design|write|review|prepare)\s+(.+?)(?:by|before|on|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\.|$)/i,
      /(?:working\s+on|building|creating|designing|writing)\s+(.+?)(?:for|to|that|\.|$)/i,
      /(?:todo|task):\s+(.+?)(?:by|before|\.|$)/i
    ];
    
    for (let pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const taskTitle = match[match.length - 1]?.trim() || text;
        const hasHigh = /urgent|important|critical|asap|immediately|before|deadline/.test(text);
        const hasVenture = /gii|techievet|fundiconnect|promoga|fiduconnect/i.test(text);
        
        return {
          detected: true,
          title: taskTitle.substring(0, 100),
          priority: hasHigh ? 'high' : 'medium',
          venture: hasVenture ? text.match(/gii|techievet|fundiconnect|promoga|fundiconnect/i)?.[0] : null
        };
      }
    }
    return { detected: false };
  };

  const handleAddTaskFromChat = async (taskData) => {
    try {
      const res = await fetch(API + '/api/tasks', {
        method: 'POST',
        headers: { 
          'X-Ami-Password': AMI_PASSWORD,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          title: taskData.title,
          priority: taskData.priority,
          project: taskData.venture || 'General'
        })
      });
      const result = await res.json();
      if (result.id) {
        setMessages(prev => [...prev, {
          role: 'ami',
          text: `✅ Task created: ${taskData.title}\n🔴 Priority: ${taskData.priority}${taskData.venture ? `\n📁 Project: ${taskData.venture}` : ''}`
        }]);
      }
    } catch (e) {
      console.error('Error adding task:', e);
    }
  };


  const speakMessage = (text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1];

  return (
    <div className="dashboard-mobile">
      {correcting && (
        <div onClick={() => setCorrecting(null)}
             style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()}
               style={{ background: '#1a1a1a', borderRadius: '12px', padding: '16px',
                        width: '100%', maxWidth: '520px', border: '1px solid #333' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#eee', marginBottom: '10px' }}>
              What should she have said?
            </div>
            <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.5, marginBottom: '10px',
                          maxHeight: '90px', overflowY: 'auto', background: '#141414',
                          padding: '8px', borderRadius: '6px' }}>
              {correcting}
            </div>
            <textarea autoFocus value={correction} onChange={e => setCorrection(e.target.value)}
                      placeholder="The right answer, or what she got wrong"
                      style={{ width: '100%', minHeight: '90px', padding: '10px', fontSize: '15px',
                               background: '#141414', color: '#eee', border: '1px solid #333',
                               borderRadius: '8px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={async () => {
                        if (!correction.trim()) return;
                        await fetch(API + '/api/chat/correct', {
                          method: 'POST',
                          headers: { 'X-Ami-Password': AMI_PASSWORD, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ wrong: correcting, right: correction })
                        });
                        setCorrectedMsgs(prev => [...prev, correcting]);
                        setCorrecting(null); setCorrection('');
                        setMessages(prev => [...prev, { role: 'ami', text: 'Noted, bo - a done save di correct one.', at: new Date().toISOString() }]);
                      }}
                      style={{ flex: 1, padding: '12px', minHeight: '46px', background: '#10b981',
                               color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px',
                               fontWeight: 600, cursor: 'pointer' }}>
                Save it
              </button>
              <button onClick={() => setCorrecting(null)}
                      style={{ padding: '12px 18px', minHeight: '46px', background: '#2a2a2a',
                               color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px',
                               cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isOffline && (
        <div style={{ position: 'sticky', top: 0, zIndex: 900, background: '#78350f', color: '#fde68a',
                      padding: '8px 12px', fontSize: '12px', textAlign: 'center' }}>
          You're offline - showing what was saved last time. Chat and changes need a connection.
        </div>
      )}
      {/* Evening Reminder */}
      <EveningReminder amiImage={amiImage} />

      {/* Header - Fixed Top */}
      <div className="mobile-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '8px', paddingRight: '8px'}}>
        <div className="header-left" style={{display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0px', paddingTop: '4px', paddingBottom: '8px'}}>
          {amiImage && <div style={{padding: '6px', background: '#1a1a1a', borderRadius: '50%', marginLeft: '-8px'}}><img src={amiImage} alt="Ami" style={{width: '70px', height: '70px', borderRadius: '50%', border: '2px solid #FF6B6B', boxShadow: '0 2px 8px rgba(255, 107, 107, 0.3)', objectFit: 'cover', display: 'block'}} /></div>}
          <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
            <p style={{fontSize: '10px', fontWeight: '600', color: '#999', margin: 0, letterSpacing: '0.5px'}}>AI ASSISTANT</p>
            <h2 style={{fontSize: '14px', fontWeight: 'bold', color: '#FF6B6B', margin: 0, whiteSpace: 'nowrap'}}>😠 Angry Ami</h2>
            <p style={{fontSize: '10px', color: '#ffffff', margin: 0, fontStyle: 'italic', fontWeight: '500'}}>Ready to hustle</p>
          </div>
        </div>
        
        <div className="header-right" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
          <button onClick={() => { setSearchOpen(!searchOpen); setChatSearch(''); setSearchHits([]); }}
                  title="Search what you have said"
                  style={{background: 'none', border: 'none', fontSize: '17px', cursor: 'pointer',
                          color: searchOpen ? '#a78bfa' : '#7a7a8c', padding: '6px 8px'}}>🔍</button>
          <button onClick={() => setActiveTab('admin')} style={{background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', transition: 'all 0.2s'}} title="Settings">⚙️</button>
          <button className="logout-btn" onClick={onLogout} style={{fontSize: '12px', padding: '6px 12px', borderRadius: '4px', background: '#FF6B6B', border: 'none', color: 'white', cursor: 'pointer', fontWeight: '600'}}>Logout</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="mobile-content">
        {/* Morning Briefing Modal - NEW */}
        {showMorningBriefing && (
          <MorningBriefingModal 
            onClose={() => setShowMorningBriefing(false)}
            amiImage={amiImage}
          />
        )}

        {activeTab === 'home' && (
          <>
            <div style={{display: 'none'}}>






            </div>
            <TodayStrip onAsk={(q) => { setMessage(q); }} />
            {searchOpen && (
              <div style={{ background: '#15151c', borderBottom: '1px solid #26263a', padding: '10px 12px' }}>
                <div style={{ position: 'relative' }}>
                  <input autoFocus value={chatSearch} onChange={e => runChatSearch(e.target.value)}
                         placeholder="Find something either of you said"
                         style={{ width: '100%', padding: '11px 36px 11px 13px', background: '#1d1d26',
                                  border: '1px solid #2c2c3a', borderRadius: '10px', color: '#fff',
                                  fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                  {chatSearch && (
                    <button onClick={() => { setChatSearch(''); setSearchHits([]); }}
                            style={{ position: 'absolute', right: '6px', top: '50%',
                                     transform: 'translateY(-50%)', background: 'none', border: 'none',
                                     color: '#6b6b7c', fontSize: '16px', cursor: 'pointer',
                                     padding: '6px 8px', lineHeight: 1 }}>×</button>
                  )}
                </div>
                {chatSearch.length > 1 && (
                  <div style={{ fontSize: '11px', color: '#6b6b7c', margin: '8px 2px 4px' }}>
                    {searchHits.length ? searchHits.length + ' found' : 'nothing found'}
                  </div>
                )}
                <div style={{ maxHeight: '46vh', overflowY: 'auto' }}>
                  {searchHits.map((h, i) => (
                    <div key={i} onClick={() => openDay(h.day)}
                         style={{ padding: '9px 11px', marginBottom: '6px', borderRadius: '8px',
                                  cursor: 'pointer',
                                  background: h.role === 'user' ? '#1f1f33' : '#1a1a22',
                                  borderLeft: '2px solid ' + (h.role === 'user' ? '#4f46e5' : '#2c2c3a') }}>
                      <div style={{ fontSize: '10px', color: '#6b6b7c', marginBottom: '3px' }}>
                        {h.role === 'user' ? 'you' : 'Ami'} · {h.day}
                      </div>
                      <div style={{ fontSize: '13px', color: '#c8c8d4', lineHeight: 1.45 }}>…{h.text}…</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {viewingDay && (
              <div style={{ background: '#262040', borderBottom: '1px solid #3a3a55',
                            padding: '9px 12px', display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', gap: '8px',
                            position: 'sticky', top: 0, zIndex: 85 }}>
                <span style={{ fontSize: '12px', color: '#a78bfa' }}>
                  Looking at {viewingDay}
                </span>
                <button onClick={backToToday}
                        style={{ background: '#1d1d26', border: '1px solid #3a3a55', color: '#c8c8d4',
                                 borderRadius: '14px', padding: '6px 13px', fontSize: '12px',
                                 cursor: 'pointer', minHeight: '32px' }}>
                  Back to today
                </button>
              </div>
            )}
            <div className="chat-container-mobile">
              <div className="messages">

{messages.map((msg, idx) => (
                  <React.Fragment key={idx}>
                  {dayLabel(msg.at) && dayLabel(msg.at) !== (idx > 0 ? dayLabel(messages[idx - 1].at) : null) && (
                    <div style={{ textAlign: 'center', margin: '14px 0 6px' }}>
                      <span style={{ background: '#1d1d26', padding: '4px 12px', borderRadius: '11px',
                                     fontSize: '11px', color: '#6b6b7c' }}>{dayLabel(msg.at)}</span>
                    </div>
                  )}
                  <div className={`message ${msg.role}`}>
                    {msg.role === 'ami' && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        {amiImage && <img src={amiImage} alt="Ami" className="msg-avatar" />}
                      </div>
                    )}
                    <div className="message-content">
                      {msg.text}
                      {msg.role === 'ami' && msg.text && msg.text.length > 20 && !correctedMsgs.includes(msg.text) && (
                        <button title="Put her right"
                                onClick={() => { setCorrecting(msg.text); setCorrection(''); }}
                                style={{ background: 'none', border: 'none', color: '#8b8b96',
                                         cursor: 'pointer', fontSize: '12px', padding: '0 0 0 8px',
                                         verticalAlign: 'baseline', opacity: 0.85 }}
                                onMouseOver={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = '#f87171'; }}
                                onMouseOut={e => { e.currentTarget.style.opacity = 0.85; e.currentTarget.style.color = '#8b8b96'; }}>
                          ✎
                        </button>
                      )}
                    </div>
                  </div>
                  </React.Fragment>
                ))}
                {showJump && (
        <button onClick={() => { scrollToBottom(); setShowJump(false); }}
                aria-label="Jump to the latest"
                style={{ position: 'fixed', right: '18px', bottom: '150px', zIndex: 40,
                         width: '40px', height: '40px', borderRadius: '20px',
                         border: '1px solid #3a3357', background: '#262040',
                         color: '#a78bfa', fontSize: '17px', cursor: 'pointer',
                         boxShadow: '0 3px 10px rgba(0,0,0,0.4)' }}>
          ↓
        </button>
      )}
      <div ref={messagesEndRef} />
              </div>

              {/* Listening Indicator */}
              {isListening && (
                <div className="listening-indicator">
                  <div className="listening-wave">
                    <span></span><span></span><span></span><span></span>
                  </div>
                  <div className="listening-text">
                    {transcript ? (
                      <p>"{transcript}"</p>
                    ) : (
                      <p>Listening...</p>
                    )}
                  </div>
                </div>
              )}

              {showEmojis && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px',
                              padding: '8px', marginBottom: '6px', marginLeft: 'auto',
                              width: 'fit-content', borderRadius: '12px',
                              background: '#f5f5f5', border: '1px solid #ddd',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                  {['\uD83D\uDC4D\uD83C\uDFFF', '\uD83D\uDC4E\uD83C\uDFFF', '\u2764\uFE0F',
                    '\uD83D\uDD25', '\uD83D\uDE0A', '\uD83D\uDE02', '\uD83D\uDE22',
                    '\uD83E\uDD14', '\u2753', '\uD83D\uDE4C\uD83C\uDFFF'].map((em) => (
                    <button
                      key={em}
                      onClick={() => {
                        setShowEmojis(false);
                        if (!message.trim()) {
                          setMessage(em);
                          setTimeout(() => handleSendMessage(), 50);
                        } else {
                          setMessage(message + ' ' + em);
                        }
                      }}
                      style={{ fontSize: '26px', background: '#fff', border: '1px solid #e0e0e0',
                               borderRadius: '10px', cursor: 'pointer', padding: '6px',
                               minWidth: '46px', minHeight: '46px', flexShrink: 0, lineHeight: 1 }}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              <div className="chat-input-mobile">
                <div className="input-wrapper">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={isListening ? "🎤 Listening..." : "Type or tap mic..."}
                    value={message + interimText}
                    disabled={loading}
                    className="chat-input-field"
                  />
                  <button
                    onClick={() => setShowEmojis(!showEmojis)}
                    style={{ fontSize: '20px', background: showEmojis ? '#4a4a4a' : 'none',
                             border: 'none', borderRadius: '10px', cursor: 'pointer',
                             padding: '6px', minWidth: '40px', minHeight: '40px' }}
                    title="Emojis"
                  >
                    {'\uD83D\uDE00'}
                  </button>

                  <button 
                    onClick={() => {
                      if (isListening) {
                        setIsListening(false);
                      } else {
                        setIsListening(true);
                        startVoiceInput(
                          (finalText) => {
                            setMessage(message + (message ? ' ' : '') + finalText);
                            setInterimText('');
                            setIsListening(false);
                          },
                          (error) => {
                            console.error('Voice error:', error);
                            setIsListening(false);
                          },
                          (interim) => {
                            setInterimText(interim);
                          }
                        );
                      }
                    }}
                    style={{padding: '0', background: isListening ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '18px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)', transition: 'all 0.2s ease'}}
                  >{isListening ? '⏹️' : '🎤'}</button>
                  <button 
                    onClick={() => handleSendMessage()}
                    disabled={loading || !message.trim()}
                    style={{padding: '0', background: 'linear-gradient(135deg, #4A90E2 0%, #357ABD 100%)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '20px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)', transition: 'all 0.2s ease'}}
                  >→</button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'today' && (
          <TodayBriefing amiImage={amiImage} />
        )}

        {activeTab === 'tasks' && <TasksKanban amiImage={amiImage} />}
        {activeTab === 'todos' && <TodoPage amiImage={amiImage} />}
        {activeTab === 'amiView' && <AmiTaskView />}

        {activeTab === 'shopping' && (
          <ShoppingListsNew />
        )}

        {activeTab === 'reminders' && (
          <RemindersList amiImage={amiImage} />
        )}

        {activeTab === 'calendar' && <Calendar />}

        {activeTab === 'notes' && (
          <NotesTab />
        )}

      {activeTab === 'briefing' && <BriefingTab />}
      {activeTab === 'subscriptions' && <SubscriptionsTab />}
      {activeTab === 'learning' && <LearningTab />}
      {activeTab === 'prices' && <PricesTab />}
      {activeTab === 'fitness' && <FitnessTab />}
      {activeTab === 'medical' && <MedicalTab />}
      {activeTab === 'report' && <ReportTab />}
      {activeTab === 'sports' && <SportsTab />}
      {activeTab === 'admin' && <AdminPortal />}
      {activeTab === 'birthdays' && <BirthdayCalendar />}
        {activeTab === 'menu' && (
          <div style={{padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('sports')}>
              <div style={{fontSize: '28px', marginBottom: '6px'}}>🏈</div>
              <div style={{fontWeight: 'bold', color: '#1a1a1a'}}>Sport</div>
              <div style={{fontSize: '12px', color: '#666'}}>Who is playing, and when</div>
            </div>
            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('notes')}>
              <div style={{fontSize: '28px', marginBottom: '6px'}}>📝</div>
              <div style={{fontWeight: 'bold', color: '#1a1a1a'}}>Notes</div>
              <div style={{fontSize: '12px', color: '#666'}}>Everything you wrote down</div>
            </div>
            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('briefing')}>
              <p style={{fontSize: '28px', margin: '0 0 8px 0'}}>📰</p>
              <p style={{margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '16px', color: '#333'}}>BRIEFING</p>
              <p style={{margin: 0, fontSize: '13px', color: '#555'}}>Daily briefing</p>
            </div>
            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('birthdays')}>
              <p style={{fontSize: '28px', margin: '0 0 8px 0'}}>🎂</p>
              <p style={{margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '16px', color: '#333'}}>BIRTHDAYS</p>
              <p style={{margin: 0, fontSize: '13px', color: '#555'}}>All birthdays</p>
            </div>
            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('shopping')}>
              <p style={{fontSize: '28px', margin: '0 0 8px 0'}}>🛒</p>
              <p style={{margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '16px', color: '#333'}}>SHOPPING</p>
              <p style={{margin: 0, fontSize: '13px', color: '#555'}}>Shopping lists</p>
            </div>
            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('reminders')}>
              <p style={{fontSize: '28px', margin: '0 0 8px 0'}}>🔔</p>
              <p style={{margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '16px', color: '#333'}}>REMINDERS</p>
              <p style={{margin: 0, fontSize: '13px', color: '#555'}}>All reminders</p>
            </div>
<div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('calendar')}>
              <p style={{fontSize: '28px', margin: '0 0 8px 0'}}>📅</p>
              <p style={{margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '16px', color: '#333'}}>CALENDAR</p>
              <p style={{margin: 0, fontSize: '13px', color: '#555'}}>Today events</p>
            </div>
            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('amiView')}>
              <p style={{fontSize: '28px', margin: '0 0 8px 0'}}>😠</p>
              <p style={{margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '16px', color: '#333'}}>AMI'S VIEW</p>
              <p style={{margin: 0, fontSize: '13px', color: '#555'}}>Your complete analysis</p>
            </div>
            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('subscriptions')}>
              <div style={{fontSize: '28px', marginBottom: '6px'}}>💳</div>
              <div style={{fontWeight: 'bold', color: '#1a1a1a'}}>Subscriptions</div>
              <div style={{fontSize: '12px', color: '#666'}}>What you pay, when</div>
            </div>

            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('learning')}>
              <div style={{fontSize: '28px', marginBottom: '6px'}}>📚</div>
              <div style={{fontWeight: 'bold', color: '#1a1a1a'}}>Learning</div>
              <div style={{fontSize: '12px', color: '#666'}}>Courses and days</div>
            </div>

            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('prices')}>
              <div style={{fontSize: '28px', marginBottom: '6px'}}>💰</div>
              <div style={{fontWeight: 'bold', color: '#1a1a1a'}}>Prices</div>
              <div style={{fontSize: '12px', color: '#666'}}>What things cost, where</div>
            </div>

            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('fitness')}>
              <div style={{fontSize: '28px', marginBottom: '6px'}}>💪</div>
              <div style={{fontWeight: 'bold', color: '#1a1a1a'}}>Fitness</div>
              <div style={{fontSize: '12px', color: '#666'}}>Plan, exercises, progress</div>
            </div>

            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('medical')}>
              <div style={{fontSize: '28px', marginBottom: '6px'}}>🩺</div>
              <div style={{fontWeight: 'bold', color: '#1a1a1a'}}>Health</div>
              <div style={{fontSize: '12px', color: '#666'}}>Meds, readings, visits</div>
            </div>


            <div style={{background: 'white', padding: '15px', borderRadius: '10px', cursor: 'pointer'}} onClick={() => setActiveTab('admin')}>
              <p style={{fontSize: '28px', margin: '0 0 8px 0'}}>⚙️</p>
              <p style={{margin: '0 0 4px 0', fontWeight: 'bold', fontSize: '16px', color: '#333'}}>ADMIN</p>
              <p style={{margin: 0, fontSize: '13px', color: '#555'}}>Settings & ventures</p>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Navigation - Fixed */}
      <div className="mobile-nav">
        <button 
          className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
          title="Home"
        >
          🏠 HOME
        </button>
        <button 
          className={`nav-btn ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
          title="How things are going"
        >
          📊 REPORT
        </button>
        <button 
          className={`nav-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
          title="Tasks"
        >
          ✅ TASKS {taskCount > 0 && <span style={{fontSize: '10px', background: '#FF6B6B', color: 'white', padding: '2px 4px', borderRadius: '10px', marginLeft: '2px'}}>{taskCount}</span>}
        </button>
        <button 
          className={`nav-btn ${activeTab === 'todos' ? 'active' : ''}`}
          onClick={() => setActiveTab('todos')}
          title="TODO"
        >
          📋 TODO {todoCount > 0 && <span style={{fontSize: '10px', background: '#FF6B6B', color: 'white', padding: '2px 4px', borderRadius: '10px', marginLeft: '2px'}}>{todoCount}</span>}
        </button>
<button 
          className={`nav-btn ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu')}
          title="Menu"
        >
          ⋯ MORE
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
