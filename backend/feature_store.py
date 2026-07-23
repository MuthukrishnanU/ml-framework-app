import json
import re
import pandas as pd
from typing import Dict, Any, List
from backend.db import get_db_connection, release_db_connection

class FeatureStoreManager:
    """Manages Feature Store connections and template-driven SQL query generation."""
    
    DEFAULT_CONNECTORS = [
        {
            "connector_id": "conn_neon_pg",
            "name": "Neon Core Postgres Store",
            "store_type": "PostgreSQL",
            "host": "ep-cool-fog-123456.us-east-2.aws.neon.tech",
            "database": "neondb",
            "status": "Connected",
            "tables": ["demographics", "credit_card_history", "loan_details", "investment_profiles"]
        },
        {
            "connector_id": "conn_snowflake_prod",
            "name": "Snowflake Enterprise Feature Vault",
            "store_type": "Snowflake",
            "host": "xy12345.us-east-1.snowflakecomputing.com",
            "database": "FEATURE_STORE_DB",
            "status": "Connected",
            "tables": ["FS_CUSTOMER_360", "FS_TRANSACTIONS_MONTHLY", "FS_CREDIT_BUREAU"]
        },
        {
            "connector_id": "conn_feast_local",
            "name": "Feast Offline & Online Store",
            "store_type": "Feast",
            "host": "feast.internal.bank.com:6566",
            "database": "feast_registry",
            "status": "Connected",
            "tables": ["customer_hourly_stats", "card_velocity_features"]
        }
    ]

    DEFAULT_TEMPLATES = [
        {
            "template_id": "tmpl_std_customer_360",
            "name": "Standard Customer 360 Feature Pull",
            "description": "Joins demographics, credit card utilization, active loans, and investment portfolios.",
            "sql_template": """SELECT 
    d.customer_id, d.age, d.annual_income, d.credit_score,
    c.credit_limit, c.monthly_spend, c.average_utilization, c.payment_delay_days,
    l.active_loans_count, l.total_outstanding_loan, l.monthly_loan_emi,
    i.mutual_fund_holdings, i.equity_portfolio_value, i.fixed_deposit_balance
FROM demographics d
LEFT JOIN credit_card_history c ON d.customer_id = c.customer_id
LEFT JOIN loan_details l ON d.customer_id = l.customer_id
LEFT JOIN investment_profiles i ON d.customer_id = i.customer_id
WHERE {{COHORT_FILTERS}}
ORDER BY d.customer_id;"""
        },
        {
            "template_id": "tmpl_delinquency_risk",
            "name": "Delinquency & Credit Risk Feature Extraction",
            "description": "Extracts credit utilization, late payment flags, loan EMI burden, and liquidity buffers.",
            "sql_template": """SELECT 
    d.customer_id, d.credit_score, d.annual_income,
    c.average_utilization, c.payment_delay_days, c.late_payment_flag,
    l.active_loans_count, l.monthly_loan_emi,
    (c.monthly_spend * 12.0 / NULLIF(d.annual_income, 0)) AS spend_to_income_ratio,
    (l.monthly_loan_emi * 12.0 / NULLIF(d.annual_income, 0)) AS debt_burden_ratio
FROM demographics d
JOIN credit_card_history c ON d.customer_id = c.customer_id
JOIN loan_details l ON d.customer_id = l.customer_id
WHERE {{COHORT_FILTERS}};"""
        }
    ]

    @classmethod
    def compile_template_sql(cls, template_sql: str, filters: Dict[str, Any], selected_features: List[str] = None) -> str:
        """Fills dynamic template placeholders with filter logic and feature column selections."""
        where_clauses = ["1=1"]
        
        if filters:
            if "age_min" in filters and "age_max" in filters:
                where_clauses.append(f"d.age BETWEEN {filters['age_min']} AND {filters['age_max']}")
            if "income_min" in filters and filters["income_min"] > 0:
                where_clauses.append(f"d.annual_income >= {filters['income_min']}")
            if "credit_score_min" in filters and filters["credit_score_min"] > 300:
                where_clauses.append(f"d.credit_score >= {filters['credit_score_min']}")
            if "gender" in filters and filters["gender"] != "All":
                where_clauses.append(f"d.gender = '{filters['gender']}'")

        cohort_where = " AND ".join(where_clauses)
        compiled_sql = template_sql.replace("{{COHORT_FILTERS}}", cohort_where)
        return compiled_sql

    @classmethod
    def execute_feature_pull(cls, sql_query: str) -> pd.DataFrame:
        """Executes compiled SQL query against the active Neon PostgreSQL database."""
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(sql_query)
                rows = cur.fetchall()
                colnames = [desc[0] for desc in cur.description]
                df = pd.DataFrame(rows, columns=colnames)
            return df
        except Exception as e:
            print(f"Error executing feature store query: {e}")
            return pd.DataFrame()
        finally:
            if conn:
                release_db_connection(conn)
