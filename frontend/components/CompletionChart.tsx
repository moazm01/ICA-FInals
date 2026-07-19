'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface CompletionDataPoint {
  cycle: number;
  tomasulo: number;
  inorder: number;
}

interface CompletionChartProps {
  data: CompletionDataPoint[];
}

export default function CompletionChart({ data }: CompletionChartProps) {
  return (
    <div className="bg-card rounded-2xl border border-border-custom p-6 w-full h-[320px] flex flex-col">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-pri">Performance Comparison</h2>
        <p className="text-xs text-text-sec">
          Cumulative instruction completion rates across cycles
        </p>
      </div>

      <div className="flex-1 w-full h-full text-xs font-mono">
        {data.length <= 1 ? (
          <div className="w-full h-full flex items-center justify-center text-text-sec italic">
            Start simulation to display instruction throughput analytics chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-custom)" />
              <XAxis 
                dataKey="cycle" 
                stroke="var(--text-sec)" 
                label={{ value: 'Cycle', position: 'insideBottomRight', offset: -5 }} 
              />
              <YAxis 
                stroke="var(--text-sec)"
                allowDecimals={false}
                label={{ value: 'Instructions', angle: -90, position: 'insideLeft', offset: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border-custom)',
                  borderRadius: '12px',
                  color: 'var(--text-pri)'
                }}
                labelFormatter={(label) => `Cycle ${label}`}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ color: 'var(--text-pri)' }}
              />
              <Line
                name="Tomasulo OOO"
                type="monotone"
                dataKey="tomasulo"
                stroke="#0A84FF"
                strokeWidth={3}
                activeDot={{ r: 8 }}
                dot={{ r: 3 }}
              />
              <Line
                name="Standard In-Order"
                type="monotone"
                dataKey="inorder"
                stroke="#8E8E93"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
