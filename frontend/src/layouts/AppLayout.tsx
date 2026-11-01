import React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Shield,
  Calendar,
  Trophy,
  ClipboardList,
  BookmarkCheck,
  LayoutDashboard,
  Database,
  ExternalLink,
} from "lucide-react";
import { api } from "../services/api";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/players", label: "Player Discovery", icon: Users },
  { to: "/teams", label: "Teams", icon: Shield },
  { to: "/matches", label: "Matches", icon: Calendar },
  { to: "/competitions", label: "Competitions", icon: Trophy },
  { to: "/scouting", label: "Scouting Reports", icon: ClipboardList },
  { to: "/shortlists", label: "Shortlists", icon: BookmarkCheck },
];

export const AppLayout: React.FC = () => {
  const location = useLocation();

  // Check backend & DB status
  const { data: dbHealth } = useQuery({
    queryKey: ["dbHealth"],
    queryFn: api.getDbHealth,
    refetchInterval: 30000,
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070a12] text-zinc-100">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-zinc-800/80 bg-[#0b101d]">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/80 gap-3">
          <div className="w-8 h-8 rounded bg-emerald-950 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-emerald-400 text-sm tracking-tighter">
            12M
          </div>
          <div>
            <div className="text-sm font-bold tracking-wider uppercase font-mono text-zinc-100 flex items-center gap-1.5">
              12th Man
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">
                PRO
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 font-mono tracking-tight">
              Scouting & Intelligence
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Intelligence Core
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-emerald-400" : "text-zinc-500"
                  }`}
                />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Source provenance footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-[#090d18] text-[11px] text-zinc-500 space-y-2 font-mono">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-zinc-400 font-medium">STATS SOURCE</span>
            <span className="text-emerald-400">Open Data</span>
          </div>
          <div className="text-zinc-400 text-[11px] leading-tight">
            StatsBomb Open Data
          </div>
          <div className="text-[10px] text-zinc-600">
            UEFA Euro 2024 Edition
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 flex-shrink-0 border-b border-zinc-800/80 bg-[#0b101d]/90 backdrop-blur px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs uppercase font-mono tracking-wider text-zinc-400">
              Active Dataset:
            </span>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              UEFA Euro 2024 (51 Matches • 187k Events)
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Database status */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400">
              <Database className="w-3.5 h-3.5 text-zinc-500" />
              <span>PostgreSQL 18</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  dbHealth?.status === "connected" ? "bg-emerald-400" : "bg-amber-400"
                }`}
              ></span>
            </div>

            <a
              href="https://github.com/statsbomb/open-data"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-mono transition"
            >
              <span>StatsBomb Repo</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#070a12]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
