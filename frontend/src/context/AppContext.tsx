import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface ModelMetadata {
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

export interface AuditLog {
  timestamp: string;
  triggered_by: string;
  action: string;
  evidence: string;
  approved_by: string;
}

export interface Settings {
  failover_mode: string;
  drift_threshold_psi: number;
  performance_threshold_auc: number;
}

export interface SimulationHistory {
  step: number;
  timestamp: string;
  model_id: string;
  psi: number;
  roc_auc: number;
  pr_auc: number;
  ks: number;
}

export interface DistributionChartItem {
  probability_range: number;
  expected_density: number;
  actual_density: number;
}

export interface AlertCard {
  current_champion_id: string;
  current_champion_auc: number;
  current_champion_psi: number;
  suggested_challenger_id: string;
  suggested_challenger_auc: number;
  adverse_impact_ratio: number;
  requires_governance_approval: boolean;
}

export interface DriftStats {
  simulation_history: SimulationHistory[];
  distribution_chart: DistributionChartItem[];
  drift_active: boolean;
  alert_card: AlertCard | null;
}

interface AppContextType {
  // Auth state
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  username: string;
  setUsername: (val: string) => void;
  userRole: string;
  setUserRole: (val: string) => void;
  fullName: string;
  setFullName: (val: string) => void;
  
  // Theme state
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  
  // Global API loader
  apiLoading: boolean;
  setApiLoading: (val: boolean) => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  
  // Dashboard data
  models: ModelMetadata[];
  setModels: (models: ModelMetadata[]) => void;
  championId: string;
  setChampionId: (id: string) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  auditLog: AuditLog[];
  setAuditLog: (log: AuditLog[]) => void;
  driftStats: DriftStats;
  setDriftStats: (stats: DriftStats) => void;
  fetchDashboardData: () => Promise<void>;
  
  // Semantic Meta Store
  semanticMetadata: any[];
  setSemanticMetadata: (meta: any[]) => void;
  fetchSemanticMetadata: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('username') || '';
  });
  const [userRole, setUserRole] = useState<string>(() => {
    return localStorage.getItem('userRole') || '';
  });
  const [fullName, setFullName] = useState<string>(() => {
    return localStorage.getItem('fullName') || '';
  });
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [apiLoading, setApiLoading] = useState<boolean>(false);
  
  const [models, setModels] = useState<ModelMetadata[]>([]);
  const [championId, setChampionId] = useState<string>('');
  const [settings, setSettings] = useState<Settings>({
    failover_mode: 'manual',
    drift_threshold_psi: 0.25,
    performance_threshold_auc: 0.75
  });
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [driftStats, setDriftStats] = useState<DriftStats>({
    simulation_history: [],
    distribution_chart: [],
    drift_active: false,
    alert_card: null
  });
  const [semanticMetadata, setSemanticMetadata] = useState<any[]>([]);

  // Token & Authorization header injection fetch helper
  const apiFetch = async (url: string, options?: RequestInit) => {
    setApiLoading(true);
    const headers = new Headers(options?.headers || {});
    if (localStorage.getItem('isAuthenticated') === 'true') {
      headers.set('X-User-Name', localStorage.getItem('username') || 'anonymous');
      headers.set('X-User-Role', localStorage.getItem('userRole') || 'guest');
    }
    try {
      return await fetch(url, { ...options, headers });
    } finally {
      setApiLoading(false);
    }
  };

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

  const fetchSemanticMetadata = async () => {
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/db/semantic_metadata`);
      if (res.ok) {
        const json = await res.json();
        const mappedSchema = json.data.map((col: any) => ({
          table: col.table_name,
          column: col.column_name,
          type: col.data_type,
          pk: col.is_primary_key ? 'Yes' : 'No',
          fk: col.is_foreign_key ? `Yes (${col.referenced_table})` : 'No',
          sens: col.data_sensitivity,
          desc: col.business_definition
        }));
        setSemanticMetadata(mappedSchema);
      }
    } catch (e) {
      console.error("Failed to load schema meta dictionary", e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
      fetchSemanticMetadata();
    }
  }, [isAuthenticated]);

  return (
    <AppContext.Provider value={{
      isAuthenticated, setIsAuthenticated,
      username, setUsername,
      userRole, setUserRole,
      fullName, setFullName,
      isDarkMode, setIsDarkMode,
      apiLoading, setApiLoading, apiFetch,
      models, setModels,
      championId, setChampionId,
      settings, setSettings,
      auditLog, setAuditLog,
      driftStats, setDriftStats, fetchDashboardData,
      semanticMetadata, setSemanticMetadata, fetchSemanticMetadata
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
