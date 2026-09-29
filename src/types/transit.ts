export type PortalTab =
  | 'student'
  | 'map'
  | 'driver'
  | 'admin'
  | 'ai'
  | 'schedule'
  | 'notifications';

export type BusStatus = 'ON TIME' | 'DELAYED' | 'PAUSED' | 'EMERGENCY' | 'OFFLINE';

export type TripStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'SCHEDULED';

export interface Stop {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  x: number; // SVG map coordinate X (0-1000)
  y: number; // SVG map coordinate Y (0-620)
  sequence: number;
  landmark: string;
  walkingMinutesFromGate: number;
  corridorKm: number; // distance from Vizianagaram start
}

export interface Route {
  id: string;
  code: string;
  name: string;
  shortName: string;
  color: string;
  stops: string[]; // Stop IDs in sequence
  waypoints: { x: number; y: number; lat: number; lng: number }[];
  distance: string;
  distanceKm: number;
  duration: string;
  durationMin: number;
  frequency: string;
  operatingStatus: 'ACTIVE' | 'LIMITED' | 'SUSPENDED';
}

export interface Bus {
  id: string;
  number: string;
  registrationNumber: string;
  routeId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  x: number;
  y: number;
  heading: number;
  speed: number; // km/h
  baseSpeed: number; // target cruise speed km/h
  capacity: number;
  occupancy: number;
  status: BusStatus;
  tripStatus: TripStatus;
  currentStop: string;
  nextStop: string;
  nextStopId: string;
  eta: number; // minutes
  distanceToNextKm: number;
  routeProgress: number; // 0 to 1 along route
  direction: 1 | -1; // 1 = toward campus, -1 = return
  lastUpdated: string;
}

export interface Driver {
  id: string;
  name: string;
  employeeId: string;
  phone: string;
  assignedBusId: string | null;
  status: 'ON DUTY' | 'AVAILABLE' | 'OFF DUTY' | 'BREAK';
  shift: string;
  experienceYears: number;
}

export interface Trip {
  id: string;
  busId: string;
  busNumber: string;
  routeId: string;
  routeName: string;
  driverId: string;
  driverName: string;
  status: TripStatus;
  startTime: string;
  endTime: string | null;
  passengersCarried: number;
}

export interface Alert {
  id: string;
  type: 'SOS_EMERGENCY' | 'MECHANICAL' | 'MEDICAL' | 'TRAFFIC_DELAY' | 'ROUTE_HAZARD';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  busId: string;
  busNumber: string;
  driverName: string;
  driverEmployeeId: string;
  message: string;
  timestamp: string;
  coordinates: {
    latitude: number;
    longitude: number;
    locationName: string;
  };
  resolved: boolean;
  acknowledgedBy?: string;
  resolvedAt?: string;
}

export type NotificationCategory = 'Arrival' | 'Delay' | 'Route' | 'Emergency' | 'System';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  read: boolean;
  busId?: string;
  routeId?: string;
}

export interface ScheduleEntry {
  id: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  busNumber: string;
  departure: string;
  arrival: string;
  frequency: string;
  stopSequence: string[];
  operatingDays: string;
  status: 'ON TIME' | 'BOARDING' | 'DELAYED' | 'SCHEDULED' | 'COMPLETED';
  shiftPeriod: 'Morning Peak' | 'Midday' | 'Evening Return' | 'Late Shuttle';
}

export interface StudentProfile {
  name: string;
  studentId: string;
  department: string;
  semester: string;
  assignedBusId: string;
  assignedBusNumber: string;
  selectedStopId: string;
  passStatus: 'ACTIVE' | 'EXPIRED';
}

export interface SimulationConfig {
  running: boolean;
  speedMultiplier: 1 | 2 | 5 | 10;
  tickCount: number;
}

export interface ToolExecutionLog {
  toolName: string;
  args: Record<string, unknown>;
  resultSummary: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolsUsed?: ToolExecutionLog[];
  source?: 'gemini-3.8-flash' | 'deterministic-live-engine';
}

export interface FleetSnapshot {
  buses: Bus[];
  drivers: Driver[];
  routes: Route[];
  stops: Stop[];
  trips: Trip[];
  alerts: Alert[];
  schedules: ScheduleEntry[];
}
