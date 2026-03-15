# 03 System Architecture

## Overview
The system follows a tiered architecture designed for low latency and high scalability. It separates the presentation layer from the heavy processing engine and the machine learning model serving layer.

## Architecture Diagram (ASCII)

```text
+-------------------------------------------------------+
|                 User Interface (React)                |
|       (Transaction Forms, Admin Dashboards)           |
+--------------------------+----------------------------+
                           | API Call (JSON)
                           v
+-------------------------------------------------------+
|             Transaction Input Layer (FastAPI)         |
|         (Validation, Tokenization, Log Capture)       |
+--------------------------+----------------------------+
                           | 
                           v
+-------------------------------------------------------+
|             Feature Engineering Engine                |
|    (Location Math, Device Comparison, Text Cleanup)   |
+--------------------------+----------------------------+
                           |
            +--------------+--------------+
            |                             |
            v                             v
+-----------------------+     +-----------------------+
|  Fraud Detection ML  |     |   Rule-Based Signals  |
|  (XGBoost + LSTM)    |     |   (VPN, SIM Change,   |
|  (NLP Model)         |     |    Location Delta)     |
+-----------+-----------+     +-----------+-----------+
            |                             |
            +--------------+--------------+
                           |
                           v
+-------------------------------------------------------+
|               Unified Risk Scoring Engine             |
|           (Weighted Model Output Aggregation)         |
+--------------------------+----------------------------+
                           |
                           v
+-------------------------------------------------------+
|                   Decision Engine                     |
|           (ALLOW / OTP Challenge / BLOCK)             |
+--------------------------+----------------------------+
                           |
                           v
+-------------------------------------------------------+
|               Fraud Monitoring Dashboard               |
|          (Real-time Logs, Analytics Trends)           |
+-------------------------------------------------------+
```

## Description of Layers
1. **User Interface**: A modern React-based portal where users submit transactions and admins monitor the system health.
2. **Transaction Input Layer**: Handles the incoming transaction data, verifies authentication, and assigns unique transaction IDs.
3. **Feature Engineering Engine**: The "brain" that converts raw data (Lat/Lon, Device ID, Remark) into mathematical features like Distance, Velocity, and Word Vectors.
4. **Fraud Detection Models**: 
   - **XGBoost**: Trained on tabular transaction data for high accuracy anomaly detection.
   - **LSTM**: Analyzes sequences of transaction amounts to detect behavioral spikes.
   - **NLP**: Uses Logistic Regression with TF-IDF to identify scam keywords in remarks.
5. **Unified Risk Scoring Engine**: Calculates a final score (0 to 1) by applying specific weights to each model's output.
6. **Decision Engine**: Maps the risk score to an actionable status.
7. **Fraud Monitoring Dashboard**: Visualizes the decision metrics, ROC curves, and suspicious connection graphs.
