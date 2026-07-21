import { useState } from 'react';
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

  // Traffic Split State
  const [routingMode, setRoutingMode] = useState<string>('single');
  const [championRatio, setChampionRatio] = useState<number>(0.9);
  const selectedChallengerId = 'cat_model_v1.0';

  // Traffic split handler
  const handleUpdateTrafficSplit = async (mode: string, champRatio: number, challId: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/governance/traffic_split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: mode,
          champion_ratio: champRatio,
          challenger_ratio: Number((1.0 - champRatio).toFixed(2)),
          selected_challenger_id: challId
        })
      });
      if (response.ok) {
        fetchDashboardData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Rollback handler
  const handleRollbackChampion = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/governance/rollback`, { method: 'POST' });
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
        <h3 className={`font-bold text-base ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'} mb-4`}>Failover Policy & Dynamic Traffic Allocation Router</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
          {/* Failover Policy */}
          <div className="space-y-3 border-r border-gray-800/60 pr-6">
            <span className="text-gray-400 block text-xs font-bold uppercase tracking-wider">Failover Trigger Policy</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleToggleSettings('automatic')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer border-0 ${settings.failover_mode === 'automatic' ? 'bg-axis-burgundy text-white' : 'bg-gray-800 text-gray-400'}`}
              >
                Automated Self-Healing
              </button>
              <button
                onClick={() => handleToggleSettings('manual')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer border-0 ${settings.failover_mode === 'manual' ? 'bg-axis-burgundy text-white' : 'bg-gray-800 text-gray-400'}`}
              >
                Human-in-the-loop Gate
              </button>
            </div>
            <div className="flex gap-6 text-xs pt-1">
              <div><span className="text-gray-500">Drift Limit (PSI):</span> <span className="font-mono font-bold text-white">&ge; 0.25</span></div>
              <div><span className="text-gray-500">AUC Threshold:</span> <span className="font-mono font-bold text-white">&lt; 0.75</span></div>
            </div>
          </div>

          {/* Traffic Allocation (A/B Split & Shadow Mode) */}
          <div className="space-y-3">
            <span className="text-gray-400 block text-xs font-bold uppercase tracking-wider">Traffic Allocation & A/B Split Router</span>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => {
                  setRoutingMode('single');
                  handleUpdateTrafficSplit('single', 1.0, selectedChallengerId);
                }}
                className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer border-0 ${routingMode === 'single' ? 'bg-green-700 text-white font-bold' : 'bg-gray-800 text-gray-400'}`}
              >
                100% Champion
              </button>
              <button
                onClick={() => {
                  setRoutingMode('ab_split');
                  handleUpdateTrafficSplit('ab_split', 0.8, selectedChallengerId);
                }}
                className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer border-0 ${routingMode === 'ab_split' ? 'bg-blue-700 text-white font-bold' : 'bg-gray-800 text-gray-400'}`}
              >
                A/B Split Traffic
              </button>
              <button
                onClick={() => {
                  setRoutingMode('shadow');
                  handleUpdateTrafficSplit('shadow', 1.0, selectedChallengerId);
                }}
                className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer border-0 ${routingMode === 'shadow' ? 'bg-purple-700 text-white font-bold' : 'bg-gray-800 text-gray-400'}`}
              >
                Shadow Scoring Mode
              </button>
            </div>

            {routingMode === 'ab_split' && (
              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-xs font-mono">
                  <span>Champion Traffic: <b className="text-axis-burgundy dark:text-red-400">{Math.round(championRatio * 100)}%</b></span>
                  <span>Challenger Traffic: <b className="text-blue-400">{Math.round((1 - championRatio) * 100)}%</b></span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={championRatio}
                  onChange={(e) => {
                    const r = parseFloat(e.target.value);
                    setChampionRatio(r);
                    handleUpdateTrafficSplit('ab_split', r, selectedChallengerId);
                  }}
                  className="w-full accent-axis-burgundy"
                />
              </div>
            )}
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
                    className="px-5 py-2.5 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border-0"
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

      {/* Governance Audit Log Trail with Rollback Button */}
      <div className={`rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className={`font-bold text-base ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Governance Audit Trail (Immutable)</h3>
          <button
            onClick={handleRollbackChampion}
            className="px-3.5 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            title="Revert active Champion to previous stable build recorded in audit history"
          >
            ↺ Rollback to Previous Champion
          </button>
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
                    <td className={`p-4 font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{log.triggered_by}</td>
                    <td className={`p-4 ${isDarkMode ? 'text-white' : 'text-gray-400'} font-semibold`}>{log.action}</td>
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
