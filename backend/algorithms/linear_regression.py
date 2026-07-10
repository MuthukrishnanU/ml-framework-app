import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from backend.algorithms.base import UnifiedModelWrapper

FEATURES = [
    "age", "annual_income", "credit_score", "credit_limit", "monthly_spend",
    "average_utilization", "payment_delay_days", "active_loans_count",
    "total_outstanding_loan", "average_interest_rate", "monthly_loan_emi",
    "mutual_fund_holdings", "equity_portfolio_value", "fixed_deposit_balance",
    "monthly_sip_amount"
]

class LinearRegressionWrapper(UnifiedModelWrapper):
    """Wrapper for Linear Regression classification."""
    
    def __init__(self, model_id: str, features: list = None):
        super().__init__(model_id, "Linear Regression", features=features or FEATURES)
        self.model = LinearRegression()
        
    def train(self, df: pd.DataFrame, target_col: str):
        X = df[self.features].fillna(0).to_numpy()
        y = df[target_col].to_numpy()
        self.model.fit(X, y)
        self.is_trained = True
        
    def predict(self, df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        X = df[self.features].fillna(0).to_numpy()
        probs = self.model.predict(X)
        probs = np.clip(probs, 0.0, 1.0)
        labels = (probs >= 0.55).astype(int)
        return probs, labels
        
    def explain(self, df: pd.DataFrame) -> np.ndarray:
        # Approximate explanations using model coefficients
        X = df[self.features].fillna(0).to_numpy()
        coefs = self.model.coef_
        # element-wise multiplication represents the feature impact
        impact = X * coefs
        
        # Sort features by absolute impact and return the top 3 values for each row
        explanations = []
        for i in range(len(X)):
            row_impact = impact[i]
            sorted_indices = np.argsort(np.abs(row_impact))[::-1]
            # Get values of top 3 features (credit_score index 2, income index 1, delay index 6)
            # To keep representation simple, we return the values of the top 3 feature impact numbers
            explanations.append([row_impact[sorted_indices[0]], row_impact[sorted_indices[1]], row_impact[sorted_indices[2]]])
            
        return np.array(explanations)
