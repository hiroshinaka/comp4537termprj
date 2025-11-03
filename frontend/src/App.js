import './App.css';
import { useState } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import ResumeInput from './components/ResumeInput';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'

  if (!loggedIn) {
    if (authView === 'signup') {
      return (
        <Signup
          onSignup={() => setLoggedIn(true)}
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <Login
        onLogin={() => setLoggedIn(true)}
        onSwitchToSignup={() => setAuthView('signup')}
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
