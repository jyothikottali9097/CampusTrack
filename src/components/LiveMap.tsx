import React, { useState, useRef, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Navigation,
  AlertTriangle,
} from 'lucide-react';
import { useTransit } from '../simulation/useTransitStore';
import { Bus } from '../types/transit';

interface LiveMapProps {
  compact?: boolean;
}

function getBusStatusColor(bus: Bus): string {
  const occPct = (bus.occupancy / bus.capacity) * 100;
  if (bus.status === 'EMERGENCY' || occPct >= 95) return '#DC2626';
  if (bus.status === 'DELAYED' || occPct >= 70) return '#F59E0B';
  if (bus.status === 'PAUSED' || bus.status === 'OFFLINE') return '#64748B';
  return '#16A34A';
}

function getBusCrowdLabel(bus: Bus): string {
  if (bus.status === 'EMERGENCY') return 'Emergency SOS';
  const occPct = Math.round((bus.occupancy / bus.capacity) * 100);
  if (occPct >= 90) return 'Full';
  if (occPct >= 70) return 'Nearly Full';
  return 'Active · Seats Available';
}

export const LiveMap: React.FC<LiveMapProps> = ({ compact = false }) => {
  const {
    buses,
    routes,
    stops,
    drivers,
    student,
    selectedMapBusId,
    setSelectedMapBusId,
    selectedMapStopId,
    setSelectedMapStopId,
    selectedMapRouteId,
    setSelectedMapRouteId,
    selectStudentStop,
    setActiveTab,
    setActiveDriverId,
  } = useTransit();

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [followBus, setFollowBus] = useState<boolean>(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const selectedBus = useMemo(
    () => buses.find((b) => b.id === selectedMapBusId) || buses[0],
    [buses, selectedMapBusId]
  );

  const selectedStop = useMemo(
    () =>
      stops.find((s) => s.id === (selectedMapStopId || student.selectedStopId)) ||
      stops[4],
    [stops, selectedMapStopId, student.selectedStopId]
  );

  const selectedBusDriver = useMemo(
    () => drivers.find((d) => d.id === selectedBus?.driverId),
    [drivers, selectedBus]
  );

  const selectedBusRoute = useMemo(
    () => routes.find((r) => r.id === selectedBus?.routeId),
    [routes, selectedBus]
  );

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((z) => Math.max(0.75, Math.min(2.4, Number((z + delta).toFixed(2)))));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-interactive="true"]')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: Math.max(-350, Math.min(350, e.clientX - dragStart.x)),
      y: Math.max(-240, Math.min(240, e.clientY - dragStart.y)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRecenter = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setFollowBus(false);
  };

  const focusOnBus = (bus: Bus) => {
    setSelectedMapBusId(bus.id);
    // Center viewport slightly toward the bus
    const offsetX = (500 - bus.x) * 0.45;
    const offsetY = (310 - bus.y) * 0.45;
    setPan({ x: offsetX, y: offsetY });
    setZoom(1.25);
  };

  const effectivePan = useMemo(() => {
    if (followBus && selectedBus) {
      return {
        x: (500 - selectedBus.x) * 0.65,
        y: (310 - selectedBus.y) * 0.65,
      };
    }
    return pan;
  }, [followBus, selectedBus, pan]);

  return (
    <div className="space-y-6">
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Live Corridor Transit Map
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Interactive GPS telemetry across Vizianagaram, RTC Complex, Nellimarla, Garividi, and University Campus
            </p>
          </div>

          {/* Route Filter Controls */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedMapRouteId(null)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedMapRouteId === null
                  ? 'bg-[#1A365D] text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Corridor Routes ({routes.length})
            </button>
            {routes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() =>
                  setSelectedMapRouteId(selectedMapRouteId === r.id ? null : r.id)
                }
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  selectedMapRouteId === r.id
                    ? 'bg-[#1A365D] text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: r.color }}
                  aria-hidden="true"
                />
                <span>{r.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Canvas Viewport */}
        <div
          ref={svgContainerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`${
            compact ? 'lg:col-span-12 h-[440px]' : 'lg:col-span-8 h-[600px]'
          } relative bg-[#0F172A] rounded-xl border border-slate-200 overflow-hidden select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {/* Top-Left Map Legend Bar */}
          <div
            data-interactive="true"
            className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 flex flex-wrap items-center gap-4"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
              <span>Active (0–69%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
              <span>Nearly Full / Delayed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
              <span>Full / Emergency SOS</span>
            </div>
          </div>

          {/* Top-Right Map Zoom & Pan Controls */}
          <div
            data-interactive="true"
            className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 rounded-lg p-1.5 text-slate-200"
          >
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.4, Number((z + 0.2).toFixed(2))))}
              aria-label="Zoom In"
              title="Zoom In"
              className="p-1.5 hover:bg-slate-800 rounded-md transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs px-1.5 tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.75, Number((z - 0.2).toFixed(2))))}
              aria-label="Zoom Out"
              title="Zoom Out"
              className="p-1.5 hover:bg-slate-800 rounded-md transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRecenter}
              aria-label="Recenter Map"
              title="Recenter Corridor Map"
              className="p-1.5 hover:bg-slate-800 rounded-md transition-colors border-l border-slate-700 pl-2"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setFollowBus((f) => !f)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                followBus
                  ? 'bg-[#06B6D4] text-slate-950 font-semibold'
                  : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>{followBus ? `Locking ${selectedBus?.number}` : 'Follow Bus'}</span>
            </button>
          </div>

          {/* Interactive SVG Vector Map */}
          <svg
            viewBox="0 0 1000 620"
            className="w-full h-full"
            role="img"
            aria-label="Interactive Vizianagaram to University Campus Transit Map"
          >
            <defs>
              <pattern
                id="transit-grid"
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="#1E293B"
                  strokeWidth="1"
                />
              </pattern>
            </defs>

            <g
              transform={`translate(${effectivePan.x}, ${effectivePan.y}) scale(${zoom})`}
              style={{ transformOrigin: '500px 310px', transition: isDragging ? 'none' : 'transform 180ms ease-out' }}
            >
              {/* Base Topographic Grid */}
              <rect x="-500" y="-500" width="2000" height="2000" fill="#0F172A" />
              <rect
                x="-500"
                y="-500"
                width="2000"
                height="2000"
                fill="url(#transit-grid)"
              />

              {/* Champavathi River Corridor Feature */}
              <path
                d="M 480 0 C 520 140, 545 220, 595 310 C 640 400, 620 510, 670 620"
                fill="none"
                stroke="#0C4A6E"
                strokeWidth="26"
                strokeLinecap="round"
                opacity="0.55"
              />
              <text
                x="525"
                y="120"
                fill="#38BDF8"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                opacity="0.7"
              >
                CHAMPAVATHI RIVER
              </text>

              {/* Vizianagaram Municipal Urban Zone */}
              <ellipse
                cx="230"
                cy="415"
                rx="175"
                ry="120"
                fill="#1E293B"
                opacity="0.45"
                stroke="#334155"
                strokeDasharray="6 4"
              />
              <text
                x="110"
                y="325"
                fill="#94A3B8"
                fontSize="11"
                fontWeight="600"
                letterSpacing="0.06em"
              >
                VIZIANAGARAM URBAN ZONE
              </text>

              {/* University Campus Boundary Polygon */}
              <rect
                x="765"
                y="120"
                width="185"
                height="245"
                rx="24"
                fill="#1E3A8A"
                fillOpacity="0.24"
                stroke="#38BDF8"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <text
                x="780"
                y="144"
                fill="#38BDF8"
                fontSize="11"
                fontWeight="700"
                letterSpacing="0.05em"
              >
                UNIVERSITY CAMPUS ZONE
              </text>

              {/* Major Landmarks */}
              <g opacity="0.75">
                <rect
                  x="195"
                  y="465"
                  width="95"
                  height="24"
                  rx="4"
                  fill="#1E293B"
                  stroke="#475569"
                />
                <text x="205" y="481" fill="#CBD5E1" fontSize="9.5">
                  Vizianagaram Fort
                </text>

                <rect
                  x="785"
                  y="262"
                  width="110"
                  height="24"
                  rx="4"
                  fill="#1E293B"
                  stroke="#475569"
                />
                <text x="795" y="278" fill="#CBD5E1" fontSize="9.5">
                  CSE &amp; ECE Tech Block
                </text>
              </g>

              {/* Background Roadbed Network */}
              {routes.map((route) => {
                const points = route.waypoints.map((w) => `${w.x},${w.y}`).join(' ');
                return (
                  <polyline
                    key={`road-${route.id}`}
                    points={points}
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}

              {/* Active Route Polylines */}
              {routes.map((route) => {
                const isDimmed =
                  selectedMapRouteId !== null && selectedMapRouteId !== route.id;
                const points = route.waypoints.map((w) => `${w.x},${w.y}`).join(' ');
                const midWp =
                  route.waypoints[Math.floor(route.waypoints.length / 2)] ||
                  route.waypoints[0];

                return (
                  <g
                    key={route.id}
                    opacity={isDimmed ? 0.2 : 1}
                    className="transition-opacity duration-200"
                  >
                    <polyline
                      points={points}
                      fill="none"
                      stroke={route.color}
                      strokeWidth="4.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points={points}
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      strokeDasharray="6 10"
                      className="animate-route-flow"
                      opacity="0.7"
                    />
                    {/* Route Label Tag */}
                    <g transform={`translate(${midWp.x - 28}, ${midWp.y - 26})`}>
                      <rect
                        width="58"
                        height="18"
                        rx="4"
                        fill="#0F172A"
                        stroke={route.color}
                        strokeWidth="1.2"
                      />
                      <text
                        x="29"
                        y="12.5"
                        textAnchor="middle"
                        fill="#F8FAFC"
                        fontSize="9.5"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {route.code}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Corridor Bus Stops */}
              {stops.map((stop) => {
                const isSelectedStop =
                  stop.id === selectedStop?.id || stop.id === student.selectedStopId;
                return (
                  <g
                    key={stop.id}
                    data-interactive="true"
                    transform={`translate(${stop.x}, ${stop.y})`}
                    onClick={() => {
                      setSelectedMapStopId(stop.id);
                      selectStudentStop(stop.id);
                    }}
                    className="cursor-pointer"
                  >
                    {isSelectedStop && (
                      <circle
                        r="16"
                        fill="none"
                        stroke="#06B6D4"
                        strokeWidth="2"
                        strokeDasharray="3 3"
                      />
                    )}
                    <circle
                      r={isSelectedStop ? '7.5' : '5.5'}
                      fill={isSelectedStop ? '#06B6D4' : '#0F172A'}
                      stroke="#F8FAFC"
                      strokeWidth="2.2"
                    />
                    <text
                      x="0"
                      y="21"
                      textAnchor="middle"
                      fill={isSelectedStop ? '#22D3EE' : '#E2E8F0'}
                      fontSize="10.5"
                      fontWeight={isSelectedStop ? '700' : '500'}
                    >
                      {stop.name}
                    </text>
                  </g>
                );
              })}

              {/* Moving Bus Markers */}
              {buses.map((bus) => {
                const isSelected = bus.id === selectedBus?.id;
                const statusColor = getBusStatusColor(bus);
                const isEmergency = bus.status === 'EMERGENCY';

                return (
                  <g
                    key={bus.id}
                    data-interactive="true"
                    transform={`translate(${bus.x}, ${bus.y})`}
                    onClick={() => setSelectedMapBusId(bus.id)}
                    className="cursor-pointer"
                    style={{
                      transition: 'transform 850ms linear',
                    }}
                  >
                    {/* Emergency Pulsing Red Beacon */}
                    {isEmergency && (
                      <circle
                        r="26"
                        fill="#DC2626"
                        opacity="0.45"
                        className="animate-sos-ring"
                      />
                    )}

                    {/* Selected Focus Halo */}
                    {isSelected && (
                      <circle
                        r="22"
                        fill="none"
                        stroke="#38BDF8"
                        strokeWidth="2.5"
                      />
                    )}

                    {/* Bus Marker Circle */}
                    <circle
                      r="14"
                      fill={statusColor}
                      stroke="#FFFFFF"
                      strokeWidth="2.2"
                    />

                    {/* Direction Heading Pointer */}
                    <g transform={`rotate(${bus.heading})`}>
                      <polygon
                        points="0,-19 -4,-12 4,-12"
                        fill="#FFFFFF"
                      />
                    </g>

                    {/* Bus Number Inside Marker */}
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="8.5"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {bus.number.replace('BUS ', '')}
                    </text>

                    {/* Floating Telemetry Callout Label */}
                    <g transform="translate(18, -14)">
                      <rect
                        width="86"
                        height="26"
                        rx="5"
                        fill="#0F172A"
                        fillOpacity="0.92"
                        stroke={isSelected ? '#38BDF8' : '#334155'}
                        strokeWidth="1"
                      />
                      <text
                        x="6"
                        y="11"
                        fill="#F8FAFC"
                        fontSize="9.5"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {bus.number} · {bus.speed}km/h
                      </text>
                      <text
                        x="6"
                        y="21"
                        fill="#94A3B8"
                        fontSize="8.5"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {bus.occupancy}/{bus.capacity} · ETA {bus.eta}m
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Bottom Map Bar: Quick Bus Selector Buttons */}
          <div
            data-interactive="true"
            className="absolute bottom-3 left-4 right-4 z-20 flex items-center gap-1.5 overflow-x-auto bg-slate-900/90 backdrop-blur-xs border border-slate-700/80 rounded-lg p-2"
          >
            <span className="text-[11px] font-semibold text-slate-400 px-2 shrink-0">
              Active Units:
            </span>
            {buses.map((b) => {
              const active = b.id === selectedBus?.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => focusOnBus(b)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getBusStatusColor(b) }}
                  />
                  <span>{b.number}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Detailed Telemetry Inspector Card + Selected Stop Panel */}
        {!compact && selectedBus && (
          <div className="lg:col-span-4 space-y-5">
            {/* Detailed Bus Telemetry Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono">{selectedBus.registrationNumber}</span>
                    <span>·</span>
                    <span>{selectedBusRoute?.code || 'Route A'}</span>
                    <span>·</span>
                    <span>Updated {selectedBus.lastUpdated}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 font-display mt-1">
                    {selectedBus.number}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {selectedBusRoute?.name}
                  </p>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: getBusStatusColor(selectedBus) }}
                    />
                    <span>{selectedBus.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Trip: {selectedBus.tripStatus}
                  </p>
                </div>
              </div>

              {selectedBus.status === 'EMERGENCY' && (
                <div className="my-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Active Emergency SOS Beacon</p>
                    <p className="mt-0.5 text-red-700">
                      Unit halted near {selectedBus.currentStop}. Dispatch and Admin notified.
                    </p>
                  </div>
                </div>
              )}

              {/* Telemetry Metrics Grid */}
              <div className="py-4 grid grid-cols-2 gap-4 border-b border-slate-100 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Current Location</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedBus.currentStop}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Next Stop &amp; ETA</p>
                  <p className="font-semibold text-[#2563EB] mt-0.5 tabular-nums">
                    {selectedBus.nextStop} ({selectedBus.eta} min)
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ground Speed &amp; Heading</p>
                  <p className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                    {selectedBus.speed} km/h · {selectedBus.heading}°
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Assigned Driver</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {selectedBusDriver?.name || 'Rajesh Kumar'}{' '}
                    <span className="font-mono text-xs font-normal text-slate-500">
                      ({selectedBusDriver?.employeeId || 'EMP-104'})
                    </span>
                  </p>
                </div>
              </div>

              {/* Occupancy Progress Bar */}
              <div className="py-4 border-b border-slate-100">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-medium text-slate-700">
                    Passenger Occupancy ({getBusCrowdLabel(selectedBus)})
                  </span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {selectedBus.occupancy} / {selectedBus.capacity} (
                    {Math.round((selectedBus.occupancy / selectedBus.capacity) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((selectedBus.occupancy / selectedBus.capacity) * 100)
                      )}%`,
                      backgroundColor: getBusStatusColor(selectedBus),
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2 tabular-nums">
                  {Math.max(0, selectedBus.capacity - selectedBus.occupancy)} seats available · GPS {selectedBus.latitude.toFixed(4)}° N, {selectedBus.longitude.toFixed(4)}° E
                </p>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedBusDriver) {
                      setActiveDriverId(selectedBusDriver.id);
                    }
                    setActiveTab('driver');
                  }}
                  className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-[#1A365D] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
                >
                  Open Driver Console
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ai')}
                  className="py-2 px-3 text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
                >
                  Ask CampusTrack AI
                </button>
              </div>
            </div>

            {/* Selected Corridor Stop Inspector */}
            {selectedStop && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-500">
                    Selected Corridor Waypoint · {selectedStop.code}
                  </p>
                  <span className="font-mono text-xs text-[#06B6D4] font-semibold tabular-nums">
                    Km {selectedStop.corridorKm}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedStop.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedStop.landmark} · {selectedStop.walkingMinutesFromGate} min walk from gate
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Approaching Shuttles to {selectedStop.name}
                  </p>
                  {buses.slice(0, 3).map((b) => {
                    const distKm = Number(
                      Math.max(
                        0.6,
                        Math.abs(
                          selectedStop.corridorKm -
                            (stops.find((s) => s.name === b.currentStop)?.corridorKm ?? 4.8)
                        )
                      ).toFixed(1)
                    );
                    const etaMin = Math.max(
                      1,
                      Math.round((distKm / Math.max(b.speed, 24)) * 60)
                    );
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedMapBusId(b.id)}
                        className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg hover:bg-slate-50 text-xs transition-colors"
                      >
                        <span className="font-mono font-semibold text-slate-900">
                          {b.number}{' '}
                          <span className="font-sans font-normal text-slate-500">
                            (from {b.currentStop})
                          </span>
                        </span>
                        <span className="font-mono font-semibold text-[#2563EB] tabular-nums">
                          {etaMin} min · {distKm} km
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
