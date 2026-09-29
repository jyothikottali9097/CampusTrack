/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TransitProvider, useTransit } from './simulation/useTransitStore';
import { Header } from './components/Header';
import { SimulatorControls } from './components/SimulatorControls';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { LiveMap } from './components/LiveMap';
import { StudentPortal } from './pages/StudentPortal';
import { DriverPortal } from './pages/DriverPortal';
import { AdminPortal } from './pages/AdminPortal';
import { AIChatPortal, FloatingAIChat } from './pages/AIChatPortal';
import { SchedulePortal } from './pages/SchedulePortal';
import { NotificationsPortal } from './pages/NotificationsPortal';

const CampusTrackWorkspace: React.FC = () => {
  const { activeTab, setActiveTab, resetAllDemoData } = useTransit();

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-slate-900">
      <Header />
      <SimulatorControls />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 py-8">
        {activeTab === 'student' && <StudentPortal />}
        {activeTab === 'map' && <LiveMap />}
        {activeTab === 'driver' && <DriverPortal />}
        {activeTab === 'admin' && <AdminPortal />}
        {activeTab === 'ai' && <AIChatPortal />}
        {activeTab === 'schedule' && <SchedulePortal />}
        {activeTab === 'notifications' && <NotificationsPortal />}
      </main>

      <GlobalSearchModal />
      <FloatingAIChat />

      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-[1440px] mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <strong className="text-slate-800 font-display">CampusTrack</strong> · University Live Transit Network · Vizianagaram Corridor Operations
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveTab('student')}
              className="hover:text-slate-900 transition-colors"
            >
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className="hover:text-slate-900 transition-colors"
            >
              Live Map
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('driver')}
              className="hover:text-slate-900 transition-colors"
            >
              Driver Console
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="hover:text-slate-900 transition-colors"
            >
              Admin Command
            </button>
            <button
              type="button"
              onClick={resetAllDemoData}
              className="text-[#2563EB] hover:underline font-medium"
            >
              Reset Demo State
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <TransitProvider>
      <CampusTrackWorkspace />
    </TransitProvider>
  );
}

