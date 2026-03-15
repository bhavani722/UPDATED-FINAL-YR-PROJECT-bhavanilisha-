# 09 Models Used

Our system uses a "Hybrid Committee" architecture. No single model makes the final decision; instead, multiple specialized models contribute their expertise.

## 1. XGBoost (Extreme Gradient Boosting)
- **Role**: Core Anomaly Detection.
- **Why**: XGBoost is highly efficient for tabular data. It handles non-linear relationships between amount, distance, and flags very well.
- **Use Case**: Determining if the general "shape" of the transaction looks suspicious based on historical labels.

## 2. LSTM (Long Short-Term Memory)
- **Role**: Behavioral Pattern Analysis.
- **Why**: LSTM is a recurrent neural network (RNN) capable of learning long-term dependencies in sequence data.
- **Use Case**: It takes the last 10 transaction amounts as input. It detects if a sudden ₹10,000 transaction is a normal part of the user's spending habits or an abnormal behavioral spike.

## 3. Logistic Regression with TF-IDF
- **Role**: Natural Language Processing (NLP).
- **Why**: Simple, fast, and explainable. It excels at binary classification of text based on keyword presence.
- **Use Case**: Analyzing the transaction remark (e.g., "Lottery prize claim") to identify social engineering scams.

## 4. Graph-Based Engine
- **Role**: Network Link Prediction.
- **Why**: Fraudsters often work in "Fraud Rings" where multiple accounts are linked to the same receiver.
- **Use Case**: Identifying if a user is transacting with a node that is connected to known fraudulent clusters.
