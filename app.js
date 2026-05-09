/**
 * app.js — Main application controller
 */

(function () {
  'use strict';

  // ── DOM Elements ──
  const canvas = document.getElementById('networkCanvas');
  const overlay = document.getElementById('canvasOverlay');
  const btnStart = document.getElementById('btnStart');
  const btnStop = document.getElementById('btnStop');
  const btnReset = document.getElementById('btnReset');
  const sliderNodes = document.getElementById('nodeCount');
  const sliderSpeed = document.getElementById('animSpeed');
  const sliderLatency = document.getElementById('latencyInterval');
  const valNodes = document.getElementById('nodeCountVal');
  const valSpeed = document.getElementById('animSpeedVal');
  const valLatency = document.getElementById('latencyIntervalVal');
  const statNodes = document.getElementById('statNodes');
  const statEdges = document.getElementById('statEdges');
  const statMST = document.getElementById('statMST');
  const statMSTEdges = document.getElementById('statMSTEdges');
  const statStatus = document.getElementById('statStatus');
  const logContainer = document.getElementById('logContainer');

  // ── State ──
  let graph = null;
  let renderer = null;
  let running = false;
  let animating = false;
  let latencyTimer = null;
  let animFrame = null;

  // Current MST state for rendering
  let mstEdgeSet = new Set();
  let visitedNodes = new Set();
  let activeNodeId = null;
  let activeEdge = null;

  const speedMap = { 1: 'Very Slow', 2: 'Slow', 3: 'Medium', 4: 'Fast', 5: 'Very Fast' };
  const delayMap = { 1: 800, 2: 500, 3: 300, 4: 150, 5: 60 };

  // ── Initialization ──
  function init() {
    renderer = new Renderer(canvas);
    generateGraph();
    render();

    window.addEventListener('resize', () => {
      renderer.resize();
      if (graph) {
        graph.generate(renderer.w, renderer.h);
        resetMSTState();
        updateStats();
        render();
      }
    });
  }

  function generateGraph() {
    const count = parseInt(sliderNodes.value);
    graph = new Graph(count);
    graph.generate(renderer.w, renderer.h);
    resetMSTState();
    updateStats();
    log('Graph generated: ' + graph.nodes.length + ' nodes, ' + graph.edges.length + ' edges', 'info');
  }

  function resetMSTState() {
    mstEdgeSet = new Set();
    visitedNodes = new Set();
    activeNodeId = null;
    activeEdge = null;
  }

  function render() {
    renderer.draw(graph, mstEdgeSet, visitedNodes, activeNodeId, activeEdge, 1);
  }

  // ── Logging ──
  function log(message, type = '') {
    const entry = document.createElement('p');
    entry.className = 'log-entry' + (type ? ' log-' + type : '');
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    entry.textContent = `[${time}] ${message}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Keep log manageable
    while (logContainer.children.length > 100) {
      logContainer.removeChild(logContainer.firstChild);
    }
  }

  // ── Stats ──
  function updateStats() {
    statNodes.textContent = graph.nodes.length;
    statEdges.textContent = graph.edges.length;
  }

  function setStatus(status, className) {
    statStatus.textContent = status;
    statStatus.className = 'stat-value ' + className;
  }

  // ── Animation ──
  async function animatePrim() {
    animating = true;
    setStatus('Animating', 'status-animating');
    overlay.classList.add('hidden');

    const result = PrimMST.compute(graph, graph.getOriginId());
    const delay = delayMap[parseInt(sliderSpeed.value)];

    resetMSTState();
    render();

    for (const step of result.steps) {
      if (!running) break;

      if (step.type === 'add-node') {
        visitedNodes.add(step.nodeId);
        activeNodeId = step.nodeId;
        log(step.message, 'mst');
        render();
        await sleep(delay);
      } else if (step.type === 'add-edge') {
        // Animate edge drawing
        activeEdge = step.edge;
        activeNodeId = step.nodeId;

        const edgeAnimDuration = Math.min(delay, 250);
        const startTime = performance.now();

        await new Promise(resolve => {
          function tick(now) {
            if (!running) { resolve(); return; }
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / edgeAnimDuration);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

            renderer.draw(graph, mstEdgeSet, visitedNodes, activeNodeId, activeEdge, eased);

            if (progress < 1) {
              animFrame = requestAnimationFrame(tick);
            } else {
              resolve();
            }
          }
          animFrame = requestAnimationFrame(tick);
        });

        mstEdgeSet.add(step.edge);
        visitedNodes.add(step.nodeId);
        activeEdge = null;

        statMST.textContent = step.cost + 'ms';
        statMSTEdges.textContent = mstEdgeSet.size;
        log(step.message, 'mst');
        render();
        await sleep(delay * 0.6);
      }
    }

    activeNodeId = null;
    render();
    animating = false;

    if (running) {
      setStatus('Running', 'status-running');
      log(`MST complete — total cost: ${result.totalCost}ms, ${result.mstEdges.length} edges`, 'mst');
      startLatencyUpdates();
    }
  }

  // ── Dynamic Latency ──
  function startLatencyUpdates() {
    stopLatencyUpdates();
    const interval = parseInt(sliderLatency.value) * 1000;
    latencyTimer = setInterval(() => {
      if (!running || animating) return;
      updateLatency();
    }, interval);
  }

  function stopLatencyUpdates() {
    if (latencyTimer) { clearInterval(latencyTimer); latencyTimer = null; }
  }

  async function updateLatency() {
    const changes = graph.randomizeWeights(0.3);
    log(`Latency update: ${changes.length} edges changed`, 'update');

    // Flash changed edges briefly
    render();
    await sleep(300);

    // Recompute MST
    animating = true;
    setStatus('Recomputing', 'status-animating');

    const result = PrimMST.compute(graph, graph.getOriginId());

    // Animate transition: fade out old MST, show new
    const oldMST = new Set(mstEdgeSet);
    resetMSTState();
    render();
    await sleep(200);

    // Re-animate MST quickly
    const fastDelay = 40;
    for (const step of result.steps) {
      if (!running) break;
      if (step.type === 'add-node') {
        visitedNodes.add(step.nodeId);
      } else if (step.type === 'add-edge') {
        mstEdgeSet.add(step.edge);
        visitedNodes.add(step.nodeId);
      }
      render();
      await sleep(fastDelay);
    }

    statMST.textContent = result.totalCost + 'ms';
    statMSTEdges.textContent = result.mstEdges.length;
    log(`MST recomputed — new cost: ${result.totalCost}ms`, 'mst');

    animating = false;
    if (running) setStatus('Running', 'status-running');
  }

  // ── Controls ──
  btnStart.addEventListener('click', () => {
    if (running) return;
    running = true;
    btnStart.disabled = true;
    btnStop.disabled = false;
    sliderNodes.disabled = true;
    animatePrim();
  });

  btnStop.addEventListener('click', () => {
    running = false;
    animating = false;
    btnStart.disabled = false;
    btnStop.disabled = true;
    sliderNodes.disabled = false;
    stopLatencyUpdates();
    if (animFrame) cancelAnimationFrame(animFrame);
    setStatus('Stopped', 'status-idle');
    log('Simulation stopped', 'info');
  });

  btnReset.addEventListener('click', () => {
    running = false;
    animating = false;
    btnStart.disabled = false;
    btnStop.disabled = true;
    sliderNodes.disabled = false;
    stopLatencyUpdates();
    if (animFrame) cancelAnimationFrame(animFrame);

    generateGraph();
    overlay.classList.remove('hidden');
    statMST.textContent = '—';
    statMSTEdges.textContent = '—';
    setStatus('Idle', 'status-idle');
    render();
    log('Graph reset', 'info');
  });

  // ── Sliders ──
  sliderNodes.addEventListener('input', () => { valNodes.textContent = sliderNodes.value; });
  sliderSpeed.addEventListener('input', () => { valSpeed.textContent = speedMap[sliderSpeed.value]; });
  sliderLatency.addEventListener('input', () => {
    valLatency.textContent = sliderLatency.value;
    if (running && !animating) startLatencyUpdates();
  });

  // ── Utility ──
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Boot ──
  init();
})();
