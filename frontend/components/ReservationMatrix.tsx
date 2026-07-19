'use client';

import React from 'react';
import { ReservationStation, CdbBroadcast } from '../lib/types';

interface ReservationMatrixProps {
  stations: ReservationStation[];
  cdbBroadcast: CdbBroadcast | null;
}

export default function ReservationMatrix({ stations, cdbBroadcast }: ReservationMatrixProps) {
  // Group stations for cleaner layout
  const loadStations = stations.filter(s => s.name.startsWith('Load'));
  const storeStations = stations.filter(s => s.name.startsWith('Store'));
  const addStations = stations.filter(s => s.name.startsWith('Add'));
  const multStations = stations.filter(s => s.name.startsWith('Mult'));
  const divStations = stations.filter(s => s.name.startsWith('Div'));

  const renderGroupRows = (groupName: string, groupStations: ReservationStation[]) => {
    return (
      <>
        <tr className="border-b border-border-custom bg-black/[0.02]">
          <td colSpan={10} className="py-2 px-4 text-xs font-semibold text-apple-blue uppercase tracking-wider">
            {groupName} Unit Stations
          </td>
        </tr>
        {groupStations.map(rs => {
          const isWritingBack = cdbBroadcast !== null && cdbBroadcast.tag === rs.name;
          const isRawQj = rs.busy && rs.qj !== null;
          const isRawQk = rs.busy && rs.qk !== null;

          return (
            <tr
              key={rs.name}
              className={`border-b border-border-custom font-mono text-sm hover:bg-black/[0.02] transition-all duration-300 ${
                isWritingBack ? 'cdb-pulse-active text-apple-blue font-bold' : ''
              }`}
            >
              <td className="py-2.5 px-4 font-semibold text-text-pri">{rs.name}</td>
              <td className="py-2.5 px-4">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    rs.busy
                      ? 'bg-apple-red/20 text-apple-red'
                      : 'bg-green-500/20 text-green-600'
                  }`}
                >
                  {rs.busy ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="py-2.5 px-4 text-text-pri">{rs.op || '-'}</td>
              <td className="py-2.5 px-4 text-text-sec">
                {rs.vj !== null ? rs.vj.toFixed(2) : '-'}
              </td>
              <td className="py-2.5 px-4 text-text-sec">
                {rs.vk !== null ? rs.vk.toFixed(2) : '-'}
              </td>
              
              {/* Highlight RAW dependencies in Apple Orange */}
              <td
                className={`py-2.5 px-4 transition-colors duration-300 ${
                  isRawQj ? 'bg-apple-orange/15 text-apple-orange font-semibold rounded' : 'text-text-sec'
                }`}
              >
                {rs.qj || '-'}
              </td>
              <td
                className={`py-2.5 px-4 transition-colors duration-300 ${
                  isRawQk ? 'bg-apple-orange/15 text-apple-orange font-semibold rounded' : 'text-text-sec'
                }`}
              >
                {rs.qk || '-'}
              </td>
              
              <td className="py-2.5 px-4 text-text-pri">{rs.dest || '-'}</td>
              <td className="py-2.5 px-4 text-xs text-text-sec">
                {rs.busy && rs.busy_cycles_left !== null ? (
                  <span className="bg-black/5 border border-border-custom px-2 py-0.5 rounded">
                    {rs.busy_cycles_left} cycles
                  </span>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          );
        })}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border-custom p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-text-pri">Reservation Stations Matrix</h2>
        {cdbBroadcast && (
          <div className="text-xs bg-apple-blue/20 text-apple-blue border border-apple-blue/35 px-3 py-1 rounded-full flex items-center gap-2 animate-pulse">
            <span className="w-1.5 h-1.5 bg-apple-blue rounded-full"></span>
            CDB Broadcast: {cdbBroadcast.tag} = {cdbBroadcast.value.toFixed(2)} → {cdbBroadcast.dest}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-custom text-text-sec text-xs uppercase tracking-wider">
              <th className="py-3 px-4 font-medium">Name</th>
              <th className="py-3 px-4 font-medium">Busy</th>
              <th className="py-3 px-4 font-medium">Op</th>
              <th className="py-3 px-4 font-medium">Vj</th>
              <th className="py-3 px-4 font-medium">Vk</th>
              <th className="py-3 px-4 font-medium text-apple-orange">Qj (RAW)</th>
              <th className="py-3 px-4 font-medium text-apple-orange">Qk (RAW)</th>
              <th className="py-3 px-4 font-medium">Dest</th>
              <th className="py-3 px-4 font-medium">Latency</th>
            </tr>
          </thead>
          <tbody>
            {stations.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-text-sec italic font-mono text-sm">
                  No reservation stations initialized
                </td>
              </tr>
            ) : (
              <>
                {renderGroupRows('Load', loadStations)}
                {renderGroupRows('Store', storeStations)}
                {renderGroupRows('Add / Sub', addStations)}
                {renderGroupRows('Multiply', multStations)}
                {renderGroupRows('Divide', divStations)}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
