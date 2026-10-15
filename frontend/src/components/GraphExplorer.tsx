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
  X,
  ArrowRight,
  ArrowLeft,
  Lock,
  Unlock,
  Radio,
  ExternalLink,
  ShieldAlert
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
  onToggleFreeze?: (nodeId: string) => void;
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
  onToggleFreeze,
}) => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  // Labels are hidden by default; hovering or selecting reveals them dynamically
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

  // Compute connections for the currently selected node
  const activeConnections = useMemo(() => {
    if (!selectedEntity) return [];
    const directEdges = edges.filter(
      (e) => e.source === selectedEntity.id || e.target === selectedEntity.id
    );

    return directEdges.map((e) => {
      const isOutgoing = e.source === selectedEntity.id;
      const otherNodeId = isOutgoing ? e.target : e.source;
      const otherNode = nodes.find((n) => n.id === otherNodeId);
      return {
        edge: e,
        isOutgoing,
        otherNode,
      };
    });
  }, [selectedEntity, edges, nodes]);

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

    // Preset cluster coordinates
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
        // Selected Active Hub Node (When clicked)
        {
          selector: '.active-hub-node',
          style: {
            'label': 'data(label)',
            'color': '#FFFFFF',
            'font-size': '11px',
            'font-weight': 700,
            'text-valign': 'bottom',
            'text-margin-y': 9,
            'text-outline-width': 2.5,
            'text-outline-color': '#060E0B',
            'border-width': 4,
            'border-color': '#FFFFFF',
            'underlay-color': '#06B6D4',
            'underlay-padding': 12,
            'underlay-opacity': 0.55,
            'z-index': 9999,
          } as any,
        },
        // Connected Neighbor Nodes of Selected Hub
        {
          selector: '.active-neighbor-node',
          style: {
            'label': 'data(label)',
            'color': '#FFFFFF',
            'font-size': '10px',
            'font-weight': 600,
            'text-valign': 'bottom',
            'text-margin-y': 8,
            'text-outline-width': 2,
            'text-outline-color': '#060E0B',
            'border-width': 3.5,
            'border-color': '#38BDF8',
            'underlay-color': '#38BDF8',
            'underlay-padding': 8,
            'underlay-opacity': 0.4,
            'z-index': 9995,
          } as any,
        },
        // Active Connecting Edges with Glowing Arrows & Direction
        {
          selector: '.active-connecting-edge',
          style: {
            'label': 'data(label)',
            'color': '#FFFFFF',
            'font-size': '10px',
            'font-weight': 700,
            'text-outline-width': 2,
            'text-outline-color': '#060E0B',
            'width': 4.5,
            'line-color': '#06B6D4',
            'target-arrow-color': '#06B6D4',
            'arrow-scale': 1.4,
            'underlay-color': '#06B6D4',
            'underlay-padding': 6,
            'underlay-opacity': 0.5,
            'z-index': 9990,
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
        // Base Edge Style: Clean, no text unless hovered or connected
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
        {
          selector: '.dimmed-unconnected',
          style: {
            'opacity': 0.12,
          },
        },
      ],
      layout: {
        name: 'preset',
        fit: true,
        padding: 60,
      },
    });

    // Tap handlers: Selecting a node triggers connection highlighting & opens mirror box
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
    frozenNodeIds, 
    theme, 
    showLabels
  ]);

  // Connection Tracing Animation on Node Click
  useEffect(() => {
    if (!cyRef.current) return;
    const cy = cyRef.current;

    // Clear previous connection states
    cy.elements().removeClass(
      'active-hub-node active-neighbor-node active-connecting-edge dimmed-unconnected'
    );

    if (selectedEntity) {
      const selectedEle = cy.getElementById(selectedEntity.id);
      if (selectedEle && selectedEle.length > 0) {
        const incidentEdges = selectedEle.connectedEdges();
        const neighborNodes = incidentEdges.connectedNodes().not(selectedEle);

        // Dim everything not in direct connection
        cy.elements().addClass('dimmed-unconnected');

        // Highlight selected node, incident edges, and neighbors
        selectedEle.removeClass('dimmed-unconnected').addClass('active-hub-node');
        neighborNodes.removeClass('dimmed-unconnected').addClass('active-neighbor-node');
        incidentEdges.removeClass('dimmed-unconnected').addClass('active-connecting-edge');

        // Center on the connected subgraph gently
        const connectedSubgraph = selectedEle.union(incidentEdges).union(neighborNodes);
        cy.animate({
          fit: {
            eles: connectedSubgraph,
            padding: 80,
          },
          duration: 350,
        });

        // Pulsing connection animation loop
        let pulseStep = 0;
        const animInterval = setInterval(() => {
          if (!cyRef.current) return;
          pulseStep = (pulseStep + 1) % 2;
          incidentEdges.animate({
            style: {
              'width': pulseStep === 1 ? 5.2 : 3.6,
              'underlay-opacity': pulseStep === 1 ? 0.6 : 0.25,
              'underlay-padding': pulseStep === 1 ? 8 : 4,
            },
            duration: 400,
          });
        }, 450);

        return () => {
          clearInterval(animInterval);
        };
      }
    }
  }, [selectedEntity]);

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
      if (!highlightedRingActive && !selectedEntity) {
        cy.elements().removeClass('dimmed');
      }
    }
  }, [highlightedNodeIds, highlightedEdgeId, highlightedRingActive, selectedEntity]);

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

        {/* MIRROR EFFECT INFO BOX (Appears when clicking a node, showing direct animated connections) */}
        {selectedEntity && (
          <div
            className={`absolute top-4 right-4 z-30 w-80 sm:w-96 max-h-[calc(100%-2rem)] flex flex-col rounded-2xl border backdrop-blur-2xl transition-all duration-300 animate-in fade-in zoom-in-95 overflow-hidden select-text ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-[#122A21]/92 via-[#0A1A14]/95 to-[#060F0C]/98 border-white/20 shadow-[0_16px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(16,185,129,0.18)] text-slate-100'
                : 'bg-gradient-to-br from-white/95 via-slate-50/95 to-slate-100/98 border-slate-300 shadow-2xl text-slate-800'
            }`}
          >
            {/* Mirror Top Specular Reflection Highlight Line */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none" />
            
            {/* Mirror Sheen Diagonal Reflection Layer */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none rounded-2xl" />

            {/* Mirror Card Header */}
            <div className="p-4 border-b border-white/10 relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      selectedEntity.riskScore > 75
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : selectedEntity.riskScore > 40
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {selectedEntity.role?.replace(/_/g, ' ') || selectedEntity.type}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Risk: <strong className="text-white">{selectedEntity.riskScore}/100</strong>
                  </span>
                </div>
                <h3 className="font-bold text-sm tracking-tight truncate text-white">
                  {selectedEntity.label}
                </h3>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {selectedEntity.subText || selectedEntity.bankName || 'Verified entity identifier'}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => onSelectEntity(null)}
                title="Close inspector"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors btn-press shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body: Metadata + Animated Connections */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Key Details Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {selectedEntity.upiId && (
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">UPI VPA</span>
                    <span className="font-mono text-slate-200 truncate block font-medium">
                      {selectedEntity.upiId}
                    </span>
                  </div>
                )}
                {selectedEntity.bankName && (
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    <span className="text-slate-400 text-[10px] block">Bank</span>
                    <span className="text-slate-200 truncate block font-medium">
                      {selectedEntity.bankName}
                    </span>
                  </div>
                )}
                {selectedEntity.deviceId && (
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5 col-span-2">
                    <span className="text-slate-400 text-[10px] block">Bound Hardware ID</span>
                    <span className="font-mono text-slate-200 truncate block font-medium">
                      {selectedEntity.deviceId}
                    </span>
                  </div>
                )}
                {selectedEntity.disputeAmount && (
                  <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-900/60 col-span-2 flex items-center justify-between">
                    <div>
                      <span className="text-rose-400 text-[10px] block">Disputed Fraud Amount</span>
                      <span className="font-mono text-rose-200 font-bold text-sm">
                        ₹{selectedEntity.disputeAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                  </div>
                )}
              </div>

              {/* ANIMATED CONNECTIONS SECTION: Tells which node connects to which node */}
              <div className="space-y-2 pt-1 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span className="font-bold text-[11px] uppercase tracking-wider text-slate-300">
                      Active Linkages ({activeConnections.length})
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-300/80 font-mono">Animated Flow</span>
                </div>

                <div className="space-y-2">
                  {activeConnections.map(({ edge, isOutgoing, otherNode }, idx) => (
                    <div
                      key={edge.id || idx}
                      onClick={() => otherNode && onSelectEntity(otherNode)}
                      className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group shadow-xs"
                      title="Click to jump to this connected node"
                    >
                      {/* Connection Direction & Amount Badge */}
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span
                          className={`font-bold px-1.5 py-0.2 rounded uppercase ${
                            isOutgoing
                              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {isOutgoing ? 'Outgoing Transfer ──►' : '◄── Incoming Inflow'}
                        </span>
                        <span className="font-mono font-bold text-slate-200">
                          {edge.amount > 0 ? `₹${edge.amount.toLocaleString('en-IN')}` : edge.channel}
                        </span>
                      </div>

                      {/* Node A -> Node B Visual Flow Line with Pulse Animation */}
                      <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                        <span className="text-slate-400 truncate max-w-[110px]">
                          {isOutgoing ? selectedEntity.label : otherNode?.label || 'Source'}
                        </span>
                        
                        {/* Animated Connecting Arrow */}
                        <div className="flex items-center gap-1 text-cyan-400 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          <div className="w-6 h-px bg-cyan-400/80 relative overflow-hidden">
                            <div className="absolute inset-0 bg-white translate-x-[-100%] animate-[shimmer_1.5s_infinite]" />
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 animate-pulse text-cyan-300" />
                        </div>

                        <span className="text-white font-semibold truncate max-w-[120px] group-hover:text-cyan-300 transition-colors">
                          {isOutgoing ? otherNode?.label || 'Target' : selectedEntity.label}
                        </span>
                      </div>

                      {edge.ruleTriggered && (
                        <p className="text-[9px] text-amber-400/90 mt-1.5 truncate">
                          ⚡ Signal: {edge.ruleTriggered}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Counterfactual Freeze Simulation Action */}
              {onToggleFreeze && (
                <div className="pt-2 border-t border-white/10">
                  <button
                    onClick={() => onToggleFreeze(selectedEntity.id)}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs transition-all btn-press shadow-xs ${
                      frozenNodeIds.has(selectedEntity.id)
                        ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    {frozenNodeIds.has(selectedEntity.id) ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unfreeze Account Node</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Simulate Immediate Freeze</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    {frozenNodeIds.has(selectedEntity.id)
                      ? 'Account flow severed in what-if simulation'
                      : 'Test ring disruption impact by severing transactions'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

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
