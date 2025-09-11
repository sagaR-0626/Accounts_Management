import React, { useState, useEffect } from 'react';
import { ArrowLeft, IndianRupee, TrendingUp, TrendingDown, Receipt, Users, Calendar, BarChart3 } from 'lucide-react';
import SummaryCard from './SummaryCard';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const API_BASE = 'http://localhost:3001'; // adjust if needed

// simple modal (inline styles)
const CategoryModal = ({ open, onClose, categoryName, spends }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1200
    }}>
      <div style={{
        width: 760, maxWidth: '92%', background: '#fff', borderRadius: 10, padding: 20,
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)', overflowY: 'auto', maxHeight: '80vh'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{categoryName} — Spend Breakdown</h3>
          <button onClick={onClose} style={{
            border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer'
          }}>✕</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <Bar
            data={{
              labels: spends.map(s => s.date),
              datasets: [{
                label: 'Amount (INR)',
                data: spends.map(s => s.amount),
                backgroundColor: 'rgba(59,130,246,0.7)'
              }]
            }}
            options={{ responsive: true, maintainAspectRatio: false }}
            height={260}
          />
        </div>

        <div>
          <h4 style={{ marginBottom: 8 }}>Transactions</h4>
          <div>
            {spends.length === 0 && <div style={{ color: '#666' }}>No spend records for this category.</div>}
            {spends.map((s, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {s.item ? s.item : (s.note || 'Expense')}
                  </div>
                  <div style={{ color: '#666', fontSize: 13 }}>{s.date}</div>
                </div>
                <div style={{ fontWeight: 700 }}>
                  {Number(s.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProjectDashboard = ({ project, organization, onBack }) => {
  // create a local mutable copy so we can update spent in real time
  const [projectState, setProjectState] = useState(project);

  useEffect(() => {
    if (!project) return;
    // normalize server / client field-name variations so AR/AP/Spending/Budget are always available
    const normalized = {
      ...project,
      // AR may come as AR or ar
      ar: Number(project.AR ?? project.ar ?? project.arVal ?? 0),
      // AP may come as AP or ap; fallback to Spending if that's what backend uses
      ap: Number(project.AP ?? project.ap ?? project.Spending ?? project.Spening ?? 0),
      // Spending/spent normalization
      Spending: Number(project.Spending ?? project.spent ?? project.Spen ?? 0),
      // Budget normalization
      Budget: Number(project.Budget ?? project.budget ?? 0)
    };
    setProjectState(normalized);
  }, [project]);

  // Normalize names: support DB fields (Budget, Spending) and previous props (budget, spent)
  const budgetVal = Number(projectState.Budget ?? projectState.budget ?? project.budget ?? 0);
  // AR = receipts/income, AP = expenses
  const arVal = Number(projectState.ar ?? project.ar ?? 0);
  const apVal = Number(projectState.ap ?? project.ap ?? projectState.Spending ?? project.Spending ?? 0);
  // profit/loss = AR - AP (per your requirement)
  const profitVal = arVal - apVal;
  const profitMargin = budgetVal ? ((profitVal / budgetVal) * 100).toFixed(1) : '0.0';
  const spentVal = Number(projectState.Spending ?? projectState.spent ?? project.spent ?? 0);
  const spentPercentage = budgetVal ? ((spentVal / budgetVal) * 100).toFixed(1) : '0.0';

  const [categoryTotals, setCategoryTotals] = useState([]); // [{category, total}]
  const [spendsByCategory, setSpendsByCategory] = useState({}); // { category: [spendItems] }
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Add transaction modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    TxnDate: new Date().toISOString().slice(0,10),
    Category: '',
    ExpenseType: 'Expense',
    Item: '', // <-- Add this line
    Note: '',
    Amount: ''
  });

  // New state for dashboard view
  const [dashboardView, setDashboardView] = useState('all'); // 'all', 'ar', 'ap'

  useEffect(() => {
    // extract fetch so we can call it after POST and from a refresh button
    async function fetchTransactions() {
      console.log('Fetching transactions for project:', project.ProjectID || project.id);
      const projectId = project.ProjectID || project.id;
      if (!projectId) return;
      const res = await fetch(`${API_BASE}/transactions?projectId=${projectId}`);
      let data = await res.json();
      if (!Array.isArray(data)) {
        console.warn('Transactions API did not return an array:', data);
        data = [];
      }
      // group by category — include Item
      const grouped = {};
      (data || []).forEach(r => {
        const cat = r.Category || 'Uncategorized';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({
          id: r.TxnID,
          date: r.TxnDate,
          amount: r.Amount,
          note: r.Note || '',
          item: r.Item || '',           // <- include Item
          expenseType: r.ExpenseType
        });
      });
      const totals = Object.keys(grouped).map(cat => ({
        category: cat,
        total: grouped[cat].reduce((s, x) => s + Number(x.amount || 0), 0)
      })).sort((a,b) => b.total - a.total);
      setCategoryTotals(totals);
      setSpendsByCategory(grouped);
    }
    fetchTransactions();
  }, [project]);

  // create transaction and update UI immediately
  const createTransaction = async (e) => {
    e && e.preventDefault();
    try {
      const payload = {
        ProjectID: project.ProjectID || project.id, // robust id
        TxnDate: txForm.TxnDate,
        Category: txForm.Category || 'Uncategorized',
        ExpenseType: txForm.ExpenseType,
        Item: txForm.Item, // <-- ensure we send Item
        Note: txForm.Note,
        Amount: Number(txForm.Amount)
      };
      const res = await fetch(`${API_BASE}/transactions`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload)
       });
       const j = await res.json();
       if (!res.ok) throw new Error(j.error || 'Failed to create transaction');
 
       const tx = j.transaction;
       // update spendsByCategory (create category if missing)
       setSpendsByCategory(prev => {
         const next = { ...prev };
         const cat = tx.Category || 'Uncategorized';
         if (!next[cat]) next[cat] = [];
         next[cat] = [
           ...next[cat],
           {
             id: tx.TxnID,
             date: tx.TxnDate,
             amount: tx.Amount,
             note: tx.Note,
             item: tx.Item || '',   // <- include Item here too
             expenseType: tx.ExpenseType
           }
         ];
         return next;
       });
      // re-fetch to fully sync (covers any DB-side defaults/changes)
      // (if you extracted fetchTransactions to module scope, call it here)
      // simple approach: refresh the page or re-run the effect by toggling project prop
      // If you extracted fetchTransactions function above, call it here:
      try { await fetch(`${API_BASE}/transactions?projectId=${payload.ProjectID}`); } catch(_) {}
 
       // update categoryTotals
       setCategoryTotals(prev => {
         const cat = tx.Category || 'Uncategorized';
         const amount = Number(tx.Amount || 0);
         const idx = prev.findIndex(p => p.category === cat);
         if (idx === -1) {
           return [{ category: cat, total: amount }, ...prev].sort((a,b)=>b.total-a.total);
         } else {
           const copy = prev.slice();
           copy[idx] = { ...copy[idx], total: copy[idx].total + amount };
           return copy.sort((a,b)=>b.total-a.total);
         }
       });
 
       // update project spending locally if backend returned updatedSpending
       if (j.updatedSpending !== undefined && j.updatedSpending !== null) {
         setProjectState(prev => ({
           ...prev,
           Spending: Number(j.updatedSpending),
           spent: Number(j.updatedSpending),
           // update AR/AP if server returned them
           ar: j.updatedAR !== undefined ? Number(j.updatedAR) : prev.ar,
           ap: j.updatedAP !== undefined ? Number(j.updatedAP) : (Number(prev.Spending ?? prev.spent ?? 0))
         }));
       } else if (tx.ExpenseType && tx.ExpenseType.toLowerCase() === 'expense') {
         // fallback increment
         setProjectState(prev => ({
           ...prev,
           Spending: Number((prev.Spending || prev.spent || 0) + Number(tx.Amount || 0)),
           spent: Number((prev.Spending || prev.spent || 0) + Number(tx.Amount || 0)),
           ap: Number((prev.ap || prev.Spending || prev.spent || 0) + Number(tx.Amount || 0))
         }));
       } else if (tx.ExpenseType && (tx.ExpenseType.toLowerCase() === 'receipt' || tx.ExpenseType.toLowerCase() === 'income')) {
         // fallback for receipts: increment AR
         setProjectState(prev => ({
           ...prev,
           ar: Number((prev.ar || 0) + Number(tx.Amount || 0))
         }));
       }
 
       // reset form and close
       setTxForm({
        TxnDate: new Date().toISOString().slice(0,10),
        Category: '',
        ExpenseType: 'Expense',
        Item: '', // <-- Reset this field
        Note: '',
        Amount: ''
      });
      setAddModalOpen(false);
    } catch (err) {
      console.error('Error creating transaction:', err);
      alert(err.message || 'Failed to add transaction');
    }
  };
  
  const openCategory = (cat) => {
    setSelectedCategory(cat);
    setModalOpen(true);
  };

  // 1. Define helpers FIRST
  function isAR(tx) {
    return tx.expenseType && ['receipt', 'income'].includes(tx.expenseType.toLowerCase());
  }
  function isAP(tx) {
    return tx.expenseType && tx.expenseType.toLowerCase() === 'expense';
  }

  // categoryTotals and spendsByCategory should be defined here
  

  // 2. Filtered helpers
  const filteredCategoryTotals = dashboardView === 'all'
    ? categoryTotals
    : categoryTotals
        .map(c => {
          const txs = spendsByCategory[c.category] || [];
          const filteredTxs = dashboardView === 'ar'
            ? txs.filter(isAR)
            : txs.filter(isAP);
          return {
            category: c.category,
            total: filteredTxs.reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
            txs: filteredTxs
          };
        })
        .filter(c => c.total > 0);

  const filteredSpendsByCategory = {};
  filteredCategoryTotals.forEach(c => {
    filteredSpendsByCategory[c.category] = c.txs;
  });

  // Chart
  const doughnutData = {
    labels: filteredCategoryTotals.map(c => c.category),
    datasets: [{
      data: filteredCategoryTotals.map(c => c.total),
      backgroundColor: [
        '#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#f59e0b'
      ].slice(0, filteredCategoryTotals.length)
    }]
  };

  return (
    <div className="dashboard-main">
      <div className="dashboard-container">
        {/* Header */}
        <div className="project-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <button onClick={onBack} className="back-btn">
              <ArrowLeft size={20} />
              Back
            </button>
            <div>
              <h1 style={{ margin: 0 }}>
                {projectState.Name || projectState.name || projectState.ProjectName || project.Name}
              </h1>
              <p style={{ margin: 0, fontSize: 14 }}>
                {projectState.ProjectID ?? projectState.id ?? project.ProjectID ?? project.id} - {organization.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setAddModalOpen(true)}
            style={{
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 6,
              cursor: 'pointer'
            }}
          >
            + Add Transaction
          </button>
        </div>

        {/* REMOVE TOP SUMMARY CARDS */}
        {/* Summary Cards: AR, AP, Profit/Loss side by side in second row */}
        <div className="financial-details-grid" style={{ marginTop: 18 }}>
          {/* AR Card */}
          <div
            className="ar-card"
            style={{
              background: 'white',
              borderRadius: 20,
              padding: '2rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              border: '1px solid #f3f4f6',
              minWidth: 0,
              cursor: 'pointer'
            }}
            onClick={() => setDashboardView('ar')}
          >
            <h3>Accounts Receivable</h3>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981', marginBottom: '1rem' }}>
              {arVal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Amount pending to be received from clients
            </p>
            <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(16,185,129,0.1)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 4, color: '#047857' }}>
                Payment Status
              </div>
              <div style={{ fontSize: '0.875rem', color: '#059669' }}>
                Expected within 30 days
              </div>
            </div>
          </div>

          {/* AP Card */}
          <div
            className="ap-card"
            style={{
              background: 'white',
              borderRadius: 20,
              padding: '2rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              border: '1px solid #f3f4f6',
              minWidth: 0,
              cursor: 'pointer'
            }}
            onClick={() => setDashboardView('ap')}
          >
            <h3>Accounts Payable</h3>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444', marginBottom: '1rem' }}>
              {apVal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Amount pending to be paid to vendors
            </p>
            <div style={{ padding: '1rem', borderRadius: 12, background: 'rgba(239,68,68,0.1)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 4, color: '#dc2626' }}>
                Payment Due
              </div>
              <div style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                Next 15 days
              </div>
            </div>
          </div>

          {/* Profit/Loss card */}
          <div className="profitloss-card" style={{
            background: 'white',
            borderRadius: 20,
            padding: '2rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            border: '1px solid #f3f4f6',
            minWidth: 0
          }}>
            <h3>Current Profit/Loss</h3>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: profitVal >= 0 ? '#10b981' : '#ef4444', marginBottom: '1rem' }}>
              {Math.abs(profitVal).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{profitVal >= 0 ? 'Profit' : 'Loss'} ({profitMargin}% margin)</p>
            <div style={{ padding: '1rem', borderRadius: 12, background: profitVal >= 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 4, color: profitVal >= 0 ? '#047857' : '#dc2626' }}>
                {profitVal >= 0 ? 'Positive Margin' : 'Negative Margin'}
              </div>
              <div style={{ fontSize: '0.875rem', color: profitVal >= 0 ? '#059669' : '#dc2626' }}>
                {profitVal >= 0 ? 'Healthy project finances' : 'Review expenses'}
              </div>
            </div>
          </div>
        </div>

        {/* Chart + Description Side by Side */}
        <div className="chart-section">
          <div className="chart-box">
            <div className="chart-canvas">
              <h4>Spend by Category</h4>
              <div style={{ height: 320, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Doughnut data={doughnutData} />
              </div>
            </div>
            <div className="chart-description">
              {categoryTotals.length === 0 && <div style={{ color: '#666' }}>No spend records yet.</div>}
              {filteredCategoryTotals.length === 0 && <div style={{ color: '#666' }}>No records yet.</div>}
              {filteredCategoryTotals.map((c) => (
                <div key={c.category} className="chart-category-row" onClick={() => openCategory(c.category)}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.category}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {budgetVal ? ((c.total / budgetVal) * 100).toFixed(1) : '0.0'}% of budget
                    </div>
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    {c.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Cards Below Chart */}
        <div style={{
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))',
          gap: 12
        }}>
          {categoryTotals.map(c => (
            <div key={c.category} onClick={() => openCategory(c.category)} style={{
              background: '#fff', padding: 12, borderRadius: 10, cursor: 'pointer',
              boxShadow: '0 6px 18px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{c.category}</div>
                <div style={{ color: '#333', fontWeight: 700 }}>
                  {c.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                </div>
              </div>
              <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>
                {c.txs ? `${c.txs.length} transactions` : '—'}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <div style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.08)', color: '#0f172a', fontSize: 12 }}>
                  View Details
                </div>
                <div style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.08)', color: '#0f172a', fontSize: 12 }}>
                  {budgetVal ? ((c.total / budgetVal) * 100).toFixed(1) : '0.0'}%
                </div>
              </div>
            </div>
          ))}
          {categoryTotals.length === 0 && (
            <div style={{ color: '#666', padding: 12 }}>No category spends to show.</div>
          )}
        </div>

        {/* Project Details (existing) */}
        <div className="project-details-card" style={{ marginTop: 18 }}>
          <h3>Project Details</h3>
          <div className="details-grid">
            <div className="detail-item">
              <div className="detail-header">
                <Calendar size={20} />
                <span>Deadline</span>
              </div>
              <div className="detail-value">{project.deadline}</div>
            </div>
            <div className="detail-item">
              <div className="detail-header">
                <BarChart3 size={20} />
                <span>Status</span>
              </div>
              <div className={`status-badge ${project.status.toLowerCase()}`}>
                {project.status}
              </div>
            </div>
          </div>
          {/* Budget Progress Bar */}
          <div className="budget-progress">
            <div className="progress-header">
              <span>Budget Usage</span>
              <span>{spentPercentage}% used</span>
            </div>
            <div className="progress-bar">
              <div 
                className={`progress-fill ${
                  parseFloat(spentPercentage) > 90 ? 'danger' :
                  parseFloat(spentPercentage) > 70 ? 'warning' : 'success'
                }`}
                style={{ width: `${Math.min(parseFloat(spentPercentage), 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <CategoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categoryName={selectedCategory}
        spends={
          selectedCategory && filteredSpendsByCategory[selectedCategory]
            ? filteredSpendsByCategory[selectedCategory]
            : []
        }
      />

      {/* Add Transaction Modal */}
      {addModalOpen && (
        <div style={{ position: 'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(0,0,0,0.45)', zIndex:1200 }}>
          <form onSubmit={createTransaction} style={{ width:640, maxWidth:'94%', background:'#fff', borderRadius:8, padding:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <h3 style={{ margin:0 }}>Add Transaction</h3>
              <button type="button" onClick={() => setAddModalOpen(false)} style={{ border:'none', background:'transparent', cursor:'pointer' }}>✕</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <label>
                Date
                <input type="date" value={txForm.TxnDate} onChange={e=>setTxForm({...txForm, TxnDate:e.target.value})} required style={{ width:'100%' }} />
              </label>
              <label>
                Category
                <input value={txForm.Category} onChange={e=>setTxForm({...txForm, Category:e.target.value})} placeholder="e.g., Materials" style={{ width:'100%' }} />
              </label>
              <label>
                Type
                <select value={txForm.ExpenseType} onChange={e=>setTxForm({...txForm, ExpenseType:e.target.value})} style={{ width:'100%' }}>
                  <option>Expense</option>
                  <option>Receipt</option>
                </select>
              </label>
              <label>
                Item
                <input
                  value={txForm.Item}
                  onChange={e => setTxForm({ ...txForm, Item: e.target.value })}
                  placeholder="e.g., Wireframes"
                  style={{ width: '100%' }}
                />
              </label>
              <label>
                Amount
                <input type="number" step="0.01" value={txForm.Amount} onChange={e=>setTxForm({...txForm, Amount:e.target.value})} required style={{ width:'100%' }} />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                Note
                <input value={txForm.Note} onChange={e=>setTxForm({...txForm, Note:e.target.value})} placeholder="Optional note or description" style={{ width:'100%' }} />
              </label>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:12 }}>
              <button type="button" onClick={()=>setAddModalOpen(false)} style={{ padding:'8px 12px' }}>Cancel</button>
              <button type="submit" style={{ padding:'8px 12px', background:'#10b981', color:'#fff', border:'none', borderRadius:6 }}>Add</button>
            </div>
          </form>
        </div>
      )}
      {dashboardView !== 'all' && (
        <button onClick={() => setDashboardView('all')} style={{ margin: '12px 0' }}>
          Show All
        </button>
      )}
    </div>
  );
};

export default ProjectDashboard;