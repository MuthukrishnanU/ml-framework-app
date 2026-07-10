import { useState, useEffect } from 'react';
import { useAppContext, API_BASE_URL } from '../context/AppContext';

export default function TableExplorer() {
  const { isDarkMode, apiFetch } = useAppContext();

  // Local table explorer states
  const [selectedTable, setSelectedTable] = useState('demographics');
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [tableData, setTableData] = useState<any[][]>([]);
  const [tablePage, setTablePage] = useState(1);
  const [tableTotal, setTableTotal] = useState(0);
  const [tableSearchInput, setTableSearchInput] = useState('');
  const [tableSearchDebounced, setTableSearchDebounced] = useState('');
  const [tableSortBy, setTableSortBy] = useState('');
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch Table Data
  const fetchTableData = async (tableName: string, page: number, search: string = "", sortBy: string = "", sortOrder: string = "asc") => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/db/table?table_name=${tableName}&page=${page}&page_size=100&search=${encodeURIComponent(search)}&sort_by=${encodeURIComponent(sortBy)}&sort_order=${sortOrder}`);
      if (res.ok) {
        const data = await res.json();
        setTableColumns(data.columns);
        setTableData(data.data);
        setTableTotal(data.total);
        setTablePage(data.page);
      }
    } catch (e) {
      console.error("Error loading table explorer data", e);
    }
  };

  // Debouncing search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setTableSearchDebounced(tableSearchInput);
      setTablePage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [tableSearchInput]);

  // Trigger query on dependency change
  useEffect(() => {
    fetchTableData(selectedTable, tablePage, tableSearchDebounced, tableSortBy, tableSortOrder);
  }, [selectedTable, tablePage, tableSearchDebounced, tableSortBy, tableSortOrder]);

  return (
    <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} space-y-6`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Database Table Explorer</h2>
          <p className="text-xs text-gray-500 font-medium">Inspect the raw rows and columns stored on the PostgreSQL database tables.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Smart Search table..."
              value={tableSearchInput}
              onChange={(e) => setTableSearchInput(e.target.value)}
              className={`w-full sm:w-64 pl-3 pr-8 py-1.5 rounded-lg border text-xs focus:outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
            />
            {tableSearchInput && (
              <button
                onClick={() => setTableSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-450 hover:text-gray-300 font-bold px-1 text-sm leading-none"
              >
                &times;
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-405 whitespace-nowrap">Select Table:</label>
            <select
              value={selectedTable}
              onChange={(e) => { setSelectedTable(e.target.value); setTablePage(1); setTableSortBy(''); }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
            >
              <option value="demographics">demographics</option>
              <option value="credit_card_history">credit_card_history</option>
              <option value="investment_profiles">investment_profiles</option>
              <option value="loan_details">loan_details</option>
              <option value="predictions">predictions</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-850 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className={`border-b ${isDarkMode ? 'bg-gray-950 border-gray-850 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              {tableColumns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => {
                    if (tableSortBy === col) {
                      setTableSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                    } else {
                      setTableSortBy(col);
                      setTableSortOrder('asc');
                    }
                    setTablePage(1);
                  }}
                  className="p-3 font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-850/10 dark:hover:bg-gray-800/40 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    {col}
                    {tableSortBy === col && (tableSortOrder === 'asc' ? '▲' : '▼')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-850">
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={tableColumns.length || 1} className="p-6 text-center text-gray-500">
                  No records loaded. Select a table to query PostgreSQL.
                </td>
              </tr>
            ) : (
              tableData.map((row, rowIndex) => (
                <tr key={rowIndex} className={`hover:bg-gray-50 dark:hover:bg-gray-850/40 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="p-3 max-w-xs truncate" title={cell !== null ? String(cell) : "NULL"}>
                      {cell === null ? <em className="text-gray-500">NULL</em> : String(cell)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {tableTotal > 0 && (
        <div className="flex items-center justify-between pt-4 text-xs">
          <div className="text-gray-500">
            Showing <span className="font-semibold">{Math.min(tableTotal, (tablePage - 1) * 100 + 1)}</span> to{" "}
            <span className="font-semibold">{Math.min(tableTotal, tablePage * 100)}</span> of{" "}
            <span className="font-semibold">{tableTotal}</span> records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTablePage(p => Math.max(1, p - 1))}
              disabled={tablePage === 1}
              className="px-3 py-1.5 rounded-lg border bg-gray-800 hover:bg-gray-750 text-white text-xs disabled:opacity-40 transition-all font-semibold cursor-pointer"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-gray-400 font-medium">Page {tablePage} of {Math.ceil(tableTotal / 100)}</span>
            <button
              onClick={() => setTablePage(p => Math.min(Math.ceil(tableTotal / 100), p + 1))}
              disabled={tablePage >= Math.ceil(tableTotal / 100)}
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
