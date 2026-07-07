import os
import io
import sys
import random
from datetime import datetime, timedelta
import hashlib

# Add parent directory to path so we can import from backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.db import get_db_connection, release_db_connection, init_db

# Seed settings
random.seed(42)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def generate_users():
    """Generates exactly 10 user login profiles with hashed passwords."""
    print("Generating 10 user profiles...")
    users_data = []
    
    # 1 Admin, 5 Data Scientists, 4 Risk Officers
    roles_config = [
        ("admin", "admin", "admin123", "IT Admin", 5),
        ("ds_lead", "data_scientist", "ds_pass123", "Data Science Lead", 3),
        ("ds_junior1", "data_scientist", "ds_pass123", "Junior Data Scientist 1", 3),
        ("ds_junior2", "data_scientist", "ds_pass123", "Junior Data Scientist 2", 3),
        ("ds_analyst1", "data_scientist", "ds_pass123", "ML Operations Analyst 1", 3),
        ("ds_analyst2", "data_scientist", "ds_pass123", "ML Operations Analyst 2", 3),
        ("risk_head", "risk_officer", "risk_pass123", "Head of Risk Management", 4),
        ("risk_officer1", "risk_officer", "risk_pass123", "Senior Credit Risk Analyst", 4),
        ("risk_officer2", "risk_officer", "risk_pass123", "Credit Risk Reviewer", 4),
        ("compliance_mgr", "risk_officer", "risk_pass123", "Model Governance & Compliance Manager", 4),
    ]
    
    departments = ["Model Risk Management", "Retail Risk", "Credit Cards", "Wealth Management", "IT Operations"]
    
    for idx, (username, role, plain_password, full_name, access) in enumerate(roles_config):
        user_id = f"USR{idx+1:03d}"
        password_hash = hash_password(plain_password)
        email = f"{username}@axisbank.com"
        dept = random.choice(departments)
        emp_id = f"EMP{1000 + idx:04d}"
        phone = f"+9198765{idx:05d}"
        
        # 15 Columns matching users table definition
        row = (
            user_id,
            username,
            password_hash,
            email,
            role,
            full_name,
            dept,
            emp_id,
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"), # created_at
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"), # updated_at
            None, # last_login
            0, # failed_login_attempts
            True, # is_active
            access, # access_level
            phone # phone_number
        )
        users_data.append(row)
    
    return users_data

def generate_demographics(num_records=10000):
    print(f"Generating {num_records} demographics records...")
    data = []
    locations = ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad", "Jaipur", "Lucknow"]
    emp_types = ["Salaried - Private", "Salaried - Public", "Self-Employed Professional", "Self-Employed Business", "Retired"]
    genders = ["Male", "Female", "Other"]
    marital_statuses = ["Single", "Married", "Divorced", "Widowed"]
    education_levels = ["Undergraduate", "Graduate", "Postgraduate", "Professional", "Doctorate"]
    home_ownerships = ["Owned with Mortgage", "Owned Outright", "Rented", "Employer Provided", "Co-Living"]
    
    for idx in range(num_records):
        cust_id = f"CUST{idx+1:06d}"
        age = random.randint(21, 70)
        gender = random.choice(genders)
        
        # Base income on age and employment type
        base_income = random.randint(30000, 300000)
        if age > 30: base_income += random.randint(20000, 150000)
        if age > 45: base_income += random.randint(50000, 300000)
        annual_income = round(base_income * 12, 2)
        
        emp_type = random.choice(emp_types)
        credit_score = random.randint(300, 850)
        location = random.choice(locations)
        marital = random.choice(marital_statuses)
        edu = random.choice(education_levels)
        home = random.choice(home_ownerships)
        
        years_job = random.randint(0, 15) if emp_type != "Retired" else 0
        active_accounts = random.randint(1, 5)
        monthly_mortgage = round(random.randint(5000, 50000), 2) if home in ["Rented", "Owned with Mortgage"] else 0.0
        total_assets = round(annual_income * random.uniform(1.2, 5.0), 2)
        branch_code = f"AXIS{random.randint(100, 999):03d}"
        
        row = (
            cust_id,
            age,
            gender,
            annual_income,
            emp_type,
            credit_score,
            location,
            marital,
            edu,
            home,
            years_job,
            active_accounts,
            monthly_mortgage,
            total_assets,
            branch_code
        )
        data.append(row)
    
    return data

def generate_credit_card_history(demographics_list):
    print("Generating credit card histories...")
    data = []
    card_types = ["Axis Neo", "Axis My Zone", "Axis Flipkart", "Axis Ace", "Axis Select", "Axis Magnus"]
    
    for row in demographics_list:
        cust_id = row[0]
        income = float(row[3])
        credit_score = int(row[5])
        
        # Credit limit based on income and credit score
        limit_multiplier = random.uniform(0.1, 0.4)
        if credit_score > 750: limit_multiplier += 0.15
        credit_limit = round((income / 12.0) * limit_multiplier, 2)
        credit_limit = max(credit_limit, 15000.0) # minimum limit
        
        card = random.choice(card_types)
        utilization = round(random.uniform(0.05, 0.95), 4)
        monthly_spend = round(credit_limit * utilization * random.uniform(0.6, 1.1), 2)
        monthly_spend = min(monthly_spend, credit_limit)
        
        payment_delay = random.randint(0, 45) if credit_score < 600 else random.randint(0, 5)
        cash_withdrawals = random.randint(0, 5) if utilization > 0.7 else 0
        rewards = random.randint(100, 50000)
        active_cards = random.randint(1, 3)
        annual_fees = round(random.choice([0.0, 500.0, 1500.0, 5000.0]), 2)
        inquiries = random.randint(0, 4)
        history_months = random.randint(6, 240)
        late_payment = payment_delay > 15
        intl_ratio = round(random.uniform(0.0, 0.3) if credit_limit > 100000 else 0.0, 4)
        cashback = round(monthly_spend * 0.015 * 12, 2)
        
        row = (
            cust_id,
            card,
            credit_limit,
            monthly_spend,
            utilization,
            payment_delay,
            cash_withdrawals,
            rewards,
            active_cards,
            annual_fees,
            inquiries,
            history_months,
            late_payment,
            intl_ratio,
            cashback
        )
        data.append(row)
    
    return data

def generate_loan_details(demographics_list):
    print("Generating loan details...")
    data = []
    statuses = ["Active", "Grace Period", "Structured", "Settled", "No Loan"]
    modes = ["ACH Auto-Debit", "NetBanking SI", "Cheque", "Mobile App Manual", "Cash Deposit"]
    
    for row in demographics_list:
        cust_id = row[0]
        income = float(row[3])
        credit_score = int(row[5])
        
        active_loans = random.choice([0, 1, 2])
        if credit_score < 500: active_loans = random.choice([0, 1])
        
        personal_bal = 0.0
        home_bal = 0.0
        auto_bal = 0.0
        
        if active_loans > 0:
            if random.random() < 0.4:
                personal_bal = round(random.randint(20000, 200000), 2)
            if random.random() < 0.2 and income > 1000000:
                home_bal = round(random.randint(1500000, 8000000), 2)
            if random.random() < 0.3:
                auto_bal = round(random.randint(100000, 800000), 2)
                
        total_outstanding = round(personal_bal + home_bal + auto_bal, 2)
        avg_rate = round(random.uniform(0.075, 0.165), 4)
        
        # Calculate monthly EMI approx
        monthly_emi = 0.0
        if total_outstanding > 0:
            monthly_emi = round((total_outstanding * (avg_rate / 12.0)) / (1 - (1 + avg_rate/12.0)**-60), 2) if avg_rate > 0 else 0
            monthly_emi = max(monthly_emi, 1500.0)
            
        defaults = random.randint(0, 3) if credit_score < 600 else 0
        tenure_rem = random.randint(6, 120) if total_outstanding > 0 else 0
        cosigner = random.choice([True, False]) if total_outstanding > 1000000 else False
        collateral = round(total_outstanding * random.uniform(1.2, 2.0), 2) if home_bal > 0 else 0.0
        status = random.choice(statuses) if total_outstanding > 0 else "No Loan"
        lti_ratio = round(total_outstanding / income, 4) if income > 0 else 0.0
        repay_mode = random.choice(modes)
        
        row = (
            cust_id,
            active_loans,
            personal_bal,
            home_bal,
            auto_bal,
            total_outstanding,
            avg_rate,
            monthly_emi,
            defaults,
            tenure_rem,
            cosigner,
            collateral,
            status,
            lti_ratio,
            repay_mode
        )
        data.append(row)
    
    return data

def generate_investment_profiles(demographics_list):
    print("Generating investment profiles...")
    data = []
    risk_profiles = ["Conservative", "Moderate", "Aggressive", "Very Aggressive"]
    
    for row in demographics_list:
        cust_id = row[0]
        income = float(row[3])
        credit_score = int(row[5])
        
        # Wealthier customers invest more
        invest_ratio = random.uniform(0.05, 0.3)
        if income > 1500000: invest_ratio += 0.15
        
        total_invested = income * invest_ratio
        
        mf_holdings = round(total_invested * random.uniform(0.2, 0.6), 2)
        equity_val = round(total_invested * random.uniform(0.1, 0.5), 2) if credit_score > 600 else 0.0
        fd_bal = round(total_invested * random.uniform(0.1, 0.4), 2)
        
        sip_amount = round(mf_holdings / 50.0, 2)
        sip_amount = max(sip_amount, 1000.0) if mf_holdings > 50000 else 0.0
        
        risk = random.choice(risk_profiles)
        duration = random.randint(1, 15)
        broker = f"BROKER_AXIS_{random.randint(10, 99)}"
        tax_saving = round(random.randint(10000, 150000), 2)
        retire_bal = round(total_invested * random.uniform(0.05, 0.25), 2)
        gold_val = round(total_invested * random.uniform(0.02, 0.1), 2)
        dividend = round(random.uniform(0.01, 0.05), 4)
        auto_reinvest = random.choice([True, False])
        
        last_trade = datetime.now() - timedelta(days=random.randint(1, 90))
        trade_str = last_trade.strftime("%Y-%m-%d %H:%M:%S")
        
        referred = random.choice([True, False])
        
        row = (
            cust_id,
            mf_holdings,
            equity_val,
            fd_bal,
            sip_amount,
            risk,
            duration,
            broker,
            tax_saving,
            retire_bal,
            gold_val,
            dividend,
            auto_reinvest,
            trade_str,
            referred
        )
        data.append(row)
        
    return data

def generate_predictions(demographics_list):
    print("Generating predictions initial log...")
    data = []
    
    for idx, row in enumerate(demographics_list):
        pred_id = f"PRD{idx+1:06d}"
        cust_id = row[0]
        age = int(row[1])
        income = float(row[3])
        credit_score = int(row[5])
        
        # Active model is initial Logistic Regression / XGBoost champion
        model_id = "xgb_model_v1.0"
        
        # Credit Card Cross-Sell propensity logic (rule-based synthetic score)
        propensity = 0.15
        if credit_score > 700: propensity += 0.3
        if income > 1000000: propensity += 0.2
        if 25 <= age <= 45: propensity += 0.15
        propensity = min(propensity + random.uniform(-0.1, 0.1), 0.99)
        propensity = max(propensity, 0.01)
        
        label = 1 if propensity >= 0.55 else 0
        
        # Ground truth conversion calculation: conversion occurs for a fraction of high propensity users
        is_converted = -1 # default: pending
        # Let's pre-populate 60% of conversions with true outcomes, 40% remain pending
        if idx % 10 < 6: 
            is_converted = 1 if (label == 1 and random.random() < 0.75) or (label == 0 and random.random() < 0.08) else 0
            
        coeff_1 = round(random.uniform(0.1, 0.8), 4) # credit score weight representation
        coeff_2 = round(random.uniform(0.05, 0.6), 4) # income weight representation
        coeff_3 = round(random.uniform(-0.4, 0.2), 4) # age weight representation
        
        timestamp = datetime.now() - timedelta(days=random.randint(1, 30))
        time_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
        latency = round(random.uniform(5.2, 45.8), 2)
        adverse_impact = round(random.uniform(0.85, 1.15), 4)
        drift = False
        audit = f"AUD_RUN_{random.randint(100, 999)}"
        
        row = (
            pred_id,
            cust_id,
            model_id,
            "Credit Card",
            round(propensity, 4),
            label,
            coeff_1,
            coeff_2,
            coeff_3,
            is_converted,
            time_str,
            latency,
            adverse_impact,
            drift,
            audit
        )
        data.append(row)
        
    return data

def generate_semantic_metadata():
    print("Generating semantic meta store...")
    metadata = []
    
    # We have 6 customer tables + 1 users table = 7 tables.
    # We will describe exactly 15 columns for each table.
    
    schema_definitions = {
        "users": [
            ("user_id", "VARCHAR(50)", True, False, None, None, "Unique identifier for backend user", "ID", False, "None", "High", "Axis MRM System", "Must start with USR"),
            ("username", "VARCHAR(50)", False, False, None, None, "Unique login username", "Credentials", False, "None", "High", "Axis MRM System", "Must be unique"),
            ("password_hash", "VARCHAR(255)", False, False, None, None, "Bcrypt hash of user password", "Credentials", False, "None", "Critical", "Axis MRM System", "Min length 8 characters hashed"),
            ("email", "VARCHAR(100)", False, False, None, None, "User professional email address", "Contact", True, "None", "Medium", "Axis MRM System", "Standard email pattern"),
            ("role", "VARCHAR(50)", False, False, None, None, "Access role (admin/data_scientist/risk_officer)", "Governance", False, "None", "Low", "Axis MRM System", "Defined enum list"),
            ("full_name", "VARCHAR(100)", False, False, None, None, "Display name of employee", "Personal", True, "None", "Low", "Axis MRM System", "Alphabetical only"),
            ("department", "VARCHAR(50)", False, False, None, None, "Working department division", "Governance", True, "None", "Low", "Axis MRM System", "Bank divisions list"),
            ("employee_id", "VARCHAR(50)", False, False, None, None, "Unique corporate ID card code", "ID", True, "None", "Medium", "Axis MRM System", "Alphanumeric"),
            ("created_at", "TIMESTAMP", False, False, None, None, "Profile creation timestamp", "Temporal", True, "CURRENT_TIMESTAMP", "Low", "Axis MRM System", "Valid timestamp"),
            ("updated_at", "TIMESTAMP", False, False, None, None, "Profile modification timestamp", "Temporal", True, "CURRENT_TIMESTAMP", "Low", "Axis MRM System", "Valid timestamp"),
            ("last_login", "TIMESTAMP", False, False, None, None, "Timestamp of last authentication session", "Temporal", True, "NULL", "Low", "Axis MRM System", "Valid timestamp"),
            ("failed_login_attempts", "INT", False, False, None, None, "Count of consecutive bad login retries", "Security", True, "0", "Low", "Axis MRM System", ">= 0"),
            ("is_active", "BOOLEAN", False, False, None, None, "Boolean indicating account state", "Governance", True, "TRUE", "Low", "Axis MRM System", "Boolean flag"),
            ("access_level", "INT", False, False, None, None, "Integer security level rating", "Governance", True, "1", "Low", "Axis MRM System", "1 to 5 scale"),
            ("phone_number", "VARCHAR(20)", False, False, None, None, "Contact mobile number", "Contact", True, "NULL", "Medium", "Axis MRM System", "International standard phone")
        ],
        "demographics": [
            ("customer_id", "VARCHAR(50)", True, False, None, None, "Unique customer alphanumeric ID", "ID", False, "None", "Medium", "Core Banking API", "Must start with CUST"),
            ("age", "INT", False, False, None, None, "Age of customer in years", "Demographic", True, "None", "Low", "Core Banking API", "Range 18 to 100"),
            ("gender", "VARCHAR(10)", False, False, None, None, "Gender of customer", "Demographic", True, "None", "Low", "Core Banking API", "Male/Female/Other"),
            ("annual_income", "NUMERIC(15,2)", False, False, None, None, "Total gross annual income in INR", "Financial", True, "None", "Medium", "Tax Registry Bureau", ">= 0"),
            ("employment_type", "VARCHAR(50)", False, False, None, None, "Employment category", "Employment", True, "None", "Low", "Core Banking API", "Enum list of employment"),
            ("credit_score", "INT", False, False, None, None, "CIBIL Credit Bureau score rating", "Financial", True, "None", "Medium", "CIBIL Bureau", "Range 300 to 850"),
            ("location", "VARCHAR(100)", False, False, None, None, "Resident city location of customer", "Demographic", True, "None", "Low", "Core Banking API", "List of major metro branches"),
            ("marital_status", "VARCHAR(20)", False, False, None, None, "Marital status code", "Demographic", True, "None", "Low", "Core Banking API", "Single/Married/Divorced/Widowed"),
            ("education_level", "VARCHAR(50)", False, False, None, None, "Highest completed education", "Demographic", True, "None", "Low", "Core Banking API", "Academic levels"),
            ("home_ownership", "VARCHAR(50)", False, False, None, None, "Current housing status", "Demographic", True, "None", "Low", "Core Banking API", "Owned/Rented/Mortgaged"),
            ("years_at_current_job", "INT", False, False, None, None, "Employment tenure length in years", "Employment", True, "None", "Low", "Core Banking API", ">= 0"),
            ("active_bank_accounts", "INT", False, False, None, None, "Count of deposit accounts held", "Financial", True, "None", "Low", "Core Banking API", "Range 1 to 10"),
            ("monthly_rent_mortgage", "NUMERIC(15,2)", False, False, None, None, "Out-of-pocket housing cost per month", "Financial", True, "0.0", "Medium", "Core Banking API", ">= 0"),
            ("total_assets", "NUMERIC(15,2)", False, False, None, None, "Total financial net worth calculation", "Financial", True, "None", "Medium", "Investment Services API", ">= 0"),
            ("primary_branch_code", "VARCHAR(20)", False, False, None, None, "Home bank branch code", "Governance", True, "None", "Low", "Core Banking API", "AXIS plus digits")
        ],
        "credit_card_history": [
            ("customer_id", "VARCHAR(50)", True, True, "demographics", "customer_id", "Foreign key linking customer demographics", "ID", False, "None", "Medium", "Credit Cards Core", "Must exist in demographics"),
            ("card_type", "VARCHAR(50)", False, False, None, None, "Name classification of current card product", "Product", True, "None", "Low", "Credit Cards Core", "Valid card brands"),
            ("credit_limit", "NUMERIC(15,2)", False, False, None, None, "Allocated total credit limit", "Financial", True, "None", "Medium", "Credit Cards Core", ">= 0"),
            ("monthly_spend", "NUMERIC(15,2)", False, False, None, None, "Running average monthly spend amount", "Financial", True, "None", "Medium", "Credit Cards Core", ">= 0"),
            ("average_utilization", "NUMERIC(5,4)", False, False, None, None, "Credit utilization ratio (spend divided by limit)", "Financial", True, "None", "Low", "Credit Cards Core", "Range 0 to 1"),
            ("payment_delay_days", "INT", False, False, None, None, "Max delayed bill payment days recorded", "Financial", True, "None", "Medium", "Credit Cards Core", ">= 0"),
            ("cash_withdrawals_count", "INT", False, False, None, None, "ATM cash withdrawals using credit card", "Behavioral", True, "0", "Low", "Credit Cards Core", ">= 0"),
            ("rewards_points_balance", "INT", False, False, None, None, "Accrued unredeemed reward point balance", "Financial", True, "0", "Low", "Credit Cards Core", ">= 0"),
            ("active_cards_count", "INT", False, False, None, None, "Count of cards registered", "Financial", True, "1", "Low", "Credit Cards Core", "Range 1 to 5"),
            ("annual_fees_paid", "NUMERIC(15,2)", False, False, None, None, "Total yearly premium fees charged", "Financial", True, "0.0", "Low", "Credit Cards Core", ">= 0"),
            ("credit_inquiries_last_6m", "INT", False, False, None, None, "Inquiries registered at credit bureau", "Behavioral", True, "0", "Medium", "CIBIL Bureau", ">= 0"),
            ("credit_history_months", "INT", False, False, None, None, "Months since initial card line open", "Behavioral", True, "None", "Low", "Credit Cards Core", ">= 0"),
            ("late_payment_flag", "BOOLEAN", False, False, None, None, "Boolean indicating active default alert", "Financial", True, "FALSE", "Medium", "Credit Cards Core", "Boolean flag"),
            ("international_spend_ratio", "NUMERIC(5,4)", False, False, None, None, "Proportion of spend outside home country", "Behavioral", True, "0.0", "Low", "Credit Cards Core", "Range 0 to 1"),
            ("cashback_earned_ytd", "NUMERIC(15,2)", False, False, None, None, "Total cashback returned this year", "Financial", True, "0.0", "Low", "Credit Cards Core", ">= 0")
        ],
        "loan_details": [
            ("customer_id", "VARCHAR(50)", True, True, "demographics", "customer_id", "Foreign key linking customer demographics", "ID", False, "None", "Medium", "Loans Core API", "Must exist in demographics"),
            ("active_loans_count", "INT", False, False, None, None, "Number of open credit loans", "Financial", True, "0", "Low", "Loans Core API", ">= 0"),
            ("personal_loan_balance", "NUMERIC(15,2)", False, False, None, None, "Outstanding personal loan balance", "Financial", True, "0.0", "Medium", "Loans Core API", ">= 0"),
            ("home_loan_balance", "NUMERIC(15,2)", False, False, None, None, "Outstanding mortgage balance", "Financial", True, "0.0", "Medium", "Loans Core API", ">= 0"),
            ("auto_loan_balance", "NUMERIC(15,2)", False, False, None, None, "Outstanding car loan balance", "Financial", True, "0.0", "Medium", "Loans Core API", ">= 0"),
            ("total_outstanding_loan", "NUMERIC(15,2)", False, False, None, None, "Sum of all outstanding retail loans", "Financial", True, "0.0", "Medium", "Loans Core API", ">= 0"),
            ("average_interest_rate", "NUMERIC(5,4)", False, False, None, None, "Weighted average rate of active loans", "Financial", True, "0.0", "Low", "Loans Core API", "Range 0.01 to 0.40"),
            ("monthly_loan_emi", "NUMERIC(15,2)", False, False, None, None, "Total equated monthly installment liability", "Financial", True, "0.0", "Medium", "Loans Core API", ">= 0"),
            ("loan_defaults_count", "INT", False, False, None, None, "Number of loan payments missed entirely", "Financial", True, "0", "High", "Loans Core API", ">= 0"),
            ("tenure_remaining_months", "INT", False, False, None, None, "Max months remaining in loan repayments", "Behavioral", True, "0", "Low", "Loans Core API", ">= 0"),
            ("co_signer_present", "BOOLEAN", False, False, None, None, "Flag showing guarantor presence", "Governance", True, "FALSE", "Low", "Loans Core API", "Boolean flag"),
            ("collateral_value", "NUMERIC(15,2)", False, False, None, None, "Assessed value of pledged asset guarantees", "Financial", True, "0.0", "Medium", "Asset Assessor Service", ">= 0"),
            ("loan_application_status", "VARCHAR(50)", False, False, None, None, "Current pipeline category status", "Governance", True, "None", "Low", "Loans Core API", "Valid stages"),
            ("loan_to_income_ratio", "NUMERIC(5,4)", False, False, None, None, "Total outstanding divided by annual income", "Financial", True, "0.0", "Low", "Loans Core API", ">= 0"),
            ("repayment_mode", "VARCHAR(50)", False, False, None, None, "Direct billing collection channel", "Governance", True, "None", "Low", "Loans Core API", "Repayment method list")
        ],
        "investment_profiles": [
            ("customer_id", "VARCHAR(50)", True, True, "demographics", "customer_id", "Foreign key linking customer demographics", "ID", False, "None", "Medium", "Wealth Core API", "Must exist in demographics"),
            ("mutual_fund_holdings", "NUMERIC(15,2)", False, False, None, None, "Total assets in mutual fund portfolios", "Investment", True, "0.0", "Medium", "Mutual Fund Registry", ">= 0"),
            ("equity_portfolio_value", "NUMERIC(15,2)", False, False, None, None, "Direct stock exchange investment value", "Investment", True, "0.0", "Medium", "Stock Brokerage API", ">= 0"),
            ("fixed_deposit_balance", "NUMERIC(15,2)", False, False, None, None, "Total savings in term fixed deposits", "Investment", True, "0.0", "Medium", "Wealth Core API", ">= 0"),
            ("monthly_sip_amount", "NUMERIC(15,2)", False, False, None, None, "Monthly systematic investment plan amount", "Investment", True, "0.0", "Medium", "Mutual Fund Registry", ">= 0"),
            ("risk_profile", "VARCHAR(20)", False, False, None, None, "Customer self-reported risk appetite", "Behavioral", True, "Moderate", "Low", "Wealth Core API", "Valid risk profile enum"),
            ("investment_duration_years", "INT", False, False, None, None, "Tenure since first active investment", "Behavioral", True, "0", "Low", "Wealth Core API", ">= 0"),
            ("primary_broker_code", "VARCHAR(50)", False, False, None, None, "Code representing active broker agency", "Governance", True, "None", "Low", "Wealth Core API", "Broker identifiers"),
            ("tax_saving_investments", "NUMERIC(15,2)", False, False, None, None, "Total ELSS/PPF tax saver deposits YTD", "Investment", True, "0.0", "Low", "Tax Ledger API", ">= 0"),
            ("retirement_fund_balance", "NUMERIC(15,2)", False, False, None, None, "Balance in corporate or private pension funds", "Investment", True, "0.0", "Medium", "Wealth Core API", ">= 0"),
            ("gold_investment_value", "NUMERIC(15,2)", False, False, None, None, "Estimated value of gold bonds and sovereign gold", "Investment", True, "0.0", "Low", "Wealth Core API", ">= 0"),
            ("dividend_yield_annual", "NUMERIC(5,4)", False, False, None, None, "Estimated percentage return on equities", "Investment", True, "0.0", "Low", "Stock Brokerage API", "Range 0 to 1"),
            ("automated_reinvest_flag", "BOOLEAN", False, False, None, None, "Flag directing payouts to reinvest", "Governance", True, "FALSE", "Low", "Wealth Core API", "Boolean flag"),
            ("last_trade_date", "TIMESTAMP", False, False, None, None, "Date of last buy or sell trade executed", "Temporal", True, "NULL", "Low", "Stock Brokerage API", "Valid date"),
            ("advisor_referred_flag", "BOOLEAN", False, False, None, None, "Flag if customer uses advisory assistance", "Governance", True, "FALSE", "Low", "Wealth Core API", "Boolean flag")
        ],
        "predictions": [
            ("prediction_id", "VARCHAR(50)", True, False, None, None, "Unique scoring execution ID key", "ID", False, "None", "Low", "ML Router Gateway", "Starts with PRD"),
            ("customer_id", "VARCHAR(50)", False, True, "demographics", "customer_id", "Demographics table association foreign key", "ID", False, "None", "Medium", "ML Router Gateway", "Must exist in demographics"),
            ("model_id", "VARCHAR(100)", False, False, None, None, "Registry identifier of scoring model", "Governance", False, "None", "Low", "ML Router Gateway", "Valid registered model ID"),
            ("target_product_type", "VARCHAR(50)", False, False, None, None, "Cross-sell targeted banking product", "Product", False, "None", "Low", "ML Router Gateway", "Standard product name"),
            ("propensity_score", "NUMERIC(5,4)", False, False, None, None, "Computed prediction conversion probability", "ML Stats", False, "None", "Low", "ML Router Gateway", "Range 0 to 1"),
            ("predicted_label", "INT", False, False, None, None, "Binary class classification (1=propensity high, 0=low)", "ML Stats", False, "None", "Low", "ML Router Gateway", "0 or 1"),
            ("explanation_coeff_1", "NUMERIC(10,6)", False, False, None, None, "Model coefficient/SHAP for feature index 1", "ML Explain", True, "None", "Low", "ML Router Gateway", "Real number value"),
            ("explanation_coeff_2", "NUMERIC(10,6)", False, False, None, None, "Model coefficient/SHAP for feature index 2", "ML Explain", True, "None", "Low", "ML Router Gateway", "Real number value"),
            ("explanation_coeff_3", "NUMERIC(10,6)", False, False, None, None, "Model coefficient/SHAP for feature index 3", "ML Explain", True, "None", "Low", "ML Router Gateway", "Real number value"),
            ("is_conversion_successful", "INT", False, False, None, None, "Actual sales conversion outcome label", "Product", True, "-1", "Medium", "Core Sales CRM", "-1=pending, 0=failed, 1=success"),
            ("timestamp", "TIMESTAMP", False, False, None, None, "Time execution timestamp", "Temporal", True, "CURRENT_TIMESTAMP", "Low", "ML Router Gateway", "Valid timestamp"),
            ("latency_ms", "NUMERIC(10,2)", False, False, None, None, "Prediction execution latency footprint", "ML Stats", True, "None", "Low", "ML Router Gateway", ">= 0"),
            ("fairness_adverse_impact_ratio", "NUMERIC(5,4)", False, False, None, None, "Calculated fairness ratio for demographic group", "ML Stats", True, "None", "Low", "Model Monitor Engine", ">= 0"),
            ("drift_flag", "BOOLEAN", False, False, None, None, "Boolean indicating anomalous data drift", "ML Stats", True, "FALSE", "Low", "Model Monitor Engine", "Boolean flag"),
            ("audit_trail_reference", "VARCHAR(255)", False, False, None, None, "Registry system audit log string trace", "Governance", True, "None", "Low", "Model Monitor Engine", "Audit references")
        ],
        "semantic_metadata": [
            ("meta_id", "VARCHAR(50)", True, False, None, None, "Unique metadata catalog entry ID", "ID", False, "None", "Low", "Axis MRM System", "Must start with MET"),
            ("table_name", "VARCHAR(50)", False, False, None, None, "Subject metadata mapping table name", "Catalog", False, "None", "Low", "Axis MRM System", "Name of database table"),
            ("column_name", "VARCHAR(50)", False, False, None, None, "Subject metadata column name", "Catalog", False, "None", "Low", "Axis MRM System", "Name of table column"),
            ("data_type", "VARCHAR(50)", False, False, None, None, "Data type indicator", "Catalog", False, "None", "Low", "Axis MRM System", "SQL Data Type"),
            ("is_primary_key", "BOOLEAN", False, False, None, None, "Primary key boolean indicator flag", "Catalog", True, "FALSE", "Low", "Axis MRM System", "Boolean flag"),
            ("is_foreign_key", "BOOLEAN", False, False, None, None, "Foreign key relation indicator flag", "Catalog", True, "FALSE", "Low", "Axis MRM System", "Boolean flag"),
            ("referenced_table", "VARCHAR(50)", False, False, None, None, "Name of related table in foreign key", "Catalog", True, "NULL", "Low", "Axis MRM System", "Existing database table"),
            ("referenced_column", "VARCHAR(50)", False, False, None, None, "Name of primary key in related table", "Catalog", True, "NULL", "Low", "Axis MRM System", "Existing table column"),
            ("business_definition", "TEXT", False, False, None, None, "Detailed operational description definition", "Catalog", True, "None", "Low", "Axis MRM System", "Text string"),
            ("semantic_category", "VARCHAR(50)", False, False, None, None, "Categorization grouping", "Catalog", True, "None", "Low", "Axis MRM System", "Semantic categories list"),
            ("is_null", "BOOLEAN", False, False, None, None, "Flag if null values are permitted", "Catalog", True, "TRUE", "Low", "Axis MRM System", "Boolean flag"),
            ("default_value", "VARCHAR(100)", False, False, None, None, "Table column default parameter fallback", "Catalog", True, "NULL", "Low", "Axis MRM System", "String representation"),
            ("data_sensitivity", "VARCHAR(50)", False, False, None, None, "Level classification of security", "Catalog", True, "None", "Low", "Axis MRM System", "Low/Medium/High/Critical"),
            ("source_system", "VARCHAR(50)", False, False, None, None, "Origin of incoming database feed", "Catalog", True, "None", "Low", "Axis MRM System", "Valid pipeline names"),
            ("validation_rules", "TEXT", False, False, None, None, "Business validation constraints rules definition", "Catalog", True, "None", "Low", "Axis MRM System", "Text constraints definition")
        ]
    }
    
    row_count = 1
    for table_name, columns in schema_definitions.items():
        for col_def in columns:
            meta_id = f"MET{row_count:03d}"
            row = (
                meta_id,
                table_name,
                col_def[0],
                col_def[1],
                col_def[2],
                col_def[3],
                col_def[4],
                col_def[5],
                col_def[6],
                col_def[7],
                col_def[8],
                col_def[9],
                col_def[10],
                col_def[11],
                col_def[12]
            )
            metadata.append(row)
            row_count += 1
            
    return metadata

def bulk_insert_copy(conn, table_name, data):
    """Pushes in-memory python list of tuples directly to Neon Postgres using fast StringIO COPY."""
    cur = conn.cursor()
    buffer = io.StringIO()
    
    # Write tab-separated records to buffer (using \N for None/Null values)
    for row in data:
        row_str_list = []
        for val in row:
            if val is None:
                row_str_list.append('\\N')
            elif isinstance(val, bool):
                row_str_list.append('t' if val else 'f')
            else:
                row_str_list.append(str(val).replace('\t', ' ').replace('\n', ' '))
        buffer.write('\t'.join(row_str_list) + '\n')
        
    buffer.seek(0)
    
    # Execute high-speed copy
    try:
        cur.copy_from(buffer, table_name, sep='\t', null='\\N')
        conn.commit()
        print(f"Successfully copy-loaded {len(data)} records into table: {table_name}")
    except Exception as e:
        conn.rollback()
        print(f"Error copying data into {table_name}: {e}")
        raise e

def run_data_generator():
    """Generates all simulated records and populates Neon Postgres DB."""
    # Reset/Create tables
    init_db()
    
    conn = None
    try:
        conn = get_db_connection()
        
        # 1. Users (10 rows)
        users = generate_users()
        bulk_insert_copy(conn, "users", users)
        
        # 2. Demographics (10,000 rows)
        demographics = generate_demographics(10000)
        bulk_insert_copy(conn, "demographics", demographics)
        
        # 3. Credit Card History (10,000 rows)
        cc_history = generate_credit_card_history(demographics)
        bulk_insert_copy(conn, "credit_card_history", cc_history)
        
        # 4. Loan Details (10,000 rows)
        loans = generate_loan_details(demographics)
        bulk_insert_copy(conn, "loan_details", loans)
        
        # 5. Investment Profiles (10,000 rows)
        investments = generate_investment_profiles(demographics)
        bulk_insert_copy(conn, "investment_profiles", investments)
        
        # 6. Predictions (10,000 rows)
        predictions = generate_predictions(demographics)
        bulk_insert_copy(conn, "predictions", predictions)
        
        # 7. Semantic Metadata (~105 rows)
        semantic = generate_semantic_metadata()
        bulk_insert_copy(conn, "semantic_metadata", semantic)
        
        print("\nAll database tables successfully generated and populated on Neon!")
        
    except Exception as e:
        print(f"Fail during data generation: {e}")
    finally:
        if conn:
            release_db_connection(conn)

if __name__ == "__main__":
    run_data_generator()
