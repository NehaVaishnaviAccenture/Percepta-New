'use client';

import React, { useRef, useLayoutEffect, useEffect, useState } from 'react';
import { geoTier } from '../lib/tiers';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SIGNALS = [
  { label: 'Visibility',     key: 'visibility',     weight: '30%' },
  { label: 'Sentiment',      key: 'sentiment',      weight: '20%' },
  { label: 'Prominence',     key: 'prominence',     weight: '20%' },
  { label: 'Citation',       key: 'citation_share', weight: '15%' },
  { label: 'Share of Voice', key: 'share_of_voice', weight: '15%' },
];

function splitBoldFirst(text: string): { bold: string; rest: string } {
  const dot = text.indexOf('. ');
  if (dot === -1) return { bold: text, rest: '' };
  return { bold: text.slice(0, dot + 1), rest: text.slice(dot + 2) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Summary Card (Option E) — three layout modes
//   desktop  ≥ 900px : left panel | improvements | working well   (height pinned)
//   tablet  560–899px: left panel (score|signals side-by-side) | right cols row
//   mobile   < 560px : all panels stacked vertically
// ─────────────────────────────────────────────────────────────────────────────

type CardLayout = 'desktop' | 'tablet' | 'mobile';

function getLayout(w: number): CardLayout {
  if (w < 560) return 'mobile';
  if (w < 900) return 'tablet';
  return 'desktop';
}

function HealthSummaryCard({ result }: { result: any }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<CardLayout>('desktop');

  // Track viewport breakpoints
  useEffect(() => {
    const update = () => setLayout(getLayout(window.innerWidth));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Pin card height to left panel's natural content height — desktop only.
  // Temporarily suppress flex-stretch so offsetHeight reflects actual content.
  useLayoutEffect(() => {
    const card = cardRef.current;
    const left = leftRef.current;
    if (!card || !left) return;

    if (layout !== 'desktop') {
      card.style.height = 'auto';
      return;
    }

    const pin = () => {
      card.style.alignItems = 'flex-start'; // suppress flex stretch for accurate measure
      const h = left.offsetHeight;
      card.style.alignItems = '';
      card.style.height = `${h}px`;
    };

    pin();
    const ro = new ResizeObserver(pin);
    ro.observe(card);
    return () => ro.disconnect();
  }, [layout]);

  const geo  = result.overall_geo_score ?? 0;
  const tier = geoTier(geo);

  const improvements = (result.improvements_list || []).slice(0, 5);
  const strengths    = (result.strengths_list    || []).slice(0, 5);

  const isDesktop = layout === 'desktop';
  const isMobile  = layout === 'mobile';

  // ── RightCol ──────────────────────────────────────────────────────────────

  function RightCol({ title, items, accentColor, countColor }: {
    title: string; items: any[]; accentColor: string; countColor: string;
  }) {
    return (
      <div className={`hsc-col${isDesktop ? ' hsc-col--desktop' : ''}`}>
        <div className="hsc-bhead">
          <span className="hsc-bhead-title">{title}</span>
          <span className="hsc-bhead-count" style={{ color: countColor }}>{items.length}</span>
          <div className="hsc-bhead-accent" style={{ background: accentColor }} />
        </div>
        <div className={isDesktop ? 'hsc-scroll' : 'hsc-natural'}>
          {items.map((item: any, i: number) => {
            const isObj  = item && typeof item === 'object';
            const bold   = isObj ? item.bold   : splitBoldFirst(item).bold;
            const detail = isObj ? item.detail : splitBoldFirst(item).rest;
            const signal = isObj ? item.signal : null;
            const weight = isObj ? item.weight : null;
            return (
              <div key={i} className={`hsc-item${i === items.length - 1 ? ' hsc-item--last' : ''}`}>
                <div className="hsc-item-text">
                  <strong className="hsc-item-bold">{bold}</strong>
                  {detail && ` ${detail}`}
                </div>
                {signal && (
                  <span className="hsc-item-caption">
                    {signal} &bull; {weight} of formula
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Signal rows ───────────────────────────────────────────────────────────

  const signalRows = SIGNALS.map((sig) => {
    const val = result[sig.key] ?? 0;
    const st  = geoTier(val);
    return (
      <div key={sig.key} className="hsc-signal-row">
        <span className="hsc-signal-name">{sig.label}</span>
        <div className="hsc-signal-right">
          <span className="hsc-signal-score" style={{ color: st.text }}>{val}</span>
          <span className="hsc-signal-dot" style={{ background: st.fill }} />
        </div>
      </div>
    );
  });

  return (
    <div ref={cardRef} className={`hsc-card hsc-card--${layout}`}>

      {/* Left panel */}
      <div ref={leftRef} className={`hsc-left hsc-left--${layout}`}>
        {isDesktop ? (
          // Desktop: score block stacked above signals
          <>
            <div className="hsc-geo-block">
              <div className="hsc-geo-eyebrow">GEO Score</div>
              <div className="hsc-geo-number" style={{ color: tier.text }}>{geo}</div>
              <div className="hsc-geo-tier"   style={{ color: tier.text }}>{tier.label}</div>
            </div>
            <div className="hsc-signals-label">Signals</div>
            {signalRows}
          </>
        ) : (
          // Tablet / Mobile: score sub-col | thin divider | signals sub-col
          <>
            <div className="hsc-score-subcol">
              <div className="hsc-geo-eyebrow">GEO Score</div>
              <div className="hsc-geo-number" style={{ color: tier.text }}>{geo}</div>
              <div className="hsc-geo-tier"   style={{ color: tier.text }}>{tier.label}</div>
            </div>
            <div className="hsc-inner-divider" />
            <div className="hsc-signals-subcol">
              <div className="hsc-signals-label">Signals</div>
              {signalRows}
            </div>
          </>
        )}
      </div>

      {/* Right panel */}
      <div className={`hsc-right-panel hsc-right-panel--${layout}`}>
        <RightCol title="Needs Improvement" items={improvements} accentColor="#B7002F" countColor="rgba(183,0,47,0.35)" />
        <div className={isMobile ? 'hsc-col-divider--h' : 'hsc-col-divider--v'} />
        <RightCol title="Working Well"       items={strengths}    accentColor="#007653" countColor="rgba(0,118,83,0.35)" />
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Queries Board
// ─────────────────────────────────────────────────────────────────────────────

const TREND_COLS = [
  { key: 'Peak',   label: 'Trending Now', color: '#A100FF' },
  { key: 'Rising', label: 'Growing',      color: '#111111' },
  { key: 'Stable', label: 'Steady',       color: '#6B7280' },
];

function buildInsight(q: any, brand: string, leader: string | null): { context: string; outlook: string } {
  const cat = q.category || 'this category';
  const opp = (q.opportunity || 'Medium') as string;

  if (opp === 'High') {
    if (leader) return {
      context: `${leader} currently leads AI responses in ${cat}. High opportunity — this is an actively contested query type.`,
      outlook: `Testing will reveal the gap. ${brand} has a realistic path to citation here with targeted content.`,
    };
    return {
      context: `High opportunity in ${cat}. No dominant competitor has locked this down yet.`,
      outlook: `The landscape is more open than usual — worth testing as a priority.`,
    };
  }

  if (opp === 'Medium') {
    if (leader) return {
      context: `${leader} leads in ${cat} but the space isn't locked down.`,
      outlook: `Moderate opportunity — targeted content could meaningfully improve ${brand}'s citation rate here.`,
    };
    return {
      context: `Moderate opportunity in ${cat}.`,
      outlook: `Testing will show where ${brand} currently stands and what's needed to improve.`,
    };
  }

  return {
    context: `Lower priority ${cat} query. AI typically treats this as a factual explainer rather than a brand recommendation.`,
    outlook: `Limited citation upside — deprioritize in favor of higher-opportunity queries.`,
  };
}

function QueryCard({ q, leader, brand, onTestQuery }: {
  q: any; leader: string | null; brand: string; onTestQuery: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { context, outlook } = buildInsight(q, brand, leader);

  return (
    <div className="mqb-qcard">
      <div className="mqb-qcard-header" onClick={() => setOpen(!open)}>
        <span className="mqb-qcard-cat">{q.category}</span>
        <svg
          className={`mqb-qcard-chevron mqb-qcard-chevron--${open ? 'open' : 'closed'}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="2,4 6,8 10,4" />
        </svg>
      </div>
      <div className="mqb-qcard-body" onClick={() => setOpen(!open)}>
        <span className="mqb-qcard-query">{q.query}</span>
      </div>
      <div className="mqb-qcard-footer" onClick={() => setOpen(!open)}>
        <span className="mqb-qcard-untested">Not yet tested</span>
      </div>
      {open && (
        <div className="mqb-qcard-drawer">
          <div className="mqb-qcard-context">{context}</div>
          <div className="mqb-qcard-outlook">{outlook}</div>
          <button
            className="mqb-qcard-test-btn"
            onClick={(e) => { e.stopPropagation(); onTestQuery(); }}
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 5.5h7M6 2.5l3 3-3 3" />
            </svg>
            Test this query
          </button>
        </div>
      )}
    </div>
  );
}

function MarketQueriesBoard({ result, setActiveParent }: {
  result: any; setActiveParent: (n: number) => void;
}) {
  const queries: any[]  = result.trending_queries || [];
  const clusters: any[] = result.query_clusters   || [];

  const getLeader = (category: string): string | null => {
    if (!category) return null;
    const cat = category.toLowerCase();
    const match = clusters.find((c: any) =>
      c.category?.toLowerCase() === cat ||
      c.category?.toLowerCase().includes(cat) ||
      cat.includes(c.category?.toLowerCase())
    );
    return match?.topCompetitor || null;
  };

  if (!queries.length) return null;

  return (
    <div className="cmpCard" style={{ marginBottom: '24px' }}>
      <div className="mqb-header">
        <span className="mqb-title">What the Market Is Asking Right Now</span>
        <span className="mqb-meta">
          AI-assessed trend signals · {queries.length} queries
          <span
            className="mqb-info-icon"
            data-tip="AI-estimated trends — not live search data. Use as directional signal only."
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6.5" cy="6.5" r="5.5" />
              <line x1="6.5" y1="5.5" x2="6.5" y2="9" />
              <circle cx="6.5" cy="3.8" r="0.5" fill="currentColor" stroke="none" />
            </svg>
          </span>
        </span>
      </div>

      <div className="mqb-board">
        {TREND_COLS.map((col) => {
          const colQueries = queries.filter((q: any) => q.trend === col.key);
          return (
            <div key={col.key} className="mqb-col">
              <div className="mqb-col-head" style={{ borderBottom: `2px solid ${col.color}` }}>
                <span className="mqb-col-label" style={{ color: col.color }}>{col.label}</span>
                <span className="mqb-col-count">{colQueries.length}</span>
              </div>
              {colQueries.length === 0 ? (
                <div className="mqb-col-empty">No queries here</div>
              ) : (
                colQueries.map((q: any, i: number) => (
                  <QueryCard
                    key={i}
                    q={q}
                    leader={getLeader(q.category)}
                    brand={result.brand_name || 'Your brand'}
                    onTestQuery={() => setActiveParent(3)}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Priorities: Overall
// ─────────────────────────────────────────────────────────────────────────────

export default function PrioritiesTab({ result, setActiveParent }: TabProps) {
  return (
    <div id="tab-priorities-overall">
      <div className="apSectionTitle">GEO Health Summary</div>
      <div className="apSectionSubtitle">Based on how your brand performed across AI queries.</div>
      <HealthSummaryCard result={result} />
      <MarketQueriesBoard result={result} setActiveParent={setActiveParent} />
    </div>
  );
}
