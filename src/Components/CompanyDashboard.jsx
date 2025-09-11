import React, { useState } from 'react';
// Header import removed
import { ArrowLeft, Filter, TrendingUp, TrendingDown, IndianRupee, Users, Plus } from 'lucide-react';
import SummaryCard from './SummaryCard';
import ProjectCard from './ProjectCard';

const CompanyDashboard = ({
  organization,
  selectedDept,
  onDeptChange,
  onProjectSelect,
  onBack,
  projects,
  totals,
  onAddProject, // <-- new prop (function to toggle new-project UI)
  onFileUpload // <-- add this prop for file upload
}) => {
  // Add dashboardView state
  const [dashboardView, setDashboardView] = useState('all'); // 'all', 'ar', 'ap'

  // Filter projects based on dashboardView
  const filteredProjects = dashboardView === 'all'
    ? projects
    : projects.filter(p => {
        if (dashboardView === 'ar') {
          return (p.ar ?? p.AR ?? 0) > 0;
        } else {
          return (p.ap ?? p.AP ?? 0) > 0;
        }
      });

  return (
    <div className="dashboard-main">
      <div className="dashboard-container">
        {/* Header (moved to top-level Dashboard) */}
        <div className="dashboard-header">
          <div className="header-left">
            <button onClick={onBack} className="back-btn">
              <ArrowLeft size={20} />
              Back
            </button>
            <div>
              <h1
                className={
                  organization && organization.name === 'Collabridge Solutions'
                    ? 'company-name-collabridge'
                    : organization && organization.name === 'LA tierra'
                    ? 'company-name-la-tierra'
                    : ''
                }
              >
                {organization ? organization.name : ''}
              </h1>
              <p>{organization ? organization.type : ''}</p>
            </div>
          </div>

          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
  
  {/* Add Transaction button */}
  <button
    onClick={() => onAddProject && onAddProject()}
    className="add-transaction-btn"
    style={{
      border: 'none',
      background: '#2563eb',
      color: '#fff',
      padding: '8px 16px',
      borderRadius: 8,
      fontWeight: 500,
      fontSize: 15,
      boxShadow: '0 2px 8px rgba(16,185,129,0.08)',
      transition: 'background 0.2s',
      cursor: 'pointer'
    }}
  >
    <Plus size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
    Add Project
  </button>

  {/* Upload File Button */}
  <label
    htmlFor="upload-file-input"
    className="add-transaction-btn"
    style={{
      border: 'none',
      background: '#2563eb',
      color: '#fff',
      padding: '8px 16px',
      borderRadius: 8,
      fontWeight: 500,
      fontSize: 15,
      boxShadow: '0 2px 8px rgba(16,185,129,0.08)',
      transition: 'background 0.2s',
      cursor: 'pointer',
      marginLeft: 8
    }}
  >
    <Plus size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
    Upload File
    <input
      id="upload-file-input"
      type="file"
      accept=".xlsx,.csv"
      style={{ display: 'none' }}
      onChange={typeof onFileUpload === 'function' ? onFileUpload : undefined}
    />
  </label>

  {/* Department Filter for Construction */}
  {organization && organization.id === 2 && (
    <div className="filter-section" style={{ marginLeft: 16 }}>
      <Filter size={20} />
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
    </div>
  )}
</div>
        </div>

        {/* Summary Cards */}
        <div className="summary-grid">
          {/* REMOVE THESE CARDS */}
          {/* 
          <SummaryCard
            title="Project Budget"
            ...
          />
          <SummaryCard
            title="Amount Spent"
            ...
          />
          <SummaryCard
            title="Team Size"
            ...
          />
          */}
          {/* KEEP ONLY THE AR/AP/Profit-Loss CARDS */}
          <SummaryCard
            title="Accounts Receivable"
            value={totals.ar.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            icon={TrendingUp}
            color={dashboardView === 'ar' ? "card-green selected" : "card-green"}
            change="+15%"
            changeType="positive"
            onClick={() => setDashboardView('ar')}
            style={{ cursor: 'pointer' }}
          />
          <SummaryCard
            title="Accounts Payable"
            value={totals.ap.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            icon={TrendingDown}
            color={dashboardView === 'ap' ? "card-orange selected" : "card-orange"}
            change="-5%"
            changeType="negative"
            onClick={() => setDashboardView('ap')}
            style={{ cursor: 'pointer' }}
          />
          <SummaryCard
            title="Profit / Loss"
            value={Math.abs(totals.ar - totals.ap).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            icon={IndianRupee}
            color={totals.ar - totals.ap >= 0 ? "card-green" : "card-red"}
            change={totals.ar - totals.ap >= 0 ? "Profit" : "Loss"}
            changeType={totals.ar - totals.ap >= 0 ? "positive" : "negative"}
          />
        </div>

        {/* Projects Section */}
        <div className="projects-section">
          <div className="section-header">
            <h2>
              {selectedDept === 'all' ? 'All Projects' : 
                selectedDept === 'infra' ? 'Infrastructure Projects' :
                selectedDept === 'designstudioz' ? 'Design Studio Projects' : 'Projects'}
            </h2>
            <div className="project-count">
              {filteredProjects.length} active projects
            </div>
          </div>
          <div className="projects-grid">
            {filteredProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onSelect={onProjectSelect}
              />
            ))}
          </div>
        </div>

        {/* Financial Overview */}
        <div className="financial-grid">
          <div className="financial-card">
            <h3>Profit/Loss Overview</h3>
            <div className="financial-list">
              {filteredProjects.map((project) => (
                <div key={project.id} className="financial-item">
                  <div>
                    <div className="project-id">{project.id}</div>
                    <div className="project-name">{project.name}</div>
                  </div>
                  <div className={`profit-value ${project.profit >= 0 ? 'positive' : 'negative'}`}>
                    {Math.abs(project.profit).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;