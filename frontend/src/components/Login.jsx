import React, { useState } from 'react';
import MSG from '../lang/en/messages.js';

// Use REACT_APP_API_URL to point to the backend in production (set this in Vercel env)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export default function Login({ onLogin, onSwitchToSignup, onBackToHome }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const body = new URLSearchParams({ username, password }).toString();
    try {
      const url = API_BASE ? `${API_BASE.replace(/\/$/, '')}/loggingin` : '/loggingin';
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      let data = null;
      
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (parseErr) {
          const text = await res.text();
          console.error('Failed to parse JSON response:', parseErr, 'raw:', text);
          setMessage(text || 'Unexpected server response.');
          return;
        }
      } else {
        const text = await res.text();
        console.error('Non-JSON response from /loggingin:', text);
        setMessage(text || 'Unexpected server response.');
        return;
      }

      if (res.ok && data && data.success) {
        if (typeof onLogin === 'function') onLogin({ username });
      } else {
        setMessage((data && data.error) || 'Invalid username or password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setMessage('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {onBackToHome && (
        <div className="absolute top-6 right-6">
          <button
            type="button"
            onClick={onBackToHome}
            className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-white px-4 py-2 rounded shadow-sm border border-slate-200"
          >
            <span>←</span> {MSG["back to home"]}
          </button>
        </div>
      )}
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">Login</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              {MSG["username"]}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-0.5 w-full rounded border border-gray-300 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {MSG["password"]}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-0.5 w-full rounded border border-gray-300 shadow-sm text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-slate-900 text-white font-semibold rounded-md shadow-sm hover:bg-slate-700 transition-colors duration-200"
          >
            {MSG["log in"]}
          </button>
        </form>
        {message && (
          <p className="mt-3 text-sm text-red-600 text-center">{message}</p>
        )}
        <div className="flex items-center justify-between mt-8">
          <span className="text-sm text-slate-500">{MSG["don't have an account?"]}</span>
          <button
            type="button"
            onClick={() => onSwitchToSignup && onSwitchToSignup()}
            className="text-sm font-medium text-slate-900 hover:underline"
          >
            {MSG["sign up"]}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
