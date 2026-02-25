"""
Burst Detection Module
Sliding window logic for detecting rapid transaction bursts.
"""
import pandas as pd
import numpy as np


def calculate_burst_risk(burst_count):
    """
    Calculate burst risk for a SINGLE transaction based on burst count.
    
    Args:
        burst_count: Number of transactions in the recent window
    
    Returns:
        dict with burst_flag and burst_risk_score
    """
    burst_flag = 1 if burst_count > 3 else 0
    
    # Risk ramps up with count
    if burst_count <= 3:
        risk = 0.0
    elif burst_count <= 5:
        risk = 0.3
    elif burst_count <= 8:
        risk = 0.6
    else:
        risk = 0.9
    
    return {
        'burst_flag': burst_flag,
        'burst_count': int(burst_count),
        'burst_risk_score': round(risk, 4),
    }


def calculate_burst_features_batch(df):
    """
    Batch burst feature engineering for training data.
    Uses a 10-minute sliding window per user.
    """
    print("  [Burst Engine] Calculating burst features...")

    if not pd.api.types.is_datetime64_any_dtype(df['Timestamp']):
        df['Timestamp'] = pd.to_datetime(df['Timestamp'])

    df = df.sort_values(['User_ID', 'Timestamp']).copy()
    df_indexed = df.set_index('Timestamp')

    # Rolling count per user in 10-minute window
    df_indexed['txn_count_10min'] = (
        df_indexed.groupby('User_ID')['Amount']
        .rolling('10min')
        .count()
        .values
    )

    df_indexed['burst_flag'] = (df_indexed['txn_count_10min'] > 3).astype(int)
    result = df_indexed.reset_index()

    print(f"  [Burst Engine] Found {result['burst_flag'].sum()} burst cases")

    return result
