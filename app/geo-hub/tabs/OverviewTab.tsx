'use client';

import React from 'react';
import { geoTier } from '../lib/tiers';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

export default function OverviewTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  const geo = result.overall_geo_score;
  const tier = geoTier(geo);
  const comps = resultComps;
  const allBrands = [{GEO:geo,Brand:result.brand_name,isYou:true},...comps].sort((a:any,b:any)=>(b.GEO||0)-(a.GEO||0));
  const myRank = allBrands.findIndex((b:any)=>b.isYou)+1;
  const topComp = allBrands.find((b:any)=>!b.isYou);
  const topCompGap = topComp?Math.max(0,(topComp.GEO||0)-geo):0;
  const nextThreshold = geo<26?26:geo<45?45:geo<65?65:geo<80?80:100;
  const nextTierLabel = geo<26?'Emerging':geo<45?'Competitive':geo<65?'Leader':geo<80?'Authority':'Max';
  const missedPrompts = (result.responses_detail||[]).filter((r:any)=>!r.mentioned&&!r.brand_mentioned).length;
  const recs = (result.recommendations||[]).slice(0,3);
  const ind = result.ind_label||'your industry';
  const interpText = tier.tier===1
    ?`AI assistants rarely surface ${result.brand_name} for ${ind} queries — ${topComp?.Brand||'competitors'}${topCompGap>0?` leads by ${topCompGap} pts and`:''}  is recommended instead. Reaching ${nextThreshold} (${nextTierLabel}) puts ${result.brand_name} in the consideration set for significantly more queries.`
    :tier.tier===2
    ?`At ${geo}, ${result.brand_name} is occasionally mentioned but rarely in a leading position. Competitors above 45 are being prioritized. Growing authority signals in key segments could move you into the Competitive tier.`
    :tier.tier===3
    ?`At ${geo}, ${result.brand_name} appears in AI responses but isn't yet a first-choice recommendation. Competitors above 65 are consistently prioritized. Strengthening citation authority is the clearest path to the Leader tier.`
    :tier.tier===4
    ?`At ${geo}, AI assistants frequently surface ${result.brand_name} near the top of responses. You're above the efficiency threshold — focus is on closing the remaining gap to achieve consistent first-position recommendations.`
    :`AI assistants consistently lead with ${result.brand_name} as the top recommendation. You're in the Authority tier — the focus is on maintaining dominance and monitoring for competitor movements.`;

  return (
    <div id="geo-overall-wrapper" className="ovWrapper">
      {/* Hero row */}
      <div id="geo-overall-hero-row" className="ovHeroRow">
        {/* Score block — spans 2 cols */}
        <div id="geo-overall-score-block" className="ovScoreBlock">
          <div id="geo-overall-score-header" className="ovScoreHeader">
            <div id="geo-overall-score-eyebrow" className="ovScoreEyebrow">GEO Score</div>
            <div id="geo-overall-score-ctas" className="ovScoreCtas">
              <button id="geo-overall-score-cta-composition" onClick={()=>{setActiveParent(1);setActiveSub(0);}} className="ovLinkBtn">See composition ›</button>
              <button id="geo-overall-score-cta-competitors" onClick={()=>{setActiveParent(2);setActiveSub(0);}} className="ovLinkBtn">See competitors ›</button>
            </div>
          </div>
          <div id="geo-overall-score-display" className="ovScoreDisplay">
            <div id="geo-overall-score-number" className="ovScoreNumber">
              {geo}<span id="geo-overall-score-dot" style={{color:tier.fill,fontWeight:600}}>.</span>
            </div>
            <div id="geo-overall-score-meta" className="ovScoreMeta">
              <div id="geo-overall-score-tier" className="ovScoreTier" style={{color:tier.text}}>{tier.label}</div>
              <div id="geo-overall-score-rank" className="ovScoreRank">
                Ranked <strong className="geo-overall-rank-num ovScoreRankNum">#{myRank} of {allBrands.length}</strong>{result.ind_label?` in ${result.ind_label}`:''}
                {topComp&&topCompGap>0&&<> · <span className="geo-overall-rank-gap">{topCompGap} pts behind {topComp.Brand}</span></>}
              </div>
            </div>
          </div>
          <div id="geo-overall-score-interp" className="ovScoreInterp">{interpText}</div>
        </div>
        {/* Change block */}
        <div id="geo-overall-change-block" className="ovChangeBlock">
          <div id="geo-overall-change-header" className="ovChangeHeader">
            <div id="geo-overall-change-eyebrow" className="ovChangeEyebrow">Change since last run</div>
            <button id="geo-overall-change-cta" onClick={()=>setActiveParent(4)} className="ovLinkBtn" style={{whiteSpace:'nowrap'}}>Open Trends ›</button>
          </div>
          <div id="geo-overall-change-content" className="ovChangeContent">
            <div id="geo-overall-change-empty" className="ovChangeEmpty">
              No previous run to compare.<br/>Run the analysis again to start tracking change over time.
            </div>
          </div>
        </div>
      </div>
      {/* Actions block */}
      <div id="geo-overall-actions-block" className="ovActionsBlock">
        <div id="geo-overall-actions-header" className="ovActionsHeader">
          <div id="geo-overall-actions-title" className="ovActionsTitle">Top 3 priority actions</div>
          <button id="geo-overall-actions-cta" onClick={()=>setActiveParent(5)} className="ovLinkBtn" style={{whiteSpace:'nowrap'}}>Open Action Plan ›</button>
        </div>
        {(recs.length>0?recs:[
          {title:'Build authoritative content in your lowest-scoring query segments'},
          {title:'Expand FAQ coverage for the highest-volume prompt clusters'},
          {title:'Increase citation presence in the top AI-referenced sources'},
        ]).map((rec:any,i:number)=>(
          <div key={i} id={`geo-overall-action-${i+1}`} className={['ovActionRow', i>0&&'ovActionRowBorder'].filter(Boolean).join(' ')}
            style={{gridTemplateColumns:'auto 1fr'+(rec.gain?' auto':''),paddingTop:i===0?4:10}}>
            <span className={`geo-overall-action-badge geo-overall-action-badge--p${i+1} ovActionBadge`}
              style={{background:i===0?'#A100FF':i===1?'#0A0A0A':'#6B6B6B'}}>P{i+1}</span>
            <div className="geo-overall-action-text ovActionText">{rec.action||rec.title||rec.recommendation||JSON.stringify(rec)}</div>
            {rec.gain&&<div className="geo-overall-action-gain ovActionGain">
              <span className="geo-overall-action-gain-label ovActionGainLabel">Est gain</span>
              {rec.gain}
            </div>}
          </div>
        ))}
      </div>
      {/* Teasers */}
      <div id="geo-overall-teasers" className="ovTeasers">
        {([
          {from:'From Competitors',headline:topComp?<>Chase leads by <strong>{topCompGap} pts</strong>{result.ind_label?` in ${result.ind_label}`:''}</>:'Run competitor analysis to see where you stand',go:()=>{setActiveParent(2);setActiveSub(0);}},
          {from:'From Prompts',headline:missedPrompts>0?<><strong>{missedPrompts} prompts</strong> where {result.brand_name} does not appear</>:'Run to see which prompts you are missing',go:()=>{setActiveParent(3);setActiveSub(0);}},
        ] as {from:string;headline:React.ReactNode;go:()=>void}[]).map((t,i)=>(
          <div key={i} id={`geo-teaser-${i}`} className="geo-teaser-card ovTeaserCard" onClick={t.go}>
            <div className="geo-teaser-from ovTeaserFrom">{t.from}</div>
            <div className="geo-teaser-headline ovTeaserHeadline">{t.headline}</div>
            <span className="geo-teaser-arrow ovTeaserArrow">›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
