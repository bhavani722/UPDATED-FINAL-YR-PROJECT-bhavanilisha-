import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { getGraphData, getGraphNode } from '../services/api';
import { Loader } from '../components/UIComponents';
import { 
    Filter, 
    ShieldAlert, 
    Zap, 
    Layers, 
    Search, 
    Maximize2, 
    RefreshCcw, 
    Activity,
    Users,
    ArrowRightLeft,
    TrendingUp
} from 'lucide-react';

export default function GraphPage() {
    const [graphData, setGraphData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState(null);
    const [nodeDetail, setNodeDetail] = useState(null);
    const [hoveredNode, setHoveredNode] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [zoomLevel, setZoomLevel] = useState(1);
    
    // Controls State
    const [filters, setFilters] = useState({
        showFraudOnly: false,
        minRisk: 0,
        showLabels: true,
        highContrastLinks: true,
    });

    const [error, setError] = useState(null);

    const fetchData = useCallback((limit = 120) => {
        setLoading(true);
        setError(null);
        getGraphData(limit)
            .then(res => setGraphData(res.data))
            .catch(err => {
                console.error(err);
                setError(err.message || 'Failed to fetch graph data');
            })
            .finally(() => setLoading(false));
    }, []);

    const graphRef = useRef();

    useEffect(() => {
        fetchData(120); // Reverted to 120 nodes to prevent timeout
    }, [fetchData]);

    const handleNodeClick = useCallback(async (node) => {
        if (!node) return;
        const nodeId = node.id || node;
        setSelectedNode(nodeId);
        try {
            const res = await getGraphNode(nodeId);
            setNodeDetail(res.data);
        } catch { }
        
        // Center on node
        if (graphRef.current) {
            graphRef.current.centerAt(node.x, node.y, 800);
            graphRef.current.zoom(3, 800);
        }
    }, []);

    const handleResetView = () => {
        if (graphRef.current) {
            graphRef.current.zoomToFit(800, 50);
        }
    };

    // Advanced Data Filtering & Formatting
    const processedData = useMemo(() => {
        if (!graphData || !graphData.nodes) return { nodes: [], links: [] };
        
        let filteredNodes = graphData.nodes.filter(n => {
            if (filters.showFraudOnly && !(n.is_fraud || n.risk > 0.5)) return false;
            if (n.risk < filters.minRisk) return false;
            if (searchQuery && !n.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });

        const nodeIds = new Set(filteredNodes.map(n => n.id));
        
        let filteredLinks = graphData.edges
            .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
            .map(e => ({
                source: e.source,
                target: e.target,
                value: e.weight,
                amount: e.total_amount,
                isSuspicious: (nodeIds.has(e.source) && nodeIds.has(e.target) && 
                              graphData.nodes.find(n => n.id === e.source)?.risk > 0.5 &&
                              graphData.nodes.find(n => n.id === e.target)?.risk > 0.5)
            }));

        return { nodes: filteredNodes, links: filteredLinks };
    }, [graphData, filters, searchQuery]);

    // Custom Node Rendering (Researcher Style)
    const paintNode = useCallback((node, ctx, globalScale) => {
        const isSelected = selectedNode === node.id;
        const isHovered = hoveredNode === node.id;
        const risk = node.risk || 0;
        
        // Dynamic sizing
        const baseSize = 4 + Math.min(node.degree * 0.4, 6);
        const size = isSelected ? baseSize * 1.5 : isHovered ? baseSize * 1.2 : baseSize;
        
        // High-Quality Node Styling
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
        
        // Color Semantic System
        let color = '#3b82f6'; // Normal (Blue)
        if (risk > 0.7) color = '#f43f5e'; // High Risk (Red)
        else if (risk > 0.3) color = '#f59e0b'; // Medium Risk (Yellow)
        
        // Node Glow for High Risk
        if (risk > 0.5) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 10 * globalScale;
        }

        ctx.fillStyle = color;
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;

        // Pulsing animation for extreme risk
        if (risk > 0.8) {
            const time = Date.now() / 400;
            const pulse = (Math.sin(time) + 1) / 2;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 2 + (pulse * 3), 0, 2 * Math.PI, false);
            ctx.strokeStyle = `rgba(244, 63, 94, ${0.4 - pulse * 0.3})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Selected indicator
        if (isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI, false);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Labels (Level of Detail rendering)
        if (filters.showLabels && (globalScale > 2 || isSelected || isHovered || risk > 0.6)) {
            const label = node.id.replace('UPI_USER_', 'U-');
            const fontSize = 12 / globalScale;
            ctx.font = `${isSelected ? 'bold' : 'normal'} ${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillText(label, node.x, node.y + size + fontSize + 2);
        }
    }, [selectedNode, hoveredNode, filters.showLabels]);

    if (loading) return <Loader message="Intelligent Network Mapping..." />;

    if (error || !graphData) {
        return (
            <div className="page-container flex flex-col items-center justify-center p-20 text-center">
                <ShieldAlert size={64} className="text-rose-500 mb-6 opacity-50" />
                <h2 className="text-2xl font-bold text-white mb-2">Network Sync Interrupted</h2>
                <p className="text-gray-400 max-w-md mb-8">
                    {error || 'Internal system link timeout. The backend dataset might be too large for real-time visualization.'}
                </p>
                <button className="btn btn-primary" onClick={() => fetchData(120)}>
                    <RefreshCcw size={16} className="mr-2" /> Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="page-container wide fintech-dashboard">
            {/* Header Section */}
            <div className="flex justify-between items-end mb-8 animate-fadeInUp">
                <div>
                    <h1 className="page-title text-3xl mb-0 flex items-center gap-3">
                        <Activity className="text-indigo-400" /> Fraud Intelligence Map
                    </h1>
                    <p className="page-description mt-1 opacity-60">
                        Professional Network Analysis & Coordinated Fraud Ring Detection
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="glass-card p-1 flex items-center gap-2" style={{ borderRadius: '12px' }}>
                        <div className="search-box relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search Node ID..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ 
                                    background: 'transparent', 
                                    border: 'none', 
                                    color: '#fff', 
                                    paddingLeft: '32px',
                                    fontSize: '0.85rem',
                                    width: '200px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>
                    <button className="btn btn-primary flex items-center gap-2" onClick={handleResetView}>
                        <Maximize2 size={16} /> Reset View
                    </button>
                </div>
            </div>

            {/* Analytics Summary Bar */}
            <div className="grid-4 mb-6">
                {[
                    { label: 'Total Visualized', value: processedData.nodes.length, icon: Users, color: 'indigo' },
                    { label: 'Active Links', value: processedData.links.length, icon: ArrowRightLeft, color: 'emerald' },
                    { label: 'Risk Hubs', value: processedData.nodes.filter(n => n.risk > 0.7).length, icon: ShieldAlert, color: 'rose' },
                    { label: 'Network Density', value: graphData?.stats?.avg_degree || '0.0', icon: TrendingUp, color: 'amber' }
                ].map((stat, i) => (
                    <div key={i} className={`stat-card ${stat.color} animate-fadeInUp stagger-${i}`}>
                        <div className="flex justify-between items-start">
                            <div className="stat-label uppercase tracking-widest text-[10px] opacity-70 font-bold mb-1">{stat.label}</div>
                            <stat.icon size={16} className="opacity-50" />
                        </div>
                        <div className="stat-value text-2xl font-black">{stat.value}</div>
                        <div className="stat-trend text-[9px] mt-1 text-white/40">Real-time synchronized</div>
                    </div>
                ))}
            </div>

            <div className="grid-12 gap-6" style={{ display: 'grid', gridTemplateColumns: '1fr 3fr 1fr', height: '650px' }}>
                
                {/* 1. Left Controls Panel */}
                <div className="glass-card animate-fadeInUp flex flex-col gap-6" style={{ padding: '20px' }}>
                    <div>
                        <h4 className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-4 tracking-wider uppercase">
                            <Filter size={14} /> Global Filters
                        </h4>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between cursor-pointer group">
                                <span className="text-xs text-gray-300 group-hover:text-white transition-colors">Fraud Only View</span>
                                <input 
                                    type="checkbox" 
                                    checked={filters.showFraudOnly}
                                    onChange={e => setFilters({...filters, showFraudOnly: e.target.checked})}
                                    className="toggle"
                                />
                            </label>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-gray-500 font-bold uppercase">
                                    <span>Min Risk Profile</span>
                                    <span>{(filters.minRisk * 100).toFixed(0)}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.1"
                                    value={filters.minRisk}
                                    onChange={e => setFilters({...filters, minRisk: parseFloat(e.target.value)})}
                                    className="w-full range-slider"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-6">
                        <h4 className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-4 tracking-wider uppercase">
                            <Layers size={14} /> Visualization
                        </h4>
                        <div className="space-y-3">
                            <button 
                                className={`w-full text-left p-2 rounded-lg text-xs transition-all ${filters.showLabels ? 'bg-indigo-600/20 text-indigo-400' : 'text-gray-500 hover:bg-white/5'}`}
                                onClick={() => setFilters({...filters, showLabels: !filters.showLabels})}
                            >
                                {filters.showLabels ? '● Labels Visible' : '○ Labels Hidden'}
                            </button>
                            <button className="w-full text-left p-2 rounded-lg text-xs text-gray-500 hover:bg-white/5 flex items-center justify-between">
                                Force Physics <RefreshCcw size={12} className="animate-spin-slow" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-auto bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                        <div className="flex items-center gap-2 text-rose-400 mb-1">
                            <ShieldAlert size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">System Alert</span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight">
                            Coordinated behavior detected in Cluster ID: 82. Recommend immediate audit.
                        </p>
                    </div>
                </div>

                {/* 2. Main Graph Visualization */}
                <div className="glass-card no-hover p-0 relative overflow-hidden animate-fadeInUp stagger-1" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="absolute top-4 left-4 z-10 flex gap-2">
                        <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-bold text-indigo-300 uppercase tracking-tighter flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" /> Live Force Simulation
                        </div>
                    </div>

                    <ForceGraph2D
                        ref={graphRef}
                        graphData={processedData}
                        nodeCanvasObject={paintNode}
                        nodePointerAreaPaint={(node, color, ctx) => {
                            ctx.fillStyle = color;
                            ctx.beginPath(); ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false); ctx.fill();
                        }}
                        linkCurvature={0.25}
                        linkDirectionalArrowLength={3}
                        linkDirectionalArrowRelPos={1}
                        linkWidth={l => l.isSuspicious ? 2 : 1}
                        linkColor={l => l.isSuspicious ? 'rgba(244, 63, 94, 0.4)' : 'rgba(99, 102, 241, 0.1)'}
                        linkDirectionalParticles={l => l.isSuspicious ? 2 : 0}
                        linkDirectionalParticleSpeed={d => d.value * 0.01}
                        backgroundColor="#0b0f1a"
                        onNodeClick={handleNodeClick}
                        onNodeHover={node => setHoveredNode(node?.id || null)}
                        onZoom={({ k }) => setZoomLevel(k)}
                        cooldownTicks={150}
                        width={window.innerWidth * 0.5} // Responsive-ish
                        height={648}
                    />

                    {/* Viewport Legend Overlay */}
                    <div className="absolute bottom-4 right-4 z-10 bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl">
                        <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Network Key</h5>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 text-[11px] text-gray-300">
                                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-[0_0_8px_#f43f5e]" /> High Threat Node
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-gray-300">
                                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" /> Suspicious Origin
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-gray-300">
                                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> Standard User
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Right Node Inspector */}
                <div className="glass-card animate-fadeInUp flex flex-col h-full bg-black/20" style={{ padding: '20px' }}>
                    <h3 className="section-title text-sm border-b border-white/5 pb-4 mb-4 flex items-center gap-2">
                        <Zap size={14} className="text-amber-400" /> Node Insight
                    </h3>
                    
                    {nodeDetail ? (
                        <div className="flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">ID: {nodeDetail.user_id?.split('_').pop()}</span>
                                <div className="text-lg font-black text-white truncate mb-1">{nodeDetail.user_id}</div>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-1000 ${nodeDetail.graph_risk > 0.7 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                                            style={{ width: `${nodeDetail.graph_risk * 100}%` }}
                                        />
                                    </div>
                                    <span className={`text-[11px] font-bold ${nodeDetail.graph_risk > 0.7 ? 'text-rose-400' : 'text-indigo-400'}`}>
                                        {(nodeDetail.graph_risk * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </div>

                            <div className="grid-2 gap-2">
                                {[
                                    ['Connectivity', nodeDetail.degree],
                                    ['Transfers', nodeDetail.tx_count],
                                    ['Violations', nodeDetail.fraud_count],
                                ].map(([label, val], i) => (
                                    <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="text-[9px] text-gray-500 uppercase font-black">{label}</div>
                                        <div className="text-sm font-bold text-white">{val}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="text-[10px] font-black text-gray-500 uppercase border-b border-white/5 pb-2">Centrality Rankings</div>
                                {[
                                    ['Betweenness', nodeDetail.betweenness_centrality?.toFixed(4)],
                                    ['PageRank', nodeDetail.pagerank?.toFixed(4)],
                                    ['Total Vol', `₹${nodeDetail.total_amount?.toLocaleString()}`],
                                ].map(([label, val], i) => (
                                    <div key={i} className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400">{label}</span>
                                        <span className="font-mono text-white/80">{val}</span>
                                    </div>
                                ))}
                            </div>

                            {nodeDetail.in_suspicious_cluster && (
                                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-rose-500/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                    <div className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <ShieldAlert size={10} /> Cluster Membership 
                                    </div>
                                    <div className="text-xs font-bold text-white mb-2">Part of Fraud Community {nodeDetail.cluster_id?.split('_').pop()}</div>
                                    <button 
                                        onClick={() => handleResetView()}
                                        className="w-full py-1.5 bg-rose-600/80 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold uppercase transition-all"
                                    >
                                        Audit Cluster
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 p-4">
                            <Search size={48} strokeWidth={1} className="mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">
                                NO NODE TARGETED<br/>Select an interface node to trigger analysis
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Suspicious Communities Table Section */}
            {graphData.communities?.length > 0 && (
                <div className="mt-10 animate-fadeInUp stagger-3">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="section-title text-xl flex items-center gap-3">
                            <ShieldAlert className="text-rose-400" /> Suspicious Coordinated Networks
                        </h3>
                        <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold text-gray-500 uppercase border border-white/10">
                            {graphData.communities.length} Active Investigations
                        </div>
                    </div>
                    
                    <div className="glass-card no-hover p-0 overflow-hidden border border-white/5">
                        <table className="data-table dashboard-table">
                            <thead>
                                <tr className="bg-white/5 text-[10px] text-gray-500 font-black uppercase tracking-widest border-b border-white/5 text-left">
                                    <th className="p-4">Network ID</th>
                                    <th className="p-4">Core Size</th>
                                    <th className="p-4">Risk Saturation</th>
                                    <th className="p-4">Aggregated Transaction Volume</th>
                                    <th className="p-4">Network Connectedness</th>
                                    <th className="p-4 text-center">Protocol</th>
                                </tr>
                            </thead>
                            <tbody>
                                {graphData.communities.map((c, i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                        <td className="p-4 font-mono text-xs text-indigo-400 font-bold group-hover:text-indigo-300">
                                            COMM_RING_{c.community_id?.split('_').pop()}
                                        </td>
                                        <td className="p-4 text-sm font-bold text-white">{c.size} Nodes</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 max-w-[120px] h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${c.fraud_ratio > 0.4 ? 'bg-rose-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${c.fraud_ratio * 100}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-bold ${c.fraud_ratio > 0.4 ? 'text-rose-400' : 'text-amber-400'}`}>
                                                    {(c.fraud_ratio * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-bold text-white">{c.total_transactions} txs</td>
                                        <td className="p-4 font-mono text-xs text-gray-500">{c.density}</td>
                                        <td className="p-4 text-center">
                                            <button 
                                                className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold uppercase transition-all backdrop-blur-md border border-white/10"
                                                onClick={() => handleResetView()}
                                            >
                                                Isolate Network
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <style>{`
                .fintech-dashboard {
                    background: radial-gradient(circle at top left, rgba(99, 102, 241, 0.05) 0%, transparent 25%),
                                radial-gradient(circle at bottom right, rgba(244, 63, 94, 0.05) 0%, transparent 25%);
                    min-height: 100vh;
                }
                .range-slider {
                    -webkit-appearance: none;
                    width: 100%;
                    height: 4px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 5px;
                    outline: none;
                }
                .range-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #6366f1;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
                }
                .toggle {
                    width: 32px;
                    height: 16px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 20px;
                    appearance: none;
                    position: relative;
                    cursor: pointer;
                    transition: 0.3s;
                }
                .toggle:checked {
                    background: #6366f1;
                }
                .toggle::before {
                    content: '';
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    background: white;
                    border-radius: 50%;
                    top: 2px;
                    left: 2px;
                    transition: 0.3s;
                }
                .toggle:checked::before {
                    left: 18px;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                }
                .animate-spin-slow {
                    animation: spin 8s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .dashboard-table th { font-size: 9px !important; }
                .dashboard-table td { font-size: 13px !important; }
            `}</style>
        </div>
    );
}
