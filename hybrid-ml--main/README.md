# Hybrid Multi-Layer UPI Fraud Detection System

**Academic Title:** Hybrid Multi-Layer UPI Fraud Detection System with Graph-Based Intelligence and Advanced Analytics Dashboard.

## 🚀 Overview
This is a production-level fraud detection system designed to identify fraudulent UPI (Unified Payments Interface) transactions in real-time. It uses a hybrid approach combining:
1. **Core ML (XGBoost/Random Forest):** Behavioral classification.
2. **NLP (TF-IDF):** Scam remark analysis.
3. **LSTM (Deep Learning):** Sequential anomaly detection.
4. **Graph Engine (NetworkX):** Network centrality and cluster analysis.
5. **Location Engine:** Haversine velocity and impossible travel logic.
6. **Device Engine:** SIM swap and device mismatch detection.

---

## 📁 System Structure
```text
hybrid-ml/
├── backend/                # FastAPI Application
│   ├── data/               # CSV datasets and database
│   ├── models/             # ML Model definitions and training scripts
│   ├── modules/            # Domain-specific detection engines (Graph, Location, etc.)
│   ├── risk_engine.py      # Multi-layer weighted aggregator
│   ├── main.py             # FastAPI entry point
│   └── train_all.py        # Master training pipeline
├── frontend/               # React (Vite) Application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Dashboard, Analytics, Graph, etc.
│   │   ├── services/       # API integration
│   │   └── index.css       # Premium Design System
│   └── index.html
└── README.md
```

---

## 🛠️ Setup & Installation

### 1. Prerequisites
- Python 3.9+
- Node.js 16+
- `pip` and `npm`

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python train_all.py      # Generates synthetic data and trains all 6 models
python main.py           # Starts the FastAPI server at http://localhost:8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev              # Starts the UI at http://localhost:5173
```

---

## ⚖️ Risk Engine Weights
The final decision is calculated using a weighted average:
- **Core Model:** 35%
- **LSTM (Behavior):** 20%
- **NLP (Scam Remark):** 15%
- **Location Risk:** 10%
- **Device Risk:** 10%
- **Graph Risk:** 10%

**Thresholds:**
- **< 0.3:** ALLOW (Green)
- **0.3 - 0.7:** OTP Challenge (Amber)
- **> 0.7:** BLOCK (Red)

---

## 🛡️ Admin Credentials
- **Username:** `admin`
- **Password:** `admin123`
