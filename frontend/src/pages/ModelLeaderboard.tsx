import { useState } from 'react';
import { useAppContext, API_BASE_URL } from '../context/AppContext';
import { RotateCcw, ShieldCheck, TrendingUp, Activity } from 'lucide-react';

export default function ModelLeaderboard() {
  const {
    isDarkMode,
    models,
    championId,
    settings,
    fetchDashboardData,
    apiFetch
  } = useAppContext();

  const [testCustomerId, setTestCustomerId] = useState('CUST000001');
  const [scoreResult, setScoreResult] = useState<any>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'champion':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-axis-burgundy border border-axis-burgundy animate-pulse dark:bg-axis-burgundy-dark dark:text-red-100">
            Champion
          </span>
        );
      case 'challenger':
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
            Challenger
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            Retired
          </span>
        );
    }
  };

  const handleTestScore = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: testCustomerId })
      });
      if (response.ok) {
        const data = await response.json();
        setScoreResult(data);
      } else {
        alert("Customer not found or database offline.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Manual Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-dashed border-gray-800 bg-gray-900/10 dark:bg-gray-950/20">
        <div>
          <h2 className="text-lg font-bold tracking-tight">System Performance & ML Leaderboard</h2>
          <p className="text-xs text-gray-500">Manual refresh gate controls MLOps telemetry pulling and live status tracking.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 py-2 px-4 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
        >
          <RotateCcw size={14} /> Refresh Dashboard Data
        </button>
      </div>

      {/* Highlight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Champion Card */}
        <div className={`p-6 rounded-2xl border flex items-center justify-between shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-700'} font-bold uppercase tracking-wider`}>Active Router Champion</p>
            <h3 className="text-2xl font-bold mt-1 text-axis-burgundy dark:text-red-400">
              {models.find(m => m.model_id === championId)?.algorithm_type || 'XGBoost'}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">ID: {championId} (v1.0.0)</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-axis-burgundy-dark flex items-center justify-center text-axis-burgundy dark:text-red-100">
            <ShieldCheck size={24} />
          </div>
        </div>

        {/* Live Performance Card */}
        <div className={`p-6 rounded-2xl border flex items-center justify-between shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-700'} font-bold uppercase tracking-wider`}>Champion Live ROC-AUC</p>
            <h3 className="text-2xl font-bold mt-1 text-green-500">
              {models.find(m => m.model_id === championId)?.live_metrics.roc_auc || '0.842'}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">Baseline: {models.find(m => m.model_id === championId)?.baselines.roc_auc || '0.842'}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-950/40 flex items-center justify-center text-green-600">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Active settings / mode card */}
        <div className={`p-6 rounded-2xl border flex items-center justify-between shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div>
            <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-700'} font-bold uppercase tracking-wider`}>Self-Healing Router Policy</p>
            <h3 className={`text-xl font-bold mt-1 uppercase tracking-wide ${isDarkMode ? 'text-red-300' : 'text-axis-burgundy'}`}>
              {settings.failover_mode === 'automatic' ? 'Fully Automatic' : 'Semi-Auto (Governance)'}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">Tolerance Threshold: PSI &ge; 0.25</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center text-purple-600">
            <Activity size={24} />
          </div>
        </div>
      </div>

      {/* Detailed Scoreboard Table */}
      <div className={`rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className={`font-bold text-base ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Candidate Models Scoreboard</h3>
          <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>Rankings determined by validation scores</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b text-gray-450 uppercase tracking-wider font-semibold ${isDarkMode ? 'border-gray-800 bg-gray-950/50' : 'border-gray-200 bg-gray-50'}`}>
                <th className="p-4">Rank (ROC/PR)</th>
                <th className="p-4">Model Details</th>
                <th className="p-4">Routing Status</th>
                <th className="p-4">Base / Live ROC-AUC</th>
                <th className="p-4">Base / Live PR-AUC</th>
                <th className="p-4">Live F1</th>
                <th className="p-4">Live LogLoss</th>
                <th className="p-4">KS Statistic</th>
                <th className="p-4">Current PSI</th>
                <th className="p-4">Latency / Footprint</th>
                <th className="p-4">Fairness (AIR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {models.map((model) => {
                const isChamp = model.model_id === championId;
                return (
                  <tr
                    key={model.model_id}
                    className={`transition-colors hover:bg-gray-800/10 ${isChamp ? 'bg-axis-burgundy/5 dark:bg-axis-burgundy-dark/10' : ''}`}
                  >
                    <td className="p-4 font-bold text-center">
                      <span className="text-red-400">#{model.roc_auc_rank}</span>
                      <span className="text-gray-500 mx-1">/</span>
                      <span className="text-blue-400">#{model.pr_auc_rank}</span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-sm">{model.algorithm_type}</div>
                      <div className="text-[10px] text-gray-500">ID: {model.model_id}</div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(isChamp ? 'champion' : 'challenger')}
                    </td>
                    <td className="p-4 font-medium">
                      <div>{model.baselines.roc_auc}</div>
                      <div className={`text-[10px] ${model.live_metrics.roc_auc < 0.75 ? 'text-red-400 font-bold' : 'text-green-500'}`}>
                        {model.live_metrics.roc_auc}
                      </div>
                    </td>
                    <td className="p-4">
                      <div>{model.baselines.pr_auc}</div>
                      <div className="text-[10px] text-blue-400">{model.live_metrics.pr_auc}</div>
                    </td>
                    <td className={`p-4 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{model.live_metrics.f1_score}</td>
                    <td className={`p-4 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{model.live_metrics.log_loss}</td>
                    <td className={`p-4 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{model.live_metrics.ks_statistic}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded font-mono font-semibold ${model.live_metrics.psi >= 0.25 ? 'bg-red-950 text-red-400 border border-red-900 animate-pulse' : 'bg-gray-800 text-gray-300'}`}>
                        {model.live_metrics.psi || '0.00'}
                      </span>
                    </td>
                    <td className={`p-4 font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div>{model.live_metrics.latency} ms</div>
                      <div className="text-[10px]">{model.live_metrics.memory} MB</div>
                    </td>
                    <td className="p-4">
                      <span className={`font-semibold ${model.live_metrics.fairness < 0.8 ? 'text-red-400 font-bold' : 'text-green-500'}`}>
                        {model.live_metrics.fairness}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Customer Scoring Test Simulator */}
      <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <h3 className={`font-bold text-base ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'} mb-2`}>Live Scorer Playground</h3>
        <p className="text-xs text-gray-400 mb-4">Input a Customer ID to score propensity through the active Champion and examine explanation coefficients.</p>

        <div className="flex gap-4 max-w-md">
          <input
            type="text"
            value={testCustomerId}
            onChange={(e) => setTestCustomerId(e.target.value)}
            placeholder="e.g. CUST000001"
            className={`px-4 py-2 text-sm rounded-lg border focus:ring-2 focus:ring-axis-burgundy focus:outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-100 border-gray-300 text-black'}`}
          />
          <button
            onClick={handleTestScore}
            className="px-5 py-2 rounded-lg bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-semibold tracking-wider transition-all cursor-pointer"
          >
            Query Scorer
          </button>
        </div>

        {scoreResult && (
          <div className="mt-6 p-4 rounded-xl border border-gray-800 bg-gray-950/40 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <h4 className={`font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Scoring Response</h4>
              <div><span className="text-gray-450">Active Model ID:</span> <span className="font-bold text-red-400">{scoreResult.prediction_id}</span></div>
              <div><span className="text-gray-450">Routed Engine:</span> <span className="font-bold text-white">{scoreResult.algorithm_type} (Champion)</span></div>
              <div><span className="text-gray-450">Propensity Score:</span> <span className={`font-bold text-lg ${isDarkMode ? 'text-green-500' : 'text-green-700'}`}>{(scoreResult.propensity_score * 100).toFixed(2)}%</span></div>
              <div>
                <span className="text-gray-450">Classification Decision:</span>
                <span className={`font-bold ml-1.5 px-2 py-0.5 rounded text-[10px] ${scoreResult.label === 1 ? 'bg-green-950 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                  {scoreResult.label === 1 ? 'High Propensity (Accept)' : 'Low Propensity (Reject)'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className={`font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-700'}`}>Explainability Factors (Top 3 Coefficients)</h4>
              <div className="space-y-1 font-mono text-gray-600">
                <div>1. Credit Score Impact: <span className={scoreResult.explanation_coefficients[0] >= 0 ? 'text-green-600' : 'text-red-400'}>{scoreResult.explanation_coefficients[0]}</span></div>
                <div>2. Income Impact: <span className={scoreResult.explanation_coefficients[1] >= 0 ? 'text-green-600' : 'text-red-400'}>{scoreResult.explanation_coefficients[1]}</span></div>
                <div>3. Late Payments Impact: <span className={scoreResult.explanation_coefficients[2] >= 0 ? 'text-green-600' : 'text-red-400'}>{scoreResult.explanation_coefficients[2]}</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
