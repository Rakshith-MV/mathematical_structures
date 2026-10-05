import React, { useEffect, useRef, useCallback } from 'react';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { useStore } from '../store/useStore';
import { buildCytoscapeElements } from '../lib/graphEngine';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

cytoscape.use(dagre);

export const GraphCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const {
    domainData,
    activeContextId,
    showImpliedArrows,
    expandedEquivalenceClasses,
    searchQuery,
    isDarkMode,
    activeMode,
    foundPaths,
    selectedPathIndex,
    selectProperty,
    selectStatement,
    selectCounterexample,
    toggleEquivalenceClass,
    studyState,
    currentDomain,
  } = useStore();

  const domainProgress = studyState.progressByDomain[currentDomain];
  const unlockedNodeIds = new Set(domainProgress?.unlockedNodeIds || []);
  const unlockedStatementIds = new Set(domainProgress?.unlockedStatementIds || []);
  const isExploreMode = activeMode === 'explore';

  // Highlighted elements from path finder
  const currentPath = foundPaths[selectedPathIndex];
  const highlightedStatementIds = new Set(currentPath?.steps.map(s => s.statement.id) || []);
  const highlightedNodeIds = new Set(
    currentPath?.steps.flatMap(s => [s.fromProperty.id, s.toProperty.id]) || []
  );

  // Filter nodes matching search query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    for (const p of domainData.properties) {
      if (p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)) {
        highlightedNodeIds.add(p.id);
      }
    }
  }

  // Initialize and update Cytoscape
  useEffect(() => {
    if (!containerRef.current) return;

    const elements = buildCytoscapeElements({
      data: domainData,
      activeContextId,
      showImpliedArrows,
      expandedEquivalenceClasses,
      highlightedPathStatementIds: highlightedStatementIds,
      highlightedNodeIds,
      unlockedNodeIds,
      unlockedStatementIds,
      isExploreMode,
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      boxSelectionEnabled: false,
      autounselectify: false,
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 60,
        rankSep: 85,
        edgeSep: 25,
        animate: false,
      } as any,
      style: [
        // Property Node
        {
          selector: 'node[type="property"]',
          style: {
            'content': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'shape': 'round-rectangle',
            'background-color': isDarkMode ? '#1e293b' : '#ffffff',
            'border-width': 2,
            'border-color': isDarkMode ? '#38bdf8' : '#2563eb',
            'color': isDarkMode ? '#f8fafc' : '#0f172a',
            'font-family': 'ui-sans-serif, system-ui, sans-serif',
            'font-size': '13px',
            'font-weight': 600,
            'padding': '12px',
            'width': 'label',
            'height': 'label',
            'text-wrap': 'wrap',
            'text-max-width': '160px',
          },
        },
        // Equivalence Meta Node (Collapsed Class)
        {
          selector: 'node[type="equivalence-meta"]',
          style: {
            'content': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'shape': 'round-rectangle',
            'background-color': isDarkMode ? '#312e81' : '#ede9fe',
            'border-width': 2.5,
            'border-color': '#8b5cf6',
            'border-style': 'solid',
            'color': isDarkMode ? '#e0e7ff' : '#4c1d95',
            'font-size': '13px',
            'font-weight': 700,
            'padding': '14px',
            'width': 'label',
            'height': 'label',
            'text-wrap': 'wrap',
            'text-max-width': '220px',
          },
        },
        // Compound Parent Node (Expanded Class)
        {
          selector: 'node[type="compound-parent"]',
          style: {
            'content': 'data(label)',
            'text-valign': 'top',
            'text-halign': 'center',
            'background-color': isDarkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)',
            'border-width': 2,
            'border-color': '#a78bfa',
            'border-style': 'dashed',
            'color': isDarkMode ? '#c4b5fd' : '#6d28d9',
            'font-size': '11px',
            'font-weight': 600,
            'padding': '20px',
          },
        },
        // Locked Node (Fog of War)
        {
          selector: 'node.locked',
          style: {
            'background-color': isDarkMode ? '#0f172a' : '#f1f5f9',
            'border-color': isDarkMode ? '#334155' : '#cbd5e1',
            'border-style': 'dashed',
            'color': isDarkMode ? '#64748b' : '#94a3b8',
          },
        },
        // Highlighted Node
        {
          selector: 'node.highlighted',
          style: {
            'border-color': '#f59e0b',
            'border-width': 3.5,
            'background-color': isDarkMode ? '#451a03' : '#fef3c7',
            'color': isDarkMode ? '#fde68a' : '#78350f',
          },
        },
        // Base Edge
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'line-color': '#3b82f6',
            'target-arrow-color': '#3b82f6',
            'arrow-scale': 1.1,
            'width': 2.5,
            'font-size': '10px',
            'font-family': 'ui-sans-serif, system-ui, sans-serif',
            'color': isDarkMode ? '#94a3b8' : '#64748b',
            'text-rotation': 'autorotate',
            'text-background-opacity': 0.85,
            'text-background-color': isDarkMode ? '#0f172a' : '#ffffff',
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
          },
        },
        // Implies Edge
        {
          selector: 'edge.implies',
          style: {
            'line-color': '#2563eb',
            'target-arrow-color': '#2563eb',
            'target-arrow-shape': 'triangle',
          },
        },
        // Equivalent Edge
        {
          selector: 'edge.equivalent',
          style: {
            'line-color': '#10b981',
            'source-arrow-shape': 'triangle',
            'target-arrow-shape': 'triangle',
            'source-arrow-color': '#10b981',
            'target-arrow-color': '#10b981',
            'width': 2.5,
          },
        },
        // Not-Implies Edge (Dashed Red with ✗)
        {
          selector: 'edge.not-implies',
          style: {
            'line-color': '#ef4444',
            'line-style': 'dashed',
            'target-arrow-shape': 'tee',
            'target-arrow-color': '#ef4444',
            'content': 'data(label)',
            'font-size': '12px',
            'font-weight': 'bold',
            'color': '#ef4444',
            'width': 2,
          },
        },
        // Implied Arrow (Dotted Light Blue)
        {
          selector: 'edge.implied-arrow',
          style: {
            'line-color': isDarkMode ? '#60a5fa' : '#93c5fd',
            'target-arrow-color': isDarkMode ? '#60a5fa' : '#93c5fd',
            'line-style': 'dotted',
            'width': 1.5,
            'opacity': 0.7,
          },
        },
        // Stronger Context (Greyed)
        {
          selector: 'edge.greyed-context',
          style: {
            'line-color': isDarkMode ? '#475569' : '#cbd5e1',
            'target-arrow-color': isDarkMode ? '#475569' : '#cbd5e1',
            'color': isDarkMode ? '#64748b' : '#94a3b8',
            'content': 'data(label)',
            'opacity': 0.6,
            'width': 1.5,
          },
        },
        // Highlighted Path Edge
        {
          selector: 'edge.highlighted-edge',
          style: {
            'line-color': '#f59e0b',
            'target-arrow-color': '#f59e0b',
            'width': 4,
            'opacity': 1,
            'z-index': 999,
          },
        },
      ],
    });

    // Event handlers
    cy.on('tap', 'node', evt => {
      const node = evt.target;
      const type = node.data('type');

      if (type === 'property') {
        const prop = domainData.properties.find(p => p.id === node.id());
        if (prop) selectProperty(prop);
      } else if (type === 'equivalence-meta') {
        const eqId = node.data('eqClassId');
        if (eqId) {
          toggleEquivalenceClass(eqId);
        }
      } else if (type === 'compound-parent') {
        const eqId = node.data('eqClassId');
        if (eqId) {
          toggleEquivalenceClass(eqId);
        }
      }
    });

    cy.on('tap', 'edge', evt => {
      const edge = evt.target;
      const stmt = edge.data('statement');
      if (stmt) {
        if (stmt.kind === 'not-implies' && stmt.witness) {
          const ce = domainData.counterexamples.find(c => c.id === stmt.witness);
          if (ce) {
            selectCounterexample(ce);
            return;
          }
        }
        selectStatement(stmt);
      }
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [
    domainData,
    activeContextId,
    showImpliedArrows,
    expandedEquivalenceClasses,
    searchQuery,
    isDarkMode,
    activeMode,
    selectedPathIndex,
    foundPaths,
    studyState,
  ]);

  const handleZoomIn = useCallback(() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25), []);
  const handleZoomOut = useCallback(() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8), []);
  const handleFit = useCallback(() => cyRef.current?.fit(undefined, 30), []);

  return (
    <div className="relative w-full h-full min-h-[500px] flex-1 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div ref={containerRef} className="w-full h-full" />

      {/* Floating Canvas Controls */}
      <div className="absolute bottom-4 right-4 flex items-center space-x-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-md z-10">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFit}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
          title="Fit Graph"
          aria-label="Fit Graph"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
