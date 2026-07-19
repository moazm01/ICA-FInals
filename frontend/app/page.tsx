'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Cpu, Columns, Layers, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { SimulatorState, Instruction } from '../lib/types';
import AssemblyPanel from '../components/AssemblyPanel';
import ReservationMatrix from '../components/ReservationMatrix';
import RegisterStatus from '../components/RegisterStatus';
import ExecutionTimeline from '../components/ExecutionTimeline';
import ControlHUD from '../components/ControlHUD';
import StatsCards from '../components/StatsCards';
import CompletionChart from '../components/CompletionChart';
import PresentationModal from '../components/PresentationModal';

const DEFAULT_ASSEMBLY = `L.D     F6, 32(R2)
L.D     F2, 96(R3)
MUL.D   F0, F2, F4
SUB.D   F8, F6, F2
DIV.D   F10, F0, F6
ADD.D   F6, F8, F2
S.D     F10, 48(R2)`;

interface ChartPoint {
  cycle: number;
  tomasulo: number;
  inorder: number;
}

export default function Home() {
  const [assembly, setAssembly] = useState(DEFAULT_ASSEMBLY);
  const [latencies, setLatencies] = useState({
    ADD: 2,
    MUL: 4,
    DIV: 12,
    LOAD: 2,
    STORE: 2
  });

  const [state, setState] = useState<SimulatorState | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [splitMode, setSplitMode] = useState(true);
  const [activeView, setActiveView] = useState<'tomasulo' | 'inorder'>('tomasulo');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [error, setError] = useState<string | null>(null);
  const [showPresentation, setShowPresentation] = useState(false);

  const getBaseApiUrl = () => {
    let url = process.env.NEXT_PUBLIC_API_URL;
    if (!url || url.includes('localhost')) {
      if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        url = 'https://zucchini-exploration-production-bc05.up.railway.app';
      } else {
        url = url || 'http://localhost:8000';
      }
    }

    url = url.trim().replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url;
  };

  const API_URL = getBaseApiUrl();
  const WS_URL = API_URL.replace(/^http/, 'ws');

  // Global Ctrl+K shortcut listener to toggle presentation slides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowPresentation(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load program on mount
  useEffect(() => {
    loadProgram();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Update chart data whenever state changes
  useEffect(() => {
    if (!state) return;
    const currentCycle = state.clock;
    if (currentCycle === 0) {
      setChartData([{ cycle: 0, tomasulo: 0, inorder: 0 }]);
      return;
    }

    // Calculate completed instructions
    const tomasuloComps = state.tomasulo?.instructions.filter(i => i.write_back_cycle !== null).length || 0;
    const inorderComps = state.inorder?.instructions.filter(i => i.write_back_cycle !== null).length || 0;

    setChartData(prev => {
      // Check if cycle already exists
      const exists = prev.some(p => p.cycle === currentCycle);
      if (exists) return prev;
      return [...prev, { cycle: currentCycle, tomasulo: tomasuloComps, inorder: inorderComps }];
    });
  }, [state]);

  const loadProgram = async (customAssembly?: string) => {
    setError(null);
    setIsPlaying(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    const targetAssembly = customAssembly !== undefined ? customAssembly : assembly;
    
    try {
      const res = await fetch(`${API_URL}/api/load-program`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assembly: targetAssembly, latencies })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to parse assembly');
      }

      const initialData: SimulatorState = await res.json();
      setState(initialData);
      setChartData([{ cycle: 0, tomasulo: 0, inorder: 0 }]);
    } catch (err: any) {
      setError(err.message || 'Connection error to backend simulator');
    }
  };

  const handleStep = async () => {
    if (isPlaying) return;
    try {
      const res = await fetch(`${API_URL}/api/simulate/step`, { method: 'POST' });
      if (!res.ok) throw new Error('Simulation step failed');
      const nextData: SimulatorState = await res.json();
      setState(nextData);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReset = async () => {
    setIsPlaying(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    try {
      const res = await fetch(`${API_URL}/api/simulate/reset`, { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');
      const resetData: SimulatorState = await res.json();
      setState(resetData);
      setChartData([{ cycle: 0, tomasulo: 0, inorder: 0 }]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePlayToggle = () => {
    if (isPlaying) {
      // Pause
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ action: 'pause' }));
      }
      setIsPlaying(false);
    } else {
      // Play
      setIsPlaying(true);
      connectWebSocket();
    }
  };

  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'play', speed }));
      return;
    }

    const ws = new WebSocket(`${WS_URL}/ws/stream`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'play', speed }));
    };

    ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.error) {
        setError(response.error);
        setIsPlaying(false);
        ws.close();
        return;
      }
      if (response.state) {
        setState(response.state);
      }
      if (response.status === 'completed') {
        setIsPlaying(false);
        ws.close();
      }
    };

    ws.onclose = () => {
      setIsPlaying(false);
    };

    ws.onerror = () => {
      setError('WebSocket streaming connection error');
      setIsPlaying(false);
    };
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'set_speed', speed: newSpeed }));
    }
  };

  const handleLatencyChange = (key: keyof typeof latencies, val: string) => {
    const num = Math.max(1, parseInt(val) || 1);
    setLatencies(prev => ({ ...prev, [key]: num }));
  };

  const isSimCompleted = state?.tomasulo?.is_done && state?.inorder?.is_done;

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6 relative">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-custom pb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-apple-blue to-apple-purple bg-clip-text text-transparent">
            <Cpu className="w-7 h-7 text-apple-blue" />
            Tomasulo Execution Simulator
          </h1>
          <p className="text-sm text-text-sec mt-1">
            Dynamic Scheduling & Renaming vs. Standard 5-stage In-Order Pipeline
          </p>
        </div>

        {/* View Toggles */}
        <div className="flex items-center gap-2 bg-black/5 p-1 rounded-xl border border-border-custom">
          <button
            onClick={() => setSplitMode(false)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              !splitMode
                ? 'bg-apple-blue text-white shadow-sm'
                : 'text-text-sec hover:text-text-pri'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Single View
          </button>
          <button
            onClick={() => setSplitMode(true)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              splitMode
                ? 'bg-apple-blue text-white shadow-sm'
                : 'text-text-sec hover:text-text-pri'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            Split Pipeline comparison
          </button>
        </div>
      </div>

      {/* Latency Configurations Drawer */}
      <div className="bg-card/50 rounded-2xl border border-border-custom p-4 flex flex-wrap gap-4 items-center justify-between">
        <span className="text-xs font-semibold text-text-sec uppercase tracking-widest font-mono">
          Configure Latencies
        </span>
        <div className="flex flex-wrap gap-4 text-xs font-mono">
          {Object.keys(latencies).map(key => (
            <label key={key} className="flex items-center gap-2 bg-black/5 px-3 py-1.5 rounded-lg border border-border-custom">
              <span className="text-text-sec">{key}:</span>
              <input
                type="number"
                min="1"
                max="20"
                value={latencies[key as keyof typeof latencies]}
                onChange={(e) => handleLatencyChange(key as keyof typeof latencies, e.target.value)}
                className="w-10 bg-transparent text-text-pri font-bold focus:outline-none focus:text-apple-blue text-center"
              />
            </label>
          ))}
          <button
            onClick={() => loadProgram()}
            className="px-4 py-1.5 bg-apple-blue/20 hover:bg-apple-blue/30 text-apple-blue hover:text-white border border-apple-blue/35 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer font-sans text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Apply
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-apple-red/10 border border-apple-red/40 text-apple-red rounded-xl p-4 flex items-center gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Stats Cards (Phase 5.2.2) */}
      {state && (
        <StatsCards
          stats={state.stats}
          tomasuloClock={state.tomasulo?.clock || 0}
          inorderClock={state.inorder?.clock || 0}
          instructionsCount={state.tomasulo?.instructions.length || 0}
        />
      )}

      {/* Core Simulation Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left column: Assembly Editor */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Text Area Loader */}
          <div className="bg-card rounded-2xl border border-border-custom p-6 flex flex-col gap-4">
            <h2 className="text-md font-semibold text-text-pri font-sans">Load Assembly Program</h2>
            <textarea
              value={assembly}
              onChange={(e) => setAssembly(e.target.value)}
              rows={8}
              className="w-full bg-canvas border border-border-custom rounded-xl p-3 font-mono text-sm focus:outline-none focus:border-apple-blue transition-all"
              placeholder="Enter assembly program..."
            />
            <button
              onClick={() => loadProgram()}
              className="w-full py-2.5 bg-apple-blue text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-apple-blue/90 active:scale-95 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" /> Load & Initialize
            </button>
          </div>

          {state && (
            <AssemblyPanel
              instructions={state.tomasulo?.instructions || []}
              iqPointer={state.tomasulo?.iq_pointer || 0}
            />
          )}
        </div>

        {/* Right columns: Visualizations */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Split Mode Comparison Dashboard */}
          {splitMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tomasulo State */}
              <div className="flex flex-col gap-6">
                <div className="h-[360px]">
                  <ReservationMatrix
                    stations={state?.tomasulo?.reservation_stations || []}
                    cdbBroadcast={state?.tomasulo?.cdb_broadcast || null}
                  />
                </div>
                <div className="h-[280px]">
                  <RegisterStatus
                    registers={state?.tomasulo?.register_file || {}}
                    stations={state?.tomasulo?.reservation_stations || []}
                    instructions={state?.tomasulo?.instructions || []}
                    iqPointer={state?.tomasulo?.iq_pointer || 0}
                  />
                </div>
              </div>

              {/* In-Order Pipeline Stages */}
              <div className="flex flex-col gap-6 bg-card rounded-2xl border border-border-custom p-6 h-[664px] overflow-hidden">
                <div>
                  <h2 className="text-lg font-semibold text-text-pri">Standard In-Order Pipeline</h2>
                  <p className="text-xs text-text-sec">Stall-heavy hazards visualizer</p>
                </div>

                <div className="flex-1 flex flex-col justify-center gap-4">
                  {['IF', 'ID', 'EX', 'MEM', 'WB'].map(stage => {
                    const activeInstId = state?.inorder?.pipeline[stage as 'IF'|'ID'|'EX'|'MEM'|'WB'];
                    const inst = state?.inorder?.instructions.find(i => i.id === activeInstId);

                    return (
                      <div
                        key={stage}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${
                          inst
                            ? 'border-apple-purple bg-apple-purple/5'
                            : 'border-border-custom bg-black/[0.02]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-lg bg-black/5 border border-border-custom flex items-center justify-center font-mono font-bold text-sm text-text-pri">
                            {stage}
                          </span>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-text-sec uppercase tracking-widest font-mono">
                              Active Instruction
                            </span>
                            <span className="text-sm font-semibold font-mono text-text-pri">
                              {inst 
                                ? `${inst.opcode} ${inst.dest}, ${inst.opcode === 'L.D' || inst.opcode === 'S.D' ? `${inst.src2}(${inst.src1})` : `${inst.src1}, ${inst.src2}`}`
                                : 'Empty (Stall)'}
                            </span>
                          </div>
                        </div>
                        {inst && (
                          <span className="text-[10px] bg-apple-purple/20 text-apple-purple border border-apple-purple/35 px-2.5 py-0.5 rounded font-mono">
                            ID: #{inst.id}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            // Single View tab controls
            <div className="flex flex-col gap-6">
              <div className="flex gap-2 border-b border-border-custom pb-3">
                <button
                  onClick={() => setActiveView('tomasulo')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeView === 'tomasulo'
                      ? 'bg-apple-blue text-white'
                      : 'text-text-sec hover:text-text-pri hover:bg-black/5'
                  }`}
                >
                  Tomasulo Core
                </button>
                <button
                  onClick={() => setActiveView('inorder')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    activeView === 'inorder'
                      ? 'bg-apple-blue text-white'
                      : 'text-text-sec hover:text-text-pri hover:bg-black/5'
                  }`}
                >
                  In-Order Stages
                </button>
              </div>

              {activeView === 'tomasulo' ? (
                <div className="flex flex-col gap-6">
                  <div className="h-[360px]">
                    <ReservationMatrix
                      stations={state?.tomasulo?.reservation_stations || []}
                      cdbBroadcast={state?.tomasulo?.cdb_broadcast || null}
                    />
                  </div>
                  <div className="h-[360px]">
                    <RegisterStatus
                      registers={state?.tomasulo?.register_file || {}}
                      stations={state?.tomasulo?.reservation_stations || []}
                      instructions={state?.tomasulo?.instructions || []}
                      iqPointer={state?.tomasulo?.iq_pointer || 0}
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-card rounded-2xl border border-border-custom p-6 h-[400px] flex flex-col justify-center gap-4">
                  {/* In order pipeline list */}
                  {['IF', 'ID', 'EX', 'MEM', 'WB'].map(stage => {
                    const activeInstId = state?.inorder?.pipeline[stage as 'IF'|'ID'|'EX'|'MEM'|'WB'];
                    const inst = state?.inorder?.instructions.find(i => i.id === activeInstId);

                    return (
                      <div
                        key={stage}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          inst ? 'border-apple-purple bg-apple-purple/5' : 'border-border-custom bg-black/[0.02]'
                        }`}
                      >
                        <span className="font-mono font-bold text-xs">{stage}</span>
                        <span className="font-mono text-xs text-text-pri">
                          {inst ? `${inst.opcode} ${inst.dest}, ...` : 'Stall / Empty'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Execution Timeline (Stacked) */}
          {state && (
            <div className="flex flex-col gap-6">
              {splitMode ? (
                <>
                  <div className="h-[280px]">
                    <ExecutionTimeline
                      mode="tomasulo"
                      instructions={state.tomasulo?.instructions || []}
                      currentClock={state.tomasulo?.clock || 0}
                    />
                  </div>
                  <div className="h-[280px]">
                    <ExecutionTimeline
                      mode="inorder"
                      instructions={state.inorder?.instructions || []}
                      history={state.inorder?.history}
                      currentClock={state.inorder?.clock || 0}
                    />
                  </div>
                </>
              ) : (
                <div className="h-[320px]">
                  <ExecutionTimeline
                    mode={activeView}
                    instructions={state[activeView]?.instructions || []}
                    history={state.inorder?.history}
                    currentClock={state[activeView]?.clock || 0}
                  />
                </div>
              )}
            </div>
          )}

          {/* Performance Rate Chart */}
          <CompletionChart data={chartData} />
        </div>
      </div>

      {/* Control HUD (Bottom Overlay) */}
      {state && (
        <div className="sticky bottom-6 mt-6">
          <ControlHUD
            clock={state.clock}
            isPlaying={isPlaying}
            speed={speed}
            isDone={isSimCompleted || false}
            onStep={handleStep}
            onPlayToggle={handlePlayToggle}
            onReset={handleReset}
            onSpeedChange={handleSpeedChange}
          />
        </div>
      )}

      {/* Embedded Presentation Slides Overlay */}
      <PresentationModal isOpen={showPresentation} onClose={() => setShowPresentation(false)} />
    </main>
  );
}
