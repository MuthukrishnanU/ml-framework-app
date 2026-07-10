import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function SemanticMetaStore() {
  const {
    isDarkMode,
    semanticMetadata
  } = useAppContext();

  // Schema client-side pagination, search, and sorting states
  const [schemaSearchQuery, setSchemaSearchQuery] = useState<string>('');
  const [schemaSortBy, setSchemaSortBy] = useState<string>('table');
  const [schemaSortOrder, setSchemaSortOrder] = useState<'asc' | 'desc'>('asc');
  const [schemaPage, setSchemaPage] = useState<number>(1);

  const handleSchemaSearchChange = (query: string) => {
    setSchemaSearchQuery(query);
    setSchemaPage(1);
  };

  const toggleSchemaSort = (column: string) => {
    if (schemaSortBy === column) {
      setSchemaSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSchemaSortBy(column);
      setSchemaSortOrder('asc');
    }
    setSchemaPage(1);
  };

  // Client-side filtering, sorting and pagination for Semantic Meta Store
  const sortedSchemaData = (() => {
    let filtered = semanticMetadata;
    if (schemaSearchQuery.trim() !== '') {
      const q = schemaSearchQuery.toLowerCase();
      filtered = semanticMetadata.filter(col =>
        (col.table || '').toLowerCase().includes(q) ||
        (col.column || '').toLowerCase().includes(q) ||
        (col.type || '').toLowerCase().includes(q) ||
        (col.pk || '').toLowerCase().includes(q) ||
        (col.fk || '').toLowerCase().includes(q) ||
        (col.sens || '').toLowerCase().includes(q) ||
        (col.desc || '').toLowerCase().includes(q)
      );
    }
    if (schemaSortBy) {
      filtered = [...filtered].sort((a, b) => {
        const valA = (a[schemaSortBy as keyof typeof a] || '').toString().toLowerCase();
        const valB = (b[schemaSortBy as keyof typeof b] || '').toString().toLowerCase();
        if (valA < valB) return schemaSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return schemaSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  })();

  const schemaPageSize = 25;
  const totalSchemaRecords = sortedSchemaData.length;
  const maxSchemaPage = Math.ceil(totalSchemaRecords / schemaPageSize) || 1;
  const currentSchemaPage = Math.min(schemaPage, maxSchemaPage);
  const paginatedSchemaData = sortedSchemaData.slice(
    (currentSchemaPage - 1) * schemaPageSize,
    currentSchemaPage * schemaPageSize
  );

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} space-y-6`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-axis-burgundy dark:text-red-200">Semantic Layer Meta Store</h2>
            <p className="text-xs text-gray-500 font-medium">Inspect database schema definitions and sensitivity classifications.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Smart Search meta store..."
                value={schemaSearchQuery}
                onChange={(e) => handleSchemaSearchChange(e.target.value)}
                className={`w-full sm:w-64 pl-3 pr-8 py-1.5 rounded-lg border text-xs focus:outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-305 text-gray-900 placeholder-gray-400'}`}
              />
              {schemaSearchQuery && (
                <button
                  onClick={() => handleSchemaSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-450 hover:text-gray-300 font-bold px-1 text-sm leading-none"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 dark:border-gray-850 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-gray-450 uppercase tracking-wider font-semibold ${isDarkMode ? 'border-gray-800 bg-gray-950/50' : 'border-gray-200 bg-gray-50'}`}>
                <th onClick={() => toggleSchemaSort('table')} className="p-4 cursor-pointer hover:bg-gray-850/10 dark:hover:bg-gray-800/40 select-none">
                  <div className="flex items-center gap-1.5">
                    Table Name {schemaSortBy === 'table' && (schemaSortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </div>
                </th>
                <th onClick={() => toggleSchemaSort('column')} className="p-4 cursor-pointer hover:bg-gray-850/10 dark:hover:bg-gray-800/40 select-none">
                  <div className="flex items-center gap-1.5">
                    Column Name {schemaSortBy === 'column' && (schemaSortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </div>
                </th>
                <th onClick={() => toggleSchemaSort('type')} className="p-4 cursor-pointer hover:bg-gray-850/10 dark:hover:bg-gray-800/40 select-none">
                  <div className="flex items-center gap-1.5">
                    SQL Type {schemaSortBy === 'type' && (schemaSortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </div>
                </th>
                <th onClick={() => toggleSchemaSort('pk')} className="p-4 cursor-pointer hover:bg-gray-850/10 dark:hover:bg-gray-800/40 select-none">
                  <div className="flex items-center gap-1.5">
                    Primary Key {schemaSortBy === 'pk' && (schemaSortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </div>
                </th>
                <th onClick={() => toggleSchemaSort('fk')} className="p-4 cursor-pointer hover:bg-gray-850/10 dark:hover:bg-gray-800/40 select-none">
                  <div className="flex items-center gap-1.5">
                    Foreign Key {schemaSortBy === 'fk' && (schemaSortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </div>
                </th>
                <th onClick={() => toggleSchemaSort('sens')} className="p-4 cursor-pointer hover:bg-gray-850/10 dark:hover:bg-gray-800/40 select-none">
                  <div className="flex items-center gap-1.5">
                    Sensitivity {schemaSortBy === 'sens' && (schemaSortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </div>
                </th>
                <th onClick={() => toggleSchemaSort('desc')} className="p-4 cursor-pointer hover:bg-gray-850/10 dark:hover:bg-gray-800/40 select-none">
                  <div className="flex items-center gap-1.5">
                    Business Definition {schemaSortBy === 'desc' && (schemaSortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {paginatedSchemaData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No matching metadata entries found.
                  </td>
                </tr>
              ) : (
                paginatedSchemaData.map((col, index) => (
                  <tr key={index} className={`hover:bg-gray-50 dark:hover:bg-gray-850/40 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <td className="p-4 font-bold text-white">{col.table}</td>
                    <td className="p-4 font-mono text-red-400">{col.column}</td>
                    <td className="p-4 font-mono text-gray-400">{col.type}</td>
                    <td className="p-4 text-center">
                      {col.pk === 'Yes' ? <span className="text-green-500 font-semibold">PK</span> : <span className="text-gray-650">-</span>}
                    </td>
                    <td className="p-4 font-mono text-blue-400">{col.fk}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 text-[10px] rounded font-semibold ${col.sens === 'Critical' ? 'bg-red-950 text-red-400 border border-red-900' : col.sens === 'High' ? 'bg-amber-950 text-amber-400 border border-amber-900' : 'bg-gray-800 text-gray-450'}`}>
                        {col.sens}
                      </span>
                    </td>
                    <td className="p-4 text-gray-450 font-normal leading-relaxed">{col.desc}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalSchemaRecords > 0 && (
          <div className="flex items-center justify-between pt-4 text-xs border-t border-gray-800">
            <div className="text-gray-500">
              Showing <span className="font-semibold">{Math.min(totalSchemaRecords, (currentSchemaPage - 1) * schemaPageSize + 1)}</span> to{" "}
              <span className="font-semibold">{Math.min(totalSchemaRecords, currentSchemaPage * schemaPageSize)}</span> of{" "}
              <span className="font-semibold">{totalSchemaRecords}</span> records
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSchemaPage(p => Math.max(1, p - 1))}
                disabled={currentSchemaPage === 1}
                className="px-3 py-1.5 rounded-lg border bg-gray-800 hover:bg-gray-750 text-white text-xs disabled:opacity-40 transition-all font-semibold"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-gray-400 font-medium">Page {currentSchemaPage} of {maxSchemaPage}</span>
              <button
                onClick={() => setSchemaPage(p => Math.min(maxSchemaPage, p + 1))}
                disabled={currentSchemaPage >= maxSchemaPage}
                className="px-3 py-1.5 rounded-lg border bg-gray-800 hover:bg-gray-750 text-white text-xs disabled:opacity-40 transition-all font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
