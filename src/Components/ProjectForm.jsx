// filepath: c:\Users\VivekReddyMeka\Desktop\test\Reports\src\Components\NewProjectForm.jsx
import React, { useState } from 'react';

const API_BASE = 'http://localhost:3001';

const ProjectForm = ({ organizationId, departments = [], onCreated, onCancel }) => {
  const [form, setForm] = useState({
    name: '',
    departmentId: '',
    startDate: '',
    endDate: '',
    budget: '',
    spending: '',
    status: 'Not Started'
  });

  const update = (k, v) => setForm(s => ({ ...s, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      Name: form.name,
      DepartmentID: form.departmentId || null,
      OrganizationID: organizationId,
      StartDate: form.startDate || null,
      EndDate: form.endDate || null,
      Budget: form.budget ? parseFloat(form.budget) : null,
      Spending: form.spending ? parseFloat(form.spending) : 0,
      Status: form.status
    };
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onCreated && onCreated();
      } else {
        const err = await res.json().catch(()=>({}));
        alert('Failed to create project: ' + (err.error || res.statusText));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create project');
    }
  };

  return (
    <div className="new-project-form">
      <form onSubmit={handleSubmit}>
        <div>
          <label>Project Name</label>
          <input value={form.name} onChange={e => update('name', e.target.value)} required />
        </div>
        <div>
          <label>Department</label>
          <select value={form.departmentId} onChange={e => update('departmentId', e.target.value)}>
            <option value="">-- none -- (organization-level)</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label>Start Date</label>
          <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} />
        </div>
        <div>
          <label>End Date</label>
          <input type="date" value={form.endDate} onChange={e => update('endDate', e.target.value)} />
        </div>
        <div>
          <label>Budget</label>
          <input type="number" value={form.budget} onChange={e => update('budget', e.target.value)} />
        </div>
        <div>
          <label>Spending</label>
          <input type="number" value={form.spending} onChange={e => update('spending', e.target.value)} />
        </div>
        <div className="form-actions">
          <button type="submit">Create Project</button>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;