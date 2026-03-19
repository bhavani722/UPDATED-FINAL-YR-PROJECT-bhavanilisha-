import { useState, useEffect } from 'react';
import { getDashboard, getBiometricStats } from '../services/api';
import { StatCard, Loader } from '../components/UIComponents';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Fingerprint, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function DashboardPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const [bioStats, setBioStats] = useState(null);

    useEffect(() => {
        getDashboard()
            .then(res => setData(res.data))
            .catch(err => console.error(err));

        getBiometricStats()
            .then(res => setBioStats(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loader message="Loading dashboard data..." />;
    if (!data) return <div className="page-container"><p>Failed to load dashboard.</p></div>;

    const decisionData = [
        { name: 'Allow', value: data.decisions?.allow || 0, color: '#10b981' },
        { name: 'OTP', value: data.decisions?.otp || 0, color: '#f59e0b' },
        { name: 'Block', value: data.decisions?.block || 0, color: '#f43f5e' },
    ].filter(d => d.value > 0);

    const riskData = [
        { name: 'Low Risk', value: data.risk_distribution?.low || 0, color: '#10b981' },
        { name: 'Medium Risk', value: data.risk_distribution?.medium || 0, color: '#f59e0b' },
        { name: 'High Risk', value: data.risk_distribution?.high || 0, color: '#f43f5e' },
    ].filter(d => d.value > 0);

    return (
        <div className="page-container wide">
            <div className="page-header">
                <h1 className="page-title animate-fadeInUp">📊 Dashboard Overview</h1>
                <p className="page-description animate-fadeInUp stagger-1">
                    System-wide fraud detection metrics and live evaluation statistics.
                </p>
            </div>

            {/* Summary Stats */}
            <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                <StatCard label="Total Transactions" value={data.total_transactions?.toLocaleString()} accent="indigo" />
                <StatCard label="Fraud Percentage" value={`${data.fraud_percentage}%`} accent="rose"
                    subtitle={`${data.fraud_count?.toLocaleString()} fraud cases`} />
                <StatCard label="Live Evaluations" value={data.live_evaluations || 0} accent="emerald" />
                <StatCard label="Avg Fraud Amount" value={`₹${data.avg_amount_fraud?.toLocaleString()}`} accent="amber" />
            </div>

            <div className="grid-2">
                {/* Decision Distribution */}
                <div className="glass-card no-hover animate-fadeInUp stagger-2">
                    <h3 className="section-title">🚦 Decision Distribution</h3>
                    {decisionData.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                            <ResponsiveContainer width="50%" height={200}>
                                <PieChart>
                                    <Pie data={decisionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                                        {decisionData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ flex: 1 }}>
                                {decisionData.map((d, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: d.color }} />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{d.name}</span>
                                        <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '0.9rem' }}>{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No live evaluations yet. Submit transactions to see decisions.</p>
                    )}
                </div>

                {/* Risk Distribution */}
                <div className="glass-card no-hover animate-fadeInUp stagger-3">
                    <h3 className="section-title">📊 Risk Distribution</h3>
                    {riskData.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                            <ResponsiveContainer width="50%" height={200}>
                                <PieChart>
                                    <Pie data={riskData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                                        {riskData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ flex: 1 }}>
                                {riskData.map((d, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: d.color }} />
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{d.name}</span>
                                        <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '0.9rem' }}>{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No live evaluations yet. Submit transactions to see risk distribution.</p>
                    )}
                </div>
            </div>

            {/* Biometric Health Section */}
            {bioStats && (
                <div className="glass-card no-hover animate-fadeInUp" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: '#10b981' }}>
                                <Fingerprint size={20} />
                            </div>
                            <h3 className="section-title" style={{ margin: 0 }}>Biometric Health & Success Rate</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ShieldCheck size={14} className="text-emerald-400" />
                                <span className="text-emerald-400 font-bold">{bioStats.success_rate}% Success</span>
                            </div>
                            <div style={{ padding: '4px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ShieldAlert size={14} className="text-rose-400" />
                                <span className="text-rose-400 font-bold">{bioStats.hardware_bypass_attempts} Bypass Blocked</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={bioStats.hourly_data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ fontSize: '12px' }}
                                />
                                <Bar dataKey="success" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} name="Success" />
                                <Bar dataKey="fail" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} name="Failed" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Dataset Overview */}
            <div className="glass-card no-hover animate-fadeInUp" style={{ marginTop: '1.5rem' }}>
                <h3 className="section-title">📋 Dataset Overview</h3>
                <div className="grid-4">
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'JetBrains Mono' }}>{data.total_transactions?.toLocaleString()}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Records</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔴</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: '#fb7185' }}>{data.fraud_count?.toLocaleString()}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fraud Cases</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🟢</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: '#34d399' }}>{data.normal_count?.toLocaleString()}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Normal Cases</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💰</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'JetBrains Mono' }}>₹{data.avg_amount_normal?.toLocaleString()}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Normal Amt</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
