import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit3,
  Power,
  Eye,
  RotateCcw,
  X,
} from 'lucide-react';
import { useTransit } from '../simulation/useTransitStore';
import { HOURLY_TRANSIT_VOLUME } from '../data/seedData';
import { Bus, BusStatus, Driver } from '../types/transit';

type AdminSubTab = 'fleet' | 'drivers' | 'routes';

export const AdminPortal: React.FC = () => {
  const {
    buses,
    drivers,
    routes,
    stops,
    alerts,
    resolveAlert,
    addBus,
    updateBus,
    toggleBusStatus,
    deleteBus,
    addDriver,
    updateDriver,
    toggleDriverAvailability,
    reorderRouteStops,
    toggleRouteStatus,
    trackBusOnMap,
    setActiveTab,
    setActiveDriverId,
    resetAllDemoData,
  } = useTransit();

  const [subTab, setSubTab] = useState<AdminSubTab>('fleet');
  const [fleetSearch, setFleetSearch] = useState('');
  const [fleetStatusFilter, setFleetStatusFilter] = useState<string>('ALL');
  const [driverSearch, setDriverSearch] = useState('');

  // Analytics Tooltip states
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null);
  const [hoveredHourIdx, setHoveredHourIdx] = useState<number | null>(1);

  // Modals state
  const [addBusOpen, setAddBusOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);
  const [deletingBus, setDeletingBus] = useState<Bus | null>(null);

  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Add Bus Form state
  const [newBusNumber, setNewBusNumber] = useState('BUS 45');
  const [newBusReg, setNewBusReg] = useState('AP-35-Z-4501');
  const [newBusCap, setNewBusCap] = useState(50);
  const [newBusRouteId, setNewBusRouteId] = useState(routes[0]?.id || 'route-a');
  const [newBusDriverId, setNewBusDriverId] = useState(drivers[12]?.id || 'drv-113');
  const [newBusStatus, setNewBusStatus] = useState<BusStatus>('ON TIME');

  // Add Driver Form state
  const [newDrvName, setNewDrvName] = useState('');
  const [newDrvEmpId, setNewDrvEmpId] = useState('EMP-119');
  const [newDrvPhone, setNewDrvPhone] = useState('+91 98480 24119');
  const [newDrvBusId, setNewDrvBusId] = useState<string>('');
  const [newDrvStatus, setNewDrvStatus] = useState<Driver['status']>('AVAILABLE');
  const [newDrvShift, setNewDrvShift] = useState('07:30 – 16:00');

  // Dynamic KPIs matching prompt seed & live updates
  const kpis = useMemo(() => {
    const totalBuses = buses.length;
    const activeBuses = buses.filter((b) => b.tripStatus === 'ACTIVE').length;
    const totalDrivers = drivers.length;
    const delayedBuses = buses.filter(
      (b) => b.status === 'DELAYED' || b.status === 'EMERGENCY'
    ).length;
    const activeSOS = alerts.filter((a) => !a.resolved).length;
    const enRouteStudents = buses.reduce((sum, b) => sum + b.occupancy, 0);

    return {
      totalBuses,
      activeBuses,
      totalDrivers,
      registeredStudents: 2450,
      corridorRoutes: 15,
      delayedBuses,
      activeSOS,
      enRouteStudents,
    };
  }, [buses, drivers, alerts]);

  // Route Occupancy Distribution Chart Data
  const routeOccupancyStats = useMemo(() => {
    return routes.map((route) => {
      const routeBuses = buses.filter((b) => b.routeId === route.id);
      const totalOcc = routeBuses.reduce((s, b) => s + b.occupancy, 0);
      const totalCap = routeBuses.reduce((s, b) => s + b.capacity, 0) || 100;
      const pct = Math.round((totalOcc / totalCap) * 100);
      return {
        routeId: route.id,
        code: route.code,
        name: route.name,
        color: route.color,
        busCount: routeBuses.length,
        occupancy: totalOcc,
        capacity: totalCap,
        pct,
      };
    });
  }, [routes, buses]);

  // Filtered Fleet List
  const filteredBuses = useMemo(() => {
    const q = fleetSearch.trim().toLowerCase();
    return buses.filter((b) => {
      if (fleetStatusFilter !== 'ALL' && b.status !== fleetStatusFilter) {
        return false;
      }
      if (!q) return true;
      const drv = drivers.find((d) => d.id === b.driverId);
      const rte = routes.find((r) => r.id === b.routeId);
      return (
        b.number.toLowerCase().includes(q) ||
        b.registrationNumber.toLowerCase().includes(q) ||
        b.currentStop.toLowerCase().includes(q) ||
        b.nextStop.toLowerCase().includes(q) ||
        (drv && drv.name.toLowerCase().includes(q)) ||
        (rte && rte.name.toLowerCase().includes(q))
      );
    });
  }, [buses, drivers, routes, fleetSearch, fleetStatusFilter]);

  // Filtered Drivers List
  const filteredDrivers = useMemo(() => {
    const q = driverSearch.trim().toLowerCase();
    return drivers.filter((d) => {
      if (!q) return true;
      const assignedBus = buses.find((b) => b.id === d.assignedBusId);
      return (
        d.name.toLowerCase().includes(q) ||
        d.employeeId.toLowerCase().includes(q) ||
        d.status.toLowerCase().includes(q) ||
        (assignedBus && assignedBus.number.toLowerCase().includes(q))
      );
    });
  }, [drivers, buses, driverSearch]);

  const activeAlerts = alerts.filter((a) => !a.resolved);

  const handleCreateBus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBusNumber.trim()) return;
    addBus({
      number: newBusNumber,
      registrationNumber: newBusReg || 'AP-35-Z-9900',
      capacity: Number(newBusCap) || 50,
      routeId: newBusRouteId,
      driverId: newBusDriverId,
      status: newBusStatus,
    });
    setAddBusOpen(false);
    setNewBusNumber(`BUS ${Math.floor(46 + Math.random() * 40)}`);
  };

  const handleSaveEditBus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBus) return;
    updateBus(editingBus.id, {
      number: editingBus.number,
      registrationNumber: editingBus.registrationNumber,
      capacity: Number(editingBus.capacity),
      routeId: editingBus.routeId,
      driverId: editingBus.driverId,
      status: editingBus.status,
    });
    setEditingBus(null);
  };

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrvName.trim()) return;
    addDriver({
      name: newDrvName.trim(),
      employeeId: newDrvEmpId.trim() || `EMP-${120 + drivers.length}`,
      phone: newDrvPhone.trim() || '+91 98480 24199',
      assignedBusId: newDrvBusId || null,
      status: newDrvStatus,
      shift: newDrvShift,
    });
    setAddDriverOpen(false);
    setNewDrvName('');
    setNewDrvEmpId(`EMP-${120 + drivers.length}`);
  };

  const handleSaveEditDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    updateDriver(editingDriver.id, editingDriver);
    setEditingDriver(null);
  };

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Transportation Management Center</span>
            <span>·</span>
            <span className="tabular-nums">
              {kpis.enRouteStudents} Students Currently En-Route
            </span>
            <span>·</span>
            <span className="tabular-nums">{kpis.activeBuses} Active Trips</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 font-display mt-1">
            University Fleet &amp; Corridor Operations
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetAllDemoData}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
          <button
            type="button"
            onClick={() => setAddBusOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fleet Bus</span>
          </button>
        </div>
      </div>

      {/* Active SOS Emergency Command Center Panel */}
      {activeAlerts.length > 0 && (
        <section
          aria-label="Active Emergency Alerts"
          className="bg-red-50 border-2 border-[#DC2626] rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-[#DC2626]">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
              <h2 className="text-lg font-bold font-display">
                CRITICAL EMERGENCY / SOS ALERTS ({activeAlerts.length})
              </h2>
            </div>
            <span className="font-mono text-xs font-semibold text-red-800">
              IMMEDIATE DISPATCH ACTION REQUIRED
            </span>
          </div>

          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-white rounded-xl border border-red-200 p-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                    <strong className="text-[#DC2626]">{alert.type}</strong>
                    <span>·</span>
                    <span>{alert.busNumber}</span>
                    <span>·</span>
                    <span>
                      Operator: {alert.driverName} ({alert.driverEmployeeId})
                    </span>
                    <span>·</span>
                    <span>Logged {alert.timestamp}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-1">
                    {alert.message}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">
                    Location: {alert.coordinates.locationName} (
                    {alert.coordinates.latitude}° N, {alert.coordinates.longitude}° E)
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => trackBusOnMap(alert.busId)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Locate on Map
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveAlert(alert.id)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Acknowledge &amp; Resolve</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top 6 KPI Cards */}
      <section
        aria-label="Key Performance Indicators"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500">Total Buses</p>
          <p className="text-3xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {kpis.totalBuses}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {kpis.enRouteStudents} seats occupied
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500">Active Buses</p>
          <p className="text-3xl font-bold font-mono text-[#16A34A] mt-1 tabular-nums">
            {kpis.activeBuses}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Broadcasting live GPS
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500">Drivers</p>
          <p className="text-3xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {kpis.totalDrivers}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Certified operators
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500">Registered Students</p>
          <p className="text-3xl font-bold font-mono text-[#1A365D] mt-1 tabular-nums">
            {kpis.registeredStudents.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Active transit passes
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500">Corridor Routes</p>
          <p className="text-3xl font-bold font-mono text-[#2563EB] mt-1 tabular-nums">
            {kpis.corridorRoutes}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Regional &amp; campus lines
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500">Delayed Buses</p>
          <p
            className={`text-3xl font-bold font-mono mt-1 tabular-nums ${
              kpis.delayedBuses > 0 ? 'text-[#F59E0B]' : 'text-[#16A34A]'
            }`}
          >
            {kpis.delayedBuses}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {kpis.activeSOS} active SOS alerts
          </p>
        </div>
      </section>

      {/* Admin Interactive Analytics Section (2 Charts) */}
      <section
        aria-label="Transit Network Analytics"
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        {/* Chart 1: Route Occupancy Distribution */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Real-Time Corridor Load Balance
              </p>
              <h2 className="text-lg font-bold text-slate-900 font-display mt-0.5">
                Route Occupancy Distribution
              </h2>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#2563EB]" /> Occupied
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-200" /> Available
              </span>
            </div>
          </div>

          <div className="pt-5 space-y-4">
            {routeOccupancyStats.map((stat) => {
              const isHovered = hoveredRouteId === stat.routeId;
              return (
                <div
                  key={stat.routeId}
                  onMouseEnter={() => setHoveredRouteId(stat.routeId)}
                  onMouseLeave={() => setHoveredRouteId(null)}
                  className={`p-3 rounded-xl border transition-colors ${
                    isHovered
                      ? 'bg-slate-50 border-slate-300'
                      : 'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div>
                      <span className="font-bold text-slate-900">{stat.code}</span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="text-slate-600">{stat.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {stat.occupancy} / {stat.capacity} seats ({stat.pct}%)
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, stat.pct)}%`,
                        backgroundColor: stat.color,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 tabular-nums">
                    <span>Assigned Units: {stat.busCount} buses</span>
                    <span>
                      {Math.max(0, stat.capacity - stat.occupancy)} available seats on corridor
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Daily Trips — Hourly Transit Volume */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Corridor Dispatch Throughput
              </p>
              <h2 className="text-lg font-bold text-slate-900 font-display mt-0.5">
                Daily Trips — Hourly Transit Volume
              </h2>
            </div>

            {hoveredHourIdx !== null && HOURLY_TRANSIT_VOLUME[hoveredHourIdx] && (
              <div className="text-right font-mono text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 tabular-nums">
                <span className="font-bold text-[#1A365D]">
                  {HOURLY_TRANSIT_VOLUME[hoveredHourIdx].hour}
                </span>
                {' · '}
                <span>{HOURLY_TRANSIT_VOLUME[hoveredHourIdx].trips} Trips</span>
                {' · '}
                <span className="text-[#2563EB]">
                  {HOURLY_TRANSIT_VOLUME[hoveredHourIdx].students} Students
                </span>
              </div>
            )}
          </div>

          {/* Interactive SVG Column Chart */}
          <div className="pt-6 pb-2">
            <div className="grid grid-cols-9 gap-2 items-end h-52 pt-4 px-2 border-b border-slate-200">
              {HOURLY_TRANSIT_VOLUME.map((item, idx) => {
                const heightPct = Math.round((item.trips / 30) * 100);
                const isSelected = hoveredHourIdx === idx;
                return (
                  <button
                    key={item.hour}
                    type="button"
                    onMouseEnter={() => setHoveredHourIdx(idx)}
                    onFocus={() => setHoveredHourIdx(idx)}
                    className="group flex flex-col items-center justify-end h-full focus:outline-none"
                  >
                    <span
                      className={`font-mono text-[11px] mb-1.5 tabular-nums ${
                        isSelected
                          ? 'font-bold text-[#2563EB]'
                          : 'text-slate-500 group-hover:text-slate-900'
                      }`}
                    >
                      {item.trips}
                    </span>
                    <div
                      className="w-full max-w-[34px] rounded-t-md transition-all duration-200"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: isSelected ? '#2563EB' : '#1A365D',
                        opacity: isSelected ? 1 : 0.82,
                      }}
                    />
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-9 gap-2 pt-2 px-2 text-center">
              {HOURLY_TRANSIT_VOLUME.map((item, idx) => (
                <span
                  key={item.hour}
                  className={`font-mono text-[11px] tabular-nums ${
                    hoveredHourIdx === idx
                      ? 'font-bold text-[#2563EB]'
                      : 'text-slate-500'
                  }`}
                >
                  {item.hour}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 tabular-nums">
            <span>Morning Peak: 08:00 AM (28 trips · 1,120 riders)</span>
            <span>Evening Peak: 16:00 PM (26 trips · 1,040 riders)</span>
          </div>
        </div>
      </section>

      {/* Tabbed Administration Workspace: Fleet | Drivers | Routes */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Sub-navigation Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60">
          <div className="flex items-center gap-1 bg-slate-200/75 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setSubTab('fleet')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                subTab === 'fleet'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fleet Management ({buses.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('drivers')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                subTab === 'drivers'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Driver Management ({drivers.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('routes')}
              className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                subTab === 'routes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Route &amp; Stop Sequencing ({routes.length})
            </button>
          </div>

          {subTab === 'fleet' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fleetSearch}
                  onChange={(e) => setFleetSearch(e.target.value)}
                  placeholder="Filter buses, routes, stops..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-2 focus:outline-[#2563EB]"
                />
              </div>

              <select
                aria-label="Filter Fleet by Status"
                value={fleetStatusFilter}
                onChange={(e) => setFleetStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg"
              >
                <option value="ALL">All Statuses</option>
                <option value="ON TIME">ON TIME</option>
                <option value="DELAYED">DELAYED</option>
                <option value="PAUSED">PAUSED</option>
                <option value="EMERGENCY">EMERGENCY</option>
                <option value="OFFLINE">OFFLINE</option>
              </select>

              <button
                type="button"
                onClick={() => setAddBusOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1A365D] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Bus</span>
              </button>
            </div>
          )}

          {subTab === 'drivers' && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  placeholder="Search drivers or EMP ID..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-2 focus:outline-[#2563EB]"
                />
              </div>
              <button
                type="button"
                onClick={() => setAddDriverOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1A365D] hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Driver</span>
              </button>
            </div>
          )}
        </div>

        {/* SUB-TAB 1: FLEET MANAGEMENT TABLE */}
        {subTab === 'fleet' && (
          <div className="overflow-x-auto">
            {filteredBuses.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  No buses found matching current filter criteria
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFleetSearch('');
                    setFleetStatusFilter('ALL');
                  }}
                  className="mt-2 text-xs font-semibold text-[#2563EB] hover:underline"
                >
                  Reset Fleet Filters
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/40">
                    <th className="py-3 px-4">Bus</th>
                    <th className="py-3 px-4">Route</th>
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Speed</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-right">Occupancy</th>
                    <th className="py-3 px-4 text-right">Capacity</th>
                    <th className="py-3 px-4">Last Update</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredBuses.map((bus) => {
                    const route = routes.find((r) => r.id === bus.routeId);
                    const driver = drivers.find((d) => d.id === bus.driverId);
                    return (
                      <tr
                        key={bus.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {bus.number}
                          <span className="block text-[10px] font-normal text-slate-400">
                            {bus.registrationNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-semibold text-slate-900">
                            {route?.code || 'Route A'}
                          </span>
                          <span className="block text-[11px] text-slate-500 truncate max-w-[190px]">
                            {route?.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {driver ? (
                            <>
                              <span className="font-medium text-slate-900">
                                {driver.name}
                              </span>
                              <span className="block font-mono text-[10px] text-slate-400">
                                {driver.employeeId}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold whitespace-nowrap">
                          <span
                            className={
                              bus.status === 'ON TIME'
                                ? 'text-[#16A34A]'
                                : bus.status === 'EMERGENCY'
                                ? 'text-[#DC2626]'
                                : bus.status === 'DELAYED'
                                ? 'text-[#F59E0B]'
                                : 'text-slate-500'
                            }
                          >
                            {bus.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                          {bus.speed} km/h
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          <span className="font-medium text-slate-900">
                            {bus.currentStop}
                          </span>
                          <span className="text-slate-400"> → {bus.nextStop}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                          {bus.occupancy} ({Math.round((bus.occupancy / bus.capacity) * 100)}%)
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                          {bus.capacity}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {bus.lastUpdated}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => trackBusOnMap(bus.id)}
                              title="View on Live Map"
                              aria-label={`View ${bus.number} on Live Map`}
                              className="p-1.5 text-slate-600 hover:text-[#2563EB] hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBus({ ...bus })}
                              title="Edit Bus Assignment"
                              aria-label={`Edit ${bus.number}`}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleBusStatus(bus.id)}
                              title="Toggle Active / Paused Status"
                              aria-label={`Toggle status for ${bus.number}`}
                              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingBus(bus)}
                              title="Delete Bus"
                              aria-label={`Delete ${bus.number}`}
                              className="p-1.5 text-slate-600 hover:text-[#DC2626] hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* SUB-TAB 2: DRIVER MANAGEMENT TABLE */}
        {subTab === 'drivers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500 bg-slate-50/40">
                  <th className="py-3 px-4">Driver Name</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Assigned Bus</th>
                  <th className="py-3 px-4">Availability Status</th>
                  <th className="py-3 px-4">Current Trip &amp; Shift</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredDrivers.map((drv) => {
                  const busObj = buses.find((b) => b.id === drv.assignedBusId);
                  const routeObj = busObj
                    ? routes.find((r) => r.id === busObj.routeId)
                    : null;
                  return (
                    <tr key={drv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {drv.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {drv.employeeId}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#1A365D]">
                        {busObj ? busObj.number : 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 font-semibold">
                        <span
                          className={
                            drv.status === 'ON DUTY'
                              ? 'text-[#16A34A]'
                              : drv.status === 'AVAILABLE'
                              ? 'text-[#2563EB]'
                              : drv.status === 'BREAK'
                              ? 'text-[#F59E0B]'
                              : 'text-slate-400'
                          }
                        >
                          {drv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {busObj && routeObj ? (
                          <span>
                            {routeObj.code}: {busObj.currentStop} → {busObj.nextStop}
                          </span>
                        ) : (
                          <span>{drv.shift}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {drv.phone}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleDriverAvailability(drv.id)}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            Cycle Status
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingDriver({ ...drv })}
                            className="px-2.5 py-1 text-[11px] font-medium text-[#2563EB] bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            Edit / Assign Bus
                          </button>
                          {busObj && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDriverId(drv.id);
                                setActiveTab('driver');
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium text-white bg-[#1A365D] hover:bg-slate-800 rounded-md transition-colors"
                            >
                              View Trip
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* SUB-TAB 3: ROUTE AND STOP MANAGEMENT */}
        {subTab === 'routes' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {routes.map((route) => (
              <div
                key={route.id}
                className="rounded-xl border border-slate-200 p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: route.color }}
                        />
                        <span className="font-mono font-semibold text-slate-800">
                          {route.id.toUpperCase()}
                        </span>
                        <span>·</span>
                        <span>{route.distance}</span>
                        <span>·</span>
                        <span>{route.duration}</span>
                        <span>·</span>
                        <span>{route.frequency}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 font-display mt-1">
                        {route.code}: {route.name}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleRouteStatus(route.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                        route.operatingStatus === 'ACTIVE'
                          ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                          : route.operatingStatus === 'LIMITED'
                          ? 'bg-amber-50 text-[#F59E0B] border border-amber-200'
                          : 'bg-red-50 text-[#DC2626] border border-red-200'
                      }`}
                    >
                      {route.operatingStatus}
                    </button>
                  </div>

                  {/* Editable Stop Sequence List */}
                  <div className="py-4">
                    <p className="text-xs font-semibold text-slate-500 mb-2.5">
                      Corridor Stop Sequence (Use arrows to reorder waypoints)
                    </p>
                    <div className="space-y-1.5">
                      {route.stops.map((stopId, idx) => {
                        const st = stops.find((s) => s.id === stopId);
                        return (
                          <div
                            key={`${route.id}-${stopId}-${idx}`}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono font-bold text-slate-400 tabular-nums">
                                0{idx + 1}
                              </span>
                              <span className="font-semibold text-slate-900">
                                {st?.name || stopId}
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">
                                ({st?.code})
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => reorderRouteStops(route.id, idx, idx - 1)}
                                aria-label="Move Stop Up"
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-white rounded disabled:opacity-30"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === route.stops.length - 1}
                                onClick={() => reorderRouteStops(route.id, idx, idx + 1)}
                                aria-label="Move Stop Down"
                                className="p-1 text-slate-500 hover:text-slate-900 hover:bg-white rounded disabled:opacity-30"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Active Units on Route:{' '}
                    <strong className="text-slate-900">
                      {buses.filter((b) => b.routeId === route.id).length}
                    </strong>
                  </span>
                  <span>Click status button to toggle ACTIVE / LIMITED</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL 1: ADD BUS DIALOG */}
      {addBusOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-bus-title"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#1A365D] text-white flex items-center justify-between">
              <h3 id="add-bus-title" className="text-base font-bold font-display">
                Add New Fleet Bus
              </h3>
              <button
                type="button"
                onClick={() => setAddBusOpen(false)}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBus} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bus Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newBusNumber}
                    onChange={(e) => setNewBusNumber(e.target.value)}
                    placeholder="e.g. BUS 45"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newBusReg}
                    onChange={(e) => setNewBusReg(e.target.value)}
                    placeholder="AP-35-Z-4501"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Seat Capacity
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={80}
                    required
                    value={newBusCap}
                    onChange={(e) => setNewBusCap(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newBusStatus}
                    onChange={(e) => setNewBusStatus(e.target.value as BusStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="ON TIME">ON TIME</option>
                    <option value="DELAYED">DELAYED</option>
                    <option value="PAUSED">PAUSED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigned Corridor Route
                </label>
                <select
                  value={newBusRouteId}
                  onChange={(e) => setNewBusRouteId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code}: {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigned Driver
                </label>
                <select
                  value={newBusDriverId}
                  onChange={(e) => setNewBusDriverId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.employeeId}) — {d.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddBusOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg"
                >
                  Deploy Bus to Network
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT BUS DIALOG */}
      {editingBus && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#1A365D] text-white flex items-center justify-between">
              <h3 className="text-base font-bold font-display">
                Edit Fleet Unit — {editingBus.number}
              </h3>
              <button
                type="button"
                onClick={() => setEditingBus(null)}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBus} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bus Number
                  </label>
                  <input
                    type="text"
                    value={editingBus.number}
                    onChange={(e) =>
                      setEditingBus({ ...editingBus, number: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editingBus.status}
                    onChange={(e) =>
                      setEditingBus({
                        ...editingBus,
                        status: e.target.value as BusStatus,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="ON TIME">ON TIME</option>
                    <option value="DELAYED">DELAYED</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigned Route
                </label>
                <select
                  value={editingBus.routeId}
                  onChange={(e) =>
                    setEditingBus({ ...editingBus, routeId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code}: {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assigned Driver
                </label>
                <select
                  value={editingBus.driverId}
                  onChange={(e) =>
                    setEditingBus({ ...editingBus, driverId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBus(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE BUS CONFIRMATION */}
      {deletingBus && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              Confirm Decommission of {deletingBus.number}
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to remove <strong>{deletingBus.number}</strong> (
              <span className="font-mono">{deletingBus.registrationNumber}</span>) from
              the active university transit fleet? Its assigned operator will be marked
              Available.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingBus(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteBus(deletingBus.id);
                  setDeletingBus(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-[#DC2626] hover:bg-red-700 rounded-lg"
              >
                Delete Bus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD DRIVER DIALOG */}
      {addDriverOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#1A365D] text-white flex items-center justify-between">
              <h3 className="text-base font-bold font-display">
                Register New Transit Driver
              </h3>
              <button
                type="button"
                onClick={() => setAddDriverOpen(false)}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDriver} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newDrvName}
                    onChange={(e) => setNewDrvName(e.target.value)}
                    placeholder="e.g. Karthikeyaarma"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    required
                    value={newDrvEmpId}
                    onChange={(e) => setNewDrvEmpId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={newDrvPhone}
                    onChange={(e) => setNewDrvPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Duty Status
                  </label>
                  <select
                    value={newDrvStatus}
                    onChange={(e) =>
                      setNewDrvStatus(e.target.value as Driver['status'])
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="ON DUTY">ON DUTY</option>
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="BREAK">BREAK</option>
                    <option value="OFF DUTY">OFF DUTY</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assign Bus (Optional)
                </label>
                <select
                  value={newDrvBusId}
                  onChange={(e) => setNewDrvBusId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Unassigned (Standby Pool)</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.number} ({b.registrationNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddDriverOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg"
                >
                  Add Driver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT DRIVER DIALOG */}
      {editingDriver && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#1A365D] text-white flex items-center justify-between">
              <h3 className="text-base font-bold font-display">
                Edit Operator — {editingDriver.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDriver} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Operator Name
                </label>
                <input
                  type="text"
                  value={editingDriver.name}
                  onChange={(e) =>
                    setEditingDriver({ ...editingDriver, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assigned Bus
                  </label>
                  <select
                    value={editingDriver.assignedBusId || ''}
                    onChange={(e) =>
                      setEditingDriver({
                        ...editingDriver,
                        assignedBusId: e.target.value || null,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">Unassigned</option>
                    {buses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.number}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Availability
                  </label>
                  <select
                    value={editingDriver.status}
                    onChange={(e) =>
                      setEditingDriver({
                        ...editingDriver,
                        status: e.target.value as Driver['status'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="ON DUTY">ON DUTY</option>
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="BREAK">BREAK</option>
                    <option value="OFF DUTY">OFF DUTY</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-[#2563EB] hover:bg-blue-700 rounded-lg"
                >
                  Update Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
