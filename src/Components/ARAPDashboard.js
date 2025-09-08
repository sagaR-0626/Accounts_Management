import React from 'react';
import '../Styles/Dashboard.css';
import '../Styles/ARAPDashboard.css';

const ARAPDashboard = ({ expenseData, selectedCategory, selectedPeriod, arapActiveCard, setArapActiveCard }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPeriodLabel = () => {
    const labels = {
      month: 'This Month',
      quarter: 'This Quarter',
      year: 'This Year',
      all: 'All Time'
    };
    return labels[selectedPeriod] || 'This Month';
  };

  const filterByPeriod = (items) => {
    if (!items || !Array.isArray(items)) return [];
    const now = new Date();
    return items.filter(item => {
      const itemDate = new Date((item.date || '') + "T00:00:00");
      if (!(itemDate instanceof Date) || isNaN(itemDate)) return false;
      if (selectedPeriod === 'month') {
        return itemDate.getMonth() === now.getMonth() &&
               itemDate.getFullYear() === now.getFullYear();
      } else if (selectedPeriod === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const itemQuarter = Math.floor(itemDate.getMonth() / 3);
        return itemQuarter === currentQuarter &&
               itemDate.getFullYear() === now.getFullYear();
      } else if (selectedPeriod === 'year') {
        return itemDate.getFullYear() === now.getFullYear();
      } else {
        return true; // 'all'
      }
    });
  };

  const isExpense = (item) => {
    const type = (item.type || '').toLowerCase();
    return type !== 'income' && type !== 'sales';
  };
  const isIncome = (item) => {
    const type = (item.type || '').toLowerCase();
    return type === 'income' || type === 'sales';
  };

  // Calculate summary for AR/AP
  const calculateARAP = () => {
    if (!expenseData) return { incomeItems: [], expenseItems: [], totalIncome: 0, totalExpense: 0 };
    const categories = selectedCategory === 'all' ? Object.keys(expenseData) : [selectedCategory];
    let incomeItems = [];
    let expenseItems = [];
    let totalIncome = 0;
    let totalExpense = 0;
    categories.forEach(category => {
      if (!expenseData[category]) return;
      let items = Array.isArray(expenseData[category]) ? expenseData[category] : [];
      items = filterByPeriod(items);
      items.forEach(item => {
        if (isIncome(item)) {
          totalIncome += item.amount;
          incomeItems.push(item);
        } else {
          totalExpense += item.amount;
          expenseItems.push(item);
        }
      });
    });
    return { incomeItems, expenseItems, totalIncome, totalExpense };
  };

  const { incomeItems, expenseItems, totalIncome, totalExpense } = calculateARAP();
  const activeCard = arapActiveCard;

  return (
    <div className="arap-dashboard-container">
      <div className="arap-cards-row">
        <div
          className={`arap-card ar-card${activeCard === 'AR' ? ' active' : ''}`}
          onClick={() => setArapActiveCard('AR')}
        >
          <div className="arap-card-title">Accounts Receivable (AR)</div>
          <div className="arap-card-value" style={{ color: '#10b981' }}>{formatCurrency(totalIncome || 0)}</div>
          <div className="arap-card-desc">Total Income</div>
        </div>
        <div
          className={`arap-card ap-card${activeCard === 'AP' ? ' active' : ''}`}
          onClick={() => setArapActiveCard('AP')}
        >
          <div className="arap-card-title">Accounts Payable (AP)</div>
          <div className="arap-card-value" style={{ color: '#ef4444' }}>{formatCurrency(totalExpense || 0)}</div>
          <div className="arap-card-desc">Total Expenses</div>
        </div>
      </div>

      {/* Expense breakdown for AP removed as requested */}
    </div>
  );
};

export default ARAPDashboard;
