import React, { useState, useEffect } from 'react';
import { Building2, Code } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import OrganizationSelector from './OrganizationSelector';
import CompanyDashboard from './CompanyDashboard';
import ProjectDashboard from './ProjectDashboard';
import Header from './Header';
import '../Styles/Dashboard.css'; // Import the CSS file
import * as XLSX from 'xlsx'; // Add at top
import { Bar, Pie } from 'react-chartjs-2';
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
 
const API_BASE = 'http://localhost:3001'; // adjust if your server runs elsewhere
 
// Main Dashboard Component (now loads data from DB via API)
const OrganizationDashboard = ({ isLoggedIn, onLogout }) => {
  const location = useLocation();
  const userEmail = location.state?.userEmail || '';
  const organizationId = location.state?.organizationId || null;
 
  // Load initial view from localStorage, fallback to 'organizations'
  const [view, setView] = useState(() => localStorage.getItem('dashboardView') || 'organizations');
  const [selectedOrg, setSelectedOrg] = useState(() => {
    const org = localStorage.getItem('selectedOrg');
    return org ? JSON.parse(org) : null;
  });
  const [selectedDept, setSelectedDept] = useState(() => localStorage.getItem('selectedDept') || 'all');
  const [selectedProject, setSelectedProject] = useState(() => {
    const proj = localStorage.getItem('selectedProject');
    return proj ? JSON.parse(proj) : null;
  });
  const [organizations, setOrganizations] = useState([]);
  const [rawProjects, setRawProjects] = useState([]); // raw rows from API (contain DepartmentName etc.)
  const [departments, setDepartments] = useState([]);
  const [totals, setTotals] = useState({ budget:0, spent:0, profit:0, ar:0, ap:0, team:0 });
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [uploadedData, setUploadedData] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [showAmountPopup, setShowAmountPopup] = useState(false);
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [showUploadedPreview, setShowUploadedPreview] = useState(false);
  const navigate = useNavigate(); // Add this line
 
  // Save view/page state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboardView', view);
  }, [view]);
  useEffect(() => {
    localStorage.setItem('selectedOrg', JSON.stringify(selectedOrg));
  }, [selectedOrg]);
  useEffect(() => {
    localStorage.setItem('selectedDept', selectedDept);
  }, [selectedDept]);
  useEffect(() => {
    localStorage.setItem('selectedProject', JSON.stringify(selectedProject));
  }, [selectedProject]);
 
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
 
  // Auto-select organization based on email domain
  // useEffect(() => {
  //   if (!userEmail || !organizations.length) return;
 
  //   let orgToSelect = null;
  //   if (userEmail.toLowerCase().endsWith('@collabridge.com')) {
  //     orgToSelect = organizations.find(o => o.name.toLowerCase().includes('collabridge'));
  //   } else if (userEmail.toLowerCase().endsWith('@latierra.com')) {
  //     orgToSelect = organizations.find(o => o.name.toLowerCase().includes('la tierra') || o.name.toLowerCase().includes('buildcraft'));
  //   }
 
  //   if (orgToSelect && (!selectedOrg || selectedOrg.id !== orgToSelect.id)) {
  //     handleOrgSelect(orgToSelect.id);
  //   }
  // }, [userEmail, organizations]);
 
  // Auto-select organization if organizationId is present
  useEffect(() => {
  if (!organizationId || !organizations.length) return;
  const orgToSelect = organizations.find(o => o.id === Number(organizationId));
  if (orgToSelect && (!selectedOrg || selectedOrg.id !== orgToSelect.id)) {
    handleOrgSelect(orgToSelect.id);
  }
}, [organizationId, organizations]);
 
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
 
  const handleFileUpload = (e) => {
    setUploadError('');
    const file = e.target.files[0];
    if (!file) return;
 
    setUploadFileName(file.name);
 
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        setUploadedData(json);
      } catch (err) {
        setUploadError('Failed to parse file. Please upload a valid Excel or CSV.');
      }
    };
    reader.readAsBinaryString(file);
  };
 
    // Helper function to calculate metrics from Excel data
  const getExcelMetrics = (data) => {
    let totalAmount = 0;
    const byCategory = {};
    const byExpenseType = {};
 
    data.forEach(row => {
      const amount = Number(row.Amount || 0);
      totalAmount += amount;
 
      const category = row.Category || 'Uncategorized';
      byCategory[category] = (byCategory[category] || 0) + amount;
 
      const expenseType = row.ExpenseType || 'Expense';
      byExpenseType[expenseType] = (byExpenseType[expenseType] || 0) + amount;
    });
 
    return { totalAmount, byCategory, byExpenseType };
  };
 
    const handleSaveToDB = async () => {
      if (!uploadedData.length) return;
      const res = await fetch(`${API_BASE}/import-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows: uploadedData,
        uploaderEmail: userEmail,
        fileName: uploadFileName,
        organizationId: selectedOrg?.id || null
      })
    });
    const result = await res.json();
    alert(result.message || 'Import complete');
    setShowUploadedPreview(true); // Show preview after saving
  };
 
  // Move this helper function up, before you use it!
  const getFilteredUploadedData = () => {
    if (!uploadedData.length) return [];
    if (!dateFilter.from && !dateFilter.to) return uploadedData;
    return uploadedData.filter(row => {
      const rowDate = row.Date || row.TxnDate;
      if (!rowDate) return false;
      const d = new Date(rowDate);
      const from = dateFilter.from ? new Date(dateFilter.from) : null;
      const to = dateFilter.to ? new Date(dateFilter.to) : null;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  };
 
  const filteredExcelData = getFilteredUploadedData();
  const metrics = getExcelMetrics(filteredExcelData);
 
  const renderExcelCards = (metrics) => (
    <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
      <div
        className="card"
        style={{ flex: 1, background: '#e0f2fe', padding: 18, borderRadius: 8, cursor: 'pointer' }}
        onClick={() => setShowAmountPopup(true)}
        title="Click to view breakdown"
      >
        <h4>Total Amount</h4>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{metrics.totalAmount.toLocaleString()}</div>
      </div>
      <div className="card" style={{ flex: 1, background: '#fef9c3', padding: 18, borderRadius: 8 }}>
        <h4>Categories</h4>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {Object.entries(metrics.byCategory).map(([cat, amt]) => (
            <li key={cat} style={{ fontSize: 16 }}>{cat}: <b>{amt.toLocaleString()}</b></li>
          ))}
        </ul>
      </div>
      <div className="card" style={{ flex: 1, background: '#dcfce7', padding: 18, borderRadius: 8 }}>
        <h4>Expense Types</h4>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {Object.entries(metrics.byExpenseType).map(([type, amt]) => (
            <li key={type} style={{ fontSize: 16 }}>{type}: <b>{amt.toLocaleString()}</b></li>
          ))}
        </ul>
      </div>
    </div>
  );
 
  const renderExcelCharts = (metrics) => (
    <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
      <div style={{ flex: 1 }}>
        <h4>Amount by Category</h4>
        <Pie
          data={{
            labels: Object.keys(metrics.byCategory),
            datasets: [{
              data: Object.values(metrics.byCategory),
              backgroundColor: ['#3b82f6', '#10b981', '#f59e42', '#f43f5e', '#6366f1', '#fef9c3'],
            }]
          }}
          options={{ plugins: { legend: { position: 'bottom' } } }}
        />
      </div>
      <div style={{ flex: 1 }}>
        <h4>Amount by Expense Type</h4>
        <Bar
          data={{
            labels: Object.keys(metrics.byExpenseType),
            datasets: [{
              label: 'Amount',
              data: Object.values(metrics.byExpenseType),
              backgroundColor: '#3b82f6',
            }]
          }}
          options={{
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
          }}
        />
      </div>
    </div>
  );
 
  const renderRecentTransactions = (data) => (
    <div style={{ marginBottom: 24 }}>
      <h4>Recent Transactions</h4>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {data.slice(0, 5).map((row, idx) => (
          <div key={idx} style={{
            background: '#fff', border: '1px solid #eee', borderRadius: 8, padding: 14, minWidth: 180, boxShadow: '0 2px 8px #f3f4f6'
          }}>
            <div style={{ fontWeight: 600 }}>{row.Category || 'Uncategorized'}</div>
            <div style={{ color: '#3b82f6', fontSize: 18 }}>{Number(row.Amount || 0).toLocaleString()}</div>
            <div style={{ fontSize: 12, color: '#666' }}>{row.ExpenseType || 'Expense'} | {row.Date || row.TxnDate}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{row.Note || row.Description}</div>
          </div>
        ))}
      </div>
    </div>
  );
 
  // Helper to extract initial amount from uploaded Excel data
const getInitialAmountFromExcel = (data) => {
  if (!data || !data.length) return 0;
  // Look for a row with Category: "Initial" or ExpenseType: "Initial"
  const initialRow = data.find(
    row =>
      (row.Category && row.Category.toLowerCase() === 'initial') ||
      (row.ExpenseType && row.ExpenseType.toLowerCase() === 'initial')
  );
  if (initialRow) {
    return Number(initialRow.Amount || 0);
  }
  // Optionally, fallback to first row if you want
  // return Number(data[0].Amount || 0);
  return 0;
};
 
  const getAmountBreakdown = (data) => {
    // Dynamically get initial amount from Excel
    const initialAmount = getInitialAmountFromExcel(data);
 
    let totalExpenses = 0;
    let totalIncome = 0;
    const expenseDetails = {};
    const incomeDetails = {};
 
    data.forEach(row => {
      // Skip initial amount row from expense/income calculation
      const isInitial =
        (row.Category && row.Category.toLowerCase() === 'initial') ||
        (row.ExpenseType && row.ExpenseType.toLowerCase() === 'initial');
      if (isInitial) return;
 
      const amt = Number(row.Amount || 0);
      const type = (row.Category || '').toLowerCase();
      const expType = row.ExpenseType || 'Expense';
 
      if (type === 'expense' || expType.toLowerCase() === 'expense') {
        totalExpenses += amt;
        expenseDetails[expType] = (expenseDetails[expType] || 0) + amt;
      } else if (type === 'receipt' || expType.toLowerCase() === 'receipt' || expType.toLowerCase() === 'income') {
        totalIncome += amt;
        incomeDetails[expType] = (incomeDetails[expType] || 0) + amt;
      }
    });
 
    const remaining = initialAmount + totalIncome - totalExpenses;
    return { initialAmount, totalExpenses, totalIncome, remaining, expenseDetails, incomeDetails };
};
 
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
            projects={getFilteredProjects()}
            totals={Object.keys(totals).length ? totals : totals}
            onAddProject={setShowNewProjectForm}
            onFileUpload={handleFileUpload}
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
 
      {/* Amount Breakdown Popup */}
      {showAmountPopup && uploadedData.length > 0 && (
        <AmountBreakdownPopup
          breakdown={getAmountBreakdown(uploadedData)}
          onClose={() => setShowAmountPopup(false)}
        />
      )}
    </>
  );
};
 
const AmountBreakdownPopup = ({ breakdown, onClose }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  }}>
    <div style={{
      background: '#fff', borderRadius: 10, padding: 32, minWidth: 340, boxShadow: '0 4px 24px #0002', position: 'relative'
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer'
        }}
        aria-label="Close"
      >×</button>
      <h2 style={{ marginTop: 0 }}>Total Amount Breakdown</h2>
      <div style={{ marginBottom: 16 }}>
        <b>Initial Amount:</b> ₹{breakdown.initialAmount.toLocaleString()}
      </div>
      <div style={{ marginBottom: 16 }}>
        <b>Total Expenses:</b> ₹{breakdown.totalExpenses.toLocaleString()}
        <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
          {Object.entries(breakdown.expenseDetails).map(([cat, amt]) => (
            <li key={cat}>{cat}: ₹{amt.toLocaleString()}</li>
          ))}
        </ul>
      </div>
      <div style={{ marginBottom: 16 }}>
        <b>Total Income:</b> ₹{breakdown.totalIncome.toLocaleString()}
        <ul style={{ margin: '8px 0 0 16px', padding: 0 }}>
          {Object.entries(breakdown.incomeDetails).map(([cat, amt]) => (
            <li key={cat}>{cat}: ₹{amt.toLocaleString()}</li>
          ))}
        </ul>
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#10b981' }}>
        Remaining Balance: ₹{breakdown.remaining.toLocaleString()}
      </div>
    </div>
  </div>
);
 
export default OrganizationDashboard;