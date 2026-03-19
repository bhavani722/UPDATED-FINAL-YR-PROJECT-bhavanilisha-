import pandas as pd
import numpy as np
from faker import Faker
from sdv.single_table import GaussianCopulaSynthesizer
from sdv.metadata import Metadata
import datetime
import os
import time

def generate_upi_dataset(num_rows=1000000, output_file="synthetic_upi_fraud_data.parquet"):
    """
    Generates a synthetic UPI fraud dataset using Faker and SDV.
    """
    fake = Faker('en_IN') # Using Indian locale for UPI context
    
    print(f"--- 1. Generating Seed Data (1,000 records) ---")
    seed_rows = 1000
    user_ids = [f"UPI_USER_{i:04d}" for i in range(1, 101)]
    receiver_ids = [f"UPI_USER_{i:04d}" for i in range(200, 301)]
    device_ids = [f"DEV_{i:05d}" for i in range(1001, 1101)]
    
    cities = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur"]
    
    seed_data = []
    for _ in range(seed_rows):
        dt = datetime.datetime.now() - datetime.timedelta(days=np.random.randint(0, 30))
        seed_data.append({
            'timestamp': dt,
            'amount': np.random.uniform(10, 5000),
            'user_id': np.random.choice(user_ids),
            'receiver_id': np.random.choice(receiver_ids),
            'location_city': np.random.choice(cities),
            'device_id': np.random.choice(device_ids),
            'transaction_remark': fake.sentence(nb_words=4),
            'is_fraud': 0
        })
    
    df_seed = pd.DataFrame(seed_data)
    
    print(f"--- 2. Fitting SDV Model (GaussianCopula) ---")
    metadata = Metadata.detect_from_dataframe(
        data=df_seed,
        table_name='upi_transactions'
    )
    
    # Customize metadata to treat IDs as categorical instead of numeric if detected wrongly
    metadata.update_column(column_name='user_id', sdtype='categorical')
    metadata.update_column(column_name='receiver_id', sdtype='categorical')
    metadata.update_column(column_name='device_id', sdtype='categorical')
    metadata.update_column(column_name='location_city', sdtype='categorical')

    synthesizer = GaussianCopulaSynthesizer(metadata)
    synthesizer.fit(df_seed)
    
    print(f"--- 3. Sampling {num_rows:,} Synthetic Records ---")
    synthetic_df = synthesizer.sample(num_rows=num_rows)
    
    print(f"--- 4. Pattern Injection (10% Fraud Logic) ---")
    # Reset is_fraud to 0 first
    synthetic_df['is_fraud'] = 0
    
    # Calculate Moving Average for users
    # We'll group by user_id and calculate the mean to simulate historical behavior
    user_avg = synthetic_df.groupby('user_id')['amount'].transform('mean')
    
    # --- Pattern 1: Amount > 5x Moving Average (3% of total) ---
    fraud_idx_1 = synthetic_df.sample(frac=0.03).index
    synthetic_df.loc[fraud_idx_1, 'amount'] = user_avg.loc[fraud_idx_1] * 6
    synthetic_df.loc[fraud_idx_1, 'is_fraud'] = 1
    
    # --- Pattern 2: Phishing Remarks (3% of total) ---
    phishing_keywords = ['Win', 'Claim', 'Lottery', 'Verify KYC', 'Urgent', 'Reward']
    fraud_idx_2 = synthetic_df[synthetic_df['is_fraud'] == 0].sample(frac=0.03).index
    synthetic_df.loc[fraud_idx_2, 'transaction_remark'] = [
        f"{np.random.choice(phishing_keywords)}: Click to get your cash!" for _ in range(len(fraud_idx_2))
    ]
    synthetic_df.loc[fraud_idx_2, 'is_fraud'] = 1
    
    # --- Pattern 3: Impossible Travel (4% of total) ---
    # We'll simulate this by changing city and timestamp for a subset
    fraud_idx_3 = synthetic_df[synthetic_df['is_fraud'] == 0].sample(frac=0.04).index
    for idx in fraud_idx_3:
        # Change city to a random different one
        current_city = synthetic_df.loc[idx, 'location_city']
        other_cities = [c for c in cities if c != current_city]
        synthetic_df.loc[idx, 'location_city'] = np.random.choice(other_cities)
        
        # Ensure timestamp is very close to some hypothetical "previous" transaction (not calculated strictly)
        # but marked as fraud for the logic check in the XGBoost model later.
        synthetic_df.loc[idx, 'is_fraud'] = 1

    print(f"--- 5. Dataset Statistics ---")
    print(f"Total Rows: {len(synthetic_df)}")
    print(f"Fraud Rows: {synthetic_df['is_fraud'].sum()} ({synthetic_df['is_fraud'].mean()*100:.1f}%)")
    
    print(f"--- 6. Saving to Parquet (Zstandard compression) ---")
    synthetic_df.to_parquet(output_file, compression='zstd', index=False)
    print(f"Successfully saved to {output_file}")

if __name__ == "__main__":
    # Note: 1 million rows might take several minutes and significant RAM with SDV.
    # Adjust num_rows for testing if needed.
    start_time = time.time()
    generate_upi_dataset(num_rows=1000000)
    print(f"Time Taken: {time.time() - start_time:.2f} seconds")
