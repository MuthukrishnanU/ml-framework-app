import { useState, useEffect } from 'react';
import { useAppContext, API_BASE_URL } from '../context/AppContext';

export default function ObservabilityLogs() {
  const { isDarkMode, apiFetch } = useAppContext();

  // Local observability states
  const [observabilityLogs, setObservabilityLogs] = useState<any[]>([]);
  const [observabilityTotal, setObservabilityTotal] = useState(0);
  const [observabilityPage, setObservabilityPage] = useState(1);
  const [observabilitySearchInput, setObservabilitySearchInput] = useState('');
  const [observabilitySearchDebounced, setObservabilitySearchDebounced] = useState('');
  const [observabilityMetrics, setObservabilityMetrics] = useState<{
    total_requests: number;
    avg_latency_ms: number;
    success_rate: number;
  }>({ total_requests: 0, avg_latency_ms: 0.0, success_rate: 0.0 });
  const [selectedObsLog, setSelectedObsLog] = useState<any | null>(null);

  // Fetch logs
  const fetchObservabilityLogs = async (page: number, search: string) => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/observability/logs?page=${page}&page_size=100&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const json = await res.json();
        setObservabilityLogs(json.data);
        setObservabilityTotal(json.total);
        setObservabilityMetrics(json.metrics);
      }
    } catch (e) {
      console.error("Failed to load observability logs", e);
    }
  };

  // Debouncing search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setObservabilitySearchDebounced(observabilitySearchInput);
      setObservabilityPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [observabilitySearchInput]);

  // Trigger query on dependency change
  useEffect(() => {
    fetchObservabilityLogs(observabilityPage, observabilitySearchDebounced);
  }, [observabilityPage, observabilitySearchDebounced]);

  return (
    <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} space-y-6`}>
      <div>
        <h2 className="text-xl font-bold tracking-tight">API Audit Logs & Observability Center</h2>
        <p className="text-xs text-gray-500 font-medium">Real-time audit trails of system operations, user interactions, and ML endpoint execution latencies.</p>
      </div>

      {/* Telemetry Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} flex flex-col justify-between`}>
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Operations Logged</span>
          <span className="text-2xl font-black mt-2 text-axis-burgundy dark:text-red-400">{observabilityMetrics.total_requests.toLocaleString()}</span>
          <span className="text-[10px] text-gray-500 mt-1">Telemetry events captured in Neon database</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} flex flex-col justify-between`}>
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Average API Latency</span>
          <span className="text-2xl font-black mt-2 text-amber-500">{observabilityMetrics.avg_latency_ms.toFixed(2)} ms</span>
          <span className="text-[10px] text-gray-500 mt-1">Average backend process timing</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} flex flex-col justify-between`}>
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Service Success Rate</span>
          <span className="text-2xl font-black mt-2 text-green-500">{observabilityMetrics.success_rate.toFixed(2)}%</span>
          <span className="text-[10px] text-gray-500 mt-1">Percentage of requests returning 2xx status</span>
        </div>
      </div>

      {/* Filter and Smart Search Controls */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={observabilitySearchInput}
            onChange={(e) => setObservabilitySearchInput(e.target.value)}
            placeholder="Search logs by user, endpoint, method, status code, payload..."
            className={`w-full pl-4 pr-10 py-2.5 rounded-xl border focus:ring-2 focus:ring-axis-burgundy focus:outline-none text-xs transition-colors ${isDarkMode ? 'bg-gray-950 border-gray-800 text-gray-100 placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-405'}`}
          />
          {observabilitySearchInput && (
            <button
              onClick={() => setObservabilitySearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs font-bold font-mono border-0 bg-transparent cursor-pointer"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Logs Data Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-850 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className={`border-b ${isDarkMode ? 'bg-gray-950 border-gray-850 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
              <th className="p-3 font-semibold uppercase tracking-wider">Timestamp</th>
              <th className="p-3 font-semibold uppercase tracking-wider">User</th>
              <th className="p-3 font-semibold uppercase tracking-wider">Role</th>
              <th className="p-3 font-semibold uppercase tracking-wider">Method</th>
              <th className="p-3 font-semibold uppercase tracking-wider">Endpoint</th>
              <th className="p-3 font-semibold uppercase tracking-wider">Status</th>
              <th className="p-3 font-semibold uppercase tracking-wider">Latency</th>
              <th className="p-3 font-semibold uppercase tracking-wider">Client IP</th>
              <th className="p-3 font-semibold uppercase tracking-wider text-right">Payload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-850 text-gray-300">
            {observabilityLogs.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500 font-medium">
                  No audit log transactions match the active filter criteria.
                </td>
              </tr>
            ) : (
              observabilityLogs.map((log) => {
                const isSuccess = log.status_code >= 200 && log.status_code < 300;
                return (
                  <tr key={log.log_id} className={`${isDarkMode ? 'hover:bg-gray-800/10 text-gray-305' : 'hover:bg-gray-900/40 text-white'}`}>
                    <td className={`p-3 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(log.timestamp).toLocaleString('en-IN', { hour12: false })}
                    </td>
                    <td className="p-3 font-semibold text-axis-burgundy dark:text-red-400">{log.username}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-150 text-gray-700'}`}>
                        {log.user_role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.method === 'GET' ? 'bg-blue-950/40 border border-blue-900/30 text-blue-300' : 'bg-purple-950/40 border border-purple-900/30 text-purple-300'}`}>
                        {log.method}
                      </span>
                    </td>
                    <td className={`p-3 font-mono font-bold tracking-tight ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} select-all`}>{log.endpoint}</td>
                    <td className="p-3">
                      <span className={`font-bold ${isSuccess ? 'text-green-500' : 'text-red-500'}`}>
                        {log.status_code}
                      </span>
                    </td>
                    <td className="p-3 font-medium">
                      <span className={log.latency_ms > 500 ? 'text-amber-500' : 'text-gray-300'}>
                        {log.latency_ms.toFixed(2)} ms
                      </span>
                    </td>
                    <td className={`p-3 font-mono ${isDarkMode ? 'text-gray-455' : 'text-gray-600'}`}>{log.client_ip}</td>
                    <td className="p-3 text-right">
                      {log.payload_summary ? (
                        <button
                          onClick={() => setSelectedObsLog(log)}
                          className="text-xs font-bold text-axis-burgundy dark:text-red-400 hover:underline bg-transparent border-0 cursor-pointer"
                        >
                          Inspect JSON
                        </button>
                      ) : (
                        <span className="text-gray-500">None</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {observabilityTotal > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 text-xs text-gray-400">
          <div className="font-medium">
            Showing <span className="font-semibold">{Math.min(observabilityTotal, (observabilityPage - 1) * 100 + 1)}</span> to{" "}
            <span className="font-semibold">{Math.min(observabilityTotal, observabilityPage * 100)}</span> of{" "}
            <span className="font-semibold">{observabilityTotal}</span> matching logs
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setObservabilityPage(p => Math.max(1, p - 1))}
              disabled={observabilityPage === 1}
              className="px-3 py-1.5 rounded-lg border bg-gray-800 hover:bg-gray-750 text-white text-xs disabled:opacity-40 transition-all font-semibold cursor-pointer"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-gray-400 font-medium">Page {observabilityPage} of {Math.ceil(observabilityTotal / 100)}</span>
            <button
              onClick={() => setObservabilityPage(p => Math.min(Math.ceil(observabilityTotal / 100), p + 1))}
              disabled={observabilityPage >= Math.ceil(observabilityTotal / 100)}
              className="px-3 py-1.5 rounded-lg border bg-gray-800 hover:bg-gray-750 text-white text-xs disabled:opacity-40 transition-all font-semibold cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Log Payload JSON Details Modal */}
      {selectedObsLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/85 backdrop-blur-sm p-4">
          <div className={`relative max-w-2xl w-full rounded-2xl border p-6 shadow-2xl overflow-y-auto max-h-[85vh] ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="flex items-center justify-between border-b pb-3 mb-4 border-gray-750">
              <div>
                <h3 className="text-base font-bold">API Transaction Payload Details</h3>
                <p className="text-xs text-gray-400">Sanitized request body payload logged from client call.</p>
              </div>
              <button
                onClick={() => setSelectedObsLog(null)}
                className="text-gray-400 hover:text-white font-bold text-xs bg-gray-800 hover:bg-gray-750 px-3 py-1.5 rounded-lg transition-all cursor-pointer border-0"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block uppercase font-bold tracking-wider text-[10px]">Endpoint Route</span>
                  <br />
                  <span className="font-mono bg-gray-850 px-2 py-0.5 rounded text-amber-300 font-bold">{selectedObsLog.method} {selectedObsLog.endpoint}</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase font-bold tracking-wider text-[10px]">User & Identity</span>
                  <br />
                  <span className="font-semibold text-axis-burgundy dark:text-red-400">{selectedObsLog.username} ({selectedObsLog.user_role})</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase font-bold tracking-wider text-[10px]">Processing Latency</span>
                  <br />
                  <span className="font-semibold text-green-400">{selectedObsLog.latency_ms.toFixed(2)} ms</span>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase font-bold tracking-wider text-[10px]">Client Host IP</span>
                  <br />
                  <span className="font-mono text-gray-350">{selectedObsLog.client_ip}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-gray-500 block uppercase font-bold tracking-wider text-[10px]">Raw JSON Payload</span>
                <pre className="bg-gray-950 p-4 rounded-xl text-xs overflow-x-auto text-green-400 border border-gray-850 font-mono">
                  {(() => {
                    try {
                      const parsed = JSON.parse(selectedObsLog.payload_summary);
                      return JSON.stringify(parsed, null, 2);
                    } catch (e) {
                      return selectedObsLog.payload_summary || "Empty Request Body";
                    }
                  })()}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
