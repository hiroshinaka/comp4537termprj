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
      onAnalyze={({ resume, job }) => {
        console.log('Analyze payload:', { resume, job });
      }}
      onLogout={() => setLoggedIn(false)}
    />
  );
}

export default App;
