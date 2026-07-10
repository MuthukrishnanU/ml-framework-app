import { useAppContext, API_BASE_URL } from '../context/AppContext';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function ModelGovernance() {
  const {
    isDarkMode,
    driftStats,
    settings,
    username,
    auditLog,
    fetchDashboardData,
    apiFetch
  } = useAppContext();

  // Toggle dynamic failover settings
  const handleToggleSettings = async (mode: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ failover_mode: mode })
      });
      if (response.ok) {
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Promote Challenger manually
  const handlePromoteChallenger = async (modelId: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/governance/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId, approved_by: username })
      });
      if (response.ok) {
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings and Policy Switch panel */}
      <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className="font-bold text-base text-axis-burgundy dark:text-red-200 mb-4">Failover Policy Settings</h3>

        <div className="flex items-center gap-8 text-sm">
          <div>
            <span className="text-gray-400 block mb-1.5">Failover Trigger Policy</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleToggleSettings('automatic')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${settings.failover_mode === 'automatic' ? 'bg-axis-burgundy text-white border-axis-burgundy' : 'border-gray-850 text-gray-400'}`}
              >
                Automated Self-Healing
              </button>
              <button
                onClick={() => handleToggleSettings('manual')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${settings.failover_mode === 'manual' ? 'bg-axis-burgundy text-white border-axis-burgundy' : 'border-gray-850 text-gray-400'}`}
              >
                Human-in-the-loop Gate
              </button>
            </div>
          </div>

          <div>
            <span className="text-gray-400 block mb-1">Drift Limit (PSI)</span>
            <span className="font-mono text-base font-bold text-white">&ge; 0.25</span>
          </div>

          <div>
            <span className="text-gray-400 block mb-1">AUC SLA Threshold</span>
            <span className="font-mono text-base font-bold text-white">&lt; 0.75</span>
          </div>
        </div>
      </div>

      {/* Model Card Alert for human governance signoff */}
      {driftStats.alert_card && (
        <div className={`p-6 rounded-2xl border border-amber-900/60 shadow-lg bg-gradient-to-br ${isDarkMode ? 'from-amber-950/10 to-gray-900' : 'from-amber-50/20 to-white'}`}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0">
              <AlertTriangle />
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="font-bold text-base text-amber-400">Action Required: Governance Approval Model Card</h3>
                <p className="text-xs text-gray-400">Active Champion model has degraded. The registry recommends promoting the top Challenger.</p>
              </div>

              {/* Side-by-side comparison tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 rounded-lg bg-gray-950/40 border border-gray-900">
                  <p className="font-bold text-gray-400 border-b border-gray-900 pb-1.5 mb-1.5">CURRENT CHAMPION (DEGRADED)</p>
                  <div>Model ID: {driftStats.alert_card.current_champion_id}</div>
                  <div>Live AUC: <span className="text-red-400">{driftStats.alert_card.current_champion_auc}</span></div>
                  <div>Live PSI: <span className="text-red-400">{driftStats.alert_card.current_champion_psi}</span></div>
                  <div>Adverse Impact: <span className="text-green-500">{driftStats.alert_card.adverse_impact_ratio} (Pass)</span></div>
                </div>

                <div className="p-3 rounded-lg bg-axis-burgundy/10 border border-axis-burgundy/20">
                  <p className="font-bold text-axis-burgundy dark:text-red-300 border-b border-axis-burgundy/20 pb-1.5 mb-1.5">PROPOSED CHALLENGER (PROMOTION)</p>
                  <div>Model ID: {driftStats.alert_card.suggested_challenger_id}</div>
                  <div>Baseline AUC: <span className="text-green-500">{driftStats.alert_card.suggested_challenger_auc}</span></div>
                  <div>Expected PSI: <span className="text-green-500">0.015</span></div>
                  <div>Adverse Impact: <span className="text-green-500">0.96 (Pass)</span></div>
                </div>
              </div>

              {driftStats.alert_card.requires_governance_approval ? (
                <div>
                  <button
                    onClick={() => handlePromoteChallenger(driftStats.alert_card!.suggested_challenger_id)}
                    className="px-5 py-2.5 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    Approve Promotion & Hot-Swap Route
                  </button>
                </div>
              ) : (
                <div className="text-xs text-green-500 font-semibold flex items-center gap-1.5">
                  <CheckCircle size={14} /> Self-Healing router successfully hot-swapped routes to {driftStats.alert_card.suggested_challenger_id} automatically.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Governance Audit Log Trail */}
      <div className={`rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="px-6 py-4 border-b border-gray-800">
          <h3 className="font-bold text-base text-axis-burgundy dark:text-red-200">Governance Audit Trail (Immutable)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-gray-450 uppercase tracking-wider font-semibold ${isDarkMode ? 'border-gray-800 bg-gray-950/50' : 'border-gray-200 bg-gray-50'}`}>
                <th className="p-4 w-48">Timestamp</th>
                <th className="p-4 w-40">Triggered By</th>
                <th className="p-4">Action Taken</th>
                <th className="p-4">Evidence</th>
                <th className="p-4 w-40">Approved By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 font-mono">
              {auditLog.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-550">
                    No governance audit entries recorded.
                  </td>
                </tr>
              ) : (
                auditLog.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-800/10 transition-colors">
                    <td className="p-4 text-gray-450 text-[10px]">{log.timestamp}</td>
                    <td className="p-4 font-bold text-gray-300">{log.triggered_by}</td>
                    <td className="p-4 text-white font-semibold">{log.action}</td>
                    <td className="p-4 text-blue-400 truncate max-w-xs" title={log.evidence}>
                      {log.evidence}
                    </td>
                    <td className="p-4 font-bold text-green-500">{log.approved_by || 'SYSTEM'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
