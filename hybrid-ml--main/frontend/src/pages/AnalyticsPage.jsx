import { useState, useEffect } from 'react';
import { getAnalytics } from '../services/api';
import { Loader } from '../components/UIComponents';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar, AreaChart, Area
} from 'recharts';

const chartTooltipStyle = {
    background: '#1a2035',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '0.8rem',
};

export default function AnalyticsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAnalytics()
            .then(res => setData(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <Loader message="Loading analytics..." />;
    if (!data) return <div className="page-container"><p>Failed to load analytics.</p></div>;

    const { model_metrics, roc_curve, pr_curve, monthly_fraud_trend, risk_histogram, feature_importance } = data;

    // Monthly trend data
    const trendData = Object.entries(monthly_fraud_trend || {}).map(([month, info]) => ({
        month,
        fraud: info.fraud,
        total: info.total,
        fraud_rate: info.fraud_rate,
    })).sort((a, b) => a.month.localeCompare(b.month));

    // Risk histogram data
    const histData = (risk_histogram || []).map((count, idx) => ({
        bin: `${(idx * 10)}–${((idx + 1) * 10)}%`,
        count,
    }));

    return (
        <div className="page-container wide">
            <div className="page-header">
                <h1 className="page-title animate-fadeInUp">📈 Analytics</h1>
                <p className="page-description animate-fadeInUp stagger-1">
                    Model performance metrics, ROC/PR curves, fraud trends, and risk distribution.
                </p>
            </div>

            {/* Model Metrics */}
            <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                {[
                    { label: 'Accuracy', value: model_metrics?.accuracy, color: 'indigo' },
                    { label: 'Precision', value: model_metrics?.precision, color: 'emerald' },
                    { label: 'Recall', value: model_metrics?.recall, color: 'amber' },
                    { label: 'ROC AUC', value: model_metrics?.roc_auc, color: 'rose' },
                ].map((m, i) => (
                    <div key={i} className={`stat-card ${m.color} animate-fadeInUp`} style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="stat-label">{m.label}</div>
                        <div className="stat-value">{m.value ? (m.value * 100).toFixed(1) + '%' : 'N/A'}</div>
                    </div>
                ))}
            </div>

            <div className="grid-2">
                {/* ROC Curve */}
                <div className="glass-card no-hover animate-fadeInUp stagger-2">
                    <h3 className="section-title">📉 ROC Curve</h3>
                    <div className="chart-container">
                        {roc_curve && roc_curve.length > 0 ? (
                            <ResponsiveContainer>
                                <AreaChart data={roc_curve}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="fpr" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'FPR', position: 'bottom', fill: '#94a3b8' }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'TPR', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={chartTooltipStyle} />
                                    <Area type="monotone" dataKey="tpr" stroke="#6366f1" fill="rgba(99,102,241,0.15)" strokeWidth={2} />
                                    <Line type="linear" dataKey="fpr" stroke="#64748b" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="loading-overlay">
                                <p style={{ color: 'var(--text-muted)' }}>Train models to see ROC curve</p>
                            </div>
                        )}
                    </div>
                    {model_metrics?.roc_auc && (
                        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            AUC = <strong style={{ color: 'var(--accent-indigo-light)' }}>{model_metrics.roc_auc}</strong>
                        </div>
                    )}
                </div>

                {/* Precision-Recall Curve */}
                <div className="glass-card no-hover animate-fadeInUp stagger-3">
                    <h3 className="section-title">📊 Precision-Recall Curve</h3>
                    <div className="chart-container">
                        {pr_curve && pr_curve.length > 0 ? (
                            <ResponsiveContainer>
                                <AreaChart data={pr_curve}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="recall" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'Recall', position: 'bottom', fill: '#94a3b8' }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'Precision', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={chartTooltipStyle} />
                                    <Area type="monotone" dataKey="precision" stroke="#10b981" fill="rgba(16,185,129,0.15)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="loading-overlay">
                                <p style={{ color: 'var(--text-muted)' }}>Train models to see PR curve</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid-2" style={{ marginTop: '1.5rem' }}>
                {/* Monthly Fraud Trend */}
                <div className="glass-card no-hover animate-fadeInUp stagger-4">
                    <h3 className="section-title">📅 Monthly Fraud Trend</h3>
                    <div className="chart-container">
                        {trendData.length > 0 ? (
                            <ResponsiveContainer>
                                <BarChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <Tooltip contentStyle={chartTooltipStyle} />
                                    <Legend />
                                    <Bar dataKey="fraud" fill="#f43f5e" name="Fraud" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="total" fill="rgba(99,102,241,0.4)" name="Total" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="loading-overlay">
                                <p style={{ color: 'var(--text-muted)' }}>Dataset needed for trend data</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Risk Histogram */}
                <div className="glass-card no-hover animate-fadeInUp stagger-4">
                    <h3 className="section-title">📊 Risk Score Histogram</h3>
                    <div className="chart-container">
                        {histData.some(d => d.count > 0) ? (
                            <ResponsiveContainer>
                                <BarChart data={histData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="bin" tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <Tooltip contentStyle={chartTooltipStyle} />
                                    <Bar dataKey="count" fill="#a855f7" name="Transactions" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="loading-overlay">
                                <p style={{ color: 'var(--text-muted)' }}>Evaluate transactions to see histogram</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Feature Importance */}
            {feature_importance && feature_importance.length > 0 && (
                <div className="glass-card no-hover animate-fadeInUp" style={{ marginTop: '1.5rem' }}>
                    <h3 className="section-title">🎯 Feature Importance (Core Model)</h3>
                    <div className="chart-container tall">
                        <ResponsiveContainer>
                            <BarChart data={feature_importance.sort((a, b) => b.importance - a.importance)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis type="category" dataKey="feature" tick={{ fill: '#94a3b8', fontSize: 11 }} width={150} />
                                <Tooltip contentStyle={chartTooltipStyle} />
                                <Bar dataKey="importance" fill="#6366f1" name="Importance" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Confusion Matrix */}
            {model_metrics?.confusion_matrix && model_metrics.confusion_matrix.length > 0 && (
                <div className="glass-card no-hover animate-fadeInUp" style={{ marginTop: '1.5rem', maxWidth: '500px' }}>
                    <h3 className="section-title">🔲 Confusion Matrix</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', maxWidth: '300px', margin: '0 auto' }}>
                        {[
                            { label: 'TN', value: model_metrics.confusion_matrix[0]?.[0], color: '#10b981' },
                            { label: 'FP', value: model_metrics.confusion_matrix[0]?.[1], color: '#f59e0b' },
                            { label: 'FN', value: model_metrics.confusion_matrix[1]?.[0], color: '#f59e0b' },
                            { label: 'TP', value: model_metrics.confusion_matrix[1]?.[1], color: '#6366f1' },
                        ].map((cell, i) => (
                            <div key={i} style={{
                                padding: '24px',
                                background: `${cell.color}15`,
                                border: `1px solid ${cell.color}30`,
                                borderRadius: '8px',
                                textAlign: 'center',
                            }}>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{cell.label}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: cell.color }}>{cell.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
