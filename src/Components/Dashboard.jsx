import React, { useState, useEffect } from 'react';
import { Building2, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OrganizationSelector from './OrganizationSelector';
import CompanyDashboard from './CompanyDashboard';
import ProjectDashboard from './ProjectDashboard';
import Header from './Header';
import '../Styles/Dashboard.css'; // Import the CSS file

const API_BASE = 'http://localhost:3001'; // adjust if your server runs elsewhere

// Main Dashboard Component (now loads data from DB via API)
const OrganizationDashboard = ({ isLoggedIn, onLogout }) => {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  const [view, setView] = useState('organizations'); // organizations, dashboard, project
  const [rawProjects, setRawProjects] = useState([]); // raw rows from API (contain DepartmentName etc.)
  const [departments, setDepartments] = useState([]);
  const [totals, setTotals] = useState({ budget:0, spent:0, profit:0, ar:0, ap:0, team:0 });
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const navigate = useNavigate(); // Add this line

  useEffect(() => {
    // load organizations list
    const loadOrgs = async () => {
      try {
        const res = await fetch(`${API_BASE}/organizations`);
        const data = await res.json();
        const mapped = data.map(o => ({
          id: o.OrganizationID,
          name: o.Name,
          type: o.Type || '',
          description: o.Description || '',
          // choose icons/colors by name/type to keep existing UI consistent
          icon: o.Name && o.Name.toLowerCase().includes('collabridge') ? Code : Building2,
          color: o.Name && o.Name.toLowerCase().includes('la tierra') ? '#10b981' : '#3b82f6'
        }));
        setOrganizations(mapped);
      } catch (err) {
        console.error('Error loading organizations:', err);
      }
    };
    loadOrgs();
  }, []);

  const handleOrgSelect = async (orgId) => {
    setSelectedDept('all');
    setSelectedProject(null);
    setView('dashboard');

    try {
      // get organization details
      const orgRes = await fetch(`${API_BASE}/organizations/${orgId}`);
      const orgData = await orgRes.json();

      // projects for organization
      const projRes = await fetch(`${API_BASE}/projects?organizationId=${orgId}`);
      const projRows = await projRes.json();

      // departments list for filters
      const deptRes = await fetch(`${API_BASE}/departments?organizationId=${orgId}`);
      const deptRows = await deptRes.json();

      // map project rows to the shape used by UI (keep DepartmentName for filtering)
      const mappedProjects = (projRows || []).map(p => {
        const budget = Number(p.Budget || 0);
        const spent = Number(p.Spending || 0);
        const profit = Number(p.Profit !== undefined ? p.Profit : (budget - spent));
        return {
          id: p.ProjectID || p.ProjectId || p.id,
          name: p.ProjectName || p.Name || '',
          status: (p.Status || '').toString(),
          budget,
          spent,
          profit,
          ar: Number(p.AR || 0),            // fallback 0, server may not supply project-level AR
          ap: Number(p.AP !== undefined ? p.AP : spent), // fallback to spent as payable approximation
          team: Number(p.Team || 0),        // not present in DB seed -> 0 unless backend supplies it
          deadline: p.EndDate || p.deadline || '',
          departmentName: p.DepartmentName || ''
        };
      });

      setRawProjects(mappedProjects);
      // set selectedOrg with API info + mapped projects
      setSelectedOrg({
        id: orgData.OrganizationID || orgId,
        name: orgData.Name || '',
        type: orgData.Type || '',
        description: orgData.Description || '',
        projects: mappedProjects,
        color: organizations.find(o => o.id === orgId)?.color || '#3b82f6',
        icon: organizations.find(o => o.id === orgId)?.icon || Building2
      });

      // normalize departments
      setDepartments((deptRows || []).map(d => ({ id: d.DepartmentID, name: d.Name })));

      // totals: try to use organization dashboard endpoint
      try {
        const dashRes = await fetch(`${API_BASE}/organizations/${orgId}/dashboard`);
        if (dashRes.ok) {
          const dash = await dashRes.json();
          setTotals({
            budget: Number(dash.totalBudget || 0),
            spent: Number(dash.totalSpending || 0),
            profit: Number(dash.totalBudget || 0) - Number(dash.totalSpending || 0),
            ar: Number(dash.totalAR || 0),
            ap: Number(dash.totalAP || 0),
            team: mappedProjects.reduce((s,p) => s + (p.team||0), 0)
          });
        } else {
          // fallback compute from projects
          computeTotalsFromProjects(mappedProjects);
        }
      } catch (err) {
        computeTotalsFromProjects(mappedProjects);
      }
    } catch (err) {
      console.error('Error selecting organization:', err);
    }
  };

  const computeTotalsFromProjects = (projects) => {
    const t = projects.reduce((acc, project) => ({
      budget: acc.budget + (project.budget || 0),
      spent: acc.spent + (project.spent || 0),
      profit: acc.profit + (project.profit || 0),
      ar: acc.ar + (project.ar || 0),
      ap: acc.ap + (project.ap || 0),
      team: acc.team + (project.team || 0)
    }), { budget:0, spent:0, profit:0, ar:0, ap:0, team:0 });
    setTotals(t);
  };

  const handleProjectSelect = (project) => {
    // project could be raw project object from projects list
    setSelectedProject(project);
    setView('project');
  };

  const handleBack = () => {
    if (view === 'project') {
      setView('dashboard');
      setSelectedProject(null);
    } else {
      setView('organizations');
      setSelectedOrg(null);
      setSelectedDept('all');
      setRawProjects([]);
      setDepartments([]);
      setTotals({ budget:0, spent:0, profit:0, ar:0, ap:0, team:0 });
    }
  };

  const getFilteredProjects = () => {
    if (!selectedOrg) return [];

    if (selectedOrg.id === 1 && selectedOrg.projects) {
      // legacy behavior: org 1 is "software" with simple projects list
      return selectedOrg.projects;
    }

    if (selectedDept === 'all') {
      return rawProjects;
    } else if (selectedDept === 'infra') {
      return rawProjects.filter(p => (p.departmentName || '').toLowerCase().includes('infras') || (p.departmentName || '').toLowerCase().includes('infra'));
    } else if (selectedDept === 'designstudioz') {
      return rawProjects.filter(p => (p.departmentName || '').toLowerCase().includes('design'));
    }
    return rawProjects;
  };

  const calculateTotals = (projects) => {
    return projects.reduce((acc, project) => ({
      budget: acc.budget + (project.budget || 0),
      spent: acc.spent + (project.spent || 0),
      profit: acc.profit + (project.profit || 0),
      ar: acc.ar + (project.ar || 0),
      ap: acc.ap + (project.ap || 0),
      team: acc.team + (project.team || 0)
    }), { budget: 0, spent: 0, profit: 0, ar: 0, ap: 0, team: 0 });
  };

  // called after a new project is created to refresh
  const handleProjectCreated = async () => {
    setShowNewProjectForm(false);
    if (selectedOrg && selectedOrg.id) {
      // re-load selected organization data (reuse handleOrgSelect)
      await handleOrgSelect(selectedOrg.id);
    }
  };

  // Inline modal component (no separate NewProjectForm file)
  const NewProjectModal = ({ organizationId, departments = [], onCreated, onCancel }) => {
    const [form, setForm] = useState({
      name: '',
      departmentId: '',
      startDate: '',
      endDate: '',
      budget: '',
      spending: '',
      status: 'Not Started',
      description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const onKey = (e) => { if (e.key === 'Escape') onCancel && onCancel(); };
      window.addEventListener('keydown', onKey);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener('keydown', onKey);
      };
    }, [onCancel]);

    const update = (k, v) => setForm(s => ({ ...s, [k]: v }));

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (submitting) return;
      setSubmitting(true);
      const payload = {
        Name: form.name,
        DepartmentID: form.departmentId || null,
        OrganizationID: organizationId || null,
        StartDate: form.startDate || null,
        EndDate: form.endDate || null,
        Budget: form.budget ? parseFloat(form.budget) : 0,
        Spending: form.spending ? parseFloat(form.spending) : 0,
        Status: form.status,
        Description: form.description || null
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
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div
        className="modal-overlay"
        onMouseDown={() => onCancel && onCancel()}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}
      >
        <div
          className="modal-panel"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            width: 720, maxWidth: '95%', background: '#fff', borderRadius: 8, padding: 20,
            boxShadow: '0 10px 30px rgba(0,0,0,0.25)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Create New Project</h2>
            <button
              type="button"
              onClick={() => onCancel && onCancel()}
              aria-label="Close"
              style={{ border: 0, background: 'transparent', fontSize: 20, lineHeight: 1, cursor: 'pointer' }}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Project Name</label>
                <input required value={form.name} onChange={e => update('name', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Department</label>
                <select value={form.departmentId} onChange={e => update('departmentId', e.target.value)} style={{ width: '100%', padding: 8 }}>
                  <option value="">-- none -- (organization-level)</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Start Date</label>
                <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>End Date</label>
                <input type="date" value={form.endDate} onChange={e => update('endDate', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Budget</label>
                <input type="number" value={form.budget} onChange={e => update('budget', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Spending</label>
                <input type="number" value={form.spending} onChange={e => update('spending', e.target.value)} style={{ width: '100%', padding: 8 }} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Status</label>
                <select value={form.status} onChange={e => update('status', e.target.value)} style={{ width: '100%', padding: 8 }}>
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>On Hold</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Description (optional)</label>
                <textarea value={form.description} onChange={e => update('description', e.target.value)} style={{ width: '100%', padding: 8 }} rows={3} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={() => onCancel && onCancel()} style={{ padding: '8px 14px' }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{ padding: '8px 14px' }}>
                {submitting ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const filtered = getFilteredProjects();
  const computedTotals = calculateTotals(filtered);

  return (
    <>
      <Header isLoggedIn={isLoggedIn} onLogout={onLogout} />
      {view === 'organizations' && (
        <OrganizationSelector
          organizations={organizations}
          onSelect={handleOrgSelect}
        />
      )}

      {view === 'project' && selectedProject && (
        <ProjectDashboard 
          project={selectedProject} 
          organization={selectedOrg}
          onBack={handleBack} 
        />
      )}

      {view === 'dashboard' && (
        <>
          <CompanyDashboard
            organization={selectedOrg}
            selectedDept={selectedDept}
            onDeptChange={setSelectedDept}
            onProjectSelect={handleProjectSelect}
            onBack={handleBack}
            projects={filtered}
            totals={Object.keys(computedTotals).length ? computedTotals : totals}
            onAddProject={setShowNewProjectForm}
          />
          {showNewProjectForm && selectedOrg && (
            <NewProjectModal
              organizationId={selectedOrg.id}
              departments={departments}
              onCreated={handleProjectCreated}
              onCancel={() => setShowNewProjectForm(false)}
            />
          )}
        </>
      )}
    </>
  );
};

export default OrganizationDashboard;