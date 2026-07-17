'use client';

import React, { useRef, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { geoTier } from '../lib/tiers';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
  playbookActions?: Action[] | null;
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

// ─────────────────────────────────────────────────────────────────────────────
// Playbook types
// ─────────────────────────────────────────────────────────────────────────────

interface ActionTopic { name: string; secondary?: boolean; }
interface ActionEvidence { topic: string; score: number; delta: number; prompts: number; }
interface Action {
  priority: 'High' | 'Medium' | 'Low';
  topics: ActionTopic[];
  title: string;
  teaser: string;
  who: string[];
  evidence: ActionEvidence;
  why: string;
  build: string[];
  team: string;
  type: string;
}

const NUM_WORDS = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'];

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

function tierOf(score: number): string {
  if (score <= 44) return 'fragmented';
  if (score <= 55) return 'emerging';
  if (score <= 69) return 'competitive';
  if (score <= 79) return 'leader';
  return 'authority';
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
// Playbook components
// ─────────────────────────────────────────────────────────────────────────────

function StatLine({ ev }: { ev: ActionEvidence }) {
  if (!ev) return null;
  const median = ev.score - ev.delta;
  const d = ev.delta >= 0 ? `+${ev.delta}` : `−${Math.abs(ev.delta)}`;
  return (
    <>
      {ev.topic} · <span className={`pb-tier-${tierOf(ev.score)}`}>{ev.score}</span> · {d} vs median ({median})
    </>
  );
}

function PriorityBars({ priority }: { priority: string }) {
  const onCount = priority === 'High' ? 3 : priority === 'Medium' ? 2 : 1;
  return (
    <span className="pb-col-bars">
      {[1, 2, 3].map(i => (
        <i key={i} className={`pb-pbar pb-pbar--h${i}${i <= onCount ? ' pb-pbar--on' : ''}`} />
      ))}
    </span>
  );
}

function WhoLine({ who }: { who: string[] }) {
  const safe = who || [];
  const head = safe.slice(0, 2).join(' · ');
  const extra = safe.length > 2 ? safe.length - 2 : 0;
  return (
    <>
      <span className="pb-who-lead">For</span> {head}
      {extra > 0 && <> <span className="pb-who-lead">+{extra} more</span></>}
    </>
  );
}

const LANES = [
  { key: 'low',    label: 'Low',    onCount: 1 },
  { key: 'medium', label: 'Medium', onCount: 2 },
  { key: 'high',   label: 'High',   onCount: 3 },
];

function ActionCard({
  action, index, expanded, topicFilter, onToggle, onOpen,
}: {
  action: Action; index: number; expanded: boolean; topicFilter: string;
  onToggle: (i: number) => void; onOpen: (i: number) => void;
}) {
  const topics = (action.topics || []).map(t => t.name);
  const hidden = topicFilter !== 'all' && !topics.includes(topicFilter);

  return (
    <div
      className={[
        'pb-card',
        expanded ? 'pb-card--expanded' : '',
        hidden ? 'pb-card--hidden' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="pb-card-top" onClick={() => onToggle(index)}>
        <div className="pb-card-topics">
          {action.topics?.[0] && <span className="pb-topic-chip">{action.topics[0].name}</span>}
        </div>
        <span className="pb-card-chev">⌄</span>
      </div>

      <div className="pb-card-title" onClick={() => onToggle(index)}>
        {action.title}
      </div>
      <div className="pb-card-teaser">{action.teaser}</div>
      <div className="pb-card-who" onClick={() => onToggle(index)}>
        <WhoLine who={action.who} />
      </div>

      <div className="pb-card-drawer">
        <div className="pb-card-drawer-pad">
          <div className="pb-evidence">
            <div className="pb-ev-label">Why {action.priority.toLowerCase()} priority</div>
            <span className="pb-ev-stat"><StatLine ev={action.evidence} /></span>
            <p className="pb-why" dangerouslySetInnerHTML={{ __html: action.why }} />
          </div>
          <button className="pb-open-action" onClick={() => onOpen(index)}>
            Open the full action <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function exportActionsCsv(actions: Action[], brandName: string, topicFilter: string) {
  const slug = brandName.toLowerCase().replace(/\s+/g, '-');
  const topicSlug = topicFilter === 'all' ? '-all' : '-' + topicFilter.toLowerCase().replace(/\s+/g, '-');
  const filename = `${slug}-priority-actions${topicSlug}.csv`;
  const rows = actions.filter(a =>
    topicFilter === 'all' || (a.topics || []).some(t => t.name === topicFilter)
  );
  const headers = ['Priority', 'Title', 'Topics', 'Who', 'Why', 'Evidence Topic', 'Evidence Score', 'Evidence Delta'];
  const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    headers.join(','),
    ...rows.map(a => [
      escape(a.priority),
      escape(a.title),
      escape((a.topics || []).map(t => t.name).join('; ')),
      escape(a.who.join('; ')),
      escape(a.why),
      escape(a.evidence?.topic ?? ''),
      String(a.evidence?.score ?? ''),
      String(a.evidence?.delta ?? ''),
    ].join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

function BoardView({
  actions, brandName, onOpenAction,
}: {
  actions: Action[]; brandName: string; onOpenAction: (i: number) => void;
}) {
  const [activeLane, setActiveLane] = useState('high');
  const [topicFilter, setTopicFilter] = useState('all');
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const toggleCard = (i: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const allTopics = [...new Set(actions.flatMap(a => (a.topics || []).map(t => t.name)))].sort();

  const visibleCountForLane = (laneKey: string) => {
    const laneItems = actions.filter(a => a.priority.toLowerCase() === laneKey);
    if (topicFilter === 'all') return laneItems.length;
    return laneItems.filter(a => (a.topics || []).some(t => t.name === topicFilter)).length;
  };

  return (
    <div>
      <div className="pb-board-card">
        <div className="pb-block-head">
          <div className="pb-bh-left">
            <span className="pb-block-title">Priority actions</span>
            <span className="pb-block-meta">
              AI-generated from your topic gaps · click a card to peek, open for the full play
            </span>
          </div>
          {allTopics.length > 0 && (
            <div className="pb-topic-filter">
              <span className="pb-tf-label">Topic</span>
              <select
                className="pb-tf-select"
                value={topicFilter}
                onChange={e => setTopicFilter(e.target.value)}
              >
                <option value="all">All topics</option>
                {allTopics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="pb-board-toggle">
          {LANES.map(lane => (
            <button
              key={lane.key}
              className={`pb-lt-btn${activeLane === lane.key ? ' pb-lt-btn--active' : ''}`}
              onClick={() => setActiveLane(lane.key)}
            >
              {lane.label}
              <span className="pb-lt-count">{visibleCountForLane(lane.key)}</span>
            </button>
          ))}
        </div>

        <div className="pb-board">
          {LANES.map(lane => {
            const laneItems = actions
              .map((a, i) => ({ a, i }))
              .filter(({ a }) => a.priority.toLowerCase() === lane.key);
            const isActive = activeLane === lane.key;
            const visibleCount = visibleCountForLane(lane.key);

            return (
              <div
                key={lane.key}
                className={[
                  'pb-column',
                  `pb-column--${lane.key}`,
                  isActive ? 'pb-column--active' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="pb-col-header-row">
                  <PriorityBars priority={lane.label} />
                  <span className="pb-col-label">{lane.label}</span>
                  <span className="pb-col-count">{visibleCount}</span>
                </div>
                <div className="pb-col-underline" />
                <div className="pb-col-body">
                  {laneItems.length === 0 ? (
                    <div className="pb-col-empty">No actions yet</div>
                  ) : (
                    laneItems.map(({ a, i }) => (
                      <ActionCard
                        key={i}
                        action={a}
                        index={i}
                        expanded={expandedCards.has(i)}
                        topicFilter={topicFilter}
                        onToggle={toggleCard}
                        onOpen={onOpenAction}
                      />
                    ))
                  )}
                  {laneItems.length > 0 && visibleCount === 0 && (
                    <div className="pb-col-empty">No actions for this topic</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pb-board-footer">
          <p className="pb-board-note">
            Actions are AI-generated from {brandName}'s topic-level coverage and sorted by
            opportunity — gap size weighed against how winnable it is. Lane = priority; it does
            not reflect delivery effort. Team owners are AI-suggested.
          </p>
          <button
            className="pb-export-btn"
            onClick={() => exportActionsCsv(actions, brandName, topicFilter)}
          ><span><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 1v6.5M3.5 5.5L6 8l2.5-2.5"/><path d="M1.5 10.5h9"/></svg>Export CSV</span></button>
        </div>
      </div>
    </div>
  );
}

function ActionView({ action, onBack }: { action: Action; onBack: () => void }) {
  const prioCls = action.priority.toLowerCase() as 'high' | 'medium' | 'low';

  return (
    <div>
      <div className="pb-av-crumb">
        <button className="pb-av-back" onClick={onBack}>‹ Priorities</button>
        <span className="pb-av-crumb-sep">/</span>
        <span className="pb-av-crumb-cur">{action.title}</span>
      </div>

      <div className="pb-av-card">
        <span className={`pb-av-prio-strip pb-av-prio--${prioCls} pb-av-prio-strip--pinned`}>
          <PriorityBars priority={action.priority} />
          <span className="pb-av-prio-label">{action.priority} priority</span>
        </span>
        {action.topics?.[0] && <div className="pb-av-eyebrow">{action.topics[0].name}</div>}
        <h2 className="pb-av-title" style={{ paddingRight: '160px' }}>{action.title}</h2>
        <div className="pb-av-teaser">{action.teaser}</div>
      </div>

      <div className="pb-spec-grid">
        <div className="pb-spec-main">
          <div className="pb-av-card">
            <div className="pb-av-label">Why this is a priority</div>
            <div className="pb-av-evidence-stat"><StatLine ev={action.evidence} /></div>
            <div className="pb-av-why" dangerouslySetInnerHTML={{ __html: action.why }} />
            <button className="pb-av-evidence-link">
              See the {action.evidence.prompts} prompts →
            </button>
          </div>

          <div className="pb-av-card">
            <div className="pb-av-label">What to build</div>
            <ul className="pb-checklist">
              {action.build.map((item, i) => (
                <li key={i} className="pb-check-item">
                  <span className="pb-cbox" />
                  <span className="pb-check-text" dangerouslySetInnerHTML={{ __html: item }} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="pb-spec-rail">
          <div className="pb-rail-head">At a glance</div>
          <div className="pb-rail-fields">
            <div className="pb-rail-row">
              <span className="pb-rail-k">Priority</span>
              <span className={`pb-rail-v pb-rail-prio pb-rail-prio--${prioCls}`}>
                <PriorityBars priority={action.priority} />
                {action.priority}
              </span>
            </div>
            <div className="pb-rail-row">
              <span className="pb-rail-k">Likely owner</span>
              <span className="pb-rail-v">
                {action.team} <span className="pb-ai-hint">· AI-suggested</span>
              </span>
            </div>
            <div className="pb-rail-row">
              <span className="pb-rail-k">Action type</span>
              <span className="pb-rail-v">{action.type}</span>
            </div>
            <div className="pb-rail-row">
              <span className="pb-rail-k">Topics</span>
              <span className="pb-rail-v">
                {(action.topics || []).map(t => (
                  <span key={t.name} className="pb-topic-chip">{t.name}</span>
                ))}
              </span>
            </div>
            <div className="pb-rail-row">
              <span className="pb-rail-k">Audiences</span>
              <span className="pb-rail-v">
                <ul className="pb-avd-list">
                  {action.who.map(w => <li key={w}>{w}</li>)}
                </ul>
              </span>
            </div>
          </div>

          <div className="pb-rail-actions">
            <button className="pb-avf-btn">See supporting prompts →</button>
            <button className="pb-avd-link">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 1v6.5M3.5 5.5L6 8l2.5-2.5"/><path d="M1.5 10.5h9"/>
              </svg>
              Export this action
            </button>
            <button className="pb-avd-link">See these segments in Coverage →</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Support strip
// ─────────────────────────────────────────────────────────────────────────────

function SupportStrip() {
  return (
    <Link href="/geo-optimization-services" className="pb-support-strip">
      <div className="pb-support-inner">
        <span className="pb-support-eyebrow">Get support</span>
        <span className="pb-support-heading">Want help turning these into a plan?</span>
        <span className="pb-support-sub">Our team can scope, prioritize, and build alongside you.</span>
      </div>
      <svg className="pb-support-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8h10M9 4l4 4-4 4"/>
      </svg>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export default function PrioritiesTab({ result, playbookActions }: TabProps) {
  const [viewState, setViewState] = useState<'board' | 'action'>('board');
  const [selectedAction, setSelectedAction] = useState<number | null>(null);

  const brand      = result.brand_name || 'Your brand';
  const visibility = result.visibility ?? 0;
  const totalQA    = (result.responses_detail || []).length;

  const pbTotal     = playbookActions?.length ?? 0;
  const pbHigh      = playbookActions?.filter(a => a.priority === 'High').length ?? 0;
  const pbTotalWord = NUM_WORDS[pbTotal] ?? String(pbTotal);
  const hasActions  = playbookActions && playbookActions.length > 0;

  const openAction = (index: number) => {
    setSelectedAction(index);
    setViewState('action');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const closeAction = () => {
    setViewState('board');
    setSelectedAction(null);
  };

  return (
    <div id="tab-priorities-overall">
      {viewState === 'board' && (
        <>
          <h2 className="ov-lead">
            Here&rsquo;s where to focus first.
          </h2>
          <div className="ov-lead-sub">
            <b>{totalQA}</b> responses analyzed
            {hasActions && (
              <>
                <span className="ov-sep">·</span>
                <b>{pbTotal}</b> actions
                <span className="ov-sep">·</span>
                <b>{pbHigh}</b> high priority
              </>
            )}
          </div>
          <HealthSummaryCard result={result} />
          {hasActions && (
            <BoardView
              actions={playbookActions!}
              brandName={brand}
              onOpenAction={openAction}
            />
          )}
          <SupportStrip />
        </>
      )}
      {viewState === 'action' && selectedAction !== null && playbookActions && (
        <ActionView
          action={playbookActions[selectedAction]}
          onBack={closeAction}
        />
      )}
    </div>
  );
}
