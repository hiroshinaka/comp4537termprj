import './App.css';
import { useState } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import ResumeInput from './components/ResumeInput';
import Landing from './components/Landing';

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
            console.log('Analyze (file) response:', data);
            return data;
          }

          // pasted text
          if (payload && payload.resume) {
            const res = await fetch('/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ resume: payload.resume, job: payload.job || '' }),
            });
            const data = await res.json();
            console.log('Analyze (text) response:', data);
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
