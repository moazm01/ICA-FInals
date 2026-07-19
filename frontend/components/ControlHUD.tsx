'use client';

import React from 'react';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';

interface ControlHUDProps {
  clock: number;
  isPlaying: boolean;
  speed: number;
  isDone: boolean;
  onStep: () => void;
  onPlayToggle: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

const SPEED_STEPS = [0.25, 0.5, 1.0, 2.0, 4.0];

export default function ControlHUD({
  clock,
  isPlaying,
  speed,
  isDone,
  onStep,
  onPlayToggle,
  onReset,
  onSpeedChange,
}: ControlHUDProps) {
  return (
    <div className="w-full glass-panel rounded-2xl py-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl z-20 transition-all duration-300">
      {/* Clock Display */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-[10px] text-text-sec uppercase tracking-widest font-mono">Clock Cycle</span>
          <span className="text-2xl font-bold text-text-pri font-mono flex items-baseline gap-1">
            {clock}
            {isDone && <span className="text-xs text-green-400 font-semibold">(Done)</span>}
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onReset}
          className="p-3 bg-black/5 hover:bg-black/10 active:bg-black/15 rounded-xl border border-border-custom text-text-pri transition-all cursor-pointer"
          title="Reset Simulator"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={onPlayToggle}
          disabled={isDone}
          className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
            isDone
              ? 'bg-black/5 border border-border-custom text-text-sec/40 cursor-not-allowed'
              : isPlaying
              ? 'bg-apple-orange hover:bg-apple-orange/90 active:scale-95 text-white'
              : 'bg-apple-blue hover:bg-apple-blue/90 active:scale-95 text-white'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5 fill-current" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              <span>Auto Play</span>
            </>
          )}
        </button>

        <button
          onClick={onStep}
          disabled={isPlaying || isDone}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            isPlaying || isDone
              ? 'bg-black/5 border-border-custom text-text-sec/20 cursor-not-allowed'
              : 'bg-black/5 hover:bg-black/10 active:bg-black/15 border-border-custom text-text-pri'
          }`}
          title="Step 1 Cycle"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Speed Controller */}
      <div className="flex flex-col items-end gap-1.5 min-w-[200px]">
        <span className="text-[10px] text-text-sec uppercase tracking-widest font-mono">Autoplay Speed</span>
        <div className="flex items-center gap-1 bg-black/5 p-1 rounded-lg border border-border-custom">
          {SPEED_STEPS.map(step => (
            <button
              key={step}
              onClick={() => onSpeedChange(step)}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition-all cursor-pointer ${
                speed === step
                  ? 'bg-apple-blue text-white shadow-sm'
                  : 'text-text-sec hover:text-text-pri hover:bg-black/5'
              }`}
            >
              {step}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
