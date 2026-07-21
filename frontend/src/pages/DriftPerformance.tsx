import { useNavigate } from 'react-router-dom';
import { useAppContext, API_BASE_URL } from '../context/AppContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Cpu, AlertTriangle, Play, RotateCcw, Sliders } from 'lucide-react';

export default function DriftPerformance() {
  const {
    isDarkMode,
    driftStats,
    setDriftStats,
    apiFetch
  } = useAppContext();

  const navigate = useNavigate();

  const handleSimulationStep = async (action: 'inject_drift' | 'reset_drift') => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/simulation/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        const data = await res.json();
        setDriftStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Controller Panel */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-axis-burgundy/10 text-axis-burgundy dark:text-red-400">
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">Simulation Control Panel</h3>
            <p className="text-[10px] text-gray-500">Inject dynamic covariate shifts into Neon Postgres to test self-healing performance decay.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-full border ${driftStats.drift_active ? 'bg-amber-950/40 border-amber-900 text-amber-300 animate-pulse' : 'bg-green-950/40 border-green-900 text-green-300'}`}>
            {driftStats.drift_active ? 'Drift Active' : 'Healthy State'}
          </span>

          <button
            onClick={() => handleSimulationStep('inject_drift')}
            disabled={driftStats.drift_active}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer border-0"
          >
            <Play size={14} /> Inject Covariate Drift
          </button>
          <button
            onClick={() => handleSimulationStep('reset_drift')}
            disabled={!driftStats.drift_active}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-axis-burgundy hover:bg-axis-burgundy-hover text-white font-semibold text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer border-0"
          >
            <RotateCcw size={14} /> Reset System State
          </button>
        </div>
      </div>

      {/* Drift warning banner with Retrain Trigger */}
      {driftStats.drift_active && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="animate-bounce shrink-0" size={24} />
            <div>
              <p className="font-bold text-sm">Covariate Drift & Performance Decay Flagged!</p>
              <p className="text-xs opacity-90">The population stability index (PSI) for active features crossed 0.25 threshold. Re-training is strongly recommended.</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/pipeline-studio')}
            className="px-4 py-2 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase rounded-lg shadow transition-all flex items-center gap-1.5 shrink-0 cursor-pointer border-0"
          >
            <Sliders size={14} /> Re-launch Training in Studio &rarr;
          </button>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: PSI Drift Line Chart */}
        <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-4">PSI (Population Stability Index) Drift Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={driftStats.simulation_history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="timestamp" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                <Legend />
                <Line type="monotone" dataKey="psi" stroke="#861F41" strokeWidth={3} name="Live PSI Value" />
                <Line type="monotone" dataKey={() => 0.25} stroke="#d97706" strokeDasharray="5 5" name="Drift Threshold" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: True Performance ROC-AUC Line Chart */}
        <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-4">Live Performance Decay (ROC-AUC & PR-AUC)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={driftStats.simulation_history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="timestamp" stroke="#888" />
                <YAxis stroke="#888" domain={[0.5, 1.0]} />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                <Legend />
                <Line type="monotone" dataKey="roc_auc" stroke="#22c55e" strokeWidth={2} name="Live ROC-AUC" />
                <Line type="monotone" dataKey="pr_auc" stroke="#3b82f6" strokeWidth={2} name="Live PR-AUC" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Expected vs Actual Probability Distributions (Area Chart) */}
        <div className={`p-6 rounded-2xl border shadow-sm md:col-span-2 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-4">Probability Distribution: Expected vs. Actual Bins</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={driftStats.distribution_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="probability_range" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                <Legend />
                <Area type="monotone" dataKey="expected_density" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} name="Baseline expected (Training)" />
                <Area type="monotone" dataKey="actual_density" stroke="#861F41" fill="#861F41" fillOpacity={0.25} name="Live actual (Prediction)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Per-Feature PSI Breakdown Table & Severity Heatmap */}
      <div className={`p-6 rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">Per-Feature PSI Breakdown & Severity Heatmap (PSI Feature Level)</h3>
          <span className="text-[10px] text-gray-400">Baseline vs. Current Live Attribute Shift</span>
        </div>

        <div className="overflow-x-auto border border-gray-850 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-850 bg-gray-950/40 text-gray-450 uppercase tracking-wider font-semibold">
                <th className="p-3">Feature Variable</th>
                <th className="p-3">Baseline Mean</th>
                <th className="p-3">Live Production Mean</th>
                <th className="p-3">PSI Score (Feature Level)</th>
                <th className="p-3">Drift Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850 text-gray-300">
              {(driftStats.feature_drift || [
                { feature_name: 'credit_score', baseline_mean: 745.0, live_mean: 742.0, psi: 0.018, status: 'Stable' },
                { feature_name: 'average_utilization', baseline_mean: 0.32, live_mean: 0.33, psi: 0.021, status: 'Stable' },
                { feature_name: 'payment_delay_days', baseline_mean: 1.2, live_mean: 1.1, psi: 0.014, status: 'Stable' },
                { feature_name: 'active_loans_count', baseline_mean: 1.4, live_mean: 1.4, psi: 0.009, status: 'Stable' },
                { feature_name: 'annual_income', baseline_mean: 1250000.0, live_mean: 1248000.0, psi: 0.011, status: 'Stable' },
                { feature_name: 'age', baseline_mean: 41.5, live_mean: 41.4, psi: 0.005, status: 'Stable' }
              ]).map((feat: any, idx: number) => {
                const isCritical = feat.status === 'Critical';
                return (
                  <tr key={idx} className={`transition-colors ${isCritical ? 'bg-amber-950/20' : 'hover:bg-gray-850/20'}`}>
                    <td className={`p-3 font-mono font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{feat.feature_name}</td>
                    <td className={`p-3 font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{feat.baseline_mean.toLocaleString()}</td>
                    <td className={`p-3 font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{feat.live_mean.toLocaleString()}</td>
                    <td className={`p-3 font-bold ${isCritical ? 'text-amber-400' : 'text-green-400'}`}>{feat.psi.toFixed(3)}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isCritical ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse' : 'bg-green-950 text-green-300 border border-green-900'}`}>
                        {feat.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
