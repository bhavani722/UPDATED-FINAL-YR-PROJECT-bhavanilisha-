# 05 Use Case Diagram

## Actors
1. **User**: The person initiating the UPI transaction.
2. **Fraud Detection System (AI Engine)**: The automated logic that processes and evaluates data.
3. **Admin**: The technical overseer who manages models and reviews system performance.

## Diagram

```mermaid
useCaseDiagram
    actor User
    actor "Fraud Detection System" as FDS
    actor Admin

    User --> (Register User)
    User --> (Submit Transaction)
    FDS --> (Detect Fraud)
    FDS --> (Generate Risk Score)
    FDS --> (Block Suspicious Transaction)
    Admin --> (Monitor Fraud Alerts)
    Admin --> (Retrain Models)
    Admin --> (Visualize Risk Graph)
```

## Explanation of Use Cases

- **Register User**: Initial setup where the user's primary device and usual location are recorded as a baseline.
- **Submit Transaction**: The act of sending money, providing the system with current contextual data.
- **Detect Fraud**: The AI engine runs XGBoost, LSTM, and NLP models to find anomalies.
- **Generate Risk Score**: Merging multiple model outputs into a readable risk percentage.
- **Block Suspicious Transaction**: Automated preventive action if the risk score exceeds the defined threshold.
- **Monitor Fraud Alerts**: Admin reviews real-time logs through the Glassmorphism dashboard to observe system accuracy.
- **Visualize Risk Graph**: Identifying clusters of connected suspicious users to stop fraud rings.
