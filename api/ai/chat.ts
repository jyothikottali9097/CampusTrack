import { FunctionDeclaration, GoogleGenAI, Type } from '@google/genai';
import {
  executeTransitTool,
  generateDeterministicTransitResponse,
} from '../../src/ai/transitTools';
import { FleetSnapshot, ToolExecutionLog } from '../../src/types/transit';

const transitFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: 'getETA',
    description:
      'Get the dynamic Estimated Time of Arrival (ETA) in minutes and distance in km for a bus to reach a specific stop.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        busNumber: {
          type: Type.STRING,
          description: 'The bus number, e.g. "BUS 24" or "BUS 18"',
        },
        stop: {
          type: Type.STRING,
          description: 'The stop name, e.g. "Nellimarla", "RTC Complex", "College Campus"',
        },
      },
      required: ['busNumber', 'stop'],
    },
  },
  {
    name: 'getBusLocation',
    description:
      'Get the live GPS coordinates, current stop, next stop, speed, heading, and driver for a specific bus.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        busNumber: {
          type: Type.STRING,
          description: 'The bus number, e.g. "BUS 24"',
        },
      },
      required: ['busNumber'],
    },
  },
  {
    name: 'getRoute',
    description:
      'Get route details including stop sequence, distance, duration, frequency, and assigned buses.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        routeId: {
          type: Type.STRING,
          description: 'The route ID, route code, or bus number, e.g. "Route A", "route-a", or "BUS 24"',
        },
      },
      required: ['routeId'],
    },
  },
  {
    name: 'getBusStops',
    description: 'Get the ordered list of bus stops and landmarks for a route.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        routeId: {
          type: Type.STRING,
          description: 'The route ID or code, e.g. "Route A"',
        },
      },
      required: ['routeId'],
    },
  },
  {
    name: 'getBusOccupancy',
    description:
      'Get the current passenger occupancy, total seat capacity, available seats, and crowding percentage of a bus.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        busNumber: {
          type: Type.STRING,
          description: 'The bus number, e.g. "BUS 24"',
        },
      },
      required: ['busNumber'],
    },
  },
  {
    name: 'getTripStatus',
    description:
      'Get the current trip status (ACTIVE, PAUSED, COMPLETED, SCHEDULED) and operational status (ON TIME, DELAYED, EMERGENCY) for a bus.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        busNumber: {
          type: Type.STRING,
          description: 'The bus number, e.g. "BUS 24"',
        },
      },
      required: ['busNumber'],
    },
  },
  {
    name: 'getAlerts',
    description:
      'Get all active SOS/Emergency alerts and a list of any currently delayed or emergency buses across the transit network.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        filter: {
          type: Type.STRING,
          description: 'Optional filter such as "all", "emergency", or "delayed"',
        },
      },
    },
  },
  {
    name: 'getSchedule',
    description:
      'Get the bus timetable and schedule entries, optionally filtered by route or bus number.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        routeId: {
          type: Type.STRING,
          description: 'Optional route code or bus number to filter schedules, e.g. "Route A" or "BUS 24"',
        },
      },
    },
  },
];

// Vercel Serverless Function Handler
export default async function handler(
  req: { method?: string; body?: { message?: string; snapshot?: FleetSnapshot } },
  res: {
    status: (code: number) => { json: (data: unknown) => void };
    json: (data: unknown) => void;
  }
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { message, snapshot } = req.body || {};
  if (!message || !snapshot) {
    res.status(400).json({ error: 'Missing message or live fleet snapshot' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    const fallback = generateDeterministicTransitResponse(message, snapshot);
    res.status(200).json({
      reply: fallback.reply,
      toolsUsed: fallback.toolsUsed,
      source: 'deterministic-live-engine',
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are CampusTrack AI, the real-time university transit intelligence assistant for CampusTrack — University Live Transit Network (Vizianagaram → College Campus Corridor).
Always call the provided tools (getETA, getBusLocation, getRoute, getBusStops, getBusOccupancy, getTripStatus, getAlerts, getSchedule) to retrieve live telemetry before answering questions about buses, stops, occupancy, delays, emergencies, or schedules.
Never fabricate telemetry numbers. Format answers clearly with concise bullet points and exact numbers from the tools.`;

    const response1 = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: message,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: transitFunctionDeclarations }],
      },
    });

    const toolsUsed: ToolExecutionLog[] = [];
    const functionCalls = response1.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
      const toolParts: Array<{
        functionResponse: { name: string; response: Record<string, unknown> };
      }> = [];

      for (const call of functionCalls) {
        const fnName = call.name || 'getBusLocation';
        const fnArgs = (call.args as Record<string, unknown>) || {};
        const executed = executeTransitTool(fnName, fnArgs, snapshot);
        toolsUsed.push({
          toolName: fnName,
          args: fnArgs,
          resultSummary: executed.summary,
        });
        toolParts.push({
          functionResponse: {
            name: fnName,
            response: { result: executed.data },
          },
        });
      }

      const previousContent = response1.candidates?.[0]?.content;
      const response2 = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: previousContent
          ? [previousContent, { role: 'user', parts: toolParts }]
          : message,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: transitFunctionDeclarations }],
        },
      });

      const finalReply =
        response2.text ||
        generateDeterministicTransitResponse(message, snapshot).reply;

      res.status(200).json({
        reply: finalReply,
        toolsUsed,
        source: 'gemini-3.8-flash',
      });
      return;
    }

    const textReply = response1.text;
    if (textReply) {
      res.status(200).json({
        reply: textReply,
        toolsUsed,
        source: 'gemini-3.8-flash',
      });
      return;
    }

    const fallback = generateDeterministicTransitResponse(message, snapshot);
    res.status(200).json({
      reply: fallback.reply,
      toolsUsed: fallback.toolsUsed,
      source: 'deterministic-live-engine',
    });
  } catch {
    const fallback = generateDeterministicTransitResponse(message, snapshot);
    res.status(200).json({
      reply: fallback.reply,
      toolsUsed: fallback.toolsUsed,
      source: 'deterministic-live-engine',
    });
  }
}
