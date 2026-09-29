import { FleetSnapshot, ToolExecutionLog } from '../types/transit';

function normalizeBusNumber(raw: string): string {
  const cleaned = raw.trim().toUpperCase();
  if (cleaned.startsWith('BUS')) {
    const num = cleaned.replace('BUS', '').trim().padStart(2, '0');
    return `BUS ${num}`;
  }
  return `BUS ${cleaned.padStart(2, '0')}`;
}

export function executeTransitTool(
  toolName: string,
  args: Record<string, unknown>,
  snapshot: FleetSnapshot
): { data: unknown; summary: string } {
  switch (toolName) {
    case 'getBusLocation': {
      const busNumberArg = String(args.busNumber || 'BUS 24');
      const normalized = normalizeBusNumber(busNumberArg);
      const bus = snapshot.buses.find(
        (b) => b.number.toUpperCase() === normalized || b.id.toLowerCase() === busNumberArg.toLowerCase()
      );
      if (!bus) {
        return {
          data: { error: `Bus ${busNumberArg} not found in active fleet.` },
          summary: `Queried location for ${busNumberArg} (not found)`,
        };
      }
      const route = snapshot.routes.find((r) => r.id === bus.routeId);
      const driver = snapshot.drivers.find((d) => d.id === bus.driverId);
      return {
        data: {
          busNumber: bus.number,
          currentLocation: bus.currentStop,
          nextStop: bus.nextStop,
          latitude: Number(bus.latitude.toFixed(4)),
          longitude: Number(bus.longitude.toFixed(4)),
          speedKmh: bus.speed,
          headingDeg: bus.heading,
          status: bus.status,
          route: route?.name || bus.routeId,
          driver: driver?.name || 'Assigned Driver',
          etaToNextStopMin: bus.eta,
          distanceToNextStopKm: bus.distanceToNextKm,
        },
        summary: `getBusLocation(${bus.number}) → ${bus.currentStop} toward ${bus.nextStop} at ${bus.speed} km/h`,
      };
    }

    case 'getETA': {
      const busNumberArg = String(args.busNumber || 'BUS 24');
      const stopQuery = String(args.stop || '').trim();
      const normalized = normalizeBusNumber(busNumberArg);
      const bus = snapshot.buses.find(
        (b) => b.number.toUpperCase() === normalized || b.id.toLowerCase() === busNumberArg.toLowerCase()
      );
      if (!bus) {
        return {
          data: { error: `Bus ${busNumberArg} not found.` },
          summary: `getETA(${busNumberArg}, ${stopQuery}) → Bus not found`,
        };
      }
      const stop = snapshot.stops.find(
        (s) =>
          s.name.toLowerCase().includes(stopQuery.toLowerCase()) ||
          s.code.toLowerCase() === stopQuery.toLowerCase() ||
          s.id.toLowerCase() === stopQuery.toLowerCase()
      );
      const targetStopName = stop ? stop.name : stopQuery || bus.nextStop;
      let calculatedEta = bus.eta;
      let distanceKm = bus.distanceToNextKm;

      if (stop && stop.name.toLowerCase() !== bus.nextStop.toLowerCase()) {
        const currentStopObj = snapshot.stops.find((s) => s.name === bus.currentStop);
        const currentKm = currentStopObj ? currentStopObj.corridorKm : 4.8;
        distanceKm = Number(Math.max(0.8, Math.abs(stop.corridorKm - currentKm)).toFixed(1));
        const effectiveSpeed = Math.max(bus.speed, 24);
        calculatedEta = Math.max(1, Math.round((distanceKm / effectiveSpeed) * 60));
      }

      return {
        data: {
          busNumber: bus.number,
          currentStop: bus.currentStop,
          targetStop: targetStopName,
          etaMinutes: calculatedEta,
          distanceKm,
          speedKmh: bus.speed,
          status: bus.status,
        },
        summary: `getETA(${bus.number}, "${targetStopName}") → ${calculatedEta} min (${distanceKm} km)`,
      };
    }

    case 'getBusOccupancy': {
      const busNumberArg = String(args.busNumber || 'BUS 24');
      const normalized = normalizeBusNumber(busNumberArg);
      const bus = snapshot.buses.find(
        (b) => b.number.toUpperCase() === normalized || b.id.toLowerCase() === busNumberArg.toLowerCase()
      );
      if (!bus) {
        return {
          data: { error: `Bus ${busNumberArg} not found.` },
          summary: `getBusOccupancy(${busNumberArg}) → Not found`,
        };
      }
      const seatsAvailable = Math.max(0, bus.capacity - bus.occupancy);
      const percentage = Math.round((bus.occupancy / bus.capacity) * 100);
      const crowdState =
        percentage >= 90 ? 'Full' : percentage >= 70 ? 'Nearly Full' : 'Seats Available';

      return {
        data: {
          busNumber: bus.number,
          occupancy: bus.occupancy,
          capacity: bus.capacity,
          seatsAvailable,
          occupancyPercentage: `${percentage}%`,
          crowdState,
        },
        summary: `getBusOccupancy(${bus.number}) → ${bus.occupancy}/${bus.capacity} (${seatsAvailable} seats free, ${percentage}%)`,
      };
    }

    case 'getTripStatus': {
      const busNumberArg = String(args.busNumber || 'BUS 24');
      const normalized = normalizeBusNumber(busNumberArg);
      const bus = snapshot.buses.find(
        (b) => b.number.toUpperCase() === normalized || b.id.toLowerCase() === busNumberArg.toLowerCase()
      );
      if (!bus) {
        return {
          data: { error: `Bus ${busNumberArg} not found.` },
          summary: `getTripStatus(${busNumberArg}) → Not found`,
        };
      }
      const driver = snapshot.drivers.find((d) => d.id === bus.driverId);
      const route = snapshot.routes.find((r) => r.id === bus.routeId);
      return {
        data: {
          busNumber: bus.number,
          tripStatus: bus.tripStatus,
          operationalStatus: bus.status,
          route: route?.name || bus.routeId,
          driverName: driver?.name || 'Unassigned',
          driverEmployeeId: driver?.employeeId || 'N/A',
          speedKmh: bus.speed,
          currentStop: bus.currentStop,
          nextStop: bus.nextStop,
          etaMinutes: bus.eta,
        },
        summary: `getTripStatus(${bus.number}) → ${bus.tripStatus} (${bus.status})`,
      };
    }

    case 'getRoute': {
      const routeQuery = String(args.routeId || 'Route A').trim().toLowerCase();
      const busMatch = snapshot.buses.find(
        (b) => b.number.toLowerCase() === routeQuery || b.number.toLowerCase() === normalizeBusNumber(routeQuery).toLowerCase()
      );
      const route =
        (busMatch && snapshot.routes.find((r) => r.id === busMatch.routeId)) ||
        snapshot.routes.find(
          (r) =>
            r.id.toLowerCase() === routeQuery ||
            r.code.toLowerCase() === routeQuery ||
            r.name.toLowerCase().includes(routeQuery)
        ) ||
        snapshot.routes[0];

      const stopNames = route.stops.map(
        (stopId) => snapshot.stops.find((s) => s.id === stopId)?.name || stopId
      );
      const activeBusesOnRoute = snapshot.buses
        .filter((b) => b.routeId === route.id)
        .map((b) => ({ number: b.number, status: b.status, currentStop: b.currentStop }));

      return {
        data: {
          routeId: route.id,
          code: route.code,
          name: route.name,
          distance: route.distance,
          duration: route.duration,
          frequency: route.frequency,
          operatingStatus: route.operatingStatus,
          stops: stopNames,
          assignedBuses: activeBusesOnRoute,
        },
        summary: `getRoute("${route.code}") → ${route.name} (${stopNames.length} stops, ${route.distance})`,
      };
    }

    case 'getBusStops': {
      const routeQuery = String(args.routeId || 'Route A').trim().toLowerCase();
      const route =
        snapshot.routes.find(
          (r) =>
            r.id.toLowerCase() === routeQuery ||
            r.code.toLowerCase() === routeQuery ||
            r.name.toLowerCase().includes(routeQuery)
        ) || snapshot.routes[0];

      const stopsDetailed = route.stops.map((stopId, idx) => {
        const st = snapshot.stops.find((s) => s.id === stopId);
        return {
          sequence: idx + 1,
          name: st?.name || stopId,
          code: st?.code || '',
          landmark: st?.landmark || '',
          corridorKm: st?.corridorKm ?? 0,
        };
      });

      return {
        data: {
          route: `${route.code} (${route.name})`,
          stops: stopsDetailed,
        },
        summary: `getBusStops("${route.code}") → ${stopsDetailed.length} corridor waypoints`,
      };
    }

    case 'getAlerts': {
      const activeAlerts = snapshot.alerts.filter((a) => !a.resolved);
      const delayedBuses = snapshot.buses.filter(
        (b) => b.status === 'DELAYED' || b.status === 'EMERGENCY'
      );

      return {
        data: {
          activeEmergencyAlertsCount: activeAlerts.length,
          activeAlerts: activeAlerts.map((a) => ({
            id: a.id,
            type: a.type,
            severity: a.severity,
            busNumber: a.busNumber,
            driverName: a.driverName,
            message: a.message,
            location: a.coordinates.locationName,
            timestamp: a.timestamp,
          })),
          delayedOrEmergencyBuses: delayedBuses.map((b) => ({
            busNumber: b.number,
            status: b.status,
            currentStop: b.currentStop,
            nextStop: b.nextStop,
            etaMinutes: b.eta,
            occupancy: `${b.occupancy}/${b.capacity}`,
          })),
        },
        summary: `getAlerts() → ${activeAlerts.length} active SOS alerts, ${delayedBuses.length} delayed/alert buses`,
      };
    }

    case 'getSchedule': {
      const routeQuery = String(args.routeId || '').trim().toLowerCase();
      const filtered = routeQuery
        ? snapshot.schedules.filter(
            (s) =>
              s.routeId.toLowerCase().includes(routeQuery) ||
              s.routeCode.toLowerCase().includes(routeQuery) ||
              s.routeName.toLowerCase().includes(routeQuery) ||
              s.busNumber.toLowerCase().includes(routeQuery)
          )
        : snapshot.schedules;

      return {
        data: {
          totalEntries: filtered.length,
          schedules: filtered.map((s) => ({
            busNumber: s.busNumber,
            route: `${s.routeCode}: ${s.routeName}`,
            departure: s.departure,
            arrival: s.arrival,
            frequency: s.frequency,
            operatingDays: s.operatingDays,
            status: s.status,
          })),
        },
        summary: `getSchedule(${routeQuery || 'all'}) → ${filtered.length} timetable entries`,
      };
    }

    default:
      return {
        data: { error: `Unknown tool ${toolName}` },
        summary: `${toolName} called`,
      };
  }
}

export function generateDeterministicTransitResponse(
  query: string,
  snapshot: FleetSnapshot
): { reply: string; toolsUsed: ToolExecutionLog[] } {
  const q = query.toLowerCase();
  const toolsUsed: ToolExecutionLog[] = [];

  // Extract any mentioned bus number (e.g. BUS 24, bus 18, 24)
  const busRegex = /bus\s*(\d{1,2})/i;
  const busMatch = query.match(busRegex);
  const targetBusNumber = busMatch ? `BUS ${busMatch[1].padStart(2, '0')}` : 'BUS 24';

  // Check for emergency / alerts / delayed buses
  if (q.includes('emergency') || q.includes('alert') || q.includes('sos') || q.includes('delayed')) {
    const alertRes = executeTransitTool('getAlerts', {}, snapshot);
    toolsUsed.push({
      toolName: 'getAlerts',
      args: {},
      resultSummary: alertRes.summary,
    });

    const activeAlerts = snapshot.alerts.filter((a) => !a.resolved);
    const delayed = snapshot.buses.filter((b) => b.status === 'DELAYED');
    const emergencyBuses = snapshot.buses.filter((b) => b.status === 'EMERGENCY');

    let reply = '';
    if (activeAlerts.length > 0 || emergencyBuses.length > 0) {
      reply += `**Active Emergency Alert Detected:**\n`;
      activeAlerts.forEach((a) => {
        reply += `- **${a.busNumber}** (${a.driverName}): ${a.message} near **${a.coordinates.locationName}** at ${a.timestamp}.\n`;
      });
      reply += `\n`;
    } else {
      reply += `There are currently **0 active SOS emergency alerts** across the university transit network.\n\n`;
    }

    if (delayed.length > 0) {
      reply += `**Currently Delayed Buses (${delayed.length}):**\n`;
      delayed.forEach((b) => {
        const route = snapshot.routes.find((r) => r.id === b.routeId);
        reply += `- **${b.number}** on ${route?.code || 'Corridor'} (${route?.name || ''}): At **${b.currentStop}** heading toward **${b.nextStop}** · Speed: ${b.speed} km/h · ETA: **${b.eta} mins** · Occupancy: ${b.occupancy}/${b.capacity}.\n`;
      });
    } else {
      reply += `All active corridor buses are currently running **ON TIME**.`;
    }

    return { reply, toolsUsed };
  }

  // Check for schedule questions
  if (q.includes('schedule') || q.includes('timetable') || q.includes('departure')) {
    const schRes = executeTransitTool('getSchedule', {}, snapshot);
    toolsUsed.push({
      toolName: 'getSchedule',
      args: { routeId: 'all' },
      resultSummary: schRes.summary,
    });

    const lines = snapshot.schedules.slice(0, 6).map(
      (s) =>
        `- **${s.busNumber}** (${s.routeCode}: ${s.routeName}) · Departs **${s.departure}** → Arrives **${s.arrival}** · ${s.frequency} · Status: **${s.status}**`
    );

    return {
      reply: `Here is today's active university corridor schedule:\n\n${lines.join('\n')}\n\nAll morning peak shuttles operate on 10–15 minute headways between Vizianagaram Railway Station, RTC Complex, Nellimarla, and College Campus.`,
      toolsUsed,
    };
  }

  // Check for seats / occupancy / capacity
  if (q.includes('seat') || q.includes('occupancy') || q.includes('full') || q.includes('capacity') || q.includes('crowd')) {
    const occRes = executeTransitTool('getBusOccupancy', { busNumber: targetBusNumber }, snapshot);
    toolsUsed.push({
      toolName: 'getBusOccupancy',
      args: { busNumber: targetBusNumber },
      resultSummary: occRes.summary,
    });

    const bus = snapshot.buses.find((b) => b.number === targetBusNumber) || snapshot.buses[0];
    const free = Math.max(0, bus.capacity - bus.occupancy);
    const pct = Math.round((bus.occupancy / bus.capacity) * 100);
    const stateLabel = pct >= 90 ? 'Full' : pct >= 70 ? 'Nearly Full' : 'Seats Available';

    return {
      reply: `**${bus.number}** currently has **${free} seats available**.\n\n- **Occupancy:** ${bus.occupancy} / ${bus.capacity} passengers (${pct}%)\n- **Load Status:** ${stateLabel}\n- **Current Position:** ${bus.currentStop} → ${bus.nextStop} (ETA ${bus.eta} mins)`,
      toolsUsed,
    };
  }

  // Check for route / stops
  if (q.includes('route') || q.includes('stops') || q.includes('waypoints')) {
    const routeArg = busMatch ? targetBusNumber : 'Route A';
    const routeRes = executeTransitTool('getRoute', { routeId: routeArg }, snapshot);
    const stopsRes = executeTransitTool('getBusStops', { routeId: routeArg }, snapshot);
    toolsUsed.push(
      { toolName: 'getRoute', args: { routeId: routeArg }, resultSummary: routeRes.summary },
      { toolName: 'getBusStops', args: { routeId: routeArg }, resultSummary: stopsRes.summary }
    );

    const bus = snapshot.buses.find((b) => b.number === targetBusNumber) || snapshot.buses[0];
    const route = snapshot.routes.find((r) => r.id === bus.routeId) || snapshot.routes[0];
    const stopList = route.stops
      .map((id, idx) => `${idx + 1}. ${snapshot.stops.find((s) => s.id === id)?.name || id}`)
      .join('\n');

    return {
      reply: `**${bus.number}** operates on **${route.code}: ${route.name}**.\n\n- **Corridor Distance:** ${route.distance} (${route.duration})\n- **Frequency:** ${route.frequency}\n- **Operating Status:** ${route.operatingStatus}\n\n**Stop Sequence:**\n${stopList}`,
      toolsUsed,
    };
  }

  // Check for ETA / "when will" / "reach"
  if (q.includes('when') || q.includes('eta') || q.includes('reach') || q.includes('arrive')) {
    const matchedStop = snapshot.stops.find((s) => q.includes(s.name.toLowerCase()));
    const stopName = matchedStop ? matchedStop.name : 'Nellimarla';
    const etaRes = executeTransitTool(
      'getETA',
      { busNumber: targetBusNumber, stop: stopName },
      snapshot
    );
    toolsUsed.push({
      toolName: 'getETA',
      args: { busNumber: targetBusNumber, stop: stopName },
      resultSummary: etaRes.summary,
    });

    const data = etaRes.data as {
      busNumber: string;
      currentStop: string;
      targetStop: string;
      etaMinutes: number;
      distanceKm: number;
      speedKmh: number;
      status: string;
    };

    return {
      reply: `**${data.busNumber}** is estimated to reach **${data.targetStop}** in **${data.etaMinutes} minutes**.\n\n- **Current Position:** ${data.currentStop}\n- **Distance Remaining:** ${data.distanceKm} km\n- **Current Speed:** ${data.speedKmh} km/h\n- **Trip Status:** ${data.status}`,
      toolsUsed,
    };
  }

  // Default: Location + ETA + Occupancy summary for the bus
  const locRes = executeTransitTool('getBusLocation', { busNumber: targetBusNumber }, snapshot);
  const occRes = executeTransitTool('getBusOccupancy', { busNumber: targetBusNumber }, snapshot);
  toolsUsed.push(
    { toolName: 'getBusLocation', args: { busNumber: targetBusNumber }, resultSummary: locRes.summary },
    { toolName: 'getBusOccupancy', args: { busNumber: targetBusNumber }, resultSummary: occRes.summary }
  );

  const bus = snapshot.buses.find((b) => b.number === targetBusNumber) || snapshot.buses[0];
  const route = snapshot.routes.find((r) => r.id === bus.routeId);
  const driver = snapshot.drivers.find((d) => d.id === bus.driverId);
  const freeSeats = Math.max(0, bus.capacity - bus.occupancy);

  return {
    reply: `**${bus.number}** is currently at **${bus.currentStop}**, heading toward **${bus.nextStop}** on **${route?.name || 'Route A'}**.\n\n- **ETA to ${bus.nextStop}:** ${bus.eta} minutes (${bus.distanceToNextKm} km away)\n- **Telemetry:** ${bus.speed} km/h · Heading ${bus.heading}° · Coordinates (${bus.latitude.toFixed(4)}° N, ${bus.longitude.toFixed(4)}° E)\n- **Occupancy:** ${bus.occupancy}/${bus.capacity} (${freeSeats} seats available)\n- **Driver:** ${driver?.name || 'Rajesh Kumar'} (${driver?.employeeId || 'EMP-104'})\n- **Status:** ${bus.status}`,
    toolsUsed,
  };
}
