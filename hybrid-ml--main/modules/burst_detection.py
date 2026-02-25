import pandas as pd
import numpy as np

def calculate_burst_features(df):
    """
    Identifies transaction bursts within a sliding 10-minute window for each user.
    """
    print("Calculating transaction burst features...")
    
    # Ensure timestamp is datetime and sorted
    if not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Sort by user and time for rolling window logic
    df_sorted = df.sort_values(['user_id', 'timestamp']).copy()

    # Set timestamp as index for time-based rolling window
    df_sorted = df_sorted.set_index('timestamp')

    # Apply rolling count per user with a 10-minute window
    # '10min' offset requires a datetime index
    df_sorted['txn_count_10min'] = df_sorted.groupby('user_id')['amount'].rolling('10min').count().values

    # Create burst_flag: 1 if > 3 transactions in 10 minutes
    # Greater than 3 means 4 or more transactions
    df_sorted['burst_flag'] = (df_sorted['txn_count_10min'] > 3).astype(int)

    # Reset index to restore original structure
    final_df = df_sorted.reset_index()

    print(f"Burst Detection: Found {final_df['burst_flag'].sum()} burst transaction cases.")
    
    return final_df

if __name__ == "__main__":
    # Test script with the dataset
    import os
    file_path = 'synthetic_upi_fraud_dataset.csv'
    if os.path.exists(file_path):
        data = pd.read_csv(file_path)
        updated_data = calculate_burst_features(data)
        print(updated_data[['user_id', 'timestamp', 'txn_count_10min', 'burst_flag']].sort_values(['user_id', 'timestamp']).head(20))
