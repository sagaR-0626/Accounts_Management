import React, { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { useLocation, useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, BarChart3, List } from 'lucide-react';
import Header from './Header'; // Make sure this is your full-width header
import { getBreakdownByCategory } from '../utils/Calculations';

const ARAPBreakdown = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { transactions = [], organization = {}, type } = location.state || {};

  // Get breakdown by category
  const breakdown = getBreakdownByCategory(transactions, type);

  // Prepare chart data
  const categories = Object.keys(breakdown);
  const amounts = Object.values(breakdown);
  const totalAmount = amounts.reduce((sum, v) => sum + v, 0);

  const colors = [
    '#3b82f6', '#10b981', '#f97316', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f59e0b', '#ec4899', '#84cc16', '#6366f1'
  ];

  const chartData = {
    labels: categories,
    datasets: [{
      data: amounts,
      backgroundColor: colors.slice(0, categories.length),
      borderWidth: 2,
      borderColor: '#fff',
      hoverBorderWidth: 3,
      hoverBorderColor: '#fff'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12,
            weight: 500
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed;
            const percentage = ((value / totalAmount) * 100).toFixed(1);
            return `${context.label}: ₹${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    }
  };

  const titleText = type === 'ar' ? 'Accounts Receivable' : 'Accounts Payable';
  const titleColor = type === 'ar' ? '#10b981' : '#f97316';
  const TitleIcon = type === 'ar' ? TrendingUp : TrendingDown;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <Header /> {/* Full-width header with logo and "Accounts Management" */}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px' }}>
        {/* Small, left-aligned AR/AP breakdown header */}
        <div style={{ marginTop: 24, marginBottom: 16 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              padding: '8px 8px',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 15,
              color: '#374151',
              boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
              marginRight: 12,
              marginBottom: 8,
              display: 'inline-block'
            }}
          >
            ← Back to Dashboard
          </button>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 20,
            fontWeight: 600,
            color: '#111827',
            verticalAlign: 'middle'
          }}>
            <span style={{
              background: titleColor,
              color: '#fff',
              borderRadius: 8,
              padding: 5,
              display: 'inline-flex',
              alignItems: 'center',
              marginRight: 6
            }}>
              <TitleIcon size={18} />
            </span>
            {titleText} Breakdown
          </span>
          <div style={{
            fontSize: 15,
            color: '#6b7280',
            marginTop: 2,
            marginLeft: 2
          }}>
         
          </div>
        </div>

        {/* Summary Card */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          marginBottom: 24,
          border: `2px solid ${titleColor}20`
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: 16
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: 18, 
              fontWeight: 600,
              color: '#374151'
            }}>
              Total {titleText}
            </h3>
            <div style={{
              background: `${titleColor}10`,
              color: titleColor,
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600
            }}>
              {categories.length} {categories.length === 1 ? 'Item' : 'Items'}
            </div>
          </div>
          <div style={{ 
            fontSize: 36, 
            fontWeight: 700, 
            color: titleColor,
            marginBottom: 8
          }}>
            ₹{totalAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ 
            fontSize: 14, 
            color: '#6b7280'
          }}>
            Across {categories.length} categories
          </div>
        </div>

        {/* Chart View (always shown first) */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          marginBottom: 24
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
            marginBottom: 24
          }}>
            <BarChart3 size={20} style={{ color: titleColor }} />
            <h3 style={{ 
              margin: 0, 
              fontSize: 20, 
              fontWeight: 600,
              color: '#374151'
            }}>
              Distribution Analysis
            </h3>
          </div>

          {categories.length > 0 ? (
            <div style={{ 
              height: 400, 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Doughnut data={chartData} options={chartOptions} />
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: 48,
              color: '#6b7280'
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>No Data Available</h4>
              <p style={{ margin: 0 }}>No {titleText.toLowerCase()} records found.</p>
            </div>
          )}
        </div>

        {/* List View (always shown below chart) */}
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 0,
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '24px 32px',
            borderBottom: '1px solid #f3f4f6',
            background: '#fafbfc'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12
            }}>
              <List size={20} style={{ color: titleColor }} />
              <h3 style={{ 
                margin: 0, 
                fontSize: 20, 
                fontWeight: 600,
                color: '#374151'
              }}>
                Detailed Breakdown
              </h3>
            </div>
          </div>

          <div style={{ padding: '0' }}>
            {categories.length > 0 ? categories.map((cat, idx) => (
              <div
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 32px',
                  borderBottom: idx < categories.length - 1 ? '1px solid #f3f4f6' : 'none',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: colors[idx % colors.length],
                    flexShrink: 0
                  }} />
                  <div>
                    <div style={{
                      fontWeight: 600,
                      fontSize: 16,
                      color: '#374151',
                      marginBottom: 4
                    }}>
                      {cat}
                    </div>
                    <div style={{
                      fontSize: 13,
                      color: '#6b7280',
                      background: '#dbeafe',
                      color: '#1d4ed8',
                      padding: '2px 8px',
                      borderRadius: 12,
                      display: 'inline-block'
                    }}>
                      Category
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontWeight: 700,
                    fontSize: 18,
                    color: titleColor,
                    marginBottom: 4
                  }}>
                    ₹{breakdown[cat].toLocaleString('en-IN')}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: '#6b7280',
                    fontWeight: 500
                  }}>
                    {((breakdown[cat] / totalAmount) * 100).toFixed(1)}% of total
                  </div>
                </div>
              </div>
            )) : (
              <div style={{
                textAlign: 'center',
                padding: 48,
                color: '#6b7280'
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>No Records Found</h4>
                <p style={{ margin: 0 }}>No {titleText.toLowerCase()} records to display.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ARAPBreakdown;