import numpy as np
from scipy.stats import ks_2samp

def calculate_psi(expected: np.ndarray, actual: np.ndarray, num_bins: int = 10) -> float:
    """Calculates the Population Stability Index (PSI) between expected and actual distributions.
    
    expected: baseline probabilities (from training)
    actual: live prediction probabilities
    """
    if len(expected) == 0 or len(actual) == 0:
        return 0.0
        
    # Set up fixed bin boundaries between 0.0 and 1.0
    bins = np.linspace(0.0, 1.0, num_bins + 1)
    
    # Calculate counts in each bin
    expected_counts, _ = np.histogram(expected, bins=bins)
    actual_counts, _ = np.histogram(actual, bins=bins)
    
    # Convert counts to percentages
    expected_pcts = expected_counts / len(expected)
    actual_pcts = actual_counts / len(actual)
    
    # Smooth zero percentages using a small epsilon to avoid log(0) or division by zero
    epsilon = 0.0001
    expected_pcts = np.where(expected_pcts == 0, epsilon, expected_pcts)
    actual_pcts = np.where(actual_pcts == 0, epsilon, actual_pcts)
    
    # Recalculate sums to ensure percentages sum to 1.0 (normalization)
    expected_pcts = expected_pcts / np.sum(expected_pcts)
    actual_pcts = actual_pcts / np.sum(actual_pcts)
    
    # Calculate PSI
    psi_value = np.sum((actual_pcts - expected_pcts) * np.log(actual_pcts / expected_pcts))
    
    return round(float(psi_value), 4)

def calculate_ks_distance(expected: np.ndarray, actual: np.ndarray) -> float:
    """Calculates the Kolmogorov-Smirnov statistic distance between two distributions."""
    if len(expected) == 0 or len(actual) == 0:
        return 0.0
    try:
        statistic = ks_2samp(expected, actual).statistic
        return round(float(statistic), 4)
    except Exception:
        return 0.0
