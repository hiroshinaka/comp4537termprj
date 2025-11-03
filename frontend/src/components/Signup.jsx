import React, { useState } from 'react';

export default function Signup({ onSignup, onSwitchToLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      // Create user via backend form handler
      const createBody = new URLSearchParams({ username, password }).toString();
      const createRes = await fetch('/submitUser', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: createBody,
      });

      if (!createRes.ok) {
        setMessage('Signup failed. Please try a different username.');
        return;
      }

      // Attempt auto-login to establish session
      const loginBody = new URLSearchParams({ username, password }).toString();
      const loginRes = await fetch('/loggingin', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: loginBody,
      });

      const success = loginRes.redirected && /\/loggedin/i.test(loginRes.url);
      if (success) {
        if (typeof onSignup === 'function') onSignup({ username });
      } else {
        setMessage('Signed up, but auto-login failed. Please log in.');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Signup error:', err);
      setMessage('Signup failed. Please try again later.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">Sign Up</h2>

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
            Sign Up
          </button>
        </form>
        {message && (
          <p className="mt-3 text-sm text-red-600 text-center">{message}</p>
        )}
        <div className="flex items-center justify-between mt-8">
          <span className="text-sm text-slate-500">Already have an account?</span>
          <button
            type="button"
            onClick={() => onSwitchToLogin && onSwitchToLogin()}
            className="text-sm font-medium text-slate-900 hover:underline"
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}
