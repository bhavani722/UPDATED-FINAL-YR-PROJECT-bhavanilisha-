import pandas as pd
import numpy as np
import os
import pickle
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, accuracy_score
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Input
from modules.location_engine import haversine_distance

def prepare_sequential_data(file_path, sequence_length=10):
    """
    Prepares temporal sequences for LSTM.
    Features: amount, time gap, location distance, device mismatch flag.
    """
    print("Loading data for sequence preparation...")
    df = pd.read_csv(file_path)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values(['user_id', 'timestamp'])

    # 1. Feature Engineering for LSTM
    print("Engineering sequence features...")
    
    # Time gap (seconds since previous transaction)
    df['time_gap'] = df.groupby('user_id')['timestamp'].diff().dt.total_seconds().fillna(0)
    
    # Location distance (km from usual)
    df['location_distance'] = haversine_distance(
        df['latitude'], df['longitude'], 
        df['usual_lat'], df['usual_long']
    )
    
    # Device mismatch
    df['device_mismatch_flag'] = (df['device_id'] != df['registered_device_id']).astype(int)

    # 2. Scaling
    print("Scaling features...")
    scaler = MinMaxScaler()
    # Log scale amount to handle wide distribution
    df['amount_scaled'] = np.log1p(df['amount'])
    # Scale others
    features_to_scale = ['amount_scaled', 'time_gap', 'location_distance']
    df[features_to_scale] = scaler.fit_transform(df[features_to_scale])

    # 3. Generating Sequences per user
    print(f"Generating sequences of length {sequence_length}...")
    X_seq = []
    y_seq = []
    
    feature_cols = ['amount_scaled', 'time_gap', 'location_distance', 'device_mismatch_flag']

    for user_id, group in df.groupby('user_id'):
        values = group[feature_cols].values
        labels = group['fraud_label'].values
        
        # We need at least 1 sequence
        if len(values) < sequence_length:
            # Simple padding for short histories
            padding = np.zeros((sequence_length - len(values), len(feature_cols)))
            padded_values = np.vstack([padding, values])
            X_seq.append(padded_values)
            y_seq.append(labels[-1])
        else:
            # Create sliding windows
            for i in range(len(values) - sequence_length + 1):
                X_seq.append(values[i : i + sequence_length])
                y_seq.append(labels[i + sequence_length - 1])

    return np.array(X_seq), np.array(y_seq)

def train_lstm_model():
    dataset_path = 'data/synthetic_upi_transactions.csv'
    if not os.path.exists(dataset_path):
        print(f"Error: {dataset_path} not found.")
        return

    # 1. Prepare Sequences
    X, y = prepare_sequential_data(dataset_path)
    print(f"Sequences shape: {X.shape}, Labels shape: {y.shape}")

    # 2. Train-Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

    # 3. Build LSTM Model
    print("Building LSTM model...")
    model = Sequential([
        Input(shape=(X.shape[1], X.shape[2])),
        LSTM(32, activation='tanh'),
        Dense(16, activation='relu'),
        Dense(1, activation='sigmoid')
    ])

    # 4. Compile
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

    # 5. Train
    print("Starting training (10 epochs)...")
    model.fit(
        X_train, y_train, 
        epochs=10, 
        batch_size=64, 
        validation_split=0.1,
        verbose=1
    )

    # 6. Evaluate
    print("\n--- LSTM Model Evaluation ---")
    y_pred_prob = model.predict(X_test)
    y_pred = (y_pred_prob > 0.5).astype(int)

    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # 7. Save Model
    if not os.path.exists('models'):
        os.makedirs('models')
    
    model_save_path = 'models/lstm_model.h5'
    model.save(model_save_path)
    print(f"\nLSTM Model saved successfully to: {model_save_path}")

if __name__ == "__main__":
    try:
        train_lstm_model()
    except ImportError:
        print("\nCRITICAL ERROR: tensorflow not installed. Please install it using 'pip install tensorflow'.")
        print("Note: If you are seeing disk space errors, you may need to clear space on Drive C:.")
    except Exception as e:
        print(f"An error occurred: {e}")
