import os
import json
from datetime import datetime

REGISTRY_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "model_registry.json"))

DEFAULT_REGISTRY = {
    "settings": {
        "failover_mode": "manual",  # "automatic" or "manual"
        "drift_threshold_psi": 0.25,
        "performance_threshold_auc": 0.75
    },
    "active_routing": {
        "champion_id": "xgb_model_v1.0"
    },
    "models": {
        "xgb_model_v1.0": {
            "model_id": "xgb_model_v1.0",
            "algorithm_type": "XGBoost",
            "version": "1.0.0",
            "status": "champion",  # champion, challenger, retired
            "serving_path": "both",  # batch, real_time, both
            "created_at": "2026-06-01 10:00:00",
            "hyperparameters": {"max_depth": 5, "n_estimators": 100, "learning_rate": 0.1},
            "baselines": {"roc_auc": 0.842, "pr_auc": 0.812, "f1_score": 0.781, "ks_statistic": 0.584, "log_loss": 0.412, "fairness": 0.98},
            "live_metrics": {"roc_auc": 0.842, "pr_auc": 0.812, "f1_score": 0.781, "ks_statistic": 0.584, "log_loss": 0.412, "psi": 0.02, "latency": 15.4, "memory": 45.0, "fairness": 0.98}
        },
        "cat_model_v1.0": {
            "model_id": "cat_model_v1.0",
            "algorithm_type": "CatBoost",
            "version": "1.0.0",
            "status": "challenger",
            "serving_path": "both",
            "created_at": "2026-06-01 10:15:00",
            "hyperparameters": {"depth": 6, "iterations": 100, "learning_rate": 0.15},
            "baselines": {"roc_auc": 0.835, "pr_auc": 0.801, "f1_score": 0.774, "ks_statistic": 0.571, "log_loss": 0.421, "fairness": 0.96},
            "live_metrics": {"roc_auc": 0.835, "pr_auc": 0.801, "f1_score": 0.774, "ks_statistic": 0.571, "log_loss": 0.421, "psi": 0.01, "latency": 22.1, "memory": 82.5, "fairness": 0.96}
        },
        "rf_model_v1.0": {
            "model_id": "rf_model_v1.0",
            "algorithm_type": "Random Forest",
            "version": "1.0.0",
            "status": "challenger",
            "serving_path": "both",
            "created_at": "2026-06-01 10:30:00",
            "hyperparameters": {"n_estimators": 100, "max_depth": 8},
            "baselines": {"roc_auc": 0.811, "pr_auc": 0.775, "f1_score": 0.741, "ks_statistic": 0.523, "log_loss": 0.455, "fairness": 0.95},
            "live_metrics": {"roc_auc": 0.811, "pr_auc": 0.775, "f1_score": 0.741, "ks_statistic": 0.523, "log_loss": 0.455, "psi": 0.03, "latency": 18.2, "memory": 28.1, "fairness": 0.95}
        },
        "nn_model_v1.0": {
            "model_id": "nn_model_v1.0",
            "algorithm_type": "Neural Network",
            "version": "1.0.0",
            "status": "challenger",
            "serving_path": "both",
            "created_at": "2026-06-01 10:45:00",
            "hyperparameters": {"hidden_layer_sizes": [64, 32], "max_iter": 500},
            "baselines": {"roc_auc": 0.824, "pr_auc": 0.792, "f1_score": 0.756, "ks_statistic": 0.542, "log_loss": 0.435, "fairness": 0.97},
            "live_metrics": {"roc_auc": 0.824, "pr_auc": 0.792, "f1_score": 0.756, "ks_statistic": 0.542, "log_loss": 0.435, "psi": 0.01, "latency": 32.5, "memory": 115.0, "fairness": 0.97}
        },
        "logreg_model_v1.0": {
            "model_id": "logreg_model_v1.0",
            "algorithm_type": "Logistic Regression",
            "version": "1.0.0",
            "status": "challenger",
            "serving_path": "both",
            "created_at": "2026-06-01 11:00:00",
            "hyperparameters": {"max_iter": 1000},
            "baselines": {"roc_auc": 0.768, "pr_auc": 0.712, "f1_score": 0.684, "ks_statistic": 0.453, "log_loss": 0.512, "fairness": 0.99},
            "live_metrics": {"roc_auc": 0.768, "pr_auc": 0.712, "f1_score": 0.684, "ks_statistic": 0.453, "log_loss": 0.512, "psi": 0.02, "latency": 6.8, "memory": 15.2, "fairness": 0.99}
        },
        "linreg_model_v1.0": {
            "model_id": "linreg_model_v1.0",
            "algorithm_type": "Linear Regression",
            "version": "1.0.0",
            "status": "challenger",
            "serving_path": "both",
            "created_at": "2026-06-01 11:15:00",
            "hyperparameters": {},
            "baselines": {"roc_auc": 0.752, "pr_auc": 0.698, "f1_score": 0.652, "ks_statistic": 0.431, "log_loss": 0.531, "fairness": 0.98},
            "live_metrics": {"roc_auc": 0.752, "pr_auc": 0.698, "f1_score": 0.652, "ks_statistic": 0.431, "log_loss": 0.531, "psi": 0.03, "latency": 5.4, "memory": 12.0, "fairness": 0.98}
        }
    },
    "audit_log": [
        {
            "timestamp": "2026-06-01 11:30:00",
            "triggered_by": "system_init",
            "action": "Model registration completed for 6 candidates.",
            "evidence": "Baseline AUC validation scores loaded.",
            "approved_by": "ds_lead"
        },
        {
            "timestamp": "2026-06-01 11:31:00",
            "triggered_by": "system_init",
            "action": "Route set to xgb_model_v1.0 as active Champion.",
            "evidence": "XGBoost baseline ROC-AUC of 0.842 outranked other models.",
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
            return json.load(f)
    except Exception as e:
        print(f"Error loading registry, reverting to default: {e}")
        return DEFAULT_REGISTRY

def save_registry(data: dict):
    try:
        with open(REGISTRY_PATH, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving registry: {e}")

def get_active_champion_id() -> str:
    registry = load_registry()
    return registry["active_routing"]["champion_id"]

def set_active_champion_id(model_id: str):
    registry = load_registry()
    registry["active_routing"]["champion_id"] = model_id
    # update statuses
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

def get_all_models() -> dict:
    registry = load_registry()
    return registry["models"]
