import React from 'react';

const SummaryCard = ({ title, value, icon: Icon, color, change, changeType, onClick, style }) => (
  <div className="summary-card" onClick={onClick} style={style}>
    <div className="card-header">
      <div className={`card-icon ${color}`}>
        <Icon size={24} />
      </div>
      <div className={`card-change ${changeType}`}>
        {change}
      </div>
    </div>
    <div className="card-value">
      {value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
    </div>
    <div className="card-title">{title}</div>
  </div>
);

export default SummaryCard;