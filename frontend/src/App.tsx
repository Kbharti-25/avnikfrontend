import React, { useState, useMemo, useRef } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Header } from './components/Header';
import { Sidebar, LeftNavDrawer } from './components/Sidebar';
import { NetworkGraphCanvas } from './components/NetworkGraphCanvas';
import { TransactionTimelineBar } from './components/TransactionTimelineBar';
import { InvestigationInsightsRail } from './components/InvestigationInsightsRail';
import { InvestigationIntakeScreen } from './components/InvestigationIntakeScreen';
import { ComplaintsPanel } from './components/ComplaintsPanel';
import { FraudTimelinePanel } from './components/FraudTimelinePanel';
import { InvestigationSummaryPanel } from './components/InvestigationSummaryPanel';
import { FilterSlidebar } from './components/FilterSlidebar';
import { ComplaintIntakeModal } from './components/ComplaintIntakeModal';
import { downloadInvestigationReport } from './utils/reportGenerator';
import { 
  NETWORK_9_NODES, 
  NETWORK_9_EDGES, 
  NetworkNode, 
  NetworkEdge 
} from './mock/network9Data';
import { 
  SYNTHETIC_NODES, 
  SYNTHETIC_EDGES, 
  SYNTHETIC_TIMELINE, 
  DEMO_COMPLAINTS 
} from './mock/syntheticData';
import { 
  GraphNodeData, 
  GraphEdgeData, 
  ComplaintRecord, 
  ComplaintStatus, 
  TimelineEvent 
} from './types';
import { X } from 'lucide-react';

function DashboardContent() {
  const { theme } = useTheme();

  // Investigation Intake Page State vs Interactive Graph State
  const [isGraphLoaded, setIsGraphLoaded] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState('CMP-2026-0001');
  const [activeTxnId, setActiveTxnId] = useState('TXN-UPI-9001');
  const [activeDevId, setActiveDevId] = useState('ANDR_09F2');
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);

  // Active Right Drawer ('complaints' | 'timeline' | 'summary' | null)
  const [activeDrawer, setActiveDrawer] = useState<LeftNavDrawer>(null);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [minRiskScore, setMinRiskScore] = useState(0);
  const [minAmount, setMinAmount] = useState(0);
  const [timeRange, setTimeRange] = useState('Last 24 hours');
  const [layoutName, setLayoutName] = useState<'cose' | 'concentric' | 'breadthfirst' | 'circle'>('cose');
  const [filterTypes, setFilterTypes] = useState<{ [key: string]: boolean }>({
    account: true,
    device: true,
    merchant: true,
    complaint: true,
  });

  // Slidebars & Modals
  const [isFilterSlidebarOpen, setIsFilterSlidebarOpen] = useState(false);
  const [complaintModalOpen, setComplaintModalOpen] = useState(false);

  // Core Data state
  const [nodes, setNodes] = useState<GraphNodeData[]>(SYNTHETIC_NODES);
  const [edges, setEdges] = useState<GraphEdgeData[]>(SYNTHETIC_EDGES);
  const [timeline] = useState<TimelineEvent[]>(SYNTHETIC_TIMELINE);

  // 9-Node Government-Grade Network & Timeline Scrubber State
  const [networkNodes] = useState<NetworkNode[]>(NETWORK_9_NODES);
  const [networkEdges] = useState<NetworkEdge[]>(NETWORK_9_EDGES);
  const [selectedNetworkNode, setSelectedNetworkNode] = useState<NetworkNode | null>(null);
  const [timelineIndex, setTimelineIndex] = useState<number>(4);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Complaints state with LocalStorage persistence
  const [complaints, setComplaints] = useState<ComplaintRecord[]>(() => {
    try {
      const saved = localStorage.getItem('anvik_complaints_data');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read complaints from localStorage', e);
    }
    return DEMO_COMPLAINTS;
  });

  // Selection & Freezing state
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRecord | null>(null);
  const [selectedTimelineEvent, setSelectedTimelineEvent] = useState<TimelineEvent | null>(null);
  const [frozenNodeIds, setFrozenNodeIds] = useState<Set<string>>(new Set());

  // Download Comprehensive Forensic Investigation Report (Descriptive Analysis + Graph)
  const handleDownloadReport = () => {
    const reportNodes: GraphNodeData[] = networkNodes.map((n) => ({
      id: n.id,
      label: n.name,
      type: n.type === 'upi' || n.type === 'mule' ? 'account' : n.type === 'device' ? 'device' : 'merchant',
      role: n.role as any,
      riskScore: n.riskScore,
      status: n.status,
      upiId: n.handle.includes('@') ? n.handle : undefined,
      deviceId: n.type === 'device' ? n.handle : undefined,
      bankName: n.bank,
      disputeAmount: n.disputeAmount,
    }));

    const reportEdges: GraphEdgeData[] = networkEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      amount: e.amount || 0,
      timestamp: `2026-10-15 ${e.timestamp}`,
      utr: `UTR-2026-${e.id.toUpperCase()}`,
      channel: e.type === 'device_link' ? 'DEVICE_BIND' : 'UPI_P2P',
      isSuspicious: e.type === 'transaction' && (e.amount || 0) > 5000,
      ruleTriggered: e.ruleTriggered,
    }));

    downloadInvestigationReport({
      caseId: activeCaseId,
      graphImageBase64: null,
      nodes: reportNodes,
      edges: reportEdges,
      complaints,
      timeline,
      analystName: 'Bharath K (Member 3)',
    });
  };

  // Load Graph from Intake Screen Handler
  const handleLoadGraphFromIntake = (txnId: string, devId: string, cId: string) => {
    setIsLoadingGraph(true);
    setActiveTxnId(txnId);
    setActiveDevId(devId);
    setActiveCaseId(cId);

    setTimeout(() => {
      setIsLoadingGraph(false);
      setIsGraphLoaded(true);
    }, 350);
  };

  // Return to Intake Screen Handler
  const handleReturnToIntake = () => {
    setIsGraphLoaded(false);
  };

  // Toggle Left Nav Drawers
  const handleToggleDrawer = (drawer: 'complaints' | 'timeline' | 'summary') => {
    if (activeDrawer === drawer) {
      setActiveDrawer(null);
    } else {
      setActiveDrawer(drawer);
    }
  };

  // Status Updater for Complaints (with LocalStorage write)
  const handleUpdateComplaintStatus = (complaintId: string, newStatus: ComplaintStatus) => {
    setComplaints((prev) => {
      const updated = prev.map((c) =>
        c.id === complaintId ? { ...c, status: newStatus } : c
      );
      try {
        localStorage.setItem('anvik_complaints_data', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not write complaints to localStorage', e);
      }
      return updated;
    });
  };

  // Complaint selection -> Cross-highlight in network
  const handleSelectComplaint = (cmp: ComplaintRecord | null) => {
    setSelectedComplaint(cmp);
    setSelectedTimelineEvent(null);
    if (cmp) {
      const target = networkNodes.find((n) => n.id === cmp.relatedAccountId || n.handle === cmp.relatedAccountUpi);
      if (target) {
        setSelectedNetworkNode(target);
      }
    }
  };

  // Timeline Event selection -> Cross-highlight in network
  const handleSelectTimelineEvent = (evt: TimelineEvent | null) => {
    setSelectedTimelineEvent(evt);
    setSelectedComplaint(null);
    if (evt) {
      const target = networkNodes.find((n) => n.id === evt.sender || n.handle === evt.senderUpi);
      if (target) {
        setSelectedNetworkNode(target);
      }
    }
  };

  // Counterfactual Freeze
  const handleToggleFreeze = (nodeId: string) => {
    setFrozenNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Add Complaint Modal
  const handleAddComplaint = (newComplaintNode: GraphNodeData, newEdge: GraphEdgeData) => {
    setNodes((prev) => [newComplaintNode, ...prev]);
    setEdges((prev) => [newEdge, ...prev]);
  };

  const resetFilters = () => {
    setMinRiskScore(0);
    setMinAmount(0);
    setTimeRange('Last 24 hours');
    setLayoutName('cose');
    setFilterTypes({ account: true, device: true, merchant: true, complaint: true });
    setSearchQuery('');
  };

  return (
    <div
      className={`h-screen w-screen flex flex-col font-sans transition-colors duration-200 overflow-hidden ${
        theme === 'dark' ? 'bg-[#060E0B] text-slate-100' : 'bg-[#FBF9F4] text-slate-800'
      }`}
    >
      {/* 1. Top Header Bar (Brand Logo, Breadcrumbs, Demo Workspace, Controls) */}
      <Header
        currentInvestigationId={activeCaseId}
        isGraphLoaded={isGraphLoaded}
        onReturnToIntake={handleReturnToIntake}
        onOpenSearch={() => setIsFilterSlidebarOpen(true)}
        onOpenAlerts={() => handleToggleDrawer('summary')}
        alertCount={3}
        onDownloadReport={handleDownloadReport}
      />

      {/* 2. Main Investigation Workspace */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden bg-[#FBF9F4]">
        {/* Left Action Rail (Icon-Only buttons with hover text tooltips) */}
        <Sidebar
          activeDrawer={activeDrawer}
          onToggleDrawer={handleToggleDrawer}
          complaintCount={complaints.length}
        />

        {/* Condition: Show Investigation Intake / Landing Screen OR Interactive Graph Workspace */}
        {!isGraphLoaded ? (
          <div className="flex-1 min-w-0 h-full overflow-hidden">
            <InvestigationIntakeScreen
              onLoadGraph={handleLoadGraphFromIntake}
              isLoading={isLoadingGraph}
            />
          </div>
        ) : (
          /* Investigation Workspace Layout: 75%–85% Graph & Timeline on Left, 20%–25% Investigation Insights Rail on Right */
          <div className="flex-1 flex min-w-0 h-full overflow-hidden animate-in fade-in duration-200">
            {/* Left Area (78% width): Network Graph (upper) + Transaction Timeline (flush beneath) */}
            <section className="flex-1 min-w-0 h-full flex flex-col p-3 pr-1.5 overflow-hidden">
              {/* Upper: Interactive Network Graph Canvas */}
              <div className="flex-1 min-h-0 relative rounded-t-2xl overflow-hidden border border-[#E8E4D8] border-b-0 shadow-2xs">
                <NetworkGraphCanvas
                  nodes={networkNodes}
                  edges={networkEdges}
                  selectedNodeId={selectedNetworkNode?.id || null}
                  onSelectNode={setSelectedNetworkNode}
                  timelineIndex={timelineIndex}
                  frozenNodeIds={frozenNodeIds}
                />
              </div>

              {/* Lower: Transaction Timeline Bar (Positioned flush beneath the graph canvas in a dedicated card) */}
              <div className="shrink-0 rounded-b-2xl overflow-hidden border border-[#E8E4D8] shadow-2xs">
                <TransactionTimelineBar
                  timelineIndex={timelineIndex}
                  setTimelineIndex={setTimelineIndex}
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                />
              </div>
            </section>

            {/* Right Rail (22% width, min 300px, max 380px): INVESTIGATION INSIGHTS */}
            <div className="w-[340px] shrink-0 h-full p-3 pl-1.5 overflow-hidden">
              <div className="h-full rounded-2xl overflow-hidden border border-[#E8E4D8] shadow-2xs">
                <InvestigationInsightsRail
                  selectedNode={selectedNetworkNode}
                  onClearSelection={() => setSelectedNetworkNode(null)}
                  edges={networkEdges}
                  nodes={networkNodes}
                  frozenNodeIds={frozenNodeIds}
                  onToggleFreeze={handleToggleFreeze}
                  onDownloadReport={handleDownloadReport}
                  onOpenComplaints={() => handleToggleDrawer('complaints')}
                  complaintCount={complaints.length}
                />
              </div>
            </div>
          </div>
        )}

        {/* Slide-In Modal Drawer when Complaints or Past Record are clicked from Sidebar */}
        {activeDrawer && (
          <div className="absolute right-0 top-0 bottom-0 w-[420px] max-w-[90vw] bg-white border-l border-[#E2DFD7] shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Close Bar */}
            <div className="px-5 py-3.5 border-b border-[#E2DFD7] flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {activeDrawer === 'complaints'
                  ? 'Complaints & Dispute Reports'
                  : activeDrawer === 'timeline'
                  ? 'Fraud Timeline Sequence'
                  : 'Investigation Summary & Audit'}
              </span>
              <button
                onClick={() => setActiveDrawer(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {activeDrawer === 'complaints' && (
                <ComplaintsPanel
                  complaints={complaints}
                  onUpdateComplaintStatus={handleUpdateComplaintStatus}
                  selectedComplaintId={selectedComplaint?.id || null}
                  onSelectComplaint={handleSelectComplaint}
                  onClose={() => setActiveDrawer(null)}
                />
              )}
              {activeDrawer === 'timeline' && (
                <FraudTimelinePanel
                  timeline={timeline}
                  selectedEventId={selectedTimelineEvent?.id || null}
                  onSelectEvent={handleSelectTimelineEvent}
                  onClose={() => setActiveDrawer(null)}
                />
              )}
              {activeDrawer === 'summary' && (
                <InvestigationSummaryPanel
                  nodes={nodes}
                  edges={edges}
                  complaints={complaints}
                  onClose={() => setActiveDrawer(null)}
                  onDownloadReport={handleDownloadReport}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter & Threshold Sliders Slidebar */}
      <FilterSlidebar
        isOpen={isFilterSlidebarOpen}
        onClose={() => setIsFilterSlidebarOpen(false)}
        minRiskScore={minRiskScore}
        setMinRiskScore={setMinRiskScore}
        minAmount={minAmount}
        setMinAmount={setMinAmount}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        filterTypes={filterTypes}
        setFilterTypes={setFilterTypes}
        layoutName={layoutName}
        setLayoutName={setLayoutName}
        onReset={resetFilters}
      />

      {/* Complaint Intake Modal */}
      <ComplaintIntakeModal
        isOpen={complaintModalOpen}
        onClose={() => setComplaintModalOpen(false)}
        onAddComplaint={handleAddComplaint}
        existingAccounts={nodes.filter((n) => n.type === 'account')}
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <DashboardContent />
    </ThemeProvider>
  );
}

export default App;

