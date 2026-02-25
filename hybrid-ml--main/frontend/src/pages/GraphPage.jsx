import { useState, useEffect, useRef, useCallback } from 'react';
import { getGraphData, getGraphNode } from '../services/api';
import { Loader } from '../components/UIComponents';

export default function GraphPage() {
    const [graphData, setGraphData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState(null);
    const [nodeDetail, setNodeDetail] = useState(null);
    const canvasRef = useRef(null);
    const [hoveredNode, setHoveredNode] = useState(null);

    useEffect(() => {
        getGraphData(120)
            .then(res => setGraphData(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handleNodeClick = async (nodeId) => {
        setSelectedNode(nodeId);
        try {
            const res = await getGraphNode(nodeId);
            setNodeDetail(res.data);
        } catch { }
    };

    // Canvas-based graph rendering
    useEffect(() => {
        if (!graphData || !graphData.nodes || graphData.nodes.length === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.parentElement.clientWidth;
        const height = 500;
        canvas.width = width;
        canvas.height = height;

        const nodes = graphData.nodes;
        const edges = graphData.edges;

        // Assign positions using simple force-directed layout (approximate)
        const nodeMap = {};
        nodes.forEach((node, i) => {
            const angle = (i / nodes.length) * 2 * Math.PI;
            const radius = 180 + Math.random() * 50;
            nodeMap[node.id] = {
                ...node,
                x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 80,
                y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 80,
            };
        });

        // Simple force simulation (5 iterations for speed)
        for (let iter = 0; iter < 8; iter++) {
            // Repulsion between nodes
            const nodeList = Object.values(nodeMap);
            for (let i = 0; i < nodeList.length; i++) {
                for (let j = i + 1; j < nodeList.length; j++) {
                    const dx = nodeList[j].x - nodeList[i].x;
                    const dy = nodeList[j].y - nodeList[i].y;
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const force = 500 / (dist * dist);
                    nodeList[i].x -= (dx / dist) * force;
                    nodeList[i].y -= (dy / dist) * force;
                    nodeList[j].x += (dx / dist) * force;
                    nodeList[j].y += (dy / dist) * force;
                }
            }

            // Attraction along edges
            edges.forEach(edge => {
                const source = nodeMap[edge.source];
                const target = nodeMap[edge.target];
                if (!source || !target) return;
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = dist * 0.005;
                source.x += dx * force;
                source.y += dy * force;
                target.x -= dx * force;
                target.y -= dy * force;
            });

            // Center gravity
            nodeList.forEach(n => {
                n.x += (width / 2 - n.x) * 0.02;
                n.y += (height / 2 - n.y) * 0.02;
                // Boundary
                n.x = Math.max(30, Math.min(width - 30, n.x));
                n.y = Math.max(30, Math.min(height - 30, n.y));
            });
        }

        // Draw
        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            // Background
            ctx.fillStyle = '#111827';
            ctx.fillRect(0, 0, width, height);

            // Edges
            edges.forEach(edge => {
                const source = nodeMap[edge.source];
                const target = nodeMap[edge.target];
                if (!source || !target) return;

                ctx.beginPath();
                ctx.moveTo(source.x, source.y);
                ctx.lineTo(target.x, target.y);
                ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
                ctx.lineWidth = Math.min(edge.weight * 0.5, 3);
                ctx.stroke();
            });

            // Nodes
            Object.values(nodeMap).forEach(node => {
                const isFraud = node.is_fraud || node.risk > 0.3;
                const isSelected = node.id === selectedNode;
                const isHovered = node.id === hoveredNode;
                const radius = 4 + Math.min(node.degree * 0.5, 8);

                // Glow for fraud nodes
                if (isFraud) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI);
                    ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
                    ctx.fill();
                }

                if (isSelected) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, radius + 6, 0, 2 * Math.PI);
                    ctx.strokeStyle = '#6366f1';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Node circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
                ctx.fillStyle = isFraud ? '#f43f5e' : isHovered ? '#818cf8' : '#3b82f6';
                ctx.fill();

                // Label for high-risk or selected
                if (isSelected || isHovered || node.risk > 0.5) {
                    ctx.fillStyle = '#f1f5f9';
                    ctx.font = '9px Inter';
                    ctx.textAlign = 'center';
                    ctx.fillText(node.id.replace('UPI_USER_', 'U'), node.x, node.y - radius - 4);
                }
            });
        };

        draw();

        // Click handling
        const handleCanvasClick = (e) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            for (const node of Object.values(nodeMap)) {
                const dx = mx - node.x;
                const dy = my - node.y;
                const radius = 4 + Math.min(node.degree * 0.5, 8);
                if (dx * dx + dy * dy <= (radius + 4) * (radius + 4)) {
                    handleNodeClick(node.id);
                    draw();
                    return;
                }
            }
        };

        canvas.addEventListener('click', handleCanvasClick);
        return () => canvas.removeEventListener('click', handleCanvasClick);
    }, [graphData, selectedNode, hoveredNode]);

    if (loading) return <Loader message="Building transaction graph..." />;
    if (!graphData) return <div className="page-container"><p>Failed to load graph data.</p></div>;

    return (
        <div className="page-container wide">
            <div className="page-header">
                <h1 className="page-title animate-fadeInUp">🌐 Transaction Graph</h1>
                <p className="page-description animate-fadeInUp stagger-1">
                    Interactive network visualization. Click nodes to inspect user details.
                    <span style={{ color: '#f43f5e' }}> Red = Fraud</span>,
                    <span style={{ color: '#3b82f6' }}> Blue = Normal</span>
                </p>
            </div>

            {/* Graph Stats */}
            <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card indigo animate-fadeInUp">
                    <div className="stat-label">Total Nodes</div>
                    <div className="stat-value small">{graphData.stats?.total_nodes || 0}</div>
                </div>
                <div className="stat-card emerald animate-fadeInUp stagger-1">
                    <div className="stat-label">Total Edges</div>
                    <div className="stat-value small">{graphData.stats?.total_edges || 0}</div>
                </div>
                <div className="stat-card amber animate-fadeInUp stagger-2">
                    <div className="stat-label">Avg Degree</div>
                    <div className="stat-value small">{graphData.stats?.avg_degree || 0}</div>
                </div>
                <div className="stat-card rose animate-fadeInUp stagger-3">
                    <div className="stat-label">Suspicious Clusters</div>
                    <div className="stat-value small">{graphData.communities?.length || 0}</div>
                </div>
            </div>

            <div className="grid-2" style={{ gridTemplateColumns: '2fr 1fr' }}>
                {/* Graph Canvas */}
                <div className="glass-card no-hover animate-fadeInUp stagger-2" style={{ padding: '0', overflow: 'hidden' }}>
                    <div className="graph-container" style={{ position: 'relative' }}>
                        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', cursor: 'pointer' }} />
                        <div className="graph-legend">
                            <div className="graph-legend-item">
                                <div className="graph-legend-dot" style={{ background: '#f43f5e' }} />
                                <span>Fraud Node</span>
                            </div>
                            <div className="graph-legend-item">
                                <div className="graph-legend-dot" style={{ background: '#3b82f6' }} />
                                <span>Normal Node</span>
                            </div>
                            <div className="graph-legend-item">
                                <div className="graph-legend-dot" style={{ background: '#6366f1', boxShadow: '0 0 8px rgba(99,102,241,0.5)' }} />
                                <span>Selected</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Node Details Panel */}
                <div className="glass-card no-hover animate-fadeInUp stagger-3">
                    <h3 className="section-title">🔎 Node Inspector</h3>
                    {nodeDetail ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                            <div style={{ padding: '12px', background: 'var(--bg-glass)', borderRadius: '8px' }}>
                                <div style={{ fontWeight: 700, color: 'var(--accent-indigo-light)', marginBottom: '4px' }}>{nodeDetail.user_id}</div>
                                <div style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    background: nodeDetail.graph_risk > 0.3 ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                                    color: nodeDetail.graph_risk > 0.3 ? '#fb7185' : '#34d399',
                                }}>
                                    Risk: {(nodeDetail.graph_risk * 100).toFixed(1)}%
                                </div>
                            </div>

                            {[
                                ['Degree', nodeDetail.degree],
                                ['In-Degree', nodeDetail.in_degree],
                                ['Out-Degree', nodeDetail.out_degree],
                                ['Transactions', nodeDetail.tx_count],
                                ['Fraud Count', nodeDetail.fraud_count],
                                ['Total Amount', `₹${nodeDetail.total_amount?.toLocaleString()}`],
                                ['Degree Centrality', nodeDetail.degree_centrality?.toFixed(6)],
                                ['Betweenness', nodeDetail.betweenness_centrality?.toFixed(6)],
                                ['PageRank', nodeDetail.pagerank?.toFixed(6)],
                            ].map(([label, value], i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>{value}</span>
                                </div>
                            ))}

                            {nodeDetail.in_suspicious_cluster && (
                                <div style={{ padding: '8px 12px', background: 'rgba(244,63,94,0.1)', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.3)', fontSize: '0.8rem', color: '#fb7185' }}>
                                    ⚠️ In suspicious cluster: {nodeDetail.cluster_id}
                                </div>
                            )}

                            {nodeDetail.neighbors_out?.length > 0 && (
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Connected to:</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                        {nodeDetail.neighbors_out.slice(0, 10).map((n, i) => (
                                            <button key={i} className="btn btn-secondary btn-sm" style={{ fontSize: '0.65rem', padding: '2px 6px' }}
                                                onClick={() => handleNodeClick(n)}>
                                                {n.replace('UPI_USER_', 'U')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👆</div>
                            <p>Click a node in the graph to inspect user details</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Suspicious Clusters */}
            {graphData.communities?.length > 0 && (
                <div className="glass-card no-hover animate-fadeInUp" style={{ marginTop: '1.5rem' }}>
                    <h3 className="section-title">🔴 Suspicious Clusters</h3>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Cluster ID</th>
                                <th>Size</th>
                                <th>Fraud Ratio</th>
                                <th>Transactions</th>
                                <th>Density</th>
                            </tr>
                        </thead>
                        <tbody>
                            {graphData.communities.map((c, i) => (
                                <tr key={i}>
                                    <td className="mono">{c.community_id}</td>
                                    <td>{c.size}</td>
                                    <td>
                                        <span style={{ color: c.fraud_ratio > 0.2 ? '#fb7185' : '#fbbf24' }}>
                                            {(c.fraud_ratio * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td>{c.total_transactions}</td>
                                    <td className="mono">{c.density}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
