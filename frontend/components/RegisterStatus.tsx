'use client';

import React from 'react';
import { RegisterFileState, ReservationStation, Instruction } from '../lib/types';

interface RegisterStatusProps {
  registers: RegisterFileState;
  stations: ReservationStation[];
  instructions: Instruction[];
  iqPointer: number;
}

export default function RegisterStatus({ registers, stations, instructions, iqPointer }: RegisterStatusProps) {
  // Extract F0 to F31 floating-point registers
  const fpRegisters = Object.keys(registers)
    .filter(reg => reg.startsWith('F'))
    .sort((a, b) => {
      const numA = parseInt(a.slice(1));
      const numB = parseInt(b.slice(1));
      return numA - numB;
    });

  // Helper to check for WAW (Write After Write) and WAR (Write After Read) hazards
  const getHazardState = (regName: string, currentTag: string | null) => {
    if (!currentTag) return null;

    // Scan instructions currently in-flight
    const activeInstructions = instructions.filter(
      inst => inst.issue_cycle !== null && inst.write_back_cycle === null
    );

    // 1. WAW Hazard: multiple instructions writing to the same register
    const writersCount = activeInstructions.filter(inst => inst.dest === regName).length;
    if (writersCount > 1) {
      return 'WAW'; // Highlight in Apple Red
    }

    // 2. WAR Hazard: register is tagged by a newer instruction (currentTag),
    // but an older instruction is still reading from this register (its Vj/Vk is pending
    // or its tag was the previous tag).
    // Tomasulo resolves WAR via renaming. If the register tag is currentTag, but there is
    // another reservation station that has Qj or Qk pointing to a DIFFERENT tag for this reg,
    // or is still executing with the old tag.
    // Let's identify if any active reservation station's destination register is regName,
    // but the tag is NOT the register file's current tag. This means the register file has
    // been overwritten (renamed) by a newer instruction, while the older instruction in the
    // reservation station is still executing. This is a classic WAR hazard!
    const activeStationsWritingReg = stations.filter(rs => rs.busy && rs.dest === regName);
    const hasWar = activeStationsWritingReg.some(rs => rs.name !== currentTag);
    if (hasWar) {
      return 'WAR'; // Highlight in Apple Purple
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border-custom p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-text-pri">Register File Status</h2>
        <div className="flex gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-apple-purple rounded"></span> WAR (Rename)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-apple-red rounded"></span> WAW
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 pr-2">
        {fpRegisters.map(reg => {
          const regData = registers[reg];
          const hazard = getHazardState(reg, regData.tag);
          
          let cardBorderClass = 'border-border-custom bg-black/[0.02]';
          let tagBadgeClass = 'bg-black/5 text-text-sec';

          if (hazard === 'WAW') {
            cardBorderClass = 'border-apple-red bg-apple-red/5';
            tagBadgeClass = 'bg-apple-red/20 text-apple-red font-semibold';
          } else if (hazard === 'WAR') {
            cardBorderClass = 'border-apple-purple bg-apple-purple/5';
            tagBadgeClass = 'bg-apple-purple/20 text-apple-purple font-semibold';
          } else if (regData.tag) {
            cardBorderClass = 'border-apple-blue/50 bg-apple-blue/5';
            tagBadgeClass = 'bg-apple-blue/20 text-apple-blue font-semibold';
          }

          return (
            <div
              key={reg}
              className={`p-3 rounded-xl border transition-all duration-300 flex items-center justify-between ${cardBorderClass}`}
            >
              <div className="flex flex-col">
                <span className="text-xs text-text-sec font-mono">{reg}</span>
                <span className="text-sm font-semibold text-text-pri font-mono">
                  {regData.value.toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-text-sec/40 uppercase mb-1">Tag</span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono ${tagBadgeClass}`}>
                  {regData.tag || 'Ready'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
