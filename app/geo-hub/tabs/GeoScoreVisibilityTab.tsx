'use client';

import React, { useState } from 'react';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

export default function GeoScoreVisibilityTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  const [selectedCluster, setSelectedCluster] = useState<string|null>(null);
  const [hovGoal, setHovGoal] = useState<'goal'|'auth'|null>(null);

  const geo = result.overall_geo_score;
  const vis = result.visibility;
  const comps = resultComps;
  const allVis = [vis,...comps.map((c:any)=>c.Vis)];
  const myVisRank = [...allVis].sort((a,b)=>b-a).indexOf(vis)+1;
  const topComp = comps.length>0?comps.reduce((a:any,b:any)=>b.Vis>a.Vis?b:a,comps[0]):null;
  const gapToTop = vis-(topComp?topComp.Vis:vis);
  const avgVis = Math.round(allVis.reduce((a:number,b:number)=>a+b,0)/allVis.length);
  const topCompBrand = result._topCompBrand || (comps.length > 0 ? comps[0].Brand : '');

  const showSc = selectedCluster==='_scurve_toggle';

  function MergedScatterSCurve({brand,vis,sent,cit,competitors,topCompBrand,score,showOverlay}:{brand:string,vis:number,sent:number,cit:number,competitors:any[],topCompBrand:string,score:number,showOverlay:boolean}){
    const [hov2,setHov2]=useState<number|null>(null);
    const raw2=[
      {label:brand,x:vis,y:sent,cit:cit,isYou:true,isTopComp:false},
      ...competitors.slice(0,20).map((c:any)=>({label:c.Brand,x:c.Vis||0,y:c.Sen??0,cit:c.Cit??30,isYou:false,isTopComp:c.Brand===topCompBrand}))
    ];
    const all2=raw2.map((a,i)=>{
      if(a.isYou||a.isTopComp)return{...a,jx:a.x,jy:a.y};
      const sz=raw2.slice(0,i).filter(b=>!b.isYou&&!b.isTopComp&&Math.abs(b.x-a.x)<=4);
      return{...a,jx:a.x+sz.length*4,jy:a.y};
    });
    const W3=960,H3=460,padL3=56,padR3=30,padT3=32,padB3=56;
    const sx3=(v:number)=>padL3+(v/100)*(W3-padL3-padR3);
    const sy3=(v:number)=>padT3+((100-v)/100)*(H3-padT3-padB3);
    const sortedX3=[...raw2.map(a=>a.x)].sort((a,b)=>a-b);
    const sortedY3=[...raw2.map(a=>a.y)].sort((a,b)=>a-b);
    const medX3=sortedX3[Math.floor(sortedX3.length/2)];
    const medY3=sortedY3[Math.floor(sortedY3.length/2)];
    const citVals3=all2.map(a=>a.cit);
    const citMin3=Math.min(...citVals3),citMax3=Math.max(...citVals3,1);
    const bR3=(c:number)=>Math.round(5+((c-citMin3)/Math.max(citMax3-citMin3,1))*10);
    const midX3=sx3(medX3),midY3=sy3(medY3);
    // S-curve overlay
    const curveY=(x:number)=>Math.round(5+90/(1+Math.exp(-0.09*(x-45))));
    const sCurvePts=Array.from({length:101},(_,x)=>({x,y:curveY(x)}));
    const sCurveD=sCurvePts.map((p,i)=>`${i===0?'M':'L'}${sx3(p.x).toFixed(1)},${sy3(p.y).toFixed(1)}`).join(' ');
    const scoreToX=(s:number)=>{let best=0,bd=999;sCurvePts.forEach(p=>{const d=Math.abs(p.y-s);if(d<bd){bd=d;best=p.x;}});return best;};
    const goalX=scoreToX(70),authX=scoreToX(80);
    const placements3=all2.map((a,i)=>{
      const cx4=sx3(a.jx),cy4=sy3(a.jy),r=bR3(a.cit);
      const zb=all2.slice(0,i).filter(b=>Math.abs(sx3(b.jx)-cx4)<24).length;
      const above=i%2===0;
      return{cx4,cy4,r,ly:Math.max(padT3+6,Math.min(H3-padB3-6,cy4+(above?-(r+11+zb*9):(r+11+zb*9)))),above};
    });
    return(
      <svg viewBox={`0 0 ${W3} ${H3}`} style={{width:'100%',display:'block',overflow:'visible'}}>
        {/* Quadrant fills */}
        <rect x={padL3} y={padT3} width={midX3-padL3} height={midY3-padT3} fill="#F0FDF4" opacity="0.4"/>
        <rect x={midX3} y={padT3} width={W3-padR3-midX3} height={midY3-padT3} fill="#F5F3FF" opacity="0.5"/>
        <rect x={padL3} y={midY3} width={midX3-padL3} height={H3-padB3-midY3} fill="#FFF7ED" opacity="0.4"/>
        <rect x={midX3} y={midY3} width={W3-padR3-midX3} height={H3-padB3-midY3} fill="#FEF2F2" opacity="0.35"/>
        {[0,25,50,75,100].map(v=><g key={v}><line x1={padL3} y1={sy3(v)} x2={W3-padR3} y2={sy3(v)} stroke="#E5E7EB" strokeWidth="1"/><text x={padL3-8} y={sy3(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:10,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>)}
        <line x1={midX3} y1={padT3} x2={midX3} y2={H3-padB3} stroke="#C4B5FD" strokeWidth="1.5" strokeDasharray="6,4"/>
        <line x1={padL3} y1={midY3} x2={W3-padR3} y2={midY3} stroke="#C4B5FD" strokeWidth="1.5" strokeDasharray="6,4"/>
        <line x1={padL3} y1={H3-padB3} x2={W3-padR3} y2={H3-padB3} stroke="#D1D5DB" strokeWidth="1.5"/>
        <line x1={padL3} y1={padT3} x2={padL3} y2={H3-padB3} stroke="#D1D5DB" strokeWidth="1.5"/>
        {/* S-curve overlay — only when showOverlay. Render AFTER bubbles so always on top */}
        {showOverlay&&(()=>{
          return<>
            {/* Shaded opportunity gap */}
            {score<70&&<path
              d={`${sCurvePts.slice(scoreToX(score),goalX+1).map((p,i)=>`${i===0?'M':'L'}${sx3(p.x).toFixed(1)},${sy3(p.y).toFixed(1)}`).join(' ')} L${sx3(goalX)},${H3-padB3} L${sx3(scoreToX(score))},${H3-padB3} Z`}
              fill="#EDE9FE" opacity="0.28"/>}
            {/* The S-curve line itself */}
            <path d={sCurveD} fill="none" stroke="#7C3AED" strokeWidth="3" opacity="0.75"/>
            {/* GEO Score label on line */}
            <text x={sx3(10)} y={sy3(curveY(10))-10} style={{fontSize:8,fill:'#7C3AED',fontFamily:'Inter,sans-serif',fontStyle:'italic'}}>GEO Score curve</text>
            {/* Authority dot — LARGEST, always on top */}
            <g style={{cursor:'pointer'}} onMouseEnter={()=>setHovGoal('auth')} onMouseLeave={()=>setHovGoal(null)}>
              <circle cx={sx3(authX)} cy={sy3(80)} r={14} fill="#43A047" stroke="white" strokeWidth="2.5"/>
              <text x={sx3(authX)} y={sy3(80)} textAnchor="middle" dominantBaseline="middle" style={{fontSize:7.5,fontWeight:800,fill:'white',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>80</text>
              <text x={sx3(authX)+18} y={sy3(80)-14} style={{fontSize:9,fontWeight:700,fill:'#43A047',fontFamily:'Inter,sans-serif'}}>Authority (80)</text>
              {hovGoal==='auth'&&<>
                <rect x={sx3(authX)+16} y={sy3(80)-42} width={148} height={42} rx={7} fill="#1F2937"/>
                <text x={sx3(authX)+90} y={sy3(80)-28} textAnchor="middle" style={{fontSize:9,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>GEO Score: 80</text>
                <text x={sx3(authX)+90} y={sy3(80)-14} textAnchor="middle" style={{fontSize:8,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>AI consistently leads with you</text>
              </>}
            </g>
            {/* Goal dot — medium, also above bubbles */}
            <g style={{cursor:'pointer'}} onMouseEnter={()=>setHovGoal('goal')} onMouseLeave={()=>setHovGoal(null)}>
              <circle cx={sx3(goalX)} cy={sy3(70)} r={11} fill="#1E88E5" stroke="white" strokeWidth="2.5"/>
              <text x={sx3(goalX)} y={sy3(70)} textAnchor="middle" dominantBaseline="middle" style={{fontSize:7,fontWeight:800,fill:'white',fontFamily:'Inter,sans-serif',pointerEvents:'none'}}>70</text>
              <text x={sx3(goalX)+15} y={sy3(70)-12} style={{fontSize:9,fontWeight:700,fill:'#1E88E5',fontFamily:'Inter,sans-serif'}}>Goal (70)</text>
              {hovGoal==='goal'&&<>
                <rect x={sx3(goalX)+13} y={sy3(70)-40} width={148} height={42} rx={7} fill="#1F2937"/>
                <text x={sx3(goalX)+87} y={sy3(70)-26} textAnchor="middle" style={{fontSize:9,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>GEO Score: 70</text>
                <text x={sx3(goalX)+87} y={sy3(70)-12} textAnchor="middle" style={{fontSize:8,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>Efficiency threshold</text>
              </>}
            </g>
          </>;
        })()}
        {/* Bubbles */}
        {all2.map((a,i)=>{
          const{cx4,cy4,r}=placements3[i];
          const fill=a.isYou?'#7C3AED':a.isTopComp?'#EFF6FF':'#CBD5E1';
          const stroke2=a.isYou?'#5B21B6':a.isTopComp?'#3B82F6':'#9CA3AF';
          return<g key={`b3${i}`} onMouseEnter={()=>setHov2(i)} onMouseLeave={()=>setHov2(null)} style={{cursor:'pointer'}}>
            {hov2===i&&<circle cx={cx4} cy={cy4} r={r+5} fill={stroke2} opacity="0.12"/>}
            <circle cx={cx4} cy={cy4} r={r} fill={fill} stroke={stroke2} strokeWidth={a.isYou?2.5:a.isTopComp?2:1}/>
          </g>;
        })}
        {/* Labels */}
        {all2.map((a,i)=>{
          const{cx4,cy4,r,ly,above}=placements3[i];
          const lc=a.isYou?'#5B21B6':a.isTopComp?'#1E40AF':'#6B7280';
          const fs2=a.isYou?12:a.isTopComp?11:7;
          const leaderY=above?cy4-r:cy4+r;
          return<g key={`lb3${i}`} onMouseEnter={()=>setHov2(i)} onMouseLeave={()=>setHov2(null)} style={{cursor:'pointer'}}>
            <line x1={cx4} y1={leaderY} x2={cx4} y2={above?ly+3:ly-3} stroke={lc} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.4"/>
            <text x={cx4} y={ly} textAnchor="middle" dominantBaseline="middle" style={{fontSize:fs2,fill:lc,fontFamily:'Inter,sans-serif',fontWeight:a.isYou||a.isTopComp?700:400,pointerEvents:'none'}}>{a.label}</text>
          </g>;
        })}
        {/* Tooltips on top */}
        {all2.map((a,i)=>{
          if(hov2!==i)return null;
          const{cx4,cy4,r}=placements3[i];
          const tipW=190,tipH=68;
          const tx=cx4+tipW+10>W3-padR3?cx4-tipW-10:cx4+10;
          const ty=cy4-tipH<padT3?cy4+r+8:cy4-tipH-8;
          return<g key={`tip3${i}`} style={{pointerEvents:'none'}}>
            <rect x={tx} y={ty} width={tipW} height={tipH} rx={8} fill="#1F2937"/>
            <text x={tx+12} y={ty+16} style={{fontSize:11,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{a.label}</text>
            <text x={tx+12} y={ty+32} style={{fontSize:10,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>Visibility: <tspan fill='#C4B5FD' fontWeight="700">{a.x}</tspan>  Sentiment: <tspan fill='#6EE7B7' fontWeight="700">{a.y}</tspan></text>
            <text x={tx+12} y={ty+48} style={{fontSize:10,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>Citation Score: <tspan fill='#FCD34D' fontWeight="700">{a.cit}</tspan></text>
          </g>;
        })}
        {/* X/Y labels */}
        {[0,10,20,30,40,50,60,70,80,90,100].map(v=><text key={v} x={sx3(v)} y={H3-padB3+16} textAnchor="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text>)}
        <text x={(padL3+W3-padR3)/2} y={H3-8} textAnchor="middle" style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>Visibility</text>
        <text x={14} y={(padT3+H3-padB3)/2} textAnchor="middle" transform={`rotate(-90,14,${(padT3+H3-padB3)/2})`} style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>Sentiment</text>
      </svg>
    );
  }

  return (
    <div id="tab-visibility">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
        <div style={{background:'#F5F3FF',borderRadius:12,border:'1px solid #DDD6FE',padding:'18px'}}><div style={{fontSize:'0.65rem',fontWeight:600,color:'#7C3AED',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:6}}>Your Visibility</div><div style={{fontSize:'2rem',fontWeight:800,color:'#7C3AED'}}>{vis}</div><div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>ranked #{myVisRank} of {allVis.length} brands  .  avg {avgVis}</div></div>
        <div style={{background:gapToTop>=0?'#ECFDF5':'#FFF1F2',borderRadius:12,border:`1px solid ${gapToTop>=0?'#6EE7B7':'#FCA5A5'}`,padding:'18px'}}><div style={{fontSize:'0.65rem',fontWeight:600,color:gapToTop>=0?'#065F46':'#991B1B',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:6}}>vs. #1 {topComp?`(${topComp.Brand})`:''}</div><div style={{fontSize:'2rem',fontWeight:800,color:gapToTop>=0?'#065F46':'#991B1B'}}>{gapToTop>=0?'+':''}{gapToTop} pts</div><div style={{fontSize:'0.72rem',color:gapToTop>=0?'#065F46':'#991B1B'}}>{gapToTop>=0?'You lead on visibility':'Behind the top competitor'}</div></div>
      </div>

      <div id="geo-visibility-scatter-card" style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'22px 26px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
          <div style={{fontSize:'1rem',fontWeight:700,color:'#111827'}}>Sentiment Score vs. Visibility Market Positioning</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {showSc&&<div style={{display:'flex',alignItems:'center',gap:12,fontSize:'0.7rem',color:'#6B7280'}}>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#7C3AED" strokeWidth="3"/></svg><span style={{color:'#7C3AED',fontWeight:700}}>GEO Score</span></span>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><svg width="12" height="12"><circle cx="6" cy="6" r="5.5" fill="#1E88E5"/></svg><span>Goal — GEO 70</span></span>
              <span style={{display:'inline-flex',alignItems:'center',gap:4}}><svg width="14" height="14"><circle cx="7" cy="7" r="6.5" fill="#43A047"/></svg><span>Authority — GEO 80</span></span>
              <span style={{fontSize:'0.64rem',color:'#9CA3AF',fontStyle:'italic'}}>Hover dots for detail</span>
            </div>}
            <button onClick={()=>setSelectedCluster(showSc?null:'_scurve_toggle')} style={{background:showSc?'#7C3AED':'#F3F4F6',color:showSc?'white':'#6B7280',border:'none',borderRadius:8,padding:'6px 14px',fontSize:'0.75rem',fontWeight:600,cursor:'pointer',transition:'all 0.15s'}}>
              {showSc?'Hide S-Curve':'Show S-Curve'}
            </button>
          </div>
        </div>
        <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:16}}>
          {showSc?'S-curve overlay shows GEO maturity threshold. Bubbles = brands positioned by Visibility vs Sentiment. Median lines split top/bottom halves.':'Each dot = one brand positioned by Visibility vs Sentiment. Median dashed lines split the market in half.'}
        </div>
        <MergedScatterSCurve brand={result.brand_name} vis={vis} sent={result.sentiment} cit={result.citation_share} competitors={resultComps} topCompBrand={topCompBrand} score={geo} showOverlay={showSc}/>
      </div>
    </div>
  );
}
