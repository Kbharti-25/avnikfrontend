import React, { useState, useMemo } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { MetricCards } from './components/MetricCards';
import { GraphExplorer } from './components/GraphExplorer';
import { AnalystControlPanel, ActiveControlTab } from './components/AnalystControlPanel';
import { ExplainableAlertsCard } from './components/ExplainableAlertsCard';
import { EntityInspector } from './components/EntityInspector';
import { FilterSlidebar } from './components/FilterSlidebar';
import { AlertsPanel } from './components/AlertsPanel';
import { TimelineView } from './components/TimelineView';
import { CaseManagement } from './components/CaseManagement';
import { CounterfactualSimulator } from './components/CounterfactualSimulator';
import { ComplaintIntakeModal } from './components/ComplaintIntakeModal';
import { 
  SYNTHETIC_NODES, 
  SYNTHETIC_EDGES, 
  SYNTHETIC_ALERTS, 
  SYNTHETIC_TIMELINE, 
  SYNTHETIC_CASES,
  DEMO_COMPLAINTS
} from './mock/syntheticData';
import { 
  GraphNodeData, 
  GraphEdgeData, 
  CaseFile, 
  SuspiciousAlert, 
  ComplaintRecord, 
  ComplaintStatus, 
  TimelineEvent 
} from './types';
import { FileText, Plus, ShieldCheck, ArrowRight } from 'lucide-react';

function DashboardContent() {
  const { theme } = useTheme();

  // Navigation & View state
  const [activeSection, setActiveSection] = useState('investigations');
  const [activeTab, setActiveTab] = useState('graph');

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

  // Graph and Core Data state
  const [nodes, setNodes] = useState<GraphNodeData[]>(SYNTHETIC_NODES);
  const [edges, setEdges] = useState<GraphEdgeData[]>(SYNTHETIC_EDGES);
  const [alerts] = useState(SYNTHETIC_ALERTS);
  const [timeline] = useState(SYNTHETIC_TIMELINE);
  const [cases, setCases] = useState<CaseFile[]>(SYNTHETIC_CASES);

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

  // Analyst Control Panel & Selection state
  const [activeControlTab, setActiveControlTab] = useState<ActiveControlTab>('complaints');
  const [selectedEntity, setSelectedEntity] = useState<GraphNodeData | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRecord | null>(null);
  const [selectedTimelineEvent, setSelectedTimelineEvent] = useState<TimelineEvent | null>(null);
  const [frozenNodeIds, setFrozenNodeIds] = useState<Set<string>>(new Set());
  const [highlightedRingActive, setHighlightedRingActive] = useState(false);

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

  // Complaint selection -> Cross-highlight in graph
  const handleSelectComplaint = (cmp: ComplaintRecord | null) => {
    setSelectedComplaint(cmp);
    setSelectedTimelineEvent(null);
    if (cmp) {
      const targetNode = nodes.find((n) => n.id === cmp.relatedAccountId);
      if (targetNode) {
        setSelectedEntity(targetNode);
      }
    }
  };

  // Timeline Event selection -> Cross-highlight in graph
  const handleSelectTimelineEvent = (evt: TimelineEvent | null) => {
    setSelectedTimelineEvent(evt);
    setSelectedComplaint(null);
    if (evt) {
      const targetNode = nodes.find((n) => n.id === evt.sender) || nodes.find((n) => n.id === evt.receiver);
      if (targetNode) {
        setSelectedEntity(targetNode);
      }
    }
  };

  // Node selection from Graph -> opens entity inspector in Analyst Panel
  const handleSelectEntityFromGraph = (entity: GraphNodeData | null) => {
    setSelectedEntity(entity);
    if (entity) {
      setActiveControlTab('entity_inspector');
    }
  };

  // Compute Cross-highlighted elements for GraphExplorer
  const highlightedNodeIds = useMemo(() => {
    if (selectedComplaint) {
      return [selectedComplaint.relatedAccountId];
    }
    if (selectedTimelineEvent) {
      return [selectedTimelineEvent.sender, selectedTimelineEvent.receiver];
    }
    return [];
  }, [selectedComplaint, selectedTimelineEvent]);

  const highlightedEdgeId = useMemo(() => {
    if (selectedTimelineEvent?.edgeId) {
      return selectedTimelineEvent.edgeId;
    }
    if (selectedComplaint) {
      const matched = edges.find(
        (e) =>
          (e.utr && selectedComplaint.relatedTxnUtr && e.utr === selectedComplaint.relatedTxnUtr) ||
          e.source === selectedComplaint.relatedAccountId ||
          e.target === selectedComplaint.relatedAccountId
      );
      return matched?.id || null;
    }
    return null;
  }, [selectedComplaint, selectedTimelineEvent, edges]);

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

  const handleClearAllFreezes = () => {
    setFrozenNodeIds(new Set());
  };

  // Investigate in Graph cross-link
  const handleInvestigateInGraph = (clusterId: string) => {
    setActiveTab('graph');
    setHighlightedRingActive(true);
  };

  // Handle selecting an alert to inspect in drawer
  const handleSelectAlert = (alt: SuspiciousAlert) => {
    const primaryNode = nodes.find((n) => n.id === 'ACC_PRIMARY_MULE') || nodes[0];
    setSelectedEntity(primaryNode);
    setActiveControlTab('entity_inspector');
    setHighlightedRingActive(true);
    setActiveTab('graph');
  };

  // Add Complaint
  const handleAddComplaint = (newComplaintNode: GraphNodeData, newEdge: GraphEdgeData) => {
    setNodes((prev) => [newComplaintNode, ...prev]);
    setEdges((prev) => [newEdge, ...prev]);
    setSelectedEntity(newComplaintNode);
    setActiveControlTab('entity_inspector');
    setActiveTab('graph');
  };

  // Case management handlers
  const handleAddCaseNote = (caseId: string, noteText: string) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          return {
            ...c,
            notes: [
              ...c.notes,
              {
                id: `N-${Date.now()}`,
                author: 'Analyst (You)',
                timestamp: 'Just now',
                text: noteText,
              },
            ],
          };
        }
        return c;
      })
    );
  };

  const handleUpdateCaseStatus = (caseId: string, newStatus: CaseFile['status']) => {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, status: newStatus } : c))
    );
  };

  const handleExportCase = () => {
    const dossier = {
      investigationId: 'INV-2026-084',
      name: 'Operation Chakravyuh - UPI Mule Ring',
      status: 'In review',
      flaggedVolume: 480000,
      nodesCount: nodes.length,
      alertsCount: alerts.length,
      complaintsCount: complaints.length,
      exportedAt: new Date().toISOString(),
      disclaimer: 'Generated by Anvik decision-support system. Synthetic demonstration dataset.',
    };
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `INV-2026-084_Dossier.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setMinRiskScore(0);
    setMinAmount(0);
    setTimeRange('Last 24 hours');
    setLayoutName('cose');
    setFilterTypes({ account: true, device: true, merchant: true, complaint: true });
    setSearchQuery('');
  };

  // Map sidebar section clicks to tabs
  const handleSelectSidebarSection = (section: string) => {
    setActiveSection(section);
    if (section === 'investigations') setActiveTab('graph');
    if (section === 'alerts') setActiveTab('alerts');
    if (section === 'timeline') setActiveTab('timeline');
    if (section === 'cases') setActiveTab('cases');
    if (section === 'counterfactual') setActiveTab('counterfactual');
    if (section === 'overview') setActiveTab('overview');
  };

  return (
    <div
      className={`min-h-screen flex font-sans transition-colors duration-250 ${
        theme === 'dark' ? 'bg-[#091311] text-slate-100' : 'bg-[#F8FAF9] text-slate-800'
      }`}
    >
      {/* Collapsible Left Navigation Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSidebarSection}
        investigationCount={8}
        alertCount={alerts.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <Header
          currentInvestigationId="INV-2026-084"
          onOpenSearch={() => setIsFilterSlidebarOpen(true)}
          onOpenAlerts={() => setActiveTab('alerts')}
          alertCount={alerts.length}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Workspace Title & Tab Navigation */}
          <WorkspaceHeader
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onExportCase={handleExportCase}
            onNewInvestigation={() => setComplaintModalOpen(true)}
            complaintCount={complaints.length}
            transactionCount={edges.filter((e) => e.amount > 0).length}
            alertCount={alerts.length}
          />

          {/* 4 Metric KPI Cards strip */}
          <MetricCards
            connectedAccountsCount={nodes.filter((n) => n.type === 'account').length}
            complaintsCount={complaints.length}
            flaggedFlowFormatted="₹4.80L"
            signalsCount={alerts.length}
            sharedDevicesCount={nodes.filter((n) => n.type === 'device').length}
          />

          {/* Primary View: Center Graph (68%) + Right Analyst Control Panel (32%) */}
          {(activeTab === 'graph' || activeTab === 'overview') && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Center: Expanded Interactive Fraud Graph (approx 67-70% width) */}
                <div className="lg:col-span-8">
                  <GraphExplorer
                    nodes={nodes}
                    edges={edges}
                    selectedEntity={selectedEntity}
                    onSelectEntity={handleSelectEntityFromGraph}
                    frozenNodeIds={frozenNodeIds}
                    highlightedRingActive={highlightedRingActive}
                    setHighlightedRingActive={setHighlightedRingActive}
                    highlightedNodeIds={highlightedNodeIds}
                    highlightedEdgeId={highlightedEdgeId}
                    searchFilter={searchQuery}
                    setSearchFilter={setSearchQuery}
                    minRiskScore={minRiskScore}
                    minAmount={minAmount}
                    filterTypes={filterTypes}
                    layoutName={layoutName}
                    onOpenFilters={() => setIsFilterSlidebarOpen(true)}
                    timeRange={timeRange}
                    setTimeRange={setTimeRange}
                  />
                </div>

                {/* Right: Analyst Control Panel with 3 Interactive Buttons (Complaints, Timeline, Summary) */}
                <div className="lg:col-span-4 h-[650px]">
                  <AnalystControlPanel
                    nodes={nodes}
                    edges={edges}
                    complaints={complaints}
                    timeline={timeline}
                    selectedEntity={selectedEntity}
                    onSelectEntity={setSelectedEntity}
                    selectedComplaint={selectedComplaint}
                    onSelectComplaint={handleSelectComplaint}
                    selectedTimelineEvent={selectedTimelineEvent}
                    onSelectTimelineEvent={handleSelectTimelineEvent}
                    onUpdateComplaintStatus={handleUpdateComplaintStatus}
                    isFrozen={selectedEntity ? frozenNodeIds.has(selectedEntity.id) : false}
                    onToggleFreeze={handleToggleFreeze}
                    activeControlTab={activeControlTab}
                    setActiveControlTab={setActiveControlTab}
                  />
                </div>
              </div>

              {/* Explainable Alerts Section below primary workspace */}
              <div className="pt-2">
                <ExplainableAlertsCard
                  alerts={alerts}
                  onOpenFullAlerts={() => setActiveTab('alerts')}
                  onSelectAlert={handleSelectAlert}
                />
              </div>
            </div>
          )}

          {/* Full Complaints Tab View */}
          {activeTab === 'complaints' && (
            <div
              className={`p-6 rounded-2xl border ${
                theme === 'dark' ? 'bg-[#111E1A] border-[#1A332B]' : 'bg-white border-slate-200/90 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold">Linked NCRP & Bank Dispute Reports</h3>
                  <p className="text-xs text-slate-400">Formal cybercrime portal complaints</p>
                </div>
                <button
                  onClick={() => setComplaintModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A5C36] hover:bg-[#07472A] text-white rounded-xl text-xs font-semibold shadow-xs btn-press"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Link New Complaint</span>
                </button>
              </div>

              <div className="space-y-3">
                {complaints.map((cmp) => (
                  <div
                    key={cmp.id}
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      theme === 'dark'
                        ? 'bg-[#0E1715] border-[#1A332B]'
                        : 'bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-rose-500" />
                        <span className="font-mono font-bold text-xs">{cmp.complaintRef}</span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                            cmp.status === 'under_investigation'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : cmp.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {cmp.status === 'under_investigation'
                            ? 'Under Investigation'
                            : cmp.status === 'resolved'
                            ? 'Resolved'
                            : 'Pending Review'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{cmp.shortDescription}</p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                        ₹{cmp.disputeAmount?.toLocaleString('en-IN') || '4,80,000'}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Disputed Amount</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && <TimelineView events={timeline} />}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <AlertsPanel alerts={alerts} onInvestigateInGraph={handleInvestigateInGraph} />
          )}

          {/* Case Notes Tab */}
          {activeTab === 'cases' && (
            <CaseManagement
              cases={cases}
              onAddNote={handleAddCaseNote}
              onUpdateStatus={handleUpdateCaseStatus}
            />
          )}

          {/* Counterfactual Tab */}
          {activeTab === 'counterfactual' && (
            <CounterfactualSimulator
              nodes={nodes}
              edges={edges}
              frozenNodeIds={frozenNodeIds}
              onToggleFreeze={handleToggleFreeze}
              onClearAllFreezes={handleClearAllFreezes}
              onOpenGraph={() => setActiveTab('graph')}
            />
          )}
        </main>
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
