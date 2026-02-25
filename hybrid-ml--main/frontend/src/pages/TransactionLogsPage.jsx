import { useState, useEffect } from 'react';
import { getTransactions } from '../services/api';
import { DecisionBadge, Loader, RiskMeter } from '../components/UIComponents';

export default function TransactionLogsPage() {
    const [transactions, setTransactions] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        risk_min: 0,
        risk_max: 1,
        decision: '',
        search: '',
        limit: 50,
        offset: 0,
    });
    const [expandedTx, setExpandedTx] = useState(null);

    const fetchTransactions = () => {
        setLoading(true);
        const params = { ...filters };
        if (!params.decision) delete params.decision;
        if (!params.search) delete params.search;

        getTransactions(params)
            .then(res => {
                setTransactions(res.data.transactions || []);
                setTotal(res.data.total || 0);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchTransactions(); }, [filters.decision, filters.offset]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchTransactions();
    };

    return (
        <div className="page-container wide">
            <div className="page-header">
                <h1 className="page-title animate-fadeInUp">📝 Transaction Logs</h1>
                <p className="page-description animate-fadeInUp stagger-1">
                    Browse and filter evaluated transactions. {total} total records.
                </p>
            </div>

            {/* Filters */}
            <div className="glass-card no-hover animate-fadeInUp stagger-2" style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', alignItems: 'end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
                        <label className="form-label">Search</label>
                        <input className="form-input" placeholder="Transaction ID, User ID, or remark..."
                            value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Decision</label>
                        <div className="toggle-group">
                            {['', 'ALLOW', 'OTP', 'BLOCK'].map(d => (
                                <button key={d} type="button"
                                    className={`toggle-btn ${filters.decision === d ? 'active' : ''}`}
                                    onClick={() => setFilters(f => ({ ...f, decision: d, offset: 0 }))}>
                                    {d || 'All'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm">🔍 Apply</button>
                </form>
            </div>

            {/* Table */}
            {loading ? (
                <Loader message="Loading transactions..." />
            ) : transactions.length === 0 ? (
                <div className="glass-card no-hover" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
                    <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>No Transactions Found</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Submit transactions from the Transaction page to see them logged here.
                    </p>
                </div>
            ) : (
                <div className="glass-card no-hover animate-fadeInUp stagger-3" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Transaction ID</th>
                                <th>User</th>
                                <th>Amount</th>
                                <th>Risk Score</th>
                                <th>Decision</th>
                                <th>Core</th>
                                <th>NLP</th>
                                <th>LSTM</th>
                                <th>Graph</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx, i) => (
                                <>
                                    <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setExpandedTx(expandedTx === i ? null : i)}>
                                        <td className="mono">{tx.transaction_id}</td>
                                        <td className="mono" style={{ fontSize: '0.75rem' }}>{tx.user_id}</td>
                                        <td style={{ fontFamily: 'JetBrains Mono' }}>₹{tx.amount?.toLocaleString()}</td>
                                        <td>
                                            <div style={{ minWidth: '80px' }}>
                                                <span className="mono" style={{ fontSize: '0.8rem' }}>{(tx.final_risk_score * 100).toFixed(1)}%</span>
                                                <RiskMeter score={tx.final_risk_score} />
                                            </div>
                                        </td>
                                        <td><DecisionBadge decision={tx.decision} /></td>
                                        <td className="mono" style={{ color: tx.core_score > 0.5 ? '#fb7185' : '#94a3b8' }}>{tx.core_score?.toFixed(3)}</td>
                                        <td className="mono" style={{ color: tx.nlp_score > 0.5 ? '#fb7185' : '#94a3b8' }}>{tx.nlp_score?.toFixed(3)}</td>
                                        <td className="mono" style={{ color: tx.lstm_score > 0.5 ? '#fb7185' : '#94a3b8' }}>{tx.lstm_score?.toFixed(3)}</td>
                                        <td className="mono" style={{ color: tx.graph_risk > 0.3 ? '#fb7185' : '#94a3b8' }}>{tx.graph_risk?.toFixed(3)}</td>
                                        <td>
                                            <button className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem' }}>
                                                {expandedTx === i ? '▲' : '▼'}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedTx === i && (
                                        <tr key={`${i}-detail`}>
                                            <td colSpan={10} style={{ padding: '16px', background: 'var(--bg-glass)' }}>
                                                <div style={{ fontSize: '0.8rem' }}>
                                                    <strong>Fraud Reasons:</strong>
                                                    <ul style={{ marginTop: '6px', paddingLeft: '16px' }}>
                                                        {(tx.fraud_reasons || []).map((r, ri) => (
                                                            <li key={ri} style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>{r}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '1rem' }}>
                        <button className="btn btn-secondary btn-sm"
                            disabled={filters.offset === 0}
                            onClick={() => setFilters(f => ({ ...f, offset: Math.max(0, f.offset - f.limit) }))}>
                            ← Previous
                        </button>
                        <span style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {filters.offset + 1}–{Math.min(filters.offset + filters.limit, total)} of {total}
                        </span>
                        <button className="btn btn-secondary btn-sm"
                            disabled={filters.offset + filters.limit >= total}
                            onClick={() => setFilters(f => ({ ...f, offset: f.offset + f.limit }))}>
                            Next →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
