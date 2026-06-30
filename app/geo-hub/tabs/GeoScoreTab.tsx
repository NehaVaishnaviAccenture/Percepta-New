'use client';

import React, { useEffect, useRef, useState } from 'react';
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

const TIER_COLORS = [
  { min: 0,  max: 44,  color: '#E0003B', textColor: '#B7002F', name: 'Fragmented' },
  { min: 45, max: 55,  color: '#F48500', textColor: '#B15F00', name: 'Emerging'   },
  { min: 56, max: 69,  color: '#F3B10C', textColor: '#996E00', name: 'Competitive'},
  { min: 70, max: 79,  color: '#2F6DFF', textColor: '#043BCC', name: 'Leader'     },
  { min: 80, max: 100, color: '#00AB7B', textColor: '#007653', name: 'Authority'  },
];

const TIER_DEFS: Record<string, string> = {
  Fragmented:  'AI assistants rarely surface your brand — you\'re largely absent from category conversations.',
  Emerging:    'You appear occasionally but inconsistently. Competitors are cited more often and more favourably.',
  Competitive: 'You\'re a regular part of the AI conversation, holding your ground across most signals.',
  Leader:      'AI assistants surface you frequently, with strong and favourable framing.',
  Authority:   'You\'re the default reference — cited first, consistently, and on-message.',
};

function tierForScore(s: number) {
  return TIER_COLORS.find(t => s >= t.min && s <= t.max) || TIER_COLORS[0];
}

// ── Arch SVG (Option B from mockup) ───────────────────────────
const AW = 340, CX = 170, CY = 170, R_OUTER = 150, R_INNER = 104;
const MARKER_COLOR = '#0F0F11';

function scoreToAngle(s: number) { return Math.PI - (s / 100) * Math.PI; }
function polar(r: number, a: number) { return { x: CX + r * Math.cos(a), y: CY - r * Math.sin(a) }; }
function arcPath(a0: number, a1: number) {
  const o0 = polar(R_OUTER, a0), o1 = polar(R_OUTER, a1);
  const i1 = polar(R_INNER, a1), i0 = polar(R_INNER, a0);
  const lg = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  return `M${o0.x} ${o0.y} A${R_OUTER} ${R_OUTER} 0 ${lg} 1 ${o1.x} ${o1.y} L${i1.x} ${i1.y} A${R_INNER} ${R_INNER} 0 ${lg} 0 ${i0.x} ${i0.y}Z`;
}

function ArchSVG({ score }: { score: number }) {
  const tier = tierForScore(score);
  const angle = scoreToAngle(score);
  const tip  = polar(R_OUTER + 6, angle);
  const base = polar(R_INNER - 12, angle);

  return (
    <svg viewBox={`0 0 ${AW} ${CY}`} style={{ width: '100%', maxWidth: 400, display: 'block', overflow: 'visible' }}>
      {TIER_COLORS.map(t => {
        const a0 = scoreToAngle(t.min);
        const a1 = scoreToAngle(Math.min(t.max + 1, 100));
        return <path key={t.name} d={arcPath(a0, a1)} fill={t.color} />;
      })}
      {TIER_COLORS.slice(0, -1).map(t => {
        const ad = scoreToAngle(t.max + 1);
        const o = polar(R_OUTER + 1, ad), i = polar(R_INNER - 1, ad);
        return <line key={t.name} x1={o.x} y1={o.y} x2={i.x} y2={i.y} stroke="#fff" strokeWidth="2" />;
      })}
      {/* Tick marks */}
      {[0, 20, 40, 60, 80, 100].map(val => {
        const a = scoreToAngle(val);
        const tickOuter = polar(R_OUTER + 3, a);
        const tickInner = polar(R_OUTER - 1, a);
        const lp = val === 100 ? polar(R_OUTER + 24, a) : polar(R_OUTER + 17, a);
        const anchor = val === 0 ? 'start' : val === 100 ? 'end' : 'middle';
        return (
          <g key={val}>
            <line x1={tickInner.x} y1={tickInner.y} x2={tickOuter.x} y2={tickOuter.y} stroke="#fff" strokeWidth="1.5" />
            <text x={lp.x} y={lp.y + 4} textAnchor={anchor} fontFamily="'Space Grotesk', monospace" fontSize="12" fill="#8E8E8E">{val}</text>
          </g>
        );
      })}
      {/* Needle */}
      <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} stroke={MARKER_COLOR} strokeWidth="3.5" strokeLinecap="round" />
      {/* Score inside arch */}
      <text x={CX} y={CY - 28} textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontSize="44" fontWeight="700" fill={tier.color}>{score}</text>
      <text x={CX} y={CY - 10} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" letterSpacing="0.08em" fill="#8E8E8E">{tier.name.toUpperCase()}</text>
    </svg>
  );
}

// ── Signal card (shared structure for all 5 signals) ──────────
function SignalCard({ label, q, score, rankVal, avgVal, total, setActiveParent, setActiveSub, sub }: {
  label: string; q: string; score: number;
  rankVal: number; avgVal: number; total: number;
  setActiveParent: (n: number) => void; setActiveSub: (n: number) => void; sub: number;
}) {
  const tier = sigTier(score);
  return (
    <div className="aiPresCard" style={{ borderLeftColor: tier.text, cursor: 'pointer' }} onClick={() => { setActiveParent(1); setActiveSub(sub); }}>
      <div className="aiPresCardEyebrow">{label}</div>
      <div className="aiPresCardQ">{q}</div>
      <div className="aiPresCardScoreRow">
        <span className="aiPresCardNum" style={{ color: tier.text }}>{score}</span>
        <span className="aiPresChip" style={{ background: tier.bg, color: tier.text }}>{tier.label}</span>
      </div>
      <div className="aiPresCardRank">#{rankVal} of {total} brands · avg {avgVal}</div>
    </div>
  );
}

export default function GeoScoreTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  const geo  = result.overall_geo_score ?? 0;
  const vis  = result.visibility  ?? 0;
  const sent = result.sentiment   ?? 0;
  const prom = result.prominence  ?? 0;
  const cit  = result.citation_share ?? 0;
  const sov  = result.share_of_voice ?? 0;
  const comps = resultComps;

  const allBrands = [{ GEO: geo, Brand: result.brand_name, isYou: true }, ...comps].sort((a: any, b: any) => (b.GEO || 0) - (a.GEO || 0));
  const myRank   = allBrands.findIndex((b: any) => b.isYou) + 1;
  const topComp  = allBrands.find((b: any) => !b.isYou);
  const topGap   = topComp ? Math.max(0, (topComp.GEO || 0) - geo) : 0;
  const tier     = tierForScore(geo);

  const ind = result.ind_label || 'your industry';
  const brand = result.brand_name || 'Your brand';

  const ptsToNext = (geo >= 80 ? 100 : geo >= 70 ? 80 : geo >= 56 ? 70 : geo >= 45 ? 56 : 45) - geo;
  const nextTierLabel = geo >= 80 ? null : geo >= 70 ? 'Authority' : geo >= 56 ? 'Leader' : geo >= 45 ? 'Competitive' : 'Emerging';

  const headline: [string, string] =
    tier.name === 'Fragmented'  ? ["You're largely invisible,",        "and being skipped over"]          :
    tier.name === 'Emerging'    ? ["Occasionally surfaced,",            "rarely prioritized"]              :
    tier.name === 'Competitive' ? ["You're part of the conversation,", "but not the first choice"]        :
    tier.name === 'Leader'      ? ["You're frequently recommended,",   "but not yet dominant"]            :
                                  ["You're the default recommendation,","and setting the standard"];

  const tierSpan = <strong style={{ color: tier.textColor }}>{tier.name.toLowerCase()}</strong>;

  const interpText: React.ReactNode =
    tier.name === 'Fragmented'
      ? <>At {geo}, {brand} scores as {tierSpan}; AI assistants rarely surface you and {topComp?.Brand || 'competitors'}{topGap > 0 ? ` leads by ${topGap} points` : ' is recommended instead'}. {brand} is #{myRank} of {allBrands.length} brands in {ind}{nextTierLabel ? ` and ${ptsToNext} points from Emerging, where you enter the consideration set for significantly more queries` : ''}.</>
    : tier.name === 'Emerging'
      ? <>At {geo}, {brand} scores as {tierSpan}; you appear periodically but inconsistently. Competitors above 56 are being prioritized. Growing authority signals in key segments could move you into the Competitive tier — you're {ptsToNext} points away. {brand} is also #{myRank} of {allBrands.length} brands{topGap > 0 ? ` and ${topGap} points behind #1` : ''} in {ind}.</>
    : tier.name === 'Competitive'
      ? <>At {geo}, {brand} scores as {tierSpan}; you're a regular part of the AI conversation but not yet a first-choice recommendation. Competitors above 70 are consistently prioritized. Strengthening citation authority is the clearest path to the Leader tier — you're {ptsToNext} points away. {brand} is #{myRank} of {allBrands.length} brands{topGap > 0 ? ` and ${topGap} points behind #1` : ''} in {ind}.</>
    : tier.name === 'Leader'
      ? <>At {geo}, {brand} scores as a {tierSpan}; AI assistants surface you frequently with strong, favourable framing. You're {ptsToNext} points from Authority and consistent first-position recommendations. {brand} is #{myRank} of {allBrands.length} brands{topGap > 0 ? ` and ${topGap} points behind #1` : ''} in {ind}.</>
      : <>At {geo}, {brand} scores as {tierSpan}; you're the default reference across {ind}, cited first and consistently. {brand} is #{myRank} of {allBrands.length} brands. The focus is on maintaining dominance and monitoring for competitor movements.</>;

  const rank = (myVal: number, all: number[]) => [...all].sort((a, b) => b - a).indexOf(myVal) + 1;
  const avg  = (all: number[]) => Math.round(all.reduce((s, v) => s + v, 0) / all.length);

  const allVis  = [vis,  ...comps.map((c: any) => c.Vis  ?? 0)];
  const allSent = [sent, ...comps.map((c: any) => c.Sen  ?? 0)];
  const allProm = [prom, ...comps.map((c: any) => c.Prom ?? 0)];
  const allCit  = [cit,  ...comps.map((c: any) => c.Cit  ?? 0)];
  const allSov  = [sov,  ...comps.map((c: any) => c.Sov  ?? 0)];

  const signals = [
    { key: 'vis',  label: 'Visibility',     q: 'Are you in the answer?',                  score: vis,  rankVal: rank(vis,  allVis),  avgVal: avg(allVis),  total: allVis.length - 1,  sub: 1 },
    { key: 'sent', label: 'Sentiment',      q: 'Are you framed well?',                    score: sent, rankVal: rank(sent, allSent), avgVal: avg(allSent), total: allSent.length - 1, sub: 1 },
    { key: 'prom', label: 'Prominence',     q: 'Are you front and center?',               score: prom, rankVal: rank(prom, allProm), avgVal: avg(allProm), total: allProm.length - 1, sub: 1 },
    { key: 'cit',  label: 'Citation',       q: 'Are your sources being cited?',           score: cit,  rankVal: rank(cit,  allCit),  avgVal: avg(allCit),  total: allCit.length - 1,  sub: 2 },
    { key: 'sov',  label: 'Share of Voice', q: 'How much of the conversation is yours?',  score: sov,  rankVal: rank(sov,  allSov),  avgVal: avg(allSov),  total: allSov.length - 1,  sub: 2 },
  ];

  return (
    <div id="geo-score-overall-wrapper" className="gsoWrapper">

      {/* ── Hero card ── */}
      <div id="geo-score-overall-hero" className="gsoHeroCard gsoHeroCardNew">
        <div id="gso-hero-body" className="gsoHeroBody">

          {/* Left: arch */}
          <div id="gso-arch-wrap" className="gsoArchWrap">
            <ArchSVG score={geo} />
          </div>

          {/* Right: text */}
          <div id="gso-hero-text" className="gsoHeroText">
            <h2 className="gsoHeroHeadline">
              {headline[0]}{' '}
              <span className="gsoHeroHeadlineAccent">{headline[1]}</span>
            </h2>
            <p className="gsoInterpText">{interpText}</p>
          </div>
        </div>
      </div>

      {/* ── GEO Explainer ── */}
      <GeoExplainer onSignalsClick={() => { setActiveParent(1); setActiveSub(0); }} />

      {/* ── Signal cards: 5 columns ── */}
      <div id="gso-signal-cards" className="gsoSignalCards gsoSignalCards--5">
        {signals.map(sig => (
          <SignalCard key={sig.key} label={sig.label} q={sig.q} score={sig.score} rankVal={sig.rankVal} avgVal={sig.avgVal} total={sig.total} sub={sig.sub} setActiveParent={setActiveParent} setActiveSub={setActiveSub} />
        ))}
      </div>

    </div>
  );
}
