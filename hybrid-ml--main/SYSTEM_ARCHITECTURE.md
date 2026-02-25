# System Architecture: Hybrid Multi-Layer UPI Fraud Detection

## 1. Data Layer
The system utilizes a synthetic UPI dataset (50,000 records) generated with specific fraud patterns:
- **Impossible Travel:** High velocity between locations.
- **Burst Attacks:** Rapid succession of transactions.
- **Phishing/Scams:** NLP analysis of transaction remarks.
- **Mule Clusters:** Graph-based identification of suspicious fund flows.

## 2. Intelligence Layer (The 6 Layers)

### A. Graph-Based Engine (NetworkX)
Constructs a directed graph where **Nodes = Users** and **Edges = Transactions**.
- **Metrics:** Betweenness centrality, PageRank, and community detection (Louvain/Clauset-Newman-Moore).
- **Fraud Detection:** Identifies "hub" nodes used for money laundering and high-risk clusters.

### B. NLP Remark Analysis
Uses **TF-IDF Vectorization** and **Logistic Regression** to scan `remark_text`.
- Detects keywords like "Lottery", "KYC Block", "Verify Account", and "Claim Reward".

### C. Sequential LSTM
A Deep Learning model that looks at the **Sequence_Amount_List**.
- Learns the typical spending patterns of a user and flags deviations in amount sequences as behavioral anomalies.

### D. Core ML (XGBoost)
The primary classifier using tabular data features:
- Transaction Velocity
- Amount Quantiles
- Time of day
- User transaction history

### E. Location & Device Rule Engines
- **Haversine Distance:** Calculates KM between sender/receiver and consecutive transactions.
- **Velocity Check:** Flags if a user "teleported" between cities.
- **Device Matching:** Detects SIM swapping and VPN usage.

## 3. Decision & API Layer
- **FastAPI:** Provides high-performance async endpoints for evaluation and dashboard stats.
- **Weighted Aggregator:** Normalizes all engine outputs to a 0.0 - 1.0 range.
- **Explainable AI (XAI):** Returns a list of specific reasons for the risk score (e.g., "Impossible travel detected", "High degree centrality in fraud cluster").

## 4. Frontend Layer
- **Vite + React:** Modern component-based UI.
- **Recharts:** High-performance SVG charts for analytics.
- **Lucide/Emoji Icons:** Intuitive visual indicators.
- **Glassmorphism:** Premium dark theme for professional presentation.
