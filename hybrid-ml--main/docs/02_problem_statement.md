# 02 Problem Statement

## The Problem
The rise of Unified Payments Interface (UPI) has revolutionized digital payments in India, making transactions instantaneous and easy. However, this same ease of use has been exploited by fraudsters. Traditional fraud detection systems primarily rely on static rules (e.g., transaction limits) which are slow to adapt to new fraudulent techniques.

## Key Challenges in UPI Fraud Detection
1. **Real-time Velocity**: UPI transactions happen within seconds, requiring a detection system that can decide within a few milliseconds.
2. **Dynamic Identity**: Fraudsters frequently change devices, use VPNs, or swap SIM cards to mask their identity.
3. **Social Engineering**: Many frauds are not technical breaches but social engineering where a user is tricked into sending money via deceptive remarks.
4. **Impossible Travel**: Detecting when a single account is being used from geographically impossible locations in a short time.
5. **Behavioral Shifts**: Identifying sudden changes in a user's transaction patterns (e.g., from small groceries to large lottery-themed transfers).

## The Goal
This project aims to bridge the gap by implementing a **Hybrid ML Pipeline** that looks at multiple aspects of a transaction simultaneously:
- **Spatial Consistency**: Is the user where they should be?
- **Device Security**: Is the device registered and untampered?
- **Semantic Analysis**: Is the transaction remark indicative of a scam?
- **Sequential Pattern**: Does this transaction fit the user's historical behavior?

By merging these signals, the system provides a robust defense against modern UPI threats.
