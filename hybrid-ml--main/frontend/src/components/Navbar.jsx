import { Link, useLocation } from 'react-router-dom';
import { isAuthenticated, getAdminUser, logout } from '../services/api';

export default function Navbar() {
    const location = useLocation();
    const isAdmin = location.pathname.startsWith('/admin');
    const authed = isAuthenticated();
    const adminUser = getAdminUser();

    const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

    const handleLogout = () => {
        logout();
        window.location.href = '/admin/login';
    };

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">
                <div className="navbar-logo">🛡</div>
                <div>
                    <div className="navbar-title">UPI Fraud Detection</div>
                    <div className="navbar-subtitle">Hybrid Multi-Layer System</div>
                </div>
            </Link>

            <div className="navbar-links">
                <Link to="/" className={isActive('/')}>Home</Link>
                <Link to="/transaction" className={isActive('/transaction')}>New Transaction</Link>

                {authed ? (
                    <>
                        <Link to="/admin/dashboard" className={isActive('/admin/dashboard')}>Dashboard</Link>
                        <Link to="/admin/analytics" className={isActive('/admin/analytics')}>Analytics</Link>
                        <Link to="/admin/graph" className={isActive('/admin/graph')}>Graph</Link>
                        <Link to="/admin/transactions" className={isActive('/admin/transactions')}>Logs</Link>
                        <Link to="/admin/fraud-breakdown" className={isActive('/admin/fraud-breakdown')}>Breakdown</Link>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0 8px' }}>
                            👤 {adminUser}
                        </span>
                        <button className="nav-link danger" onClick={handleLogout}>Logout</button>
                    </>
                ) : (
                    <Link to="/admin/login" className={isActive('/admin/login')}>Admin Login</Link>
                )}
            </div>
        </nav>
    );
}
