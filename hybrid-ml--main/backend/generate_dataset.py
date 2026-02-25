"""
Enhanced Synthetic UPI Fraud Dataset Generator
Generates 50,000 transactions with 10% fraud ratio and realistic patterns.
"""
import pandas as pd
import numpy as np
from faker import Faker
import random
import os
import json
from datetime import datetime, timedelta

def generate_upi_fraud_dataset(num_records=50000, fraud_ratio=0.10, output_dir='data'):
    """
    Generates a synthetic UPI fraud dataset with realistic fraud patterns:
    - Impossible travel
    - SIM swap
    - Device mismatch
    - Scam remark keywords
    - Mule account clusters
    - Transaction bursts
    """
    fake = Faker('en_IN')
    np.random.seed(42)
    random.seed(42)

    print("=" * 60)
    print("  SYNTHETIC UPI FRAUD DATASET GENERATOR")
    print("=" * 60)
    print(f"  Total Transactions : {num_records}")
    print(f"  Target Fraud Ratio : {fraud_ratio * 100:.0f}%")
    print("=" * 60)

    num_fraud = int(num_records * fraud_ratio)
    num_normal = num_records - num_fraud

    # --- Indian city coordinates for realistic locations ---
    indian_cities = [
        {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777},
        {"name": "Delhi", "lat": 28.7041, "lon": 77.1025},
        {"name": "Bangalore", "lat": 12.9716, "lon": 77.5946},
        {"name": "Hyderabad", "lat": 17.3850, "lon": 78.4867},
        {"name": "Chennai", "lat": 13.0827, "lon": 80.2707},
        {"name": "Kolkata", "lat": 22.5726, "lon": 88.3639},
        {"name": "Pune", "lat": 18.5204, "lon": 73.8567},
        {"name": "Ahmedabad", "lat": 23.0225, "lon": 72.5714},
        {"name": "Jaipur", "lat": 26.9124, "lon": 75.7873},
        {"name": "Lucknow", "lat": 26.8467, "lon": 80.9462},
        {"name": "Surat", "lat": 21.1702, "lon": 72.8311},
        {"name": "Nagpur", "lat": 21.1458, "lon": 79.0882},
        {"name": "Indore", "lat": 22.7196, "lon": 75.8577},
        {"name": "Bhopal", "lat": 23.2599, "lon": 77.4126},
        {"name": "Coimbatore", "lat": 11.0168, "lon": 76.9558},
    ]

    # --- Remark templates ---
    normal_remarks = [
        "Payment to friend", "Monthly Rent", "Dinner at Restaurant",
        "Movie Tickets", "Morning Coffee", "Grocery Shopping",
        "Split Bill", "Birthday Gift", "Electric Bill", "Stationery",
        "Petrol Pump", "Pharmacy", "Gym Subscription", "Amazon Purchase",
        "Recharge prepaid", "Water bill payment", "School fees",
        "Cab fare", "Swiggy order", "Zomato food delivery",
        "Flipkart purchase", "Online course fee", "Gas cylinder booking",
        "Train ticket booking", "Bus ticket", "Insurance premium",
        "Mutual fund SIP", "Credit card bill", "EMI payment",
        "Parking charges", "Laundry service", "Salon payment",
    ]

    fraud_remarks = [
        "URGENT: Verify Account to avoid block",
        "CONGRATULATIONS! You won a lottery of 50,000. Claim now.",
        "Official Bank Update: Link Aadhaar immediately",
        "Tax Refund processing - click to accept",
        "KYC Expired. Complete KYC to keep account active",
        "Emergency medical fund for relative",
        "High Return Investment - Double your money in 2 days",
        "Payment for unknown lottery prize",
        "Security Alert: Unusual activity detected, click to secure",
        "Cashback offer: Send Rs 1 get Rs 500 back",
        "Part time job payment - earn 5000 daily from home",
        "Insurance claim settlement - pay processing fee",
        "OLX advance payment for product",
        "Custom duty for international parcel",
        "Loan approved: Pay registration fee to activate",
    ]

    # --- Generate user profiles ---
    num_users = 2000
    num_mule_accounts = 50  # Mule account clusters
    
    user_profiles = []
    print(f"  Creating {num_users} user profiles (incl. {num_mule_accounts} mule accounts)...")

    for i in range(num_users):
        city = random.choice(indian_cities)
        u_lat = city['lat'] + np.random.uniform(-0.05, 0.05)
        u_lon = city['lon'] + np.random.uniform(-0.05, 0.05)
        u_dev = fake.uuid4()[:12]
        u_sim = fake.uuid4()[:12]
        
        is_mule = i < num_mule_accounts
        
        user_profiles.append({
            'user_id': f"UPI_USER_{1000 + i}",
            'usual_lat': round(u_lat, 6),
            'usual_lon': round(u_lon, 6),
            'city': city['name'],
            'registered_device_id': u_dev,
            'registered_sim_id': u_sim,
            'is_mule': is_mule,
        })

    # --- Mule cluster connections (for graph module later) ---
    mule_cluster_map = {}
    mule_users = [p for p in user_profiles if p['is_mule']]
    cluster_size = 5
    for idx in range(0, len(mule_users), cluster_size):
        cluster = mule_users[idx:idx + cluster_size]
        cluster_id = f"CLUSTER_{idx // cluster_size}"
        for m in cluster:
            mule_cluster_map[m['user_id']] = {
                'cluster_id': cluster_id,
                'peers': [c['user_id'] for c in cluster if c['user_id'] != m['user_id']]
            }

    data = []
    tx_counter = 0

    def generate_sequence_amounts(is_fraud, base_amount):
        """Generate a realistic transaction amount history sequence."""
        seq_len = random.randint(5, 12)
        if is_fraud:
            # Anomalous patterns: sudden spikes, rapid escalation
            pattern = random.choice(['spike', 'escalation', 'uniform_high'])
            if pattern == 'spike':
                seq = [round(np.random.uniform(100, 2000), 2) for _ in range(seq_len - 2)]
                seq.append(round(base_amount * 1.5, 2))
                seq.append(round(base_amount, 2))
            elif pattern == 'escalation':
                seq = [round(100 * (1.5 ** i) + np.random.uniform(-50, 50), 2) for i in range(seq_len)]
            else:
                seq = [round(np.random.uniform(5000, 30000), 2) for _ in range(seq_len)]
        else:
            # Normal patterns: consistent small amounts
            mean_amt = np.random.uniform(200, 3000)
            seq = [round(np.random.normal(mean_amt, mean_amt * 0.2), 2) for _ in range(seq_len)]
            seq = [max(10, s) for s in seq]
        return json.dumps(seq)

    def create_transaction(is_fraud, timestamp=None):
        nonlocal tx_counter
        tx_counter += 1
        
        profile = random.choice(user_profiles)
        
        if timestamp is None:
            timestamp = fake.date_time_between(start_date='-90d', end_date='now')
        
        # Receiver is another random user
        receiver = random.choice(user_profiles)
        while receiver['user_id'] == profile['user_id']:
            receiver = random.choice(user_profiles)

        if is_fraud:
            # --- FRAUD TRANSACTION PATTERNS ---
            fraud_type = random.choice([
                'impossible_travel', 'sim_swap', 'device_mismatch',
                'scam_remark', 'mule_transfer', 'burst_fraud'
            ])
            
            amount = round(np.random.exponential(12000) + 3000, 2)
            amount = min(amount, 99999.0)
            
            # Default fraud flags
            sim_change_flag = 0
            vpn_flag = 1 if random.random() < 0.55 else 0
            device_id = profile['registered_device_id']
            lat = profile['usual_lat']
            lon = profile['usual_lon']
            burst_count = random.randint(1, 3)
            
            if fraud_type == 'impossible_travel':
                # Location far from usual — different city
                far_city = random.choice(indian_cities)
                lat = far_city['lat'] + np.random.uniform(-0.5, 0.5)
                lon = far_city['lon'] + np.random.uniform(-0.5, 0.5)
                
            elif fraud_type == 'sim_swap':
                sim_change_flag = 1
                device_id = fake.uuid4()[:12] if random.random() < 0.6 else profile['registered_device_id']
                
            elif fraud_type == 'device_mismatch':
                device_id = fake.uuid4()[:12]
                
            elif fraud_type == 'scam_remark':
                pass  # remark handled below
                
            elif fraud_type == 'mule_transfer':
                # Transfer to/from mule accounts
                if mule_users:
                    receiver = random.choice(mule_users)
                    
            elif fraud_type == 'burst_fraud':
                burst_count = random.randint(5, 15)
                vpn_flag = 1

            # Additional randomization for realism
            if random.random() < 0.7:
                device_id = fake.uuid4()[:12]
            if random.random() < 0.5:
                sim_change_flag = 1
            
            remark = random.choice(fraud_remarks) if random.random() < 0.7 else random.choice(normal_remarks)
            fraud_label = 1
            
        else:
            # --- NORMAL TRANSACTION ---
            amount = round(np.random.exponential(500) + 10, 2)
            if amount > 10000:
                amount = round(random.uniform(10, 5000), 2)
            
            lat = profile['usual_lat'] + np.random.uniform(-0.02, 0.02)
            lon = profile['usual_lon'] + np.random.uniform(-0.02, 0.02)
            
            device_id = profile['registered_device_id'] if random.random() < 0.98 else fake.uuid4()[:12]
            sim_change_flag = 1 if random.random() < 0.02 else 0
            vpn_flag = 1 if random.random() < 0.03 else 0
            burst_count = random.randint(1, 3)
            
            remark = random.choice(normal_remarks)
            fraud_label = 0

        # Receiver location (based on receiver's city)
        recv_lat = receiver['usual_lat'] + np.random.uniform(-0.05, 0.05)
        recv_lon = receiver['usual_lon'] + np.random.uniform(-0.05, 0.05)

        return {
            'Transaction_ID': f"TXN_{tx_counter:06d}",
            'User_ID': profile['user_id'],
            'Receiver_ID': receiver['user_id'],
            'Amount': amount,
            'Timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'Sender_Lat': round(lat, 6),
            'Sender_Lon': round(lon, 6),
            'Sender_Usual_Lat': profile['usual_lat'],
            'Sender_Usual_Lon': profile['usual_lon'],
            'Receiver_Lat': round(recv_lat, 6),
            'Receiver_Lon': round(recv_lon, 6),
            'Device_ID': device_id,
            'Registered_Device_ID': profile['registered_device_id'],
            'SIM_Change_Flag': sim_change_flag,
            'VPN_Flag': vpn_flag,
            'Burst_Count': burst_count,
            'Sequence_Amount_List': generate_sequence_amounts(is_fraud == 1, amount),
            'Remark_Text': remark,
            'Fraud_Label': fraud_label,
        }

    # Generate fraud records
    print(f"  Generating {num_fraud} fraud transactions...")
    for _ in range(num_fraud):
        data.append(create_transaction(True))
    
    # Generate normal records
    print(f"  Generating {num_normal} normal transactions...")
    for _ in range(num_normal):
        data.append(create_transaction(False))

    # Create DataFrame and shuffle
    df = pd.DataFrame(data)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    output_file = os.path.join(output_dir, 'synthetic_upi_transactions.csv')
    df.to_csv(output_file, index=False)
    
    # Save mule cluster info for graph module
    cluster_file = os.path.join(output_dir, 'mule_clusters.json')
    with open(cluster_file, 'w') as f:
        json.dump(mule_cluster_map, f, indent=2)

    print(f"\n{'=' * 60}")
    print(f"  ✅ Dataset saved to: {output_file}")
    print(f"  ✅ Mule clusters saved to: {cluster_file}")
    print(f"  Total Rows    : {len(df)}")
    print(f"  Fraud Count   : {df['Fraud_Label'].sum()} ({df['Fraud_Label'].mean()*100:.1f}%)")
    print(f"  Normal Count  : {(df['Fraud_Label']==0).sum()}")
    print(f"  Unique Users  : {df['User_ID'].nunique()}")
    print(f"  Columns       : {list(df.columns)}")
    print(f"{'=' * 60}")
    
    return df

if __name__ == "__main__":
    generate_upi_fraud_dataset()
