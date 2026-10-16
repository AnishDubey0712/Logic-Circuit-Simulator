# ⚡ LogicFlow PRO — Interactive Digital Logic Circuit Simulator
### *A Next-Generation Digital Electronics Playground with Built-in AI Circuit Copilot*
**Built for Swayambhu 2K26 Hackathon (Batch 2) | Problem 1 (Difficulty: Hard)**  
*Developed by MCA Department, JNEC, MGM University*

[![Privacy: DPDP 2023](https://img.shields.io/badge/Privacy-DPDP%20Act%202023%20Compliant-10b981?style=for-the-badge&logo=shield)](https://github.com)
[![Engine: 60 FPS Canvas](https://img.shields.io/badge/Engine-60%20FPS%20Canvas-00f2fe?style=for-the-badge&logo=html5)](https://github.com)
[![AI: Gemini 3.5 Flash](https://img.shields.io/badge/AI%20Copilot-Gemini%203.5%20Flash-8b5cf6?style=for-the-badge&logo=google)](https://github.com)
[![Stack: Vanilla Web](https://img.shields.io/badge/Stack-HTML5%20%2F%20CSS3%20%2F%20ES6%20JS-f59e0b?style=for-the-badge&logo=javascript)](https://github)

---

## 🌟 Overview & Real-World Utility

**LogicFlow PRO** is an interactive, browser-based digital logic circuit simulator and CAD workbench designed for computer science and electronics engineering students.

Physical breadboards are fragile, expensive, and difficult to debug during university labs. **LogicFlow PRO** replaces hardware breadboards with a fluid sandbox:
- **Design & Wire**: Place switches, bulbs, logic gates, and wire them up in real time.
- **Accessible Signal Flow**: Signals do not rely on color alone. High (1) signals are represented by **thick glowing lines (3.5px) with animated electron particles**, filled glowing bulbs, and numeric `[1]` badges; Low (0) signals are thin (1.6px), static, with hollow bulbs and `[0]` badges.
- **Automated Truth Table Solver**: Exhaustively evaluates all $2^n$ permutations for any custom circuit at the click of a button, highlighting the active circuit state in real time.
- **Generative AI Copilot**: Type any circuit in plain English (e.g., *"Build a 4-to-1 Multiplexer"*), and our integrated Gemini-powered AI agent will automatically construct, place, and wire the entire schematic in its own workspace tab!

---

## 🎯 Feature Matrix

### 🟢 Must-Haves (100% Complete)
| Requirement | Implementation Detail |
| :--- | :--- |
| **Interactive Board/Canvas** | High-DPI canvas with smooth pan, zoom, grid snapping, and selection tools. |
| **Complete Component Suite** | Input Switch (0/1), Clock Pulse, Output Bulb, 7-Segment Display, AND, OR, NOT, XOR. |
| **Drag & Delete** | Move gates freely. Delete via <kbd>Del</kbd>, backspace, or trash button. |
| **Strict Wiring Rules** | Output pins can fan out to multiple inputs; input pins accept only one wire. |
| **Instant Live Propagation** | Click switches directly on canvas to flip between 0 and 1 with real-time signal propagation. |
| **Accessible State Signaling** | High = thick (3.5px) + neon glow + moving electron particles + filled bulb + `[1]`. Low = thin (1.6px) + hollow bulb + `[0]`. |
| **Automated Truth Table** | Scans all $n$ inputs and $m$ outputs, simulates all $2^n$ combinations, and highlights active state. |
| **Preloaded Half Adder** | Ready-to-test circuit preloaded on first launch (Inputs $A, B \rightarrow$ XOR Sum & AND Carry). |

### 🚀 Stretch Goals & Innovations
| Feature | Implementation Detail |
| :--- | :--- |
| **Universal & Complex Gates** | NAND, NOR, XNOR, Buffer, 1 Hz pulsing Clock, and 4-Bit Hex Display. |
| **Multi-Tab Workspaces** | Tabbed schematic manager (`[⭐ Half Adder]`, `[✨ 4-to-1 MUX]`, `[+] New Tab`). |
| **Generative AI Circuit Copilot** | ChatGPT-style side drawer: Describe any circuit in plain English to generate it automatically in a new tab. |
| **Feedback Loop Safety Guard** | Graph cycle detection prevents infinite loops (capped at 32 passes) and shows a `⚠️ Loop Warning`. |
| **Preloaded Circuit Library** | Half Adder, Full Adder, XOR from 4 NANDs, SR Latch Memory, and Ring Oscillator. |
| **JSON Save & Load** | Export circuit schemas to `.json`, copy to clipboard, or drag-and-drop to import. |
| **High-Res Schematic Export** | One-click export to PNG image. |
| **DPDP Act (2023) Compliance** | 100% in-browser client-side simulation. Zero data collection, zero telemetry. |

---

## 🧠 Architectural Design & Algorithms

```mermaid
graph TD
    UI[User Interaction: Click / Drag / Wire / AI Prompt] --> Model[Circuit Graph Model]
    Model --> Evaluator[Iterative Relaxation Engine (Max 32 passes)]
    Evaluator --> StateCheck{Steady State or Cycle?}
    StateCheck -->|Converged| Render[60 FPS Canvas Vector Renderer]
    StateCheck -->|Oscillating > 32| LoopAlert[Flag Feedback Loop Alert]
    Render --> Screen[Cubic Bezier Wires + Moving Particles + Glowing Bulbs]
    Model --> TT[Truth Table Permutator (2^N states)]
```

### 1. Multi-Pass Iterative Relaxation Engine
Rather than relying on naive recursion (which crashes on feedback loops), LogicFlow uses multi-pass relaxation:
1. Unconnected input pins default to digital ground (`0`).
2. Signals propagate across directed wire edges into destination gate input pins.
3. Gates compute their respective Boolean truth functions.
4. If any gate output changed, the engine repeats the evaluation pass until steady-state convergence.
5. If states continue oscillating after 32 passes, the engine halts safely and flags a **Loop Warning**. The browser never hangs!

### 2. Wire Garbage Collection (Edge-Case Trap Avoidance)
When `circuit.removeGate(id)` is called, the system performs clean bipartite edge deletion:
```javascript
this.wires = this.wires.filter(w => w.fromGateId !== id && w.toGateId !== id);
this.gates.delete(id);
this.evaluate();
```
Deleting a gate cleanly purges all incoming and outgoing connections without leaving any orphaned or dangling wires.

---

## 🧮 Mathematical & Boolean Formulas Implemented

### 1. Logic Gate Truth Functions
- **AND**: $Y = A \cdot B$
- **OR**: $Y = A + B$
- **NOT**: $Y = A'$
- **XOR**: $Y = A \oplus B = A'B + AB'$
- **NAND**: $Y = (A \cdot B)' = A' + B'$
- **NOR**: $Y = (A + B)' = A' \cdot B'$
- **XNOR**: $Y = (A \oplus B)' = AB + A'B'$

### 2. Composite Arithmetic Circuits
- **Half Adder**: $\text{Sum} = A \oplus B$, $\text{Carry} = A \cdot B$
- **Full Adder**: $\text{Sum} = A \oplus B \oplus C_{in}$, $C_{out} = AB + C_{in}(A \oplus B)$
- **Full Subtractor**: $\text{Diff} = A \oplus B \oplus B_{in}$, $B_{out} = A'B + (A \oplus B)'B_{in}$
- **2-to-1 Multiplexer (MUX)**: $Y = S' D_0 + S D_1$
- **Majority Voter (2 of 3)**: $Y = AB + BC + AC$
- **XOR from 4 NANDs**: $Y = ( (A \cdot (AB)')' \cdot (B \cdot (AB)')' )' = A \oplus B$

### 3. Canvas Graphics Mathematics
- **Cubic Bezier Wire Geometry**:
  $$B(t) = (1-t)^3 P_0 + 3(1-t)^2 t P_1 + 3(1-t) t^2 P_2 + t^3 P_3, \quad t \in [0, 1]$$
- **Electron Particle Motion**:
  $$t_i = (v \cdot \text{time} + \frac{i}{N}) \pmod{1}$$

---

## 🚀 How to Run Locally

### Requirements
- Any modern web browser (Google Chrome, Microsoft Edge, Firefox, Brave, Safari).
- Zero server installation required!

### Option 1: Double-Click (Zero Setup)
Simply open `index.html` in your web browser.

### Option 2: Run with Local HTTP Server
```bash
# Clone the repository
git clone https://github.com/AnishDubey0712/Logic-Circuit-Simulator.git
cd Logic-Circuit-Simulator

# Run with Python (built-in on Windows/Mac/Linux)
python -m http.server 3000
# or on Windows launcher:
py -3 -m http.server 3000
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔒 Privacy by Default (DPDP Act, 2023 Compliance)

In compliance with India's **Digital Personal Data Protection Act, 2023**:
- **100% Client-Side**: All circuit simulation, truth table generation, and data rendering execute completely inside your browser sandbox.
- **Zero Telemetry**: No personal data, tracking cookies, or circuit schematics are stored or transmitted to any third-party servers.
- **Client-Side Security**: All simulation logic runs in-browser. No API keys or credentials are hardcoded into the source code.

### 🤖 Reviewer Instructions: Testing the AI Copilot (Gemini 3.5 Flash)
The AI Copilot (`src/aiCopilot.js`) is integrated with Google Gemini 3.5 Flash:
- **Instant Out-of-the-Box Testing**: Pre-synthesized circuit models (Half/Full Adder, Subtractor, 2:1 & 4:1 Multiplexer, Majority Voter, SR Latch) work immediately with **zero configuration or API keys**.
- **Live Generative Testing (Optional)**: If you would like to test arbitrary live generation with your own Gemini API key:
  1. Open `src/aiCopilot.js` and set: `const CONFIG_API_KEY = "YOUR_GEMINI_KEY";`, OR
  2. In your browser DevTools Console (<kbd>F12</kbd>), run:
     ```javascript
     localStorage.setItem('GEMINI_API_KEY', 'YOUR_GEMINI_KEY');
     ```

---

## 📂 Project Directory Structure

```text
├── index.html            # Main HTML layout, toolbar, canvas, and chat drawer
├── style.css             # Modern dark glassmorphic stylesheet & animations
├── .gitignore            # Git exclusion rules for logs and scratch files
├── README.md             # Project documentation & reference manual
└── src/
    ├── circuit.js        # Graph model, gate logic, iterative relaxation evaluator
    ├── renderer.js       # 60 FPS HTML5 Canvas engine, Bezier wires, particles
    ├── presets.js        # Pre-built circuits (Half Adder, Full Adder, MUX, etc.)
    ├── truthTable.js     # Automated 2^N truth table solver with CSV/MD export
    ├── aiCopilot.js      # Gemini 3.5 Flash natural language CAD generator
    └── app.js            # Controller, multi-tab manager, mouse & keyboard events
```

---

## 👥 Authors & Hackathon Team
- **Event**: Vibe Coding, Swayambhu 2K26 (Batch 2)
- **Department**: MCA Department, JNEC, MGM University
- **Date**: 16 October 2026
- **Jury Member**: Akshay Walimbe
