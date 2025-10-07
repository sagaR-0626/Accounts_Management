import React, { useState, useEffect } from 'react';
import { Building2, Code } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import OrganizationSelector from './OrganizationSelector';
import CompanyDashboard from './CompanyDashboard';
import ProjectDashboard from './ProjectDashboard';
import Header from './Header';
import '../Styles/Dashboard.css';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { calculateDashboardMetrics, getBreakdownByCategory } from '../utils/Calculations';

const API_BASE = 'http://localhost:3001';
const dbFields = [
  'OrganizationID', 'OrgName', 'TxnID', 'TxnDate', 'Category', 'Item', 'Type', 'Amount', 'ProjectID', 'ProjectName'
];

const DashboardCard = ({ title, value, color, onClick }) => (
  <div
    style={{
      flex: '1 1 0',
      background: color,
      color: '#fff',
      borderRadius: 12,
      padding: '32px 24px',
      textAlign: 'center',
      boxShadow: '0 2px 8px #0002',
      minWidth: 200,
      fontSize: 20,
      cursor: onClick ? 'pointer' : 'default'
    }}
    onClick={onClick}
  >
    <div style={{ fontSize: 18, marginBottom: 8 }}>{title}</div>
    <div style={{ fontSize: 32, fontWeight: 700 }}>
      {title === 'Net Margin (%)'
        ? `${value}%`
        : `₹${Number(value).toLocaleString()}`}
    </div>
  </div>
);

const BreakdownModal = ({ type, breakdown, onClose }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    background: '#0007', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
  }}>
    <div style={{ background: '#fff', borderRadius: 10, padding: 32, minWidth: 400 }}>
      <h3>{type.charAt(0).toUpperCase() + type.slice(1)} Breakdown by Category</h3>
      <table style={{ width: '100%', marginTop: 16 }}>
        <thead>
          <tr>
            <th>Category</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(breakdown).map(([cat, amt]) => (
            <tr key={cat}>
              <td>{cat}</td>
              <td>₹{amt.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button style={{ marginTop: 24 }} onClick={onClose}>Close</button>
    </div>
  </div>
);

const Dashboard = ({ isLoggedIn, onLogout }) => {
  const location = useLocation();
  const userEmail = location.state?.userEmail || '';
  const organizationId = location.state?.organizationId || null;
  const navigate = useNavigate();

  // --- State declarations ---
  const [view, setView] = useState(() => localStorage.getItem('dashboardView') || 'organizations');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [rawProjects, setRawProjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Excel/DB Import states ---
  const [excelData, setExcelData] = useState([]);
  const [excelColumns, setExcelColumns] = useState([]);
  const [columnMap, setColumnMap] = useState({});
  const [uploadFileName, setUploadFileName] = useState('');
  const [importedRows, setImportedRows] = useState([]);
  const [projectsFromDB, setProjectsFromDB] = useState([]);
  const [step, setStep] = useState(1);

  // --- Modal state for breakdown ---
  const [modalView, setModalView] = useState(null); // 'ar', 'ap', 'profit', 'loss', null

  // --- Prevent access to other organizations by direct URL ---
  useEffect(() => {
    if (selectedOrg && String(selectedOrg.id) !== String(organizationId)) {
      setView('organizations');
      setSelectedOrg(null);
    }
  }, [selectedOrg, organizationId]);

  // --- Load organizations ---
  useEffect(() => {
    const loadOrgs = async () => {
      try {
        const res = await fetch(`${API_BASE}/organizations`);
        const data = await res.json();
        const mapped = data.map(o => ({
          id: o.OrganizationID,
          name: o.Name,
          type: o.Type || '',
          description: o.Description || '',
          // Use icon and color from DB, fallback if missing
          icon: o.icon === 'Code' ? Code : Building2,
          color: o.color || '#3b82f6'
        }));
        setOrganizations(mapped);
      } catch (err) {
        console.error('Error loading organizations:', err);
      }
    };
    loadOrgs();
  }, []);

  // --- Organization selection ---
  const handleOrgSelect = async (orgId) => {
    setLoading(true);
    setSelectedDept('all');
    setSelectedProject(null);
    setView('dashboard');
    setStep(1);

    // --- Clear previous organization data ---
    // setImportedRows([]);
    // setProjectsFromDB([]);
    // localStorage.removeItem('importedRows');
    // localStorage.removeItem('selectedOrg');

    try {
      // Fetch organization, projects, departments for the selected org
      const orgRes = await fetch(`${API_BASE}/organizations/${orgId}`);
      const orgData = await orgRes.json();

      const projRes = await fetch(`${API_BASE}/projects?organizationId=${orgId}`);
      const projRows = await projRes.json();

      const deptRes = await fetch(`${API_BASE}/departments?organizationId=${orgId}`);
      const deptRows = await deptRes.json();

      // --- Fetch transactions for this organization ---
      const importedRes = await fetch(`${API_BASE}/imported-transactions?organizationId=${orgId}`);
      const imported = await importedRes.json();
      setImportedRows(imported);
      localStorage.setItem('importedRows', JSON.stringify(imported));

      // --- Fetch project financials for this organization ---
      const projFinRes = await fetch(`${API_BASE}/project-financials?organizationId=${orgId}`);
      const projFin = await projFinRes.json();
      setProjectsFromDB(Array.isArray(projFin) ? projFin : []);

      const mappedProjects = (projRows || []).map(p => ({
        id: p.ProjectID || p.ProjectId || p.id,
        name: p.ProjectName || p.Name || p.name || '',
        status: (p.Status || p.status || '').toString(),
        budget: Number(p.Budget ?? p.budget ?? 0),
        spent: Number(p.Spending ?? p.spent ?? 0),
        profit: Number(
          p.Profit !== undefined
            ? p.Profit
            : (Number(p.Budget ?? p.budget ?? 0) - Number(p.Spending ?? p.spent ?? 0))
        ),
        ar: Number(p.AR ?? p.ar ?? 0),
        ap: Number(p.AP ?? p.ap ?? Number(p.Spending ?? p.spent ?? 0)),
        team: Number(p.Team ?? p.team ?? 0),
        deadline: p.EndDate || p.deadline || '',
        departmentName: p.DepartmentName || p.departmentName || '',
        transactions: p.transactions || []
      }));

      setRawProjects(mappedProjects);
      setSelectedOrg({
        id: orgData.OrganizationID || orgId,
        name: orgData.Name && orgData.Name.trim() ? orgData.Name : (organizations.find(o => o.id === orgId)?.name || ''),
        type: orgData.Type && orgData.Type.trim() ? orgData.Type : (organizations.find(o => o.id === orgId)?.type || ''),
        description: orgData.Description && orgData.Description.trim() ? orgData.Description : (organizations.find(o => o.id === orgId)?.description || ''),
        projects: mappedProjects,
        color: organizations.find(o => o.id === orgId)?.color || '#3b82f6',
        icon: organizations.find(o => o.id === orgId)?.icon || Building2
      });
      localStorage.setItem('selectedOrg', JSON.stringify(orgData));

      setDepartments((deptRows || []).map(d => ({ id: d.DepartmentID, name: d.Name })));
    } catch (err) {
      console.error('Error selecting organization:', err);
    }
    setLoading(false);
  };

  // --- Excel Upload & Direct Import ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFileName(file.name);

    let rows = [];
    if (file.name.endsWith('.csv')) {
      await new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            rows = results.data;
            resolve();
          },
          error: reject
        });
      });
    } else {
      const data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target.result);
        reader.readAsBinaryString(file);
      });
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }

    const columnMap = {
      OrganizationID: 'Org Id',
      OrgName: 'Org name',
      TxnID: 'TxnID',
      TxnDate: 'TxnDate',
      Category: 'Category',
      Item: 'Item',
      Type: 'Type',
      Amount: 'Amount',
      ProjectID: 'ProjectID',
      ProjectName: 'ProjectName'
    };

    // --- Upload with orgId ---
    await fetch(`${API_BASE}/import-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows,
        uploaderEmail: userEmail,
        fileName: file.name,
        organizationId: selectedOrg?.id || organizationId, // always tie to org
        columnMap
      })
    });

    // --- Fetch back data for this org only ---
    const importedRes = await fetch(
      `${API_BASE}/imported-transactions?organizationId=${selectedOrg?.id || organizationId}`
    );
    const imported = await importedRes.json();
    setImportedRows(imported);

    // Save with org-specific key
    if (selectedOrg?.id || organizationId) {
      localStorage.setItem(
        `importedRows_${selectedOrg?.id || organizationId}`,
        JSON.stringify(imported)
      );
    }

    const projFinRes = await fetch(
      `${API_BASE}/project-financials?organizationId=${selectedOrg?.id || organizationId}`
    );
    const projFin = await projFinRes.json();
    setProjectsFromDB(Array.isArray(projFin) ? projFin : []);

    if (selectedOrg?.id || organizationId) {
      localStorage.setItem(
        `projectsFromDB_${selectedOrg?.id || organizationId}`,
        JSON.stringify(projFin)
      );
    }
  };

  // --- Use calculation logic for dashboard metrics ---
  const dashboardMetrics = calculateDashboardMetrics(importedRows);

  // --- Project selection handler ---
  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setView('project');
  };

  // --- Build projects with transactions from importedRows ---
  useEffect(() => {
    // Group transactions by ProjectID
    const txByProject = {};
    const orgLevelTxs = [];
    importedRows.forEach(tx => {
      const pid = tx.ProjectID || tx.ProjectId || tx.projectId || '';
      if (pid) {
        if (!txByProject[pid]) txByProject[pid] = [];
        txByProject[pid].push(tx);
      } else {
        // No ProjectID: organization-level transaction
        orgLevelTxs.push(tx);
      }
    });

    // Map projectsFromDB with transactions, budget, spent, etc.
    const normalizedProjects = (projectsFromDB || []).map(p => ({
      id: p.ProjectID || p.ProjectId || p.id,
      name: p.ProjectName || p.Name || p.name || '',
      status: (p.Status || p.status || '').toString(),
      budget: Number(p.Budget ?? p.budget ?? 0),
      spent: Number(p.Spending ?? p.spent ?? 0),
      profit: Number(
        p.Profit !== undefined
          ? p.Profit
          : (Number(p.Budget ?? p.budget ?? 0) - Number(p.Spending ?? p.spent ?? 0))
      ),
      ar: Number(p.AR ?? p.ar ?? 0),
      ap: Number(p.AP ?? p.ap ?? Number(p.Spending ?? p.spent ?? 0)),
      team: Number(p.Team ?? p.team ?? 0),
      deadline: p.EndDate || p.deadline || '',
      departmentName: p.DepartmentName || p.departmentName || '',
      transactions: txByProject[p.ProjectID || p.ProjectId || p.id] || []
    }));

    // Pass orgLevelTxs to CompanyDashboard as organization.transactions
    setRawProjects(normalizedProjects);
    setSelectedOrg(prev => ({
      ...(prev || {}),
      transactions: orgLevelTxs // <-- add org-level transactions here
    }));
  }, [importedRows, projectsFromDB]);

  // --- Restore org-specific data on login or org change ---
  useEffect(() => {
    if (organizationId) {
      // Restore importedRows for this org only
      const savedRows = localStorage.getItem(`importedRows_${organizationId}`);
      setImportedRows(savedRows ? JSON.parse(savedRows) : []);
      // Restore selectedOrg for this org only
      const savedOrg = localStorage.getItem(`selectedOrg_${organizationId}`);
      setSelectedOrg(savedOrg ? JSON.parse(savedOrg) : null);
      // Restore projectsFromDB for this org only
      const savedProjects = localStorage.getItem(`projectsFromDB_${organizationId}`);
      setProjectsFromDB(savedProjects ? JSON.parse(savedProjects) : []);
    }
  }, [organizationId]);

  // --- Save org-specific data whenever it changes ---
  useEffect(() => {
    if (organizationId) {
      localStorage.setItem(`importedRows_${organizationId}`, JSON.stringify(importedRows));
    }
  }, [importedRows, organizationId]);

  useEffect(() => {
    if (organizationId) {
      localStorage.setItem(`selectedOrg_${organizationId}`, JSON.stringify(selectedOrg));
    }
  }, [selectedOrg, organizationId]);

  useEffect(() => {
    if (organizationId) {
      localStorage.setItem(`projectsFromDB_${organizationId}`, JSON.stringify(projectsFromDB));
    }
  }, [projectsFromDB, organizationId]);

  // --- Clear org-specific localStorage and state on org change or login ---
  useEffect(() => {
    if (organizationId) {
      // Remove only org-specific keys
      localStorage.removeItem(`importedRows_${organizationId}`);
      localStorage.removeItem(`selectedOrg_${organizationId}`);
      localStorage.removeItem(`projectsFromDB_${organizationId}`);
      setImportedRows([]);
      setSelectedOrg(null);
      setProjectsFromDB([]);
      setRawProjects([]);
      setDepartments([]);
      setSelectedDept('all');
      setSelectedProject(null);
      setView('organizations');
    }
  }, [organizationId]);

  // --- UI ---
  return (
    <>
      <Header isLoggedIn={isLoggedIn} onLogout={onLogout} />
      {view === 'organizations' && (
        <OrganizationSelector
          organizations={organizations}
          organizationId={organizationId}
          onSelect={async (orgId) => {
            // Only allow dashboard open for logged-in org
            if (String(orgId) === String(organizationId)) {
              await handleOrgSelect(orgId); // Make sure org data is loaded
              setView('dashboard');         // Immediately switch view
            }
          }}
        />
      )}

      {view === 'project' && selectedProject && (
        <ProjectDashboard
          project={selectedProject}
          organization={selectedOrg}
          onBack={() => setView('dashboard')}
        />
      )}

      {view === 'dashboard' && (
        <div style={{ 
          width: '100vw', 
          minHeight: '100vh', 
          padding: '20px', 
          background: '#f5f5f5',
          boxSizing: 'border-box' 
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: 'none', 
            margin: '0', 
            padding: '24px', 
            background: '#fff', 
            borderRadius: '10px', 
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)' 
          }}>
            <h2>Accounts Dashboard</h2>
            <div style={{ marginTop: 40 }}>
              
            </div>
            {/* --- Cards Row REMOVED --- */}
            {/* --- Breakdown Modal --- */}
            {modalView && (
              <BreakdownModal
                type={modalView}
                breakdown={getBreakdownByCategory(importedRows, modalView)}
                onClose={() => setModalView(null)}
              />
            )}
            {/* --- Existing CompanyDashboard --- */}
            {loading && (
              <div className="loading">Loading dashboard...</div>
            )}
            {!loading && (
              <CompanyDashboard
                organization={selectedOrg}
                selectedDept={selectedDept}
                onDeptChange={setSelectedDept}
                onProjectSelect={handleProjectSelect}
                onAddProject={setShowNewProjectForm}
                onFileUpload={handleFileUpload}
                onBack={() => setView('organizations')}
                projects={rawProjects} // <-- FIXED: use normalized projects with transactions
                totals={dashboardMetrics}
              />
            )}
          </div>
        </div>
      )}
      {console.log('Dashboard data:', importedRows, projectsFromDB, selectedOrg)}
    </>
  );
};

export default Dashboard;