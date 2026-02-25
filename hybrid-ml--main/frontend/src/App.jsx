import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import TransactionPage from './pages/TransactionPage';
import ResultPage from './pages/ResultPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import GraphPage from './pages/GraphPage';
import TransactionLogsPage from './pages/TransactionLogsPage';
import FraudBreakdownPage from './pages/FraudBreakdownPage';
import { isAuthenticated } from './services/api';

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Router>
      <div className="app-layout">
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/transaction" element={<TransactionPage />} />
          <Route path="/result" element={<ResultPage />} />

          {/* Auth */}
          <Route path="/admin/login" element={<LoginPage />} />

          {/* Protected Admin Routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/admin/graph" element={<ProtectedRoute><GraphPage /></ProtectedRoute>} />
          <Route path="/admin/transactions" element={<ProtectedRoute><TransactionLogsPage /></ProtectedRoute>} />
          <Route path="/admin/fraud-breakdown" element={<ProtectedRoute><FraudBreakdownPage /></ProtectedRoute>} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
