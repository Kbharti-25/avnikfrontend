import React from 'react';
import { 
  ChevronRight, 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  Network,
  Download
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  currentInvestigationId?: string;
  onOpenSearch: () => void;
  onOpenAlerts: () => void;
  alertCount?: number;
  onDownloadReport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentInvestigationId = 'INV-2026-084',
  onOpenSearch,
  onOpenAlerts,
  alertCount = 3,
  onDownloadReport,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className={`h-14 px-5 flex items-center justify-between border-b transition-colors duration-200 select-none z-20 ${
        theme === 'dark'
          ? 'bg-[#07130F] border-[#132B22]'
          : 'bg-white border-slate-200/90 shadow-2xs'
      }`}
    >
      {/* Left: Brand Logo + Breadcrumbs */}
      <div className="flex items-center gap-4">
        {/* Brand Icon & Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0A7347] flex items-center justify-center text-white shadow-xs">
            <Network className="w-4 h-4 stroke-[2.4]" />
          </div>
          <div className="flex items-baseline">
            <span
              className={`text-base font-bold tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              anvik
            </span>
            <span className="text-[#10B981] font-bold text-lg leading-none ml-0.5">•</span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-5 bg-slate-300 dark:bg-[#1A382E] mx-1" />

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium hover:text-slate-200 cursor-pointer transition-colors">
            Workspace
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-slate-400 font-medium hover:text-slate-200 cursor-pointer transition-colors">
            Investigations
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          <span
            className={`font-mono font-semibold text-xs ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}
          >
            {currentInvestigationId}
          </span>
        </div>
      </div>

      {/* Right: Demo Workspace Pill, Search, Alerts, Theme toggle, Avatar */}
      <div className="flex items-center gap-3">
        {/* Demo Workspace Pill */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            theme === 'dark'
              ? 'bg-[#0B2019] border-[#173D30] text-[#34D399]'
              : 'bg-[#EAF7EE] border-emerald-200 text-[#0B6938]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span>Demo workspace</span>
        </div>

        {/* Download Report Button */}
        {onDownloadReport && (
          <button
            onClick={onDownloadReport}
            title="Download Forensic Investigation Report (HTML + PDF with Graph Analysis)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0D6B42] hover:bg-[#0A5634] text-white transition-all shadow-xs btn-press"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download Report</span>
          </button>
        )}

        {/* Search Icon */}
        <button
          onClick={onOpenSearch}
          title="Search entities (Ctrl+K)"
          className={`p-1.5 rounded-lg transition-colors btn-press ${
            theme === 'dark'
              ? 'text-slate-400 hover:text-white hover:bg-[#142821]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications / Alerts */}
        <button
          onClick={onOpenAlerts}
          title="Explainable alerts"
          className={`relative p-1.5 rounded-lg transition-colors btn-press ${
            theme === 'dark'
              ? 'text-slate-400 hover:text-white hover:bg-[#142821]'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          className={`p-1.5 rounded-lg transition-colors btn-press ${
            theme === 'dark'
              ? 'text-amber-400 hover:text-amber-300 hover:bg-[#142821]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Avatar BK */}
        <div
          title="Analyst: Bharath K"
          className="w-8 h-8 rounded-full bg-[#0D6B42] text-white flex items-center justify-center font-bold text-xs ring-1 ring-emerald-500/40 select-none shadow-xs"
        >
          BK
        </div>
      </div>
    </header>
  );
};
