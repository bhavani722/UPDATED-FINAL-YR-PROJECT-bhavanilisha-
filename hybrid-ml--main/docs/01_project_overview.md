# 01 Project Overview

## Project Title
**Hybrid UPI Fraud Detection System**

## Objective
The primary objective of this project is to develop a multi-layered, hybrid machine learning system capable of detecting fraudulent UPI (Unified Payments Interface) transactions in real-time. By combining behavioral analysis, geographical tracking, device fingerprinting, and natural language processing of remarks, the system evaluates the risk of every transaction and provides automated decisions (Allow, OTP Challenge, or Block).

## Why UPI Fraud Detection is Needed
With the rapid adoption of digital payments in India, UPI fraud has seen a significant rise. Common fraud types include:
- **Scam Remarks**: Fraudsters use deceptive text to trick users into authorizing payments (e.g., "Win Lottery", "Link Aadhaar").
- **Impossible Travel**: Transactions originating from locations far apart within a short time frame.
- **Device Mismatch**: Payments initiated from unregistered or suspicious devices.
- **SIM Swap Attacks**: Fraud after a recent change in the user's SIM card.
- **Burst Transactions**: A sudden high frequency of transactions indicating automated draining of accounts.

Existing rule-based systems often fail to catch evolving fraud patterns, necessitating a sophisticated ML-based approach.

## Technologies Used
- **Language**: Python 3.x
- **Web Framework**: FastAPI / Flask (Python-based REST API)
- **Machine Learning**: 
  - **XGBoost**: For core transaction anomaly detection.
  - **LSTM (Long Short-Term Memory)**: For sequence-based behavioral analysis.
  - **Logistic Regression / TF-IDF**: For NLP-based remark text analysis.
- **Data Handling**: Pandas, NumPy
- **Graph Analysis**: NetworkX (for detecting suspicious connection clusters)
- **Frontend**: React.js with modern CSS (Glassmorphism design)
- **Serialization**: Pickle, JSON
