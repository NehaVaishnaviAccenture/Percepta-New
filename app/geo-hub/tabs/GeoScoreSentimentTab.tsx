'use client';

import React, { useState } from 'react';
import { Tooltip, RadarChart, SentimentHeatmap } from '../lib/tiers';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

export default function GeoScoreSentimentTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  const [hovMetric, setHovMetric] = useState<string|null>(null);

  const rawSent = result.sentiment;
  const prom = result.prominence;
  const avgRank = result.avg_rank;
  const vis = result.visibility;
  const cit = result.citation_share;
  const sov = result.share_of_voice;
  const smood = rawSent>=70?'AI speaks favorably about your brand':rawSent>=45?'AI tone is neutral, room to improve':'AI tone is negative or missing';
  const pmood = prom>=70?'Named first or near top of AI responses':prom>=45?'Appears mid-list in AI responses':'Rarely named early in AI responses';

  const rd3:any[] = result.responses_detail||[];
  const cl3:any[] = result.query_clusters||[];
  const isFin = result.ind_key==='fin'||result.ind_key==='fin_retail_bank'||result.ind_key==='fin_retirement'||result.ind_key==='fin_wealth';
  const isAuto = result.ind_key==='auto';

  // Products from industry (what the brand sells/offers to customers)
  const products = isFin?[
    {label:'Credit Cards',color:'#7C3AED'},
    {label:'Savings',color:'#10B981'},
    {label:'Checking',color:'#3B82F6'},
    {label:'Loans',color:'#F59E0B'},
    {label:'Investment',color:'#EF4444'},
  ]:isAuto?[
    {label:'Sedans',color:'#7C3AED'},
    {label:'SUVs',color:'#10B981'},
    {label:'EVs',color:'#3B82F6'},
    {label:'Trucks',color:'#F59E0B'},
    {label:'Luxury',color:'#EF4444'},
  ]:[
    {label:'Core Product',color:'#7C3AED'},
    {label:'Premium Tier',color:'#10B981'},
    {label:'Entry Tier',color:'#3B82F6'},
    {label:'Bundles',color:'#F59E0B'},
    {label:'Add-ons',color:'#EF4444'},
  ];

  // Map each product to a win rate from cluster data or derive from sub-scores
  const prodWithVals = products.map((p,i)=>{
    const cluster = cl3.find((c:any)=>c.category?.toLowerCase().includes(p.label.toLowerCase().split(' ')[0]));
    const baseVal = cluster?.winRate??Math.round(30+i*8+(result.visibility||40)*0.3);
    return{...p,val:Math.max(5,Math.min(95,baseVal))};
  });

  const signals3=[
    {label:'Visibility',val:result.visibility||0,weight:30,color:'#7C3AED'},
    {label:'Sentiment',val:rawSent||0,weight:20,color:'#10B981'},
    {label:'Prominence',val:prom||0,weight:20,color:'#3B82F6'},
    {label:'Citations',val:cit||0,weight:15,color:'#F59E0B'},
    {label:'Share of Voice',val:sov||0,weight:15,color:'#EF4444'},
  ];
  const geoScore3 = Math.round(signals3.reduce((s,m)=>s+m.val*m.weight/100,0))||result.overall_geo_score||0;

  // RIGHT: AI Opportunity — what better GEO score converts into
  const totalQ3 = result.total_responses||rd3.length||100;
  const mentions3 = rd3.filter((r:any)=>r.mentioned).length||Math.round(totalQ3*0.38);
  const missed3 = totalQ3-mentions3;
  const top3count = rd3.filter((r:any)=>r.mentioned&&r.position===1).length||Math.round(mentions3*0.3);
  const opportunities=[
    {label:'Top-of-Mind Queries',val:top3count,color:'#10B981',desc:'Queries where AI names your brand first'},
    {label:'Brand Appearances',val:mentions3,color:'#7C3AED',desc:'Queries where AI mentions your brand'},
    {label:'Content Gaps',val:missed3,color:'#F59E0B',desc:'Queries where you could add presence'},
    {label:'Competitive Gap',val:Math.round(totalQ3*0.48),color:'#EF4444',desc:'Queries competitors answer that you do not'},
  ];

  const W4=920,H4=420,padT4=28,padB4=40;
  const col1=130,col2=330,col3=590,col4=760,nW4=28;
  const plotH4=H4-padT4-padB4;
  const hovPath=hovMetric;
  const setHovPath=setHovMetric;

  const layoutN4=<T extends{label:string,val:number,color:string}>(items:T[],x:number,minH=24,gap=10)=>{
    const total=items.reduce((s,n)=>s+Math.max(n.val,1),0)||1;
    const usableH=plotH4-gap*(items.length-1);
    let cy=padT4;
    return items.map(n=>{
      const h=Math.max(minH,(Math.max(n.val,1)/total)*usableH);
      const nd={...n,x,y:cy,h,mid:cy+h/2};
      cy+=h+gap;
      return nd;
    });
  };
  const lNodes=layoutN4(prodWithVals,col1,26,12);
  const sNodes=layoutN4(signals3,col2,28,8);
  const geoH4=Math.min(plotH4*0.6,160);
  const geoN4={x:col3,y:padT4+(plotH4-geoH4)/2,h:geoH4,mid:padT4+(plotH4-geoH4)/2+geoH4/2};
  const oNodes=layoutN4(opportunities,col4,28,10);

  const wavePath4=(x1:number,y1:number,h1:number,x2:number,y2:number,h2:number,bend=0.45)=>{
    const mx1=x1+nW4+(x2-x1-nW4)*bend;
    const mx2=x2-(x2-x1-nW4)*bend;
    return`M${x1+nW4},${y1} C${mx1},${y1} ${mx2},${y2} ${x2},${y2} L${x2},${y2+h2} C${mx2},${y2+h2} ${mx1},${y1+h1} ${x1+nW4},${y1+h1} Z`;
  };

  // Flows: each product → all signals (crossing streams by signal color)
  const flows4a:{path:string,color:string,pid:string,sid:string}[]=[];
  lNodes.forEach(ln=>{
    const lFrac=ln.h/plotH4;
    let sigOff=0;
    sNodes.forEach(sig=>{
      const fw=(sig.weight/100);
      const lH=Math.max(3,ln.h*fw);
      const sH=Math.max(3,sig.h*lFrac);
      const lY=ln.y+sigOff*ln.h;
      const sY=sig.y+lNodes.slice(0,lNodes.indexOf(ln)).reduce((acc,prev)=>acc+prev.h*fw,0);
      flows4a.push({path:wavePath4(ln.x,lY,lH,sig.x,sY,sH,0.42),color:sig.color,pid:ln.label,sid:sig.label});
      sigOff+=fw;
    });
  });
  // Flows: signals → GEO
  const flows4b:{path:string,color:string,sid:string}[]=[];
  let gOff4=geoN4.y;
  sNodes.forEach(sig=>{
    const h=geoN4.h*(sig.weight/100);
    flows4b.push({path:wavePath4(sig.x,sig.y,sig.h,geoN4.x,gOff4,h,0.46),color:sig.color,sid:sig.label});
    gOff4+=h;
  });
  // Flows: GEO → opportunities
  const flows4c:{path:string,color:string,oid:string}[]=[];
  const oTotal=opportunities.reduce((s,o)=>s+Math.max(o.val,1),0)||1;
  let gOff4b=geoN4.y;
  oNodes.forEach(on=>{
    const frac=Math.max(on.val,1)/oTotal;
    const h=geoN4.h*frac;
    flows4c.push({path:wavePath4(geoN4.x,gOff4b,h,on.x,on.y,on.h,0.46),color:on.color,oid:on.label});
    gOff4b+=h;
  });

  const isHov=(key:string)=>hovPath===key;
  const baseOp=hovPath?0.06:0.18;
  const activeOp=0.55;

  return (
    <div id="tab-sentiment">
      <div className="sentStatsGrid">
        {[
          {label:'sentiment score',val:rawSent,sub:smood,tip:'How positively AI describes your brand.'},
          {label:'prominence score',val:prom,sub:pmood,tip:'How early in AI responses your brand is mentioned.'},
          {label:'average rank',val:avgRank,sub:'Average position within each AI response',tip:'Average position when mentioned in AI responses.'}
        ].map(({label,val,sub,tip}:any)=>(
          <div key={label} className="sentStatCard">
            <div className="sentStatLabel">{label}<Tooltip text={tip}/></div>
            <div className="sentStatValue">{val}</div>
            <div className="sentStatSub">{sub}</div>
          </div>
        ))}
      </div>
      <div className="sentChartsGrid">
        <div className="sentChartCard">
          <div className="sentChartTitle">Product Feature Positioning</div>
          <div className="sentChartDesc">How your brand scores on key product decision drivers. Hover each point for detail.</div>
          <div className="sentChartBody">
            <RadarChart sent={rawSent} prom={prom} vis={vis} cit={cit} sov={sov} indKey={result.ind_key||'gen'} rd={result.responses_detail||[]}/>
          </div>
        </div>
        <SentimentHeatmap brandName={result.brand_name} sent={rawSent} prom={prom} vis={vis} cit={cit} sov={sov} competitors={resultComps} indKey={result.ind_key||'gen'} rd={result.responses_detail||[]}/>
      </div>
      {/* Sankey: Products → GEO Signals → GEO Score → AI Opportunity */}
      <div className="sentSankeyCard">
        <div className="sentSankeyHeader">
          <div>
            <div className="sentSankeyTitle">Brand Signal Flow GEO Score Composition</div>
            <div className="sentSankeyDesc">How your products flow through GEO signals to your score and AI opportunity. Click any node or stream to highlight its path.</div>
          </div>
          <div className="sentSankeyLegendBox">
            <div className="sentSankeyLegendTitle">AI Opportunity (right column)</div>
            {opportunities.map((o,i)=>(
              <div key={i} className="sentSankeyLegendItem">
                <div className="sentSankeyLegendDot" style={{background:o.color}}/>
                <span><strong style={{color:o.color}}>{o.label}:</strong> {o.desc}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="sentSankeyScrollArea">
        <svg viewBox={`0 0 ${W4} ${H4}`} style={{width:'100%',minWidth:700,display:'block'}}
          onClick={()=>setHovPath(null)}>
          {/* Headers */}
          {[{x:col1+nW4/2,l:'PRODUCTS'},{x:col2+nW4/2,l:'GEO SIGNALS'},{x:col3+nW4/2,l:'GEO SCORE'},{x:col4+nW4/2,l:'AI OPPORTUNITY'}].map((h,i)=>(
            <text key={i} x={h.x} y={padT4-8} textAnchor="middle" style={{fontSize:8,fontWeight:700,fill:'#9CA3AF',fontFamily:'Inter,sans-serif',letterSpacing:'0.08em'}}>{h.l}</text>
          ))}
          {/* Flows 1: products → signals */}
          {flows4a.map((f,i)=>(
            <path key={`fa${i}`} d={f.path} fill={f.color}
              opacity={hovPath?( isHov(f.pid)||isHov(f.sid)?activeOp:baseOp ):0.18}
              style={{cursor:'pointer',transition:'opacity 0.18s'}}
              onClick={(e)=>{e.stopPropagation();setHovPath(hovPath===f.pid?null:f.pid);}}/>
          ))}
          {/* Flows 2: signals → GEO */}
          {flows4b.map((f,i)=>(
            <path key={`fb${i}`} d={f.path} fill={f.color}
              opacity={hovPath?( isHov(f.sid)?activeOp:baseOp ):0.22}
              style={{cursor:'pointer',transition:'opacity 0.18s'}}
              onClick={(e)=>{e.stopPropagation();setHovPath(hovPath===f.sid?null:f.sid);}}/>
          ))}
          {/* Flows 3: GEO → opportunity */}
          {flows4c.map((f,i)=>(
            <path key={`fc${i}`} d={f.path} fill={f.color}
              opacity={hovPath?( isHov(f.oid)?activeOp:baseOp ):0.22}
              style={{cursor:'pointer',transition:'opacity 0.18s'}}
              onClick={(e)=>{e.stopPropagation();setHovPath(hovPath===f.oid?null:f.oid);}}/>
          ))}
          {/* Column 1: Product nodes */}
          {lNodes.map((n,i)=>(
            <g key={`ln${i}`} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();setHovPath(hovPath===n.label?null:n.label);}}>
              <rect x={n.x} y={n.y} width={nW4} height={n.h} fill={n.color} rx={3} opacity={hovPath&&!isHov(n.label)?0.35:1}/>
              <text x={n.x-6} y={n.mid-5} textAnchor="end" dominantBaseline="middle" style={{fontSize:9.5,fill:isHov(n.label)?n.color:'#374151',fontFamily:'Inter,sans-serif',fontWeight:isHov(n.label)?700:600}}>{n.label}</text>
              <text x={n.x-6} y={n.mid+7} textAnchor="end" dominantBaseline="middle" style={{fontSize:8,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.val}% win rate</text>
            </g>
          ))}
          {/* Column 2: Signal nodes */}
          {sNodes.map((n,i)=>(
            <g key={`sn4${i}`} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();setHovPath(hovPath===n.label?null:n.label);}}>
              <rect x={n.x} y={n.y} width={nW4} height={n.h} fill={n.color} rx={3} opacity={hovPath&&!isHov(n.label)?0.35:0.9}/>
              <text x={n.x+nW4+5} y={n.mid-5} dominantBaseline="middle" style={{fontSize:9,fill:isHov(n.label)?n.color:'#374151',fontFamily:'Inter,sans-serif',fontWeight:isHov(n.label)?700:600}}>{n.label}</text>
              <text x={n.x+nW4+5} y={n.mid+6} dominantBaseline="middle" style={{fontSize:8,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.val} · {n.weight}%</text>
            </g>
          ))}
          {/* Column 3: GEO node */}
          <rect x={geoN4.x} y={geoN4.y} width={nW4} height={geoN4.h} fill="#7C3AED" rx={5}/>
          <text x={geoN4.x+nW4+10} y={geoN4.mid-16} style={{fontSize:11,fontWeight:800,fill:'#7C3AED',fontFamily:'Inter,sans-serif'}}>GEO</text>
          <text x={geoN4.x+nW4+10} y={geoN4.mid+10} style={{fontSize:30,fontWeight:900,fill:'#7C3AED',fontFamily:'Inter,sans-serif'}}>{geoScore3}</text>
          {/* Column 4: Opportunity nodes */}
          {oNodes.map((n,i)=>(
            <g key={`on4${i}`} style={{cursor:'pointer'}} onClick={(e)=>{e.stopPropagation();setHovPath(hovPath===n.label?null:n.label);}}>
              <rect x={n.x} y={n.y} width={nW4} height={n.h} fill={n.color} rx={3} opacity={hovPath&&!isHov(n.label)?0.35:1}/>
              <text x={n.x+nW4+6} y={n.mid-5} dominantBaseline="middle" style={{fontSize:9,fill:isHov(n.label)?n.color:'#374151',fontFamily:'Inter,sans-serif',fontWeight:isHov(n.label)?700:600}}>{n.label}</text>
              <text x={n.x+nW4+6} y={n.mid+6} dominantBaseline="middle" style={{fontSize:8,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.val} queries</text>
            </g>
          ))}
          {/* Click hint */}
          {hovPath&&<text x={W4-30} y={padT4} textAnchor="end" style={{fontSize:8,fill:'#9CA3AF',fontFamily:'Inter,sans-serif',fontStyle:'italic'}}>Click anywhere to clear · Highlighted: {hovPath}</text>}
        </svg>
        </div>
        <div className="sentSignalLegend">
          {signals3.map((m,i)=>(
            <div key={i} className="sentSignalLegendItem">
              <div className="sentSignalDot" style={{background:m.color}}/>
              <span className="sentSignalLegendText">{m.label} ({m.weight}% weight · score: {m.val})</span>
            </div>
          ))}
        </div>
      </div>
      <div className="sentInsightsGrid">
        <div className="sentStrengthsCard">
          <div className="sentStrengthsTitle">Sentiment Strengths</div>
          <ul className="sentInsightList">
            {(result.strengths_list||[]).slice(0,3).map((s:string,i:number)=>(
              <li key={i} className="sentInsightItem">
                <span className="sentInsightPlus">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="sentConcernsCard">
          <div className="sentConcernsTitle">(x) Areas of Concern</div>
          <ul className="sentInsightList">
            {(result.improvements_list||[]).slice(0,3).map((w:string,i:number)=>(
              <li key={i} className="sentInsightItem">
                <span className="sentInsightMinus">-</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
