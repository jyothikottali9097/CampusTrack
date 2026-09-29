import React, { useState, useMemo } from 'react';
import { Search, Navigation } from 'lucide-react';
import { useTransit } from '../simulation/useTransitStore';

export const SchedulePortal: React.FC = () => {
  const { schedules, routes, stops, buses, trackBusOnMap } = useTransit();

  const [routeFilter, setRouteFilter] = useState<string>('ALL');
  const [stopFilter, setStopFilter] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredSchedules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return schedules.filter((sch) => {
      if (routeFilter !== 'ALL' && sch.routeId !== routeFilter) return false;
      if (
        stopFilter !== 'ALL' &&
        !sch.stopSequence.some((s) => s.toLowerCase() === stopFilter.toLowerCase())
      ) {
        return false;
      }
      if (timeFilter !== 'ALL' && sch.shiftPeriod !== timeFilter) return false;
      if (statusFilter !== 'ALL' && sch.status !== statusFilter) return false;
      if (!q) return true;
      return (
        sch.busNumber.toLowerCase().includes(q) ||
        sch.routeName.toLowerCase().includes(q) ||
        sch.routeCode.toLowerCase().includes(q) ||
        sch.stopSequence.some((st) => st.toLowerCase().includes(q))
      );
    });
  }, [schedules, routeFilter, stopFilter, timeFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500">
            Academic Term 2026 Corridor Timetable
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 font-display mt-0.5">
            University Bus Schedules &amp; Headways
          </h1>
        </div>

        <div className="text-xs text-slate-600 tabular-nums">
          Showing <strong className="text-slate-900">{filteredSchedules.length}</strong> of{' '}
          {schedules.length} scheduled corridor runs
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bus or corridor..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-2 focus:outline-[#2563EB]"
          />
        </div>

        <select
          aria-label="Filter by Route"
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg"
        >
          <option value="ALL">All Routes</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.code}: {r.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by Corridor Stop"
          value={stopFilter}
          onChange={(e) => setStopFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg"
        >
          <option value="ALL">All Corridor Stops</option>
          {stops.map((s) => (
            <option key={s.id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by Shift Time"
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg"
        >
          <option value="ALL">All Time Windows</option>
          <option value="Morning Peak">Morning Peak (07:00 – 09:30)</option>
          <option value="Midday">Midday Shuttle (12:00 – 14:00)</option>
          <option value="Evening Return">Evening Return (16:00 – 18:30)</option>
        </select>

        <select
          aria-label="Filter by Schedule Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg"
        >
          <option value="ALL">All Statuses</option>
          <option value="ON TIME">ON TIME</option>
          <option value="DELAYED">DELAYED</option>
          <option value="SCHEDULED">SCHEDULED</option>
        </select>
      </div>

      {/* Timetable */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filteredSchedules.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold text-slate-800">
              No timetable entries match your selected filters
            </p>
            <button
              type="button"
              onClick={() => {
                setRouteFilter('ALL');
                setStopFilter('ALL');
                setTimeFilter('ALL');
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="mt-2 text-xs font-semibold text-[#2563EB] hover:underline"
            >
              Reset All Timetable Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/60">
                  <th className="py-3.5 px-4">Route</th>
                  <th className="py-3.5 px-4">Assigned Bus</th>
                  <th className="py-3.5 px-4">Departure</th>
                  <th className="py-3.5 px-4">Arrival</th>
                  <th className="py-3.5 px-4">Frequency</th>
                  <th className="py-3.5 px-4">Stop Sequence</th>
                  <th className="py-3.5 px-4">Operating Days</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4 text-right">Live Radar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSchedules.map((sch) => {
                  const matchedBus = buses.find((b) => b.number === sch.busNumber);
                  return (
                    <tr
                      key={sch.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">
                          {sch.routeCode}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {sch.routeName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1A365D] whitespace-nowrap">
                        {sch.busNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {sch.departure}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {sch.arrival}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {sch.frequency}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-md">
                        <p className="text-[11px] leading-relaxed">
                          {sch.stopSequence.join(' → ')}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {sch.operatingDays}
                      </td>
                      <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                        <span
                          className={
                            sch.status === 'ON TIME'
                              ? 'text-[#16A34A]'
                              : sch.status === 'DELAYED'
                              ? 'text-[#F59E0B]'
                              : 'text-[#2563EB]'
                          }
                        >
                          {sch.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {matchedBus && (
                          <button
                            type="button"
                            onClick={() => trackBusOnMap(matchedBus.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Track</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
