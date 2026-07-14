'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GeoExplainer } from './GeoExplainer';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

function sigTier(s: number) {
  if (s >= 80) return { label: 'Authority',   text: '#007653', bg: '#D1FAE5', dot: '#00AB7B' };
  if (s >= 70) return { label: 'Leader',       text: '#043BCC', bg: '#DBEAFE', dot: '#4F90FF' };
  if (s >= 56) return { label: 'Competitive',  text: '#996E00', bg: '#FEF3C7', dot: '#F3B10C' };
  if (s >= 45) return { label: 'Emerging',     text: '#B15F00', bg: '#FFF0E0', dot: '#F48500' };
  return               { label: 'Fragmented',  text: '#B7002F', bg: '#FFE4EC', dot: '#E0003B' };
}

interface NodeData {
  label: string; x: number; y: number; sz: number;
  isYou: boolean; isTopComp: boolean;
}

// ── Competitor filter dropdown ─────────────────────────────────
function CompFilter({ allNames, selected, onChange }: {
  allNames: string[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allSelected = selected.size === allNames.length;
  const triggerLabel = allSelected
    ? 'All competitors'
    : selected.size === 0
      ? 'No competitors'
      : `${selected.size} of ${allNames.length} competitors`;

  return (
    <div ref={ref} className="compFilterWrap">
      <button className={`compFilterBtn${open ? ' compFilterBtn--open' : ''}`} onClick={() => setOpen(o => !o)}>
        <span>{triggerLabel}</span>
        <span className="compFilterChevron" style={{ transform: open ? 'rotate(180deg)' : undefined }}>▾</span>
      </button>
      {open && (
        <div className="compFilterDropdown">
          <div className="compFilterActions">
            <button className="compFilterAction" onClick={() => onChange(new Set(allNames))}>Select all</button>
            <button className="compFilterAction" onClick={() => onChange(new Set<string>())}>Clear all</button>
          </div>
          <div className="compFilterList">
            {allNames.map(name => (
              <label key={name} className="compFilterItem">
                <input
                  type="checkbox"
                  checked={selected.has(name)}
                  onChange={e => {
                    const next = new Set(selected);
                    e.target.checked ? next.add(name) : next.delete(name);
                    onChange(next);
                  }}
                />
                <span className="compFilterName">{name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scatter chart ──────────────────────────────────────────────
function ScatterChart({ brand, vis, sent, prom, competitors, topCompBrand, visibleComps, onActiveChange }: {
  brand: string; vis: number; sent: number; prom: number;
  competitors: any[]; topCompBrand: string;
  visibleComps: Set<string>;
  onActiveChange: (node: NodeData | null) => void;
}) {
  const [hovLabel, setHovLabel] = useState<string | null>(null);
  const [lockedLabel, setLockedLabel] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setMobile(e.contentRect.width < 500));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isVisible = (label: string) => label === brand || visibleComps.has(label);

  useEffect(() => {
    if (lockedLabel && !isVisible(lockedLabel)) { setLockedLabel(null); onActiveChange(null); }
    if (hovLabel   && !isVisible(hovLabel))   { setHovLabel(null); }
  }, [visibleComps]); // eslint-disable-line

  const activeLabel = lockedLabel ?? hovLabel;

  const raw: NodeData[] = [
    { label: brand, x: vis, y: sent, sz: prom, isYou: true, isTopComp: false },
    ...competitors
      .filter(c => visibleComps.has(c.Brand))
      .slice(0, 20)
      .map((c: any) => ({
        label: c.Brand, x: c.Vis || 0, y: c.Sen ?? 0, sz: c.Prom ?? 40,
        isYou: false, isTopComp: c.Brand === topCompBrand,
      })),
  ];

  const all = raw.map((a, i) => {
    if (a.isYou || a.isTopComp) return { ...a, jx: a.x, jy: a.y };
    const nearby = raw.slice(0, i).filter(b => !b.isYou && !b.isTopComp && Math.abs(b.x - a.x) <= 4);
    return { ...a, jx: a.x + nearby.length * 4, jy: a.y };
  });

  const W = mobile ? 480 : 960, H = mobile ? 480 : 300, pL = 44, pR = mobile ? 24 : 20, pT = 28, pB = 44;
  const sx = (v: number) => pL + (v / 100) * (W - pL - pR);
  const sy = (v: number) => pT + ((100 - v) / 100) * (H - pT - pB);

  const midX = sx(50), midY = sy(50);

  const szVals = all.map(a => a.sz);
  const szMin = Math.min(...szVals), szMax = Math.max(...szVals, 1);
  const bR = (s: number) => Math.round(4 + ((s - szMin) / Math.max(szMax - szMin, 1)) * 8);

  const placements = all.map((a, i) => {
    const cx = sx(a.jx), cy = sy(a.jy), r = bR(a.sz);
    const zb = all.slice(0, i).filter(b => Math.abs(sx(b.jx) - cx) < 20).length;
    const above = i % 2 === 0;
    return { cx, cy, r, ly: Math.max(pT + 5, Math.min(H - pB - 5, cy + (above ? -(r + 8 + zb * 8) : (r + 8 + zb * 8)))), above };
  });

  const handleHover = (label: string | null) => {
    setHovLabel(label);
    if (lockedLabel === null) onActiveChange(label !== null ? (all.find(a => a.label === label) ?? null) : null);
  };
  const handleClick = (label: string) => {
    if (lockedLabel === label) {
      setLockedLabel(null);
      onActiveChange(hovLabel && hovLabel !== label ? (all.find(a => a.label === hovLabel) ?? null) : null);
    } else {
      setLockedLabel(label);
      onActiveChange(all.find(a => a.label === label) ?? null);
    }
  };

  const nodeColors = (a: NodeData, isActive: boolean) => {
    if (a.isYou)     return { fill: '#A100FF', stroke: '#7800CC', sw: 2 };
    if (isActive)    return { fill: '#0F0F11', stroke: '#0F0F11', sw: 1.5 };
    return                  { fill: '#D1D5DB', stroke: '#9CA3AF', sw: 1 };
  };
  const labelColor = (a: NodeData, isActive: boolean) => {
    if (a.isYou) return '#7800CC';
    if (isActive) return '#374151';
    return '#9CA3AF';
  };

  const activeIdx = activeLabel !== null ? all.findIndex(a => a.label === activeLabel) : -1;
  const renderOrder = activeIdx === -1
    ? all.map((_, i) => i)
    : [...all.map((_, i) => i).filter(i => i !== activeIdx), activeIdx];

  const qls = { fontSize: 8, fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, letterSpacing: '0.07em', pointerEvents: 'none' as const };

  return (
    <div ref={wrapRef}>
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
      {/* Quadrant fills */}
      <rect x={pL}    y={pT}    width={midX - pL}     height={midY - pT}     fill="rgba(0,0,0,0.013)" />
      <rect x={midX}  y={pT}    width={W - pR - midX}  height={midY - pT}     fill="rgba(161,0,255,0.04)" />
      <rect x={pL}    y={midY}  width={midX - pL}     height={H - pB - midY} fill="rgba(0,0,0,0.013)" />
      <rect x={midX}  y={midY}  width={W - pR - midX}  height={H - pB - midY} fill="rgba(0,0,0,0.013)" />

      {/* Grid */}
      {[0, 25, 50, 75, 100].map(v => (
        <g key={v}>
          <line x1={pL} y1={sy(v)} x2={W - pR} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1" />
          <text x={pL - 6} y={sy(v)} textAnchor="end" dominantBaseline="middle"
            style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: "'Space Grotesk',sans-serif" }}>{v}</text>
          <text x={sx(v)} y={H - pB + 13} textAnchor="middle"
            style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: "'Space Grotesk',sans-serif" }}>{v}</text>
        </g>
      ))}

      {/* Axes */}
      <line x1={pL} y1={H - pB} x2={W - pR} y2={H - pB} stroke="#D1D5DB" strokeWidth="1.5" />
      <line x1={pL} y1={pT}     x2={pL}      y2={H - pB} stroke="#D1D5DB" strokeWidth="1.5" />

      {/* Median dividers */}
      <line x1={midX} y1={pT}    x2={midX}     y2={H - pB} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3,3" />
      <line x1={pL}   y1={midY}  x2={W - pR}   y2={midY}   stroke="#E5E7EB" strokeWidth="1" strokeDasharray="3,3" />

      {/* Axis labels */}
      <text x={(pL + W - pR) / 2} y={H - 5} textAnchor="middle"
        style={{ fontSize: 10, fill: '#6B7280', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>Visibility</text>
      <text x={11} y={(pT + H - pB) / 2} textAnchor="middle" transform={`rotate(-90,11,${(pT + H - pB) / 2})`}
        style={{ fontSize: 10, fill: '#6B7280', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>Sentiment</text>

      {/* Quadrant labels */}
      <text x={pL + 7}      y={pT + 12}    style={{ ...qls, fill: '#9CA3AF'             }}>UNDEREXPOSED</text>
      <text x={W - pR - 7}  y={pT + 12}    textAnchor="end" style={{ ...qls, fill: '#A100FF', opacity: 0.45 }}>AUTHORITY ZONE</text>
      <text x={pL + 7}      y={H - pB - 7} style={{ ...qls, fill: '#9CA3AF'             }}>OFF THE RADAR</text>
      <text x={W - pR - 7}  y={H - pB - 7} textAnchor="end" style={{ ...qls, fill: '#9CA3AF'             }}>AT RISK</text>

      {/* Nodes in render order (active last = on top) */}
      {renderOrder.map(i => {
        const a = all[i];
        const { cx, cy, r, ly, above } = placements[i];
        const isActive = a.label === activeLabel;
        const isLocked = a.label === lockedLabel;
        const { fill, stroke, sw } = nodeColors(a, isActive);
        const lc = labelColor(a, isActive);
        const fs = a.isYou ? 11 : isActive ? 9 : 7;
        const fw = (a.isYou || isActive) ? 700 : 400;
        const leaderY = above ? cy - r : cy + r;
        return (
          <g key={i}
            onMouseEnter={() => handleHover(a.label)}
            onMouseLeave={() => handleHover(null)}
            onClick={() => handleClick(a.label)}
            style={{ cursor: 'pointer' }}
          >
            {isLocked && <circle cx={cx} cy={cy} r={r + 5} fill="none" stroke={a.isYou ? '#A100FF' : '#0F0F11'} strokeWidth="1.5" strokeDasharray="3,2" opacity="0.4" />}
            <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />
            <line x1={cx} y1={leaderY} x2={cx} y2={above ? ly + 3 : ly - 3} stroke={lc} strokeWidth="0.8" opacity="0.3" style={{ pointerEvents: 'none' }} />
            <text x={cx} y={ly} textAnchor="middle" dominantBaseline="middle"
              style={{ fontSize: fs, fill: lc, fontFamily: "'Space Grotesk',sans-serif", fontWeight: fw, pointerEvents: 'none',
                ...(isActive ? { stroke: 'rgba(255,255,255,0.85)', strokeWidth: 4, paintOrder: 'stroke' as const } : {}) }}>
              {a.label}
            </text>
          </g>
        );
      })}
    </svg>
    </div>
  );
}

// ── Info sentence builder ──────────────────────────────────────
function buildInfoSentence(
  node: NodeData | null,
  brand: string, vis: number, sent: number,
  competitors: any[], visibleComps: Set<string>
): React.ReactNode {
  if (!node) return 'Hover or click a brand to explore its position.';

  const field = [
    { label: brand, x: vis, y: sent, isYou: true },
    ...competitors.filter(c => visibleComps.has(c.Brand)).map((c: any) => ({ label: c.Brand, x: c.Vis || 0, y: c.Sen ?? 0, isYou: false })),
  ];
  const n = field.length;
  const byVis  = [...field].sort((a, b) => b.x - a.x);
  const bySent = [...field].sort((a, b) => b.y - a.y);
  const visRank  = byVis.findIndex(b => b.label === node.label) + 1;
  const sentRank = bySent.findIndex(b => b.label === node.label) + 1;

  if (node.isYou) {
    const visLeader  = byVis[0];
    const sentLeader = bySent[0];
    const visNote  = visLeader.label !== brand  ? ` ${visLeader.label} leads you on visibility by ${visLeader.x - node.x} pts` : ' You lead the field on visibility';
    const sentNote = sentLeader.label !== brand ? ` and sentiment by ${sentLeader.y - node.y} pts` : '';
    const closer   = visLeader.label !== brand  ? ' — closing this gap is your biggest AI Presence lever.' : '.';
    return <><strong>{brand}</strong>: Visibility {node.x} · Sentiment {node.y} · Prominence {node.sz} — #{visRank} of {n} on visibility, #{sentRank} on sentiment.{visNote}{sentNote}{closer}</>;
  }

  const rankNote = visRank === 1 ? 'leads the field on visibility' : `#${visRank} of ${n} on visibility and #${sentRank} on sentiment`;
  return <><strong>{node.label}</strong>: Visibility {node.x} · Sentiment {node.y} · Prominence {node.sz} — {rankNote}</>;
}

// ── Main component ─────────────────────────────────────────────
export default function AiPresenceTab({ result, resultComps }: TabProps) {
  const [activeNode, setActiveNode] = useState<NodeData | null>(null);

  const vis  = result.visibility  ?? 0;
  const sent = result.sentiment   ?? 0;
  const prom = result.prominence  ?? 0;
  const comps = resultComps;

  // Competitor filter — session storage scoped to this report
  const filterKey = `geo_comp_filter_${result.domain || 'default'}`;
  const allCompNames = comps.map((c: any) => c.Brand as string);

  const initSelected = (): Set<string> => {
    try {
      const stored = sessionStorage.getItem(filterKey);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        const valid = parsed.filter(n => allCompNames.includes(n));
        if (valid.length > 0) return new Set(valid);
      }
    } catch {}
    return new Set(allCompNames);
  };
  const [selectedComps, setSelectedComps] = useState<Set<string>>(initSelected);

  const handleFilterChange = (next: Set<string>) => {
    setSelectedComps(next);
    try { sessionStorage.setItem(filterKey, JSON.stringify([...next])); } catch {}
  };

  const allVis  = [vis,  ...comps.map((c: any) => c.Vis  ?? 0)];
  const allSent = [sent, ...comps.map((c: any) => c.Sen  ?? 0)];
  const allProm = [prom, ...comps.map((c: any) => c.Prom ?? 0)];
  const rank = (myVal: number, all: number[]) => [...all].sort((a, b) => b - a).indexOf(myVal) + 1;
  const avg  = (all: number[]) => Math.round(all.reduce((s, v) => s + v, 0) / all.length);

  const visTier  = sigTier(vis);
  const sentTier = sigTier(sent);
  const promTier = sigTier(prom);
  const topCompBrand = result._topCompBrand || (comps.length > 0 ? comps[0].Brand : '');

  const signals = [
    { key: 'vis',  label: 'Visibility',  weight: 30, q: 'How often your brand appears in AI answers.',                                        score: vis,  tier: visTier,  rankVal: rank(vis, allVis),   avgVal: avg(allVis),  total: allVis.length - 1 },
    { key: 'sent', label: 'Sentiment',   weight: 20, q: 'Whether AI talks about your brand in a positive, neutral, or negative way.',        score: sent, tier: sentTier, rankVal: rank(sent, allSent), avgVal: avg(allSent), total: allSent.length - 1 },
    { key: 'prom', label: 'Prominence',  weight: 20, q: 'Where your brand appears in the answer, the higher up the more prominent.',        score: prom, tier: promTier, rankVal: rank(prom, allProm), avgVal: avg(allProm), total: allProm.length - 1 },
  ];


  const infoSentence = buildInfoSentence(activeNode, result.brand_name, vis, sent, comps, selectedComps);

  return (
    <div id="tab-ai-presence" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p className="aiPresTagline">
        Understand where you stand —{' '}
        <span className="aiPresAccent">and where to go next.</span>
      </p>

      <div className="aiPresCards">
        {signals.map(sig => (
          <div key={sig.key} className={`aiPresCard aiPresCard--${sig.key}`} style={{ borderLeftColor: sig.tier.text }}>
            <div className="aiPresCardEyebrow">{sig.label}</div>
            <div className="aiPresCardQ">{sig.q}</div>
            <div className="aiPresCardScoreRow">
              <span className="aiPresCardNum" style={{ color: sig.tier.text }}>{sig.score}</span>
              <span className="aiPresChip" style={{ background: sig.tier.bg, color: sig.tier.text }}>{sig.tier.label}</span>
            </div>
            <div className="aiPresCardRank">#{sig.rankVal} of {sig.total} brands · avg {sig.avgVal}</div>
          </div>
        ))}
      </div>

      <GeoExplainer
        onSignalsClick={() => {}}
        label={<>AI Presence signals carry <strong>70%</strong> of your overall GEO Score</>}
        hint=""
        signalTiers={{
          visibility: { text: visTier.text, bg: visTier.bg },
          sentiment:  { text: sentTier.text, bg: sentTier.bg },
          prominence: { text: promTier.text, bg: promTier.bg },
        }}
      />

      {/* Chart card */}
      <div className="aiPresChartCard">
        <div className="aiPresChartHeader">
          <div>
            <div className="aiPresChartTitle">AI Presence: Market Positioning</div>
            <div className="aiPresChartLegend">
              <span className="aiPresLegendItem">
                <span className="aiPresLegendDot" style={{ background: '#A100FF' }} />
                You
              </span>
              <span className="aiPresLegendItem">
                <span className="aiPresLegendDot" style={{ background: '#D1D5DB', border: '1px solid #9CA3AF' }} />
                Competitor
              </span>

              <span className="aiPresLegendItem aiPresLegendItemMuted">
                Click a brand to lock · click again to release
              </span>
            </div>
          </div>
          <CompFilter allNames={allCompNames} selected={selectedComps} onChange={handleFilterChange} />
        </div>
        <ScatterChart
          brand={result.brand_name}
          vis={vis} sent={sent} prom={prom}
          competitors={comps}
          topCompBrand={topCompBrand}
          visibleComps={selectedComps}
          onActiveChange={setActiveNode}
        />
        <div className="aiPresChartInfo" style={{ color: activeNode ? '#111827' : '#9CA3AF' }}>
          {infoSentence}
        </div>
      </div>
    </div>
  );
}
