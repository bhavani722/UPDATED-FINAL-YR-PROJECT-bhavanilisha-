import { useLocation, Link } from 'react-router-dom';
import { DecisionDisplay, ScoreBreakdown, FraudReasons, RiskMeter } from '../components/UIComponents';

export default function ResultPage() {
    const location = useLocation();
    const result = location.state?.result;

    if (!result) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
                <h2 style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>No evaluation result found</h2>
                <Link to="/transaction" className="btn btn-primary">
                    ← Go to Transaction Page
                </Link>
            </div>
        );
    }

    const scores = {
        core_score: result.core_score || 0,
        nlp_score: result.nlp_score || 0,
        lstm_score: result.lstm_score || 0,
        location_risk: result.location_risk || 0,
        device_risk: result.device_risk || 0,
        graph_risk: result.graph_risk || 0,
    };

    return (
        <div className="page-container" style={{ maxWidth: '1000px' }}>
            <div className="page-header">
                <h1 className="page-title animate-fadeInUp">📋 Risk Assessment Result</h1>
                <p className="page-description animate-fadeInUp stagger-1">
                    Transaction <code style={{ color: 'var(--accent-indigo-light)' }}>{result.transaction_id}</code> —
                    User <code style={{ color: 'var(--accent-indigo-light)' }}>{result.user_id}</code>
                </p>
            </div>

            {/* Decision Display */}
            <DecisionDisplay decision={result.decision} score={result.final_risk_score} />

            {/* Risk Meter */}
            <div className="glass-card no-hover animate-fadeInUp" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="stat-label" style={{ margin: 0 }}>Final Hybrid Risk Score</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {(result.final_risk_score * 100).toFixed(2)}%
                    </span>
                </div>
                <RiskMeter score={result.final_risk_score} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span>0% — Safe</span>
                    <span>30%</span>
                    <span>70%</span>
                    <span>100% — Critical</span>
                </div>
            </div>

            <div className="grid-2" style={{ marginTop: '1.5rem' }}>
                {/* Score Breakdown */}
                <div className="glass-card no-hover animate-fadeInUp stagger-2">
                    <h3 className="section-title">🎯 Score Breakdown (Weighted)</h3>
                    <ScoreBreakdown scores={scores} />
                    <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <strong>Formula:</strong> 0.35 × Core + 0.15 × NLP + 0.20 × LSTM + 0.10 × Location + 0.10 × Device + 0.10 × Graph
                    </div>
                </div>

                {/* Fraud Reasons */}
                <div className="glass-card no-hover animate-fadeInUp stagger-3">
                    <h3 className="section-title">⚠️ Risk Indicators</h3>
                    <FraudReasons reasons={result.fraud_reasons} />
                </div>
            </div>

            {/* Location & Device Details */}
            <div className="grid-2" style={{ marginTop: '1.5rem' }}>
                <div className="glass-card no-hover animate-fadeInUp stagger-4">
                    <h3 className="section-title">📍 Location Analysis</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Distance from usual</span>
                            <span style={{ fontFamily: 'JetBrains Mono' }}>{result.location_details?.location_distance?.toFixed(1)} km</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Velocity</span>
                            <span style={{ fontFamily: 'JetBrains Mono' }}>{result.location_details?.velocity?.toFixed(1)} km/h</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Impossible Travel</span>
                            <span style={{ color: result.location_details?.impossible_travel_flag ? '#fb7185' : '#34d399' }}>
                                {result.location_details?.impossible_travel_flag ? '⚠️ YES' : '✅ NO'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Sender-Receiver Distance</span>
                            <span style={{ fontFamily: 'JetBrains Mono' }}>{result.location_details?.sender_receiver_distance?.toFixed(1)} km</span>
                        </div>
                    </div>
                </div>

                <div className="glass-card no-hover animate-fadeInUp stagger-4">
                    <h3 className="section-title">📱 Device Analysis</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Device Mismatch</span>
                            <span style={{ color: result.device_details?.device_mismatch_flag ? '#fb7185' : '#34d399' }}>
                                {result.device_details?.device_mismatch_flag ? '⚠️ MISMATCH' : '✅ MATCH'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>SIM Change</span>
                            <span style={{ color: result.device_details?.sim_change_flag ? '#fb7185' : '#34d399' }}>
                                {result.device_details?.sim_change_flag ? '⚠️ CHANGED' : '✅ SAME'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Device Risk Score</span>
                            <span style={{ fontFamily: 'JetBrains Mono' }}>{result.device_details?.device_risk_score?.toFixed(4)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '2rem' }}>
                <Link to="/transaction" className="btn btn-primary">
                    🔍 New Evaluation
                </Link>
                <Link to="/" className="btn btn-secondary">
                    ← Back to Home
                </Link>
            </div>
        </div>
    );
}
