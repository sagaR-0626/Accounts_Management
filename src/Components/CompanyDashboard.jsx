import React from 'react';
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
  onAddProject // <-- new prop (function to toggle new-project UI)
}) => (
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

        <div className="header-right">
          {/* Add Project button */}
          <button onClick={() => onAddProject && onAddProject(true)} className="add-project-btn">
            <Plus size={16} /> Add Project
          </button>

          {/* Department Filter for Construction */}
          {organization && organization.id === 2 && (
            <div className="filter-section">
              <Filter size={20} />
              <select
                value={selectedDept}
                onChange={(e) => onDeptChange(e.target.value)}
                className="dept-filter"
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
        <SummaryCard
          title="Accounts Receivable"
          value={totals.ar.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          icon={TrendingUp}
          color="card-green"
          change="+15%"
          changeType="positive"
        />
        <SummaryCard
          title="Accounts Payable"
          value={totals.ap.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          icon={TrendingDown}
          color="card-orange"
          change="-5%"
          changeType="negative"
        />
        <SummaryCard
          title="Profit / Loss"
          value={Math.abs(totals.profit).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          icon={IndianRupee}
          color={totals.profit >= 0 ? "card-green" : "card-red"}
          change={totals.profit >= 0 ? "Profit" : "Loss"}
          changeType={totals.profit >= 0 ? "positive" : "negative"}
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
            {projects.length} active projects
          </div>
        </div>
        <div className="projects-grid">
          {projects.map((project) => (
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
            {projects.map((project) => (
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
        <div className="financial-card">
          <h3>Team Distribution</h3>
          <div className="financial-list">
            {projects.map((project) => (
              <div key={project.id} className="financial-item">
                <div>
                  <div className="project-id">{project.id}</div>
                  <div className="project-name">{project.name}</div>
                </div>
                <div className="team-info">
                  <Users size={16} />
                  <span>{project.team}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default CompanyDashboard;