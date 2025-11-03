import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const creds = { username, password };
    if (typeof onLogin === 'function') {
      onLogin(creds);
    } else {
      console.log('Login submitted:', creds);
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
      </div>
    </div>
  );
}
