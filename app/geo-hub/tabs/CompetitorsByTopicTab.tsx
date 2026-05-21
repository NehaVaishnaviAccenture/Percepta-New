'use client';

import React, { useState } from 'react';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

export default function CompetitorsByTopicTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  const [hmHov, setHmHov] = useState<{brand:string;topic:string;score:number;tier:string;isYou:boolean}|null>(null);

  const geo=result.overall_geo_score??0;
  const brand=result.brand_name||'You';
  const indKey=result.ind_key||'gen';

  const tOf=(s:number)=>s>=80?{l:'Authority',c:'#00AB7B'}:s>=70?{l:'Leader',c:'#2F6DFF'}:s>=56?{l:'Competitive',c:'#F3B10C'}:s>=45?{l:'Emerging',c:'#F48500'}:{l:'Fragmented',c:'#E0003B'};
  const cellBg=(s:number)=>s>=80?'rgba(0,171,123,0.50)':s>=70?'rgba(47,109,255,0.50)':s>=56?'rgba(243,177,12,0.50)':s>=45?'rgba(244,133,0,0.50)':'rgba(224,0,59,0.50)';

  type TD={topics:string[];data:Record<string,Record<string,number>>};
  const TOPIC_DATA:Record<string,TD>={
    fin:{
      topics:['Rewards','Cash Back','Travel','Fees & APR','Credit Building','Perks'],
      data:{
        'Chase':           {'Rewards':88,'Cash Back':72,'Travel':91,'Fees & APR':52,'Credit Building':68,'Perks':82},
        'American Express':{'Rewards':82,'Cash Back':65,'Travel':88,'Fees & APR':48,'Credit Building':60,'Perks':91},
        'Capital One':     {'Rewards':81,'Cash Back':85,'Travel':73,'Fees & APR':51,'Credit Building':66,'Perks':70},
        'Bank of America': {'Rewards':74,'Cash Back':69,'Travel':77,'Fees & APR':58,'Credit Building':65,'Perks':71},
        'Citi':            {'Rewards':70,'Cash Back':55,'Travel':75,'Fees & APR':56,'Credit Building':58,'Perks':67},
        'Discover':        {'Rewards':68,'Cash Back':87,'Travel':48,'Fees & APR':72,'Credit Building':69,'Perks':53},
        'Wells Fargo':     {'Rewards':66,'Cash Back':63,'Travel':54,'Fees & APR':61,'Credit Building':64,'Perks':52},
        'USAA':            {'Rewards':55,'Cash Back':52,'Travel':60,'Fees & APR':68,'Credit Building':72,'Perks':45},
        'US Bank':         {'Rewards':59,'Cash Back':53,'Travel':51,'Fees & APR':63,'Credit Building':57,'Perks':50},
      }
    },
    gen:{topics:['Awareness','Trust','Value','Innovation','Service','Reach'],data:{}}
  };

  const td:TD=TOPIC_DATA[indKey]||TOPIC_DATA.gen;
  const topics=td.topics;
  const N=topics.length;

  // Use result.competitors as the source of truth for who appears
  const apiComps:(any[])=resultComps;
  const compBrands:string[]=apiComps.map((c:any)=>c.Brand);

  // Per-topic scores: lookup table first, derive from overall GEO as fallback
  const brandTopicScores=(b:string,geoScore:number):Record<string,number>=>{
    if(td.data[b]) return td.data[b];
    const seed=b.charCodeAt(0);
    return Object.fromEntries(topics.map((t,i)=>[t,Math.max(5,Math.min(100,geoScore+Math.round(Math.sin(seed+i*7)*18)))]));
  };

  const userScores:Record<string,number>=brandTopicScores(brand,geo);
  const compScores:Record<string,Record<string,number>>=Object.fromEntries(
    apiComps.map((c:any)=>[c.Brand,brandTopicScores(c.Brand,c.GEO??50)])
  );

  // Median not mean: score distribution is skewed (dominant leaders + long tail of weak brands),
  // so median gives a stable "typical competitor" reference that isn't pulled by outliers.
  const avgScores:Record<string,number>=Object.fromEntries(topics.map(t=>{
    const vals=compBrands.map(b=>compScores[b]?.[t]??0).filter(v=>v>0).sort((a,b)=>a-b);
    if(!vals.length) return [t,0];
    const mid=Math.floor(vals.length/2);
    return [t,vals.length%2?vals[mid]:Math.round((vals[mid-1]+vals[mid])/2)];
  }));

  const deltas:Record<string,number>=Object.fromEntries(topics.map(t=>[t,(userScores[t]??0)-(avgScores[t]??0)]));
  const sortedTopics=[...topics].sort((a,b)=>(userScores[b]??0)-(userScores[a]??0));

  const gapTopic=topics.reduce((w,t)=>deltas[t]<deltas[w]?t:w,topics[0]);
  const gapDelta=deltas[gapTopic];

  let tlBrand='';let tlScore=0;
  compBrands.forEach(b=>{const s=compScores[b]?.[gapTopic]??0;if(s>tlScore){tlScore=s;tlBrand=b;}});

  // Hero sentence: highlight best tier and worst tier only (not all tiers).
  // Topic list format: 1–3 topics → names, 4+ → count.
  // Threshold is 4 not 3: three named topics ("X, Y, and Z") is still readable
  // and more informative than "3 topics"; four or more reads like a bullet list.
  const tierOrder=['Authority','Leader','Competitive','Emerging','Fragmented'];
  const byTier:Record<string,string[]>={};
  topics.forEach(t=>{const tl=tOf(userScores[t]??0).l;if(!byTier[tl])byTier[tl]=[];byTier[tl].push(t);});
  const presentTiers=tierOrder.filter(tl=>byTier[tl]?.length>0);
  const bestTier=presentTiers[0];
  const worstTier=presentTiers[presentTiers.length-1];
  const bestTierColor=tOf(userScores[byTier[bestTier][0]]??0).c;
  const worstTierColor=tOf(userScores[byTier[worstTier][0]]??0).c;
  const allSameTier=presentTiers.length===1;
  const fmtTopics=(ts:string[])=>{
    if(ts.length>=4) return `${ts.length} topics`;
    if(ts.length===1) return ts[0];
    if(ts.length===2) return `${ts[0]} and ${ts[1]}`;
    return `${ts[0]}, ${ts[1]}, and ${ts[2]}`;
  };

  // Rows ordered by overall GEO rank (same as Competitors > Overall tab)
  const allRows=[
    {brand,scores:userScores,isYou:true,geoRank:geo},
    ...apiComps.map((c:any)=>({brand:c.Brand,scores:compScores[c.Brand],isYou:false,geoRank:c.GEO??50}))
  ].sort((a,b_)=>b_.geoRank-a.geoRank);

  // Radar math — hexagonal, R=180
  const R=180;
  const angles=topics.map((_,i)=>-Math.PI/2+i*2*Math.PI/N);
  const rPt=(s:number,i:number):[number,number]=>{const r=s/100*R;return[r*Math.cos(angles[i]),r*Math.sin(angles[i])];};
  const poly=(sc:number[])=>sc.map((s,i)=>{const[x,y]=rPt(s,i);return`${x.toFixed(1)},${y.toFixed(1)}`;}).join(' ');
  const gridLines=[25,50,75,100].map(p=>poly(new Array(N).fill(p)));
  const userPoly=poly(topics.map(t=>userScores[t]??0));
  const avgPoly=poly(topics.map(t=>avgScores[t]??0));
  const LR=R*1.2;
  const labelAnchors=(x:number)=>Math.abs(x)<10?'middle':x>0?'start':'end';
  // Hex ring helper — generates an annular (donut) hexagon SVG path via evenodd fill
  const s3=Math.sqrt(3)/2;
  const hexPath=(r:number)=>`M 0,${-r} L ${(r*s3).toFixed(1)},${(-r/2).toFixed(1)} L ${(r*s3).toFixed(1)},${(r/2).toFixed(1)} L 0,${r} L ${(-r*s3).toFixed(1)},${(r/2).toFixed(1)} L ${(-r*s3).toFixed(1)},${(-r/2).toFixed(1)} Z`;
  const hexRing=(rOut:number,rIn:number)=>hexPath(rOut)+' '+hexPath(rIn);
  const hexPoints=(r:number)=>`0,${-r} ${(r*s3).toFixed(1)},${(-r/2).toFixed(1)} ${(r*s3).toFixed(1)},${(r/2).toFixed(1)} 0,${r} ${(-r*s3).toFixed(1)},${(r/2).toFixed(1)} ${(-r*s3).toFixed(1)},${(-r/2).toFixed(1)}`;

  return (
    <div id="tab-competitors-by-topic" style={{maxWidth:1080,margin:'0 auto',padding:'32px 24px 60px',fontFamily:'Inter,sans-serif'}}>
      <style>{`.cbt-hero-worst{display:block}@media(max-width:767px){.cbt-hero-worst{display:inline}}`}</style>

      {/* Hero */}
      <div id="cbt-hero" style={{marginBottom:36,paddingBottom:28,borderBottom:'1px solid #E5E5E5'}}>
        <div id="cbt-hero-eyebrow" style={{fontSize:11,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#A100FF',marginBottom:12}}>Competitors · By Topic</div>
        <p id="cbt-hero-summary" style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:'clamp(20px,2.4vw,28px)' as any,fontWeight:500,lineHeight:1.25,letterSpacing:'-0.01em',color:'#0A0A0A',margin:'0 0 14px',maxWidth:'52ch'}}>
          {allSameTier
            ?<>{brand} is <span style={{fontWeight:600,color:bestTierColor}}>{bestTier}</span> on all {N} topics.</>
            :<>{brand} is <span style={{fontWeight:600,color:bestTierColor}}>{bestTier}</span> on {fmtTopics(byTier[bestTier])} — <span className="cbt-hero-worst"><span style={{fontWeight:600,color:worstTierColor}}>{worstTier}</span> on {fmtTopics(byTier[worstTier])}.</span></>
          }
        </p>
        <div id="cbt-hero-meta" style={{fontFamily:"'JetBrains Mono','DM Mono',monospace",fontSize:11,color:'#6B6B6B',letterSpacing:'0.02em'}}>
          {N} topics analyzed <span style={{color:'#D6D6D6',margin:'0 8px'}}>·</span> {compBrands.length} competitors
        </div>
      </div>

      {/* Radar block */}
      <div id="cbt-radar-block" style={{background:'white',border:'1px solid #E5E5E5',padding:'24px 28px',marginBottom:28}}>
        <div id="cbt-radar-eyebrow" style={{fontSize:11,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#A100FF',marginBottom:22}}>Your topic shape · vs. median competitor</div>
        <div id="cbt-radar-wrap" style={{display:'flex',gap:32,alignItems:'center'}}>
          <div id="cbt-radar-svg-wrap" style={{flexShrink:0,padding:'0 48px'}}>
            <svg id="cbt-radar-svg" width="400" height="400" viewBox="-230 -230 460 460" overflow="visible">
              <defs>
                <filter id="bt-blur" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="3"/>
                </filter>
                <g id="bt-tier-rings">
                  {/* Authority 80-100: outer=180, inner=143 */}
                  <path fill="#00AB7B" fillOpacity="1" fillRule="evenodd" d={hexRing(180,143)}/>
                  {/* Leader 70-79: outer=145, inner=124 */}
                  <path fill="#2F6DFF" fillOpacity="1" fillRule="evenodd" d={hexRing(145,124)}/>
                  {/* Competitive 56-69: outer=126, inner=99 */}
                  <path fill="#F3B10C" fillOpacity="0.85" fillRule="evenodd" d={hexRing(126,99)}/>
                  {/* Emerging 45-55: outer=101, inner=79 */}
                  <path fill="#F48500" fillOpacity="1" fillRule="evenodd" d={hexRing(101,79)}/>
                  {/* Fragmented 0-44: solid inner hex */}
                  <polygon fill="#E0003B" fillOpacity="0.85" points={hexPoints(81)}/>
                </g>
                <clipPath id="bt-user-clip">
                  <polygon points={userPoly}/>
                </clipPath>
              </defs>
              {/* Grid lines */}
              {gridLines.map((pts,gi)=><polygon key={gi} points={pts} fill="none" stroke="#E5E5E5" strokeWidth="1"/>)}
              {/* Axis lines */}
              {angles.map((a,i)=><line key={i} x1="0" y1="0" x2={(R*Math.cos(a)).toFixed(1)} y2={(R*Math.sin(a)).toFixed(1)} stroke="#E5E5E5" strokeWidth="1"/>)}
              {/* Tick labels */}
              {[25,50,75,100].map(v=><text key={v} x="4" y={(-v/100*R-2).toFixed(1)} style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,fill:'#8E8E8E'}}>{v}</text>)}
              {/* Tier rings clipped to user polygon with blur */}
              <g clipPath="url(#bt-user-clip)" opacity="0.45">
                <g filter="url(#bt-blur)">
                  <use href="#bt-tier-rings"/>
                </g>
              </g>
              {/* Avg competitor polygon */}
              <polygon points={avgPoly} fill="rgba(0,0,0,0.08)" stroke="#4A4A4A" strokeWidth="1.5" strokeDasharray="3 3"/>
              {/* User polygon outline */}
              <polygon points={userPoly} fill="none" stroke="#A100FF" strokeWidth="2"/>
              {/* Vertex dots colored by tier */}
              {topics.map((t,i)=>{const[x,y]=rPt(userScores[t]??0,i);return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="4" fill={tOf(userScores[t]??0).c} stroke="#A100FF" strokeWidth="1"/>;} )}
              {/* Axis labels */}
              {topics.map((t,i)=>{const a=angles[i];const lx=LR*Math.cos(a);const ly=LR*Math.sin(a);return <text key={i} x={lx.toFixed(1)} y={ly.toFixed(1)} textAnchor={labelAnchors(lx)} dominantBaseline="middle" style={{fontFamily:'Inter,sans-serif',fontSize:12,fontWeight:500,fill:'#4A4A4A'}}>{t}</text>;})}
            </svg>
          </div>
          <div id="cbt-radar-side" style={{flex:1,minWidth:0,display:'flex',flexDirection:'column' as const,gap:18}}>
            <div id="cbt-radar-topic-list" style={{borderTop:'1px solid #E5E5E5'}}>
              {sortedTopics.map(t=>(
                <div key={t} id={`cbt-radar-row-${t.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9-]/g,'').toLowerCase()}`} style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:14,padding:'10px 0',borderBottom:'1px solid #E5E5E5',alignItems:'baseline'}}>
                  <div className="cbt-topic-name" style={{fontSize:13,fontWeight:500,color:'#1A1A1A'}}>{t}</div>
                  <div className="cbt-topic-score" style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:500,color:tOf(userScores[t]??0).c,letterSpacing:'-0.01em'}}>{userScores[t]??0}</div>
                  <div className="cbt-topic-delta" style={{fontFamily:"'JetBrains Mono','DM Mono',monospace",fontSize:11,color:'#6B6B6B',minWidth:70,textAlign:'right' as const}}>{deltas[t]>=0?`+${deltas[t]}`:String(deltas[t])} vs. median</div>
                </div>
              ))}
            </div>
            <div id="cbt-radar-legend" style={{display:'flex',gap:12,flexWrap:'wrap' as const,fontSize:11,color:'#6B6B6B'}}>
              {([['#E0003B','Fragmented','0–44'],['#F48500','Emerging','45–55'],['#F3B10C','Competitive','56–69'],['#2F6DFF','Leader','70–79'],['#00AB7B','Authority','80–100']] as [string,string,string][]).map(([c,l,r])=>(
                <div key={l} className="cbt-legend-item" style={{display:'flex',alignItems:'center',gap:6}}>
                  <div className="cbt-legend-swatch" style={{width:14,height:12,background:c,flexShrink:0}}/>
                  <span>{l}<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'#8E8E8E',marginLeft:2}}>{r}</span></span>
                </div>
              ))}
              <div className="cbt-legend-item" style={{display:'flex',alignItems:'center',gap:6}}>
                <div className="cbt-legend-swatch cbt-legend-swatch--avg" style={{width:14,height:12,background:'rgba(0,0,0,0.08)',border:'1px dashed #4A4A4A',flexShrink:0}}/>
                <span>Median of {compBrands.length} competitors</span>
              </div>
            </div>
          </div>
        </div>
        <div id="cbt-radar-foot" style={{marginTop:18,paddingTop:14,borderTop:'1px solid #E5E5E5',fontSize:11,color:'#6B6B6B'}}>
          Polygon color shows tier zones — red center to green edge.
        </div>
      </div>

      {/* Bridge stats */}
      <div id="cbt-bridge" style={{marginBottom:28,padding:'22px 28px',background:'white',border:'1px solid #E5E5E5',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:32}}>
        <div id="cbt-bridge-gap" style={{display:'flex',flexDirection:'column' as const,gap:6}}>
          <div className="cbt-stat-label" style={{fontSize:10,fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase' as const,color:'#8E8E8E'}}>Your biggest gap</div>
          <div id="cbt-bridge-gap-topic" className="cbt-stat-value" style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:500,color:'#E0003B',letterSpacing:'-0.01em'}}>{gapTopic}</div>
          <div id="cbt-bridge-gap-delta" className="cbt-stat-sub" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'#6B6B6B'}}>{gapDelta} vs. median competitor</div>
        </div>
        <div id="cbt-bridge-leader" style={{display:'flex',flexDirection:'column' as const,gap:6}}>
          <div className="cbt-stat-label" style={{fontSize:10,fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase' as const,color:'#8E8E8E'}}>Topic leader</div>
          <div id="cbt-bridge-leader-brand" className="cbt-stat-value" style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:500,color:'#0A0A0A',letterSpacing:'-0.01em'}}>
            {tlBrand}<span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:500,color:'#6B6B6B',fontSize:16,marginLeft:6}}>{tlScore}</span>
          </div>
          <div id="cbt-bridge-leader-tier" className="cbt-stat-sub" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11}}><span style={{fontWeight:600,color:tOf(tlScore).c}}>{tOf(tlScore).l}</span> tier</div>
        </div>
        <div id="cbt-bridge-your-score" style={{display:'flex',flexDirection:'column' as const,gap:6}}>
          <div className="cbt-stat-label" style={{fontSize:10,fontWeight:600,letterSpacing:'0.14em',textTransform:'uppercase' as const,color:'#8E8E8E'}}>Your score</div>
          <div id="cbt-bridge-your-score-value" className="cbt-stat-value" style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:22,fontWeight:500,color:'#0A0A0A',letterSpacing:'-0.01em'}}>{userScores[gapTopic]??0}</div>
          <div id="cbt-bridge-your-score-tier" className="cbt-stat-sub" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11}}><span style={{fontWeight:600,color:tOf(userScores[gapTopic]??0).c}}>{tOf(userScores[gapTopic]??0).l}</span> tier</div>
        </div>
      </div>

      {/* Heatmap block */}
      <div id="cbt-heatmap-block" style={{background:'white',border:'1px solid #E5E5E5',padding:'24px 28px',marginBottom:28}}>
        <div id="cbt-heatmap-eyebrow" style={{fontSize:11,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#A100FF',marginBottom:22}}>The field · by topic</div>
        <div id="cbt-heatmap-grid" style={{display:'grid',gridTemplateColumns:`160px repeat(${N},1fr)`,gap:4}}>
          <div/>
          {topics.map(t=>(
            <div key={t} className="cbt-heatmap-col-head" style={{fontSize:10,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase' as const,color:'#8E8E8E',padding:'0 6px 8px',textAlign:'center' as const,lineHeight:1.3}}>{t}</div>
          ))}
          {allRows.map(row=>(
            row.isYou?(
              <div key={row.brand} id="cbt-heatmap-row-you" className="cbt-heatmap-row cbt-heatmap-row--you" style={{gridColumn:`1 / -1`,display:'grid',gridTemplateColumns:`160px repeat(${N},1fr)`,outline:'2px solid #A100FF',gap:4,padding:`4px 2px 4px 0px`}}>
                <div className="cbt-heatmap-row-label cbt-heatmap-row-label--you" style={{fontSize:13,fontWeight:700,color:'#0A0A0A',padding:'0 12px',display:'flex',alignItems:'center'}}>{row.brand}</div>
                {topics.map(t=>{const s=row.scores[t]??0;return(
                  <div key={t} className={`cbt-heatmap-cell cbt-heatmap-cell--you cbt-heatmap-cell--${tOf(s).l.toLowerCase()}`} onMouseEnter={()=>setHmHov({brand:row.brand,topic:t,score:s,tier:tOf(s).l,isYou:true})} onMouseLeave={()=>setHmHov(null)}
                    style={{height:48,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:500,letterSpacing:'-0.01em',background:cellBg(s),color:'#0A0A0A',cursor:'default'}}>
                    {s}
                  </div>
                );})}
              </div>
            ):(
              <React.Fragment key={row.brand}>
                <div className="cbt-heatmap-row-label" style={{fontSize:13,color:'#4A4A4A',padding:'0 12px',display:'flex',alignItems:'center'}}>{row.brand}</div>
                {topics.map(t=>{const s=row.scores[t]??0;return(
                  <div key={t} className={`cbt-heatmap-cell cbt-heatmap-cell--${tOf(s).l.toLowerCase()}`} onMouseEnter={()=>setHmHov({brand:row.brand,topic:t,score:s,tier:tOf(s).l,isYou:false})} onMouseLeave={()=>setHmHov(null)}
                    style={{height:48,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Space Grotesk',sans-serif",fontSize:15,fontWeight:500,letterSpacing:'-0.01em',background:cellBg(s),color:'#0A0A0A',cursor:'default'}}>
                    {s}
                  </div>
                );})}
              </React.Fragment>
            )
          ))}
        </div>
        <div id="cbt-heatmap-status" style={{marginTop:22,padding:'14px 18px',background:'#F2F2F2',border:'1px solid #E5E5E5',minHeight:56,display:'flex',alignItems:'center'}}>
          {hmHov?(
            <div id="cbt-heatmap-status-text" style={{fontSize:14,color:'#4A4A4A',lineHeight:1.5}}>
              <span style={{fontWeight:700,color:'#0A0A0A'}}>{hmHov.isYou?"You're":hmHov.brand}</span>
              {hmHov.isYou?' ':' is '}
              <span style={{fontWeight:600,color:tOf(hmHov.score).c}}>{hmHov.tier}</span>
              {' '}on <span style={{fontWeight:500,color:'#1A1A1A'}}>{hmHov.topic}</span>
              {' '}with a score of <span style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,color:'#0A0A0A'}}>{hmHov.score}</span>.
            </div>
          ):(
            <div id="cbt-heatmap-status-default" style={{fontSize:13,color:'#6B6B6B',fontStyle:'italic'}}>Hover any cell to see detail.</div>
          )}
        </div>
        <div id="cbt-heatmap-legend" style={{display:'flex',gap:16,marginTop:18,paddingTop:14,borderTop:'1px solid #E5E5E5',flexWrap:'wrap' as const,fontSize:11,color:'#6B6B6B'}}>
          {([['rgba(224,0,59,0.5)','Fragmented','0–44'],['rgba(244,133,0,0.5)','Emerging','45–55'],['rgba(243,177,12,0.5)','Competitive','56–69'],['rgba(47,109,255,0.5)','Leader','70–79'],['rgba(0,171,123,0.5)','Authority','80–100']] as [string,string,string][]).map(([c,l,r])=>(
            <div key={l} className="cbt-heatmap-legend-item" style={{display:'flex',alignItems:'center',gap:8}}>
              <div className="cbt-heatmap-legend-swatch" style={{width:20,height:14,background:c,flexShrink:0}}/>
              <span>{l}<span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'#8E8E8E',marginLeft:4}}>{r}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Where to focus */}
      <div id="cbt-focus-block" style={{background:'white',border:'1px solid #E5E5E5',padding:'24px 28px'}}>
        <div id="cbt-focus-head" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:22}}>
          <div id="cbt-focus-eyebrow" style={{fontSize:11,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#A100FF'}}>Where to focus</div>
          <button id="cbt-focus-action-plan-btn" onClick={()=>{setActiveParent(5);setActiveSub(0);}} style={{fontSize:12,fontWeight:500,color:'#6B00A8',background:'none',border:'none',borderBottom:'1px solid #D199FF',paddingBottom:1,cursor:'pointer',fontFamily:'inherit',lineHeight:1.4}}>Open Action Plan ›</button>
        </div>
        <p id="cbt-focus-content" style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:17,fontWeight:500,lineHeight:1.4,color:'#0A0A0A',letterSpacing:'-0.01em',margin:0}}>
          <span id="cbt-focus-gap-name" style={{color:'#E0003B',fontWeight:600}}>{gapTopic}</span> is your largest opportunity — a {Math.abs(gapDelta)}-point gap below the competitor median{tlBrand?`, with ${tlBrand} leading at ${tlScore}`:''}.
          <span id="cbt-focus-secondary" style={{display:'block',marginTop:8,fontFamily:'Inter,sans-serif',fontSize:14,fontWeight:400,color:'#6B6B6B',lineHeight:1.55,letterSpacing:0}}>
            {brand} mentions are limited in {gapTopic.toLowerCase()} conversations. Closing this gap requires increased citation frequency and improved positioning in {gapTopic.toLowerCase()}-related prompts.
          </span>
        </p>
      </div>

    </div>
  );
}
