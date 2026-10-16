/**
 * LogicFlow — Canvas 60 FPS Signal & Vector Renderer
 * Features: High-DPI, ANSI Logic Gate Shapes, Animated Electron Particles,
 * Bezier Curve Wiring, Accessibility Signaling (Thick/Thin + Filled/Hollow + 0/1 Badges).
 */

class CircuitRenderer {
  constructor(canvas, circuit) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.circuit = circuit;

    // Viewport transforms (Pan & Zoom)
    this.panX = 0;
    this.panY = 0;
    this.zoom = 1.0;
    this.minZoom = 0.4;
    this.maxZoom = 2.5;

    // Selection & Interaction state
    this.selectedGateId = null;
    this.selectedWireId = null;
    this.hoveredPin = null;  // { gateId, type: 'in'|'out', index, x, y }
    this.hoveredGateId = null;
    this.hoveredWireId = null;
    this.dragWireStart = null; // { gateId, pinIndex, x, y }
    this.dragWireCurrentPos = null; // { x, y }

    // Particle animation timestamp
    this.animTime = 0;
    this.dpr = window.devicePixelRatio || 1;

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.width = rect.width;
    this.height = rect.height;
  }

  // Coordinate Conversion
  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.panX) / this.zoom,
      y: (screenY - this.panY) / this.zoom
    };
  }

  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.zoom + this.panX,
      y: worldY * this.zoom + this.panY
    };
  }

  startRenderLoop() {
    const loop = (timestamp) => {
      this.animTime = timestamp * 0.001;
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Clear background
    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, this.width, this.height);

    // Apply Viewport Transform (Pan & Zoom)
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // 1. Draw Grid
    this.drawGrid(ctx);

    // 2. Draw Wires
    this.drawWires(ctx);

    // 3. Draw Active Wire Drag (if dragging a new connection)
    this.drawActiveWireDrag(ctx);

    // 4. Draw Gates & Components
    this.drawGates(ctx);

    ctx.restore();
    ctx.restore();
  }

  drawGrid(ctx) {
    const gridSize = 30;
    const worldTopLeft = this.screenToWorld(0, 0);
    const worldBottomRight = this.screenToWorld(this.width, this.height);

    const startX = Math.floor(worldTopLeft.x / gridSize) * gridSize;
    const startY = Math.floor(worldTopLeft.y / gridSize) * gridSize;
    const endX = Math.ceil(worldBottomRight.x / gridSize) * gridSize;
    const endY = Math.ceil(worldBottomRight.y / gridSize) * gridSize;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2 / Math.max(0.6, this.zoom), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawWires(ctx) {
    for (const wire of this.circuit.wires) {
      const fromGate = this.circuit.getGate(wire.fromGateId);
      const toGate = this.circuit.getGate(wire.toGateId);

      if (!fromGate || !toGate) continue;

      const p1 = fromGate.getOutputPinPos(wire.fromPinIndex);
      const p2 = toGate.getInputPinPos(wire.toPinIndex);

      if (!p1 || !p2) continue;

      const isHigh = wire.state === 1;
      const isSelected = wire.id === this.selectedWireId;
      const isHovered = wire.id === this.hoveredWireId;

      // Cubic Bezier curve control points
      const dx = Math.abs(p2.x - p1.x) * 0.5;
      const cp1x = p1.x + Math.max(30, dx);
      const cp1y = p1.y;
      const cp2x = p2.x - Math.max(30, dx);
      const cp2y = p2.y;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);

      // Accessibility Distinction:
      // HIGH = Thick line (3.5px) + glowing electric cyan + animated pulse
      // LOW = Thin line (1.8px) + dark slate-gray + static
      if (isSelected) {
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 10;
      } else if (isHovered) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
      } else if (isHigh) {
        // High Signal Glow Line
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 3.2;
        ctx.shadowColor = 'rgba(0, 242, 254, 0.7)';
        ctx.shadowBlur = 12;
      } else {
        // Low Signal Dim Line
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.6;
        ctx.shadowBlur = 0;
      }

      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow

      // Moving Electron Particles for HIGH Signal (Vivid Animation)
      if (isHigh) {
        this.drawWireParticles(ctx, p1, cp1x, cp1y, cp2x, cp2y, p2);
      }
    }
  }

  drawWireParticles(ctx, p1, cp1x, cp1y, cp2x, cp2y, p2) {
    const particleCount = 3;
    const speed = 0.8; // cycle speed
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 8;

    for (let i = 0; i < particleCount; i++) {
      const offset = (this.animTime * speed + i / particleCount) % 1.0;
      const pt = this.getBezierPoint(p1, { x: cp1x, y: cp1y }, { x: cp2x, y: cp2y }, p2, offset);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  getBezierPoint(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return {
      x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
    };
  }

  drawActiveWireDrag(ctx) {
    if (!this.dragWireStart || !this.dragWireCurrentPos) return;

    const p1 = this.dragWireStart;
    const p2 = this.dragWireCurrentPos;

    const dx = Math.abs(p2.x - p1.x) * 0.5;
    const cp1x = p1.x + Math.max(30, dx);
    const cp1y = p1.y;
    const cp2x = p2.x - Math.max(30, dx);
    const cp2y = p2.y;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawGates(ctx) {
    this.circuit.gates.forEach(gate => {
      ctx.save();
      ctx.translate(gate.x, gate.y);

      const isSelected = gate.id === this.selectedGateId;
      const isHovered = gate.id === this.hoveredGateId;

      // Selection Aura
      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 14;
        ctx.strokeRect(-4, -4, gate.width + 8, gate.height + 8);
        ctx.shadowBlur = 0;
      } else if (isHovered) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-2, -2, gate.width + 4, gate.height + 4);
      }

      // Draw Gate Graphic according to type
      switch (gate.type) {
        case 'SWITCH':
          this.drawSwitch(ctx, gate);
          break;
        case 'CLOCK':
          this.drawClock(ctx, gate);
          break;
        case 'BULB':
          this.drawBulb(ctx, gate);
          break;
        case 'DISPLAY_7SEG':
          this.draw7Seg(ctx, gate);
          break;
        case 'AND':
        case 'NAND':
          this.drawAndFamily(ctx, gate);
          break;
        case 'OR':
        case 'NOR':
          this.drawOrFamily(ctx, gate);
          break;
        case 'XOR':
        case 'XNOR':
          this.drawXorFamily(ctx, gate);
          break;
        case 'NOT':
        case 'BUFFER':
          this.drawBufferNot(ctx, gate);
          break;
        default:
          this.drawGenericGate(ctx, gate);
      }

      // Draw Gate Text Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(gate.label, gate.width / 2, gate.height + 16);

      ctx.restore();

      // Draw Input & Output Pins (in World coordinates)
      this.drawPins(ctx, gate);
    });
  }

  // Draw Specific Components
  drawSwitch(ctx, gate) {
    const isHigh = gate.state === 1;

    // Outer Body
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isHigh ? '#00f2fe' : '#334155';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 0, 0, gate.width, gate.height, 8, true, true);

    // Toggle track
    const trackW = 40;
    const trackH = 20;
    const trackX = (gate.width - trackW) / 2;
    const trackY = (gate.height - trackH) / 2 - 2;

    ctx.fillStyle = isHigh ? 'rgba(0, 242, 254, 0.3)' : 'rgba(30, 41, 59, 0.8)';
    ctx.strokeStyle = isHigh ? '#00f2fe' : '#475569';
    this.roundRect(ctx, trackX, trackY, trackW, trackH, 10, true, true);

    // Toggle thumb
    const thumbX = isHigh ? trackX + trackW - 10 : trackX + 10;
    const thumbY = trackY + trackH / 2;

    ctx.beginPath();
    ctx.arc(thumbX, thumbY, 7, 0, Math.PI * 2);
    ctx.fillStyle = isHigh ? '#00f2fe' : '#94a3b8';
    if (isHigh) {
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 8;
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Accessibility badge: [1] ON or [0] OFF (Not color alone!)
    ctx.fillStyle = isHigh ? '#00f2fe' : '#64748b';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isHigh ? '[1] ON' : '[0] OFF', gate.width / 2, gate.height - 5);
  }

  drawBulb(ctx, gate) {
    const isHigh = gate.inputs[0] === 1;

    // Base body
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isHigh ? '#facc15' : '#334155';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 0, 0, gate.width, gate.height, 8, true, true);

    const centerX = gate.width / 2;
    const centerY = gate.height / 2 - 4;
    const radius = 13;

    // Accessibility Distinction:
    // ON (1) = Filled glowing yellow aura + bright center + [1]
    // OFF (0) = Hollow circle with dim dashed filament + [0]
    if (isHigh) {
      // Glow Aura
      const grad = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, radius + 8);
      grad.addColorStop(0, 'rgba(253, 224, 71, 0.9)');
      grad.addColorStop(0.5, 'rgba(250, 204, 21, 0.4)');
      grad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
      ctx.fill();

      // Filled Center
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Hollow OFF Bulb
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Hollow filament indicator
      ctx.strokeStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(centerX - 4, centerY + 3);
      ctx.lineTo(centerX, centerY - 4);
      ctx.lineTo(centerX + 4, centerY + 3);
      ctx.stroke();
    }

    // Accessibility Text Label
    ctx.fillStyle = isHigh ? '#fde047' : '#64748b';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isHigh ? '[1] LIT' : '[0] OFF', gate.width / 2, gate.height - 5);
  }

  drawClock(ctx, gate) {
    const isHigh = gate.state === 1;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isHigh ? '#38bdf8' : '#334155';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 0, 0, gate.width, gate.height, 8, true, true);

    // Pulse waveform icon
    ctx.strokeStyle = isHigh ? '#38bdf8' : '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, gate.height / 2 + 5);
    ctx.lineTo(28, gate.height / 2 + 5);
    ctx.lineTo(28, gate.height / 2 - 7);
    ctx.lineTo(44, gate.height / 2 - 7);
    ctx.lineTo(44, gate.height / 2 + 5);
    ctx.lineTo(54, gate.height / 2 + 5);
    ctx.stroke();

    ctx.fillStyle = isHigh ? '#38bdf8' : '#64748b';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isHigh ? 'CLK [1]' : 'CLK [0]', gate.width / 2, gate.height - 5);
  }

  draw7Seg(ctx, gate) {
    ctx.fillStyle = '#0b0f19';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 0, 0, gate.width, gate.height, 8, true, true);

    // Digital readout
    const hex = (gate.state || 0).toString(16).toUpperCase();
    ctx.fillStyle = '#00f2fe';
    ctx.font = '700 28px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 10;
    ctx.fillText(hex, gate.width / 2, gate.height / 2 + 10);
    ctx.shadowBlur = 0;

    // Inputs label: 8 4 2 1
    ctx.fillStyle = '#64748b';
    ctx.font = '600 7px "JetBrains Mono", monospace';
    ctx.fillText('A B C D (8 4 2 1)', gate.width / 2, gate.height - 8);
  }

  // Standard ANSI Logic Gate Shapes
  drawAndFamily(ctx, gate) {
    const w = gate.width;
    const h = gate.height;
    const isInverted = gate.type === 'NAND';
    const mainW = isInverted ? w - 10 : w;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isInverted ? '#0ea5e9' : '#38bdf8';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(10, 5);
    ctx.lineTo(mainW - 25, 5);
    ctx.arc(mainW - 25, h / 2, h / 2 - 5, -Math.PI / 2, Math.PI / 2, false);
    ctx.lineTo(10, h - 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (isInverted) {
      ctx.beginPath();
      ctx.arc(mainW + 3, h / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.stroke();
    }

    // Gate Name in center
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(gate.type, mainW / 2 + 5, h / 2 + 4);
  }

  drawOrFamily(ctx, gate) {
    const w = gate.width;
    const h = gate.height;
    const isInverted = gate.type === 'NOR';
    const mainW = isInverted ? w - 10 : w;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isInverted ? '#e879f9' : '#c084fc';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    ctx.moveTo(10, 5);
    ctx.quadraticCurveTo(22, h / 2, 10, h - 5);
    ctx.quadraticCurveTo(mainW - 15, h - 5, mainW - 2, h / 2);
    ctx.quadraticCurveTo(mainW - 15, 5, 10, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (isInverted) {
      ctx.beginPath();
      ctx.arc(mainW + 4, h / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(gate.type, mainW / 2 + 6, h / 2 + 4);
  }

  drawXorFamily(ctx, gate) {
    const w = gate.width;
    const h = gate.height;
    const isInverted = gate.type === 'XNOR';
    const mainW = isInverted ? w - 10 : w;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isInverted ? '#fbbf24' : '#facc15';
    ctx.lineWidth = 1.8;

    // Curved input back line
    ctx.beginPath();
    ctx.moveTo(6, 5);
    ctx.quadraticCurveTo(18, h / 2, 6, h - 5);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(14, 5);
    ctx.quadraticCurveTo(26, h / 2, 14, h - 5);
    ctx.quadraticCurveTo(mainW - 15, h - 5, mainW - 2, h / 2);
    ctx.quadraticCurveTo(mainW - 15, 5, 14, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (isInverted) {
      ctx.beginPath();
      ctx.arc(mainW + 4, h / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(gate.type, mainW / 2 + 8, h / 2 + 4);
  }

  drawBufferNot(ctx, gate) {
    const w = gate.width;
    const h = gate.height;
    const isInverted = gate.type === 'NOT';
    const mainW = isInverted ? w - 12 : w;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isInverted ? '#fb7185' : '#34d399';
    ctx.lineWidth = 1.8;

    // Triangle
    ctx.beginPath();
    ctx.moveTo(12, 6);
    ctx.lineTo(mainW - 4, h / 2);
    ctx.lineTo(12, h - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (isInverted) {
      ctx.beginPath();
      ctx.arc(mainW + 2, h / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(gate.type, 26, h / 2 + 4);
  }

  drawGenericGate(ctx, gate) {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 0, 0, gate.width, gate.height, 6, true, true);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(gate.type, gate.width / 2, gate.height / 2 + 4);
  }

  // Draw Input & Output Connection Pins
  drawPins(ctx, gate) {
    // Input Pins (Left)
    gate.inputs.forEach((val, i) => {
      const pos = gate.getInputPinPos(i);
      if (!pos) return;

      const isHovered = this.hoveredPin &&
                        this.hoveredPin.gateId === gate.id &&
                        this.hoveredPin.type === 'in' &&
                        this.hoveredPin.index === i;

      const isHigh = val === 1;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isHovered ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isHigh ? '#00f2fe' : '#334155';
      ctx.strokeStyle = isHovered ? '#ffffff' : (isHigh ? '#00f2fe' : '#64748b');
      ctx.lineWidth = 1.5;
      if (isHigh) {
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 6;
      }
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Output Pins (Right)
    gate.outputs.forEach((val, i) => {
      const pos = gate.getOutputPinPos(i);
      if (!pos) return;

      const isHovered = this.hoveredPin &&
                        this.hoveredPin.gateId === gate.id &&
                        this.hoveredPin.type === 'out' &&
                        this.hoveredPin.index === i;

      const isHigh = val === 1;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isHovered ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = isHigh ? '#00f2fe' : '#1e293b';
      ctx.strokeStyle = isHovered ? '#ffffff' : (isHigh ? '#00f2fe' : '#64748b');
      ctx.lineWidth = 1.5;
      if (isHigh) {
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 6;
      }
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // Hit Testing
  findPinAt(worldX, worldY, hitRadius = 12) {
    for (const gate of this.circuit.gates.values()) {
      // Check input pins
      for (let i = 0; i < gate.inputs.length; i++) {
        const pin = gate.getInputPinPos(i);
        if (pin && Math.hypot(pin.x - worldX, pin.y - worldY) <= hitRadius) {
          return { gateId: gate.id, type: 'in', index: i, x: pin.x, y: pin.y };
        }
      }
      // Check output pins
      for (let i = 0; i < gate.outputs.length; i++) {
        const pin = gate.getOutputPinPos(i);
        if (pin && Math.hypot(pin.x - worldX, pin.y - worldY) <= hitRadius) {
          return { gateId: gate.id, type: 'out', index: i, x: pin.x, y: pin.y };
        }
      }
    }
    return null;
  }

  findGateAt(worldX, worldY) {
    for (const gate of this.circuit.gates.values()) {
      if (
        worldX >= gate.x &&
        worldX <= gate.x + gate.width &&
        worldY >= gate.y &&
        worldY <= gate.y + gate.height
      ) {
        return gate;
      }
    }
    return null;
  }

  findWireAt(worldX, worldY, threshold = 8) {
    for (const wire of this.circuit.wires) {
      const fromGate = this.circuit.getGate(wire.fromGateId);
      const toGate = this.circuit.getGate(wire.toGateId);
      if (!fromGate || !toGate) continue;

      const p1 = fromGate.getOutputPinPos(wire.fromPinIndex);
      const p2 = toGate.getInputPinPos(wire.toPinIndex);
      if (!p1 || !p2) continue;

      const dx = Math.abs(p2.x - p1.x) * 0.5;
      const cp1 = { x: p1.x + Math.max(30, dx), y: p1.y };
      const cp2 = { x: p2.x - Math.max(30, dx), y: p2.y };

      // Sample 20 points along bezier
      for (let step = 0; step <= 20; step++) {
        const t = step / 20;
        const pt = this.getBezierPoint(p1, cp1, cp2, p2, t);
        if (Math.hypot(pt.x - worldX, pt.y - worldY) <= threshold) {
          return wire;
        }
      }
    }
    return null;
  }
}
