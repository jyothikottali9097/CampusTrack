import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useTransit } from '../simulation/useTransitStore';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    buses,
    routes,
    stops,
    drivers,
    schedules,
    trackBusOnMap,
    focusStopOnMap,
    focusRouteOnMap,
    setActiveTab,
  } = useTransit();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isSearchOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const matchedBuses = buses.filter(
      (b) =>
        !q ||
        b.number.toLowerCase().includes(q) ||
        b.currentStop.toLowerCase().includes(q) ||
        b.nextStop.toLowerCase().includes(q) ||
        b.registrationNumber.toLowerCase().includes(q) ||
        b.status.toLowerCase().includes(q)
    );

    const matchedStops = stops.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.landmark.toLowerCase().includes(q)
    );

    const matchedRoutes = routes.filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.shortName.toLowerCase().includes(q)
    );

    const matchedDrivers = drivers.filter(
      (d) =>
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.employeeId.toLowerCase().includes(q)
    );

    const matchedSchedules = schedules.filter(
      (s) =>
        !q ||
        s.busNumber.toLowerCase().includes(q) ||
        s.routeName.toLowerCase().includes(q) ||
        s.departure.toLowerCase().includes(q)
    );

    return {
      buses: matchedBuses.slice(0, 4),
      stops: matchedStops.slice(0, 4),
      routes: matchedRoutes.slice(0, 3),
      drivers: matchedDrivers.slice(0, 3),
      schedules: matchedSchedules.slice(0, 3),
      total:
        matchedBuses.length +
        matchedStops.length +
        matchedRoutes.length +
        matchedDrivers.length +
        matchedSchedules.length,
    };
  }, [query, buses, stops, routes, drivers, schedules]);

  if (!isSearchOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Transit Search"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-16 px-4"
      onClick={() => setIsSearchOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
          <Search className="w-5 h-5 text-[#2563EB] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search buses (e.g. BUS 24), stops (Nellimarla, RTC Complex), routes, drivers, schedules..."
            className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSearchOpen(false)}
            aria-label="Close Search"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[68vh] overflow-y-auto divide-y divide-slate-100 p-4 space-y-5">
          {results.total === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-slate-800">
                No transit records match "{query}"
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Try searching for BUS 24, Nellimarla, RTC Complex, Route A, or Rajesh Kumar.
              </p>
            </div>
          ) : (
            <>
              {/* Buses */}
              {results.buses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    Fleet Units (Click to inspect live telemetry on Map)
                  </p>
                  <div className="space-y-1.5">
                    {results.buses.map((bus) => (
                      <button
                        key={bus.id}
                        type="button"
                        onClick={() => {
                          trackBusOnMap(bus.id);
                          setIsSearchOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors text-left"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <span className="font-mono">{bus.number}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-xs font-normal text-slate-600">
                              {bus.currentStop} → {bus.nextStop}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                            Speed: {bus.speed} km/h · Occupancy: {bus.occupancy}/{bus.capacity} · Status: {bus.status}
                          </p>
                        </div>
                        <span className="flex items-center gap-1 text-xs font-medium text-[#2563EB] whitespace-nowrap">
                          <span>Open Telemetry</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stops */}
              {results.stops.length > 0 && (
                <div className="pt-4">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    Corridor Bus Stops (Click to focus on Live Map)
                  </p>
                  <div className="space-y-1.5">
                    {results.stops.map((stop) => (
                      <button
                        key={stop.id}
                        type="button"
                        onClick={() => {
                          focusStopOnMap(stop.id);
                          setIsSearchOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {stop.name}{' '}
                            <span className="font-mono text-xs font-normal text-slate-500">
                              ({stop.code})
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 tabular-nums">
                            {stop.landmark} · Corridor Milepost {stop.corridorKm} km
                          </p>
                        </div>
                        <span className="text-xs font-medium text-[#2563EB] whitespace-nowrap">
                          Focus Map →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Routes */}
              {results.routes.length > 0 && (
                <div className="pt-4">
                  <p className="text-xs font-semibold text-slate-500 mb-2">
                    Transit Routes
                  </p>
                  <div className="space-y-1.5">
                    {results.routes.map((route) => (
                      <button
                        key={route.id}
                        type="button"
                        onClick={() => {
                          focusRouteOnMap(route.id);
                          setIsSearchOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {route.code}: {route.name}
                          </p>
                          <p className="text-xs text-slate-500 tabular-nums">
                            {route.distance} · {route.duration} · {route.frequency}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-[#2563EB] whitespace-nowrap">
                          View Route →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Drivers & Schedules */}
              {(results.drivers.length > 0 || results.schedules.length > 0) && (
                <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.drivers.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">
                        Drivers
                      </p>
                      <div className="space-y-1">
                        {results.drivers.map((drv) => (
                          <button
                            key={drv.id}
                            type="button"
                            onClick={() => {
                              setActiveTab('admin');
                              setIsSearchOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-xs"
                          >
                            <p className="font-semibold text-slate-900">
                              {drv.name} · <span className="font-mono">{drv.employeeId}</span>
                            </p>
                            <p className="text-slate-500 mt-0.5">
                              Status: {drv.status} · Shift: {drv.shift}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.schedules.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-2">
                        Schedule Entries
                      </p>
                      <div className="space-y-1">
                        {results.schedules.map((sch) => (
                          <button
                            key={sch.id}
                            type="button"
                            onClick={() => {
                              setActiveTab('schedule');
                              setIsSearchOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-xs"
                          >
                            <p className="font-semibold text-slate-900 tabular-nums">
                              {sch.busNumber} · {sch.departure} → {sch.arrival}
                            </p>
                            <p className="text-slate-500 mt-0.5">
                              {sch.routeCode}: {sch.routeName}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
