'use client';

import React, { useState } from 'react';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

export default function GeoScoreVisibilityTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  const geo = result.overall_geo_score;
  const vis = result.visibility;
  const comps = resultComps;
  const allVis = [vis,...comps.map((c:any)=>c.Vis)];
  const myVisRank = [...allVis].sort((a,b)=>b-a).indexOf(vis)+1;
  const topComp = comps.length>0?comps.reduce((a:any,b:any)=>b.Vis>a.Vis?b:a,comps[0]):null;
  const gapToTop = vis-(topComp?topComp.Vis:vis);
  const avgVis = Math.round(allVis.reduce((a:number,b:number)=>a+b,0)/allVis.length);
  const topCompBrand = result._topCompBrand || (comps.length > 0 ? comps[0].Brand : '');

  function MergedScatter({brand,vis,sent,cit,competitors,topCompBrand}:{brand:string,vis:number,sent:number,cit:number,competitors:any[],topCompBrand:string}){
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
    // Linear trendline via least-squares regression on raw data points
    const n=raw2.length;
    const sumX=raw2.reduce((s,p)=>s+p.x,0),sumY=raw2.reduce((s,p)=>s+p.y,0);
    const sumXY=raw2.reduce((s,p)=>s+p.x*p.y,0),sumXX=raw2.reduce((s,p)=>s+p.x*p.x,0);
    const slope=(n*sumXY-sumX*sumY)/(n*sumXX-sumX*sumX||1);
    const intercept=(sumY-slope*sumX)/n;
    const trendAt=(x:number)=>slope*x+intercept;
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
        {/* Trendline */}
        <line
          x1={sx3(0)} y1={sy3(trendAt(0))}
          x2={sx3(100)} y2={sy3(trendAt(100))}
          stroke="#A78BFA" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.7"/>
        <text x={sx3(96)} y={sy3(trendAt(96))-8} style={{fontSize:8,fill:'#7C3AED',fontFamily:'Inter,sans-serif',fontStyle:'italic',opacity:0.8}}>trend</text>
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
      <div className="visStatsGrid">
        <div className="visVisCard">
          <div className="visCardLabel">Your Visibility</div>
          <div className="visCardValue">{vis}</div>
          <div className="visCardSub">ranked #{myVisRank} of {allVis.length} brands  .  avg {avgVis}</div>
        </div>
        <div className="visGapCard" style={{background:gapToTop>=0?'#ECFDF5':'#FFF1F2',border:`1px solid ${gapToTop>=0?'#6EE7B7':'#FCA5A5'}`}}>
          <div className="visCardLabel" style={{color:gapToTop>=0?'#065F46':'#991B1B'}}>vs. #1 {topComp?`(${topComp.Brand})`:''}</div>
          <div className="visCardValue" style={{color:gapToTop>=0?'#065F46':'#991B1B'}}>{gapToTop>=0?'+':''}{gapToTop} pts</div>
          <div className="visCardSub" style={{color:gapToTop>=0?'#065F46':'#991B1B'}}>{gapToTop>=0?'You lead on visibility':'Behind the top competitor'}</div>
        </div>
      </div>

      <div id="geo-visibility-scatter-card" className="visScatterCard">
        <div className="visScatterHeader">
          <div className="visScatterTitle">Sentiment Score vs. Visibility Market Positioning</div>
        </div>
        <div className="visScatterDesc">Each dot = one brand positioned by Visibility vs Sentiment. Median dashed lines split the market in half.</div>
        <MergedScatter brand={result.brand_name} vis={vis} sent={result.sentiment} cit={result.citation_share} competitors={resultComps} topCompBrand={topCompBrand}/>
      </div>
    </div>
  );
}
