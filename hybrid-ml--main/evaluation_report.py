import pandas as pd
import numpy as np
import pickle
import os
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    confusion_matrix, roc_curve, auc, precision_recall_curve, 
    average_precision_score, classification_report, accuracy_score
)
from sklearn.model_selection import train_test_split

# Import orchestration from training script to get the features
from train_core_model import prepare_core_features

def generate_evaluation_report(dataset_path='data/synthetic_upi_transactions.csv', model_path='models/core_model.pkl'):
    """
    Generates a comprehensive evaluation report with visualization for the Core Fraud Model.
    """
    if not os.path.exists(dataset_path):
        print(f"Error: Dataset {dataset_path} not found.")
        return
    if not os.path.exists(model_path):
        print(f"Error: Model {model_path} not found. Train the model first.")
        return

    print("--- Generating Evaluation Report ---")
    
    # 1. Load Data and Engineer Features
    print("Loading and processing data...")
    raw_df = pd.read_csv(dataset_path)
    raw_df['timestamp'] = pd.to_datetime(raw_df['timestamp'])
    df = prepare_core_features(raw_df)
    
    features = [
        'amount', 'location_distance', 'velocity', 'impossible_travel_flag',
        'device_mismatch_flag', 'sim_mismatch_flag', 'vpn_flag', 
        'burst_flag', 'scam_probability', 'merchant_distance'
    ]
    
    X = df[features]
    y = df['fraud_label']
    
    # Stratified Split (matching training logic)
    _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    
    # 2. Load Model
    with open(model_path, 'rb') as f:
        model = pickle.load(f)
    
    # 3. Get Predictions
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    # 4. Generate Classification Report
    print("\n[1] Classification Report:")
    print(classification_report(y_test, y_pred))
    
    # 5. Plotting
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    plt.subplots_adjust(hspace=0.4, wspace=0.3)
    
    # --- A. Confusion Matrix ---
    cm = confusion_matrix(y_test, y_pred)
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', ax=axes[0, 0])
    axes[0, 0].set_title('Confusion Matrix')
    axes[0, 0].set_xlabel('Predicted Label')
    axes[0, 0].set_ylabel('True Label')
    
    # --- B. ROC Curve ---
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    roc_auc = auc(fpr, tpr)
    axes[0, 1].plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (area = {roc_auc:.4f})')
    axes[0, 1].plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
    axes[0, 1].set_xlim([0.0, 1.0])
    axes[0, 1].set_ylim([0.0, 1.05])
    axes[0, 1].set_xlabel('False Positive Rate')
    axes[0, 1].set_ylabel('True Positive Rate')
    axes[0, 1].set_title('Receiver Operating Characteristic (ROC)')
    axes[0, 1].legend(loc="lower right")
    
    # --- C. Precision-Recall Curve ---
    precision, recall, _ = precision_recall_curve(y_test, y_prob)
    avg_precision = average_precision_score(y_test, y_prob)
    axes[1, 0].step(recall, precision, where='post', color='green', label=f'AP = {avg_precision:.4f}')
    axes[1, 0].fill_between(recall, precision, step='post', alpha=0.2, color='green')
    axes[1, 0].set_xlabel('Recall')
    axes[1, 0].set_ylabel('Precision')
    axes[1, 0].set_title('Precision-Recall Curve')
    axes[1, 0].set_ylim([0.0, 1.05])
    axes[1, 0].set_xlim([0.0, 1.0])
    axes[1, 0].legend(loc="lower left")
    
    # --- D. Feature Importance ---
    # Try to get feature importance from model
    if hasattr(model, 'feature_importances_'):
        importances = model.feature_importances_
        indices = np.argsort(importances)
        axes[1, 1].barh(range(len(indices)), importances[indices], align='center', color='skyblue')
        axes[1, 1].set_yticks(range(len(indices)))
        axes[1, 1].set_yticklabels([features[i] for i in indices])
        axes[1, 1].set_title('Feature Importance')
    else:
        axes[1, 1].text(0.5, 0.5, 'Feature Importance Not Available', ha='center', va='center')
    
    # Save results
    report_image = 'models/evaluation_plots.png'
    plt.savefig(report_image)
    print(f"\nEvaluation plots saved to: {report_image}")
    # plt.show() # Disabled for non-interactive execution

if __name__ == "__main__":
    generate_evaluation_report()
