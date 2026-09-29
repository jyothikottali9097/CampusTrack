import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useTransit } from '../simulation/useTransitStore';

const SPEEDS: Array<1 | 2 | 5 | 10> = [1, 2, 5, 10];

export const SimulatorControls: React.FC = () => {
  const {
    simConfig,
    buses,
    startSimulation,
    pauseSimulation,
    resetSimulationPositions,
    setSimulationSpeed,
  } = useTransit();

  const activeBusesCount = buses.filter((b) => b.tripStatus === 'ACTIVE').length;
  const bus24 = buses.find((b) => b.id === 'bus-24') || buses[0];

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Left: System Status & Live Corridor Telemetry */}
        <div className="flex flex-wrap items-center gap-3 text-slate-600">
          <div className="flex items-center gap-2 font-medium text-slate-900">
            <span
              className={`w-2 h-2 rounded-full ${
                simConfig.running ? 'bg-[#16A34A] animate-pulse' : 'bg-[#F59E0B]'
              }`}
              aria-hidden="true"
            />
            <span>
              {simConfig.running
                ? 'Live GPS Telemetry Active'
                : 'Telemetry Simulation Paused'}
            </span>
          </div>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="tabular-nums">
            Active Fleet: <strong className="text-slate-900">{activeBusesCount}</strong> / {buses.length} buses
          </span>
          <span aria-hidden="true" className="text-slate-300 hidden md:inline">
            ·
          </span>
          {bus24 && (
            <span className="hidden md:inline tabular-nums text-slate-600">
              <strong className="text-[#1A365D]">{bus24.number}</strong>: {bus24.currentStop} → {bus24.nextStop} ({bus24.speed} km/h · ETA {bus24.eta} min · {bus24.occupancy}/{bus24.capacity} seats)
            </span>
          )}
        </div>

        {/* Right: Persistent Simulator Controls */}
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-medium hidden sm:inline">
            Live Bus Simulator:
          </span>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={startSimulation}
              disabled={simConfig.running}
              aria-label="Start Simulation"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                simConfig.running
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Start</span>
            </button>

            <button
              type="button"
              onClick={pauseSimulation}
              disabled={!simConfig.running}
              aria-label="Pause Simulation"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                !simConfig.running
                  ? 'bg-[#F59E0B] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Pause className="w-3 h-3 fill-current" />
              <span>Pause</span>
            </button>

            <button
              type="button"
              onClick={resetSimulationPositions}
              aria-label="Reset Simulator Positions"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium text-slate-700 hover:text-slate-900 hover:bg-white transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div
            role="group"
            aria-label="Simulation Speed Multiplier"
            className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200"
          >
            {SPEEDS.map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSimulationSpeed(spd)}
                className={`px-2 py-1 rounded-md font-mono text-xs font-semibold tabular-nums transition-colors whitespace-nowrap ${
                  simConfig.speedMultiplier === spd
                    ? 'bg-[#1A365D] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                {spd}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
