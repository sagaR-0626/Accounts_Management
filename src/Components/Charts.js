import '../Styles/Charts.css';
import React from 'react';
import { filterByPeriod } from './Filters';

const Charts = ({ expenseData, selectedCategory, selectedPeriod, customRange, selectedDateRange, breakdownType }) => {
  const [drillCategory, setDrillCategory] = React.useState('all');

  // Always keep drillCategory in sync with selectedCategory and selectedPeriod
  React.useEffect(() => {
    if (selectedCategory === 'all') {
      setDrillCategory('all');
    } else {
      setDrillCategory(selectedCategory);
    }
  }, [selectedCategory, selectedPeriod, expenseData]);


  // Only treat items as expenses if type is not 'income' or 'sales'
  const isExpense = (item) => {
    const type = (item.type || '').toLowerCase();
    return type !== 'income' && type !== 'sales';
  };
  // Only treat items as income if type is 'income' or 'sales'
  const isIncome = (item) => {
    const type = (item.type || '').toLowerCase();
    return type === 'income' || type === 'sales';
  };

  const getCategoryColor = (category) => {
    const palette = [
      '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#eab308', '#a21caf', '#0ea5e9'
    ];
    if (!category) return '#6b7280';
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    return palette[Math.abs(hash) % palette.length];
  };

  const getCategoryIcon = (category) => {
    return '💰';
  };

  // Use AR/AP filter for charts
  const getChartData = () => {
    if (!expenseData) return [];

    // Helper to filter by AR/AP
    const filterByType = (items) => {
      if (breakdownType === 'ar') return items.filter(isIncome);
      if (breakdownType === 'ap') return items.filter(isExpense);
      return items;
    };

    if (drillCategory === 'all') {
      // Show category-wise breakdown
      const categories = Object.keys(expenseData);
      const data = categories.map(category => {
        const items = Array.isArray(expenseData[category]) ? expenseData[category] : [];
        const filteredItems = filterByType(items); // Already filtered in App.js
        const total = filteredItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        return {
          category,
          amount: total,
          count: filteredItems.length,
          color: getCategoryColor(category),
          icon: getCategoryIcon(category)
        };
      }).filter(d => d.count > 0)
        .sort((a, b) => b.amount - a.amount);
      // If no data for the selected period, but categories exist, show all categories with amount 0
      if (data.length === 0 && categories.length > 0) {
        return categories.map(category => ({
          category,
          amount: 0,
          count: 0,
          color: getCategoryColor(category),
          icon: getCategoryIcon(category)
        }));
      }
      return data;
    } else {
      // Show item-wise breakdown for the selected category
      const items = Array.isArray(expenseData[drillCategory]) ? expenseData[drillCategory] : [];
      const filteredItems = filterByType(items); // Already filtered in App.js

      // Group by item name (e.g., Jio, Airtel, Idea)
      const itemMap = {};
      filteredItems.forEach(item => {
        const itemName = item.item || 'Unknown';
        if (!itemMap[itemName]) itemMap[itemName] = [];
        itemMap[itemName].push(item);
      });

      const itemBreakdown = Object.entries(itemMap).map(([itemName, itemList]) => {
        const total = itemList.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
        return {
          category: itemName,
          amount: total,
          count: itemList.length,
          color: getCategoryColor(itemName),
          icon: getCategoryIcon(itemName)
        };
      }).filter(d => d.count > 0)
        .sort((a, b) => b.amount - a.amount);

      // If no items for the selected period, but the category exists, show the category with amount 0
      if (itemBreakdown.length === 0) {
        // If the category exists in expenseData, show it with amount 0
        if (expenseData[drillCategory]) {
          return [{
            category: drillCategory,
            amount: 0,
            count: 0,
            color: getCategoryColor(drillCategory),
            icon: getCategoryIcon(drillCategory)
          }];
        }
        // If the category does not exist at all, return empty
        return [];
      }
      return itemBreakdown;
    }
  };

  // Always recalculate chartData when filters change
  const chartData = React.useMemo(() => getChartData(), [expenseData, selectedCategory, selectedPeriod, customRange, selectedDateRange, breakdownType, drillCategory]);
  const maxAmount = Math.max(...chartData.map(d => d.amount), 1);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Monthly trend data (basic dynamic version)
  const getTrendData = () => {
    if (!expenseData) return [];
    // Use AR/AP filter for trend
    const allItems = Object.values(expenseData).flat();
    const filteredItems = breakdownType === 'ar' ? allItems.filter(isIncome)
      : breakdownType === 'ap' ? allItems.filter(isExpense)
      : allItems;
    if (filteredItems.length === 0) return [];

    const monthMap = {};
    filteredItems.forEach(item => {
      if (!item.date) return;
      const d = new Date(item.date);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = [];
      monthMap[key].push(item);
    });
    const sortedMonths = Object.keys(monthMap).sort();
    const last6 = sortedMonths.slice(-6);

    return last6.map((key, idx) => {
      const items = monthMap[key];
      const total = items.reduce((sum, item) => sum + item.amount, 0);
      let prevTotal = 0;
      if (idx > 0) {
        const prevItems = monthMap[last6[idx - 1]];
        prevTotal = prevItems.reduce((sum, item) => sum + item.amount, 0);
      }
      const percentage = prevTotal ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;
      const [year, month] = key.split('-');
      const date = new Date(year, month - 1);
      const monthLabel = date.toLocaleString('default', { month: 'short' }) + ' ' + year;
      return {
        month: monthLabel,
        amount: total,
        percentage
      };
    });
  };

  const trendData = getTrendData();
  const maxTrendAmount = Math.max(...trendData.map(d => d.amount), 1);

  // Filtered data for summary stats
  const filteredData = React.useMemo(() => {
    const data = selectedCategory === 'all'
      ? Object.values(expenseData || {}).flat()
      : expenseData[selectedCategory] || [];
    const filtered = filterByPeriod(data, selectedPeriod, customRange, selectedDateRange);
    if (breakdownType === 'ar') return filtered.filter(isIncome);
    if (breakdownType === 'ap') return filtered.filter(isExpense);
    return filtered;
  }, [expenseData, selectedCategory, selectedPeriod, breakdownType]);

  // Summary calculations
  const summary = React.useMemo(() => {
    if (!filteredData || filteredData.length === 0) return {};

    const totalIncome = filteredData
      .filter(item => (item.type || '').toLowerCase() === 'income' || (item.type || '').toLowerCase() === 'sales')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const totalExpense = filteredData
      .filter(isExpense)
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const profit = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      profit
    };
  }, [filteredData]);

  return (
    <div className="charts-container">
      {/* Category Spending Chart */}
      <div className="chart-section">
        <div className="chart-header">
          <div className="chart-title">
            <h3>Spending by Category</h3>
            <p>Visual breakdown of expenses across categories</p>
          </div>
          <div className="chart-legend">
            <div className="legend-item">
              <div className="legend-color bar-chart-color"></div>
              <span>Amount (₹)</span>
            </div>
          </div>
        </div>
        
        <div className="bar-chart">
          {chartData.map((item, index) => (
            <div key={item.category} className="bar-item">
              <div className="bar-label" style={{alignItems: 'flex-start', flexDirection: 'column', minWidth: 120}}>
                <span className="bar-icon">{item.icon}</span>
                <span className="bar-category" style={{whiteSpace: 'pre-line', wordBreak: 'break-word', textAlign: 'left', maxWidth: `${Math.max(120, (item.amount / maxAmount) * 400)}px`}}>
                  {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                </span>
              </div>
              <div className="bar-container">
                <div 
                  className="bar-fill"
                  style={{ 
                    width: `${(item.amount / maxAmount) * 100}%`,
                    background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`
                  }}
                >
                  <div className="bar-shine"></div>
                </div>
              </div>
              <div className="bar-value">
                <span className="bar-amount">{formatCurrency(item.amount)}</span>
                <span className="bar-count">{item.count} items</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Donut Chart */}
      <div className="chart-section donut-section">
        <div className="chart-header">
          <div className="chart-title">
            <h3>Expense Distribution</h3>
            <p>Proportional view of category spending</p>
          </div>
        </div>
        
        <div className="donut-chart-container">
          <div className="donut-chart">
            <svg width="440" height="440" className="donut-svg">
              {(() => {
                const total = chartData.reduce((sum, item) => sum + item.amount, 0);
                let currentAngle = 0;
                const radius = 160;
                const centerX = 220;
                const centerY = 220;

                return chartData.map((item, index) => {
                  const percentage = (item.amount / total) * 100;
                  const angle = (percentage / 100) * 360;
                  const startAngle = currentAngle;
                  const endAngle = currentAngle + angle;
                  
                  const x1 = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180);
                  const y1 = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180);
                  const x2 = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180);
                  const y2 = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180);
                  
                  const largeArcFlag = angle > 180 ? 1 : 0;
                  
                  const pathData = [
                    `M ${centerX} ${centerY}`,
                    `L ${x1} ${y1}`,
                    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                    'Z'
                  ].join(' ');

                  currentAngle += angle;

                  return (
                    <path
                      key={item.category}
                      d={pathData}
                      fill={item.color}
                      stroke="white"
                      strokeWidth="3"
                      className="donut-segment"
                      style={{ cursor: drillCategory === 'all' ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (selectedCategory === 'all' && drillCategory === 'all') setDrillCategory(item.category);
                      }}
                    />
                  );
                });
              })()}
              
              {/* Center circle */}
              <circle cx="220" cy="220" r="100" fill="white" stroke="#e5e7eb" strokeWidth="2"/>
              
              {/* Center text */}
              <text x="220" y="210" textAnchor="middle" className="donut-center-label">Total</text>
              <text x="220" y="230" textAnchor="middle" className="donut-center-value">
                {formatCurrency(chartData.reduce((sum, item) => sum + item.amount, 0))}
              </text>
            </svg>
          </div>
          
          <div className="donut-legend">
            {chartData.map((item, index) => {
              const total = chartData.reduce((sum, d) => sum + d.amount, 0);
              const percentage = ((item.amount / total) * 100).toFixed(1);
              
              return (
                <div key={item.category} className="legend-row" style={{ cursor: drillCategory === 'all' ? 'pointer' : 'default' }} onClick={() => {
                  if (selectedCategory === 'all' && drillCategory === 'all') setDrillCategory(item.category);
                }}>
                  <div className="legend-indicator">
                    <div 
                      className="legend-dot" 
                      style={{ background: item.color }}
                    ></div>
                    <span className="legend-icon">{item.icon}</span>
                  </div>
                  <div className="legend-details">
                    <span className="legend-label">
                      {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                    </span>
                    <div className="legend-values">
                      <span className="legend-amount">{formatCurrency(item.amount)}</span>
                      <span className="legend-percentage">{percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="chart-section stats-section">
        <div className="chart-header">
          <div className="chart-title">
            <h3>Quick Insights</h3>
            <p>Key metrics from your expense data</p>
          </div>
        </div>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h4>Categories Active</h4>
              <p className="stat-value">{chartData.length}</p>
              <p className="stat-description">Different expense categories</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <h4>Highest Category</h4>
              <p className="stat-value">
                {chartData[0]?.category?.charAt(0).toUpperCase() + chartData[0]?.category?.slice(1) || 'N/A'}
              </p>
              <p className="stat-description">
                {chartData[0] ? formatCurrency(chartData[0].amount) : 'No data'}
              </p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <h4>Total Transactions</h4>
              <p className="stat-value">
                {chartData.reduce((sum, d) => sum + d.count, 0)}
              </p>
              <p className="stat-description">Across all categories</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Charts;