import React, { useEffect, useRef, useState, useMemo } from 'react';
import cytoscape, { Core, EventObject } from 'cytoscape';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Search, 
  Type, 
  AlertTriangle,
  SlidersHorizontal,
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
  // Labels are hidden by default to keep the graph ultra-clean; hovering over any node/edge dynamically shows its label on canvas
  const [showLabels, setShowLabels] = useState(false);

  // Filter visible nodes
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

  // Color & styling helper matching the reference palette
  const getNodeColor = (node: GraphNodeData, isFrozen: boolean): string => {
    if (isFrozen) return '#1E293B';
    if (node.id === 'ACC_VICTIM_1') return '#14B8A6'; // Teal circle (anand.verma@axis)
    if (node.id === 'ACC_LEGIT_1') return '#10B981'; // Green circle (priya.nair@okhdfc)
    if (node.type === 'merchant') return '#9333EA'; // Purple hexagon
    if (node.type === 'device') return '#F97316'; // Orange diamond
    if (node.type === 'complaint') return '#E11D48'; // Pink-Red octagon (NCRP-2026-8812)
    // Fraud mules (rohit.sharma, karan.singh, deepak.gupta, amit.patel)
    if (node.riskScore > 50 || node.role?.includes('mule')) return '#E11D48';
    return '#10B981';
  };

  const getNodeBorderColor = (node: GraphNodeData, isFrozen: boolean): string => {
    if (isFrozen) return '#64748B';
    if (node.id === 'ACC_VICTIM_1') return '#2DD4BF';
    if (node.id === 'ACC_LEGIT_1') return '#34D399';
    if (node.type === 'merchant') return '#C084FC';
    if (node.type === 'device') return '#FDBA74';
    if (node.type === 'complaint') return '#FDA4AF';
    if (node.riskScore > 50 || node.role?.includes('mule')) return '#FDA4AF';
    return '#34D399';
  };

  const getNodeSize = (node: GraphNodeData): number => {
    if (node.id === 'ACC_PRIMARY_MULE') return 46;
    if (node.type === 'merchant') return 44;
    if (node.type === 'device') return 42;
    if (node.type === 'complaint') return 42;
    return 38;
  };

  const getEdgeLabel = (e: GraphEdgeData): string => {
    if (e.channel === 'DEVICE_BIND') return 'BasedOn';
    if (e.channel === 'COMPLAINT_LINK') return 'Dispute';
    if (e.source === 'ACC_VICTIM_1' && e.target === 'ACC_PRIMARY_MULE') return 'Transaction';
    if (e.amount > 0) return `Linked`;
    return 'Linked';
  };

  // Cytoscape initialization
  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = theme === 'dark';

    // Preset cluster coordinates to guarantee the exact two-cluster split from reference
    const getInitialPosition = (id: string) => {
      const positions: Record<string, { x: number; y: number }> = {
        // Left Cluster: Mule Ring & Device Collusion
        'ACC_VICTIM_1': { x: 440, y: 390 },
        'COMPLAINT_NCRP_8812': { x: 550, y: 290 },
        'ACC_PRIMARY_MULE': { x: 310, y: 300 },
        'ACC_MULE_2': { x: 300, y: 440 },
        'ACC_MULE_3': { x: 280, y: 120 },
        'ACC_MULE_4': { x: 210, y: 200 },
        'DEV_FARM_1': { x: 190, y: 350 },
        'MERCH_CASHOUT': { x: 380, y: 210 },
        // Right Cluster: Legitimate Baseline Control
        'ACC_LEGIT_1': { x: 740, y: 150 },
        'DEV_USER_LEGIT': { x: 670, y: 270 },
        'MERCH_GROCERY': { x: 810, y: 290 },
      };
      return positions[id] || undefined;
    };

    const cyElements = [
      ...visibleNodes.map((n) => {
        const isFrozen = frozenNodeIds.has(n.id);
        const size = getNodeSize(n);
        const pos = getInitialPosition(n.id);
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
            color: getNodeColor(n, isFrozen),
            borderColor: getNodeBorderColor(n, isFrozen),
            nodeSize: size,
          },
          position: pos ? { x: pos.x, y: pos.y } : undefined,
        };
      }),
      ...visibleEdges.map((e) => {
        const isMuleEdge = e.isSuspicious;
        const isSevered = frozenNodeIds.has(e.source) || frozenNodeIds.has(e.target);
        const isDevice = e.channel === 'DEVICE_BIND';
        return {
          data: {
            id: e.id,
            source: e.source,
            target: e.target,
            amount: e.amount,
            channel: e.channel,
            utr: e.utr,
            ruleTriggered: e.ruleTriggered,
            label: getEdgeLabel(e),
            isSuspicious: e.isSuspicious,
            isSevered: isSevered,
            lineStyle: isDevice ? 'dashed' : 'solid',
            lineColor: isSevered 
              ? (isDark ? '#1F332C' : '#CBD5E1') 
              : isDevice
              ? '#F97316'
              : isMuleEdge 
              ? '#E11D48' 
              : '#10B981',
            width: isMuleEdge ? 2.2 : isDevice ? 1.8 : 1.6,
          },
        };
      }),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements: cyElements,
      style: [
        // Base Node Style: No label by default (clean look), animated hover transitions
        {
          selector: 'node',
          style: {
            'label': showLabels ? 'data(label)' : '',
            'color': '#F8FAFC',
            'font-size': '10px',
            'font-family': 'Inter, system-ui, sans-serif',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 7,
            'background-color': 'data(color)',
            'border-width': 2.5,
            'border-color': 'data(borderColor)',
            'width': 'data(nodeSize)',
            'height': 'data(nodeSize)',
            'text-outline-width': 2,
            'text-outline-color': '#060E0B',
            'underlay-color': 'data(color)',
            'underlay-padding': 2,
            'underlay-opacity': 0,
            'transition-property': 'background-color, line-color, target-arrow-color, opacity, border-color, border-width, underlay-color, underlay-opacity, underlay-padding, width, height, font-size',
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
        // Interactive Hover State on Node: reveals label directly on canvas with smooth halo
        {
          selector: '.hovered-node',
          style: {
            'label': 'data(label)',
            'color': '#FFFFFF',
            'font-size': '11px',
            'font-weight': 700,
            'text-valign': 'bottom',
            'text-margin-y': 9,
            'text-outline-width': 2.5,
            'text-outline-color': '#060E0B',
            'border-width': 3.5,
            'border-color': '#FFFFFF',
            'underlay-color': 'data(color)',
            'underlay-padding': 8,
            'underlay-opacity': 0.45,
            'z-index': 9999,
          } as any,
        },
        // Selection State
        {
          selector: 'node:selected',
          style: {
            'label': 'data(label)',
            'border-width': 3.5,
            'border-color': '#06B6D4',
            'underlay-color': '#06B6D4',
            'underlay-padding': 8,
            'underlay-opacity': 0.4,
          } as any,
        },
        {
          selector: 'node[?isFrozen]',
          style: {
            'opacity': 0.35,
            'background-color': '#1E293B',
            'border-color': '#64748B',
            'border-style': 'dashed',
          },
        },
        // Base Edge Style: Clean, no text unless hovered
        {
          selector: 'edge',
          style: {
            'width': 'data(width)',
            'line-color': 'data(lineColor)',
            'line-style': 'data(lineStyle)' as any,
            'target-arrow-color': 'data(lineColor)',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.1,
            'label': showLabels ? 'data(label)' : '',
            'font-size': '9px',
            'color': '#94A3B8',
            'font-weight': 600,
            'text-outline-width': 1.5,
            'text-outline-color': '#060E0B',
            'text-rotation': 'autorotate',
            'underlay-color': 'data(lineColor)',
            'underlay-padding': 0,
            'underlay-opacity': 0,
            'transition-property': 'width, line-color, target-arrow-color, opacity, underlay-color, underlay-opacity, underlay-padding',
            'transition-duration': 0.25,
          },
        },
        // Interactive Hover State on Edge: reveals label directly on connection
        {
          selector: '.hovered-edge',
          style: {
            'label': 'data(label)',
            'color': '#FFFFFF',
            'font-size': '10px',
            'font-weight': 700,
            'text-outline-width': 2,
            'text-outline-color': '#060E0B',
            'width': 3.5,
            'underlay-color': 'data(lineColor)',
            'underlay-padding': 6,
            'underlay-opacity': 0.45,
            'z-index': 9998,
          } as any,
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
            'label': 'data(label)',
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
            'label': 'data(label)',
            'width': 4.5,
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
      layout: {
        name: 'preset',
        fit: true,
        padding: 60,
      },
    });

    // Tap handlers
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

    // Hover Event Handlers: Highlight node/edge directly on canvas (NO HTML popup div)
    cy.on('mouseover', 'node', (evt: EventObject) => {
      evt.target.addClass('hovered-node');
      evt.target.connectedEdges().addClass('hovered-edge');
    });

    cy.on('mouseout', 'node', (evt: EventObject) => {
      evt.target.removeClass('hovered-node');
      evt.target.connectedEdges().removeClass('hovered-edge');
    });

    cy.on('mouseover', 'edge', (evt: EventObject) => {
      evt.target.addClass('hovered-edge');
    });

    cy.on('mouseout', 'edge', (evt: EventObject) => {
      evt.target.removeClass('hovered-edge');
    });

    // Subtle ambient breathing animation for primary mule hub to keep canvas alive
    const muleNode = cy.getElementById('ACC_PRIMARY_MULE');
    let isPulse = false;
    const pulseInterval = setInterval(() => {
      if (!cyRef.current) return;
      isPulse = !isPulse;
      if (muleNode && muleNode.length > 0 && !muleNode.hasClass('hovered-node')) {
        muleNode.animate({
          style: {
            'underlay-opacity': isPulse ? 0.35 : 0.05,
            'underlay-padding': isPulse ? 8 : 2,
          },
          duration: 900,
        });
      }
    }, 1100);

    cyRef.current = cy;

    // Handle container resize cleanly
    const resizeObserver = new ResizeObserver(() => {
      if (cyRef.current) {
        cyRef.current.resize();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      clearInterval(pulseInterval);
      resizeObserver.disconnect();
      cy.destroy();
    };
  }, [
    visibleNodes.length, 
    visibleEdges.length, 
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

  // Cross-highlighting from Complaints or Timeline
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    const hasHighlight = (highlightedNodeIds && highlightedNodeIds.length > 0) || highlightedEdgeId;

    if (hasHighlight) {
      cy.elements().removeClass('cross-highlighted-node cross-highlighted-edge');
      cy.elements().addClass('dimmed');

      if (highlightedNodeIds && highlightedNodeIds.length > 0) {
        highlightedNodeIds.forEach((id) => {
          const ele = cy.getElementById(id);
          ele.removeClass('dimmed');
          ele.addClass('cross-highlighted-node');
        });
      }

      if (highlightedEdgeId) {
        const edgeEle = cy.getElementById(highlightedEdgeId);
        edgeEle.removeClass('dimmed');
        edgeEle.addClass('cross-highlighted-edge');
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

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 60);

  return (
    <div
      className={`rounded-2xl border transition-all h-full w-full flex flex-col relative overflow-hidden select-none ${
        theme === 'dark'
          ? 'bg-[#091612] border-[#142921]'
          : 'bg-white border-slate-200/90 shadow-sm'
      }`}
    >
      {/* Top Inner Header Bar */}
      <div className="px-5 py-3.5 border-b border-inherit flex flex-wrap items-center justify-between gap-4">
        {/* Title + 11 Entities Badge + Subtitle */}
        <div>
          <div className="flex items-center gap-2">
            <h2
              className={`text-sm font-bold tracking-tight ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              Network graph
            </h2>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                theme === 'dark'
                  ? 'bg-[#133026] text-[#34D399]'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {visibleNodes.length} entities
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Connected activity across complaints, accounts, and devices
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2.5">
          {/* Find an entity... Search */}
          <div className="relative min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Find an entity..."
              value={searchFilter}
              onChange={(e) => setSearchFilter && setSearchFilter(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none transition-all ${
                theme === 'dark'
                  ? 'bg-[#0E1E19] border-[#18362B] text-slate-200 placeholder-slate-500 focus:border-emerald-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-emerald-500'
              }`}
            />
          </div>

          {/* All entity types Dropdown */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className={`px-3 py-1.5 text-xs rounded-xl border focus:outline-none cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#0E1E19] border-[#18362B] text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="ALL">All entity types</option>
            <option value="account">Accounts only</option>
            <option value="device">Devices only</option>
            <option value="merchant">Merchants only</option>
            <option value="complaint">Complaints only</option>
          </select>

          {/* Last 24 hours Dropdown */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange && setTimeRange(e.target.value)}
            className={`px-3 py-1.5 text-xs rounded-xl border focus:outline-none cursor-pointer ${
              theme === 'dark'
                ? 'bg-[#0E1E19] border-[#18362B] text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="Last 24 hours">Last 24 hours</option>
            <option value="Last 7 days">Last 7 days</option>
            <option value="All time">All time</option>
          </select>

          {/* Filter Sliders Button */}
          <button
            onClick={onOpenFilters}
            title="Open filters slidebar"
            className={`p-2 rounded-xl border transition-all btn-press ${
              theme === 'dark'
                ? 'bg-[#0E1E19] border-[#18362B] text-slate-400 hover:text-white'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 dot-grid overflow-hidden">
        {/* Top-Left Floating Badge inside Canvas */}
        <div className="absolute top-4 left-5 z-10 flex items-center gap-2 text-[11px] font-medium text-slate-400 bg-[#07130F]/85 px-3 py-1 rounded-full backdrop-blur-md border border-[#163328] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span>Investigation network • 15 Oct 2026</span>
        </div>

        {/* Cytoscape Container */}
        <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Bottom Toolbar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md border shadow-lg transition-all bg-[#091713]/90 border-[#18362B]">
          {/* Fit to screen */}
          <button
            onClick={handleFit}
            title="Fit graph"
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#142821] transition-colors btn-press"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Labels */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            title={showLabels ? 'Show labels on hover only' : 'Always show labels'}
            className={`p-1.5 rounded-full transition-colors btn-press ${
              showLabels
                ? 'text-[#34D399]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-[#1C3A2F]" />

          {/* Spotlight Mule Ring */}
          <button
            onClick={() => setHighlightedRingActive(!highlightedRingActive)}
            title="Spotlight suspicious ring"
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all btn-press ${
              highlightedRingActive
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Spotlight</span>
          </button>

          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#142821] transition-colors btn-press"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-[#142821] transition-colors btn-press"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
