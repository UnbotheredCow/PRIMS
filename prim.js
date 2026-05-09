/**
 * prim.js — Prim's MST algorithm with step recording
 */

class PrimMST {
  /**
   * Run Prim's algorithm and return steps for animation.
   * @param {Graph} graph
   * @param {number} startId - origin node ID
   * @returns {{ mstEdges: Array, totalCost: number, steps: Array }}
   */
  static compute(graph, startId) {
    const n = graph.nodes.length;
    const inMST = new Set();
    const mstEdges = [];
    const steps = [];
    let totalCost = 0;

    // Min-heap using simple array (fine for 40-60 nodes)
    // Each entry: { weight, edge, fromNode, toNode }
    let candidates = [];

    inMST.add(startId);
    steps.push({ type: 'add-node', nodeId: startId, message: `Start from Origin (Node ${startId})` });

    // Add edges from start node
    for (const e of graph.adjacency.get(startId)) {
      const nb = e.u === startId ? e.v : e.u;
      candidates.push({ weight: e.weight, edge: e, toNode: nb });
    }

    while (inMST.size < n && candidates.length > 0) {
      // Sort to get minimum (simple approach, efficient for small graphs)
      candidates.sort((a, b) => a.weight - b.weight);

      // Find the minimum edge that connects to a node not yet in MST
      let chosen = null;
      let chosenIdx = -1;
      for (let i = 0; i < candidates.length; i++) {
        if (!inMST.has(candidates[i].toNode)) {
          chosen = candidates[i];
          chosenIdx = i;
          break;
        }
      }

      if (!chosen) break;

      // Remove chosen and any stale entries
      candidates.splice(chosenIdx, 1);
      candidates = candidates.filter(c => !inMST.has(c.toNode));

      const newNode = chosen.toNode;
      inMST.add(newNode);
      mstEdges.push(chosen.edge);
      totalCost += chosen.weight;

      const nodeType = graph.nodes[newNode].type;
      steps.push({
        type: 'add-edge',
        edge: chosen.edge,
        nodeId: newNode,
        cost: totalCost,
        message: `Add ${nodeType} node ${newNode} (latency: ${chosen.weight}ms, total: ${totalCost}ms)`
      });

      // Add new candidate edges
      for (const e of graph.adjacency.get(newNode)) {
        const nb = e.u === newNode ? e.v : e.u;
        if (!inMST.has(nb)) {
          candidates.push({ weight: e.weight, edge: e, toNode: nb });
        }
      }
    }

    return { mstEdges, totalCost, steps };
  }
}
