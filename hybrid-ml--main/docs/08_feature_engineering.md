# 08 Feature Engineering

Feature engineering is the process of converting raw data into signals that machine learning models can understand. In this project, we focus on behavioral and contextual features.

## Key Features

### 1. Geographical Distance
Instead of raw Lat/Lon, we calculate the **Distance from Usual Location**.
- **Logic**: If a user usually transacts from Bangalore but suddenly initiates a transaction from Delhi, the risk increases.
- **Formula (Haversine)**:
  $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\phi_2 - \phi_1}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\lambda_2 - \lambda_1}{2}\right)}\right)$$
  *where $\phi$ is latitude, $\lambda$ is longitude, and $r$ is Earth's radius (6371 km).*

### 2. Velocity Detection
Checks for "Impossible Travel".
- **Logic**: Can a user move 1000km in 10 minutes?
- **Formula**: $Velocity = \frac{Distance (km)}{Time\ Difference (hours)}$

### 3. Device Fingerprint Comparison
Compares the current `Device_ID` with the user's `Registered_Device_ID` using a Boolean mismatch flag.
- `device_mismatch_flag = 1` if `Device_ID != Registered_Device_ID` else `0`.

### 4. Burst Transaction Detection
Counts the number of transactions performed within a short "burst" window (e.g., 5-30 minutes).
- High burst counts often indicate a bot or a thief trying to empty an account before it's blocked.

### 5. SIM Swap and VPN Flags
- **SIM Swap**: Flagged if the system detects a SIM metadata change recently.
- **VPN Flag**: Detected if the IP address indicates a proxy or data center rather than a standard ISP.

### 6. Remark Text Analysis (NLP)
Uses NLP to extract sentiment and intent from the transaction memo.
- **Keyword Clustering**: Scam keywords like "Prize", "Lucky", "Urgent", "Click Here", "Verify Account" are converted into numerical TF-IDF scores.
- **TF-IDF (Term Frequency-Inverse Document Frequency)**: Highlights words that are common in fraud reports but rare in normal transactions.
