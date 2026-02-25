"""
Graph-Based Fraud Detection Module (NetworkX)
Builds a transaction graph and detects:
- Suspicious clusters
- High-degree nodes (hubs)
- Centrality-based anomalies
- Rapid fund flow chains
"""
import networkx as nx
import numpy as np
import pandas as pd
import json
import os
from collections import defaultdict


class GraphFraudEngine:
    """
    Builds and analyzes a transaction graph using NetworkX.
    Nodes = Users, Edges = Transactions.
    """

    def __init__(self):
        self.graph = nx.DiGraph()
        self.node_risk_cache = {}
        self.communities = []
        self.stats = {}
        self._built = False

    def build_graph(self, df=None, csv_path=None):
        """
        Build the transaction graph from a DataFrame or CSV.
        """
        if df is None and csv_path:
            if not os.path.exists(csv_path):
                print(f"  [Graph Engine] ERROR: {csv_path} not found")
                return
            df = pd.read_csv(csv_path)

        if df is None:
            print("  [Graph Engine] ERROR: No data provided")
            return

        print("  [Graph Engine] Building transaction graph...")
        self.graph = nx.DiGraph()

        # Add edges from sender to receiver with transaction attributes
        for _, row in df.iterrows():
            sender = row['User_ID']
            receiver = row['Receiver_ID']
            amount = row['Amount']
            fraud = row.get('Fraud_Label', 0)

            if self.graph.has_edge(sender, receiver):
                # Increment edge weight
                self.graph[sender][receiver]['weight'] += 1
                self.graph[sender][receiver]['total_amount'] += amount
                self.graph[sender][receiver]['transactions'].append({
                    'tx_id': row.get('Transaction_ID', ''),
                    'amount': amount,
                    'fraud': int(fraud),
                })
            else:
                self.graph.add_edge(sender, receiver, 
                                   weight=1, 
                                   total_amount=amount,
                                   transactions=[{
                                       'tx_id': row.get('Transaction_ID', ''),
                                       'amount': amount,
                                       'fraud': int(fraud),
                                   }])

            # Node attributes
            for node_id in [sender, receiver]:
                if 'tx_count' not in self.graph.nodes.get(node_id, {}):
                    self.graph.nodes[node_id]['tx_count'] = 0
                    self.graph.nodes[node_id]['fraud_count'] = 0
                    self.graph.nodes[node_id]['total_amount'] = 0.0
                self.graph.nodes[node_id]['tx_count'] += 1
                self.graph.nodes[node_id]['total_amount'] += amount
                if fraud == 1:
                    self.graph.nodes[node_id]['fraud_count'] += 1

        # Calculate centrality metrics
        print("  [Graph Engine] Computing centrality metrics...")
        self._compute_centrality()
        self._detect_communities()
        self._compute_node_risks()

        self.stats = {
            'total_nodes': self.graph.number_of_nodes(),
            'total_edges': self.graph.number_of_edges(),
            'num_communities': len(self.communities),
            'avg_degree': round(sum(dict(self.graph.degree()).values()) / max(self.graph.number_of_nodes(), 1), 2),
        }

        self._built = True
        print(f"  [Graph Engine] Graph built: {self.stats['total_nodes']} nodes, {self.stats['total_edges']} edges, {self.stats['num_communities']} communities")

    def _compute_centrality(self):
        """Compute various centrality metrics for each node."""
        # Degree centrality
        degree_centrality = nx.degree_centrality(self.graph)

        # In/out degree centrality
        in_degree = nx.in_degree_centrality(self.graph)
        out_degree = nx.out_degree_centrality(self.graph)

        # Betweenness centrality (sampled for large graphs)
        n_nodes = self.graph.number_of_nodes()
        k = min(500, n_nodes) if n_nodes > 500 else None
        betweenness = nx.betweenness_centrality(self.graph, k=k)

        # PageRank
        try:
            pagerank = nx.pagerank(self.graph, alpha=0.85, max_iter=100)
        except:
            pagerank = {n: 0.0 for n in self.graph.nodes()}

        for node in self.graph.nodes():
            self.graph.nodes[node]['degree_centrality'] = round(degree_centrality.get(node, 0), 6)
            self.graph.nodes[node]['in_degree_centrality'] = round(in_degree.get(node, 0), 6)
            self.graph.nodes[node]['out_degree_centrality'] = round(out_degree.get(node, 0), 6)
            self.graph.nodes[node]['betweenness_centrality'] = round(betweenness.get(node, 0), 6)
            self.graph.nodes[node]['pagerank'] = round(pagerank.get(node, 0), 6)

    def _detect_communities(self):
        """Detect suspicious communities using connected components on undirected version."""
        undirected = self.graph.to_undirected()
        components = list(nx.connected_components(undirected))

        self.communities = []
        for idx, comp in enumerate(components):
            if len(comp) >= 3:  # Only consider clusters of 3+ nodes
                subgraph = self.graph.subgraph(comp)
                total_fraud = sum(self.graph.nodes[n].get('fraud_count', 0) for n in comp)
                total_tx = sum(self.graph.nodes[n].get('tx_count', 0) for n in comp)
                fraud_ratio = total_fraud / max(total_tx, 1)

                self.communities.append({
                    'community_id': f"COMM_{idx}",
                    'size': len(comp),
                    'nodes': list(comp),
                    'fraud_ratio': round(fraud_ratio, 4),
                    'total_transactions': total_tx,
                    'density': round(nx.density(subgraph), 4),
                    'is_suspicious': fraud_ratio > 0.15 or len(comp) >= 10,
                })

    def _compute_node_risks(self):
        """Compute a graph-based risk score for each node (0-1)."""
        if self.graph.number_of_nodes() == 0:
            return

        # Normalize metrics
        max_degree = max(dict(self.graph.degree()).values()) or 1
        max_pagerank = max(nx.get_node_attributes(self.graph, 'pagerank').values()) or 1
        max_betweenness = max(nx.get_node_attributes(self.graph, 'betweenness_centrality').values()) or 1

        for node in self.graph.nodes():
            node_data = self.graph.nodes[node]
            
            # Factor 1: Fraud history ratio
            fraud_ratio = node_data.get('fraud_count', 0) / max(node_data.get('tx_count', 1), 1)
            
            # Factor 2: Normalized degree (high connectivity = suspicious in fraud context)
            norm_degree = self.graph.degree(node) / max_degree
            
            # Factor 3: Betweenness (intermediary nodes in fund flow)
            norm_betweenness = node_data.get('betweenness_centrality', 0) / max_betweenness
            
            # Factor 4: PageRank anomaly
            norm_pagerank = node_data.get('pagerank', 0) / max_pagerank
            
            # Factor 5: Is in a suspicious community?
            in_suspicious_community = 0
            for comm in self.communities:
                if node in comm['nodes'] and comm['is_suspicious']:
                    in_suspicious_community = 1
                    break

            # Weighted graph risk
            risk = (
                0.35 * fraud_ratio +
                0.20 * norm_degree +
                0.15 * norm_betweenness +
                0.10 * norm_pagerank +
                0.20 * in_suspicious_community
            )

            self.node_risk_cache[node] = round(min(risk, 1.0), 4)
            self.graph.nodes[node]['graph_risk'] = self.node_risk_cache[node]

    def get_node_risk(self, user_id):
        """Get graph risk score for a specific user (0-1)."""
        if not self._built:
            return 0.0
        return self.node_risk_cache.get(user_id, 0.0)

    def get_node_details(self, user_id):
        """Get detailed graph info for a user node."""
        if not self._built or user_id not in self.graph.nodes:
            return {
                'user_id': user_id,
                'graph_risk': 0.0,
                'degree': 0,
                'neighbors': [],
                'in_suspicious_cluster': False,
                'message': 'Node not found in graph',
            }

        node_data = self.graph.nodes[user_id]
        neighbors = list(self.graph.neighbors(user_id))
        predecessors = list(self.graph.predecessors(user_id))

        in_cluster = False
        cluster_id = None
        for comm in self.communities:
            if user_id in comm['nodes'] and comm['is_suspicious']:
                in_cluster = True
                cluster_id = comm['community_id']
                break

        return {
            'user_id': user_id,
            'graph_risk': self.node_risk_cache.get(user_id, 0.0),
            'degree': self.graph.degree(user_id),
            'in_degree': self.graph.in_degree(user_id),
            'out_degree': self.graph.out_degree(user_id),
            'degree_centrality': node_data.get('degree_centrality', 0),
            'betweenness_centrality': node_data.get('betweenness_centrality', 0),
            'pagerank': node_data.get('pagerank', 0),
            'tx_count': node_data.get('tx_count', 0),
            'fraud_count': node_data.get('fraud_count', 0),
            'total_amount': round(node_data.get('total_amount', 0), 2),
            'neighbors_out': neighbors[:20],
            'neighbors_in': predecessors[:20],
            'in_suspicious_cluster': in_cluster,
            'cluster_id': cluster_id,
        }

    def get_graph_data_for_visualization(self, max_nodes=200):
        """
        Returns graph data in a format suitable for frontend visualization.
        Limits to the most connected/risky nodes for performance.
        """
        if not self._built:
            return {'nodes': [], 'edges': [], 'stats': {}}

        # Select top nodes by risk and degree
        node_scores = [(n, self.node_risk_cache.get(n, 0), self.graph.degree(n))
                       for n in self.graph.nodes()]
        node_scores.sort(key=lambda x: (x[1], x[2]), reverse=True)
        selected_nodes = set(n for n, _, _ in node_scores[:max_nodes])

        nodes = []
        for node in selected_nodes:
            data = self.graph.nodes[node]
            nodes.append({
                'id': node,
                'risk': self.node_risk_cache.get(node, 0),
                'degree': self.graph.degree(node),
                'fraud_count': data.get('fraud_count', 0),
                'tx_count': data.get('tx_count', 0),
                'pagerank': data.get('pagerank', 0),
                'is_fraud': data.get('fraud_count', 0) > 0,
            })

        edges = []
        for u, v, data in self.graph.edges(data=True):
            if u in selected_nodes and v in selected_nodes:
                edges.append({
                    'source': u,
                    'target': v,
                    'weight': data.get('weight', 1),
                    'total_amount': round(data.get('total_amount', 0), 2),
                })

        return {
            'nodes': nodes,
            'edges': edges,
            'stats': self.stats,
            'communities': [c for c in self.communities if c['is_suspicious']],
        }

    def get_fund_flow_chain(self, user_id, depth=3):
        """
        Trace fund flow chains from a user (detecting rapid fund movement).
        """
        if not self._built or user_id not in self.graph:
            return []

        chains = []
        visited = set()

        def dfs(node, path, current_depth):
            if current_depth >= depth:
                if len(path) > 1:
                    chains.append(list(path))
                return
            visited.add(node)
            for neighbor in self.graph.neighbors(node):
                if neighbor not in visited:
                    edge = self.graph[node][neighbor]
                    path.append({
                        'from': node,
                        'to': neighbor,
                        'amount': round(edge.get('total_amount', 0), 2),
                        'tx_count': edge.get('weight', 0),
                    })
                    dfs(neighbor, path, current_depth + 1)
                    path.pop()
            visited.discard(node)

        dfs(user_id, [], 0)
        return chains[:10]  # Limit to 10 chains

    def get_suspicious_clusters(self):
        """Return all suspicious communities."""
        if not self._built:
            return []
        return [c for c in self.communities if c['is_suspicious']]


# Singleton instance
_graph_engine = None


def get_graph_engine():
    global _graph_engine
    if _graph_engine is None:
        _graph_engine = GraphFraudEngine()
    return _graph_engine


def init_graph_engine(csv_path='data/synthetic_upi_transactions.csv'):
    """Initialize and build graph from dataset."""
    engine = get_graph_engine()
    engine.build_graph(csv_path=csv_path)
    return engine
