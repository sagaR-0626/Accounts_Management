import React, { useMemo } from "react";
import "../Styles/Filters.css";

// Returns a label for the selected period

const getPeriodLabel = (selectedPeriod) => {
  const labels = {
    month: "Month",
    q1: "Q1 (Jan-Mar)",
    q2: "Q2 (Apr-Jun)",
    q3: "Q3 (Jul-Sep)",
    q4: "Q4 (Oct-Dec)",
    quarter: "This Quarter",
    year: "Year",
    all: "All Time",
    custom: "Custom Range"
  };
  return labels[selectedPeriod] || "This Month";
};

// Example usage for filtering data by period (assuming you have a date field in your data)
export const filterByPeriod = (data, selectedPeriod, customRange, selectedDateRange) => {
  if (!Array.isArray(data)) return [];
  if (selectedPeriod === "all") return data;

  // Find the most recent year in the data
  const years = data
    .map(item => item.date && !isNaN(new Date(item.date)) ? new Date(item.date).getFullYear() : null)
    .filter(Boolean);
  const referenceYear = years.length ? Math.max(...years) : new Date().getFullYear();
  const now = new Date(referenceYear, 0, 1); // Use Jan 1 of reference year

  return data.filter((item) => {
    if (!item.date) return true;
    const itemDate = new Date(item.date);
    if (isNaN(itemDate)) {
      console.log('Invalid date:', item.date, item);
      return false;
    }
    // Debug log for filtering
    console.log('Filtering:', item.date, '->', itemDate, 'SelectedPeriod:', selectedPeriod, 'Now:', now);
    if (selectedPeriod === "month") {
      return (
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear()
      );
    } else if (selectedPeriod === "q1") {
      return itemDate.getMonth() >= 0 && itemDate.getMonth() <= 2 && itemDate.getFullYear() === now.getFullYear();
    } else if (selectedPeriod === "q2") {
      return itemDate.getMonth() >= 3 && itemDate.getMonth() <= 5 && itemDate.getFullYear() === now.getFullYear();
    } else if (selectedPeriod === "q3") {
      return itemDate.getMonth() >= 6 && itemDate.getMonth() <= 8 && itemDate.getFullYear() === now.getFullYear();
    } else if (selectedPeriod === "q4") {
      return itemDate.getMonth() >= 9 && itemDate.getMonth() <= 11 && itemDate.getFullYear() === now.getFullYear();
    } else if (selectedPeriod === "quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const itemQuarter = Math.floor(itemDate.getMonth() / 3);
      return (
        itemQuarter === currentQuarter &&
        itemDate.getFullYear() === now.getFullYear()
      );
    } else if (selectedPeriod === "year") {
      return itemDate.getFullYear() === now.getFullYear();
    } else if (selectedPeriod === "custom" && customRange) {
      const { startMonth, startYear, endMonth, endYear } = customRange;
      if (
        startMonth === undefined || startYear === undefined ||
        endMonth === undefined || endYear === undefined
      ) return [];
      const start = new Date(startYear, startMonth, 1);
      const end = new Date(endYear, endMonth + 1, 0, 23, 59, 59, 999); // End of month
      return data.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        if (isNaN(d)) return false;
        return d >= start && d <= end;
      });
    } else if (selectedPeriod === "dateRange" && selectedDateRange) {
      const { startDate, endDate } = selectedDateRange;
      return data.filter(item => {
        if (!item.date) return false;
        const d = new Date(item.date);
        if (isNaN(d)) return false;
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate)) return false;
        return true;
      });
    }
    return true;
  });
};

const monthNames = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const Filters = ({
  selectedCategory,
  onCategoryChange,
  selectedPeriod,
  onPeriodChange,
  categories,
  customRange,
  onCustomRangeChange,
  pendingDateRange,
  onPendingDateRangeChange,
  selectedDateRange,
  onApplyDateRange,
}) => {
  const periods = [
    { value: "month", label: "Month" },
    { value: "q1", label: "Q1 (Jan-Mar)" },
    { value: "q2", label: "Q2 (Apr-Jun)" },
    { value: "q3", label: "Q3 (Jul-Sep)" },
    { value: "q4", label: "Q4 (Oct-Dec)" },
    { value: "quarter", label: "This Quarter" },
    
    { value: "year", label: "Year" },
   
    { value: "all", label: "All Time" },
    { value: "dateRange", label: "Date Range" }
  ];

  // Flatten all items for year/month extraction
  const allItems = useMemo(() => {
    if (!categories) return [];
    return categories.flatMap(cat =>
      Array.isArray(cat.items) ? cat.items : []
    );
  }, [categories]);

  // Get available years and months from data
  const availableYears = useMemo(() => {
    const years = new Set();
    allItems.forEach(item => {
      if (item && item.date) {
        const d = new Date(item.date);
        if (!isNaN(d)) years.add(d.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [allItems]);

  const availableMonthsByYear = useMemo(() => {
    const map = {};
    allItems.forEach(item => {
      if (item && item.date) {
        const d = new Date(item.date);
        if (!isNaN(d)) {
          const y = d.getFullYear();
          const m = d.getMonth();
          if (!map[y]) map[y] = new Set();
          map[y].add(m);
        }
      }
    });
    // Convert sets to arrays
    Object.keys(map).forEach(y => map[y] = Array.from(map[y]).sort((a, b) => a - b));
    return map;
  }, [allItems]);

  // Handle custom range change
  const handleCustomRangeChange = (field, value) => {
    onCustomRangeChange({
      ...customRange,
      [field]: value
    });
  };

  return (
    <div className="simple-filters enhanced-filters">
      <div className="filters-row">
        <div className="filter-block">
          <label htmlFor="category-select">Category</label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-block">
          <label htmlFor="period-select">Period</label>
          <select
            id="period-select"
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="filter-select"
          >
            {periods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      
    </div>
  );
};

export default Filters;
