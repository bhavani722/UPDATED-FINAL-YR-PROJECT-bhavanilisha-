# 13 System Flow

The final end-to-end journey of a UPI packet in the system.

## End-to-End Flow Diagram

```mermaid
sequenceDiagram
    participant U as User (App)
    participant B as Backend API
    participant F as Feature/ML Engine
    participant D as Admin Dashboard

    U->>B: POST /api/evaluate {Transaction Data}
    Note over B: Pre-process & Validate
    B->>F: Compute Distance, Velocity, NLP Scores
    F->>B: Return Model Probabilities
    Note over B: Unified Risk Scoring (Weights Applied)
    B-->>U: Return Result (ALLOW / OTP / BLOCK)
    B-->>D: Log Entry for Monitoring
```

## Flow Description

1. **Transaction Trigger**: The User clicks "Pay".
2. **Metadata Enrichment**: The mobile/web client appends hidden metadata (GPS, Device ID) to the payment request.
3. **API Reception**: The FastAPI listener receives the bundle.
4. **Feature Expansion**: The system expands the simple request into 20+ features by looking up historical averages and calculating spatial deltas.
5. **Ensemble Execution**: The ensemble of ML models processes the feature vector simultaneously.
6. **Weighted Reduction**: The scores are compressed into a single probability.
7. **Policy Application**: The decision logic compares the probability against bank-defined thresholds.
8. **Feedback Loop**: The result is sent back to the user, and the entire payload is pushed to the Admin Dashboard for visual analytics.
