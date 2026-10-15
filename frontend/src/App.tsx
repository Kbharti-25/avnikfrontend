import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './components/LoginPage';
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
import { X, Network, SlidersHorizontal, ArrowLeftRight } from 'lucide-react';

function DashboardContent() {
  // Authentication State: Login Page is Stage 1 (The VERY FIRST SCREEN)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [analystGovtId, setAnalystGovtId] = useState<string>('LEA-IND-8812');

  const handleLogin = (govtId: string) => {
    setAnalystGovtId(govtId);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsGraphLoaded(false);
  };

  // Investigation Intake Page State vs Interactive Graph State
  const [isGraphLoaded, setIsGraphLoaded] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState('CMP-2026-0001');
  const [activeTxnId, setActiveTxnId] = useState('TXN-UPI-9001');
  const [activeDevId, setActiveDevId] = useState('ANDR_09F2');
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);

  // Interactive Graph Visibility & Slide Bar Width Splitter State
  const [isGraphVisible, setIsGraphVisible] = useState<boolean>(true);
  const [graphWidthPercent, setGraphWidthPercent] = useState<number>(68); // 30% to 85%
  const [textOnLeft, setTextOnLeft] = useState<boolean>(true); // default true: text adjusts on left side, graph expands on right
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Resize listener for the draggable vertical slide bar splitter
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarWidth = 64; // width of Left Action Rail
      const totalWidth = window.innerWidth - sidebarWidth;
      const mouseX = Math.max(10, e.clientX - sidebarWidth);
      const ratio = mouseX / totalWidth;

      // When text is on the left, graph is on the right: graphWidth = (1 - ratio) * 100
      // When graph is on the left, text is on the right: graphWidth = ratio * 100
      const newGraphPercent = textOnLeft
        ? Math.min(Math.max(Math.round((1 - ratio) * 100), 30), 85)
        : Math.min(Math.max(Math.round(ratio * 100), 30), 85);

      setGraphWidthPercent(newGraphPercent);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, textOnLeft]);

  const handleShowOrExpandGraph = () => {
    setIsGraphVisible(true);
    setGraphWidthPercent((prev) => (prev < 65 ? 72 : prev));
  };

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
      analystName: `Officer ${analystGovtId} (Bharath K - Member 3)`,
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

  // 1. Stage 1: The very first page shown before anything else is the ANVIK Login Page
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col font-sans overflow-hidden bg-[#FBF9F4] text-slate-800">
      {/* 1. Top Header Bar (Brand Logo, Breadcrumbs, Demo Workspace, Controls) */}
      <Header
        currentInvestigationId={activeCaseId}
        isGraphLoaded={isGraphLoaded}
        onReturnToIntake={handleReturnToIntake}
        onOpenSearch={() => setIsFilterSlidebarOpen(true)}
        onOpenAlerts={() => handleToggleDrawer('summary')}
        alertCount={3}
        onDownloadReport={handleDownloadReport}
        onLogout={handleLogout}
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
          /* Interactive Investigation Workspace: Slide Bar Controls + Evenly Adjusting Left Text + Uniformly Expanding Graph */
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden animate-in fade-in duration-200">
            {/* 1. SLIDE BAR WORKSPACE CONTROL STRIP */}
            <div className="h-9 px-4 bg-white border-b border-[#E8E4D8] flex items-center justify-between text-xs text-slate-700 shrink-0 shadow-2xs select-none gap-2">
              {/* Left: Slide Bar Range Slider & Percent Labels */}
              <div className="flex items-center gap-3 min-w-0 overflow-x-auto py-0.5">
                <div className="flex items-center gap-1.5 shrink-0 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#007065]" />
                  <span className="hidden sm:inline">Workspace Slide Bar:</span>
                </div>

                {/* Range Slider for adjusting split */}
                <div className="flex items-center gap-2 shrink-0 bg-[#FBF9F4] px-2.5 py-1 rounded-lg border border-[#E8E4D8]">
                  <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                    {textOnLeft ? 'Text' : 'Graph'}: {textOnLeft ? 100 - graphWidthPercent : graphWidthPercent}%
                  </span>
                  <input
                    type="range"
                    min={30}
                    max={85}
                    step={1}
                    value={graphWidthPercent}
                    onChange={(e) => setGraphWidthPercent(Number(e.target.value))}
                    className="w-28 sm:w-36 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#007065]"
                    title="Slide to adjust left text and expand graph uniformly"
                  />
                  <span className="text-[11px] font-bold text-[#007065] whitespace-nowrap">
                    {textOnLeft ? 'Graph' : 'Text'}: {textOnLeft ? graphWidthPercent : 100 - graphWidthPercent}%
                  </span>
                </div>

                {/* Quick Split Presets */}
                <div className="hidden md:flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setGraphWidthPercent(50)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                      graphWidthPercent === 50
                        ? 'bg-[#007065] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    50/50 Split
                  </button>
                  <button
                    onClick={() => setGraphWidthPercent(68)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                      graphWidthPercent === 68
                        ? 'bg-[#007065] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    70% Standard
                  </button>
                  <button
                    onClick={() => setGraphWidthPercent(85)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                      graphWidthPercent === 85
                        ? 'bg-[#007065] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    85% Expanded
                  </button>
                </div>
              </div>

              {/* Right: Swap Sides & Graph Toggle Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setTextOnLeft((prev) => !prev)}
                  title="Swap Left/Right Panels"
                  className="px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeftRight className="w-3 h-3 text-slate-500" />
                  <span className="hidden sm:inline">Swap Sides</span>
                </button>

                <button
                  onClick={() => setIsGraphVisible((prev) => !prev)}
                  title={isGraphVisible ? 'Hide Network Graph' : 'Show Network Graph'}
                  className="px-2.5 py-1 rounded-lg bg-[#007065] hover:bg-[#005a52] text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>{isGraphVisible ? 'Hide Graph' : 'Show Graph'}</span>
                </button>
              </div>
            </div>

            {/* 2. MAIN RESIZABLE WORKSPACE BODY */}
            <div className="flex-1 flex min-h-0 relative overflow-hidden bg-[#FBF9F4]">
              {/* Scenario A: Graph is Hidden -> Text Insights occupies full width */}
              {!isGraphVisible ? (
                <div className="w-full h-full p-4 overflow-hidden animate-in fade-in duration-200">
                  <div className="h-full rounded-2xl overflow-hidden border border-[#E8E4D8] shadow-2xs bg-white">
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
                      onShowGraph={handleShowOrExpandGraph}
                      isGraphVisible={isGraphVisible}
                    />
                  </div>
                </div>
              ) : (
                /* Scenario B: Both Left Text & Uniformly Expanding Graph Visible */
                <div className="w-full h-full flex min-h-0 overflow-hidden">
                  {/* Left Panel (Text / Insights when textOnLeft is true) */}
                  {textOnLeft ? (
                    <>
                      {/* Left Side: Investigation Insights (Text adjusts evenly) */}
                      <div
                        style={{ width: `calc(${100 - graphWidthPercent}% - 5px)` }}
                        className="h-full min-w-[280px] p-2.5 pr-0 overflow-hidden transition-[width] duration-75"
                      >
                        <div className="h-full rounded-2xl overflow-hidden border border-[#E8E4D8] shadow-2xs bg-white">
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
                            onShowGraph={handleShowOrExpandGraph}
                            isGraphVisible={isGraphVisible}
                          />
                        </div>
                      </div>

                      {/* Interactive Draggable Slide Bar Splitter Handle */}
                      <div
                        onMouseDown={handleMouseDownResize}
                        className={`w-2.5 h-full flex items-center justify-center cursor-col-resize select-none shrink-0 transition-colors group ${
                          isResizing ? 'bg-[#007065]/20' : 'hover:bg-[#007065]/10'
                        }`}
                        title="Click and drag to adjust split between Left Text and Graph"
                      >
                        <div className="w-1 h-8 rounded-full bg-slate-300 group-hover:bg-[#007065] group-active:bg-[#007065] transition-colors" />
                      </div>

                      {/* Right Side: Interactive Network Graph & Timeline (Expands & Distributes Uniformly) */}
                      <section
                        style={{ width: `calc(${graphWidthPercent}% - 5px)` }}
                        className="h-full min-w-[320px] flex-1 flex flex-col p-2.5 pl-0 overflow-hidden transition-[width] duration-75"
                      >
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

                        {/* Lower: Transaction Timeline Bar (Positioned flush beneath graph) */}
                        <div className="shrink-0 rounded-b-2xl overflow-hidden border border-[#E8E4D8] shadow-2xs">
                          <TransactionTimelineBar
                            timelineIndex={timelineIndex}
                            setTimelineIndex={setTimelineIndex}
                            isPlaying={isPlaying}
                            setIsPlaying={setIsPlaying}
                          />
                        </div>
                      </section>
                    </>
                  ) : (
                    /* Inverted Layout: Graph on Left, Text on Right */
                    <>
                      <section
                        style={{ width: `calc(${graphWidthPercent}% - 5px)` }}
                        className="h-full min-w-[320px] flex-1 flex flex-col p-2.5 pr-0 overflow-hidden transition-[width] duration-75"
                      >
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
                        <div className="shrink-0 rounded-b-2xl overflow-hidden border border-[#E8E4D8] shadow-2xs">
                          <TransactionTimelineBar
                            timelineIndex={timelineIndex}
                            setTimelineIndex={setTimelineIndex}
                            isPlaying={isPlaying}
                            setIsPlaying={setIsPlaying}
                          />
                        </div>
                      </section>

                      {/* Interactive Draggable Slide Bar Splitter Handle */}
                      <div
                        onMouseDown={handleMouseDownResize}
                        className={`w-2.5 h-full flex items-center justify-center cursor-col-resize select-none shrink-0 transition-colors group ${
                          isResizing ? 'bg-[#007065]/20' : 'hover:bg-[#007065]/10'
                        }`}
                        title="Click and drag to adjust split"
                      >
                        <div className="w-1 h-8 rounded-full bg-slate-300 group-hover:bg-[#007065] group-active:bg-[#007065] transition-colors" />
                      </div>

                      <div
                        style={{ width: `calc(${100 - graphWidthPercent}% - 5px)` }}
                        className="h-full min-w-[280px] p-2.5 pl-0 overflow-hidden transition-[width] duration-75"
                      >
                        <div className="h-full rounded-2xl overflow-hidden border border-[#E8E4D8] shadow-2xs bg-white">
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
                            onShowGraph={handleShowOrExpandGraph}
                            isGraphVisible={isGraphVisible}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
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

