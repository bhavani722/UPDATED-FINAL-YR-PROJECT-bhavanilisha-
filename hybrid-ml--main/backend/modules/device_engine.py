"""
Device & SIM Engine Module
Detects device mismatch and SIM swap patterns.
"""
import pandas as pd


def calculate_device_risk(device_id, registered_device_id, sim_change_flag):
    """
    Calculate device/SIM risk for a SINGLE transaction.
    
    Returns:
        dict with mismatch flags and risk score
    """
    device_mismatch = 1 if device_id != registered_device_id else 0
    
    # Composite device risk score (0-1)
    risk = 0.0
    if device_mismatch:
        risk += 0.5
    if sim_change_flag:
        risk += 0.5
    
    return {
        'device_mismatch_flag': device_mismatch,
        'sim_change_flag': int(sim_change_flag),
        'device_risk_score': round(risk, 4),
    }


def calculate_device_features_batch(df):
    """
    Batch device/SIM feature engineering for training data.
    """
    print("  [Device Engine] Calculating device/SIM features...")

    df['device_mismatch_flag'] = (df['Device_ID'] != df['Registered_Device_ID']).astype(int)
    # SIM_Change_Flag already exists in dataset
    
    d_mismatch = df['device_mismatch_flag'].sum()
    s_change = df['SIM_Change_Flag'].sum()
    print(f"  [Device Engine] {d_mismatch} device mismatches, {s_change} SIM changes")

    return df
