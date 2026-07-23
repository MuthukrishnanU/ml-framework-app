import os
import json
import random
from datetime import datetime

REGISTRY_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "model_registry.json"))

# Generate default 10 ML Model templates
DEFAULT_ML_MODELS = {
    "xgb_model_v1.0": {
        "model_id": "xgb_model_v1.0", "algorithm_type": "XGBoost", "version": "1.0.0", "status": "champion",
        "model_category": "ML", "serving_path": "both", "created_at": "2026-06-01 10:00:00",
        "hyperparameters": {"max_depth": 5, "n_estimators": 100, "learning_rate": 0.1},
        "baselines": {"roc_auc": 0.842, "pr_auc": 0.812, "f1_score": 0.781, "ks_statistic": 0.584, "log_loss": 0.412, "fairness": 0.98},
        "live_metrics": {"roc_auc": 0.842, "pr_auc": 0.812, "f1_score": 0.781, "ks_statistic": 0.584, "log_loss": 0.412, "psi": 0.02, "latency": 15.4, "memory": 45.0, "fairness": 0.98}
    },
    "cat_model_v1.0": {
        "model_id": "cat_model_v1.0", "algorithm_type": "CatBoost", "version": "1.0.0", "status": "challenger",
        "model_category": "ML", "serving_path": "both", "created_at": "2026-06-01 10:15:00",
        "hyperparameters": {"depth": 6, "iterations": 100, "learning_rate": 0.15},
        "baselines": {"roc_auc": 0.835, "pr_auc": 0.801, "f1_score": 0.774, "ks_statistic": 0.571, "log_loss": 0.421, "fairness": 0.96},
        "live_metrics": {"roc_auc": 0.835, "pr_auc": 0.801, "f1_score": 0.774, "ks_statistic": 0.571, "log_loss": 0.421, "psi": 0.01, "latency": 22.1, "memory": 82.5, "fairness": 0.96}
    },
    "rf_model_v1.0": {
        "model_id": "rf_model_v1.0", "algorithm_type": "Random Forest", "version": "1.0.0", "status": "challenger",
        "model_category": "ML", "serving_path": "both", "created_at": "2026-06-01 10:30:00",
        "hyperparameters": {"n_estimators": 100, "max_depth": 8},
        "baselines": {"roc_auc": 0.811, "pr_auc": 0.775, "f1_score": 0.741, "ks_statistic": 0.523, "log_loss": 0.455, "fairness": 0.95},
        "live_metrics": {"roc_auc": 0.811, "pr_auc": 0.775, "f1_score": 0.741, "ks_statistic": 0.523, "log_loss": 0.455, "psi": 0.03, "latency": 18.2, "memory": 28.1, "fairness": 0.95}
    },
    "nn_model_v1.0": {
        "model_id": "nn_model_v1.0", "algorithm_type": "Neural Network", "version": "1.0.0", "status": "challenger",
        "model_category": "ML", "serving_path": "both", "created_at": "2026-06-01 10:45:00",
        "hyperparameters": {"hidden_layer_sizes": [64, 32], "max_iter": 500},
        "baselines": {"roc_auc": 0.824, "pr_auc": 0.792, "f1_score": 0.756, "ks_statistic": 0.542, "log_loss": 0.435, "fairness": 0.97},
        "live_metrics": {"roc_auc": 0.824, "pr_auc": 0.792, "f1_score": 0.756, "ks_statistic": 0.542, "log_loss": 0.435, "psi": 0.01, "latency": 32.5, "memory": 115.0, "fairness": 0.97}
    },
    "logreg_model_v1.0": {
        "model_id": "logreg_model_v1.0", "algorithm_type": "Logistic Regression", "version": "1.0.0", "status": "challenger",
        "model_category": "ML", "serving_path": "both", "created_at": "2026-06-01 11:00:00",
        "hyperparameters": {"max_iter": 1000},
        "baselines": {"roc_auc": 0.768, "pr_auc": 0.712, "f1_score": 0.684, "ks_statistic": 0.453, "log_loss": 0.512, "fairness": 0.99},
        "live_metrics": {"roc_auc": 0.768, "pr_auc": 0.712, "f1_score": 0.684, "ks_statistic": 0.453, "log_loss": 0.512, "psi": 0.02, "latency": 6.8, "memory": 15.2, "fairness": 0.99}
    },
    "linreg_model_v1.0": {
        "model_id": "linreg_model_v1.0", "algorithm_type": "Linear Regression", "version": "1.0.0", "status": "challenger",
        "model_category": "ML", "serving_path": "both", "created_at": "2026-06-01 11:15:00",
        "hyperparameters": {},
        "baselines": {"roc_auc": 0.752, "pr_auc": 0.698, "f1_score": 0.652, "ks_statistic": 0.431, "log_loss": 0.531, "fairness": 0.98},
        "live_metrics": {"roc_auc": 0.752, "pr_auc": 0.698, "f1_score": 0.652, "ks_statistic": 0.431, "log_loss": 0.531, "psi": 0.03, "latency": 5.4, "memory": 12.0, "fairness": 0.98}
    },
    "xgb_credit_v2.0": {
        "model_id": "xgb_credit_v2.0", "algorithm_type": "XGBoost", "version": "2.0.0", "status": "migrated",
        "model_category": "ML", "serving_path": "batch", "created_at": "2026-06-15 09:00:00",
        "hyperparameters": {"max_depth": 6, "n_estimators": 150},
        "baselines": {"roc_auc": 0.855, "pr_auc": 0.825, "f1_score": 0.795, "ks_statistic": 0.601, "log_loss": 0.395, "fairness": 0.97},
        "live_metrics": {"roc_auc": 0.855, "pr_auc": 0.825, "f1_score": 0.795, "ks_statistic": 0.601, "log_loss": 0.395, "psi": 0.01, "latency": 17.1, "memory": 48.0, "fairness": 0.97}
    },
    "cat_wealth_v1.5": {
        "model_id": "cat_wealth_v1.5", "algorithm_type": "CatBoost", "version": "1.5.0", "status": "migrated",
        "model_category": "ML", "serving_path": "batch", "created_at": "2026-06-16 11:20:00",
        "hyperparameters": {"depth": 7, "iterations": 150},
        "baselines": {"roc_auc": 0.848, "pr_auc": 0.815, "f1_score": 0.785, "ks_statistic": 0.590, "log_loss": 0.405, "fairness": 0.96},
        "live_metrics": {"roc_auc": 0.848, "pr_auc": 0.815, "f1_score": 0.785, "ks_statistic": 0.590, "log_loss": 0.405, "psi": 0.01, "latency": 24.5, "memory": 85.0, "fairness": 0.96}
    },
    "rf_loans_v2.1": {
        "model_id": "rf_loans_v2.1", "algorithm_type": "Random Forest", "version": "2.1.0", "status": "migrated",
        "model_category": "ML", "serving_path": "batch", "created_at": "2026-06-18 14:10:00",
        "hyperparameters": {"n_estimators": 120, "max_depth": 10},
        "baselines": {"roc_auc": 0.828, "pr_auc": 0.790, "f1_score": 0.760, "ks_statistic": 0.550, "log_loss": 0.430, "fairness": 0.95},
        "live_metrics": {"roc_auc": 0.828, "pr_auc": 0.790, "f1_score": 0.760, "ks_statistic": 0.550, "log_loss": 0.430, "psi": 0.02, "latency": 19.8, "memory": 31.0, "fairness": 0.95}
    },
    "nn_defaulter_v2.0": {
        "model_id": "nn_defaulter_v2.0", "algorithm_type": "Neural Network", "version": "2.0.0", "status": "migrated",
        "model_category": "ML", "serving_path": "batch", "created_at": "2026-06-20 16:30:00",
        "hyperparameters": {"hidden_layer_sizes": [128, 64], "max_iter": 600},
        "baselines": {"roc_auc": 0.838, "pr_auc": 0.805, "f1_score": 0.772, "ks_statistic": 0.565, "log_loss": 0.418, "fairness": 0.98},
        "live_metrics": {"roc_auc": 0.838, "pr_auc": 0.805, "f1_score": 0.772, "ks_statistic": 0.565, "log_loss": 0.418, "psi": 0.01, "latency": 35.0, "memory": 120.0, "fairness": 0.98}
    }
}

# Generate default 20 Rule-Based Model templates
DEFAULT_RULE_MODELS = {
    f"rule_model_m{i+1:02d}": {
        "model_id": f"rule_model_m{i+1:02d}",
        "model_name": name,
        "category": cat,
        "execution_frequency": "Monthly Bucket-Wise",
        "status": "Active" if i < 5 else "Migrated",
        "target_product": prod,
        "rule_config": {
            "logic": logic,
            "conditions": conds
        },
        "performance_summary": {
            "avg_monthly_trigger_rate": round(random.uniform(0.05, 0.35), 4),
            "gini": round(random.uniform(0.45, 0.75), 4),
            "ks_statistic": round(random.uniform(0.35, 0.58), 4),
            "last_monthly_run": "2026-07-01 00:00:00"
        }
    } for i, (name, cat, prod, logic, conds) in enumerate([
        ("High-Income Premium CC Eligibility", "Acquisition", "Credit Card", "AND", [{"feature": "annual_income", "operator": ">=", "value": 100000}, {"feature": "credit_score", "operator": ">=", "value": 750}]),
        ("Delinquency 30+ DPD Hard Stop Filter", "Risk Control", "Retail Loans", "AND", [{"feature": "payment_delay_days", "operator": ">=", "value": 30}]),
        ("Affluent Wealth Cross-Sell Trigger", "Cross-Sell", "Mutual Funds", "AND", [{"feature": "fixed_deposit_balance", "operator": ">=", "value": 250000}, {"feature": "equity_portfolio_value", "operator": ">=", "value": 100000}]),
        ("Low Utilization CC Line Increase", "Portfolio Mgt", "Credit Card", "AND", [{"feature": "average_utilization", "operator": "<=", "value": 0.25}, {"feature": "payment_delay_days", "operator": "==", "value": 0}]),
        ("High Debt Burden Loan Rejection", "Risk Control", "Retail Loans", "AND", [{"feature": "active_loans_count", "operator": ">=", "value": 3}, {"feature": "monthly_loan_emi", "operator": ">=", "value": 45000}]),
        ("Young Professional Entry CC Rule", "Acquisition", "Credit Card", "AND", [{"feature": "age", "operator": ">=", "value": 21}, {"feature": "age", "operator": "<=", "value": 30}, {"feature": "annual_income", "operator": ">=", "value": 40000}]),
        ("Senior Citizen High FD Loyalty Rule", "Retention", "Mutual Funds", "AND", [{"feature": "age", "operator": ">=", "value": 60}, {"feature": "fixed_deposit_balance", "operator": ">=", "value": 500000}]),
        ("Moderate DPD Pre-Emptive Warning Rule", "Collections", "Credit Card", "AND", [{"feature": "payment_delay_days", "operator": ">=", "value": 10}, {"feature": "payment_delay_days", "operator": "<", "value": 30}]),
        ("Prime Credit Loan Rate Discount Rule", "Pricing", "Retail Loans", "AND", [{"feature": "credit_score", "operator": ">=", "value": 800}, {"feature": "total_outstanding_loan", "operator": "<=", "value": 200000}]),
        ("SIP Investor Equity Upgrade Trigger", "Cross-Sell", "Mutual Funds", "AND", [{"feature": "monthly_sip_amount", "operator": ">=", "value": 5000}, {"feature": "mutual_fund_holdings", "operator": ">=", "value": 50000}]),
        ("Zero Activity Card Inactivity Alert", "Retention", "Credit Card", "AND", [{"feature": "monthly_spend", "operator": "==", "value": 0}, {"feature": "average_utilization", "operator": "==", "value": 0}]),
        ("Multi-Loan High EMI Risk Watchlist", "Risk Control", "Retail Loans", "AND", [{"feature": "active_loans_count", "operator": ">=", "value": 4}]),
        ("High Balance FD to SIP Conversion", "Cross-Sell", "Mutual Funds", "AND", [{"feature": "fixed_deposit_balance", "operator": ">=", "value": 300000}, {"feature": "monthly_sip_amount", "operator": "==", "value": 0}]),
        ("Super Prime Top-Tier CC Approval", "Acquisition", "Credit Card", "AND", [{"feature": "credit_score", "operator": ">=", "value": 820}, {"feature": "annual_income", "operator": ">=", "value": 150000}]),
        ("Severe Delinquency 60+ DPD Action", "Collections", "Credit Card", "AND", [{"feature": "payment_delay_days", "operator": ">=", "value": 60}]),
        ("Salary Account Loan Pre-Approval", "Acquisition", "Retail Loans", "AND", [{"feature": "annual_income", "operator": ">=", "value": 60000}, {"feature": "credit_score", "operator": ">=", "value": 720}]),
        ("Aggressive Investor Risk Profile Match", "Product Matching", "Mutual Funds", "AND", [{"feature": "equity_portfolio_value", "operator": ">=", "value": 200000}]),
        ("High Spend Card Upgrade Eligibility", "Portfolio Mgt", "Credit Card", "AND", [{"feature": "monthly_spend", "operator": ">=", "value": 35000}, {"feature": "credit_score", "operator": ">=", "value": 740}]),
        ("Over-Leveraged Customer Credit Freeze", "Risk Control", "Retail Loans", "AND", [{"feature": "average_utilization", "operator": ">=", "value": 0.90}]),
        ("Starter SIP Micro-Investment Campaign", "Acquisition", "Mutual Funds", "AND", [{"feature": "age", "operator": "<=", "value": 28}, {"feature": "monthly_sip_amount", "operator": "==", "value": 0}])
    ])
}

DEFAULT_REGISTRY = {
    "settings": {
        "failover_mode": "manual",
        "drift_threshold_psi": 0.25,
        "performance_threshold_auc": 0.75
    },
    "active_routing": {
        "champion_id": "xgb_model_v1.0"
    },
    "models": DEFAULT_ML_MODELS,
    "rule_models": DEFAULT_RULE_MODELS,
    "audit_log": [
        {
            "timestamp": "2026-06-01 11:30:00",
            "triggered_by": "system_init",
            "action": "Framework migration initialized with 10 ML Models and 20 Rule Models.",
            "evidence": "Baseline AUC validation scores loaded.",
            "approved_by": "ds_lead"
        }
    ]
}

def load_registry() -> dict:
    if not os.path.exists(REGISTRY_PATH):
        save_registry(DEFAULT_REGISTRY)
        return DEFAULT_REGISTRY
    try:
        with open(REGISTRY_PATH, "r") as f:
            data = json.load(f)
            # Ensure rule_models key exists
            if "rule_models" not in data:
                data["rule_models"] = DEFAULT_RULE_MODELS
                save_registry(data)
            return data
    except Exception as e:
        print(f"Error loading registry, reverting to default: {e}")
        return DEFAULT_REGISTRY

def save_registry(data: dict):
    try:
        with open(REGISTRY_PATH, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving registry: {e}")

def get_all_models() -> dict:
    registry = load_registry()
    return registry.get("models", {})

def get_active_champion_id() -> str:
    registry = load_registry()
    return registry["active_routing"]["champion_id"]

def set_active_champion_id(model_id: str):
    registry = load_registry()
    registry["active_routing"]["champion_id"] = model_id
    for mid, mdata in registry["models"].items():
        if mid == model_id:
            mdata["status"] = "champion"
        elif mdata["status"] == "champion":
            mdata["status"] = "challenger"
    save_registry(registry)

def get_failover_mode() -> str:
    registry = load_registry()
    return registry["settings"]["failover_mode"]

def set_failover_mode(mode: str):
    if mode not in ["automatic", "manual"]:
        raise ValueError("Invalid failover mode")
    registry = load_registry()
    registry["settings"]["failover_mode"] = mode
    save_registry(registry)

def log_audit(triggered_by: str, action: str, evidence: str, approved_by: str = None):
    registry = load_registry()
    registry["audit_log"].append({
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "triggered_by": triggered_by,
        "action": action,
        "evidence": evidence,
        "approved_by": approved_by or "system"
    })
    save_registry(registry)

def import_migration_manifest(manifest_data: dict) -> dict:
    """Imports a bulk migration manifest containing ML and Rule-based models."""
    registry = load_registry()
    imported_ml = 0
    imported_rules = 0
    
    if "models" in manifest_data:
        for mid, mdata in manifest_data["models"].items():
            registry["models"][mid] = mdata
            imported_ml += 1
            
    if "rule_models" in manifest_data:
        for rid, rdata in manifest_data["rule_models"].items():
            registry["rule_models"][rid] = rdata
            imported_rules += 1
            
    save_registry(registry)
    log_audit("migration_studio", f"Migrated {imported_ml} ML models and {imported_rules} Rule models.", "Manifest import complete.")
    return {"status": "success", "imported_ml": imported_ml, "imported_rules": imported_rules}

def run_uat_suite(target_id: str = None) -> list:
    """Executes automated UAT assertion tests against registered ML and Rule-based models."""
    registry = load_registry()
    uat_results = []
    
    # Run ML Model UAT assertions
    ml_models = registry.get("models", {})
    for mid, mdata in ml_models.items():
        if target_id and target_id != mid and target_id != "all":
            continue
        auc = mdata.get("baselines", {}).get("roc_auc", 0.80)
        latency = mdata.get("live_metrics", {}).get("latency", 15.0)
        
        passed = (auc >= 0.70) and (latency <= 50.0)
        uat_results.append({
            "model_id": mid,
            "type": "ML Model",
            "algorithm_or_rule": mdata.get("algorithm_type", "ML"),
            "assertion_check": "ROC-AUC >= 0.70 & Latency <= 50ms",
            "metric_value": f"AUC: {auc:.4f}, Latency: {latency:.1f}ms",
            "status": "PASS" if passed else "FAIL"
        })
        
    # Run Rule Model UAT assertions
    rule_models = registry.get("rule_models", {})
    for rid, rdata in rule_models.items():
        if target_id and target_id != rid and target_id != "all":
            continue
        conds = rdata.get("rule_config", {}).get("conditions", [])
        gini = rdata.get("performance_summary", {}).get("gini", 0.50)
        
        passed = (len(conds) > 0) and (gini >= 0.40)
        uat_results.append({
            "model_id": rid,
            "type": "Rule-Based Model",
            "algorithm_or_rule": rdata.get("model_name", "Rule"),
            "assertion_check": "Valid Logic & Gini >= 0.40",
            "metric_value": f"Conditions: {len(conds)}, Gini: {gini:.4f}",
            "status": "PASS" if passed else "FAIL"
        })
        
    return uat_results
