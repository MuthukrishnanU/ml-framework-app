import { useState, useEffect } from 'react';
import { useAppContext, API_BASE_URL } from '../context/AppContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function MLPipelineStudio() {
  const { isDarkMode, apiFetch } = useAppContext();

  // Local ML Pipeline Studio states
  const [pipelineStep, setPipelineStep] = useState<number>(1);
  const [pipelineCampaign, setPipelineCampaign] = useState<string>('credit_card');
  const [pipelineAlgorithms, setPipelineAlgorithms] = useState<string[]>(['logistic_regression', 'xgboost']);
  const [pipelineBaseFilters, setPipelineBaseFilters] = useState({
    age_min: 18,
    age_max: 85,
    income_min: 0,
    credit_score_min: 300,
    gender: 'All'
  });
  const [formFilters, setFormFilters] = useState({
    age_min: 18,
    age_max: 85,
    income_min: 0,
    credit_score_min: 300,
    gender: 'All'
  });
  const [submitDisabled, setSubmitDisabled] = useState<boolean>(false);
  const [basePullLoading, setBasePullLoading] = useState<boolean>(false);
  const [prevStep, setPrevStep] = useState<number>(1);
  const [featureSelectionMode, setFeatureSelectionMode] = useState<'app' | 'pyspark'>('app');
  const [pysparkTemplate, setPysparkTemplate] = useState<string>(`# PySpark Feature Selection Template
from pyspark.sql import SparkSession
from pyspark.sql.functions import col

def feature_selection_pipeline(spark_session: SparkSession, input_table: str) -> pyspark.sql.DataFrame:
    # 1. Load the active cohort dataset
    cohort_df = spark_session.table(input_table)
    
    # 2. Define selected features
    selected_columns = [
        "age",
        "annual_income",
        "credit_score",
        "credit_limit",
        "monthly_spend",
        "average_utilization",
        "payment_delay_days",
        "active_loans_count",
        "total_outstanding_loan",
        "average_interest_rate",
        "monthly_loan_emi",
        "mutual_fund_holdings",
        "equity_portfolio_value",
        "fixed_deposit_balance",
        "monthly_sip_amount"
    ]
    
    return cohort_df.select(*selected_columns)
`);
  const [pysparkProcessed, setPysparkProcessed] = useState<boolean>(false);
  const [pipelineBaseCount, setPipelineBaseCount] = useState<number>(0);
  const [pipelineSelectedFeatures, setPipelineSelectedFeatures] = useState<string[]>([
    "age", "annual_income", "credit_score", "credit_limit", "monthly_spend",
    "average_utilization", "payment_delay_days", "active_loans_count",
    "total_outstanding_loan", "average_interest_rate", "monthly_loan_emi",
    "mutual_fund_holdings", "equity_portfolio_value", "fixed_deposit_balance",
    "monthly_sip_amount"
  ]);
  const [pipelineImputations, setPipelineImputations] = useState<Record<string, string>>({});
  const [pipelineHyperparams, setPipelineHyperparams] = useState<Record<string, Record<string, any>>>({
    logistic_regression: { C: 1.0, max_iter: 1000 },
    random_forest: { n_estimators: 100, max_depth: 8 },
    xgboost: { learning_rate: 0.1, max_depth: 5, n_estimators: 100 },
    catboost: { depth: 6, iterations: 100 },
    pytorch_mlp: { max_iter: 500 },
    linear_regression: {}
  });
  const [pipelineSplitRatio, setPipelineSplitRatio] = useState<number>(0.8);
  const [pipelineScoreboard, setPipelineScoreboard] = useState<any[]>([]);
  const [pipelineCurves, setPipelineCurves] = useState<Record<string, any>>({});
  const [pipelineActiveModelId, setPipelineActiveModelId] = useState<string>('');
  const [pipelineMissingStats, setPipelineMissingStats] = useState<Record<string, any>>({});
  const [pipelineCorrMatrix, setPipelineCorrMatrix] = useState<{ columns: string[], matrix: number[][] }>({ columns: [], matrix: [] });
  const [pipelineLoading, setPipelineLoading] = useState<boolean>(false);

  // Helper to parse features from PySpark template
  const parseFeaturesFromPySpark = (code: string): string[] => {
    // 1. Try to find list assignments (e.g. selected_columns = [...], selected_features = [...], columns = [...], features = [...])
    const listRegex = /(selected_columns|selected_features|columns|features)\s*=\s*\[([\s\S]*?)\]/gi;
    const match = listRegex.exec(code);
    
    if (match) {
      const listContent = match[2];
      const stringRegex = /['"]([a-zA-Z0-9_-]+)['"]/g;
      const found = new Set<string>();
      let strMatch;
      while ((strMatch = stringRegex.exec(listContent)) !== null) {
        found.add(strMatch[1]);
      }
      if (found.size > 0) {
        return Array.from(found);
      }
    }
    
    // 2. Fallback: Scan the entire code for any quoted strings, ignoring common keywords/imports
    const stringRegex = /['"]([a-zA-Z0-9_-]+)['"]/g;
    const found = new Set<string>();
    let strMatch;
    const ignoredWords = ["pyspark.sql", "SparkSession", "col", "table", "pyspark", "input_table", "select", "credit_card", "mutual_funds", "loans", "defaulter"];
    while ((strMatch = stringRegex.exec(code)) !== null) {
      const word = strMatch[1];
      if (!ignoredWords.includes(word) && !word.includes("/") && word.length > 1) {
        found.add(word);
      }
    }
    return Array.from(found);
  };

  // Submit PySpark template to extract features
  const handleSubmitPySparkTemplate = () => {
    const parsed = parseFeaturesFromPySpark(pysparkTemplate);
    setPipelineSelectedFeatures(parsed);
    setPysparkProcessed(true);
  };

  // Submit demographic filters manually
  const handleSubmitFilters = async () => {
    setBasePullLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/segmentation/base_pull_preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formFilters)
      });
      if (res.ok) {
        const data = await res.json();
        setPipelineBaseCount(data.count);
        setPipelineBaseFilters(formFilters);
        setSubmitDisabled(true);
      }
    } catch (e) {
      console.error("Failed to apply base pull filters", e);
    } finally {
      setBasePullLoading(false);
    }
  };

  // Initial fetch on component mount to show the default cohort size
  useEffect(() => {
    const fetchInitialCount = async () => {
      try {
        const res = await apiFetch(`${API_BASE_URL}/api/segmentation/base_pull_preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pipelineBaseFilters)
        });
        if (res.ok) {
          const data = await res.json();
          setPipelineBaseCount(data.count);
        }
      } catch (e) {
        console.error("Failed to load initial base pull preview count", e);
      }
    };
    fetchInitialCount();
  }, []);

  // Monitor step change to re-enable apply button if coming back to Step 1 from a future step
  useEffect(() => {
    if (pipelineStep === 1 && prevStep > 1) {
      setSubmitDisabled(false);
    }
    setPrevStep(pipelineStep);
  }, [pipelineStep, prevStep]);

  // Fetch Feature Reduction stats and matrix
  const fetchFeatureReductionPreview = async () => {
    setPipelineLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/ml/feature_reduction_preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_pull: pipelineBaseFilters,
          selected_features: pipelineSelectedFeatures
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPipelineMissingStats(data.missing_stats || {});
        setPipelineCorrMatrix(data.correlation_matrix || { columns: [], matrix: [] });
      }
    } catch (e) {
      console.error("Failed to load feature reduction preview", e);
    } finally {
      setPipelineLoading(false);
    }
  };

  // Launch training pipeline
  const handleLaunchPipeline = async () => {
    setPipelineLoading(true);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/ml/train_custom_stepper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign: pipelineCampaign,
          algorithms: pipelineAlgorithms,
          base_pull: pipelineBaseFilters,
          selected_features: pipelineSelectedFeatures,
          imputations: pipelineImputations,
          hyperparameters: pipelineHyperparams,
          split_ratio: pipelineSplitRatio
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPipelineScoreboard(data.scoreboard || []);
        setPipelineCurves(data.validation_curves || {});
        if (data.scoreboard && data.scoreboard.length > 0) {
          const readyModels = data.scoreboard.filter((m: any) => !m.status.startsWith('Failed'));
          if (readyModels.length > 0) {
            setPipelineActiveModelId(readyModels[0].model_id);
          } else {
            setPipelineActiveModelId(data.scoreboard[0].model_id);
          }
        }
        setPipelineStep(5);
      }
    } catch (e) {
      console.error("Custom stepper pipeline training failed", e);
    } finally {
      setPipelineLoading(false);
    }
  };

  return (
    <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} space-y-6`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>ML Pipeline Studio</h2>
          <p className="text-xs text-gray-500 font-medium">Step-by-step model configuration, cohort extraction, feature processing, and validation pipeline.</p>
        </div>
        {pipelineLoading && (
          <div className="flex items-center gap-2 text-xs font-bold text-axis-burgundy dark:text-red-400 animate-pulse bg-red-100 dark:bg-axis-burgundy/10 px-3 py-1.5 rounded-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-axis-burgundy dark:bg-red-400 animate-ping"></div>
            Processing Pipeline Step...
          </div>
        )}
      </div>

      {/* Stepper Navigation bar */}
      <div className="grid grid-cols-5 gap-2 text-center text-xs font-bold uppercase tracking-wider">
        {[
          { step: 1, label: "1. Base Pull" },
          { step: 2, label: "2. Feature Selection" },
          { step: 3, label: "3. Feature Reduction" },
          { step: 4, label: "4. Model Training" },
          { step: 5, label: "5. Model Validation" }
        ].map((s) => {
          const isActive = pipelineStep === s.step;
          const isCompleted = pipelineStep > s.step;
          return (
            <div
              key={s.step}
              onClick={() => {
                if (s.step < pipelineStep || pipelineScoreboard.length > 0) {
                  setPipelineStep(s.step);
                  if (s.step === 3) fetchFeatureReductionPreview();
                }
              }}
              className={`py-3 px-1 rounded-lg border transition-all cursor-pointer select-none ${isActive ? 'bg-axis-burgundy text-white border-axis-burgundy' : isCompleted ? 'bg-green-950/20 text-green-600 border-green-900/40' : 'bg-gray-950/20 text-gray-500 border-gray-850'}`}
            >
              {s.label}
            </div>
          );
        })}
      </div>

      {/* Step 1: Base Pull */}
      {pipelineStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Base Pull Filters form */}
          <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} space-y-4`}>
            <h3 className={`font-bold text-sm ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Target Population Segment Filters</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-450 block">Age Range (Years)</label>
              <div className="flex gap-4 items-center">
                <input
                  type="number"
                  value={formFilters.age_min}
                  onChange={(e) => {
                    setFormFilters(prev => ({ ...prev, age_min: Math.max(18, parseInt(e.target.value || '18', 10)) }));
                    setSubmitDisabled(false);
                  }}
                  className={`w-20 px-2 py-1 text-xs rounded border focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  value={formFilters.age_max}
                  onChange={(e) => {
                    setFormFilters(prev => ({ ...prev, age_max: Math.min(100, parseInt(e.target.value || '100', 10)) }));
                    setSubmitDisabled(false);
                  }}
                  className={`w-20 px-2 py-1 text-xs rounded border focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-450 block">Minimum Annual Income (₹)</label>
              <input
                type="number"
                value={formFilters.income_min}
                onChange={(e) => {
                  setFormFilters(prev => ({ ...prev, income_min: parseFloat(e.target.value || '0') }));
                  setSubmitDisabled(false);
                }}
                className={`w-full px-3 py-1.5 text-xs rounded border focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-450">Minimum Credit Score</label>
                <input
                  type="number"
                  min="300"
                  max="850"
                  value={formFilters.credit_score_min}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setFormFilters(prev => ({ ...prev, credit_score_min: isNaN(parsed) ? 300 : parsed }));
                    setSubmitDisabled(false);
                  }}
                  onBlur={(e) => {
                    const val = Math.max(300, Math.min(850, parseInt(e.target.value || '300', 10)));
                    setFormFilters(prev => ({ ...prev, credit_score_min: val }));
                  }}
                  className={`w-16 px-2 py-0.5 text-xs text-right rounded border focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                />
              </div>
              <input
                type="range"
                min="300"
                max="850"
                value={formFilters.credit_score_min}
                onChange={(e) => {
                  setFormFilters(prev => ({ ...prev, credit_score_min: parseInt(e.target.value, 10) }));
                  setSubmitDisabled(false);
                }}
                className="w-full accent-axis-burgundy"
              />
              <div className="flex justify-between text-[10px] font-mono text-gray-550">
                <span>300 (Poor)</span>
                <span>850 (Excellent)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-450 block">Gender</label>
              <select
                value={formFilters.gender}
                onChange={(e) => {
                  setFormFilters(prev => ({ ...prev, gender: e.target.value }));
                  setSubmitDisabled(false);
                }}
                className={`w-full px-3 py-1.5 text-xs rounded border focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
              >
                <option value="All">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <button
              onClick={handleSubmitFilters}
              disabled={submitDisabled || basePullLoading}
              className="w-full py-2 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all disabled:opacity-40 cursor-pointer mt-4"
            >
              {basePullLoading ? 'Applying Filters...' : 'Apply Filters'}
            </button>
          </div>

          {/* Cohort Size Preview */}
          <div className={`p-6 rounded-xl border flex flex-col justify-between ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'}`}>
            <div>
              <h4 className="text-xs uppercase font-bold tracking-widest text-gray-550">Active Cohort Preview</h4>
              <h2 className="text-5xl font-black mt-4 text-axis-burgundy dark:text-red-400">
                {pipelineBaseCount.toLocaleString()}
              </h2>
              <p className="text-xs text-gray-400 mt-2">Customers pulled from the base database matching selected demographic rules.</p>

              <div className="mt-6 border-t border-gray-850 pt-4 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-450">Base Source:</span> <span className="font-bold text-gray-400">demographics table</span></div>
                <div className="flex justify-between"><span className="text-gray-450">Active Filters:</span> <span className="font-mono text-axis-burgundy dark:text-red-300 text-[10px] truncate max-w-[200px]">
                  {`Age: [${pipelineBaseFilters.age_min}-${pipelineBaseFilters.age_max}], Income: >=₹${pipelineBaseFilters.income_min.toLocaleString()}, Credit: >=${pipelineBaseFilters.credit_score_min}, Gender: ${pipelineBaseFilters.gender}`}
                </span></div>
                {JSON.stringify(formFilters) !== JSON.stringify(pipelineBaseFilters) && (
                  <div className="text-amber-500 font-bold mt-2 text-[10px] animate-pulse">
                    * Filters modified. Click "Apply Filters" to update cohort size.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setPipelineStep(2)}
              disabled={pipelineBaseCount === 0 || JSON.stringify(formFilters) !== JSON.stringify(pipelineBaseFilters)}
              className="w-full py-2.5 mt-6 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all disabled:opacity-40 cursor-pointer"
            >
              Configure Target Features &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Feature Selection */}
      {pipelineStep === 2 && (
        <div className="space-y-6">
          <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} space-y-6`}>
            {/* Header with Mode Switcher */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-805/40">
              <div className="flex flex-col gap-1">
                <h3 className={`font-bold text-sm ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Feature Store Variable Selector</h3>
                <span className="text-[10px] text-gray-500 font-medium">Choose between configuring features visually or using a PySpark data pipeline code template.</span>
              </div>
              
              <div className="flex bg-gray-900/60 border border-gray-800/80 p-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider select-none">
                <button
                  onClick={() => setFeatureSelectionMode('app')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${featureSelectionMode === 'app' ? 'bg-axis-burgundy text-white shadow' : 'text-gray-400 hover:text-gray-250'}`}
                >
                  App based Selection
                </button>
                <button
                  onClick={() => setFeatureSelectionMode('pyspark')}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${featureSelectionMode === 'pyspark' ? 'bg-axis-burgundy text-white shadow' : 'text-gray-400 hover:text-gray-250'}`}
                >
                  PySpark Template based
                </button>
              </div>
            </div>

            {/* Mode 1: App based Selection (Checkboxes) */}
            {featureSelectionMode === 'app' && (
              <div className="space-y-4">
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    onClick={() => setPipelineSelectedFeatures([
                      "age", "annual_income", "credit_score", "credit_limit", "monthly_spend",
                      "average_utilization", "payment_delay_days", "active_loans_count",
                      "total_outstanding_loan", "average_interest_rate", "monthly_loan_emi",
                      "mutual_fund_holdings", "equity_portfolio_value", "fixed_deposit_balance",
                      "monthly_sip_amount"
                    ])}
                    className="text-xs text-blue-400 hover:underline cursor-pointer bg-transparent border-0"
                  >
                    Select All
                  </button>
                  <span className="text-gray-555">|</span>
                  <button
                    onClick={() => setPipelineSelectedFeatures([])}
                    className="text-xs text-blue-400 hover:underline cursor-pointer bg-transparent border-0"
                  >
                    Clear All
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      group: "Demographics",
                      items: [
                        { id: "age", label: "Customer Age", type: "INT", sens: "Low" },
                        { id: "annual_income", label: "Annual Income", type: "NUMERIC", sens: "High" },
                        { id: "credit_score", label: "Credit Score", type: "INT", sens: "High" }
                      ]
                    },
                    {
                      group: "Credit Card History",
                      items: [
                        { id: "credit_limit", label: "Credit Limit", type: "NUMERIC", sens: "High" },
                        { id: "monthly_spend", label: "Monthly Spend", type: "NUMERIC", sens: "Low" },
                        { id: "average_utilization", label: "Utilization Ratio", type: "NUMERIC", sens: "Low" },
                        { id: "payment_delay_days", label: "Payment Delays", type: "INT", sens: "Critical" }
                      ]
                    },
                    {
                      group: "Loan Details",
                      items: [
                        { id: "active_loans_count", label: "Active Loans", type: "INT", sens: "Low" },
                        { id: "total_outstanding_loan", label: "Outstanding Loan", type: "NUMERIC", sens: "High" },
                        { id: "average_interest_rate", label: "Interest Rate", type: "NUMERIC", sens: "Low" },
                        { id: "monthly_loan_emi", label: "Monthly EMI", type: "NUMERIC", sens: "High" }
                      ]
                    },
                    {
                      group: "Investment Profiles",
                      items: [
                        { id: "mutual_fund_holdings", label: "Mutual Funds", type: "NUMERIC", sens: "High" },
                        { id: "equity_portfolio_value", label: "Equity Value", type: "NUMERIC", sens: "High" },
                        { id: "fixed_deposit_balance", label: "FD Balance", type: "NUMERIC", sens: "High" },
                        { id: "monthly_sip_amount", label: "SIP Amount", type: "NUMERIC", sens: "Low" }
                      ]
                    }
                  ].map((grp) => (
                    <div key={grp.group} className="space-y-2 border-r border-gray-850/40 pr-2 last:border-r-0">
                      <h4 className="text-xs uppercase text-gray-450 font-bold tracking-wider">{grp.group}</h4>
                      <div className="space-y-2">
                        {grp.items.map((item) => {
                          const isChecked = pipelineSelectedFeatures.includes(item.id);
                          return (
                            <label key={item.id} className="flex items-start gap-2.5 p-2 rounded bg-gray-900/30 border border-transparent hover:border-gray-800 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setPipelineSelectedFeatures(prev => prev.filter(x => x !== item.id));
                                  } else {
                                    setPipelineSelectedFeatures(prev => [...prev, item.id]);
                                  }
                                }}
                                className="rounded border-gray-700 text-axis-burgundy focus:ring-axis-burgundy mt-0.5"
                              />
                              <div className="text-[10px]">
                                <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>{item.label}</div>
                                <div className="flex gap-2 text-[8px] mt-0.5 text-gray-555 font-mono">
                                  <span>{item.type}</span>
                                  <span className={item.sens === 'Critical' ? 'text-red-400' : item.sens === 'High' ? 'text-amber-500' : 'text-gray-600'}>
                                    {item.sens}
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mode 2: PySpark Template based Selection (Split View) */}
            {featureSelectionMode === 'pyspark' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side: Code Editor & Upload */}
                <div className="space-y-4 pr-0 lg:pr-6 border-r-0 lg:border-r border-gray-800/40">
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-xs font-semibold text-gray-450">PySpark Template Code</label>
                    <label className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 rounded-md cursor-pointer select-none transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Upload File
                      <input
                        type="file"
                        accept=".py,.txt"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const text = event.target?.result as string;
                              setPysparkTemplate(text);
                              setPysparkProcessed(false);
                            };
                            reader.readAsText(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <textarea
                    value={pysparkTemplate}
                    onChange={(e) => {
                      setPysparkTemplate(e.target.value);
                      setPysparkProcessed(false);
                    }}
                    placeholder="# Paste your PySpark code here..."
                    className={`w-full h-80 font-mono text-xs p-3 rounded-lg border focus:outline-none resize-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-green-400' : 'bg-gray-50 border-gray-300 text-gray-800'}`}
                  />

                  <button
                    onClick={handleSubmitPySparkTemplate}
                    className="w-full py-2.5 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer"
                  >
                    Submit Template & Parse Features
                  </button>
                </div>

                {/* Right Side: Parsed Features Preview */}
                <div className="flex flex-col justify-between space-y-4">
                  {!pysparkProcessed ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-8 text-center bg-gray-900/10 border border-dashed border-gray-800 rounded-xl space-y-3">
                      <div className="p-3 bg-gray-800/40 rounded-full text-amber-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <h4 className="text-xs font-bold text-gray-355">Template Pending Submission</h4>
                      <p className="text-[10px] text-gray-500 max-w-[240px] leading-relaxed">
                        Please edit/upload your PySpark template and click <strong>Submit Template</strong> on the left to extract the selected features.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs uppercase font-bold tracking-widest text-gray-450">Parsed Features Preview</h4>
                        <span className="bg-green-950/40 text-green-400 border border-green-900/30 text-[9px] font-mono px-2 py-0.5 rounded font-bold">
                          {pipelineSelectedFeatures.length} Features Extracted
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(() => {
                          const categories = [
                            {
                              name: "Demographics",
                              items: [
                                { id: "age", label: "Customer Age" },
                                { id: "annual_income", label: "Annual Income" },
                                { id: "credit_score", label: "Credit Score" }
                              ]
                            },
                            {
                              name: "Credit Card History",
                              items: [
                                { id: "credit_limit", label: "Credit Limit" },
                                { id: "monthly_spend", label: "Monthly Spend" },
                                { id: "average_utilization", label: "Utilization Ratio" },
                                { id: "payment_delay_days", label: "Payment Delays" }
                              ]
                            },
                            {
                              name: "Loan Details",
                              items: [
                                { id: "active_loans_count", label: "Active Loans" },
                                { id: "total_outstanding_loan", label: "Outstanding Loan" },
                                { id: "average_interest_rate", label: "Interest Rate" },
                                { id: "monthly_loan_emi", label: "Monthly EMI" }
                              ]
                            },
                            {
                              name: "Investment Profiles",
                              items: [
                                { id: "mutual_fund_holdings", label: "Mutual Funds" },
                                { id: "equity_portfolio_value", label: "Equity Value" },
                                { id: "fixed_deposit_balance", label: "FD Balance" },
                                { id: "monthly_sip_amount", label: "SIP Amount" }
                              ]
                            }
                          ];

                          const predefinedIds = categories.flatMap(c => c.items.map(i => i.id));
                          const customFeatures = pipelineSelectedFeatures.filter(f => !predefinedIds.includes(f));

                          const displayCategories = [...categories];
                          if (customFeatures.length > 0) {
                            displayCategories.push({
                              name: "Custom / Engineered Features",
                              items: customFeatures.map(f => ({ id: f, label: f }))
                            });
                          }

                          return displayCategories.map((grp) => {
                            const selectedInGrp = grp.items.filter(item => pipelineSelectedFeatures.includes(item.id));
                            return (
                              <div key={grp.name} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-gray-900/40 border-gray-800/80' : 'bg-gray-50 border-gray-200'} space-y-2`}>
                                <h5 className="text-[10px] uppercase font-bold text-gray-450 tracking-wider">{grp.name}</h5>
                                {selectedInGrp.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {selectedInGrp.map(item => (
                                      <div key={item.id} className="flex items-center gap-2 text-xs font-semibold text-green-500 dark:text-green-400 bg-green-950/10 dark:bg-green-950/20 border border-green-900/30 px-2.5 py-1 rounded">
                                        <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className={isDarkMode ? 'text-white' : 'text-gray-850'}>{item.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-gray-555 italic text-center py-2">No features selected</div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setPipelineStep(1)}
              className={`px-4 py-2 text-xs font-bold border border-gray-800 hover:bg-gray-850 rounded-lg cursor-pointer ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              &larr; Back
            </button>
            <button
              onClick={() => {
                setPipelineStep(3);
                fetchFeatureReductionPreview();
              }}
              disabled={
                pipelineSelectedFeatures.length === 0 ||
                (featureSelectionMode === 'pyspark' && !pysparkProcessed)
              }
              className="px-5 py-2.5 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Reduce Features & Impute &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Feature Reduction */}
      {pipelineStep === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Imputations Strategy Config */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className={`font-bold text-sm  ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Imputations & Treatment Options</h3>
              <div className="overflow-x-auto border border-gray-850 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-850 bg-gray-950/40 text-gray-450 uppercase tracking-wider font-semibold">
                      <th className="p-3">Feature Variable</th>
                      <th className="p-3">Null Records</th>
                      <th className="p-3">Imputation Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-850">
                    {pipelineSelectedFeatures.map((feat) => {
                      const stats = pipelineMissingStats[feat] || { null_count: 0, null_percentage: 0.0 };
                      const strategy = pipelineImputations[feat] || "zero";
                      return (
                        <tr key={feat} className="hover:bg-gray-900/20 text-gray-300">
                          <td className={`p-3 font-mono font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{feat}</td>
                          <td className="p-3">
                            <div className="font-medium text-red-400">{stats.null_count}</div>
                            <div className="text-[10px] text-gray-500">{(stats.null_percentage * 100).toFixed(2)}% of cohort</div>
                          </td>
                          <td className="p-3">
                            <select
                              value={strategy}
                              onChange={(e) => setPipelineImputations(prev => ({ ...prev, [feat]: e.target.value }))}
                              className={`px-2 py-1 text-xs rounded border focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-250' : 'bg-white border-gray-300 text-black'}`}
                            >
                              <option value="zero">Fill with Zero (0)</option>
                              <option value="mean">Fill with Column Mean</option>
                              <option value="median">Fill with Column Median</option>
                              <option value="drop">Drop Column Entirely</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Correlation Heatmap Grid */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className={`font-bold text-sm  ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Collinearity Heatmap Matrix</h3>
              <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} space-y-2`}>
                <p className="text-[10px] text-gray-550">Visual mapping of Pearson coefficients. Highlighted red cells ($r \ge 0.85$) represent high collinearity.</p>

                {pipelineCorrMatrix.columns && pipelineCorrMatrix.columns.length > 0 ? (
                  <div className="space-y-1">
                    <div className="grid font-mono font-bold text-[8px] text-gray-550" style={{ gridTemplateColumns: `repeat(${pipelineCorrMatrix.columns.length}, minmax(0, 1fr))` }}>
                      {pipelineCorrMatrix.columns.map((c, idx) => (
                        <span key={c} className="text-center truncate" title={(idx + 1) + "-" + c}>{c.substring(0, 3)}</span>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {pipelineCorrMatrix.matrix.map((row, r_idx) => (
                        <div key={r_idx} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${pipelineCorrMatrix.columns.length}, minmax(0, 1fr))` }}>
                          {row.map((val, c_idx) => {
                            const abs_val = Math.abs(val);
                            let cellBg = 'bg-gray-900/60';
                            if (abs_val >= 0.85 && r_idx !== c_idx) cellBg = 'bg-red-900/70 border border-red-500/30 text-white';
                            else if (abs_val >= 0.5 && r_idx !== c_idx) cellBg = 'bg-amber-900/40 text-amber-300';
                            else if (r_idx === c_idx) cellBg = 'bg-gray-800 text-gray-300';
                            return (
                              <div
                                key={c_idx}
                                className={`py-1 text-center font-mono text-[8px] font-bold rounded cursor-pointer select-none ${cellBg}`}
                                title={`${pipelineCorrMatrix.columns[r_idx]} vs ${pipelineCorrMatrix.columns[c_idx]}: ${val.toFixed(4)}`}
                              >
                                {val.toFixed(2)}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-555 text-center py-10">Select numeric variables in Feature Selection to render correlation matrix.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setPipelineStep(2)}
              className={`px-4 py-2 text-xs font-bold border border-gray-800 hover:bg-gray-850 rounded-lg cursor-pointer ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              &larr; Back
            </button>
            <button
              onClick={() => setPipelineStep(4)}
              className="px-5 py-2.5 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer"
            >
              Tuning & Training &rarr;
            </button>
          </div>
        </div>
      )
      }

      {/* Step 4: Model Training */}
      {
        pipelineStep === 4 && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Splits and Hyperparameters Form */}
              <div className={`p-5 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} space-y-4 h-fit`}>
                <h3 className={`font-bold text-sm ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'} uppercase tracking-wide`}>Simulation Configuration</h3>

                {/* Target Campaign Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-405 block">Campaign Type (Target Label Y)</label>
                  <select
                    value={pipelineCampaign}
                    onChange={(e) => setPipelineCampaign(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="credit_card">Credit Card Propensity Model</option>
                    <option value="mutual_funds">Mutual Fund Propensity Model</option>
                    <option value="loans">Loans Propensity Model</option>
                    <option value="defaulter">Card Payment Defaulter Model</option>
                    <option value="investment_aggressiveness">Investment Aggressiveness Model</option>
                    <option value="next_best_action">Next Best Action Model (Recommendation System)</option>
                  </select>
                </div>

                {/* Split Ratio Slider */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-405 block">Train / Test Split Ratio</label>
                  <input
                    type="range"
                    min="0.5"
                    max="0.9"
                    step="0.05"
                    value={pipelineSplitRatio}
                    onChange={(e) => setPipelineSplitRatio(parseFloat(e.target.value))}
                    className="w-full accent-axis-burgundy"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-gray-550">
                    <span>{(pipelineSplitRatio * 100).toFixed(0)}% Training Set</span>
                    <span>{((1.0 - pipelineSplitRatio) * 100).toFixed(0)}% Validation Set</span>
                  </div>
                </div>

                {/* Launch Button */}
                <button
                  onClick={handleLaunchPipeline}
                  disabled={pipelineAlgorithms.length === 0 || pipelineLoading}
                  className="w-full py-2.5 bg-axis-burgundy hover:bg-axis-burgundy-hover text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-40 cursor-pointer"
                >
                  {pipelineLoading ? "Fitting Models..." : "Launch Custom Training Pipeline"}
                </button>
              </div>

              {/* Algorithms Checklist and Hyperparameters Form */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className={`font-bold text-sm ${isDarkMode ? 'text-red-200' : 'text-axis-burgundy'}`}>Choose Algorithms & Hyperparameters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      id: 'logistic_regression', name: 'Logistic Regression', desc: 'Linear classifier with regularization.', params: [
                        { key: 'C', label: 'Regularization Strength (C)', type: 'float', def: 1.0 },
                        { key: 'max_iter', label: 'Max Iterations', type: 'int', def: 1000 }
                      ]
                    },
                    {
                      id: 'random_forest', name: 'Random Forest', desc: 'Ensemble bagging decision trees model.', params: [
                        { key: 'n_estimators', label: 'Number of Trees', type: 'int', def: 100 },
                        { key: 'max_depth', label: 'Max Tree Depth', type: 'int', def: 8 }
                      ]
                    },
                    {
                      id: 'xgboost', name: 'XGBoost', desc: 'Extreme gradient boosted trees classifier.', params: [
                        { key: 'learning_rate', label: 'Learning Rate (eta)', type: 'float', def: 0.1 },
                        { key: 'max_depth', label: 'Max Depth', type: 'int', def: 5 },
                        { key: 'n_estimators', label: 'N Estimators', type: 'int', def: 100 }
                      ]
                    },
                    {
                      id: 'catboost', name: 'CatBoost', desc: 'Symmetric decision tree boosting classifier.', params: [
                        { key: 'depth', label: 'Tree Depth', type: 'int', def: 6 },
                        { key: 'iterations', label: 'Iterations', type: 'int', def: 100 }
                      ]
                    },
                    {
                      id: 'pytorch_mlp', name: 'PyTorch MLP Neural Net', desc: 'Multi-layer perceptron neural network.', params: [
                        { key: 'max_iter', label: 'Max Epochs/Iterations', type: 'int', def: 500 }
                      ]
                    },
                    { id: 'linear_regression', name: 'Linear Regression Classifier', desc: 'Standard Ordinary Least Squares regression model.', params: [] }
                  ].map((alg) => {
                    const isChecked = pipelineAlgorithms.includes(alg.id);
                    return (
                      <div key={alg.id} className={`p-4 rounded-xl border transition-all ${isChecked ? 'bg-axis-burgundy/5 border-axis-burgundy/40' : 'bg-gray-900/20 border-gray-850'}`}>
                        <label className="flex items-start gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setPipelineAlgorithms(prev => prev.filter(x => x !== alg.id));
                              } else {
                                setPipelineAlgorithms(prev => [...prev, alg.id]);
                              }
                            }}
                            className="rounded border-gray-700 text-axis-burgundy focus:ring-axis-burgundy mt-1"
                          />
                          <div>
                            <div className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{alg.name}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{alg.desc}</div>
                          </div>
                        </label>

                        {isChecked && alg.params.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-850/40 space-y-2 text-[10px]">
                            {alg.params.map((p) => (
                              <div key={p.key} className="flex items-center justify-between gap-4">
                                <span className="text-gray-450">{p.label}:</span>
                                <input
                                  type="number"
                                  step={p.type === 'float' ? '0.05' : '1'}
                                  value={pipelineHyperparams[alg.id]?.[p.key] ?? p.def}
                                  onChange={(e) => {
                                    const val = p.type === 'float' ? parseFloat(e.target.value || '0.0') : parseInt(e.target.value || '0', 10);
                                    setPipelineHyperparams(prev => ({
                                      ...prev,
                                      [alg.id]: {
                                        ...prev[alg.id],
                                        [p.key]: val
                                      }
                                    }));
                                  }}
                                  className={`w-20 px-2 py-0.5 rounded border text-right focus:outline-none ${isDarkMode ? 'bg-gray-950 border-gray-800 text-white' : 'bg-white border-gray-305'}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-gray-800 pt-4">
              <button
                onClick={() => setPipelineStep(3)}
                className={`px-4 py-2 text-xs font-bold border border-gray-800 hover:bg-gray-850 rounded-lg cursor-pointer ${isDarkMode ? 'text-white' : 'text-black'}`}
              >
                &larr; Back
              </button>
            </div>
          </div>
        )
      }

      {/* Step 5: Model Validation (UAT) */}
      {
        pipelineStep === 5 && (
          <div className="space-y-6">
            {/* Validation Scoreboard Summary */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-450">Pipeline Training Results</h3>
              <div className="overflow-x-auto border border-gray-850 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-850 bg-gray-950/40 text-gray-455 uppercase tracking-wider font-semibold">
                      <th className="p-3">Model ID</th>
                      <th className="p-3">Algorithm</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Validation ROC-AUC</th>
                      <th className="p-3">Adverse Impact Ratio</th>
                      <th className="p-3">Training Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-850 text-gray-300">
                    {pipelineScoreboard.map((row, index) => {
                      const isSelected = pipelineActiveModelId === row.model_id;
                      const isFailed = row.status.startsWith('Failed');
                      return (
                        <tr
                          key={index}
                          onClick={() => { if (!isFailed) setPipelineActiveModelId(row.model_id); }}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-axis-burgundy/10 hover:bg-axis-burgundy/15 font-semibold text-white' : 'hover:bg-gray-900/10'}`}
                        >
                          <td className="p-3 font-mono font-bold text-axis-burgundy dark:text-red-400">{row.model_id}</td>
                          <td className={`p-3 ${isDarkMode ? 'text-white' : 'text-black'}`}>{row.algorithm_type}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${isFailed ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-green-950 text-green-300 border border-green-900'}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-green-500">{isFailed ? '-' : row.auc.toFixed(4)}</td>
                          <td className="p-3 font-medium text-blue-400">{isFailed ? '-' : row.fairness_adverse_impact_ratio.toFixed(4)}</td>
                          <td className={`p-3 font-medium ${isDarkMode ? 'text-white' : 'text-black'}`}>{row.latency_ms.toFixed(2)} ms</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Validation curves */}
            {pipelineActiveModelId && pipelineCurves[pipelineActiveModelId] && (
              <div className="space-y-6">
                {/* Metric cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} flex flex-col justify-between`}>
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Validation AUC</span>
                    <span className="text-2xl font-black mt-2 text-green-500">
                      {pipelineScoreboard.find(m => m.model_id === pipelineActiveModelId)?.auc.toFixed(4) || '0.5000'}
                    </span>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} flex flex-col justify-between`}>
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Calculated Gini</span>
                    <span className="text-2xl font-black mt-2 text-axis-burgundy dark:text-red-400">
                      {pipelineCurves[pipelineActiveModelId].gini.toFixed(4)}
                    </span>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} flex flex-col justify-between`}>
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">KS Statistic</span>
                    <span className="text-2xl font-black mt-2 text-blue-500">
                      {pipelineCurves[pipelineActiveModelId].ks.toFixed(4)}
                    </span>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-gray-50 border-gray-200'} flex flex-col justify-between`}>
                    <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Fairness (AIR Ratio)</span>
                    <span className="text-2xl font-black mt-2 text-amber-500">
                      {pipelineScoreboard.find(m => m.model_id === pipelineActiveModelId)?.fairness_adverse_impact_ratio.toFixed(4) || '1.0000'}
                    </span>
                  </div>
                </div>

                {/* Charts display */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* ROC Curve Chart */}
                  <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-white border-gray-250'} shadow-sm`}>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-4">Receiver Operating Characteristic (ROC Curve)</h4>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={pipelineCurves[pipelineActiveModelId].roc_curve}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="fpr" type="number" domain={[0, 1]} label={{ value: 'False Positive Rate (FPR)', position: 'insideBottom', offset: -5 }} stroke="#888" />
                          <YAxis type="number" domain={[0, 1]} label={{ value: 'True Positive Rate (TPR)', angle: -90, position: 'insideLeft' }} stroke="#888" />
                          <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                          <Legend />
                          <Line type="monotone" dataKey="tpr" stroke="#861F41" strokeWidth={3} name="Model ROC" />
                          <Line type="monotone" dataKey="fpr" stroke="#555" strokeDasharray="5 5" name="Random Guess (0.50)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Precision-Recall Curve Chart */}
                  <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-white border-gray-250'} shadow-sm`}>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-4">Precision-Recall (PR Curve)</h4>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={pipelineCurves[pipelineActiveModelId].pr_curve}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="recall" type="number" domain={[0, 1]} label={{ value: 'Recall', position: 'insideBottom', offset: -5 }} stroke="#888" />
                          <YAxis type="number" domain={[0, 1]} label={{ value: 'Precision', angle: -90, position: 'insideLeft' }} stroke="#888" />
                          <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                          <Legend />
                          <Line type="monotone" dataKey="precision" stroke="#3b82f6" strokeWidth={3} name="Model Precision" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Risk Sloping deciles bar chart */}
                  <div className={`p-5 rounded-2xl border lg:col-span-2 ${isDarkMode ? 'bg-gray-950 border-gray-850' : 'bg-white border-gray-250'} shadow-sm`}>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-4">Monotonic Risk Sloping: Predicted Prob vs Actual Rates</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pipelineCurves[pipelineActiveModelId].risk_sloping}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                          <XAxis dataKey="bin" stroke="#888" />
                          <YAxis stroke="#888" />
                          <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                          <Legend />
                          <Bar dataKey="predicted_rate" fill="#861F41" name="Mean Predicted Propensity" />
                          <Bar dataKey="actual_rate" fill="#10b981" name="Actual Conversion/Default Rate" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center border-t border-gray-800 pt-4">
              <button
                onClick={() => setPipelineStep(4)}
                className={`px-4 py-2 text-xs font-bold border border-gray-800 hover:bg-gray-850 rounded-lg cursor-pointer ${isDarkMode ? 'text-white' : 'text-black'}`}
              >
                &larr; Adjust Hyperparameters
              </button>
              <button
                onClick={() => {
                  setPipelineStep(1);
                  setPipelineScoreboard([]);
                  setPipelineCurves({});
                  setPipelineActiveModelId('');
                }}
                className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md cursor-pointer"
              >
                Restart Studio Pipeline &or;
              </button>
            </div>
          </div>
        )
      }
    </div >
  );
}
