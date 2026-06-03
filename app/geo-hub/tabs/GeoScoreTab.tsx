'use client';

import React, { useRef, useState, useLayoutEffect } from 'react';
import { GeoExplainer } from './GeoExplainer';

// Shows the full label if it fits inside the bar, otherwise falls back to the short key.
// Canvas measurement is used because DOM scrollWidth is unreliable in flex-basis:0 containers
// and useLayoutEffect is suppressed during SSR, causing hydration mismatches.
function measureText(text: string, font: string): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width;
}

function SignalKey({ full, short }: { full: string; short: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [showShort, setShowShort] = useState(false);
  useLayoutEffect(() => {
    // Capture bar reference synchronously — inside .then() the ref may be stale
    // if React 18 strict mode unmounts/remounts the component between effect and callback
    const bar = ref.current?.parentElement;
    if (!bar) return;
    const measure = () => {
      const available = bar.clientWidth - 20; // 10px padding each side
      const fullWidth = measureText(full, '11px "Space Grotesk", sans-serif');
      setShowShort(fullWidth > available);
    };
    measure(); // immediate call (uses fallback font if Space Grotesk not loaded yet)
    document.fonts.ready.then(measure); // re-check once fonts settle
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [full]);
  return (
    <span ref={ref} id={`gso-signal-key-${full.toLowerCase().replace(/\s+/g,'-')}`} className="gsoSignalKeySpan">
      {showShort ? (short === 'SoV' ? short : `${short}.`) : full}
    </span>
  );
}

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

export default function GeoScoreTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  const geo = result.overall_geo_score??0;
  const vis = result.visibility??0,sent = result.sentiment??0,prom = result.prominence??0,cit = result.citation_share??0,sov = result.share_of_voice??0;
  const comps = resultComps;
  const tierOf=(s:number)=>s>=80?{label:'Authority',color:'#007653',textColor:'#007653'}:s>=70?{label:'Leader',color:'#043BCC',textColor:'#043BCC'}:s>=56?{label:'Competitive',color:'#F3B10C',textColor:'#996E00'}:s>=45?{label:'Emerging',color:'#F48500',textColor:'#B15F00'}:{label:'Fragmented',color:'#B7002F',textColor:'#B7002F'};
  const sigBg=(s:number)=>s>=80?'#00AB7B':s>=70?'#2F6DFF':s>=56?'#F3B10C':s>=45?'#F48500':'#E0003B';
  const sigFg=(s:number)=>(s>=56&&s<70)?'#2A1500':'white';
  const allBrands=[{GEO:geo,Brand:result.brand_name,isYou:true},...comps].sort((a:any,b:any)=>(b.GEO||0)-(a.GEO||0));
  const myRank=allBrands.findIndex((b:any)=>b.isYou)+1;
  const topComp=allBrands.find((b:any)=>!b.isYou);
  const topGap=topComp?Math.max(0,(topComp.GEO||0)-geo):0;
  const nextThreshold=geo>=80?100:geo>=70?80:geo>=56?70:geo>=45?56:45;
  const nextTierLabel=geo>=80?'Max':geo>=70?'Authority':geo>=56?'Leader':geo>=45?'Competitive':'Emerging';
  const ptsToNext=nextThreshold-geo;
  const signals=[
    {key:'Vis', label:'Visibility',     score:vis,  weight:30, sub:1, lowMeaning:"AI models rarely surface your brand when people ask about your category — you're largely absent from the conversation"},
    {key:'Sent',label:'Sentiment',      score:sent, weight:20, sub:2, lowMeaning:"when AI does mention you, it isn't framing your brand positively — the language around you is neutral at best"},
    {key:'Prom',label:'Prominence',     score:prom, weight:20, sub:3, lowMeaning:"even when AI mentions you, it's not giving you a leading role — you're showing up late or in passing, not as a top recommendation"},
    {key:'Cit', label:'Citation',       score:cit,  weight:15, sub:4, lowMeaning:"AI models aren't treating your brand as an authoritative source worth referencing — you're not being cited the way stronger brands are"},
    {key:'SoV', label:'Share of Voice', score:sov,  weight:15, sub:5, lowMeaning:"competitors are dominating AI conversations in your space — your brand is getting a small slice of all brand mentions"},
  ];
  const weakest=[...signals].sort((a,b)=>((100-b.score)*b.weight)-((100-a.score)*a.weight))[0];
  const weakColor=sigBg(weakest.score);
  const topGeo=Math.max(geo,...comps.map((c:any)=>c.GEO||0));
  const topVis=Math.max(vis,...comps.map((c:any)=>c.Vis||c.visibility||0));
  const topSent=Math.max(sent,...comps.map((c:any)=>c.Sen||c.sentiment||0));
  const topProm=Math.max(prom,...comps.map((c:any)=>c.Prom||c.prominence||0));
  const topCit=Math.max(cit,...comps.map((c:any)=>c.Cit||c.citation_share||0));
  const topSov=Math.max(sov,...comps.map((c:any)=>c.Sov||c.share_of_voice||0));
  const vcmpCols=[
    {label:'GEO Score',sub:'composite',score:geo,ref:topGeo,headline:true},
    {label:'Visibility',sub:'30% weight',score:vis,ref:topVis},
    {label:'Sentiment',sub:'20% weight',score:sent,ref:topSent},
    {label:'Prominence',sub:'20% weight',score:prom,ref:topProm},
    {label:'Citation',sub:'15% weight',score:cit,ref:topCit},
    {label:'Share of Voice',sub:'15% weight',score:sov,ref:topSov},
  ];
  const tierSegs=[
    {label:'Fragmented',range:'0–44',isCurrent:geo<45,color:'#E0003B',textColor:'#B7002F'},
    {label:'Emerging',range:'45–55',isCurrent:geo>=45&&geo<56,color:'#F48500',textColor:'#B15F00'},
    {label:'Competitive',range:'56–69',isCurrent:geo>=56&&geo<70,color:'#F3B10C',textColor:'#996E00'},
    {label:'Leader',range:'70–79',isCurrent:geo>=70&&geo<80,color:'#2F6DFF',textColor:'#043BCC'},
    {label:'Authority',range:'80–100',isCurrent:geo>=80,color:'#00AB7B',textColor:'#007653'},
  ];
  const barFrs=[44,11,14,10,21];
  const markerPct=`${Math.min(geo,100)}%`;
  const bracketFrom=`${Math.min(geo,100)}%`;
  const bracketTo=`${Math.min(nextThreshold,100)}%`;
  const bracketMid=`${(Math.min(geo,100)+Math.min(nextThreshold,100))/2}%`;

  return (
    <div id="geo-score-overall-wrapper" className="gsoWrapper">

      {/* ── Top row: hero + breakdown ── */}
      <div id="gso-header-row" className="gsoHeaderRow">

        {/* Hero score card — spans 2 cols */}
        <div id="geo-score-overall-hero" className="gsoHeroCard">
          <div id="gso-hero-eyebrow" className="gsoHeroEyebrow">GEO Score · Run 1</div>
          <div id="gso-hero-content" className="gsoHeroContent">

            {/* Score pillar: big number + tier name */}
            <div id="gso-score-pillar" className="gsoScorePillar">
              <div id="gso-score-number" className="gsoScoreNumber">{geo}</div>
              <div id="gso-score-tier-label" className="gsoScoreTierLabel" style={{color:tierOf(geo).textColor}}>{tierOf(geo).label}</div>
            </div>

            {/* Rank text + tier ladder */}
            <div id="gso-rank-section" className="gsoRankSection">
              <div id="gso-rank-text" className="gsoRankText">
                <span className="gso-rank-num gsoRankMono">#{myRank}</span> of <span className="gso-rank-total gsoRankMono">{allBrands.length}</span> brands{topComp&&topGap>0&&<> and <span className="gso-rank-gap gsoRankMono">{topGap}</span> points behind <span className="gso-rank-leader gsoRankMono">#1</span></>} in {result.ind_label||'your industry'}.
              </div>

              {/* Tier ladder */}
              <div id="gso-tier-ladder" className={['gsoTierLadder', ptsToNext<100&&'gsoTierLadderWithBracket'].filter(Boolean).join(' ')}>
                {ptsToNext<100&&<>
                  {/* Bracket: shows gap to next tier */}
                  <div id="gso-tier-bracket" className="gsoTierBracket" style={{left:bracketFrom,width:`calc(${bracketTo} - ${bracketFrom})`}}>
                    <div id="gso-tier-bracket-line" className="gsoTierBracketLine"/>
                    <div id="gso-tier-bracket-left" className="gsoTierBracketTickLeft"/>
                    <div id="gso-tier-bracket-right" className="gsoTierBracketTickRight"/>
                  </div>
                  <div id="gso-tier-bracket-label" className="gsoTierBracketLabel" style={{left:bracketMid}}>+{ptsToNext} to {nextTierLabel}</div>
                </>}

                {/* Coloured tier bar */}
                <div id="gso-tier-bar" className="gsoTierBar" style={{gridTemplateColumns:`${barFrs.join('fr ')}fr`}}>
                  {tierSegs.map(seg=>(
                    <div key={seg.label} className={`gso-tier-seg gso-tier-seg--${seg.label.toLowerCase()}${seg.isCurrent?' gso-tier-seg--current':''} gsoTierSeg`} style={{background:seg.color,opacity:seg.isCurrent?1:0.25}}/>
                  ))}
                  <div id="gso-tier-bar-marker" className="gsoTierBarMarker" style={{left:markerPct}}/>
                </div>

                {/* Tier label row */}
                <div id="gso-tier-labels" className="gsoTierLabels" style={{gridTemplateColumns:`${barFrs.join('fr ')}fr`}}>
                  {tierSegs.map(seg=>(
                    <div key={seg.label} className={`gso-tier-label gso-tier-label--${seg.label.toLowerCase()}${seg.isCurrent?' gso-tier-label--current':''} gsoTierLabelCell`} style={{color:seg.isCurrent?seg.textColor:'#6B6B6B',fontWeight:seg.isCurrent?600:400}}>
                      {seg.label}<span className="gso-tier-label-range gsoTierLabelRange">{seg.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signal breakdown card */}
        <div id="geo-score-overall-comp" className="gsoCompCard">
          <div id="gso-comp-header" className="gsoCompHeader">
            <div id="gso-comp-eyebrow" className="gsoCompEyebrow">Your {geo} · broken down</div>
            <span id="gso-comp-weakness-cta" className="gsoWeaknessCta gsoLinkBtn" onClick={()=>{setActiveParent(1);setActiveSub(weakest.sub);}}>See {weakest.label} →</span>
          </div>
          <div id="gso-comp-signals" className="gsoSignalBars">
            {signals.map(sig=>(
              <div key={sig.key} className={`gso-signal-bar gso-signal-bar--${sig.key.toLowerCase()} gsoSignalBar`} style={{flex:`${sig.weight} 1 0`,background:sigBg(sig.score),color:sigFg(sig.score)}}>
                <span className="gso-signal-weight gsoSignalWeight">{sig.weight}%</span>
                <SignalKey full={sig.label} short={sig.key} />
                <span className="gso-signal-score gsoSignalScore">{sig.score}</span>
              </div>
            ))}
          </div>
          <div id="gso-comp-weakness" className="gsoWeakness" style={{borderLeft:`2px solid ${weakColor}`}}>
            <div id="gso-comp-weakness-label" className="gsoWeaknessLabel" style={{color:weakColor}}>Your weakest signal</div>
            <div id="gso-comp-weakness-text" className="gsoWeaknessText">
              Your {weakest.label} scores {weakest.score}/100 and carries {weakest.weight}% of your GEO score, meaning {weakest.lowMeaning}.
            </div>
          </div>
        </div>
      </div>

      {/* ── vcmp chart: how you rank across signals ── */}
      <div id="geo-score-overall-vcmp" className="gsoVcmpCard">
        <div id="gso-vcmp-header" className="gsoVcmpHeader">
          <div id="gso-vcmp-eyebrow" className="gsoVcmpEyebrow">How you rank in {result.ind_label||'your industry'}</div>
          <button id="gso-vcmp-cta" onClick={()=>{setActiveParent(2);setActiveSub(0);}} className="gsoLinkBtn">See competitors →</button>
        </div>
        <div id="gso-vcmp-legend" className="gsoVcmpLegend">
          <div className="gso-vcmp-legend-item gso-vcmp-legend-item--you gsoVcmpLegendItem"><span className="gso-vcmp-legend-swatch gso-vcmp-legend-swatch--you gsoVcmpSwatchYou"/><span className="gso-vcmp-legend-label gso-vcmp-legend-label--you">Your score</span></div>
          <div className="gso-vcmp-legend-item gso-vcmp-legend-item--gap gsoVcmpLegendItem"><span className="gso-vcmp-legend-swatch gso-vcmp-legend-swatch--gap gsoVcmpSwatchGap"/><span className="gso-vcmp-legend-label gso-vcmp-legend-label--gap">Top scorer per signal</span></div>
        </div>
        <div id="gso-vcmp-chart" className="gsoVcmpChart">
          <div id="gso-vcmp-y-axis" className="gsoVcmpYAxis">
            <div className="gso-vcmp-y-spacer gso-vcmp-y-spacer--top gsoVcmpYSpacer gsoVcmpYSpacerTop"/>
            <div id="gso-vcmp-y-labels" className="gsoVcmpYLabels">
              <span className="gso-vcmp-y-label gso-vcmp-y-label--100 gsoVcmpYLabel gsoVcmpYLabel100">100</span>
              <span className="gso-vcmp-y-label gso-vcmp-y-label--50 gsoVcmpYLabel gsoVcmpYLabel50">50</span>
              <span className="gso-vcmp-y-label gso-vcmp-y-label--0 gsoVcmpYLabel gsoVcmpYLabel0">0</span>
            </div>
            <div className="gso-vcmp-y-spacer gso-vcmp-y-spacer--bottom gsoVcmpYSpacer gsoVcmpYSpacerBottom"/>
          </div>
          <div id="gso-vcmp-cols" className="gsoVcmpCols">
            {vcmpCols.map((col,i)=>(
              <div key={col.label} id={`gso-vcmp-col-${col.label.toLowerCase().replace(/\s+/g,'-')}`} className={['gso-vcmp-col', col.headline&&'gso-vcmp-col--headline', 'gsoVcmpCol', col.headline&&'gsoVcmpColHeadline'].filter(Boolean).join(' ')}>
                <div className="gso-vcmp-col-score-row gsoVcmpColScoreRow">
                  <span className="gso-vcmp-col-score gsoVcmpColScore">{col.score}</span>
                  {col.ref>col.score&&<span className="gso-vcmp-col-ref gsoVcmpColRef">({col.ref})</span>}
                </div>
                <div className="gso-vcmp-col-bar-wrap gsoVcmpColBarWrap">
                  <div className="gso-vcmp-col-grid-line gso-vcmp-col-grid-line--top gsoVcmpColGridLine gsoVcmpColGridLineTop"/>
                  <div className="gso-vcmp-col-baseline gsoVcmpColBaseline"/>
                  <div className="gso-vcmp-col-bar gsoVcmpColBar" style={{height:`${col.score}%`}}/>
                  {col.ref>col.score&&<div className="gso-vcmp-col-gap-bar gsoVcmpColGapBar" style={{bottom:`${col.score}%`,height:`${col.ref-col.score}%`}}/>}
                </div>
                <div className="gso-vcmp-col-label-wrap gsoVcmpColLabelWrap" style={{fontWeight:col.headline?600:500,color:col.headline?'#0A0A0A':'#4A4A4A'}}>
                  <span className="gso-vcmp-col-label gsoVcmpColLabel">{col.label}</span>
                  <span className="gso-vcmp-col-sub gsoVcmpColSub">{col.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <GeoExplainer onSignalsClick={()=>{setActiveParent(1);setActiveSub(0);}}/>
    </div>
  );
}
