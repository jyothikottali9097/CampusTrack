import React, { useState, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  Clock,
  Navigation,
  CheckCheck,
  Info,
} from 'lucide-react';
import { useTransit } from '../simulation/useTransitStore';
import { NotificationCategory } from '../types/transit';

const CATEGORIES: Array<'All' | NotificationCategory> = [
  'All',
  'Arrival',
  'Delay',
  'Route',
  'Emergency',
  'System',
];

export const NotificationsPortal: React.FC = () => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    trackBusOnMap,
  } = useTransit();

  const [selectedCategory, setSelectedCategory] = useState<'All' | NotificationCategory>('All');

  const filteredNotifications = useMemo(() => {
    if (selectedCategory === 'All') return notifications;
    return notifications.filter((n) => n.category === selectedCategory);
  }, [notifications, selectedCategory]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getCategoryIcon = (cat: NotificationCategory) => {
    switch (cat) {
      case 'Emergency':
        return <AlertTriangle className="w-5 h-5 text-[#DC2626]" />;
      case 'Delay':
        return <Clock className="w-5 h-5 text-[#F59E0B]" />;
      case 'Arrival':
      case 'Route':
        return <Navigation className="w-5 h-5 text-[#2563EB]" />;
      default:
        return <Info className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Corridor Dispatch Advisories</span>
            <span>·</span>
            <span className="tabular-nums">{unreadCount} Unread Alerts</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 font-display mt-0.5">
            Notification Center
          </h1>
        </div>

        <button
          type="button"
          onClick={markAllNotificationsRead}
          disabled={unreadCount === 0}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
        >
          <CheckCheck className="w-4 h-4 text-[#16A34A]" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Category Filter Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          const count =
            cat === 'All'
              ? notifications.length
              : notifications.filter((n) => n.category === cat).length;

          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#1A365D] text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{cat}</span>
              <span className="ml-1.5 font-mono text-[11px] opacity-75 tabular-nums">
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-14 text-center">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              No notifications in "{selectedCategory}"
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Live arrival, delay, and SOS dispatches will appear here automatically.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isEmergency = item.category === 'Emergency';
            return (
              <div
                key={item.id}
                className={`rounded-xl border p-5 transition-colors flex flex-wrap items-start justify-between gap-4 ${
                  isEmergency
                    ? 'bg-red-50/90 border-2 border-[#DC2626]'
                    : item.read
                    ? 'bg-white border-slate-200 opacity-80'
                    : 'bg-white border-l-4 border-l-[#2563EB] border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5 max-w-3xl">
                  <div className="mt-0.5 shrink-0">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <strong
                        className={
                          isEmergency ? 'text-[#DC2626]' : 'text-slate-800'
                        }
                      >
                        {item.category}
                      </strong>
                      <span>·</span>
                      <span className="font-mono">{item.timestamp}</span>
                      <span>·</span>
                      <span className="uppercase font-mono text-[11px]">
                        Severity: {item.severity}
                      </span>
                      {!item.read && (
                        <>
                          <span>·</span>
                          <span className="text-[#2563EB] font-semibold">
                            Unread
                          </span>
                        </>
                      )}
                    </div>

                    <h2 className="text-base font-bold text-slate-900 mt-1">
                      {item.title}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-center shrink-0">
                  {item.busId && (
                    <button
                      type="button"
                      onClick={() => trackBusOnMap(item.busId!)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#2563EB] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Track Unit
                    </button>
                  )}

                  {!item.read && (
                    <button
                      type="button"
                      onClick={() => markNotificationRead(item.id)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
