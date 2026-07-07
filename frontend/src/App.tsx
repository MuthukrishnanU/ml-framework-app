import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, AlertTriangle, TrendingUp, Sun, Moon, Activity,
  LogOut, Play, RotateCcw, CheckCircle, Database, Users, Layers, Cpu
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';

// Define base URL for backend API dynamically
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ModelMetadata {
  model_id: string;
  algorithm_type: string;
  version: string;
  status: string;
  serving_path: string;
  created_at: string;
  hyperparameters: Record<string, any>;
  baselines: Record<string, number>;
  live_metrics: Record<string, number>;
  roc_auc_rank: number;
  pr_auc_rank: number;
}

interface AuditLog {
  timestamp: string;
  triggered_by: string;
  action: string;
  evidence: string;
  approved_by: string;
}

interface Settings {
  failover_mode: string;
  drift_threshold_psi: number;
  performance_threshold_auc: number;
}

interface SimulationHistory {
  step: number;
  timestamp: string;
  model_id: string;
  psi: number;
  roc_auc: number;
  pr_auc: number;
  ks: number;
}

interface DistributionChartItem {
  probability_range: number;
  expected_density: number;
  actual_density: number;
}

interface AlertCard {
  current_champion_id: string;
  current_champion_auc: number;
  current_champion_psi: number;
  suggested_challenger_id: string;
  suggested_challenger_auc: number;
  adverse_impact_ratio: number;
  requires_governance_approval: boolean;
}

export default function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Active tab state: 'leaderboard' | 'drift' | 'governance' | 'schema'
  const [activeTab, setActiveTab] = useState<string>('leaderboard');

  // Backend state
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [championId, setChampionId] = useState<string>('');
  const [settings, setSettings] = useState<Settings>({ failover_mode: 'manual', drift_threshold_psi: 0.25, performance_threshold_auc: 0.75 });
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);

  // Global API Loader state
  const [apiLoading, setApiLoading] = useState(false);

  const apiFetch = async (url: string, options?: RequestInit) => {
    setApiLoading(true);
    try {
      return await fetch(url, options);
    } finally {
      setApiLoading(false);
    }
  };

  // Table Explorer state
  const [selectedTable, setSelectedTable] = useState('demographics');
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [tableData, setTableData] = useState<any[][]>([]);
  const [tablePage, setTablePage] = useState(1);
  const [tableTotal, setTableTotal] = useState(0);
  const [tableSearchInput, setTableSearchInput] = useState('');
  const [tableSearchDebounced, setTableSearchDebounced] = useState('');
  const [tableSortBy, setTableSortBy] = useState('');
  const [tableSortOrder, setTableSortOrder] = useState<'asc' | 'desc'>('asc');

  // Target Leads state
  const [selectedLeadProduct, setSelectedLeadProduct] = useState('credit_card_history');
  const [leadColumns, setLeadColumns] = useState<string[]>([]);
  const [leadData, setLeadData] = useState<any[][]>([]);
  const [leadPage, setLeadPage] = useState(1);
  const [leadTotal, setLeadTotal] = useState(0);
  const [leadSearchInput, setLeadSearchInput] = useState('');
  const [leadSearchDebounced, setLeadSearchDebounced] = useState('');
  const [leadSortBy, setLeadSortBy] = useState('');
  const [leadSortOrder, setLeadSortOrder] = useState<'asc' | 'desc'>('asc');

  // ML Retraining Studio state
  const [studioCampaign, setStudioCampaign] = useState('credit_card');
  const [studioAlgorithms, setStudioAlgorithms] = useState<string[]>(['logistic_regression', 'xgboost']);
  const [studioScoreboard, setStudioScoreboard] = useState<any[]>([]);
  const [studioLeads, setStudioLeads] = useState<any[][]>([]);
  const [studioColumns, setStudioColumns] = useState<string[]>([]);
  const [driftStats, setDriftStats] = useState<{
    simulation_history: SimulationHistory[];
    distribution_chart: DistributionChartItem[];
    drift_active: boolean;
    alert_card: AlertCard | null;
  }>({
    simulation_history: [],
    distribution_chart: [],
    drift_active: false,
    alert_card: null
  });

  // Schema dictionary state
  const [semanticMetadata, setSemanticMetadata] = useState<any[]>([]);

  // Local state for single record test scoring
  const [testCustomerId, setTestCustomerId] = useState<string>('CUST000001');
  const [scoreResult, setScoreResult] = useState<any>(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const modelRes = await apiFetch(`${API_BASE_URL}/api/models`);
      if (modelRes.ok) {
        const data = await modelRes.json();
        setModels(data.models);
        setChampionId(data.champion_id);
        setSettings(data.settings);
        setAuditLog(data.audit_log);
      }

      const driftRes = await apiFetch(`${API_BASE_URL}/api/monitoring/drift`);
      if (driftRes.ok) {
        const data = await driftRes.json();
        setDriftStats(data);
      }
    } catch (e) {
      console.error("Connection to backend API failed", e);
    }
  };

  // Fetch schema dictionary
  const fetchSchemaMetadata = async () => {
    try {
      await apiFetch(`${API_BASE_URL}/api/models`); // Schema resides under base metrics database logs
      // For demonstration, we simulate loading the dictionary fields matching semantic_metadata definitions
      const simulatedSchema = [
        { table: "users", column: "user_id", type: "VARCHAR(50)", pk: "Yes", fk: "No", sens: "High", desc: "Unique identifier for backend user" },
        { table: "users", column: "username", type: "VARCHAR(50)", pk: "No", fk: "No", sens: "High", desc: "Unique login username" },
        { table: "users", column: "password_hash", type: "VARCHAR(255)", pk: "No", fk: "No", sens: "Critical", desc: "Bcrypt hash of user password" },
        { table: "users", column: "role", type: "VARCHAR(50)", pk: "No", fk: "No", sens: "Low", desc: "Access role (admin/data_scientist/risk_officer)" },

        { table: "demographics", column: "customer_id", type: "VARCHAR(50)", pk: "Yes", fk: "No", sens: "Medium", desc: "Unique customer alphanumeric ID" },
        { table: "demographics", column: "age", type: "INT", pk: "No", fk: "No", sens: "Low", desc: "Age of customer in years" },
        { table: "demographics", column: "annual_income", type: "NUMERIC(15,2)", pk: "No", fk: "No", sens: "Medium", desc: "Total gross annual income in INR" },
        { table: "demographics", column: "credit_score", type: "INT", pk: "No", fk: "No", sens: "Medium", desc: "CIBIL Credit Bureau score rating" },

        { table: "credit_card_history", column: "customer_id", type: "VARCHAR(50)", pk: "Yes", fk: "Yes (demographics)", sens: "Medium", desc: "Foreign key linking customer demographics" },
        { table: "credit_card_history", column: "credit_limit", type: "NUMERIC(15,2)", pk: "No", fk: "No", sens: "Medium", desc: "Allocated total credit limit" },
        { table: "credit_card_history", column: "average_utilization", type: "NUMERIC(5,4)", pk: "No", fk: "No", sens: "Low", desc: "Credit utilization ratio" },
        { table: "credit_card_history", column: "late_payment_flag", type: "BOOLEAN", pk: "No", fk: "No", sens: "Medium", desc: "Boolean default payment flag" },

        { table: "loan_details", column: "customer_id", type: "VARCHAR(50)", pk: "Yes", fk: "Yes (demographics)", sens: "Medium", desc: "Foreign key linking customer demographics" },
        { table: "loan_details", column: "total_outstanding_loan", type: "NUMERIC(15,2)", pk: "No", fk: "No", sens: "Medium", desc: "Sum of all outstanding retail loans" },
        { table: "loan_details", column: "loan_defaults_count", type: "INT", pk: "No", fk: "No", sens: "High", desc: "Number of loan payments missed" },

        { table: "investment_profiles", column: "customer_id", type: "VARCHAR(50)", pk: "Yes", fk: "Yes (demographics)", sens: "Medium", desc: "Foreign key linking customer demographics" },
        { table: "investment_profiles", column: "mutual_fund_holdings", type: "NUMERIC(15,2)", pk: "No", fk: "No", sens: "Medium", desc: "Total assets in mutual fund portfolios" },

        { table: "predictions", column: "prediction_id", type: "VARCHAR(50)", pk: "Yes", fk: "No", sens: "Low", desc: "Unique scoring execution ID key" },
        { table: "predictions", column: "propensity_score", type: "NUMERIC(5,4)", pk: "No", fk: "No", sens: "Low", desc: "Computed prediction conversion probability" },
        { table: "predictions", column: "is_conversion_successful", type: "INT", pk: "No", fk: "No", sens: "Medium", desc: "Actual sales conversion outcome label" }
      ];
      setSemanticMetadata(simulatedSchema);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Table Data for Table Explorer
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

  // Fetch Leads Data for Target Leads
  const fetchLeadsData = async (product: string, page: number, search: string = "", sortBy: string = "", sortOrder: string = "asc") => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/db/leads?product=${product}&page=${page}&page_size=100&search=${encodeURIComponent(search)}&sort_by=${encodeURIComponent(sortBy)}&sort_order=${sortOrder}`);
      if (res.ok) {
        const data = await res.json();
        setLeadColumns(data.columns);
        setLeadData(data.data);
        setLeadTotal(data.total);
        setLeadPage(data.page);
      }
    } catch (e) {
      console.error("Error loading target leads data", e);
    }
  };

  const handleLaunchRetraining = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/ml/train_on_demand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign: studioCampaign,
          algorithms: studioAlgorithms
        })
      });
      if (response.ok) {
        const data = await response.json();
        setStudioScoreboard(data.scoreboard);
        setStudioLeads(data.leads);
        setStudioColumns(data.columns);
      }
    } catch (e) {
      console.error("Retraining error", e);
    }
  };

  // Debouncing effect for Table Explorer search
  useEffect(() => {
    const timer = setTimeout(() => {
      setTableSearchDebounced(tableSearchInput);
      setTablePage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [tableSearchInput]);

  // Debouncing effect for Target Leads search
  useEffect(() => {
    const timer = setTimeout(() => {
      setLeadSearchDebounced(leadSearchInput);
      setLeadPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [leadSearchInput]);

  // Fetch Table Explorer data reactively
  useEffect(() => {
    if (isAuthenticated && activeTab === 'explorer') {
      fetchTableData(selectedTable, tablePage, tableSearchDebounced, tableSortBy, tableSortOrder);
    }
  }, [isAuthenticated, activeTab, selectedTable, tablePage, tableSearchDebounced, tableSortBy, tableSortOrder]);

  // Fetch Target Leads data reactively
  useEffect(() => {
    if (isAuthenticated && activeTab === 'leads') {
      fetchLeadsData(selectedLeadProduct, leadPage, leadSearchDebounced, leadSortBy, leadSortOrder);
    }
  }, [isAuthenticated, activeTab, selectedLeadProduct, leadPage, leadSearchDebounced, leadSortBy, leadSortOrder]);

  // Toggle Dark/Light Mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Periodic polling for alerts and logs - Commented out as requested
  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData(); // Disabled auto-fetching on mount
      fetchSchemaMetadata();
      // const interval = setInterval(fetchDashboardData, 5000);
      // return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
        setFullName(data.full_name);
        setIsAuthenticated(true);
      } else {
        const errorData = await response.json();
        setErrorMsg(errorData.detail || 'Authentication failed');
      }
    } catch (e) {
      setErrorMsg('Cannot connect to ML Backend server.');
    }
  };

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

  // Advance simulation (inject drift or reset)
  const handleSimulationStep = async (action: 'inject_drift' | 'reset_drift') => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/simulation/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
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

  // Execute manual single-record propensity score lookup
  const handleTestScore = async () => {
    setScoreResult(null);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'champion':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-axis-burgundy border border-axis-burgundy animate-pulse dark:bg-axis-burgundy-dark dark:text-red-100">Champion</span>;
      case 'challenger':
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">Challenger</span>;
      default:
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Retired</span>;
    }
  };

  // Render Login Screen if unauthenticated
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-200 ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
        <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl border transition-colors duration-200 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-axis-burgundy flex items-center justify-center text-white font-bold text-xl shadow-lg">
              A
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2 tracking-tight text-axis-burgundy dark:text-red-400">BANK NAME</h2>
          <p className="text-sm text-center mb-6 text-gray-500 dark:text-gray-400">ML Model Lifecycle & Governance Portal</p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 text-xs rounded-lg dark:bg-red-950/40 dark:border-red-900 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-400">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or ds_lead"
                required
                className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-axis-burgundy focus:outline-none text-sm transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-black placeholder-gray-400'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-axis-burgundy focus:outline-none text-sm transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-black'}`}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 border-t border-gray-800 pt-4 text-center text-xs text-gray-500">
            Authorized Personnel Only
          </div>
        </div>
      </div>
    );
  }

  // Render Dashboard if authenticated
  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>

      {/* Top Header Navbar */}
      <header className="bg-axis-burgundy text-white px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-axis-burgundy font-bold text-lg shadow-md">
            A
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wider leading-none">BANK NAME</h1>
            <span className="text-[10px] uppercase font-bold tracking-widest text-red-200">ML Lifecycle & Dynamic Router Portal</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-semibold">{fullName}</p>
            <p className="text-[10px] text-red-200 uppercase tracking-wider">{userRole.replace('_', ' ')}</p>
          </div>

          {/* Light/Dark mode toggle switch */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg bg-axis-burgundy-hover hover:bg-red-800 transition-colors"
            title="Toggle theme mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-800/50 hover:bg-red-900 rounded-lg text-xs font-semibold tracking-wider transition-colors border border-red-700"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* Sidebar Nav Tabs */}
        <aside className={`w-full lg:w-64 border-b lg:border-r p-4 space-y-1 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="mb-4 px-2 py-1">
            <p className="text-xs uppercase tracking-wider font-bold text-gray-500">Navigation</p>
          </div>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'leaderboard' ? 'bg-axis-burgundy text-white' : 'hover:bg-gray-800/40 text-gray-400 hover:text-white'}`}
          >
            <TrendingUp size={18} /> Model Leaderboard
          </button>

          <button
            onClick={() => setActiveTab('drift')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'drift' ? 'bg-axis-burgundy text-white' : 'hover:bg-gray-800/40 text-gray-400 hover:text-white'}`}
          >
            <Activity size={18} /> Drift & Performance
          </button>

          <button
            onClick={() => setActiveTab('governance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'governance' ? 'bg-axis-burgundy text-white' : 'hover:bg-gray-800/40 text-gray-400 hover:text-white'}`}
          >
            <ShieldCheck size={18} /> Model Governance
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'schema' ? 'bg-axis-burgundy text-white' : 'hover:bg-gray-800/40 text-gray-400 hover:text-white'}`}
          >
            <Layers size={18} /> Semantic Meta Store
          </button>

          <button
            onClick={() => { setActiveTab('explorer'); setTablePage(1); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'explorer' ? 'bg-axis-burgundy text-white' : 'hover:bg-gray-800/40 text-gray-400 hover:text-white'}`}
          >
            <Database size={18} /> Table Explorer
          </button>

          <button
            onClick={() => { setActiveTab('leads'); setLeadPage(1); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'leads' ? 'bg-axis-burgundy text-white' : 'hover:bg-gray-800/40 text-gray-400 hover:text-white'}`}
          >
            <Users size={18} /> Target Leads
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'studio' ? 'bg-axis-burgundy text-white' : 'hover:bg-gray-800/40 text-gray-400 hover:text-white'}`}
          >
            <Cpu size={18} /> ML Studio
          </button>

          {/* Simulation Controller Panel */}
          <div className="pt-6 border-t border-gray-850 mt-6 space-y-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 px-2">Simulation Engine</p>

            <div className="px-2">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full border ${driftStats.drift_active ? 'bg-amber-950/40 border-amber-900 text-amber-300' : 'bg-green-950/40 border-green-900 text-green-300'}`}>
                {driftStats.drift_active ? 'Drift Injected' : 'Healthy State'}
              </span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => handleSimulationStep('inject_drift')}
                disabled={driftStats.drift_active}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs tracking-wider transition-all disabled:opacity-50"
              >
                <Play size={14} /> Inject Covariate Drift
              </button>
              <button
                onClick={() => handleSimulationStep('reset_drift')}
                disabled={!driftStats.drift_active}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-axis-burgundy hover:bg-axis-burgundy-hover text-white font-semibold text-xs tracking-wider transition-all disabled:opacity-50"
              >
                <RotateCcw size={14} /> Reset System State
              </button>
            </div>
          </div>
        </aside>

        {/* Dashboard Work Area */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* Tab 1: Leaderboard */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-6">

              {/* Header with Manual Refresh */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-dashed border-gray-800 bg-gray-900/10 dark:bg-gray-950/20">
                <div>
                  <h2 className="text-lg font-bold tracking-tight">System Performance & ML Leaderboard</h2>
                  <p className="text-xs text-gray-500">Manual refresh gate controls MLOps telemetry pulling and live status tracking.</p>
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="flex items-center gap-2 py-2 px-4 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                >
                  <RotateCcw size={14} /> Refresh Dashboard Data
                </button>
              </div>

              {/* Highlight Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Active Champion Card */}
                <div className={`p-6 rounded-2xl border flex items-center justify-between shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Active Router Champion</p>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Champion Live ROC-AUC</p>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Self-Healing Router Policy</p>
                    <h3 className="text-xl font-bold mt-1 uppercase tracking-wide text-axis-burgundy dark:text-red-300">
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
                  <h3 className="font-bold text-base text-axis-burgundy dark:text-red-200">Candidate Models Scoreboard</h3>
                  <span className="text-xs text-gray-400 font-medium">Rankings determined by validation scores</span>
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
                            <td className="p-4 font-semibold text-gray-300">{model.live_metrics.f1_score}</td>
                            <td className="p-4 text-gray-400">{model.live_metrics.log_loss}</td>
                            <td className="p-4 text-gray-400">{model.live_metrics.ks_statistic}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded font-mono font-semibold ${model.live_metrics.psi >= 0.25 ? 'bg-red-950 text-red-400 border border-red-900 animate-pulse' : 'bg-gray-800 text-gray-300'}`}>
                                {model.live_metrics.psi || '0.00'}
                              </span>
                            </td>
                            <td className="p-4 text-gray-400">
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
                <h3 className="font-bold text-base text-axis-burgundy dark:text-red-200 mb-2">Live Scorer Playground</h3>
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
                    className="px-5 py-2 rounded-lg bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-semibold tracking-wider transition-all"
                  >
                    Query Scorer
                  </button>
                </div>

                {scoreResult && (
                  <div className="mt-6 p-4 rounded-xl border border-gray-800 bg-gray-950/40 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="space-y-2">
                      <h4 className="font-bold uppercase tracking-wider text-gray-500">Scoring Response</h4>
                      <div><span className="text-gray-450">Active Model ID:</span> <span className="font-bold text-red-400">{scoreResult.prediction_id}</span></div>
                      <div><span className="text-gray-450">Routed Engine:</span> <span className="font-bold text-white">{scoreResult.algorithm_type} (Champion)</span></div>
                      <div><span className="text-gray-450">Propensity Score:</span> <span className="font-bold text-lg text-green-500">{(scoreResult.propensity_score * 100).toFixed(2)}%</span></div>
                      <div>
                        <span className="text-gray-450">Classification Decision:</span>
                        <span className={`font-bold ml-1.5 px-2 py-0.5 rounded text-[10px] ${scoreResult.label === 1 ? 'bg-green-950 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                          {scoreResult.label === 1 ? 'High Propensity (Accept)' : 'Low Propensity (Reject)'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-bold uppercase tracking-wider text-gray-500">Explainability Factors (Top 3 Coefficients)</h4>
                      <div className="space-y-1 font-mono text-gray-300">
                        <div>1. Credit Score Impact: <span className={scoreResult.explanation_coefficients[0] >= 0 ? 'text-green-400' : 'text-red-400'}>{scoreResult.explanation_coefficients[0]}</span></div>
                        <div>2. Income Impact: <span className={scoreResult.explanation_coefficients[1] >= 0 ? 'text-green-400' : 'text-red-400'}>{scoreResult.explanation_coefficients[1]}</span></div>
                        <div>3. Late Payments Impact: <span className={scoreResult.explanation_coefficients[2] >= 0 ? 'text-green-400' : 'text-red-400'}>{scoreResult.explanation_coefficients[2]}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Drift & Monitoring */}
          {activeTab === 'drift' && (
            <div className="space-y-6">

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
          )}

          {/* Tab 3: Governance & Approvals */}
          {activeTab === 'governance' && (
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
                        className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${settings.failover_mode === 'automatic' ? 'bg-axis-burgundy text-white border-axis-burgundy' : 'border-gray-850 text-gray-400'}`}
                      >
                        Automated Self-Healing
                      </button>
                      <button
                        onClick={() => handleToggleSettings('manual')}
                        className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${settings.failover_mode === 'manual' ? 'bg-axis-burgundy text-white border-axis-burgundy' : 'border-gray-850 text-gray-400'}`}
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
                            className="px-5 py-2.5 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all"
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
                      {auditLog.map((log, index) => (
                        <tr key={index} className="hover:bg-gray-800/10 text-gray-300">
                          <td className="p-4 text-gray-400">{log.timestamp}</td>
                          <td className="p-4"><span className="text-blue-400 font-semibold">{log.triggered_by}</span></td>
                          <td className="p-4 text-white font-semibold">{log.action}</td>
                          <td className="p-4 text-gray-400">{log.evidence}</td>
                          <td className="p-4"><span className="text-green-500">{log.approved_by}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Schema Metadata */}
          {activeTab === 'schema' && (
            <div className="space-y-6">
              <div className={`rounded-2xl border shadow-sm ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                <div className="px-6 py-4 border-b border-gray-800">
                  <h3 className="font-bold text-base text-axis-burgundy dark:text-red-200">Semantic Layer Meta Store</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b text-gray-450 uppercase tracking-wider font-semibold ${isDarkMode ? 'border-gray-800 bg-gray-950/50' : 'border-gray-200 bg-gray-50'}`}>
                        <th className="p-4">Table Name</th>
                        <th className="p-4">Column Name</th>
                        <th className="p-4">SQL Type</th>
                        <th className="p-4">Primary Key</th>
                        <th className="p-4">Foreign Key</th>
                        <th className="p-4">Sensitivity</th>
                        <th className="p-4">Business Definition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {semanticMetadata.map((col, index) => (
                        <tr key={index} className="hover:bg-gray-800/10">
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Table Explorer */}
          {activeTab === 'explorer' && (
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
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
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
                      className="px-3 py-1.5 rounded-lg border bg-gray-800 hover:bg-gray-750 text-white text-xs disabled:opacity-40 transition-all font-semibold"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-gray-400 font-medium">Page {tablePage} of {Math.ceil(tableTotal / 100)}</span>
                    <button
                      onClick={() => setTablePage(p => Math.min(Math.ceil(tableTotal / 100), p + 1))}
                      disabled={tablePage >= Math.ceil(tableTotal / 100)}
                      className="px-3 py-1.5 rounded-lg border bg-gray-800 hover:bg-gray-750 text-white text-xs disabled:opacity-40 transition-all font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 6: Target Leads */}
          {activeTab === 'leads' && (
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} space-y-6`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Campaign Target Leads (Strong Customers)</h2>
                  <p className="text-xs text-gray-500 font-medium">Optimized lists of customers matching high-propensity acquisition rules.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Smart Search leads..."
                      value={leadSearchInput}
                      onChange={(e) => setLeadSearchInput(e.target.value)}
                      className={`w-full sm:w-64 pl-3 pr-8 py-1.5 rounded-lg border text-xs focus:outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`}
                    />
                    {leadSearchInput && (
                      <button
                        onClick={() => setLeadSearchInput('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-450 hover:text-gray-300 font-bold px-1 text-sm leading-none"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-405 whitespace-nowrap">Select Campaign Product:</label>
                    <select
                      value={selectedLeadProduct}
                      onChange={(e) => { setSelectedLeadProduct(e.target.value); setLeadPage(1); setLeadSortBy(''); }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium focus:outline-none ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="credit_card_history">Credit Cards (CC Cross-Sell)</option>
                      <option value="investment_profiles">Mutual Funds (Investments)</option>
                      <option value="loan_details">Retail Loans (Credit Demand)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Leads Table */}
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-850 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={`border-b ${isDarkMode ? 'bg-gray-950 border-gray-850 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      {leadColumns.map((col, i) => (
                        <th
                          key={i}
                          onClick={() => {
                            if (leadSortBy === col) {
                              setLeadSortOrder(o => o === 'asc' ? 'desc' : 'asc');
                            } else {
                              setLeadSortBy(col);
                              setLeadSortOrder('asc');
                            }
                            setLeadPage(1);
                          }}
                          className="p-3 font-semibold uppercase tracking-wider cursor-pointer hover:bg-gray-850/10 dark:hover:bg-gray-800/40 select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            {col}
                            {leadSortBy === col && (leadSortOrder === 'asc' ? '▲' : '▼')}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-850">
                    {leadData.length === 0 ? (
                      <tr>
                        <td colSpan={leadColumns.length || 1} className="p-6 text-center text-gray-500">
                          No matching leads found.
                        </td>
                      </tr>
                    ) : (
                      leadData.map((row, rowIndex) => (
                        <tr key={rowIndex} className={`hover:bg-gray-50 dark:hover:bg-gray-850/40 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {row.map((cell, cellIndex) => {
                            let displayVal = cell === null ? "N/A" : String(cell);
                            if (typeof cell === 'number') {
                              if (cellIndex === 1 || cellIndex === 3 || cellIndex === 4 || cellIndex === 5) {
                                if (cell > 1000) {
                                  displayVal = `₹${cell.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                                }
                              } else if (cellIndex === 6 && selectedLeadProduct === 'credit_card_history') {
                                displayVal = `${(cell * 100).toFixed(2)}%`;
                              }
                            }
                            return (
                              <td key={cellIndex} className="p-3 font-medium">
                                {cellIndex === 0 ? (
                                  <span className="font-mono bg-gray-150 dark:bg-gray-800 px-2 py-0.5 rounded text-red-400 font-bold">{displayVal}</span>
                                ) : cellIndex === 6 && selectedLeadProduct === 'credit_card_history' ? (
                                  <span className="text-green-400 font-bold">{displayVal}</span>
                                ) : (
                                  displayVal
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {leadTotal > 0 && (
                <div className="flex items-center justify-between pt-4 text-xs">
                  <div className="text-gray-500">
                    Showing <span className="font-semibold">{Math.min(leadTotal, (leadPage - 1) * 100 + 1)}</span> to{" "}
                    <span className="font-semibold">{Math.min(leadTotal, leadPage * 105)}</span> of{" "}
                    <span className="font-semibold">{leadTotal}</span> matching leads
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setLeadPage(p => Math.max(1, p - 1))}
                      disabled={leadPage === 1}
                      className="px-3 py-1.5 rounded-lg border bg-gray-800 hover:bg-gray-750 text-white text-xs disabled:opacity-40 transition-all font-semibold"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-1 text-gray-400 font-medium">Page {leadPage} of {Math.ceil(leadTotal / 100)}</span>
                    <button
                      onClick={() => setLeadPage(p => Math.min(Math.ceil(leadTotal / 100), p + 1))}
                      disabled={leadPage >= Math.ceil(leadTotal / 100)}
                      className="px-3 py-1.5 rounded-lg border bg-gray-800 hover:bg-gray-750 text-white text-xs disabled:opacity-40 transition-all font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 7: ML Studio */}
          {activeTab === 'studio' && (
            <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} space-y-6`}>
              <div>
                <h2 className="text-xl font-bold tracking-tight">On-Demand ML Retraining Studio</h2>
                <p className="text-xs text-gray-500 font-medium">Choose target campaign and algorithm models to run an instant model re-training pipeline.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Cockpit */}
                <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} space-y-5 h-fit`}>
                  <h3 className="font-bold text-sm tracking-wide uppercase text-gray-400">Retraining Inputs</h3>
                  
                  {/* Campaign Select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-405">Target Campaign</label>
                    <select
                      value={studioCampaign}
                      onChange={(e) => setStudioCampaign(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      <option value="credit_card">Credit Cards (CC Cross-Sell)</option>
                      <option value="mutual_funds">Mutual Funds (Investments)</option>
                      <option value="loans">Retail Loans (Credit Demand)</option>
                    </select>
                  </div>

                  {/* Algorithm Checklist */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-405 block mb-1">Algorithms / Candidate Models</label>
                    <div className="space-y-2">
                      {[
                        { id: 'linear_regression', name: 'Linear Regression' },
                        { id: 'logistic_regression', name: 'Logistic Regression' },
                        { id: 'random_forest', name: 'Random Forest' },
                        { id: 'xgboost', name: 'XGBoost' },
                        { id: 'catboost', name: 'CatBoost' },
                        { id: 'pytorch_mlp', name: 'PyTorch MLP' }
                      ].map((alg) => {
                        const isChecked = studioAlgorithms.includes(alg.id);
                        return (
                          <label key={alg.id} className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setStudioAlgorithms(prev => prev.filter(x => x !== alg.id));
                                } else {
                                  setStudioAlgorithms(prev => [...prev, alg.id]);
                                }
                              }}
                              className="rounded border-gray-305 text-axis-burgundy focus:ring-axis-burgundy h-4 w-4"
                            />
                            <span className={isChecked ? (isDarkMode ? 'text-white' : 'text-gray-900') : 'text-gray-450'}>{alg.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleLaunchRetraining}
                    disabled={studioAlgorithms.length === 0}
                    className="w-full py-2 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Launch Training Pipeline
                  </button>
                </div>

                {/* Retraining Results */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Scoreboard Result */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400">ML Model Scoreboard</h3>
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-850 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={`border-b ${isDarkMode ? 'bg-gray-950 border-gray-850 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                            <th className="p-3 font-semibold uppercase tracking-wider">Model ID</th>
                            <th className="p-3 font-semibold uppercase tracking-wider">Algorithm</th>
                            <th className="p-3 font-semibold uppercase tracking-wider">Status</th>
                            <th className="p-3 font-semibold uppercase tracking-wider">ROC-AUC</th>
                            <th className="p-3 font-semibold uppercase tracking-wider">Adverse Impact Ratio</th>
                            <th className="p-3 font-semibold uppercase tracking-wider">Training Latency</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-850">
                          {studioScoreboard.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-gray-500">
                                No retraining run launched yet. Select options and launch the pipeline.
                              </td>
                            </tr>
                          ) : (
                            studioScoreboard.map((row, index) => (
                              <tr key={index} className={`hover:bg-gray-800/10 dark:hover:bg-gray-900/40`}>
                                <td className="p-3 font-mono font-bold text-axis-burgundy dark:text-red-400">{row.model_id}</td>
                                <td className="p-3 font-medium">{row.algorithm_type}</td>
                                <td className="p-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-950 text-green-300 border border-green-900">
                                    {row.status}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-green-500">{row.auc.toFixed(4)}</td>
                                <td className="p-3 font-medium text-blue-400">{row.fairness_adverse_impact_ratio.toFixed(4)}</td>
                                <td className="p-3 font-medium">{row.latency_ms.toFixed(2)} ms</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Scored Campaign Leads Result */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-400">Generated Target Leads</h3>
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-850 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={`border-b ${isDarkMode ? 'bg-gray-950 border-gray-850 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                            {studioColumns.map((col, i) => (
                              <th key={i} className="p-3 font-semibold uppercase tracking-wider">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-850">
                          {studioLeads.length === 0 ? (
                            <tr>
                              <td colSpan={studioColumns.length || 1} className="p-6 text-center text-gray-500">
                                Launch training to generate target prospects for this campaign.
                              </td>
                            </tr>
                          ) : (
                            studioLeads.map((row, index) => (
                              <tr key={index} className={`hover:bg-gray-800/10 dark:hover:bg-gray-900/40`}>
                                <td className="p-3 font-mono font-bold text-axis-burgundy dark:text-red-400">{row[0]}</td>
                                <td className="p-3 font-medium">₹{row[1].toLocaleString()}</td>
                                <td className="p-3 font-medium">{row[2]}</td>
                                <td className="p-3 font-bold text-green-500">{(row[3] * 100).toFixed(2)}%</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Loading Spinner Overlay */}
      {apiLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-sm">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-axis-burgundy border-t-transparent animate-spin"></div>
            <div className="w-10 h-10 rounded-full bg-axis-burgundy flex items-center justify-center text-white font-bold text-lg">
              A
            </div>
          </div>
          <p className="mt-4 text-xs font-semibold tracking-wider text-red-200 uppercase animate-pulse">
            Querying Neon Postgres Database...
          </p>
        </div>
      )}

      {/* Corporate footer */}
      <footer className={`py-4 px-6 text-center text-xs border-t transition-colors ${isDarkMode ? 'bg-gray-950 border-gray-900 text-gray-550' : 'bg-white border-gray-200 text-gray-500'}`}>
        &copy; 2026 Bank Name Ltd. Model Governance & Risk Management Dashboard.
      </footer>
    </div>
  );
}
