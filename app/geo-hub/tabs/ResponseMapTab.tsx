'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import './response-map.css';

/* ── Constants ─────────────────────────────────────────────────── */
const HL = '#00A89F';

const TIER_FILL: Record<string, string> = {
  authority:   '#00AB7B',
  leader:      '#2F6DFF',
  competitive: '#F3B10C',
  emerging:    '#F48500',
  fragmented:  '#E0003B',
};

function tierFill(tier: string): string {
  return TIER_FILL[tier] || TIER_FILL.emerging;
}

function tierTextColor(tier: string): string {
  return ['emerging', 'competitive'].includes(tier) ? '#412402' : '#FFFFFF';
}

function volumeToSize(volume: number): number {
  // Nodes are bigger now because labels live inside them
  const minV = 8, maxV = 30, minS = 58, maxS = 96;
  const t = (volume - minV) / (maxV - minV);
  return minS + (maxS - minS) * Math.max(0, Math.min(1, t));
}

/**
 * Per-node font size so the longest word in the label fits within the
 * usable text width of the node (≈ 72% of diameter, leaving padding).
 * Inter 600 at N px has a character advance of roughly 0.58 × N px.
 * Clamped 8.5–13 px so text is always legible.
 */
function labelFontSize(label: string, size: number): string {
  const usable = size * 0.72;
  const charAdvance = 0.58;
  const longest = Math.max(...label.split(/\s+/).map(w => w.length));
  const px = usable / (longest * charAdvance);
  return `${Math.round(Math.max(8.5, Math.min(13, px)))}px`;
}

/** text-max-width = usable diameter so Cytoscape wraps at word boundaries. */
function labelMaxWidth(size: number): string {
  return `${Math.round(size * 0.72)}px`;
}

function weightToWidth(weight: number): number {
  const minW = 25, maxW = 75, minPx = 1, maxPx = 5;
  const t = (weight - minW) / (maxW - minW);
  return minPx + (maxPx - minPx) * Math.max(0, Math.min(1, t));
}

function nameHash(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/* ── Types ─────────────────────────────────────────────────────── */
interface RMTopic { id: string; label: string; tier: string; volume: number; }
interface RMEdge  { source: string; target: string; weight: number; }

/* ── Tier from winRate — matches PromptsTestedTab.winRateToTier ── */
function winRateToTier(wr: number): string {
  if (wr >= 80) return 'authority';
  if (wr >= 70) return 'leader';
  if (wr >= 56) return 'competitive';
  if (wr >= 45) return 'emerging';
  return 'fragmented';
}

/* Slugify a category name to a stable node id */
function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/* ── Data derivation ────────────────────────────────────────────── */
function hasEnoughData(result: any): boolean {
  const clusters = result?.query_clusters;
  return Array.isArray(clusters) && clusters.length >= 2;
}

function deriveTopics(result: any): RMTopic[] {
  const clusters = result?.query_clusters;
  if (Array.isArray(clusters) && clusters.length >= 2) {
    return clusters.slice(0, 12).map((c: any) => ({
      id:     slugify(c.category || 'topic'),
      label:  c.category || 'Unknown',
      tier:   winRateToTier(c.winRate ?? 0),
      volume: Math.max(8, c.total ?? 10),
    }));
  }
  return [];
}

function deriveEdges(result: any, topics: RMTopic[]): RMEdge[] {
  const clusters = result?.query_clusters;
  // Real data: build edges from each cluster's `related` array (cosine similarity scores)
  if (Array.isArray(clusters) && clusters.length >= 2) {
    const seen = new Set<string>();
    const edges: RMEdge[] = [];
    clusters.forEach((cluster: any) => {
      const srcId = slugify(cluster.category || '');
      if (!srcId) return;
      (cluster.related || []).forEach((rel: any) => {
        const tgtId = slugify(rel.category || '');
        if (!tgtId || tgtId === srcId) return;
        const key = [srcId, tgtId].sort().join('||');
        if (seen.has(key)) return;
        seen.add(key);
        // similarity is 0–100; clamp to our weight range 25–75
        const weight = Math.min(75, Math.max(25, rel.similarity ?? 30));
        edges.push({ source: srcId, target: tgtId, weight });
      });
    });
    if (edges.length > 0) {
      // Don't slice — the API already limits `related` to 4 per cluster,
      // so total unique edges ≤ numClusters × 2 (≈ 20). Slicing here would
      // silently drop edges for weakly-connected topics like "Approval & Credit".
      return edges.sort((a, b) => b.weight - a.weight);
    }
  }
  // No real edges — generate structural edges from topic pairs so the cose layout
  // has spring forces and nodes don't all collapse to the same point.
  const pairs: RMEdge[] = [];
  for (let i = 0; i < topics.length; i++) {
    for (let j = i + 1; j < topics.length; j++) {
      const h = nameHash(topics[i].id + topics[j].id);
      const weight = 25 + (h % 52);
      if (weight > 35) pairs.push({ source: topics[i].id, target: topics[j].id, weight });
    }
  }
  // Guarantee at least a ring of connections so no topic is isolated
  if (pairs.length < topics.length && topics.length >= 2) {
    for (let i = 0; i < topics.length; i++) {
      const next = (i + 1) % topics.length;
      const key = [topics[i].id, topics[next].id].sort().join('||');
      const already = pairs.some(p => [p.source, p.target].sort().join('||') === key);
      if (!already) pairs.push({ source: topics[i].id, target: topics[next].id, weight: 30 });
    }
  }
  return pairs.sort((a, b) => b.weight - a.weight).slice(0, 20);
}

/* ── Hero stat derivation ────────────────────────────────────────── */
function deriveHeroStats(topics: RMTopic[], edges: RMEdge[], totalPrompts: number) {
  // Strongest pair
  const topEdge = edges[0];
  const topA    = topics.find(t => t.id === topEdge?.source);
  const topB    = topics.find(t => t.id === topEdge?.target);
  // Hub topic (most connections)
  const connCounts: Record<string, number> = {};
  edges.forEach(e => {
    connCounts[e.source] = (connCounts[e.source] || 0) + 1;
    connCounts[e.target] = (connCounts[e.target] || 0) + 1;
  });
  const hubId  = Object.entries(connCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const hub    = topics.find(t => t.id === hubId);
  const hubCnt = connCounts[hubId] || 0;

  return { topEdge, topA, topB, hub, hubCnt };
}

/* ── Cytoscape style ─────────────────────────────────────────────── */
const cyStyle: any[] = [
  {
    selector: 'node',
    style: {
      'background-color':    'data(color)',
      'width':               'data(size)',
      'height':              'data(size)',
      'border-width':        2,
      'border-color':        '#0A0A0A',
      'label':               'data(label)',
      'font-family':         'Inter, system-ui, sans-serif',
      'font-size':          'data(fontSize)',
      'font-weight':        '600',
      'color':              'data(textColor)',
      'text-valign':        'center',
      'text-halign':        'center',
      'text-wrap':          'wrap',
      'text-max-width':     'data(textMaxWidth)',
      'text-overflow-wrap': 'whitespace',
      'transition-property': 'opacity, border-color, border-width',
      'transition-duration': '160ms',
    },
  },
  {
    selector: 'edge',
    style: {
      'line-color':          '#B8B8B8',
      'width':               'data(width)',
      'curve-style':         'straight',
      'opacity':             0.7,
      'transition-property': 'opacity, line-color, width',
      'transition-duration': '160ms',
    },
  },
  { selector: 'node.dim',      style: { 'opacity': 0.12, 'text-opacity': 0.12 } },
  { selector: 'edge.dim',      style: { 'opacity': 0.08 } },
  { selector: 'node.focus',    style: { 'border-color': HL, 'border-width': 3, 'opacity': 1 } },
  { selector: 'node.neighbor', style: { 'border-color': HL, 'opacity': 1 } },
  {
    selector: 'edge.highlight',
    style: { 'line-color': HL, 'opacity': 1, 'width': 'mapData(weight, 25, 75, 2, 6)' },
  },
];

/* ── Props ──────────────────────────────────────────────────────── */
interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

/* ── Component ─────────────────────────────────────────────────── */
export default function ResponseMapTab({ result, setActiveSub }: TabProps) {
  const cyContainerRef = useRef<HTMLDivElement>(null);
  const cyRef          = useRef<any>(null);
  const activatedRef   = useRef(false);
  const lockedIdRef    = useRef<string | null>(null);
  const hoverIdRef     = useRef<string | null>(null);
  const helpLockedRef    = useRef(false);
  const dragStartYRef    = useRef<number | null>(null);
  const userInteractedRef = useRef(false); // flips true on first hover/tap

  // React state for UI
  const [activated,        setActivated]        = useState(false);
  const [detailNodeId,     setDetailNodeId]      = useState<string | null>(null);
  const [sheetNodeId,      setSheetNodeId]        = useState<string | null>(null);
  const [sheetVisible,     setSheetVisible]       = useState(false);
  const [sheetEntered,     setSheetEntered]       = useState(false);
  const [sheetHiding,      setSheetHiding]        = useState(false);
  const [legendCollapsed,  setLegendCollapsed]    = useState(false);
  const [helpOpen,         setHelpOpen]           = useState(false);
  const [statStackClass,   setStatStackClass]     = useState('');

  const totalPrompts = (result?.responses_detail || []).length || 124;
  const topics = React.useMemo(() => deriveTopics(result), [result]);
  const edges  = React.useMemo(() => deriveEdges(result, topics), [result, topics]);
  const { topEdge, topA, topB, hub, hubCnt } = deriveHeroStats(topics, edges, totalPrompts);
  const hubId = hub?.id ?? null; // stable string — used in callbacks + eyebrow label
  const topN   = [...edges].sort((a, b) => b.weight - a.weight).slice(0, 6)
    .map(e => ({ a: topics.find(t => t.id === e.source)!, b: topics.find(t => t.id === e.target)!, weight: e.weight }))
    .filter(p => p.a && p.b);

  // Pre-populate the sidebar with the hub topic so the panel is never
  // completely empty on desktop. Resets whenever result changes.
  useEffect(() => {
    if (!isMobile() && hubId) setDetailNodeId(hubId);
  }, [hubId]);

  function isMobile() {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 880px)').matches;
  }

  // Build detail content — includes cluster stats from result.query_clusters
  function buildDetail(nodeId: string) {
    const topic = topics.find(t => t.id === nodeId);
    if (!topic) return null;
    const conns = edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => ({
        other: topics.find(t => t.id === (e.source === nodeId ? e.target : e.source))!,
        weight: e.weight,
      }))
      .filter(c => c.other)
      .sort((a, b) => b.weight - a.weight);
    const tierLabel = topic.tier.charAt(0).toUpperCase() + topic.tier.slice(1);
    // Pull cluster stats (winRate, mentioned, total, topCompetitor) from raw result
    const cluster = (result?.query_clusters || []).find(
      (c: any) => slugify(c.category || '') === nodeId
    );
    return { topic, conns, tierLabel, cluster };
  }

  // Cytoscape highlight helpers (operate on cy instance directly)
  const clearHighlights = useCallback(() => {
    cyRef.current?.elements().removeClass('dim focus neighbor highlight');
  }, []);

  const applyHighlights = useCallback((nodeId: string) => {
    const cy = cyRef.current;
    if (!cy) return;
    const node = cy.getElementById(nodeId);
    if (!node || node.empty()) return;
    cy.elements().addClass('dim');
    node.removeClass('dim').addClass('focus');
    const connEdges = node.connectedEdges();
    connEdges.removeClass('dim').addClass('highlight');
    connEdges.connectedNodes().not(node).removeClass('dim').addClass('neighbor');
  }, []);

  const refreshHighlights = useCallback(() => {
    const target = lockedIdRef.current || hoverIdRef.current;
    if (target) applyHighlights(target); else clearHighlights();
  }, [applyHighlights, clearHighlights]);

  // Show/hide detail (dispatches to sidebar or sheet depending on breakpoint)
  const showDetail = useCallback((nodeId: string) => {
    if (isMobile()) {
      setSheetNodeId(nodeId);
      setSheetHiding(false);
      setSheetEntered(false);
      setSheetVisible(true);
      // rAF ensures the sheet is in the DOM at translateY(100%) before we
      // add --entered, so the CSS transition actually plays
      requestAnimationFrame(() => setSheetEntered(true));
    } else {
      setDetailNodeId(nodeId);
    }
  }, []);

  const hideDetail = useCallback(() => {
    if (isMobile()) {
      setSheetEntered(false);
      setSheetHiding(true);
      setTimeout(() => {
        setSheetVisible(false);
        setSheetHiding(false);
        setSheetNodeId(null);
      }, 300);
    } else {
      setDetailNodeId(null);
    }
  }, []);

  // Activate / deactivate overlay
  const activate = useCallback(() => {
    if (activatedRef.current) return;
    activatedRef.current = true;
    setActivated(true);
    cyRef.current?.userZoomingEnabled(true);
    cyRef.current?.userPanningEnabled(true);
  }, []);

  const deactivate = useCallback(() => {
    if (!activatedRef.current) return;
    activatedRef.current = false;
    setActivated(false);
    cyRef.current?.userZoomingEnabled(false);
    cyRef.current?.userPanningEnabled(false);
    lockedIdRef.current = null;
    hoverIdRef.current  = null;
    userInteractedRef.current = false;
    clearHighlights();
    // Reset sidebar to hub topic and re-open legend if it was collapsed
    if (!isMobile() && hubId) setDetailNodeId(hubId);
    setLegendCollapsed(false);
  }, [clearHighlights, hubId]);

  // Init Cytoscape
  useEffect(() => {
    if (!cyContainerRef.current) return;

    const elements = [
      ...topics.map((t) => {
        const sz = volumeToSize(t.volume);
        return {
          data: {
            id:           t.id,
            label:        t.label,
            tier:         t.tier,
            volume:       t.volume,
            size:         sz,
            color:        tierFill(t.tier),
            textColor:    tierTextColor(t.tier),
            fontSize:     labelFontSize(t.label, sz),
            textMaxWidth: labelMaxWidth(sz),
          },
        };
      }),
      ...edges.map(e => ({
        data: {
          id:     `${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          weight: e.weight,
          width:  weightToWidth(e.weight),
        },
      })),
    ];

    const cy = cytoscape({
      container:          cyContainerRef.current,
      elements,
      layout:             (edges.length > 0
        ? { name: 'cose', animate: false, randomize: false, padding: 50, nodeRepulsion: () => 8192, idealEdgeLength: () => 120, edgeElasticity: () => 32 }
        : { name: 'circle', animate: false, padding: 60 }) as any,
      style:              cyStyle,
      minZoom:            0.4,
      maxZoom:            2.5,
      userZoomingEnabled: false,
      userPanningEnabled: false,
      boxSelectionEnabled: false,
      autoungrabify:      true,
    });

    cy.ready(() => {
      requestAnimationFrame(() => {
        cy.resize();
        cy.fit(undefined, 40);
      });
    });

    // Hover — highlights + sidebar preview on desktop (no sheet on hover)
    cy.on('mouseover', 'node', (evt: any) => {
      if (!activatedRef.current || lockedIdRef.current) return;
      const id = evt.target.id();
      hoverIdRef.current = id;
      userInteractedRef.current = true;
      refreshHighlights();
      if (!isMobile()) setDetailNodeId(id);
    });
    cy.on('mouseout', 'node', () => {
      if (!activatedRef.current || lockedIdRef.current) return;
      hoverIdRef.current = null;
      refreshHighlights();
      // Keep the last-hovered node in the sidebar — it stays until
      // another node is hovered or a lock is set/cleared.
    });

    // Tap node
    cy.on('tap', 'node', (evt: any) => {
      if (!activatedRef.current) return;
      const id = evt.target.id();
      userInteractedRef.current = true;
      if (lockedIdRef.current === id) {
        lockedIdRef.current = null;
        hideDetail();
      } else {
        lockedIdRef.current = id;
        hoverIdRef.current  = null;
        applyHighlights(id);
        showDetail(id);
      }
      refreshHighlights();
    });

    // Tap background
    cy.on('tap', (evt: any) => {
      if (!activatedRef.current) return;
      if (evt.target === cy) {
        lockedIdRef.current = null;
        hoverIdRef.current  = null;
        hideDetail();
        clearHighlights();
      }
    });

    cyRef.current = cy;

    // Breakpoint change handler — re-render detail in correct mode
    const mq = window.matchMedia('(max-width: 880px)');
    const onMqChange = () => {
      if (!lockedIdRef.current) return;
      if (mq.matches) {
        setDetailNodeId(null);
        setSheetNodeId(lockedIdRef.current);
        setSheetVisible(true);
        setSheetHiding(false);
      } else {
        setSheetVisible(false);
        setSheetHiding(false);
        setSheetNodeId(null);
        setDetailNodeId(lockedIdRef.current);
      }
    };
    mq.addEventListener('change', onMqChange);

    return () => {
      mq.removeEventListener('change', onMqChange);
      cy.destroy();
      cyRef.current = null;
    };
  }, [topics, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc key handler
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (helpLockedRef.current) {
        helpLockedRef.current = false;
        setHelpOpen(false);
        return;
      }
      if (!activatedRef.current) return;
      if (lockedIdRef.current) {
        lockedIdRef.current = null;
        hideDetail();
        clearHighlights();
      } else {
        deactivate();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hideDetail, clearHighlights, deactivate]);

  // Click outside the canvas wrap → deactivate (same as Esc when unlocked)
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!activatedRef.current) return;
      const wrap = document.getElementById('rm-net-canvas-wrap');
      if (wrap && !wrap.contains(e.target as Node)) {
        deactivate();
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [deactivate]);

  // Stat-hero responsive — width-based switching.
  // We check hero.offsetWidth, which does NOT change when --stack is toggled
  // (the hero is full-width in both modes), so the ResizeObserver can't oscillate.
  const statHeroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const hero = statHeroRef.current;
    if (!hero) return;

    function evaluate() {
      const w = hero?.offsetWidth ?? 0;
      // Stack only at genuinely mobile widths — canvasInner + rmWrapper add ~144px
      // of horizontal padding above this element, so 480px hero ≈ sub-700px viewport
      const needs = w > 0 && w < 480;
      setStatStackClass(prev => {
        const next = needs ? 'rmStatHero--stack' : '';
        return prev === next ? prev : next;
      });
    }

    evaluate();
    const ro = new ResizeObserver(evaluate);
    ro.observe(hero);
    return () => ro.disconnect();
  }, []);

  /* ── Detail content builders ─────────────────────────────────── */
  const detailData  = detailNodeId  ? buildDetail(detailNodeId)  : null;
  const sheetData   = sheetNodeId   ? buildDetail(sheetNodeId)   : null;

  /* ── Empty state — not enough cluster data to render the map ─── */
  if (!hasEnoughData(result)) {
    const brandName: string = result?.brand_name || 'this brand';
    const totalPrompts: number = result?.total_responses ?? 0;
    const lob: string = result?.lob || result?.ind_label || '';
    return (
      <div id="rm-empty-state" className="rmEmptyState">
        <div id="rm-empty-icon" className="rmEmptyIcon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="19" stroke="#D0D0DC" strokeWidth="1.5" strokeDasharray="4 3"/>
            <circle cx="20" cy="20" r="6" fill="#E8E8F0"/>
            <line x1="20" y1="5"  x2="20" y2="10" stroke="#D0D0DC" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="20" y1="30" x2="20" y2="35" stroke="#D0D0DC" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="5"  y1="20" x2="10" y2="20" stroke="#D0D0DC" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="30" y1="20" x2="35" y2="20" stroke="#D0D0DC" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div id="rm-empty-headline" className="rmEmptyHeadline">Not enough data to build the response map</div>
        <div id="rm-empty-body" className="rmEmptyBody">
          The response map needs at least 2 topic clusters with AI responses to draw connections.
          {totalPrompts > 0 && lob
            ? ` This run used ${totalPrompts} prompts scoped to ${lob} — ${brandName} may not appear frequently enough in that space to generate cluster data.`
            : totalPrompts > 0
            ? ` This run used ${totalPrompts} prompts but didn't produce enough categorized responses.`
            : null}
        </div>
        <div id="rm-empty-hint" className="rmEmptyHint">
          Try running a deeper analysis (300+ prompts) or switching to a broader scope.
        </div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Bottom sheet backdrop + sheet (fixed, outside normal flow) ── */}
      {sheetVisible && (
        <div
          id="rm-sheet-backdrop"
          className={`rmSheetBackdrop${sheetHiding ? ' rmSheetBackdrop--fading' : ''}`}
          onClick={() => {
            lockedIdRef.current = null;
            hideDetail();
            clearHighlights();
          }}
        />
      )}
      {sheetVisible && (
        <div
          id="rm-sheet"
          className={`rmSheet${sheetEntered ? ' rmSheet--entered' : ''}${sheetHiding ? ' rmSheet--hiding' : ''}`}
        >
          <div
            id="rm-sheet-handle"
            className="rmSheetHandleWrap"
            onPointerDown={e => {
              dragStartYRef.current = e.clientY;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={e => {
              if (dragStartYRef.current === null) return;
              const delta = e.clientY - dragStartYRef.current;
              const el = document.getElementById('rm-sheet');
              if (el && delta > 0) {
                el.style.transform = `translateY(${delta}px)`;
                el.style.transition = 'none';
              }
            }}
            onPointerUp={e => {
              if (dragStartYRef.current === null) return;
              const delta = e.clientY - dragStartYRef.current;
              const el = document.getElementById('rm-sheet');
              if (el) { el.style.transform = ''; el.style.transition = ''; }
              if (delta > 60) {
                lockedIdRef.current = null;
                hideDetail();
                clearHighlights();
              }
              dragStartYRef.current = null;
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            }}
            onPointerCancel={() => {
              const el = document.getElementById('rm-sheet');
              if (el) { el.style.transform = ''; el.style.transition = ''; }
              dragStartYRef.current = null;
            }}
          >
            <div className="rmSheetHandle" />
          </div>
          <div id="rm-sheet-header" className="rmSheetHeader">
            <div id="rm-sheet-eyebrow" className="rmSheetEyebrow">
              <span>Selected topic</span>
              {sheetData && (
                <span
                  className="rmTierPill"
                  style={{ background: tierFill(sheetData.topic.tier), color: tierTextColor(sheetData.topic.tier) }}
                >{sheetData.tierLabel}</span>
              )}
            </div>
            <button
              id="rm-sheet-close"
              className="rmSheetClose"
              onClick={() => { lockedIdRef.current = null; hideDetail(); clearHighlights(); }}
            >×</button>
          </div>
          <div id="rm-sheet-body" className="rmSheetBody">
            {sheetData && (
              <>
                <h3 className="rmSheetTopic">
                  {sheetData.topic.label}
                </h3>
                {sheetData.cluster && (
                  <div className="rmDetailMeta">
                    <div className="rmDetailMetaGrid">
                      <div className="rmDetailMetaCell">
                        <div className="rmDetailMetaBig">
                          {sheetData.cluster.winRate}<span className="rmDetailMetaUnit">%</span>
                        </div>
                        <div className="rmDetailMetaBar">
                          <div
                            className="rmDetailMetaBarFill"
                            style={{ width: `${sheetData.cluster.winRate}%`, background: tierFill(sheetData.topic.tier) }}
                          />
                        </div>
                        <div className="rmDetailMetaSub">mention rate</div>
                      </div>
                      <div className="rmDetailMetaCell rmDetailMetaCell--prompts">
                        <div className="rmDetailMetaBig">
                          {sheetData.cluster.mentioned}<span className="rmDetailMetaUnit"> / {sheetData.cluster.total}</span>
                        </div>
                        <div className="rmDetailMetaSub">prompts used</div>
                      </div>
                    </div>
                    {sheetData.cluster.topCompetitor && (
                      <div className="rmDetailMetaComp">
                        <div className="rmDetailMetaCompLabel">top competitor</div>
                        <div className="rmDetailMetaCompName">{sheetData.cluster.topCompetitor}</div>
                      </div>
                    )}
                  </div>
                )}
                <div className="rmSheetConns">
                  <div className="rmSheetConnsLabel">Co-occurs with</div>
                  {sheetData.conns.length > 0 ? sheetData.conns.map((c, i) => (
                    <div key={i} className="rmSheetConnRow">
                      <div className="rmConnName">
                        <span className="rmTdot" style={{ background: tierFill(c.other.tier) }} />
                        {c.other.label}
                      </div>
                      <div className="rmPct">{c.weight}%</div>
                    </div>
                  )) : (
                    <div className="rmConnsEmpty">No strong co-occurrences detected.</div>
                  )}
                </div>
                <button
                  className="rmSheetCta"
                  onClick={() => { setActiveSub(0); }}
                >
                  See {sheetData.topic.label} prompts
                  <span>→</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Main tab content ─────────────────────────────────────── */}
      <div id="rm-wrapper" className="rmWrapper">

        {/* Eyebrow + Headline */}
        <div id="rm-eyebrow" className="rmEyebrow">Response Map</div>
        <h1 id="rm-headline" className="rmHeadline">
          How topics travel together in AI responses<span className="rmHeadlineMark">.</span>
        </h1>

        {/* ── Stat Hero ── */}
        <div id="rm-stat-hero" className={`rmStatHero ${statStackClass}`} ref={statHeroRef}>
          {/* Stat 1: topics count */}
          <div id="rm-stat-1" className="rmStat">
            <div id="rm-stat-1-value" className="rmStatValue">{topics.length}</div>
            <div id="rm-stat-1-label" className="rmStatLabel">
              Topics analyzed across <span className="rmStatMono">{totalPrompts}</span> AI responses
            </div>
          </div>
          {/* Stat 2: strongest pair */}
          <div id="rm-stat-2" className="rmStat">
            <div id="rm-stat-2-value" className="rmStatValue">
              {topEdge?.weight ?? '—'}{topEdge && <span className="rmStatUnit">%</span>}
            </div>
            <div id="rm-stat-2-label" className="rmStatLabel">
              Strongest pair —{' '}
              {topA && topB
                ? <><span className="rmStatPair">{topA.label} × {topB.label}</span> co-occurred in AI responses</>
                : 'Run analysis to see strongest pair'}
            </div>
          </div>
          {/* Stat 3: hub topic */}
          <div id="rm-stat-3" className="rmStat">
            <div id="rm-stat-3-value" className="rmStatValue">{hub?.label ?? '—'}</div>
            <div id="rm-stat-3-label" className="rmStatLabel">
              {hub && <span className="rmTierDot" style={{ background: tierFill(hub.tier) }} />}
              Hub topic — connects to{' '}
              <span className="rmStatMono">{hubCnt} of {topics.length - 1}</span> other topics
            </div>
          </div>
        </div>

        {/* ── Network Block ── */}
        <div id="rm-network-block" className="rmNetworkBlock">
          <div id="rm-network-block-header" className="rmNetworkBlockHeader">
            <h3 id="rm-network-title" className="rmNetworkTitle">Topic associations</h3>
            <p id="rm-network-sub" className="rmNetworkSub">
              Nodes are topics. Edges connect topics that co-occur in AI responses.
              Hover (or tap) a node to preview connections; click to lock.
            </p>
          </div>

          <div id="rm-net-layout" className="rmNetLayout">
            {/* Canvas wrap */}
            <div id="rm-net-canvas-wrap" className="rmNetCanvasWrap">
              {/* Cytoscape canvas */}
              <div id="cy" ref={cyContainerRef} className="rmNetCanvas" />

              {/* Scroll-trap overlay */}
              {!activated && (
                <div
                  id="rm-net-overlay"
                  className="rmNetOverlay"
                  onClick={activate}
                />
              )}

              {/* Corner panel */}
              <div id="rm-net-corner" className="rmNetCorner">
                {/* Click prompt strip — activates or deactivates the graph */}
                <div
                  id="rm-click-prompt"
                  className={`rmCornerStrip rmClickPrompt${activated ? ' rmClickPrompt--active rmClickPrompt--clickable' : ''}`}
                  onClick={activated ? deactivate : activate}
                  style={{ cursor: 'pointer' }}
                >
                  <span id="rm-click-dot" className="rmClickDot" />
                  {activated ? 'interacting' : 'click to interact'}
                </div>
                {/* Legend strip */}
                <div
                  id="rm-legend"
                  className={`rmCornerStrip rmLegend${legendCollapsed ? ' rmLegend--collapsed' : ''}`}
                >
                  <div
                    id="rm-legend-header"
                    className="rmLegendHeader"
                    onClick={() => setLegendCollapsed(v => !v)}
                  >
                    <div>legend</div>
                    <div className="rmLegendChev">{legendCollapsed ? '∨' : '∧'}</div>
                  </div>
                  {!legendCollapsed && (
                    <div id="rm-legend-body" className="rmLegendBody">
                      {/* Tier colors */}
                      <div className="rmLegendSection">
                        <div className="rmLegendSectionLabel">Color · tier</div>
                        <div className="rmLegendTiers">
                          {(['authority','leader','competitive','emerging','fragmented'] as const).map(tier => (
                            <div key={tier} className="rmLegendTier">
                              <span className="rmLegendSwatch" style={{ background: tierFill(tier) }} />
                              {tier.charAt(0).toUpperCase() + tier.slice(1)}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Size */}
                      <div className="rmLegendSection">
                        <div className="rmLegendSectionLabel">Size · prompt volume</div>
                        <div className="rmLegendEncodingRow">
                          <div className="rmLegendEncodingIcon">
                            <div className="rmLegendNodeSmall" />
                            <div className="rmLegendNodeLarge" />
                          </div>
                          <div>fewer → more prompts</div>
                        </div>
                      </div>
                      {/* Edge */}
                      <div className="rmLegendSection">
                        <div className="rmLegendSectionLabel">Edge · co-occurrence</div>
                        <div className="rmLegendEncodingRow">
                          <div className="rmLegendEncodingIcon">
                            <div className="rmLegendEdgeThin" />
                            <div className="rmLegendEdgeThick" />
                          </div>
                          <div>weaker → stronger</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Desktop detail card */}
            <div
              id="rm-detail"
              className={`rmDetailCard${!detailData ? ' rmDetailCard--empty' : ''}`}
            >
              {detailData ? (
                <>
                  <div id="rm-detail-eyebrow" className="rmDetailEyebrow">
                    <span>{!userInteractedRef.current && detailNodeId === hubId ? 'Hub topic' : 'Selected topic'}</span>
                    <span
                      className="rmTierPill"
                      style={{ background: tierFill(detailData.topic.tier), color: tierTextColor(detailData.topic.tier) }}
                    >{detailData.tierLabel}</span>
                  </div>
                  <h3 id="rm-detail-topic" className="rmDetailTopic">
                    {detailData.topic.label}
                  </h3>
                  {detailData.cluster && (
                    <div id="rm-detail-meta" className="rmDetailMeta">
                      <div className="rmDetailMetaGrid">
                        {/* Mention rate cell */}
                        <div className="rmDetailMetaCell">
                          <div className="rmDetailMetaBig">
                            {detailData.cluster.winRate}<span className="rmDetailMetaUnit">%</span>
                          </div>
                          <div className="rmDetailMetaBar">
                            <div
                              className="rmDetailMetaBarFill"
                              style={{ width: `${detailData.cluster.winRate}%`, background: tierFill(detailData.topic.tier) }}
                            />
                          </div>
                          <div className="rmDetailMetaSub">mention rate</div>
                        </div>
                        {/* Prompts cell */}
                        <div className="rmDetailMetaCell rmDetailMetaCell--prompts">
                          <div className="rmDetailMetaBig">
                            {detailData.cluster.mentioned}<span className="rmDetailMetaUnit"> / {detailData.cluster.total}</span>
                          </div>
                          <div className="rmDetailMetaSub">prompts used</div>
                        </div>
                      </div>
                      {detailData.cluster.topCompetitor && (
                        <div className="rmDetailMetaComp">
                          <div className="rmDetailMetaCompLabel">top competitor</div>
                          <div className="rmDetailMetaCompName">{detailData.cluster.topCompetitor}</div>
                        </div>
                      )}
                    </div>
                  )}
                  <div id="rm-detail-conns" className="rmDetailConns">
                    <div className="rmDetailConnsLabel">Co-occurs with</div>
                    {detailData.conns.length > 0 ? detailData.conns.map((c, i) => (
                      <div key={i} className="rmDetailConnRow">
                        <div className="rmConnName">
                          <span className="rmTdot" style={{ background: tierFill(c.other.tier) }} />
                          {c.other.label}
                        </div>
                        <div className="rmPct">{c.weight}%</div>
                      </div>
                    )) : (
                      <div className="rmConnsEmpty">No strong co-occurrences detected.</div>
                    )}
                  </div>
                  <button
                    id="rm-detail-cta"
                    className="rmDetailCta"
                    onClick={() => setActiveSub(0)}
                  >
                    See {detailData.topic.label} prompts on Tested Prompts
                    <span className="rmDetailCtaArrow">→</span>
                  </button>
                </>
              ) : (
                'Click a node to see its details and connections.'
              )}
            </div>
          </div>

          {/* Behavior strip */}
          <div id="rm-behavior" className="rmBehavior">
            <span className="rmBehaviorItem">hover nodes to explore</span>
            <span className="rmBehaviorSep">·</span>
            <span className="rmBehaviorItem">scroll to zoom</span>
            <span className="rmBehaviorSep">·</span>
            <span className="rmBehaviorItem"><span className="rmKey">Esc</span> to unlock</span>
            <span className="rmBehaviorSep">·</span>
            <span
              id="rm-help-trigger"
              className={`rmBehaviorItem rmHelpTrigger${helpOpen ? ' rmHelpTrigger--locked' : ''}`}
              onMouseEnter={() => { if (!helpLockedRef.current) setHelpOpen(true); }}
              onMouseLeave={() => { if (!helpLockedRef.current) setHelpOpen(false); }}
              onClick={e => {
                e.stopPropagation();
                helpLockedRef.current = !helpLockedRef.current;
                setHelpOpen(helpLockedRef.current);
              }}
            >
              keyboard shortcuts
            </span>
            {helpOpen && (
              <div id="rm-help-popover" className="rmHelpPopover">
                <div className="rmHelpPopoverTitle">Network controls</div>
                <ul className="rmHelpPopoverList">
                  <li><span className="rmHelpGlyph">•</span><div>Click overlay to activate</div></li>
                  <li><span className="rmHelpGlyph">•</span><div>Hover nodes to preview connections</div></li>
                  <li><span className="rmHelpGlyph">•</span><div>Click a node to lock its selection</div></li>
                  <li><span className="rmHelpGlyph">•</span><div><span className="rmKey">Esc</span> to unlock, <span className="rmKey">Esc</span> again to deactivate</div></li>
                  <li><span className="rmHelpGlyph">•</span><div>Scroll to zoom, drag to pan</div></li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ── Top-N Associations List ── */}
        <div id="rm-topn-block" className="rmTopnBlock">
          <div id="rm-topn-header" className="rmTopnHeader">
            <h3 id="rm-topn-title" className="rmTopnTitle">Strongest topic pairs</h3>
            <p id="rm-topn-sub" className="rmTopnSub">
              Ranked by co-occurrence frequency in AI responses across{' '}
              <span style={{ color: '#0A0A0A', fontWeight: 600 }}>{totalPrompts}</span> tested prompts.
            </p>
          </div>
          <div id="rm-topn-list">
            {topN.map((p, i) => (
              <div key={i} id={`rm-topn-row-${i + 1}`} className="rmTopnRow">
                <div className="rmTopnRank">{String(i + 1).padStart(2, '0')}</div>
                <div className="rmTopnPairWrap">
                  <div className="rmTopnPair">
                    <span className="rmTdot" style={{ background: tierFill(p.a.tier) }} />
                    {p.a.label}
                    <span className="rmTopnSep">×</span>
                    <span className="rmTdot" style={{ background: tierFill(p.b.tier) }} />
                    {p.b.label}
                  </div>
                  <div className="rmTopnBar">
                    <div className="rmTopnBarFill" style={{ width: `${p.weight}%` }} />
                  </div>
                </div>
                <div className="rmTopnPct">{p.weight}%</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
