import pandas as pd
import numpy as np
import os
import json
from risk_engine import UPIRiskEngine
from modules.location_engine import calculate_location_features
from modules.device_sim_engine import calculate_device_sim_features
from modules.burst_detection import calculate_burst_features

def run_simulation(num_samples=10):
    """
    Demonstrates the Hybrid UPI Fraud Detection system by evaluating 
    a batch of transactions through the risk engine.
    """
    print("====================================================")
    print("   HYBRID UPI FRAUD DETECTION SYSTEM - SIMULATOR    ")
    print("====================================================\n")

    dataset_path = 'data/synthetic_upi_transactions.csv'
    if not os.path.exists(dataset_path):
        print(f"ERROR: Dataset not found. Please run 'python generate_dataset.py' first.")
        return

    # 1. Initialize Engine
    engine = UPIRiskEngine()
    if not engine.models_loaded:
        print("ERROR: Models not loaded. Please run 'python train_core_model.py' first.")
        # We can continue if just one model is missing, but core is required
        if not engine.core_model: return

    # 2. Load and Prepare Live Data Features
    # In a real system, these engines would run on a single incoming transaction
    print("\n[Step 1] Loading sample transactions from dataset...")
    df = pd.read_csv(dataset_path)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Take a mix of samples (including some known fraud labels for demo)
    sample_df = pd.concat([
        df[df['fraud_label'] == 1].head(int(num_samples/2)),
        df[df['fraud_label'] == 0].head(int(num_samples/2))
    ]).sample(frac=1).reset_index(drop=True)

    # 3. Enrich with Location, Device, and Burst Features
    print("[Step 2] Processing features through logic engines...")
    sample_df = calculate_location_features(sample_df)
    sample_df = calculate_device_sim_features(sample_df)
    sample_df = calculate_burst_features(sample_df)

    # Calculate additional distance for demonstration
    from modules.location_engine import haversine_distance
    sample_df['merchant_distance'] = haversine_distance(
        sample_df['latitude'], sample_df['longitude'],
        sample_df['merchant_lat'], sample_df['merchant_long']
    )

    # 4. Run Risk Scoring
    print(f"[Step 3] Evaluating {len(sample_df)} transactions through Hybrid Risk Engine...\n")
    
    results = []
    for idx, row in sample_df.iterrows():
        tx_context = row.to_dict()
        
        # In a real scenario, we might pass a sequence for LSTM
        # For this demo, we'll let it use the Core + Rule layers
        result = engine.evaluate_transaction(tx_context)
        
        # Add ground truth for comparison in demo
        result['actual_label'] = "FRAUD" if row['fraud_label'] == 1 else "NORMAL"
        results.append(result)

    # 5. Display Results Table
    print(f"{'TX ID':<8} | {'CORE PROB':<10} | {'RISK SCORE':<12} | {'DECISION':<10} | {'ACTUAL':<8}")
    print("-" * 65)
    for res in results:
        core_p = res['probabilities']['core']
        score = res['score']
        decision = res['decision']
        actual = res['actual_label']
        
        # Simple color indicator logic for terminal (if supported)
        print(f"UPI_{idx:03}  | {core_p:<10.4f} | {score:<12.4f} | {decision:<10} | {actual:<8}")
        idx += 1

    print("\n====================================================")
    print("   Simulation Complete: Risk Decisions logged above.")
    print("====================================================")

if __name__ == "__main__":
    run_simulation(num_samples=10)
