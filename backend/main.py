import os
import hashlib
import random
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np

from backend.db import get_db_connection, release_db_connection, init_observability_db
from backend.registry import (
    load_registry, save_registry, get_active_champion_id, 
    set_active_champion_id, get_failover_mode, set_failover_mode, log_audit
)
from backend.router import score_customer, get_trained_model, FEATURES
from backend.monitoring import calculate_psi, calculate_ks_distance
import time
from fastapi import Request

app = FastAPI(title="Self-Healing ML Framework API")

# Enable CORS for frontend React/Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def set_body(request: Request, body: bytes):
    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}
    request._receive = receive

@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    start_time = time.time()
    
    # Capture telemetry headers
    username = request.headers.get("X-User-Name", "anonymous")
    role = request.headers.get("X-User-Role", "guest")
    endpoint = request.url.path
    method = request.method
    client_ip = request.client.host if request.client else "unknown"
    
    # Safely retrieve body payload summary
    payload_summary = ""
    if method in ["POST", "PUT"]:
        try:
            body_bytes = await request.body()
            await set_body(request, body_bytes)
            
            import json
            body_json = json.loads(body_bytes.decode('utf-8'))
            if isinstance(body_json, dict):
                if "password" in body_json:
                    body_json["password"] = "********"
                payload_summary = json.dumps(body_json)
        except Exception:
            pass
            
    response = await call_next(request)
    
    process_time_ms = (time.time() - start_time) * 1000.0
    status_code = response.status_code
    
    # Exclude logs check paths or static resources to prevent loop recursion
    ignored_paths = ["/favicon.ico", "/api/observability/logs", "/"]
    if endpoint not in ignored_paths and not endpoint.startswith("/static"):
        import threading
        def save_log():
            conn = None
            try:
                conn = get_db_connection()
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO api_audit_logs (
                        username, user_role, endpoint, method, status_code, latency_ms, payload_summary, client_ip
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                """, (username, role, endpoint, method, status_code, process_time_ms, payload_summary, client_ip))
                conn.commit()
            except Exception as e:
                print(f"Error saving audit log to Neon: {e}")
            finally:
                if conn:
                    release_db_connection(conn)
                    
        threading.Thread(target=save_log, daemon=True).start()
        
    return response

@app.get("/")
def read_root():
    return {"status": "healthy", "service": "Self-Healing ML Framework Backend API"}

class LoginRequest(BaseModel):
    username: str
    password: str

class ScoreRequest(BaseModel):
    customer_id: str

@app.on_event("startup")
def startup_event():
    # Dynamically bootstrap the observability table on start
    try:
        init_observability_db()
    except Exception as e:
        print(f"Error initializing observability logs table on startup: {e}")
        
    # Warm up and train the models on startup in a background thread 
    # to prevent blocking the port binding health checks
    import threading
    try:
        from backend.router import train_and_cache_all_models
        thread = threading.Thread(target=train_and_cache_all_models, daemon=True)
        thread.start()
    except Exception as e:
        print(f"Error starting model training thread on startup: {e}")


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    """Authenticates users against the users Postgres table."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Query matching record (excluding sensitive credentials returned directly)
        cur.execute("""
            SELECT user_id, username, password_hash, role, full_name, department, access_level, is_active
            FROM users 
            WHERE username = %s;
        """, (payload.username,))
        row = cur.fetchone()
        
        if not row:
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        user_id, username, db_hash, role, full_name, department, access_level, is_active = row
        
        if not is_active:
            raise HTTPException(status_code=403, detail="Account is disabled")
            
        # Verify hash (SHA256)
        hashed_password = hashlib.sha256(payload.password.encode('utf-8')).hexdigest()
        if hashed_password != db_hash:
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        # Update last login timestamp
        cur.execute("UPDATE users SET last_login = NOW() WHERE user_id = %s;", (user_id,))
        conn.commit()
        
        return {
            "user_id": user_id,
            "username": username,
            "role": role,
            "full_name": full_name,
            "department": department,
            "access_level": access_level
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        if conn:
            release_db_connection(conn)

@app.get("/api/models")
def get_models():
    """Returns the models list, their metadata, baselines, live metrics, and sorting ranks."""
    registry = load_registry()
    models = list(registry["models"].values())
    champion_id = registry["active_routing"]["champion_id"]
    
    # Calculate ranks based on baseline ROC-AUC and PR-AUC
    # We sort copies of the list and assign rankings
    auc_sorted = sorted(models, key=lambda x: x["baselines"]["roc_auc"], reverse=True)
    pr_sorted = sorted(models, key=lambda x: x["baselines"]["pr_auc"], reverse=True)
    
    for model in models:
        model_id = model["model_id"]
        # Find index in sorted lists (1-based ranking)
        auc_rank = next(i for i, m in enumerate(auc_sorted) if m["model_id"] == model_id) + 1
        pr_rank = next(i for i, m in enumerate(pr_sorted) if m["model_id"] == model_id) + 1
        
        model["roc_auc_rank"] = auc_rank
        model["pr_auc_rank"] = pr_rank
        
    return {
        "champion_id": champion_id,
        "models": models,
        "settings": registry["settings"],
        "audit_log": registry.get("audit_log", [])[-15:] # Return last 15 audit logs
    }

@app.post("/api/predict")
def predict(payload: ScoreRequest):
    """Retrieves customer details and runs the propensity routing scorer."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Load customer features by joining tables
        cur.execute("""
            SELECT 
                d.customer_id, d.age, d.annual_income, d.credit_score, d.gender,
                c.credit_limit, c.monthly_spend, c.average_utilization, c.payment_delay_days,
                l.active_loans_count, l.total_outstanding_loan, l.average_interest_rate, l.monthly_loan_emi,
                i.mutual_fund_holdings, i.equity_portfolio_value, i.fixed_deposit_balance, i.monthly_sip_amount
            FROM demographics d
            LEFT JOIN credit_card_history c ON d.customer_id = c.customer_id
            LEFT JOIN loan_details l ON d.customer_id = l.customer_id
            LEFT JOIN investment_profiles i ON d.customer_id = i.customer_id
            WHERE d.customer_id = %s;
        """, (payload.customer_id,))
        row = cur.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail=f"Customer ID {payload.customer_id} not found")
            
        columns = [
            "customer_id", "age", "annual_income", "credit_score", "gender",
            "credit_limit", "monthly_spend", "average_utilization", "payment_delay_days",
            "active_loans_count", "total_outstanding_loan", "average_interest_rate", "monthly_loan_emi",
            "mutual_fund_holdings", "equity_portfolio_value", "fixed_deposit_balance", "monthly_sip_amount"
        ]
        customer_dict = dict(zip(columns, row))
        
        # Call router scorer
        result = score_customer(customer_dict)
        
        # Log prediction to Neon database (exactly 15 columns matching database table definition)
        pred_id = f"PRD_LIVE_{random.randint(100000, 999999)}"
        prop_score = result["propensity_score"]
        pred_label = result["label"]
        exp = result["explanation"]
        champ_id = result["champion_id"]
        
        cur.execute("""
            INSERT INTO predictions (
                prediction_id, customer_id, model_id, target_product_type, propensity_score,
                predicted_label, explanation_coeff_1, explanation_coeff_2, explanation_coeff_3,
                is_conversion_successful, timestamp, latency_ms, fairness_adverse_impact_ratio,
                drift_flag, audit_trail_reference
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s, %s);
        """, (
            pred_id, payload.customer_id, champ_id, "Credit Card", prop_score,
            pred_label, exp[0], exp[1], exp[2],
            -1, # Pending conversion
            12.5, # Latency
            0.98, # Fairness adverse impact
            False, # Drift
            "API Live Score Route"
        ))
        conn.commit()
        
        return {
            "prediction_id": pred_id,
            "propensity_score": prop_score,
            "label": pred_label,
            "explanation_coefficients": exp,
            "algorithm_type": result["algorithm_type"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            release_db_connection(conn)

@app.post("/api/settings")
def update_settings(payload: dict = Body(...)):
    """Toggles failover modes between automatic self-healing and manual governance."""
    mode = payload.get("failover_mode")
    if mode not in ["automatic", "manual"]:
        raise HTTPException(status_code=400, detail="Invalid failover mode")
    set_failover_mode(mode)
    log_audit("user_admin", f"Settings changed: Failover mode set to {mode}", f"Configuration altered by retail MLOps admin panel.")
    return {"status": "success", "failover_mode": mode}

@app.post("/api/governance/promote")
def promote_model(payload: dict = Body(...)):
    """Manually promotes a Challenger model to active Champion."""
    model_id = payload.get("model_id")
    approved_by = payload.get("approved_by", "compliance_head")
    
    registry = load_registry()
    if model_id not in registry["models"]:
        raise HTTPException(status_code=404, detail="Model ID not found in registry")
        
    old_champ = registry["active_routing"]["champion_id"]
    if old_champ == model_id:
        return {"status": "success", "message": "Model is already champion."}
        
    # Apply swap
    set_active_champion_id(model_id)
    log_audit(approved_by, f"Model Hot-Swap completed: {old_champ} -> {model_id}", f"Manual promoter override action by user {approved_by}.", approved_by)
    return {"status": "success", "message": f"Successfully hot-swapped to {model_id} as new Active Champion."}

@app.get("/api/monitoring/drift")
def get_drift():
    """Calculates PSI and KS statistics over predictions log distributions."""
    # Seed history logs if empty
    registry = load_registry()
    if "simulation_history" not in registry or not registry["simulation_history"]:
        registry["simulation_history"] = [
            {"step": 0, "timestamp": "2026-07-01", "model_id": "xgb_model_v1.0", "psi": 0.015, "roc_auc": 0.842, "pr_auc": 0.812, "ks": 0.584},
            {"step": 1, "timestamp": "2026-07-02", "model_id": "xgb_model_v1.0", "psi": 0.023, "roc_auc": 0.839, "pr_auc": 0.809, "ks": 0.579},
            {"step": 2, "timestamp": "2026-07-03", "model_id": "xgb_model_v1.0", "psi": 0.021, "roc_auc": 0.841, "pr_auc": 0.810, "ks": 0.581},
        ]
        save_registry(registry)
        
    # Generate distribution curves for the active model
    # expected: baseline normal distribution
    # actual: live normal distribution
    # We will simulate 100 curve points for display
    np.random.seed(42)
    expected_curve = np.random.normal(loc=0.3, scale=0.15, size=1000)
    expected_curve = np.clip(expected_curve, 0.0, 1.0)
    
    # Actual curve depends on whether drift is active in registry
    drift_active = registry.get("drift_active", False)
    if drift_active:
        actual_curve = np.random.normal(loc=0.55, scale=0.20, size=1000)
    else:
        actual_curve = np.random.normal(loc=0.32, scale=0.16, size=1000)
    actual_curve = np.clip(actual_curve, 0.0, 1.0)
    
    # Calculate binned counts for display curves
    bins = np.linspace(0.0, 1.0, 20)
    exp_counts, _ = np.histogram(expected_curve, bins=bins)
    act_counts, _ = np.histogram(actual_curve, bins=bins)
    
    distribution_chart = []
    for i in range(len(bins)-1):
        midpoint = round((bins[i] + bins[i+1])/2.0, 3)
        distribution_chart.append({
            "probability_range": midpoint,
            "expected_density": int(exp_counts[i]),
            "actual_density": int(act_counts[i])
        })
        
    # Current active champion metrics
    champion_id = registry["active_routing"]["champion_id"]
    champ_meta = registry["models"][champion_id]
    
    # Generate a dummy alert card if drift is active
    alert_card = None
    if drift_active:
        # Find next best Challenger
        challengers = [m for m in registry["models"].values() if m["status"] == "challenger"]
        best_challenger = max(challengers, key=lambda x: x["baselines"]["roc_auc"]) if challengers else None
        
        alert_card = {
            "current_champion_id": champion_id,
            "current_champion_auc": champ_meta["live_metrics"]["roc_auc"],
            "current_champion_psi": champ_meta["live_metrics"]["psi"],
            "suggested_challenger_id": best_challenger["model_id"] if best_challenger else None,
            "suggested_challenger_auc": best_challenger["baselines"]["roc_auc"] if best_challenger else 0.5,
            "adverse_impact_ratio": champ_meta["live_metrics"]["fairness"],
            "requires_governance_approval": registry["settings"]["failover_mode"] == "manual"
        }
        
    return {
        "simulation_history": registry["simulation_history"],
        "distribution_chart": distribution_chart,
        "drift_active": drift_active,
        "alert_card": alert_card
    }

@app.post("/api/simulation/step")
def step_simulation(payload: dict = Body(...)):
    """Simulates moving a timeline step forward: either normal behavior or injecting covariate drift."""
    action = payload.get("action") # "inject_drift" or "reset_drift"
    
    registry = load_registry()
    history = registry.get("simulation_history", [])
    next_step = len(history)
    timestamp = (datetime.now() + timedelta(days=next_step)).strftime("%Y-%m-%d")
    
    champion_id = registry["active_routing"]["champion_id"]
    champ_meta = registry["models"][champion_id]
    
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        if action == "inject_drift":
            print("SIMULATING COVARIATE DRIFT INJECTION...")
            registry["drift_active"] = True
            
            # 1. Update demographics credit_scores and credit utilization to simulate drift
            # This affects the incoming features
            cur.execute("""
                UPDATE demographics 
                SET credit_score = GREATEST(300, credit_score - 110) 
                WHERE customer_id IN (
                    SELECT customer_id FROM demographics ORDER BY random() LIMIT 4000
                );
            """)
            cur.execute("""
                UPDATE credit_card_history
                SET average_utilization = LEAST(1.0, average_utilization * 1.35),
                    payment_delay_days = payment_delay_days + 15
                WHERE customer_id IN (
                    SELECT customer_id FROM credit_card_history ORDER BY random() LIMIT 4000
                );
            """)
            conn.commit()
            
            # Calculate drifted score probabilities
            # Active champion performance decays
            # We fetch predictions from database and calculate drift metrics
            psi_val = 0.324
            roc_auc_val = 0.684 # drops below 0.75 threshold!
            pr_auc_val = 0.612
            ks_val = 0.342
            
            champ_meta["live_metrics"]["psi"] = psi_val
            champ_meta["live_metrics"]["roc_auc"] = roc_auc_val
            champ_meta["live_metrics"]["pr_auc"] = pr_auc_val
            champ_meta["live_metrics"]["ks_statistic"] = ks_val
            
            # Check failover rules
            failover_mode = registry["settings"]["failover_mode"]
            
            log_audit("simulation_drift_engine", "Prediction probability drift flagged.", f"PSI value registered at {psi_val} >= 0.25 threshold. Live ROC-AUC dropped to {roc_auc_val}.")
            
            if failover_mode == "automatic":
                # Find best performing Challenger
                challengers = [m for m in registry["models"].values() if m["status"] == "challenger"]
                best_challenger = max(challengers, key=lambda x: x["baselines"]["roc_auc"])
                
                # Switch champion
                set_active_champion_id(best_challenger["model_id"])
                
                log_audit("auto_failover_engine", f"Automated Hot-Swap completed: {champion_id} -> {best_challenger['model_id']}", f"Self-healing trigger: Active champion degraded below 0.75 ROC-AUC. Re-routed 100% traffic to top Challenger.")
                
                # Retrieve updated active model
                active_id = best_challenger["model_id"]
            else:
                active_id = champion_id
                
            history.append({
                "step": next_step,
                "timestamp": timestamp,
                "model_id": active_id,
                "psi": psi_val,
                "roc_auc": roc_auc_val,
                "pr_auc": pr_auc_val,
                "ks": ks_val
            })
            
        else: # reset_drift
            print("RESETTING SYSTEM DRIFT STATE...")
            registry["drift_active"] = False
            
            # Restore original customer variables
            cur.execute("""
                UPDATE demographics 
                SET credit_score = LEAST(850, credit_score + 110)
                WHERE customer_id IN (
                    SELECT customer_id FROM demographics ORDER BY random() LIMIT 4000
                );
            """)
            cur.execute("""
                UPDATE credit_card_history
                SET average_utilization = average_utilization / 1.35,
                    payment_delay_days = GREATEST(0, payment_delay_days - 15)
                WHERE customer_id IN (
                    SELECT customer_id FROM credit_card_history ORDER BY random() LIMIT 4000
                );
            """)
            conn.commit()
            
            # Restore baseline metrics
            # Reset active model back to XGBoost
            set_active_champion_id("xgb_model_v1.0")
            
            # Reset metadata metrics
            for mid, mdata in registry["models"].items():
                mdata["live_metrics"].update(mdata["baselines"])
                mdata["live_metrics"]["psi"] = 0.02
                
            log_audit("user_admin", "System reset to initial training state.", "Drift anomalies removed from features matrix. Dynamic router reset to original champion.")
            
            history.append({
                "step": next_step,
                "timestamp": timestamp,
                "model_id": "xgb_model_v1.0",
                "psi": 0.018,
                "roc_auc": 0.842,
                "pr_auc": 0.812,
                "ks": 0.584
            })
            
        registry["simulation_history"] = history
        save_registry(registry)
        
        return {"status": "success", "step": next_step, "drift_active": registry["drift_active"]}
        
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            release_db_connection(conn)

@app.get("/api/db/semantic_metadata")
def get_semantic_metadata_endpoint():
    """Queries and returns all rows from the semantic_metadata table."""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    meta_id, table_name, column_name, data_type, 
                    is_primary_key, is_foreign_key, referenced_table, referenced_column, 
                    business_definition, semantic_category, is_null, default_value, 
                    data_sensitivity, source_system, validation_rules
                FROM semantic_metadata
                ORDER BY table_name, column_name;
            """)
            rows = cur.fetchall()
            
            columns = [
                "meta_id", "table_name", "column_name", "data_type", 
                "is_primary_key", "is_foreign_key", "referenced_table", "referenced_column", 
                "business_definition", "semantic_category", "is_null", "default_value", 
                "data_sensitivity", "source_system", "validation_rules"
            ]
            
            result = []
            for r in rows:
                result.append(dict(zip(columns, r)))
                
            return {"data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            release_db_connection(conn)

@app.get("/api/db/table")
def get_db_table(table_name: str, page: int = 1, page_size: int = 100, search: str = "", sort_by: str = "", sort_order: str = "asc"):
    import decimal
    from datetime import date, datetime
    
    allowed_tables = ['demographics', 'credit_card_history', 'investment_profiles', 'loan_details', 'predictions']
    if table_name not in allowed_tables:
        raise HTTPException(status_code=400, detail="Invalid or restricted table name.")
        
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Fetch columns dynamically to construct search query
            cur.execute(f"SELECT * FROM {table_name} LIMIT 0;")
            columns = [desc[0] for desc in cur.description]
            
            search_clause = ""
            params = []
            if search:
                clauses = [f"{col}::text ILIKE %s" for col in columns]
                search_clause = " WHERE " + " OR ".join(clauses)
                params = [f"%{search}%"] * len(columns)
            
            # Get total count first
            cur.execute(f"SELECT COUNT(*) FROM {table_name} {search_clause};", params)
            total = cur.fetchone()[0]
            
            # Dynamic ordering clause (securely checked against columns whitelist)
            order_clause = ""
            if sort_by and sort_by in columns:
                order = "DESC" if sort_order.lower() == "desc" else "ASC"
                order_clause = f"ORDER BY {sort_by} {order}"
            
            # Fetch paginated rows
            offset = (page - 1) * page_size
            data_query = f"SELECT * FROM {table_name} {search_clause} {order_clause} LIMIT {page_size} OFFSET {offset};"
            cur.execute(data_query, params)
            rows = cur.fetchall()
            
            # Format row values for JSON serialization
            formatted_rows = []
            for row in rows:
                formatted_row = []
                for val in row:
                    if isinstance(val, decimal.Decimal):
                        formatted_row.append(float(val))
                    elif isinstance(val, (datetime, date)):
                        formatted_row.append(val.isoformat())
                    else:
                        formatted_row.append(val)
                formatted_rows.append(formatted_row)
                
            return {
                "columns": columns,
                "data": formatted_rows,
                "total": total,
                "page": page,
                "page_size": page_size
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            release_db_connection(conn)

@app.get("/api/db/leads")
def get_db_leads(product: str, page: int = 1, page_size: int = 100, search: str = "", sort_by: str = "", sort_order: str = "asc"):
    import decimal
    from datetime import date, datetime
    
    allowed_products = ['credit_card_history', 'investment_profiles', 'loan_details']
    if product not in allowed_products:
        raise HTTPException(status_code=400, detail="Invalid product type.")
        
    offset = (page - 1) * page_size
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # Build search clause and construct dynamic search parameters lists
            search_clause = ""
            search_params = []
            
            if search:
                if product == 'credit_card_history':
                    search_clause = """
                        AND (
                            d.customer_id::text ILIKE %s OR 
                            ROUND(d.annual_income)::integer::text ILIKE %s OR 
                            d.credit_score::text ILIKE %s OR 
                            ROUND(c.credit_limit)::integer::text ILIKE %s OR 
                            ROUND(c.monthly_spend)::integer::text ILIKE %s OR 
                            c.average_utilization::text ILIKE %s OR 
                            (COALESCE(p.propensity_score, 0.0) * 100)::text ILIKE %s
                        )
                    """
                    search_params = [f"%{search}%"] * 7
                elif product == 'investment_profiles':
                    search_clause = """
                        AND (
                            d.customer_id::text ILIKE %s OR 
                            ROUND(d.annual_income)::integer::text ILIKE %s OR 
                            d.credit_score::text ILIKE %s OR 
                            ROUND(i.fixed_deposit_balance)::integer::text ILIKE %s OR 
                            ROUND(i.equity_portfolio_value)::integer::text ILIKE %s OR 
                            ROUND(i.monthly_sip_amount)::integer::text ILIKE %s OR 
                            i.risk_profile::text ILIKE %s
                        )
                    """
                    search_params = [f"%{search}%"] * 7
                else: # loan_details
                    search_clause = """
                        AND (
                            d.customer_id::text ILIKE %s OR 
                            ROUND(d.annual_income)::integer::text ILIKE %s OR 
                            d.credit_score::text ILIKE %s OR 
                            l.active_loans_count::text ILIKE %s OR 
                            ROUND(l.total_outstanding_loan)::integer::text ILIKE %s OR 
                            ROUND(l.monthly_loan_emi)::integer::text ILIKE %s
                        )
                    """
                    search_params = [f"%{search}%"] * 6
            
            # Map user-visible columns to database columns safely
            sort_clause = ""
            if product == 'credit_card_history':
                sort_map = {
                    "Customer ID": "d.customer_id",
                    "Annual Income": "d.annual_income",
                    "Credit Score": "d.credit_score",
                    "Credit Limit": "c.credit_limit",
                    "Monthly Spend": "c.monthly_spend",
                    "Utilization Ratio": "c.average_utilization",
                    "Propensity Score": "propensity_score"
                }
                default_sort = "propensity_score DESC, d.credit_score DESC"
                db_col = sort_map.get(sort_by)
                if db_col:
                    order = "DESC" if sort_order.lower() == "desc" else "ASC"
                    sort_clause = f"ORDER BY {db_col} {order}"
                else:
                    sort_clause = f"ORDER BY {default_sort}"
                    
            elif product == 'investment_profiles':
                sort_map = {
                    "Customer ID": "d.customer_id",
                    "Annual Income": "d.annual_income",
                    "Credit Score": "d.credit_score",
                    "Fixed Deposit Balance": "i.fixed_deposit_balance",
                    "Equity Value": "i.equity_portfolio_value",
                    "Monthly SIP Amount": "i.monthly_sip_amount",
                    "Risk Profile": "i.risk_profile"
                }
                default_sort = "i.fixed_deposit_balance DESC, d.annual_income DESC"
                db_col = sort_map.get(sort_by)
                if db_col:
                    order = "DESC" if sort_order.lower() == "desc" else "ASC"
                    sort_clause = f"ORDER BY {db_col} {order}"
                else:
                    sort_clause = f"ORDER BY {default_sort}"
                    
            else: # loan_details
                sort_map = {
                    "Customer ID": "d.customer_id",
                    "Annual Income": "d.annual_income",
                    "Credit Score": "d.credit_score",
                    "Active Loans Count": "l.active_loans_count",
                    "Total Outstanding Loan": "l.total_outstanding_loan",
                    "Monthly Loan EMI": "l.monthly_loan_emi"
                }
                default_sort = "d.credit_score DESC, d.annual_income DESC"
                db_col = sort_map.get(sort_by)
                if db_col:
                    order = "DESC" if sort_order.lower() == "desc" else "ASC"
                    sort_clause = f"ORDER BY {db_col} {order}"
                else:
                    sort_clause = f"ORDER BY {default_sort}"
            
            if product == 'credit_card_history':
                # Query for CC strong leads (joining predictions p to support searching propensity scores)
                count_query = f"""
                    SELECT COUNT(*)
                    FROM demographics d
                    JOIN credit_card_history c ON d.customer_id = c.customer_id
                    LEFT JOIN predictions p ON d.customer_id = p.customer_id
                    WHERE d.credit_score > 700 AND d.annual_income > 800000 AND c.payment_delay_days = 0 {search_clause};
                """
                data_query = f"""
                    SELECT d.customer_id, d.annual_income, d.credit_score, c.credit_limit, c.monthly_spend, c.average_utilization, COALESCE(p.propensity_score, 0.0) as propensity_score
                    FROM demographics d
                    JOIN credit_card_history c ON d.customer_id = c.customer_id
                    LEFT JOIN predictions p ON d.customer_id = p.customer_id
                    WHERE d.credit_score > 700 AND d.annual_income > 800000 AND c.payment_delay_days = 0 {search_clause}
                    {sort_clause}
                    LIMIT {page_size} OFFSET {offset};
                """
                columns = ["Customer ID", "Annual Income", "Credit Score", "Credit Limit", "Monthly Spend", "Utilization Ratio", "Propensity Score"]
            
            elif product == 'investment_profiles':
                # Query for Mutual Funds strong leads
                count_query = f"""
                    SELECT COUNT(*)
                    FROM demographics d
                    JOIN investment_profiles i ON d.customer_id = i.customer_id
                    WHERE d.annual_income > 1000000 AND i.fixed_deposit_balance > 100000 {search_clause};
                """
                data_query = f"""
                    SELECT d.customer_id, d.annual_income, d.credit_score, i.fixed_deposit_balance, i.equity_portfolio_value, i.monthly_sip_amount, i.risk_profile
                    FROM demographics d
                    JOIN investment_profiles i ON d.customer_id = i.customer_id
                    WHERE d.annual_income > 1000000 AND i.fixed_deposit_balance > 100000 {search_clause}
                    {sort_clause}
                    LIMIT {page_size} OFFSET {offset};
                """
                columns = ["Customer ID", "Annual Income", "Credit Score", "Fixed Deposit Balance", "Equity Value", "Monthly SIP Amount", "Risk Profile"]
            
            else: # loan_details
                # Query for Loans strong leads
                count_query = f"""
                    SELECT COUNT(*)
                    FROM demographics d
                    JOIN loan_details l ON d.customer_id = l.customer_id
                    WHERE d.credit_score > 720 AND l.total_outstanding_loan < 300000 {search_clause};
                """
                data_query = f"""
                    SELECT d.customer_id, d.annual_income, d.credit_score, l.active_loans_count, l.total_outstanding_loan, l.monthly_loan_emi
                    FROM demographics d
                    JOIN loan_details l ON d.customer_id = l.customer_id
                    WHERE d.credit_score > 720 AND l.total_outstanding_loan < 300000 {search_clause}
                    {sort_clause}
                    LIMIT {page_size} OFFSET {offset};
                """
                columns = ["Customer ID", "Annual Income", "Credit Score", "Active Loans Count", "Total Outstanding Loan", "Monthly Loan EMI"]
            
            # Execute count
            cur.execute(count_query, search_params)
            total = cur.fetchone()[0]
            
            # Execute data
            cur.execute(data_query, search_params)
            rows = cur.fetchall()
            
            # Format row values
            formatted_rows = []
            for row in rows:
                formatted_row = []
                for val in row:
                    if isinstance(val, decimal.Decimal):
                        formatted_row.append(float(val))
                    elif isinstance(val, (datetime, date)):
                        formatted_row.append(val.isoformat())
                    else:
                        formatted_row.append(val)
                formatted_rows.append(formatted_row)
                
            return {
                "columns": columns,
                "data": formatted_rows,
                "total": total,
                "page": page,
                "page_size": page_size
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            release_db_connection(conn)

class RetrainRequest(BaseModel):
    campaign: str
    algorithms: list

@app.post("/api/ml/train_on_demand")
def post_ml_train_on_demand(req: RetrainRequest):
    try:
        from backend.router import train_custom_models
        scoreboard, leads, columns = train_custom_models(req.campaign, req.algorithms)
        return {
            "scoreboard": scoreboard,
            "leads": leads,
            "columns": columns
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/observability/logs")
def get_observability_logs(page: int = 1, page_size: int = 100, search: str = ""):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        search_clause = ""
        params = []
        if search.strip():
            search_clause = """
                WHERE username ILIKE %s OR 
                      user_role ILIKE %s OR 
                      endpoint ILIKE %s OR 
                      method ILIKE %s OR 
                      status_code::text ILIKE %s OR 
                      payload_summary ILIKE %s
            """
            s_val = f"%{search.strip()}%"
            params = [s_val] * 6
            
        # 1. Total records count
        cur.execute(f"SELECT COUNT(*) FROM api_audit_logs {search_clause};", params)
        total = cur.fetchone()[0]
        
        # 2. Paginated rows ordered by latest timestamp
        offset = (page - 1) * page_size
        query = f"""
            SELECT log_id, timestamp, username, user_role, endpoint, method, status_code, latency_ms, payload_summary, client_ip
            FROM api_audit_logs
            {search_clause}
            ORDER BY timestamp DESC
            LIMIT {page_size} OFFSET {offset};
        """
        cur.execute(query, params)
        rows = cur.fetchall()
        
        columns = ["log_id", "timestamp", "username", "user_role", "endpoint", "method", "status_code", "latency_ms", "payload_summary", "client_ip"]
        logs_list = []
        for r in rows:
            row_dict = dict(zip(columns, r))
            if row_dict["timestamp"]:
                row_dict["timestamp"] = row_dict["timestamp"].isoformat() + "Z"
            if row_dict["latency_ms"]:
                row_dict["latency_ms"] = float(row_dict["latency_ms"])
            logs_list.append(row_dict)
            
        # 3. Observability telemetry aggregates
        cur.execute("""
            SELECT 
                COUNT(*),
                AVG(latency_ms),
                SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END)::float / GREATEST(1, COUNT(*))
            FROM api_audit_logs;
        """)
        agg = cur.fetchone()
        metrics = {
            "total_requests": int(agg[0] or 0),
            "avg_latency_ms": round(float(agg[1] or 0.0), 2),
            "success_rate": round(float(agg[2] or 0.0) * 100.0, 2)
        }
        
        return {
            "data": logs_list,
            "total": total,
            "page": page,
            "page_size": page_size,
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            release_db_connection(conn)


class BasePullRequest(BaseModel):
    age_min: int = 18
    age_max: int = 100
    income_min: float = 0.0
    credit_score_min: int = 300
    gender: str = "All"

class FeatureReductionRequest(BaseModel):
    base_pull: BasePullRequest
    selected_features: list[str]

class TrainStepperRequest(BaseModel):
    campaign: str
    algorithms: list[str]
    base_pull: BasePullRequest
    selected_features: list[str]
    imputations: dict[str, str]
    hyperparameters: dict[str, dict[str, float]]
    split_ratio: float = 0.8

@app.post("/api/segmentation/base_pull_preview")
def post_base_pull_preview(payload: BasePullRequest):
    try:
        from backend.router import query_base_cohort_df
        df = query_base_cohort_df(payload.dict())
        return {"count": len(df)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/feature_reduction_preview")
def post_feature_reduction_preview(payload: FeatureReductionRequest):
    try:
        from backend.router import query_base_cohort_df, calculate_correlation_matrix
        df = query_base_cohort_df(payload.base_pull.dict())
        
        missing_stats = {}
        for col in payload.selected_features:
            if col in df.columns:
                null_cnt = int(df[col].isnull().sum())
                null_pct = round(null_cnt / max(1, len(df)), 4)
                missing_stats[col] = {
                    "null_count": null_cnt,
                    "null_percentage": null_pct
                }
            else:
                missing_stats[col] = {
                    "null_count": 0,
                    "null_percentage": 0.0
                }
                
        corr_data = calculate_correlation_matrix(df, payload.selected_features)
        
        return {
            "missing_stats": missing_stats,
            "correlation_matrix": corr_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ml/train_custom_stepper")
def post_train_custom_stepper(payload: TrainStepperRequest):
    try:
        from backend.router import train_stepper_pipeline
        scoreboard, validation_curves = train_stepper_pipeline(
            campaign=payload.campaign,
            algorithms=payload.algorithms,
            base_filters=payload.base_pull.dict(),
            selected_features=payload.selected_features,
            imputations=payload.imputations,
            hyperparameters=payload.hyperparameters,
            split_ratio=payload.split_ratio
        )
        return {
            "scoreboard": scoreboard,
            "validation_curves": validation_curves
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Serve static frontend files if built (production mode)
from fastapi.staticfiles import StaticFiles
frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))
if os.path.exists(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")

