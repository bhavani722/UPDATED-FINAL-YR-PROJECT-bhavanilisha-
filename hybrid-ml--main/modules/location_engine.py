import numpy as np
import pandas as pd

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points 
    on the Earth in kilometers using decimal degrees.
    """
    # Convert decimal degrees to radians 
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arcsin(np.sqrt(a)) 
    km = 6371 * c
    return km

def calculate_location_features(df):
    """
    Calculates geographic distance and velocity-based fraud indicators.
    """
    print("Calculating location-based features...")
    
    # 1. Calculate distance from user's usual location
    df['location_distance'] = haversine_distance(
        df['latitude'], df['longitude'], 
        df['usual_lat'], df['usual_long']
    )

    # 2. Calculate distance between user and merchant (QR location verification)
    df['qr_distance'] = haversine_distance(
        df['latitude'], df['longitude'],
        df['merchant_lat'], df['merchant_long']
    )
    df['qr_mismatch_flag'] = (df['qr_distance'] > 2).astype(int)

    # 3. Sort by user and time to calculate velocity between transactions
    # Note: df must have 'timestamp' as datetime objects
    if not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    temp_df = df.sort_values(['user_id', 'timestamp'])

    # Shift coordinates and timestamp within user groups to get previous point
    temp_df['prev_lat'] = temp_df.groupby('user_id')['latitude'].shift(1)
    temp_df['prev_long'] = temp_df.groupby('user_id')['longitude'].shift(1)
    temp_df['prev_timestamp'] = temp_df.groupby('user_id')['timestamp'].shift(1)

    # Calculate distance shifted
    temp_df['dist_shift'] = haversine_distance(
        temp_df['latitude'], temp_df['longitude'],
        temp_df['prev_lat'], temp_df['prev_long']
    )

    # Calculate time shift in hours
    temp_df['time_shift_hours'] = (temp_df['timestamp'] - temp_df['prev_timestamp']).dt.total_seconds() / 3600.0

    # Calculate velocity (km/h)
    # Handle division by zero or very small time shifts
    temp_df['velocity'] = temp_df.apply(
        lambda row: row['dist_shift'] / row['time_shift_hours'] if row['time_shift_hours'] > 0 else 0, 
        axis=1
    )

    # Create impossible travel flag (velocity > 900 km/h)
    temp_df['impossible_travel_flag'] = (temp_df['velocity'] > 900).astype(int)

    # Cleanup temporary columns
    # We only need to add the new time-based calculation columns from temp_df
    # location_distance was already added to the input df, which temp_df is copied from
    new_cols = ['velocity', 'impossible_travel_flag']
    final_df = temp_df.copy() # temp_df already has all original + location_distance + new stuff
    
    # Ensure NaNs are filled for new features
    final_df['velocity'] = final_df['velocity'].fillna(0)
    final_df['impossible_travel_flag'] = final_df['impossible_travel_flag'].fillna(0)

    print(f"Location Engine: Found {final_df['impossible_travel_flag'].sum()} impossible travel cases and {final_df['qr_mismatch_flag'].sum()} QR mismatches.")
    
    return final_df

if __name__ == "__main__":
    # Test script with a snippet of the dataset
    import os
    file_path = 'synthetic_upi_fraud_dataset.csv'
    if os.path.exists(file_path):
        data = pd.read_csv(file_path)
        data['timestamp'] = pd.to_datetime(data['timestamp'])
        updated_data = calculate_location_features(data)
        print(updated_data[['user_id', 'location_distance', 'velocity', 'impossible_travel_flag']].head())
