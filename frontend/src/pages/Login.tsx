import React, { useState, useEffect, useRef } from 'react';
import { useAppContext, API_BASE_URL } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';

export default function Login() {
  const {
    apiFetch,
    apiLoading,
    setIsAuthenticated,
    setUsername: setGlobalUsername,
    setUserRole,
    setFullName,
    isDarkMode,
    setIsDarkMode
  } = useAppContext();

  const [username, setLocalUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const userRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (!!userRef && !!userRef.current) && userRef.current.focus();
  }, [])
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
        setGlobalUsername(data.username);
        setIsAuthenticated(true);

        // Persist session in localStorage
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('username', data.username);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('fullName', data.full_name);

        navigate('/leaderboard');
      } else {
        const errorData = await response.json();
        setErrorMsg(errorData.detail || 'Authentication failed');
      }
    } catch (e) {
      setErrorMsg('Cannot connect to ML Backend server.');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center relative transition-colors duration-200 ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>

      {/* Absolute theme toggle button */}
      <div className="absolute top-6 right-6">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-2.5 rounded-lg border transition-all duration-200 cursor-pointer shadow-md ${isDarkMode
            ? 'bg-gray-900 border-gray-800 text-white hover:bg-gray-800'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          title="Toggle theme mode"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

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
              ref={userRef}
              onChange={(e) => setLocalUsername(e.target.value)}
              placeholder="e.g. admin or ds_lead"
              required
              className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-axis-burgundy focus:outline-none text-sm transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-305 text-black placeholder-gray-405'}`}
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
              className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-axis-burgundy focus:outline-none text-sm transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-305 text-black'}`}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 cursor-pointer"
          >
            Sign In
          </button>
        </form>

        {/* <div className="mt-6 border-t border-gray-800 pt-4 text-center text-xs text-gray-500">
          Authorized Personnel Only
        </div> */}
      </div>
      {apiLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-sm">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-axis-burgundy border-t-transparent animate-spin"></div>
            <div className="w-10 h-10 rounded-full bg-axis-burgundy flex items-center justify-center text-white font-bold text-lg">
              A
            </div>
          </div>
          <p className="mt-4 text-xs font-semibold tracking-wider text-red-200 uppercase animate-pulse">
            Authenticating User...
          </p>
        </div>
      )}
    </div>
  );
}
