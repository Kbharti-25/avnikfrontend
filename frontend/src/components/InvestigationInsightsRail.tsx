import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  AlertTriangle, 
  Smartphone, 
  FileText, 
  ArrowRight, 
  Lock, 
  Unlock, 
  Download, 
  Radio, 
  Layers, 
  CheckCircle2,
  Users
} from 'lucide-react';
import { NetworkNode, NetworkEdge } from '../mock/network9Data';

interface InvestigationInsightsRailProps {
  selectedNode: NetworkNode | null;
  onClearSelection: () => void;
  edges: NetworkEdge[];
  nodes: NetworkNode[];
  frozenNodeIds: Set<string>;
  onToggleFreeze: (nodeId: string) => void;
  onDownloadReport: () => void;
  onOpenComplaints: () => void;
  complaintCount?: number;
}

export const InvestigationInsightsRail: React.FC<InvestigationInsightsRailProps> = ({
  selectedNode,
  onClearSelection,
  edges,
  nodes,
  frozenNodeIds,
  onToggleFreeze,
  onDownloadReport,
  onOpenComplaints,
  complaintCount = 4,
}) => {
  // Connected edges for the selected node
  const connectedEdges = selectedNode
    ? edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
    : [];

  return (
    <aside className="w-full h-full bg-[#FFFFFF] border-l border-[#E8E4D8] flex flex-col justify-between overflow-hidden select-none">
      {/* 1. Rail Header */}
      <div className="px-5 py-4 border-b border-[#E8E4D8] flex items-center justify-between bg-white shrink-0">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 block">
            INVESTIGATION INSIGHTS
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Case #INV-2026-084</span>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
          Critical · 94/100
        </span>
      </div>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        {selectedNode ? (
          /* ================= SELECTED NODE DOSSIER ================= */
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Header Card */}
            <div className="p-4 rounded-xl border border-[#E2DFD7] bg-[#FAFAFA]">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mb-1.5 ${
                      selectedNode.type === 'mule'
                        ? 'bg-rose-100 text-rose-800'
                        : selectedNode.type === 'collect'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-[#007065]'
                    }`}
                  >
                    {selectedNode.role}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">
                    {selectedNode.name}
                  </h3>
                </div>

                <button
                  onClick={onClearSelection}
                  className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5 rounded-md hover:bg-slate-200 transition-colors"
                >
                  ✕ Close
                </button>
              </div>

              {/* VPA / Handle */}
              <div className="font-mono text-xs text-slate-700 font-semibold mb-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="truncate">{selectedNode.handle}</span>
                <span className="text-[10px] text-[#007065] font-bold">VERIFIED</span>
              </div>

              {/* Node Details Grid */}
              <div className="space-y-1.5 text-[11px] text-slate-600">
                {selectedNode.bank && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Institution:</span>
                    <span className="font-medium text-slate-800">{selectedNode.bank}</span>
                  </div>
                )}
                {selectedNode.hardwareModel && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Device Spec:</span>
                    <span className="font-medium text-slate-800">{selectedNode.hardwareModel}</span>
                  </div>
                )}
                {selectedNode.disputeAmount && (
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Disputed Volume:</span>
                    <span>₹{selectedNode.disputeAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Activity Timestamp:</span>
                  <span className="font-mono text-slate-800">{selectedNode.timestamp} IST</span>
                </div>
              </div>
            </div>

            {/* Risk Assessment Meter */}
            <div className="p-3.5 rounded-xl border border-[#E2DFD7] bg-white">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800 mb-2">
                <span>Anomaly Risk Assessment</span>
                <span className="font-mono text-rose-600 font-extrabold">{selectedNode.riskScore}/100</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    selectedNode.riskScore > 75
                      ? 'bg-rose-500'
                      : selectedNode.riskScore > 40
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${selectedNode.riskScore}%` }}
                />
              </div>
            </div>

            {/* 1st-Degree Incident Connections */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-700">
                <span>Direct Linkages ({connectedEdges.length})</span>
                <span className="text-[10px] text-[#007065] font-mono">1st-Degree</span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {connectedEdges.map((edge) => {
                  const isOut = edge.source === selectedNode.id;
                  const otherNodeId = isOut ? edge.target : edge.source;
                  const otherNode = nodes.find((n) => n.id === otherNodeId);

                  return (
                    <div
                      key={edge.id}
                      className="p-2.5 rounded-lg border border-[#E2DFD7] bg-[#FAFAFA] text-[11px]"
                    >
                      <div className="flex items-center justify-between font-mono font-semibold mb-1">
                        <span className="text-slate-800 truncate max-w-[140px]">
                          {otherNode?.name || otherNodeId}
                        </span>
                        <span className="text-[#007065] text-xs">
                          {edge.amountFormatted || 'Bound'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{isOut ? 'Outgoing ──►' : '◄── Incoming'}</span>
                        <span className="truncate max-w-[130px]">{edge.ruleTriggered}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Counterfactual Action Button */}
            <div className="pt-2">
              <button
                onClick={() => onToggleFreeze(selectedNode.id)}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
                  frozenNodeIds.has(selectedNode.id)
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {frozenNodeIds.has(selectedNode.id) ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Unfreeze Entity in Simulation</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Simulate Immediate Freeze</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-1">
                {frozenNodeIds.has(selectedNode.id)
                  ? 'Entity flow severed in counterfactual model'
                  : 'Test disruption impact by severing transactions'}
              </p>
            </div>
          </div>
        ) : (
          /* ================= NETWORK OVERVIEW (DEFAULT) ================= */
          <div className="space-y-4">
            {/* Executive Metric Cards Strip */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl border border-[#E2DFD7] bg-[#FAFAFA]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Disputed Volume
                </span>
                <span className="font-mono font-extrabold text-base text-rose-700 block">
                  ₹48,300
                </span>
                <span className="text-[10px] text-[#007065] font-medium">Aggregated Claim</span>
              </div>

              <div className="p-3 rounded-xl border border-[#E2DFD7] bg-[#FAFAFA]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Structuring Speed
                </span>
                <span className="font-mono font-extrabold text-base text-[#007065] block">
                  &lt; 3 mins
                </span>
                <span className="text-[10px] text-slate-500 font-medium">4 Hop Fan-out</span>
              </div>

              <div className="p-3 rounded-xl border border-[#E2DFD7] bg-[#FAFAFA]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Identified Mules
                </span>
                <span className="font-mono font-extrabold text-base text-amber-700 block">
                  3 accounts
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Active Layering</span>
              </div>

              <div className="p-3 rounded-xl border border-[#E2DFD7] bg-[#FAFAFA]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Shared Device
                </span>
                <span className="font-mono font-extrabold text-base text-slate-900 block">
                  1 farm
                </span>
                <span className="text-[10px] text-slate-500 font-medium">DEV-7F3A9C</span>
              </div>
            </div>

            {/* High-Priority Explainable Detection Signals */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 block">
                Explainable Detection Signals (3)
              </span>

              {/* Signal 1 */}
              <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-rose-800">
                    ⚡ Rapid Dispersion Churn
                  </span>
                  <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded bg-rose-200 text-rose-900">
                    HIGH
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Aggregator <strong>ravi-18@ybl</strong> split ₹23,800 across 2 secondary mules within 41 seconds of receipt.
                </p>
              </div>

              {/* Signal 2 */}
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-amber-900">
                    ⚡ Hardware Collusion Farm
                  </span>
                  <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                    MED
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Physical device <strong>DEV-7F3A9C</strong> bound and authorized across 3 distinct mule bank accounts.
                </p>
              </div>

              {/* Signal 3 */}
              <div className="p-3 rounded-xl border border-[#E2DFD7] bg-[#FAFAFA] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-slate-800">
                    ⚡ Collect Pull Without Latency
                  </span>
                  <span className="text-[9px] font-bold font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                    CRIT
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Collect request <strong>COL-008412</strong> drained origin account without standard 2FA approval pause.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Action Buttons Strip at Bottom */}
      <div className="p-4 border-t border-[#E8E4D8] bg-[#FAFAFA] space-y-2 shrink-0">
        {/* Download Forensic Report */}
        <button
          onClick={onDownloadReport}
          className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-[#007065] hover:bg-[#059669] text-white flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Forensic Report</span>
        </button>

        {/* View Associated Complaints */}
        <button
          onClick={onOpenComplaints}
          className="w-full py-2 px-3 rounded-xl font-semibold text-xs border border-[#E2DFD7] bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>View Associated Complaints ({complaintCount})</span>
        </button>
      </div>
    </aside>
  );
};
