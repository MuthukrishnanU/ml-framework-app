import { useState } from 'react';
import { useAppContext, API_BASE_URL } from '../context/AppContext';

export default function AvailableModels() {
  const { isDarkMode, apiFetch } = useAppContext();

  // Local retraining states
  const [studioCampaign, setStudioCampaign] = useState('credit_card');
  const [studioAlgorithms, setStudioAlgorithms] = useState<string[]>(['logistic_regression', 'xgboost']);
  const [studioScoreboard, setStudioScoreboard] = useState<any[]>([]);
  const [studioLeads, setStudioLeads] = useState<any[][]>([]);
  const [studioColumns, setStudioColumns] = useState<string[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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

  return (
    <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} space-y-6`}>
      <div>
        <h2 className="text-xl font-bold tracking-tight">Available Models & Interactive Training</h2>
        <p className="text-xs text-gray-500 font-medium">Configure target business models and model architectures to trigger an on-demand ML training pipeline.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Cockpit */}
        <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} space-y-5 h-fit`}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm tracking-wide uppercase text-gray-405">Model Selector</h3>
            <button
              onClick={() => setShowDetailsModal(true)}
              className="text-xs font-bold text-axis-burgundy dark:text-red-400 hover:underline cursor-pointer bg-transparent border-0"
            >
              Details & Mapping
            </button>
          </div>

          {/* Campaign Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-405">Target ML Model</label>
            <select
              value={studioCampaign}
              onChange={(e) => setStudioCampaign(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-305 text-gray-900'}`}
            >
              <option value="credit_card">Credit Card Propensity Model</option>
              <option value="mutual_funds">Mutual Fund Propensity Model</option>
              <option value="loans">Loans Propensity Model</option>
              <option value="defaulter">Card Payment Defaulter Model</option>
              <option value="investment_aggressiveness">Investment Aggressiveness Model</option>
              <option value="next_best_action">Next Best Action Model (Recommendation System)</option>
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
                      className="rounded border-gray-700 text-axis-burgundy focus:ring-axis-burgundy h-4 w-4"
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
            className="w-full py-2 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Launch Training Pipeline
          </button>
        </div>

        {/* Retraining Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scoreboard Result */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-450">ML Model Scoreboard</h3>
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
                      <tr key={index} className={`hover:bg-gray-800/10 dark:hover:bg-gray-900/40 text-gray-300`}>
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
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-450">Generated Target Leads</h3>
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
                      <tr key={index} className={`hover:bg-gray-800/10 dark:hover:bg-gray-900/40 text-gray-305`}>
                        {row.map((cell, cellIndex) => {
                          let displayVal = cell === null ? "N/A" : String(cell);
                          const isLast = cellIndex === row.length - 1;
                          const isPercentage = cellIndex === 3 || (row.length === 8 && (cellIndex === 4 || cellIndex === 5 || cellIndex === 6));

                          if (typeof cell === 'number') {
                            if (cellIndex === 1) {
                              displayVal = `₹${cell.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
                            } else if (isPercentage) {
                              displayVal = `${(cell * 100).toFixed(2)}%`;
                            }
                          }
                          return (
                            <td key={cellIndex} className="p-3 font-medium">
                              {cellIndex === 0 ? (
                                <span className="font-mono text-axis-burgundy dark:text-red-400 font-bold">{displayVal}</span>
                              ) : isPercentage ? (
                                <span className="text-green-500 font-bold">{displayVal}</span>
                              ) : isLast && row.length === 8 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-axis-burgundy/10 dark:bg-red-950/40 text-axis-burgundy dark:text-red-300 border border-red-900/20">
                                  {displayVal}
                                </span>
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
          </div>
        </div>
      </div>

      {/* Model Mapping Specifications Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/85 backdrop-blur-sm p-4">
          <div className={`relative max-w-4xl w-full rounded-2xl border p-6 shadow-2xl overflow-y-auto max-h-[90vh] ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="flex items-center justify-between border-b pb-3 mb-4 border-gray-705">
              <div>
                <h3 className="text-base font-bold">Model Mapping Specifications</h3>
                <p className="text-xs text-gray-400">Detailed overview of target formulations and datasets for the 6 available ML models.</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-white font-bold text-xs bg-gray-800 hover:bg-gray-750 px-3 py-1.5 rounded-lg transition-all cursor-pointer border-0"
              >
                Close
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b ${isDarkMode ? 'bg-gray-950 border-gray-850 text-gray-405' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                    <th className="p-3 font-semibold uppercase tracking-wider">Model Name</th>
                    <th className="p-3 font-semibold uppercase tracking-wider">Business Goal</th>
                    <th className="p-3 font-semibold uppercase tracking-wider">Target Label (Y)</th>
                    <th className="p-3 font-semibold uppercase tracking-wider">Source Table & Key Features</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  <tr className="hover:bg-gray-800/10">
                    <td className="p-3 font-bold text-axis-burgundy dark:text-red-400">Credit Card Propensity</td>
                    <td className="p-3 font-medium">Predict likely credit card conversion.</td>
                    <td className="p-3 font-mono text-gray-400">is_conversion_successful == 1</td>
                    <td className="p-3 text-gray-450 font-medium">demographics, credit_card_history (annual_income, credit_score, monthly_spend, utilization)</td>
                  </tr>
                  <tr className="hover:bg-gray-800/10">
                    <td className="p-3 font-bold text-axis-burgundy dark:text-red-400">Mutual Fund Propensity</td>
                    <td className="p-3 font-medium">Predict likely mutual fund sign-ups.</td>
                    <td className="p-3 font-mono text-gray-400">monthly_sip_amount &gt; 0</td>
                    <td className="p-3 text-gray-455 font-medium">investment_profiles (fixed_deposit_balance, age, equity_portfolio_value)</td>
                  </tr>
                  <tr className="hover:bg-gray-800/10">
                    <td className="p-3 font-bold text-axis-burgundy dark:text-red-400">Loans Propensity</td>
                    <td className="p-3 font-medium">Predict likely loan application sign-ups.</td>
                    <td className="p-3 font-mono text-gray-400">active_loans_count &gt; 0</td>
                    <td className="p-3 text-gray-455 font-medium">loan_details (credit_score, total_outstanding_loan, monthly_loan_emi)</td>
                  </tr>
                  <tr className="hover:bg-gray-800/10">
                    <td className="p-3 font-bold text-axis-burgundy dark:text-red-400">Card Payment Defaulter</td>
                    <td className="p-3 font-medium">Identify customers likely to miss payments.</td>
                    <td className="p-3 font-mono text-gray-400">late_payment_flag == True</td>
                    <td className="p-3 text-gray-455 font-medium">credit_card_history (payment_delay_days, rewards_points_balance)</td>
                  </tr>
                  <tr className="hover:bg-gray-800/10">
                    <td className="p-3 font-bold text-axis-burgundy dark:text-red-400">Investment Aggressiveness</td>
                    <td className="p-3 font-medium">Predict if customer has aggressive risk appetite.</td>
                    <td className="p-3 font-mono text-gray-400">risk_profile == 'Aggressive'</td>
                    <td className="p-3 text-gray-455 font-medium">investment_profiles (equity_portfolio_value, risk_profile)</td>
                  </tr>
                  <tr className="hover:bg-gray-800/10">
                    <td className="p-3 font-bold text-axis-burgundy dark:text-red-400">Next Best Action</td>
                    <td className="p-3 font-medium">Recommend product with highest conversion score.</td>
                    <td className="p-3 font-mono text-gray-400">is_conversion_successful == 1</td>
                    <td className="p-3 text-gray-455 font-medium">Ensembles credit card, mutual fund, and loans scores.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
