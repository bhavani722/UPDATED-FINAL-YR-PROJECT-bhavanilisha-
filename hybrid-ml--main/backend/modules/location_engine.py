"""
Location Engine Module
Haversine distance, velocity calculation, and impossible travel detection.
"""
import numpy as np
import pandas as pd


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate great-circle distance between two points on Earth (km).
    Works with both scalar and vectorized (pandas Series / numpy arrays) inputs.
    """
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    c = 2 * np.arcsin(np.sqrt(a))
    return 6371 * c


def calculate_location_risk(sender_lat, sender_lon, sender_usual_lat, sender_usual_lon,
                            receiver_lat, receiver_lon, prev_lat=None, prev_lon=None,
                            prev_timestamp=None, current_timestamp=None):
    """
    Calculate location-based risk for a SINGLE transaction.
    
    Returns:
        dict with location_distance, velocity, impossible_travel_flag, sender_receiver_distance
    """
    # Distance from usual location
    location_distance = float(haversine_distance(
        sender_lat, sender_lon, sender_usual_lat, sender_usual_lon
    ))

    # Distance between sender and receiver
    sender_receiver_distance = float(haversine_distance(
        sender_lat, sender_lon, receiver_lat, receiver_lon
    ))

    # Velocity-based impossible travel
    velocity = 0.0
    impossible_travel_flag = 0

    if prev_lat is not None and prev_lon is not None and prev_timestamp is not None and current_timestamp is not None:
        dist_from_prev = float(haversine_distance(prev_lat, prev_lon, sender_lat, sender_lon))
        time_diff_hours = (current_timestamp - prev_timestamp).total_seconds() / 3600.0
        if time_diff_hours > 0:
            velocity = dist_from_prev / time_diff_hours
            if velocity > 900:  # >900 km/h → impossible travel
                impossible_travel_flag = 1

    # Composite location risk score (0-1)
    risk = 0.0
    if location_distance > 500:
        risk += 0.4
    elif location_distance > 100:
        risk += 0.2
    elif location_distance > 50:
        risk += 0.1

    if impossible_travel_flag:
        risk += 0.4

    if sender_receiver_distance > 2000:
        risk += 0.2
    elif sender_receiver_distance > 500:
        risk += 0.1

    risk = min(risk, 1.0)

    return {
        'location_distance': round(location_distance, 2),
        'velocity': round(velocity, 2),
        'impossible_travel_flag': impossible_travel_flag,
        'sender_receiver_distance': round(sender_receiver_distance, 2),
        'location_risk_score': round(risk, 4),
    }


def calculate_location_features_batch(df):
    """
    Batch location feature engineering for training data.
    """
    print("  [Location Engine] Calculating distance features...")

    df['location_distance'] = haversine_distance(
        df['Sender_Lat'], df['Sender_Lon'],
        df['Sender_Usual_Lat'], df['Sender_Usual_Lon']
    )

    df['sender_receiver_distance'] = haversine_distance(
        df['Sender_Lat'], df['Sender_Lon'],
        df['Receiver_Lat'], df['Receiver_Lon']
    )

    # Velocity (per-user, sorted by time)
    if not pd.api.types.is_datetime64_any_dtype(df['Timestamp']):
        df['Timestamp'] = pd.to_datetime(df['Timestamp'])

    df = df.sort_values(['User_ID', 'Timestamp']).copy()
    df['prev_lat'] = df.groupby('User_ID')['Sender_Lat'].shift(1)
    df['prev_lon'] = df.groupby('User_ID')['Sender_Lon'].shift(1)
    df['prev_time'] = df.groupby('User_ID')['Timestamp'].shift(1)

    df['dist_from_prev'] = haversine_distance(
        df['Sender_Lat'], df['Sender_Lon'],
        df['prev_lat'].fillna(df['Sender_Lat']),
        df['prev_lon'].fillna(df['Sender_Lon'])
    )

    df['time_gap_hours'] = (df['Timestamp'] - df['prev_time']).dt.total_seconds() / 3600.0
    df['time_gap_hours'] = df['time_gap_hours'].fillna(1.0)
    df['time_gap_hours'] = df['time_gap_hours'].replace(0, 0.001)

    df['velocity'] = df['dist_from_prev'] / df['time_gap_hours']
    df['velocity'] = df['velocity'].fillna(0)
    df['impossible_travel_flag'] = (df['velocity'] > 900).astype(int)

    # Clean up temporary columns
    df = df.drop(columns=['prev_lat', 'prev_lon', 'prev_time', 'dist_from_prev', 'time_gap_hours'], errors='ignore')

    print(f"  [Location Engine] Found {df['impossible_travel_flag'].sum()} impossible travel cases")

    return df
