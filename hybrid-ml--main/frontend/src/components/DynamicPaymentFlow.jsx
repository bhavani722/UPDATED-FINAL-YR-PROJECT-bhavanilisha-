import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    XCircle,
    ShieldAlert,
    Share2,
    ArrowRight,
    Lock,
    Smartphone,
    Info,
    ChevronUp
} from 'lucide-react';
import confetti from 'canvas-confetti';

/**
 * DynamicPaymentFlow - A premium 2026-style UPI Payment Flow
 * @param {number} risk_score - Calculated risk score (0-1)
 * @param {object} tx_data - Transaction details (amount, receiver, etc.)
 * @param {array} xai_reasons - Explanation AI reasons for the risk score
 * @param {function} onConfirm - Callback when OTP is successful
 * @param {function} onCancel - Callback on abort
 */
export default function DynamicPaymentFlow({
    risk_score = 0.1,
    tx_data = { amount: 500, receiver: "Deepak Sharma", upi_id: "deepak@upi" },
    xai_reasons = ["Usual location", "Secure device"],
    onConfirm,
    onCancel
}) {
    const [step, setStep] = useState(null); // 'success', 'otp', 'block', 'pin'

    useEffect(() => {
        if (risk_score < 0.3) {
            setStep('pin'); // Go to PIN entry first
        } else if (risk_score <= 0.7) {
            setStep('otp'); // Go to OTP first
        } else {
            setStep('block');
        }
    }, [risk_score]);

    return (
        <div className="payment-flow-container font-inter">
            <AnimatePresence mode="wait">
                {step === 'pin' && (
                    <PinEntryPage
                        key="pin"
                        tx_data={tx_data}
                        onSuccess={() => {
                            setStep('success'); // Show success after PIN
                            setTimeout(() => {
                                confetti({
                                    particleCount: 150,
                                    spread: 70,
                                    origin: { y: 0.6 },
                                    colors: ['#10b981', '#3b82f6', '#6366f1']
                                });
                            }, 500);

                            // Callback after a delay
                            setTimeout(() => {
                                onConfirm?.();
                            }, 3500);
                        }}
                    />
                )}

                {step === 'success' && (
                    <SuccessPage key="success" tx_data={tx_data} />
                )}

                {step === 'otp' && (
                    <OTPBottomSheet
                        key="otp"
                        tx_data={tx_data}
                        onSuccess={() => {
                            setStep('pin'); // Go to PIN after OTP
                        }}
                        onClose={onCancel}
                    />
                )}

                {step === 'block' && (
                    <BlockedPage key="block" tx_data={tx_data} xai_reasons={xai_reasons} />
                )}
            </AnimatePresence>
        </div>
    );
}

// --- Sub-components ---

function SuccessPage({ tx_data }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center"
        >
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                className="mb-8"
            >
                <div className="relative">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 bg-emerald-20 blur-2xl rounded-full"
                    />
                    <CheckCircle2 size={120} className="text-emerald-500 relative z-10" strokeWidth={1.5} />
                </div>
            </motion.div>

            <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-extrabold text-white mb-2"
            >
                Payment Successful
            </motion.h1>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-gray-400 mb-8"
            >
                Transaction ID: <span className="font-mono uppercase">UPI{Math.random().toString(36).substr(2, 9)}</span>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="w-full max-w-sm glass-card text-left border border-white-10 p-6 rounded-3xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Paid To</p>
                        <h3 className="text-lg font-bold text-white">{tx_data.receiver}</h3>
                        <p className="text-sm text-indigo-400 font-mono">{tx_data.upi_id}</p>
                    </div>
                    <div className="h-12 w-12 bg-white-5 rounded-full flex items-center justify-center border border-white-5 font-bold text-white">
                        {tx_data.receiver.charAt(0)}
                    </div>
                </div>

                <div className="border-t border-white-5 pt-6 flex justify-between items-baseline">
                    <span className="text-sm text-gray-400">Amount</span>
                    <span className="text-3xl font-black text-white">₹{tx_data.amount.toLocaleString()}</span>
                </div>
            </motion.div>

            <div className="mt-10 flex gap-4 w-full max-w-sm">
                <button className="flex-1 py-4 bg-white-5 hover:bg-white-10 text-white rounded-2xl font-semibold transition-all border border-white-10 flex items-center justify-center gap-2 cursor-pointer border-none">
                    <Share2 size={18} />
                    Share
                </button>
                <button className="flex-1 py-4 bg-indigo-600 hover-indigo text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-20 cursor-pointer border-none">
                    Done
                </button>
            </div>
        </motion.div>
    );
}

function PinEntryPage({ tx_data, onSuccess }) {
    const [pin, setPin] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleKeypadPress = (val) => {
        if (loading) return;
        if (val === '←') {
            setPin(prev => prev.slice(0, -1));
        } else if (pin.length < 6) {
            const newPin = [...pin, val];
            setPin(newPin);
            if (newPin.length === 6) {
                setLoading(true);
                setTimeout(() => onSuccess(), 1800);
            }
        }
    };

    return (
        <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col h-full bg-[#1a1c1e] text-white relative"
        >
            {/* Header: Recipient Details */}
            <div className="p-8 pb-4 flex flex-col items-center">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4 shadow-xl">
                    {tx_data.receiver?.charAt(0) || 'U'}
                </div>
                <h2 className="text-xl font-bold mb-1">{tx_data.receiver}</h2>
                <p className="text-sm text-gray-400 font-mono mb-4">{tx_data.upi_id}</p>
                <div className="text-4xl font-black flex items-start gap-1">
                    <span className="text-lg mt-2">₹</span>
                    {tx_data.amount}
                </div>
            </div>

            {/* PIN Entry Zone */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-10">
                <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-8">ENTER 6-DIGIT UPI PIN</h3>
                <div className="flex gap-4">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                        <motion.div
                            key={idx}
                            animate={pin.length > idx ? { scale: [1, 1.2, 1] } : {}}
                            className={`w-4 h-4 rounded-full border-2 transition-all ${pin.length > idx
                                    ? 'bg-white border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                                    : 'border-white-20'
                                }`}
                        />
                    ))}
                </div>

                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-8 flex items-center gap-3 text-indigo-400"
                    >
                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-wider">Verifying PIN...</span>
                    </motion.div>
                )}
            </div>

            {/* Keypad */}
            <div className="bg-[#242629] p-6 rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
                <div className="grid-3 gap-y-4 max-w-sm mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleKeypadPress(num.toString())}
                            className="h-16 text-2xl font-bold hover:bg-white-5 active:bg-white-10 rounded-full transition-colors border-none bg-none text-white cursor-pointer"
                        >
                            {num}
                        </button>
                    ))}
                    <div className="h-16" />
                    <button
                        onClick={() => handleKeypadPress('0')}
                        className="h-16 text-2xl font-bold hover:bg-white-5 active:bg-white-10 rounded-full transition-colors border-none bg-none text-white cursor-pointer"
                    >
                        0
                    </button>
                    <button
                        onClick={() => handleKeypadPress('←')}
                        className="h-16 text-2xl flex items-center justify-center hover:bg-white-5 active:bg-white-10 rounded-full transition-colors border-none bg-none text-white cursor-pointer"
                    >
                        <ArrowLeft size={24} />
                    </button>
                </div>

                <div className="mt-6 flex items-center justify-between px-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold border-t border-white-5 pt-6">
                    <div className="flex items-center gap-1">
                        <ShieldCheck size={14} className="text-green-500" />
                        SECURE NPCI GATEWAY
                    </div>
                    <div className="flex items-center gap-1 italic">
                        BHIM <span className="text-indigo-400">UPI</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function OTPBottomSheet({ tx_data, onSuccess, onClose }) {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputs = useRef([]);

    const handleChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Auto-focus next
        if (value && index < 5) {
            inputs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1].focus();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (otp.join('').length === 6) {
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black-80 backdrop-blur p-0">
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-full max-w-md bg-[#111827] rounded-xl p-8 border-t border-white-20 shadow-lg relative"
            >
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-white-10 rounded-full" />

                <div className="mt-6 text-center mb-8">
                    <div className="w-16 h-16 bg-amber-500-10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500-20">
                        <ShieldAlert className="text-amber-500" strokeWidth={2} />
                    </div>
                    <h2 className="text-2xl font-extrabold text-white mb-2">Step-up Authentication</h2>
                    <p className="text-gray-400 text-sm">
                        To secure your payment of <span className="text-white font-bold">₹{tx_data.amount}</span>,
                        please enter the 6-digit code sent to your registered device.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="flex justify-between gap-2 mb-10">
                        {otp.map((digit, idx) => (
                            <input
                                key={idx}
                                ref={el => inputs.current[idx] = el}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(idx, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(idx, e)}
                                className="w-full aspect-square bg-white-5 border-2 border-white-10 focus:border-indigo-600 rounded-2xl text-center text-2xl font-black text-white outline-none transition-all"
                            />
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={otp.join('').length < 6}
                        className="w-full py-5 bg-indigo-600 hover-indigo disabled:opacity-50 text-white rounded-2xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 group cursor-pointer border-none"
                    >
                        Verify & Pay
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-500">
                    Didn't receive code? <button type="button" className="text-indigo-400 font-semibold hover:underline bg-none border-none cursor-pointer">Resend Code</button>
                </p>
            </motion.div>
        </div>
    );
}

function BlockedPage({ tx_data, xai_reasons }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[500px] p-6 text-center"
        >
            <motion.div
                animate={{ rotate: [-2, 2, -2] }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="mb-8"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-rose-500-10 blur-3xl rounded-full" />
                    <XCircle size={120} className="text-rose-400 relative z-10" strokeWidth={1} />
                </div>
            </motion.div>

            <h1 className="text-3xl font-extrabold text-white mb-2">We cannot make payment</h1>
            <div className="py-2 px-6 bg-rose-500-10 border border-rose-500-20 rounded-full mb-8">
                <p className="text-rose-400 font-bold uppercase tracking-widest text-xs">Security Block: Transaction Blocked</p>
            </div>

            <div className="w-full max-w-sm mb-8 space-y-4">
                {/* Risk Context Card */}
                <div className="glass-card bg-rose-500-5 border border-rose-500-20 p-5 rounded-3xl text-left">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-rose-500-10 rounded-xl text-rose-400">
                            <Lock size={20} />
                        </div>
                        <span className="text-sm font-bold text-white">XAI Security Analysis</span>
                    </div>
                    <ul className="space-y-3">
                        {xai_reasons.map((reason, idx) => (
                            <motion.li
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + (idx * 0.1) }}
                                key={idx}
                                className="flex items-start gap-2 text-sm text-gray-400"
                            >
                                <ShieldAlert size={14} className="mt-1 text-rose-400 flex-shrink-0" />
                                {reason}
                            </motion.li>
                        ))}
                    </ul>
                </div>

                <div className="glass-card bg-white-5 border border-white-10 p-5 rounded-3xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Smartphone size={20} className="text-gray-400" />
                        <div className="text-left">
                            <p className="text-xs text-gray-500 uppercase">Hardware ID</p>
                            <p className="text-sm text-white font-mono">{Math.random().toString(16).substr(2, 6).toUpperCase()}</p>
                        </div>
                    </div>
                    <Info size={16} className="text-gray-600" />
                </div>
            </div>

            <div className="w-full max-w-sm">
                <button className="w-full py-5 bg-white text-black hover:bg-gray-200 rounded-2xl font-black text-lg transition-all mb-4 cursor-pointer border-none">
                    Security Dashboard
                </button>
                <p className="text-xs text-gray-500">
                    If you believe this is an error, please contact UPI support with Transaction ID: <span className="font-mono">#ERR_SEC_{Math.random().toString(36).substr(2, 4).toUpperCase()}</span>
                </p>
            </div>
        </motion.div>
    );
}
