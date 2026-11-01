import React from "react";
import { Outlet } from "react-router-dom";
import { TopNav } from "../components/layout/TopNav";
import { Database, ShieldAlert, Cpu } from "lucide-react";

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#050A08] text-[#E8EDE9] flex flex-col font-sans selection:bg-emerald-500/30 selection:text-[#E8EDE9]">
      {/* Persistent Top Navigation Bar matching reference */}
      <TopNav />

      {/* Main Workspace Area with stadium ambient background */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Professional Scouting Platform Minimal Footer */}
      <footer className="w-full border-t border-[#1D3025] bg-[#050A08] py-3.5 px-4 lg:px-8 mt-auto text-[11px] font-mono text-[#87958B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#E8EDE9] tracking-wider uppercase">12TH MAN</span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Cpu className="h-3.5 w-3.5" />
              Recruitment Intelligence System v0.2.0
            </span>
            <span>•</span>
            <span className="hidden md:inline">StatsBomb 1. Bundesliga 2023/24</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-[10px]">
              <Database className="h-3 w-3 text-emerald-400" />
              PostgreSQL 18 • Scikit-Learn Vector Models
            </span>
            <span className="flex items-center gap-1 text-[10px] text-amber-400/80">
              <ShieldAlert className="h-3 w-3" />
              Live Tactical Ingestion Active
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
