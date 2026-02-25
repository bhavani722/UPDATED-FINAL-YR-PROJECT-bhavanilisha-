import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
});

// Intercept requests to add auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Intercept responses for auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
        }
        return Promise.reject(error);
    }
);

// ============================================
// PUBLIC APIs
// ============================================
export const healthCheck = () => api.get('/health');

export const evaluateTransaction = (txData) => api.post('/evaluate', txData);

export const getSampleTransactions = (count = 5) =>
    api.get(`/sample-transactions?count=${count}&include_fraud=true`);

export const getDatasetStats = () => api.get('/dataset/stats');

// ============================================
// AUTH APIs
// ============================================
export const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data.token) {
        localStorage.setItem('admin_token', res.data.token);
        localStorage.setItem('admin_user', res.data.username);
    }
    return res;
};

export const logout = async () => {
    try {
        await api.post('/auth/logout');
    } catch (e) { /* ignore */ }
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
};

export const isAuthenticated = () => !!localStorage.getItem('admin_token');
export const getAdminUser = () => localStorage.getItem('admin_user');

// ============================================
// ADMIN APIs
// ============================================
export const getDashboard = () => api.get('/admin/dashboard');

export const getAnalytics = () => api.get('/admin/analytics');

export const getFraudBreakdown = () => api.get('/admin/fraud-breakdown');

export const getTransactions = (params = {}) =>
    api.get('/admin/transactions', { params });

export const getTransactionDetail = (txId) =>
    api.get(`/admin/transaction/${txId}`);

// ============================================
// GRAPH APIs
// ============================================
export const getGraphData = (maxNodes = 150) =>
    api.get(`/admin/graph?max_nodes=${maxNodes}`);

export const getGraphNode = (userId) =>
    api.get(`/admin/graph/node/${userId}`);

export const getSuspiciousClusters = () =>
    api.get('/admin/graph/clusters');

export const getFundFlow = (userId, depth = 3) =>
    api.get(`/admin/graph/fund-flow/${userId}?depth=${depth}`);

// ============================================
// EXPORT
// ============================================
export const exportTransactions = (format = 'json') =>
    api.get(`/admin/export?format=${format}`);

export default api;
