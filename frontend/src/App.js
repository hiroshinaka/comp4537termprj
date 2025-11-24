import './App.css';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Signup from './components/Signup';
import Landing from './components/Landing';
import ResumeInput from './components/ResumeInput';
import AdminDashboard from './components/AdminDashboard';
import MSG from './lang/en/messages.js';

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:4000');

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authView, setAuthView] = useState('landing');
  const [userType, setUserType] = useState(null); // 'admin' or 'user'
  const [view, setView] = useState('resume');     // 'resume' or 'admin'
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [warning, setWarning] = useState(null);
  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/signout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      setLoggedIn(false);
      setUserType(null);
    }
  };

  // On first load: check if there is a valid JWT cookie
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_BASE}/me`, {
          method: 'GET',
          credentials: 'include',
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setLoggedIn(true);
            setUserType(data.user.user_type || 'user');
          } else {
            setLoggedIn(false);
            setUserType(null);
          }
        } else {
          setLoggedIn(false);
          setUserType(null);
        }
      } catch (err) {
        console.error('Initial auth check failed:', err);
        setLoggedIn(false);
        setUserType(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // When loggedIn flips to true (e.g. after login), refresh userType
  useEffect(() => {
    if (!loggedIn) return;

    const checkUserType = async () => {
      try {
        const res = await fetch(`${API_BASE}/me`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUserType(data.user?.user_type || 'user');
        } else {
          setUserType('user');
        }
      } catch (err) {
        console.error('Failed to check user type:', err);
        setUserType('user');
      }
    };

    checkUserType();
  }, [loggedIn]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-slate-600 text-sm">Checking session…</p>
      </div>
    );
  }

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

    return (
      <Landing
        onGoLogin={() => setAuthView('login')}
        onGoSignup={() => setAuthView('signup')}
        {...(process.env.NODE_ENV !== 'production'
          ? { onGoDemo: () => setLoggedIn(true) }
          : {})}
      />
    );
  }

  if (userType === 'admin' && view === 'admin') {
    return (
      <div>
        <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Admin Panel</h1>
          <button
            onClick={() => setView('resume')}
            className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded"
          >
            {MSG['back to resume analyzer']}
          </button>
        </div>
        <AdminDashboard onLogout={handleLogout} />
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
            {MSG['admin dashboard']}
          </button>
        </div>
      )}
      <ResumeInput
        onAnalyze={async (payload) => {
          try {
            if (payload && payload.resumeFile) {
              const form = new FormData();
              form.append('resume', payload.resumeFile);
              form.append('job', payload.job || '');

              const res = await fetch(`${API_BASE}/api/analyzer`, {
                method: 'POST',
                credentials: 'include',
                body: form,
              });
              const data = await res.json();
              if (data.usage && data.usage.overFreeLimit) {
                // e.g. set some local state to show a banner
                setWarning(
                  `Heads up: you’ve used ${data.usage.totalRequests} of your 20 free requests.`
                );
              }
              return data;
            }

            if (payload && payload.resume) {
              const res = await fetch(`${API_BASE}/api/analyzer`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  resume: payload.resume,
                  job: payload.job || '',
                }),
              });
              const data = await res.json();
              return data;
            }

            console.warn('No payload provided to onAnalyze');
          } catch (err) {
            console.error('Analyze request failed:', err);
          }
        }}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default App;
