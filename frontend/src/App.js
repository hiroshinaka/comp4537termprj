import './App.css';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import Landing from './components/Landing';
import ResumeInput from './components/ResumeInput';
import AdminDashboard from './components/AdminDashboard';
import MSG from './lang/en/messages.js';

// Use REACT_APP_API_URL to point to backend in production (set this in Vercel env)
const API_BASE = process.env.REACT_APP_API_URL || '';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authView, setAuthView] = useState('landing'); // 'landing' | 'login' | 'signup'
  const [userType, setUserType] = useState(null); // 'admin' or 'user'
  const [view, setView] = useState('resume'); // 'resume' or 'admin'

  // Check user type when logged in
  useEffect(() => {
    if (loggedIn) {
      const checkUserType = async () => {
        try {
          const url = API_BASE ? `${API_BASE.replace(/\/$/, '')}/me` : '/me';
          const res = await fetch(url, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            setUserType(data.user?.user_type || 'user');
          }
        } catch (err) {
          console.error('Failed to check user type:', err);
          setUserType('user');
        }
      };
      checkUserType();
    }
  }, [loggedIn]);

  if (!loggedIn) {
    if (authView === 'signup') {
      return (
        <Signup
          onSignup={() => setLoggedIn(true)}
          onSwitchToLogin={() => setAuthView('login')}
          onBackToHome={() => setAuthView('landing')}
        />
      );
    }
    if (authView === 'login') {
      return (
        <Login
          onLogin={() => setLoggedIn(true)}
          onSwitchToSignup={() => setAuthView('signup')}
          onBackToHome={() => setAuthView('landing')}
        />
      );
    }

    // default: landing
    return (
      <Landing
        onGoLogin={() => setAuthView('login')}
        onGoSignup={() => setAuthView('signup')}
        // Provide a dev-only demo shortcut so developers can view ResumeInput
        // during local development. This prop is only passed when not in
        // production to avoid exposing a bypass in production builds.
        {...(process.env.NODE_ENV !== 'production' ? { onGoDemo: () => setLoggedIn(true) } : {})}
      />
    );
  }

  // Show admin dashboard if user is admin and view is set to admin
  if (userType === 'admin' && view === 'admin') {
    return (
      <div>
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Admin Panel</h1>
          <button
            onClick={() => setView('resume')}
            className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded"
          >
            {MSG["back to resume analyzer"]}
          </button>
        </div>
        <AdminDashboard onLogout={() => setLoggedIn(false)} />
      </div>
    );
  }

  return (
    <div>
      {userType === 'admin' && (
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Resume Analyzer</h1>
          <button
            onClick={() => setView('admin')}
            className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded"
          >
            {MSG["admin dashboard"]}
          </button>
        </div>
      )}
      <ResumeInput
        onAnalyze={async (payload) => {
          // payload may be { resume, job } (pasted) or { resumeFile, job } (file)
          try {
            if (payload && payload.resumeFile) {
              const form = new FormData();
              form.append('resume', payload.resumeFile);
              form.append('job', payload.job || '');

              const res = await fetch('/analyze', { method: 'POST', body: form });
              const data = await res.json();
              return data;
            }

            // pasted text
            if (payload && payload.resume) {
              const res = await fetch('/analyze', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resume: payload.resume, job: payload.job || '' }),
              });
              const data = await res.json();
              return data;
            }

            console.warn('No payload provided to onAnalyze');
          } catch (err) {
            console.error('Analyze request failed:', err);
          }
        }}
        onLogout={() => setLoggedIn(false)}
      />
    </div>
  );
}

export default App;
