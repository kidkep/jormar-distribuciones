import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="app-bg flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
            <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-gold-300/20 blur-3xl animate-glow-pulse" />
            <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-gold-400/15 blur-3xl" />
          </div>

          <div key={location.pathname} className="relative z-10 mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
