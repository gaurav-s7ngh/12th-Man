import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Shield,
  Trophy,
  Target,
  Search,
  FlaskConical,
  BookmarkCheck,
  Scale,
  GitBranch,
  Bell,
} from "lucide-react";
import { api } from "../../services/api";
import { ClubSelector } from "./ClubSelector";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { to: "/", label: "OVERVIEW", icon: LayoutDashboard },
  { to: "/squad", label: "SQUAD", icon: Shield },
  { to: "/tactics", label: "TACTICS", icon: Trophy },
  { to: "/recruitment", label: "RECRUITMENT", icon: Target },
  { to: "/scouting", label: "SCOUTING", icon: Search },
  { to: "/analytics-lab", label: "ANALYTICS LAB", icon: FlaskConical },
  { to: "/shortlists", label: "SHORTLIST", icon: BookmarkCheck },
  { to: "/compare", label: "COMPARE", icon: Scale },
  { to: "/scenarios", label: "SCENARIOS", icon: GitBranch },
];

export const TopNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [quickSearch, setQuickSearch] = useState("");

  const { data: club } = useQuery({
    queryKey: ["club"],
    queryFn: api.getClub,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickSearch.trim()) {
      navigate(`/scouting?search=${encodeURIComponent(quickSearch.trim())}`);
      setQuickSearch("");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1D3025] bg-[#050A08]/95 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 lg:px-8">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-6">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-500/10 text-emerald-400 transition-transform group-hover:scale-105">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="absolute h-4 w-4 rounded-full border border-emerald-400/50" />
            </div>
            <span className="text-base font-black tracking-wider text-[#E8EDE9] uppercase">
              12TH MAN
            </span>
          </NavLink>

          {/* Quick Search */}
          <form onSubmit={handleSearchSubmit} className="relative hidden xl:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#87958B]" />
            <input
              type="text"
              placeholder="Quick search player..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              className="h-8 w-48 rounded bg-[#080F0B] border border-[#1D3025] pl-8 pr-2.5 text-xs text-[#E8EDE9] placeholder-[#87958B]/60 focus:border-emerald-500/60 focus:outline-none transition-colors"
            />
          </form>
        </div>

        {/* Center: Main Navigation Tabs matching Video */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`relative px-3 py-2 text-xs font-mono font-bold tracking-wider transition-all whitespace-nowrap ${
                  isActive
                    ? "text-emerald-400"
                    : "text-[#87958B] hover:text-[#E8EDE9]"
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Right: Club Selector & User Profile Badge */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <ClubSelector />

          <div className="h-6 w-px bg-[#1D3025] hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="text-right hidden xl:block">
              <div className="font-semibold text-[#E8EDE9] text-xs leading-tight">
                {club?.manager_name || "Head Coach"}
              </div>
              <div className="text-[10px] text-emerald-400 leading-tight">
                Head Coach
              </div>
            </div>

            {/* Notification Bell with Amber Alert */}
            <div className="relative flex h-8 w-8 items-center justify-center rounded bg-[#080F0B] border border-[#1D3025] text-[#87958B] hover:text-[#E8EDE9] transition-colors cursor-pointer">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Nav Overflow Bar */}
      <div className="flex md:hidden h-10 items-center px-4 overflow-x-auto scrollbar-none border-t border-[#1D3025]/60 bg-[#080F0B]">
        <nav className="flex items-center gap-2">
          {navItems.map((item) => {
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider whitespace-nowrap rounded ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-[#87958B] hover:text-[#E8EDE9]"
                }`}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
