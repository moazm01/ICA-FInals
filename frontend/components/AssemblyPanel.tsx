'use client';

import React from 'react';
import { Instruction } from '../lib/types';

interface AssemblyPanelProps {
  instructions: Instruction[];
  iqPointer: number;
}

export default function AssemblyPanel({ instructions, iqPointer }: AssemblyPanelProps) {
  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border-custom p-6 relative overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-text-pri">Assembly Program</h2>
        <span className="text-xs bg-apple-blue/20 text-apple-blue px-2 py-0.5 rounded-full font-mono">
          IQ Pointer: {iqPointer}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 font-mono text-sm relative pr-2">
        {instructions.length === 0 ? (
          <div className="text-text-sec text-center py-10 italic">
            No program loaded
          </div>
        ) : (
          instructions.map((inst, index) => {
            const isNextToIssue = index === iqPointer;
            const isIssued = inst.issue_cycle !== null && index < iqPointer;
            const isCompleted = inst.write_back_cycle !== null;
            const isExecuting = inst.start_exec !== null && inst.write_back_cycle === null;

            // Render opcode + operand spacing beautifully
            const opcodePart = inst.opcode.padEnd(8);
            const operandsPart = inst.opcode === 'L.D' || inst.opcode === 'S.D' 
              ? `${inst.dest}, ${inst.src2}(${inst.src1})`
              : `${inst.dest}, ${inst.src1}, ${inst.src2}`;

            return (
              <div
                key={inst.id}
                className={`relative flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                  isNextToIssue
                    ? 'border-apple-blue bg-apple-blue/5'
                    : isExecuting
                    ? 'border-apple-orange/40 bg-apple-orange/5 text-apple-orange'
                    : isCompleted
                    ? 'border-transparent text-text-sec opacity-60 line-through'
                    : isIssued
                    ? 'border-border-custom text-text-pri'
                    : 'border-transparent text-text-sec/60'
                }`}
              >
                {/* Active Line Glowing Pill */}
                {isNextToIssue && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-apple-blue rounded-r shadow-[0_0_12px_#0a84ff]" />
                )}

                <div className="flex items-center space-x-3 pl-3">
                  <span className="text-xs text-text-sec/40 w-4">{index + 1}</span>
                  <span>
                    <span className="text-apple-blue font-bold">{opcodePart}</span>
                    <span className="text-text-pri">{operandsPart}</span>
                  </span>
                </div>

                <div className="flex space-x-1.5 text-[10px]">
                  {inst.issue_cycle !== null && (
                    <span className="bg-border-custom text-text-sec px-1.5 py-0.5 rounded font-mono">
                      I:{inst.issue_cycle}
                    </span>
                  )}
                  {inst.start_exec !== null && (
                    <span className="bg-apple-orange/20 text-apple-orange px-1.5 py-0.5 rounded font-mono">
                      E:{inst.start_exec}-{inst.end_exec || ''}
                    </span>
                  )}
                  {inst.write_back_cycle !== null && (
                    <span className="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-mono">
                      W:{inst.write_back_cycle}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
