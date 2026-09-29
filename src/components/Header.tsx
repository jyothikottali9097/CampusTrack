import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  RotateCcw,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { useTransit } from '../simulation/useTransitStore';
import { PortalTab } from '../types/transit';

const NAV_ITEMS: { id: PortalTab; label: string }[] = [
  { id: 'student', label: 'Student Portal' },
  { id: 'map', label: 'Live Map' },
  { id: 'driver', label: 'Driver Portal' },
  { id: 'admin', label: 'Admin Portal' },
  { id: 'ai', label: 'CampusTrack AI' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'notifications', label: 'Notifications' },
];

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    notifications,
    alerts,
    setIsSearchOpen,
    resetAllDemoData,
    student,
  } = useTransit();

  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const activeEmergencyCount = alerts.filter((a) => !a.resolved).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#1A365D] text-white border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Title */}
        <button
          type="button"
          onClick={() => setActiveTab('student')}
          className="text-xl font-bold tracking-tight font-display text-white hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-400"
        >
          CampusTrack
        </button>

        {/* Zone 2: Primary Desktop Navigation Links */}
        <nav
          aria-label="Primary Transit Portals"
          className="flex items-center gap-1 lg:gap-5 overflow-x-auto no-scrollbar py-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const isNotifications = item.id === 'notifications';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative px-2.5 py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  isActive
                    ? 'text-white border-b-2 border-[#06B6D4]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {isNotifications && unreadCount > 0 && (
                  <span className="ml-1.5 font-mono text-xs font-semibold text-[#06B6D4] tabular-nums">
                    ({unreadCount})
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions (Global Search + Profile Menu) */}
        <div className="flex items-center gap-3 shrink-0">
          {activeEmergencyCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#DC2626] text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap animate-pulse"
              title="View Active Emergency Alert"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="tabular-nums">{activeEmergencyCount} SOS Active</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Open Global Search"
            className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs text-slate-200 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <Search className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline">Search buses, stops, routes</span>
            <kbd className="hidden md:inline-block font-mono text-[11px] text-slate-300 pl-2 border-l border-white/15">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            aria-label={`Notifications (${unreadCount} unread)`}
            title="Notification Center"
            className="relative p-2 text-slate-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#06B6D4] text-[#0F172A] font-mono text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((p) => !p)}
              aria-expanded={profileOpen}
              aria-haspopup="true"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors whitespace-nowrap focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" aria-hidden="true" />
              <span className="hidden xl:inline">{student.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white text-slate-900 rounded-xl shadow-lg border border-slate-200 py-3 px-4 z-50">
                <div className="pb-3 border-b border-slate-100">
                  <p className="text-xs text-slate-500">University Live Transit Network</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {student.name} · {student.studentId}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Department of {student.department} · Assigned {student.assignedBusNumber}
                  </p>
                </div>

                <div className="py-2.5 border-b border-slate-100 space-y-1">
                  <p className="text-[11px] font-medium text-slate-400 px-2">
                    Switch Active Workspace Role
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('student');
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs font-medium rounded-md hover:bg-slate-100 text-slate-700 flex items-center justify-between"
                  >
                    <span>Student View (Aarav Sharma)</span>
                    <span className="font-mono text-[11px] text-slate-400">22CSE104</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('driver');
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs font-medium rounded-md hover:bg-slate-100 text-slate-700 flex items-center justify-between"
                  >
                    <span>Driver View (Rajesh Kumar)</span>
                    <span className="font-mono text-[11px] text-slate-400">EMP-104</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('admin');
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs font-medium rounded-md hover:bg-slate-100 text-slate-700 flex items-center justify-between"
                  >
                    <span>Transit Command Admin</span>
                    <span className="font-mono text-[11px] text-slate-400">12 Units</span>
                  </button>
                </div>

                <div className="pt-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      resetAllDemoData();
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Demo Data to Default</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
