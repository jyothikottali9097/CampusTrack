import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Terminal,
  RotateCcw,
  MessageSquare,
  X,
} from 'lucide-react';
import { useTransit } from '../simulation/useTransitStore';
import { generateDeterministicTransitResponse } from '../ai/transitTools';
import { ChatMessage } from '../types/transit';

const SUGGESTED_QUESTIONS = [
  'Where is BUS 24?',
  'When will BUS 24 reach Nellimarla?',
  'How many seats are available on BUS 24?',
  'Which buses are currently delayed?',
  'What is the route for BUS 24?',
  "Show me today's schedule.",
  'Are there any emergency alerts?',
];

const AVAILABLE_TOOLS_DOCS = [
  { name: 'getETA(busNumber, stop)', desc: 'Dynamic ETA & remaining distance in km' },
  { name: 'getBusLocation(busNumber)', desc: 'Live GPS coordinates, speed, heading, stop' },
  { name: 'getBusOccupancy(busNumber)', desc: 'Current passenger count & available seats' },
  { name: 'getTripStatus(busNumber)', desc: 'Operational & trip state (ACTIVE/PAUSED)' },
  { name: 'getRoute(routeId)', desc: 'Corridor distance, duration & assigned units' },
  { name: 'getBusStops(routeId)', desc: 'Ordered corridor waypoint sequence' },
  { name: 'getAlerts()', desc: 'Active SOS beacons & delayed buses' },
  { name: 'getSchedule(routeId)', desc: 'Timetable departures, arrivals & headways' },
];

export const AIChatPortal: React.FC = () => {
  const { getFleetSnapshot, buses } = useTransit();
  const bus24 = buses.find((b) => b.id === 'bus-24') || buses[0];

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello! I am **CampusTrack AI**, powered by **Gemini 3.8 Flash** with real-time access to the University Live Transit Network.\n\nI can query live GPS telemetry, calculate stop ETAs, inspect seat availability, or check corridor schedules. For example, **${bus24.number}** is currently at **${bus24.currentStop}** heading toward **${bus24.nextStop}** (${bus24.occupancy}/${bus24.capacity} seats occupied).\n\nHow can I assist your commute or fleet operations today?`,
      timestamp: 'Just now',
      source: 'gemini-3.8-flash',
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const snapshot = getFleetSnapshot();

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          snapshot,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        toolsUsed: data.toolsUsed || [],
        source: data.source || 'gemini-3.8-flash',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Seamless deterministic live fallback
      const fallback = generateDeterministicTransitResponse(trimmed, snapshot);
      const assistantMsg: ChatMessage = {
        id: `ai-fallback-${Date.now()}`,
        role: 'assistant',
        content: fallback.reply,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        toolsUsed: fallback.toolsUsed,
        source: 'deterministic-live-engine',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className={line.trim() === '' ? 'h-2' : 'leading-relaxed'}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={j} className="font-bold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left 8 Columns: Conversational Transit Intelligence Workspace */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 flex flex-col h-[680px] overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 bg-[#1A365D] text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-cyan-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gemini 3.8 Flash · Live Fleet Function Calling</span>
            </div>
            <h1 className="text-xl font-bold font-display mt-0.5">
              CampusTrack AI — Transit Intelligence Assistant
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setMessages((prev) => [prev[0]])}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>

        {/* Quick Prompt Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">
            Ask Live Telemetry:
          </span>
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => sendMessage(q)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-blue-50 text-slate-700 hover:text-[#2563EB] border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1 px-1">
                <span className="font-semibold text-slate-600">
                  {msg.role === 'user' ? 'You' : 'CampusTrack AI'}
                </span>
                <span>·</span>
                <span className="font-mono">{msg.timestamp}</span>
                {msg.source && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-[#2563EB]">
                      {msg.source === 'gemini-3.8-flash'
                        ? 'Gemini 3.8 Flash'
                        : 'Live Telemetry Engine'}
                    </span>
                  </>
                )}
              </div>

              {/* Tool Execution Log Box */}
              {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                <div className="mb-2 w-full max-w-2xl bg-slate-900 text-slate-200 rounded-lg px-3.5 py-2.5 text-xs font-mono space-y-1 border border-slate-700">
                  <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-semibold">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Live Telemetry Tools Executed:</span>
                  </div>
                  {msg.toolsUsed.map((t, idx) => (
                    <div key={idx} className="text-[11px] text-slate-300 truncate">
                      → {t.resultSummary}
                    </div>
                  ))}
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl px-5 py-3.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-800'
                }`}
              >
                {msg.role === 'user' ? (
                  <p>{msg.content}</p>
                ) : (
                  <div className="space-y-1">
                    {renderFormattedContent(msg.content)}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono px-2">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-ping" />
              <span>Querying live fleet telemetry &amp; computing corridor ETA...</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="p-4 border-t border-slate-200 bg-white flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any bus location, ETA to Nellimarla, seat availability, delayed units, or schedule..."
            className="flex-1 px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-2 focus:outline-[#2563EB]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex items-center gap-2 px-5 py-3 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Right 4 Columns: Live Function-Calling Schema & Fleet Snapshot */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#2563EB]">
            <Terminal className="w-4 h-4" />
            <span>Grounded Tool Declarations</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 font-display mt-1">
            Live Fleet Function Operations
          </h2>
          <p className="text-xs text-slate-600 mt-1">
            CampusTrack AI invokes these deterministic tools against the live simulator state before generating answers.
          </p>

          <div className="mt-4 space-y-2.5 divide-y divide-slate-100">
            {AVAILABLE_TOOLS_DOCS.map((fn) => (
              <div key={fn.name} className="pt-2.5 first:pt-0">
                <p className="font-mono text-xs font-semibold text-[#1A365D]">
                  {fn.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{fn.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Live Telemetry Quick Snapshot */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-900 font-display">
            Real-Time State Feed (Click to Query)
          </h3>
          <div className="mt-3 space-y-2">
            {buses.slice(0, 5).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => sendMessage(`Where is ${b.number} and how many seats are available?`)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-xs transition-colors text-left"
              >
                <div>
                  <span className="font-mono font-bold text-slate-900">
                    {b.number}
                  </span>
                  <span className="text-slate-400 mx-1.5">·</span>
                  <span className="text-slate-600">
                    {b.currentStop} → {b.nextStop}
                  </span>
                </div>
                <span className="font-mono text-[#2563EB] font-semibold tabular-nums">
                  {b.occupancy}/{b.capacity}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const FloatingAIChat: React.FC = () => {
  const { activeTab, setActiveTab, getFleetSnapshot } = useTransit();
  const [open, setOpen] = useState(false);
  const [quickInput, setQuickInput] = useState('');
  const [quickReply, setQuickReply] = useState<string | null>(null);

  if (activeTab === 'ai') return null;

  const handleQuickAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    const res = generateDeterministicTransitResponse(
      quickInput,
      getFleetSnapshot()
    );
    setQuickReply(res.reply.replace(/\*\*/g, ''));
  };

  return (
    <div className="fixed bottom-5 right-6 z-30">
      {open ? (
        <div className="w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
          <div className="bg-[#1A365D] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              <span className="text-xs font-bold font-display">
                CampusTrack AI Quick Assistant
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setActiveTab('ai');
                }}
                className="text-[11px] text-cyan-300 hover:underline"
              >
                Full Portal
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Floating Assistant"
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3 text-xs">
            <div className="flex flex-wrap gap-1.5">
              {['Where is BUS 24?', 'BUS 24 seats?', 'Delayed buses?'].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuickInput(q);
                    const res = generateDeterministicTransitResponse(
                      q,
                      getFleetSnapshot()
                    );
                    setQuickReply(res.reply.replace(/\*\*/g, ''));
                  }}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-[#2563EB] rounded-md font-medium transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {quickReply && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed max-h-44 overflow-y-auto">
                {quickReply}
              </div>
            )}

            <form onSubmit={handleQuickAsk} className="flex items-center gap-2">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder="Ask about BUS 24, stops, ETA..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-2 focus:outline-[#2563EB]"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-[#2563EB] text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                Ask
              </button>
            </form>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#1A365D] hover:bg-slate-800 text-white text-xs font-bold shadow-lg border border-white/15 transition-transform hover:scale-105 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-[#06B6D4]" />
          <span>CampusTrack AI</span>
        </button>
      )}
    </div>
  );
};
