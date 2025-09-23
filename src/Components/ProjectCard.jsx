import React from 'react';
import { Eye } from 'lucide-react';

const ProjectCard = ({ project, onSelect }) => {
  const progressPercentage = (project.spent / project.budget) * 100;

  // Safely handle department fields
  const dept = project.department || project.departmentName;
  const deptLower = dept ? dept.toLowerCase() : '';

  // Safely handle status field
  const statusLower = project.status ? project.status.toLowerCase() : '';

  return (
    <div className="project-card" onClick={() => onSelect(project)}>
      <div className="project-card-header">
        <div className="project-info">
          <div className="project-id">{project.id}</div>
          <div className="project-name">{project.name}</div>
        </div>
        <div className="project-actions">
          <div className={`status-badge ${statusLower}`}>
            {project.status || 'Unknown'}
          </div>
          <Eye size={18} className="view-icon" />
        </div>
      </div>
      <div className="project-stats">
        <div className="stat-item">
          <div className="stat-label">A/R</div>
          <div className="stat-value">{isNaN(project.ar) ? '0.0k' : (project.ar / 1000).toFixed(1) + 'k'}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">A/P</div>
          <div className="stat-value">{isNaN(project.ap) ? '0.0k' : (project.ap / 1000).toFixed(1) + 'k'}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Profit/Loss</div>
          <div className={`stat-value ${project.profit >= 0 ? 'profit' : 'loss'}`}>
            {isNaN(project.profit) ? '0.0k' : (Math.abs(project.profit / 1000).toFixed(1) + 'k')}
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Team</div>
          <div className="stat-value">{project.team}</div>
        </div>
      </div>
      <div className="project-progress">
        <div className={`progress-bar ${
          progressPercentage > 90 ? 'danger' :
          progressPercentage > 70 ? 'warning' : 'success'
        }`}>
          <div 
            className="progress-fill"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="progress-text">
          {progressPercentage.toFixed(1)}% of budget used
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;