import React, { useState, useMemo } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Header } from './components/Header';
import { Sidebar, LeftNavDrawer } from './components/Sidebar';
import { GraphExplorer } from './components/GraphExplorer';
import { ComplaintsPanel } from './components/ComplaintsPanel';
import { FraudTimelinePanel } from './components/FraudTimelinePanel';
import { InvestigationSummaryPanel } from './components/InvestigationSummaryPanel';
import { EntityInspector } from './components/EntityInspector';
import { FilterSlidebar } from './components/FilterSlidebar';
import { ComplaintIntakeModal } from './components/ComplaintIntakeModal';
import { 
  SYNTHETIC_NODES, 
  SYNTHETIC_EDGES, 
  SYNTHETIC_ALERTS, 
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
  const [selectedEntity, setSelectedEntity] = useState<GraphNodeData | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintRecord | null>(null);
  const [selectedTimelineEvent, setSelectedTimelineEvent] = useState<TimelineEvent | null>(null);
  const [frozenNodeIds, setFrozenNodeIds] = useState<Set<string>>(new Set());
  const [highlightedRingActive, setHighlightedRingActive] = useState(false);

  // Toggle Left Nav Drawers
  const handleToggleDrawer = (drawer: 'complaints' | 'timeline' | 'summary') => {
    if (activeDrawer === drawer) {
      setActiveDrawer(null);
    } else {
      setActiveDrawer(drawer);
      setSelectedEntity(null);
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

  // Node selection from Graph -> Opens entity inspector
  const handleSelectEntityFromGraph = (entity: GraphNodeData | null) => {
    setSelectedEntity(entity);
    if (entity) {
      setActiveDrawer(null);
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

  // Add Complaint Modal
  const handleAddComplaint = (newComplaintNode: GraphNodeData, newEdge: GraphEdgeData) => {
    setNodes((prev) => [newComplaintNode, ...prev]);
    setEdges((prev) => [newEdge, ...prev]);
    setSelectedEntity(newComplaintNode);
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
        theme === 'dark' ? 'bg-[#060E0B] text-slate-100' : 'bg-[#F4F7F5] text-slate-800'
      }`}
    >
      {/* 1. Top Header Bar (Brand Logo, Breadcrumbs, Demo Workspace, Controls) */}
      <Header
        currentInvestigationId="INV-2026-084"
        onOpenSearch={() => setIsFilterSlidebarOpen(true)}
        onOpenAlerts={() => handleToggleDrawer('summary')}
        alertCount={3}
      />

      {/* 2. Main Investigation Workspace (Left Action Rail + Center Graph + Slide-in Drawers) */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Left Action Rail matching Screenshot (Network active icon, Complaints, Timeline, Past Record) */}
        <Sidebar
          activeDrawer={activeDrawer}
          onToggleDrawer={handleToggleDrawer}
          complaintCount={complaints.length}
        />

        {/* Center / Full-Width Graph Container Card */}
        <main className="flex-1 flex flex-col min-w-0 p-3 h-full overflow-hidden">
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
        </main>

        {/* 3. Slide-In Interactive Panel Drawer (Complaints, Timeline, Past Record, Entity Inspector) */}
        {(activeDrawer || selectedEntity) && (
          <div
            className={`w-[420px] max-w-[90vw] shrink-0 h-full border-l flex flex-col shadow-2xl z-30 transition-all duration-300 animate-in slide-in-from-right ${
              theme === 'dark'
                ? 'bg-[#091612] border-[#142921]'
                : 'bg-white border-slate-200'
            }`}
          >
            {/* Drawer Close Bar */}
            <div className="px-4 py-3 border-b border-inherit flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {activeDrawer === 'complaints'
                  ? 'Complaints & Dispute Records'
                  : activeDrawer === 'timeline'
                  ? 'Fraud Timeline Sequence'
                  : activeDrawer === 'summary'
                  ? 'Investigation Summary & Audit'
                  : 'Entity Details & Inspection'}
              </span>
              <button
                onClick={() => {
                  setActiveDrawer(null);
                  setSelectedEntity(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors btn-press"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
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
                />
              )}

              {selectedEntity && !activeDrawer && (
                <EntityInspector
                  entity={selectedEntity}
                  onClose={() => setSelectedEntity(null)}
                  edges={edges}
                  nodes={nodes}
                  isFrozen={frozenNodeIds.has(selectedEntity.id)}
                  onToggleFreeze={handleToggleFreeze}
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
