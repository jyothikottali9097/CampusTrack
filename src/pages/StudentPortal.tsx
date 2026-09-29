import React, { useMemo, useState } from 'react';
import { Navigation, ArrowRight, BellRing, Sparkles } from 'lucide-react';
import { useTransit } from '../simulation/useTransitStore';
import { LiveMap } from '../components/LiveMap';

const CORRIDOR_WAYPOINT_IDS = [
  'stop-rly',
  'stop-rtc',
  'stop-nellimarla',
  'stop-garividi',
  'stop-campus',
];

export const StudentPortal: React.FC = () => {
  const {
    student,
    buses,
    routes,
    stops,
    drivers,
    alerts,
    selectStudentStop,
    trackBusOnMap,
    setActiveTab,
  } = useTransit();

  const [imgError, setImgError] = useState(false);

  // Assigned Bus: BUS 24
  const assignedBus = useMemo(
    () => buses.find((b) => b.id === student.assignedBusId) || buses[0],
    [buses, student.assignedBusId]
  );

  const assignedRoute = useMemo(
    () => routes.find((r) => r.id === assignedBus.routeId) || routes[0],
    [routes, assignedBus]
  );

  const assignedDriver = useMemo(
    () => drivers.find((d) => d.id === assignedBus.driverId) || drivers[0],
    [drivers, assignedBus]
  );

  const occupancyPct = Math.round(
    (assignedBus.occupancy / assignedBus.capacity) * 100
  );
  const seatsAvailable = Math.max(0, assignedBus.capacity - assignedBus.occupancy);
  const occupancyStateText =
    occupancyPct >= 90
      ? 'Full'
      : occupancyPct >= 70
      ? 'Nearly Full'
      : 'Seats Available';

  // Selected stop calculations
  const selectedStop = useMemo(
    () =>
      stops.find((s) => s.id === student.selectedStopId) ||
      stops.find((s) => s.id === 'stop-nellimarla') ||
      stops[0],
    [stops, student.selectedStopId]
  );

  const stopTelemetry = useMemo(() => {
    const currentBusStopObj =
      stops.find((s) => s.name === assignedBus.currentStop) || stops[2];

    // If Nellimarla is selected and bus is at RTC Complex, match the exact demo baseline (8 mins) or dynamic live position
    const rawDist = Math.abs(selectedStop.corridorKm - currentBusStopObj.corridorKm);
    const distanceKm = Number(Math.max(0.5, rawDist === 0 ? assignedBus.distanceToNextKm : rawDist).toFixed(1));
    const effectiveSpeed = Math.max(assignedBus.speed, 24);
    const dynamicEta =
      selectedStop.name === assignedBus.nextStop
        ? assignedBus.eta
        : Math.max(1, Math.round((distanceKm / effectiveSpeed) * 60));

    const scheduledTime = new Date(Date.now() + dynamicEta * 60000).toLocaleTimeString(
      [],
      { hour: '2-digit', minute: '2-digit' }
    );

    return {
      etaMinutes: dynamicEta,
      distanceKm,
      scheduledArrival: scheduledTime,
      walkingMinutes: selectedStop.walkingMinutesFromGate,
    };
  }, [selectedStop, assignedBus, stops]);

  const corridorWaypoints = useMemo(
    () =>
      CORRIDOR_WAYPOINT_IDS.map((id) => stops.find((s) => s.id === id)).filter(
        (s): s is NonNullable<typeof s> => Boolean(s)
      ),
    [stops]
  );

  const activeAlerts = alerts.filter((a) => !a.resolved);

  return (
    <div className="space-y-8">
      {/* Emergency Banner if any SOS is active */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BellRing className="w-5 h-5 text-[#DC2626] shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-950">
                Active Transit Advisory: {activeAlerts[0].busNumber} Emergency Alert near{' '}
                {activeAlerts[0].coordinates.locationName}
              </p>
              <p className="text-xs text-red-800 mt-0.5">
                {activeAlerts[0].message} · Reported at {activeAlerts[0].timestamp}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => trackBusOnMap(activeAlerts[0].busId)}
            className="px-3.5 py-2 text-xs font-semibold bg-[#DC2626] text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
          >
            Inspect on Live Map
          </button>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <section className="relative rounded-2xl overflow-hidden border border-slate-200 bg-[#1A365D] text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-between z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-cyan-300 font-medium">
                <span>University Live Transit Network</span>
                <span aria-hidden="true">·</span>
                <span>Student Pass {student.passStatus}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{student.studentId}</span>
                <span aria-hidden="true">·</span>
                <span>Department of {student.department}</span>
              </div>

              <h1
                className="text-3xl lg:text-4xl font-bold tracking-tight mt-3 text-white font-display"
                style={{ textWrap: 'balance' }}
              >
                Good morning, Aarav
              </h1>
              <p className="text-slate-200 text-sm lg:text-base mt-2 max-w-xl leading-relaxed">
                Your assigned morning shuttle{' '}
                <strong className="text-white font-mono">{assignedBus.number}</strong> is actively
                broadcasting along the{' '}
                <strong className="text-white">{assignedRoute.name}</strong> corridor.
                Next waypoint is <strong className="text-cyan-300">{assignedBus.nextStop}</strong> in{' '}
                <strong className="text-cyan-300 font-mono tabular-nums">
                  {assignedBus.eta} minutes
                </strong>.
              </p>
            </div>

            <div className="mt-7 pt-6 border-t border-white/15 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => trackBusOnMap(assignedBus.id)}
                className="flex items-center gap-2.5 px-6 py-3 bg-[#2563EB] hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors whitespace-nowrap cursor-pointer"
              >
                <Navigation className="w-4 h-4" />
                <span>TRACK MY BUS</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/15 text-white font-medium text-sm rounded-xl border border-white/15 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Ask CampusTrack AI</span>
              </button>

              <div className="ml-auto text-xs text-slate-300 tabular-nums">
                <span>Student Profile: </span>
                <strong className="text-white">{student.name}</strong> ·{' '}
                <span className="font-mono">{student.studentId}</span> ·{' '}
                <span>{student.department}</span>
              </div>
            </div>
          </div>

          {/* Right Architectural Transit Visual */}
          <div className="lg:col-span-5 relative min-h-[240px] lg:min-h-[300px] bg-slate-900">
            {!imgError ? (
              <img
                src="/src/assets/images/hero_campus_transit_1790658005603.jpg"
                alt="CampusTrack University Electric Shuttle arriving at Academic Transit Hub"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1A365D] via-[#1E3A8A] to-[#0F172A] flex items-center justify-center p-8">
                <p className="text-sm font-mono text-cyan-300">
                  CampusTrack Corridor Command · Vizianagaram → University Campus
                </p>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-[#1A365D] via-[#1A365D]/40 to-transparent lg:block hidden" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-xs text-slate-200 flex items-center justify-between font-mono tabular-nums">
              <span>CORRIDOR: VZM → CAMPUS</span>
              <span>LIVE GPS 18.1168° N, 83.4112° E</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Column Student Command Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Assigned Bus Live Telemetry Card */}
        <section
          aria-label="Assigned Bus Telemetry"
          className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 lg:p-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Assigned Shuttle</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{assignedBus.registrationNumber}</span>
                <span aria-hidden="true">·</span>
                <span>Driver: {assignedDriver.name}</span>
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <h2 className="text-3xl font-bold text-[#1A365D] font-display tracking-tight">
                  {assignedBus.number}
                </h2>
                <span className="text-base font-medium text-slate-700">
                  {assignedRoute.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  assignedBus.status === 'ON TIME'
                    ? 'bg-[#16A34A]'
                    : assignedBus.status === 'EMERGENCY'
                    ? 'bg-[#DC2626] animate-ping'
                    : 'bg-[#F59E0B]'
                }`}
              />
              <span className="text-sm font-bold text-slate-900">
                {assignedBus.status}
              </span>
            </div>
          </div>

          {/* 4-Column Key Telemetry Strip */}
          <div className="py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-500">Current Location</p>
              <p className="text-base font-bold text-slate-900 mt-1">
                {assignedBus.currentStop}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Next Stop</p>
              <p className="text-base font-bold text-[#2563EB] mt-1">
                {assignedBus.nextStop}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">ETA Countdown</p>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
                {assignedBus.eta} mins
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Current Speed</p>
              <p className="text-2xl font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
                {assignedBus.speed} km/h
              </p>
            </div>
          </div>

          {/* Occupancy Progress & Seat Availability */}
          <div className="py-6 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  Passenger Occupancy
                </span>
                <span className="text-slate-300">·</span>
                <span
                  className={`text-xs font-semibold ${
                    occupancyPct >= 90
                      ? 'text-[#DC2626]'
                      : occupancyPct >= 70
                      ? 'text-[#F59E0B]'
                      : 'text-[#16A34A]'
                  }`}
                >
                  {occupancyStateText} ({seatsAvailable} free)
                </span>
              </div>

              <div className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                {assignedBus.occupancy} / {assignedBus.capacity} ({occupancyPct}%)
              </div>
            </div>

            <div
              role="progressbar"
              aria-valuenow={occupancyPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Bus 24 Passenger Occupancy"
              className="w-full h-3 bg-slate-100 rounded-full overflow-hidden"
            >
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.min(100, occupancyPct)}%`,
                  backgroundColor:
                    occupancyPct >= 90
                      ? '#DC2626'
                      : occupancyPct >= 70
                      ? '#F59E0B'
                      : '#16A34A',
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 mt-2 tabular-nums">
              <span>0% Empty</span>
              <span>Current Load: {occupancyPct}% ({assignedBus.occupancy} seated)</span>
              <span>Capacity: {assignedBus.capacity} seats</span>
            </div>
          </div>

          {/* Primary Action Bar */}
          <div className="pt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-500 tabular-nums">
              Route Distance: <strong className="text-slate-800">{assignedRoute.distance}</strong> · Frequency:{' '}
              <strong className="text-slate-800">{assignedRoute.frequency}</strong>
            </div>

            <button
              type="button"
              onClick={() => trackBusOnMap(assignedBus.id)}
              className="flex items-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>TRACK MY BUS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* Right 5 Columns: "My Bus Stop" Dynamic Waypoint Selector */}
        <section
          aria-label="My Bus Stop Selector"
          className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 lg:p-8"
        >
          <div className="pb-4 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-500">
              Interactive Corridor Waypoints
            </p>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5 font-display">
              My Bus Stop
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Select your boarding stop to calculate real-time ETA, corridor distance, and walking time.
            </p>
          </div>

          {/* Stop Selector Buttons */}
          <div className="py-4 space-y-2 border-b border-slate-100">
            {corridorWaypoints.map((stop) => {
              const isSelected = stop.id === selectedStop.id;
              const isBusCurrentStop = stop.name === assignedBus.currentStop;
              const isBusNextStop = stop.name === assignedBus.nextStop;

              return (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => selectStudentStop(stop.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                    isSelected
                      ? 'bg-[#1A365D] text-white border-[#1A365D]'
                      : 'bg-slate-50/70 hover:bg-slate-100 text-slate-900 border-slate-200/80'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{stop.name}</span>
                      {isBusCurrentStop && (
                        <span
                          className={`text-[11px] font-mono font-semibold ${
                            isSelected ? 'text-cyan-300' : 'text-[#16A34A]'
                          }`}
                        >
                          · BUS 24 HERE
                        </span>
                      )}
                      {isBusNextStop && !isBusCurrentStop && (
                        <span
                          className={`text-[11px] font-mono font-semibold ${
                            isSelected ? 'text-cyan-300' : 'text-[#2563EB]'
                          }`}
                        >
                          · NEXT STOP
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-0.5 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {stop.landmark}
                    </p>
                  </div>

                  <div className="text-right font-mono text-xs tabular-nums shrink-0">
                    <span className={isSelected ? 'text-cyan-300 font-bold' : 'text-slate-600'}>
                      {stop.corridorKm} km
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Dynamic Telemetry Readout for Selected Stop */}
          <div className="pt-5">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
              <span>Live Telemetry for Selected Stop:</span>
              <strong className="text-slate-900">{selectedStop.name}</strong>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div>
                <p className="text-xs text-slate-500">Dynamic ETA</p>
                <p className="text-xl font-bold font-mono text-[#2563EB] mt-0.5 tabular-nums">
                  {stopTelemetry.etaMinutes} mins
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Corridor Distance</p>
                <p className="text-xl font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
                  {stopTelemetry.distanceKm} km
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Scheduled Arrival</p>
                <p className="text-sm font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
                  {stopTelemetry.scheduledArrival}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Walking Time</p>
                <p className="text-sm font-bold font-mono text-slate-900 mt-0.5 tabular-nums">
                  {stopTelemetry.walkingMinutes} mins walk
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Embedded Live Corridor Map Preview */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-display">
              Live Corridor Radar — {assignedBus.number} &amp; {selectedStop.name}
            </h2>
            <p className="text-xs text-slate-500">
              Click any shuttle or stop marker to inspect real-time coordinates, or expand the full Live Map portal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => trackBusOnMap(assignedBus.id)}
            className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
          >
            <span>Open Full-Screen Live Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <LiveMap compact />
      </section>
    </div>
  );
};
