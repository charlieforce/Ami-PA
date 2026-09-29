import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [locations, setLocations] = useState([]);

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
      
      // Extract unique locations
      const uniqueLocations = [...new Set(data.events.map(e => e.location).filter(l => l))];
      setLocations(uniqueLocations);
    } catch (err) {
      console.error('Calendar fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
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

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];
  
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const selectedDayEvents = getEventsForDate(selectedDate);
  const filteredSelectedEvents = getFilteredEvents(selectedDayEvents);

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
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', margin: 0 }}>📅 Your Calendar</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={previousMonth} style={{ padding: '8px 12px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}>← Prev</button>
          <button onClick={goToToday} style={{ padding: '8px 12px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Today</button>
          <button onClick={nextMonth} style={{ padding: '8px 12px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer' }}>Next →</button>
        </div>
      </div>

      {/* Month Display */}
      <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', color: '#10b981' }}>{monthName}</div>

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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
        {/* Calendar Grid */}
        <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #404040' }}>
          {/* Day Headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '12px' }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', color: '#10b981', fontSize: '12px', padding: '8px 0' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
            {days.map((day, idx) => {
              const dayEvents = day ? getEventsForDate(day) : [];
              const isToday = day && day.toDateString() === new Date().toDateString();
              const isSelected = day && day.toDateString() === selectedDate.toDateString();
              
              return (
                <div
                  key={idx}
                  onClick={() => day && setSelectedDate(day)}
                  style={{
                    padding: '12px 8px',
                    background: isSelected ? '#667eea40' : isToday ? '#10b98140' : '#2a2a2a',
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
                        <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>
                          {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Details Panel */}
        <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #404040', maxHeight: '600px', overflowY: 'auto' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#10b981' }}>
            {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>

          {filteredSelectedEvents.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', paddingTop: '40px' }}>
              No events on this day 📭
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredSelectedEvents
                .sort((a, b) => new Date(a.start) - new Date(b.start))
                .map(event => (
                  <div key={event.id} style={{ background: '#2a2a2a', padding: '12px', borderRadius: '8px', border: '1px solid #404040' }}>
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
                    {event.description && (
                      <div style={{ fontSize: '11px', color: '#ccc', marginTop: '8px', maxHeight: '60px', overflow: 'hidden' }}>
                        {event.description}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
