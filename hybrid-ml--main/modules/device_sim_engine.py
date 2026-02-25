import pandas as pd

def calculate_device_sim_features(df):
    """
    Identifies mismatches between the current transaction's device/SIM info 
    and the user's registered profiles.
    """
    print("Calculating device and SIM mismatch features...")
    
    # 1. Device Mismatch Flag
    # Compares the active device ID with the registered one
    df['device_mismatch_flag'] = (df['device_id'] != df['registered_device_id']).astype(int)

    # 2. SIM Mismatch Flag
    # Compares the active SIM ID with the registered one
    df['sim_mismatch_flag'] = (df['sim_id'] != df['registered_sim_id']).astype(int)

    print(f"Device/SIM Engine: Found {df['device_mismatch_flag'].sum()} device mismatches and {df['sim_mismatch_flag'].sum()} SIM mismatches.")
    
    return df

if __name__ == "__main__":
    # Test script with the dataset
    import os
    file_path = 'synthetic_upi_fraud_dataset.csv'
    if os.path.exists(file_path):
        data = pd.read_csv(file_path)
        updated_data = calculate_device_sim_features(data)
        print(updated_data[['user_id', 'device_id', 'registered_device_id', 'device_mismatch_flag', 'sim_mismatch_flag']].head())
