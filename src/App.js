import React, { useState } from 'react';
import Loginscreen from './Components/Loginscreen';
import Dashboard from './Components/Dashboard';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <Loginscreen onLogin={() => setIsLoggedIn(true)} />;
  }

  // Pass isLoggedIn and onLogout to Dashboard
  return <Dashboard isLoggedIn={isLoggedIn} onLogout={() => setIsLoggedIn(false)} />;
}

export default App;



