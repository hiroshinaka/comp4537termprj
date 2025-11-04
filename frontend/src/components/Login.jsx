import React, { useState } from 'react';

// Use REACT_APP_API_URL to point to the backend in production (set this in Vercel env)
const API_BASE = process.env.REACT_APP_API_URL || '';

export default function Login({ onLogin, onSwitchToSignup }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const body = new URLSearchParams({ username, password }).toString();
    try {
      // Build URL: prefer API_BASE (set in production), otherwise fallback to relative path for local dev
      const url = API_BASE ? `${API_BASE.replace(/\/$/, '')}/loggingin` : '/loggingin';
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      let data = null;
      // Try to parse JSON only when response content-type is JSON
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (parseErr) {
          // fallback: read as text
          const text = await res.text();
          console.error('Failed to parse JSON response:', parseErr, 'raw:', text);
          setMessage(text || 'Unexpected server response.');
          return;
        }
      } else {
        // non-json response (HTML/error), read text and show as message
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
      // eslint-disable-next-line no-console
      console.error('Login error:', err);
      setMessage('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">Login</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
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
              Password
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
            Login
          </button>
        </form>
        {message && (
          <p className="mt-3 text-sm text-red-600 text-center">{message}</p>
        )}
        <div className="flex items-center justify-between mt-8">
          <span className="text-sm text-slate-500">Don’t have an account?</span>
          <button
            type="button"
            onClick={() => onSwitchToSignup && onSwitchToSignup()}
            className="text-sm font-medium text-slate-900 hover:underline"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
