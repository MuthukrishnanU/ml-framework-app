from backend.algorithms.base import UnifiedModelWrapper
from backend.algorithms.linear_regression import LinearRegressionWrapper
from backend.algorithms.logistic_regression import LogisticRegressionWrapper
from backend.algorithms.xgboost_model import XGBoostWrapper
from backend.algorithms.catboost_model import CatBoostWrapper
from backend.algorithms.random_forest import RandomForestWrapper
from backend.algorithms.neural_network import NeuralNetworkWrapper

ALL_ALGORITHMS = {
    "Linear Regression": LinearRegressionWrapper,
    "Logistic Regression": LogisticRegressionWrapper,
    "XGBoost": XGBoostWrapper,
    "CatBoost": CatBoostWrapper,
    "Random Forest": RandomForestWrapper,
    "Neural Network": NeuralNetworkWrapper
}

def create_model_wrapper(algorithm_type: str, model_id: str) -> UnifiedModelWrapper:
    """Helper factory function to dynamically initialize wrappers."""
    if algorithm_type not in ALL_ALGORITHMS:
        raise ValueError(f"Unknown algorithm type: {algorithm_type}")
    return ALL_ALGORITHMS[algorithm_type](model_id)
