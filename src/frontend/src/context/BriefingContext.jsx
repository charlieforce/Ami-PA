import React, { createContext, useState, useEffect, useCallback } from 'react';
const AMI_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'charlie';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const BriefingContext = createContext();

export const BriefingProvider = ({ children }) => {
  const [briefing, setBriefing] = useState(null);
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Fetch briefing from backend
  const fetchBriefing = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(API + '/api/ami/briefing', {
        headers: { 'X-Ami-Password': AMI_PASSWORD },
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      setBriefing(data.briefing);

      try {
        const bres = await fetch(API + '/api/briefings/today', {
          headers: { 'X-Ami-Password': AMI_PASSWORD },
        });
        const bjson = await bres.json();
        setBriefings(bjson.briefings || []);
      } catch (e) {
        console.error('Briefings fetch error:', e);
      }
      setLastRefresh(new Date());
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('Briefing fetch error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  // Load briefing on app startup
  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  // Auto-refresh at 7 AM and 9 PM
  useEffect(() => {
    const checkScheduledRefresh = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Refresh at 7:00 AM or 9:00 PM
      if ((hours === 7 || hours === 21) && minutes === 0) {
        console.log('Auto-refreshing briefing at scheduled time');
        fetchBriefing();
      }
    };

    // Check every minute
    const interval = setInterval(checkScheduledRefresh, 60000);
    return () => clearInterval(interval);
  }, [fetchBriefing]);

  return (
    <BriefingContext.Provider value={{ briefing, briefings, loading, error, fetchBriefing, lastRefresh }}>
      {children}
    </BriefingContext.Provider>
  );
};
