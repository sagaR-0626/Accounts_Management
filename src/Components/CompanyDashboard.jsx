import React, { useState } from 'react';
import { TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';
import SummaryCard from './SummaryCard';
import ProjectCard from './ProjectCard';

const CompanyDashboard = ({
  organization,
  selectedDept,
  onDeptChange,
  onProjectSelect,
  onAddProject,
  onFileUpload,
  onBack,           // <-- Add this line
  projects = [],
  totals = { ar: 0, ap: 0 },
}) => {
  // Tab state: 'all', 'ar', 'ap'
  const [dashboardView, setDashboardView] = useState('all');

  // Filter projects by department and AR/AP tab
  const visibleProjects = projects.filter((project) => {
    if (selectedDept && selectedDept !== 'all' && project.department !== selectedDept) return false;
    if (dashboardView === 'ar') return project.ar > 0;
    if (dashboardView === 'ap') return project.ap > 0;
    return true;
  });

  // Filter transactions for AR/AP tab (company level)
  const allTxs = projects.flatMap((p) => p.transactions || []);
  const filteredTxs = allTxs.filter((tx) =>
    dashboardView === 'ar'
      ? (tx.ExpenseType || tx.expenseType) === 'Income'
      : dashboardView === 'ap'
      ? (tx.ExpenseType || tx.expenseType) === 'Expense'
      : true
  );

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
                📁 Upload File
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
            onClick={() => setDashboardView('ar')}
            style={getCardStyle('ar')}
          />
          <SummaryCard
            title="Accounts Payable"
            value={totals.ap}
            icon={TrendingDown}
            color={dashboardView === 'ap' ? "card-orange selected" : "card-orange"}
            change="-5%"
            changeType="negative"
            onClick={() => setDashboardView('ap')}
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
          {dashboardView !== 'all' && (
            <button
              style={{
                marginLeft: 12,
                padding: '8px 18px',
                borderRadius: 8,
                border: 'none',
                background: '#e5e7eb',
                color: '#2563eb',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              onClick={() => setDashboardView('all')}
            >
              Show All
            </button>
          )}
        </div>

        {/* AR/AP Tabbed View for Company Level */}
        {dashboardView !== 'all' && (
          <div style={{ margin: '18px 0' }}>
            <div className="company-tab-dashboard" style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.04)', padding: 24 }}>
              <h2 style={{ marginBottom: 18 }}>
                {dashboardView === 'ar' ? 'Accounts Receivable' : 'Accounts Payable'} — Company Level
              </h2>
              <div style={{ marginBottom: 18 }}>
                <strong>Total {dashboardView === 'ar' ? 'Receipts' : 'Expenses'}:</strong>{' '}
                {filteredTxs.reduce((sum, tx) => sum + Number(tx.Amount || tx.amount || 0), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
              </div>
              <div style={{ marginBottom: 18 }}>
                <h4>Category Breakdown</h4>
                {categoryTotals.length === 0 && <div style={{ color: '#666' }}>No records yet.</div>}
                {categoryTotals.map(c => (
                  <div key={c.category} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontWeight: 600 }}>{c.category}</div>
                    <div style={{ fontWeight: 700 }}>
                      {c.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </div>
                  </div>
                ))}
              </div>
              {/* You can add charts here similar to ProjectDashboard if needed */}
            </div>
          </div>
        )}

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
          <div className="projects-grid">
            {visibleProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={onProjectSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;