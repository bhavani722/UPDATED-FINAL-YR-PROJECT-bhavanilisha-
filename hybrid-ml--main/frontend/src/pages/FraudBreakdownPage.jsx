import { useState, useEffect } from 'react';
import { getFraudBreakdown } from '../services/api';
import { Loader } from '../components/UIComponents';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function FraudBreakdownPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getFraudBreakdown()
            .then(res => setData(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loader message="Analyzing fraud breakdown..." />;
    if (!data) return <div className="page-container"><p>Failed to load breakdown.</p></div>;

    const breakdown = data.breakdown || {};
    const chartData = Object.entries(breakdown).map(([key, value]) => ({
        category: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        percentage: value,
    })).sort((a, b) => b.percentage - a.percentage);

    const colors = ['#f43f5e', '#ef4444', '#f59e0b', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#10b981'];

    return (
        <div className="page-container" style={{ maxWidth: '1000px' }}>
            <div className="page-header">
                <h1 className="page-title animate-fadeInUp">🔍 Fraud Breakdown</h1>
                <p className="page-description animate-fadeInUp stagger-1">
                    Analysis of fraud causes by category. Total fraud analysed: {data.total_fraud_analysed || data.total_flagged || 0}
                </p>
            </div>

            {chartData.length === 0 ? (
                <div className="glass-card no-hover" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📊</div>
                    <h3 style={{ color: 'var(--text-secondary)' }}>No breakdown data available</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
                        Evaluate transactions to see the fraud cause breakdown.
                    </p>
                </div>
            ) : (
                <>
                    {/* Chart */}
                    <div className="glass-card no-hover animate-fadeInUp stagger-2">
                        <h3 className="section-title">📊 Fraud Cause Distribution</h3>
                        <div className="chart-container tall">
                            <ResponsiveContainer>
                                <BarChart data={chartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }}
                                        label={{ value: 'Percentage (%)', position: 'bottom', fill: '#94a3b8' }} />
                                    <YAxis type="category" dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={180} />
                                    <Tooltip
                                        contentStyle={{ background: '#1a2035', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }}
                                        formatter={(value) => [`${value}%`, 'Percentage']}
                                    />
                                    <Bar dataKey="percentage" radius={[0, 6, 6, 0]}>
                                        {chartData.map((entry, idx) => (
                                            <Cell key={idx} fill={colors[idx % colors.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Detailed Cards */}
                    <div className="grid-2" style={{ marginTop: '1.5rem' }}>
                        {chartData.map((item, idx) => (
                            <div key={idx} className="glass-card animate-fadeInUp" style={{ animationDelay: `${idx * 0.05}s` }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{item.category}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Fraud contribution</div>
                                    </div>
                                    <div style={{
                                        fontSize: '1.5rem',
                                        fontWeight: 800,
                                        fontFamily: 'JetBrains Mono',
                                        color: colors[idx % colors.length],
                                    }}>
                                        {item.percentage}%
                                    </div>
                                </div>
                                <div style={{ marginTop: '8px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${item.percentage}%`,
                                        height: '100%',
                                        background: colors[idx % colors.length],
                                        borderRadius: '3px',
                                        transition: 'width 1s ease',
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
