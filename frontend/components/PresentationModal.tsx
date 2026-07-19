'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowRight, ArrowLeft, Play, Cpu, BookOpen } from 'lucide-react';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PresentationModal({ isOpen, onClose }: PresentationModalProps) {
  const [current, setCurrent] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [scale, setScale] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);

  const totalSlides = 10;

  // Speaker notes for each slide
  const speakerNotes = [
    "Slide 1: Intro. Open strong. Direct Dr. Shahid Khan's attention to the course syllabus. This project shows how logic gates, FSMs, and RISC units scale into a high-performance, out-of-order execution processor simulator.",
    "Slide 2: Prerequisites. Explain to classmates that an in-order pipeline is like a sequential assembly line. If a slow instruction (like Multiply taking 4 cycles) stalls, the whole line freezes, even if subsequent instructions (like Subtract) are completely independent.",
    "Slide 3: The Analogy. Use the Fast-Food Kitchen analogy to make the concepts click. In-order = one long line where everyone waits. Out-of-order = handing out Ticket Numbers (Register Renaming) and waiting at tables (Reservation Stations) until the Order Board (CDB) shouts your number.",
    "Slide 4: Layout. Walk Dr. Khan through the block diagram. Explain how registers, reservation stations, and functional units talk to each other. Point out the CDB loopback which updates operands dynamically.",
    "Slide 5: Formalism. Focus on Dr. Khan's French academic background. Explain the Moore Finite State Machine modeling the reservation station lifecycle, and show the VHDL conceptual representation of the Tag Matcher comparator.",
    "Slide 6: Backend Design. Explain the simulator engine's reverse pipeline execution order: Write Back -> Execute -> Issue. Running in reverse is critical to avoid zero-cycle data bypasses, respecting hardware clock boundaries.",
    "Slide 7: Demo Guide. Prep the audience for the 60-second live demonstration. Highlight Register Renaming on Cycle 3 (F0 tagged to Mult1) and the Common Data Bus broadcast on Cycle 4 bypassing the register file.",
    "Slide 8: Benchmarking. Present the math: Speedup = 37 / 19 = 1.95x (49% cycle reduction). Explain that if we modeled memory latency or cache misses, Tomasulo's speedup would increase exponentially by hiding memory delays.",
    "Slide 9: Last Strike. Connect this algorithm to the classmates' lives. Apple M-chips, Intel, AMD, and smartphone cores all use dynamic scheduling. The simple logic gates they learn in this course are the building blocks of modern supercomputing.",
    "Slide 10: Conclusion. Thank Dr. Khan and classmates. Reinforce that advanced architecture is built on the digital logic foundations taught in this class. Open the floor to questions."
  ];

  // Global keyboard listener for slide navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'n' || e.key === 'N') {
        setShowNotes(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, current]);

  // Request fullscreen when presentation opens, exit when closed
  useEffect(() => {
    if (isOpen) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
  }, [isOpen]);

  // Dynamically scale slide container to maintain 16:9 aspect ratio and fit window size
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (!viewportRef.current) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight * 0.82;
      const baseWidth = 1024;
      const baseHeight = 576;
      const scaleX = vw / baseWidth;
      const scaleY = vh / baseHeight;
      const newScale = Math.min(scaleX, scaleY, 2.0);
      setScale(newScale);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('fullscreenchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('fullscreenchange', handleResize);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const next = () => {
    if (current < totalSlides - 1) setCurrent(current + 1);
  };

  const prev = () => {
    if (current > 0) setCurrent(current - 1);
  };

  const goTo = (index: number) => {
    setCurrent(index);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex flex-col justify-between p-6 select-none font-sans text-neutral-200">
      
      {/* Top Bar Header */}
      <div className="flex justify-between items-center border-b border-white/10 pb-4 px-4">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 text-apple-blue animate-pulse" />
          <div>
            <h2 className="text-sm font-bold tracking-wide uppercase text-white">Tomasulo Architecture Simulator</h2>
            <p className="text-xs text-neutral-400">Class Presentation &bull; Dr. Shahid Khan (2026)</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowNotes(!showNotes)} 
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              showNotes 
                ? 'bg-apple-blue/20 border-apple-blue text-apple-blue' 
                : 'border-white/10 text-neutral-400 hover:text-white'
            }`}
          >
            Speaker Notes (N)
          </button>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Slide Presentation Viewport */}
      <div className="flex-1 flex items-center justify-center overflow-hidden my-4 relative">
        <div 
          ref={viewportRef}
          style={{ 
            width: '1024px', 
            height: '576px', 
            transform: `scale(${scale})`,
            transformOrigin: 'center center'
          }}
          className="bg-neutral-900 border border-white/10 rounded-xl relative shadow-2xl overflow-hidden flex flex-col justify-between p-12 transition-transform duration-200"
        >
          {/* Ambient mesh background gradient overlay */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-25">
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-apple-blue/40 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-apple-purple/30 blur-3xl"></div>
          </div>

          <div className="absolute inset-0 z-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

          {/* Slide Content Render Grid (Z-1) */}
          <div className="z-10 flex-1 flex flex-col justify-between">
            
            {/* Slide Category Header */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold tracking-widest uppercase text-apple-blue bg-apple-blue/10 px-2.5 py-1 rounded-md border border-apple-blue/20">
                {getSlideCategory(current)}
              </span>
              <span className="text-xs font-mono text-neutral-500">
                Slide {current + 1} of {totalSlides}
              </span>
            </div>

            {/* Main Title & Body */}
            <div className="flex-1 flex flex-col justify-center">
              {renderSlideContent(current)}
            </div>

            {/* Slide Footer */}
            <div className="mt-8 border-t border-white/5 pt-4 flex justify-between items-center text-[10px] text-neutral-500 font-mono">
              <div>COMP ARCH &bull; DR. SHAHID KHAN</div>
              <div>© 2026 UNIVERSITY INTRO TO COMPUTER ARCHITECTURE</div>
            </div>
          </div>
        </div>
      </div>

      {/* Speaker Notes Overlay Panel */}
      {showNotes && (
        <div className="bg-neutral-900 border border-white/10 rounded-xl p-5 mx-auto max-w-4xl w-full mb-4 shadow-xl flex gap-4 items-start animate-fade-in">
          <BookOpen className="w-5 h-5 text-apple-purple shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-apple-purple mb-1">Presenter Script / Speaker Notes</h4>
            <p className="text-sm text-neutral-300 leading-relaxed font-sans">{speakerNotes[current]}</p>
          </div>
        </div>
      )}

      {/* Bottom Controls / Indicators */}
      <div className="border-t border-white/10 pt-4 pb-2 px-4 flex justify-between items-center">
        <div className="flex gap-2">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === current ? 'w-8 bg-apple-blue' : 'w-2.5 bg-neutral-700 hover:bg-neutral-600'
              }`}
              title={`Go to Slide ${idx + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={prev}
            disabled={current === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-xs font-medium hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Previous
          </button>
          <button
            onClick={next}
            disabled={current === totalSlides - 1}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-apple-blue text-xs font-bold hover:bg-apple-blue/90 disabled:opacity-30 disabled:pointer-events-none transition-colors text-white"
          >
            Next <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function getSlideCategory(index: number): string {
  const categories = [
    "Introduction",
    "Prerequisites",
    "Conceptual Analogy",
    "System Layout",
    "Hardware Formalism",
    "Simulation Engine",
    "Live Walkthrough",
    "Benchmarking",
    "Real-World Impact",
    "Conclusion"
  ];
  return categories[index] || "Architecture";
}

function renderSlideContent(index: number) {
  switch (index) {
    case 0:
      return (
        <div className="text-center flex flex-col justify-center items-center py-6">
          <div className="mb-4 inline-flex p-3 rounded-full bg-apple-blue/10 border border-apple-blue/20">
            <Cpu className="w-12 h-12 text-apple-blue" />
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white leading-none">
            Tomasulo Simulator
          </h1>
          <h2 className="text-2xl font-bold mt-3 text-neutral-300">
            Bridging Logic Gates to Out-of-Order Execution
          </h2>
          <p className="text-sm text-neutral-400 mt-6 max-w-xl leading-relaxed">
            A dynamic pipeline scheduling engine visualizing register renaming, reservation stations, and Common Data Bus (CDB) broadcasts in real time.
          </p>
          <div className="flex gap-6 mt-8 text-xs font-mono text-neutral-500 border border-white/5 bg-white/[0.02] px-6 py-3 rounded-full">
            <span>FastAPI &bull; Python Backend</span>
            <span className="text-neutral-700">|</span>
            <span>Next.js &bull; TypeScript Frontend</span>
            <span className="text-neutral-700">|</span>
            <span>WebSocket streaming</span>
          </div>
        </div>
      );

    case 1:
      return (
        <div className="grid grid-cols-2 gap-8 items-center h-full">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4">
              The Sequential Wall: Why Simple Processors Stall
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Standard processors execute in program order. If an instruction waits for a slow resource, the pipeline stalls.
            </p>
            <div className="mt-6 space-y-3">
              <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg flex gap-3 items-center">
                <div className="h-2 w-2 rounded-full bg-apple-red shrink-0 animate-ping"></div>
                <div className="text-xs">
                  <span className="font-semibold text-white">Data Hazard:</span> Read After Write (RAW) forces waiting.
                </div>
              </div>
              <div className="p-3 bg-neutral-800/40 border border-white/5 rounded-lg flex gap-3 items-center">
                <div className="h-2 w-2 rounded-full bg-apple-orange shrink-0"></div>
                <div className="text-xs text-neutral-300">
                  <span className="font-semibold text-white">Blocked Pipelines:</span> Independent commands block behind stalls.
                </div>
              </div>
            </div>
          </div>
          <div className="bg-neutral-950/80 border border-white/10 p-5 rounded-xl font-mono text-xs flex flex-col justify-between h-[280px]">
            <div>
              <div className="text-neutral-500 mb-2">// In-Order Pipeline Stall Example</div>
              <div className="space-y-1">
                <div className="text-neutral-400">Cycle 1-4: <span className="text-apple-purple font-semibold font-mono">MUL.D</span> F0, F2, F4 <span className="text-neutral-600">(Takes 4 cycles)</span></div>
                <div className="text-neutral-400">Cycle 5-6: <span className="text-apple-orange font-semibold font-mono">ADD.D</span> F6, F0, F8 <span className="text-red-400">(Stalls waiting for F0)</span></div>
                <div className="border border-red-900/50 bg-red-950/10 text-red-300/80 px-2 py-1 my-1 rounded text-[10px] flex justify-between">
                  <span>PIPELINE STALL: ADD.D block</span>
                  <span>⛔ 2 cycles lost</span>
                </div>
                <div className="text-neutral-500 opacity-60">Cycle 7-8: <span className="text-apple-blue font-semibold font-mono">SUB.D</span> F10, F12, F14 <span className="text-neutral-600">(Blocked in queue, even though independent)</span></div>
              </div>
            </div>
            <div className="border-t border-white/5 pt-2 text-[10px] text-neutral-500">
              * A slow multiplier stalls the entire in-order CPU.
            </div>
          </div>
        </div>
      );

    case 2:
      return (
        <div className="grid grid-cols-2 gap-8 items-center h-full">
          <div className="bg-neutral-950/80 border border-white/10 p-6 rounded-xl relative flex flex-col justify-around h-[300px]">
            <div className="border-b border-white/10 pb-3">
              <h4 className="text-xs font-bold tracking-wider text-apple-blue uppercase mb-1">Standard CPU Kitchen</h4>
              <p className="text-xs text-neutral-400">Customer 1 orders a burger (takes 5 mins). Customer 2 orders a drink (takes 5 secs). Customer 2 waits at the counter behind Customer 1. The kitchen freezes.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-wider text-apple-purple uppercase mb-1">Tomasulo Kitchen</h4>
              <p className="text-xs text-neutral-400">Cashier takes orders, hands out ticket numbers (Tags). Customers wait at tables (Reservation Stations). Drink chef serves Customer 2 immediately. When burger chef is ready, they call "Burger #12" (CDB Broadcast).</p>
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4">
              The Analogy: Out-of-Order Kitchen
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed mb-4">
              By decoupling ordering from cooking, Tomasulo dynamically schedules tasks.
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                <span className="block text-lg font-bold text-apple-blue font-sans">Tag</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Ticket Number</span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                <span className="block text-lg font-bold text-apple-purple font-sans">Res Station</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Dining Table</span>
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg">
                <span className="block text-lg font-bold text-apple-orange font-sans">CDB Bus</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Order Board Shouts</span>
              </div>
            </div>
          </div>
        </div>
      );

    case 3:
      return (
        <div className="flex flex-col justify-between h-full">
          <div className="mb-4">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Hardware Architecture: Block Interconnections
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Dynamic data routing and hazard resolution path of the simulator.
            </p>
          </div>

          <div className="flex-1 grid grid-cols-4 gap-4 items-center max-h-[260px]">
            
            {/* Col 1 */}
            <div className="flex flex-col gap-3">
              <div className="p-3 rounded-lg bg-neutral-800/80 border border-white/10 text-center shadow-lg">
                <div className="text-xs font-bold text-white mb-1">Instruction Queue</div>
                <div className="text-[10px] text-neutral-400 font-mono">Parsed Program</div>
              </div>
              <div className="text-center font-bold text-neutral-600 text-xs py-0">↓ Issue Stage</div>
            </div>

            {/* Col 2 */}
            <div className="col-span-2 grid grid-rows-2 gap-4">
              <div className="p-3 rounded-lg bg-neutral-800/85 border border-apple-purple/30 text-center relative">
                <div className="absolute top-1 left-2 text-[9px] font-bold text-apple-purple">RESERVATION STATIONS</div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-neutral-900 px-1 py-1 rounded text-[9px] text-neutral-300 font-mono">Add1-3</div>
                  <div className="bg-neutral-900 px-1 py-1 rounded text-[9px] text-neutral-300 font-mono">Mult1-2</div>
                  <div className="bg-neutral-900 px-1 py-1 rounded text-[9px] text-neutral-300 font-mono">Load/Store</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-2 rounded-lg bg-neutral-800/85 border border-apple-blue/30 text-center">
                  <div className="text-[9px] font-bold text-apple-blue">REGISTER FILE</div>
                  <div className="text-[8px] text-neutral-400 mt-1 font-mono">F0 - F31 (Values/Tags)</div>
                </div>
                <div className="p-2 rounded-lg bg-neutral-800/85 border border-apple-orange/30 text-center">
                  <div className="text-[9px] font-bold text-apple-orange">FUNCTIONAL UNITS</div>
                  <div className="text-[8px] text-neutral-400 mt-1 font-mono">ALUs & Multipliers</div>
                </div>
              </div>
            </div>

            {/* Col 4 */}
            <div className="p-4 rounded-lg bg-neutral-950 border border-apple-blue/40 text-center h-full flex flex-col justify-center relative">
              <div className="absolute top-1 right-2 text-[8px] font-bold tracking-widest text-apple-blue">CDB BUS</div>
              <div className="text-xs font-mono font-bold text-apple-blue uppercase animate-pulse">Common Data Bus</div>
              <p className="text-[9px] text-neutral-400 mt-2 leading-relaxed">Broadcasts values and tags, updating reservation stations & registers instantly.</p>
            </div>

          </div>

          <div className="mt-4 p-2 bg-neutral-950/50 border border-white/5 rounded-lg text-center text-[10px] text-neutral-400">
            🔁 The loopback: The CDB feeds directly back into Reservation Stations, avoiding delayed register accesses.
          </div>
        </div>
      );

    case 4:
      return (
        <div className="grid grid-cols-2 gap-8 items-center h-full">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-3">
              Hardware Formalism: Moore FSM & VHDL
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed mb-4">
              We map classroom theory directly to simulator hardware design.
            </p>
            
            {/* Moore machine block */}
            <div className="p-3 bg-neutral-950/80 border border-white/5 rounded-xl text-xs">
              <div className="text-apple-purple font-bold uppercase tracking-wider text-[10px] mb-2">Reservation Station Moore FSM</div>
              <div className="flex gap-2 items-center text-[9px] font-mono justify-between text-neutral-400">
                <span className="bg-neutral-800 px-1.5 py-0.5 rounded text-white font-bold font-mono">Idle</span>
                <span>➔</span>
                <span className="bg-neutral-800 px-1.5 py-0.5 rounded font-mono">Waiting</span>
                <span>➔</span>
                <span className="bg-neutral-800 px-1.5 py-0.5 rounded font-mono">Execute</span>
                <span>➔</span>
                <span className="bg-neutral-800 px-1.5 py-0.5 rounded font-mono">Writeback</span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-3 leading-relaxed">
                The state output dictates whether the unit requests execution cycles or broadcasts on the CDB.
              </p>
            </div>
          </div>

          <div className="bg-neutral-950 border border-white/10 p-5 rounded-xl flex flex-col justify-between h-[300px]">
            <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2">
              <span className="text-[10px] font-bold tracking-widest text-apple-blue uppercase">VHDL Conceptual Modeling</span>
              <span className="text-[9px] font-mono text-neutral-600">tomasulo_elements.vhd</span>
            </div>
            <pre className="font-mono text-[9px] text-emerald-400 leading-tight flex-1 overflow-y-auto">
{`-- Tag Comparator Unit
process(CDB_Tag, Qj, Qk)
begin
  -- Resolve Vj operand dependency
  if (Qj = CDB_Tag and Qj /= "000") then
    Vj_val <= CDB_Val;
    Qj_rdy <= '1';
  end if;
  
  -- Resolve Vk operand dependency
  if (Qk = CDB_Tag and Qk /= "000") then
    Vk_val <= CDB_Val;
    Qk_rdy <= '1';
  end if;
end process;`}
            </pre>
            <div className="border-t border-white/5 pt-2 text-[8px] text-neutral-500 font-mono">
              * Resolves RAW hazards at the combinational gate level.
            </div>
          </div>
        </div>
      );

    case 5:
      return (
        <div className="grid grid-cols-2 gap-8 items-center h-full">
          <div className="bg-neutral-950 border border-white/10 p-5 rounded-xl flex flex-col justify-between h-[300px]">
            <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-2">
              <span className="text-[10px] font-bold tracking-widest text-apple-purple uppercase font-sans">Python Backend Engine</span>
              <span className="text-[9px] font-mono text-neutral-600">tomasulo_engine.py</span>
            </div>
            <pre className="font-mono text-[10px] text-amber-400 leading-relaxed flex-1 overflow-y-auto">
{`def step_cycle(self):
    self.clock += 1
    
    # 1. Write Result Stage
    self._write_result_stage()
    
    # 2. Execute Stage
    self._execute_stage()
    
    # 3. Issue Stage
    self._issue_stage()
    
    return self.get_state_snapshot()`}
            </pre>
            <div className="border-t border-white/5 pt-2 text-[8px] text-neutral-500 font-mono">
              * Processing stages in reverse order prevents timing glitches.
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4">
              Under the Hood: Python Engine Design
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              To accurately model hardware parallelism in sequential Python, the simulator uses a **Reverse Pipeline Order execution**.
            </p>
            <div className="mt-6 space-y-3">
              <div className="p-3 bg-neutral-800/40 border border-white/5 rounded-lg text-xs leading-relaxed text-neutral-300">
                <span className="font-semibold text-white block mb-1">Why Reverse Order?</span>
                If we issued first, an instruction could issue, verify operands, execute, and write results in a single cycle. Reverse order ensures a minimum 1-cycle latency, honoring clock propagation bounds.
              </div>
            </div>
          </div>
        </div>
      );

    case 6:
      return (
        <div className="flex flex-col justify-between h-full">
          <div className="mb-4">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Guided 60-Second Demo Navigation
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Follow these steps when showing the live simulator to the class.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 flex-1 items-stretch py-2">
            
            <div className="p-4 bg-neutral-950 border border-white/10 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-apple-blue font-mono block mb-1">01 / SET THE SCENE</span>
                <h4 className="text-xs font-bold text-white mb-2">Cycle 0</h4>
              </div>
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                Point out the assembly block. Show the Load commands and the dependent Multiply command.
              </p>
            </div>

            <div className="p-4 bg-neutral-950 border border-white/10 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-apple-purple font-mono block mb-1">02 / RENAMING MAGIC</span>
                <h4 className="text-xs font-bold text-white mb-2">Cycle 3</h4>
              </div>
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                Click Step 3 times. Show the Register File: Register F0 is tagged with 'Mult1'. We have decoupled register names from data!
              </p>
            </div>

            <div className="p-4 bg-neutral-950 border border-white/10 rounded-xl flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-apple-orange font-mono block mb-1">03 / CDB BROADCAST</span>
                <h4 className="text-xs font-bold text-white mb-2">Cycle 4</h4>
              </div>
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                Click Step once. The CDB broadcasts values directly to Mult1. Bypasses register writes.
              </p>
            </div>

          </div>

          <div className="mt-4 p-3 bg-apple-blue/10 border border-apple-blue/20 rounded-lg text-center text-xs text-apple-blue font-semibold flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-apple-blue animate-ping" />
            <span>Click "Play" to watch In-Order vs. Tomasulo timelines auto-simulate.</span>
          </div>
        </div>
      );

    case 7:
      return (
        <div className="grid grid-cols-2 gap-8 items-center h-full">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4">
              Performance Benchmarking Results
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed mb-6">
              Our simulator runs programs side-by-side to benchmark performance and compute speedups.
            </p>
            
            <div className="bg-neutral-950 border border-white/5 p-4 rounded-xl space-y-2">
              <div className="flex justify-between text-xs text-neutral-400">
                <span>In-Order pipeline:</span>
                <span className="font-mono text-white">37 cycles</span>
              </div>
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Tomasulo simulator:</span>
                <span className="font-mono text-white">19 cycles</span>
              </div>
              <div className="border-t border-white/5 pt-2 flex justify-between text-xs font-bold text-apple-blue">
                <span>Execution Speedup:</span>
                <span className="font-mono">1.95x speedup</span>
              </div>
            </div>
          </div>

          <div className="bg-neutral-950 border border-white/10 p-6 rounded-xl flex flex-col justify-center items-center h-[300px]">
            <div className="text-neutral-500 font-mono text-[10px] mb-2 uppercase">SPEEDUP CALCULATION</div>
            <div className="text-4xl font-extrabold text-white font-mono bg-white/[0.02] border border-white/5 px-6 py-4 rounded-xl text-center">
              Speedup = 1.95×
            </div>
            <div className="text-xs font-mono text-neutral-400 mt-4 leading-relaxed text-center">
              Speedup = In-Order Cycles (37) / Tomasulo Cycles (19) ≈ 1.95x
            </div>
            <p className="text-[10px] text-neutral-500 mt-4 text-center leading-relaxed">
              * Stalls are bypassed by executing instructions out-of-order.
            </p>
          </div>
        </div>
      );

    case 8:
      return (
        <div className="grid grid-cols-2 gap-8 items-center h-full">
          <div className="bg-neutral-950/80 border border-white/10 p-5 rounded-xl h-[300px] flex flex-col justify-around">
            <div className="flex gap-4 items-center">
              <div className="p-2 bg-neutral-900 border border-white/5 rounded-lg text-lg">💻</div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase">Consumer CPUs</h4>
                <p className="text-[10px] text-neutral-400 mt-0.5 font-sans">Intel Core, AMD Ryzen, Apple M-Series</p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <div className="p-2 bg-neutral-900 border border-white/5 rounded-lg text-lg">📱</div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase">Mobile Systems</h4>
                <p className="text-[10px] text-neutral-400 mt-0.5 font-sans">ARM Cortex, Snapdragon, Apple A-Series</p>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <div className="p-2 bg-neutral-900 border border-white/5 rounded-lg text-lg">🤖</div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase font-sans">AI Accelerators</h4>
                <p className="text-[10px] text-neutral-400 mt-0.5 font-sans font-normal">GPUs and TPUs scheduling memory fetches dynamically</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-4">
              Real-World Impact: Silicon in Your Pocket
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Every modern high-performance processor uses out-of-order execution concepts derived from Robert Tomasulo's 1967 algorithm.
            </p>
            <div className="mt-6 p-3 bg-apple-purple/10 border border-apple-purple/20 rounded-lg text-xs leading-relaxed text-apple-purple font-semibold">
              ✨ Every time you load a webpage or open an app smoothly, this dynamic tag-renaming algorithm is running on your device!
            </div>
          </div>
        </div>
      );

    case 9:
      return (
        <div className="text-center flex flex-col justify-center items-center py-6">
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Conclusion: Respecting the Fundamentals
          </h2>
          <p className="text-sm text-neutral-300 max-w-xl leading-relaxed mt-4 font-sans">
            Advanced out-of-order architectures are built on the foundational digital logic elements we study in class.
          </p>

          <div className="grid grid-cols-3 gap-6 w-full max-w-3xl mt-8">
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl">
              <div className="text-lg mb-1">🛠️</div>
              <h4 className="text-xs font-bold text-white uppercase mb-1">Gate Basics</h4>
              <p className="text-[10px] text-neutral-500 font-sans">Tag comparators are built from simple logic gates.</p>
            </div>
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl">
              <div className="text-lg mb-1">🔄</div>
              <h4 className="text-xs font-bold text-white uppercase mb-1">State Machines</h4>
              <p className="text-[10px] text-neutral-500 font-sans">Reservation Station loops are Moore FSMs.</p>
            </div>
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl">
              <div className="text-lg mb-1">⚡</div>
              <h4 className="text-xs font-bold text-white uppercase mb-1">Speedups</h4>
              <p className="text-[10px] text-neutral-500 font-sans">Benchmarking models prove performance gains.</p>
            </div>
          </div>

          <div className="mt-8 text-lg font-bold text-white flex items-center gap-2">
            <span>Thank You. Any Questions?</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}
