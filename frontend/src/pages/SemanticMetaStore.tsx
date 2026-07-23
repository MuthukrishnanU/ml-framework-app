import { useState, useEffect } from 'react';
import { useAppContext, API_BASE_URL } from '../context/AppContext';

export default function SemanticMetaStore() {
  const {
    isDarkMode,
    semanticMetadata,
    apiFetch
  } = useAppContext();

  // Active Tab state
  const [activeMetaTab, setActiveMetaTab] = useState<'schema' | 'connectors'>('schema');

  // Schema client-side pagination, search, and sorting states
  const [schemaSearchQuery, setSchemaSearchQuery] = useState<string>('');
  const [schemaSortBy, setSchemaSortBy] = useState<string>('table');
  const [schemaSortOrder, setSchemaSortOrder] = useState<'asc' | 'desc'>('asc');
  const [schemaPage, setSchemaPage] = useState<number>(1);

  // Feature Store Connectors state
  const [connectors, setConnectors] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [compiledSqlResult, setCompiledSqlResult] = useState<any>(null);
  const [queryLoading, setQueryLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchFeatureStoreConnectors();
  }, []);

  const fetchFeatureStoreConnectors = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/feature_store/connectors`);
      if (response.ok) {
        const res = await response.json();
        setConnectors(res.connectors || []);
        setTemplates(res.templates || []);
        if (res.templates && res.templates.length > 0) {
          setSelectedTemplate(res.templates[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load feature store connectors", e);
    }
  };

  const handleExecuteTemplateSql = async () => {
    if (!selectedTemplate) return;
    setQueryLoading(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/feature_store/execute_sql`, {
        method: 'POST',
        body: JSON.stringify({
          sql_template: selectedTemplate.sql_template,
          filters: { age_min: 21, age_max: 75, income_min: 30000, credit_score_min: 650, gender: 'All' },
          selected_features: []
        })
      });
      if (response.ok) {
        const res = await response.json();
        setCompiledSqlResult(res);
      }
    } catch (e) {
      console.error("Failed to execute feature store SQL query", e);
    } finally {
      setQueryLoading(false);
    }
  };

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
        {/* Navigation Tab Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Semantic Layer & Feature Store Meta Store</h2>
            <p className="text-xs text-gray-500 font-medium">Inspect table column classifications and template-driven feature store metadata connectors.</p>
          </div>

          <div className="flex bg-gray-950 border border-gray-800 p-1 rounded-lg text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setActiveMetaTab('schema')}
              className={`px-4 py-2 rounded-md transition-all cursor-pointer ${activeMetaTab === 'schema' ? 'bg-axis-burgundy text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Schema Definitions
            </button>
            <button
              onClick={() => setActiveMetaTab('connectors')}
              className={`px-4 py-2 rounded-md transition-all cursor-pointer ${activeMetaTab === 'connectors' ? 'bg-axis-burgundy text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Feature Store Connectors
            </button>
          </div>
        </div>

        {activeMetaTab === 'schema' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search meta store schemas..."
                  value={schemaSearchQuery}
                  onChange={(e) => handleSchemaSearchChange(e.target.value)}
                  className={`w-full pl-3 pr-8 py-1.5 rounded-lg border text-xs focus:outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
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
              <span className="text-xs font-mono text-gray-450">Total Schema Columns: {totalSchemaRecords}</span>
            </div>

            <div className="overflow-x-auto border border-gray-200 dark:border-gray-850 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b text-gray-450 uppercase tracking-wider font-semibold ${isDarkMode ? 'border-gray-800 bg-gray-950/50' : 'border-gray-200 bg-gray-50'}`}>
                    <th onClick={() => toggleSchemaSort('table')} className="p-4 cursor-pointer hover:bg-gray-800/40 select-none">
                      Table Name {schemaSortBy === 'table' ? (schemaSortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => toggleSchemaSort('column')} className="p-4 cursor-pointer hover:bg-gray-800/40 select-none">
                      Column Name {schemaSortBy === 'column' ? (schemaSortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => toggleSchemaSort('type')} className="p-4 cursor-pointer hover:bg-gray-800/40 select-none">
                      Data Type {schemaSortBy === 'type' ? (schemaSortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="p-4">Key Constraints</th>
                    <th onClick={() => toggleSchemaSort('sens')} className="p-4 cursor-pointer hover:bg-gray-800/40 select-none">
                      Sensitivity {schemaSortBy === 'sens' ? (schemaSortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="p-4">Business Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-850 text-gray-300">
                  {paginatedSchemaData.map((col, i) => (
                    <tr key={i} className="hover:bg-gray-900/30 transition-colors">
                      <td className="p-4 font-bold text-axis-burgundy dark:text-red-300 font-mono">{col.table}</td>
                      <td className={`p-4 font-mono font-semibold ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>{col.column}</td>
                      <td className="p-4 font-mono text-gray-400">{col.type}</td>
                      <td className="p-4 font-mono text-gray-400">
                        {col.pk ? <span className="bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded text-[10px] mr-1">PK</span> : null}
                        {col.fk ? <span className="bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded text-[10px]">FK</span> : null}
                        {!col.pk && !col.fk ? '-' : null}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${col.sens === 'Critical' ? 'bg-red-950 text-red-400 border border-red-900' : col.sens === 'High' ? 'bg-amber-950 text-amber-400 border border-amber-900' : 'bg-gray-800 text-gray-300'}`}>
                          {col.sens}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400">{col.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
              <div>Showing Page <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{currentSchemaPage}</span> of <span className="font-bold text-white">{maxSchemaPage}</span></div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSchemaPage(p => Math.max(1, p - 1))}
                  disabled={currentSchemaPage === 1}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() => setSchemaPage(p => Math.min(maxSchemaPage, p + 1))}
                  disabled={currentSchemaPage === maxSchemaPage}
                  className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white rounded disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {activeMetaTab === 'connectors' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {connectors.map((c) => (
                <div key={c.connector_id} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                  <div className="flex justify-between items-start">
                    <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>{c.name}</span>
                    <span className="px-2 py-0.5 bg-green-950 text-green-400 border border-green-900 rounded text-[10px] font-bold">
                      {c.status}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 font-mono text-gray-400">
                    <div>Type: <span className="text-amber-400">{c.store_type}</span></div>
                    <div>Host: <span className="text-gray-300">{c.host}</span></div>
                    <div>Database: <span className="text-gray-300">{c.database}</span></div>
                  </div>
                  <div className="pt-2 border-t border-gray-800 text-[10px] text-gray-500">
                    Tables: {c.tables.join(', ')}
                  </div>
                </div>
              ))}
            </div>

            {/* Template-Driven SQL Compiler Section */}
            <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} space-y-4`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className={`font-bold text-sm ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Template-Driven SQL Query Compiler</h3>
                  <p className="text-xs text-gray-400">Select a feature extraction SQL template and execute dynamic transformation compiling.</p>
                </div>

                {templates.length > 0 && (
                  <select
                    value={selectedTemplate?.template_id}
                    onChange={(e) => {
                      const tmpl = templates.find(t => t.template_id === e.target.value);
                      setSelectedTemplate(tmpl);
                    }}
                    className={`px-3 py-1.5 text-xs rounded border focus:outline-none font-bold ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  >
                    {templates.map(t => (
                      <option key={t.template_id} value={t.template_id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {selectedTemplate && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-400">SQL Transformation Template</label>
                    <textarea
                      rows={6}
                      value={selectedTemplate.sql_template}
                      onChange={(e) => setSelectedTemplate({ ...selectedTemplate, sql_template: e.target.value })}
                      className={`w-full p-3 font-mono text-xs rounded-xl border focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-750 text-green-400' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleExecuteTemplateSql}
                      disabled={queryLoading}
                      className="px-5 py-2.5 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow cursor-pointer disabled:opacity-40"
                    >
                      {queryLoading ? "Compiling & Executing SQL..." : "Compile & Run SQL Feature Extraction"}
                    </button>
                  </div>

                  {compiledSqlResult && (
                    <div className="space-y-3 pt-3 border-t border-gray-800">
                      <h4 className="font-bold text-xs uppercase text-gray-400">Compiled Executable SQL & Result Preview</h4>
                      <pre className="p-3 bg-gray-900 border border-gray-800 rounded-lg text-xs font-mono text-amber-300 whitespace-pre-wrap">
                        {compiledSqlResult.compiled_sql}
                      </pre>

                      <div className="overflow-x-auto border border-gray-800 rounded-lg">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-gray-950 text-gray-400 border-b border-gray-800">
                            <tr>
                              {compiledSqlResult.columns?.map((col: string) => (
                                <th key={col} className="p-2.5 truncate">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className={`divide-y divide-gray-850 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {compiledSqlResult.preview_data?.map((row: any, i: number) => (
                              <tr key={i} className="hover:bg-gray-900/40">
                                {compiledSqlResult.columns?.map((col: string) => (
                                  <td key={col} className="p-2.5 truncate">{row[col] ?? '-'}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
