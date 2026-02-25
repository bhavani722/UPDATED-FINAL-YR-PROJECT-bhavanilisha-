import pandas as pd
import numpy as np
import pickle
import os
import re
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_score, recall_score
import nltk
from nltk.corpus import stopwords

# Ensure stopwords are downloaded
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

def clean_text(text):
    """
    Basic text cleaning: lowercase, remove special characters, remove stopwords.
    """
    if not isinstance(text, str):
        return ""
    
    # Lowercase
    text = text.lower()
    # Remove special characters/digits
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    # Remove stopwords
    stop_words = set(stopwords.words('english'))
    words = text.split()
    cleaned_words = [w for w in words if w not in stop_words]
    
    return " ".join(cleaned_words)

def train_nlp_model(file_path='data/synthetic_upi_transactions.csv'):
    """
    Trains an NLP model to detect fraudulent remarks in transaction descriptions.
    """
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found. Generate the dataset first.")
        return

    print("--- Training NLP Fraud Detection Model ---")
    
    # 1. Load Dataset
    print("Loading data...")
    df = pd.read_csv(file_path)
    
    # 2. Preprocess Text
    print("Cleaning remarks...")
    df['cleaned_remark'] = df['remark_text'].apply(clean_text)
    
    # Check if we have valid text
    if df['cleaned_remark'].str.strip().eq("").all():
        print("Warning: All remarks are empty after cleaning. Using raw text instead.")
        df['cleaned_remark'] = df['remark_text'].fillna("payment")

    # 3. Features and Targets
    X = df['cleaned_remark']
    y = df['fraud_label']
    
    # 4. Split Data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
    
    # 5. Convert text using TF-IDF
    print("Vectorizing text using TF-IDF...")
    tfidf = TfidfVectorizer(max_features=1000, ngram_range=(1, 2))
    X_train_tfidf = tfidf.fit_transform(X_train)
    X_test_tfidf = tfidf.transform(X_test)
    
    # 6. Train Logistic Regression
    print("Training Logistic Regression model...")
    model = LogisticRegression(class_weight='balanced', random_state=42)
    model.fit(X_train_tfidf, y_train)
    
    # 7. Evaluate
    print("\nModel Evaluation:")
    y_pred = model.predict(X_test_tfidf)
    y_prob = model.predict_proba(X_test_tfidf)[:, 1]
    
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(f"Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"Recall: {recall_score(y_test, y_pred):.4f}")
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # 8. Save Model
    if not os.path.exists('models'):
        os.makedirs('models')
        
    model_data = {
        'model': model,
        'tfidf': tfidf
    }
    
    model_path = 'models/nlp_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump(model_data, f)
        
    print(f"\nNLP Model saved to: {model_path}")
    
    # Example prediction
    sample_text = ["Congratulations you won a lottery claim now"]
    sample_vec = tfidf.transform(sample_text)
    prob = model.predict_proba(sample_vec)[0][1]
    print(f"Sample Prediction ('{sample_text[0]}'): Scam Probability = {prob:.4f}")

if __name__ == "__main__":
    train_nlp_model()
