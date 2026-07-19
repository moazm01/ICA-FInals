# Tomasulo Simulator — Complete Academic Notes
### For: Introduction to Computer Architecture | Dr. Shahid Khan
### July 2026

---

# ══ CHAPTER 0: HOW TO USE THESE NOTES ══

| Section | What it covers |
|---|---|
| **Chapter 1** | Prerequisites — everything from logic gates to pipelines |
| **Chapter 2** | The Tomasulo Algorithm — full theory, deep dive |
| **Chapter 3** | The Project — backend, frontend, WebSocket, architecture |
| **Chapter 4** | Slide Scripts — narration essay for each of the 10 slides |
| **Chapter 5** | Viva Q&A prep — 50 questions with professor-ready answers |
| **Appendix** | Vercel deployment guide |

---

# ══ CHAPTER 1: PREREQUISITES ══

## 1.1 What is a Bit and a Number?

A bit is the smallest possible piece of information a computer can handle. It can only ever be a **0** or a **1**. Think of a light switch — off is 0, on is 1.

A group of 8 bits is called a **byte**. With 8 switches (bits), you can represent 256 different numbers (2⁸ = 256), from 0 to 255.

Modern processors deal in 64-bit words, meaning they can handle 2⁶⁴ different values in a single operation.

---

## 1.2 Logic Gates — The Physical Foundation

A logic gate is a tiny electronic circuit built from transistors. It takes one or more bits as input and produces one bit as output.

| Gate | Symbol | Behaviour |
|---|---|---|
| AND | A · B | Output 1 only when BOTH inputs are 1 |
| OR | A + B | Output 1 when AT LEAST ONE input is 1 |
| NOT | Ā | Flips: 0 → 1, 1 → 0 |
| NAND | NOT(A·B) | Universal gate — any circuit can be built from it |
| NOR | NOT(A+B) | Also universal |
| XOR | A ⊕ B | Output 1 when inputs are DIFFERENT |

These gates are the **atoms** of all digital systems. Every processor, memory chip, and network card is built from billions of these gates — the exact gates you coded in VHDL lab 1 and 2.

---

## 1.3 Boolean Algebra

Boolean algebra is the maths of logic gates. Key laws:

- **Identity:** A AND 1 = A, A OR 0 = A
- **Null:** A AND 0 = 0, A OR 1 = 1
- **Complement:** A AND NOT(A) = 0
- **De Morgan's:** NOT(A AND B) = NOT(A) OR NOT(B)

**K-Maps (Karnaugh Maps):** A visual tool to simplify Boolean expressions by grouping 1s in a 2D truth table grid (using Gray code ordering). You circle groups of 1s in powers of 2, then read off the simplified expression. Used for up to 5-6 variables — beyond that, use Quine-McCluskey or computer-aided tools.

---

## 1.4 Combinational Logic: Building Useful Circuits

Combinational circuits have **no memory** — output depends only on current inputs.

### Multiplexer (MUX)
Routes one input from many to the output based on select lines.
```
          ┌──────────┐
  D0 ─────┤0         │
  D1 ─────┤1    MUX  ├──── Y (output)
  D2 ─────┤2         │
  D3 ─────┤3         │
          └────┬─────┘
             S1,S0 (select)
```
In Tomasulo, the **Common Data Bus (CDB)** is conceptually a MUX arbiter — routing one functional unit's output to all reservation stations.

### Full Adder
Adds three bits (A, B, Carry-in) → Sum + Carry-out.
- Sum = A XOR B XOR Cin
- Cout = (A AND B) OR (B AND Cin) OR (A AND Cin)

Ripple-carry adders chain full adders. Carry-lookahead adders compute all carries simultaneously (faster). These are the arithmetic circuits inside the ALUs of our simulator's functional units.

---

## 1.5 Sequential Logic — Circuits with Memory

### D Flip-Flop
Captures its input D **only on a clock edge**. Between clock edges, Q holds its value regardless of D changes.
```
     D ───┤D  Q├─── Q (stored output)
          │     │
CLK ──────┤>    │
          └─────┘
```
A **register** is a set of D flip-flops. A 64-bit register = 64 D flip-flops. Every register in a CPU is built this way.

### SR Latch
Two cross-coupled NAND gates. S=1,R=0 → Q=1. S=0,R=1 → Q=0. S=0,R=0 → hold. S=1,R=1 → forbidden (unpredictable race condition).

---

## 1.6 Finite State Machines (Moore Machines)

A **Finite State Machine (FSM)** has:
1. A fixed number of **States**
2. **Transitions** between states based on inputs
3. **Outputs** produced by the current state

A **Moore Machine** output depends **only on the current state** (not inputs) — cleaner timing, simpler verification.

### Traffic Light Example (Moore FSM)
```
RED ──(timer)──► GREEN ──(timer)──► YELLOW ──(timer)──► RED
Output: which light is illuminated (determined by state alone)
```

### Why This Matters for Tomasulo
Each Reservation Station IS a Moore FSM:
```
IDLE ──(issue)──► WAITING
                     │
              (both operands ready)
                     ▼
                 EXECUTING ──(countdown=0)──► WRITEBACK ──► IDLE
```
Output of each state:
- **IDLE:** Available for issue
- **WAITING:** Monitors CDB for matching tags
- **EXECUTING:** Decrements cycle counter
- **WRITEBACK:** Broadcasts result on CDB, frees station

---

## 1.7 VHDL — Describing Hardware Behaviour

VHDL describes circuits that run **in parallel** — all signals change simultaneously when the clock ticks. Unlike software which runs sequentially.

```vhdl
-- Tag comparator: checks if CDB broadcast matches waiting tag
process(clk)
begin
  if rising_edge(clk) then
    if rs_busy = '1' then
      if cdb_tag = rs_qj then
        rs_vj <= cdb_value;
        rs_qj <= (others => '0');
      end if;
    end if;
  end if;
end process;
```

This is directly analogous to the Python engine's CDB snooping loop.

---

## 1.8 The RISC Architecture and the 5-Stage Pipeline

### RISC Principles
- All operations act on registers (load/store architecture — only L.D and S.D touch memory)
- Fixed instruction length
- Large number of general-purpose registers
- Simple addressing modes

### Our Instruction Set
| Instruction | Meaning |
|---|---|
| `L.D F6, 32(R2)` | Load 8 bytes from memory[R2+32] into F6 |
| `S.D F10, 48(R2)` | Store F10 to memory[R2+48] |
| `ADD.D F6, F8, F2` | F6 = F8 + F2 |
| `SUB.D F8, F6, F2` | F8 = F6 − F2 |
| `MUL.D F0, F2, F4` | F0 = F2 × F4 |
| `DIV.D F10, F0, F6` | F10 = F0 / F6 |

### The 5-Stage Pipeline
```
Clock →   1    2    3    4    5    6    7
Inst 1:  [IF] [ID] [EX] [ME] [WB]
Inst 2:       [IF] [ID] [EX] [ME] [WB]
Inst 3:            [IF] [ID] [EX] [ME] [WB]
```
- **IF:** Read instruction from memory
- **ID:** Decode + read source registers
- **EX:** ALU computation
- **ME:** Memory access (Load/Store)
- **WB:** Write result to register

Ideal: 1 instruction per clock cycle. Reality: stalls.

---

## 1.9 Data Hazards — Why Pipelines Stall

### RAW — Read After Write (TRUE dependency)
```assembly
MUL.D F0, F2, F4    ; computing F0 (4 cycles)
ADD.D F6, F0, F8    ; NEEDS F0 — must wait 3 cycles!
```
This is genuine — ADD.D truly needs F0 to be computed. The pipeline stalls.

### WAR — Write After Read (FALSE dependency)
```assembly
ADD.D F4, F1, F2    ; reads F1
SUB.D F1, F3, F5    ; writes F1 later
```
False dependency — only because both use the name F1. Register renaming eliminates this.

### WAW — Write After Write (FALSE dependency)
```assembly
ADD.D F0, F1, F2    ; writes F0 first
MUL.D F0, F3, F4    ; writes F0 second
```
False — just need final F0 from MUL.D. Renaming eliminates this.

**Key insight:** Only RAW is real. WAR and WAW are naming accidents. Tomasulo eliminates WAR and WAW via register renaming, and minimises RAW stall impact via CDB forwarding.

---

## 1.10 Performance Metrics

### CPI (Cycles Per Instruction)
- Ideal pipeline: CPI = 1
- Stalling pipeline: CPI > 1
- Effective CPI = Ideal CPI + Stall cycles per instruction

### Speedup
$$\text{Speedup} = \frac{\text{Cycles}_{\text{in-order}}}{\text{Cycles}_{\text{Tomasulo}}} = \frac{37}{19} \approx 1.95\times$$

### Amdahl's Law
$$\text{Speedup}_{\max} = \frac{1}{(1-P) + P/S}$$
Where P = fraction of execution that benefits, S = speedup of that fraction.
If 50% of cycles are stalls and Tomasulo eliminates them: max speedup = 1/(1-0.5) = 2×. Our 1.95× is consistent.

---

# ══ CHAPTER 2: THE TOMASULO ALGORITHM ══

## 2.1 Historical Context

**Robert Tomasulo**, IBM engineer, 1967. The **IBM System/360 Model 91** supercomputer needed to handle multiple high-latency floating-point units without stalling. His paper: *"An Efficient Algorithm for Exploiting Multiple Arithmetic Units"* (IBM Journal of R&D, 1967).

For 20 years this was niche. Then **Intel Pentium Pro (1995)** brought out-of-order execution to mainstream desktops. Today, the Apple M3, Intel Core Ultra, Snapdragon 8 Elite — all use Tomasulo's principles.

---

## 2.2 The Three Core Innovations

### 1. Reservation Stations
Buffers in front of each functional unit. An instruction issues from the queue into a reservation station. It waits there, with its operands or tags, until it can execute. There are multiple stations per unit type (3 Add, 2 Mult, 2 Div, 3 Load, 3 Store in our simulator).

### 2. Register Renaming (Register Status Table)
Each architectural register (F0, F2, etc.) stores either:
- A **value** — "F0 = 64.0"
- A **tag** — "F0 is waiting for Mult1"

When an instruction issues, its destination register is renamed to the station's tag. Subsequent instructions that need that register receive the tag — they subscribe to the CDB to receive the value when it's broadcast.

### 3. Common Data Bus (CDB)
A broadcast bus. When a functional unit finishes, it broadcasts **(tag, value)** to ALL reservation stations and the register file simultaneously. Any station or register whose matching tag captures the value immediately. This is the snooping mechanism.

---

## 2.3 The Three Phases

### Phase 1: Issue
One instruction per cycle:
1. Take next instruction from IQ
2. Find a free RS of correct type (if none → structural stall)
3. For each source register:
   - If register has **value** → copy to Vj/Vk in RS
   - If register has **tag** → copy tag to Qj/Qk in RS (will snoop CDB)
4. Rename destination register to station's tag
5. Set station busy, set `busy_cycles_left = latency`
6. Advance IQ pointer

### Phase 2: Execute
For each busy RS each cycle:
- If Qj == None AND Qk == None (operands ready) → decrement `busy_cycles_left`
- When `busy_cycles_left` reaches 0 → mark ready to write

### Phase 3: Write Result (CDB Broadcast)
1. Find all stations with `busy=True AND busy_cycles_left=0`
2. Pick the one with lowest `instruction_id` (oldest instruction wins CDB conflict)
3. Broadcast **(tag, value)** on CDB:
   - Every register with matching tag → copy value, clear tag
   - Every RS with matching Qj or Qk → copy value, clear Qj/Qk
4. Free the station

**Note on Store:** S.D does NOT broadcast. It writes to memory dict and frees station silently — no register depends on a store's result.

---

## 2.4 Reverse Execution Order — WHY

Our engine runs: **Write Result → Execute → Issue** (reverse of pipeline order).

**The reason:** In real VLSI, state changes happen AT the clock edge. A result written at end of cycle N cannot be read until cycle N+1.

If we ran Issue first: an instruction could issue, and a Write could broadcast in the same "cycle", letting the freshly-issued instruction skip its waiting period. This violates clock boundary semantics.

Running Write first ensures: broadcasts propagate before Execute checks operand readiness, and Issue runs last so newly-issued instructions cannot receive same-cycle broadcasts. The simulation faithfully models actual hardware clock boundaries.

---

## 2.5 Limitations of the 1967 Original

Our simulator faithfully implements the original, with known academic limitations:

| Limitation | Effect | Modern Solution |
|---|---|---|
| No Reorder Buffer | Results committed out-of-order, can't undo | ROB (used since Pentium Pro) |
| No branch handling | Programs must be branch-free | Branch prediction + speculation |
| Single CDB | One broadcast per cycle | Multiple result buses in modern CPUs |
| Simplified memory | No cache hierarchy, no aliasing | Load-Store Queue + cache simulation |
| No speculative execution | Can't look beyond branches | ROB + branch predictor |

---

# ══ CHAPTER 3: THE PROJECT ARCHITECTURE ══

## 3.1 System Overview

```
Browser (Next.js/TypeScript frontend)
        ↕ HTTP POST (step/reset/load)
        ↕ WebSocket (streaming play mode)
Backend (FastAPI Python)
        ↓
Simulation Engine (Python dataclasses)
        ↓
In-Memory State (RS, RegFile, IQ, Memory dict)
```

## 3.2 Backend File Structure
```
backend/
├── api/
│   ├── main.py         — FastAPI routes, CORS, WebSocket handler
│   └── parser.py       — Assembly text → Instruction objects
└── engine/
    ├── instruction.py         — Instruction dataclass (id, opcode, src1, src2, dest, cycle timestamps)
    ├── reservation_station.py — ReservationStation dataclass (busy, op, vj, vk, qj, qk, cycles_left)
    ├── register_status.py     — RegisterFile class (dict of {value, tag})
    ├── tomasulo_engine.py     — Main engine: issue/execute/write loop
    └── inorder_engine.py      — 5-stage in-order pipeline for comparison
```

### Engine Core — `step_cycle()`
```python
def step_cycle(self):
    self.clock += 1
    self.cdb_broadcast = None

    self._write_result_stage()   # Broadcast completed results first
    self._execute_stage()         # Decrement counters, start exec
    self._issue_stage()           # Issue next instruction from IQ

    return self.get_state_snapshot()
```

### Instruction Dataclass
```python
@dataclass
class Instruction:
    id: int
    opcode: str           # "ADD.D", "MUL.D", "L.D" etc.
    dest: str             # Destination register "F0", "F6"
    src1: str             # Source 1 register
    src2: str             # Source 2 register or offset
    issue_cycle: int = None
    exec_start_cycle: int = None
    exec_end_cycle: int = None
    write_back_cycle: int = None
```

All four cycle timestamps are populated as the instruction progresses — this is what the Gantt chart visualises.

### ReservationStation Dataclass
```python
@dataclass
class ReservationStation:
    name: str            # "Add1", "Mult2", "Load3"
    busy: bool = False
    op: str = None
    vj: float = None     # Source 1 value (if ready)
    vk: float = None     # Source 2 value (if ready)
    qj: str = None       # Tag for source 1 (if not ready)
    qk: str = None       # Tag for source 2 (if not ready)
    dest: str = None     # Destination register
    busy_cycles_left: int = 0
    instruction_id: int = None
```

Vj/Vk hold real values. Qj/Qk hold tag strings. If both Qj and Qk are None, both operands are available → instruction can execute.

### FastAPI Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Health check — returns `{"status":"running"}` |
| POST | `/api/load-program` | Parse assembly, init both engines, return snapshot |
| POST | `/api/simulate/step` | Advance both engines 1 cycle, return snapshot |
| POST | `/api/simulate/reset` | Re-init with same program |
| WebSocket | `/ws/stream` | Streaming play mode — accepts speed commands |

---

## 3.3 Frontend File Structure
```
frontend/
├── app/
│   ├── page.tsx         — Main page: Ctrl+K listener, state management, layout
│   ├── layout.tsx       — HTML shell, fonts
│   └── globals.css      — CSS variables, design tokens, animations
├── components/
│   ├── AssemblyPanel.tsx       — Code editor textarea
│   ├── ReservationMatrix.tsx   — All RS rows as a table
│   ├── RegisterStatus.tsx      — Register file viewer
│   ├── ExecutionTimeline.tsx   — Gantt chart per instruction
│   ├── ControlHUD.tsx          — Play/Step/Reset/Speed controls
│   ├── StatsCards.tsx          — Speedup and summary cards
│   ├── CompletionChart.tsx     — Line chart (Recharts) comparing engines
│   └── PresentationModal.tsx   — 10-slide academic presentation
└── lib/
    └── types.ts                — TypeScript types matching backend JSON
```

### Key Design Decisions
- **WebSocket for Play mode:** Single persistent TCP connection vs. repeated HTTP polling overhead. Gives smoother real-time animation.
- **Reverse execution order in engine:** Ensures clock boundary accuracy (see Chapter 2.4).
- **CDB animation:** When `cdb_broadcast` is non-null, CSS class `cdb-pulse-active` triggers the `cdb-sweep` keyframe animation — a blue shimmer across relevant RS rows.
- **Global Ctrl+K listener:** `window.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'k') setShowPresentation(true); })` wired in a `useEffect` on `page.tsx`.
- **Fullscreen on presentation open:** `document.documentElement.requestFullscreen()` called in a `useEffect` watching `isOpen` in `PresentationModal.tsx`.

---

# ══ CHAPTER 4: SLIDE NARRATION SCRIPTS ══

## Slide 1 — Introduction (30 seconds)
> "Good morning Dr. Shahid Khan and everyone. My name is [Name].
>
> Today's project came from a natural question: we've learned how logic gates become pipelines — what comes next?
>
> The answer is the Tomasulo Algorithm. Invented at IBM in 1967. Running in the processor of every smartphone and laptop in this room today.
>
> We built a full interactive simulator in Python + FastAPI + Next.js that shows you, in real time, how a CPU executes instructions out-of-order to extract maximum performance."

---

## Slide 2 — The Pipeline Problem (45 seconds)
> "To understand what Tomasulo solves, we need to understand the problem.
>
> In a standard in-order RISC pipeline, instructions flow in sequence. With MUL.D taking 4 cycles, any instruction that needs F0 must wait — a stall. Worse: the instructions BELOW the dependent one are also blocked. They have no dependencies whatsoever, but the pipeline has frozen.
>
> This is a RAW hazard — Read After Write. The pipeline wastes cycles because it cannot look past the stall.
>
> The in-order simulation of our exact benchmark: 37 cycles. 18 of those are wasted stall bubbles."

---

## Slide 3 — The Core Idea (45 seconds)
> "Tomasulo's insight was: if instructions can't go forward because of ONE dependency, let everything ELSE go around it.
>
> Think of a fast-food kitchen. In-order: one long line, burger blocks everyone. Tomasulo's kitchen: take everyone's order, give them ticket numbers — that's register renaming — sit them at tables — those are reservation stations — and when food is ready, shout the ticket number on a loudspeaker — that's the Common Data Bus.
>
> Nobody waits unnecessarily. The drink is served while the burger cooks. Maximum throughput."

---

## Slide 4 — Layout Diagram (45 seconds)
> "The hardware block diagram: instructions enter from the Instruction Queue and are dispatched to Reservation Stations — specific buffer types for Add, Multiply, Divide, Load, and Store.
>
> The Register File tracks a tag for each register — a pointer saying 'this register will be produced by Mult1.'
>
> When a station has all operands, it passes to a Functional Unit. When done, the result goes to the Common Data Bus — which loops back to ALL stations and the register file simultaneously.
>
> That loopback is everything. It means waiting instructions don't need to wait for the register file to be updated — they get the value directly from the CDB the instant it's available."

---

## Slide 5 — Hardware: Moore FSM & VHDL (45 seconds)
> "Let me connect this to what we actually studied this semester.
>
> In Unit 3, Moore FSMs: output depends only on current state. Each reservation station IS a Moore FSM. Four states: IDLE → WAITING → EXECUTING → WRITEBACK → IDLE.
>
> At right, a conceptual VHDL process block describes the tag comparator — the combinational circuit that checks if the CDB broadcast tag matches a station's waiting tags. It's a sensitivity-list process, rising-edge triggered, string comparison — exactly the circuits we built in lab, applied at a higher level.
>
> Your NAND gate from week 1 is the ancestor of this circuit."

---

## Slide 6 — Engine Design: The Code (40 seconds)
> "The Python simulation engine. Every cycle calls `step_cycle()`. Three stages — but notice the ORDER: Write Result first, then Execute, then Issue.
>
> This is reverse pipeline order. Why? In real VLSI, state changes happen at clock edges. A result written at end of cycle N cannot be read until N+1. Running Write first, then Execute, then Issue ensures no freshly-issued instruction can skip its waiting period in the same cycle it was issued. Clock boundary accuracy — matching actual hardware."

---

## Slide 7 — Live Demo (60 seconds — switch to browser)
> BEFORE switching: "I'll show you this live. Let me switch to the simulator."
>
> AFTER switching to localhost:3000:
> "You can see the assembly editor — 7 floating-point instructions with deliberate dependencies. I'll step cycle by cycle.
>
> Cycle 1: Load1 is occupied. Register F6 is tagged — it's been renamed.
> Step... Cycle 3: Register F0 shows tag 'Mult1' — F0 has been renamed to a future result.
> Step... Load finishes. Watch the CDB broadcast — Mult1 station captures the value immediately.
>
> Play." [Let it run]
>
> "Look at the Gantt chart: instructions 3 and 4 overlap. That is out-of-order execution, live.
>
> Tomasulo: 19 cycles. In-order: 37 cycles. Same program. Nearly half the time."

---

## Slide 8 — Benchmarking Results (40 seconds)
> "The numbers: our benchmark has 7 floating-point instructions with a deliberate dependency chain — two loads, multiply dependent on second load, subtract independent, divide dependent on multiply, add dependent on both, store.
>
> In-order: 37 cycles. 18 stall bubbles.
> Tomasulo: 19 cycles. Almost no wasted cycles.
>
> Speedup = 37/19 ≈ 1.95×. We nearly doubled throughput.
>
> With memory latency — a cache miss sending a load to DRAM which takes 200 cycles — Tomasulo's advantage becomes enormous. It keeps executing hundreds of independent instructions while the load waits. In-order freezes for 200 cycles. This is why out-of-order execution is non-negotiable in modern processors."

---

## Slide 9 — Real-World Applications (45 seconds)
> "This isn't academic history. It's in your pocket right now.
>
> Apple M3: 192 reservation stations. When your MacBook compiles code, it is issuing, renaming, and broadcasting on internal result buses billions of times per second.
>
> Intel Core Ultra: 512-instruction out-of-order window.
>
> Snapdragon 8 Elite in high-end Android phones: same architecture. Your camera processing, GPS navigation, real-time video compression — all running on descendants of Tomasulo's 1967 idea.
>
> NVIDIA GPU tensor cores: when hiding memory latency during neural network training — same principle, applied at massive scale.
>
> The AND gate from lab 1 is the ancestor of all of this."

---

## Slide 10 — Conclusion (30 seconds)
> "To conclude: from AND gates → adders → D flip-flops → Moore FSMs → RISC pipeline → Tomasulo. One continuous line.
>
> Our project: timing-accurate Python engine. Real-time visualisation of register renaming, CDB broadcasts, and RS lifecycles. Measured 1.95× speedup over in-order. Every component traceable to course fundamentals.
>
> Thank you Dr. Shahid Khan for teaching us the building blocks that make all of this possible.
> I'm open to questions."

---

# ══ CHAPTER 5: VIVA Q&A PREPARATION ══

### Q1: What is the difference between combinational and sequential logic?
Combinational: output depends only on current inputs, no memory (adders, MUXes). Sequential: uses feedback and clock to maintain state — output depends on history (flip-flops, registers, FSMs). Processors need both.

### Q2: Why are NAND gates universal?
Any Boolean function can be built with only NAND. NOT = A NAND A. AND = invert NAND. OR = De Morgan applied to NAND. Since AND+OR+NOT is complete, NAND alone is sufficient.

### Q3: Explain De Morgan's Law and its significance.
NOT(A AND B) = NOT(A) OR NOT(B). NOT(A OR B) = NOT(A) AND NOT(B). Allows pushing inversions through gate networks — converting AND-OR implementations to cheaper NAND-NAND in CMOS.

### Q4: What is a K-Map?
A 2D grid of a truth table where adjacent cells differ by exactly one variable (Gray code). Group 1s in powers of 2. Read off the minimal Boolean expression. Reduces gate count, saves power and chip area.

### Q5: What is the SR Latch forbidden state?
S=1, R=1 drives both Q and Q̄ to 0, violating the complementary invariant. When both return to 0, output is unpredictable (race condition). Eliminated in the D flip-flop by forcing R = NOT(S) at all times.

### Q6: What makes the D flip-flop better for registers?
It captures input ONLY on the clock edge. No forbidden state (D drives both S and its complement). Clean timing. All CPU registers are built from D flip-flops.

### Q7: Moore vs. Mealy FSM?
Moore: output depends only on current state. Mealy: output depends on current state AND current input. Moore is simpler to verify; output changes only on state transitions, not on every input glitch. Reservation stations modeled as Moore FSMs.

### Q8: What are the three types of data hazards?
RAW (Read After Write) — true dependency. WAR (Write After Read) — false. WAW (Write After Write) — false. Only RAW cannot be eliminated. Tomasulo eliminates WAR and WAW via register renaming.

### Q9: What three hazards does Tomasulo eliminate and how?
WAR: register renaming gives each write a unique tag — old reader uses old value unaffected. WAW: only the latest tag appears in the register file — earlier writes are irrelevant. RAW: not eliminated, but minimized — dependent instruction issues immediately and waits in RS, ready to execute the instant CDB broadcasts.

### Q10: What happens if two stations finish in the same cycle and want to broadcast?
CDB conflict — only one broadcast per cycle. Priority to the instruction with the lowest instruction_id (oldest instruction). The other waits one cycle. Ensures program ordering semantics and no starvation.

### Q11: Why does a Store NOT broadcast on the CDB?
A store writes to memory, not to a register. No other instruction reads from memory through the CDB — it reads through L.D instructions. So no consumer is waiting for a store's "result tag" on the CDB.

### Q12: What is a structural hazard in Tomasulo?
All RS of the required type are busy. New instruction cannot issue. The engine does not advance the IQ pointer — retries next cycle. This is the one type of stall Tomasulo does NOT fully eliminate (limited physical resources).

### Q13: Explain the CDB snooping mechanism.
Every cycle after Write Result, every RS checks `if rs.qj == broadcast_tag: rs.vj = broadcast_value; rs.qj = None`. This happens SIMULTANEOUSLY for all stations — implemented in hardware as parallel tag comparator circuits running in one gate delay. That's the "broadcast" — all listeners check at once.

### Q14: Why does the engine run Write→Execute→Issue instead of Issue→Execute→Write?
Clock boundary accuracy. In VLSI, results written at end of cycle N cannot be read until cycle N+1. Running Write first ensures broadcasts propagate before Execute checks readiness. Running Issue last ensures newly-issued instructions cannot receive same-cycle broadcasts.

### Q15: What would adding a Reorder Buffer (ROB) change?
ROB holds results in-order. Instructions execute out of order but commit (write to architectural register file) in program order. Enables: (1) precise exceptions — know exactly which instructions committed before fault, (2) speculative execution — flush ROB on misprediction without corrupting register state. The original Tomasulo lacks both.

### Q16: Compare Tomasulo to Scoreboarding (CDC 6600, 1964).
Scoreboarding also allows OoO but: (1) instructions wait at register READ (no forwarding), (2) WAR and WAW handled by stalling (not renaming), (3) no CDB forwarding. Tomasulo improves all three: RS buffers operands, CDB forwards values, renaming eliminates false dependencies.

### Q17: What is Amdahl's Law and how does it apply?
Speedup_max = 1 / ((1-P) + P/S). If 50% of cycles are stalls and Tomasulo eliminates them (S→∞): max = 1/0.5 = 2×. Our 1.95× is consistent with eliminating most but not all stalls.

### Q18: What is ILP and what limits it?
Instruction-Level Parallelism — how many instructions can theoretically execute simultaneously. Limited by: RAW dependencies, control flow (branches), memory aliasing, finite hardware resources (limited RS slots, limited result buses).

### Q19: Is this simulator Turing-complete?
No. It executes only branch-free sequences of 6 floating-point instruction types. Turing-completeness requires conditional branching and arbitrary memory access. The simulator focuses on scheduling mechanics, not general computation.

### Q20: How did you verify correctness?
1. Manual trace — hand-computed expected cycle timestamps and compared. 2. Verified write_back_cycle ordering: dependent instructions always write AFTER their dependency. 3. Verified final register values match Python arithmetic on initial values. 4. pytest tests in `tests/` directory cover parser and engine unit logic.

### Q21: How would you extend this to support branches?
Add a branch predictor (e.g., 2-bit saturating counter). Add a Reorder Buffer. On issue of a branch, record prediction in ROB. Execute instructions after the branch speculatively. When branch resolves: if correct, commit. If wrong, flush ROB, clear all RS, restart fetch from correct target.

### Q22: What is the Von Neumann Bottleneck?
CPU and memory connected by a bus. As CPUs got faster and DRAM latency improved slowly, the bus became the limiting factor. Solutions: cache hierarchies, out-of-order execution (hides latency), prefetching, SIMD, compute-in-memory architectures.

### Q23: How does the frontend communicate with the backend?
Two channels: (1) REST HTTP POST for load, step, reset — synchronous request/response. (2) WebSocket for continuous play mode — persistent TCP connection, server pushes state snapshots every cycle at configured speed. WebSocket is preferred for real-time streaming to avoid HTTP request overhead per cycle.

### Q24: Why use Next.js for this project?
React's reactive state model maps perfectly to "update entire state every cycle and re-render all components." No manual DOM manipulation needed — just `setState(newSimulatorState)` and React diffs and updates. Next.js adds TypeScript, bundling, and dev server conveniences.

### Q25: What does the CPI tell us about each engine's efficiency?
In-order: 37 cycles / 7 instructions = CPI ≈ 5.3. Tomasulo: 19 cycles / 7 instructions = CPI ≈ 2.7. The ideal would be CPI = 1.0. Remaining gap in Tomasulo is due to RAW dependencies that can't be parallelized (multiply must finish before divide can start) and the single CDB limiting write throughput.

---

# ══ APPENDIX: VERCEL DEPLOYMENT ══

## Can This Be Deployed on Vercel?

**Frontend (Next.js) → Vercel ✅**

```bash
# Push frontend/ to GitHub, then in Vercel:
# Root directory: frontend/
# Environment variable: NEXT_PUBLIC_API_URL=https://your-backend-url
```

**Backend (FastAPI + WebSockets) → NOT Vercel ❌**

Reason: Vercel is serverless. Each request spawns a fresh function — no persistent global state, and WebSocket connections not supported.

| Platform | Notes |
|---|---|
| **Railway** | Free tier, persistent Python, WebSocket ✅ — RECOMMENDED |
| **Render.com** | Free tier, FastAPI support ✅ |
| **Fly.io** | Container-based, excellent for WebSocket ✅ |
| **AWS EC2 / DigitalOcean** | ~$5/month, maximum control |

**Recommended setup for student deployment:**
1. Backend → Railway (connect GitHub, set start command: `uvicorn api.main:app --host 0.0.0.0 --port 8000`)
2. Frontend → Vercel (set `NEXT_PUBLIC_API_URL` to Railway URL)

---

*End of Notes — Zero to Hero: Logic Gates → Pipelines → Tomasulo Algorithm → Project → Presentation → Viva*
