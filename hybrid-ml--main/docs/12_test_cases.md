# 12 Test Cases

This document provides a structure for validating the system's accuracy across different scenarios.

## Test Matrix

| Case ID | Scenario | Input Variables | Expected Score | Expected Action |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Normal Transaction | Distance: 2km, Device: Match, Remark: "Lunch" | < 0.20 | **ALLOW** |
| **TC-02** | Impossible Travel | Distance: 800km, Time: 5 mins | > 0.60 | **OTP** |
| **TC-03** | Device Mismatch Fraud | Distance: 5km, Device: UNKNOWN, VPN: Enabled | > 0.75 | **BLOCK** |
| **TC-04** | Burst Transaction | 10 transactions in last 2 mins | > 0.80 | **BLOCK** |
| **TC-05** | Scam Remark Detection | Remark: "CONGRATS! You won 50k lottery" | > 0.70 | **BLOCK** |
| **TC-06** | SIM Swap Fraud | SIM_Change_Flag: 1, Large Amount: ₹25,000 | > 0.85 | **BLOCK** |

## Structure of a Test Report

### Scenario: Scam Remark Detection
- **Input Metadata**:
  - `Amount`: 5000
  - `Remark`: "Your electricity bill is overdue. Link Aadhaar now to avoid cutoff."
  - `Distance`: 2km (Normal)
- **Model Behaviors**:
  - `NLP Model`: 0.95 probability of fraud.
  - `XGBoost Model`: 0.40 probability.
- **Engine Output**:
  - `Final Risk`: 0.82
  - `Reasoning`: "High probability of scam language detected in remark text."
  - **Result**: BLOCK
