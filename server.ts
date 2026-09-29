import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { FunctionDeclaration, GoogleGenAI, Type } from '@google/genai';
import {
  executeTransitTool,
  generateDeterministicTransitResponse,
} from './src/ai/transitTools.ts';
import { FleetSnapshot, ToolExecutionLog } from './src/types/transit.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transitFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: 'getETA',
    description: 'Get the dynamic Estimated Time of Arrival (ETA) in minutes and distance in km for a bus to reach a specific stop.',
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
    description: 'Get the live GPS coordinates, current stop, next stop, speed, heading, and driver for a specific bus.',
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
    description: 'Get route details including stop sequence, distance, duration, frequency, and assigned buses.',
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
    description: 'Get the current passenger occupancy, total seat capacity, available seats, and crowding percentage of a bus.',
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
    description: 'Get the current trip status (ACTIVE, PAUSED, COMPLETED, SCHEDULED) and operational status (ON TIME, DELAYED, EMERGENCY) for a bus.',
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
    description: 'Get all active SOS/Emergency alerts and a list of any currently delayed or emergency buses across the transit network.',
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
    description: 'Get the bus timetable and schedule entries, optionally filtered by route or bus number.',
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/ai/chat', async (req, res) => {
    const { message, snapshot } = req.body as {
      message: string;
      snapshot: FleetSnapshot;
    };

    if (!message || !snapshot) {
      res.status(400).json({ error: 'Missing message or live fleet snapshot' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      const fallback = generateDeterministicTransitResponse(message, snapshot);
      res.json({
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

        res.json({
          reply: finalReply,
          toolsUsed,
          source: 'gemini-3.8-flash',
        });
        return;
      }

      const textReply = response1.text;
      if (textReply) {
        res.json({
          reply: textReply,
          toolsUsed,
          source: 'gemini-3.8-flash',
        });
        return;
      }

      const fallback = generateDeterministicTransitResponse(message, snapshot);
      res.json({
        reply: fallback.reply,
        toolsUsed: fallback.toolsUsed,
        source: 'deterministic-live-engine',
      });
    } catch (error) {
      console.error('Gemini API error, using live deterministic fallback:', error);
      const fallback = generateDeterministicTransitResponse(message, snapshot);
      res.json({
        reply: fallback.reply,
        toolsUsed: fallback.toolsUsed,
        source: 'deterministic-live-engine',
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusTrack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
