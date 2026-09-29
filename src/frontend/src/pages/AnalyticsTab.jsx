import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AnalyticsTab = () => {
  const [venturesAnalytics, setVenturesAnalytics] = useState([]);
  const [selectedVenture, setSelectedVenture] = useState(null);
  const [ventureDetail, setVentureDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVenturesAnalytics();
  }, []);

  const loadVenturesAnalytics = async () => {
    try {
      const res = await fetch(API + '/api/venture-analytics/all', {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setVenturesAnalytics(json.analytics || []);
      setLoading(false);
    } catch (e) {
      console.error('Error:', e);
      setLoading(false);
    }
  };

  const loadVentureDetail = async (ventureId) => {
    try {
      const res = await fetch(`${API}/api/venture-analytics/${ventureId}`, {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const json = await res.json();
      setVentureDetail(json);
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const handleVentureSelect = (venture) => {
    setSelectedVenture(venture);
    loadVentureDetail(venture.venture_id);
  };

  if (loading) return <div style={{ color: '#fff', padding: '20px' }}>⏳ Loading analytics...</div>;

  return (
    <div style={{ padding: '20px' }}>
      {!selectedVenture ? (
        <>
          <h2 style={{ color: '#fff', marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>📊 All Ventures Overview</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {venturesAnalytics.map(v => (
              <div
                key={v.venture_id}
                onClick={() => handleVentureSelect(v)}
                style={{
                  background: '#2a2a2a',
                  border: '1px solid #404040',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  hover: { borderColor: '#667eea', transform: 'translateY(-4px)' }
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#404040'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <h3 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>{v.venture_name}</h3>
                
                {/* Progress bar */}
                <div style={{ background: '#404040', borderRadius: '4px', height: '8px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div
                    style={{
                      background: '#667eea',
                      height: '100%',
                      width: `${v.completion_rate}%`,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#aaa' }}>Completed</div>
                    <div style={{ fontSize: '16px', color: '#10b981', fontWeight: '700' }}>{v.completed_tasks}</div>
                  </div>
                  <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#aaa' }}>Total</div>
                    <div style={{ fontSize: '16px', color: '#667eea', fontWeight: '700' }}>{v.total_tasks}</div>
                  </div>
                  <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#aaa' }}>This Week</div>
                    <div style={{ fontSize: '16px', color: '#f59e0b', fontWeight: '700' }}>{v.completed_this_week}</div>
                  </div>
                  <div style={{ background: '#1a1a1a', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#aaa' }}>Est. Hours</div>
                    <div style={{ fontSize: '16px', color: '#ec4899', fontWeight: '700' }}>{v.estimated_hours}h</div>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#aaa' }}>{v.completion_rate}% Complete</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button
            onClick={() => setSelectedVenture(null)}
            style={{
              padding: '8px 16px',
              background: '#667eea',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              marginBottom: '20px'
            }}
          >
            ← Back to All Ventures
          </button>

          {ventureDetail && (
            <>
              <h2 style={{ color: '#fff', marginBottom: '20px', fontSize: '18px', fontWeight: '700' }}>
                {ventureDetail.venture_name} - Detailed Analytics
              </h2>

              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', border: '1px solid #ef4444' }}>
                  <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>Pending</div>
                  <div style={{ fontSize: '24px', color: '#ef4444', fontWeight: '700' }}>{ventureDetail.summary.pending}</div>
                </div>
                <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                  <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>In Progress</div>
                  <div style={{ fontSize: '24px', color: '#f59e0b', fontWeight: '700' }}>{ventureDetail.summary.in_progress}</div>
                </div>
                <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', border: '1px solid #10b981' }}>
                  <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>Completed</div>
                  <div style={{ fontSize: '24px', color: '#10b981', fontWeight: '700' }}>{ventureDetail.summary.completed}</div>
                </div>
                <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', border: '1px solid #667eea' }}>
                  <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>Completion Rate</div>
                  <div style={{ fontSize: '24px', color: '#667eea', fontWeight: '700' }}>{ventureDetail.summary.completion_rate}%</div>
                </div>
              </div>

              {/* Burndown Chart */}
              <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', border: '1px solid #404040', marginBottom: '20px' }}>
                <h3 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>📉 Burndown Chart (4 Weeks)</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '120px', padding: '8px 0' }}>
                  {ventureDetail.burndown.slice(1).map((week, idx) => {
                    const maxHeight = Math.max(...ventureDetail.burndown.map(w => w.pending)) || 1;
                    const barHeight = (week.pending / maxHeight) * 100;
                    return (
                      <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                        <div
                          style={{
                            background: '#667eea',
                            width: '100%',
                            height: `${barHeight}%`,
                            borderRadius: '4px',
                            minHeight: '4px'
                          }}
                        />
                        <div style={{ fontSize: '10px', color: '#aaa' }}>W{idx + 1}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tasks per week */}
              <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', border: '1px solid #404040', marginBottom: '20px' }}>
                <h3 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>📈 Tasks Completed per Week</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {ventureDetail.tasks_per_week.map((week, idx) => (
                    <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                      <div
                        style={{
                          background: '#10b981',
                          width: '100%',
                          height: '40px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: '700',
                          fontSize: '14px',
                          marginBottom: '8px'
                        }}
                      >
                        {week.completed}
                      </div>
                      <div style={{ fontSize: '11px', color: '#aaa' }}>{week.week}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects */}
              {ventureDetail.projects && ventureDetail.projects.length > 0 && (
                <div style={{ background: '#2a2a2a', padding: '16px', borderRadius: '8px', border: '1px solid #404040' }}>
                  <h3 style={{ color: '#fff', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>📁 Projects</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {ventureDetail.projects.map(p => (
                      <div key={p.id} style={{ padding: '8px', background: '#1a1a1a', borderRadius: '6px', fontSize: '13px', color: '#aaa' }}>
                        🎯 {p.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsTab;
