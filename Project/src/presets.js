/**
 * LogicFlow — Preloaded Circuit Templates
 * Includes: Half Adder (Must-Have), Full Adder, XOR from 4 NANDs, SR Latch, Ring Oscillator.
 */

const PRESETS = {
  /**
   * ⭐ Half Adder (Problem 1 Must-Have)
   * A + B => SUM = A ⊕ B, CARRY = A · B
   */
  'half-adder': {
    version: '1.0',
    gates: [
      { id: 'sw_a', type: 'SWITCH', x: 80, y: 130, label: 'Input A', state: 0 },
      { id: 'sw_b', type: 'SWITCH', x: 80, y: 240, label: 'Input B', state: 0 },
      { id: 'xor_1', type: 'XOR', x: 280, y: 120, label: 'XOR (Sum)', state: 0 },
      { id: 'and_1', type: 'AND', x: 280, y: 250, label: 'AND (Carry)', state: 0 },
      { id: 'bulb_sum', type: 'BULB', x: 480, y: 126, label: 'SUM (S)', state: 0 },
      { id: 'bulb_carry', type: 'BULB', x: 480, y: 256, label: 'CARRY (C)', state: 0 }
    ],
    wires: [
      // Wire Input A to XOR input 0 & AND input 0
      { id: 'w1', fromGateId: 'sw_a', fromPinIndex: 0, toGateId: 'xor_1', toPinIndex: 0 },
      { id: 'w2', fromGateId: 'sw_a', fromPinIndex: 0, toGateId: 'and_1', toPinIndex: 0 },
      // Wire Input B to XOR input 1 & AND input 1
      { id: 'w3', fromGateId: 'sw_b', fromPinIndex: 0, toGateId: 'xor_1', toPinIndex: 1 },
      { id: 'w4', fromGateId: 'sw_b', fromPinIndex: 0, toGateId: 'and_1', toPinIndex: 1 },
      // Wire XOR output to SUM bulb
      { id: 'w5', fromGateId: 'xor_1', fromPinIndex: 0, toGateId: 'bulb_sum', toPinIndex: 0 },
      // Wire AND output to CARRY bulb
      { id: 'w6', fromGateId: 'and_1', fromPinIndex: 0, toGateId: 'bulb_carry', toPinIndex: 0 }
    ]
  },

  /**
   * 🚀 Full Adder (Stretch Goal)
   * Inputs: A, B, Cin. Outputs: SUM, Cout.
   */
  'full-adder': {
    version: '1.0',
    gates: [
      { id: 'sw_a', type: 'SWITCH', x: 60, y: 100, label: 'Input A', state: 0 },
      { id: 'sw_b', type: 'SWITCH', x: 60, y: 180, label: 'Input B', state: 0 },
      { id: 'sw_cin', type: 'SWITCH', x: 60, y: 290, label: 'Carry In (Cin)', state: 0 },
      
      // Stage 1: Half Adder 1
      { id: 'xor_1', type: 'XOR', x: 230, y: 120, label: 'XOR 1', state: 0 },
      { id: 'and_1', type: 'AND', x: 230, y: 220, label: 'AND 1', state: 0 },

      // Stage 2: Half Adder 2
      { id: 'xor_2', type: 'XOR', x: 420, y: 150, label: 'XOR 2 (Sum)', state: 0 },
      { id: 'and_2', type: 'AND', x: 420, y: 270, label: 'AND 2', state: 0 },

      // Stage 3: OR gate for Carry Out
      { id: 'or_1', type: 'OR', x: 580, y: 250, label: 'OR (Cout)', state: 0 },

      // Outputs
      { id: 'bulb_sum', type: 'BULB', x: 680, y: 154, label: 'SUM', state: 0 },
      { id: 'bulb_cout', type: 'BULB', x: 740, y: 254, label: 'CARRY OUT', state: 0 }
    ],
    wires: [
      { id: 'w1', fromGateId: 'sw_a', fromPinIndex: 0, toGateId: 'xor_1', toPinIndex: 0 },
      { id: 'w2', fromGateId: 'sw_a', fromPinIndex: 0, toGateId: 'and_1', toPinIndex: 0 },
      { id: 'w3', fromGateId: 'sw_b', fromPinIndex: 0, toGateId: 'xor_1', toPinIndex: 1 },
      { id: 'w4', fromGateId: 'sw_b', fromPinIndex: 0, toGateId: 'and_1', toPinIndex: 1 },

      // XOR 1 to XOR 2 and AND 2
      { id: 'w5', fromGateId: 'xor_1', fromPinIndex: 0, toGateId: 'xor_2', toPinIndex: 0 },
      { id: 'w6', fromGateId: 'xor_1', fromPinIndex: 0, toGateId: 'and_2', toPinIndex: 0 },

      // Cin to XOR 2 and AND 2
      { id: 'w7', fromGateId: 'sw_cin', fromPinIndex: 0, toGateId: 'xor_2', toPinIndex: 1 },
      { id: 'w8', fromGateId: 'sw_cin', fromPinIndex: 0, toGateId: 'and_2', toPinIndex: 1 },

      // XOR 2 to SUM bulb
      { id: 'w9', fromGateId: 'xor_2', fromPinIndex: 0, toGateId: 'bulb_sum', toPinIndex: 0 },

      // AND 1 and AND 2 to OR gate
      { id: 'w10', fromGateId: 'and_1', fromPinIndex: 0, toGateId: 'or_1', toPinIndex: 1 },
      { id: 'w11', fromGateId: 'and_2', fromPinIndex: 0, toGateId: 'or_1', toPinIndex: 0 },

      // OR gate to Cout bulb
      { id: 'w12', fromGateId: 'or_1', fromPinIndex: 0, toGateId: 'bulb_cout', toPinIndex: 0 }
    ]
  },

  /**
   * ⚡ XOR synthesized from 4 NAND Gates (Universal Gate Benchmark)
   * Verifies that NAND is universal and produces identical truth table to XOR.
   */
  'xor-nand': {
    version: '1.0',
    gates: [
      { id: 'sw_a', type: 'SWITCH', x: 80, y: 120, label: 'Input A', state: 0 },
      { id: 'sw_b', type: 'SWITCH', x: 80, y: 280, label: 'Input B', state: 0 },

      // NAND 1 (center input stage)
      { id: 'nand_1', type: 'NAND', x: 240, y: 200, label: 'NAND 1', state: 0 },

      // NAND 2 (top) and NAND 3 (bottom)
      { id: 'nand_2', type: 'NAND', x: 420, y: 120, label: 'NAND 2', state: 0 },
      { id: 'nand_3', type: 'NAND', x: 420, y: 280, label: 'NAND 3', state: 0 },

      // NAND 4 (final output stage)
      { id: 'nand_4', type: 'NAND', x: 600, y: 200, label: 'NAND 4 (Output)', state: 0 },

      { id: 'bulb_out', type: 'BULB', x: 760, y: 204, label: 'XOR Result', state: 0 }
    ],
    wires: [
      // A goes to NAND 1 pin 0 and NAND 2 pin 0
      { id: 'w1', fromGateId: 'sw_a', fromPinIndex: 0, toGateId: 'nand_1', toPinIndex: 0 },
      { id: 'w2', fromGateId: 'sw_a', fromPinIndex: 0, toGateId: 'nand_2', toPinIndex: 0 },

      // B goes to NAND 1 pin 1 and NAND 3 pin 1
      { id: 'w3', fromGateId: 'sw_b', fromPinIndex: 0, toGateId: 'nand_1', toPinIndex: 1 },
      { id: 'w4', fromGateId: 'sw_b', fromPinIndex: 0, toGateId: 'nand_3', toPinIndex: 1 },

      // NAND 1 output goes to NAND 2 pin 1 and NAND 3 pin 0
      { id: 'w5', fromGateId: 'nand_1', fromPinIndex: 0, toGateId: 'nand_2', toPinIndex: 1 },
      { id: 'w6', fromGateId: 'nand_1', fromPinIndex: 0, toGateId: 'nand_3', toPinIndex: 0 },

      // NAND 2 and NAND 3 outputs go to NAND 4
      { id: 'w7', fromGateId: 'nand_2', fromPinIndex: 0, toGateId: 'nand_4', toPinIndex: 0 },
      { id: 'w8', fromGateId: 'nand_3', fromPinIndex: 0, toGateId: 'nand_4', toPinIndex: 1 },

      // NAND 4 to Bulb
      { id: 'w9', fromGateId: 'nand_4', fromPinIndex: 0, toGateId: 'bulb_out', toPinIndex: 0 }
    ]
  },

  /**
   * 💾 SR Latch Memory Cell
   * 2 Cross-coupled NOR gates storing a 1-bit memory state.
   */
  'sr-latch': {
    version: '1.0',
    gates: [
      { id: 'sw_r', type: 'SWITCH', x: 80, y: 130, label: 'Reset (R)', state: 0 },
      { id: 'sw_s', type: 'SWITCH', x: 80, y: 270, label: 'Set (S)', state: 0 },
      { id: 'nor_1', type: 'NOR', x: 300, y: 130, label: 'NOR Top', state: 0 },
      { id: 'nor_2', type: 'NOR', x: 300, y: 270, label: 'NOR Bottom', state: 0 },
      { id: 'bulb_q', type: 'BULB', x: 520, y: 134, label: 'Q Output', state: 0 },
      { id: 'bulb_qbar', type: 'BULB', x: 520, y: 274, label: "Q' (Inverted)", state: 0 }
    ],
    wires: [
      { id: 'w1', fromGateId: 'sw_r', fromPinIndex: 0, toGateId: 'nor_1', toPinIndex: 0 },
      { id: 'w2', fromGateId: 'sw_s', fromPinIndex: 0, toGateId: 'nor_2', toPinIndex: 1 },
      { id: 'w3', fromGateId: 'nor_1', fromPinIndex: 0, toGateId: 'bulb_q', toPinIndex: 0 },
      { id: 'w4', fromGateId: 'nor_2', fromPinIndex: 0, toGateId: 'bulb_qbar', toPinIndex: 0 },
      // Cross coupling feedback
      { id: 'w5', fromGateId: 'nor_1', fromPinIndex: 0, toGateId: 'nor_2', toPinIndex: 0 },
      { id: 'w6', fromGateId: 'nor_2', fromPinIndex: 0, toGateId: 'nor_1', toPinIndex: 1 }
    ]
  },

  /**
   * ⚠️ Feedback Loop Ring Oscillator
   * 3 Inverters in a cycle. Tests cycle detection and safety guards.
   */
  'ring-oscillator': {
    version: '1.0',
    gates: [
      { id: 'not_1', type: 'NOT', x: 140, y: 180, label: 'NOT 1', state: 0 },
      { id: 'not_2', type: 'NOT', x: 300, y: 180, label: 'NOT 2', state: 0 },
      { id: 'not_3', type: 'NOT', x: 460, y: 180, label: 'NOT 3', state: 0 },
      { id: 'bulb_osc', type: 'BULB', x: 620, y: 184, label: 'Probe', state: 0 }
    ],
    wires: [
      { id: 'w1', fromGateId: 'not_1', fromPinIndex: 0, toGateId: 'not_2', toPinIndex: 0 },
      { id: 'w2', fromGateId: 'not_2', fromPinIndex: 0, toGateId: 'not_3', toPinIndex: 0 },
      { id: 'w3', fromGateId: 'not_3', fromPinIndex: 0, toGateId: 'bulb_osc', toPinIndex: 0 },
      // Feedback loop wire from NOT 3 back into NOT 1
      { id: 'w4', fromGateId: 'not_3', fromPinIndex: 0, toGateId: 'not_1', toPinIndex: 0 }
    ]
  },

  'empty': {
    version: '1.0',
    gates: [],
    wires: []
  }
};
