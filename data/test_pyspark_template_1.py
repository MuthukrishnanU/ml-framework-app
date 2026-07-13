from pyspark.sql import SparkSession
from pyspark.sql.functions import col

def feature_selection_pipeline(spark_session: SparkSession, input_table: str) -> pyspark.sql.DataFrame:
    """
    Step 2: Feature Selection Pipeline
    
    This function selects the 15 active demographic and financial features checked 
    in the ML Pipeline Studio UI.
    
    Inputs:
        spark_session: The active Spark Session
        input_table: Name of the active cohort table or view
        
    Outputs:
        Spark DataFrame containing only the selected features.
    """
    # 1. Load the active cohort dataset
    cohort_df = spark_session.table(input_table)
    
    # 2. Define the exact columns checked in the Feature Store Variable Selector
    selected_columns = [
        # --- DEMOGRAPHICS ---
        "age",                     # Customer Age
        "annual_income",           # Annual Income
        "credit_score",            # Credit Score
        
        # --- CREDIT CARD HISTORY ---
        "credit_limit",            # Credit Limit
        "monthly_spend",           # Monthly Spend
        "average_utilization",     # Utilization Ratio
        "payment_delay_days",      # Payment Delays
        
        # --- LOAN DETAILS ---
        "active_loans_count",      # Active Loans
        "total_outstanding_loan",  # Outstanding Loan
        "average_interest_rate",   # Interest Rate
        "monthly_loan_emi",        # Monthly EMI
        
        # --- INVESTMENT PROFILES ---
        "mutual_fund_holdings",    # Mutual Funds
        "equity_portfolio_value",  # Equity Value
        "fixed_deposit_balance",   # FD Balance
        "monthly_sip_amount"       # SIP Amount
    ]
    
    # 3. Project the DataFrame to return only the selected features
    selected_features_df = cohort_df.select(*selected_columns)
    
    return selected_features_df
