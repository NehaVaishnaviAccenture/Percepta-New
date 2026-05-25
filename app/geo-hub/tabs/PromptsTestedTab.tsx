'use client';
import React, { useState, useLayoutEffect, useRef, useCallback, useMemo } from 'react';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

// ── Deterministic name-hash (for demo-mode rank spread) ───────────────────────
function nameHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) & 0xffff;
  return h;
}

// ── Tier helpers ──────────────────────────────────────────────────────────────
const TIER_FILL: Record<string, string> = {
  fragmented: 'var(--color-tier-fragmented)',
  emerging:   'var(--color-tier-emerging)',
  competitive:'var(--color-tier-competitive)',
  leader:     'var(--color-tier-leader)',
  authority:  'var(--color-tier-authority)',
};
const TIER_TEXT: Record<string, string> = {
  fragmented: '#fff',
  emerging:   '#412402',
  competitive:'#412402',
  leader:     '#fff',
  authority:  '#fff',
};
const TIER_LABEL: Record<string, string> = {
  fragmented: 'Fragmented',
  emerging:   'Emerging',
  competitive:'Competitive',
  leader:     'Leader',
  authority:  'Authority',
};
const TIER_RANGE: Record<string, string> = {
  fragmented: '<45%',
  emerging:   '45–55%',
  competitive:'56–69%',
  leader:     '70–79%',
  authority:  '≥80%',
};
const RANK_TO_TIER: Record<number, string> = { 1:'authority', 2:'leader', 3:'competitive', 4:'emerging', 5:'fragmented' };

// "On white" — darker shade of each tier color for text on light backgrounds
const TIER_ON_WHITE: Record<string, string> = {
  fragmented: 'var(--color-tier-fragmented-text)',
  emerging:   'var(--color-tier-emerging-text)',
  competitive:'var(--color-tier-competitive-text)',
  leader:     'var(--color-tier-leader-text)',
  authority:  'var(--color-tier-authority-text)',
};

// Subtle stroke color — separates touching bubbles without heavy chrome
const TIER_STROKE: Record<string, string> = {
  fragmented: 'rgba(183,0,47,0.4)',
  emerging:   'rgba(177,95,0,0.4)',
  competitive:'rgba(153,110,0,0.4)',
  leader:     'rgba(4,59,204,0.4)',
  authority:  'rgba(0,118,83,0.4)',
};

// Y-axis helpers — mirrors the reference HTML logic
function computeYMax(rawMax: number): number {
  if (rawMax <= 10)  return 10;
  if (rawMax <= 20)  return 20;
  if (rawMax <= 50)  return 50;
  if (rawMax <= 100) return 100;
  if (rawMax <= 200) return 200;
  if (rawMax <= 500) return 500;
  return Math.ceil(rawMax / 100) * 100;
}
function computeYTicks(yMax: number): number[] {
  let step = 10;
  if (yMax <= 60)       step = 10;
  else if (yMax <= 100) step = 20;
  else if (yMax <= 200) step = 25;
  else if (yMax <= 500) step = 50;
  else                  step = 100;
  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += step) ticks.push(v);
  return ticks;
}

function winRateToTier(wr: number): string {
  if (wr >= 80) return 'authority';
  if (wr >= 70) return 'leader';
  if (wr >= 56) return 'competitive';
  if (wr >= 45) return 'emerging';
  return 'fragmented';
}

// ── Rank badge ────────────────────────────────────────────────────────────────
function RankBadge({ rank, size = 'sm' }: { rank: number; size?: 'sm' | 'lg' }) {
  if (!rank || rank <= 0) {
    const cls = size === 'lg' ? 'ptRecapRankBadge ptRecapRankBadge--missed' : 'ptRankBadge ptRankBadge--missed';
    return <span className={cls}>— missed</span>;
  }
  const tier = RANK_TO_TIER[rank] ?? 'fragmented';
  const fill = TIER_FILL[tier];
  const text = TIER_TEXT[tier];
  if (size === 'lg') {
    return (
      <span className="ptRecapRankBadge" style={{ background: fill, color: text }}>
        #{rank}<span className="ptRankOut"> / 5</span>
      </span>
    );
  }
  return (
    <span className="ptRankBadge" style={{ background: fill, color: text }}>
      #{rank}<span className="ptRankOut"> / 5</span>
    </span>
  );
}

// ── Eyebrow ───────────────────────────────────────────────────────────────────
function Eyebrow({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: 'var(--font-sans)',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: '#6B6B6B',
      lineHeight: 1,
      ...style,
    }} className={className}>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PromptsTestedTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  // ── Derived data ──────────────────────────────────────────────
  const rd: any[] = result.responses_detail || [];
  const clusters: any[] = result.query_clusters || [];
  const trendingQs: any[] = result.trending_queries || [];
  const brandName: string = result.brand_name || '';
  const indLabel: string = result.ind_label || result.industry || '';

  const totalQueries = result.total_responses ?? rd.length;
  const totalMentions = result.responses_with_brand ?? rd.filter((r: any) => r.mentioned || r.brand_mentioned).length;
  const displayRate = Math.round((totalMentions / Math.max(totalQueries, 1)) * 100);

  const mentionedWithRank = rd.filter((r: any) => r.mentioned && r.position > 0);
  const avgRank = mentionedWithRank.length
    ? Math.round((mentionedWithRank.reduce((s: number, r: any) => s + r.position, 0) / mentionedWithRank.length) * 10) / 10
    : null;

  // Bubble data from clusters — memoized against result so reference stays stable across renders
  const bubbleData = useMemo(() => {
    const _clusters: any[] = result.query_clusters || [];
    const _rd: any[] = result.responses_detail || [];
    return _clusters.map((c: any) => {
      const catRows = _rd.filter((r: any) => r.category === c.category);
      const mRows = catRows.filter((r: any) => r.mentioned && r.position > 0);
      const avgRankCluster = mRows.length
        ? mRows.reduce((s: number, r: any) => s + r.position, 0) / mRows.length
        // Fallback: use winRate if available, otherwise use a deterministic name-hash spread
        // so clusters fan across the chart in demo mode rather than all stacking at rank 5.
        : (c.winRate ?? 0) > 0
          ? Math.max(1, Math.min(5, 5 - (c.winRate) / 25))
          : 1.5 + (nameHash(c.category) % 300) / 100; // 1.5–4.5, deterministic per name
      const tier = winRateToTier(c.winRate ?? 0);
      return {
        id: c.category,
        name: c.category,
        tier,
        rank: avgRankCluster,
        vol: c.total ?? catRows.length,
        appearances: c.mentioned ?? mRows.length,
        winRate: c.winRate ?? 0,
        topCompetitor: c.topCompetitor ?? '',
      };
    }).sort((a: any, b: any) => {
      // Urgent first: high vol AND bad rank (high number = worse)
      const urgencyScore = (d: any) => (d.vol ?? 0) * (d.rank ?? 3.5);
      return urgencyScore(b) - urgencyScore(a);
    });
  }, [result]);

  // ── State ──────────────────────────────────────────────────────
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [hoveredTopicId, setHoveredTopicId]   = useState<string | null>(null);
  const [view, setView]                         = useState<'list' | 'detail'>('list');
  const [currentPrompt, setCurrentPrompt]       = useState<any | null>(null);
  const [page, setPage]                         = useState(1);
  const [showAppeared, setShowAppeared]         = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedScrollY = useRef<number>(0);

  // Bubble positions
  const plotRef = useRef<HTMLDivElement>(null);
  const [bubblePositions, setBubblePositions] = useState<Record<string, { x: number; y: number; size: number }>>({});

  const ROWS_PER_PAGE = 10;
  const PLOT_INSET = 60;
  const MIN_BUBBLE = 42;
  const MAX_BUBBLE = 100;
  const MAX_JITTER = 30;
  const SEP_PAD = 4;
  const JITTER_ITERS = 12;

  // Compute bubble positions
  const computePositions = useCallback(() => {
    if (!plotRef.current || bubbleData.length === 0) return;
    const plotW = plotRef.current.offsetWidth;
    const plotH = plotRef.current.offsetHeight;
    if (!plotW || !plotH) return;

    const maxApp = Math.max(...bubbleData.map((b) => b.appearances), 1);
    const yMax   = Math.max(...bubbleData.map((b) => b.vol), 1);

    // Initial positions
    const positions: Array<{ id: string; x: number; y: number; size: number; jx: number; jy: number }> =
      bubbleData.map((b) => {
        const size = MIN_BUBBLE + ((b.appearances / maxApp) * (MAX_BUBBLE - MIN_BUBBLE));
        const xNorm = (5 - b.rank) / 4; // rank 5 → left, rank 1 → right
        const yNorm = (yMax - b.vol) / yMax; // high vol → top
        const x = PLOT_INSET + xNorm * (plotW - 2 * PLOT_INSET);
        const y = PLOT_INSET + yNorm * (plotH - 2 * PLOT_INSET);
        return { id: b.id, x, y, size, jx: 0, jy: 0 };
      });

    // Collision resolution
    for (let iter = 0; iter < JITTER_ITERS; iter++) {
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const pi = positions[i], pj = positions[j];
          const dx = (pi.x + pi.jx) - (pj.x + pj.jx);
          const dy = (pi.y + pi.jy) - (pj.y + pj.jy);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = (pi.size + pj.size) / 2 + SEP_PAD;
          if (dist < minDist && dist > 0) {
            const push = (minDist - dist) / 2;
            const nx = dx / dist, ny = dy / dist;
            pi.jx = Math.max(-MAX_JITTER, Math.min(MAX_JITTER, pi.jx + nx * push));
            pi.jy = Math.max(-MAX_JITTER, Math.min(MAX_JITTER, pi.jy + ny * push));
            pj.jx = Math.max(-MAX_JITTER, Math.min(MAX_JITTER, pj.jx - nx * push));
            pj.jy = Math.max(-MAX_JITTER, Math.min(MAX_JITTER, pj.jy - ny * push));
          }
        }
      }
    }

    const result: Record<string, { x: number; y: number; size: number }> = {};
    positions.forEach((p) => {
      result[p.id] = { x: p.x + p.jx, y: p.y + p.jy, size: p.size };
    });
    setBubblePositions(result);
  }, [bubbleData]);

  useLayoutEffect(() => {
    computePositions();
    const el = plotRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => computePositions());
    ro.observe(el);
    return () => ro.disconnect();
  }, [computePositions]);

  // Restore canvas scroll position when returning from detail → list
  useLayoutEffect(() => {
    if (view === 'list' && savedScrollY.current > 0) {
      const canvas = document.querySelector('.canvas');
      if (canvas) canvas.scrollTop = savedScrollY.current;
    }
  }, [view]);

  // ── Derived for active topic ──────────────────────────────────
  const activeSummaryId = hoveredTopicId ?? selectedTopicId;
  const activeTopic = activeSummaryId
    ? bubbleData.find((b) => b.id === activeSummaryId)
    : null;

  // Filtered prompt list — topic filter + optional appeared-only toggle (context-aware)
  const filteredRows = (() => {
    let rows = selectedTopicId ? rd.filter((r: any) => r.category === selectedTopicId) : rd;
    if (showAppeared) rows = rows.filter((r: any) => r.mentioned || r.brand_mentioned);
    return rows;
  })();
  const totalFiltered = filteredRows.length;
  const totalPages = Math.ceil(totalFiltered / ROWS_PER_PAGE) || 1;
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  // ── Handlers ──────────────────────────────────────────────────
  function handleBubbleClick(id: string) {
    setSelectedTopicId((prev) => (prev === id ? null : id));
    setPage(1);
  }

  function handleBubbleEnter(id: string) {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoveredTopicId(id), 100);
  }

  function handleBubbleLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoveredTopicId(null);
  }

  function getCanvas(): Element | null {
    return document.querySelector('.canvas');
  }

  function handleRowClick(item: any) {
    const canvas = getCanvas();
    savedScrollY.current = canvas ? canvas.scrollTop : 0;
    setCurrentPrompt(item);
    setView('detail');
    if (canvas) canvas.scrollTop = 0;
  }

  function handleBack() {
    setView('list');
    setCurrentPrompt(null);
  }

  // ── Summary sentence ──────────────────────────────────────────
  function buildSummary(topic: (typeof bubbleData)[0] | null): React.ReactNode {
    if (!topic) return null;
    const tierLabel = TIER_LABEL[topic.tier] ?? topic.tier;
    const tierColor = TIER_ON_WHITE[topic.tier] ?? '#2B2B2B';
    const rankLabel = topic.rank ? `avg rank ${topic.rank.toFixed(1)}` : 'no rank data';
    return (
      <>
        <strong>"{topic.name}"</strong> is{' '}
        <span className="ptSummaryTierName" style={{ color: tierColor, fontWeight: 600 }}>{tierLabel.toLowerCase()}</span>
        {' '}territory — <strong>{topic.appearances}</strong> appearances across <strong>{topic.vol}</strong> prompts ({topic.winRate}% win rate, {rankLabel}).
        {topic.topCompetitor ? <> Top rival: <strong>{topic.topCompetitor}</strong>.</> : ''}
      </>
    );
  }

  // ── Highlight text ────────────────────────────────────────────
  function highlightText(text: string, brand: string, competitor: string): string {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    if (brand) {
      escaped = escaped.replace(
        new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        (m) => `<span class="ptMentionBrand">${m}</span>`,
      );
    }
    if (competitor && competitor !== brand) {
      escaped = escaped.replace(
        new RegExp(competitor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        (m) => `<span class="ptMentionCompetitor">${m}</span>`,
      );
    }
    return escaped;
  }

  // ── Recap summary sentence ────────────────────────────────────
  function buildRecapSummary(item: any): string {
    if (!item) return '';
    const missed = !item.mentioned && !item.brand_mentioned;
    if (missed) return `${brandName} was not mentioned in this AI response. ${item.winner_brand && item.winner_brand !== brandName ? `${item.winner_brand} appeared instead.` : 'No specific brand was highlighted.'}`;
    if (item.position === 1) return `${brandName} ranked #1 in this response — you're the top recommendation for this query.`;
    const rank = item.position > 0 ? `#${item.position}` : 'a lower position';
    return `${brandName} appeared at ${rank} in this response.${item.winner_brand && item.winner_brand !== brandName ? ` ${item.winner_brand} ranked ahead.` : ''}`;
  }

  // ── Teaser count ──────────────────────────────────────────────
  const teaserCount = trendingQs.length;

  // ─────────────────────────────────────────────────────────────
  // DETAIL SCREEN
  // ─────────────────────────────────────────────────────────────
  if (view === 'detail' && currentPrompt) {
    const item = currentPrompt;
    const missed = !item.mentioned && !item.brand_mentioned;
    const beater = item.winner_brand && item.winner_brand !== brandName ? item.winner_brand : null;
    const recapTier = item.position > 0 ? (RANK_TO_TIER[item.position] ?? 'fragmented') : null;
    const promptTruncated = item.query ? (item.query.length > 60 ? item.query.slice(0, 57) + '…' : item.query) : '';
    const responseText = item.response_preview || '';
    const hasResponse = Boolean(responseText);
    const brandCount = hasResponse
      ? (responseText.match(new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
      : 0;
    const compCount = hasResponse && beater
      ? (responseText.match(new RegExp(beater.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length
      : 0;

    return (
      <div id="tab-prompts-tested" className="ptRoot">
        <div id="pt-detail-screen" className="ptDetailScreen">
          {/* Back bar */}
          <div className="ptBackBar">
            <span className="ptBackLink" onClick={handleBack}>
              <span className="ptBackArrow">‹</span> Tested Prompts
            </span>
            <span className="ptBackSep">/</span>
            <span className="ptBackCurrent">"{promptTruncated}"</span>
          </div>

          {/* Recap block */}
          <div className="ptRecapBlock" id="pt-recap-block">
            <div className="ptRecapEyebrow">
              {item.category && <span className="ptRecapTopic">{item.category.toUpperCase()}</span>}
              {item.category && <span className="ptRecapSep">·</span>}
              <span className="ptRecapMeta">RUN 1</span>
            </div>
            <div className="ptRecapPrompt">
              <span className="ptRecapQuote">"{item.query}"</span>
            </div>
            <div className="ptRecapSummary">{buildRecapSummary(item)}</div>
            <div className="ptRecapMetaRow">
              <RankBadge rank={item.position} size="lg" />
              {item.prev_position > 0 && (() => {
                const moved = item.prev_position - item.position; // positive = moved up (better)
                if (moved === 0) return <span className="ptRecapDelta ptRecapDelta--flat">= 0</span>;
                const up = moved > 0;
                return (
                  <span className={`ptRecapDelta ptRecapDelta--${up ? 'up' : 'down'}`}>
                    {up ? '▲' : '▼'} {Math.abs(moved)}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Response block */}
          <div className="ptResponseBlock" id="pt-response-block">
            <Eyebrow style={{ marginBottom: 14 }}>AI RESPONSE · FULL TRANSCRIPT</Eyebrow>
            <div className="ptTranscriptMeta">
              <span><span className="ptTranscriptAssistant">Assistant:</span> GPT-4o</span>
              <span>·</span>
              <span>Captured [run timestamp]</span>
              {hasResponse && (
                <>
                  <span style={{ marginLeft: 'auto' }} />
                  <span className="ptTranscriptCounts">
                    {brandName && (
                      <span className="ptCountItem">
                        <span className="ptCountSwatch" style={{ background: '#F5E6FF', border: '1px solid #E6C2FF' }} />
                        {brandName} ×{brandCount}
                      </span>
                    )}
                    {beater && (
                      <span className="ptCountItem">
                        <span className="ptCountSwatch" style={{ background: '#E0F2FE', border: '1px solid #BAE6FD' }} />
                        {beater} ×{compCount}
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
            <div className="ptTranscriptWindow">
              {hasResponse ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: highlightText(responseText, brandName, beater ?? ''),
                  }}
                />
              ) : (
                <p style={{ color: '#6B6B6B', fontStyle: 'italic' }}>
                  Full AI response not captured for this prompt. Run the prompt live to see the complete transcript.
                </p>
              )}
            </div>
          </div>

          {/* Competitor breakdown */}
          <div className="ptCompBlock" id="pt-comp-block">
            <Eyebrow style={{ marginBottom: 14 }}>COMPETITOR BREAKDOWN</Eyebrow>
            {!beater || item.position === 1 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: TIER_FILL.authority, padding: '12px 0' }}>
                YOU RANKED #1 — NO COMPETITORS ABOVE
              </div>
            ) : (
              <div className="ptCompGrid">
                <div className="ptCompCard">
                  <div className="ptCompCardHeader">
                    <span className="ptCompName">{beater}</span>
                    <span className="ptCompRankBadge" style={{ background: TIER_FILL[RANK_TO_TIER[1] ?? 'authority'], color: TIER_TEXT[RANK_TO_TIER[1] ?? 'authority'] }}>
                      #1 <span className="ptRankOut">/ 5</span>
                    </span>
                  </div>
                  <div className="ptCompExcerpt">
                    "{beater} appeared as the top recommendation for this query type."
                  </div>
                  <span className="ptCompLink">See {beater}&apos;s GEO profile →</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="ptFooterActions" id="pt-footer-actions">
            <span className="ptFooterActionsText">Prompt ID: run-1 · {item.category}</span>
            <div className="ptFooterActionsButtons">
              <button className="ptBtnTertiary">Export this prompt&apos;s data ↓</button>
              <button className="ptBtnSecondary">Run this prompt live →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // LIST SCREEN
  // ─────────────────────────────────────────────────────────────
  return (
    <div id="tab-prompts-tested" className="ptRoot">
      <div id="pt-list-screen" className="ptListScreen">

        {/* ── Block 1: Hero stats ─────────────────────────────── */}
        <div className="ptHeroBlock" id="pt-hero-block">
          {/* <div className="ptHeroEyebrow">
            <Eyebrow>PROMPTS · RUN 1 ·{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </Eyebrow>
          </div> */}
          <div className="ptHeroGrid">
            <div className="ptHeroStat">
              <div className="ptHeroStatValue">{totalQueries.toLocaleString()}</div>
              <div className="ptHeroStatLabel">Total prompts run this period</div>
            </div>
            <div className="ptHeroStat">
              <div className="ptHeroStatValue">
                {totalMentions.toLocaleString()}
                <span className="ptHeroStatQual">{displayRate}%</span>
              </div>
              <div className="ptHeroStatLabel">Appearances — prompts where {brandName || 'your brand'} was mentioned</div>
            </div>
            <div className="ptHeroStat">
              <div className="ptHeroStatValue">
                {avgRank !== null ? avgRank.toFixed(1) : '—'}
                <span className="ptHeroStatQual">/ 5</span>
              </div>
              <div className="ptHeroStatLabel">Avg rank when {brandName || 'your brand'} appeared</div>
            </div>
          </div>
          <div style={{ marginTop: 20, borderTop: '1px solid #E5E5E5', paddingTop: 14 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: '#6B00A8', cursor: 'pointer', borderBottom: '1px solid #E6C2FF' }}>
              Download prompt set ↓
            </span>
          </div>
        </div>

        {/* ── Block 2: Bubble chart ───────────────────────────── */}
        {bubbleData.length > 0 && (() => {
          const maxApp = Math.max(...bubbleData.map((b) => b.appearances), 1);
          const maxVol = Math.max(...bubbleData.map((b) => b.vol), 1);
          const midVol = maxVol / 2;
          const yMax   = computeYMax(maxVol);
          const yTicks = computeYTicks(yMax);

          // Quadrant helper
          function getQuadrant(rank: number, vol: number): 'urgent' | 'stronghold' | 'lowpri' | 'niche' {
            const isLeft = rank >= 3;
            const isTop  = vol > midVol;
            if (isLeft  && isTop)  return 'urgent';
            if (!isLeft && isTop)  return 'stronghold';
            if (isLeft  && !isTop) return 'lowpri';
            return 'niche';
          }
          const QUADRANT_LABEL: Record<string, string> = {
            urgent: 'Urgent gap', stronghold: 'Stronghold',
            lowpri: 'Low priority', niche: 'Niche win',
          };
          // Mobile sort: urgent → stronghold → niche → lowpri, then vol desc
          const QUADRANT_PRIORITY: Record<string, number> = { urgent: 0, stronghold: 1, niche: 2, lowpri: 3 };
          const mobileSorted = [...bubbleData].sort((a, b) => {
            const pA = QUADRANT_PRIORITY[getQuadrant(a.rank, a.vol)];
            const pB = QUADRANT_PRIORITY[getQuadrant(b.rank, b.vol)];
            return pA !== pB ? pA - pB : b.vol - a.vol;
          });

          const tiers: Array<keyof typeof TIER_FILL> = ['fragmented', 'emerging', 'competitive', 'leader', 'authority'];

          return (
            <div className="ptChartBlock" id="pt-chart-block">
              <Eyebrow style={{ marginBottom: 10 }}>TOPIC PERFORMANCE · {bubbleData.length} TOPICS</Eyebrow>
              <div className="ptVexpHeadline">Where are your strongest topics, and where are the gaps?</div>
              <div className="ptVexpCtaLine ptVexpCtaLine--desktop">Click any bubble to filter the list below.</div>
              <div className="ptVexpCtaLine ptVexpCtaLine--mobile">Tap any topic to filter the list below.</div>

              {/* ── Desktop chart view ── */}
              <div className="ptChartView">
              <div className="ptBubbleCanvas">
                {/* Y-axis title */}
                <div className="ptYAxisTitle">Volume <br /> (Number of prompts)</div>

                {/* Plot area */}
                <div
                  className="ptPlot"
                  id="pt-plot"
                  ref={plotRef}
                  style={{ position: 'relative' }}
                >
                  {/* Quadrant gradient tints */}
                  <div className="ptQGradTopLeft" />
                  <div className="ptQGradTopRight" />

                  {/* Quadrant midlines */}
                  <div className="ptMidlineV" />
                  <div className="ptMidlineH" />

                  {/* Y-axis gridlines (intermediate — skip 0 and yMax which are the axis lines) */}
                  {yTicks.filter(v => v > 0 && v < yMax).map(v => (
                    <div
                      key={`gl-${v}`}
                      className="ptYGridline"
                      style={{ top: `calc(${PLOT_INSET}px + ${((yMax - v) / yMax).toFixed(4)} * (100% - ${2 * PLOT_INSET}px))` }}
                    />
                  ))}

                  {/* Y-axis ticks + labels */}
                  {yTicks.map(v => (
                    <div key={`yt-${v}`} className="ptYTickWrap" style={{ top: `calc(${PLOT_INSET}px + ${((yMax - v) / yMax).toFixed(4)} * (100% - ${2 * PLOT_INSET}px))` }}>
                      <div className="ptYTickMark" />
                      <div className="ptYTickLabel">{v}</div>
                    </div>
                  ))}

                  {/* Quadrant labels */}
                  <div className="ptQLabel" style={{ top: 8, left: 8, color: TIER_ON_WHITE.fragmented }}>Urgent gaps</div>
                  <div className="ptQLabel" style={{ top: 8, right: 8, color: TIER_ON_WHITE.authority }}>Strongholds</div>
                  <div className="ptQLabel" style={{ bottom: 8, left: 8, color: '#8E8E8E' }}>Low priority</div>
                  <div className="ptQLabel" style={{ bottom: 8, right: 8, color: '#6B6B6B' }}>Niche wins</div>

                  {/* Bubbles — selected/hovered bubble is sorted last so it's always the top DOM node */}
                  {[...bubbleData]
                    .sort((a: any, b: any) => {
                      const aActive = a.id === selectedTopicId || a.id === hoveredTopicId;
                      const bActive = b.id === selectedTopicId || b.id === hoveredTopicId;
                      if (aActive && !bActive) return 1;
                      if (bActive && !aActive) return -1;
                      return 0;
                    })
                    .map((b) => {
                    const pos = bubblePositions[b.id];
                    if (!pos) return null;
                    const fill   = TIER_FILL[b.tier]   ?? '#8E8E8E';
                    const textColor = TIER_TEXT[b.tier] ?? '#fff';
                    const stroke = TIER_STROKE[b.tier]  ?? 'transparent';
                    const isSelected = selectedTopicId === b.id;
                    const fontSize = pos.size > 70 ? 12 : pos.size > 55 ? 11 : 10;
                    const baseZ = Math.round((MAX_BUBBLE - pos.size) / 10) + 2;
                    return (
                      <div
                        key={b.id}
                        className={`ptBubble${isSelected ? ' ptBubble--selected' : ''}`}
                        style={{
                          left: pos.x - pos.size / 2,
                          top: pos.y - pos.size / 2,
                          width: pos.size,
                          height: pos.size,
                          background: fill,
                          color: textColor,
                          border: `1.5px solid ${stroke}`,
                          fontSize,
                          zIndex: isSelected || hoveredTopicId === b.id ? 20 : baseZ,
                        }}
                        onClick={() => handleBubbleClick(b.id)}
                        onMouseEnter={() => handleBubbleEnter(b.id)}
                        onMouseLeave={handleBubbleLeave}
                      >
                        <span className="ptBubbleName">{b.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X-axis — same 2-col grid as ptBubbleCanvas so ticks align with bubble positions */}
              <div className="ptXAxisWrap">
                <div className="ptXAxisSpacer" />{/* matches the 60px Y-axis column */}
                <div className="ptXAxisTrack">
                  {[5,4,3,2,1].map(rank => (
                    <div
                      key={rank}
                      className="ptXAxisTick"
                      style={{ left: `calc(${PLOT_INSET}px + ${((5-rank)/4).toFixed(4)} * (100% - ${2*PLOT_INSET}px))` }}
                    >
                      <div className="ptXAxisTickMark" />
                      <div className="ptXAxisTickLabel">{rank}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ptXAxisLabel">Avg rank <br /> (1 = top mention, 5 = lowest)</div>
              </div>{/* end ptChartView */}

              {/* ── Mobile list view ── */}
              <div className="ptListView" id="pt-list-view">
                <div className="ptMobileListHeader">
                  <span className="ptMobileListTitle">Topic Performance</span>
                  <span className="ptMobileListSort">Sorted by <strong>strategic priority</strong></span>
                </div>
                {mobileSorted.map((b) => {
                  const quadrant = getQuadrant(b.rank, b.vol);
                  const fill     = TIER_FILL[b.tier] ?? '#8E8E8E';
                  const textColor = TIER_TEXT[b.tier] ?? '#fff';
                  const isSelected = selectedTopicId === b.id;
                  const initial  = b.name.charAt(0).toUpperCase();
                  return (
                    <div
                      key={b.id}
                      id={`pt-mobile-row-${b.id}`}
                      className={`ptTopicRow${isSelected ? ' ptTopicRow--selected' : ''}`}
                      onClick={() => handleBubbleClick(b.id)}
                    >
                      <div className="ptTopicDot" style={{ background: fill, color: textColor }}>{initial}</div>
                      <div className="ptTopicMain">
                        <div className="ptTopicName">{b.name}</div>
                        <div className="ptTopicMeta">
                          <span className="ptTopicStat">{b.vol}</span> prompts
                          {' · '}<span className="ptTopicStat">{b.appearances}</span> appearances
                          {' · '}avg rank <span className="ptTopicStat">{b.rank.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className={`ptTopicQuadrant ptTopicQuadrant--${quadrant}`}>
                        {QUADRANT_LABEL[quadrant]}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="ptCombinedLegend">
                <div className="ptLegendEncoding">
                  <span className="ptLegendGlyphDot" />
                  Size = appearances
                </div>
                {tiers.map((tier) => (
                  <div key={tier} className="ptLegendTier">
                    <span
                      className="ptLegendTierSwatch"
                      style={{ background: TIER_FILL[tier] }}
                    />
                    <span className="ptLegendTierName">{TIER_LABEL[tier]}</span>
                    <span className="ptLegendTierRange">{TIER_RANGE[tier]}</span>
                  </div>
                ))}
              </div>

              {/* Summary sentence */}
              <div
                id="pt-summary-sentence"
                className={`ptSummarySentence${activeTopic ? '' : ' ptSummarySentence--empty'}`}
              >
                {activeTopic
                  ? buildSummary(activeTopic)
                  : 'Hover or click a bubble to see topic details.'}
              </div>
            </div>
          );
        })()}

        {/* ── Block 3: Prompt list ────────────────────────────── */}
        <div className="ptListBlock" id="pt-list-block">

          {/* Block header + filters */}
          <div className="ptListBlockHeader" id="pt-list-block-header">
            <div className="ptListBlockEyebrow">
              PROMPT LIST
              <span className="ptListBlockSep">·</span>
              <span className="ptListBlockMeta" id="pt-list-meta">{totalFiltered} OF {totalQueries}</span>
              {selectedTopicId && (
                <>
                  <span className="ptListBlockSep">·</span>
                  <span className="ptListBlockTopic" id="pt-list-block-topic">{selectedTopicId.toUpperCase()}</span>
                </>
              )}
              {showAppeared && (
                <>
                  <span className="ptListBlockSep">·</span>
                  <span className="ptListBlockAppearedLabel" id="pt-list-appeared-label">APPEARED ONLY</span>
                </>
              )}
            </div>
            <div className="ptFilterControls" id="pt-filter-controls">
              {/* Appeared toggle pill */}
              <button
                id="pt-appeared-toggle"
                className={`ptAppearedToggle${showAppeared ? ' ptAppearedToggle--active' : ''}`}
                onClick={() => { setShowAppeared(p => !p); setPage(1); }}
                title={showAppeared ? 'Show all prompts' : `Show only prompts where ${brandName || 'brand'} appeared`}
                role="checkbox"
                aria-checked={showAppeared}
              >
                <span className="ptAppearedCheckbox" id="pt-appeared-checkbox" aria-hidden="true">
                  {showAppeared && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1,3 3,5 7,1" />
                    </svg>
                  )}
                </span>
                Appeared
              </button>
              {/* Topic dropdown */}
              {bubbleData.length > 0 && (
                <div className="ptFilterDropdownWrap" id="pt-filter-dropdown-wrap">
                  <select
                    id="pt-filter-dropdown"
                    className={`ptFilterDropdown${selectedTopicId ? ' ptFilterDropdown--active' : ''}`}
                    value={selectedTopicId ?? ''}
                    onChange={(e) => { setSelectedTopicId(e.target.value || null); setPage(1); }}
                  >
                    <option value="">All topics</option>
                    {bubbleData.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <table className="ptPromptsTable">
            <thead>
              <tr>
                <th className="ptColPrompt">Prompt</th>
                <th className="ptColRank">Your rank</th>
                <th className="ptColBeater">Who beat you</th>
                <th className="ptColTagMobile" />
                <th className="ptColArrow" />
              </tr>
            </thead>
            <tbody id="pt-prompt-table-body">
              {pageRows.map((item: any, i: number) => {
                const beater = item.winner_brand && item.winner_brand !== brandName ? item.winner_brand : null;
                const showTag = !selectedTopicId && item.category;
                return (
                  <tr key={i} onClick={() => handleRowClick(item)}>
                    <td className="ptColPrompt">
                      {showTag && (
                        <>
                          <span className="ptPromptTopicTag ptPromptTopicTag--desktop">{item.category}</span>
                          <br />
                        </>
                      )}
                      <div className="ptPromptText">
                        <span className="ptPromptQuote">&ldquo;{item.query}&rdquo;</span>
                      </div>
                    </td>
                    <td className="ptColRank">
                      <RankBadge rank={item.position} />
                    </td>
                    <td className="ptColBeater">
                      <div className="ptBeaterText">
                        {beater ? (
                          <><span className="ptBeaterWho">{beater}</span> ranked above you</>
                        ) : item.position === 1 ? (
                          <span className="ptBeaterNone">— You&apos;re #1</span>
                        ) : (
                          <span className="ptBeaterNone">—</span>
                        )}
                      </div>
                    </td>
                    <td className="ptColTagMobile">
                      {showTag && (
                        <span className="ptPromptTopicTag ptPromptTopicTag--mobile">{item.category}</span>
                      )}
                    </td>
                    <td className="ptColArrow">
                      <span className="ptRowArrow">›</span>
                    </td>
                  </tr>
                );
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '24px 12px', color: '#8E8E8E', fontStyle: 'italic', textAlign: 'center' }}>
                    No prompts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="ptListFooter">
            <div className="ptListFooterRow">
              <div className="ptPagerNew">
                <button
                  className="ptPagerBtnNew"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >← Prev</button>
                <span className="ptPagerCount">{safePage} / {totalPages}</span>
                <button
                  className="ptPagerBtnNew"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >Next →</button>
              </div>
              <span className="ptCtaLink">Export filtered ↓</span>
            </div>
          </div>
        </div>

        {/* ── Block 4: Teaser strip ───────────────────────────── */}
        {teaserCount > 0 && (
          <div className="ptTeaserStrip" id="pt-teaser-strip">
            <div className="ptTeaserContent">
              <div className="ptTeaserEyebrow">EXPAND YOUR PROMPT SET</div>
              <div className="ptTeaserHeadline">
                <span className="ptTeaserCount">{teaserCount}</span> trending prompts in{' '}
                {indLabel || 'your industry'}{' '} you&apos;re not testing yet.
              </div>
              <div className="ptTeaserSub">Close coverage gaps before competitors do.</div>
            </div>
            <button
              className="ptTeaserCta"
              onClick={() => setActiveParent(5)}
            >
              See in Action Plan →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
