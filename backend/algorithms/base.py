import abc
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score, average_precision_score, f1_score, log_loss
from scipy.stats import ks_2samp

class UnifiedModelWrapper(abc.ABC):
    """Abstract base class defining the standard interface for all 6 candidate algorithms."""
    
    def __init__(self, model_id: str, algorithm_type: str, features: list = None):
        self.model_id = model_id
        self.algorithm_type = algorithm_type
        self.is_trained = False
        self.features = features
        
    @abc.abstractmethod
    def train(self, df: pd.DataFrame, target_col: str):
        """Trains the model on the provided DataFrame."""
        pass
        
    @abc.abstractmethod
    def predict(self, df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        """Calculates predictions.
        
        Returns:
            Tuple of (probabilities, binary_labels)
        """
        pass
        
    def evaluate(self, df: pd.DataFrame, target_col: str) -> dict:
        """Computes evaluation metrics using the standard classifier evaluations."""
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in dataframe.")
            
        y_true = df[target_col].to_numpy()
        # Ensure target labels are binary (0 and 1)
        # Drop rows where target is pending (-1)
        valid_idx = y_true != -1
        if not np.any(valid_idx):
            return {"roc_auc": 0.5, "pr_auc": 0.5, "f1_score": 0.0, "log_loss": 0.693, "ks_statistic": 0.0}
            
        y_true = y_true[valid_idx]
        df_valid = df.iloc[np.where(valid_idx)[0]]
        
        y_prob, y_pred = self.predict(df_valid)
        
        # Calculate metrics
        try:
            roc_auc = roc_auc_score(y_true, y_prob)
        except Exception:
            roc_auc = 0.5
            
        try:
            pr_auc = average_precision_score(y_true, y_prob)
        except Exception:
            pr_auc = 0.5
            
        try:
            f1 = f1_score(y_true, y_pred, zero_division=0)
        except Exception:
            f1 = 0.0
            
        try:
            loss = log_loss(y_true, y_prob, labels=[0, 1])
        except Exception:
            loss = 0.693
            
        try:
            pos_probs = y_prob[y_true == 1]
            neg_probs = y_prob[y_true == 0]
            if len(pos_probs) > 0 and len(neg_probs) > 0:
                ks = ks_2samp(pos_probs, neg_probs).statistic
            else:
                ks = 0.0
        except Exception:
            ks = 0.0
            
        def clean_val(val, default):
            if val is None or pd.isnull(val) or np.isnan(val) or np.isinf(val):
                return default
            return round(float(val), 4)

        return {
            "roc_auc": clean_val(roc_auc, 0.5),
            "pr_auc": clean_val(pr_auc, 0.5),
            "f1_score": clean_val(f1, 0.0),
            "log_loss": clean_val(loss, 0.693),
            "ks_statistic": clean_val(ks, 0.0)
        }

    @abc.abstractmethod
    def explain(self, df: pd.DataFrame) -> np.ndarray:
        """Generates per-prediction explanation values (SHAP or feature contributions).
        
        Returns:
            An array of shape (N, 3) representing the top 3 feature impact coefficients.
        """
        pass

    def check_fairness(self, df: pd.DataFrame, predicted_labels: np.ndarray, 
                       protected_col: str = "gender", 
                       privileged_group: str = "Male", 
                       unprivileged_group: str = "Female") -> float:
        """Calculates the Adverse Impact Ratio (Disparate Impact Ratio).
        
        Ratio = Selection Rate of Unprivileged / Selection Rate of Privileged
        """
        if protected_col not in df.columns:
            return 1.0
            
        temp_df = df.copy()
        temp_df['pred_label'] = predicted_labels
        
        priv_sub = temp_df[temp_df[protected_col] == privileged_group]
        unpriv_sub = temp_df[temp_df[protected_col] == unprivileged_group]
        
        if len(priv_sub) == 0 or len(unpriv_sub) == 0:
            return 1.0
            
        priv_selection_rate = np.mean(priv_sub['pred_label'] == 1)
        unpriv_selection_rate = np.mean(unpriv_sub['pred_label'] == 1)
        
        if priv_selection_rate == 0:
            return 1.0
            
        impact_ratio = unpriv_selection_rate / priv_selection_rate
        if np.isnan(impact_ratio) or np.isinf(impact_ratio):
            return 1.0
        return round(float(impact_ratio), 4)
