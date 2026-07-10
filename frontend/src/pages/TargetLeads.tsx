import { useState, useEffect } from 'react';
import { useAppContext, API_BASE_URL } from '../context/AppContext';

export default function TargetLeads() {
  const { isDarkMode, apiFetch } = useAppContext();

  // Local target leads states
  const [selectedLeadProduct, setSelectedLeadProduct] = useState('credit_card_history');
  const [leadColumns, setLeadColumns] = useState<string[]>([]);
  const [leadData, setLeadData] = useState<any[][]>([]);
  const [leadPage, setLeadPage] = useState(1);
  const [leadTotal, setLeadTotal] = useState(0);
  const [leadSearchInput, setLeadSearchInput] = useState('');
  const [leadSearchDebounced, setLeadSearchDebounced] = useState('');
  const [leadSortBy, setLeadSortBy] = useState('');
  const [leadSortOrder, setLeadSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch Leads Data
  const fetchLeadsData = async (product: string, page: number, search: string = "", sortBy: string = "", sortOrder: string = "asc") => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/db/leads?product=${product}&page=${page}&page_size=100&search=${encodeURIComponent(search)}&sort_by=${encodeURIComponent(sortBy)}&sort_order=${sortOrder}`);
      if (res.ok) {
        const data = await res.json();
        setLeadColumns(data.columns);
        setLeadData(data.data);
        setLeadTotal(data.total);
        setLeadPage(data.page);
      }
    } catch (e) {
      console.error("Error loading target leads data", e);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setLeadSearchDebounced(leadSearchInput);
      setLeadPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [leadSearchInput]);

  // Trigger query on dependency change
  useEffect(() => {
    fetchLeadsData(selectedLeadProduct, leadPage, leadSearchDebounced, leadSortBy, leadSortOrder);
  }, [selectedLeadProduct, leadPage, leadSearchDebounced, leadSortBy, leadSortOrder]);

  return (
    <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} space-y-6`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Campaign Target Leads (Strong Customers)</h2>
          <p className="text-xs text-gray-500 font-medium">Optimized lists of customers matching high-propensity acquisition rules.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Smart Search leads..."
              value={leadSearchInput}
              onChange={(e) => setLeadSearchInput(e.target.value)}
              className={`w-full sm:w-64 pl-3 pr-8 py-1.5 rounded-lg border text-xs focus:outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
            />
            {leadSearchInput && (
              <button
                onClick={() => setLeadSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-450 hover:text-gray-300 font-bold px-1 text-sm leading-none"
              >
                &times;
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-405 whitespace-nowrap">Select Campaign Product:</label>
            <select
              value={selectedLeadProduct}
              onChange={(e) => { setSelectedLeadProduct(e.target.value); setLeadPage(1); setLeadSortBy(''); }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="credit_card_history">Credit Cards (CC Cross-Sell)</option>
              <option value="investment_profiles">Mutual Funds (Investments)</option>
              <option value="loan_details">Retail Loans (Credit Demand)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-850 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className={`border-b ${isDarkMode ? 'bg-gray-950 border-gray-850 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              {leadColumns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => {
                    if (leadSortBy === col) {
                      setLeadSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                    } else {
                      setLeadSortBy(col);
                      setLeadSortOrder('asc');
                    }
                    setLeadPage(1);
                  }}
                  className="p-3 font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-850/10 dark:hover:bg-gray-800/40 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    {col}
                    {leadSortBy === col && (leadSortOrder === 'asc' ? '▲' : '▼')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-850">
            {leadData.length === 0 ? (
              <tr>
                <td colSpan={leadColumns.length || 1} className="p-6 text-center text-gray-500">
                  No matching leads found.
                </td>
              </tr>
            ) : (
              leadData.map((row, rowIndex) => (
                <tr key={rowIndex} className={`hover:bg-gray-50 dark:hover:bg-gray-850/40 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {row.map((cell, cellIndex) => {
                    let displayVal = cell === null ? "N/A" : String(cell);
                    if (typeof cell === 'number') {
                      if (cellIndex === 1 || cellIndex === 3 || cellIndex === 4 || cellIndex === 5) {
                        if (cell > 1000) {
                          displayVal = `₹${cell.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                        }
                      } else if (cellIndex === 6 && selectedLeadProduct === 'credit_card_history') {
                        displayVal = `${(cell * 100).toFixed(2)}%`;
                      }
                    }
                    return (
                      <td key={cellIndex} className="p-3 font-medium">
                        {cellIndex === 0 ? (
                          <span className="font-mono bg-gray-150 dark:bg-gray-800 px-2 py-0.5 rounded text-red-400 font-bold">{displayVal}</span>
                        ) : cellIndex === 6 && selectedLeadProduct === 'credit_card_history' ? (
                          <span className="text-green-400 font-bold">{displayVal}</span>
                        ) : (
                          displayVal
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {leadTotal > 0 && (
        <div className="flex items-center justify-between pt-4 text-xs">
          <div className="text-gray-500">
            Showing <span className="font-semibold">{Math.min(leadTotal, (leadPage - 1) * 100 + 1)}</span> to{" "}
            <span className="font-semibold">{Math.min(leadTotal, leadPage * 100)}</span> of{" "}
            <span className="font-semibold">{leadTotal}</span> matching leads
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLeadPage(p => Math.max(1, p - 1))}
              disabled={leadPage === 1}
              className="px-3 py-1.5 rounded-lg border bg-gray-800 hover:bg-gray-750 text-white text-xs disabled:opacity-40 transition-all font-semibold cursor-pointer"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-gray-400 font-medium">Page {leadPage} of {Math.ceil(leadTotal / 100)}</span>
            <button
              onClick={() => setLeadPage(p => Math.min(Math.ceil(leadTotal / 100), p + 1))}
              disabled={leadPage >= Math.ceil(leadTotal / 100)}
              className="px-3 py-1.5 rounded-lg border bg-gray-800 hover:bg-gray-750 text-white text-xs disabled:opacity-40 transition-all font-semibold cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
