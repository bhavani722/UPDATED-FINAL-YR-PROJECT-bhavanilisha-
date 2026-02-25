import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
import os

def preprocess_data(file_path='synthetic_upi_fraud_dataset.csv', test_size=0.2, random_state=42):
    """
    Loads, cleans, and prepares the synthetic UPI fraud dataset for machine learning.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Dataset file not found at {file_path}. Please run generate_dataset.py first.")

    print(f"Loading dataset from {file_path}...")
    df = pd.DataFrame()
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return None

    # 1. Convert timestamp to datetime
    print("Pre-processing timestamps...")
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # 2. Create time_since_last_transaction per user
    print("Calculating time features...")
    df = df.sort_values(['user_id', 'timestamp'])
    df['time_since_last_transaction'] = df.groupby('user_id')['timestamp'].diff().dt.total_seconds().fillna(0)
    
    # 3. Geo-anomalies: Feature Engineering (Distance from usual location)
    # This is often critical for fraud detection
    df['dist_from_usual'] = np.sqrt(
        (df['latitude'] - df['usual_lat'])**2 + 
        (df['longitude'] - df['usual_long'])**2
    )

    # 4. Binary Flags for mismatches
    df['device_mismatch'] = (df['device_id'] != df['registered_device_id']).astype(int)
    df['sim_mismatch'] = (df['sim_id'] != df['registered_sim_id']).astype(int)

    # 5. Extract temporal features
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek

    # 6. Encode Categorical Features
    # remark_text is categorical; for simple models we might just LabelEncode or skip if doing NLP later
    # For core model, we'll label encode it
    print("Encoding categorical features...")
    le = LabelEncoder()
    df['remark_category'] = le.fit_transform(df['remark_text'].astype(str))

    # 7. Normalize amount
    print("Normalizing numerical features...")
    scaler = StandardScaler()
    df['normalized_amount'] = scaler.fit_transform(df[['amount']])
    
    # Feature Selection for the ML model
    features = [
        'normalized_amount', 
        'dist_from_usual', 
        'time_since_last_transaction',
        'device_mismatch', 
        'sim_mismatch', 
        'vpn_flag',
        'hour', 
        'day_of_week', 
        'remark_category'
    ]
    
    X = df[features]
    y = df['fraud_label']

    # 8. Split into train-test (Stratified)
    print(f"Splitting data (Stratified, test_size={test_size})...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=random_state
    )

    print("--- Preprocessing Complete ---")
    print(f"Train set size: {len(X_train)}")
    print(f"Test set size: {len(X_test)}")
    print(f"Fraud distribution in Train: {y_train.value_counts(normalize=True).get(1, 0)*100:.2f}%")

    return X_train, X_test, y_train, y_test

if __name__ == "__main__":
    # Test path logic if script is run directly from modules/
    path = '../synthetic_upi_fraud_dataset.csv' if os.path.exists('../synthetic_upi_fraud_dataset.csv') else 'synthetic_upi_fraud_dataset.csv'
    try:
        X_train, X_test, y_train, y_test = preprocess_data(path)
    except Exception as e:
        print(f"Failed to run test preprocessing: {e}")
