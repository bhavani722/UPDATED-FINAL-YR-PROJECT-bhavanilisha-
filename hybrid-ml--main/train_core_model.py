import pandas as pd
import numpy as np
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    confusion_matrix, accuracy_score, precision_score, 
    recall_score, f1_score, roc_auc_score, classification_report
)

# Import our custom feature engines
from modules.location_engine import calculate_location_features, haversine_distance
from modules.device_sim_engine import calculate_device_sim_features
from modules.burst_detection import calculate_burst_features

def prepare_core_features(df):
    """
    Orchestrates all feature engines to create the final feature set for the core model.
    """
    print("--- Orchestrating Feature Engineering ---")
    
    # 1. Apply Location Engine
    df = calculate_location_features(df)
    
    # 2. Apply Device/SIM Engine
    df = calculate_device_sim_features(df)
    
    # 3. Apply Burst Detection
    df = calculate_burst_features(df)
    
    # 4. Calculate Merchant Distance
    print("Calculating merchant distance...")
    df['merchant_distance'] = haversine_distance(
        df['latitude'], df['longitude'],
        df['merchant_lat'], df['merchant_long']
    )
    
    # 5. Integrate Scam Probability from NLP Model
    print("Integrating NLP scam probabilities...")
    nlp_model_path = 'models/nlp_model.pkl'
    if os.path.exists(nlp_model_path):
        with open(nlp_model_path, 'rb') as f:
            nlp_data = pickle.load(f)
            model = nlp_data['model']
            tfidf = nlp_data['tfidf']
            
            # Simple cleaning for NLP model
            from train_nlp_model import clean_text
            cleaned_remarks = df['remark_text'].apply(clean_text)
            tfidf_matrix = tfidf.transform(cleaned_remarks)
            df['scam_probability'] = model.predict_proba(tfidf_matrix)[:, 1]
    else:
        print("Warning: nlp_model.pkl not found. Setting scam_probability to 0.")
        df['scam_probability'] = 0.0

    return df

def train_core_model(file_path='data/synthetic_upi_transactions.csv'):
    """
    Trains the main XGBoost fraud detection model utilizing all engineered features.
    """
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found.")
        return

    # Load data
    print(f"Loading data from {file_path}...")
    raw_df = pd.read_csv(file_path)
    raw_df['timestamp'] = pd.to_datetime(raw_df['timestamp'])
    
    # Feature Engineering
    df = prepare_core_features(raw_df)
    
    # Define Feature List
    features = [
        'amount', 
        'location_distance', 
        'velocity', 
        'impossible_travel_flag',
        'device_mismatch_flag', 
        'sim_mismatch_flag', 
        'vpn_flag', 
        'burst_flag', 
        'scam_probability',
        'merchant_distance'
    ]
    
    X = df[features]
    y = df['fraud_label']
    
    print(f"Feature matrix columns: {X.columns.tolist()}")
    print(f"Feature matrix shape: {X.shape}")
    print(f"Target vector shape: {y.shape}")
    
    # Split Data (80-20 Stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    
    # Calculate scale_pos_weight (Ratio of negative to positive classes)
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    scale_weight = neg_count / pos_count
    
    print(f"Training XGBoost with scale_pos_weight: {scale_weight:.2f}")
    
    # Train Random Forest (Fallback for XGBoost)
    print(f"Training Random Forest with balanced class weights...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Evaluation
    print("\n--- Core Model Evaluation Results ---")
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    print(f"Accuracy:  {accuracy_score(y_test, y_pred):.4f}")
    print(f"Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"Recall:    {recall_score(y_test, y_pred):.4f}")
    print(f"F1 Score:  {f1_score(y_test, y_pred):.4f}")
    print(f"ROC AUC:   {roc_auc_score(y_test, y_prob):.4f}")
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Feature Importance
    importance = pd.DataFrame({
        'feature': X_train.columns.tolist(),
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    print("\nFeature Importance:")
    print(importance)

    # Save Model
    if not os.path.exists('models'):
        os.makedirs('models')
    
    save_path = 'models/core_model.pkl'
    with open(save_path, 'wb') as f:
        pickle.dump(model, f)
        
    print(f"\nCore Model successfully saved to: {save_path}")

if __name__ == "__main__":
    train_core_model()
