"""
Master Training Script
Run this to train all models in the correct order.
"""
import os
import sys

# Ensure we're in the backend directory
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)


def main():
    print("=" * 60)
    print("  HYBRID UPI FRAUD DETECTION - MASTER TRAINING PIPELINE")
    print("=" * 60)

    # Step 1: Generate Dataset
    print("\n\n📊 STEP 1: Generating Synthetic Dataset...")
    print("-" * 50)
    from generate_dataset import generate_upi_fraud_dataset
    generate_upi_fraud_dataset()

    # Step 2: Train NLP Model
    print("\n\n🔤 STEP 2: Training NLP Model...")
    print("-" * 50)
    from models.train_nlp import train_nlp_model
    train_nlp_model()

    # Step 3: Train Core Model (depends on NLP model)
    print("\n\n🤖 STEP 3: Training Core ML Model...")
    print("-" * 50)
    from models.train_core import train_core_model
    train_core_model()

    # Step 4: Train LSTM Model
    print("\n\n🧠 STEP 4: Training LSTM Model...")
    print("-" * 50)
    try:
        from models.train_lstm import train_lstm_model
        train_lstm_model()
    except ImportError:
        print("⚠️  TensorFlow not available. LSTM model will be skipped.")
        print("   System will work without LSTM (weight redistributed to other models).")

    # Step 5: Build Graph
    print("\n\n🌐 STEP 5: Building Transaction Graph...")
    print("-" * 50)
    from modules.graph_engine import init_graph_engine
    graph = init_graph_engine(csv_path='data/synthetic_upi_transactions.csv')
    print(f"  Graph Stats: {graph.stats}")

    print("\n\n" + "=" * 60)
    print("  ✅ ALL MODELS TRAINED SUCCESSFULLY!")
    print("=" * 60)
    print("\n  Next steps:")
    print("  1. Start the backend:  python main.py")
    print("  2. Start the frontend: cd ../frontend && npm run dev")
    print("  3. Open Swagger UI:    http://localhost:8000/docs")
    print("  4. Open Frontend:      http://localhost:5173")


if __name__ == "__main__":
    main()
