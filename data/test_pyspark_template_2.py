from pyspark.sql import SparkSession
from pyspark.sql.functions import col, when, coalesce, lit

def select_and_engineer_features(spark_session: SparkSession, input_table_name: str) -> pyspark.sql.DataFrame:
    """
    Custom Feature Selection and Processing Pipeline
    
    Inputs:
        spark_session: The active Spark session
        input_table_name: Name of the raw demographics/financial hive table or view
        
    Outputs:
        Returns a Spark DataFrame with selected, treated, and engineered features.
    """
    # 1. Load the active cohort
    df = spark_session.table(input_table_name)
    
    # 2. Apply Base Demographic Filters (Matches Step 1 of UI)
    filtered_df = df.filter(
        (col("age") >= 18) & (col("age") <= 85) &
        (col("annual_income") >= 1000000) &
        (col("credit_score") >= 300)
    )
    
    # 3. Custom Feature Imputation
    # Treat null values in payment delays and active loan counts
    treated_df = filtered_df.withColumn(
        "payment_delay_days", coalesce(col("payment_delay_days"), lit(0))
    ).withColumn(
        "active_loans_count", coalesce(col("active_loans_count"), lit(0))
    )
    
    # 4. Feature Engineering (Custom Column Creation)
    # Calculate Total Portfolio Value by summing mutual funds, equity, and FD balances
    engineered_df = treated_df.withColumn(
        "total_investment_value",
        col("mutual_fund_holdings") + col("equity_portfolio_value") + col("fixed_deposit_balance")
    ).withColumn(
        "debt_to_income_ratio",
        (col("monthly_loan_emi") * 12) / when(col("annual_income") > 0, col("annual_income")).otherwise(1.0)
    )
    
    # 5. Feature Selection
    # Explicitly select only the variables required for Model Training (Step 4)
    selected_features = [
        "age",
        "annual_income",
        "credit_score",
        "credit_limit",
        "average_utilization",
        "payment_delay_days",
        "total_investment_value",
        "debt_to_income_ratio",
        "monthly_sip_amount"
    ]
    
    final_features_df = engineered_df.select(*selected_features)
    
    return final_features_df
