import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import { BriefingProvider } from './context/BriefingContext';
import './styles/global.css';
import './styles/App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user already logged in
    const storedPassword = localStorage.getItem('ami_password');
    if (storedPassword) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Ami is waking up...</div>;
  }

  return (
    <BriefingProvider>
      <div className="App">
        {isAuthenticated ? (
          <Dashboard 
            onLogout={() => {
              localStorage.removeItem('ami_password');
              setIsAuthenticated(false);
            }}
          />
        ) : (
          <LoginPage 
            onLoginSuccess={() => setIsAuthenticated(true)}
          />
        )}
      </div>
    </BriefingProvider>
  );
}

export default App;
