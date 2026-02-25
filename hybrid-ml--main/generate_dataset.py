import pandas as pd
import numpy as np
from faker import Faker
import random
from datetime import datetime, timedelta

def generate_upi_fraud_dataset(num_records=50000, fraud_ratio=0.05):
    """
    Generates a synthetic dataset for UPI fraud detection.
    
    Args:
        num_records (int): Total number of transactions to generate.
        fraud_ratio (float): Fraction of transactions that are fraudulent.
    """
    fake = Faker()
    np.random.seed(42)
    random.seed(42)

    print(f"--- Generating Synthetic UPI Fraud Dataset ---")
    print(f"Total Transactions: {num_records}")
    print(f"Target Fraud Ratio: {fraud_ratio * 100}%")

    num_fraud = int(num_records * fraud_ratio)
    num_normal = num_records - num_fraud

    # Possible remarks
    normal_remarks = [
        "Payment to friend", "Monthly Rent", "Dinner at Restaurant", 
        "Movie Tickets", "Morning Coffee", "Grocery Shopping", 
        "Split Bill", "Birthday Gift", "Electric Bill", "Stationery",
        "Petrol Pump", "Pharmacy", "Gym Subscription", "Amazon Purchase"
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
        "Security Alert: Unusual activity detected, click to secure"
    ]

    # Pre-generate user profiles to maintain consistency across transactions
    num_users = 2000
    user_profiles = []
    print(f"Creating {num_users} unique user profiles...")
    for i in range(num_users):
        u_lat = float(fake.latitude())
        u_long = float(fake.longitude())
        u_dev = fake.uuid4()[:12]
        u_sim = fake.uuid4()[:12]
        user_profiles.append({
            'user_id': f"UPI_USER_{1000 + i}",
            'usual_lat': u_lat,
            'usual_long': u_long,
            'registered_device_id': u_dev,
            'registered_sim_id': u_sim
        })

    data = []

    def create_transaction(is_fraud):
        profile = random.choice(user_profiles)
        
        if is_fraud:
            # Fraudulent transactions often have higher amounts
            amount = round(np.random.exponential(15000) + 5000, 2)
            
            # Location: random far away from the usual residential area
            lat = float(fake.latitude())
            long = float(fake.longitude())
            
            # Device/SIM: high probability of mismatch in fraud cases
            device_id = fake.uuid4()[:12] if random.random() < 0.8 else profile['registered_device_id']
            sim_id = fake.uuid4()[:12] if random.random() < 0.8 else profile['registered_sim_id']
            
            # VPN visibility (fraudsters often use VPNs)
            vpn_flag = 1 if random.random() < 0.65 else 0
            
            remark = random.choice(fraud_remarks)
            fraud_label = 1
        else:
            # Normal transactions usually have smaller amounts
            amount = round(np.random.exponential(500) + 10, 2)
            if amount > 10000: # Limit normal amounts to keep it realistic
                amount = round(random.uniform(10, 5000), 2)
            
            # Location: close to usual location (~10km radius)
            lat = profile['usual_lat'] + np.random.uniform(-0.1, 0.1)
            long = profile['usual_long'] + np.random.uniform(-0.1, 0.1)
            
            # Device/SIM: usually matches the registered ones
            device_id = profile['registered_device_id'] if random.random() < 0.99 else fake.uuid4()[:12]
            sim_id = profile['registered_sim_id'] if random.random() < 0.99 else fake.uuid4()[:12]
            
            # Rare VPN usage for normal users
            vpn_flag = 1 if random.random() < 0.03 else 0
            
            remark = random.choice(normal_remarks)
            fraud_label = 0

        # Merchant location: could be anywhere
        m_lat = float(fake.latitude())
        m_long = float(fake.longitude())
        
        # Timestamp: spread over the last 60 days
        timestamp = fake.date_time_between(start_date='-60d', end_date='now')

        return {
            'user_id': profile['user_id'],
            'amount': amount,
            'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            'latitude': round(lat, 6),
            'longitude': round(long, 6),
            'usual_lat': round(profile['usual_lat'], 6),
            'usual_long': round(profile['usual_long'], 6),
            'device_id': device_id,
            'registered_device_id': profile['registered_device_id'],
            'sim_id': sim_id,
            'registered_sim_id': profile['registered_sim_id'],
            'vpn_flag': vpn_flag,
            'merchant_lat': round(m_lat, 6),
            'merchant_long': round(m_long, 6),
            'remark_text': remark,
            'fraud_label': fraud_label
        }

    # Generate records
    print(f"Generating fraud records...")
    for _ in range(num_fraud):
        data.append(create_transaction(True))
    
    print(f"Generating normal records...")
    for _ in range(num_normal):
        data.append(create_transaction(False))

    # Create DataFrame
    df = pd.DataFrame(data)
    
    # Shuffle the dataset so fraud cases are not all at the top
    df = df.sample(frac=1).reset_index(drop=True)
    
    # Create data folder if it doesn't exist
    import os
    if not os.path.exists("data"):
        os.makedirs("data")

    # Save to CSV
    output_file = "data/synthetic_upi_transactions.csv"
    df.to_csv(output_file, index=False)
    
    print(f"\nSuccess! Dataset saved to: {output_file}")
    print(f"Total Rows: {len(df)}")
    print(f"Fraud Count:\n{df['fraud_label'].value_counts()}")
    print(f"Dataset Preview:\n{df.head()}")

if __name__ == "__main__":
    generate_upi_fraud_dataset()
