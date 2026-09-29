import React, { useState, useEffect } from 'react';
import { verifyPassword, setPassword } from '../utils/api';
import '../styles/LoginPage.css';

function LoginPage({ onLoginSuccess }) {
  const [password, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await verifyPassword(password);
      
      if (result.authenticated) {
        setPassword(password);
        onLoginSuccess();
      } else {
        setError('Wrong password, try again!');
      }
    } catch (err) {
      setError('Connection error. Make sure backend is running on port 8000');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <img src="/ami.png" alt="Ami" className="ami-logo" />
          </div>
          <h1>Angry Ami</h1>
          <p className="subtitle">Charlie's Personal Assistant</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="password">Enter your password:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Your password..."
              autoFocus
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Enter'}
          </button>
        </form>

        <div className="login-footer">
          <p>"Yo Charlie! Let's get to work, yeah?" - Ami</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
