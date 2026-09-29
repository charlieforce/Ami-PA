import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [locations, setLocations] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPastEvents, setShowPastEvents] = useState(true); // NEW: Toggle past events
  const [showHelp, setShowHelp] = useState(false); // NEW: Keyboard shortcuts help

  // Venture detection & colors
  const VENTURES = {
    GII: { keywords: ['GII', 'Global Impact', 'Innovators'], color: '#667eea', bgColor: '#667eea20' },
    TechieVet: { keywords: ['TechieVet', 'Techie', 'Vet'], color: '#10b981', bgColor: '#10b98120' },
    FundiConnect: { keywords: ['FundiConnect', 'Fundi'], color: '#f59e0b', bgColor: '#f59e0b20' },
    Promoga: { keywords: ['Promoga', 'fitness'], color: '#ec4899', bgColor: '#ec489920' },
    Personal: { keywords: ['Personal', 'Private'], color: '#8b5cf6', bgColor: '#8b5cf620' }
  };

  const detectVenture = (event) => {
    const text = `${event.title} ${event.description || ''}`.toLowerCase();
    for (const [venture, config] of Object.entries(VENTURES)) {
      if (config.keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
        return venture;
      }
    }
    return 'Personal';
  };

  const getVentureColor = (event) => {
    const venture = detectVenture(event);
    return VENTURES[venture] || VENTURES.Personal;
  };

  // NEW: Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; // Don't trigger in inputs

      switch(e.key.toLowerCase()) {
        case 'escape':
          setSelectedEvent(null);
          setShowHelp(false);
          break;
        case 'arrowleft':
          setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
          break;
        case 'arrowright':
          setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
          break;
        case 't':
          if (e.ctrlKey || e.metaKey) return; // Don't override Ctrl+T
          goToToday();
          break;
        case '?':
          setShowHelp(!showHelp);
          break;
        case 'm':
          setViewMode('month');
          break;
        case 'w':
          setViewMode('week');
          break;
        case 'a':
          setViewMode('agenda');
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentDate, showHelp, viewMode]);

  useEffect(() => {
    fetchCalendar();
  }, []);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API + '/api/calendar', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (!data.events || !Array.isArray(data.events)) {
        throw new Error('Invalid calendar data');
      }
      
      setEvents(data.events);
      const uniqueLocations = [...new Set(data.events.map(e => e.location).filter(l => l))];
      setLocations(uniqueLocations);
    } catch (err) {
      console.error('Calendar fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Export to CSV
  const exportToCSV = () => {
    const csv = [
      ['Title', 'Date', 'Start Time', 'End Time', 'Location', 'Venture', 'Description'].join(','),
      ...events.map(e => [
        `"${e.title.replace(/"/g, '""')}"`,
        new Date(e.start).toLocaleDateString(),
        new Date(e.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        new Date(e.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        `"${(e.location || '').replace(/"/g, '""')}"`,
        detectVenture(e),
        `"${(e.description || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getHeatmapColor = (eventCount) => {
    if (eventCount === 0) return '#1a1a1a';
    if (eventCount === 1) return '#10b98130';
    if (eventCount === 2) return '#10b98160';
    if (eventCount === 3) return '#10b98190';
    return '#10b981';
  };

  const getWeekStats = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const weekEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    const dayBusiness = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    weekEvents.forEach(event => {
      const day = days[new Date(event.start).getDay()];
      dayBusiness[day] = (dayBusiness[day] || 0) + 1;
    });

    const busiestDay = Object.entries(dayBusiness).sort((a, b) => b[1] - a[1])[0];
    const totalMeetings = weekEvents.length;
    const freeDays = Object.keys(dayBusiness).length === 0 ? 7 : 7 - Object.keys(dayBusiness).length;

    return { totalMeetings, busiestDay, freeDays, dayBusiness };
  };

  const stats = getWeekStats();

  const getEventsForDate = (date) => {
    let dateEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });

    if (!showPastEvents) {
      const now = new Date();
      dateEvents = dateEvents.filter(e => new Date(e.end) > now);
    }

    return dateEvents;
  };

  const getEventsForWeek = (date) => {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    let weekEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    if (!showPastEvents) {
      const now = new Date();
      weekEvents = weekEvents.filter(e => new Date(e.end) > now);
    }

    return weekEvents;
  };

  const getFilteredEvents = (dayEvents) => {
    return dayEvents.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = filterLocation === 'all' || event.location === filterLocation;
      return matchesSearch && matchesLocation;
    });
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFullDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const getWeekDays = (date) => {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(weekStart));
      weekStart.setDate(weekStart.getDate() + 1);
    }
    return days;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const weekDays = getWeekDays(currentDate);

  // MONTH VIEW
  const renderMonthView = () => {
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    const selectedDayEvents = getEventsForDate(selectedDate);
    const filteredSelectedEvents = getFilteredEvents(selectedDayEvents);

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
        <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #404040' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#10b981' }}>{monthName}</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', color: '#10b981', fontSize: '12px', padding: '8px 0' }}>
                {day}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {days.map((day, idx) => {
              const dayEvents = day ? getEventsForDate(day) : [];
              const isToday = day && day.toDateString() === new Date().toDateString();
              const isSelected = day && day.toDateString() === selectedDate.toDateString();
              const heatmapColor = day ? getHeatmapColor(dayEvents.length) : '#1a1a1a';
              
              return (
                <div
                  key={idx}
                  onClick={() => day && setSelectedDate(day)}
                  style={{
                    padding: '12px 8px',
                    background: isSelected ? '#667eea40' : heatmapColor,
                    border: isSelected ? '2px solid #667eea' : isToday ? '2px solid #10b981' : '1px solid #404040',
                    borderRadius: '8px',
                    cursor: day ? 'pointer' : 'default',
                    minHeight: '60px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  {day && (
                    <>
                      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>{day.getDate()}</div>
                      {dayEvents.length > 0 && (
                        <>
                          <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
                            {dayEvents.length}
                          </div>
                          <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
                            {dayEvents.slice(0, 3).map((e, i) => (
                              <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: getVentureColor(e).color }} />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #404040', maxHeight: '600px', overflowY: 'auto' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#10b981' }}>
            {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>

          {filteredSelectedEvents.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', paddingTop: '40px' }}>
              No events 📭
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredSelectedEvents
                .sort((a, b) => new Date(a.start) - new Date(b.start))
                .map(event => {
                  const color = getVentureColor(event);
                  const venture = detectVenture(event);
                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      style={{
                        background: color.bgColor,
                        padding: '12px',
                        borderRadius: '8px',
                        border: `1px solid ${color.color}40`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: color.color, marginBottom: '4px' }}>
                        {venture}
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff', marginBottom: '6px' }}>
                        {event.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#10b981', marginBottom: '4px' }}>
                        ⏰ {formatDateTime(event.start)} - {formatDateTime(event.end)}
                      </div>
                      {event.location && (
                        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
                          📍 {event.location}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // WEEK VIEW
  const renderWeekView = () => {
    const weekEvents = getEventsForWeek(currentDate);
    const filteredWeekEvents = getFilteredEvents(weekEvents);

    return (
      <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #404040', overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(7, 1fr)`, gap: '2px', minWidth: '1200px' }}>
          <div style={{ fontWeight: 'bold', color: '#10b981', fontSize: '12px', padding: '8px' }}>Time</div>
          
          {weekDays.map((day, idx) => (
            <div
              key={idx}
              style={{
                fontWeight: 'bold',
                color: day.toDateString() === new Date().toDateString() ? '#10b981' : '#aaa',
                fontSize: '12px',
                padding: '8px',
                textAlign: 'center',
                background: day.toDateString() === new Date().toDateString() ? '#10b98120' : 'transparent',
                borderRadius: '6px'
              }}
            >
              {day.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          ))}

          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div style={{ fontWeight: 'bold', color: '#666', fontSize: '11px', padding: '8px', textAlign: 'right' }}>
                {hour.toString().padStart(2, '0')}:00
              </div>

              {weekDays.map((day, dayIdx) => {
                const dayEvents = filteredWeekEvents.filter(e => {
                  const eDate = new Date(e.start);
                  const eHour = eDate.getHours();
                  return eDate.toDateString() === day.toDateString() && eHour === hour;
                });

                return (
                  <div
                    key={`${hour}-${dayIdx}`}
                    style={{
                      minHeight: '60px',
                      background: '#2a2a2a',
                      border: '1px solid #404040',
                      borderRadius: '4px',
                      padding: '4px',
                      fontSize: '11px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    {dayEvents.map(event => {
                      const color = getVentureColor(event);
                      return (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          style={{
                            background: color.bgColor,
                            padding: '2px 4px',
                            borderRadius: '3px',
                            color: color.color,
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'pointer',
                            border: `1px solid ${color.color}60`,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // AGENDA VIEW
  const renderAgendaView = () => {
    let sortedEvents = events
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesLocation = filterLocation === 'all' || event.location === filterLocation;
        return matchesSearch && matchesLocation;
      });

    if (!showPastEvents) {
      const now = new Date();
      sortedEvents = sortedEvents.filter(e => new Date(e.end) > now);
    }

    return (
      <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #404040' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#10b981' }}>
          📋 All Events ({sortedEvents.length})
        </div>

        {sortedEvents.length === 0 ? (
          <div style={{ color: '#aaa', textAlign: 'center', padding: '40px 20px' }}>
            No events found 📭
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedEvents.map(event => {
              const color = getVentureColor(event);
              const venture = detectVenture(event);
              return (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  style={{
                    background: color.bgColor,
                    padding: '16px',
                    borderRadius: '8px',
                    border: `1px solid ${color.color}40`,
                    display: 'grid',
                    gridTemplateColumns: '150px 1fr',
                    gap: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: color.color, marginBottom: '4px' }}>
                      {venture}
                    </div>
                    <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>
                      {new Date(event.start).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                      {formatDateTime(event.start)} - {formatDateTime(event.end)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff', marginBottom: '6px' }}>
                      {event.title}
                    </div>
                    {event.location && (
                      <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>
                        📍 {event.location}
                      </div>
                    )}
                    {event.description && (
                      <div style={{ fontSize: '12px', color: '#ccc' }}>
                        {event.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // EVENT DETAILS MODAL
  const renderEventModal = () => {
    if (!selectedEvent) return null;

    const color = getVentureColor(selectedEvent);
    const venture = detectVenture(selectedEvent);

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          cursor: 'pointer'
        }}
        onClick={() => setSelectedEvent(null)}
      >
        <div
          style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '32px',
            border: `2px solid ${color.color}`,
            maxWidth: '600px',
            width: '90%',
            cursor: 'auto',
            overflowY: 'auto',
            maxHeight: '90vh'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setSelectedEvent(null)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              color: '#aaa',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>

          <div
            style={{
              display: 'inline-block',
              background: color.bgColor,
              color: color.color,
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              marginBottom: '16px'
            }}
          >
            {venture}
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', margin: '0 0 16px 0', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
            {selectedEvent.title}
          </h2>

          <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: `1px solid ${color.color}40` }}>
            <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>📅 Date & Time</div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
              {formatFullDateTime(selectedEvent.start)}
            </div>
            <div style={{ fontSize: '14px', color: '#10b981' }}>
              to {formatFullDateTime(selectedEvent.end)}
            </div>
          </div>

          {selectedEvent.location && (
            <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #404040' }}>
              <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>📍 Location</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>
                {selectedEvent.location}
              </div>
            </div>
          )}

          {selectedEvent.description && (
            <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #404040' }}>
              <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '8px' }}>📝 Details</div>
              <div style={{ fontSize: '14px', color: '#ccc', lineHeight: '1.6', wordWrap: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                {selectedEvent.description}
              </div>
            </div>
          )}

          <div style={{ fontSize: '11px', color: '#666', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #404040' }}>
            ID: {selectedEvent.id}
          </div>
        </div>
      </div>
    );
  };

  // NEW: Keyboard shortcuts help
  const renderKeyboardHelp = () => {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          cursor: 'pointer'
        }}
        onClick={() => setShowHelp(false)}
      >
        <div
          style={{
            background: '#1a1a1a',
            borderRadius: '12px',
            padding: '32px',
            border: '2px solid #667eea',
            maxWidth: '500px',
            width: '90%',
            cursor: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', margin: '0 0 20px 0' }}>
            ⌨️ Keyboard Shortcuts
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '16px' }}>
            <div style={{ fontWeight: 'bold', color: '#667eea' }}>ESC</div>
            <div style={{ color: '#ccc' }}>Close modal / Help</div>

            <div style={{ fontWeight: 'bold', color: '#667eea' }}>← / →</div>
            <div style={{ color: '#ccc' }}>Previous / Next month</div>

            <div style={{ fontWeight: 'bold', color: '#667eea' }}>T</div>
            <div style={{ color: '#ccc' }}>Go to Today</div>

            <div style={{ fontWeight: 'bold', color: '#667eea' }}>M</div>
            <div style={{ color: '#ccc' }}>Switch to Month view</div>

            <div style={{ fontWeight: 'bold', color: '#667eea' }}>W</div>
            <div style={{ color: '#ccc' }}>Switch to Week view</div>

            <div style={{ fontWeight: 'bold', color: '#667eea' }}>A</div>
            <div style={{ color: '#ccc' }}>Switch to Agenda view</div>

            <div style={{ fontWeight: 'bold', color: '#667eea' }}>?</div>
            <div style={{ color: '#ccc' }}>Show this help</div>
          </div>

          <button
            onClick={() => setShowHelp(false)}
            style={{
              marginTop: '24px',
              padding: '10px 20px',
              background: '#667eea',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            Got it!
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div style={{ padding: '40px 20px', textAlign: 'center', color: '#aaa' }}>Loading calendar... ⏳</div>;
  }

  if (error) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#ff6b6b' }}>
        <p>Error: {error}</p>
        <button onClick={fetchCalendar} style={{ padding: '8px 16px', marginTop: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>📅 Your Calendar</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode('month')}
            style={{
              padding: '8px 16px',
              background: viewMode === 'month' ? '#667eea' : '#2a2a2a',
              color: '#fff',
              border: viewMode === 'month' ? 'none' : '1px solid #444',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            📅 Month
          </button>
          <button
            onClick={() => setViewMode('week')}
            style={{
              padding: '8px 16px',
              background: viewMode === 'week' ? '#667eea' : '#2a2a2a',
              color: '#fff',
              border: viewMode === 'week' ? 'none' : '1px solid #444',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            📊 Week
          </button>
          <button
            onClick={() => setViewMode('agenda')}
            style={{
              padding: '8px 16px',
              background: viewMode === 'agenda' ? '#667eea' : '#2a2a2a',
              color: '#fff',
              border: viewMode === 'agenda' ? 'none' : '1px solid #444',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            📋 Agenda
          </button>
          <button
            onClick={() => setShowHelp(true)}
            style={{
              padding: '8px 16px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ?
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', border: '1px solid #404040', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>{stats.totalMeetings}</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>This Week</div>
        </div>
        <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', border: '1px solid #404040', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
            {stats.busiestDay ? stats.busiestDay[0].slice(0, 3) : 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>Busiest Day</div>
        </div>
        <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', border: '1px solid #404040', textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{stats.freeDays}</div>
          <div style={{ fontSize: '12px', color: '#aaa' }}>Free Days</div>
        </div>
      </div>

      {/* Venture Legend */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {Object.entries(VENTURES).map(([venture, config]) => (
            <div key={venture} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: config.color }} />
              <span style={{ fontSize: '12px', color: '#aaa' }}>{venture}</span>
            </div>
          ))}
        </div>

        {/* NEW: Export & Filter buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowPastEvents(!showPastEvents)}
            style={{
              padding: '8px 12px',
              background: showPastEvents ? '#667eea' : '#2a2a2a',
              color: '#fff',
              border: showPastEvents ? 'none' : '1px solid #444',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            {showPastEvents ? '✓ Past Events' : 'Hide Past'}
          </button>
          <button
            onClick={exportToCSV}
            style={{
              padding: '8px 12px',
              background: '#2a2a2a',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '10px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '6px', fontSize: '14px' }}
        />
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          style={{ padding: '10px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '6px', fontSize: '14px' }}
        >
          <option value="all">All Locations</option>
          {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
        </select>
      </div>

      {/* Navigation */}
      {viewMode !== 'agenda' && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} style={{ padding: '8px 12px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}>← Prev</button>
          <button onClick={goToToday} style={{ padding: '8px 12px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Today</button>
          <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} style={{ padding: '8px 12px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}>Next →</button>
        </div>
      )}

      {/* View Content */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'agenda' && renderAgendaView()}

      {/* Event Modal */}
      {renderEventModal()}

      {/* Keyboard Help */}
      {showHelp && renderKeyboardHelp()}
    </div>
  );
}
