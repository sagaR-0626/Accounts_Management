import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2'; // Make sure this import is present
import SummaryCard from './SummaryCard';
import ProjectCard from './ProjectCard';
import ProjectDashboard from './ProjectDashboard'; // Make sure this import is present
import { useNavigate } from 'react-router-dom';

const CompanyDashboard = ({
  organization,
  selectedDept,
  onDeptChange,
  onProjectSelect,
  onAddProject,
  onFileUpload,
  onBack,
  projects = [],
  totals = { ar: 0, ap: 0 },
}) => {
  const navigate = useNavigate();
  const [dashboardView, setDashboardView] = useState('all');
  const [modalView, setModalView] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [view, setView] = useState('dashboard');

  // --- FIX: Reset dashboardView to 'all' when org/projects change ---
  useEffect(() => {
    setDashboardView('all');
  }, [organization, projects]);

  // Filter projects by department and AR/AP tab
  const visibleProjects = projects.filter((project) => {
    const dept = project.department || project.departmentName;
    if (selectedDept && selectedDept !== 'all') {
      if (!dept) return true; // No department info, include project
      if (dept.toLowerCase() !== selectedDept) return false;
    }
    if (dashboardView === 'ar') return project.ar > 0;
    if (dashboardView === 'ap') return project.ap > 0;
    return true;
  });

  // Filter transactions for AR/AP tab (company level)
  const allTxs = projects.flatMap((p) => p.transactions || []);
  const filteredTxs = allTxs.filter((tx) => {
    const type = (tx.Type || tx.type || '').toLowerCase();
    if (dashboardView === 'ar') return type === 'income' || type === 'receipt';
    if (dashboardView === 'ap') return type === 'expense' || type === 'payment';
    return true;
  });

  // Category breakdown for AR/AP tab
  const categoryTotals = [];
  if (dashboardView !== 'all') {
    const map = {};
    filteredTxs.forEach((tx) => {
      const cat = tx.Category || tx.category || 'Other';
      map[cat] = (map[cat] || 0) + Number(tx.Amount || tx.amount || 0);
    });
    for (const cat in map) {
      categoryTotals.push({ category: cat, total: map[cat] });
    }
  }

  // Card highlight style
  const getCardStyle = (type) =>
    dashboardView === type
      ? { boxShadow: '0 0 0 3px #bae6fd', borderRadius: 12 }
      : {};

  // Calculate AR/AP from projects
  const projectsAR = projects.reduce((sum, p) => sum + (p.ar || 0), 0);
  const projectsAP = projects.reduce((sum, p) => sum + (p.ap || 0), 0);

  // Calculate AR/AP from "Other" (organization-level transactions)
  const otherTxs = (organization?.transactions || []).filter(tx => !tx.ProjectID && !tx.ProjectId && !tx.projectId);
  const otherAR = otherTxs.filter(tx => {
    const type = (tx.Type || tx.type || '').toLowerCase();
    return type === 'income' || type === 'receipt';
  }).reduce((sum, tx) => sum + Number(tx.Amount || tx.amount || 0), 0);
  const otherAP = otherTxs.filter(tx => {
    const type = (tx.Type || tx.type || '').toLowerCase();
    return type === 'expense' || type === 'payment';
  }).reduce((sum, tx) => sum + Number(tx.Amount || tx.amount || 0), 0);

  // Company totals (projects + other)
  const companyAR = projectsAR + otherAR;
  const companyAP = projectsAP + otherAP;
  const summaryTotals = { ar: companyAR, ap: companyAP };

  // For modal chart and breakdown (move this inside the component)
  const chartProjects = [
    ...visibleProjects,
    { id: 'other', name: 'Other', ar: otherAR, ap: otherAP }
  ].filter(p => (modalView === 'ar' ? p.ar > 0 : p.ap > 0));

  // Group "Other" transactions by category for AR/AP
  const otherCategoryTotals = {};
  otherTxs.forEach(tx => {
    const cat = tx.Category || tx.category || 'Other';
    const type = (tx.ExpenseType || tx.expenseType);
    if (!otherCategoryTotals[cat]) otherCategoryTotals[cat] = { ar: 0, ap: 0 };
    if (type === 'Income') otherCategoryTotals[cat].ar += Number(tx.Amount || tx.amount || 0);
    if (type === 'Expense') otherCategoryTotals[cat].ap += Number(tx.Amount || tx.amount || 0);
  });

  // Convert to array for rendering
  const otherCategoryRows = Object.entries(otherCategoryTotals).map(([cat, vals]) => ({
    category: cat,
    ar: vals.ar,
    ap: vals.ap
  }));

  const handleProjectSelect = (project) => {
    navigate(`/project/${project.id}`, {
      state: {
        project,
        organization
      }
    });
  };

  return (
    <div className="dashboard-main">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-left">
            <button
              className="back-btn"
              onClick={typeof onBack === 'function' ? onBack : () => window.history.back()}
            >
              ← Back
            </button>
            <h1>
              {organization?.name || 'Organization'}
            </h1>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => typeof onAddProject === 'function' && onAddProject(true)}
              style={{
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: 16
              }}
            >
              + Add Project
            </button>
            {/* Only one file upload button, styled like the old Upload File button */}
            <label htmlFor="company-upload-file">
              <input
                id="company-upload-file"
                type="file"
                accept=".csv,.xlsx"
                style={{ display: 'none' }}
                onChange={onFileUpload}
              />
              <button
                type="button"
                style={{
                  border: 'none',
                  background: '#2563eb',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 16
                }}
                onClick={() => document.getElementById('company-upload-file').click()}
              >
                📁 Choose File
              </button>
            </label>
          </div>
        </div>

        {/* Summary Cards (tab selector) */}
        <div className="summary-grid">
          <SummaryCard
            title="Accounts Receivable"
            value={totals.ar}
            icon={TrendingUp}
            color={dashboardView === 'ar' ? "card-green selected" : "card-green"}
            change="+15%"
            changeType="positive"
            onClick={() => navigate('/arap-breakdown', {
              state: {
                transactions: [
                  ...projects.flatMap(p => p.transactions || []),
                  ...(organization?.transactions || [])
                ],
                organizationId: organization?.id, // <-- Only pass the ID!
                orgName: organization?.name || 'Uploaded Data', // <-- If you need the name
                type: 'ar'
              }
            })}
            style={getCardStyle('ar')}
          />
          <SummaryCard
            title="Accounts Payable"
            value={totals.ap}
            icon={TrendingDown}
            color={dashboardView === 'ap' ? "card-orange selected" : "card-orange"}
            change="-5%"
            changeType="negative"
            onClick={() => navigate('/arap-breakdown', {
              state: {
                transactions: [
                  ...projects.flatMap(p => p.transactions || []),
                  ...(organization?.transactions || [])
                ],
                organization: organization || { name: 'Uploaded Data' },
                type: 'ap'
              }
            })}
            style={getCardStyle('ap')}
          />
          <SummaryCard
            title="Profit / Loss"
            value={Math.abs(totals.ar - totals.ap)}
            icon={IndianRupee}
            color={totals.ar - totals.ap >= 0 ? "card-green" : "card-red"}
            change={totals.ar - totals.ap >= 0 ? "Profit" : "Loss"}
            changeType={totals.ar - totals.ap >= 0 ? "positive" : "negative"}
          />
        </div>

        {/* REMOVE the AR/AP Tabbed View for Company Level below the cards */}
        {/* --- DELETE THIS BLOCK ---
        {dashboardView !== 'all' && (
          <div style={{ margin: '18px 0' }}>
            <div className="company-tab-dashboard" style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', padding: 24 }}>
              <h2 style={{ marginBottom: 18 }}>
                {dashboardView === 'ar' ? 'Accounts Receivable' : 'Accounts Payable'} — Project Breakdown
              </h2>
              <div style={{ height: 320, width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <Doughnut
                  data={{
                    labels: visibleProjects.map(p => p.name || p.projectName || `Project ${p.id}`),
                    datasets: [{
                      data: visibleProjects.map(p => dashboardView === 'ar' ? p.ar : p.ap),
                      backgroundColor: [
                        '#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#f59e0b'
                      ].slice(0, visibleProjects.length)
                    }]
                  }}
                />
              </div>
              <div>
                <h4>Project Breakdown</h4>
                {visibleProjects.length === 0 && <div style={{ color: '#666' }}>No records yet.</div>}
                {visibleProjects.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontWeight: 600 }}>{p.name || p.projectName || `Project ${p.id}`}</div>
                    <div style={{ fontWeight: 700 }}>
                      {(dashboardView === 'ar' ? p.ar : p.ap).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        --- END DELETE --- */}

        {/* Department Filter */}
        <select
          value={selectedDept}
          onChange={(e) => onDeptChange(e.target.value)}
          className="dept-filter"
          style={{
            marginLeft: 6,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #e5e7eb',
            fontSize: 14
          }}
        >
          <option value="all">All Departments</option>
          <option value="infra">Infra</option>
          <option value="designstudioz">DesignStudioz</option>
        </select>

        {/* Projects Section */}
        <div className="projects-section">
          <div className="section-header">
            <h2>
              {dashboardView === 'ar'
                ? 'Accounts Receivable Projects'
                : dashboardView === 'ap'
                ? 'Accounts Payable Projects'
                : selectedDept === 'all'
                ? 'All Projects'
                : selectedDept === 'infra'
                ? 'Infrastructure Projects'
                : selectedDept === 'designstudioz'
                ? 'Design Studio Projects'
                : 'Projects'}
            </h2>
            <div className="project-count">
              {visibleProjects.length} active projects
            </div>
          </div>
          {view === 'project' && selectedProject ? (
            <ProjectDashboard
              project={selectedProject}
              organization={organization}
              onBack={() => {
                setSelectedProject(null);
                setView('dashboard');
              }}
            />
          ) : (
            <div className="projects-grid">
              {/* Project cards */}
              {visibleProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onSelect={handleProjectSelect}
                />
              ))}
              {/* Add Other (Non-Project) card if there are any otherTxs */}
              {otherTxs.length > 0 && (
                <ProjectCard
                  key="other"
                  project={{
                    id: 'other',
                    name: 'Other (Non-Project)',
                    ar: otherAR,
                    ap: otherAP,
                    transactions: otherTxs,
                    isOther: true // flag for display logic
                  }}
                  onSelect={handleProjectSelect}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;