/// caluclation.js page
 
export function calculateTransactionTotals(transactions) {
  return transactions.reduce((acc, txn) => {
    const amount = Number(txn.Amount || 0);
    const type = (txn.Type || txn.Type || '').toLowerCase();
    if (type === 'expense') {
      acc.ap += amount;
    } else if (type === 'receipt' || type === 'income') {
      acc.ar += amount;
    }
    return acc;
  }, { ar: 0, ap: 0 });
}
 
export function calculateDashboardTotals(projects) {
  return projects.reduce((acc, project) => ({
    budget: acc.budget + (project.budget || 0),
    spent: acc.spent + (project.spent || 0),
    profit: acc.profit + (project.profit || 0),
    ar: acc.ar + (project.ar || 0),
    ap: acc.ap + (project.ap || 0),
    team: acc.team + (project.team || 0)
  }), { budget: 0, spent: 0, profit: 0, ar: 0, ap: 0, team: 0 });
}
 
export function calculateDashboardMetrics(rows) {
  let ar = 0, ap = 0, profit = 0, loss = 0;
  rows.forEach(row => {
    const type = (row.Type || '').toLowerCase();
    const amount = Number(row.Amount || 0);
    if (type === 'expense') {
      ap += amount;
      loss += amount;
    } else if (type === 'income' || type === 'receipt') {
      ar += amount;
      profit += amount;
    }
  });
  const netMargin = profit - loss;
  const netMarginPercent = profit > 0 ? ((netMargin / profit) * 100) : 0;
  return { ar, ap, profit, loss, netMargin, netMarginPercent: netMarginPercent.toFixed(2) };
}
 
// Breakdown by category for drilldown modals
export function getBreakdownByCategory(rows, typeKey) {
  const filtered = rows.filter(row => {
    const t = (row.Type || '').toLowerCase();
    if (typeKey === 'ar') return t === 'income' || t === 'receipt';
    if (typeKey === 'ap') return t === 'expense';
    if (typeKey === 'profit') return t === 'income' || t === 'receipt';
    if (typeKey === 'loss') return t === 'expense';
    return false;
  });
  const grouped = {};
  filtered.forEach(row => {
    const cat = row.Category || 'Other';
    grouped[cat] = (grouped[cat] || 0) + Number(row.Amount || 0);
  });
  return grouped;
}
 
// Get compact project list with AR/AP/Profit/Loss
export function getProjectFinancials(projects) {
  return projects.map(p => {
    const ar = Number(p.AR || 0);
    const ap = Number(p.AP || 0);
    const profit = ar - ap;
    return {
      ProjectID: p.ProjectID,
      ProjectName: p.ProjectName,
      AR: ar,
      AP: ap,
      Profit: profit,
      Loss: profit < 0 ? Math.abs(profit) : 0
    };
  });
}
 
// Get top N profitable projects
export function getTopProfitableProjects(projects, n = 5) {
  const financials = getProjectFinancials(projects);
  return financials
    .sort((a, b) => b.Profit - a.Profit)
    .slice(0, n);
}
 
// Get top N loss-making projects
export function getTopLossProjects(projects, n = 5) {
  const financials = getProjectFinancials(projects);
  return financials
    .filter(p => p.Profit < 0)
    .sort((a, b) => a.Profit - b.Profit)
    .slice(0, n);
}
 
// Get revenue contribution per project (for pie chart)
export function getProjectRevenueShare(projects) {
  const totalRevenue = projects.reduce((sum, p) => sum + Number(p.AR || 0), 0);
  return projects.map(p => ({
    ProjectName: p.ProjectName,
    Share: totalRevenue ? ((Number(p.AR || 0) / totalRevenue) * 100).toFixed(2) : 0
  }));
}
 
// Get compact project list with AR/AP/Profit/Loss from transactions
export function getProjectFinancialsFromTransactions(transactions) {
  const projects = {};
  transactions.forEach(txn => {
    const pid = txn.ProjectID;
    if (!pid) return;
    if (!projects[pid]) {
      projects[pid] = {
        ProjectID: pid,
        ProjectName: txn.ProjectName || '',
        AR: 0,
        AP: 0
      };
    }
    const type = (txn.Type || '').toLowerCase();
    const amount = Number(txn.Amount || 0);
    if (type === 'expense') {
      projects[pid].AP += amount;
    } else if (type === 'income' || type === 'receipt') {
      projects[pid].AR += amount;
    }
  });
 
  // Calculate profit/loss for each project
  return Object.values(projects).map(p => ({
    ...p,
    Profit: p.AR - p.AP,
    Loss: p.AR - p.AP < 0 ? Math.abs(p.AR - p.AP) : 0
  }));
}
 
// Get top N profitable projects
export function getTopProfitableProjectsFromTransactions(transactions, n = 5) {
  const financials = getProjectFinancialsFromTransactions(transactions);
  return financials.sort((a, b) => b.Profit - a.Profit).slice(0, n);
}
 
// Get revenue contribution per project (for pie chart)
export function getProjectRevenueShareFromTransactions(transactions) {
  const financials = getProjectFinancialsFromTransactions(transactions);
  const totalRevenue = financials.reduce((sum, p) => sum + p.AR, 0);
  return financials.map(p => ({
    ProjectName: p.ProjectName,
    Share: totalRevenue ? ((p.AR / totalRevenue) * 100).toFixed(2) : 0
  }));
}
 