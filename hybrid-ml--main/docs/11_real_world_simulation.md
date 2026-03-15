# 11 Real-World Simulation

Since this system is running in an academic environment without direct connection to the NPCI (National Payments Corporation of India) rails, we utilize high-fidelity simulation techniques.

## Simulation Components

### 1. Synthetic Transaction Dataset
We use a generated dataset of **50,000+ transactions**. This dataset contains "Normal" traffic mixed with "Injected" fraud patterns (e.g., travel spikes, device changes).

### 2. Manual Transaction Input
The React frontend allows a reviewer to manually enter transaction parameters:
- You can "fudge" your GPS coordinates to simulate being in another city.
- You can simulate a "New Device" by changing the Device ID string.
- You can type specific scam remarks to test the NLP model.

### 3. Simulated Metadata Capture
In a real app, coordinates are fetched via GPS. In our simulation:
- The system defaults to standard "Usual Locations" (e.g., major Indian Metro coordinates).
- Any deviation provided in the input form is treated as real-time GPS data.

### 4. Sequence Generation
The system dynamically creates a `Sequence_Amount_List` for every transaction attempt to ensure the LSTM has historical context to look back at.

## Testing a Scenario
To simulate **Impossible Travel Fraud**:
1. Select a user (e.g., `UPI_USER_1001`) who usually has transactions in Mumbai.
2. Enter current coordinates for Delhi.
3. The system will calculate a distance > 1000km.
4. The Risk Engine will flag this as suspicious and trigger an OTP challenge.
