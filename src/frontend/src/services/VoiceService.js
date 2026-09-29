const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const startVoiceInput = (onResult, onError, onTranscript = null) => {
  if (!SpeechRecognition) {
    onError('Voice input not supported');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let finalTranscript = '';
  let silenceTimeout;
  const SILENCE_TIMEOUT = 3000;

  recognition.onstart = () => {
    console.log('🎤 Listening... (stops after 3 seconds of silence)');
    finalTranscript = '';
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    if (onTranscript) {
      onTranscript(finalTranscript + interimTranscript);
    }

    clearTimeout(silenceTimeout);
    if (finalTranscript || interimTranscript) {
      silenceTimeout = setTimeout(() => {
        console.log('⏱️ Silence detected - stopping');
        recognition.stop();
      }, SILENCE_TIMEOUT);
    }
  };

  recognition.onend = () => {
    clearTimeout(silenceTimeout);
    console.log('✅ Final transcript:', finalTranscript.trim());
    if (finalTranscript.trim()) {
      onResult(finalTranscript.trim());
    } else {
      onError('No speech detected');
    }
  };

  recognition.onerror = (event) => {
    clearTimeout(silenceTimeout);
    console.error('❌ Voice error:', event.error);
    onError(event.error);
  };

  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'microphone' })
      .then(result => {
        if (result.state === 'granted' || result.state === 'prompt') {
          recognition.start();
        } else {
          onError('Microphone permission denied');
        }
      })
      .catch(() => recognition.start());
  } else {
    recognition.start();
  }

  return recognition;
};

// Parse time from text
const parseTime = (text) => {
  let dueDate = new Date().toISOString().split('T')[0];
  let dueTime = '09:00';

  // Absolute time: "at 3pm"
  const absoluteTimeMatch = text.match(/at\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
  if (absoluteTimeMatch) {
    let hour = parseInt(absoluteTimeMatch[1]);
    let minute = absoluteTimeMatch[2] ? parseInt(absoluteTimeMatch[2]) : 0;
    const meridiem = absoluteTimeMatch[3];
    
    if (meridiem && meridiem.toLowerCase() === 'pm' && hour !== 12) {
      hour += 12;
    } else if (meridiem && meridiem.toLowerCase() === 'am' && hour === 12) {
      hour = 0;
    }
    dueTime = hour.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0');
  }

  // Relative time: "in 2 hours"
  const relativeMatch = text.match(/in\s+(\d+)\s*(minute|hour|hours|minutes)/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const date = new Date();
    
    if (unit.includes('minute')) {
      date.setMinutes(date.getMinutes() + amount);
    } else if (unit.includes('hour')) {
      date.setHours(date.getHours() + amount);
    }
    
    dueDate = date.toISOString().split('T')[0];
    dueTime = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
  }

  // Tomorrow
  if (/tomorrow/i.test(text)) {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    dueDate = tomorrow.toISOString().split('T')[0];
  }

  // Tonight
  if (/tonight|this evening/i.test(text)) {
    dueTime = '18:00';
  }

  // Next week
  if (/next\s+week/i.test(text)) {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    dueDate = nextWeek.toISOString().split('T')[0];
  }

  // Next month
  if (/next\s+month/i.test(text)) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    dueDate = nextMonth.toISOString().split('T')[0];
  }

  // Specific day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayMatch = text.match(new RegExp(days.join('|')));
  if (dayMatch && !/next/i.test(text)) {
    const targetDay = days.indexOf(dayMatch[0].toLowerCase());
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    const targetDate = new Date(Date.now() + daysUntil * 24 * 60 * 60 * 1000);
    dueDate = targetDate.toISOString().split('T')[0];
  }

  return { dueDate, dueTime };
};

// Parse recurring pattern
const parseRecurring = (text) => {
  const t = text.toLowerCase();
  
  if (/every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(t)) {
    return 'weekly';
  }
  if (/biweekly|bi\s*weekly|every\s+two\s+weeks/i.test(t)) {
    return 'every_2_weeks';
  }
  if (/every\s+(\d+)\s*weeks?/i.test(t)) {
    const match = t.match(/every\s+(\d+)\s*weeks?/i);
    return `every_${match[1]}_weeks`;
  }
  if (/daily|every\s+day/i.test(t)) {
    return 'daily';
  }
  if (/monthly|every\s+month/i.test(t)) {
    return 'monthly';
  }
  
  return 'none';
};

// Parse single reminder from text
const parseSingleReminder = (text) => {
  const { dueDate, dueTime } = parseTime(text);
  const recurring = parseRecurring(text);

  let title = 'Reminder';
  const actionPatterns = [
    /remind\s+me\s+to\s+(.+?)(?:\s+(?:in|at|tomorrow|tonight|next|this evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday|every|daily|weekly|monthly)|\s*$)/i,
    /(?:call|text|message|email|contact)\s+(.+?)(?:\s+(?:in|at|tomorrow|tonight|next|this evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|\s*$)/i,
    /^(.+?)(?:\s+(?:in|at|tomorrow|tonight|next|this evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday|every|daily|weekly|monthly)|\s*$)/i
  ];

  for (let pattern of actionPatterns) {
    const match = text.match(pattern);
    if (match) {
      let extracted = match[1].trim();
      extracted = extracted.replace(/^remind\s+me\s+/, '').trim();
      extracted = extracted.charAt(0).toUpperCase() + extracted.slice(1);
      title = extracted || 'Reminder';
      break;
    }
  }

  let personName = '';
  const personPatterns = [
    /(?:call|text|message|email|contact)\s+(\w+)/i,
    /with\s+(\w+)/i,
    /to\s+(\w+)/i
  ];

  for (let pattern of personPatterns) {
    const match = text.match(pattern);
    if (match) {
      personName = match[1];
      break;
    }
  }

  return {
    title,
    description: text,
    type: 'Personal',
    priority: 'medium',
    due_date: dueDate,
    due_time: dueTime,
    recurring,
    person_name: personName
  };
};

// Parse BATCH reminders (multiple in one statement)
export const parseVoiceInput = (transcript) => {
  const text = transcript.trim();
  
  // Split by conjunctions: "and", "also", comma
  const separators = /\s+and\s+|,\s+|\s+also\s+/i;
  const parts = text.split(separators);

  if (parts.length > 1) {
    // Multiple reminders
    return parts.map(part => parseSingleReminder(part.trim())).filter(r => r.title !== 'Reminder');
  } else {
    // Single reminder
    return [parseSingleReminder(text)];
  }
};

// Text-to-Speech
export const speakReminder = (reminder) => {
  const synth = window.speechSynthesis;
  const text = `Got it! I'll remind you to ${reminder.title} on ${reminder.due_date} at ${reminder.due_time}`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  synth.speak(utterance);
};
