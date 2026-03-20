import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { evaluateTransaction } from '../services/api';
import { Loader } from '../components/UIComponents';
import BiometricModal from '../components/BiometricModal';
import DynamicPaymentFlow from '../components/DynamicPaymentFlow';

const defaultTx = {
    User_ID: 'UPI_USER_1005',
    Receiver_ID: 'UPI_USER_1050',
    Amount: 2500,
    Sender_Lat: 19.076,
    Sender_Lon: 72.8777,
    Receiver_Lat: 12.9716,
    Receiver_Lon: 77.5946,
    Device_ID: 'dev_abc12345',
    Registered_Device_ID: 'dev_abc12345',
    SIM_Change_Flag: 0,
    VPN_Flag: 0,
    Burst_Count: 1,
    Remark_Text: 'Payment to friend',
    Sequence_Amount_List: '[500, 800, 300, 1200, 2500]',
};

const fraudPreset = {
    User_ID: 'UPI_USER_1010',
    Receiver_ID: 'UPI_USER_1002',
    Amount: 45000,
    Sender_Lat: 28.7041,
    Sender_Lon: 77.1025,
    Receiver_Lat: 12.9716,
    Receiver_Lon: 77.5946,
    Device_ID: 'unknown_dev_99',
    Registered_Device_ID: 'dev_xyz98765',
    SIM_Change_Flag: 1,
    VPN_Flag: 1,
    Burst_Count: 8,
    Remark_Text: 'URGENT: Verify Account to avoid block',
    Sequence_Amount_List: '[500, 800, 5000, 15000, 25000, 45000]',
};

export default function TransactionPage() {
    const [form, setForm] = useState({ ...defaultTx });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showBiometric, setShowBiometric] = useState(false);
    const [pendingResult, setPendingResult] = useState(null);
    const [pinStart, setPinStart] = useState(null);
    const [showPaymentFlow, setShowPaymentFlow] = useState(false);
    const [finalResult, setFinalResult] = useState(null);
    const navigate = useNavigate();

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const now = Date.now();
            const pin_entry_ms = pinStart ? (now - pinStart) : 2500;

            const payload = {
                ...form,
                Amount: parseFloat(form.Amount),
                Sender_Lat: parseFloat(form.Sender_Lat),
                Sender_Lon: parseFloat(form.Sender_Lon),
                Receiver_Lat: parseFloat(form.Receiver_Lat),
                Receiver_Lon: parseFloat(form.Receiver_Lon),
                SIM_Change_Flag: parseInt(form.SIM_Change_Flag),
                VPN_Flag: parseInt(form.VPN_Flag),
                Burst_Count: parseInt(form.Burst_Count),
                pin_entry_ms: pin_entry_ms,
                biometric_verified: null // Explicitly check for pre-check requirement
            };

            const res = await evaluateTransaction(payload);

            if (res.data.action === "REQUIRE_BIOMETRICS") {
                setPendingResult(res.data);
                setShowBiometric(true);
                setLoading(false);
                return;
            }

            setFinalResult(res.data);
            setShowPaymentFlow(true);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to evaluate transaction. Is the backend running?');
        } finally {
            setLoading(false);
        }
    };

    const handleBiometricSuccess = async (verified) => {
        setShowBiometric(false);
        setLoading(true);
        try {
            const payload = {
                ...form,
                Amount: parseFloat(form.Amount),
                biometric_verified: verified,
                pin_entry_ms: pinStart ? (Date.now() - pinStart) : 3000
            };
            const finalRes = await evaluateTransaction(payload);
            setFinalResult(finalRes.data);
            setShowPaymentFlow(true);
        } catch (err) {
            setError("Error during final risk submission");
        } finally {
            setLoading(false);
        }
    };

    const loadPreset = (preset) => {
        setForm({ ...preset });
    };

    return (
        <div className="page-container" style={{ maxWidth: '900px' }}>
            <div className="page-header">
                <h1 className="page-title animate-fadeInUp">🔍 Evaluate Transaction</h1>
                <p className="page-description animate-fadeInUp stagger-1">
                    Submit a UPI transaction through the hybrid 6-layer risk engine for real-time fraud analysis.
                </p>
            </div>

            {/* Preset Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }} className="animate-fadeInUp stagger-2">
                <button className="btn btn-secondary btn-sm" onClick={() => loadPreset(defaultTx)}>
                    ✅ Safe Preset
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => loadPreset(fraudPreset)} style={{ borderColor: 'rgba(244,63,94,0.3)', color: '#fb7185' }}>
                    🚫 Fraud Preset
                </button>
            </div>

            {error && (
                <div className="login-error animate-fadeIn">{error}</div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="glass-card no-hover animate-fadeInUp stagger-2">
                    <h3 className="section-title">Transaction Details</h3>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Sender User ID</label>
                            <input className="form-input mono" value={form.User_ID}
                                onChange={(e) => handleChange('User_ID', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Receiver User ID</label>
                            <input className="form-input mono" value={form.Receiver_ID}
                                onChange={(e) => handleChange('Receiver_ID', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Amount (₹)</label>
                            <input className="form-input mono" type="number" min="1" max="100000" step="0.01"
                                value={form.Amount}
                                onFocus={() => !pinStart && setPinStart(Date.now())}
                                onChange={(e) => handleChange('Amount', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Burst Count</label>
                            <input className="form-input mono" type="number" min="0"
                                value={form.Burst_Count} onChange={(e) => handleChange('Burst_Count', e.target.value)} />
                        </div>
                    </div>

                    <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Location</h3>
                    <div className="grid-4">
                        <div className="form-group">
                            <label className="form-label">Sender Lat</label>
                            <input className="form-input mono" type="number" step="any"
                                value={form.Sender_Lat} onChange={(e) => handleChange('Sender_Lat', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Sender Lon</label>
                            <input className="form-input mono" type="number" step="any"
                                value={form.Sender_Lon} onChange={(e) => handleChange('Sender_Lon', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Receiver Lat</label>
                            <input className="form-input mono" type="number" step="any"
                                value={form.Receiver_Lat} onChange={(e) => handleChange('Receiver_Lat', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Receiver Lon</label>
                            <input className="form-input mono" type="number" step="any"
                                value={form.Receiver_Lon} onChange={(e) => handleChange('Receiver_Lon', e.target.value)} />
                        </div>
                    </div>

                    <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Device & Security</h3>
                    <div className="grid-2">
                        <div className="form-group">
                            <label className="form-label">Current Device ID</label>
                            <input className="form-input mono" value={form.Device_ID}
                                onChange={(e) => handleChange('Device_ID', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Registered Device ID</label>
                            <input className="form-input mono" value={form.Registered_Device_ID}
                                onChange={(e) => handleChange('Registered_Device_ID', e.target.value)} />
                        </div>
                    </div>
                    <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                        <div className="form-group">
                            <label className="form-label">SIM Change</label>
                            <div className="toggle-group">
                                <button type="button" className={`toggle-btn ${form.SIM_Change_Flag == 0 ? 'active' : ''}`}
                                    onClick={() => handleChange('SIM_Change_Flag', 0)}>No</button>
                                <button type="button" className={`toggle-btn ${form.SIM_Change_Flag == 1 ? 'active' : ''}`}
                                    onClick={() => handleChange('SIM_Change_Flag', 1)}
                                    style={form.SIM_Change_Flag == 1 ? { borderColor: '#f43f5e', color: '#fb7185', background: 'rgba(244,63,94,0.1)' } : {}}>
                                    Yes ⚠️
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">VPN Detected</label>
                            <div className="toggle-group">
                                <button type="button" className={`toggle-btn ${form.VPN_Flag == 0 ? 'active' : ''}`}
                                    onClick={() => handleChange('VPN_Flag', 0)}>No</button>
                                <button type="button" className={`toggle-btn ${form.VPN_Flag == 1 ? 'active' : ''}`}
                                    onClick={() => handleChange('VPN_Flag', 1)}
                                    style={form.VPN_Flag == 1 ? { borderColor: '#f43f5e', color: '#fb7185', background: 'rgba(244,63,94,0.1)' } : {}}>
                                    Yes ⚠️
                                </button>
                            </div>
                        </div>
                    </div>

                    <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Remark & History</h3>
                    <div className="form-group">
                        <label className="form-label">Transaction Remark</label>
                        <input className="form-input" value={form.Remark_Text}
                            onChange={(e) => handleChange('Remark_Text', e.target.value)}
                            placeholder="e.g., Payment to friend" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Sequence Amount List (JSON Array)</label>
                        <input className="form-input mono" value={form.Sequence_Amount_List}
                            onChange={(e) => handleChange('Sequence_Amount_List', e.target.value)}
                            placeholder="[100, 200, 500, 1000]" />
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    {loading ? (
                        <Loader message="Analyzing transaction through 7-layer engine..." />
                    ) : (
                        <button type="submit" className="btn btn-primary btn-lg" style={{ minWidth: '280px' }}>
                            🚀 Evaluate Risk Score
                        </button>
                    )}
                </div>
            </form>

            <BiometricModal
                isOpen={showBiometric}
                onClose={() => setShowBiometric(false)}
                onSuccess={handleBiometricSuccess}
                transactionId={pendingResult?.transaction_id}
                userId={form.User_ID}
                amount={parseFloat(form.Amount)}
            />

            {showPaymentFlow && finalResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black-80 backdrop-blur">
                    <div className="w-full h-full max-w-4xl max-h-[800px] bg-secondary rounded-3xl overflow-hidden shadow-2xl relative border border-white-10">
                        <button
                            onClick={() => setShowPaymentFlow(false)}
                            className="absolute top-6 right-6 z-[60] text-gray-400 hover:text-white transition-colors bg-none border-none cursor-pointer"
                        >
                            <span className="text-2xl">&times;</span>
                        </button>

                        <DynamicPaymentFlow
                            risk_score={finalResult.final_risk_score}
                            tx_data={{
                                amount: finalResult.amount,
                                receiver: form.Receiver_ID, // Or lookup receiver name if available
                                upi_id: `${form.Receiver_ID}@upi`
                            }}
                            xai_reasons={finalResult.fraud_reasons}
                            onConfirm={() => {
                                setShowPaymentFlow(false);
                                navigate('/result', { state: { result: finalResult } });
                            }}
                            onCancel={() => setShowPaymentFlow(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
