import { useState, useEffect } from 'react';
import { Fingerprint, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { verifyBiometric } from '../services/api';

export default function BiometricModal({ isOpen, onClose, onSuccess, transactionId, userId, amount }) {
    const [phase, setPhase] = useState('liveness'); // liveness -> prompt -> success/error
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setPhase('liveness');
            setError(null);

            // Phase 1: Liveness Check (Simulation)
            const timer = setTimeout(() => {
                setPhase('prompt');
            }, 2500);

            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSimulateBiometric = async () => {
        try {
            const mockCredentialId = "WEBAUTHN_" + Math.random().toString(36).substring(2);
            const res = await verifyBiometric(transactionId, mockCredentialId, userId);

            if (res.data.verified) {
                setPhase('success');
                setTimeout(() => {
                    onSuccess(true);
                }, 1500);
            } else {
                setError(res.data.reason || "Biometric authentication failed");
                setPhase('error');
            }
        } catch (err) {
            setError("Communication failure with secure hardware enclave");
            setPhase('error');
        }
    };

    const handleCancel = () => {
        onSuccess(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black-80 backdrop-blur animate-fadeIn">
            <div className="relative w-full max-w-md overflow-hidden glass-card no-hover p-0 border-white-5 shadow-lg">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-10 rounded-lg text-indigo-400">
                            <Fingerprint size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white">Secure Verification</h2>
                    </div>
                </div>

                <div className="p-8">
                    {phase === 'liveness' && (
                        <div className="flex flex-col items-center justify-center space-y-6 py-4 animate-fadeIn">
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-20 rounded-full animate-ping"></div>
                                <div className="relative p-8 bg-emerald-10 rounded-full border-2 border-emerald-30">
                                    <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-medium text-white">Performing Liveness Check</p>
                                <p className="text-sm text-gray-400 mt-1">Ensuring user presence via behavioral analysis...</p>
                            </div>
                        </div>
                    )}

                    {phase === 'prompt' && (
                        <div className="flex flex-col items-center justify-center space-y-8 py-4 animate-fadeInUp">
                            <div className="p-8 bg-indigo-10 rounded-full border-2 border-active text-indigo-400">
                                <Fingerprint className="w-16 h-16 animate-pulse" />
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-white">Biometric Required</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    A payment of <span className="text-indigo-400 font-mono">₹{amount.toLocaleString()}</span> requires
                                    strong authentication.
                                </p>
                            </div>
                            <div className="flex flex-col w-full gap-3">
                                <button
                                    onClick={handleSimulateBiometric}
                                    className="w-full py-4 bg-indigo-600 hover-indigo text-white rounded-xl font-bold border-none cursor-pointer shadow-indigo-20"
                                >
                                    Confirm with Touch ID / Face ID
                                </button>
                                <button
                                    onClick={handleCancel}
                                    className="w-full py-3 text-gray-400 hover:text-white transition-all border-none bg-none cursor-pointer"
                                >
                                    Cancel and use alternative (Higher Risk)
                                </button>
                            </div>
                        </div>
                    )}

                    {phase === 'success' && (
                        <div className="flex flex-col items-center justify-center space-y-6 py-4 animate-scaleIn">
                            <div className="p-8 bg-emerald-10 rounded-full border-2 border-emerald-30 text-emerald-400">
                                <ShieldCheck className="w-16 h-16" />
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-emerald-400">Identity Verified</p>
                                <p className="text-sm text-gray-400 mt-1">Secure token generated and signed.</p>
                            </div>
                        </div>
                    )}

                    {phase === 'error' && (
                        <div className="flex flex-col items-center justify-center space-y-6 py-4 animate-shake">
                            <div className="p-8 bg-rose-10 rounded-full border-2 border-rose-30 text-rose-400">
                                <ShieldAlert className="w-16 h-16" />
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-bold text-rose-400">Bypass Detected</p>
                                <p className="text-sm text-gray-400 mt-2">{error}</p>
                            </div>
                            <button
                                onClick={() => setPhase('prompt')}
                                className="px-6 py-2 bg-rose-10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border-rose-30 cursor-pointer"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>

                <div className="h-1 w-full bg-gradient-primary opacity-50"></div>
            </div>
        </div>
    );
}
