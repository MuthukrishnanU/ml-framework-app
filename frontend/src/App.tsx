import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import ModelLeaderboard from './pages/ModelLeaderboard';
import DriftPerformance from './pages/DriftPerformance';
import ModelGovernance from './pages/ModelGovernance';
import SemanticMetaStore from './pages/SemanticMetaStore';
import TableExplorer from './pages/TableExplorer';
import TargetLeads from './pages/TargetLeads';
import AvailableModels from './pages/AvailableModels';
import MLPipelineStudio from './pages/MLPipelineStudio';
import ObservabilityLogs from './pages/ObservabilityLogs';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppContext();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppContext();
  return isAuthenticated ? <Navigate to="/pipeline-studio" replace /> : <>{children}</>;
}

function AppRoutes() {
  const { isDarkMode, apiLoading } = useAppContext();

  // Handle document theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/pipeline-studio" replace />} />
            <Route path="pipeline-studio" element={<MLPipelineStudio />} />
            <Route path="models" element={<AvailableModels />} />
            <Route path="leaderboard" element={<ModelLeaderboard />} />
            <Route path="drift" element={<DriftPerformance />} />
            <Route path="governance" element={<ModelGovernance />} />
            <Route path="meta-store" element={<SemanticMetaStore />} />
            <Route path="explorer" element={<TableExplorer />} />
            <Route path="leads" element={<TargetLeads />} />
            <Route path="observability" element={<ObservabilityLogs />} />
            <Route path="*" element={<Navigate to="/pipeline-studio" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>

      {/* Global Loading Spinner Overlay */}
      {apiLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-sm">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-axis-burgundy border-t-transparent animate-spin"></div>
          </div>
          <p className="mt-4 text-xs font-semibold tracking-wider text-red-200 uppercase animate-pulse">
            Loading...
          </p>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
