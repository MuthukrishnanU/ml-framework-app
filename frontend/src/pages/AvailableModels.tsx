import { useState, useEffect } from 'react';
import { useAppContext, API_BASE_URL } from '../context/AppContext';

export default function AvailableModels() {
  const { isDarkMode, models, championId, apiFetch } = useAppContext();

  // Active Catalog Tab
  const [activeCatalogTab, setActiveCatalogTab] = useState<'ml' | 'rule'>('ml');

  // Local retraining states
  const [studioCampaign, setStudioCampaign] = useState('credit_card');
  const [studioAlgorithms, setStudioAlgorithms] = useState<string[]>(['logistic_regression', 'xgboost']);
  const [studioScoreboard, setStudioScoreboard] = useState<any[]>([]);
  const [studioLeads, setStudioLeads] = useState<any[][]>([]);
  const [studioColumns, setStudioColumns] = useState<string[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Rule models state
  const [ruleModelsList, setRuleModelsList] = useState<any[]>([]);

  useEffect(() => {
    fetchRuleModels();
  }, []);

  const fetchRuleModels = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/rules/list`);
      if (response.ok) {
        const res = await response.json();
        setRuleModelsList(res.rule_models || []);
      }
    } catch (e) {
      console.error("Failed to load rule models", e);
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

  return (
    <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} space-y-6`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Available Models & Model Inventory Catalog</h2>
          <p className="text-xs text-gray-500 font-medium">Browse available 10 ML candidate models and 20 monthly Rule-Based model strategies.</p>
        </div>

        <div className="flex bg-gray-950 border border-gray-800 p-1 rounded-lg text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveCatalogTab('ml')}
            className={`px-4 py-2 rounded-md transition-all cursor-pointer ${activeCatalogTab === 'ml' ? 'bg-axis-burgundy text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            ML Models Catalog (10)
          </button>
          <button
            onClick={() => setActiveCatalogTab('rule')}
            className={`px-4 py-2 rounded-md transition-all cursor-pointer ${activeCatalogTab === 'rule' ? 'bg-axis-burgundy text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            Rule Models Catalog (20)
          </button>
        </div>
      </div>

      {activeCatalogTab === 'ml' && (
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
              <label className="text-xs font-semibold text-gray-405">Target Campaign Domain / Business Use Case</label>
              <select
                value={studioCampaign}
                onChange={(e) => setStudioCampaign(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-305 text-gray-900'}`}
              >
                <option value="credit_card">Credit Card Propensity Model Domain</option>
                <option value="mutual_funds">Mutual Fund Propensity Model Domain</option>
                <option value="loans">Loans Propensity Model Domain</option>
                <option value="defaulter">Card Payment Defaulter Model Domain</option>
                <option value="investment_aggressiveness">Investment Aggressiveness Model Domain</option>
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

            {/* Submit Button */}
            <button
              onClick={handleLaunchRetraining}
              disabled={studioAlgorithms.length === 0}
              className="w-full py-2.5 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow cursor-pointer disabled:opacity-40"
            >
              Fit Selected Models & Scale Leads
            </button>
          </div>

          {/* Training Scoreboard and Target Lead Recommendations */}
          <div className="lg:col-span-2 space-y-6">
            {studioScoreboard.length > 0 ? (
              <div className="space-y-6">
                {/* Scoreboard table */}
                <div className="space-y-2">
                  <h3 className="font-bold text-xs uppercase text-gray-405 tracking-wider">Model Training Scoreboard</h3>
                  <div className="overflow-x-auto border border-gray-850 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead className="bg-gray-950 text-gray-400 border-b border-gray-800">
                        <tr>
                          <th className="p-3">Model ID</th>
                          <th className="p-3">Algorithm</th>
                          <th className="p-3">Version</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">ROC-AUC</th>
                          <th className="p-3">Air Ratio</th>
                          <th className="p-3">Latency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850 text-gray-300">
                        {studioScoreboard.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-900/30">
                            <td className="p-3 font-bold text-axis-burgundy dark:text-red-300">{row.model_id}</td>
                            <td className="p-3 text-white">{row.algorithm_type}</td>
                            <td className="p-3 text-gray-400">{row.version}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-green-950 text-green-300 border border-green-900 rounded text-[10px] font-bold">
                                {row.status}
                              </span>
                            </td>
                            <td className="p-3 text-green-400 font-bold">{row.auc}</td>
                            <td className="p-3 text-blue-400">{row.fairness_adverse_impact_ratio}</td>
                            <td className="p-3 text-gray-400">{row.latency_ms} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Target Lead recommendations table */}
                {studioLeads.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-xs uppercase text-gray-405 tracking-wider">Target Campaign Highest Propensity Leads (Top 100)</h3>
                    <div className="overflow-x-auto border border-gray-850 rounded-xl max-h-72">
                      <table className="w-full text-left text-xs border-collapse font-mono">
                        <thead className="bg-gray-950 text-gray-400 border-b border-gray-800 sticky top-0">
                          <tr>
                            {studioColumns.map((col, cIdx) => (
                              <th key={cIdx} className="p-3">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-850 text-gray-600">
                          {studioLeads.map((leadRow, rIdx) => (
                            <tr key={rIdx} className="hover:bg-gray-900/30">
                              {leadRow.map((cell: any, cIdx: number) => (
                                <td key={cIdx} className="p-3">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider">Registered 10 ML Candidate Models Inventory</h3>
                  <span className="text-xs font-mono text-gray-400">Total Models: 10</span>
                </div>

                <div className="overflow-x-auto border border-gray-850 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead className="bg-gray-950 text-gray-400 border-b border-gray-800">
                      <tr>
                        <th className="p-3">Model ID</th>
                        <th className="p-3">Algorithm</th>
                        <th className="p-3">Version</th>
                        <th className="p-3">Serving Mode</th>
                        <th className="p-3">ROC-AUC</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850 text-gray-300">
                      {(models && models.length > 0 ? models : [
                        { model_id: 'xgb_model_v1.0', algorithm_type: 'XGBoost', version: '1.0.0', serving_path: 'Realtime + Batch', baselines: { roc_auc: 0.8420 }, status: 'challenger' },
                        { model_id: 'cat_model_v1.0', algorithm_type: 'CatBoost', version: '1.0.0', serving_path: 'Realtime + Batch', baselines: { roc_auc: 0.8350 }, status: 'champion' },
                        { model_id: 'rf_model_v1.0', algorithm_type: 'Random Forest', version: '1.0.0', serving_path: 'Realtime + Batch', baselines: { roc_auc: 0.8110 }, status: 'challenger' },
                        { model_id: 'nn_model_v1.0', algorithm_type: 'Neural Network', version: '1.0.0', serving_path: 'Realtime + Batch', baselines: { roc_auc: 0.8240 }, status: 'challenger' },
                        { model_id: 'logreg_model_v1.0', algorithm_type: 'Logistic Regression', version: '1.0.0', serving_path: 'Realtime + Batch', baselines: { roc_auc: 0.7680 }, status: 'challenger' },
                        { model_id: 'linreg_model_v1.0', algorithm_type: 'Linear Regression', version: '1.0.0', serving_path: 'Realtime + Batch', baselines: { roc_auc: 0.7520 }, status: 'challenger' },
                        { model_id: 'xgb_credit_v2.0', algorithm_type: 'XGBoost', version: '2.0.0', serving_path: 'Batch Serving', baselines: { roc_auc: 0.8550 }, status: 'migrated' },
                        { model_id: 'cat_wealth_v1.5', algorithm_type: 'CatBoost', version: '1.5.0', serving_path: 'Batch Serving', baselines: { roc_auc: 0.8480 }, status: 'migrated' },
                        { model_id: 'rf_loans_v2.1', algorithm_type: 'Random Forest', version: '2.1.0', serving_path: 'Batch Serving', baselines: { roc_auc: 0.8280 }, status: 'migrated' },
                        { model_id: 'nn_defaulter_v2.0', algorithm_type: 'Neural Network', version: '2.0.0', serving_path: 'Batch Serving', baselines: { roc_auc: 0.8380 }, status: 'migrated' }
                      ]).map((m: any, idx: number) => {
                        const isChamp = m.model_id === (championId || 'cat_model_v1.0');
                        const displayStatus = isChamp ? 'Active Champion' : (m.status === 'migrated' ? 'Migrated ML' : 'Challenger');
                        const aucVal = m.baselines?.roc_auc ? (typeof m.baselines.roc_auc === 'number' ? m.baselines.roc_auc.toFixed(4) : m.baselines.roc_auc) : '0.8000';
                        return (
                          <tr key={idx} className="hover:bg-gray-900/30">
                            <td className="p-3 font-bold text-axis-burgundy dark:text-red-300">{m.model_id}</td>
                            <td className="p-3 text-gray-400">{m.algorithm_type}</td>
                            <td className="p-3 text-gray-400">{m.version}</td>
                            <td className="p-3 text-gray-400">{m.serving_path || 'Realtime + Batch'}</td>
                            <td className="p-3 text-green-400 font-bold">{aucVal}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isChamp ? 'bg-axis-burgundy text-white' : 'bg-gray-800 text-gray-300'}`}>
                                {displayStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeCatalogTab === 'rule' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-xs uppercase text-gray-400 tracking-wider">Rule-Based Business Models Inventory (20 Slots)</h3>
            <span className="text-xs font-mono text-gray-400">Total Registered Rules: {ruleModelsList.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ruleModelsList.map((rule) => (
              <div key={rule.model_id} className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} space-y-3`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-bold text-xs text-axis-burgundy dark:text-red-400 block">{rule.model_id}</span>
                    <span className="font-bold text-sm text-gray-600 block">{rule.model_name}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded text-[10px] font-bold">
                    {rule.execution_frequency}
                  </span>
                </div>

                <div className="text-xs font-mono space-y-1 text-gray-400">
                  <div>Product: <span className="text-amber-400">{rule.target_product}</span></div>
                  <div>Category: <span className="text-gray-300">{rule.category}</span></div>
                  <div>Logic Operator: <span className="text-green-400">{rule.rule_config?.logic || 'AND'}</span></div>
                </div>

                <div className="pt-2 border-t border-gray-800 space-y-1 text-[10px]">
                  <span className="text-gray-500 font-bold block">Conditions ({rule.rule_config?.conditions?.length || 0}):</span>
                  {rule.rule_config?.conditions?.map((c: any, i: number) => (
                    <div key={i} className="font-mono text-gray-300 bg-gray-900 p-1 rounded border border-gray-850">
                      {c.feature} {c.operator} {c.value}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-4">
          <div className={`relative max-w-lg w-full rounded-2xl border p-6 shadow-2xl space-y-4 ${isDarkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
            <div className="flex items-center justify-between border-b pb-3 border-gray-750">
              <h3 className="text-base font-bold">Model Mappings & Algorithm Types</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-white font-bold text-xs bg-gray-800 hover:bg-gray-750 px-2.5 py-1 rounded cursor-pointer border-0"
              >
                ✕
              </button>
            </div>
            <div className="text-xs space-y-2 text-gray-300 leading-relaxed font-mono">
              <p>• <strong>ML Models:</strong> Trained on customer demographics, spending ratios, and financial portfolio features.</p>
              <p>• <strong>Rule-Based Models:</strong> Evaluated monthly on DPD delinquency buckets and hard risk cutoff thresholds.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
