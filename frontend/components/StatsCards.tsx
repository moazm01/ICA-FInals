'use client';

import React from 'react';
import { SimulatorStats } from '../lib/types';

interface StatsCardsProps {
  stats: SimulatorStats;
  tomasuloClock: number;
  inorderClock: number;
  instructionsCount: number;
}

export default function StatsCards({
  stats,
  tomasuloClock,
  inorderClock,
  instructionsCount
}: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      {/* In-Order Pipeline Stats Card */}
      <div className="bg-card rounded-2xl border border-border-custom p-6 relative overflow-hidden transition-all duration-300 hover:border-text-sec/30">
        <div className="absolute top-0 left-0 w-full h-1 bg-text-sec/40" />
        <h3 className="text-sm font-semibold text-text-sec uppercase tracking-widest mb-4 font-mono">
          Standard In-Order Pipeline
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-sec/55 uppercase font-mono mb-1">Total Cycles</span>
            <span className="text-2xl font-bold text-text-pri font-mono">
              {inorderClock}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-text-sec/55 uppercase font-mono mb-1">IPC Rate</span>
            <span className="text-2xl font-bold text-text-pri font-mono text-apple-purple">
              {stats.inorder_ipc.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-text-sec/55 uppercase font-mono mb-1">Total Stalls</span>
            <span className="text-2xl font-bold text-apple-red font-mono">
              {stats.inorder_stalls}
            </span>
          </div>
        </div>
      </div>

      {/* Tomasulo OOO Stats Card */}
      <div className="bg-card rounded-2xl border border-border-custom p-6 relative overflow-hidden transition-all duration-300 hover:border-apple-blue/30">
        <div className="absolute top-0 left-0 w-full h-1 bg-apple-blue" />
        <h3 className="text-sm font-semibold text-apple-blue uppercase tracking-widest mb-4 font-mono">
          Tomasulo Out-of-Order Engine
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-sec/55 uppercase font-mono mb-1">Total Cycles</span>
            <span className="text-2xl font-bold text-text-pri font-mono">
              {tomasuloClock}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-text-sec/55 uppercase font-mono mb-1">IPC Rate</span>
            <span className="text-2xl font-bold text-green-600 font-mono">
              {stats.tomasulo_ipc.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-text-sec/55 uppercase font-mono mb-1">Total Stalls</span>
            <span className="text-2xl font-bold text-apple-orange font-mono">
              {stats.tomasulo_stalls}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
