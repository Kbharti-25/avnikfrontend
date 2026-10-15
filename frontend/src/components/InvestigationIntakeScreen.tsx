import React, { useState } from 'react';
import { Search, Sparkles, Network, ArrowRight } from 'lucide-react';

interface InvestigationIntakeScreenProps {
  onLoadGraph: (transactionId: string, deviceId: string, caseId: string) => void;
  isLoading?: boolean;
}

export const InvestigationIntakeScreen: React.FC<InvestigationIntakeScreenProps> = ({
  onLoadGraph,
  isLoading = false,
}) => {
  const [transactionId, setTransactionId] = useState('TXN-UPI-9001');
  const [deviceId, setDeviceId] = useState('ANDR_09F2');
  const [caseId, setCaseId] = useState('CMP-2026-0001');

  const handleLoad = () => {
    onLoadGraph(transactionId, deviceId, caseId);
  };

  const handleSelectPreset = (txn: string, dev: string, cId: string) => {
    setTransactionId(txn);
    setDeviceId(dev);
    setCaseId(cId);
  };

  return (
    <div className="w-full h-full bg-[#FBF9F4] text-slate-800 flex flex-col overflow-y-auto select-none p-6 md:p-8">
      {/* 1. Header Section */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-1">
            NETWORK ANALYSIS
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-slate-900 tracking-tight font-normal">
            Investigation Workspace
          </h1>
        </div>

        {/* Top-Right Case Badge */}
        <div className="px-3.5 py-1 rounded-full border border-slate-300/80 bg-white/70 shadow-2xs text-xs font-mono text-slate-600">
          Case #{caseId}
        </div>
      </div>

      {/* 2. Investigation Inputs Card */}
      <div className="rounded-2xl border border-[#E8E4D8] bg-[#FAF8F3] p-5 shadow-xs mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            INVESTIGATION INPUTS
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Case #{caseId}
          </span>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Transaction ID */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              TRANSACTION ID
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="e.g. TXN-UPI-9001"
              className="w-full bg-white border border-[#DDD8CA] rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0B5C4D] focus:ring-1 focus:ring-[#0B5C4D] transition-all shadow-2xs"
            />
          </div>

          {/* Device ID */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              DEVICE ID
            </label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g. ANDR_09F2"
              className="w-full bg-white border border-[#DDD8CA] rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0B5C4D] focus:ring-1 focus:ring-[#0B5C4D] transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Bottom Row: Load Button & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#EBE7DC]">
          <button
            onClick={handleLoad}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#0B5C4D] hover:bg-[#07473B] active:scale-98 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Loading investigation graph...' : 'Load investigation graph'}</span>
          </button>

          {/* Quick Demo Case Presets */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Demo presets:</span>
            <button
              onClick={() => handleSelectPreset('TXN-UPI-9001', 'ANDR_09F2', 'CMP-2026-0001')}
              className={`px-2 py-0.5 rounded-md font-mono text-[10px] border transition-colors ${
                caseId === 'CMP-2026-0001'
                  ? 'bg-[#0B5C4D]/10 border-[#0B5C4D] text-[#0B5C4D] font-bold'
                  : 'bg-white border-slate-300 hover:bg-slate-50'
              }`}
            >
              Case #CMP-2026-0001
            </button>
            <button
              onClick={() => handleSelectPreset('TXN-UPI-8812', 'DEV-7F3A9C', 'INV-2026-084')}
              className={`px-2 py-0.5 rounded-md font-mono text-[10px] border transition-colors ${
                caseId === 'INV-2026-084'
                  ? 'bg-[#0B5C4D]/10 border-[#0B5C4D] text-[#0B5C4D] font-bold'
                  : 'bg-white border-slate-300 hover:bg-slate-50'
              }`}
            >
              Case #INV-2026-084
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Grid: Canvas Area (Left) + Analysis Rail (Right) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[440px]">
        {/* Left: Empty Canvas with Vertical Guidelines */}
        <div
          className="flex-1 rounded-2xl border border-[#E8E4D8] bg-[#FAF8F3] relative flex items-center justify-center p-8 overflow-hidden shadow-xs"
          style={{
            backgroundImage: `repeating-linear-gradient(to right, transparent, transparent 79px, rgba(226, 223, 215, 0.45) 79px, rgba(226, 223, 215, 0.45) 80px)`,
          }}
        >
          {/* Centered Awaiting Inputs Card */}
          <div className="rounded-2xl border border-dashed border-[#D2CCBE] bg-white/80 p-8 max-w-md w-full text-center shadow-xs backdrop-blur-2xs">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto mb-3 shadow-2xs">
              <Network className="w-5 h-5 stroke-[1.8]" />
            </div>

            <h3 className="font-serif italic text-base sm:text-lg text-slate-900 font-normal mb-1.5">
              Awaiting investigation inputs
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Submit a Transaction ID and Device ID to render the money-flow graph.
            </p>

            <button
              onClick={handleLoad}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#0B5C4D]/10 hover:bg-[#0B5C4D]/15 text-[#0B5C4D] transition-colors cursor-pointer"
            >
              <span>Click to render network</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right Rail: Analyse Action & Advisory Card */}
        <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-4">
          {/* Analyse Investigation Button */}
          <button
            onClick={handleLoad}
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#599E94] hover:bg-[#4A8B82] active:scale-98 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-white/20" />
            <span>{isLoading ? 'Analyzing...' : 'Analyse investigation'}</span>
          </button>

          {/* Decision Support Advisory Card */}
          <div className="rounded-xl border border-[#E8E4D8] bg-[#FAF8F3] p-4 text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Run the analysis to see the risk score, suspicious patterns and supporting evidence.
              Results are decision support, never proof of fraud.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
