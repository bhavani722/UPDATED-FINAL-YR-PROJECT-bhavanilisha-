export function RiskMeter({ score }) {
    const pct = Math.min(score * 100, 100);
    const level = score < 0.3 ? 'low' : score <= 0.7 ? 'medium' : 'high';

    return (
        <div className="risk-meter">
            <div className={`risk-meter-fill ${level}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

export function DecisionBadge({ decision }) {
    const cls = decision === 'ALLOW' ? 'badge-allow' :
        decision === 'OTP' ? 'badge-otp' : 'badge-block';
    return <span className={`badge ${cls}`}>{decision}</span>;
}

export function ScoreBreakdown({ scores }) {
    const items = [
        { label: 'Core ML Model', key: 'core_score', color: '#6366f1' },
        { label: 'NLP Scam Score', key: 'nlp_score', color: '#a855f7' },
        { label: 'LSTM Behavior', key: 'lstm_score', color: '#3b82f6' },
        { label: 'Location Risk', key: 'location_risk', color: '#f59e0b' },
        { label: 'Device Risk', key: 'device_risk', color: '#ef4444' },
        { label: 'Graph Risk', key: 'graph_risk', color: '#06b6d4' },
    ];

    return (
        <div className="score-breakdown">
            {items.map((item, idx) => {
                const val = scores[item.key] || 0;
                return (
                    <div key={item.key} className="score-row animate-fadeInUp" style={{ animationDelay: `${idx * 0.08}s` }}>
                        <span className="score-label">{item.label}</span>
                        <div className="score-bar-bg">
                            <div
                                className="score-bar-fill"
                                style={{
                                    width: `${Math.min(val * 100, 100)}%`,
                                    background: item.color,
                                    transitionDelay: `${idx * 0.1}s`
                                }}
                            />
                        </div>
                        <span className="score-value">{val.toFixed(4)}</span>
                    </div>
                );
            })}
        </div>
    );
}

export function FraudReasons({ reasons }) {
    if (!reasons || reasons.length === 0) return null;

    return (
        <ul className="reason-list">
            {reasons.map((reason, idx) => {
                const isDanger = reason.toLowerCase().includes('block') ||
                    reason.toLowerCase().includes('impossible') ||
                    reason.toLowerCase().includes('sim') ||
                    reason.toLowerCase().includes('unregistered');
                const isWarning = reason.toLowerCase().includes('suspicious') ||
                    reason.toLowerCase().includes('moderate') ||
                    reason.toLowerCase().includes('vpn') ||
                    reason.toLowerCase().includes('burst');
                const isSafe = reason.toLowerCase().includes('normal');

                return (
                    <li key={idx} className="reason-item animate-slideInRight" style={{ animationDelay: `${idx * 0.05}s` }}>
                        <span className={`reason-icon ${isDanger ? 'danger' : isWarning ? 'warning' : isSafe ? 'safe' : 'warning'}`}>
                            {isDanger ? '🔴' : isWarning ? '🟡' : isSafe ? '🟢' : '⚠️'}
                        </span>
                        <span>{reason}</span>
                    </li>
                );
            })}
        </ul>
    );
}

export function DecisionDisplay({ decision, score }) {
    const cls = decision === 'ALLOW' ? 'allow' : decision === 'OTP' ? 'otp' : 'block';
    const icons = { ALLOW: '✅', OTP: '🔐', BLOCK: '🚫' };
    const messages = {
        ALLOW: 'Transaction Approved',
        OTP: 'OTP Verification Required',
        BLOCK: 'Transaction Blocked',
    };

    return (
        <div className={`decision-display ${cls} animate-fadeInUp`}>
            <div className="decision-icon">{icons[decision] || '❓'}</div>
            <div className={`decision-text ${cls}`}>{decision}</div>
            <div className="decision-score" style={{ color: cls === 'allow' ? 'var(--accent-emerald)' : cls === 'otp' ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                {(score * 100).toFixed(1)}%
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                {messages[decision]}
            </div>
        </div>
    );
}

export function Loader({ message = 'Processing...' }) {
    return (
        <div className="loading-overlay">
            <div className="spinner" />
            <div>{message}</div>
        </div>
    );
}

export function StatCard({ label, value, accent = 'indigo', subtitle }) {
    return (
        <div className={`stat-card ${accent} animate-fadeInUp`}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            {subtitle && <div className="stat-change">{subtitle}</div>}
        </div>
    );
}
