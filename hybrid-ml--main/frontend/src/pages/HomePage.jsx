import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getDatasetStats, isAuthenticated } from '../services/api';

export default function HomePage() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        getDatasetStats().then(res => setStats(res.data)).catch(() => { });
    }, []);

    return (
        <div className="page-container">
            {/* Hero Section */}
            <div className="hero">
                <h1 className="hero-title animate-fadeInUp">
                    Hybrid Multi-Layer<br />UPI Fraud Detection
                </h1>
                <p className="hero-subtitle animate-fadeInUp stagger-2">
                    An intelligent system combining Machine Learning, NLP, Deep Learning (LSTM),
                    Graph-based Intelligence, and Rule-based Engines for real-time UPI fraud detection.
                </p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }} className="animate-fadeInUp stagger-3">
                    <Link to="/transaction" className="btn btn-primary btn-lg">
                        🔍 Evaluate Transaction
                    </Link>
                    {isAuthenticated() ? (
                        <Link to="/admin/dashboard" className="btn btn-secondary btn-lg">
                            📊 Admin Dashboard
                        </Link>
                    ) : (
                        <Link to="/admin/login" className="btn btn-secondary btn-lg">
                            🔐 Admin Login
                        </Link>
                    )}
                </div>
            </div>

            {/* Architecture Cards */}
            <div style={{ marginTop: '3rem' }}>
                <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    System Architecture — 6-Layer Risk Engine
                </h2>

                <div className="grid-3">
                    {[
                        {
                            icon: '🤖',
                            title: 'Core ML Model',
                            desc: 'Random Forest classifier trained on 11 engineered features including amount, velocity, device mismatch, and burst patterns.',
                            weight: '35%',
                            color: '#6366f1',
                        },
                        {
                            icon: '🔤',
                            title: 'NLP Scam Detection',
                            desc: 'TF-IDF + Logistic Regression analyzes transaction remarks to identify phishing, lottery scams, and social engineering.',
                            weight: '15%',
                            color: '#a855f7',
                        },
                        {
                            icon: '🧠',
                            title: 'LSTM Behavioral',
                            desc: 'Deep learning model analyzing sequential transaction amounts to detect anomalous spending behavior over time.',
                            weight: '20%',
                            color: '#3b82f6',
                        },
                        {
                            icon: '📍',
                            title: 'Location Engine',
                            desc: 'Haversine distance, velocity calculation, and impossible travel detection between consecutive transactions.',
                            weight: '10%',
                            color: '#f59e0b',
                        },
                        {
                            icon: '📱',
                            title: 'Device Engine',
                            desc: 'Detects device mismatches, SIM swap attacks, and VPN usage to identify compromised accounts.',
                            weight: '10%',
                            color: '#ef4444',
                        },
                        {
                            icon: '🌐',
                            title: 'Graph Intelligence',
                            desc: 'NetworkX-based analysis detecting suspicious clusters, mule accounts, and high-centrality nodes in transaction networks.',
                            weight: '10%',
                            color: '#06b6d4',
                        },
                    ].map((item, idx) => (
                        <div key={idx} className="glass-card animate-fadeInUp" style={{ animationDelay: `${idx * 0.08}s` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <span style={{ fontSize: '1.8rem' }}>{item.icon}</span>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</h3>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        background: `${item.color}22`,
                                        color: item.color,
                                    }}>
                                        Weight: {item.weight}
                                    </span>
                                </div>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Dataset Stats */}
            {stats && (
                <div style={{ marginTop: '3rem' }}>
                    <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        Training Dataset
                    </h2>
                    <div className="grid-4">
                        <div className="stat-card indigo animate-fadeInUp stagger-1">
                            <div className="stat-label">Total Transactions</div>
                            <div className="stat-value">{stats.total_records?.toLocaleString()}</div>
                        </div>
                        <div className="stat-card rose animate-fadeInUp stagger-2">
                            <div className="stat-label">Fraud Cases</div>
                            <div className="stat-value">{stats.fraud_count?.toLocaleString()}</div>
                            <div className="stat-change negative">{stats.fraud_ratio}% fraud ratio</div>
                        </div>
                        <div className="stat-card emerald animate-fadeInUp stagger-3">
                            <div className="stat-label">Unique Users</div>
                            <div className="stat-value">{stats.unique_users?.toLocaleString()}</div>
                        </div>
                        <div className="stat-card amber animate-fadeInUp stagger-4">
                            <div className="stat-label">Avg Amount</div>
                            <div className="stat-value small">₹{stats.amount_stats?.mean?.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Decision Logic */}
            <div style={{ marginTop: '3rem', marginBottom: '2rem' }}>
                <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    Decision Engine
                </h2>
                <div className="grid-3" style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <div className="glass-card animate-fadeInUp stagger-1" style={{ textAlign: 'center', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✅</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>ALLOW</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
                            Risk Score {'<'} 0.3
                        </div>
                    </div>
                    <div className="glass-card animate-fadeInUp stagger-2" style={{ textAlign: 'center', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔐</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-amber)' }}>OTP</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
                            0.3 ≤ Risk ≤ 0.7
                        </div>
                    </div>
                    <div className="glass-card animate-fadeInUp stagger-3" style={{ textAlign: 'center', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🚫</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-rose)' }}>BLOCK</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
                            Risk {'>'} 0.7
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
