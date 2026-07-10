import { useAppContext, API_BASE_URL } from '../context/AppContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Cpu, AlertTriangle, Play, RotateCcw } from 'lucide-react';

export default function DriftPerformance() {
  const {
    isDarkMode,
    driftStats,
    setDriftStats,
    apiFetch
  } = useAppContext();

  const handleSimulationStep = async (action: 'inject_drift' | 'reset_drift') => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/monitoring/simulate?action=${action}`, { method: 'POST' });
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
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play size={14} /> Inject Covariate Drift
          </button>
          <button
            onClick={() => handleSimulationStep('reset_drift')}
            disabled={!driftStats.drift_active}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-axis-burgundy hover:bg-axis-burgundy-hover text-white font-semibold text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw size={14} /> Reset System State
          </button>
        </div>
      </div>

      {/* Drift warning banner */}
      {driftStats.drift_active && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-950 flex items-center gap-3 text-amber-300">
          <AlertTriangle className="animate-bounce" />
          <div>
            <p className="font-bold text-sm">Covariate Drift Detected!</p>
            <p className="text-xs opacity-90">The population stability index (PSI) for the active model has crossed the threshold of 0.25, indicating a shift in customer credit attributes.</p>
          </div>
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
                {/* Reference threshold line at 0.25 */}
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
    </div>
  );
}
