'use client';

import React, { useRef, useEffect } from 'react';
import { Instruction } from '../lib/types';

interface ExecutionTimelineProps {
  mode: 'tomasulo' | 'inorder';
  instructions: Instruction[];
  history?: {
    [instId: number]: {
      [cycle: number]: string;
    };
  };
  currentClock: number;
}

export default function ExecutionTimeline({ mode, instructions, history, currentClock }: ExecutionTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Maximum cycle to display (at least 15 or current clock)
  const maxCycles = Math.max(15, currentClock);
  const cyclesArray = Array.from({ length: maxCycles }, (_, i) => i + 1);

  // Scroll to the right end when clock advances
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [currentClock]);

  const getTomasuloCell = (inst: Instruction, cycle: number) => {
    if (inst.issue_cycle === cycle) {
      return { label: 'IS', bg: 'bg-blue-500/15 text-blue-700 border-blue-500/30' };
    }
    if (inst.start_exec !== null && inst.end_exec !== null && cycle >= inst.start_exec && cycle <= inst.end_exec) {
      return { label: 'EX', bg: 'bg-amber-500/15 text-amber-700 border-amber-500/30' };
    }
    if (inst.write_back_cycle === cycle) {
      return { label: 'WB', bg: 'bg-green-500/15 text-green-700 border-green-500/30' };
    }
    // If it was issued but hasn't started execution, it is queued (stalled)
    if (inst.issue_cycle !== null && cycle > inst.issue_cycle && (inst.start_exec === null || cycle < inst.start_exec)) {
      return { label: 'Q', bg: 'bg-red-500/10 text-red-700 border-red-500/20 border-dashed' };
    }
    return null;
  };

  const getInOrderCell = (instId: number, cycle: number) => {
    if (!history || !history[instId]) return null;
    const stage = history[instId][cycle];
    if (!stage) return null;

    switch (stage) {
      case 'IF':
        return { label: 'IF', bg: 'bg-slate-500/15 text-slate-700 border-slate-500/30' };
      case 'ID':
        return { label: 'ID', bg: 'bg-purple-500/15 text-purple-700 border-purple-500/30' };
      case 'EX':
        return { label: 'EX', bg: 'bg-amber-500/15 text-amber-700 border-amber-500/30' };
      case 'MEM':
        return { label: 'ME', bg: 'bg-teal-500/15 text-teal-700 border-teal-500/30' };
      case 'WB':
        return { label: 'WB', bg: 'bg-green-500/15 text-green-700 border-green-500/30' };
      case 'STALL':
        return { label: 'ST', bg: 'bg-red-500/10 text-red-700 border-red-500/35 border-dashed animate-pulse' };
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border-custom p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-text-pri">
          {mode === 'tomasulo' ? 'Tomasulo Execution Timeline' : 'In-Order Execution Timeline'}
        </h2>
        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
          {mode === 'tomasulo' ? (
            <>
              <span className="bg-blue-500/15 text-blue-700 px-2 py-0.5 rounded">IS (Issue)</span>
              <span className="bg-amber-500/15 text-amber-700 px-2 py-0.5 rounded">EX (Execute)</span>
              <span className="bg-green-500/15 text-green-700 px-2 py-0.5 rounded">WB (Writeback)</span>
              <span className="bg-red-500/10 text-red-700 border border-red-500/20 border-dashed px-2 py-0.5 rounded">Q (Queue Stall)</span>
            </>
          ) : (
            <>
              <span className="bg-slate-500/15 text-slate-700 px-1.5 py-0.5 rounded">IF</span>
              <span className="bg-purple-500/15 text-purple-700 px-1.5 py-0.5 rounded">ID</span>
              <span className="bg-amber-500/15 text-amber-700 px-1.5 py-0.5 rounded">EX</span>
              <span className="bg-teal-500/15 text-teal-700 px-1.5 py-0.5 rounded">MEM</span>
              <span className="bg-green-500/15 text-green-700 px-1.5 py-0.5 rounded">WB</span>
              <span className="bg-red-500/10 text-red-700 border border-red-500/35 border-dashed px-1.5 py-0.5 rounded">ST (Stall)</span>
            </>
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto pr-2">
        <div className="min-w-[600px]">
          {/* Header Row */}
          <div className="flex border-b border-border-custom pb-2 mb-2 font-mono text-xs text-text-sec uppercase">
            <div className="w-48 shrink-0 font-medium">Instruction</div>
            <div className="flex flex-1 gap-1">
              {cyclesArray.map(c => (
                <div
                  key={c}
                  className={`flex-1 text-center font-semibold min-w-[28px] rounded ${
                    c === currentClock ? 'bg-apple-blue/20 text-apple-blue font-bold border border-apple-blue/40' : ''
                  }`}
                >
                  C{c}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Rows */}
          {instructions.length === 0 ? (
            <div className="py-8 text-center text-text-sec italic font-mono text-sm">
              No instructions to trace
            </div>
          ) : (
            <div className="space-y-1.5 font-mono text-xs">
              {instructions.map(inst => {
                const isWritingBack = mode === 'tomasulo' && inst.write_back_cycle === currentClock;

                return (
                  <div
                    key={inst.id}
                    className={`flex items-center py-1 rounded transition-colors duration-300 ${
                      isWritingBack ? 'bg-apple-blue/5' : ''
                    }`}
                  >
                    <div className="w-48 shrink-0 text-text-pri truncate pr-4">
                      {inst.opcode} {inst.dest}, {inst.opcode === 'L.D' || inst.opcode === 'S.D' ? `${inst.src2}(${inst.src1})` : `${inst.src1}, ${inst.src2}`}
                    </div>
                    <div className="flex flex-1 gap-1">
                      {cyclesArray.map(c => {
                        const cell = mode === 'tomasulo' 
                          ? getTomasuloCell(inst, c)
                          : getInOrderCell(inst.id, c);

                        return (
                          <div
                            key={c}
                            className={`flex-1 text-center min-w-[28px] h-6 flex items-center justify-center rounded border border-transparent font-bold ${
                              cell ? cell.bg + ' border' : 'bg-black/[0.02]'
                            }`}
                          >
                            {cell ? cell.label : ''}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
