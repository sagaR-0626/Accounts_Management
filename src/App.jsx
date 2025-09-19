import React, { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import Loginscreen from './Components/Loginscreen';
import OrganizationSelector from './Components/OrganizationSelector';
import Dashboard from './Components/Dashboard';
import ARAPBreakdown from './Components/ARAPBreakdown';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <Loginscreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard isLoggedIn={isLoggedIn} onLogout={() => setIsLoggedIn(false)} />} />
      <Route path="/arap-breakdown" element={<ARAPBreakdown />} />
    </Routes>
  );
}

export default App;


