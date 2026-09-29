import React, { useState, useEffect } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ApiTab() {
  const [period, setPeriod] = useState('24h');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/admin/api-stats?period=${period}`, {
        headers: { 'X-Ami-Password': AMI_PASSWORD }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ color: '#fff', padding: '20px' }}>Loading API stats...</div>;
  }

  if (!stats) {
    return <div style={{ color: '#ef4444', padding: '20px' }}>Error loading stats</div>;
  }

  return (
    <div style={{ padding: '20px', color: '#fff', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 10px 0', fontSize: '28px', fontWeight: 'bold' }}>💰 API Cost & Drain Analysis</h2>
      <p style={{ margin: '0 0 20px 0', color: '#aaa', fontSize: '14px' }}>Track your API spending and identify what is costing you</p>

      {/* TIME PERIOD SELECTOR */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {['24h', '7d', '30d'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            style={{
              padding: '8px 16px',
              background: period === p ? '#667eea' : '#2a2a2a',
              color: '#fff',
              border: `1px solid ${period === p ? '#667eea' : '#404040'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: period === p ? 'bold' : 'normal',
              fontSize: '14px'
            }}
          >
            {p === '24h' ? 'Last 24h' : p === '7d' ? 'Last 7 days' : 'Last 30 days'}
          </button>
        ))}
      </div>

      {/* COST CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#1a2a3a', padding: '20px', borderRadius: '8px', border: '1px solid #667eea' }}>
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>Total Cost</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea' }}>${stats.total_cost}</div>
        </div>

        <div style={{ background: '#1a2a3a', padding: '20px', borderRadius: '8px', border: '1px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>Daily Avg</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>${stats.daily_avg_cost}</div>
        </div>

        <div style={{ background: '#1a2a3a', padding: '20px', borderRadius: '8px', border: '1px solid #f59e0b' }}>
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>Monthly Projection</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>${stats.monthly_projection}</div>
        </div>
      </div>

      {/* API CALLS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: '#1a2a3a', padding: '20px', borderRadius: '8px', border: '1px solid #667eea' }}>
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>Total Calls</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea' }}>{stats.total_calls}</div>
        </div>

        <div style={{ background: '#1a2a3a', padding: '20px', borderRadius: '8px', border: '1px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>Free Engines</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{100 - stats.gemini_percentage}%</div>
        </div>

        <div style={{ background: '#1a2a3a', padding: '20px', borderRadius: '8px', border: '1px solid #ef4444' }}>
          <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '4px' }}>Gemini Calls</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>{stats.gemini_percentage}%</div>
        </div>
      </div>

      {/* WHAT'S DRAINING YOU */}
      <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #404040', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#ef4444' }}>⚠️ What's DRAINING You (Sorted by Cost)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #404040' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: '#aaa' }}>Endpoint</th>
                <th style={{ textAlign: 'center', padding: '8px', color: '#aaa' }}>Calls</th>
                <th style={{ textAlign: 'center', padding: '8px', color: '#aaa' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_cost_endpoints.map((ep, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '8px', color: '#ccc' }}>{ep.endpoint}</td>
                  <td style={{ textAlign: 'center', padding: '8px', color: '#667eea' }}>{ep.calls}</td>
                  <td style={{ textAlign: 'center', padding: '8px', color: '#ef4444', fontWeight: 'bold' }}>${ep.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VOLUME DRAINERS */}
      <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '20px', border: '1px solid #404040', marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#667eea' }}>📊 Volume Drainers (Sorted by Calls)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #404040' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: '#aaa' }}>Endpoint</th>
                <th style={{ textAlign: 'center', padding: '8px', color: '#aaa' }}>Calls</th>
                <th style={{ textAlign: 'center', padding: '8px', color: '#aaa' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_volume_endpoints.map((ep, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '8px', color: '#ccc' }}>{ep.endpoint}</td>
                  <td style={{ textAlign: 'center', padding: '8px', color: '#667eea' }}>{ep.calls}</td>
                  <td style={{ textAlign: 'center', padding: '8px', color: '#f59e0b', fontWeight: 'bold' }}>${ep.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* OPTIMIZATION SUGGESTIONS */}
      {stats.suggestions.length > 0 && (
        <div style={{ background: '#1a2a1a', borderRadius: '12px', padding: '20px', border: '1px solid #10b981' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#10b981' }}>💡 Optimization Opportunities</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.suggestions.map((suggestion, i) => (
              <div key={i} style={{ padding: '12px', background: '#0a1a0a', borderLeft: '3px solid #10b981', borderRadius: '4px', fontSize: '12px', color: '#ccc' }}>
                {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
