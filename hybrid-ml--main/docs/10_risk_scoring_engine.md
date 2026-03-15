# 10 Risk Scoring Engine

The Unified Risk Scoring Engine is the final decision-maker. It aggregates scores from different models using a **Weighted Sum Approach**.

## The Formula
The final risk score ($R$) is calculated as follows:

$$R = \sum (Score_i \times Weight_i)$$

| Model Component | Weight (%) | Significance |
| :--- | :--- | :--- |
| **XGBoost Core** | 35% | General statistical anomaly |
| **LSTM Sequence** | 20% | Historical behavioral match |
| **NLP Remark** | 15% | Language-based scam detection |
| **Location Engine**| 10% | Geographical consistency |
| **Device Engine** | 10% | Hardware security |
| **Graph Risk** | 10% | Social network risk |

## Risk Classification Levels

The system maps the score *R* to a risk category and a specific action:

### 🟢 Low Risk (0.0 to 0.3)
- **Status**: ALLOW
- **Action**: Transaction completed instantly without user friction.

### 🟡 Medium Risk (0.3 to 0.7)
- **Status**: OTP (Challenge)
- **Action**: Transaction paused. User must enter an extra One-Time Password or biometric verification to prove identity.

### 🔴 High Risk (0.7 to 1.0)
- **Status**: BLOCK
- **Action**: Transaction auto-rejected for security. Logged for manual review. User is notified of suspicious activity.
