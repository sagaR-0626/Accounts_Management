import React, { useState, useEffect } from 'react';
import Header from './Header'; // <-- Import Header here
import { ArrowLeft, IndianRupee, TrendingUp, TrendingDown, Receipt, Users, Calendar, BarChart3 } from 'lucide-react';
import SummaryCard from './SummaryCard';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import Filters from './Filters'; // Add this import at the top

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
  // All hooks at the top
  const [projectState, setProjectState] = useState(project);
  // Use project.transactions for both real projects and "Other"
  const transactions = project.transactions || [];
  const [categoryTotals, setCategoryTotals] = useState([]);
  const [spendsByCategory, setSpendsByCategory] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    TxnDate: new Date().toISOString().slice(0,10),
    Category: '',
    ExpenseType: 'Expense',
    Item: '',
    Note: '',
    Amount: ''
  });
  const [dashboardView, setDashboardView] = useState('all');

  // Move useEffect hooks here, before any return!
  useEffect(() => {
    // Calculate category totals and spends for this project only
    const catTotals = {};
    const spendsCat = {};
    transactions.forEach(tx => {
      const cat = tx.Category || 'Uncategorized';
      const amt = Number(tx.Amount || 0);
      if (!catTotals[cat]) catTotals[cat] = 0;
      catTotals[cat] += amt;
      if (!spendsCat[cat]) spendsCat[cat] = [];
      spendsCat[cat].push({
        item: tx.Item || tx.item || tx.Description || tx.Name || tx.Note || '', // <-- Add tx.item
        amount: amt,
        date: tx.TxnDate || tx.Date || '',
        note: tx.Note || '',
      });
    });
    setCategoryTotals(Object.entries(catTotals).map(([category, total]) => ({ category, total })));
    setSpendsByCategory(spendsCat);
  }, [transactions]);

  useEffect(() => {
    if (!project) return;
    // normalize server / client field-name variations so AR/AP/Spending/Budget are always available
    const normalized = {
      ...project,
      ar: Number(project.AR ?? project.ar ?? project.arVal ?? 0),
      ap: Number(project.AP ?? project.ap ?? project.Spending ?? project.Spening ?? 0),
      Spending: Number(project.Spending ?? project.spent ?? project.Spen ?? 0),
      Budget: Number(project.Budget ?? project.budget ?? 0)
    };
    setProjectState(normalized);
  }, [project]);

  // Now do conditional rendering
  if (!project) return <div>No project selected.</div>;

  // Define createTransaction to fix no-undef error
  const createTransaction = (e) => {
    e.preventDefault();
    // Implement transaction creation logic here if needed
    alert('Add transaction functionality is not implemented yet.');
  };

  // Normalize names: support DB fields (Budget, Spending) and previous props (budget, spent)
  const budgetVal = Number(projectState.Budget ?? projectState.budget ?? 0);
  const arVal = Number(projectState.ar ?? projectState.AR ?? 0);
  const apVal = Number(projectState.ap ?? projectState.AP ?? projectState.Spending ?? projectState.spent ?? 0);
  // profit/loss = AR - AP (per your requirement)
  const profitVal = arVal - apVal;
  const profitMargin = budgetVal ? ((profitVal / budgetVal) * 100).toFixed(1) : '0.0';
  const spentVal = Number(projectState.Spending ?? projectState.spent ?? project.spent ?? 0);
  const spentPercentage = budgetVal ? ((spentVal / budgetVal) * 100).toFixed(1) : '0.0';

  const openCategory = (cat) => {
    setSelectedCategory(cat);
    setModalOpen(true);
  };

  // 1. Define helpers FIRST
  function isAR(tx) {
    const type = (tx.Type || tx.type || '').toLowerCase();
    return type === 'income' || type === 'receipt';
  }
  function isAP(tx) {
    const type = (tx.Type || tx.type || '').toLowerCase();
    return type === 'expense' || type === 'payment';
  }

  // Filter transactions and category totals based on dashboardView
  let filteredTransactions = transactions;
  if (dashboardView === 'ar') {
    filteredTransactions = transactions.filter(isAR);
  } else if (dashboardView === 'ap') {
    filteredTransactions = transactions.filter(isAP);
  }

  // Recalculate categoryTotals and spendsByCategory for filteredTransactions
  const filteredCatTotals = {};
  const filteredSpendsCat = {};
  filteredTransactions.forEach(tx => {
    const cat = (tx.Category || tx.category || 'Uncategorized').trim();
    const amt = Number(tx.Amount || 0);
    if (!filteredCatTotals[cat]) filteredCatTotals[cat] = 0;
    filteredCatTotals[cat] += amt;
    if (!filteredSpendsCat[cat]) filteredSpendsCat[cat] = [];
    filteredSpendsCat[cat].push({
      item: tx.Item || tx.item || tx.Description || tx.Name || tx.Note || 'Transaction', // <-- covers all cases
      amount: amt,
      date: tx.TxnDate || tx.Date || '',
      note: tx.Note || '',
    });
  });

  const filteredCategoryTotals = Object.entries(filteredCatTotals).map(
    ([category, total]) => ({ category, total })
  );

  let filteredSpendsByCategory = {};
  if (selectedCategory === 'all') {
    filteredSpendsByCategory = filteredSpendsCat;
  } else {
    // Only keep transactions that match the selected category and have a valid item/note
    filteredSpendsByCategory = {
      [selectedCategory]: (filteredSpendsCat[selectedCategory] || []).filter(
        tx => (tx.item || tx.note || '').trim() !== '' // ignore empty placeholders
      )
    };
  }

  const categoryList = filteredCategoryTotals.map(c => c.category);

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
      <Header isLoggedIn={true} /> {/* <-- Add Header here */}
      <div className="dashboard-container">
        <button
          className="back-btn"
          onClick={typeof onBack === 'function' ? onBack : () => window.history.back()}
        >
          ← Back
        </button>
        <h1>
          {project.isOther ? 'Other (Non-Project) Transactions' : project.name}
        </h1>
        {/* REMOVE TOP SUMMARY CARDS */}
        {/* Summary Cards: AR, AP, Profit/Loss side by side in second row */}
        <div className="financial-details-grid" style={{ marginTop: 18 }}>
          {/* AR Card */}
          <div
            className="ar-card"
            style={{
              background: dashboardView === 'ar' ? 'rgba(16,185,129,0.08)' : 'white',
              borderRadius: 20,
              padding: '2rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              border: '1px solid #f3f4f6',
              minWidth: 0,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onClick={() => setDashboardView('ar')}
          >
            <h3>Accounts Receivable</h3>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981', marginBottom: '1rem' }}>
              {arVal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
             
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
              background: dashboardView === 'ap' ? 'rgba(239,68,68,0.08)' : 'white',
              borderRadius: 20,
              padding: '2rem',
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
              border: '1px solid #f3f4f6',
              minWidth: 0,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onClick={() => setDashboardView('ap')}
          >
            <h3>Accounts Payable</h3>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444', marginBottom: '1rem' }}>
              {apVal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
            </div>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              
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

        {/* Filters Component */}
        <Filters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          categories={categoryList}
        />

        {/* Chart + Description Side by Side */}
        <div className="chart-section">
          <div className="chart-box">
            <div className="chart-canvas">
              <h4>Spend by Category</h4>
              {selectedCategory === 'all' ? (
                <div style={{ height: 320, width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <Doughnut data={doughnutData} />
                </div>
              ) : (
                <div>
                  <h4>{selectedCategory} Details</h4>
                  {filteredSpendsByCategory[selectedCategory] &&
                    filteredSpendsByCategory[selectedCategory].length > 0 ? (
                    <>
                      <div style={{ height: 320, width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
                        <Doughnut
                          data={{
                            labels: filteredSpendsByCategory[selectedCategory].map(s => s.item || s.note || 'Expense'),
                            datasets: [{
                              data: filteredSpendsByCategory[selectedCategory].map(s => s.amount),
                              backgroundColor: [
                                '#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#f59e0b'
                              ].slice(0, filteredSpendsByCategory[selectedCategory].length)
                            }]
                          }}
                        />
                      </div>
                      <div>
                        {filteredSpendsByCategory[selectedCategory].map((item, idx) => (
                          <div key={idx} style={{
                            display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                            borderBottom: '1px solid #f0f0f0'
                          }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{item.item || item.note || 'Expense'}</div>
                              <div style={{ color: '#666', fontSize: 13 }}>{item.date}</div>
                            </div>
                            <div style={{ fontWeight: 700 }}>
                              {Number(item.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#666' }}>No items for this category.</div>
                  )}
                </div>
              )}
            </div>
            <div className="chart-description">
              {selectedCategory === 'all' ? (
                <>
                  {filteredCategoryTotals.length === 0 && <div style={{ color: '#666' }}>No spend records yet.</div>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', marginBottom: '18px' }}>
                    {filteredCategoryTotals.map((c, idx) => (
                      <div
                        key={c.category}
                        className="chart-category-row"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                        onClick={() => openCategory(c.category)}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            background: doughnutData.datasets[0].backgroundColor[idx] || '#ccc',
                            marginRight: 8,
                            border: '1.5px solid #e5e7eb'
                          }}
                        ></span>
                        <span style={{ fontWeight: 600 }}>{c.category}</span>
                        <span style={{ fontWeight: 700, marginLeft: 8 }}>
                          {c.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        </span>
                      </div>
                    ))}
                    {filteredCategoryTotals.length === 0 && (
                      <div style={{ color: '#666', padding: 12 }}>No category spends to show.</div>
                    )}
                  </div>
                </>
              ) : null}
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
          {filteredCategoryTotals.map(c => (
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
                {/* You can add transaction count if needed */}
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
          {filteredCategoryTotals.length === 0 && (
            <div style={{ color: '#666', padding: 12 }}>No category spends to show.</div>
          )}
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
    </div>
  );
};

export default ProjectDashboard;