import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  Plus,
  Minus,
  AlertTriangle,
  Navigation,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useTransit } from '../simulation/useTransitStore';
import { Alert } from '../types/transit';

export const DriverPortal: React.FC = () => {
  const {
    drivers,
    buses,
    routes,
    stops,
    alerts,
    activeDriverId,
    setActiveDriverId,
    startTrip,
    pauseTrip,
    endTrip,
    adjustOccupancy,
    triggerEmergencySOS,
    resolveAlert,
    trackBusOnMap,
  } = useTransit();

  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [incidentType, setIncidentType] = useState<Alert['type']>('SOS_EMERGENCY');
  const [incidentNotes, setIncidentNotes] = useState('');

  const currentDriver = useMemo(
    () => drivers.find((d) => d.id === activeDriverId) || drivers[0],
    [drivers, activeDriverId]
  );

  const assignedBus = useMemo(
    () =>
      buses.find((b) => b.id === currentDriver.assignedBusId) ||
      buses.find((b) => b.id === 'bus-24') ||
      buses[0],
    [buses, currentDriver]
  );

  const assignedRoute = useMemo(
    () => routes.find((r) => r.id === assignedBus.routeId) || routes[0],
    [routes, assignedBus]
  );

  const routeStops = useMemo(
    () =>
      assignedRoute.stops
        .map((id) => stops.find((s) => s.id === id))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    [assignedRoute, stops]
  );

  const occupancyPct = Math.round(
    (assignedBus.occupancy / assignedBus.capacity) * 100
  );

  const occupancyState = useMemo(() => {
    if (occupancyPct >= 90) {
      return {
        label: 'Full (90–100%)',
        color: '#DC2626',
        textClass: 'text-[#DC2626]',
      };
    }
    if (occupancyPct >= 70) {
      return {
        label: 'Nearly Full (70–89%)',
        color: '#F59E0B',
        textClass: 'text-[#F59E0B]',
      };
    }
    return {
      label: 'Seats Available (0–69%)',
      color: '#16A34A',
      textClass: 'text-[#16A34A]',
    };
  }, [occupancyPct]);

  const activeBusAlerts = useMemo(
    () => alerts.filter((a) => !a.resolved && a.busId === assignedBus.id),
    [alerts, assignedBus.id]
  );

  const handleConfirmSOS = (e: React.FormEvent) => {
    e.preventDefault();
    triggerEmergencySOS(assignedBus.id, incidentType, incidentNotes);
    setSosModalOpen(false);
    setIncidentNotes('');
  };

  return (
    <div className="space-y-8">
      {/* Top Driver Header & Unit Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Driver Telemetry &amp; Dispatch Console</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{currentDriver.employeeId}</span>
            <span aria-hidden="true">·</span>
            <span>Shift {currentDriver.shift}</span>
            <span aria-hidden="true">·</span>
            <span>{currentDriver.status}</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 font-display mt-1">
            {currentDriver.name} — {assignedBus.number}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Assigned Route: <strong className="text-slate-900">{assignedRoute.code} ({assignedRoute.name})</strong> · Registration{' '}
            <span className="font-mono">{assignedBus.registrationNumber}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="driver-select"
              className="text-xs font-medium text-slate-500 whitespace-nowrap"
            >
              Operator Console:
            </label>
            <select
              id="driver-select"
              value={currentDriver.id}
              onChange={(e) => setActiveDriverId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-2 focus:outline-[#2563EB]"
            >
              {drivers
                .filter((d) => d.assignedBusId !== null)
                .map((d) => {
                  const busObj = buses.find((b) => b.id === d.assignedBusId);
                  return (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.employeeId}) — {busObj?.number || 'Unassigned'}
                    </option>
                  );
                })}
            </select>
          </div>

          <button
            type="button"
            onClick={() => trackBusOnMap(assignedBus.id)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#1A365D] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Focus on Live Map</span>
          </button>
        </div>
      </div>

      {/* Active Emergency Alert Status Banner */}
      {activeBusAlerts.length > 0 && (
        <div className="bg-red-50 border-2 border-[#DC2626] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <AlertTriangle className="w-6 h-6 text-[#DC2626] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-950">
                EMERGENCY SOS BEACON ACTIVE ON {assignedBus.number}
              </p>
              <p className="text-xs text-red-800 mt-1">
                {activeBusAlerts[0].message} · Coordinates:{' '}
                <span className="font-mono">
                  {activeBusAlerts[0].coordinates.latitude}° N,{' '}
                  {activeBusAlerts[0].coordinates.longitude}° E
                </span>{' '}
                ({activeBusAlerts[0].coordinates.locationName}) · Logged at{' '}
                {activeBusAlerts[0].timestamp}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => resolveAlert(activeBusAlerts[0].id)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white text-red-700 border border-red-300 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Clear Emergency &amp; Resume Trip</span>
          </button>
        </div>
      )}

      {/* Main Driver Controls & Passenger Counter Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Trip Controls + GPS & Route Progress */}
        <div className="lg:col-span-7 space-y-6">
          {/* Trip Lifecycle Controls Card */}
          <section
            aria-label="Driver Trip Controls"
            className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Live Telemetry Transponder
                </p>
                <h2 className="text-xl font-bold text-slate-900 font-display mt-0.5">
                  Trip Dispatch Controls
                </h2>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    assignedBus.tripStatus === 'ACTIVE'
                      ? 'bg-[#16A34A] animate-pulse'
                      : assignedBus.tripStatus === 'PAUSED'
                      ? 'bg-[#F59E0B]'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="text-slate-900">
                  TRIP: {assignedBus.tripStatus} ({assignedBus.status})
                </span>
              </div>
            </div>

            {/* 3 Primary Trip Buttons */}
            <div className="py-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-100">
              <button
                type="button"
                onClick={() => startTrip(assignedBus.id)}
                disabled={assignedBus.tripStatus === 'ACTIVE' && assignedBus.status !== 'PAUSED'}
                className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${
                  assignedBus.tripStatus === 'ACTIVE' && assignedBus.status !== 'PAUSED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                    : 'bg-[#16A34A] hover:bg-emerald-700 text-white shadow-xs cursor-pointer'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START TRIP</span>
              </button>

              <button
                type="button"
                onClick={() => pauseTrip(assignedBus.id)}
                disabled={assignedBus.tripStatus === 'PAUSED'}
                className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${
                  assignedBus.tripStatus === 'PAUSED'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-default'
                    : 'bg-[#F59E0B] hover:bg-amber-600 text-white shadow-xs cursor-pointer'
                }`}
              >
                <Pause className="w-4 h-4 fill-current" />
                <span>PAUSE TRIP</span>
              </button>

              <button
                type="button"
                onClick={() => endTrip(assignedBus.id)}
                disabled={assignedBus.tripStatus === 'COMPLETED'}
                className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm transition-colors whitespace-nowrap ${
                  assignedBus.tripStatus === 'COMPLETED'
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer'
                }`}
              >
                <Square className="w-4 h-4 fill-current" />
                <span>END TRIP</span>
              </button>
            </div>

            {/* Live GPS & Telemetry Readout */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-5">
              <div>
                <p className="text-xs text-slate-500">Current GPS Position</p>
                <p className="font-mono text-sm font-bold text-slate-900 mt-1 tabular-nums">
                  {assignedBus.latitude.toFixed(4)}° N
                </p>
                <p className="font-mono text-xs text-slate-500 tabular-nums">
                  {assignedBus.longitude.toFixed(4)}° E
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Ground Speed</p>
                <p className="font-mono text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">
                  {assignedBus.speed} <span className="text-xs font-normal">km/h</span>
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Compass Heading</p>
                <p className="font-mono text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">
                  {assignedBus.heading}° <span className="text-xs font-normal">ENE</span>
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Next Stop ETA</p>
                <p className="font-mono text-2xl font-bold text-[#2563EB] mt-0.5 tabular-nums">
                  {assignedBus.eta} <span className="text-xs font-normal">mins</span>
                </p>
              </div>
            </div>
          </section>

          {/* Corridor Route Progress Card */}
          <section
            aria-label="Corridor Route Progress"
            className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-display">
                  Corridor Route Progress — {assignedRoute.code}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Current Stop: <strong className="text-slate-900">{assignedBus.currentStop}</strong> → Next Stop:{' '}
                  <strong className="text-[#2563EB]">{assignedBus.nextStop}</strong> ({assignedBus.distanceToNextKm} km remaining)
                </p>
              </div>
              <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                {Math.round(assignedBus.routeProgress * 100)}% Complete
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-[#2563EB] transition-all duration-500 rounded-full"
                style={{ width: `${Math.round(assignedBus.routeProgress * 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {routeStops.map((stop, index) => {
                const isCurrent = stop.name === assignedBus.currentStop;
                const isNext = stop.name === assignedBus.nextStop;
                return (
                  <div
                    key={stop.id}
                    className={`p-3 rounded-lg border text-xs ${
                      isCurrent
                        ? 'bg-blue-50/70 border-[#2563EB] text-slate-900'
                        : isNext
                        ? 'bg-cyan-50/50 border-[#06B6D4] text-slate-900'
                        : 'bg-slate-50/60 border-slate-200/70 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                      <span>STOP 0{index + 1}</span>
                      <span>{stop.corridorKm} km</span>
                    </div>
                    <p className="font-semibold text-slate-900 mt-1 truncate">
                      {stop.name}
                    </p>
                    <p className="text-[11px] mt-0.5 font-medium">
                      {isCurrent
                        ? 'Current Position'
                        : isNext
                        ? `Next (${assignedBus.eta} min)`
                        : stop.code}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right 5 Columns: Accessible Passenger Counter + Emergency SOS Beacon */}
        <div className="lg:col-span-5 space-y-6">
          {/* Accessible Passenger Counter */}
          <section
            aria-label="Passenger Occupancy Counter"
            className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Live Boarding Telemetry
                </p>
                <h2 className="text-xl font-bold text-slate-900 font-display mt-0.5">
                  Passenger Counter
                </h2>
              </div>
              <span className={`text-xs font-bold ${occupancyState.textClass}`}>
                {occupancyState.label}
              </span>
            </div>

            {/* Large Tabular Readout */}
            <div className="py-6 text-center">
              <div
                aria-live="polite"
                className="font-mono text-5xl font-bold text-slate-900 tracking-tight tabular-nums"
              >
                {assignedBus.occupancy}{' '}
                <span className="text-slate-400 font-normal">/</span>{' '}
                {assignedBus.capacity}
              </div>
              <p className="text-xs text-slate-500 mt-2 tabular-nums">
                {Math.max(0, assignedBus.capacity - assignedBus.occupancy)} seats remaining ·{' '}
                {occupancyPct}% capacity utilized
              </p>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-4">
                <div
                  className="h-full transition-all duration-200 rounded-full"
                  style={{
                    width: `${Math.min(100, occupancyPct)}%`,
                    backgroundColor: occupancyState.color,
                  }}
                />
              </div>
            </div>

            {/* Accessible Primary + / - Controls */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => adjustOccupancy(assignedBus.id, -1)}
                disabled={assignedBus.occupancy <= 0}
                aria-label="Decrease passenger count by 1"
                className="flex items-center justify-center gap-2 py-4 px-4 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-900 transition-colors cursor-pointer"
              >
                <Minus className="w-5 h-5" />
                <span>Passenger</span>
              </button>

              <button
                type="button"
                onClick={() => adjustOccupancy(assignedBus.id, 1)}
                disabled={assignedBus.occupancy >= assignedBus.capacity}
                aria-label="Increase passenger count by 1"
                className="flex items-center justify-center gap-2 py-4 px-4 rounded-xl font-bold text-sm bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white transition-colors cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Passenger</span>
              </button>
            </div>

            {/* Batch Boarding Adjustments */}
            <div className="mt-3 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => adjustOccupancy(assignedBus.id, -5)}
                disabled={assignedBus.occupancy <= 0}
                className="py-2 px-3 rounded-lg text-xs font-mono font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 transition-colors"
              >
                -5 Alighting Stop
              </button>
              <button
                type="button"
                onClick={() => adjustOccupancy(assignedBus.id, 5)}
                disabled={assignedBus.occupancy >= assignedBus.capacity}
                className="py-2 px-3 rounded-lg text-xs font-mono font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 disabled:opacity-40 transition-colors"
              >
                +5 Boarding Stop
              </button>
            </div>
          </section>

          {/* Prominent Emergency / SOS Dispatch Section */}
          <section
            aria-label="Emergency SOS Dispatch"
            className="bg-white rounded-xl border-2 border-red-200 p-6 lg:p-8"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-[#DC2626] shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-display">
                  Emergency / SOS Dispatch
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Pressing the SOS button immediately logs current GPS coordinates (
                  <span className="font-mono">
                    {assignedBus.latitude.toFixed(4)}° N, {assignedBus.longitude.toFixed(4)}° E
                  </span>
                  ), alerts University Transit Command, notifies students, and marks{' '}
                  <strong>{assignedBus.number}</strong> with a pulsing red beacon.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSosModalOpen(true)}
              aria-label="Trigger Emergency SOS Alert"
              className="mt-5 w-full py-4 px-6 rounded-xl bg-[#DC2626] hover:bg-red-700 text-white font-bold text-base tracking-wide shadow-sm flex items-center justify-center gap-3 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              <AlertTriangle className="w-5 h-5" />
              <span>🚨 EMERGENCY / SOS</span>
            </button>
          </section>
        </div>
      </div>

      {/* Accessible Emergency Confirmation Dialog */}
      {sosModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sos-dialog-title"
          className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#DC2626] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5" />
                <h3 id="sos-dialog-title" className="text-base font-bold font-display">
                  Confirm Emergency / SOS Broadcast
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSosModalOpen(false)}
                aria-label="Cancel Emergency Dialog"
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSOS} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1 tabular-nums">
                <p>
                  <span className="text-slate-500">Unit &amp; Operator:</span>{' '}
                  <strong className="text-slate-900">
                    {assignedBus.number} · {currentDriver.name} ({currentDriver.employeeId})
                  </strong>
                </p>
                <p>
                  <span className="text-slate-500">Simulated GPS Coordinates:</span>{' '}
                  <strong className="font-mono text-slate-900">
                    {assignedBus.latitude.toFixed(4)}° N, {assignedBus.longitude.toFixed(4)}° E ({assignedBus.currentStop})
                  </strong>
                </p>
                <p>
                  <span className="text-slate-500">Passengers Onboard:</span>{' '}
                  <strong className="text-slate-900">
                    {assignedBus.occupancy} / {assignedBus.capacity}
                  </strong>
                </p>
              </div>

              <div>
                <label
                  htmlFor="incident-type"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Emergency Category
                </label>
                <select
                  id="incident-type"
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value as Alert['type'])}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-2 focus:outline-[#DC2626]"
                >
                  <option value="SOS_EMERGENCY">Critical SOS / Security Emergency</option>
                  <option value="MECHANICAL">Mechanical Breakdown / Tire or Engine Fault</option>
                  <option value="MEDICAL">Student / Passenger Medical Assistance</option>
                  <option value="ROUTE_HAZARD">Severe Road Blockade / Corridor Hazard</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="incident-notes"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Situation Details for Transit Command
                </label>
                <textarea
                  id="incident-notes"
                  rows={3}
                  value={incidentNotes}
                  onChange={(e) => setIncidentNotes(e.target.value)}
                  placeholder={`Describe the emergency near ${assignedBus.currentStop} (optional)...`}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-2 focus:outline-[#DC2626]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSosModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-[#DC2626] hover:bg-red-700 text-white rounded-lg shadow-xs transition-colors"
                >
                  TRANSMIT SOS ALERT NOW
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
