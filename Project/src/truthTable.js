/**
 * LogicFlow — Automated Truth Table Engine
 * Evaluates all 2^N input combinations and tabulates output states.
 * Includes CSV/Markdown export and active row highlighting.
 */

class TruthTableGenerator {
  constructor(circuit) {
    this.circuit = circuit;
  }

  generate() {
    // 1. Gather all input switches and output bulbs
    const switches = [];
    const bulbs = [];

    this.circuit.gates.forEach(gate => {
      if (gate.type === 'SWITCH') {
        switches.push(gate);
      } else if (gate.type === 'BULB') {
        bulbs.push(gate);
      }
    });

    if (switches.length === 0) {
      return {
        success: false,
        message: 'No Input Switches found in the circuit. Place at least one Toggle Switch to generate a Truth Table.'
      };
    }

    if (bulbs.length === 0) {
      return {
        success: false,
        message: 'No Output Bulbs found in the circuit. Place at least one Output Bulb to view results.'
      };
    }

    if (switches.length > 8) {
      return {
        success: false,
        message: `Circuit has ${switches.length} inputs (which yields ${Math.pow(2, switches.length)} rows). Maximum allowed for live table is 8 inputs (256 rows).`
      };
    }

    // Sort switches by X coordinate (left to right) for intuitive column ordering
    switches.sort((a, b) => a.x - b.x);
    bulbs.sort((a, b) => a.x - b.x);

    // Save current active switch states to restore later
    const initialStates = switches.map(s => s.state);

    const totalCombinations = 1 << switches.length; // 2^N
    const rows = [];
    let activeRowIndex = -1;

    for (let i = 0; i < totalCombinations; i++) {
      const inputVals = [];
      let matchesCurrent = true;

      // Assign bits from MSB to LSB
      for (let bit = switches.length - 1; bit >= 0; bit--) {
        const val = (i >> bit) & 1;
        const switchIdx = switches.length - 1 - bit;
        switches[switchIdx].state = val;
        switches[switchIdx].outputs[0] = val;
        inputVals.push(val);

        if (val !== initialStates[switchIdx]) {
          matchesCurrent = false;
        }
      }

      // Evaluate circuit for this combination
      this.circuit.evaluate();

      const outputVals = bulbs.map(b => b.inputs[0] ?? 0);

      if (matchesCurrent) {
        activeRowIndex = i;
      }

      rows.push({
        index: i,
        inputs: inputVals,
        outputs: outputVals,
        isCurrent: matchesCurrent
      });
    }

    // Restore original switch states
    switches.forEach((s, idx) => {
      s.state = initialStates[idx];
      s.outputs[0] = initialStates[idx];
    });
    this.circuit.evaluate();

    return {
      success: true,
      switches: switches.map(s => s.label || s.id),
      bulbs: bulbs.map(b => b.label || b.id),
      rows,
      activeRowIndex,
      totalCombinations
    };
  }

  renderToDOM(tableData, headEl, bodyEl, summaryEl) {
    if (!tableData.success) {
      summaryEl.innerHTML = `<span style="color: #f87171;">⚠️ ${tableData.message}</span>`;
      headEl.innerHTML = '';
      bodyEl.innerHTML = `<tr><td colspan="4" style="padding: 24px; color: #94a3b8;">${tableData.message}</td></tr>`;
      return;
    }

    summaryEl.innerHTML = `
      <span>Found <strong>${tableData.switches.length}</strong> input(s) (${tableData.totalCombinations} combinations) & <strong>${tableData.bulbs.length}</strong> output(s).</span>
    `;

    // 1. Render Table Header
    let headHtml = '<tr><th style="width: 50px;">#</th>';
    tableData.switches.forEach(label => {
      headHtml += `<th class="in-header">${this.escapeHtml(label)}</th>`;
    });
    tableData.bulbs.forEach(label => {
      headHtml += `<th class="out-header">${this.escapeHtml(label)}</th>`;
    });
    headHtml += '</tr>';
    headEl.innerHTML = headHtml;

    // 2. Render Table Rows
    let bodyHtml = '';
    tableData.rows.forEach(row => {
      const activeClass = row.isCurrent ? 'class="active-circuit-row"' : '';
      bodyHtml += `<tr ${activeClass}>`;
      bodyHtml += `<td>${row.index + 1}</td>`;

      // Inputs
      row.inputs.forEach(v => {
        const badge = v === 1 ? '<span class="badge-1">1</span>' : '<span class="badge-0">0</span>';
        bodyHtml += `<td class="in-col">${badge}</td>`;
      });

      // Outputs
      row.outputs.forEach(v => {
        const badge = v === 1 ? '<span class="badge-1">1</span>' : '<span class="badge-0">0</span>';
        bodyHtml += `<td>${badge}</td>`;
      });

      bodyHtml += '</tr>';
    });

    bodyEl.innerHTML = bodyHtml;
  }

  toCSV(tableData) {
    if (!tableData.success) return '';
    const headers = ['#', ...tableData.switches, ...tableData.bulbs];
    const lines = [headers.join(',')];

    tableData.rows.forEach(r => {
      lines.push([r.index + 1, ...r.inputs, ...r.outputs].join(','));
    });

    return lines.join('\n');
  }

  toMarkdown(tableData) {
    if (!tableData.success) return '';
    const headers = ['#', ...tableData.switches, ...tableData.bulbs];
    const dividers = headers.map(() => ':---:');

    const lines = [
      `| ${headers.join(' | ')} |`,
      `| ${dividers.join(' | ')} |`
    ];

    tableData.rows.forEach(r => {
      lines.push(`| ${[r.index + 1, ...r.inputs, ...r.outputs].join(' | ')} |`);
    });

    return lines.join('\n');
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
