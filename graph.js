/**
 * graph.js — Graph generation and data structures
 */

class Graph {
  constructor(nodeCount = 45) {
    this.nodes = [];
    this.edges = [];
    this.adjacency = new Map();
    this.nodeCount = Math.max(20, Math.min(60, nodeCount));
  }

  generate(canvasW, canvasH) {
    this.nodes = [];
    this.edges = [];
    this.adjacency.clear();

    const pad = 60;
    const w = canvasW - pad * 2;
    const h = canvasH - pad * 2;

    // Place nodes with Poisson-like spacing
    const minDist = Math.min(w, h) / Math.sqrt(this.nodeCount) * 0.75;
    const attempts = 80;

    for (let i = 0; i < this.nodeCount; i++) {
      let placed = false;
      for (let a = 0; a < attempts; a++) {
        const x = pad + Math.random() * w;
        const y = pad + Math.random() * h;
        let tooClose = false;
        for (const n of this.nodes) {
          if (Math.hypot(n.x - x, n.y - y) < minDist) { tooClose = true; break; }
        }
        if (!tooClose) {
          this.nodes.push({ id: i, x, y, type: 'edge' });
          this.adjacency.set(i, []);
          placed = true;
          break;
        }
      }
      if (!placed) {
        const x = pad + Math.random() * w;
        const y = pad + Math.random() * h;
        this.nodes.push({ id: i, x, y, type: 'edge' });
        this.adjacency.set(i, []);
      }
    }

    // Assign node types
    // Origin: node closest to center
    const cx = canvasW / 2, cy = canvasH / 2;
    let originIdx = 0, minD = Infinity;
    for (let i = 0; i < this.nodes.length; i++) {
      const d = Math.hypot(this.nodes[i].x - cx, this.nodes[i].y - cy);
      if (d < minD) { minD = d; originIdx = i; }
    }
    this.nodes[originIdx].type = 'origin';

    // Fog nodes: 4-6 nodes spread around
    const fogCount = 4 + Math.floor(Math.random() * 3);
    const sorted = [...this.nodes]
      .filter(n => n.type !== 'origin')
      .sort((a, b) => {
        const da = Math.hypot(a.x - cx, a.y - cy);
        const db = Math.hypot(b.x - cx, b.y - cy);
        return da - db;
      });

    // Pick fog nodes evenly distributed
    const step = Math.floor(sorted.length / (fogCount + 1));
    for (let i = 0; i < fogCount; i++) {
      sorted[step * (i + 1)].type = 'fog';
    }

    // Generate edges — connect nearby nodes
    this._generateEdges();

    return this;
  }

  _generateEdges() {
    this.edges = [];
    for (const adj of this.adjacency.values()) adj.length = 0;

    const maxEdgeDist = this._calcMaxEdgeDist();

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const d = Math.hypot(this.nodes[i].x - this.nodes[j].x, this.nodes[i].y - this.nodes[j].y);
        if (d < maxEdgeDist) {
          const weight = Math.round(5 + Math.random() * 95); // latency 5-100ms
          this._addEdge(i, j, weight);
        }
      }
    }

    // Ensure connectivity with a spanning connection pass
    this._ensureConnected();
  }

  _calcMaxEdgeDist() {
    // Calculate distance that gives ~3-5 edges per node on average
    const dists = [];
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        dists.push(Math.hypot(this.nodes[i].x - this.nodes[j].x, this.nodes[i].y - this.nodes[j].y));
      }
    }
    dists.sort((a, b) => a - b);
    const targetEdges = this.nodes.length * 3;
    return dists[Math.min(targetEdges, dists.length - 1)] * 1.1;
  }

  _addEdge(u, v, weight) {
    const edge = { u, v, weight };
    this.edges.push(edge);
    this.adjacency.get(u).push(edge);
    this.adjacency.get(v).push(edge);
  }

  _ensureConnected() {
    // BFS to find components, then connect them
    const visited = new Set();
    const components = [];

    for (let i = 0; i < this.nodes.length; i++) {
      if (visited.has(i)) continue;
      const comp = [];
      const queue = [i];
      visited.add(i);
      while (queue.length) {
        const cur = queue.shift();
        comp.push(cur);
        for (const e of this.adjacency.get(cur)) {
          const nb = e.u === cur ? e.v : e.u;
          if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
        }
      }
      components.push(comp);
    }

    // Connect components
    for (let c = 1; c < components.length; c++) {
      let bestDist = Infinity, bestI = 0, bestJ = 0;
      for (const i of components[0]) {
        for (const j of components[c]) {
          const d = Math.hypot(this.nodes[i].x - this.nodes[j].x, this.nodes[i].y - this.nodes[j].y);
          if (d < bestDist) { bestDist = d; bestI = i; bestJ = j; }
        }
      }
      const weight = Math.round(5 + Math.random() * 95);
      this._addEdge(bestI, bestJ, weight);
      components[0].push(...components[c]);
    }
  }

  getOriginId() {
    return this.nodes.find(n => n.type === 'origin')?.id ?? 0;
  }

  randomizeWeights(fraction = 0.3) {
    const count = Math.floor(this.edges.length * fraction);
    const indices = [];
    while (indices.length < count) {
      const idx = Math.floor(Math.random() * this.edges.length);
      if (!indices.includes(idx)) indices.push(idx);
    }
    const changed = [];
    for (const idx of indices) {
      const old = this.edges[idx].weight;
      const delta = Math.round((Math.random() - 0.5) * 40);
      this.edges[idx].weight = Math.max(5, Math.min(100, old + delta));
      changed.push({ edge: this.edges[idx], oldWeight: old });
    }
    return changed;
  }
}
