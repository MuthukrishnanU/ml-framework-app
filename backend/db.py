import os
import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv

# Load environment variables from backend/.env relative to this file
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")

connection_pool = None

def get_connection_pool():
    global connection_pool
    if connection_pool is None:
        if not DATABASE_URL:
            raise ValueError("DATABASE_URL environment variable is not set in .env")
        try:
            # Create a simple connection pool (min 1, max 10 connections)
            connection_pool = psycopg2.pool.SimpleConnectionPool(1, 10, DATABASE_URL)
        except Exception as e:
            print(f"Error creating connection pool: {e}")
            raise e
    return connection_pool

def get_db_connection():
    pool = get_connection_pool()
    max_attempts = 10
    
    for attempt in range(max_attempts):
        conn = pool.getconn()
        try:
            if conn.closed != 0:
                raise psycopg2.InterfaceError("Pooled connection was closed by server")
            # Run a quick lightweight ping query
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
            # If successful, this connection is healthy
            return conn
        except (psycopg2.InterfaceError, psycopg2.OperationalError) as e:
            print(f"Detected dead pooled connection ({e}) on attempt {attempt+1}. Discarding...")
            try:
                # Force close and discard the stale connection
                pool.putconn(conn, close=True)
            except Exception:
                pass
                
    # Fallback in case all pooled connections failed
    raise psycopg2.OperationalError("Could not retrieve a healthy database connection after multiple attempts.")

def release_db_connection(conn):
    if connection_pool and conn:
        try:
            connection_pool.putconn(conn)
        except Exception:
            try:
                conn.close()
            except Exception:
                pass

def init_db():
    """Drops and recreates the exactly 7 database tables, each with exactly 15 columns."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Disable commit during schema creation
        conn.autocommit = False
        
        # Drop existing tables
        print("Dropping existing tables...")
        cur.execute("DROP TABLE IF EXISTS semantic_metadata CASCADE;")
        cur.execute("DROP TABLE IF EXISTS predictions CASCADE;")
        cur.execute("DROP TABLE IF EXISTS investment_profiles CASCADE;")
        cur.execute("DROP TABLE IF EXISTS loan_details CASCADE;")
        cur.execute("DROP TABLE IF EXISTS credit_card_history CASCADE;")
        cur.execute("DROP TABLE IF EXISTS demographics CASCADE;")
        cur.execute("DROP TABLE IF EXISTS users CASCADE;")
        
        # Create users table (exactly 15 columns)
        print("Creating table: users...")
        cur.execute("""
            CREATE TABLE users (
                user_id VARCHAR(50) PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                email VARCHAR(100),
                role VARCHAR(50),
                full_name VARCHAR(100),
                department VARCHAR(50),
                employee_id VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                failed_login_attempts INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                access_level INT DEFAULT 1,
                phone_number VARCHAR(20)
            );
        """)
        
        # Create demographics table (exactly 15 columns)
        print("Creating table: demographics...")
        cur.execute("""
            CREATE TABLE demographics (
                customer_id VARCHAR(50) PRIMARY KEY,
                age INT,
                gender VARCHAR(10),
                annual_income NUMERIC(15, 2),
                employment_type VARCHAR(50),
                credit_score INT,
                location VARCHAR(100),
                marital_status VARCHAR(20),
                education_level VARCHAR(50),
                home_ownership VARCHAR(50),
                years_at_current_job INT,
                active_bank_accounts INT,
                monthly_rent_mortgage NUMERIC(15, 2),
                total_assets NUMERIC(15, 2),
                primary_branch_code VARCHAR(20)
            );
        """)
        
        # Create credit_card_history table (exactly 15 columns)
        print("Creating table: credit_card_history...")
        cur.execute("""
            CREATE TABLE credit_card_history (
                customer_id VARCHAR(50) PRIMARY KEY REFERENCES demographics(customer_id),
                card_type VARCHAR(50),
                credit_limit NUMERIC(15, 2),
                monthly_spend NUMERIC(15, 2),
                average_utilization NUMERIC(5, 4),
                payment_delay_days INT,
                cash_withdrawals_count INT,
                rewards_points_balance INT,
                active_cards_count INT,
                annual_fees_paid NUMERIC(15, 2),
                credit_inquiries_last_6m INT,
                credit_history_months INT,
                late_payment_flag BOOLEAN,
                international_spend_ratio NUMERIC(5, 4),
                cashback_earned_ytd NUMERIC(15, 2)
            );
        """)
        
        # Create loan_details table (exactly 15 columns)
        print("Creating table: loan_details...")
        cur.execute("""
            CREATE TABLE loan_details (
                customer_id VARCHAR(50) PRIMARY KEY REFERENCES demographics(customer_id),
                active_loans_count INT,
                personal_loan_balance NUMERIC(15, 2),
                home_loan_balance NUMERIC(15, 2),
                auto_loan_balance NUMERIC(15, 2),
                total_outstanding_loan NUMERIC(15, 2),
                average_interest_rate NUMERIC(5, 4),
                monthly_loan_emi NUMERIC(15, 2),
                loan_defaults_count INT,
                tenure_remaining_months INT,
                co_signer_present BOOLEAN,
                collateral_value NUMERIC(15, 2),
                loan_application_status VARCHAR(50),
                loan_to_income_ratio NUMERIC(5, 4),
                repayment_mode VARCHAR(50)
            );
        """)
        
        # Create investment_profiles table (exactly 15 columns)
        print("Creating table: investment_profiles...")
        cur.execute("""
            CREATE TABLE investment_profiles (
                customer_id VARCHAR(50) PRIMARY KEY REFERENCES demographics(customer_id),
                mutual_fund_holdings NUMERIC(15, 2),
                equity_portfolio_value NUMERIC(15, 2),
                fixed_deposit_balance NUMERIC(15, 2),
                monthly_sip_amount NUMERIC(15, 2),
                risk_profile VARCHAR(20),
                investment_duration_years INT,
                primary_broker_code VARCHAR(50),
                tax_saving_investments NUMERIC(15, 2),
                retirement_fund_balance NUMERIC(15, 2),
                gold_investment_value NUMERIC(15, 2),
                dividend_yield_annual NUMERIC(5, 4),
                automated_reinvest_flag BOOLEAN,
                last_trade_date TIMESTAMP,
                advisor_referred_flag BOOLEAN
            );
        """)
        
        # Create predictions table (exactly 15 columns)
        print("Creating table: predictions...")
        cur.execute("""
            CREATE TABLE predictions (
                prediction_id VARCHAR(50) PRIMARY KEY,
                customer_id VARCHAR(50) REFERENCES demographics(customer_id),
                model_id VARCHAR(100),
                target_product_type VARCHAR(50),
                propensity_score NUMERIC(5, 4),
                predicted_label INT,
                explanation_coeff_1 NUMERIC(20, 6),
                explanation_coeff_2 NUMERIC(20, 6),
                explanation_coeff_3 NUMERIC(20, 6),
                is_conversion_successful INT, -- 1=converted, 0=not, -1=pending
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                latency_ms NUMERIC(10, 2),
                fairness_adverse_impact_ratio NUMERIC(5, 4),
                drift_flag BOOLEAN DEFAULT FALSE,
                audit_trail_reference VARCHAR(255)
            );
        """)
        
        # Create semantic_metadata table (exactly 15 columns)
        print("Creating table: semantic_metadata...")
        cur.execute("""
            CREATE TABLE semantic_metadata (
                meta_id VARCHAR(50) PRIMARY KEY,
                table_name VARCHAR(50) NOT NULL,
                column_name VARCHAR(50) NOT NULL,
                data_type VARCHAR(50) NOT NULL,
                is_primary_key BOOLEAN DEFAULT FALSE,
                is_foreign_key BOOLEAN DEFAULT FALSE,
                referenced_table VARCHAR(50),
                referenced_column VARCHAR(50),
                business_definition TEXT,
                semantic_category VARCHAR(50),
                is_null BOOLEAN DEFAULT TRUE,
                default_value VARCHAR(100),
                data_sensitivity VARCHAR(50),
                source_system VARCHAR(50),
                validation_rules TEXT
            );
        """)
        
        # Commit all changes
        conn.commit()
        print("Database initialized successfully with exactly 7 tables of 15 columns each!")
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error initializing database: {e}")
        raise e
    finally:
        if conn:
            release_db_connection(conn)

def init_observability_db():
    """Initializes the API audit logs database table dynamically on startup."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS api_audit_logs (
                log_id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                username VARCHAR(100),
                user_role VARCHAR(50),
                endpoint VARCHAR(255),
                method VARCHAR(10),
                status_code INT,
                latency_ms NUMERIC(10, 2),
                payload_summary TEXT,
                client_ip VARCHAR(50)
            );
        """)
        conn.commit()
        print("Observability logs database initialized successfully (IF NOT EXISTS).")
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error initializing observability logs database: {e}")
def init_framework_tables():
    """Initializes the 4 framework tables in Neon PostgreSQL (rule_models, feature_store_connectors, migration_manifests, uat_results)."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. rule_models
        cur.execute("""
            CREATE TABLE IF NOT EXISTS rule_models (
                model_id VARCHAR(100) PRIMARY KEY,
                model_name VARCHAR(255) NOT NULL,
                category VARCHAR(50),
                target_product VARCHAR(50),
                execution_frequency VARCHAR(50),
                status VARCHAR(50),
                logic_operator VARCHAR(10),
                rule_conditions TEXT,
                performance_summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # 2. feature_store_connectors
        cur.execute("""
            CREATE TABLE IF NOT EXISTS feature_store_connectors (
                connector_id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                store_type VARCHAR(50),
                host VARCHAR(255),
                database_name VARCHAR(100),
                status VARCHAR(50),
                tables_list TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # 3. migration_manifests
        cur.execute("""
            CREATE TABLE IF NOT EXISTS migration_manifests (
                manifest_id SERIAL PRIMARY KEY,
                imported_by VARCHAR(100),
                imported_ml_count INT,
                imported_rules_count INT,
                manifest_content TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # 4. uat_results
        cur.execute("""
            CREATE TABLE IF NOT EXISTS uat_results (
                uat_id SERIAL PRIMARY KEY,
                model_id VARCHAR(100),
                model_type VARCHAR(50),
                algorithm_or_rule VARCHAR(100),
                assertion_check TEXT,
                metric_value TEXT,
                status VARCHAR(20),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        conn.commit()
        print("Framework database tables (rule_models, feature_store_connectors, migration_manifests, uat_results) initialized in Neon PostgreSQL.")
        
        # Populate initial seed data into Neon tables if empty
        sync_framework_data_to_postgres(conn)
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error initializing framework database tables: {e}")
    finally:
        if conn:
            release_db_connection(conn)

def sync_framework_data_to_postgres(conn=None):
    """Populates seed data into rule_models and feature_store_connectors Neon PostgreSQL tables."""
    should_close = False
    if conn is None:
        try:
            conn = get_db_connection()
            should_close = True
        except Exception as e:
            print(f"Could not connect to sync framework data: {e}")
            return
            
    try:
        import json
        from backend.registry import load_registry
        from backend.feature_store import FeatureStoreManager
        
        cur = conn.cursor()
        
        # 1. Sync rule_models
        cur.execute("SELECT COUNT(*) FROM rule_models;")
        if cur.fetchone()[0] == 0:
            reg = load_registry()
            rule_models = reg.get("rule_models", {})
            for r_id, r_data in rule_models.items():
                cur.execute("""
                    INSERT INTO rule_models (model_id, model_name, category, target_product, execution_frequency, status, logic_operator, rule_conditions, performance_summary)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (model_id) DO NOTHING;
                """, (
                    r_id,
                    r_data.get("model_name", r_id),
                    r_data.get("category", "General"),
                    r_data.get("target_product", "Credit Card"),
                    r_data.get("execution_frequency", "Monthly Bucket-Wise"),
                    r_data.get("status", "Active"),
                    r_data.get("rule_config", {}).get("logic", "AND"),
                    json.dumps(r_data.get("rule_config", {}).get("conditions", [])),
                    json.dumps(r_data.get("performance_summary", {}))
                ))
            print(f"Populated {len(rule_models)} rule models into Neon PostgreSQL `rule_models` table.")
            
        # 2. Sync feature_store_connectors
        cur.execute("SELECT COUNT(*) FROM feature_store_connectors;")
        if cur.fetchone()[0] == 0:
            connectors = FeatureStoreManager.DEFAULT_CONNECTORS
            for c in connectors:
                cur.execute("""
                    INSERT INTO feature_store_connectors (connector_id, name, store_type, host, database_name, status, tables_list)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (connector_id) DO NOTHING;
                """, (
                    c["connector_id"],
                    c["name"],
                    c["store_type"],
                    c["host"],
                    c["database"],
                    c["status"],
                    ", ".join(c["tables"])
                ))
            print(f"Populated {len(connectors)} connectors into Neon PostgreSQL `feature_store_connectors` table.")
            
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error syncing framework data to Neon: {e}")
    finally:
        if should_close and conn:
            release_db_connection(conn)

if __name__ == "__main__":
    # Test initialization
    try:
        init_db()
        init_framework_tables()
    except Exception as e:
        print(f"Test run failed: {e}")
