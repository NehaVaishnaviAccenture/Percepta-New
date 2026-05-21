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
    <div id="geo-overall-wrapper" style={{display:'grid',gap:14}}>
      {/* Hero row */}
      <div id="geo-overall-hero-row" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14,alignItems:'stretch'}}>
        {/* Score block — spans 2 cols */}
        <div id="geo-overall-score-block" style={{gridColumn:'span 2',background:'white',border:'1px solid #E5E5E5',padding:'28px 32px',display:'grid',gap:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#6B6B6B',fontFamily:'Inter,sans-serif'}}>GEO Score</div>
            <div style={{display:'flex',gap:18,flexShrink:0}}>
              <button onClick={()=>{setActiveParent(1);setActiveSub(0);}} style={{background:'none',border:'none',borderBottom:'1px solid #D199FF',padding:'0 0 1px',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:11,fontWeight:500,color:'#6B00A8'}}>See composition ›</button>
              <button onClick={()=>{setActiveParent(2);setActiveSub(0);}} style={{background:'none',border:'none',borderBottom:'1px solid #D199FF',padding:'0 0 1px',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:11,fontWeight:500,color:'#6B00A8'}}>See competitors ›</button>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'baseline',gap:18,flexWrap:'wrap' as const}}>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:500,fontSize:88,lineHeight:0.95,letterSpacing:'-0.04em',color:'#0A0A0A'}}>
              {geo}<span style={{color:tier.fill,fontWeight:600}}>.</span>
            </div>
            <div style={{display:'flex',flexDirection:'column' as const,gap:4}}>
              <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:28,letterSpacing:'-0.01em',lineHeight:1.1,color:tier.text}}>{tier.label}</div>
              <div style={{fontFamily:"'JetBrains Mono','DM Mono',monospace",fontSize:12,color:'#4A4A4A'}}>
                Ranked <strong style={{color:'#0A0A0A',fontWeight:600}}>#{myRank} of {allBrands.length}</strong>{result.ind_label?` in ${result.ind_label}`:''}
                {topComp&&topCompGap>0&&<> · {topCompGap} pts behind {topComp.Brand}</>}
              </div>
            </div>
          </div>
          <div style={{fontFamily:'Inter,sans-serif',fontSize:14,color:'#2B2B2B',lineHeight:1.55,maxWidth:'64ch'}}>{interpText}</div>
        </div>
        {/* Change block */}
        <div id="geo-overall-change-block" style={{background:'white',border:'1px solid #E5E5E5',padding:'28px 32px',display:'grid',gridTemplateRows:'auto 1fr'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#6B6B6B',fontFamily:'Inter,sans-serif'}}>Change since last run</div>
            <button onClick={()=>setActiveParent(4)} style={{background:'none',border:'none',borderBottom:'1px solid #D199FF',padding:'0 0 1px',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:11,fontWeight:500,color:'#6B00A8',whiteSpace:'nowrap' as const}}>Open Trends ›</button>
          </div>
          <div style={{display:'grid',alignContent:'center' as const,gap:12,paddingBottom:8}}>
            <div style={{fontFamily:'Inter,sans-serif',fontSize:13,color:'#6B6B6B',fontStyle:'italic' as const,lineHeight:1.6}}>
              No previous run to compare.<br/>Run the analysis again to start tracking change over time.
            </div>
          </div>
        </div>
      </div>
      {/* Actions block */}
      <div id="geo-overall-actions-block" style={{background:'white',border:'1px solid #E5E5E5',padding:'18px 22px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,marginBottom:12}}>
          <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:14,letterSpacing:'-0.01em',color:'#0A0A0A'}}>Top 3 priority actions</div>
          <button onClick={()=>setActiveParent(5)} style={{background:'none',border:'none',borderBottom:'1px solid #D199FF',padding:'0 0 1px',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:11,fontWeight:500,color:'#6B00A8',whiteSpace:'nowrap' as const}}>Open Action Plan ›</button>
        </div>
        {(recs.length>0?recs:[
          {title:'Build authoritative content in your lowest-scoring query segments'},
          {title:'Expand FAQ coverage for the highest-volume prompt clusters'},
          {title:'Increase citation presence in the top AI-referenced sources'},
        ]).map((rec:any,i:number)=>(
          <div key={i} style={{display:'grid',gridTemplateColumns:'auto 1fr'+(rec.gain?' auto':''),gap:14,alignItems:'center',padding:'10px 0',borderTop:i===0?'none':'1px solid #E5E5E5',paddingTop:i===0?4:10}}>
            <span style={{fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase' as const,padding:'4px 8px',color:'white',background:i===0?'#A100FF':i===1?'#0A0A0A':'#6B6B6B',flexShrink:0}}>P{i+1}</span>
            <div style={{fontFamily:'Inter,sans-serif',fontSize:13,fontWeight:600,color:'#0A0A0A',lineHeight:1.35}}>{rec.action||rec.title||rec.recommendation||JSON.stringify(rec)}</div>
            {rec.gain&&<div style={{fontFamily:"'JetBrains Mono','DM Mono',monospace",fontSize:12,color:'#6B00A8',fontWeight:600,whiteSpace:'nowrap' as const,textAlign:'right' as const}}>
              <span style={{display:'block',fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase' as const,color:'#8E8E8E',marginBottom:1}}>Est gain</span>
              {rec.gain}
            </div>}
          </div>
        ))}
      </div>
      {/* Teasers */}
      <div id="geo-overall-teasers" style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14}}>
        {([
          {from:'From Competitors',headline:topComp?<>Chase leads by <strong style={{color:'#6B00A8'}}>{topCompGap} pts</strong>{result.ind_label?` in ${result.ind_label}`:''}</>:'Run competitor analysis to see where you stand',go:()=>{setActiveParent(2);setActiveSub(0);}},
          {from:'From Prompts',headline:missedPrompts>0?<><strong style={{color:'#6B00A8'}}>{missedPrompts} prompts</strong> where {result.brand_name} does not appear</>:'Run to see which prompts you are missing',go:()=>{setActiveParent(3);setActiveSub(0);}},
        ] as {from:string;headline:React.ReactNode;go:()=>void}[]).map((t,i)=>(
          <div key={i} id={`geo-teaser-${i}`} onClick={t.go} style={{background:'white',border:'1px solid #E5E5E5',borderLeft:'3px solid #A100FF',padding:'14px 18px',cursor:'pointer',position:'relative' as const,display:'grid',gap:4}}>
            <div style={{fontFamily:'Inter,sans-serif',fontSize:9,fontWeight:700,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#6B6B6B'}}>{t.from}</div>
            <div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:500,fontSize:15,letterSpacing:'-0.01em',lineHeight:1.25,color:'#0A0A0A',paddingRight:20}}>{t.headline}</div>
            <span style={{position:'absolute' as const,top:14,right:14,color:'#A100FF',fontSize:18,fontWeight:600,lineHeight:1}}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
