import './App.css';
import { useState } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import Landing from './components/Landing';
import ResumeInput from './components/ResumeInput';

// Use REACT_APP_API_URL to point to backend in production (set this in Vercel env)
const API_BASE = process.env.REACT_APP_API_URL || '';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authView, setAuthView] = useState('landing'); // 'landing' | 'login' | 'signup'

  if (!loggedIn) {
    if (authView === 'signup') {
      return (
        <Signup
          onSignup={() => setLoggedIn(true)}
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }
    if (authView === 'login') {
      return (
        <Login
          onLogin={() => setLoggedIn(true)}
          onSwitchToSignup={() => setAuthView('signup')}
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

  return (
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
  );
}

export default App;
