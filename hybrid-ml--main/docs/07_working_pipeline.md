# 07 Working Pipeline

The process can be summarized into 6 key steps that run every time a transaction is initiated.

### Step 1 – User Transaction Input
The user interacts with the React frontend to initiate a payment. The frontend collects and bundles the following into a JSON payload:
- **Transaction Details**: Amount, Receiver ID.
- **Geolocation**: Current Sender Latitude and Longitude.
- **Hardware Profile**: Device Identification and SIM state.
- **Semantic Intent**: Remark/Reason for payment.

### Step 2 – Data Preprocessing
The FastAPI backend receives the request. It performs:
- **Normalization**: Converting text to lowercase.
- **Validation**: Ensuring coordinates are within valid ranges.
- **Lookup**: Fetching user history (Usual Lat/Lon) from the core dataset.

### Step 3 – Feature Extraction
This is the core calculation stage:
- **Haversine Distance**: Distance between sender's current and usual location.
- **Velocity Detection**: (Distance) / (Time since last transaction).
- **Security Flags**: Burst Count (transactions in last 5 mins), VPN Detection, SIM Swap Flag.
- **Text Vectorization**: Converting remarks into TF-IDF vectors.

### Step 4 – ML Model Predictions
The system triggers parallel inference:
- **XGBoost Core**: Scores the transaction as a whole based on historical fraud patterns.
- **LSTM Sequential**: Analyzes the amount of this transaction relative to the last 10 transactions.
- **NLP Remark**: Predicts the probability of the remark text being a "Lottery Scam" or "Update Urgent" trick.

### Step 5 – Risk Score Generation
The Hybrid Risk Engine combines the scores:
`Total Risk = (Score_A * Weight_A) + (Score_B * Weight_B) ...`
The weights ensure that reliable signals (like Impossible Travel) have a higher impact than softer signals (like high amounts).

### Step 6 – Fraud Classification
The final numerical score is mapped to a state:
- **GREEN (ALLOW)**: 0.0 to 0.3
- **YELLOW (OTP)**: 0.3 to 0.7
- **RED (BLOCK)**: 0.7 to 1.0
The decision is sent back to the UI to update the payment status.
