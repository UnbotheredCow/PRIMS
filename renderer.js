/**
 * renderer.js — Canvas rendering for the network graph
 */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = rect.width;
    this.h = rect.height;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  /**
   * Draw the full graph state.
   * @param {Graph} graph
   * @param {Set} mstEdgeSet - set of MST edge objects
   * @param {Set} visitedNodes - set of visited node IDs
   * @param {number|null} activeNodeId - currently highlighted node
   * @param {Object|null} activeEdge - currently animated edge
   * @param {number} edgeProgress - 0..1 animation progress for active edge
   */
  draw(graph, mstEdgeSet, visitedNodes, activeNodeId = null, activeEdge = null, edgeProgress = 1) {
    this.clear();
    const ctx = this.ctx;

    // Draw non-MST edges
    for (const e of graph.edges) {
      if (mstEdgeSet.has(e)) continue;
      if (activeEdge === e) continue;
      this._drawEdge(ctx, graph, e, false, 1);
    }

    // Draw MST edges
    for (const e of mstEdgeSet) {
      if (activeEdge === e) continue;
      this._drawEdge(ctx, graph, e, true, 1);
    }

    // Draw active/animating edge
    if (activeEdge) {
      this._drawEdge(ctx, graph, activeEdge, true, edgeProgress);
    }

    // Draw nodes
    for (const node of graph.nodes) {
      this._drawNode(ctx, node, visitedNodes.has(node.id), activeNodeId === node.id);
    }
  }

  _drawEdge(ctx, graph, edge, isMST, progress) {
    const a = graph.nodes[edge.u];
    const b = graph.nodes[edge.v];

    const ex = a.x + (b.x - a.x) * progress;
    const ey = a.y + (b.y - a.y) * progress;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(ex, ey);

    if (isMST) {
      ctx.strokeStyle = 'rgba(34,197,94,0.8)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(34,197,94,0.4)';
      ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Weight label for MST edges
    if (isMST && progress >= 1) {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(34,197,94,0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Background pill
      const tw = ctx.measureText(edge.weight + 'ms').width + 8;
      ctx.fillStyle = 'rgba(10,11,16,0.85)';
      ctx.beginPath();
      ctx.roundRect(mx - tw / 2, my - 8, tw, 16, 4);
      ctx.fill();

      ctx.fillStyle = 'rgba(34,197,94,0.9)';
      ctx.fillText(edge.weight + 'ms', mx, my);
    }
  }

  _drawNode(ctx, node, visited, isActive) {
    const r = node.type === 'origin' ? 10 : node.type === 'fog' ? 8 : 6;
    const colors = {
      origin: { fill: '#ef4444', glow: 'rgba(239,68,68,0.5)' },
      fog: { fill: '#f59e0b', glow: 'rgba(245,158,11,0.4)' },
      edge: { fill: '#3b82f6', glow: 'rgba(59,130,246,0.4)' }
    };
    const c = colors[node.type];

    // Glow for all nodes (dim for unvisited, bright for visited)
    ctx.beginPath();
    ctx.arc(node.x, node.y, r + (isActive ? 14 : visited ? 6 : 4), 0, Math.PI * 2);
    if (isActive) {
      ctx.fillStyle = c.glow;
    } else if (visited) {
      ctx.fillStyle = c.glow.replace(/[\d.]+\)$/, '0.2)');
    } else {
      ctx.fillStyle = c.glow.replace(/[\d.]+\)$/, '0.08)');
    }
    ctx.fill();

    // Outer ring for active
    if (isActive) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = c.fill;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

    if (visited) {
      ctx.fillStyle = c.fill;
      ctx.shadowColor = c.glow;
      ctx.shadowBlur = 12;
    } else {
      ctx.fillStyle = c.fill;
      ctx.globalAlpha = 0.35;
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Border
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = visited ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label — show for all nodes
    ctx.font = '600 9px "Inter", sans-serif';
    ctx.fillStyle = visited ? '#fff' : 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (visited || node.type === 'origin' || node.type === 'fog') {
      ctx.fillText(node.id, node.x, node.y - r - 9);
    }
  }
}
