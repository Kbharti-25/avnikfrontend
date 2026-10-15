import React from 'react';
import { 
  Network, 
  FileText, 
  Clock, 
  History
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type LeftNavDrawer = 'complaints' | 'timeline' | 'summary' | null;

interface SidebarProps {
  activeDrawer: LeftNavDrawer;
  onToggleDrawer: (drawer: 'complaints' | 'timeline' | 'summary') => void;
  complaintCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeDrawer,
  onToggleDrawer,
  complaintCount = 4,
}) => {
  const { theme } = useTheme();

  return (
    <aside
      className={`w-36 shrink-0 flex flex-col items-start px-3 py-4 space-y-4 select-none z-10 ${
        theme === 'dark'
          ? 'bg-[#060E0B] text-slate-300'
          : 'bg-[#F4F7F5] text-slate-700'
      }`}
    >
      {/* 1. Main Network Graph Active Button */}
      <button
        onClick={() => onToggleDrawer(activeDrawer ? (null as any) : 'complaints')}
        title="Interactive Network Graph"
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all btn-press ${
          theme === 'dark'
            ? 'bg-[#0D241C] border border-[#10B981] text-[#10B981] shadow-xs'
            : 'bg-emerald-50 border border-emerald-600 text-emerald-700 shadow-xs'
        }`}
      >
        <Network className="w-5 h-5 stroke-[2.2]" />
      </button>

      {/* 2. Complaints Button */}
      <button
        onClick={() => onToggleDrawer('complaints')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all btn-press ${
          activeDrawer === 'complaints'
            ? theme === 'dark'
              ? 'bg-[#0D241C] border-[#10B981] text-emerald-300 font-bold shadow-xs'
              : 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold shadow-xs'
            : theme === 'dark'
            ? 'bg-[#0A1612] border-[#142B22] text-slate-300 hover:border-[#1E3B33] hover:text-white'
            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900 shadow-2xs'
        }`}
      >
        <span className="truncate">Complaints</span>
      </button>

      {/* 3. Timeline Button */}
      <button
        onClick={() => onToggleDrawer('timeline')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all btn-press ${
          activeDrawer === 'timeline'
            ? theme === 'dark'
              ? 'bg-[#0D241C] border-[#10B981] text-emerald-300 font-bold shadow-xs'
              : 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold shadow-xs'
            : theme === 'dark'
            ? 'bg-[#0A1612] border-[#142B22] text-slate-300 hover:border-[#1E3B33] hover:text-white'
            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900 shadow-2xs'
        }`}
      >
        <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span className="truncate">Timeline</span>
      </button>

      {/* 4. Past Record Button */}
      <button
        onClick={() => onToggleDrawer('summary')}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all btn-press ${
          activeDrawer === 'summary'
            ? theme === 'dark'
              ? 'bg-[#0D241C] border-[#10B981] text-emerald-300 font-bold shadow-xs'
              : 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold shadow-xs'
            : theme === 'dark'
            ? 'bg-[#0A1612] border-[#142B22] text-slate-300 hover:border-[#1E3B33] hover:text-white'
            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900 shadow-2xs'
        }`}
      >
        <History className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        <span className="truncate">Past Record</span>
      </button>
    </aside>
  );
};
