'use client';

import React, { useState } from 'react';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const WIN_THRESHOLD       = 60;
const CONTESTED_THRESHOLD = 30;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function preWinOpp(winRate: number): string {
  if (winRate >= 50) return 'Quick Win';
  if (winRate >= 25) return 'Attainable';
  return 'Long Play';
}

function buildLead(brand: string, gapN: number, conN: number, winN: number): string {
  const total = gapN + conN + winN;
  if (total === 0) return `No product data found for ${brand} yet.`;
  if (winN > 0 && winN >= gapN && winN >= conN) return `${brand}'s key products dominate AI recommendations.`;
  if (gapN > conN && gapN > winN) {
    if (conN > 0) {
      return `Most of ${brand}'s products are underrepresented in AI — only ${conN} ${conN === 1 ? 'is' : 'are'} contested.`;
    }
    return `Most of ${brand}'s key products have low AI visibility.`;
  }
  if (conN >= gapN && conN > winN) return `Product visibility is mostly contested — winnable with content investment.`;
  return `Product visibility is split across all three tiers.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chevron SVG
// ─────────────────────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`cov-card-chev${open ? ' cov-card-chev--open' : ''}`}
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
// SegCard
// ─────────────────────────────────────────────────────────────────────────────

interface Segment {
  name: string;
  winRate: number;
  tier: 'gap' | 'contested' | 'winning';
  opp: string;
  topCompetitor: string | null;
  topCompetitorScore: number | null;
  queryCount: number;
}

function SegCard({ seg, isFirst, onViewPrompts }: {
  seg: Segment;
  isFirst: boolean;
  onViewPrompts: () => void;
}) {
  const [open, setOpen] = useState(isFirst);
  const isWin   = seg.tier === 'winning';
  const gapToWin = WIN_THRESHOLD - seg.winRate;

  // Metric row label + value based on position
  let metricLabel: string;
  let metricValue: React.ReactNode;
  let comparatorLabel: string;

  if (!isWin) {
    metricLabel = 'Gap to win';
    metricValue = (
      <span className="cov-delta">+{gapToWin}% to reach {WIN_THRESHOLD}% threshold</span>
    );
    comparatorLabel = 'Leader';
  } else if (seg.opp === 'Defending') {
    const lead = seg.topCompetitorScore != null ? seg.winRate - seg.topCompetitorScore : null;
    metricLabel = 'Lead';
    metricValue = lead != null ? (
      <span className="cov-delta">
        +{lead}% over {lead > 25 ? 'the field' : seg.topCompetitor ?? 'the field'}
      </span>
    ) : (
      <span className="cov-delta">Holding the top spot</span>
    );
    comparatorLabel = 'Runner-up';
  } else {
    // Contender
    const deficit = seg.topCompetitorScore != null ? seg.topCompetitorScore - seg.winRate : null;
    metricLabel = 'Gap to lead';
    metricValue = deficit != null && seg.topCompetitor ? (
      <span className="cov-delta">−{deficit}% behind {seg.topCompetitor} for the top spot</span>
    ) : (
      <span className="cov-delta">Close to the leader</span>
    );
    comparatorLabel = 'Leader';
  }

  return (
    <div className="cov-card">
      <div className="cov-card-head" onClick={() => setOpen(!open)}>
        <span className="cov-card-name">{seg.name}</span>
        <span className="cov-card-coverage">{seg.winRate}%</span>
        <ChevronIcon open={open} />
      </div>
      <div className={`cov-card-foot-strip${isWin ? ' cov-card-foot-strip--win' : ''}`}>
        {seg.opp}
      </div>
      {open && (
        <div className="cov-card-body">

          {/* Coverage bar */}
          <div className="cov-bar-row">
            <span className="cov-row-label">Coverage</span>
            <div className="cov-bar">
              <div
                className={`cov-bar-fill${isWin ? ' cov-bar-fill--win' : ''}`}
                style={{ width: `${Math.min(seg.winRate, 100)}%` }}
              />
              <div className="cov-bar-threshold" />
            </div>
            <span className="cov-row-val">{seg.winRate}%</span>
          </div>

          {/* Gap / Lead / Gap-to-lead */}
          <div className="cov-info-row">
            <span className="cov-row-label">{metricLabel}</span>
            <span className="cov-row-content">{metricValue}</span>
          </div>

          {/* Competitor row */}
          {seg.topCompetitor && (
            <div className="cov-info-row">
              <span className="cov-row-label">{comparatorLabel}</span>
              <span className="cov-row-content">
                <span className="cov-leader-name">{seg.topCompetitor}</span>
                {seg.topCompetitorScore != null && (
                  <span className="cov-leader-pct">{seg.topCompetitorScore}%</span>
                )}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="cov-card-foot">
            <span className="cov-queries-tested">
              <b>{seg.queryCount}</b> {seg.queryCount === 1 ? 'response' : 'responses'} mention this product
            </span>
          </div>
          <button
            className="cov-prompts-link"
            onClick={(e) => { e.stopPropagation(); onViewPrompts(); }}
          >
            View prompts mentioning this product
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
// Coverage Tab
// ─────────────────────────────────────────────────────────────────────────────

export default function PrioritiesCoverageTab({ result, resultComps, setActiveParent }: TabProps) {
  const [sortBy,     setSortBy]     = useState<string>('gap');
  const [filterComp, setFilterComp] = useState<string>('all');
  const [filterOpp,  setFilterOpp]  = useState<string>('all');
  const [activeLane, setActiveLane] = useState<string>('gap');

  const brand    = result.brand_name || 'Your brand';
  const rd       = result.responses_detail || [];
  const clusters = result.product_clusters || [];

  // Build segments from product clusters
  const rawSegments: Segment[] = clusters.map((c: any) => {
    const winRate = c.winRate ?? 0;
    const tier: Segment['tier'] =
      winRate >= WIN_THRESHOLD ? 'winning'
      : winRate >= CONTESTED_THRESHOLD ? 'contested'
      : 'gap';
    const opp = tier === 'winning'
      ? (c.topCompetitorScore != null && c.topCompetitorScore > winRate ? 'Contender' : 'Defending')
      : preWinOpp(winRate);
    return {
      name:               c.product,
      winRate,
      tier,
      opp,
      topCompetitor:      c.topCompetitor      ?? null,
      topCompetitorScore: c.topCompetitorScore ?? null,
      queryCount:         c.mentioned          ?? 0,
    };
  });

  // Unique competitor names for filter dropdown
  const compNames = Array.from(
    new Set(rawSegments.map(s => s.topCompetitor).filter(Boolean))
  ) as string[];

  // Filter
  const filtered = rawSegments.filter(s => {
    if (filterComp !== 'all' && s.topCompetitor !== filterComp) return false;
    if (filterOpp  !== 'all' && s.opp !== filterOpp)            return false;
    return true;
  });

  // Sort
  const sortFn = (a: Segment, b: Segment): number => {
    if (sortBy === 'gap')      return a.winRate - b.winRate;            // lowest first = biggest gap
    if (sortBy === 'coverage') return b.winRate - a.winRate;            // highest first
    if (sortBy === 'queries')  return b.queryCount - a.queryCount;
    return a.name.localeCompare(b.name);
  };

  const gapSegs       = filtered.filter(s => s.tier === 'gap').sort(sortFn);
  const contestedSegs = filtered.filter(s => s.tier === 'contested').sort(sortFn);
  const winningSegs   = filtered.filter(s => s.tier === 'winning').sort(sortFn);

  const totalSegments = rawSegments.length;
  const totalPrompts  = rd.length;
  const lead          = buildLead(brand, gapSegs.length, contestedSegs.length, winningSegs.length);
  const hasFilters    = filterComp !== 'all' || filterOpp !== 'all';

  return (
    <div id="tab-priorities-coverage">

      {/* Lead */}
      <div className="cov-eyebrow">Product visibility</div>
      <h2 className="cov-lead">{lead}</h2>
      <div className="cov-lead-sub">
        <b>{totalSegments}</b> products tracked
        <span className="cov-sep">·</span>
        <b>{totalPrompts}</b> prompts
      </div>

      {/* Filter bar */}
      <div className="cov-filter-bar">
        <span className="cov-filter-label">Sort</span>
        <select
          className={`cov-filter-select${sortBy !== 'gap' ? ' cov-filter-select--active' : ''}`}
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="gap">Gap size (largest first)</option>
          <option value="coverage">Coverage % (highest first)</option>
          <option value="queries">Query volume</option>
          <option value="alpha">Product name (A–Z)</option>
        </select>

        <span className="cov-filter-label">Filter</span>
        <select
          className={`cov-filter-select${filterComp !== 'all' ? ' cov-filter-select--active' : ''}`}
          value={filterComp}
          onChange={e => setFilterComp(e.target.value)}
        >
          <option value="all">Competitor: All</option>
          {compNames.map(c => (
            <option key={c} value={c}>Competitor: {c}</option>
          ))}
        </select>

        <select
          className={`cov-filter-select${filterOpp !== 'all' ? ' cov-filter-select--active' : ''}`}
          value={filterOpp}
          onChange={e => setFilterOpp(e.target.value)}
        >
          <option value="all">Opportunity: All</option>
          <option value="Quick Win">Opportunity: Quick Win</option>
          <option value="Attainable">Opportunity: Attainable</option>
          <option value="Long Play">Opportunity: Long Play</option>
          <option value="Defending">Opportunity: Defending</option>
          <option value="Contender">Opportunity: Contender</option>
        </select>

        {hasFilters && (
          <div className="cov-filter-right">
            <button
              className="cov-filter-reset"
              onClick={() => { setFilterComp('all'); setFilterOpp('all'); }}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Board — single white card, three lanes */}
      <div className="cov-board-wrap">
        {/* Lane toggle — revealed at tablet/mobile by CSS */}
        <div className="cov-board-toggle">
          <button
            className={`cov-lt-btn${activeLane === 'gap' ? ' cov-lt-btn--active' : ''}`}
            onClick={() => setActiveLane('gap')}
          >
            Gap <span className="cov-lt-count">{gapSegs.length}</span>
          </button>
          <button
            className={`cov-lt-btn${activeLane === 'contested' ? ' cov-lt-btn--active' : ''}`}
            onClick={() => setActiveLane('contested')}
          >
            Contested <span className="cov-lt-count">{contestedSegs.length}</span>
          </button>
          <button
            className={`cov-lt-btn cov-lt-btn--winning${activeLane === 'winning' ? ' cov-lt-btn--active' : ''}`}
            onClick={() => setActiveLane('winning')}
          >
            Winning <span className="cov-lt-count">{winningSegs.length}</span>
          </button>
        </div>
        <div className="cov-board">

        {/* Gap */}
        <div className={`cov-col cov-col--gap${activeLane === 'gap' ? ' cov-col--active' : ''}`}>
          <div className="cov-col-head-row">
            <span className="cov-col-label">Gap</span>
            <span className="cov-col-count">{gapSegs.length}</span>
            <span className="cov-col-threshold">&lt;30%</span>
          </div>
          <div className="cov-col-underline" />
          <div className="cov-col-body">
            {gapSegs.length === 0 ? (
              <div className="cov-col-empty">
                <div className="cov-col-empty-title">No gap products</div>
                <div className="cov-col-empty-sub">All products are at 30% visibility or above.</div>
              </div>
            ) : gapSegs.map((seg, i) => (
              <SegCard
                key={seg.name}
                seg={seg}
                isFirst={i === 0}
                onViewPrompts={() => setActiveParent(3)}
              />
            ))}
          </div>
        </div>

        {/* Contested */}
        <div className={`cov-col cov-col--contested${activeLane === 'contested' ? ' cov-col--active' : ''}`}>
          <div className="cov-col-head-row">
            <span className="cov-col-label">Contested</span>
            <span className="cov-col-count">{contestedSegs.length}</span>
            <span className="cov-col-threshold">30–59%</span>
          </div>
          <div className="cov-col-underline" />
          <div className="cov-col-body">
            {contestedSegs.length === 0 ? (
              <div className="cov-col-empty">
                <div className="cov-col-empty-title">No contested products</div>
                <div className="cov-col-empty-sub">Products at 30–59% visibility appear here.</div>
              </div>
            ) : contestedSegs.map((seg, i) => (
              <SegCard
                key={seg.name}
                seg={seg}
                isFirst={i === 0}
                onViewPrompts={() => setActiveParent(3)}
              />
            ))}
          </div>
        </div>

        {/* Winning */}
        <div className={`cov-col cov-col--winning${activeLane === 'winning' ? ' cov-col--active' : ''}`}>
          <div className="cov-col-head-row">
            <span className="cov-col-label">Winning</span>
            <span className="cov-col-count">{winningSegs.length}</span>
            <span className="cov-col-threshold">≥60%</span>
          </div>
          <div className="cov-col-underline" />
          <div className="cov-col-body">
            {winningSegs.length === 0 ? (
              <div className="cov-col-empty">
                <div className="cov-col-empty-title">No products here yet</div>
                <div className="cov-col-empty-sub">Reach 60% visibility in any product to win it.</div>
              </div>
            ) : winningSegs.map((seg, i) => (
              <SegCard
                key={seg.name}
                seg={seg}
                isFirst={i === 0}
                onViewPrompts={() => setActiveParent(3)}
              />
            ))}
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}
