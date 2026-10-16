/**
 * LogicFlow — Core Circuit Graph & Simulation Engine
 * Handles Gates, Wires, Pins, Topological/Relaxation Evaluation, and Loop Detection.
 */

class Circuit {
  constructor() {
    this.gates = new Map(); // id -> Gate
    this.wires = [];        // Array of Wire objects
    this.nextId = 1;
    this.feedbackLoopDetected = false;
    this.isDirty = true;
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 30;
  }

  generateId(prefix = 'comp') {
    return `${prefix}_${this.nextId++}`;
  }

  addGate(type, x, y, label = null, state = 0) {
    const id = this.generateId(type.toLowerCase());
    const gate = new Gate(id, type, x, y, label, state);
    this.gates.set(id, gate);
    this.isDirty = true;
    return gate;
  }

  removeGate(id) {
    if (!this.gates.has(id)) return false;

    // Clean up ALL connected wires (Both incoming and outgoing)
    // Critical safeguard: Avoids dangling wires trap
    this.wires = this.wires.filter(w => w.fromGateId !== id && w.toGateId !== id);
    this.gates.delete(id);
    this.isDirty = true;
    this.evaluate();
    return true;
  }

  addWire(fromGateId, fromPinIndex, toGateId, toPinIndex) {
    const fromGate = this.gates.get(fromGateId);
    const toGate = this.gates.get(toGateId);

    if (!fromGate || !toGate) return null;
    if (fromGateId === toGateId && fromPinIndex === toPinIndex) return null;

    // Guard: An input pin can only accept ONE incoming wire
    this.wires = this.wires.filter(w => !(w.toGateId === toGateId && w.toPinIndex === toPinIndex));

    const wireId = this.generateId('wire');
    const wire = new Wire(wireId, fromGateId, fromPinIndex, toGateId, toPinIndex);
    this.wires.push(wire);
    this.isDirty = true;
    this.evaluate();
    return wire;
  }

  removeWire(id) {
    const prevLen = this.wires.length;
    this.wires = this.wires.filter(w => w.id !== id);
    if (this.wires.length !== prevLen) {
      this.isDirty = true;
      this.evaluate();
      return true;
    }
    return false;
  }

  getGate(id) {
    return this.gates.get(id);
  }

  clear() {
    this.gates.clear();
    this.wires = [];
    this.feedbackLoopDetected = false;
    this.isDirty = true;
  }

  /**
   * Evaluates the circuit graph.
   * Uses iterative relaxation with a loop detection cap (32 passes max)
   * to guarantee the simulator never hangs even with feedback loops.
   */
  evaluate() {
    const maxPasses = 32;
    let passes = 0;
    let changed = true;
    this.feedbackLoopDetected = false;

    // Identify all input pins that currently have an incoming wire
    const connectedInputs = new Set();
    for (const wire of this.wires) {
      connectedInputs.add(`${wire.toGateId}:${wire.toPinIndex}`);
    }

    // Reset only unconnected input pins to 0 (floating pull-down)
    this.gates.forEach(gate => {
      if (gate.type !== 'SWITCH' && gate.type !== 'CLOCK') {
        for (let i = 0; i < gate.inputs.length; i++) {
          if (!connectedInputs.has(`${gate.id}:${i}`)) {
            gate.inputs[i] = 0;
          }
        }
      }
    });

    while (changed && passes < maxPasses) {
      changed = false;
      passes++;

      // 1. Propagate signals across wires
      for (const wire of this.wires) {
        const fromGate = this.gates.get(wire.fromGateId);
        const toGate = this.gates.get(wire.toGateId);

        if (fromGate && toGate) {
          const signal = fromGate.outputs[wire.fromPinIndex] ?? 0;
          wire.state = signal;

          if (toGate.inputs[wire.toPinIndex] !== signal) {
            toGate.inputs[wire.toPinIndex] = signal;
            changed = true;
          }
        }
      }

      // 2. Compute gate logic functions
      this.gates.forEach(gate => {
        const prevOutput = [...gate.outputs];
        gate.computeLogic();

        for (let i = 0; i < gate.outputs.length; i++) {
          if (gate.outputs[i] !== prevOutput[i]) {
            changed = true;
          }
        }
      });
    }

    // If still oscillating after max passes, flag feedback loop
    if (changed && passes >= maxPasses) {
      this.feedbackLoopDetected = true;
    }

    this.isDirty = false;
    return !this.feedbackLoopDetected;
  }

  /**
   * Save circuit snapshot for Undo/Redo
   */
  snapshot() {
    const state = this.serialize();
    // Trim future redo states if in middle
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(state);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.deserialize(this.history[this.historyIndex]);
      return true;
    }
    return false;
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.deserialize(this.history[this.historyIndex]);
      return true;
    }
    return false;
  }

  serialize() {
    const gatesData = [];
    this.gates.forEach(g => {
      gatesData.push({
        id: g.id,
        type: g.type,
        x: g.x,
        y: g.y,
        label: g.label,
        state: g.state
      });
    });

    const wiresData = this.wires.map(w => ({
      id: w.id,
      fromGateId: w.fromGateId,
      fromPinIndex: w.fromPinIndex,
      toGateId: w.toGateId,
      toPinIndex: w.toPinIndex
    }));

    return {
      version: '1.0',
      timestamp: Date.now(),
      gates: gatesData,
      wires: wiresData
    };
  }

  deserialize(data) {
    if (!data || !Array.isArray(data.gates) || !Array.isArray(data.wires)) {
      throw new Error('Invalid circuit JSON format');
    }

    this.clear();
    let maxIdNum = 0;

    data.gates.forEach(g => {
      const gate = new Gate(g.id, g.type, g.x, g.y, g.label, g.state);
      this.gates.set(g.id, gate);

      // Keep ID counter higher than imported IDs
      const numMatch = g.id.match(/\d+$/);
      if (numMatch) {
        maxIdNum = Math.max(maxIdNum, parseInt(numMatch[0], 10));
      }
    });

    data.wires.forEach(w => {
      const wire = new Wire(w.id, w.fromGateId, w.fromPinIndex, w.toGateId, w.toPinIndex);
      this.wires.push(wire);

      const numMatch = w.id.match(/\d+$/);
      if (numMatch) {
        maxIdNum = Math.max(maxIdNum, parseInt(numMatch[0], 10));
      }
    });

    this.nextId = maxIdNum + 1;
    this.evaluate();
  }
}

/**
 * Gate Component Representation
 */
class Gate {
  constructor(id, type, x, y, label = null, state = 0) {
    this.id = id;
    this.type = type.toUpperCase();
    this.x = x;
    this.y = y;
    this.width = 90;
    this.height = 54;
    this.state = state; // For SWITCH (0 or 1)
    this.label = label || this.getDefaultLabel();

    this.setupPins();
    this.computeLogic();
  }

  getDefaultLabel() {
    const num = this.id.split('_')[1] || '';
    switch (this.type) {
      case 'SWITCH': return `IN ${num}`;
      case 'CLOCK': return `CLK ${num}`;
      case 'BULB': return `OUT ${num}`;
      case 'DISPLAY_7SEG': return `HEX ${num}`;
      default: return `${this.type}`;
    }
  }

  setupPins() {
    switch (this.type) {
      case 'SWITCH':
      case 'CLOCK':
        this.inputs = [];
        this.outputs = [this.state];
        this.width = 76;
        this.height = 46;
        break;

      case 'BULB':
        this.inputs = [0];
        this.outputs = [];
        this.width = 68;
        this.height = 46;
        break;

      case 'DISPLAY_7SEG':
        this.inputs = [0, 0, 0, 0]; // 4-bit nibble
        this.outputs = [];
        this.width = 72;
        this.height = 80;
        break;

      case 'NOT':
      case 'BUFFER':
        this.inputs = [0];
        this.outputs = [this.type === 'NOT' ? 1 : 0];
        this.width = 78;
        this.height = 46;
        break;

      case 'AND':
      case 'OR':
      case 'XOR':
      case 'NAND':
      case 'NOR':
      case 'XNOR':
        this.inputs = [0, 0];
        this.outputs = [0];
        this.width = 86;
        this.height = 54;
        break;

      default:
        this.inputs = [0];
        this.outputs = [0];
    }
  }

  computeLogic() {
    const in0 = this.inputs[0] ?? 0;
    const in1 = this.inputs[1] ?? 0;

    switch (this.type) {
      case 'SWITCH':
        this.outputs[0] = this.state ? 1 : 0;
        break;

      case 'CLOCK':
        this.outputs[0] = this.state ? 1 : 0;
        break;

      case 'BULB':
        this.state = in0;
        break;

      case 'DISPLAY_7SEG':
        // 4-bit nibble into hex: A*8 + B*4 + C*2 + D*1
        const val = ((this.inputs[0] || 0) * 8) +
                    ((this.inputs[1] || 0) * 4) +
                    ((this.inputs[2] || 0) * 2) +
                    ((this.inputs[3] || 0) * 1);
        this.state = val;
        break;

      case 'NOT':
        this.outputs[0] = in0 === 1 ? 0 : 1;
        break;

      case 'BUFFER':
        this.outputs[0] = in0;
        break;

      case 'AND':
        this.outputs[0] = (in0 === 1 && in1 === 1) ? 1 : 0;
        break;

      case 'OR':
        this.outputs[0] = (in0 === 1 || in1 === 1) ? 1 : 0;
        break;

      case 'XOR':
        this.outputs[0] = (in0 !== in1) ? 1 : 0;
        break;

      case 'NAND':
        this.outputs[0] = (in0 === 1 && in1 === 1) ? 0 : 1;
        break;

      case 'NOR':
        this.outputs[0] = (in0 === 1 || in1 === 1) ? 0 : 1;
        break;

      case 'XNOR':
        this.outputs[0] = (in0 === in1) ? 1 : 0;
        break;
    }
  }

  getInputPinPos(index) {
    const total = this.inputs.length;
    if (total === 0) return null;
    const spacing = this.height / (total + 1);
    return {
      x: this.x,
      y: this.y + spacing * (index + 1)
    };
  }

  getOutputPinPos(index) {
    const total = this.outputs.length;
    if (total === 0) return null;
    const spacing = this.height / (total + 1);
    return {
      x: this.x + this.width,
      y: this.y + spacing * (index + 1)
    };
  }
}

/**
 * Wire Connection Representation
 */
class Wire {
  constructor(id, fromGateId, fromPinIndex, toGateId, toPinIndex) {
    this.id = id;
    this.fromGateId = fromGateId;
    this.fromPinIndex = fromPinIndex;
    this.toGateId = toGateId;
    this.toPinIndex = toPinIndex;
    this.state = 0;
  }
}
