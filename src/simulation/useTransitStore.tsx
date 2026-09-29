import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_ALERTS,
  INITIAL_BUSES,
  INITIAL_DRIVERS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ROUTES,
  INITIAL_SCHEDULES,
  INITIAL_STOPS,
  INITIAL_STUDENT,
  INITIAL_TRIPS,
} from '../data/seedData';
import {
  Alert,
  Bus,
  BusStatus,
  Driver,
  FleetSnapshot,
  NotificationItem,
  PortalTab,
  Route,
  ScheduleEntry,
  SimulationConfig,
  Stop,
  StudentProfile,
  Trip,
} from '../types/transit';

const STORAGE_KEY = 'campustrack_live_state_v2';

interface PersistedState {
  buses: Bus[];
  drivers: Driver[];
  routes: Route[];
  stops: Stop[];
  trips: Trip[];
  alerts: Alert[];
  notifications: NotificationItem[];
  schedules: ScheduleEntry[];
  student: StudentProfile;
  simConfig: SimulationConfig;
}

interface TransitContextValue extends PersistedState {
  activeTab: PortalTab;
  setActiveTab: (tab: PortalTab) => void;
  selectedMapBusId: string | null;
  setSelectedMapBusId: (busId: string | null) => void;
  selectedMapStopId: string | null;
  setSelectedMapStopId: (stopId: string | null) => void;
  selectedMapRouteId: string | null;
  setSelectedMapRouteId: (routeId: string | null) => void;
  activeDriverId: string;
  setActiveDriverId: (driverId: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;

  // Navigation helpers
  trackBusOnMap: (busId: string) => void;
  focusStopOnMap: (stopId: string) => void;
  focusRouteOnMap: (routeId: string) => void;

  // Student actions
  selectStudentStop: (stopId: string) => void;

  // Simulation controls
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulationPositions: () => void;
  setSimulationSpeed: (speed: 1 | 2 | 5 | 10) => void;

  // Driver Portal actions
  startTrip: (busId: string) => void;
  pauseTrip: (busId: string) => void;
  endTrip: (busId: string) => void;
  adjustOccupancy: (busId: string, delta: number) => void;
  triggerEmergencySOS: (
    busId: string,
    incidentType: Alert['type'],
    details: string
  ) => void;

  // Admin Portal actions
  resolveAlert: (alertId: string) => void;
  addBus: (busInput: {
    number: string;
    registrationNumber: string;
    capacity: number;
    routeId: string;
    driverId: string;
    status: BusStatus;
  }) => void;
  updateBus: (busId: string, updates: Partial<Bus>) => void;
  toggleBusStatus: (busId: string) => void;
  deleteBus: (busId: string) => void;

  addDriver: (driverInput: {
    name: string;
    employeeId: string;
    phone: string;
    assignedBusId: string | null;
    status: Driver['status'];
    shift: string;
  }) => void;
  updateDriver: (driverId: string, updates: Partial<Driver>) => void;
  toggleDriverAvailability: (driverId: string) => void;

  reorderRouteStops: (routeId: string, fromIndex: number, toIndex: number) => void;
  toggleRouteStatus: (routeId: string) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // Reset Demo
  resetAllDemoData: () => void;

  // Snapshot for AI
  getFleetSnapshot: () => FleetSnapshot;
}

const TransitContext = createContext<TransitContextValue | null>(null);

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (parsed.buses && parsed.buses.length > 0 && parsed.routes && parsed.stops) {
        return {
          buses: parsed.buses,
          drivers: parsed.drivers || INITIAL_DRIVERS,
          routes: parsed.routes,
          stops: parsed.stops,
          trips: parsed.trips || INITIAL_TRIPS,
          alerts: parsed.alerts || INITIAL_ALERTS,
          notifications: parsed.notifications || INITIAL_NOTIFICATIONS,
          schedules: parsed.schedules || INITIAL_SCHEDULES,
          student: parsed.student || INITIAL_STUDENT,
          simConfig: parsed.simConfig || {
            running: true,
            speedMultiplier: 1,
            tickCount: 0,
          },
        };
      }
    }
  } catch (e) {
    console.warn('Could not load saved transit state:', e);
  }
  return {
    buses: INITIAL_BUSES,
    drivers: INITIAL_DRIVERS,
    routes: INITIAL_ROUTES,
    stops: INITIAL_STOPS,
    trips: INITIAL_TRIPS,
    alerts: INITIAL_ALERTS,
    notifications: INITIAL_NOTIFICATIONS,
    schedules: INITIAL_SCHEDULES,
    student: INITIAL_STUDENT,
    simConfig: {
      running: true,
      speedMultiplier: 1,
      tickCount: 0,
    },
  };
}

function interpolateAlongRoute(
  progress: number,
  direction: 1 | -1,
  route: Route,
  allStops: Stop[]
) {
  const stopObjs = route.stops
    .map((id) => allStops.find((s) => s.id === id))
    .filter((s): s is Stop => Boolean(s));

  if (stopObjs.length < 2) {
    const first = stopObjs[0] || allStops[0];
    return {
      x: first.x,
      y: first.y,
      latitude: first.latitude,
      longitude: first.longitude,
      heading: 65,
      currentStop: first.name,
      nextStop: first.name,
      nextStopId: first.id,
      distanceToNextKm: 1.5,
      crossedWaypoint: false,
    };
  }

  const totalSegments = stopObjs.length - 1;
  const clamped = Math.max(0, Math.min(0.9999, progress));
  const scaled = clamped * totalSegments;
  const segIndex = Math.floor(scaled);
  const segFraction = scaled - segIndex;

  const fromIdx = direction === 1 ? segIndex : totalSegments - segIndex;
  const toIdx =
    direction === 1
      ? Math.min(totalSegments, segIndex + 1)
      : Math.max(0, totalSegments - segIndex - 1);

  const fromStop = stopObjs[fromIdx];
  const toStop = stopObjs[toIdx];

  const x = fromStop.x + (toStop.x - fromStop.x) * segFraction;
  const y = fromStop.y + (toStop.y - fromStop.y) * segFraction;
  const latitude = fromStop.latitude + (toStop.latitude - fromStop.latitude) * segFraction;
  const longitude = fromStop.longitude + (toStop.longitude - fromStop.longitude) * segFraction;

  const dx = toStop.x - fromStop.x;
  const dy = toStop.y - fromStop.y;
  let angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90);
  if (angleDeg < 0) angleDeg += 360;

  const segDistKm = Math.max(1.8, route.distanceKm / totalSegments);
  const distanceToNextKm = Number(Math.max(0.2, segDistKm * (1 - segFraction)).toFixed(1));
  const crossedWaypoint = segFraction < 0.04;

  return {
    x,
    y,
    latitude,
    longitude,
    heading: angleDeg,
    currentStop: fromStop.name,
    nextStop: toStop.name,
    nextStopId: toStop.id,
    distanceToNextKm,
    crossedWaypoint,
  };
}

export const TransitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PersistedState>(loadInitialState);
  const [activeTab, setActiveTab] = useState<PortalTab>('student');
  const [selectedMapBusId, setSelectedMapBusId] = useState<string | null>('bus-24');
  const [selectedMapStopId, setSelectedMapStopId] = useState<string | null>(null);
  const [selectedMapRouteId, setSelectedMapRouteId] = useState<string | null>(null);
  const [activeDriverId, setActiveDriverId] = useState<string>('drv-104');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to persist state:', e);
    }
  }, [state]);

  // Global keyboard shortcut Cmd/Ctrl+K for global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live Simulation Loop
  useEffect(() => {
    if (!state.simConfig.running) return;

    const intervalMs = 900;
    const timer = setInterval(() => {
      setState((prev) => {
        const mult = prev.simConfig.speedMultiplier;
        const stepDelta = 0.0065 * mult;

        const updatedBuses = prev.buses.map((bus) => {
          if (
            bus.tripStatus !== 'ACTIVE' ||
            bus.status === 'PAUSED' ||
            bus.status === 'OFFLINE' ||
            bus.status === 'EMERGENCY'
          ) {
            return bus;
          }

          const route =
            prev.routes.find((r) => r.id === bus.routeId) || prev.routes[0];

          let nextProgress = bus.routeProgress + stepDelta;
          let nextDirection = bus.direction;

          if (nextProgress >= 1) {
            if (route.id === 'route-c') {
              nextProgress = nextProgress - 1;
            } else {
              nextProgress = 0.02;
              nextDirection = (bus.direction === 1 ? -1 : 1) as 1 | -1;
            }
          }

          const interp = interpolateAlongRoute(
            nextProgress,
            nextDirection,
            route,
            prev.stops
          );

          // Subtle realistic speed fluctuation around baseSpeed
          const jitter = Math.sin(prev.simConfig.tickCount * 0.4 + bus.number.charCodeAt(4)) * 2;
          const liveSpeed = Math.max(
            16,
            Math.round((bus.status === 'DELAYED' ? bus.baseSpeed * 0.78 : bus.baseSpeed) + jitter)
          );

          const liveEta = Math.max(
            1,
            Math.round((interp.distanceToNextKm / Math.max(liveSpeed, 20)) * 60)
          );

          // Realistic passenger boarding/alighting when reaching a stop
          let nextOccupancy = bus.occupancy;
          if (interp.crossedWaypoint && prev.simConfig.tickCount % 3 === 0) {
            const delta = nextDirection === 1 ? 1 : -1;
            nextOccupancy = Math.max(0, Math.min(bus.capacity, bus.occupancy + delta));
          }

          return {
            ...bus,
            x: interp.x,
            y: interp.y,
            latitude: interp.latitude,
            longitude: interp.longitude,
            heading: interp.heading,
            speed: liveSpeed,
            currentStop: interp.currentStop,
            nextStop: interp.nextStop,
            nextStopId: interp.nextStopId,
            distanceToNextKm: interp.distanceToNextKm,
            eta: liveEta,
            occupancy: nextOccupancy,
            routeProgress: nextProgress,
            direction: nextDirection,
            lastUpdated: 'Just now',
          };
        });

        return {
          ...prev,
          buses: updatedBuses,
          simConfig: {
            ...prev.simConfig,
            tickCount: prev.simConfig.tickCount + 1,
          },
        };
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [state.simConfig.running, state.simConfig.speedMultiplier]);

  const trackBusOnMap = useCallback((busId: string) => {
    setSelectedMapBusId(busId);
    setSelectedMapStopId(null);
    setActiveTab('map');
  }, []);

  const focusStopOnMap = useCallback((stopId: string) => {
    setSelectedMapStopId(stopId);
    setActiveTab('map');
  }, []);

  const focusRouteOnMap = useCallback((routeId: string) => {
    setSelectedMapRouteId(routeId);
    setActiveTab('map');
  }, []);

  const selectStudentStop = useCallback((stopId: string) => {
    setState((prev) => ({
      ...prev,
      student: {
        ...prev.student,
        selectedStopId: stopId,
      },
    }));
    setSelectedMapStopId(stopId);
  }, []);

  const startSimulation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      simConfig: { ...prev.simConfig, running: true },
    }));
  }, []);

  const pauseSimulation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      simConfig: { ...prev.simConfig, running: false },
    }));
  }, []);

  const resetSimulationPositions = useCallback(() => {
    setState((prev) => ({
      ...prev,
      buses: INITIAL_BUSES,
      simConfig: { ...prev.simConfig, tickCount: 0, running: true },
    }));
  }, []);

  const setSimulationSpeed = useCallback((speed: 1 | 2 | 5 | 10) => {
    setState((prev) => ({
      ...prev,
      simConfig: { ...prev.simConfig, speedMultiplier: speed },
    }));
  }, []);

  const startTrip = useCallback((busId: string) => {
    setState((prev) => {
      const targetBus = prev.buses.find((b) => b.id === busId);
      if (!targetBus) return prev;

      const updatedBuses = prev.buses.map((b) =>
        b.id === busId
          ? {
              ...b,
              status: 'ON TIME' as BusStatus,
              tripStatus: 'ACTIVE' as const,
              speed: b.baseSpeed || 32,
              lastUpdated: 'Just now',
            }
          : b
      );

      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        category: 'Route',
        title: `${targetBus.number} started active telemetry broadcast`,
        description: `Trip started from ${targetBus.currentStop} heading toward ${targetBus.nextStop}.`,
        timestamp: 'Just now',
        severity: 'success',
        read: false,
        busId: targetBus.id,
        routeId: targetBus.routeId,
      };

      return {
        ...prev,
        buses: updatedBuses,
        simConfig: { ...prev.simConfig, running: true },
        notifications: [newNotif, ...prev.notifications],
      };
    });
  }, []);

  const pauseTrip = useCallback((busId: string) => {
    setState((prev) => {
      const targetBus = prev.buses.find((b) => b.id === busId);
      if (!targetBus) return prev;

      const updatedBuses = prev.buses.map((b) =>
        b.id === busId
          ? {
              ...b,
              status: 'PAUSED' as BusStatus,
              tripStatus: 'PAUSED' as const,
              speed: 0,
              lastUpdated: 'Just now',
            }
          : b
      );

      return {
        ...prev,
        buses: updatedBuses,
      };
    });
  }, []);

  const endTrip = useCallback((busId: string) => {
    setState((prev) => {
      const targetBus = prev.buses.find((b) => b.id === busId);
      if (!targetBus) return prev;

      const updatedBuses = prev.buses.map((b) =>
        b.id === busId
          ? {
              ...b,
              status: 'OFFLINE' as BusStatus,
              tripStatus: 'COMPLETED' as const,
              speed: 0,
              lastUpdated: 'Just now',
            }
          : b
      );

      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        category: 'System',
        title: `${targetBus.number} completed scheduled corridor trip`,
        description: `Telemetry ended at ${targetBus.currentStop}. Unit logged off duty.`,
        timestamp: 'Just now',
        severity: 'info',
        read: false,
        busId: targetBus.id,
      };

      return {
        ...prev,
        buses: updatedBuses,
        notifications: [newNotif, ...prev.notifications],
      };
    });
  }, []);

  const adjustOccupancy = useCallback((busId: string, delta: number) => {
    setState((prev) => ({
      ...prev,
      buses: prev.buses.map((b) => {
        if (b.id !== busId) return b;
        const clamped = Math.max(0, Math.min(b.capacity, b.occupancy + delta));
        return {
          ...b,
          occupancy: clamped,
          lastUpdated: 'Just now',
        };
      }),
    }));
  }, []);

  const triggerEmergencySOS = useCallback(
    (busId: string, incidentType: Alert['type'], details: string) => {
      setState((prev) => {
        const bus = prev.buses.find((b) => b.id === busId) || prev.buses[0];
        const driver = prev.drivers.find((d) => d.id === bus.driverId);
        const nowStr = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const newAlert: Alert = {
          id: `sos-${Date.now()}`,
          type: incidentType,
          severity: 'CRITICAL',
          busId: bus.id,
          busNumber: bus.number,
          driverName: driver?.name || 'Rajesh Kumar',
          driverEmployeeId: driver?.employeeId || 'EMP-104',
          message:
            details.trim() ||
            `Driver ${driver?.name || 'Rajesh Kumar'} activated emergency SOS beacon near ${bus.currentStop}.`,
          timestamp: nowStr,
          coordinates: {
            latitude: Number(bus.latitude.toFixed(4)),
            longitude: Number(bus.longitude.toFixed(4)),
            locationName: bus.currentStop,
          },
          resolved: false,
        };

        const emergencyNotif: NotificationItem = {
          id: `notif-sos-${Date.now()}`,
          category: 'Emergency',
          title: `SOS ALERT: ${bus.number} at ${bus.currentStop}`,
          description: `${newAlert.message} Coordinates: ${newAlert.coordinates.latitude}° N, ${newAlert.coordinates.longitude}° E. Dispatch notified.`,
          timestamp: 'Just now',
          severity: 'critical',
          read: false,
          busId: bus.id,
          routeId: bus.routeId,
        };

        return {
          ...prev,
          buses: prev.buses.map((b) =>
            b.id === bus.id
              ? {
                  ...b,
                  status: 'EMERGENCY',
                  speed: 0,
                  lastUpdated: 'Just now',
                }
              : b
          ),
          alerts: [newAlert, ...prev.alerts],
          notifications: [emergencyNotif, ...prev.notifications],
        };
      });
    },
    []
  );

  const resolveAlert = useCallback((alertId: string) => {
    setState((prev) => {
      const targetAlert = prev.alerts.find((a) => a.id === alertId);
      const nowStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const resolvedNotif: NotificationItem | null = targetAlert
        ? {
            id: `notif-res-${Date.now()}`,
            category: 'System',
            title: `Emergency Resolved: ${targetAlert.busNumber}`,
            description: `Admin Command Center acknowledged and cleared the alert near ${targetAlert.coordinates.locationName}. Normal service resumed.`,
            timestamp: 'Just now',
            severity: 'success',
            read: false,
            busId: targetAlert.busId,
          }
        : null;

      return {
        ...prev,
        alerts: prev.alerts.map((a) =>
          a.id === alertId
            ? {
                ...a,
                resolved: true,
                acknowledgedBy: 'Transit Dispatch Admin',
                resolvedAt: nowStr,
              }
            : a
        ),
        buses: prev.buses.map((b) =>
          targetAlert && b.id === targetAlert.busId
            ? {
                ...b,
                status: 'ON TIME',
                tripStatus: 'ACTIVE',
                speed: b.baseSpeed || 32,
                lastUpdated: 'Just now',
              }
            : b
        ),
        notifications: resolvedNotif
          ? [resolvedNotif, ...prev.notifications]
          : prev.notifications,
      };
    });
  }, []);

  const addBus = useCallback(
    (busInput: {
      number: string;
      registrationNumber: string;
      capacity: number;
      routeId: string;
      driverId: string;
      status: BusStatus;
    }) => {
      setState((prev) => {
        const route =
          prev.routes.find((r) => r.id === busInput.routeId) || prev.routes[0];
        const firstStop =
          prev.stops.find((s) => s.id === route.stops[0]) || prev.stops[0];
        const secondStop =
          prev.stops.find((s) => s.id === route.stops[1]) || prev.stops[1];

        const newBusId = `bus-${Date.now()}`;
        const normalizedNumber = busInput.number.toUpperCase().startsWith('BUS')
          ? busInput.number.toUpperCase()
          : `BUS ${busInput.number.toUpperCase()}`;

        const newBus: Bus = {
          id: newBusId,
          number: normalizedNumber,
          registrationNumber: busInput.registrationNumber.toUpperCase(),
          routeId: route.id,
          driverId: busInput.driverId,
          latitude: firstStop.latitude,
          longitude: firstStop.longitude,
          x: firstStop.x,
          y: firstStop.y,
          heading: 65,
          speed: busInput.status === 'ON TIME' || busInput.status === 'DELAYED' ? 30 : 0,
          baseSpeed: 32,
          capacity: busInput.capacity,
          occupancy: Math.round(busInput.capacity * 0.4),
          status: busInput.status,
          tripStatus:
            busInput.status === 'ON TIME' || busInput.status === 'DELAYED'
              ? 'ACTIVE'
              : 'PAUSED',
          currentStop: firstStop.name,
          nextStop: secondStop.name,
          nextStopId: secondStop.id,
          eta: 7,
          distanceToNextKm: 3.2,
          routeProgress: 0.15,
          direction: 1,
          lastUpdated: 'Just now',
        };

        const updatedDrivers = prev.drivers.map((d) =>
          d.id === busInput.driverId
            ? { ...d, assignedBusId: newBusId, status: 'ON DUTY' as const }
            : d
        );

        return {
          ...prev,
          buses: [newBus, ...prev.buses],
          drivers: updatedDrivers,
        };
      });
    },
    []
  );

  const updateBus = useCallback((busId: string, updates: Partial<Bus>) => {
    setState((prev) => ({
      ...prev,
      buses: prev.buses.map((b) =>
        b.id === busId ? { ...b, ...updates, lastUpdated: 'Just now' } : b
      ),
    }));
  }, []);

  const toggleBusStatus = useCallback((busId: string) => {
    setState((prev) => ({
      ...prev,
      buses: prev.buses.map((b) => {
        if (b.id !== busId) return b;
        const isCurrentlyActive = b.status === 'ON TIME' || b.status === 'DELAYED';
        const nextStatus: BusStatus = isCurrentlyActive ? 'PAUSED' : 'ON TIME';
        return {
          ...b,
          status: nextStatus,
          tripStatus: isCurrentlyActive ? 'PAUSED' : 'ACTIVE',
          speed: isCurrentlyActive ? 0 : b.baseSpeed || 32,
          lastUpdated: 'Just now',
        };
      }),
    }));
  }, []);

  const deleteBus = useCallback((busId: string) => {
    setState((prev) => ({
      ...prev,
      buses: prev.buses.filter((b) => b.id !== busId),
      drivers: prev.drivers.map((d) =>
        d.assignedBusId === busId ? { ...d, assignedBusId: null, status: 'AVAILABLE' } : d
      ),
    }));
  }, []);

  const addDriver = useCallback(
    (driverInput: {
      name: string;
      employeeId: string;
      phone: string;
      assignedBusId: string | null;
      status: Driver['status'];
      shift: string;
    }) => {
      setState((prev) => {
        const newDriverId = `drv-${Date.now()}`;
        const newDriver: Driver = {
          id: newDriverId,
          name: driverInput.name,
          employeeId: driverInput.employeeId.toUpperCase(),
          phone: driverInput.phone,
          assignedBusId: driverInput.assignedBusId,
          status: driverInput.status,
          shift: driverInput.shift,
          experienceYears: 5,
        };

        const updatedBuses = driverInput.assignedBusId
          ? prev.buses.map((b) =>
              b.id === driverInput.assignedBusId ? { ...b, driverId: newDriverId } : b
            )
          : prev.buses;

        return {
          ...prev,
          drivers: [newDriver, ...prev.drivers],
          buses: updatedBuses,
        };
      });
    },
    []
  );

  const updateDriver = useCallback((driverId: string, updates: Partial<Driver>) => {
    setState((prev) => {
      const updatedDrivers = prev.drivers.map((d) =>
        d.id === driverId ? { ...d, ...updates } : d
      );
      let updatedBuses = prev.buses;
      if (updates.assignedBusId !== undefined && updates.assignedBusId !== null) {
        updatedBuses = prev.buses.map((b) =>
          b.id === updates.assignedBusId ? { ...b, driverId } : b
        );
      }
      return {
        ...prev,
        drivers: updatedDrivers,
        buses: updatedBuses,
      };
    });
  }, []);

  const toggleDriverAvailability = useCallback((driverId: string) => {
    setState((prev) => ({
      ...prev,
      drivers: prev.drivers.map((d) => {
        if (d.id !== driverId) return d;
        const cycle: Driver['status'][] = ['ON DUTY', 'AVAILABLE', 'BREAK', 'OFF DUTY'];
        const nextIdx = (cycle.indexOf(d.status) + 1) % cycle.length;
        return { ...d, status: cycle[nextIdx] };
      }),
    }));
  }, []);

  const reorderRouteStops = useCallback(
    (routeId: string, fromIndex: number, toIndex: number) => {
      setState((prev) => ({
        ...prev,
        routes: prev.routes.map((r) => {
          if (r.id !== routeId) return r;
          const nextStops = [...r.stops];
          if (
            fromIndex < 0 ||
            fromIndex >= nextStops.length ||
            toIndex < 0 ||
            toIndex >= nextStops.length
          ) {
            return r;
          }
          const [moved] = nextStops.splice(fromIndex, 1);
          nextStops.splice(toIndex, 0, moved);
          return {
            ...r,
            stops: nextStops,
          };
        }),
      }));
    },
    []
  );

  const toggleRouteStatus = useCallback((routeId: string) => {
    setState((prev) => ({
      ...prev,
      routes: prev.routes.map((r) => {
        if (r.id !== routeId) return r;
        const nextStatus: Route['operatingStatus'] =
          r.operatingStatus === 'ACTIVE'
            ? 'LIMITED'
            : r.operatingStatus === 'LIMITED'
            ? 'SUSPENDED'
            : 'ACTIVE';
        return { ...r, operatingStatus: nextStatus };
      }),
    }));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const resetAllDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      buses: INITIAL_BUSES,
      drivers: INITIAL_DRIVERS,
      routes: INITIAL_ROUTES,
      stops: INITIAL_STOPS,
      trips: INITIAL_TRIPS,
      alerts: INITIAL_ALERTS,
      notifications: INITIAL_NOTIFICATIONS,
      schedules: INITIAL_SCHEDULES,
      student: INITIAL_STUDENT,
      simConfig: {
        running: true,
        speedMultiplier: 1,
        tickCount: 0,
      },
    });
    setSelectedMapBusId('bus-24');
    setSelectedMapStopId(null);
  }, []);

  const getFleetSnapshot = useCallback((): FleetSnapshot => {
    return {
      buses: state.buses,
      drivers: state.drivers,
      routes: state.routes,
      stops: state.stops,
      trips: state.trips,
      alerts: state.alerts,
      schedules: state.schedules,
    };
  }, [
    state.buses,
    state.drivers,
    state.routes,
    state.stops,
    state.trips,
    state.alerts,
    state.schedules,
  ]);

  const contextValue = useMemo<TransitContextValue>(
    () => ({
      ...state,
      activeTab,
      setActiveTab,
      selectedMapBusId,
      setSelectedMapBusId,
      selectedMapStopId,
      setSelectedMapStopId,
      selectedMapRouteId,
      setSelectedMapRouteId,
      activeDriverId,
      setActiveDriverId,
      isSearchOpen,
      setIsSearchOpen,
      trackBusOnMap,
      focusStopOnMap,
      focusRouteOnMap,
      selectStudentStop,
      startSimulation,
      pauseSimulation,
      resetSimulationPositions,
      setSimulationSpeed,
      startTrip,
      pauseTrip,
      endTrip,
      adjustOccupancy,
      triggerEmergencySOS,
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
      markNotificationRead,
      markAllNotificationsRead,
      resetAllDemoData,
      getFleetSnapshot,
    }),
    [
      state,
      activeTab,
      selectedMapBusId,
      selectedMapStopId,
      selectedMapRouteId,
      activeDriverId,
      isSearchOpen,
      trackBusOnMap,
      focusStopOnMap,
      focusRouteOnMap,
      selectStudentStop,
      startSimulation,
      pauseSimulation,
      resetSimulationPositions,
      setSimulationSpeed,
      startTrip,
      pauseTrip,
      endTrip,
      adjustOccupancy,
      triggerEmergencySOS,
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
      markNotificationRead,
      markAllNotificationsRead,
      resetAllDemoData,
      getFleetSnapshot,
    ]
  );

  return (
    <TransitContext.Provider value={contextValue}>
      {children}
    </TransitContext.Provider>
  );
};

export function useTransit() {
  const ctx = useContext(TransitContext);
  if (!ctx) {
    throw new Error('useTransit must be used inside a TransitProvider');
  }
  return ctx;
}
