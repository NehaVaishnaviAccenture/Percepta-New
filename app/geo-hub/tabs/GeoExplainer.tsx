'use client';

import React, { useState } from 'react';

export function GeoExplainer({ onSignalsClick }: { onSignalsClick: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`geoExplainer${open?' geoExplainer--open':''}`}>
      <button className="geoExplainerBar" aria-expanded={open} aria-controls="geo-explainer-body" onClick={()=>setOpen(o=>!o)}>
        <span className="geoExplainerLabel">How GEO Score Works</span>
        <span className="geoExplainerHint">Formula · 5 signals · 5 tiers</span>
        <span className="geoExplainerSpacer"/>
        <svg className="geoExplainerChev" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/></svg>
      </button>
      <div className="geoExplainerReveal">
        <div className="geoExplainerInner">
          <div className="geoExplainerPad" id="geo-explainer-body" role="region" aria-label="How GEO Score Works">

            <p className="geoExplainerEyebrow">The formula</p>
            <p className="geoExplainerLede">
              Your GEO Score is a <strong>weighted average of five AI-driven signals</strong>, each scored 0–100. The weights reflect how much each signal shapes whether AI assistants surface — and how they frame — your brand.
            </p>

            <div className="geoExplainerFormula" role="img" aria-label="(Visibility times 30%) plus (Sentiment times 20%) plus (Prominence times 20%) plus (Citation times 15%) plus (Share of Voice times 15%) equals GEO Score">
              <span className="geoFmlTerm"><span className="geoFmlName">Visibility</span><span className="geoFmlOp">×</span><span className="geoFmlWt">30%</span></span>
              <span className="geoFmlPlus">+</span>
              <span className="geoFmlTerm"><span className="geoFmlName">Sentiment</span><span className="geoFmlOp">×</span><span className="geoFmlWt">20%</span></span>
              <span className="geoFmlPlus">+</span>
              <span className="geoFmlTerm"><span className="geoFmlName">Prominence</span><span className="geoFmlOp">×</span><span className="geoFmlWt">20%</span></span>
              <span className="geoFmlPlus">+</span>
              <span className="geoFmlTerm"><span className="geoFmlName">Citation</span><span className="geoFmlOp">×</span><span className="geoFmlWt">15%</span></span>
              <span className="geoFmlPlus">+</span>
              <span className="geoFmlTerm"><span className="geoFmlName">Share of Voice</span><span className="geoFmlOp">×</span><span className="geoFmlWt">15%</span></span>
              <span className="geoFmlPlus">=</span>
              <span className="geoFmlEq"><span className="geoFmlResult">GEO Score</span></span>
            </div>

            <div className="geoExplainerGrid">

              <div className="geoExplainerSection">
                <p className="geoExplainerEyebrow">The five signals</p>
                <div className="geoSig"><span className="geoSigName">Visibility</span><span className="geoSigWt">30%</span><span className="geoSigDef">How often AI assistants mention you when answering questions in your category.</span></div>
                <div className="geoSig"><span className="geoSigName">Sentiment</span><span className="geoSigWt">20%</span><span className="geoSigDef">Whether AI assistants describe you positively, neutrally, or negatively.</span></div>
                <div className="geoSig"><span className="geoSigName">Prominence</span><span className="geoSigWt">20%</span><span className="geoSigDef">How central you are to an answer — featured up top, or a passing footnote.</span></div>
                <div className="geoSig"><span className="geoSigName">Citation</span><span className="geoSigWt">15%</span><span className="geoSigDef">How often AI assistants link to or attribute your owned sources.</span></div>
                <div className="geoSig"><span className="geoSigName">Share of Voice</span><span className="geoSigWt">15%</span><span className="geoSigDef">Your slice of all brand mentions in the category, versus competitors.</span></div>
              </div>

              <div className="geoExplainerSection">
                <p className="geoExplainerEyebrow">Score tiers</p>
                <div className="geoTier geoTier--fragmented"><span className="geoTierMeta"><span className="geoTierDot"/><span className="geoTierName">Fragmented</span></span><span className="geoTierRange">0–44</span><span className="geoTierDef">AI assistants rarely surface you, and rivals dominate the answer when they do.</span></div>
                <div className="geoTier geoTier--emerging"><span className="geoTierMeta"><span className="geoTierDot"/><span className="geoTierName">Emerging</span></span><span className="geoTierRange">45–55</span><span className="geoTierDef">You show up occasionally but inconsistently; competitors are cited more and more favourably.</span></div>
                <div className="geoTier geoTier--competitive"><span className="geoTierMeta"><span className="geoTierDot"/><span className="geoTierName">Competitive</span></span><span className="geoTierRange">56–69</span><span className="geoTierDef">You're a regular part of the AI conversation, holding your ground on most signals.</span></div>
                <div className="geoTier geoTier--leader"><span className="geoTierMeta"><span className="geoTierDot"/><span className="geoTierName">Leader</span></span><span className="geoTierRange">70–79</span><span className="geoTierDef">AI assistants surface you often, with strong, favourable framing. You set the category pace.</span></div>
                <div className="geoTier geoTier--authority"><span className="geoTierMeta"><span className="geoTierDot"/><span className="geoTierName">Authority</span></span><span className="geoTierRange">80–100</span><span className="geoTierDef">You're the default reference — cited first, consistently, and on-message across signals.</span></div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
