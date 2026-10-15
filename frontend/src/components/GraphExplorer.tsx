import React, { useEffect, useRef, useState, useMemo } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCw, 
  SlidersHorizontal, 
  Search, 
  Type, 
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { GraphNodeData, GraphEdgeData } from '../types';

interface GraphExplorerProps {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  selectedEntity: GraphNodeData | null;
  onSelectEntity: (entity: GraphNodeData | null) => void;
  frozenNodeIds: Set<string>;
  highlightedRingActive: boolean;
  setHighlightedRingActive: (active: boolean) => void;
  highlightedNodeIds?: string[];
  highlightedEdgeId?: string | null;
  searchFilter?: string;
  setSearchFilter?: (q: string) => void;
  minRiskScore?: number;
  minAmount?: number;
  filterTypes?: { [key: string]: boolean };
  layoutName?: 'cose' | 'concentric' | 'breadthfirst' | 'circle';
  onOpenFilters?: () => void;
  timeRange?: string;
  setTimeRange?: (tr: string) => void;
}

interface HoverTooltipData {
  x: number;
  y: number;
  type: 'node' | 'edge';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  details: { label: string; value: string }[];
}

export const GraphExplorer: React.FC<GraphExplorerProps> = ({
  nodes,
  edges,
  selectedEntity,
  onSelectEntity,
  frozenNodeIds,
  highlightedRingActive,
  setHighlightedRingActive,
  highlightedNodeIds = [],
  highlightedEdgeId = null,
  searchFilter = '',
  setSearchFilter,
  minRiskScore = 0,
  minAmount = 0,
  filterTypes = { account: true, device: true, merchant: true, complaint: true },
  layoutName = 'cose',
  onOpenFilters,
  timeRange = 'Last 24 hours',
  setTimeRange,
}) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [showLabels, setShowLabels] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [hoverData, setHoverData] = useState<HoverTooltipData | null>(null);

  // Filter nodes based on sliders, search, and type
  const visibleNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (!filterTypes[n.type]) return false;
      if (selectedTypeFilter !== 'ALL' && n.type !== selectedTypeFilter) return false;
      if (n.riskScore < minRiskScore) return false;

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchLabel = n.label.toLowerCase().includes(q);
        const matchUpi = n.upiId?.toLowerCase().includes(q);
        const matchDev = n.deviceId?.toLowerCase().includes(q);
        const matchBank = n.bankName?.toLowerCase().includes(q);
        return matchLabel || matchUpi || matchDev || matchBank;
      }
      return true;
    });
  }, [nodes, filterTypes, selectedTypeFilter, minRiskScore, searchFilter]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleEdges = useMemo(() => {
    return edges.filter((e) => {
      if (e.amount > 0 && e.amount < minAmount) return false;
      return visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target);
    });
  }, [edges, minAmount, visibleNodeIds]);

  // Color & styling helper based on Role & Status
  const getNodeColor = (node: GraphNodeData, isFrozen: boolean, isDark: boolean): string => {
    if (isFrozen) return isDark ? '#1E293B' : '#E2E8F0';
    if (node.role === 'source_victim') return '#0284C7'; // Sky/Cyan Blue
    if (node.role === 'aggregator_mule') return '#E11D48'; // Rose / Crimson
    if (node.role === 'secondary_mule') return '#EA580C'; // Coral / Orange
    if (node.role === 'cashout_merchant') return '#7C3AED'; // Violet / Purple
    if (node.role === 'device_farm') return '#D97706'; // Amber
    if (node.role === 'complaint' || node.type === 'complaint') return '#DC2626'; // Red
    if (node.role === 'verified_control') return isDark ? '#059669' : '#10B981'; // Emerald

    if (node.type === 'device') return '#D97706';
    if (node.type === 'merchant') return '#7C3AED';
    if (node.riskScore > 85) return '#E11D48';
    if (node.riskScore > 50) return '#EA580C';
    return isDark ? '#059669' : '#10B981';
  };

  const getNodeBorderColor = (node: GraphNodeData, isFrozen: boolean, isDark: boolean): string => {
    if (isFrozen) return isDark ? '#475569' : '#94A3B8';
    if (node.role === 'source_victim') return '#38BDF8';
    if (node.role === 'aggregator_mule') return '#FDA4AF';
    if (node.role === 'secondary_mule') return '#FDBA74';
    if (node.role === 'cashout_merchant') return '#C4B5FD';
    if (node.role === 'device_farm') return '#FCD34D';
    if (node.role === 'complaint' || node.type === 'complaint') return '#FCA5A5';
    if (node.role === 'verified_control') return '#6EE7B7';
    return node.riskScore > 75 ? '#FDA4AF' : (isDark ? '#34D399' : '#059669');
  };

  const getNodeSize = (node: GraphNodeData): number => {
    if (node.role === 'aggregator_mule') return 44;
    if (node.role === 'cashout_merchant') return 42;
    if (node.role === 'secondary_mule') return 38;
    if (node.role === 'source_victim') return 40;
    if (node.type === 'device') return 40;
    if (node.type === 'complaint') return 40;
    return 36;
  };

  // Cytoscape initialization
  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = theme === 'dark';

    const cyElements = [
      ...visibleNodes.map((n) => {
        const isFrozen = frozenNodeIds.has(n.id);
        const size = getNodeSize(n);
        return {
          data: {
            id: n.id,
            label: n.label,
            type: n.type,
            role: n.role,
            riskScore: n.riskScore,
            isFrozen: isFrozen,
            subText: n.subText,
            upiId: n.upiId,
            bankName: n.bankName,
            accountNo: n.accountNo,
            deviceId: n.deviceId,
            deviceModel: n.deviceModel,
            disputeAmount: n.disputeAmount,
            color: getNodeColor(n, isFrozen, isDark),
            borderColor: getNodeBorderColor(n, isFrozen, isDark),
            nodeSize: size,
          },
        };
      }),
      ...visibleEdges.map((e) => {
        const isMuleEdge = e.isSuspicious;
        const isSevered = frozenNodeIds.has(e.source) || frozenNodeIds.has(e.target);
        return {
          data: {
            id: e.id,
            source: e.source,
            target: e.target,
            amount: e.amount,
            channel: e.channel,
            utr: e.utr,
            ruleTriggered: e.ruleTriggered,
            label: e.amount > 0 
              ? `₹${(e.amount / 1000).toFixed(0)}k` 
              : e.channel === 'DEVICE_BIND' ? 'Bound' : 'Dispute',
            isSuspicious: e.isSuspicious,
            isSevered: isSevered,
            lineStyle: e.channel === 'DEVICE_BIND' ? 'dashed' : 'solid',
            lineColor: isSevered 
              ? (isDark ? '#1F332C' : '#CBD5E1') 
              : isMuleEdge 
              ? '#E11D48' 
              : e.channel === 'DEVICE_BIND'
              ? '#D97706'
              : (isDark ? '#3E584F' : '#94A3B8'),
            width: e.amount > 200000 ? 3.8 : e.amount > 50000 ? 2.8 : 1.8,
          },
        };
      }),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements: cyElements,
      style: [
        {
          selector: 'node',
          style: {
            'label': showLabels ? 'data(label)' : '',
            'color': isDark ? '#F8FAFC' : '#0F172A',
            'font-size': '11px',
            'font-family': 'Inter, system-ui, sans-serif',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 6,
            'background-color': 'data(color)',
            'border-width': 2.5,
            'border-color': 'data(borderColor)',
            'width': 'data(nodeSize)',
            'height': 'data(nodeSize)',
            'text-outline-width': 2,
            'text-outline-color': isDark ? '#0A1210' : '#FFFFFF',
            'transition-property': 'background-color, line-color, target-arrow-color, opacity, border-color, underlay-color, underlay-opacity',
            'transition-duration': 0.25,
          },
        },
        {
          selector: 'node[type = "device"]',
          style: {
            'shape': 'diamond',
          },
        },
        {
          selector: 'node[type = "merchant"]',
          style: {
            'shape': 'hexagon',
          },
        },
        {
          selector: 'node[type = "complaint"]',
          style: {
            'shape': 'octagon',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#06B6D4',
            'underlay-color': '#06B6D4',
            'underlay-padding': 8,
            'underlay-opacity': 0.35,
          } as any,
        },
        {
          selector: 'node[?isFrozen]',
          style: {
            'opacity': 0.35,
            'background-color': isDark ? '#1E293B' : '#E2E8F0',
            'border-color': '#64748B',
            'border-style': 'dashed',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 'data(width)',
            'line-color': 'data(lineColor)',
            'line-style': 'data(lineStyle)' as any,
            'target-arrow-color': 'data(lineColor)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.15,
            'label': showLabels ? 'data(label)' : '',
            'font-size': '10px',
            'color': isDark ? '#94A3B8' : '#64748B',
            'font-weight': 600,
            'text-outline-width': 1.5,
            'text-outline-color': isDark ? '#0A1210' : '#FFFFFF',
            'text-rotation': 'autorotate',
          },
        },
        {
          selector: 'edge[?isSevered]',
          style: {
            'opacity': 0.2,
            'line-color': '#94A3B8',
            'target-arrow-color': '#94A3B8',
          },
        },
        {
          selector: '.highlighted-ring',
          style: {
            'line-color': '#F59E0B',
            'target-arrow-color': '#F59E0B',
            'width': 4.5,
            'underlay-color': '#F59E0B',
            'underlay-padding': 4,
            'underlay-opacity': 0.35,
          } as any,
        },
        {
          selector: '.cross-highlighted-node',
          style: {
            'border-width': 4,
            'border-color': '#06B6D4',
            'underlay-color': '#06B6D4',
            'underlay-padding': 10,
            'underlay-opacity': 0.45,
            'z-index': 999,
          } as any,
        },
        {
          selector: '.cross-highlighted-edge',
          style: {
            'width': 5,
            'line-color': '#06B6D4',
            'target-arrow-color': '#06B6D4',
            'underlay-color': '#06B6D4',
            'underlay-padding': 6,
            'underlay-opacity': 0.45,
            'z-index': 998,
          } as any,
        },
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.15,
          },
        },
      ],
      layout: getLayoutConfig(layoutName),
    });

    // Selection handlers
    cy.on('tap', 'node', (evt: EventObject) => {
      const nodeData = nodes.find((n) => n.id === evt.target.id());
      if (nodeData) {
        onSelectEntity(nodeData);
      }
    });

    cy.on('tap', (evt: EventObject) => {
      if (evt.target === cy) {
        onSelectEntity(null);
      }
    });

    // Hover Tooltips on Nodes
    cy.on('mouseover', 'node', (evt: EventObject) => {
      const target = evt.target;
      const data = target.data();
      const nodeData = nodes.find((n) => n.id === data.id);
      if (!nodeData || !containerRef.current) return;

      const pos = target.renderedPosition();
      const roleLabel = nodeData.role 
        ? nodeData.role.replace(/_/g, ' ').toUpperCase()
        : nodeData.type.toUpperCase();

      const details: { label: string; value: string }[] = [];
      if (nodeData.upiId) details.push({ label: 'UPI VPA', value: nodeData.upiId });
      if (nodeData.bankName) details.push({ label: 'Bank', value: nodeData.bankName });
      if (nodeData.accountNo) details.push({ label: 'Account', value: nodeData.accountNo });
      if (nodeData.deviceId) details.push({ label: 'Device ID', value: nodeData.deviceId });
      if (nodeData.deviceModel) details.push({ label: 'Model', value: nodeData.deviceModel });
      if (nodeData.disputeAmount) details.push({ label: 'Dispute', value: `₹${nodeData.disputeAmount.toLocaleString('en-IN')}` });

      setHoverData({
        x: pos.x,
        y: pos.y,
        type: 'node',
        title: nodeData.label,
        subtitle: nodeData.subText || roleLabel,
        badge: `Risk: ${nodeData.riskScore}/100`,
        badgeColor: nodeData.riskScore > 75 ? 'bg-rose-500 text-white' : nodeData.riskScore > 40 ? 'bg-amber-500 text-black' : 'bg-emerald-500 text-white',
        details,
      });
    });

    cy.on('mouseout', 'node', () => {
      setHoverData(null);
    });

    // Hover Tooltips on Edges
    cy.on('mouseover', 'edge', (evt: EventObject) => {
      const target = evt.target;
      const data = target.data();
      const edgeData = edges.find((e) => e.id === data.id);
      if (!edgeData || !containerRef.current) return;

      const pos = target.midpoint();
      const details: { label: string; value: string }[] = [];
      if (edgeData.utr) details.push({ label: 'UTR', value: edgeData.utr });
      if (edgeData.channel) details.push({ label: 'Channel', value: edgeData.channel });
      if (edgeData.ruleTriggered) details.push({ label: 'Signal', value: edgeData.ruleTriggered });

      setHoverData({
        x: pos.x,
        y: pos.y,
        type: 'edge',
        title: edgeData.amount > 0 ? `₹${edgeData.amount.toLocaleString('en-IN')}` : edgeData.channel,
        subtitle: `${edgeData.source} → ${edgeData.target}`,
        badge: edgeData.isSuspicious ? 'Flagged Flow' : 'Standard',
        badgeColor: edgeData.isSuspicious ? 'bg-rose-500 text-white' : 'bg-slate-500 text-white',
        details,
      });
    });

    cy.on('mouseout', 'edge', () => {
      setHoverData(null);
    });

    cyRef.current = cy;

    // Handle container resize cleanly
    const resizeObserver = new ResizeObserver(() => {
      if (cyRef.current) {
        cyRef.current.resize();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      cy.destroy();
    };
  }, [
    visibleNodes.length, 
    visibleEdges.length, 
    layoutName, 
    frozenNodeIds, 
    theme, 
    showLabels
  ]);

  // Spotlight ring effect
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    if (highlightedRingActive) {
      const ringNodeIds = [
        'ACC_VICTIM_1',
        'ACC_PRIMARY_MULE',
        'ACC_MULE_2',
        'ACC_MULE_3',
        'ACC_MULE_4',
        'DEV_FARM_1',
        'MERCH_CASHOUT',
      ];
      cy.elements().addClass('dimmed');
      ringNodeIds.forEach((id) => cy.getElementById(id).removeClass('dimmed'));
      cy.edges().forEach((edge) => {
        const src = edge.data('source');
        const tgt = edge.data('target');
        if (ringNodeIds.includes(src) && ringNodeIds.includes(tgt)) {
          edge.removeClass('dimmed');
          edge.addClass('highlighted-ring');
        }
      });
    } else {
      cy.elements().removeClass('dimmed');
      cy.edges().removeClass('highlighted-ring');
    }
  }, [highlightedRingActive]);

  // Cross-highlighting from Complaints Panel or Fraud Timeline Panel
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    const hasHighlight = (highlightedNodeIds && highlightedNodeIds.length > 0) || highlightedEdgeId;

    if (hasHighlight) {
      cy.elements().removeClass('cross-highlighted-node cross-highlighted-edge');
      cy.elements().addClass('dimmed');

      // Highlight target nodes
      if (highlightedNodeIds && highlightedNodeIds.length > 0) {
        highlightedNodeIds.forEach((id) => {
          const ele = cy.getElementById(id);
          ele.removeClass('dimmed');
          ele.addClass('cross-highlighted-node');
        });
      }

      // Highlight target edge
      if (highlightedEdgeId) {
        const edgeEle = cy.getElementById(highlightedEdgeId);
        edgeEle.removeClass('dimmed');
        edgeEle.addClass('cross-highlighted-edge');

        // Also ensure connected source/target nodes are clearly visible
        const src = edgeEle.data('source');
        const tgt = edgeEle.data('target');
        if (src) cy.getElementById(src).removeClass('dimmed');
        if (tgt) cy.getElementById(tgt).removeClass('dimmed');
      }
    } else {
      cy.elements().removeClass('cross-highlighted-node cross-highlighted-edge');
      if (!highlightedRingActive) {
        cy.elements().removeClass('dimmed');
      }
    }
  }, [highlightedNodeIds, highlightedEdgeId, highlightedRingActive]);

  function getLayoutConfig(lName: string) {
    if (lName === 'cose') {
      return {
        name: 'cose',
        idealEdgeLength: 130,
        nodeOverlap: 25,
        refresh: 20,
        fit: true,
        padding: 60,
        randomize: false,
        componentSpacing: 110,
        nodeRepulsion: 450000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 75,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      };
    }
    return { name: lName, fit: true, padding: 60 };
  }

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 60);
  const handleReset = () => {
    cyRef.current?.reset();
    cyRef.current?.fit(undefined, 60);
  };

  return (
    <div
      className={`rounded-2xl border transition-all h-[650px] flex flex-col relative overflow-hidden ${
        theme === 'dark'
          ? 'bg-[#111E1A] border-[#1A332B]'
          : 'bg-white border-slate-200/90 shadow-sm'
      }`}
    >
      {/* Top Card Header */}
      <div className="p-4 border-b border-inherit flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3
              className={`text-sm font-bold tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              Fraud-Ring Network Graph
            </h3>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                theme === 'dark'
                  ? 'bg-[#1A312A] text-emerald-300'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {visibleNodes.length} active entities
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Real-time transaction hops, mule dispersion trails, and device binding linkages
          </p>
        </div>

        {/* Action Controls Top Right */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* Legend Toggle Button */}
          <button
            onClick={() => setShowLegend(!showLegend)}
            title="Toggle graph legend"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all btn-press ${
              showLegend
                ? 'bg-emerald-800 text-white border-emerald-700 font-bold'
                : theme === 'dark'
                ? 'bg-[#142320] border-[#1E3B33] text-slate-300 hover:text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Legend</span>
            {showLegend ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Reload button */}
          <button
            onClick={handleReset}
            title="Reset graph view & layout"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors btn-press"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div
        className={`px-4 py-2.5 border-b border-inherit flex flex-wrap items-center justify-between gap-3 ${
          theme === 'dark' ? 'bg-[#0E1815]' : 'bg-[#FAFCFB]'
        }`}
      >
        {/* Search input */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search VPA, account, IMEI..."
            value={searchFilter}
            onChange={(e) => setSearchFilter && setSearchFilter(e.target.value)}
            className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all ${
              theme === 'dark'
                ? 'bg-[#142320] border-[#1E3B33] text-slate-200 placeholder-slate-500'
                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
            }`}
          />
        </div>

        {/* Dropdowns & Filters Button */}
        <div className="flex items-center gap-2">
          {/* Entity Type Select */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className={`px-2.5 py-1.5 text-xs rounded-xl border focus:outline-none cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#142320] border-[#1E3B33] text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">All entity types</option>
            <option value="account">Accounts only</option>
            <option value="device">Devices only</option>
            <option value="merchant">Merchants only</option>
            <option value="complaint">Complaints only</option>
          </select>

          {/* Time Window Select */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange && setTimeRange(e.target.value)}
            className={`px-2.5 py-1.5 text-xs rounded-xl border focus:outline-none cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#142320] border-[#1E3B33] text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <option value="Last 24 hours">Last 24 hours</option>
            <option value="Last 7 days">Last 7 days</option>
            <option value="All time">All time</option>
          </select>

          {/* Open Filters Slidebar */}
          <button
            onClick={onOpenFilters}
            title="Open threshold slidebars"
            className={`p-2 rounded-xl border transition-all btn-press ${
              theme === 'dark'
                ? 'bg-[#142320] border-[#1E3B33] text-slate-300 hover:text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 dot-grid overflow-hidden">
        {/* Status indicator top left */}
        <div className="absolute top-3 left-4 z-10 flex items-center gap-2 text-[11px] font-medium text-slate-400 bg-white/80 dark:bg-black/60 px-3 py-1 rounded-full backdrop-blur-md border border-slate-200/60 dark:border-slate-800 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Interactive Canvas • Cytoscape Engine</span>
        </div>

        {/* Cytoscape Container */}
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Hover Tooltip Popover */}
        {hoverData && (
          <div
            className={`absolute z-30 pointer-events-none p-3 rounded-xl border shadow-xl backdrop-blur-md transition-opacity duration-150 text-xs w-60 ${
              theme === 'dark'
                ? 'bg-[#0E1715]/95 border-[#1A332B] text-slate-200'
                : 'bg-white/95 border-slate-200 text-slate-800'
            }`}
            style={{
              left: `${Math.min(Math.max(hoverData.x + 15, 10), (containerRef.current?.clientWidth || 500) - 250)}px`,
              top: `${Math.min(Math.max(hoverData.y - 20, 10), (containerRef.current?.clientHeight || 400) - 180)}px`,
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="font-bold truncate text-[12px]">{hoverData.title}</span>
              {hoverData.badge && (
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold shrink-0 ${hoverData.badgeColor}`}>
                  {hoverData.badge}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mb-2 truncate">{hoverData.subtitle}</p>
            <div className="space-y-1 border-t border-inherit pt-1.5 text-[10px]">
              {hoverData.details.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-slate-400">{d.label}:</span>
                  <span className="font-mono font-medium truncate max-w-[140px]">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Interactive Legend */}
        {showLegend && (
          <div
            className={`absolute top-12 right-4 z-20 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md max-w-xs transition-all text-xs ${
              theme === 'dark'
                ? 'bg-[#0C1513]/95 border-[#1E3B33] text-slate-200'
                : 'bg-white/95 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-inherit">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                Visual Legend & Roles
              </span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-[11px]">
              <div>
                <p className="font-semibold text-[10px] text-slate-400 uppercase mb-1">Entities</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7] ring-1 ring-sky-400 shrink-0" />
                    <span>Victim / Source</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] ring-1 ring-rose-400 shrink-0" />
                    <span>Aggregator Mule</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EA580C] ring-1 ring-orange-400 shrink-0" />
                    <span>Secondary Mule</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#7C3AED] ring-1 ring-purple-400 shrink-0" />
                    <span>Cashout QR Point</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rotate-45 bg-[#D97706] ring-1 ring-amber-400 shrink-0" />
                    <span>Device Farm (IMEI)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#DC2626] ring-1 ring-red-400 shrink-0" />
                    <span>NCRP Dispute</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-inherit pt-2">
                <p className="font-semibold text-[10px] text-slate-400 uppercase mb-1">Connections</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-0.5 bg-[#E11D48]" />
                    <span>Flagged UPI Transfer (Suspicious Hop)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-0.5 border-t border-dashed border-[#D97706]" />
                    <span>Shared Hardware / Device Binding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-0.5 bg-slate-400" />
                    <span>Verified / Standard Transfer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Bottom Toolbar */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-lg transition-all bg-white/90 dark:bg-[#121F1B]/90 border-slate-200 dark:border-[#1E3B33]">
          <button
            onClick={handleFit}
            title="Fit graph to canvas"
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors btn-press"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowLabels(!showLabels)}
            title={showLabels ? 'Hide labels' : 'Show labels'}
            className={`p-1.5 rounded-full transition-colors btn-press ${
              showLabels
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700" />

          {/* Spotlight Mule Ring */}
          <button
            onClick={() => setHighlightedRingActive(!highlightedRingActive)}
            title="Spotlight suspicious ring"
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all btn-press ${
              highlightedRingActive
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-500 dark:text-slate-300 hover:text-amber-500'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Spotlight Ring</span>
          </button>

          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors btn-press"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors btn-press"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
