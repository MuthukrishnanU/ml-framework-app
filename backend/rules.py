import json
import pandas as pd
import numpy as np
from datetime import datetime
from backend.db import get_db_connection, release_db_connection

class RuleEngine:
    """Evaluates JSON-defined rule conditions and executes monthly bucket-wise runs."""
    
    @staticmethod
    def evaluate_rule_condition(row: pd.Series, condition: dict) -> bool:
        """Evaluates a single condition against a DataFrame row.
        Example condition: {"feature": "age", "operator": ">=", "value": 25}
        """
        feature = condition.get("feature")
        op = condition.get("operator")
        val = condition.get("value")
        
        if feature not in row or pd.isna(row[feature]):
            return False
            
        row_val = row[feature]
        
        try:
            val = float(val) if isinstance(val, (int, float, str)) and str(val).replace('.', '', 1).isdigit() else val
            row_val = float(row_val) if isinstance(row_val, (int, float, str)) and str(row_val).replace('.', '', 1).isdigit() else row_val
        except ValueError:
            pass
            
        if op == ">=": return row_val >= val
        if op == ">": return row_val > val
        if op == "<=": return row_val <= val
        if op == "<": return row_val < val
        if op == "==": return row_val == val
        if op == "!=": return row_val != val
        if op == "in": return row_val in val if isinstance(val, list) else str(row_val) in str(val)
        return False

    @classmethod
    def evaluate_rule_set(cls, df: pd.DataFrame, rule_config: dict) -> pd.Series:
        """Evaluates a set of conditions combined with logical AND/OR operators across a DataFrame."""
        logic = rule_config.get("logic", "AND").upper()
        conditions = rule_config.get("conditions", [])
        
        if not conditions:
            return pd.Series([False] * len(df), index=df.index)
            
        results = []
        for cond in conditions:
            cond_series = df.apply(lambda row: cls.evaluate_rule_condition(row, cond), axis=1)
            results.append(cond_series)
            
        if logic == "OR":
            final_mask = results[0]
            for res in results[1:]:
                final_mask = final_mask | res
            return final_mask
        else: # AND
            final_mask = results[0]
            for res in results[1:]:
                final_mask = final_mask & res
            return final_mask

    @classmethod
    def execute_rule_model(cls, df: pd.DataFrame, rule_model: dict) -> dict:
        """Executes a rule-based model on a dataset and returns predictions & bucket distributions."""
        rule_config = rule_model.get("rule_config", {})
        mask = cls.evaluate_rule_set(df, rule_config)
        
        matched_count = int(mask.sum())
        total_count = len(df)
        match_rate = float(matched_count / total_count) if total_count > 0 else 0.0
        
        # Monthly DPD bucket distribution analysis
        buckets = {"0 DPD (Current)": 0, "1-30 DPD": 0, "31-60 DPD": 0, "61-90 DPD": 0, "90+ DPD": 0}
        if "payment_delay_days" in df.columns:
            matched_df = df[mask]
            for dpd in matched_df["payment_delay_days"].fillna(0):
                if dpd <= 0: buckets["0 DPD (Current)"] += 1
                elif dpd <= 30: buckets["1-30 DPD"] += 1
                elif dpd <= 60: buckets["31-60 DPD"] += 1
                elif dpd <= 90: buckets["61-90 DPD"] += 1
                else: buckets["90+ DPD"] += 1
                
        # Generate predictions vector
        predictions = mask.astype(int).tolist()
        scores = np.where(mask, 0.95, 0.05).tolist()
        
        return {
            "model_id": rule_model.get("model_id"),
            "model_name": rule_model.get("model_name", "Rule Model"),
            "total_evaluated": total_count,
            "matched_count": matched_count,
            "match_rate": round(match_rate, 4),
            "monthly_dpd_buckets": buckets,
            "predictions_sample": predictions[:20],
            "scores_sample": scores[:20],
            "execution_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    @classmethod
    def run_monthly_bucket_execution(cls, rule_models: list) -> list:
        """Runs batch monthly bucket execution across all active rule models."""
        from backend.router import load_training_data
        df = load_training_data()
        if df.empty:
            return []
            
        results = []
        for rm in rule_models:
            res = cls.execute_rule_model(df, rm)
            results.append(res)
        return results
