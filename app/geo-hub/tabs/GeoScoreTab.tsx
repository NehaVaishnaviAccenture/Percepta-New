'use client';

import React, { useRef, useState, useLayoutEffect } from 'react';

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

function SignalKey({ full, short, style }: { full: string; short: string; style: React.CSSProperties }) {
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
    <span ref={ref} id={`gso-signal-key-${full.toLowerCase().replace(/\s+/g,'-')}`} style={{...style, display:'block', overflow:'hidden', whiteSpace:'nowrap'}}>
      {showShort ? `${short}.` : full}
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
  const tierOf=(s:number)=>s>=80?{label:'Authority',color:'#00A656'}:s>=70?{label:'Leader',color:'#2563EB'}:s>=56?{label:'Competitive',color:'#E8A33D'}:s>=45?{label:'Emerging',color:'#E8703D'}:{label:'Fragmented',color:'#D62F2F'};
  const sigBg=(s:number)=>s>=80?'#00A656':s>=70?'#2563EB':s>=56?'#E8A33D':s>=45?'#E8703D':'#D62F2F';
  const sigFg=(s:number)=>(s>=56&&s<70)?'#2A1500':'white';
  const allBrands=[{GEO:geo,Brand:result.brand_name,isYou:true},...comps].sort((a:any,b:any)=>(b.GEO||0)-(a.GEO||0));
  const myRank=allBrands.findIndex((b:any)=>b.isYou)+1;
  const topComp=allBrands.find((b:any)=>!b.isYou);
  const topGap=topComp?Math.max(0,(topComp.GEO||0)-geo):0;
  const nextThreshold=geo>=80?100:geo>=70?80:geo>=56?70:geo>=45?56:45;
  const nextTierLabel=geo>=80?'Max':geo>=70?'Authority':geo>=56?'Leader':geo>=45?'Competitive':'Emerging';
  const ptsToNext=nextThreshold-geo;
  const signals=[{key:'Vis',label:'Visibility',score:vis,weight:30,sub:1},{key:'Sent',label:'Sentiment',score:sent,weight:20,sub:2},{key:'Prom',label:'Prominence',score:prom,weight:20,sub:3},{key:'Cit',label:'Citation',score:cit,weight:15,sub:4},{key:'SoV',label:'SoV',score:sov,weight:15,sub:5}];
  const weakest=[...signals].sort((a,b)=>a.score-b.score)[0];
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
    {label:'Fragmented',range:'0–44',isCurrent:geo<45,color:'#D62F2F'},
    {label:'Emerging',range:'45–55',isCurrent:geo>=45&&geo<56,color:'#E8703D'},
    {label:'Competitive',range:'56–69',isCurrent:geo>=56&&geo<70,color:'#E8A33D'},
    {label:'Leader',range:'70–79',isCurrent:geo>=70&&geo<80,color:'#2563EB'},
    {label:'Authority',range:'80–100',isCurrent:geo>=80,color:'#00A656'},
  ];
  const barFrs=[44,11,14,10,21];
  const markerPct=`${Math.min(geo,100)}%`;
  const bracketFrom=`${Math.min(geo,100)}%`;
  const bracketTo=`${Math.min(nextThreshold,100)}%`;
  const bracketMid=`${(Math.min(geo,100)+Math.min(nextThreshold,100))/2}%`;

  return (
    <div id="geo-score-overall-wrapper" style={{display:'grid',gap:14}}>

      {/* ── Top row: hero + breakdown ── */}
      <div id="gso-header-row" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>

        {/* Hero score card — spans 2 cols */}
        <div id="geo-score-overall-hero" style={{gridColumn:'span 2',background:'white',border:'1px solid #E5E5E5',padding:'24px 28px',display:'flex',flexDirection:'column' as const,gap:14}}>
          <div id="gso-hero-eyebrow" style={{fontSize:10,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#A100FF',fontFamily:'Inter,sans-serif'}}>GEO Score · Run 1</div>
          <div id="gso-hero-content" style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:36,alignItems:'start'}}>

            {/* Score pillar: big number + tier name */}
            <div id="gso-score-pillar" style={{display:'flex',flexDirection:'column' as const,gap:8}}>
              <div id="gso-score-number" style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:500,fontSize:88,lineHeight:0.95,letterSpacing:'-0.04em',color:'#0A0A0A'}}>{geo}</div>
              <div id="gso-score-tier-label" style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:600,fontSize:22,letterSpacing:'-0.01em',color:tierOf(geo).color}}>{tierOf(geo).label}</div>
            </div>

            {/* Rank text + tier ladder */}
            <div id="gso-rank-section" style={{display:'flex',flexDirection:'column' as const,gap:18}}>
              <div id="gso-rank-text" style={{fontFamily:'Inter,sans-serif',fontSize:15,lineHeight:1.4,color:'#6B6B6B'}}>
                <span className="gso-rank-num" style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:'#0A0A0A'}}>#{myRank}</span> of <span className="gso-rank-total" style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:'#0A0A0A'}}>{allBrands.length}</span> brands{topComp&&topGap>0&&<> and <span className="gso-rank-gap" style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:'#0A0A0A'}}>{topGap}</span> points behind <span className="gso-rank-leader" style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:'#0A0A0A'}}>#1</span></>} in {result.ind_label||'your industry'}.
              </div>

              {/* Tier ladder */}
              <div id="gso-tier-ladder" style={{display:'flex',flexDirection:'column' as const,gap:6,position:'relative' as const,paddingTop:ptsToNext<100?36:0}}>
                {ptsToNext<100&&<>
                  {/* Bracket: shows gap to next tier */}
                  <div id="gso-tier-bracket" style={{position:'absolute' as const,top:24,left:bracketFrom,width:`calc(${bracketTo} - ${bracketFrom})`,height:6,pointerEvents:'none' as const}}>
                    <div id="gso-tier-bracket-line" style={{position:'absolute' as const,top:0,left:0,right:0,height:1,background:'#2B2B2B'}}/>
                    <div id="gso-tier-bracket-left" style={{position:'absolute' as const,top:0,left:0,width:1,height:6,background:'#2B2B2B',transform:'translateX(-50%)'}}/>
                    <div id="gso-tier-bracket-right" style={{position:'absolute' as const,top:0,right:0,width:1,height:6,background:'#2B2B2B',transform:'translateX(50%)'}}/>
                  </div>
                  <div id="gso-tier-bracket-label" style={{position:'absolute' as const,top:2,left:bracketMid,transform:'translateX(-50%)',background:'white',padding:'2px 6px',fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,color:'#0A0A0A',whiteSpace:'nowrap' as const,zIndex:4}}>+{ptsToNext} to {nextTierLabel}</div>
                </>}

                {/* Coloured tier bar */}
                <div id="gso-tier-bar" style={{display:'grid',gridTemplateColumns:`${barFrs.join('fr ')}fr`,gap:2,height:14,position:'relative' as const}}>
                  {tierSegs.map(seg=>(
                    <div key={seg.label} className={`gso-tier-seg gso-tier-seg--${seg.label.toLowerCase()}${seg.isCurrent?' gso-tier-seg--current':''}`} style={{background:seg.color,opacity:seg.isCurrent?1:0.25}}/>
                  ))}
                  <div id="gso-tier-bar-marker" style={{position:'absolute' as const,top:-6,left:markerPct,width:2,height:22,background:'#0A0A0A',transform:'translateX(-50%)',zIndex:2}}/>
                </div>

                {/* Tier label row */}
                <div id="gso-tier-labels" style={{display:'grid',gridTemplateColumns:`${barFrs.join('fr ')}fr`,gap:2,marginTop:16}}>
                  {tierSegs.map(seg=>(
                    <div key={seg.label} className={`gso-tier-label gso-tier-label--${seg.label.toLowerCase()}${seg.isCurrent?' gso-tier-label--current':''}`} style={{textAlign:'center' as const,fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:seg.isCurrent?seg.color:'#8E8E8E',fontWeight:seg.isCurrent?600:400,lineHeight:1.2}}>
                      {seg.label}<span className="gso-tier-label-range" style={{display:'block',fontSize:8,marginTop:1}}>{seg.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signal breakdown card */}
        <div id="geo-score-overall-comp" style={{background:'white',border:'1px solid #E5E5E5',padding:'24px 28px',display:'flex',flexDirection:'column' as const,gap:14}}>
          <div id="gso-comp-eyebrow" style={{fontSize:10,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#6B6B6B',fontFamily:'Inter,sans-serif'}}>Your {geo} · broken down</div>
          <div id="gso-comp-signals" style={{display:'flex',width:'100%',height:56,overflow:'hidden'}}>
            {signals.map(sig=>(
              <div key={sig.key} className={`gso-signal-bar gso-signal-bar--${sig.key.toLowerCase()}`} style={{flex:`${sig.weight} 1 0`,minWidth:0,overflow:'hidden',position:'relative' as const,display:'flex',flexDirection:'column' as const,justifyContent:'flex-end',alignItems:'flex-start',padding:'8px 10px',background:sigBg(sig.score),borderRight:'1px solid rgba(255,255,255,0.6)',color:sigFg(sig.score)}}>
                <span className="gso-signal-weight" style={{position:'absolute' as const,top:8,right:10,fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:500,opacity:0.85}}>{sig.weight}%</span>
                <SignalKey full={sig.label} short={sig.key} style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:11,letterSpacing:'-0.01em'}} />
                <span className="gso-signal-score" style={{fontFamily:"'JetBrains Mono',monospace",fontSize:14,fontWeight:600,lineHeight:1}}>{sig.score}</span>
              </div>
            ))}
          </div>
          <div id="gso-comp-weakness" style={{borderLeft:`2px solid ${weakColor}`,paddingLeft:12,paddingTop:4,paddingBottom:4,marginTop:4}}>
            <div id="gso-comp-weakness-label" style={{fontSize:10,fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase' as const,color:weakColor,marginBottom:4,fontFamily:'Inter,sans-serif'}}>Holding you back</div>
            <p id="gso-comp-weakness-text" style={{margin:0,fontSize:12,lineHeight:1.5,color:'#2B2B2B',fontFamily:'Inter,sans-serif'}}>
              {weakest.label} ({weakest.score}) is your weakest signal.{' '}
              <span id="gso-comp-weakness-cta" style={{color:'#6B00A8',fontWeight:500,cursor:'pointer'}} onClick={()=>{setActiveParent(1);setActiveSub(weakest.sub);}}>See {weakest.label} →</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── vcmp chart: how you rank across signals ── */}
      <div id="geo-score-overall-vcmp" style={{background:'white',border:'1px solid #E5E5E5',padding:'24px 28px',display:'flex',flexDirection:'column' as const,gap:12}}>
        <div id="gso-vcmp-header" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16}}>
          <div id="gso-vcmp-eyebrow" style={{fontSize:10,fontWeight:600,letterSpacing:'0.16em',textTransform:'uppercase' as const,color:'#6B6B6B',fontFamily:'Inter,sans-serif'}}>How you rank in {result.ind_label||'your industry'}</div>
          <button id="gso-vcmp-cta" onClick={()=>{setActiveParent(2);setActiveSub(0);}} style={{background:'none',border:'none',borderBottom:'1px solid #D199FF',padding:'0 0 1px',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:11,fontWeight:500,color:'#6B00A8',whiteSpace:'nowrap' as const}}>See competitors →</button>
        </div>
        <div id="gso-vcmp-legend" style={{display:'flex',alignItems:'center',gap:18,paddingBottom:12,borderBottom:'1px solid #E5E5E5',fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'#4A4A4A'}}>
          <div className="gso-vcmp-legend-item" style={{display:'flex',alignItems:'center',gap:6}}><span className="gso-vcmp-legend-swatch" style={{display:'inline-block',width:14,height:10,background:'#0A0A0A'}}/><span>Your score</span></div>
          <div className="gso-vcmp-legend-item" style={{display:'flex',alignItems:'center',gap:6}}><span className="gso-vcmp-legend-swatch gso-vcmp-legend-swatch--gap" style={{display:'inline-block',width:14,height:10,background:'#00D1C7'}}/><span>Gap to top scorer per signal</span></div>
        </div>
        <div id="gso-vcmp-chart" style={{display:'grid',gridTemplateColumns:'36px 1fr',gap:8,height:240}}>
          <div id="gso-vcmp-y-axis" style={{display:'flex',flexDirection:'column' as const,fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:'#6B6B6B',textAlign:'right' as const}}>
            <div className="gso-vcmp-y-spacer" style={{height:24,flexShrink:0}}/>
            <div id="gso-vcmp-y-labels" style={{flex:1,position:'relative' as const}}>
              <span className="gso-vcmp-y-label" style={{position:'absolute' as const,top:0,right:0,lineHeight:1}}>100</span>
              <span className="gso-vcmp-y-label" style={{position:'absolute' as const,top:'50%',right:0,transform:'translateY(-50%)',lineHeight:1}}>50</span>
              <span className="gso-vcmp-y-label" style={{position:'absolute' as const,bottom:0,right:0,lineHeight:1}}>0</span>
            </div>
            <div className="gso-vcmp-y-spacer" style={{height:38,flexShrink:0}}/>
          </div>
          <div id="gso-vcmp-cols" style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:18}}>
            {vcmpCols.map((col,i)=>(
              <div key={col.label} id={`gso-vcmp-col-${col.label.toLowerCase().replace(/\s+/g,'-')}`} className={`gso-vcmp-col${col.headline?' gso-vcmp-col--headline':''}`} style={{display:'flex',flexDirection:'column' as const,paddingRight:col.headline?8:0,borderRight:col.headline?'1px solid #B8B8B8':'none',marginRight:col.headline?-2:0}}>
                <div className="gso-vcmp-col-score-row" style={{height:24,flexShrink:0,textAlign:'center' as const,display:'flex',alignItems:'center',justifyContent:'center',gap:2,fontFamily:"'JetBrains Mono',monospace"}}>
                  <span className="gso-vcmp-col-score" style={{fontSize:13,fontWeight:600,color:'#0A0A0A'}}>{col.score}</span>
                  {col.ref>col.score&&<span className="gso-vcmp-col-ref" style={{fontSize:12,fontWeight:500,color:'#00A89F'}}>({col.ref})</span>}
                </div>
                <div className="gso-vcmp-col-bar-wrap" style={{flex:1,position:'relative' as const,background:'#F2F2F2'}}>
                  <div className="gso-vcmp-col-grid-line" style={{position:'absolute' as const,top:0,left:0,right:0,height:0,borderTop:'1px dashed #D6D6D6'}}/>
                  <div className="gso-vcmp-col-grid-line" style={{position:'absolute' as const,top:'50%',left:0,right:0,height:0,borderTop:'1px dashed #D6D6D6'}}/>
                  <div className="gso-vcmp-col-baseline" style={{position:'absolute' as const,bottom:0,left:0,right:0,height:1,background:'#8E8E8E'}}/>
                  <div className="gso-vcmp-col-bar" style={{position:'absolute' as const,bottom:0,left:0,right:0,height:`${col.score}%`,background:'#0A0A0A'}}/>
                  {col.ref>col.score&&<div className="gso-vcmp-col-gap-bar" style={{position:'absolute' as const,bottom:`${col.score}%`,left:0,right:0,height:`${col.ref-col.score}%`,background:'#00D1C7',zIndex:1}}/>}
                </div>
                <div className="gso-vcmp-col-label-wrap" style={{height:38,flexShrink:0,paddingTop:12,textAlign:'center' as const,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,fontWeight:col.headline?600:500,color:col.headline?'#0A0A0A':'#4A4A4A',whiteSpace:'nowrap' as const}}>
                  <span className="gso-vcmp-col-label">{col.label}</span>
                  <span className="gso-vcmp-col-sub" style={{display:'block',fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:500,color:'#8E8E8E',marginTop:1}}>{col.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
