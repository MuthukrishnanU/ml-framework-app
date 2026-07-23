import { useState } from 'react';
import { useAppContext, API_BASE_URL } from '../context/AppContext';

export default function ModelGovernance() {
  const {
    isDarkMode,
    models,
    championId,
    settings,
    username,
    auditLog,
    fetchDashboardData,
    apiFetch
  } = useAppContext();

  // Active Tab State
  const [activeGovTab, setActiveGovTab] = useState<'policy' | 'migration'>('policy');

  // Traffic Split State
  const [routingMode, setRoutingMode] = useState<string>('single');
  const [championRatio, setChampionRatio] = useState<number>(0.9);
  const selectedChallengerId = 'cat_model_v1.0';

  // Migration & UAT states
  const [manifestJsonText, setManifestJsonText] = useState<string>(`{
  "models": {
    "xgb_migrated_v1": {
      "model_id": "xgb_migrated_v1",
      "algorithm_type": "XGBoost",
      "version": "1.0.0",
      "status": "migrated",
      "baselines": { "roc_auc": 0.85, "pr_auc": 0.81 },
      "live_metrics": { "roc_auc": 0.85, "latency": 14.5 }
    }
  },
  "rule_models": {
    "rule_migrated_v1": {
      "model_id": "rule_migrated_v1",
      "model_name": "Migrated Delinquency Rule",
      "rule_config": {
        "logic": "AND",
        "conditions": [{ "feature": "payment_delay_days", "operator": ">=", "value": 30 }]
      },
      "performance_summary": { "gini": 0.58 }
    }
  }
}`);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [uatResults, setUatResults] = useState<any>(null);
  const [uatLoading, setUatLoading] = useState<boolean>(false);

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

  const handleImportManifest = async () => {
    try {
      const parsed = JSON.parse(manifestJsonText);
      const response = await apiFetch(`${API_BASE_URL}/api/migration/import_manifest`, {
        method: 'POST',
        body: JSON.stringify(parsed)
      });
      if (response.ok) {
        const res = await response.json();
        setMigrationStatus(`Successfully migrated ${res.imported_ml} ML Models and ${res.imported_rules} Rule Models into Framework!`);
        fetchDashboardData();
        setTimeout(() => setMigrationStatus(''), 4000);
      }
    } catch (e: any) {
      setMigrationStatus(`Manifest Error: ${e.message || "Invalid JSON syntax"}`);
    }
  };

  const handleRunUatSuite = async () => {
    setUatLoading(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/migration/run_uat?target=all`);
      if (response.ok) {
        const res = await response.json();
        setUatResults(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUatLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Tab Selector */}
      <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} space-y-6`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Algorithm Governance & Migration Studio</h2>
            <p className="text-xs text-gray-500 font-medium">Manage production routing policies, dynamic traffic splits, bulk model migration manifests, and UAT test suites.</p>
          </div>

          <div className="flex bg-gray-950 border border-gray-800 p-1 rounded-lg text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setActiveGovTab('policy')}
              className={`px-4 py-2 rounded-md transition-all cursor-pointer ${activeGovTab === 'policy' ? 'bg-axis-burgundy text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Failover & Traffic Split
            </button>
            <button
              onClick={() => setActiveGovTab('migration')}
              className={`px-4 py-2 rounded-md transition-all cursor-pointer ${activeGovTab === 'migration' ? 'bg-axis-burgundy text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Bulk Migration & UAT Studio
            </button>
          </div>
        </div>

        {activeGovTab === 'policy' && (
          <div className="space-y-6">
            {/* Settings and Policy Switch panel */}
            <div className={`p-6 rounded-xl border shadow-sm ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className={`font-bold text-base ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'} mb-4`}>Failover Policy & Dynamic Traffic Allocation Router</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
                {/* Failover Policy */}
                <div className="space-y-3 border-r-0 lg:border-r border-gray-800/60 pr-0 lg:pr-6">
                  <span className="text-gray-400 block text-xs font-bold uppercase tracking-wider">Failover Trigger Policy</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleSettings('automatic')}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${settings.failover_mode === 'automatic' ? 'bg-axis-burgundy text-white border-axis-burgundy' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
                    >
                      Automatic Failover
                    </button>
                    <button
                      onClick={() => handleToggleSettings('manual')}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${settings.failover_mode === 'manual' ? 'bg-axis-burgundy text-white border-axis-burgundy' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
                    >
                      Manual Override
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Automatic mode monitors PSI (&ge; {settings.drift_threshold_psi}) and baseline ROC-AUC (&lt; {settings.performance_threshold_auc}) to promote the highest-scoring Challenger.
                  </p>
                </div>

                {/* Traffic Split Control */}
                <div className="space-y-3">
                  <span className="text-gray-400 block text-xs font-bold uppercase tracking-wider">Dynamic Canary Traffic Split</span>
                  <div className="flex gap-2 text-xs">
                    <button
                      onClick={() => {
                        setRoutingMode('single');
                        handleUpdateTrafficSplit('single', 1.0, selectedChallengerId);
                      }}
                      className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer ${routingMode === 'single' ? 'bg-axis-burgundy text-white border-axis-burgundy' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
                    >
                      100% Champion Route
                    </button>
                    <button
                      onClick={() => {
                        setRoutingMode('split');
                        handleUpdateTrafficSplit('split', championRatio, selectedChallengerId);
                      }}
                      className={`px-3 py-1.5 rounded-lg border font-semibold cursor-pointer ${routingMode === 'split' ? 'bg-axis-burgundy text-white border-axis-burgundy' : 'bg-gray-800 text-gray-400 border-gray-700'}`}
                    >
                      Split Traffic (Champion/Challenger)
                    </button>
                  </div>

                  {routingMode === 'split' && (
                    <div className="space-y-2 pt-2 text-xs">
                      <div className="flex justify-between font-mono">
                        <span>Champion Traffic: {(championRatio * 100).toFixed(0)}%</span>
                        <span>Challenger ({selectedChallengerId}): {((1 - championRatio) * 100).toFixed(0)}%</span>
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
                          handleUpdateTrafficSplit('split', r, selectedChallengerId);
                        }}
                        className="w-full accent-axis-burgundy"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Active Champion Model Details */}
            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} space-y-4`}>
              <div className="flex justify-between items-center">
                <h3 className={`font-bold text-sm ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Active Champion Model & Challenger Candidate Pool</h3>
                <button
                  onClick={handleRollbackChampion}
                  className="px-3.5 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  ⏮ Emergency Rollback to Previous Champion
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {models?.map((m: any) => {
                  const isChamp = m.model_id === championId;
                  return (
                    <div key={m.model_id} className={`p-4 rounded-xl border space-y-3 ${isChamp ? 'bg-axis-burgundy/10 border-axis-burgundy/50 text-white' : 'bg-gray-900/40 border-gray-800 text-gray-600'}`}>
                      <div className="flex justify-between items-start">
                        <span className="font-mono font-bold text-sm">{m.model_id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isChamp ? 'bg-axis-burgundy text-white' : 'bg-gray-800 text-gray-400'}`}>
                          {isChamp ? 'Active Champion' : 'Challenger'}
                        </span>
                      </div>

                      <div className={`text-xs space-y-1 font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                        <div>Algorithm: <span className={`${isChamp ? 'text-burgundy' : 'text-white'}`}>{m.algorithm_type}</span></div>
                        <div>ROC-AUC: <span className="text-green-700">{m.baselines.roc_auc}</span></div>
                        <div>Latency: <span className="text-blue-700">{m.live_metrics.latency} ms</span></div>
                      </div>

                      {!isChamp && (
                        <button
                          onClick={() => handlePromoteChallenger(m.model_id)}
                          className="w-full py-1.5 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold rounded cursor-pointer mt-2"
                        >
                          Promote to Champion
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Governance Audit Log Table */}
            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} space-y-4`}>
              <h3 className={`font-bold text-sm ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Governance & Model Routing Audit Logs</h3>
              <div className="overflow-x-auto border border-gray-850 rounded-xl">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="bg-gray-900 text-gray-400 border-b border-gray-800">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Triggered By</th>
                      <th className="p-3">Action Description</th>
                      <th className="p-3">Evidence / Metric</th>
                      <th className="p-3">Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-850 text-gray-300">
                    {auditLog.slice(-10).map((log: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-900/30">
                        <td className="p-3 text-gray-400">{log.timestamp}</td>
                        <td className="p-3 font-bold text-axis-burgundy dark:text-red-300">{log.triggered_by}</td>
                        <td className="p-3 text-gray-400">{log.action}</td>
                        <td className="p-3 text-gray-400">{log.evidence}</td>
                        <td className="p-3 text-blue-400">{log.approved_by || 'system'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeGovTab === 'migration' && (
          <div className="space-y-6">
            {/* Bulk Migration Manifest Importer */}
            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} space-y-4`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className={`font-bold text-sm ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Bulk Model Migration Manifest Importer</h3>
                  <p className="text-xs text-gray-400">Onboard legacy 10 ML Models and 20 Rule-Based Models into the Self-Healing Framework via JSON templates.</p>
                </div>

                <button
                  onClick={handleImportManifest}
                  className="px-5 py-2.5 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow cursor-pointer"
                >
                  📥 Import Migration Manifest
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Migration Manifest JSON Definition</label>
                <textarea
                  rows={10}
                  value={manifestJsonText}
                  onChange={(e) => setManifestJsonText(e.target.value)}
                  className={`w-full p-3 font-mono text-xs rounded-xl border focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-750 text-green-400' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>

              {migrationStatus && (
                <div className={`p-3 rounded-lg border text-xs font-bold text-center ${migrationStatus.startsWith('Manifest Error') ? 'bg-red-950/40 border-red-800 text-red-300' : 'bg-green-950/40 border-green-800 text-green-300'}`}>
                  {migrationStatus}
                </div>
              )}
            </div>

            {/* Automated UAT Assertion Suite Runner */}
            <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} space-y-4`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className={`font-bold text-sm ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Automated UAT Assertion & Verification Suite</h3>
                  <p className="text-xs text-gray-400">Run unit test assertion checks across all migrated ML models (10 capacity) and Rule-based models (20 capacity).</p>
                </div>

                <button
                  onClick={handleRunUatSuite}
                  disabled={uatLoading}
                  className="px-5 py-2.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow cursor-pointer disabled:opacity-40"
                >
                  {uatLoading ? "Running UAT Tests..." : "⚡ Execute UAT Test Suite"}
                </button>
              </div>

              {uatResults && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 text-xs font-bold">
                    <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg">
                      <span className="text-gray-400 block text-[10px]">Total Tested</span>
                      <span className="text-lg text-white font-mono">{uatResults.summary.total_tested}</span>
                    </div>
                    <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg">
                      <span className="text-gray-400 block text-[10px]">Passed</span>
                      <span className="text-lg text-green-400 font-mono">{uatResults.summary.passed}</span>
                    </div>
                    <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg">
                      <span className="text-gray-400 block text-[10px]">Failed</span>
                      <span className="text-lg text-red-400 font-mono">{uatResults.summary.failed}</span>
                    </div>
                    <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg">
                      <span className="text-gray-400 block text-[10px]">Pass Rate</span>
                      <span className="text-lg text-amber-400 font-mono">{(uatResults.summary.pass_rate * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-gray-850 rounded-xl">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-gray-900 text-gray-400 border-b border-gray-800">
                        <tr>
                          <th className="p-3">Model ID</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Algorithm / Rule Name</th>
                          <th className="p-3">Assertion Rule</th>
                          <th className="p-3">Observed Metric</th>
                          <th className="p-3">UAT Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850 text-gray-300">
                        {uatResults.details?.map((res: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-900/30">
                            <td className="p-3 font-bold text-axis-burgundy dark:text-red-300">{res.model_id}</td>
                            <td className="p-3 text-gray-400">{res.type}</td>
                            <td className="p-3 text-white">{res.algorithm_or_rule}</td>
                            <td className="p-3 text-gray-400">{res.assertion_check}</td>
                            <td className="p-3 font-semibold text-blue-400">{res.metric_value}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${res.status === 'PASS' ? 'bg-green-950 text-green-400 border border-green-900' : 'bg-red-950 text-red-400 border border-red-900'}`}>
                                {res.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
