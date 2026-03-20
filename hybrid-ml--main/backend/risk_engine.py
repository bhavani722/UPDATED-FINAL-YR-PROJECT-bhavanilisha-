"""
Hybrid Risk Engine
Combines all model scores with weighted aggregation.

Formula:
Final_Risk = (0.35 × Core_Model) + (0.15 × NLP_Model) + (0.20 × LSTM_Model) +
             (0.10 × Location_Risk) + (0.10 × Device_Risk) + (0.10 × Graph_Risk)
"""
import numpy as np
import pandas as pd
import pickle
import os
import json

# Suppress TF warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'


class HybridRiskEngine:
    """
    Multi-layer risk scoring engine combining ML models, rule-based signals,
    and graph analysis into a single explainable risk score.
    """

    # Weight configuration (Rebalanced for 7 layers)
    WEIGHTS = {
        'core_model': 0.30,
        'nlp_model': 0.13,
        'lstm_model': 0.17,
        'location_risk': 0.10,
        'device_risk': 0.10,
        'graph_risk': 0.10,
        'biometric_risk': 0.10,
    }

    def __init__(self, model_dir='trained_models'):
        self.model_dir = model_dir
        self.core_model = None
        self.core_features = None
        self.nlp_model = None
        self.nlp_tfidf = None
        self.lstm_model = None
        self.lstm_scaler = None
        self.graph_engine = None
        self.ready = False
        self._load_models()

    def _load_models(self):
        """Load all trained models."""
        print("\n  === Initializing Hybrid Risk Engine ===")

        # Core Model
        core_path = os.path.join(self.model_dir, 'core_model.pkl')
        meta_path = os.path.join(self.model_dir, 'core_model_meta.pkl')
        if os.path.exists(core_path):
            with open(core_path, 'rb') as f:
                self.core_model = pickle.load(f)
            if os.path.exists(meta_path):
                with open(meta_path, 'rb') as f:
                    self.core_features = pickle.load(f)['features']
            print("  ✅ Core Model loaded")
        else:
            print("  ⚠️  Core Model not found")

        # NLP Model
        nlp_path = os.path.join(self.model_dir, 'nlp_model.pkl')
        if os.path.exists(nlp_path):
            with open(nlp_path, 'rb') as f:
                nlp_data = pickle.load(f)
                self.nlp_model = nlp_data['model']
                self.nlp_tfidf = nlp_data['tfidf']
            print("  ✅ NLP Model loaded")
        else:
            print("  ⚠️  NLP Model not found")

        # LSTM Model
        lstm_path = os.path.join(self.model_dir, 'lstm_model.h5')
        if os.path.exists(lstm_path):
            try:
                from tensorflow.keras.models import load_model
                self.lstm_model = load_model(lstm_path)
                scaler_path = os.path.join(self.model_dir, 'lstm_scaler.pkl')
                if os.path.exists(scaler_path):
                    with open(scaler_path, 'rb') as f:
                        self.lstm_scaler = pickle.load(f)
                print("  ✅ LSTM Model loaded")
            except Exception as e:
                print(f"  ⚠️  LSTM Model load error: {e}")
        else:
            print("  ⚠️  LSTM Model not found")

        # Graph Engine
        try:
            from modules.graph_engine import get_graph_engine
            self.graph_engine = get_graph_engine()
            if self.graph_engine._built:
                print("  ✅ Graph Engine available")
            else:
                print("  ⚠️  Graph Engine not yet built")
        except Exception as e:
            print(f"  ⚠️  Graph Engine: {e}")

        self.ready = self.core_model is not None
        print(f"  Engine Ready: {'✅ YES' if self.ready else '❌ NO (need at least core model)'}")

    def _get_nlp_score(self, remark_text):
        """Get scam probability from NLP model."""
        if not self.nlp_model or not self.nlp_tfidf:
            return 0.0
        from models.train_nlp import clean_text
        cleaned = clean_text(remark_text)
        vec = self.nlp_tfidf.transform([cleaned])
        return float(self.nlp_model.predict_proba(vec)[0][1])

    def _get_lstm_score(self, sequence_amount_list):
        """Get behavioral anomaly score from LSTM model."""
        if not self.lstm_model or not self.lstm_scaler:
            return 0.0
        try:
            if isinstance(sequence_amount_list, str):
                seq = json.loads(sequence_amount_list)
            else:
                seq = list(sequence_amount_list)

            max_len = 10
            if len(seq) < max_len:
                seq = [0.0] * (max_len - len(seq)) + seq
            else:
                seq = seq[-max_len:]

            arr = np.array(seq, dtype=np.float32).reshape(-1, 1)
            arr = self.lstm_scaler.transform(arr).reshape(1, max_len, 1)
            prob = float(self.lstm_model.predict(arr, verbose=0)[0][0])
            return prob
        except Exception:
            return 0.0

    def _get_graph_score(self, user_id):
        """Get graph-based risk score."""
        if not self.graph_engine or not self.graph_engine._built:
            return 0.0
        return self.graph_engine.get_node_risk(user_id)

    def _build_core_features(self, tx_data, loc_res, dev_res, nlp_score):
        """Builds a consistent feature dictionary for the core XGBoost model."""
        amount = float(tx_data.get('Amount', tx_data.get('amount', 0)))
        seq_list = tx_data.get('Sequence_Amount_List', tx_data.get('sequence_amount_list', '[]'))
        
        # Sequence logic
        try:
            if isinstance(seq_list, str):
                seq = json.loads(seq_list)
            else:
                seq = list(seq_list)
            
            std_dev = float(np.std(seq)) if len(seq) > 1 else 0.0
            prev_mean = np.mean(seq[:-1]) if len(seq) > 1 else (seq[0] if seq else 0.0)
            max_ratio = seq[-1] / (prev_mean + 1e-6) if len(seq) > 1 else 1.0
        except Exception:
            std_dev, max_ratio = 0.0, 1.0

        return {
            'Amount': amount,
            'amount_log': np.log1p(amount),
            'SIM_Change_Flag': dev_res.get('sim_change_flag', tx_data.get('SIM_Change_Flag', 0)),
            'VPN_Flag': tx_data.get('VPN_Flag', tx_data.get('vpn_flag', 0)),
            'Burst_Count': tx_data.get('Burst_Count', tx_data.get('burst_count', 0)),
            'location_distance': loc_res.get('location_distance', 0),
            'device_mismatch_flag': dev_res.get('device_mismatch_flag', 0),
            'nlp_score': nlp_score,
            'seq_std': std_dev,
            'seq_max_ratio': max_ratio,
        }

    def _generate_fraud_reasons(self, scores, tx_data):
        """Generate human-readable fraud reason explanations."""
        reasons = []

        if scores['core_score'] > 0.6:
            reasons.append(f"High core ML fraud probability ({scores['core_score']:.2f})")
        elif scores['core_score'] > 0.3:
            reasons.append(f"Moderate core ML fraud probability ({scores['core_score']:.2f})")

        if scores['nlp_score'] > 0.5:
            reasons.append(f"Suspicious remark detected: possible scam language ({scores['nlp_score']:.2f})")

        if scores['lstm_score'] > 0.5:
            reasons.append(f"Abnormal transaction behavior pattern ({scores['lstm_score']:.2f})")

        if tx_data.get('impossible_travel_flag', 0):
            reasons.append("Impossible travel detected: location inconsistency with previous transaction")

        if tx_data.get('location_distance', 0) > 200:
            reasons.append(f"Transaction far from usual location ({tx_data.get('location_distance', 0):.0f} km)")

        if tx_data.get('device_mismatch_flag', 0):
            reasons.append("Unregistered device used for transaction")

        if tx_data.get('SIM_Change_Flag', 0) or tx_data.get('sim_change_flag', 0):
            reasons.append("Recent SIM change detected — potential SIM swap attack")

        if tx_data.get('VPN_Flag', 0) or tx_data.get('vpn_flag', 0):
            reasons.append("VPN detected — location masking attempt")

        if tx_data.get('Burst_Count', 0) > 3 or tx_data.get('burst_count', 0) > 3:
            reasons.append(f"Burst transaction activity ({tx_data.get('Burst_Count', tx_data.get('burst_count', 0))} recent transactions)")

        if scores['graph_risk'] > 0.3:
            reasons.append(f"User connected to suspicious network cluster (graph risk: {scores['graph_risk']:.2f})")

        if tx_data.get('Amount', tx_data.get('amount', 0)) > 15000:
            reasons.append(f"High transaction amount: ₹{tx_data.get('Amount', tx_data.get('amount', 0)):,.2f}")

        if not reasons:
            reasons.append("Transaction appears normal — no significant risk indicators")

        # Biometric specific XAI
        biometric_verified = tx_data.get('biometric_verified')
        if biometric_verified is False:
            reasons.append("Biometric mismatch: Identity could not be confirmed via fingerprint/FaceID")
        
        if tx_data.get('device_risk_score', 0) > 0.8:
            reasons.append("Secure hardware bypass detected: rooted/jailbroken device behavior")

        if tx_data.get('pin_entry_ms', 3000) < 1200:
            reasons.append("Abnormal user interaction: PIN entry speed inconsistent with human behavior")

        return reasons

    def precheck_requires_biometric(self, tx_data):
        """
        Runs a partial 6-layer assessment to decide if biometrics 
        should be 'stepped up' (Adaptive Biometrics).
        """
        # 1. NLP
        remark = tx_data.get('Remark_Text', tx_data.get('remark_text', ''))
        nlp_score = self._get_nlp_score(remark)

        # 2. Location
        from modules.location_engine import calculate_location_risk
        loc_res = calculate_location_risk(
            sender_lat=tx_data.get('Sender_Lat', 0),
            sender_lon=tx_data.get('Sender_Lon', 0),
            sender_usual_lat=tx_data.get('Sender_Usual_Lat', 0),
            sender_usual_lon=tx_data.get('Sender_Usual_Lon', 0),
            receiver_lat=tx_data.get('Receiver_Lat', 0),
            receiver_lon=tx_data.get('Receiver_Lon', 0),
        )

        # 3. Device
        from modules.device_engine import calculate_device_risk
        dev_res = calculate_device_risk(
            device_id=tx_data.get('Device_ID', ''),
            registered_device_id=tx_data.get('Registered_Device_ID', ''),
            sim_change_flag=tx_data.get('SIM_Change_Flag', 0),
        )

        # 4. Core
        core_features = self._build_core_features(tx_data, loc_res, dev_res, nlp_score)
        
        if self.core_features:
            input_df = pd.DataFrame([core_features])[self.core_features]
        else:
            input_df = pd.DataFrame([core_features])
            
        core_score = float(self.core_model.predict_proba(input_df)[0][1])

        # 5. Risk Calculation (Sum of first 4 layers + device/loc/graph)
        # Simplified pre-score to decide if STEP-UP is needed
        pre_risk = (
            0.40 * core_score + 
            0.20 * nlp_score +
            0.20 * loc_res['location_risk_score'] + 
            0.20 * dev_res['device_risk_score']
        )
        
        # Scenario B from requirement: New city (high loc risk) + high amount -> Risk > 0.4
        return pre_risk > 0.4

    def evaluate_transaction(self, tx_data):
        """
        Evaluate a single transaction through the hybrid risk pipeline.
        
        Args:
            tx_data: dict with transaction fields
            
        Returns:
            dict with all scores, final risk, decision, and fraud reasons
        """
        if not self.ready:
            return {
                'error': 'Risk engine not initialized. Train models first.',
                'final_risk_score': 0.0,
                'decision': 'ERROR'
            }

        # --- 1. NLP Score ---
        remark = tx_data.get('Remark_Text', tx_data.get('remark_text', ''))
        nlp_score = self._get_nlp_score(remark)

        # --- 2. Location Risk ---
        from modules.location_engine import calculate_location_risk, haversine_distance
        loc_result = calculate_location_risk(
            sender_lat=tx_data.get('Sender_Lat', tx_data.get('sender_lat', 0)),
            sender_lon=tx_data.get('Sender_Lon', tx_data.get('sender_lon', 0)),
            sender_usual_lat=tx_data.get('Sender_Usual_Lat', tx_data.get('sender_usual_lat', 0)),
            sender_usual_lon=tx_data.get('Sender_Usual_Lon', tx_data.get('sender_usual_lon', 0)),
            receiver_lat=tx_data.get('Receiver_Lat', tx_data.get('receiver_lat', 0)),
            receiver_lon=tx_data.get('Receiver_Lon', tx_data.get('receiver_lon', 0)),
        )

        # --- 3. Device Risk ---
        from modules.device_engine import calculate_device_risk
        dev_result = calculate_device_risk(
            device_id=tx_data.get('Device_ID', tx_data.get('device_id', '')),
            registered_device_id=tx_data.get('Registered_Device_ID', tx_data.get('registered_device_id', '')),
            sim_change_flag=tx_data.get('SIM_Change_Flag', tx_data.get('sim_change_flag', 0)),
        )

        # --- 4. LSTM Score ---
        seq_list = tx_data.get('Sequence_Amount_List', tx_data.get('sequence_amount_list', '[]'))
        lstm_score = self._get_lstm_score(seq_list)

        # --- 5. Graph Score ---
        user_id = tx_data.get('User_ID', tx_data.get('user_id', ''))
        graph_score = self._get_graph_score(user_id)

        # --- 6. Core Model Score ---
        # Build feature vector for core model
        core_features = self._build_core_features(tx_data, loc_result, dev_result, nlp_score)

        if self.core_features:
            input_df = pd.DataFrame([core_features])[self.core_features]
        else:
            input_df = pd.DataFrame([core_features])

        core_score = float(self.core_model.predict_proba(input_df)[0][1])

        # --- 7. Biometric Layer (Contextual & Behavioral) ---
        biometric_verified = tx_data.get('biometric_verified')
        amount = tx_data.get('Amount', tx_data.get('amount', 0))
        pin_speed = tx_data.get('pin_entry_ms', 2000)

        # Behavioral simulation: PIN speed risk
        # Normal human usually takes > 1200ms for 6-digit PIN. Below 800ms looks like a bot.
        behavioral_risk = 0.0
        if pin_speed < 1200:
            behavioral_risk += 0.4 # Bot indicator

        # Biometric score calculation
        if biometric_verified is True:
            biometric_score = 0.0 + behavioral_risk
        elif biometric_verified is False:
            # Explicit failure (wrong fingerprint or cancelled)
            biometric_score = 0.8 + behavioral_risk
        else:
            # Not provided (Low-risk threshold path)
            biometric_score = 0.2 + behavioral_risk

        # Multiplier Logic: If unverified and high amount, risk spikes
        risk_multiplier = 1.0
        if biometric_verified is not True and amount > 5000:
            risk_multiplier = 1.4 # +40% as requested

        # --- 8. Hybrid Weighted Aggregation ---
        final_risk = (
            self.WEIGHTS['core_model'] * core_score +
            self.WEIGHTS['nlp_model'] * nlp_score +
            self.WEIGHTS['lstm_model'] * lstm_score +
            self.WEIGHTS['location_risk'] * loc_result['location_risk_score'] +
            self.WEIGHTS['device_risk'] * dev_result['device_risk_score'] +
            self.WEIGHTS['graph_risk'] * graph_score +
            self.WEIGHTS['biometric_risk'] * biometric_score
        ) * risk_multiplier

        # Cap at 1.0
        final_risk = min(1.0, final_risk)

        # --- 8. Decision ---
        if final_risk < 0.3:
            decision = "ALLOW"
        elif final_risk <= 0.7:
            decision = "OTP"
        else:
            decision = "BLOCK"

        # Merge all info for reason generation
        all_data = {**tx_data, **loc_result, **dev_result}
        scores = {
            'core_score': round(core_score, 4),
            'nlp_score': round(nlp_score, 4),
            'lstm_score': round(lstm_score, 4),
            'location_risk': round(loc_result['location_risk_score'], 4),
            'device_risk': round(dev_result['device_risk_score'], 4),
            'graph_risk': round(graph_score, 4),
        }

        fraud_reasons = self._generate_fraud_reasons(scores, all_data)

        return {
            'transaction_id': tx_data.get('Transaction_ID', tx_data.get('transaction_id', 'N/A')),
            'user_id': user_id,
            'amount': tx_data.get('Amount', tx_data.get('amount', 0)),
            'core_score': scores['core_score'],
            'nlp_score': scores['nlp_score'],
            'lstm_score': scores['lstm_score'],
            'location_risk': scores['location_risk'],
            'device_risk': scores['device_risk'],
            'graph_risk': scores['graph_risk'],
            'biometric_score': round(biometric_score, 4),
            'biometric_verified': biometric_verified,
            'final_risk_score': round(final_risk, 4),
            'decision': decision,
            'fraud_reasons': fraud_reasons,
            'weights_used': self.WEIGHTS,
            'location_details': loc_result,
            'device_details': dev_result,
        }


# Singleton
_engine_instance = None


def get_risk_engine(model_dir='trained_models'):
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = HybridRiskEngine(model_dir=model_dir)
    return _engine_instance
