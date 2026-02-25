import pandas as pd
import numpy as np
import pickle
import os

# Suppress TensorFlow warnings if possible
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

class UPIRiskEngine:
    def __init__(self):
        self.core_model = None
        self.nlp_model_data = None
        self.lstm_model = None
        self.models_loaded = False
        self._load_all_models()

    def _load_all_models(self):
        """Loads all trained models from the models directory."""
        print("--- Initializing Risk Engine ---")
        
        # 1. Load Core Model (Random Forest/XGBoost)
        core_path = 'models/core_model.pkl'
        if os.path.exists(core_path):
            with open(core_path, 'rb') as f:
                self.core_model = pickle.load(f)
            print("Successfully loaded: core_model.pkl")
        else:
            print("Warning: core_model.pkl not found.")

        # 2. Load NLP Model Data (Model + TF-IDF)
        nlp_path = 'models/nlp_model.pkl'
        if os.path.exists(nlp_path):
            with open(nlp_path, 'rb') as f:
                self.nlp_model_data = pickle.load(f)
            print("Successfully loaded: nlp_model.pkl")
        else:
            print("Warning: nlp_model.pkl not found.")

        # 3. Load LSTM Model
        lstm_path = 'models/lstm_model.h5'
        if os.path.exists(lstm_path):
            try:
                from tensorflow.keras.models import load_model
                self.lstm_model = load_model(lstm_path)
                print("Successfully loaded: lstm_model.h5")
            except Exception as e:
                print(f"Notice: Found lstm_model.h5 but could not load (likely missing TensorFlow). Error: {e}")
        else:
            print("Notice: lstm_model.h5 not found.")

        if self.core_model and self.nlp_model_data:
            self.models_loaded = True

    def get_nlp_probability(self, remark_text):
        """Calculates scam probability using the NLP model."""
        if not self.nlp_model_data: return 0.0
        
        from train_nlp_model import clean_text
        tfidf = self.nlp_model_data['tfidf']
        model = self.nlp_model_data['model']
        
        cleaned = clean_text(remark_text)
        vec = tfidf.transform([cleaned])
        return model.predict_proba(vec)[0][1]

    def evaluate_transaction(self, tx_context, user_history_seq=None):
        """
        Computes risk score and decision for a transaction.
        tx_context: dict containing all engineered features
        user_history_seq: numpy array of shape (10, 4) for LSTM (optional)
        """
        if not self.core_model:
            return {"Decision": "Error", "Score": 0.0, "Reason": "Core Model Missing"}

        # 1. Get Model Probabilities

        # Ensure scam_probability is in tx_context for the core model
        if 'scam_probability' not in tx_context:
            tx_context['scam_probability'] = self.get_nlp_probability(tx_context.get('remark_text', ''))

        features_list = [
            'amount', 'location_distance', 'velocity', 'impossible_travel_flag',
            'device_mismatch_flag', 'sim_mismatch_flag', 'vpn_flag', 
            'burst_flag', 'scam_probability', 'merchant_distance'
        ]
        
        # Prepare input for core model
        input_data = pd.DataFrame([tx_context])[features_list]
        core_prob = self.core_model.predict_proba(input_data)[0][1]
        
        # LSTM sequence probability
        lstm_prob = 0.0
        if self.lstm_model and user_history_seq is not None:
            # Ensure shape is (1, 10, 4)
            lstm_prob = self.lstm_model.predict(np.expand_dims(user_history_seq, axis=0), verbose=0)[0][0]

        # 2. Extract specific risks for weighted formula
        nlp_prob = tx_context['scam_probability']
        location_risk = tx_context.get('impossible_travel_flag', 0)
        device_risk = tx_context.get('device_mismatch_flag', 0)
        qr_risk = tx_context.get('qr_mismatch_flag', 0)

        # 3. Hybrid Weighted Score Calculation
        # Formula: 0.4*core + 0.2*lstm + 0.1*loc + 0.1*dev + 0.1*nlp + 0.1*qr
        final_score = (
            (0.4 * core_prob) +
            (0.2 * lstm_prob) +
            (0.1 * location_risk) +
            (0.1 * device_risk) +
            (0.1 * nlp_prob) +
            (0.1 * qr_risk)
        )

        # 4. Decision Logic
        if final_score < 0.3:
            decision = "ALLOW"
        elif 0.3 <= final_score <= 0.6:
            decision = "OTP"
        else:
            decision = "BLOCK"

        return {
            "transaction_id": tx_context.get('transaction_id', 'N/A'),
            "score": round(final_score, 4),
            "decision": decision,
            "probabilities": {
                "core": round(float(core_prob), 4),
                "lstm": round(float(lstm_prob), 4),
                "nlp": round(float(nlp_prob), 4)
            }
        }

if __name__ == "__main__":
    # Test simulation
    engine = UPIRiskEngine()
    
    # Mock transaction for testing the engine
    test_tx = {
        'amount': 25000.0,
        'location_distance': 1500.0,
        'velocity': 1200.0,
        'impossible_travel_flag': 1,
        'device_mismatch_flag': 1,
        'sim_mismatch_flag': 1,
        'vpn_flag': 1,
        'burst_flag': 0,
        'scam_probability': 0.95,
        'merchant_distance': 150.0,
        'qr_mismatch_flag': 1,
        'remark_text': 'WINNER Lottery Claim'
    }
    
    result = engine.evaluate_transaction(test_tx)
    print("\n--- Risk Scoring Result (Simulation) ---")
    import json
    print(json.dumps(result, indent=4))
