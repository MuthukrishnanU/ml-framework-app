import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  ShieldCheck, TrendingUp, Sun, Moon, Activity,
  LogOut, Database, Users, Layers, Cpu, Eye, Sliders
} from 'lucide-react';

export default function DashboardLayout() {
  const {
    isDarkMode,
    setIsDarkMode,
    fullName,
    userRole,
    setIsAuthenticated,
    setUsername,
    setUserRole,
    setFullName
  } = useAppContext();

  const navigate = useNavigate();

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setUserRole('');
    setFullName('');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    localStorage.removeItem('userRole');
    localStorage.removeItem('fullName');
    navigate('/login');
  };

  const navItems = [
    { path: '/pipeline-studio', label: 'ML Pipeline Studio', icon: Sliders },
    { path: '/models', label: 'Available Models', icon: Cpu },
    { path: '/leaderboard', label: 'Algorithm Leaderboard', icon: TrendingUp },
    { path: '/drift', label: 'Drift & Performance', icon: Activity },
    { path: '/governance', label: 'Algorithm Governance', icon: ShieldCheck },
    { path: '/meta-store', label: 'Semantic Meta Store', icon: Database },
    { path: '/explorer', label: 'Table Explorer', icon: Layers },
    { path: '/leads', label: 'Target Leads', icon: Users },
    { path: '/observability', label: 'Observability Logs', icon: Eye }
  ];

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
          <div className="text-right font-medium">
            <p className="text-sm font-semibold">{fullName}</p>
            <p className="text-[10px] text-red-200 uppercase tracking-wider">{userRole.replace('_', ' ')}</p>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg bg-axis-burgundy-hover hover:bg-red-800 transition-colors cursor-pointer"
            title="Toggle theme mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-800/50 hover:bg-red-900 rounded-lg text-xs font-semibold tracking-wider transition-colors border border-red-700 cursor-pointer"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar Nav Tabs */}
        <aside className={`w-full lg:w-64 border-b lg:border-r p-4 space-y-1 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="mb-4 px-2 py-1">
            <p className="text-xs uppercase tracking-wider font-bold text-gray-500">Navigation</p>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive
                    ? 'bg-axis-burgundy text-white'
                    : `hover:bg-gray-850/40 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`
                  }`
                }
              >
                <Icon size={18} /> {item.label}
              </NavLink>
            );
          })}
        </aside>

        {/* Dynamic page area */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Corporate footer */}
      <footer className={`py-4 px-6 text-center text-xs border-t transition-colors ${isDarkMode ? 'bg-gray-950 border-gray-900 text-gray-550' : 'bg-white border-gray-200 text-gray-550'}`}>
        &copy; 2026 Bank Name Ltd. Model Governance & Risk Management Dashboard.
      </footer>
    </div>
  );
}
