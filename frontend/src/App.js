import './App.css';
import { useState } from 'react';
import SimpleLogin from './components/SimpleLogin';
import ResumeChat from './components/ResumeChat';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  if (!loggedIn) {
    return <SimpleLogin onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <ResumeChat
      onAnalyze={({ resume, job }) => {
        // Replace with backend call if needed
        // eslint-disable-next-line no-console
        console.log('Analyze payload:', { resume, job });
      }}
      onLogout={() => setLoggedIn(false)}
    />
  );
}

export default App;
