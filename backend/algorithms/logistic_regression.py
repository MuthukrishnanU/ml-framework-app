import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from backend.algorithms.base import UnifiedModelWrapper

FEATURES = [
    "age", "annual_income", "credit_score", "credit_limit", "monthly_spend",
    "average_utilization", "payment_delay_days", "active_loans_count",
    "total_outstanding_loan", "average_interest_rate", "monthly_loan_emi",
    "mutual_fund_holdings", "equity_portfolio_value", "fixed_deposit_balance",
    "monthly_sip_amount"
]

class LogisticRegressionWrapper(UnifiedModelWrapper):
    """Wrapper for Logistic Regression classification using feature scaling."""
    
    def __init__(self, model_id: str):
        super().__init__(model_id, "Logistic Regression")
        # Use pipeline to scale inputs before model fitting
        self.model = make_pipeline(
            StandardScaler(),
            LogisticRegression(max_iter=1000)
        )
        
    def train(self, df: pd.DataFrame, target_col: str):
        X = df[FEATURES].fillna(0).to_numpy()
        y = df[target_col].to_numpy()
        
        if len(np.unique(y)) < 2:
            y = y.copy()
            y[0] = 1 - y[0]
            
        self.model.fit(X, y)
        self.is_trained = True
        
    def predict(self, df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        X = df[FEATURES].fillna(0).to_numpy()
        probs = self.model.predict_proba(X)[:, 1]
        labels = (probs >= 0.55).astype(int)
        return probs, labels
        
    def explain(self, df: pd.DataFrame) -> np.ndarray:
        X = df[FEATURES].fillna(0).to_numpy()
        # Retrieve the coefficients from the logisticregression step in the pipeline
        coefs = self.model.named_steps["logisticregression"].coef_[0]
        impact = X * coefs
        
        explanations = []
        for i in range(len(X)):
            row_impact = impact[i]
            sorted_indices = np.argsort(np.abs(row_impact))[::-1]
            explanations.append([row_impact[sorted_indices[0]], row_impact[sorted_indices[1]], row_impact[sorted_indices[2]]])
            
        return np.array(explanations)
