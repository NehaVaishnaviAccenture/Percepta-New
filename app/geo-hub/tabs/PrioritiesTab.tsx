'use client';

import React, { useRef, useLayoutEffect, useState } from 'react';
import { geoTier } from '../lib/tiers';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const SIGNALS = [
  { label: 'Visibility',     key: 'visibility',     weight: '30%' },
  { label: 'Sentiment',      key: 'sentiment',      weight: '20%' },
  { label: 'Prominence',     key: 'prominence',     weight: '20%' },
  { label: 'Citation',       key: 'citation_share', weight: '15%' },
  { label: 'Share of Voice', key: 'share_of_voice', weight: '15%' },
];

const TREND_COLS = [
  { key: 'Peak',   label: 'Trending', colClass: 'ov-col--trending' },
  { key: 'Rising', label: 'Growing',  colClass: 'ov-col--growing'  },
  { key: 'Stable', label: 'Steady',   colClass: 'ov-col--steady'   },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function splitBoldFirst(text: string): { bold: string; rest: string } {
  const dot = text.indexOf('. ');
  if (dot === -1) return { bold: text, rest: '' };
  return { bold: text.slice(0, dot + 1), rest: text.slice(dot + 2) };
}

function buildLead(brand: string, visibility: number): string {
  if (visibility >= 60) return `${brand} leads in AI responses — appearing in ${visibility}% of answers and frequently named first.`;
  if (visibility >= 40) return `${brand} is credible but rarely the default — visible in ${visibility}% of responses, named first far less.`;
  if (visibility >= 25) return `${brand} appears in AI responses but is still building authority — visible in ${visibility}% of answers.`;
  return `${brand} has limited presence in AI responses — appearing in only ${visibility}% of answers so far.`;
}

function buildInsight(
  q: any, brand: string, leader: string | null, winRate: number | null
): { contextBold: string; context: string; outlook: string } {
  const cat = q.category || 'this category';
  const opp = (q.opportunity || 'Medium') as string;

  if (opp === 'High') {
    if (leader) return {
      contextBold: `${leader} currently leads AI responses in ${cat}.`,
      context:     'High opportunity — this is an actively contested query type.',
      outlook:     `${brand} has a realistic path to citation here with targeted content.`,
    };
    return {
      contextBold: `High opportunity in ${cat}.`,
      context:     'No dominant competitor has locked this down yet.',
      outlook:     'The landscape is more open than usual — worth testing as a priority.',
    };
  }

  if (opp === 'Medium') {
    if (leader) return {
      contextBold: `${leader} leads in ${cat} but the space isn't locked down.`,
      context:     winRate !== null ? `${brand} appears in ${winRate}% of responses here.` : 'Moderate opportunity for growth.',
      outlook:     `Targeted content could meaningfully improve ${brand}'s citation rate here.`,
    };
    return {
      contextBold: `Moderate opportunity in ${cat}.`,
      context:     winRate !== null ? `${brand} currently appears in ${winRate}% of responses.` : '',
      outlook:     `Testing will show where ${brand} stands and what's needed to improve.`,
    };
  }

  return {
    contextBold: `Lower priority ${cat} query.`,
    context:     'AI typically treats this as a factual explainer rather than a brand recommendation.',
    outlook:     'Limited citation upside — deprioritize in favor of higher-opportunity queries.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chevron SVG
// ─────────────────────────────────────────────────────────────────────────────

function ChevronSVG({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="2,4 6,8 10,4" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Finding — collapses on tablet/mobile, always expanded on desktop
// ─────────────────────────────────────────────────────────────────────────────

function Finding({ item }: { item: any }) {
  const [open, setOpen] = useState(false);
  const isObj  = item && typeof item === 'object';
  const lead   = isObj ? item.bold   : splitBoldFirst(item).bold;
  const detail = isObj ? item.detail : splitBoldFirst(item).rest;
  const meta   = isObj && item.signal ? `${item.signal}` : null;

  return (
    <div className={`ov-finding${open ? ' ov-finding--open' : ''}`}>
      <div className="ov-finding-head" onClick={() => setOpen(v => !v)}>
        <div className="ov-finding-lead">{lead}</div>
        <ChevronSVG className="ov-finding-chev" />
      </div>
      {detail && <div className="ov-finding-detail">{detail}</div>}
      {meta   && <div className="ov-finding-meta">{meta}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Summary Card
// ─────────────────────────────────────────────────────────────────────────────

function HealthSummaryCard({ result }: { result: any }) {
  const healthRef      = useRef<HTMLDivElement>(null);
  const scoreRef       = useRef<HTMLDivElement>(null);
  const needsRef       = useRef<HTMLDivElement>(null);
  const workingRef     = useRef<HTMLDivElement>(null);
  const needsFindRef   = useRef<HTMLDivElement>(null);
  const workingFindRef = useRef<HTMLDivElement>(null);

  const [activeReadout, setActiveReadout] = useState<'needs' | 'working'>('needs');

  const geo  = result.overall_geo_score ?? 0;
  const tier = geoTier(geo);

  const improvements = (result.improvements_list || []).slice(0, 5);
  const strengths    = (result.strengths_list    || []).slice(0, 5);

  // Desktop: pin card height to score panel; readouts scroll within that height.
  useLayoutEffect(() => {
    const health   = healthRef.current;
    const score    = scoreRef.current;
    const needsP   = needsRef.current;
    const workingP = workingRef.current;
    if (!health || !score) return;

    const sync = () => {
      const cols = getComputedStyle(health).gridTemplateColumns.split(' ').length;
      if (cols < 3) {
        health.style.height = '';
        if (needsP)   needsP.style.maxHeight   = '';
        if (workingP) workingP.style.maxHeight = '';
        return;
      }
      health.style.alignItems = 'start';
      const h = score.scrollHeight;
      health.style.alignItems = 'stretch';
      health.style.height = `${h}px`;
      [
        { panel: needsP,   findRef: needsFindRef },
        { panel: workingP, findRef: workingFindRef },
      ].forEach(({ panel, findRef }) => {
        if (!panel) return;
        panel.style.maxHeight = `${h}px`;
        if (findRef.current) {
          const over = findRef.current.scrollHeight > findRef.current.clientHeight + 1;
          panel.classList.toggle('ov-is-overflowing', over);
        }
      });
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(health);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={healthRef} className="ov-health">

      {/* Left: score + signals */}
      <div ref={scoreRef} className="ov-health-panel ov-score-panel">
        <div className="ov-hp-score-stack">
          <div className="ov-hp-eyebrow">GEO Score</div>
          <div className="ov-hp-score" style={{ color: tier.text }}>{geo}</div>
          <div className="ov-hp-tier"  style={{ color: tier.text }}>{tier.label}</div>
        </div>
        <div className="ov-hp-signals">
          <div className="ov-hp-signals-label">Signals</div>
          {SIGNALS.map(sig => {
            const val = result[sig.key] ?? 0;
            const st  = geoTier(val);
            return (
              <div key={sig.key} className="ov-signal-row">
                <span className="ov-signal-name">{sig.label}</span>
                <span className="ov-signal-val" style={{ color: st.text }}>
                  {val}
                  <span className="ov-signal-tick" style={{ background: st.fill }} />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile-only readout toggle */}
      <div className="ov-readout-toggle">
        <button
          className={`ov-rt-btn${activeReadout === 'needs' ? ' ov-rt-btn--active' : ''}`}
          onClick={() => setActiveReadout('needs')}
        >
          Needs Improvement <span className="ov-rt-count">{improvements.length}</span>
        </button>
        <button
          className={`ov-rt-btn${activeReadout === 'working' ? ' ov-rt-btn--active' : ''}`}
          onClick={() => setActiveReadout('working')}
        >
          Working Well <span className="ov-rt-count">{strengths.length}</span>
        </button>
      </div>

      {/* Needs Improvement */}
      <div
        ref={needsRef}
        className={`ov-health-panel ov-needs${activeReadout === 'needs' ? ' ov-panel--active' : ''}`}
      >
        <div className="ov-hp-readout-head">
          <span className="ov-hp-readout-title">Needs Improvement</span>
          <span className="ov-hp-readout-count">{improvements.length}</span>
        </div>
        <div ref={needsFindRef} className="ov-hp-findings">
          {improvements.map((item: any, i: number) => (
            <Finding key={i} item={item} />
          ))}
        </div>
        <div className="ov-hp-more">Scroll for more ↓</div>
      </div>

      {/* Working Well */}
      <div
        ref={workingRef}
        className={`ov-health-panel ov-working${activeReadout === 'working' ? ' ov-panel--active' : ''}`}
      >
        <div className="ov-hp-readout-head">
          <span className="ov-hp-readout-title">Working Well</span>
          <span className="ov-hp-readout-count">{strengths.length}</span>
        </div>
        <div ref={workingFindRef} className="ov-hp-findings">
          {strengths.map((item: any, i: number) => (
            <Finding key={i} item={item} />
          ))}
        </div>
        <div className="ov-hp-more">Scroll for more ↓</div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Card
// ─────────────────────────────────────────────────────────────────────────────

function QueryCard({ q, brand, leader, winRate, onTestQuery }: {
  q: any; brand: string; leader: string | null; winRate: number | null; onTestQuery: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tested = winRate !== null;
  const { contextBold, context, outlook } = buildInsight(q, brand, leader, winRate);
  const toggle = () => setExpanded(v => !v);

  return (
    <div className={`ov-card${expanded ? ' ov-card--expanded' : ''}${!tested ? ' ov-card--untested' : ''}`}>
      <div className="ov-card-head" onClick={toggle}>
        <span className="ov-card-cat">{q.category}</span>
        <ChevronSVG className="ov-card-chev" />
      </div>
      <div className="ov-card-query" onClick={toggle}>{q.query}</div>
      <div className="ov-card-foot" onClick={toggle}>
        {tested && leader
          ? <span className="ov-foot-leader">{leader} leads</span>
          : <span className="ov-foot-leader" />}
        {tested
          ? <span className="ov-foot-win">{winRate}% citation</span>
          : <span className="ov-foot-untested">Not yet tested</span>}
      </div>
      {expanded && (
        <div className="ov-card-drawer">
          <div className="ov-drawer-insight">
            {contextBold && <b>{contextBold}</b>}
            {context && ` ${context}`}
          </div>
          {outlook && <div className="ov-outlook">{outlook}</div>}
          <button
            className="ov-drawer-link"
            onClick={(e) => { e.stopPropagation(); onTestQuery(); }}
          >
            {tested ? 'View prompt results' : 'Test this query'}
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 5.5h7M6 2.5l3 3-3 3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Queries Board
// ─────────────────────────────────────────────────────────────────────────────

function MarketQueriesBoard({ result, setActiveParent }: {
  result: any; setActiveParent: (n: number) => void;
}) {
  const [activeLane, setActiveLane] = useState<string>('Peak');

  const queries: any[]  = result.trending_queries || [];
  const clusters: any[] = result.query_clusters   || [];
  const brand           = result.brand_name        || 'Your brand';

  if (!queries.length) return null;

  const getClusterData = (category: string): { leader: string | null; winRate: number | null } => {
    const cat = (category || '').toLowerCase();
    const match = clusters.find((c: any) =>
      (c.category || '').toLowerCase() === cat ||
      (c.category || '').toLowerCase().includes(cat) ||
      cat.includes((c.category || '').toLowerCase())
    );
    if (!match) return { leader: null, winRate: null };
    return {
      leader:  match.topCompetitor ?? null,
      winRate: match.winRate       !== undefined ? match.winRate : null,
    };
  };

  return (
    <div className="ov-board-card">
      <div className="ov-block-head">
        <span className="ov-block-title">What the market is asking right now</span>
        <span className="ov-block-meta">
          AI-assessed trend signals · {queries.length} queries
        </span>
      </div>

      {/* Lane toggle — revealed at tablet/mobile by CSS */}
      <div className="ov-board-toggle">
        {TREND_COLS.map(col => {
          const count = queries.filter((q: any) => q.trend === col.key).length;
          return (
            <button
              key={col.key}
              className={`ov-lt-btn${activeLane === col.key ? ' ov-lt-btn--active' : ''}`}
              onClick={() => setActiveLane(col.key)}
            >
              {col.label} <span className="ov-lt-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="ov-board">
        {TREND_COLS.map(col => {
          const colQueries = queries.filter((q: any) => q.trend === col.key);
          return (
            <div
              key={col.key}
              className={`ov-col ${col.colClass}${activeLane === col.key ? ' ov-col--active' : ''}`}
            >
              <div className="ov-col-header-row">
                <span className="ov-col-label">{col.label}</span>
                <span className="ov-col-count">{colQueries.length}</span>
              </div>
              <div className="ov-col-underline" />
              <div className="ov-col-body">
                {colQueries.length === 0 ? (
                  <div style={{ padding: '20px 0', fontSize: 12, color: '#B8B8B8' }}>No queries here</div>
                ) : colQueries.map((q: any, i: number) => {
                  const { leader, winRate } = getClusterData(q.category);
                  return (
                    <QueryCard
                      key={i}
                      q={q}
                      brand={brand}
                      leader={leader}
                      winRate={winRate}
                      onTestQuery={() => setActiveParent(3)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="ov-board-note">
        Trend labels (Trending, Growing, Steady) are assigned by the AI from its read of consumer query patterns — not pulled from live search volume. Treat as directional signal, not market fact.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export default function PrioritiesTab({ result, setActiveParent }: TabProps) {
  const brand      = result.brand_name        || 'Your brand';
  const visibility = result.visibility        ?? 0;
  const totalQA    = (result.responses_detail || []).length;
  const totalQC    = (result.trending_queries || []).length;

  return (
    <div id="tab-priorities-overall">
      <h2 className="ov-lead">{buildLead(brand, visibility)}</h2>
      <div className="ov-lead-sub">
        <b>{totalQA}</b> responses analyzed
        <span className="ov-sep">·</span>
        <b>{totalQC}</b> market queries tracked
      </div>
      <HealthSummaryCard result={result} />
      <MarketQueriesBoard result={result} setActiveParent={setActiveParent} />
    </div>
  );
}
