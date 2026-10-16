/**
 * LogicFlow PRO — Application Controller
 * Coordinates UI interactions, Drag & Drop, Canvas Mouse Handlers,
 * Keyboard Shortcuts, Undo/Redo, Clock Timer, and Modals.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Core Systems
  const canvas = document.getElementById('circuitCanvas');
  const circuit = new Circuit();
  const renderer = new CircuitRenderer(canvas, circuit);
  const ttGenerator = new TruthTableGenerator(circuit);
  const aiCopilot = new AICircuitCopilot(circuit);
  let generatedAiData = null;

  // Settings
  let snapToGrid = true;
  const gridSize = 15;

  // Multi-Tab Circuit Workspaces
  const tabsList = document.getElementById('tabsList');
  const newTabBtn = document.getElementById('newTabBtn');
  let circuitTabs = [];
  let activeTabId = null;

  // Interaction State
  let isDraggingGate = false;
  let dragGateOffset = { x: 0, y: 0 };
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let isSpacePressed = false;
  let currentTruthTableData = null;
  let mouseDownGateId = null;
  let gateHasDragged = false;

  // DOM Elements
  const presetSelect = document.getElementById('presetSelect');
  const loadPresetBtn = document.getElementById('loadPresetBtn');
  const truthTableBtn = document.getElementById('truthTableBtn');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const clearBtn = document.getElementById('clearBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const importJsonBtn = document.getElementById('importJsonBtn');
  const exportImageBtn = document.getElementById('exportImageBtn');
  const helpBtn = document.getElementById('helpBtn');

  // Canvas Tools
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomResetBtn = document.getElementById('zoomResetBtn');
  const zoomLevelDisplay = document.getElementById('zoomLevelDisplay');
  const snapGridBtn = document.getElementById('snapGridBtn');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');

  // Modals
  const truthTableModal = document.getElementById('truthTableModal');
  const closeTruthTableBtn = document.getElementById('closeTruthTableBtn');
  const doneTruthTableBtn = document.getElementById('doneTruthTableBtn');
  const ttHead = document.getElementById('ttHead');
  const ttBody = document.getElementById('ttBody');
  const ttSummary = document.getElementById('ttSummary');
  const copyTtCsvBtn = document.getElementById('copyTtCsvBtn');
  const copyTtMdBtn = document.getElementById('copyTtMdBtn');

  const jsonModal = document.getElementById('jsonModal');
  const closeJsonModalBtn = document.getElementById('closeJsonModalBtn');
  const jsonTextArea = document.getElementById('jsonTextArea');
  const copyJsonBtn = document.getElementById('copyJsonBtn');
  const downloadJsonFileBtn = document.getElementById('downloadJsonFileBtn');
  const applyJsonBtn = document.getElementById('applyJsonBtn');
  const fileDropZone = document.getElementById('fileDropZone');
  const jsonFileInput = document.getElementById('jsonFileInput');
  const importFileInput = document.getElementById('importFileInput');

  // AI Assistant Chat Elements
  const toggleChatBtn = document.getElementById('toggleChatBtn');
  const aiSidebarBtn = document.getElementById('aiSidebarBtn');
  const aiChatDrawer = document.getElementById('aiChatDrawer');
  const closeChatBtn = document.getElementById('closeChatBtn');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');

  const helpModal = document.getElementById('helpModal');
  const closeHelpModalBtn = document.getElementById('closeHelpModalBtn');
  const doneHelpBtn = document.getElementById('doneHelpBtn');

  // Status & Alerts
  const statGateCount = document.getElementById('statGateCount');
  const statWireCount = document.getElementById('statWireCount');
  const statInputCount = document.getElementById('statInputCount');
  const statOutputCount = document.getElementById('statOutputCount');
  const feedbackLoopAlert = document.getElementById('feedbackLoopAlert');
  const notificationToast = document.getElementById('notificationToast');

  // 2. Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // 3. Initialize Tab 1 with Half Adder (Must-Have Requirement!)
  createTab('⭐ Half Adder', PRESETS['half-adder'], 'cpu', true);

  // Start 60 FPS Render Loop
  renderer.startRenderLoop();

  // 4. Periodic Clock Generator Timer (1 Hz pulse)
  setInterval(() => {
    let clockExists = false;
    circuit.gates.forEach(gate => {
      if (gate.type === 'CLOCK') {
        clockExists = true;
        gate.state = gate.state === 1 ? 0 : 1;
        gate.computeLogic();
      }
    });
    if (clockExists) {
      circuit.evaluate();
      updateUIStats();
    }
  }, 600);

  // =========================================================================
  // Multi-Tab Circuit Workspaces Engine
  // =========================================================================

  function createTab(title, circuitData, icon = 'cpu', makeActive = true) {
    const tabId = 'tab_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const data = circuitData ? JSON.parse(JSON.stringify(circuitData)) : { version: '1.0', gates: [], wires: [] };

    const tab = {
      id: tabId,
      title: title || 'New Circuit',
      icon: icon,
      circuitData: data,
      history: [],
      historyIndex: -1,
      panX: 30,
      panY: 50,
      zoom: 1.0
    };

    circuitTabs.push(tab);

    if (makeActive) {
      switchTab(tabId);
    } else {
      renderTabs();
    }
    return tab;
  }

  function switchTab(tabId) {
    // 1. Save state of current active tab before switching
    if (activeTabId) {
      const current = circuitTabs.find(t => t.id === activeTabId);
      if (current) {
        current.circuitData = circuit.serialize();
        current.history = [...circuit.history];
        current.historyIndex = circuit.historyIndex;
        current.panX = renderer.panX;
        current.panY = renderer.panY;
        current.zoom = renderer.zoom;
      }
    }

    // 2. Set new active tab
    activeTabId = tabId;
    const target = circuitTabs.find(t => t.id === tabId);
    if (target) {
      circuit.deserialize(target.circuitData);
      circuit.history = target.history && target.history.length > 0 ? [...target.history] : [circuit.serialize()];
      circuit.historyIndex = target.historyIndex >= 0 ? target.historyIndex : 0;
      renderer.panX = target.panX || 30;
      renderer.panY = target.panY || 50;
      renderer.zoom = target.zoom || 1.0;
      updateZoomDisplay();
      updateUIStats();
    }

    renderTabs();
  }

  function closeTab(tabId, e) {
    if (e) e.stopPropagation();
    if (circuitTabs.length <= 1) {
      // Don't close the only tab; just clear it
      circuit.clear();
      circuit.snapshot();
      updateUIStats();
      const current = circuitTabs[0];
      if (current) {
        current.title = 'Blank Circuit';
        current.circuitData = circuit.serialize();
      }
      renderTabs();
      showToast('Reset to blank canvas', 'info');
      return;
    }

    const index = circuitTabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    circuitTabs.splice(index, 1);

    // If closing active tab, switch to adjacent tab
    if (activeTabId === tabId) {
      const nextIndex = Math.min(index, circuitTabs.length - 1);
      switchTab(circuitTabs[nextIndex].id);
    } else {
      renderTabs();
    }
  }

  function renderTabs() {
    tabsList.innerHTML = '';
    circuitTabs.forEach(tab => {
      const isActive = tab.id === activeTabId;
      const tabEl = document.createElement('div');
      tabEl.className = `tab-item ${isActive ? 'active' : ''}`;
      
      const iconMarkup = tab.icon === 'sparkles' 
        ? '<i data-lucide="sparkles" class="icon-xs text-purple-ai"></i>' 
        : '<i data-lucide="cpu" class="icon-xs"></i>';

      const closeMarkup = circuitTabs.length > 1 
        ? `<span class="tab-close" title="Close Tab">×</span>` 
        : '';

      tabEl.innerHTML = `
        ${iconMarkup}
        <span>${escapeHtml(tab.title)}</span>
        ${closeMarkup}
      `;

      tabEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-close')) {
          closeTab(tab.id, e);
        } else {
          switchTab(tab.id);
        }
      });

      tabsList.appendChild(tabEl);
    });

    if (window.lucide) lucide.createIcons();
  }

  newTabBtn.addEventListener('click', () => {
    createTab(`Circuit ${circuitTabs.length + 1}`, { version: '1.0', gates: [], wires: [] }, 'cpu', true);
    showToast('Created new blank circuit tab', 'info');
  });

  // =========================================================================
  // Helper & Preset Functions
  // =========================================================================

  function loadCircuitPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;

    try {
      circuit.deserialize(JSON.parse(JSON.stringify(preset)));
      circuit.snapshot();
      updateUIStats();

      const title = presetSelect.options[presetSelect.selectedIndex]?.text || name;
      
      // Update active tab title
      const currentTab = circuitTabs.find(t => t.id === activeTabId);
      if (currentTab) {
        currentTab.title = title;
        currentTab.circuitData = circuit.serialize();
        renderTabs();
      }

      showToast(`Loaded ${title}`, 'success');

      // Center viewport if needed
      renderer.panX = 30;
      renderer.panY = 50;
      renderer.zoom = 1.0;
      updateZoomDisplay();
    } catch (err) {
      console.error('Failed to load preset', err);
      showToast('Error loading preset circuit', 'danger');
    }
  }

  function updateUIStats() {
    let inputCount = 0;
    let outputCount = 0;

    circuit.gates.forEach(g => {
      if (g.type === 'SWITCH' || g.type === 'CLOCK') inputCount++;
      if (g.type === 'BULB' || g.type === 'DISPLAY_7SEG') outputCount++;
    });

    statGateCount.textContent = circuit.gates.size;
    statWireCount.textContent = circuit.wires.length;
    statInputCount.textContent = inputCount;
    statOutputCount.textContent = outputCount;

    // Feedback Loop Warning
    if (circuit.feedbackLoopDetected) {
      feedbackLoopAlert.classList.remove('hidden');
    } else {
      feedbackLoopAlert.classList.add('hidden');
    }

    // Undo / Redo button states
    undoBtn.disabled = circuit.historyIndex <= 0;
    redoBtn.disabled = circuit.historyIndex >= circuit.history.length - 1;
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    notificationToast.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  function snap(val) {
    if (!snapToGrid) return val;
    return Math.round(val / gridSize) * gridSize;
  }

  function updateZoomDisplay() {
    zoomLevelDisplay.textContent = `${Math.round(renderer.zoom * 100)}%`;
  }

  // =========================================================================
  // Canvas Mouse & Interaction Events
  // =========================================================================

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const world = renderer.screenToWorld(mouseX, mouseY);

    // Pan with Middle Mouse or Spacebar + Left Mouse
    if (e.button === 1 || (e.button === 0 && isSpacePressed)) {
      isPanning = true;
      panStart = { x: e.clientX - renderer.panX, y: e.clientY - renderer.panY };
      canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button === 0) {
      // 1. Check if clicked on a connection pin
      const hitPin = renderer.findPinAt(world.x, world.y);
      if (hitPin) {
        renderer.dragWireStart = {
          gateId: hitPin.gateId,
          pinType: hitPin.type,
          pinIndex: hitPin.index,
          x: hitPin.x,
          y: hitPin.y
        };
        renderer.dragWireCurrentPos = { x: hitPin.x, y: hitPin.y };
        return;
      }

      // 2. Check if clicked on a gate
      const hitGate = renderer.findGateAt(world.x, world.y);
      if (hitGate) {
        renderer.selectedGateId = hitGate.id;
        renderer.selectedWireId = null;
        isDraggingGate = true;
        gateHasDragged = false;
        mouseDownGateId = hitGate.id;
        dragGateOffset = {
          x: world.x - hitGate.x,
          y: world.y - hitGate.y
        };
        return;
      }

      // 3. Check if clicked on a wire
      const hitWire = renderer.findWireAt(world.x, world.y);
      if (hitWire) {
        renderer.selectedWireId = hitWire.id;
        renderer.selectedGateId = null;
        return;
      }

      // 4. Clicked empty space -> deselect
      renderer.selectedGateId = null;
      renderer.selectedWireId = null;

      // Start drag-panning on background
      isPanning = true;
      panStart = { x: e.clientX - renderer.panX, y: e.clientY - renderer.panY };
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const world = renderer.screenToWorld(mouseX, mouseY);

    // Update hover states
    renderer.hoveredPin = renderer.findPinAt(world.x, world.y);
    renderer.hoveredGateId = renderer.findGateAt(world.x, world.y)?.id || null;
    renderer.hoveredWireId = renderer.findWireAt(world.x, world.y)?.id || null;

    // Handle Active Wire Dragging
    if (renderer.dragWireStart) {
      // Snap wire tip to hovered pin if near
      if (renderer.hoveredPin) {
        renderer.dragWireCurrentPos = { x: renderer.hoveredPin.x, y: renderer.hoveredPin.y };
      } else {
        renderer.dragWireCurrentPos = { x: world.x, y: world.y };
      }
      return;
    }

    // Handle Gate Dragging
    if (isDraggingGate && renderer.selectedGateId) {
      gateHasDragged = true;
      const gate = circuit.getGate(renderer.selectedGateId);
      if (gate) {
        gate.x = snap(world.x - dragGateOffset.x);
        gate.y = snap(world.y - dragGateOffset.y);
        circuit.isDirty = true;
      }
      return;
    }

    // Handle Viewport Panning
    if (isPanning) {
      renderer.panX = e.clientX - panStart.x;
      renderer.panY = e.clientY - panStart.y;
      return;
    }

    // Update cursor style
    if (renderer.hoveredPin) {
      canvas.style.cursor = 'crosshair';
    } else if (renderer.hoveredGateId) {
      canvas.style.cursor = 'pointer';
    } else if (renderer.hoveredWireId) {
      canvas.style.cursor = 'pointer';
    } else if (isSpacePressed) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = 'default';
    }
  });

  window.addEventListener('mouseup', (e) => {
    // 1. Finish Wire Drag
    if (renderer.dragWireStart) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const world = renderer.screenToWorld(mouseX, mouseY);
      const targetPin = renderer.findPinAt(world.x, world.y);

      if (targetPin) {
        const start = renderer.dragWireStart;

        // Valid wiring: One Output pin -> One Input pin
        let fromGateId, fromPinIndex, toGateId, toPinIndex;

        if (start.pinType === 'out' && targetPin.type === 'in') {
          fromGateId = start.gateId;
          fromPinIndex = start.pinIndex;
          toGateId = targetPin.gateId;
          toPinIndex = targetPin.index;
        } else if (start.pinType === 'in' && targetPin.type === 'out') {
          fromGateId = targetPin.gateId;
          fromPinIndex = targetPin.index;
          toGateId = start.gateId;
          toPinIndex = start.pinIndex;
        }

        if (fromGateId && toGateId) {
          const wire = circuit.addWire(fromGateId, fromPinIndex, toGateId, toPinIndex);
          if (wire) {
            circuit.snapshot();
            updateUIStats();
            showToast('Connected wire', 'success');
          }
        }
      }

      renderer.dragWireStart = null;
      renderer.dragWireCurrentPos = null;
    }

    // 2. Finish Gate Drag / Toggle
    if (isDraggingGate) {
      isDraggingGate = false;
      if (mouseDownGateId && !gateHasDragged) {
        const clickedGate = circuit.getGate(mouseDownGateId);
        if (clickedGate && clickedGate.type === 'SWITCH') {
          clickedGate.state = clickedGate.state === 1 ? 0 : 1;
          clickedGate.computeLogic();
          circuit.evaluate();
          updateUIStats();
        }
      }
      mouseDownGateId = null;
      circuit.snapshot();
      updateUIStats();
    }

    // 3. Finish Panning
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = isSpacePressed ? 'grab' : 'default';
    }
  });

  // Canvas Mouse Wheel: Smooth Zoom centered around mouse
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(renderer.maxZoom, Math.max(renderer.minZoom, renderer.zoom * zoomFactor));

    if (newZoom !== renderer.zoom) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Maintain mouse anchor position
      renderer.panX = mouseX - (mouseX - renderer.panX) * (newZoom / renderer.zoom);
      renderer.panY = mouseY - (mouseY - renderer.panY) * (newZoom / renderer.zoom);
      renderer.zoom = newZoom;
      updateZoomDisplay();
    }
  }, { passive: false });

  // =========================================================================
  // Drag and Drop from Sidebar Component Palette
  // =========================================================================

  const paletteCards = document.querySelectorAll('.palette-card');
  paletteCards.forEach(card => {
    // Native Drag onto Canvas
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.dataset.type);
    });

    // Quick Click to place in center
    card.addEventListener('click', () => {
      const type = card.dataset.type;
      const centerScreen = { x: canvas.width / (2 * renderer.dpr), y: canvas.height / (2 * renderer.dpr) };
      const worldCenter = renderer.screenToWorld(centerScreen.x, centerScreen.y);

      // Add slight random offset to prevent stacking on top of each other
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 40;

      const gate = circuit.addGate(type, snap(worldCenter.x + offsetX), snap(worldCenter.y + offsetY));
      renderer.selectedGateId = gate.id;
      circuit.evaluate();
      circuit.snapshot();
      updateUIStats();
      showToast(`Placed ${type} gate`, 'info');
    });
  });

  canvas.addEventListener('dragover', (e) => e.preventDefault());

  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('text/plain');
    if (!type) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const world = renderer.screenToWorld(mouseX, mouseY);

    const gate = circuit.addGate(type, snap(world.x - 40), snap(world.y - 25));
    renderer.selectedGateId = gate.id;
    circuit.evaluate();
    circuit.snapshot();
    updateUIStats();
    showToast(`Added ${type}`, 'info');
  });

  // =========================================================================
  // Keyboard Shortcuts (Del, Undo, Redo, Space Pan)
  // =========================================================================

  window.addEventListener('keydown', (e) => {
    // Don't intercept when typing in modal inputs/textareas
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Delete selected gate or wire
    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelected();
    }

    // Undo: Ctrl+Z
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      handleUndo();
    }

    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault();
      handleRedo();
    }

    // Spacebar for Panning
    if (e.code === 'Space' && !isSpacePressed) {
      isSpacePressed = true;
      canvas.style.cursor = 'grab';
    }

    // Esc to deselect / cancel
    if (e.key === 'Escape') {
      renderer.selectedGateId = null;
      renderer.selectedWireId = null;
      renderer.dragWireStart = null;
      closeAllModals();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      isSpacePressed = false;
      canvas.style.cursor = 'default';
    }
  });

  function deleteSelected() {
    let deleted = false;
    if (renderer.selectedGateId) {
      circuit.removeGate(renderer.selectedGateId);
      renderer.selectedGateId = null;
      deleted = true;
    } else if (renderer.selectedWireId) {
      circuit.removeWire(renderer.selectedWireId);
      renderer.selectedWireId = null;
      deleted = true;
    }

    if (deleted) {
      circuit.snapshot();
      updateUIStats();
      showToast('Deleted item and detached wires', 'warning');
    }
  }

  function handleUndo() {
    if (circuit.undo()) {
      renderer.selectedGateId = null;
      renderer.selectedWireId = null;
      updateUIStats();
      showToast('Undo', 'info');
    }
  }

  function handleRedo() {
    if (circuit.redo()) {
      renderer.selectedGateId = null;
      renderer.selectedWireId = null;
      updateUIStats();
      showToast('Redo', 'info');
    }
  }

  // =========================================================================
  // Header Actions & Buttons
  // =========================================================================

  loadPresetBtn.addEventListener('click', () => {
    loadCircuitPreset(presetSelect.value);
  });

  presetSelect.addEventListener('change', () => {
    loadCircuitPreset(presetSelect.value);
  });

  undoBtn.addEventListener('click', handleUndo);
  redoBtn.addEventListener('click', handleRedo);

  clearBtn.addEventListener('click', () => {
    if (confirm('Clear entire canvas?')) {
      circuit.clear();
      circuit.snapshot();
      renderer.selectedGateId = null;
      renderer.selectedWireId = null;
      updateUIStats();
      showToast('Canvas cleared', 'info');
    }
  });

  // Canvas Zoom Controls
  zoomInBtn.addEventListener('click', () => {
    renderer.zoom = Math.min(renderer.maxZoom, renderer.zoom * 1.2);
    updateZoomDisplay();
  });

  zoomOutBtn.addEventListener('click', () => {
    renderer.zoom = Math.max(renderer.minZoom, renderer.zoom / 1.2);
    updateZoomDisplay();
  });

  zoomResetBtn.addEventListener('click', () => {
    renderer.zoom = 1.0;
    renderer.panX = 30;
    renderer.panY = 40;
    updateZoomDisplay();
  });

  snapGridBtn.addEventListener('click', () => {
    snapToGrid = !snapToGrid;
    snapGridBtn.classList.toggle('active', snapToGrid);
    showToast(snapToGrid ? 'Snap to Grid: ON' : 'Snap to Grid: OFF', 'info');
  });

  deleteSelectedBtn.addEventListener('click', deleteSelected);

  // =========================================================================
  // Truth Table Generator Modal (Must-Have Requirement)
  // =========================================================================

  truthTableBtn.addEventListener('click', () => {
    currentTruthTableData = ttGenerator.generate();
    ttGenerator.renderToDOM(currentTruthTableData, ttHead, ttBody, ttSummary);
    truthTableModal.classList.remove('hidden');

    // Trigger subtle confetti celebration if valid table with results
    if (currentTruthTableData.success && window.confetti) {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  });

  closeTruthTableBtn.addEventListener('click', () => truthTableModal.classList.add('hidden'));
  doneTruthTableBtn.addEventListener('click', () => truthTableModal.classList.add('hidden'));

  copyTtCsvBtn.addEventListener('click', () => {
    if (!currentTruthTableData) return;
    const csv = ttGenerator.toCSV(currentTruthTableData);
    navigator.clipboard.writeText(csv).then(() => {
      showToast('Copied Truth Table CSV to clipboard!', 'success');
    });
  });

  copyTtMdBtn.addEventListener('click', () => {
    if (!currentTruthTableData) return;
    const md = ttGenerator.toMarkdown(currentTruthTableData);
    navigator.clipboard.writeText(md).then(() => {
      showToast('Copied Truth Table Markdown to clipboard!', 'success');
    });
  });

  // =========================================================================
  // Export & Import JSON Modals (Stretch Goal)
  // =========================================================================

  exportJsonBtn.addEventListener('click', () => {
    const jsonStr = JSON.stringify(circuit.serialize(), null, 2);
    jsonTextArea.value = jsonStr;
    document.getElementById('jsonModalTitle').textContent = 'Export Circuit JSON';
    applyJsonBtn.style.display = 'none';
    downloadJsonFileBtn.style.display = 'inline-flex';
    jsonModal.classList.remove('hidden');
  });

  importJsonBtn.addEventListener('click', () => {
    jsonTextArea.value = '';
    document.getElementById('jsonModalTitle').textContent = 'Import Circuit JSON';
    applyJsonBtn.style.display = 'inline-flex';
    downloadJsonFileBtn.style.display = 'none';
    jsonModal.classList.remove('hidden');
  });

  closeJsonModalBtn.addEventListener('click', () => jsonModal.classList.add('hidden'));

  copyJsonBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(jsonTextArea.value).then(() => {
      showToast('Copied JSON to clipboard', 'success');
    });
  });

  downloadJsonFileBtn.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonTextArea.value);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `circuit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Circuit JSON downloaded', 'success');
  });

  applyJsonBtn.addEventListener('click', () => {
    try {
      const data = JSON.parse(jsonTextArea.value);
      circuit.deserialize(data);
      circuit.snapshot();
      updateUIStats();
      jsonModal.classList.add('hidden');
      showToast('Circuit loaded successfully', 'success');
    } catch (err) {
      alert('Invalid JSON format: ' + err.message);
    }
  });

  // Drag and drop JSON file into modal dropzone
  fileDropZone.addEventListener('click', () => jsonFileInput.click());
  jsonFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) readJsonFile(file);
  });

  fileDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropZone.classList.add('dragover');
  });
  fileDropZone.addEventListener('dragleave', () => fileDropZone.classList.remove('dragover'));
  fileDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) readJsonFile(file);
  });

  function readJsonFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      jsonTextArea.value = e.target.result;
      showToast(`Loaded ${file.name}`, 'info');
    };
    reader.readAsText(file);
  }

  // Export Circuit as PNG Image
  exportImageBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `logicflow_circuit_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Circuit exported as PNG image', 'success');
  });

  // =========================================================================
  // AI Circuit Copilot (Generative Logic Designer)
  // =========================================================================

  // =========================================================================
  // AI Circuit Assistant (ChatGPT-Style Chat Drawer)
  // =========================================================================

  function toggleChatDrawer(forceOpen = null) {
    if (forceOpen === true) {
      aiChatDrawer.classList.remove('hidden');
    } else if (forceOpen === false) {
      aiChatDrawer.classList.add('hidden');
    } else {
      aiChatDrawer.classList.toggle('hidden');
    }

    if (!aiChatDrawer.classList.contains('hidden')) {
      chatInput.focus();
    }
  }

  toggleChatBtn.addEventListener('click', () => toggleChatDrawer());
  if (aiSidebarBtn) {
    aiSidebarBtn.addEventListener('click', () => toggleChatDrawer(true));
  }
  closeChatBtn.addEventListener('click', () => toggleChatDrawer(false));

  // Quick chip suggestion clicks inside chat messages
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip-sm');
    if (chip && chip.dataset.prompt) {
      chatInput.value = chip.dataset.prompt;
      submitUserPrompt();
    }

    // "Open in New Tab" or "Apply to Current Tab" buttons inside assistant message
    const renderBtn = e.target.closest('.btn-render-circuit');
    if (renderBtn && renderBtn.dataset.circuitJson) {
      try {
        const circuitData = JSON.parse(decodeURIComponent(renderBtn.dataset.circuitJson));
        const action = renderBtn.dataset.action;
        const tabTitle = renderBtn.dataset.tabTitle || '✨ AI Circuit';

        if (action === 'current-tab') {
          // Apply to current tab
          circuit.deserialize(circuitData);
          circuit.snapshot();
          updateUIStats();
          renderer.panX = 30;
          renderer.panY = 50;
          renderer.zoom = 1.0;
          updateZoomDisplay();
          showToast('Applied to current tab!', 'success');
        } else {
          // Open in a brand new tab
          createTab(tabTitle, circuitData, 'sparkles', true);
          showToast(`Opened in new tab: ${tabTitle}`, 'success');
        }

        if (window.confetti) {
          confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
        }
      } catch (err) {
        showToast('Error rendering circuit: ' + err.message, 'danger');
      }
    }
  });

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    submitUserPrompt();
  });

  async function submitUserPrompt() {
    const text = chatInput.value.trim();
    if (!text) return;

    // 1. Append user message bubble
    appendChatMessage('user', text);
    chatInput.value = '';
    chatSendBtn.disabled = true;

    // 2. Append typing indicator
    const typingId = 'typing_' + Date.now();
    appendTypingIndicator(typingId);

    try {
      // 3. Call AI agent
      const result = await aiCopilot.generate(text);

      // Remove typing indicator
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();

      // Determine intuitive title for the tab
      let tabTitle = '✨ AI Circuit';
      if (/4-to-1|4:1|4 to 1/i.test(text)) tabTitle = '✨ 4-to-1 MUX';
      else if (/majority|voter/i.test(text)) tabTitle = '✨ Majority Voter';
      else if (/subtractor/i.test(text)) tabTitle = '✨ Full Subtractor';
      else if (/comparator/i.test(text)) tabTitle = '✨ 2-Bit Comparator';
      else if (/mux|multiplexer/i.test(text)) tabTitle = '✨ 2-to-1 MUX';
      else tabTitle = '✨ ' + text.slice(0, 16) + (text.length > 16 ? '...' : '');

      // 4. Append bot response bubble with explanation and render button
      appendBotResponse(result, tabTitle);

      // 5. Check if user is asking to modify existing vs create new
      const isEditPrompt = /^(add|modify|change|edit|update|connect|wire|remove|delete|insert)\b/i.test(text);

      if (isEditPrompt) {
        // User explicitly asked to modify current circuit
        circuit.deserialize(result.circuit);
        circuit.snapshot();
        updateUIStats();
        renderer.panX = 30;
        renderer.panY = 50;
        renderer.zoom = 1.0;
        updateZoomDisplay();
        showToast('Updated current circuit with AI changes!', 'success');
      } else {
        // DEFAULT: Open in a fresh NEW TAB so existing circuit is completely preserved!
        createTab(tabTitle, result.circuit, 'sparkles', true);
        showToast(`Created new tab: ${tabTitle}!`, 'success');
      }

      if (window.confetti) {
        confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
      }
    } catch (err) {
      console.error('Chat AI error:', err);
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.remove();
      appendChatMessage('bot', `⚠️ Sorry, I ran into an issue: ${err.message}. Please try again.`);
    } finally {
      chatSendBtn.disabled = false;
      if (window.lucide) lucide.createIcons();
    }
  }

  function appendChatMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${sender}-msg`;

    if (sender === 'user') {
      msgDiv.innerHTML = `<div class="msg-bubble">${escapeHtml(text)}</div>`;
    } else {
      msgDiv.innerHTML = `
        <div class="msg-avatar"><i data-lucide="bot" class="icon-xs"></i></div>
        <div class="msg-bubble"><p>${escapeHtml(text)}</p></div>
      `;
    }

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (window.lucide) lucide.createIcons();
  }

  function appendTypingIndicator(id) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg bot-msg';
    msgDiv.id = id;
    msgDiv.innerHTML = `
      <div class="msg-avatar"><i data-lucide="bot" class="icon-xs"></i></div>
      <div class="msg-bubble">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (window.lucide) lucide.createIcons();
  }

  function appendBotResponse(result, tabTitle) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg bot-msg';

    const encodedCircuit = encodeURIComponent(JSON.stringify(result.circuit));
    const gateCount = result.circuit.gates.length;
    const wireCount = result.circuit.wires.length;

    msgDiv.innerHTML = `
      <div class="msg-avatar"><i data-lucide="bot" class="icon-xs"></i></div>
      <div class="msg-bubble">
        <p><strong>Circuit Built:</strong> ${escapeHtml(result.explanation)}</p>
        <div class="ai-circuit-badge">
          <span>⚡ ${gateCount} Gates • ${wireCount} Wires</span>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 8px;">
          <button class="btn-render-circuit" data-action="new-tab" data-tab-title="${escapeHtml(tabTitle)}" data-circuit-json="${encodedCircuit}">
            <i data-lucide="plus-circle" class="icon-xs"></i> Open in New Tab
          </button>
          <button class="btn-render-circuit btn-secondary" style="margin-top: 0;" data-action="current-tab" data-circuit-json="${encodedCircuit}">
            <i data-lucide="refresh-cw" class="icon-xs"></i> Replace Current
          </button>
        </div>
      </div>
    `;

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (window.lucide) lucide.createIcons();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Help Modal
  helpBtn.addEventListener('click', () => helpModal.classList.remove('hidden'));
  closeHelpModalBtn.addEventListener('click', () => helpModal.classList.add('hidden'));
  doneHelpBtn.addEventListener('click', () => helpModal.classList.add('hidden'));

  function closeAllModals() {
    truthTableModal.classList.add('hidden');
    jsonModal.classList.add('hidden');
    helpModal.classList.add('hidden');
  }

  // Close modal when clicking outside modal card
  [truthTableModal, jsonModal, helpModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });
});
