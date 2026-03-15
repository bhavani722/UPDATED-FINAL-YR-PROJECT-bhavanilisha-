"""
FastAPI Backend - Hybrid UPI Fraud Detection System
Main API server with REST endpoints for transaction evaluation,
admin dashboard, graph visualization, and authentication.
"""
import os
import sys
import json
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np

# Ensure backend dir is in path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

# ============================================================
# Pydantic Models
# ============================================================

class TransactionRequest(BaseModel):
    """Transaction evaluation request from user panel."""
    User_ID: str = Field(default="UPI_USER_1001", description="Sender User ID")
    Receiver_ID: str = Field(default="UPI_USER_1050", description="Receiver User ID")
    Amount: float = Field(default=5000.0, ge=1, le=100000)
    Sender_Lat: float = Field(default=19.0760)
    Sender_Lon: float = Field(default=72.8777)
    Receiver_Lat: float = Field(default=12.9716)
    Receiver_Lon: float = Field(default=77.5946)
    Device_ID: str = Field(default="device_abc123")
    Registered_Device_ID: str = Field(default="device_abc123")
    SIM_Change_Flag: int = Field(default=0, ge=0, le=1)
    VPN_Flag: int = Field(default=0, ge=0, le=1)
    Burst_Count: int = Field(default=1, ge=0)
    Remark_Text: str = Field(default="Payment to friend")
    Sequence_Amount_List: str = Field(default="[500, 800, 300, 1200, 5000]")

class LoginRequest(BaseModel):
    username: str
    password: str

class TransactionFilter(BaseModel):
    risk_min: float = 0.0
    risk_max: float = 1.0
    decision: Optional[str] = None
    user_id: Optional[str] = None
    limit: int = 100
    offset: int = 0

class VerifyOtpRequest(BaseModel):
    transaction_id: str = Field(..., description="Transaction ID to verify")
    entered_otp: str = Field(..., description="6-digit OTP entered by user")

# ============================================================
# App Configuration
# ============================================================

app = FastAPI(
    title="Hybrid UPI Fraud Detection API",
    description="Multi-layer fraud detection with ML, NLP, LSTM, Graph Analysis, and Hybrid Risk Engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# ============================================================
# In-Memory State
# ============================================================

# JWT-like token store (simplified for academic project)
ADMIN_USERS = {
    "admin": hashlib.sha256("admin123".encode()).hexdigest(),
    "professor": hashlib.sha256("review2025".encode()).hexdigest(),
}
active_tokens = {}
transaction_log = []  # In-memory transaction log
otp_store = {}  # In-memory OTP store

# ============================================================
# Auth Helpers
# ============================================================

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    if token not in active_tokens:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if active_tokens[token]['expires'] < datetime.now():
        del active_tokens[token]
        raise HTTPException(status_code=401, detail="Token expired")
    return active_tokens[token]

# ============================================================
# Lazy Initialization
# ============================================================

_risk_engine = None
_graph_engine = None
_dataset_df = None

def get_risk_engine_instance():
    global _risk_engine
    if _risk_engine is None:
        from risk_engine import get_risk_engine
        _risk_engine = get_risk_engine(model_dir='trained_models')
    return _risk_engine

def get_graph_engine_instance():
    global _graph_engine
    if _graph_engine is None:
        from modules.graph_engine import init_graph_engine
        _graph_engine = init_graph_engine(csv_path='data/synthetic_upi_transactions.csv')
    return _graph_engine

def get_dataset():
    global _dataset_df
    if _dataset_df is None:
        path = 'data/synthetic_upi_transactions.csv'
        if os.path.exists(path):
            _dataset_df = pd.read_csv(path)
    return _dataset_df

# ============================================================
# PUBLIC ENDPOINTS
# ============================================================

@app.get("/")
def root():
    return {
        "system": "Hybrid UPI Fraud Detection System",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "evaluate": "POST /api/evaluate",
            "login": "POST /api/auth/login",
            "dashboard": "GET /api/admin/dashboard",
            "graph": "GET /api/admin/graph",
        }
    }

@app.get("/api/health")
def health_check():
    engine = get_risk_engine_instance()
    return {
        "status": "healthy",
        "engine_ready": engine.ready if engine else False,
        "models_loaded": {
            "core": engine.core_model is not None if engine else False,
            "nlp": engine.nlp_model is not None if engine else False,
            "lstm": engine.lstm_model is not None if engine else False,
        },
        "timestamp": datetime.now().isoformat(),
    }

# ============================================================
# DECISION ENGINE
# ============================================================

import random

def generate_otp():
    """Generates a 6-digit OTP."""
    return str(random.randint(100000, 999999))

def decision_engine(risk_score: float) -> str:
    """Returns the decision based on risk score thresholds."""
    if risk_score > 0.70:
        return "BLOCK"
    elif risk_score > 0.30:
        return "OTP"
    else:
        return "ALLOW"

# ============================================================
# TRANSACTION EVALUATION (User Panel)
# ============================================================

@app.post("/transaction")
@app.post("/api/evaluate")
def evaluate_transaction(tx: TransactionRequest):
    """
    Evaluate a UPI transaction through the hybrid risk engine.
    Returns all model scores, final risk, decision, and fraud reasons.
    """
    engine = get_risk_engine_instance()
    if not engine or not engine.ready:
        raise HTTPException(status_code=503, detail="Risk engine not ready. Train models first.")

    # Build graph if needed
    try:
        graph = get_graph_engine_instance()
        if engine.graph_engine is None or not engine.graph_engine._built:
            engine.graph_engine = graph
    except:
        pass

    tx_data = tx.dict()
    tx_data['Transaction_ID'] = f"TXN_LIVE_{len(transaction_log)+1:06d}"
    tx_data['Timestamp'] = datetime.now().isoformat()

    # Evaluate
    result = engine.evaluate_transaction(tx_data)

    # Log transaction
    log_entry = {
        **result,
        'timestamp': tx_data['Timestamp'],
        'remark_text': tx_data['Remark_Text'],
    }
    transaction_log.append(log_entry)

    # Use the new decision_engine for determining the outcome
    risk_score = result.get('final_risk_score', 0.0)
    decision = decision_engine(risk_score)
    result['decision'] = decision # update decision based on new logic
    
    # Format the requested output while preserving the original metadata for the UI
    transaction_id = result.get('transaction_id', tx_data['Transaction_ID'])
    
    if decision == "BLOCK":
        reasons = ", ".join(result.get("fraud_reasons", []))
        result["status"] = "BLOCKED"
        result["risk_score"] = risk_score
        result["reason"] = f"High fraud probability detected. Signals: {reasons}"
    elif decision == "OTP":
        otp = generate_otp()
        otp_store[transaction_id] = otp
        print(f"\n[BACKEND LOG] OTP Generated for TXN {transaction_id}: {otp}\n")
        result["status"] = "OTP_REQUIRED"
        result["risk_score"] = risk_score
        result["otp_generated"] = otp
    else:
        # ALLOW
        result["status"] = "APPROVED"
        result["risk_score"] = risk_score

    return result

@app.post("/verify-otp")
@app.post("/api/verify-otp")
def verify_otp(req: VerifyOtpRequest):
    """Verify the 6-digit OTP for a transaction."""
    tx_id = req.transaction_id
    entered_otp = req.entered_otp
    
    if tx_id not in otp_store:
        return {"status": "INVALID_OTP", "message": "OTP expired or transaction not found"}
        
    if otp_store[tx_id] == entered_otp:
        # OTP verified successfully
        del otp_store[tx_id] # Clear OTP after successful verification
        
        # Optionally update log
        for log in transaction_log:
            if log.get('transaction_id') == tx_id:
                log['decision'] = 'ALLOW (OTP Verified)'
                break
                
        return {"status": "TRANSACTION_APPROVED"}
    else:
        return {"status": "INVALID_OTP"}

@app.get("/api/sample-transactions")
def get_sample_transactions(count: int = 5, include_fraud: bool = True):
    """Get sample transactions from the dataset for testing."""
    df = get_dataset()
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if include_fraud:
        fraud = df[df['Fraud_Label'] == 1].head(count // 2 + 1)
        normal = df[df['Fraud_Label'] == 0].head(count // 2 + 1)
        sample = pd.concat([fraud, normal]).head(count)
    else:
        sample = df.head(count)

    return sample.to_dict('records')

# ============================================================
# AUTHENTICATION
# ============================================================

@app.post("/api/auth/login")
def login(req: LoginRequest):
    """Admin login. Returns a session token."""
    pwd_hash = hashlib.sha256(req.password.encode()).hexdigest()
    if req.username not in ADMIN_USERS or ADMIN_USERS[req.username] != pwd_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = secrets.token_hex(32)
    active_tokens[token] = {
        'username': req.username,
        'expires': datetime.now() + timedelta(hours=8),
    }

    return {
        "token": token,
        "username": req.username,
        "expires_in": "8 hours",
        "message": "Login successful"
    }

@app.post("/api/auth/logout")
def logout(user=Depends(verify_token)):
    # Remove token
    token_to_remove = None
    for t, data in active_tokens.items():
        if data['username'] == user['username']:
            token_to_remove = t
            break
    if token_to_remove:
        del active_tokens[token_to_remove]
    return {"message": "Logged out successfully"}

# ============================================================
# ADMIN DASHBOARD ENDPOINTS (Protected)
# ============================================================

@app.get("/api/admin/dashboard")
def admin_dashboard(user=Depends(verify_token)):
    """Dashboard overview with aggregated statistics."""
    df = get_dataset()
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    total = len(df)
    fraud_count = int(df['Fraud_Label'].sum())
    fraud_pct = round(fraud_count / total * 100, 2)

    # Risk distribution from transaction log (if available)
    risk_distribution = {'low': 0, 'medium': 0, 'high': 0}
    block_count = 0
    otp_count = 0
    allow_count = 0

    for log in transaction_log:
        score = log.get('final_risk_score', 0)
        decision = log.get('decision', '')
        if score < 0.3:
            risk_distribution['low'] += 1
        elif score <= 0.7:
            risk_distribution['medium'] += 1
        else:
            risk_distribution['high'] += 1

        if decision == 'BLOCK':
            block_count += 1
        elif decision == 'OTP':
            otp_count += 1
        elif decision == 'ALLOW':
            allow_count += 1

    return {
        'total_transactions': total,
        'fraud_count': fraud_count,
        'fraud_percentage': fraud_pct,
        'normal_count': total - fraud_count,
        'live_evaluations': len(transaction_log),
        'decisions': {
            'allow': allow_count,
            'otp': otp_count,
            'block': block_count,
        },
        'risk_distribution': risk_distribution,
        'avg_amount_fraud': round(float(df[df['Fraud_Label']==1]['Amount'].mean()), 2) if fraud_count > 0 else 0,
        'avg_amount_normal': round(float(df[df['Fraud_Label']==0]['Amount'].mean()), 2),
    }

@app.get("/api/admin/analytics")
def admin_analytics(user=Depends(verify_token)):
    """
    Analytics data for charts: ROC, precision-recall, monthly trends, risk histogram.
    """
    # Load evaluation metrics
    metrics_path = 'trained_models/evaluation_metrics.json'
    metrics = {}
    if os.path.exists(metrics_path):
        with open(metrics_path) as f:
            metrics = json.load(f)

    df = get_dataset()
    monthly_fraud = {}
    if df is not None:
        df_copy = df.copy()
        df_copy['Timestamp'] = pd.to_datetime(df_copy['Timestamp'])
        df_copy['month'] = df_copy['Timestamp'].dt.strftime('%Y-%m')
        grouped = df_copy.groupby('month')['Fraud_Label'].agg(['sum', 'count']).reset_index()
        for _, row in grouped.iterrows():
            monthly_fraud[row['month']] = {
                'fraud': int(row['sum']),
                'total': int(row['count']),
                'fraud_rate': round(row['sum'] / row['count'] * 100, 2)
            }

    # ROC and PR curve data (sampled for frontend)
    roc_data = []
    pr_data = []
    if 'y_test' in metrics and 'y_prob' in metrics:
        from sklearn.metrics import roc_curve, precision_recall_curve
        y_test = np.array(metrics['y_test'])
        y_prob = np.array(metrics['y_prob'])

        fpr, tpr, _ = roc_curve(y_test, y_prob)
        # Sample to ~100 points
        step = max(1, len(fpr) // 100)
        roc_data = [{'fpr': round(float(fpr[i]),4), 'tpr': round(float(tpr[i]),4)} for i in range(0, len(fpr), step)]

        precision, recall, _ = precision_recall_curve(y_test, y_prob)
        step = max(1, len(precision) // 100)
        pr_data = [{'precision': round(float(precision[i]),4), 'recall': round(float(recall[i]),4)} for i in range(0, len(precision), step)]

    # Risk histogram from live evaluations
    risk_histogram = [0] * 10  # bins: 0-0.1, 0.1-0.2, ..., 0.9-1.0
    for log in transaction_log:
        score = log.get('final_risk_score', 0)
        bin_idx = min(int(score * 10), 9)
        risk_histogram[bin_idx] += 1

    return {
        'model_metrics': {
            'accuracy': metrics.get('accuracy', 0),
            'precision': metrics.get('precision', 0),
            'recall': metrics.get('recall', 0),
            'f1_score': metrics.get('f1_score', 0),
            'roc_auc': metrics.get('roc_auc', 0),
            'confusion_matrix': metrics.get('confusion_matrix', []),
        },
        'feature_importance': metrics.get('feature_importance', []),
        'roc_curve': roc_data,
        'pr_curve': pr_data,
        'monthly_fraud_trend': monthly_fraud,
        'risk_histogram': risk_histogram,
    }

@app.get("/api/admin/fraud-breakdown")
def admin_fraud_breakdown(user=Depends(verify_token)):
    """Fraud cause breakdown analysis."""
    if not transaction_log:
        # Analyze from dataset
        df = get_dataset()
        if df is None:
            return {'breakdown': {}}

        fraud_df = df[df['Fraud_Label'] == 1]
        total_fraud = len(fraud_df)
        if total_fraud == 0:
            return {'breakdown': {}}

        return {
            'breakdown': {
                'device_fraud': round(fraud_df['Device_ID'].ne(fraud_df['Registered_Device_ID']).sum() / total_fraud * 100, 1),
                'sim_swap_fraud': round(fraud_df['SIM_Change_Flag'].sum() / total_fraud * 100, 1),
                'vpn_fraud': round(fraud_df['VPN_Flag'].sum() / total_fraud * 100, 1),
                'high_amount_fraud': round((fraud_df['Amount'] > 10000).sum() / total_fraud * 100, 1),
            },
            'total_fraud_analysed': total_fraud
        }

    # From live evaluation logs
    reason_counts = {}
    total = 0
    for log in transaction_log:
        if log.get('decision') in ['BLOCK', 'OTP']:
            total += 1
            for reason in log.get('fraud_reasons', []):
                key = reason.split('(')[0].strip().lower()[:50]
                reason_counts[key] = reason_counts.get(key, 0) + 1

    breakdown = {}
    for reason, count in sorted(reason_counts.items(), key=lambda x: -x[1]):
        breakdown[reason] = round(count / max(total, 1) * 100, 1)

    return {'breakdown': breakdown, 'total_flagged': total}

@app.get("/api/admin/transactions")
def admin_transactions(
    risk_min: float = 0.0,
    risk_max: float = 1.0,
    decision: Optional[str] = None,
    user_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    user=Depends(verify_token)
):
    """Filtered transaction log."""
    filtered = transaction_log.copy()

    filtered = [t for t in filtered if risk_min <= t.get('final_risk_score', 0) <= risk_max]

    if decision:
        filtered = [t for t in filtered if t.get('decision', '').upper() == decision.upper()]

    if user_id:
        filtered = [t for t in filtered if user_id.lower() in t.get('user_id', '').lower()]

    if search:
        filtered = [t for t in filtered if (
            search.lower() in t.get('transaction_id', '').lower() or
            search.lower() in t.get('user_id', '').lower() or
            search.lower() in str(t.get('remark_text', '')).lower()
        )]

    total = len(filtered)
    filtered = filtered[offset:offset + limit]

    return {
        'transactions': filtered,
        'total': total,
        'limit': limit,
        'offset': offset,
    }

@app.get("/api/admin/transaction/{transaction_id}")
def get_transaction_detail(transaction_id: str, user=Depends(verify_token)):
    """Get detailed risk breakdown for a specific transaction."""
    for t in transaction_log:
        if t.get('transaction_id') == transaction_id:
            return t
    raise HTTPException(status_code=404, detail="Transaction not found")

# ============================================================
# GRAPH ENDPOINTS
# ============================================================

@app.get("/api/admin/graph")
def get_graph_data(max_nodes: int = 150, user=Depends(verify_token)):
    """Get graph visualization data."""
    try:
        graph = get_graph_engine_instance()
        return graph.get_graph_data_for_visualization(max_nodes=max_nodes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Graph engine error: {str(e)}")

@app.get("/api/admin/graph/node/{user_id}")
def get_graph_node(user_id: str, user=Depends(verify_token)):
    """Get detailed graph info for a specific user node."""
    try:
        graph = get_graph_engine_instance()
        return graph.get_node_details(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/graph/clusters")
def get_suspicious_clusters(user=Depends(verify_token)):
    """Get suspicious cluster information."""
    try:
        graph = get_graph_engine_instance()
        return {'clusters': graph.get_suspicious_clusters()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/graph/fund-flow/{user_id}")
def get_fund_flow(user_id: str, depth: int = 3, user=Depends(verify_token)):
    """Trace fund flow chains from a user."""
    try:
        graph = get_graph_engine_instance()
        return {'chains': graph.get_fund_flow_chain(user_id, depth=depth)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# EXPORT
# ============================================================

@app.get("/api/admin/export")
def export_transactions(format: str = "json", user=Depends(verify_token)):
    """Export transaction logs."""
    if format == "json":
        return {'data': transaction_log}

    # CSV format
    if transaction_log:
        df = pd.DataFrame(transaction_log)
        csv_string = df.to_csv(index=False)
        return {"csv": csv_string}

    return {"data": []}


# ============================================================
# Dataset exploration (for demo/testing)
# ============================================================

@app.get("/api/dataset/stats")
def dataset_stats():
    """Basic dataset statistics (public)."""
    df = get_dataset()
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    return {
        'total_records': len(df),
        'fraud_count': int(df['Fraud_Label'].sum()),
        'fraud_ratio': round(df['Fraud_Label'].mean() * 100, 2),
        'columns': list(df.columns),
        'amount_stats': {
            'mean': round(float(df['Amount'].mean()), 2),
            'median': round(float(df['Amount'].median()), 2),
            'max': round(float(df['Amount'].max()), 2),
            'min': round(float(df['Amount'].min()), 2),
        },
        'unique_users': int(df['User_ID'].nunique()),
    }


if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting Hybrid UPI Fraud Detection API Server...")
    print("📍 Swagger UI: http://localhost:8000/docs")
    print("📍 ReDoc: http://localhost:8000/redoc\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
