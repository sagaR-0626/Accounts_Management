import React, { useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Loginscreen from './Components/Loginscreen';
import OrganizationSelector from './Components/OrganizationSelector';
import Dashboard from './Components/Dashboard';
import ARAPBreakdown from './Components/ARAPBreakdown';
import CompanyDashboard from './Components/CompanyDashboard';
import ProjectDashboard from './Components/ProjectDashboard';
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
      <Route path="/company-dashboard" element={<CompanyDashboard />} />
      <Route path="/project/:id" element={<ProjectDashboardWrapper />} />
    </Routes>
  );
}

// Wrapper to get state from navigation
function ProjectDashboardWrapper() {
  const location = useLocation();
  const { project, organization } = location.state || {};
  return (
    <ProjectDashboard
      project={project}
      organization={organization}
      onBack={() => window.history.back()}
    />
  );
}

export default App;


