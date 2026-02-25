import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(username, password);
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Check credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="glass-card login-card animate-fadeInUp">
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🛡️</div>
                </div>
                <h1 className="login-title">Admin Login</h1>
                <p className="login-subtitle">Secure access to the fraud analytics dashboard</p>

                {error && <div className="login-error animate-fadeIn">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            className="form-input"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="admin"
                            required
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            className="form-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                        disabled={loading}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="spinner sm" /> Authenticating...
                            </span>
                        ) : (
                            '🔐 Sign In'
                        )}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', padding: '12px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div><strong>Demo Credentials:</strong></div>
                    <div>Username: <code>admin</code> | Password: <code>admin123</code></div>
                </div>
            </div>
        </div>
    );
}
