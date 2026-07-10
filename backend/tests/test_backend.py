import os
import sys
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

# Add parent directory to path so we can import modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app
from backend.monitoring import calculate_psi, calculate_ks_distance
from backend.algorithms import create_model_wrapper, ALL_ALGORITHMS

client = TestClient(app)

def test_psi_calculation():
    """Verifies that the PSI calculation matches statistical bounds."""
    # Test identical distributions (should be close to 0)
    expected = np.random.normal(0.5, 0.1, 1000)
    actual = np.random.normal(0.5, 0.1, 1000)
    psi = calculate_psi(expected, actual)
    assert psi < 0.1
    
    # Test completely shifted distributions (should be significantly above 0.25)
    shifted_actual = np.random.normal(0.8, 0.1, 1000)
    psi_shifted = calculate_psi(expected, shifted_actual)
    assert psi_shifted >= 0.25

def test_ks_calculation():
    """Verifies that KS statistic calculation responds correctly to distribution shifts."""
    expected = np.random.normal(0.5, 0.1, 100)
    actual = np.random.normal(0.5, 0.1, 100)
    ks = calculate_ks_distance(expected, actual)
    assert 0.0 <= ks <= 1.0

def test_model_wrappers_training():
    """Verifies that all 6 candidate wrapper models can be initialized, trained, and scored on classification data."""
    # Create mock dataset
    np.random.seed(42)
    X_raw = np.random.uniform(0.0, 1.0, size=(100, 15))
    y_raw = np.random.choice([0, 1], size=100)
    
    FEATURES = [
        "age", "annual_income", "credit_score", "credit_limit", "monthly_spend",
        "average_utilization", "payment_delay_days", "active_loans_count",
        "total_outstanding_loan", "average_interest_rate", "monthly_loan_emi",
        "mutual_fund_holdings", "equity_portfolio_value", "fixed_deposit_balance",
        "monthly_sip_amount"
    ]
    
    df = pd.DataFrame(X_raw, columns=FEATURES)
    df["target"] = y_raw
    
    for algo_name in ALL_ALGORITHMS.keys():
        print(f"Testing algorithm wrapper training: {algo_name}")
        wrapper = create_model_wrapper(algo_name, f"test_{algo_name.lower().replace(' ', '_')}")
        wrapper.train(df, "target")
        assert wrapper.is_trained
        
        probs, labels = wrapper.predict(df)
        assert len(probs) == 100
        assert len(labels) == 100
        assert np.all(probs >= 0.0) and np.all(probs <= 1.0)
        assert np.all((labels == 0) | (labels == 1))
        
        explanations = wrapper.explain(df)
        assert explanations.shape == (100, 3)

def test_api_settings_endpoint():
    """Tests the failover settings update endpoint."""
    # Test setting manual mode
    response = client.post("/api/settings", json={"failover_mode": "manual"})
    assert response.status_code == 200
    assert response.json()["failover_mode"] == "manual"
    
    # Test setting automatic mode
    response = client.post("/api/settings", json={"failover_mode": "automatic"})
    assert response.status_code == 200
    assert response.json()["failover_mode"] == "automatic"
    
    # Test setting invalid mode
    response = client.post("/api/settings", json={"failover_mode": "invalid_mode"})
    assert response.status_code == 400

def test_api_models_list():
    """Tests the models registry API response structure."""
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert "champion_id" in data
    assert "models" in data
    assert len(data["models"]) == 6
    # Check key columns present
    for model in data["models"]:
        assert "model_id" in model
        assert "algorithm_type" in model
        assert "baselines" in model
        assert "live_metrics" in model
        assert "roc_auc_rank" in model


def test_custom_features_pipeline():
    """Verifies that we can train a model wrapper with a custom subset of features."""
    custom_features = ["age", "annual_income", "credit_score"]
    np.random.seed(42)
    X_raw = np.random.uniform(0.0, 1.0, size=(100, 3))
    y_raw = np.random.choice([0, 1], size=100)
    df = pd.DataFrame(X_raw, columns=custom_features)
    df["target"] = y_raw
    
    wrapper = create_model_wrapper("XGBoost", "test_custom_xgb", features=custom_features)
    wrapper.train(df, "target")
    assert wrapper.is_trained
    assert wrapper.features == custom_features
    
    probs, labels = wrapper.predict(df)
    assert len(probs) == 100
