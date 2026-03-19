import { useLocation, Link } from 'react-router-dom';
import { useState } from 'react';
import { verifyOtp } from '../services/api';
import { DecisionDisplay, ScoreBreakdown, FraudReasons, RiskMeter } from '../components/UIComponents';
import { Fingerprint, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function ResultPage() {
    const location = useLocation();
    const [result, setResult] = useState(location.state?.result);
    const [otp, setOtp] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpFeedback, setOtpFeedback] = useState(null);

    const handleVerifyOtp = async () => {
        if (!otp) return;
        setOtpLoading(true);
        setOtpFeedback(null);
        try {
            const res = await verifyOtp(result.transaction_id, otp);
            if (res.data.status === 'TRANSACTION_APPROVED') {
                setOtpFeedback({ type: 'success', message: '✨ OTP Verified successfully! Transaction ALLOWED.' });
                setResult(prev => ({ ...prev, decision: 'ALLOW', status: 'APPROVED' }));
            } else {
                setOtpFeedback({ type: 'error', message: res.data.message || 'Invalid OTP. Please try again.' });
            }
        } catch (err) {
            setOtpFeedback({ type: 'error', message: 'Failed to verify OTP with server.' });
        } finally {
            setOtpLoading(false);
        }
    };

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
        biometric_risk: result.biometric_score || 0,
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

            {/* OTP Verification Section */}
            {result.status === 'OTP_REQUIRED' && result.decision === 'OTP' && (
                <div className="glass-card animate-fadeInUp" style={{ marginTop: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                    <h3 className="section-title" style={{ color: '#fbbf24' }}>
                        <span style={{ marginRight: '8px' }}>🔐</span>OTP Verification Required
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        To complete this transaction, please enter the dynamically generated 6-digit OTP.
                        <br /><span style={{ fontSize: '0.8rem', opacity: 0.8 }}>(Demo Note: The OTP is displayed in your backend console or returned in the API response: {result.otp_generated})</span>
                    </p>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input
                            type="text"
                            className="form-input mono"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                            style={{ maxWidth: '200px', letterSpacing: '2px', textAlign: 'center' }}
                            disabled={otpLoading}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={handleVerifyOtp}
                            disabled={otpLoading || otp.length !== 6 || otpFeedback?.type === 'success'}
                        >
                            {otpLoading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </div>

                    {otpFeedback && (
                        <div style={{
                            marginTop: '12px',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: otpFeedback.type === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                            color: otpFeedback.type === 'success' ? '#34d399' : '#fb7185',
                            border: `1px solid ${otpFeedback.type === 'success' ? 'rgba(52, 211, 153, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                            fontSize: '0.9rem'
                        }}>
                            {otpFeedback.message}
                        </div>
                    )}
                </div>
            )}

            {/* Biometric Status Summary */}
            <div className="glass-card no-hover animate-fadeInUp" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div className={`p-4 rounded-full ${result.biometric_verified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    <Fingerprint size={32} />
                </div>
                <div style={{ flex: 1 }}>
                    <h3 className="text-lg font-bold text-white mb-1">
                        {result.biometric_verified ? 'Biometric Identity Confirmed' : 'Biometric Verification Missing/Failed'}
                    </h3>
                    <p className="text-sm text-gray-400">
                        {result.biometric_verified
                            ? 'Secure hardware signature verified via WebAuthn protocol.'
                            : 'Transaction proceeded without secure biometric confirmation or verification failed.'}
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Layer Score</div>
                    <div className={`text-xl font-mono font-bold ${result.biometric_verified ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {result.biometric_score?.toFixed(4) || '0.0000'}
                    </div>
                </div>
                <div>
                    {result.biometric_verified ? <ShieldCheck className="text-emerald-400" /> : <ShieldAlert className="text-rose-400" />}
                </div>
            </div>

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
                        <strong>Formula:</strong> 0.30 × Core + 0.13 × NLP + 0.17 × LSTM + 0.10 × Loc + 0.10 × Dev + 0.10 × Graph + 0.10 × Bio
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
