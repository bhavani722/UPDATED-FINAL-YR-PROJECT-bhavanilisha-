import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2,
    XCircle,
    X,
    ShieldAlert,
    Share2,
    ArrowRight,
    ArrowLeft,
    Delete,
    ShieldCheck,
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
                    <BlockedPage key="block" tx_data={tx_data} xai_reasons={xai_reasons} onClose={onCancel} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-full max-w-[380px] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col font-sans"
            >
                {/* Upper Section with Recipient Info */}
                <div className="bg-gray-50/80 p-8 flex flex-col items-center border-b border-gray-100">
                    <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg shadow-indigo-200">
                        {tx_data.receiver?.charAt(0) || 'U'}
                    </div>
                    <h2 className="text-gray-900 font-extrabold text-xl mb-1">{tx_data.receiver}</h2>
                    <p className="text-gray-500 text-sm mb-6 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        {tx_data.upi_id}
                    </p>
                    <div className="text-5xl font-black flex items-start gap-1 text-gray-900 tracking-tighter">
                        <span className="text-2xl mt-2 font-bold text-gray-400">₹</span>
                        {tx_data.amount.toLocaleString()}
                    </div>
                </div>

                {/* PIN Entry Area */}
                <div className="px-8 py-12 flex flex-col items-center bg-white">
                    <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.25em] mb-10">ENTER 6-DIGIT UPI PIN</p>
                    
                    <div className="flex gap-4 mb-6">
                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                            <motion.div
                                key={idx}
                                className={`w-5 h-5 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                                    pin.length > idx 
                                        ? 'bg-indigo-600 border-indigo-600 scale-110 shadow-[0_0_12px_rgba(79,70,229,0.4)]' 
                                        : pin.length === idx 
                                            ? 'bg-transparent border-indigo-400' 
                                            : 'bg-transparent border-gray-200'
                                }`}
                                animate={pin.length === idx ? { scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] } : { scale: 1, opacity: 1 }}
                                transition={pin.length === idx ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
                            >
                                {pin.length > idx && (
                                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    <div className="h-4 w-full flex justify-center items-center mt-2">
                        {loading && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2.5 text-indigo-600"
                            >
                                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Securing Payment</span>
                            </motion.div>
                        )}
                    </div>
                </div>
                {/* Mobile Style Keypad Section */}
                <div className="w-full bg-gray-50/80 pb-12 pt-8 px-10 rounded-t-[40px] border-t border-gray-100 flex flex-col items-center">
                    <div 
                        style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(3, 1fr)', 
                            gap: '24px', 
                            width: '100%', 
                            maxWidth: '300px', 
                            justifyItems: 'center',
                            alignItems: 'center',
                            margin: '0 auto'
                        }}
                    >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                            <button
                                key={num}
                                onClick={() => handleKeypadPress(num.toString())}
                                className="w-[68px] h-[68px] flex items-center justify-center text-3xl font-extrabold bg-white text-black rounded-full shadow-[0_6px_16px_rgba(0,0,0,0.12)] active:scale-95 transition-all border-none cursor-pointer select-none"
                            >
                                {num}
                            </button>
                        ))}
                        <div className="w-[68px] h-[68px]" />
                        <button
                            onClick={() => handleKeypadPress('0')}
                            className="w-[68px] h-[68px] flex items-center justify-center text-3xl font-extrabold bg-white text-black rounded-full shadow-[0_6px_16px_rgba(0,0,0,0.12)] active:scale-95 transition-all border-none cursor-pointer select-none"
                        >
                            0
                        </button>
                        <button
                            onClick={() => handleKeypadPress('←')}
                            className="w-[68px] h-[68px] flex items-center justify-center bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 active:scale-95 transition-all border-none cursor-pointer select-none"
                        >
                            <Delete size={28} />
                        </button>
                    </div>

                    <div className="mt-10 flex flex-col items-center gap-3 opacity-60">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 tracking-[0.25em]">
                            <ShieldCheck size={16} className="text-gray-400" />
                            SECURE NPCI GATEWAY
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
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

function BlockedPage({ tx_data, xai_reasons, onClose }) {
    // Esc key support and scroll locking
    useEffect(() => {
        // Prevent background scrolling
        document.body.style.overflow = 'hidden';

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        window.addEventListener('keydown', handleEsc);

        return () => {
            // Restore background scrolling
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    return (
        // Outside click close & Prevent background interaction
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-hidden"
            onClick={(e) => { 
                if (e.target === e.currentTarget) {
                    onClose?.(); 
                }
            }}
        >
            {/* Smooth Animations & Responsive Design */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                className="w-full max-w-md bg-[#111827] border border-rose-500/20 rounded-3xl p-6 text-center relative shadow-2xl shadow-rose-500/10 flex flex-col items-center max-h-[90vh] overflow-y-auto"
            >


                <motion.div
                    animate={{ rotate: [-2, 2, -2] }}
                    transition={{ duration: 0.5, repeat: 3 }}
                    className="mb-6 mt-2"
                >
                    <div className="relative">
                        <div className="absolute inset-0 bg-rose-500/20 blur-2xl rounded-full" />
                        <XCircle size={80} className="text-rose-400 relative z-10" strokeWidth={1.5} />
                    </div>
                </motion.div>

                {/* Visual Improvements (Warning color theme) */}
                <h1 className="text-2xl font-extrabold text-white mb-2">Transaction Blocked</h1>
                <div className="py-1.5 px-4 bg-rose-500/10 border border-rose-500/20 rounded-full mb-6 inline-flex">
                    <p className="text-rose-400 font-bold uppercase tracking-widest text-[10px]">High Risk Detected</p>
                </div>

                <div className="w-full mb-6 space-y-3">
                    {/* Risk Context Card */}
                    <div className="glass-card bg-rose-500/5 border border-rose-500/20 p-4 rounded-2xl text-left">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-rose-500/10 rounded-lg text-rose-400">
                                <ShieldAlert size={16} />
                            </div>
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Security Analysis</span>
                        </div>
                        <ul className="space-y-2">
                            {xai_reasons?.map((reason, idx) => (
                                <motion.li
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + (idx * 0.1) }}
                                    key={idx}
                                    className="flex items-start gap-2 text-xs text-gray-300"
                                >
                                    <ShieldAlert size={12} className="mt-0.5 text-rose-400 flex-shrink-0" />
                                    <span>{reason}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </div>

                    <div className="glass-card bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Smartphone size={18} className="text-gray-400" />
                            <div className="text-left">
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Hardware ID</p>
                                <p className="text-xs text-white font-mono">{Math.random().toString(16).substr(2, 6).toUpperCase()}</p>
                            </div>
                        </div>
                        <Info size={16} className="text-gray-600" />
                    </div>
                </div>

                {/* Cancel Button */}
                <div className="w-full flex flex-col gap-3 mt-auto">
                    <button 
                        onClick={() => onClose?.()}
                        className="w-full py-4 bg-transparent hover:bg-white/5 border border-white/10 text-white rounded-xl font-bold transition-all cursor-pointer"
                    >
                        Cancel Transaction
                    </button>
                    <p className="text-[10px] text-gray-500 px-4 leading-relaxed">
                        If you believe this is an error, please contact support with Ref: <span className="font-mono text-gray-400">#ERR_{Math.random().toString(36).substr(2, 4).toUpperCase()}</span>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
