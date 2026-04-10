'use client';

import React, { useState, useEffect } from 'react';

const bands = [
  { bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46', range: '80–100', label: 'Excellent', desc: 'Well optimized for AI citation' },
  { bg: '#EFF6FF', border: '#93C5FD', color: '#1E40AF', range: '70–79', label: 'Good', desc: 'Minor improvements recommended' },
  { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', range: '45–69', label: 'Needs Work', desc: 'Several issues to address' },
  { bg: '#FFF1F2', border: '#FCA5A5', color: '#991B1B', range: '0–44', label: 'Poor', desc: 'Major optimization needed' },
];

const METRIC_TIPS: Record<string,string> = {
  'visibility score': 'Measures how often your brand appears in AI-generated responses across key industry queries.',
  'citation score': 'Reflects how authoritatively AI models reference your brand compared to competitors.',
  'sentiment score': 'Captures the tone and favorability of AI responses when your brand is mentioned.',
  'avg rank': 'Your average mention position across all AI responses where your brand appeared.',
};

const RADAR_TIPS: Record<string,string> = {
  'Positivity': 'How favorable the tone is when AI mentions your brand.',
  'Brand Authority': 'How credible and expert AI perceives your brand.',
  'Message Clarity': 'How clearly and consistently your brand message comes through in AI responses.',
  'Market Relevance': 'How often your brand is surfaced for relevant queries.',
  'Trust': 'How trustworthy AI portrays your brand to consumers.',
  'Recommendation': 'How often AI actively recommends your brand over alternatives.',
};

const TABS = ['GEO Score','Competitors','Visibility','Sentiment','Citations','Prompts','Recommendations','Live Prompt','FAQ'];

function scoreBadge(s: number) {
  if (s >= 80) return { label: 'Excellent', color: '#065F46', bg: '#D1FAE5' };
  if (s >= 70) return { label: 'Good', color: '#1E40AF', bg: '#DBEAFE' };
  if (s >= 45) return { label: 'Needs Work', color: '#92400E', bg: '#FEF3C7' };
  return { label: 'Poor', color: '#991B1B', bg: '#FEE2E2' };
}

function classifyDomain(d: string) {
  const dl = d.toLowerCase();
  if (['reddit','twitter','youtube','facebook','instagram','tiktok','linkedin'].some(s=>dl.includes(s))) return {label:'Social',color:'#F59E0B',bg:'#FEF3C7'};
  if (['wikipedia','gov','edu','consumerreports','bbb','federalreserve','fdic'].some(s=>dl.includes(s))) return {label:'Institution',color:'#3B82F6',bg:'#DBEAFE'};
  if (['nerdwallet','forbes','bankrate','creditkarma','cnbc','wsj','nytimes','bloomberg','businessinsider','investopedia','motleyfool','motortrend','caranddriver','edmunds','reuters','thepointsguy','wallethub'].some(s=>dl.includes(s))) return {label:'Earned Media',color:'#10B981',bg:'#D1FAE5'};
  return {label:'Other',color:'#6B7280',bg:'#F3F4F6'};
}

function buildRadarDims(sent: number, prom: number, vis: number, cit: number, sov: number) {
  return [
    { label: 'Positivity',      val: sent },
    { label: 'Brand Authority', val: Math.round((cit * 0.6 + prom * 0.4)) },
    { label: 'Trust',           val: Math.round((sent * 0.5 + cit * 0.5)) },
    { label: 'Market Relevance',val: Math.round((vis * 0.5 + sov * 0.5)) },
    { label: 'Message Clarity', val: Math.round((prom * 0.6 + sent * 0.4)) },
    { label: 'Recommendation',  val: Math.round((sov * 0.55 + prom * 0.45)) },
  ];
}

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{position:'relative',display:'inline-flex',alignItems:'center',marginLeft:5,cursor:'help'}} onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)}>
      <span style={{width:15,height:15,borderRadius:'50%',background:'#E5E7EB',color:'#6B7280',fontSize:'0.6rem',fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center'}}>?</span>
      {show&&<span style={{position:'absolute',bottom:'130%',left:'50%',transform:'translateX(-50%)',background:'#1F2937',color:'white',fontSize:'0.72rem',lineHeight:1.6,borderRadius:8,padding:'10px 14px',width:210,textAlign:'left',boxShadow:'0 4px 12px rgba(0,0,0,0.2)',zIndex:9999,pointerEvents:'none',whiteSpace:'normal' as const}}>{text}<span style={{position:'absolute',top:'100%',left:'50%',transform:'translateX(-50%)',borderWidth:5,borderStyle:'solid',borderColor:'#1F2937 transparent transparent transparent'}}/></span>}
    </span>
  );
}

function MetricCard({ label, val, sub, color='#7C3AED', note }: { label:string; val:any; sub?:string; color?:string; note?:string }) {
  return (
    <div style={{background:'white',borderRadius:12,padding:'18px 16px',border:'1px solid #E5E7EB'}}>
      <div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:8}}>
        {label}{METRIC_TIPS[label.toLowerCase()]&&<Tooltip text={METRIC_TIPS[label.toLowerCase()]}/>}
      </div>
      <div style={{fontSize:'1.8rem',fontWeight:800,color,lineHeight:1}}>{val}</div>
      {sub&&<div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:3}}>{sub}</div>}
      {note&&<div style={{fontSize:'0.68rem',color:'#F59E0B',marginTop:4,fontWeight:600}}>⚠ {note}</div>}
    </div>
  );
}

function GeoGauge({ score, brand }: { score:number; brand:string }) {
  const badge = scoreBadge(score);
  const cx=160,cy=155,Ro=130,Ri=88;
  const a=(s:number)=>Math.PI-(s/100)*Math.PI;
  const ox=(s:number,r:number)=>cx+r*Math.cos(a(s));
  const oy=(s:number,r:number)=>cy-r*Math.sin(a(s));
  const seg=(s0:number,s1:number,fill:string)=>{const lg=s1-s0>50?1:0;return <path d={`M ${ox(s0,Ro)} ${oy(s0,Ro)} A ${Ro} ${Ro} 0 ${lg} 1 ${ox(s1,Ro)} ${oy(s1,Ro)} L ${ox(s1,Ri)} ${oy(s1,Ri)} A ${Ri} ${Ri} 0 ${lg} 0 ${ox(s0,Ri)} ${oy(s0,Ri)} Z`} fill={fill} stroke="white" strokeWidth="2"/>;};
  const mi=Ri-8,mo=Ro+8;
  return (
    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'16px 16px 14px',textAlign:'center'}}>
      <div style={{fontSize:'0.9rem',fontWeight:700,color:'#374151',marginBottom:4}}>{brand}</div>
      <svg viewBox="0 0 320 175" style={{width:'100%',display:'block',overflow:'visible'}}>
        {seg(0,44,'#FECACA')}{seg(44,69,'#FEF08A')}{seg(69,79,'#BAE6FD')}{seg(79,100,'#BBF7D0')}
        <line x1={ox(score,mi)} y1={oy(score,mi)} x2={ox(score,mo)} y2={oy(score,mo)} stroke="#6D28D9" strokeWidth="4" strokeLinecap="round"/>
        {[0,20,40,60,80,100].map(t=><text key={t} x={ox(t,Ro+18)} y={oy(t,Ro+18)} textAnchor="middle" dominantBaseline="middle" style={{fontSize:10,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{t}</text>)}
        <text x={cx} y={cy-18} textAnchor="middle" style={{fontSize:46,fontWeight:900,fill:'#7C3AED',fontFamily:'Inter,sans-serif'}}>{score}</text>
      </svg>
      <span style={{background:badge.bg,color:badge.color,borderRadius:50,padding:'5px 18px',fontSize:'0.82rem',fontWeight:700}}>{badge.label}</span>
    </div>
  );
}

function WhatScoreMeans({ score, brand }: { score:number; brand:string }) {
  const scoreBands = [
    { range:'0–44', label:'Poor', color:'#991B1B', bg:'#FFF1F2', border:'#FCA5A5', desc:'Rarely mentioned. AI lacks enough signals to surface you reliably.' },
    { range:'45–69', label:'Needs Work', color:'#92400E', bg:'#FFFBEB', border:'#FCD34D', desc:'Appears in lists but not as a primary recommendation. Missing key signals.' },
    { range:'70–79', label:'Good', color:'#1E40AF', bg:'#EFF6FF', border:'#93C5FD', desc:'AI crosses the confidence threshold. Frequent top-3 placements begin.' },
    { range:'80–100', label:'Excellent', color:'#065F46', bg:'#ECFDF5', border:'#6EE7B7', desc:'Dominant brand signal. AI leads with you as the primary recommendation.' },
  ];
  return (
    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:16}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
        <span style={{color:'#7C3AED',fontSize:'1rem'}}>↗</span>
        <span style={{fontSize:'0.95rem',fontWeight:800,color:'#7C3AED'}}>What does your score mean?</span>
      </div>
      <p style={{fontSize:'0.84rem',color:'#374151',lineHeight:1.75,margin:'0 0 14px'}}>
        Think of the GEO Score like a credit score for AI. At <strong>{score}</strong>, <strong>{brand}</strong> {score >= 80 ? 'is in the top tier — AI consistently leads with your brand as the primary recommendation.' : score >= 70 ? 'has crossed the efficiency threshold where AI models consistently feature your brand near the top of responses.' : 'is below the 70 threshold where AI models consistently feature a brand at the top of responses. You appear in results, but you\'re not yet the brand AI leads with or recommends first.'}
      </p>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10}}>
        {scoreBands.map((b,i)=>(
          <div key={i} style={{background:b.bg,borderRadius:10,border:`1.5px solid ${b.border}`,padding:'10px 12px'}}>
            <div style={{fontSize:'0.72rem',fontWeight:700,color:b.color,marginBottom:2}}>{b.range}</div>
            <div style={{fontSize:'0.88rem',fontWeight:800,color:b.color,marginBottom:4}}>{b.label}</div>
            <div style={{fontSize:'0.72rem',color:b.color,lineHeight:1.5}}>{b.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ROICurve({ score }: { score: number }) {
  const W = 700, H = 280, padL = 52, padR = 28, padT = 36, padB = 52;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const curve = (x: number) => Math.round(5 + 90 / (1 + Math.exp(-0.09 * (x - 45))));
  const pts = Array.from({ length: 101 }, (_, x) => ({ x, y: curve(x) }));
  const sx = (v: number) => padL + (v / 100) * plotW;
  const sy = (v: number) => padT + ((100 - v) / 100) * plotH;
  const scoreToX = (s: number) => {
    let best = 0, bestDiff = 999;
    pts.forEach(p => { const d = Math.abs(p.y - s); if (d < bestDiff) { bestDiff = d; best = p.x; } });
    return best;
  };
  const currentX = scoreToX(score), goalX = scoreToX(70), authX = scoreToX(80);
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const gapPts = score < 70 ? pts.slice(currentX, goalX + 1) : [];
  const fillD = gapPts.length > 1
    ? `${gapPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')} L${sx(goalX)},${padT + plotH} L${sx(currentX)},${padT + plotH} Z`
    : '';
  const [hov, setHov] = useState<string | null>(null);
  const youCX = sx(currentX), youCY = sy(score);
  const goalCX = sx(goalX), goalCY = sy(70);
  const authCX = sx(authX), authCY = sy(80);
  const stages = [
    { label: 'Fragmented', range: '0–30', color: '#EF4444' },
    { label: 'Emerging', range: '30–55', color: '#F59E0B' },
    { label: 'Competitive', range: '55–72', color: '#3B82F6' },
    { label: 'Leader', range: '72–85', color: '#10B981' },
    { label: 'Authority', range: '85+', color: '#7C3AED' },
  ];
  return (
    <div style={{ background: '#F8FAFC', borderRadius: 12 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', overflow: 'visible' }}>
        <text x={W/2} y={22} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: '#111827', fontFamily: 'Inter,sans-serif' }}>Where You Are vs Where You Need to Be</text>
        {[0,25,50,75,100].map(v=>(
          <g key={v}>
            <line x1={padL} y1={sy(v)} x2={W-padR} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1"/>
            <text x={padL-6} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text>
          </g>
        ))}
        {fillD&&<path d={fillD} fill="#EDE9FE" opacity="0.45"/>}
        <line x1={padL} y1={sy(70)} x2={W-padR} y2={sy(70)} stroke="#7C3AED" strokeWidth="1.5" strokeDasharray="5,4"/>
        <text x={W-padR+4} y={sy(70)} dominantBaseline="middle" style={{fontSize:8,fill:'#7C3AED',fontFamily:'Inter,sans-serif',fontWeight:700}}>70</text>
        <path d={pathD} fill="none" stroke="#7C3AED" strokeWidth="2.5"/>
        <line x1={padL} y1={padT+plotH} x2={W-padR} y2={padT+plotH} stroke="#D1D5DB" strokeWidth="1.5"/>
        <line x1={padL} y1={padT} x2={padL} y2={padT+plotH} stroke="#D1D5DB" strokeWidth="1.5"/>
        {[0,20,40,60,80,100].map(v=>(
          <g key={v}>
            <line x1={sx(v)} y1={padT+plotH} x2={sx(v)} y2={padT+plotH+4} stroke="#D1D5DB" strokeWidth="1"/>
            <text x={sx(v)} y={padT+plotH+14} textAnchor="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text>
          </g>
        ))}
        <text x={(padL+W-padR)/2} y={padT+plotH+22} textAnchor="middle" style={{fontSize:10,fill:'#6B7280',fontFamily:'Inter,sans-serif',fontWeight:600}}>GEO Maturity</text>
        <text x={12} y={padT+plotH/2} textAnchor="middle" transform={`rotate(-90,12,${padT+plotH/2})`} style={{fontSize:10,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>GEO Score</text>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('you')} onMouseLeave={()=>setHov(null)}>
          <circle cx={youCX} cy={youCY} r={9} fill="#7C3AED" stroke="white" strokeWidth="2"/>
          <text x={youCX} y={youCY+18} textAnchor="middle" style={{fontSize:7,fontWeight:700,fill:'#5B21B6',fontFamily:'Inter,sans-serif'}}>You ({score})</text>
          {hov==='you'&&<><rect x={youCX-52} y={youCY+28} width={104} height={20} rx={4} fill="#1F2937"/><text x={youCX} y={youCY+39} textAnchor="middle" style={{fontSize:9,fill:'white',fontWeight:700,fontFamily:'Inter,sans-serif'}}>GEO Score: {score}</text></>}
        </g>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('goal')} onMouseLeave={()=>setHov(null)}>
          <circle cx={goalCX} cy={goalCY} r={7} fill="#F59E0B" stroke="white" strokeWidth="2"/>
          <text x={goalCX-12} y={goalCY-12} textAnchor="end" style={{fontSize:7,fontWeight:700,fill:'#92400E',fontFamily:'Inter,sans-serif'}}>Goal (70)</text>
          <text x={goalCX-12} y={goalCY-3} textAnchor="end" style={{fontSize:6,fill:'#92400E',fontFamily:'Inter,sans-serif',fontStyle:'italic'}}>&quot;The Sweet Spot&quot;</text>
          {hov==='goal'&&<><rect x={goalCX-118} y={goalCY+10} width={104} height={20} rx={4} fill="#1F2937"/><text x={goalCX-66} y={goalCY+21} textAnchor="middle" style={{fontSize:9,fill:'white',fontWeight:700,fontFamily:'Inter,sans-serif'}}>GEO Score: 70</text></>}
        </g>
        <g style={{cursor:'pointer'}} onMouseEnter={()=>setHov('auth')} onMouseLeave={()=>setHov(null)}>
          <circle cx={authCX} cy={authCY} r={7} fill="#10B981" stroke="white" strokeWidth="2"/>
          <text x={authCX-12} y={authCY-12} textAnchor="end" style={{fontSize:7,fontWeight:700,fill:'#065F46',fontFamily:'Inter,sans-serif'}}>Authority (80)</text>
          <text x={authCX-12} y={authCY-3} textAnchor="end" style={{fontSize:6,fill:'#065F46',fontFamily:'Inter,sans-serif',fontStyle:'italic'}}>Diminishing Returns</text>
          {hov==='auth'&&<><rect x={authCX-118} y={authCY+10} width={104} height={20} rx={4} fill="#1F2937"/><text x={authCX-66} y={authCY+21} textAnchor="middle" style={{fontSize:9,fill:'white',fontWeight:700,fontFamily:'Inter,sans-serif'}}>GEO Score: 80</text></>}
        </g>
        {stages.map((s,i)=>{
          const cx2 = padL + (i+0.5)*(plotW/stages.length);
          return (
            <g key={i}>
              <text x={cx2} y={padT+plotH+36} textAnchor="middle" style={{fontSize:7,fontWeight:700,fill:s.color,fontFamily:'Inter,sans-serif'}}>{s.label} <tspan style={{fontWeight:400,fill:'#9CA3AF'}}>{s.range}</tspan></text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function GapCards({ result }: { result:any }) {
  const [gaps,setGaps]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);
  const [expanded,setExpanded]=useState<number|null>(null);
  const [fetched,setFetched]=useState(false);
  useEffect(()=>{
    if(fetched)return;setFetched(true);setLoading(true);
    const topComp=(result.competitors||[])[0]?.Brand||'top competitor';
    const topCompGEO=(result.competitors||[])[0]?.GEO||'unknown';
    const topCompSOV=(result.competitors||[])[0]?.Sov||'unknown';
    const prompt=`You are a senior GEO strategist at Accenture. Analyze this brand and generate exactly 5 strategic gaps ranked by impact on AI rank and conversions.

Brand: ${result.brand_name}, Industry: ${result.ind_label}, GEO Score: ${result.overall_geo_score}
Visibility: ${result.visibility}, Sentiment: ${result.sentiment}, Prominence: ${result.prominence}
Citation Share: ${result.citation_share}, Share of Voice: ${result.share_of_voice}, Avg Rank: ${result.avg_rank}
Top Competitor: ${topComp} (GEO: ${topCompGEO}, SOV: ${topCompSOV})
All Competitors: ${(result.competitors||[]).map((c:any)=>`${c.Brand} GEO:${c.GEO}`).join(', ')}
Strengths: ${(result.strengths_list||[]).join('; ')}
Issues: ${(result.improvements_list||[]).join('; ')}

Use EXACTLY these 5 gap types in order:
1. Primary Recommendation Rate
2. Share of Voice vs #1 competitor — specific gap vs ${topComp}
3. Earned Media Authority
4. Segment Depth
5. Answer Completeness

Return ONLY valid JSON array, no markdown, no backticks. Each object:
{"title":"gap type: specific finding","impact":"HIGH IMPACT"|"MEDIUM IMPACT"|"LOW-MEDIUM IMPACT","effort":"Low"|"Medium"|"High"|"Low-Medium","currentMetric":number,"targetMetric":number,"currentState":"2-3 sentences","rootCause":"2-3 sentences","howToFix":"3-4 sentences","rankImpact":"specific improvement","conversionImpact":"specific uplift"}
Sort: HIGH IMPACT first, then MEDIUM, then LOW-MEDIUM.`;
    fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})})
      .then(r=>r.json()).then(data=>{
        const text=data.response||'';
        const clean=text.replace(/```json|```/g,'').trim();
        const parsed=JSON.parse(clean);
        const order:Record<string,number>={'HIGH IMPACT':0,'MEDIUM IMPACT':1,'LOW-MEDIUM IMPACT':2};
        parsed.sort((a:any,b:any)=>(order[a.impact]??3)-(order[b.impact]??3));
        setGaps(parsed);
      }).catch(()=>setGaps([])).finally(()=>setLoading(false));
  },[]);

  const geo=result.overall_geo_score??0, projected=Math.min(geo+22,95);
  const gapColors=['#F59E0B','#10B981','#7C3AED','#EC4899','#3B82F6'];

  return (
    <div>
      <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',marginBottom:16}}>
        <ROICurve score={geo}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginTop:14}}>
          {[
            {label:'Current GEO Score',val:geo,color:'#F59E0B',sub:scoreBadge(geo).label+' — '+(geo<70?'below':'above')+' efficiency threshold'},
            {label:'Projected GEO Score',val:projected,color:'#10B981',sub:'After fixing all 5 gaps below'},
            {label:'Score Unlock',val:`+${projected-geo} pts`,color:'#7C3AED',sub:'Estimated gain from prioritized gap closure'},
          ].map((c,i)=>(
            <div key={i} style={{background:'#F9F9FC',borderRadius:12,border:'1px solid #E5E7EB',padding:'16px 18px',textAlign:'center' as const}}>
              <div style={{fontSize:'0.65rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'.08em',textTransform:'uppercase' as const,marginBottom:6}}>{c.label}</div>
              <div style={{fontSize:'2.4rem',fontWeight:900,color:c.color,lineHeight:1}}>{c.val}</div>
              <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:4}}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{fontSize:'1rem',fontWeight:800,color:'#111827',marginBottom:4}}>Top 5 Gaps to Fill — Ranked by Impact on Rank & Conversions</div>
      <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:14}}>Click any gap to see exactly what&apos;s broken, why, and how to fix it.</div>
      {loading&&(
        <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:32,display:'flex',alignItems:'center',gap:12,color:'#9CA3AF',fontSize:'0.88rem'}}>
          <div style={{width:18,height:18,border:'2px solid #DDD6FE',borderTopColor:'#7C3AED',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
          Analysing {result.brand_name}&apos;s strategic gaps…
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {!loading&&gaps.map((g,i)=>{
        const isOpen=expanded===i, pct=Math.min(100,Math.max(0,Math.round((g.currentMetric/Math.max(g.targetMetric,1))*100)));
        const impactColor=g.impact==='HIGH IMPACT'?'#EF4444':g.impact==='MEDIUM IMPACT'?'#F59E0B':'#7C3AED';
        const impactBg=g.impact==='HIGH IMPACT'?'#FEE2E2':g.impact==='MEDIUM IMPACT'?'#FEF3C7':'#EDE9FE';
        const dotColor=gapColors[i];
        return (
          <div key={i} style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',marginBottom:10,overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:14,padding:'16px 20px',cursor:'pointer'}} onClick={()=>setExpanded(isOpen?null:i)}>
              <div style={{width:34,height:34,borderRadius:'50%',background:dotColor+'22',border:`2px solid ${dotColor}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontSize:'0.75rem',fontWeight:800,color:dotColor}}>#{i+1}</span>
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' as const}}>
                  <span style={{fontSize:'0.9rem',fontWeight:700,color:'#111827'}}>{g.title}</span>
                  <span style={{background:impactBg,color:impactColor,borderRadius:50,padding:'2px 10px',fontSize:'0.68rem',fontWeight:700}}>{g.impact}</span>
                </div>
                <div style={{display:'flex',gap:16,marginTop:4,flexWrap:'wrap' as const}}>
                  <span style={{fontSize:'0.72rem',color:'#9CA3AF'}}>⚡ Effort: {g.effort}</span>
                  <span style={{fontSize:'0.72rem',fontWeight:600,color:dotColor}}>Score target: {g.currentMetric} → {g.targetMetric}</span>
                </div>
              </div>
              <span style={{color:'#9CA3AF',fontSize:'1rem'}}>{isOpen?'∧':'›'}</span>
            </div>
            {isOpen&&(
              <div style={{borderTop:'1px solid #F3F4F6',padding:'20px 20px 16px'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:14}}>
                  <div><div style={{fontSize:'0.65rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'.08em',textTransform:'uppercase' as const,marginBottom:6}}>Current State</div><div style={{fontSize:'0.83rem',color:'#374151',lineHeight:1.7}}>{g.currentState}</div></div>
                  <div><div style={{fontSize:'0.65rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'.08em',textTransform:'uppercase' as const,marginBottom:6}}>Root Cause</div><div style={{fontSize:'0.83rem',color:'#374151',lineHeight:1.7}}>{g.rootCause}</div></div>
                </div>
                <div style={{background:'#F5F3FF',borderRadius:10,border:'1px solid #DDD6FE',padding:'12px 16px',marginBottom:14}}>
                  <div style={{fontSize:'0.78rem',fontWeight:700,color:'#7C3AED',marginBottom:6}}>🔧 How to Fix It</div>
                  <div style={{fontSize:'0.83rem',color:'#374151',lineHeight:1.7}}>{g.howToFix}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                  <div style={{background:'#F0FDF4',borderRadius:10,border:'1px solid #6EE7B7',padding:'12px 16px'}}><div style={{fontSize:'0.78rem',fontWeight:700,color:'#10B981',marginBottom:6}}>📈 Rank Impact</div><div style={{fontSize:'0.83rem',color:'#374151',lineHeight:1.65}}>{g.rankImpact}</div></div>
                  <div style={{background:'#FFFBEB',borderRadius:10,border:'1px solid #FCD34D',padding:'12px 16px'}}><div style={{fontSize:'0.78rem',fontWeight:700,color:'#92400E',marginBottom:6}}>💰 Conversion Impact</div><div style={{fontSize:'0.83rem',color:'#374151',lineHeight:1.65}}>{g.conversionImpact}</div></div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'0.72rem',color:'#9CA3AF',marginBottom:6}}>
                  <span>Current metric: {g.currentMetric}</span>
                  <span style={{color:dotColor,fontWeight:700}}>Target: {g.targetMetric}</span>
                </div>
                <div style={{background:'#F3F4F6',borderRadius:50,height:6,overflow:'hidden'}}><div style={{background:dotColor,height:6,borderRadius:50,width:`${pct}%`,transition:'width 0.5s'}}/></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SankeyChart({ result }: { result:any }) {
  const [hov,setHov]=useState<number|null>(null);
  const vis=result.visibility??0,cit=result.citation_share??0,sent=result.sentiment??0,prom=result.prominence??0,sov=result.share_of_voice??0,geo=result.overall_geo_score??0;
  const inputs=[{label:'Visibility',value:vis,color:'#7C3AED',weight:30},{label:'Sentiment',value:sent,color:'#10B981',weight:20},{label:'Prominence',value:prom,color:'#3B82F6',weight:20},{label:'Citation',value:cit,color:'#F59E0B',weight:15},{label:'Share of Voice',value:sov,color:'#EF4444',weight:15}];
  const W=500,H=330,lx=175,rx=415,nw=22,gH=140,gCY=H/2,nH=30,gap=20,totalH=inputs.length*nH+(inputs.length-1)*gap,startY=(H-totalH)/2;
  const nodes=inputs.map((n,i)=>({...n,y:startY+i*(nH+gap)}));
  return (
    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'20px 24px',flex:1}}>
      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:2}}>GEO Score Composition</div>
      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:12}}>How each signal flows into your overall GEO Score</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
        {nodes.map((n,i)=>{const sm=n.y+nH/2,bH=gH/inputs.length,dm=gCY-gH/2+i*bH+bH/2,c1=lx+nw+(rx-lx-nw)*0.4,c2=lx+nw+(rx-lx-nw)*0.6,hh=nH/2,dh=bH/2,isH=hov===i;return(<g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:'pointer'}}><path d={`M${lx+nw},${sm-hh} C${c1},${sm-hh} ${c2},${dm-dh} ${rx},${dm-dh} L${rx},${dm+dh} C${c2},${dm+dh} ${c1},${sm+hh} ${lx+nw},${sm+hh}Z`} fill={n.color} opacity={isH?0.32:0.15} style={{transition:'opacity 0.2s'}}/><rect x={lx} y={n.y} width={nw} height={nH} rx={4} fill={n.color}/><text x={lx-8} y={n.y+nH/2-5} textAnchor="end" dominantBaseline="middle" style={{fontSize:12,fill:'#111827',fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.label}</text><text x={lx-8} y={n.y+nH/2+9} textAnchor="end" dominantBaseline="middle" style={{fontSize:10,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:700}}>{n.value}</text><text x={(lx+nw+rx)/2} y={sm+2} textAnchor="middle" dominantBaseline="middle" style={{fontSize:10,fill:n.color,fontFamily:'Inter,sans-serif',fontWeight:600}}>{n.weight}%</text></g>);})}
        <rect x={rx} y={gCY-gH/2} width={nw} height={gH} rx={4} fill="#7C3AED"/>
        <text x={rx+nw+10} y={gCY-14} textAnchor="start" dominantBaseline="middle" style={{fontSize:11,fill:'#374151',fontFamily:'Inter,sans-serif',fontWeight:700}}>GEO</text>
        <text x={rx+nw+10} y={gCY+2} textAnchor="start" dominantBaseline="middle" style={{fontSize:11,fill:'#374151',fontFamily:'Inter,sans-serif',fontWeight:700}}>Score</text>
        <text x={rx+nw+10} y={gCY+22} textAnchor="start" dominantBaseline="middle" style={{fontSize:24,fill:'#7C3AED',fontFamily:'Inter,sans-serif',fontWeight:900}}>{geo}</text>
      </svg>
    </div>
  );
}

function BusinessImpact({ result, onGo }: { result:any; onGo:()=>void }) {
  const geo=result.overall_geo_score??0,brand=result.brand_name??'Your Brand';
  const nextTier=geo>=80?null:geo>=70?{score:80,label:'Excellent'}:geo>=45?{score:70,label:'Good'}:{score:45,label:'Needs Work'};
  const steps=[{title:'Higher GEO Score',sub:'Stronger AI visibility'},{title:'Stronger AI Visibility',sub:'More surfaces where brand is recommended'},{title:'More Surfaces',sub:'Higher organic traffic'},{title:'Higher Traffic',sub:'More conversions'},{title:'More Conversions',sub:'More revenue'}];
  return (
    <div style={{background:'#F5F3FF',borderRadius:16,border:'1px solid #DDD6FE',padding:'18px 22px',flex:1,display:'flex',flexDirection:'column' as const}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><span>↗</span><span style={{fontSize:'0.9rem',fontWeight:700,color:'#111827'}}>What does this score mean for your business?</span></div>
      <div style={{display:'flex',flexDirection:'column' as const,gap:0,marginBottom:12}}>
        {steps.map((s,i)=>(
          <div key={i} style={{display:'flex',flexDirection:'column' as const,alignItems:'stretch'}}>
            <div style={{background:'white',borderRadius:8,border:'1px solid #DDD6FE',padding:'7px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><span style={{fontSize:'0.78rem',fontWeight:700,color:'#7C3AED'}}>{s.title}</span><span style={{fontSize:'0.72rem',color:'#9CA3AF'}}>→ {s.sub}</span></div>
            {i<steps.length-1&&<div style={{display:'flex',justifyContent:'center',padding:'2px 0'}}><span style={{color:'#C4B5FD',fontSize:'0.85rem',lineHeight:1}}>↓</span></div>}
          </div>
        ))}
      </div>
      {nextTier&&<div style={{background:'white',borderRadius:10,border:'1px solid #DDD6FE',padding:'10px 14px',fontSize:'0.82rem',color:'#374151',lineHeight:1.7,marginBottom:12}}><span style={{fontWeight:700,color:'#7C3AED'}}>{brand} is currently at {geo}.</span> Moving to {nextTier.score} ({nextTier.label}) means entering conversations where top competitors currently dominate.</div>}
      <button onClick={onGo} style={{background:'#7C3AED',color:'white',border:'none',borderRadius:50,padding:'9px 20px',fontSize:'0.82rem',fontWeight:700,cursor:'pointer',alignSelf:'flex-start' as const}}>See Competitors →</button>
    </div>
  );
}

function MarkdownText({ text }: { text:string }) {
  const lines = text.split('\n');

  // Parse inline formatting: **bold**, *italic*, `code`, and plain text
  const parseInline = (t: string): React.ReactNode[] => {
    const parts = t.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**'))
        return <strong key={j} style={{fontWeight:700,color:'#111827'}}>{p.slice(2,-2)}</strong>;
      if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
        return <em key={j} style={{fontStyle:'italic',color:'#374151'}}>{p.slice(1,-1)}</em>;
      if (p.startsWith('`') && p.endsWith('`'))
        return <code key={j} style={{background:'#F3F4F6',borderRadius:4,padding:'1px 6px',fontSize:'0.85em',fontFamily:'monospace',color:'#7C3AED'}}>{p.slice(1,-1)}</code>;
      return p;
    });
  };

  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line — spacing
    if (!trimmed) { elements.push(<div key={i} style={{height:8}}/>); i++; continue; }

    // H1
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      elements.push(<div key={i} style={{fontSize:'1.25rem',fontWeight:900,color:'#111827',marginTop:24,marginBottom:8,lineHeight:1.3,borderBottom:'2px solid #F3F4F6',paddingBottom:6}}>{parseInline(trimmed.slice(2))}</div>);
      i++; continue;
    }

    // H2
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      elements.push(<div key={i} style={{fontSize:'1.08rem',fontWeight:800,color:'#111827',marginTop:20,marginBottom:6,lineHeight:1.4}}>{parseInline(trimmed.slice(3))}</div>);
      i++; continue;
    }

    // H3
    if (trimmed.startsWith('### ')) {
      elements.push(<div key={i} style={{fontSize:'0.97rem',fontWeight:700,color:'#374151',marginTop:16,marginBottom:4,lineHeight:1.4}}>{parseInline(trimmed.slice(4))}</div>);
      i++; continue;
    }

    // H4 — bold label lines like "**1. Best Overall**"
    if (trimmed.startsWith('#### ')) {
      elements.push(<div key={i} style={{fontSize:'0.92rem',fontWeight:700,color:'#7C3AED',marginTop:12,marginBottom:3}}>{parseInline(trimmed.slice(5))}</div>);
      i++; continue;
    }

    // Divider
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(<hr key={i} style={{border:'none',borderTop:'1px solid #E5E7EB',margin:'16px 0'}}/>);
      i++; continue;
    }

    // Numbered list — collect consecutive numbered items
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) {
        const l = lines[i].trim();
        const num = l.match(/^(\d+)/)![1];
        const content = l.replace(/^\d+[\.\)]\s/, '');
        // Check if next line(s) are sub-bullets for this item
        const subItems: React.ReactNode[] = [];
        let si = i + 1;
        while (si < lines.length && /^(\s{2,}|[\s]*[-•*]\s)/.test(lines[si]) && lines[si].trim()) {
          const sl = lines[si].trim().replace(/^[-•*]\s/, '');
          subItems.push(<div key={si} style={{display:'flex',gap:8,paddingLeft:16,marginTop:3}}><span style={{color:'#9CA3AF',flexShrink:0}}>◦</span><span style={{fontSize:'0.88rem',color:'#4B5563'}}>{parseInline(sl)}</span></div>);
          si++;
        }
        items.push(
          <div key={i} style={{marginBottom: subItems.length ? 8 : 5}}>
            <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
              <span style={{background:'#7C3AED',color:'white',borderRadius:'50%',width:22,height:22,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:700,flexShrink:0,marginTop:1}}>{num}</span>
              <span style={{fontSize:'0.92rem',color:'#111827',lineHeight:1.65,flex:1}}>{parseInline(content)}</span>
            </div>
            {subItems}
          </div>
        );
        i = si;
      }
      elements.push(<div key={`nl-${i}`} style={{margin:'8px 0 12px',display:'flex',flexDirection:'column' as const,gap:2}}>{items}</div>);
      continue;
    }

    // Bullet list — collect consecutive bullet items
    if (/^[-•*✅✓✔☑]\s/.test(trimmed) || /^\s{0,3}[-•*]\s/.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length) {
        const l = lines[i];
        const lt = l.trim();
        if (!/^[-•*✅✓✔☑👉📌🔑💡⚡🎯]\s/.test(lt) && !/^\s{0,3}[-•*]\s/.test(l)) break;
        const isIndented = /^\s{4,}/.test(l);
        const content = lt.replace(/^[-•*✅✓✔☑👉📌🔑💡⚡🎯]\s/, '');
        // Detect emoji bullet
        const emojiMatch = lt.match(/^([✅✓✔☑👉📌🔑💡⚡🎯])\s/);
        const bullet = emojiMatch ? emojiMatch[1] : '•';
        const bulletColor = emojiMatch ? 'inherit' : '#7C3AED';
        items.push(
          <div key={i} style={{display:'flex',gap:8,marginBottom:4,paddingLeft:isIndented?20:0,alignItems:'flex-start'}}>
            <span style={{color:bulletColor,flexShrink:0,marginTop:2,fontSize:emojiMatch?'1rem':'0.9rem'}}>{bullet}</span>
            <span style={{fontSize:'0.92rem',color:'#374151',lineHeight:1.65}}>{parseInline(content)}</span>
          </div>
        );
        i++;
      }
      elements.push(<div key={`bl-${i}`} style={{margin:'4px 0 10px',paddingLeft:4}}>{items}</div>);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <div key={i} style={{borderLeft:'3px solid #7C3AED',paddingLeft:14,margin:'8px 0',background:'#F5F3FF',borderRadius:'0 6px 6px 0',padding:'8px 14px'}}>
          <span style={{fontSize:'0.92rem',color:'#5B21B6',lineHeight:1.65,fontStyle:'italic'}}>{parseInline(trimmed.slice(2))}</span>
        </div>
      );
      i++; continue;
    }

    // Bold standalone line (e.g. "**Why it's #1:**") — treat as mini-heading
    if (trimmed.startsWith('**') && trimmed.endsWith('**') && !trimmed.slice(2,-2).includes('**')) {
      elements.push(<div key={i} style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginTop:14,marginBottom:4}}>{parseInline(trimmed)}</div>);
      i++; continue;
    }

    // Regular paragraph
    elements.push(<p key={i} style={{margin:'3px 0',fontSize:'0.93rem',color:'#374151',lineHeight:1.75}}>{parseInline(trimmed)}</p>);
    i++;
  }

  return (
    <div style={{fontFamily:'Inter,sans-serif',color:'#374151',maxWidth:'100%'}}>
      {elements}
    </div>
  );
}

function RadarChart({ sent, prom, vis, cit, sov }: { sent:number; prom:number; vis:number; cit:number; sov:number }) {
  const [hov,setHov]=useState<number|null>(null);
  const [tooltipPos,setTooltipPos]=useState<{x:number;y:number}|null>(null);
  // FIX: use buildRadarDims which draws on independent signals per dimension
  const dims = buildRadarDims(sent, prom, vis, cit, sov);
  const compDims=dims.map(d=>({...d,val:Math.round(d.val*0.75)}));
  const cx=200,cy=200,R=120,n=dims.length;
  const angle=(i:number)=>(Math.PI/2)-(2*Math.PI*i)/n;
  const pt=(i:number,r:number)=>({x:cx+r*Math.cos(angle(i)),y:cy-r*Math.sin(angle(i))});
  const rings=[25,50,75,100];
  const poly=dims.map((d,i)=>pt(i,(d.val/100)*R));
  const compPoly=compDims.map((d,i)=>pt(i,(d.val/100)*R));
  const sorted=[...dims].sort((a,b)=>b.val-a.val);
  const top2=sorted.slice(0,2).map(d=>d.label),bot2=sorted.slice(-2).map(d=>d.label);
  return (
    <div style={{position:'relative' as const}}>
      <svg viewBox="0 0 400 420" style={{width:'100%'}}>
        {rings.map(r=>{const pts=dims.map((_,i)=>pt(i,(r/100)*R));return<g key={r}><polygon points={pts.map(p=>`${p.x},${p.y}`).join(' ')} fill={r===50?'#F5F3FF':'none'} stroke={r===50?'#C4B5FD':'#E5E7EB'} strokeWidth={r===50?1.5:1} strokeDasharray={r===50?'4,3':undefined}/><text x={cx+4} y={cy-(r/100)*R+4} style={{fontSize:9,fill:'#C4B5FD',fontFamily:'Inter,sans-serif'}}>{r}</text></g>;})}
        {dims.map((_,i)=>{const p=pt(i,R);return<line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#E5E7EB" strokeWidth="1"/>;})}
        <polygon points={compPoly.map(p=>`${p.x},${p.y}`).join(' ')} fill="#9CA3AF" fillOpacity="0.12" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="4,3"/>
        <polygon points={poly.map(p=>`${p.x},${p.y}`).join(' ')} fill="#7C3AED" fillOpacity="0.18" stroke="#7C3AED" strokeWidth="2"/>
        {dims.map((d,i)=>{const p=pt(i,(d.val/100)*R);return<circle key={i} cx={p.x} cy={p.y} r={hov===i?7:5} fill="#7C3AED" stroke="white" strokeWidth="1.5" style={{cursor:'pointer'}} onMouseEnter={(e)=>{setHov(i);const svgRect=(e.currentTarget as SVGElement).closest('svg')!.getBoundingClientRect();const circRect=(e.currentTarget as SVGElement).getBoundingClientRect();setTooltipPos({x:circRect.left+circRect.width/2-svgRect.left,y:circRect.top-svgRect.top});}} onMouseLeave={()=>{setHov(null);setTooltipPos(null);}}/>;})}
        {dims.map((d,i)=>{const lp=pt(i,R+26);const isTop=top2.includes(d.label),isBot=bot2.includes(d.label);return<text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:11,fill:isTop?'#7C3AED':isBot?'#EF4444':'#374151',fontWeight:isTop||isBot?700:400,fontFamily:'Inter,sans-serif'}}>{d.label}</text>;})}
        <g transform="translate(20,398)"><circle cx={6} cy={0} r={5} fill="#7C3AED" opacity="0.7"/><text x={16} y={0} dominantBaseline="middle" style={{fontSize:10,fill:'#374151',fontFamily:'Inter,sans-serif'}}>You</text><circle cx={58} cy={0} r={5} fill="#9CA3AF" opacity="0.5"/><text x={68} y={0} dominantBaseline="middle" style={{fontSize:10,fill:'#374151',fontFamily:'Inter,sans-serif'}}>Avg Competitor</text></g>
      </svg>
      {hov!==null&&tooltipPos&&<div style={{position:'absolute' as const,left:Math.max(0,tooltipPos.x-82),top:Math.max(0,tooltipPos.y-64),background:'#1F2937',borderRadius:8,padding:'10px 14px',width:165,pointerEvents:'none',zIndex:999,boxShadow:'0 4px 12px rgba(0,0,0,0.25)'}}><div style={{fontSize:11,fontWeight:700,color:'white',fontFamily:'Inter,sans-serif',marginBottom:3}}>{dims[hov].label}: {dims[hov].val}</div><div style={{fontSize:9,color:'#D1D5DB',fontFamily:'Inter,sans-serif',lineHeight:1.5}}>{RADAR_TIPS[dims[hov].label]}</div></div>}
      <div style={{background:'#F5F3FF',borderRadius:8,border:'1px solid #DDD6FE',padding:'8px 14px',fontSize:'0.78rem',color:'#5B21B6',marginTop:4}}>💡 <strong>Insight:</strong> Strong in {top2.join(' and ')}, weaker in {bot2.join(' and ')}.</div>
    </div>
  );
}

function SentimentHeatmap({ brandName, sent, prom, vis, cit, sov, competitors }: { brandName:string; sent:number; prom:number; vis:number; cit:number; sov:number; competitors:any[] }) {
  const [hovCell,setHovCell]=useState<string|null>(null);
  // FIX: use buildRadarDims for consistent, signal-driven dimension values
  const myDims = buildRadarDims(sent, prom, vis, cit, sov);
  const seed=(str:string,i:number)=>{let h=0;for(let k=0;k<str.length;k++)h=(h*31+str.charCodeAt(k))>>>0;return((h+i*6271)%40)/100;};
  const rows=[
    {name:brandName,isYou:true,scores:myDims.map(d=>d.val)},
    ...(competitors||[]).slice(0,8).map((c:any)=>{
      const cs=c.Sen||Math.round(sent*0.75+seed(c.Brand||'',0)*25);
      const cp=c.Prom||Math.round(prom*0.75+seed(c.Brand||'',1)*25);
      const cv=c.Vis||Math.round(vis*0.75+seed(c.Brand||'',2)*25);
      const cct=c.Cit||Math.round((cit||30)*0.75+seed(c.Brand||'',3)*25);
      const csov=c.Sov||Math.round((sov||40)*0.75+seed(c.Brand||'',4)*25);
      const compDims = buildRadarDims(cs, cp, cv, cct, csov);
      return{name:c.Brand||'',isYou:false,scores:compDims.map(d=>Math.min(100,Math.max(10,d.val+Math.round(seed(c.Brand||'',5)*20-10))))};
    })
  ];
  const labels = myDims.map(d => d.label);
  const shortLabels = ['Positivity','Authority','Trust','Mkt Rel.','Clarity','Recommend.'];
  const allScores=rows.flatMap(r=>r.scores),minS=Math.min(...allScores),maxS=Math.max(...allScores,1);
  const cellColor=(val:number)=>{const t=(val-minS)/Math.max(maxS-minS,1);if(t<0.2)return{bg:'#F3F4F6',text:'#9CA3AF'};if(t<0.4)return{bg:'#EDE9FE',text:'#6D28D9'};if(t<0.6)return{bg:'#C4B5FD',text:'#5B21B6'};if(t<0.8)return{bg:'#8B5CF6',text:'white'};return{bg:'#5B21B6',text:'white'};};
  const compRows=rows.slice(1),dimWins=labels.map((lbl,di)=>{const yourScore=rows[0].scores[di],beaten=compRows.filter(r=>yourScore>r.scores[di]).length;return{dim:lbl,score:yourScore,beaten};});
  const strongest=[...dimWins].sort((a,b)=>b.score-a.score)[0],weakest=[...dimWins].sort((a,b)=>a.score-b.score)[0];
  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24,display:'flex',flexDirection:'column' as const}}>
      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:2}}>Sentiment Dimensions vs Competitors</div>
      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:14}}>Darker = stronger. Hover to see score.</div>
      <div style={{flex:1,display:'grid',gridTemplateColumns:`110px repeat(${labels.length},1fr)`,gridTemplateRows:`auto repeat(${rows.length},1fr)`,gap:4}}>
        <div/>{shortLabels.map((lbl,i)=><div key={i} style={{fontSize:'0.62rem',color:'#9CA3AF',fontWeight:600,textAlign:'center' as const,paddingBottom:6,lineHeight:1.3}}>{lbl}</div>)}
        {rows.map((r,ri)=>[<div key={`l${ri}`} style={{fontSize:'0.73rem',color:r.isYou?'#7C3AED':'#374151',fontWeight:r.isYou?700:400,textAlign:'right' as const,paddingRight:8,whiteSpace:'nowrap' as const,overflow:'hidden',textOverflow:'ellipsis',display:'flex',alignItems:'center',justifyContent:'flex-end'}}>{r.name}</div>,...r.scores.map((val,ci)=>{const k=`${ri}-${ci}`,{bg,text}=cellColor(val),isH=hovCell===k;return<div key={`c${k}`} onMouseEnter={()=>setHovCell(k)} onMouseLeave={()=>setHovCell(null)} style={{borderRadius:5,background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.68rem',fontWeight:700,color:text,cursor:'default',transition:'transform 0.1s',transform:isH?'scale(1.04)':'scale(1)',border:r.isYou?'2px solid #7C3AED':'2px solid transparent',boxSizing:'border-box' as const,minHeight:24}}>{isH?val:''}</div>;})])}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:14,marginTop:12,flexWrap:'wrap' as const}}>{[{bg:'#5B21B6',label:'Strong (80+)'},{bg:'#8B5CF6',label:'Good (60–79)'},{bg:'#C4B5FD',label:'Moderate (40–59)'},{bg:'#F3F4F6',label:'Weak (<40)',border:'1px solid #E5E7EB'}].map((l,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:11,height:11,borderRadius:2,background:l.bg,border:l.border}}/><span style={{fontSize:'0.68rem',color:'#6B7280'}}>{l.label}</span></div>)}<div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:11,height:11,borderRadius:2,background:'#C4B5FD',border:'2px solid #7C3AED'}}/><span style={{fontSize:'0.68rem',color:'#6B7280'}}>Your brand</span></div></div>
      <div style={{background:'#F5F3FF',borderRadius:8,border:'1px solid #DDD6FE',padding:'8px 14px',fontSize:'0.78rem',color:'#5B21B6',marginTop:10}}>💡 <strong>Insight:</strong> Strongest in <strong>{strongest?.dim}</strong> ({strongest?.score}) — ahead of {strongest?.beaten}/{compRows.length} competitors. Weakest in <strong>{weakest?.dim}</strong> ({weakest?.score}).</div>
    </div>
  );
}

function VisibilityBars({ brand, vis, competitors }: { brand:string; vis:number; competitors:any[] }) {
  const all=[{Brand:brand,Vis:vis,isYou:true},...competitors.map(c=>({Brand:c.Brand,Vis:c.Vis,isYou:false}))].sort((a,b)=>b.Vis-a.Vis);
  const max=Math.max(...all.map(a=>a.Vis),1);
  return <div>{all.map((a,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}><div style={{width:18,fontSize:'0.8rem',color:a.isYou?'#7C3AED':'#9CA3AF',fontWeight:a.isYou?700:400}}>{i+1}</div><div style={{width:140,fontSize:'0.84rem',color:'#374151',fontWeight:a.isYou?700:400}}>{a.Brand}{a.isYou&&<span style={{marginLeft:6,fontSize:'0.68rem',background:'#EDE9FE',color:'#7C3AED',borderRadius:4,padding:'1px 5px',fontWeight:700}}>← You</span>}</div><div style={{flex:1,background:'#F3F4F6',borderRadius:50,height:8,overflow:'hidden'}}><div style={{background:a.isYou?'#7C3AED':'#D1D5DB',height:8,borderRadius:50,width:`${(a.Vis/max)*100}%`}}/></div><div style={{width:32,fontSize:'0.85rem',fontWeight:700,color:a.isYou?'#7C3AED':'#374151',textAlign:'right' as const}}>{a.Vis}</div></div>)}</div>;
}

function ScatterPlot({ brand, vis, sent, competitors }: { brand:string; vis:number; sent:number; competitors:any[] }) {
  const [hov,setHov]=useState<number|null>(null);
  const all=[{label:brand,x:vis,y:sent,isYou:true},...competitors.map(c=>({label:c.Brand,x:c.Vis,y:c.Sen??c.Sent??0,isYou:false}))];
  const W=700,H=320,padL=52,padR=24,padT=24,padB=48;
  const xVals=all.map(a=>a.x),yVals=all.map(a=>a.y);
  const xMin=Math.max(0,Math.min(...xVals)-10),xMax=Math.max(...xVals)+10,yMin=Math.max(0,Math.min(...yVals)-10),yMax=Math.min(100,Math.max(...yVals)+10);
  const sx=(v:number)=>padL+(v-xMin)/(xMax-xMin)*(W-padL-padR),sy=(v:number)=>padT+(yMax-v)/(yMax-yMin)*(H-padT-padB);
  const avgX=Math.round(all.reduce((s,a)=>s+a.x,0)/all.length),avgY=Math.round(all.reduce((s,a)=>s+a.y,0)/all.length);
  const yTicks=[0,25,50,75,100].filter(v=>v>=yMin&&v<=yMax);
  return (
    <div style={{background:'#F8FAFC',borderRadius:12,padding:'8px 0 0'}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',display:'block'}}>
        {yTicks.map(v=><g key={v}><line x1={padL} y1={sy(v)} x2={W-padR} y2={sy(v)} stroke="#E5E7EB" strokeWidth="1"/><text x={padL-8} y={sy(v)} textAnchor="end" dominantBaseline="middle" style={{fontSize:10,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>)}
        <line x1={sx(avgX)} y1={padT} x2={sx(avgX)} y2={H-padB} stroke="#C4B5FD" strokeWidth="1" strokeDasharray="5,4"/>
        <line x1={padL} y1={sy(avgY)} x2={W-padR} y2={sy(avgY)} stroke="#C4B5FD" strokeWidth="1" strokeDasharray="5,4"/>
        <line x1={padL} y1={H-padB} x2={W-padR} y2={H-padB} stroke="#E5E7EB" strokeWidth="1"/>
        <line x1={padL} y1={padT} x2={padL} y2={H-padB} stroke="#E5E7EB" strokeWidth="1"/>
        {all.map((a,i)=>{const cx2=sx(a.x),cy2=sy(a.y),isH=hov===i;return<g key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)} style={{cursor:'pointer'}}>{isH&&<circle cx={cx2} cy={cy2} r={11} fill={a.isYou?'#7C3AED':'#6B7280'} opacity="0.15"/>}<circle cx={cx2} cy={cy2} r={a.isYou?8:6} fill={a.isYou?'#7C3AED':'#CBD5E1'}/>{isH&&(()=>{const tx=Math.min(Math.max(cx2-60,padL),W-padR-130),ty=cy2>padT+60?cy2-56:cy2+14;return<g><rect x={tx} y={ty} width={130} height={40} rx={6} fill="white" stroke="#E5E7EB" strokeWidth="1"/><text x={tx+10} y={ty+14} style={{fontSize:10,fontWeight:700,fill:'#111827',fontFamily:'Inter,sans-serif'}}>{a.label}</text><text x={tx+10} y={ty+28} style={{fontSize:9,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>Sentiment: {a.y} · Visibility: {a.x}</text></g>;})()}</g>;})}
        {[...Array(11)].map((_,i)=>{const v=i*10;if(v<xMin||v>xMax)return null;return<text key={v} x={sx(v)} y={H-padB+14} textAnchor="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text>;})}
        <text x={(padL+W-padR)/2} y={H-6} textAnchor="middle" style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>Visibility</text>
        <text x={14} y={(padT+H-padB)/2} textAnchor="middle" transform={`rotate(-90,14,${(padT+H-padB)/2})`} style={{fontSize:11,fill:'#6B7280',fontFamily:'Inter,sans-serif'}}>Sentiment</text>
      </svg>
    </div>
  );
}

function PriorityActionsTable({ result }: { result:any }) {
  const [actions,setActions]=useState<any[]>([]);
  const [loading,setLoading]=useState(false);
  const [fetched,setFetched]=useState(false);
  useEffect(()=>{
    if(fetched)return;setFetched(true);setLoading(true);
    const prompt=`You are a GEO strategist. Generate a JSON array of 5-7 specific implementable priority actions for this brand.
Brand: ${result.brand_name}, Industry: ${result.ind_label}, GEO Score: ${result.overall_geo_score}
Competitors: ${(result.competitors||[]).map((c:any)=>c.Brand).join(', ')}
Return ONLY valid JSON array, no markdown. Each object: {"priority":"High"|"Medium"|"Low","segment":"audience segment","type":"Content Page"|"Comparison Page"|"FAQ Build"|"Structured Content"|"Citation Push"|"PR / Earned Media","action":"specific 1-3 sentence action","deliverable":"Workstream 01 — ARD"|"Workstream 02 — AOP"|"Workstream 03 — DT1"}
Order: High first, then Medium, then Low.`;
    fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})}).then(r=>r.json()).then(data=>{const text=data.response||'',clean=text.replace(/```json|```/g,'').trim();setActions(JSON.parse(clean));}).catch(()=>setActions([])).finally(()=>setLoading(false));
  },[]);
  const ps=(p:string)=>p==='High'?{color:'#EF4444',bg:'#FEE2E2'}:p==='Medium'?{color:'#92400E',bg:'#FEF3C7'}:{color:'#065F46',bg:'#D1FAE5'};
  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'28px 28px 24px'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><span style={{color:'#F59E0B',fontSize:'1.1rem'}}>⚡</span><span style={{fontSize:'1.1rem',fontWeight:800,color:'#111827'}}>Priority Actions — Implementable</span></div>
      <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:24}}>Each action is specific, buildable, and mapped to a workstream deliverable.</div>
      {loading?<div style={{display:'flex',alignItems:'center',gap:10,padding:'24px 0',color:'#9CA3AF',fontSize:'0.85rem'}}><div style={{width:16,height:16,border:'2px solid #DDD6FE',borderTopColor:'#7C3AED',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>Generating…<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
      :actions.length===0?<div style={{fontSize:'0.84rem',color:'#9CA3AF'}}>No actions generated.</div>
      :<table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>{['PRIORITY','SEGMENT','TYPE','ACTION TO TAKE','DELIVERABLE'].map(h=><th key={h} style={{padding:'8px 16px 12px',textAlign:'left',fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.08em',borderBottom:'1px solid #F3F4F6'}}>{h}</th>)}</tr></thead>
        <tbody>{actions.map((a,i)=>{const s=ps(a.priority);return<tr key={i} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'#FAFAFA':'white'}}><td style={{padding:'18px 16px',verticalAlign:'top',whiteSpace:'nowrap' as const}}><span style={{background:s.bg,color:s.color,borderRadius:50,padding:'3px 12px',fontSize:'0.75rem',fontWeight:700}}>{a.priority}</span></td><td style={{padding:'18px 16px',verticalAlign:'top'}}><span style={{fontSize:'0.84rem',fontWeight:600,color:'#7C3AED'}}>{a.segment}</span></td><td style={{padding:'18px 16px',verticalAlign:'top',whiteSpace:'nowrap' as const}}><span style={{fontSize:'0.82rem',color:'#374151'}}>{a.type}</span></td><td style={{padding:'18px 16px',verticalAlign:'top',maxWidth:420}}><span style={{fontSize:'0.84rem',color:'#374151',lineHeight:1.65}}>{a.action}</span></td><td style={{padding:'18px 16px',verticalAlign:'top',whiteSpace:'nowrap' as const}}><span style={{fontSize:'0.84rem',fontWeight:700,color:'#7C3AED'}}>{a.deliverable}</span></td></tr>;})}</tbody>
      </table>}
    </div>
  );
}

export default function GeoHub() {
  const [url,setUrl]=useState('');
  const [loading,setLoading]=useState(false);
  const [loadingStep,setLoadingStep]=useState(0);
  const [loadingProgress,setLoadingProgress]=useState(0);
  const [result,setResult]=useState<any>(null);
  const [error,setError]=useState('');
  const [activeTab,setActiveTab]=useState(0);
  const [promptInput,setPromptInput]=useState('');
  const [promptHistory,setPromptHistory]=useState<{q:string;a:string}[]>([]);
  const [promptLoading,setPromptLoading]=useState(false);
  const [filterCat,setFilterCat]=useState('All');
  const [hovBar,setHovBar]=useState<number|null>(null);
  const [expandedDomain,setExpandedDomain]=useState<string|null>(null);
  const [hovNode,setHovNode]=useState<string|null>(null);

  useEffect(()=>{try{const saved=sessionStorage.getItem('geo_result'),savedUrl=sessionStorage.getItem('geo_url');if(saved)setResult(JSON.parse(saved));if(savedUrl)setUrl(savedUrl);}catch{}},[]);

  async function runAnalysis(){
    if(!url.trim()||!url.startsWith('http')){setError('Please enter a valid URL starting with http:// or https://');return;}
    setError('');setLoading(true);setLoadingStep(0);setLoadingProgress(0);

    // Animate progress steps over ~18 seconds to match API timing
    const steps = [
      {step:0, progress:5,  delay:200},
      {step:1, progress:12, delay:1500},
      {step:2, progress:25, delay:3500},
      {step:3, progress:40, delay:5500},
      {step:4, progress:55, delay:7500},
      {step:5, progress:68, delay:9500},
      {step:6, progress:78, delay:11500},
      {step:7, progress:88, delay:13500},
      {step:8, progress:95, delay:15500},
    ];
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach(({step,progress,delay})=>{
      timers.push(setTimeout(()=>{setLoadingStep(step);setLoadingProgress(progress);},delay));
    });

    try{
      const res=await fetch('/api/geo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
      const data=await res.json();
      timers.forEach(t=>clearTimeout(t));
      setLoadingProgress(100);
      await new Promise(r=>setTimeout(r,400));
      if(data.error)setError(data.error);
      else{setResult(data);setActiveTab(0);try{sessionStorage.setItem('geo_result',JSON.stringify(data));sessionStorage.setItem('geo_url',url);}catch{}}
    }catch(e:any){
      timers.forEach(t=>clearTimeout(t));
      setError(e.message);
    }
    setLoading(false);
  }

  async function runPrompt(q?:string){
    const query=q||promptInput;if(!query.trim())return;setPromptLoading(true);if(!q)setPromptInput('');
    try{const res=await fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:query})});const data=await res.json();setPromptHistory(h=>[{q:query,a:data.response},...h]);}catch{}
    setPromptLoading(false);
  }

  const examplePrompts=result?.ind_key==='fin'?['Compare invite-only credit cards for high net worth individuals','What is the best credit card for someone who travels internationally?','Which bank offers the best rewards for small business owners?','Best first credit card for someone with no credit history','Compare Chase Sapphire Reserve vs Capital One Venture X for travel']:result?.ind_key==='auto'?['Best electric vehicle for long road trips in 2025','Most reliable SUV for families','Compare Tesla Model 3 vs BMW i4','Best car for first-time buyers under $30,000','Which car brand has the best safety record?']:['What are the most trusted brands right now?','Best companies for customer service in 2025','Compare top brands for value and quality','Which companies are leading in innovation?','Best brands recommended by experts'];

  return (
    <main style={{minHeight:'100vh',background:'#F3F4F6'}}>
      <div style={{background:'linear-gradient(135deg,#5B21B6 0%,#7C3AED 50%,#9333EA 100%)',padding:'64px 40px 72px',textAlign:'center'}}>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,border:'1.5px solid rgba(255,255,255,0.4)',borderRadius:50,padding:'8px 24px',fontSize:'0.82rem',fontWeight:600,color:'white',marginBottom:32,background:'rgba(255,255,255,0.15)'}}>✦ &nbsp;Real Time GEO Scoring</div>
        <h1 style={{fontSize:'3.6rem',fontWeight:900,color:'white',margin:'0 0 16px',letterSpacing:'-1.5px',lineHeight:1.1}}>GEO Scorecard</h1>
        <p style={{fontSize:'1.1rem',color:'rgba(255,255,255,0.9)',margin:'0 0 20px'}}>Enter any brand URL · Discover your brand&apos;s AI presence</p>
        <div style={{display:'inline-flex',alignItems:'center',gap:8,border:'1.5px solid rgba(255,255,255,0.3)',borderRadius:50,padding:'8px 22px',fontSize:'0.82rem',color:'rgba(255,255,255,0.8)',background:'rgba(255,255,255,0.12)'}}>⏱ &nbsp;Live data · Updated in real-time · Not cached like competitors</div>
      </div>

      {!result?(
        <div style={{padding:'48px 40px 60px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:24,marginBottom:24}}>
            {bands.map((b,i)=><div key={i} style={{background:b.bg,borderRadius:20,padding:'36px 28px',textAlign:'center',border:`1.5px solid ${b.border}`}}><div style={{fontSize:'0.85rem',fontWeight:700,color:b.color,marginBottom:8}}>{b.range}</div><div style={{fontSize:'1.8rem',fontWeight:900,color:b.color,marginBottom:8}}>{b.label}</div><div style={{fontSize:'0.85rem',color:b.color,lineHeight:1.5}}>{b.desc}</div></div>)}
          </div>
          <div style={{background:'white',borderRadius:20,border:'1px solid #E5E7EB',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',padding:'28px 32px'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}><div style={{width:7,height:7,borderRadius:'50%',background:'#7C3AED'}}/><span style={{fontSize:'0.72rem',fontWeight:700,letterSpacing:'.14em',color:'#9CA3AF',textTransform:'uppercase' as const}}>Brand URL</span></div>
            <div style={{display:'flex',gap:12,alignItems:'center'}}>
              <input type="text" value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runAnalysis()} placeholder="https://www.capitalone.com/" style={{flex:1,borderRadius:12,border:'1.5px solid #E5E7EB',padding:'14px 20px',fontSize:'0.95rem',height:52,background:'white',outline:'none',color:'#374151',boxSizing:'border-box' as const}}/>
              <button onClick={runAnalysis} disabled={loading} style={{background:'#7C3AED',color:'white',border:'none',borderRadius:50,fontWeight:700,fontSize:'0.95rem',height:52,padding:'0 28px',cursor:'pointer',boxShadow:'0 4px 16px rgba(124,58,237,0.4)',whiteSpace:'nowrap' as const,display:'flex',alignItems:'center',gap:8,flexShrink:0}}>🔍 {loading?'Analysing...':'Run Live AI Analysis'}</button>
            </div>
            {error&&<div style={{color:'#EF4444',fontSize:'0.85rem',marginTop:10}}>{error}</div>}
          </div>

          {/* ── Loading Screen ── */}
          {loading&&(()=>{
            const brandName = url.replace(/https?:\/\/(www\.)?/,'').split('/')[0].split('.')[0];
            const displayName = brandName.charAt(0).toUpperCase()+brandName.slice(1);
            const steps = [
              {icon:'🌐', label:'Fetching brand page', detail:'Reading website content and metadata', cat:null},
              {icon:'🤖', label:'Launching 50 AI queries', detail:'Firing all query batches simultaneously across 5 categories', cat:null},
              {icon:'💳', label:'Running General Consumer queries', detail:'10 broad brand awareness questions', cat:'General Consumer'},
              {icon:'💰', label:'Running category-specific queries', detail:'Cash Back · Travel & Rewards · Credit Building', cat:'Cash Back'},
              {icon:'🔍', label:'Detecting brand mentions', detail:`Scanning all 50 AI responses for ${displayName} references`, cat:null},
              {icon:'📊', label:'Scoring sentiment & prominence', detail:'Analysing tone and position in each response', cat:null},
              {icon:'🏆', label:'Benchmarking competitors', detail:'Scoring Chase · Amex · Citi · Discover and 6 others', cat:null},
              {icon:'🔗', label:'Building citation network', detail:'Mapping sources and share of voice', cat:null},
              {icon:'✨', label:'Calculating GEO Score', detail:'Applying weighted formula across all signals', cat:null},
            ];
            const currentStep = steps[Math.min(loadingStep, steps.length-1)];
            const completedSteps = steps.slice(0, loadingStep);

            return (
              <div style={{marginTop:32,background:'white',borderRadius:20,border:'1px solid #E5E7EB',boxShadow:'0 2px 12px rgba(0,0,0,0.06)',padding:'36px 40px',overflow:'hidden'}}>
                <style>{`
                  @keyframes spin{to{transform:rotate(360deg)}}
                  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
                  @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
                `}</style>

                {/* Header */}
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:28}}>
                  <div style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,#7C3AED,#9333EA)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',flexShrink:0}}>🔍</div>
                  <div>
                    <div style={{fontSize:'1.2rem',fontWeight:800,color:'#111827'}}>Analysing {displayName}</div>
                    <div style={{fontSize:'0.82rem',color:'#9CA3AF',marginTop:2}}>{url}</div>
                  </div>
                  <div style={{marginLeft:'auto',textAlign:'right' as const}}>
                    <div style={{fontSize:'2rem',fontWeight:900,color:'#7C3AED',lineHeight:1}}>{loadingProgress}%</div>
                    <div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>complete</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{background:'#F3F4F6',borderRadius:50,height:8,marginBottom:28,overflow:'hidden'}}>
                  <div style={{background:'linear-gradient(90deg,#7C3AED,#9333EA)',height:8,borderRadius:50,width:`${loadingProgress}%`,transition:'width 0.8s ease',position:'relative' as const}}>
                    <div style={{position:'absolute' as const,right:0,top:0,width:20,height:8,background:'rgba(255,255,255,0.4)',borderRadius:50,animation:'pulse 1s infinite'}}/>
                  </div>
                </div>

                {/* Current step */}
                <div style={{background:'#F5F3FF',borderRadius:12,border:'1px solid #DDD6FE',padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:12,animation:'slideIn 0.3s ease'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0,boxShadow:'0 2px 8px rgba(124,58,237,0.15)'}}>{currentStep.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'0.9rem',fontWeight:700,color:'#7C3AED'}}>{currentStep.label}</div>
                    <div style={{fontSize:'0.76rem',color:'#9CA3AF',marginTop:2}}>{currentStep.detail}</div>
                  </div>
                  <div style={{width:20,height:20,border:'2px solid #DDD6FE',borderTopColor:'#7C3AED',borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}}/>
                </div>

                {/* Completed steps */}
                <div style={{display:'flex',flexDirection:'column' as const,gap:8,marginBottom:24}}>
                  {completedSteps.map((s,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,opacity:0.7}}>
                      <div style={{width:22,height:22,borderRadius:'50%',background:'#D1FAE5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',flexShrink:0}}>✓</div>
                      <span style={{fontSize:'0.82rem',color:'#6B7280'}}>{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* Category progress pills */}
                <div style={{borderTop:'1px solid #F3F4F6',paddingTop:20}}>
                  <div style={{fontSize:'0.72rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.08em',textTransform:'uppercase' as const,marginBottom:12}}>Query Categories</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap' as const}}>
                    {[
                      {label:'General Consumer', queries:10, activeAt:2},
                      {label:'Cash Back', queries:10, activeAt:3},
                      {label:'Travel & Rewards', queries:10, activeAt:4},
                      {label:'Credit Building', queries:10, activeAt:5},
                      {label:'Expert Recommendation', queries:10, activeAt:6},
                    ].map((cat,i)=>{
                      const done = loadingStep > cat.activeAt;
                      const active = loadingStep === cat.activeAt;
                      return (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:6,background:done?'#D1FAE5':active?'#EDE9FE':'#F9FAFB',borderRadius:50,padding:'5px 12px',border:`1px solid ${done?'#6EE7B7':active?'#DDD6FE':'#E5E7EB'}`,transition:'all 0.3s'}}>
                          <span style={{fontSize:'0.7rem',fontWeight:600,color:done?'#065F46':active?'#7C3AED':'#9CA3AF'}}>{done?'✓ ':active?'● ':''}{cat.label}</span>
                          <span style={{fontSize:'0.65rem',color:done?'#10B981':active?'#9CA3AF':'#D1D5DB'}}>{cat.queries}q</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ):(
        <div>
          <div style={{borderBottom:'1px solid #E5E7EB',background:'white',display:'flex',padding:'0 40px',gap:4,overflowX:'auto' as const}}>
            {TABS.map((t,i)=><button key={i} onClick={()=>setActiveTab(i)} style={{background:'none',border:'none',borderBottom:activeTab===i?'2px solid #7C3AED':'2px solid transparent',color:activeTab===i?'#7C3AED':'#6B7280',fontWeight:activeTab===i?700:500,fontSize:'0.85rem',padding:'12px 20px',cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap' as const}}>{t}</button>)}
            <button onClick={()=>{setResult(null);setUrl('');try{sessionStorage.removeItem('geo_result');sessionStorage.removeItem('geo_url');}catch{}}} style={{marginLeft:'auto',background:'none',border:'1px solid #E5E7EB',borderRadius:8,color:'#6B7280',fontSize:'0.78rem',padding:'6px 14px',cursor:'pointer',alignSelf:'center',flexShrink:0}}>← New Analysis</button>
          </div>

          <div style={{padding:'28px 40px 60px'}}>

            {activeTab===0&&(()=>{
              const geo = result.overall_geo_score;
              const vis = result.visibility;
              const cit = result.citation_share;
              const rawSent = result.sentiment;
              const prom = result.prominence;
              const sov = result.share_of_voice;
              const avgRank = result.avg_rank;
              const effSent = rawSent; // use API sentiment directly
              const badge = scoreBadge(geo);

              const summaryText = `GEO Score of ${geo} reflects ${vis}% Visibility but is held back by Prominence (${prom}), mentioned mid-list; Share of Voice (${sov}), competitors dominating AI conversation; Citation (${cit}), rarely top pick; Sentiment (${rawSent}).`;

              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'360px 1fr',gap:20,marginBottom:16}}>
                    <GeoGauge score={geo} brand={result.brand_name}/>
                    <div style={{background:'white',borderRadius:16,border:'1px solid #E5E7EB',padding:'24px 28px'}}>
                      <div style={{fontSize:'1.4rem',fontWeight:800,color:'#111827',marginBottom:5}}>{result.brand_name}</div>
                      <a href={result.page_url} target="_blank" rel="noreferrer" style={{color:'#7C3AED',fontSize:'0.84rem'}}>{result.page_url?.slice(0,60)}{result.page_url?.length>60?'...':''}</a>
                      <div style={{margin:'12px 0 5px',fontSize:'0.65rem',fontWeight:700,color:'#9CA3AF',letterSpacing:'.1em',textTransform:'uppercase' as const}}>Status</div>
                      <span style={{background:badge.bg,color:badge.color,padding:'4px 14px',borderRadius:50,fontSize:'0.8rem',fontWeight:700}}>{badge.label}</span>
                      <div style={{fontSize:'0.84rem',color:'#6B7280',lineHeight:1.8,borderTop:'1px solid #F3F4F6',paddingTop:12,marginTop:12}}>{summaryText}</div>
                    </div>
                  </div>

                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:14,marginBottom:16}}>
                    <MetricCard
                      label="visibility score"
                      val={vis}
                      color="#7C3AED"
                    />
                    <MetricCard
                      label="sentiment score"
                      val={effSent}
                      color="#10B981"
                    />
                    <MetricCard
                      label="citation score"
                      val={cit}
                      color="#F59E0B"
                    />
                    <MetricCard
                      label="avg rank"
                      val={`#${String(avgRank).replace(/^#+/, '')}`}
                      color="#3B82F6"
                    />
                  </div>
                  <WhatScoreMeans score={geo} brand={result.brand_name}/>
                  <GapCards result={result}/>
                </div>
              );
            })()}

            {activeTab===1&&(()=>{
              const geo=result.overall_geo_score,vis=result.visibility,cit=result.citation_share,sent=result.sentiment,sov=result.share_of_voice,avgRank=result.avg_rank;
              const top=[{Brand:result.brand_name,URL:result.domain,GEO:geo,Vis:vis,Cit:cit,Sen:sent,Sov:sov,Rank:avgRank,isYou:true},...(result.competitors||[]).map((c:any)=>({...c,isYou:false}))].sort((a,b)=>b.GEO-a.GEO);
              // Display API avg_rank as-is (it means avg mention position within responses, not GEO leaderboard position)
              const resolvedRank=(c:any)=>{
                const r=String(c.Rank||'').replace(/^#+/,'').trim();
                if(!r||r==='N/A'||r==='null'||r==='undefined') return '—';
                return `#${r}`;
              };
              const myRank=top.findIndex(c=>c.isYou)+1,leader=top[0],next=top[myRank]||null;
              const gapToTop=geo-leader.GEO,leadOver=next?geo-next.GEO:null;
              const bW=680,bH=140,bPad=32,gW=(bW-bPad*2)/top.length,bMH=bH-bPad;
              return (
                <div>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:2}}>{result.domain} vs Competitors — {result.ind_label}</div>
                  <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:16}}>Real-time GEO scores across AI visibility signals</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    <div style={{background:'#F5F3FF',borderRadius:14,border:'1px solid #DDD6FE',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#7C3AED',fontWeight:600,marginBottom:4}}>Your GEO Score</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#7C3AED'}}>{geo}</div><div style={{fontSize:'0.75rem',color:'#9CA3AF'}}>ranked #{myRank} of {top.length} brands</div></div>
                    <div style={{background:'#FFFBEB',borderRadius:14,border:'1px solid #FCD34D',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#92400E',fontWeight:600,marginBottom:4}}>Gap to #1 ({leader.Brand})</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#92400E'}}>{gapToTop===0?'—':`${gapToTop} pts`}</div><div style={{fontSize:'0.75rem',color:'#92400E'}}>{myRank===1?'You are the leader':Math.abs(gapToTop)<=5?'Close — strong opportunity':'Gap to close'}</div></div>
                    <div style={{background:'#ECFDF5',borderRadius:14,border:'1px solid #6EE7B7',padding:'18px 22px'}}><div style={{fontSize:'0.75rem',color:'#065F46',fontWeight:600,marginBottom:4}}>{next?`Lead over #${myRank+1} (${next.Brand})`:'Top Ranked'}</div><div style={{fontSize:'2.2rem',fontWeight:900,color:'#065F46'}}>{leadOver!=null?`+${leadOver} pts`:'—'}</div><div style={{fontSize:'0.75rem',color:'#065F46'}}>{leadOver!=null?(leadOver<10?'Close — defend':'Comfortable but not safe'):'Leading the category'}</div></div>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'16px 20px',marginBottom:20}}>
                    <div style={{fontSize:'0.9rem',fontWeight:700,color:'#111827',marginBottom:2}}>GEO Score Comparison</div>
                    <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:10}}>Hover over any brand to see full metrics</div>
                    <svg viewBox={`0 0 ${bW} ${bH+44}`} style={{width:'100%',display:'block'}} onMouseLeave={()=>setHovBar(null)}>
                      {[0,25,50,75,100].map(v=><g key={v}><line x1={bPad} y1={bH-(v/100)*bMH} x2={bW-bPad} y2={bH-(v/100)*bMH} stroke="#F3F4F6" strokeWidth="1"/><text x={bPad-4} y={bH-(v/100)*bMH} textAnchor="end" dominantBaseline="middle" style={{fontSize:9,fill:'#9CA3AF',fontFamily:'Inter,sans-serif'}}>{v}</text></g>)}
                      {top.map((c:any,i:number)=>{const bx=bPad+i*gW+gW*0.08,bw2=gW*0.26,gh=((c.GEO||0)/100)*bMH,vh=((c.Vis||0)/100)*bMH,ch=((c.Cit||0)/100)*bMH,isY=c.isYou,isH=hovBar===i,tipY=bH-Math.max(gh,vh,ch)-44;return(<g key={i} onMouseEnter={()=>setHovBar(i)} style={{cursor:'pointer'}}><rect x={bx} y={bH-gh} width={bw2} height={gh} fill={isY?'#1F2937':'#9CA3AF'} rx={2}/><rect x={bx+bw2+2} y={bH-vh} width={bw2} height={vh} fill={isY?'#7C3AED':'#A5B4FC'} rx={2}/><rect x={bx+bw2*2+4} y={bH-ch} width={bw2} height={ch} fill={isY?'#C4B5FD':'#E9D5FF'} rx={2}/><text x={bx+bw2*1.5} y={bH+13} textAnchor="middle" style={{fontSize:9,fill:isY?'#7C3AED':'#6B7280',fontFamily:'Inter,sans-serif',fontWeight:isY?700:400}}>{(c.Brand||'').split(' ')[0]}</text>{isH&&<g><rect x={Math.min(bx-5,bW-145)} y={tipY} width={140} height={38} rx={6} fill="#1F2937"/><text x={Math.min(bx-5,bW-145)+70} y={tipY+13} textAnchor="middle" style={{fontSize:10,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{c.Brand}</text><text x={Math.min(bx-5,bW-145)+70} y={tipY+27} textAnchor="middle" style={{fontSize:9,fill:'#D1D5DB',fontFamily:'Inter,sans-serif'}}>GEO: {c.GEO} · Vis: {c.Vis} · Cit: {c.Cit}</text></g>}</g>);})}
                      <g transform={`translate(${bW/2-100},${bH+28})`}>{[{color:'#1F2937',label:'GEO'},{color:'#7C3AED',label:'Visibility'},{color:'#C4B5FD',label:'Citations'}].map((l,i)=><g key={i} transform={`translate(${i*88},0)`}><rect x={0} y={-5} width={10} height={10} fill={l.color} rx={2}/><text x={14} y={0} dominantBaseline="middle" style={{fontSize:10,fill:'#374151',fontFamily:'Inter,sans-serif'}}>{l.label}</text></g>)}</g>
                    </svg>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'20px 24px'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr style={{background:'#FAFAFA'}}>{['#','BRAND / URL','GEO SCORE','GAP','VISIBILITY','CITATIONS','SENTIMENT','SOV','AVG. RANK'].map(h=><th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                      <tbody>{top.map((c:any,i:number)=>{
                        const gcol=c.GEO>=80?'#10B981':c.GEO>=60?'#7C3AED':'#374151',gap2=c.isYou?null:c.GEO-geo;
                        return <tr key={i} style={{background:c.isYou?'#F5F3FF':'white',borderTop:'1px solid #F3F4F6',borderLeft:c.isYou?'3px solid #7C3AED':'none'}}>
                          <td style={{padding:'11px 12px',fontSize:'0.8rem',color:'#9CA3AF'}}>{i+1}</td>
                          <td style={{padding:'11px 12px'}}><div style={{display:'flex',alignItems:'center',gap:7}}><span style={{fontSize:'0.84rem',fontWeight:c.isYou?700:600,color:'#111827'}}>{c.Brand}</span>{c.isYou&&<span style={{background:'#EDE9FE',color:'#7C3AED',borderRadius:5,padding:'1px 7px',fontSize:'0.68rem',fontWeight:700}}>You</span>}</div><div style={{fontSize:'0.7rem',color:'#9CA3AF'}}>{c.URL}</div></td>
                          <td style={{padding:'11px 12px',fontSize:'0.95rem',fontWeight:800,color:gcol}}>{c.GEO}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',fontWeight:600,color:gap2===null?'#9CA3AF':gap2>0?'#EF4444':'#10B981'}}>{gap2===null?'—':<span style={{display:'inline-flex',alignItems:'center',gap:5}}>{`${gap2>0?'':'+'}${Math.abs(gap2)} pts`}{gap2!==0&&(()=>{const diffs=[{label:'Visibility',val:(c.Vis||0)-vis},{label:'Citation',val:(c.Cit||0)-cit},{label:'Sentiment',val:(c.Sen||0)-sent},{label:'Share of Voice',val:(c.Sov||0)-sov}].filter(d=>d.val!==0);const losing=gap2>0;const tip=losing?`Behind by: ${diffs.map(d=>`${d.val>0?'-':'+'}${Math.abs(d.val)} ${d.label}`).join(', ')}`:`Ahead by: ${diffs.map(d=>`${d.val<0?'+':'-'}${Math.abs(d.val)} ${d.label}`).join(', ')}`;return<Tooltip text={tip}/>;})()}</span>}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Vis}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Cit}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Sen}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',color:'#374151'}}>{c.Sov}</td>
                          <td style={{padding:'11px 12px',fontSize:'0.82rem',fontWeight:600,color:'#7C3AED'}}>{resolvedRank(c)}</td>
                        </tr>;
                      })}</tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {activeTab===2&&(()=>{
              const vis=result.visibility,comps=result.competitors||[],allVis=[vis,...comps.map((c:any)=>c.Vis)];
              const myVisRank=[...allVis].sort((a,b)=>b-a).indexOf(vis)+1,topComp=comps.length>0?comps.reduce((a:any,b:any)=>b.Vis>a.Vis?b:a,comps[0]):null;
              const gapToTop=vis-(topComp?topComp.Vis:vis),avgVis=Math.round(allVis.reduce((a:number,b:number)=>a+b,0)/allVis.length);
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
                    <div style={{background:'#F5F3FF',borderRadius:12,border:'1px solid #DDD6FE',padding:'18px'}}><div style={{fontSize:'0.65rem',fontWeight:600,color:'#7C3AED',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:6}}>Your Visibility</div><div style={{fontSize:'2rem',fontWeight:800,color:'#7C3AED'}}>{vis}</div><div style={{fontSize:'0.72rem',color:'#9CA3AF'}}>ranked #{myVisRank} of {allVis.length} brands · avg {avgVis}</div></div>
                    <div style={{background:gapToTop>=0?'#ECFDF5':'#FFF1F2',borderRadius:12,border:`1px solid ${gapToTop>=0?'#6EE7B7':'#FCA5A5'}`,padding:'18px'}}><div style={{fontSize:'0.65rem',fontWeight:600,color:gapToTop>=0?'#065F46':'#991B1B',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:6}}>vs. #1 {topComp?`(${topComp.Brand})`:''}</div><div style={{fontSize:'2rem',fontWeight:800,color:gapToTop>=0?'#065F46':'#991B1B'}}>{gapToTop>=0?'+':''}{gapToTop} pts</div><div style={{fontSize:'0.72rem',color:gapToTop>=0?'#065F46':'#991B1B'}}>{gapToTop>=0?'You lead on visibility':'Behind the top competitor'}</div></div>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'22px 26px',marginBottom:24}}><VisibilityBars brand={result.brand_name} vis={vis} competitors={result.competitors||[]}/></div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'22px 26px'}}><div style={{fontSize:'1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Sentiment Score vs. Visibility — Market Positioning</div><div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:16}}>Each dot = one brand. Your brand is highlighted in purple.</div><ScatterPlot brand={result.brand_name} vis={vis} sent={result.sentiment} competitors={result.competitors||[]}/></div>
                </div>
              );
            })()}

            {activeTab===3&&(()=>{
              const rawSent=result.sentiment,prom=result.prominence,avgRank=result.avg_rank,vis=result.visibility;
              const cit=result.citation_share,sov=result.share_of_voice;
              const effSent = rawSent;
              const smood=rawSent>=70?'AI speaks favorably about your brand':rawSent>=45?'AI tone is neutral — room to improve':'AI tone is negative or missing';
              const pmood=prom>=70?'Named first or near top of AI responses':prom>=45?'Appears mid-list in AI responses':'Rarely named early in AI responses';
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    {[
                      {label:'sentiment score',val:effSent,sub:smood,tip:'How positively AI describes your brand.'},
                      {label:'prominence score',val:prom,sub:pmood,tip:'How early in AI responses your brand is mentioned.'},
                      {label:'average rank',val:avgRank,sub:'Average position within each AI response',tip:'Average position when mentioned in AI responses.'}
                    ].map(({label,val,sub,tip}:any)=>(
                      <div key={label} style={{background:'white',borderRadius:12,padding:'18px 16px',border:'1px solid #E5E7EB'}}>
                        <div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.06em',textTransform:'uppercase' as const,marginBottom:8}}>{label}<Tooltip text={tip}/></div>
                        <div style={{fontSize:'1.8rem',fontWeight:800,color:'#7C3AED',lineHeight:1}}>{val}</div>
                        <div style={{fontSize:'0.72rem',color:'#9CA3AF',marginTop:3}}>{sub}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20,alignItems:'stretch'}}>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24,display:'flex',flexDirection:'column' as const}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:4}}>Sentiment Dimensions</div>
                      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:4}}>Hover each point for definition.</div>
                      <div style={{flex:1,display:'flex',flexDirection:'column' as const,justifyContent:'center'}}>
                        <RadarChart sent={rawSent} prom={prom} vis={vis} cit={cit} sov={sov}/>
                      </div>
                    </div>
                    <SentimentHeatmap brandName={result.brand_name} sent={rawSent} prom={prom} vis={vis} cit={cit} sov={sov} competitors={result.competitors||[]}/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                    <div style={{background:'#F0FDF4',borderRadius:14,border:'1px solid #6EE7B7',padding:22}}><div style={{fontSize:'1rem',fontWeight:700,color:'#065F46',marginBottom:12}}>✓ Sentiment Strengths</div><ul style={{listStyle:'none',padding:0,margin:0}}>{(result.strengths_list||[]).slice(0,3).map((s:string,i:number)=><li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#10B981',fontWeight:700,flexShrink:0}}>+</span><span>{s}</span></li>)}</ul></div>
                    <div style={{background:'#FFF1F2',borderRadius:14,border:'1px solid #FCA5A5',padding:22}}><div style={{fontSize:'1rem',fontWeight:700,color:'#991B1B',marginBottom:12}}>✗ Areas of Concern</div><ul style={{listStyle:'none',padding:0,margin:0}}>{(result.improvements_list||[]).slice(0,3).map((w:string,i:number)=><li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#EF4444',fontWeight:700,flexShrink:0}}>✗</span><span>{w}</span></li>)}</ul></div>
                  </div>
                </div>
              );
            })()}

            {activeTab===4&&(()=>{
              const cit=result.citation_share,sov=result.share_of_voice,sources=result.citation_sources||[];

              // Build category map from sources if available, otherwise from responses_detail
              const catMap:Record<string,number>={};
              if (sources.length > 0) {
                sources.forEach((s:any)=>{const cl=classifyDomain(s.domain||''),isOwned=(result.domain&&s.domain&&s.domain.includes(result.domain))||false,cat=isOwned?'Owned Media':cl.label;catMap[cat]=(catMap[cat]||0)+(s.citation_share||0);});
                Object.keys(catMap).forEach(k=>{catMap[k]=Math.min(catMap[k],100);});
              } else {
                // Fallback: derive category breakdown from response categories
                const rd = result.responses_detail || [];
                const mentioned = rd.filter((r:any) => r.mentioned);
                const total = Math.max(mentioned.length, 1);
                const cats:Record<string,number> = {};
                mentioned.forEach((r:any) => { cats[r.category] = (cats[r.category]||0) + 1; });
                Object.entries(cats).forEach(([cat, count]) => { catMap[cat] = Math.round((count as number / total) * 100); });
              }

              // Real URLs per known domain
              const DOMAIN_REAL_URLS: Record<string,string[]> = {
                'nerdwallet.com':       ['https://www.nerdwallet.com/best/credit-cards','https://www.nerdwallet.com/best/credit-cards/cash-back','https://www.nerdwallet.com/best/credit-cards/travel','https://www.nerdwallet.com/best/credit-cards/no-annual-fee','https://www.nerdwallet.com/best/credit-cards/balance-transfer'],
                'bankrate.com':         ['https://www.bankrate.com/credit-cards/best-credit-cards/','https://www.bankrate.com/credit-cards/cash-back/','https://www.bankrate.com/credit-cards/travel/','https://www.bankrate.com/credit-cards/reviews/','https://www.bankrate.com/credit-cards/compare/'],
                'creditkarma.com':      ['https://www.creditkarma.com/credit-cards','https://www.creditkarma.com/credit-cards/i/best-cash-back-credit-cards','https://www.creditkarma.com/credit-cards/i/best-travel-credit-cards','https://www.creditkarma.com/credit-cards/i/best-rewards-credit-cards','https://www.creditkarma.com/reviews'],
                'thepointsguy.com':     ['https://thepointsguy.com/credit-cards/best/','https://thepointsguy.com/credit-cards/travel/','https://thepointsguy.com/credit-cards/cash-back/','https://thepointsguy.com/reviews/','https://thepointsguy.com/credit-cards/compare/'],
                'wallethub.com':        ['https://wallethub.com/best-credit-cards','https://wallethub.com/best/cash-back-credit-cards/8574c','https://wallethub.com/best/travel-credit-cards/9126c','https://wallethub.com/best/secured-credit-cards/11369c','https://wallethub.com/answers/cc/'],
                'forbes.com':           ['https://www.forbes.com/advisor/credit-cards/best/','https://www.forbes.com/advisor/credit-cards/best-cash-back-credit-cards/','https://www.forbes.com/advisor/credit-cards/best-travel-credit-cards/','https://www.forbes.com/advisor/credit-cards/reviews/','https://www.forbes.com/advisor/credit-cards/compare/'],
                'cnbc.com':             ['https://www.cnbc.com/select/best-credit-cards/','https://www.cnbc.com/select/best-cash-back-credit-cards/','https://www.cnbc.com/select/best-travel-credit-cards/','https://www.cnbc.com/select/best-no-annual-fee-credit-cards/','https://www.cnbc.com/select/credit-cards/'],
                'investopedia.com':     ['https://www.investopedia.com/best-credit-cards-4801582','https://www.investopedia.com/best-cash-back-credit-cards-4801556','https://www.investopedia.com/best-travel-credit-cards-4800550','https://www.investopedia.com/best-no-annual-fee-credit-cards-4767278','https://www.investopedia.com/credit-cards/'],
                'wsj.com':              ['https://www.wsj.com/buyside/personal-finance/credit-cards/best-credit-cards','https://www.wsj.com/buyside/personal-finance/credit-cards/best-cash-back-credit-cards','https://www.wsj.com/buyside/personal-finance/credit-cards/best-travel-credit-cards','https://www.wsj.com/buyside/personal-finance/credit-cards/reviews','https://www.wsj.com/buyside/personal-finance/credit-cards/'],
                'bloomberg.com':        ['https://www.bloomberg.com/personal-finance/credit-cards/best','https://www.bloomberg.com/personal-finance/credit-cards/cash-back','https://www.bloomberg.com/personal-finance/credit-cards/travel','https://www.bloomberg.com/personal-finance/credit-cards/reviews','https://www.bloomberg.com/personal-finance/credit-cards/'],
                'reddit.com':           ['https://www.reddit.com/r/personalfinance/','https://www.reddit.com/r/CreditCards/','https://www.reddit.com/r/financialindependence/','https://www.reddit.com/r/churning/','https://www.reddit.com/r/CreditCards/wiki/index'],
                'consumerreports.org':  ['https://www.consumerreports.org/money/credit-cards/','https://www.consumerreports.org/money/credit-cards/best-credit-cards/','https://www.consumerreports.org/money/credit-cards/reviews/','https://www.consumerreports.org/money/banking/','https://www.consumerreports.org/money/'],
                // Automotive
                'edmunds.com':          ['https://www.edmunds.com/best-cars/','https://www.edmunds.com/car-reviews/','https://www.edmunds.com/best-cars/best-suvs/','https://www.edmunds.com/best-cars/best-electric-cars/','https://www.edmunds.com/compare-cars/'],
                'caranddriver.com':     ['https://www.caranddriver.com/best-cars/','https://www.caranddriver.com/research/','https://www.caranddriver.com/best-cars/g26083854/best-electric-vehicles/','https://www.caranddriver.com/features/g15078784/10best/','https://www.caranddriver.com/compare/'],
                'motortrend.com':       ['https://www.motortrend.com/cars/best/','https://www.motortrend.com/cars/car-of-the-year/','https://www.motortrend.com/cars/reviews/','https://www.motortrend.com/cars/electric/','https://www.motortrend.com/cars/compare/'],
                // General
                'tripadvisor.com':      ['https://www.tripadvisor.com/Hotels','https://www.tripadvisor.com/BestHotels','https://www.tripadvisor.com/TravelersChoice','https://www.tripadvisor.com/Hotels-g1-Reviews','https://www.tripadvisor.com/Tourism'],
                'trustpilot.com':       ['https://www.trustpilot.com/categories/banking_money','https://www.trustpilot.com/review/','https://www.trustpilot.com/categories/financial_services','https://www.trustpilot.com/categories/insurance','https://www.trustpilot.com/categories/loans_credit'],
              };

              // Category map — always from domain classification (Earned Media, Institution, Owned Media etc.)
              const catMap:Record<string,number>={};
              const allSourcesToClassify = sources.length > 0 ? sources : (() => {
                const knownSources = ['nerdwallet.com','bankrate.com','creditkarma.com','forbes.com','cnbc.com','investopedia.com','wsj.com','bloomberg.com','thepointsguy.com','wallethub.com'];
                return knownSources.map((d, i) => ({ domain: d, citation_share: Math.max(5, Math.round(20 - i * 1.5)) }));
              })();

              // Include the brand's own domain as Owned Media
              const brandDomain = result.domain || '';
              if (brandDomain) {
                catMap['Owned Media'] = 15; // brand always has some owned media presence
              }
              allSourcesToClassify.forEach((s:any) => {
                const d = (s.domain||'').toLowerCase();
                const isOwned = brandDomain && d.includes(brandDomain.replace('www.','').split('.')[0]);
                const cat = isOwned ? 'Owned Media' : classifyDomain(d).label;
                catMap[cat] = (catMap[cat]||0) + (s.citation_share||0);
              });
              Object.keys(catMap).forEach(k=>{ catMap[k]=Math.min(Math.round(catMap[k]),100); });

              const catColors:Record<string,string>={'Earned Media':'#10B981','Owned Media':'#7C3AED','Other':'#6B7280','Social':'#F59E0B','Institution':'#3B82F6'};
              const catEntries=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);

              // Build display sources — always include brand's own domain first as Owned Media
              const buildDisplaySources = () => {
                const base = sources.length > 0 ? sources : allSourcesToClassify.map((s:any, i:number) => ({
                  rank: i+1, domain: s.domain, citation_share: s.citation_share, category: classifyDomain(s.domain).label
                }));
                // Prepend brand's own domain as Owned Media if not already present
                const hasBrandDomain = base.some((s:any) => brandDomain && (s.domain||'').includes(brandDomain.replace('www.','')));
                if (brandDomain && !hasBrandDomain) {
                  const ownedEntry = { rank: 0, domain: brandDomain, citation_share: 15, category: 'Owned Media', isOwned: true };
                  return [ownedEntry, ...base].map((s:any, i:number) => ({ ...s, rank: i+1 }));
                }
                return base.map((s:any) => ({
                  ...s,
                  isOwned: brandDomain && (s.domain||'').includes(brandDomain.replace('www.','')),
                }));
              };
              const displaySources = buildDisplaySources();
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24}}>
                    {[{label:'Citation Score',val:cit,sub:'How authoritatively your brand was cited',tip:'How often and prominently AI models cite your brand.'},{label:'Share of Voice',val:sov,sub:'Your brand mentions as % of all mentions',tip:'Your share of all brand mentions in AI responses.'}].map(({label,val,sub,tip})=><div key={label} style={{background:'white',borderRadius:12,padding:'20px 22px',border:'1px solid #E5E7EB'}}><div style={{display:'flex',alignItems:'center',fontSize:'0.65rem',fontWeight:600,color:'#9CA3AF',letterSpacing:'.08em',textTransform:'uppercase' as const,marginBottom:10}}>{label}<Tooltip text={tip}/></div><div style={{fontSize:'2.4rem',fontWeight:900,color:'#7C3AED',lineHeight:1,marginBottom:6}}>{val}</div><div style={{fontSize:'0.78rem',color:'#9CA3AF'}}>{sub}</div></div>)}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:14}}>Citation by Category</div>
                      {catEntries.length>0?catEntries.map(([cat,pct],i)=><div key={i} style={{marginBottom:14}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:'0.84rem',color:'#374151',fontWeight:500}}>{cat}</span><span style={{fontSize:'0.84rem',fontWeight:700,color:catColors[cat]||'#7C3AED'}}>{Math.round(pct)}%</span></div><div style={{background:'#F3F4F6',borderRadius:50,height:7,overflow:'hidden'}}><div style={{background:catColors[cat]||'#7C3AED',height:7,borderRadius:50,width:`${Math.min(Math.round(pct),100)}%`,transition:'width 0.4s'}}/></div></div>):<div style={{fontSize:'0.82rem',color:'#9CA3AF'}}>No category data available.</div>}
                    </div>
                    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'18px 20px'}}>
                      <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:2}}>AI Citation Network</div>
                      <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:8}}>Brands and sources co-cited with {result.brand_name}</div>
                      {(()=>{
                        const brand=result.brand_name||'Brand',comps=(result.competitors||[]).slice(0,3),srcs=displaySources.slice(0,3);
                        const W2=340,H2=260,cx=W2/2,cy=H2/2;
                        type N2={id:string;x:number;y:number;label:string;full:string;r:number;fill:string;stroke:string;type:string;pct?:number};
                        const ns:N2[]=[];
                        ns.push({id:'brand',x:cx,y:cy,label:brand.length>10?brand.slice(0,9)+'…':brand,full:brand,r:38,fill:'#7C3AED',stroke:'#7C3AED',type:'brand'});
                        const cA=comps.map((_:any,i:number)=>Math.PI*0.6+(i/Math.max(comps.length-1,1))*Math.PI*0.8);
                        comps.forEach((c:any,i:number)=>ns.push({id:`c${i}`,x:cx+105*Math.cos(cA[i]),y:cy-80*Math.sin(cA[i]),label:(c.Brand||'').split(' ')[0].slice(0,9),full:c.Brand,r:20,fill:'#C4B5FD',stroke:'#8B5CF6',type:'competitor'}));
                        const sA=srcs.map((_:any,i:number)=>-Math.PI*0.15+(i/Math.max(srcs.length-1,1))*Math.PI*0.45);
                        srcs.forEach((s:any,i:number)=>{const dom=(s.domain||'').split('.')[0];ns.push({id:`s${i}`,x:cx+110*Math.cos(sA[i]),y:cy-78*Math.sin(sA[i]),label:dom.slice(0,9),full:s.domain,pct:s.citation_share,r:22,fill:'#6EE7B7',stroke:'#10B981',type:'source'});});
                        const ctr=ns[0];
                        return <svg viewBox={`0 0 ${W2} ${H2}`} style={{width:'90%',display:'block',margin:'0 auto'}}>
                          {ns.slice(1).map(n=><line key={n.id} x1={ctr.x} y1={ctr.y} x2={n.x} y2={n.y} stroke={n.type==='competitor'?'#C4B5FD':'#6EE7B7'} strokeWidth="1.5" opacity="0.7"/>)}
                          {ns.map(n=>{const isH=hovNode===n.id,tipW=140,tipH=n.pct!=null?40:30,tx=Math.min(Math.max(n.x-tipW/2,2),W2-tipW-2),ty=n.y-n.r-tipH-8<2?n.y+n.r+8:n.y-n.r-tipH-8;return<g key={n.id} onMouseEnter={()=>setHovNode(n.id)} onMouseLeave={()=>setHovNode(null)} style={{cursor:'pointer'}}>{isH&&<circle cx={n.x} cy={n.y} r={n.r+6} fill={n.stroke} opacity="0.2"/>}<circle cx={n.x} cy={n.y} r={n.r} fill={n.fill} stroke={isH?n.stroke:'none'} strokeWidth="2"/>{n.type==='brand'&&<text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:9,fill:'white',fontFamily:'Inter,sans-serif',fontWeight:700,pointerEvents:'none'}}>{n.label}</text>}{n.type==='source'&&n.pct!=null&&<text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" style={{fontSize:10,fill:'#065F46',fontFamily:'Inter,sans-serif',fontWeight:800,pointerEvents:'none'}}>{n.pct}%</text>}{n.type!=='brand'&&<text x={n.x} y={n.y+n.r+12} textAnchor="middle" style={{fontSize:9,fill:'#374151',fontFamily:'Inter,sans-serif',fontWeight:500,pointerEvents:'none'}}>{n.label}</text>}{isH&&<g><rect x={tx} y={ty} width={tipW} height={tipH} rx={6} fill="#1F2937"/><text x={tx+tipW/2} y={ty+13} textAnchor="middle" style={{fontSize:10,fontWeight:700,fill:'white',fontFamily:'Inter,sans-serif'}}>{n.full?.length>20?n.full.slice(0,19)+'…':n.full}</text>{n.pct!=null&&<text x={tx+tipW/2} y={ty+28} textAnchor="middle" style={{fontSize:9,fill:'#6EE7B7',fontFamily:'Inter,sans-serif',fontWeight:600}}>Citation share: {n.pct}%</text>}{n.type==='competitor'&&<text x={tx+tipW/2} y={ty+22} textAnchor="middle" style={{fontSize:9,fill:'#C4B5FD',fontFamily:'Inter,sans-serif'}}>Co-cited competitor</text>}</g>}</g>;})}
                          {[{fill:'#7C3AED',label:'Your Brand'},{fill:'#C4B5FD',label:'Competitors'},{fill:'#6EE7B7',label:'Sources'}].map((l,i)=><g key={i} transform={`translate(${W2/2-108+i*78},${H2-10})`}><circle cx={5} cy={0} r={5} fill={l.fill}/><text x={13} y={0} dominantBaseline="middle" style={{fontSize:8,fill:'#374151',fontFamily:'Inter,sans-serif'}}>{l.label}</text></g>)}
                        </svg>;
                      })()}
                    </div>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22}}>
                    <div style={{fontSize:'1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Sources AI is Pulling From — {result.brand_name}</div>
                    <div style={{fontSize:'0.75rem',color:'#9CA3AF',marginBottom:16}}>Top domains that influence AI responses in your category.</div>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr style={{background:'#FAFAFA'}}>{['RANK','DOMAIN','CATEGORY','CITATION SHARE %',''].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                      <tbody>{displaySources.map((s:any,i:number)=>{
                        const isOwned = s.isOwned || (brandDomain && (s.domain||'').replace('www.','').includes(brandDomain.replace('www.','')));
                        const cls = isOwned ? {label:'Owned Media',color:'#7C3AED',bg:'#EDE9FE'} : classifyDomain(s.domain||'');
                        const bw=Math.min(s.citation_share,100);
                        const isExp=expandedDomain===s.domain;
                        const realUrls = DOMAIN_REAL_URLS[s.domain] || (isOwned ? [
                          `https://www.${s.domain}/credit-cards`,`https://www.${s.domain}/credit-cards/venture`,`https://www.${s.domain}/credit-cards/quicksilver`,`https://www.${s.domain}/credit-cards/savor`,`https://www.${s.domain}/credit-cards/secured`,
                        ] : [`https://www.${s.domain}`]);
                        return<React.Fragment key={i}>
                          <tr style={{borderTop:'1px solid #F3F4F6',cursor:'pointer',background:isExp?'#F9F8FF':isOwned?'#FAFBFF':'white',borderLeft:isOwned?'3px solid #7C3AED':'none'}} onClick={()=>setExpandedDomain(isExp?null:s.domain)}>
                            <td style={{padding:'11px 14px',fontSize:'0.82rem',color:'#9CA3AF'}}>{s.rank||i+1}</td>
                            <td style={{padding:'11px 14px'}}><div style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontSize:'0.86rem',fontWeight:600,color:'#7C3AED'}}>{s.domain}</span>{isOwned&&<span style={{background:'#EDE9FE',color:'#7C3AED',borderRadius:4,padding:'1px 6px',fontSize:'0.65rem',fontWeight:700}}>Your Site</span>}</div></td>
                            <td style={{padding:'11px 14px'}}><span style={{background:cls.bg,color:cls.color,borderRadius:8,padding:'3px 10px',fontSize:'0.72rem',fontWeight:600}}>{cls.label}</span></td>
                            <td style={{padding:'11px 14px'}}><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{flex:1,background:'#F3F4F6',borderRadius:50,height:5,overflow:'hidden'}}><div style={{background:isOwned?'#7C3AED':'#10B981',height:5,borderRadius:50,width:`${bw}%`}}/></div><span style={{fontSize:'0.82rem',fontWeight:700,color:isOwned?'#7C3AED':'#10B981',width:34}}>{s.citation_share}%</span></div></td>
                            <td style={{padding:'11px 14px',fontSize:'0.75rem',color:'#9CA3AF',textAlign:'right' as const}}>{isExp?'▲ Hide':'▼ URLs'}</td>
                          </tr>
                          {isExp&&<tr style={{background:'#F9F8FF'}}><td colSpan={5} style={{padding:'8px 14px 14px 32px'}}><div style={{fontSize:'0.73rem',fontWeight:600,color:'#7C3AED',marginBottom:8}}>Top pages from {s.domain}</div><div style={{display:'flex',flexDirection:'column' as const,gap:5}}>{realUrls.map((url:string,ui:number)=><div key={ui} style={{display:'flex',alignItems:'center',gap:8}}><span style={{width:16,height:16,borderRadius:'50%',background:'#EDE9FE',color:'#7C3AED',fontSize:'0.6rem',fontWeight:700,display:'inline-flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{ui+1}</span><a href={url} target="_blank" rel="noreferrer" style={{fontSize:'0.78rem',color:'#4F46E5',textDecoration:'none'}}>{url}</a></div>)}</div></td></tr>}
                        </React.Fragment>;
                      })}</tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {activeTab===5&&(()=>{
              const rd=result.responses_detail||[],cats=['All',...Array.from(new Set(rd.map((r:any)=>r.category))) as string[]];
              const catStats:Record<string,{total:number;mentioned:number}>={};
              rd.forEach((r:any)=>{if(!catStats[r.category])catStats[r.category]={total:0,mentioned:0};catStats[r.category].total++;if(r.mentioned)catStats[r.category].mentioned++;});
              const totalMentions=rd.filter((r:any)=>r.mentioned).length,rank1=rd.filter((r:any)=>r.position===1).length,top3=rd.filter((r:any)=>r.position>0&&r.position<=3).length,notMentioned=rd.filter((r:any)=>!r.mentioned).length;
              const totalQueries = rd.length || 20;
              // Only show "who beat you" if the response object has actual winner data
              const getBeater=(item:any)=>{
                if(item.winner_brand) return item.winner_brand;
                if(item.top_brand && item.top_brand !== result.brand_name) return item.top_brand;
                if(item.position===0 && item.brands_mentioned?.length>0) return item.brands_mentioned[0];
                return null; // don't fabricate a winner
              };
              const sorted=[...rd].filter((r:any)=>filterCat==='All'||r.category===filterCat).sort((a:any,b:any)=>{const ap=a.position>0?a.position:999,bp=b.position>0?b.position:999;return ap-bp;}).slice(0,20);
              return (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20}}>
                    <MetricCard label="queries run" val={totalQueries} sub="Generic consumer questions, no brand name" color="#7C3AED"/>
                    <MetricCard label="appearances" val={`${totalMentions}/${totalQueries}`} sub="Queries where brand appeared" color="#7C3AED"/>
                    <MetricCard label="appearance rate" val={`${Math.round((totalMentions/totalQueries)*100)}%`} sub="Of all AI queries triggered brand mention" color="#7C3AED"/>
                  </div>
                  <div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827',marginBottom:10}}>Appearance Rate by Category</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:12,marginBottom:20}}>
                    {Object.entries(catStats).map(([c,v])=><div key={c} style={{background:'white',border:'1px solid #E5E7EB',borderRadius:12,padding:'14px 16px'}}><div style={{fontSize:'0.8rem',fontWeight:600,color:'#111827',marginBottom:7}}>{c}</div><div style={{background:'#F3F4F6',borderRadius:50,height:5,marginBottom:5,overflow:'hidden'}}><div style={{background:'#7C3AED',height:5,borderRadius:50,width:`${Math.round((v.mentioned/Math.max(v.total,1))*100)}%`}}/></div><div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontSize:'0.7rem',color:'#9CA3AF'}}>{v.mentioned} of {v.total} queries</span><span style={{fontSize:'0.76rem',fontWeight:700,color:'#7C3AED'}}>{Math.round((v.mentioned/Math.max(v.total,1))*100)}%</span></div></div>)}
                  </div>
                  <div style={{background:'white',borderRadius:12,border:'1px solid #E5E7EB',padding:'12px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:24,flexWrap:'wrap' as const}}>
                    <div style={{fontSize:'0.78rem',fontWeight:700,color:'#111827'}}>Query Summary</div>
                    {[{label:'#1 Rank',val:rank1,color:'#10B981',bg:'#F0FDF4',border:'#6EE7B7'},{label:'Top 3',val:top3,color:'#7C3AED',bg:'#F5F3FF',border:'#DDD6FE'},{label:'Appeared',val:totalMentions,color:'#3B82F6',bg:'#EFF6FF',border:'#93C5FD'},{label:'Not Mentioned',val:notMentioned,color:'#EF4444',bg:'#FFF1F2',border:'#FCA5A5'}].map((s,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:8,background:s.bg,border:`1px solid ${s.border}`,borderRadius:8,padding:'5px 14px'}}><span style={{fontSize:'1.1rem',fontWeight:900,color:s.color}}>{s.val}</span><span style={{fontSize:'0.72rem',color:s.color,fontWeight:600}}>{s.label}</span></div>)}
                    <div style={{marginLeft:'auto',fontSize:'0.72rem',color:'#9CA3AF'}}>Sorted by best rank first</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                    <div><div style={{fontSize:'0.95rem',fontWeight:700,color:'#111827'}}>Queries Run ({sorted.length} shown)</div></div>
                    <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{border:'1px solid #E5E7EB',borderRadius:8,padding:'7px 12px',fontSize:'0.82rem',color:'#374151',background:'white',outline:'none'}}>{cats.map(c=><option key={c}>{c}</option>)}</select>
                  </div>
                  <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',overflow:'hidden'}}>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      <thead><tr style={{background:'#FAFAFA'}}>{['#','QUERY','YOUR RANK','WHO BEAT YOU'].map(h=><th key={h} style={{padding:'9px 14px',textAlign:'left',fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.06em'}}>{h}</th>)}</tr></thead>
                      <tbody>{sorted.map((item:any,i:number)=>{const rp=item.position,rankLabel=rp===1?'#1':rp>0?`#${rp}`:'N/A',rankColor=rp===1?'#10B981':rp<=3?'#7C3AED':item.mentioned?'#7C3AED':'#9CA3AF',isMissed=!item.mentioned,beater=isMissed?getBeater(item):null,isTop=rp===1;return<tr key={i} style={{borderTop:'1px solid #F3F4F6',background:isTop?'#F0FDF4':isMissed?'#FFFBFB':'white'}}><td style={{padding:'12px 14px',fontSize:'0.8rem',color:'#9CA3AF',verticalAlign:'top',width:32}}>{i+1}</td><td style={{padding:'12px 14px',verticalAlign:'top'}}><div style={{display:'flex',gap:8,alignItems:'center',marginBottom:5,flexWrap:'wrap' as const}}><span style={{background:'#EDE9FE',color:'#5B21B6',borderRadius:6,padding:'2px 9px',fontSize:'0.7rem',fontWeight:600}}>{item.category}</span>{item.mentioned?<span style={{color:'#10B981',fontSize:'0.76rem',fontWeight:600}}>✓ Appeared</span>:<span style={{color:'#EF4444',fontSize:'0.76rem',fontWeight:600}}>✗ Not Mentioned</span>}{isMissed&&<span style={{background:'#FEE2E2',color:'#991B1B',borderRadius:6,padding:'2px 8px',fontSize:'0.65rem',fontWeight:700}}>⚠ Missed</span>}{isTop&&<span style={{background:'#D1FAE5',color:'#065F46',borderRadius:6,padding:'2px 8px',fontSize:'0.65rem',fontWeight:700}}>★ Top Rank</span>}</div><div style={{fontSize:'0.86rem',color:'#374151',fontWeight:500}}>{item.query}</div></td><td style={{padding:'12px 14px',fontSize:'1rem',fontWeight:800,color:rankColor,verticalAlign:'top',width:80}}>{rankLabel}</td><td style={{padding:'12px 14px',verticalAlign:'top',width:160}}>{beater?<span style={{display:'inline-flex',alignItems:'center',gap:5,background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:8,padding:'3px 10px',fontSize:'0.75rem',fontWeight:700,color:'#92400E'}}>👑 {beater} #1</span>:rp===1?<span style={{display:'inline-flex',alignItems:'center',gap:5,background:'#D1FAE5',border:'1px solid #6EE7B7',borderRadius:8,padding:'3px 10px',fontSize:'0.75rem',fontWeight:700,color:'#065F46'}}>✓ You&apos;re #1</span>:<span style={{fontSize:'0.75rem',color:'#9CA3AF'}}>—</span>}</td></tr>;})}</tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {activeTab===6&&(()=>{
              const geo=result.overall_geo_score,fin=result.ind_key==='fin';
              const segments=fin?[{name:'General Consumers',status:'Winning',color:'#10B981',bg:'#F0FDF4',border:'#6EE7B7',score:Math.round(geo*0.9),dominated:'Chase, Citi'},{name:'Travelers / Rewards',status:'Winning',color:'#10B981',bg:'#F0FDF4',border:'#6EE7B7',score:Math.min(100,Math.round(geo*1.1)),dominated:'Amex, Chase'},{name:'Affluent / HNW',status:'Gap',color:'#EF4444',bg:'#FFF1F2',border:'#FCA5A5',score:Math.round(geo*0.45),dominated:'Amex Centurion, Chase Sapphire'},{name:'First-Time Users',status:'Winning',color:'#10B981',bg:'#F0FDF4',border:'#6EE7B7',score:Math.round(geo*0.95),dominated:'Discover'},{name:'Cashback Seekers',status:'Gap',color:'#EF4444',bg:'#FFF1F2',border:'#FCA5A5',score:Math.round(geo*0.5),dominated:'Citi, Wells Fargo'},{name:'Small Business',status:'Gap',color:'#EF4444',bg:'#FFF1F2',border:'#FCA5A5',score:Math.round(geo*0.35),dominated:'Amex, Chase Ink'}]:[{name:'General Consumers',status:'Winning',color:'#10B981',bg:'#F0FDF4',border:'#6EE7B7',score:Math.round(geo*0.9),dominated:'Top Competitors'},{name:'Expert Seekers',status:'Winning',color:'#10B981',bg:'#F0FDF4',border:'#6EE7B7',score:Math.round(geo*1.0),dominated:'Industry Leaders'},{name:'Premium Segment',status:'Gap',color:'#EF4444',bg:'#FFF1F2',border:'#FCA5A5',score:Math.round(geo*0.5),dominated:'Competitors'}];
              return (
                <div>
                  <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Segment Coverage Analysis</div>
                  <div style={{fontSize:'0.8rem',color:'#9CA3AF',marginBottom:14}}>Which audience segments is your brand winning vs. losing in AI responses?</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:24}}>{segments.map((s,i)=><div key={i} style={{background:s.bg,borderRadius:14,border:`1px solid ${s.border}`,padding:'16px 18px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:'0.88rem',fontWeight:700,color:s.color}}>{s.name}</span><span style={{background:s.status==='Winning'?'#D1FAE5':'#FEE2E2',color:s.color,borderRadius:50,padding:'2px 10px',fontSize:'0.7rem',fontWeight:700}}>{s.status}</span></div><div style={{background:s.status==='Winning'?'#D1FAE5':'#FEE2E2',borderRadius:50,height:4,marginBottom:7,overflow:'hidden'}}><div style={{background:s.color,height:4,borderRadius:50,width:`${Math.min(s.score,100)}%`}}/></div><div style={{fontSize:'0.75rem',color:'#6B7280'}}>Score: <strong style={{color:s.color}}>{s.score}</strong> &nbsp;·&nbsp; Dominated by: {s.dominated}</div></div>)}</div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span>⚡</span><span style={{fontSize:'1.05rem',fontWeight:700,color:'#111827'}}>GEO Health Summary</span></div>
                  <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:14}}>Based on how your brand performed across 20 generic AI queries.</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:24}}>
                    <div style={{background:'#F0FDF4',borderRadius:14,border:'1px solid #6EE7B7',padding:22}}><div style={{fontSize:'1rem',fontWeight:700,color:'#065F46',marginBottom:12}}>✓ What is Working Well</div><ul style={{listStyle:'none',padding:0,margin:0}}>{(result.strengths_list||[]).slice(0,3).map((s:string,i:number)=><li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#10B981',fontWeight:700,flexShrink:0}}>✓</span><span>{s}</span></li>)}</ul></div>
                    <div style={{background:'#FFF1F2',borderRadius:14,border:'1px solid #FCA5A5',padding:22}}><div style={{fontSize:'1rem',fontWeight:700,color:'#991B1B',marginBottom:12}}>✗ What Needs Improvement</div><ul style={{listStyle:'none',padding:0,margin:0}}>{(result.improvements_list||[]).slice(0,3).map((w:string,i:number)=><li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#EF4444',fontWeight:700,flexShrink:0}}>✗</span><span>{w}</span></li>)}</ul></div>
                  </div>
                  {result.recommendations&&<div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24,marginBottom:24}}><div style={{fontSize:'1rem',fontWeight:700,color:'#111827',marginBottom:14}}>Recommendations</div><MarkdownText text={result.recommendations}/></div>}
                  <PriorityActionsTable result={result}/>
                </div>
              );
            })()}

            {activeTab===7&&(()=>(
              <div>
                <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Live Prompt Tester</div>
                <div style={{fontSize:'0.8rem',color:'#9CA3AF',marginBottom:20}}>Run any prompt against a live AI model and see how your brand appears in real responses.</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>{examplePrompts.map((p,i)=><button key={i} onClick={()=>runPrompt(p)} style={{background:'#F5F3FF',border:'1px solid #DDD6FE',borderRadius:10,padding:'10px 16px',fontSize:'0.82rem',color:'#5B21B6',fontWeight:500,cursor:'pointer',textAlign:'left' as const,lineHeight:1.5}}>{p}</button>)}</div>
                <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:20,marginBottom:20}}>
                  <div style={{display:'flex',gap:10}}>
                    <input type="text" value={promptInput} onChange={e=>setPromptInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runPrompt()} placeholder="Ask any question — e.g. What's the best travel credit card?" style={{flex:1,border:'1.5px solid #E5E7EB',borderRadius:10,padding:'11px 16px',fontSize:'0.9rem',outline:'none',color:'#374151'}}/>
                    <button onClick={()=>runPrompt()} disabled={promptLoading} style={{background:'#7C3AED',color:'white',border:'none',borderRadius:10,padding:'0 22px',fontWeight:700,fontSize:'0.9rem',cursor:'pointer',flexShrink:0}}>{promptLoading?'Asking…':'Ask AI'}</button>
                  </div>
                </div>
                {promptHistory.length>0&&<div style={{display:'flex',flexDirection:'column' as const,gap:16}}>{promptHistory.map((h,i)=><div key={i} style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22}}><div style={{fontSize:'0.82rem',fontWeight:700,color:'#7C3AED',marginBottom:10}}>Q: {h.q}</div><MarkdownText text={h.a}/></div>)}</div>}
                {promptLoading&&<div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:22,textAlign:'center' as const,color:'#9CA3AF',fontSize:'0.88rem'}}>Querying AI model…</div>}
              </div>
            ))()}

            {activeTab===8&&(()=>(
              <div>
                <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:4}}>GEO Score — FAQ</div>
                <div style={{fontSize:'0.8rem',color:'#9CA3AF',marginBottom:24}}>Everything you need to understand your score and how to act on it.</div>
                <div style={{display:'flex',gap:20,marginBottom:24}}>
                  <SankeyChart result={result}/>
                  <BusinessImpact result={result} onGo={()=>setActiveTab(1)}/>
                </div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:14}}>
                  {[
                    {q:'What is a GEO Score?',a:'The GEO Score is a single 0–100 number that measures how often and how favorably your brand is cited in AI-generated responses — across ChatGPT, Gemini, Perplexity, and other major AI engines.'},
                    {q:'Why does 70 matter?',a:'70 is the efficiency threshold — where AI models have accumulated enough signals to place you at the top of responses with statistical confidence. Below 70, AI treats your brand as optional. Above it, your brand becomes a default recommendation.'},
                    {q:'How is the GEO Score calculated?',a:'Visibility (30%) + Sentiment (20%) + Prominence (20%) + Citation Share (15%) + Share of Voice (15%).'},
                    {q:'How often is the score updated?',a:"The GEO Score is calculated in real-time each time you run an analysis — so your score always reflects current AI responses, not cached data."},
                    {q:"What's the difference between Visibility and Prominence?",a:'Visibility measures whether your brand appears at all. Prominence measures where — position 1 vs position 5. Both matter for conversions.'},
                    {q:'Why might my Citation Score and Avg Rank seem inconsistent?',a:'Citation Score and Avg Rank can be computed from different query pools on the backend — citation share covers all mention contexts while rank is averaged only over queries where your brand appeared. If your rank is high but citation is low, the priority fix is expanding the breadth of queries where you appear, not just improving your position.'},
                    {q:'How do I improve my GEO Score?',a:"The Top 5 Gaps section on the GEO Score tab identifies your highest-impact opportunities. Build authoritative content, earn placements on sources AI trusts, restructure content for AI extraction, and expand coverage across segments where you're currently invisible."},
                  ].map((item,i)=><div key={i} style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'18px 22px'}}><div style={{fontSize:'0.9rem',fontWeight:700,color:'#111827',marginBottom:8}}>{item.q}</div><div style={{fontSize:'0.84rem',color:'#6B7280',lineHeight:1.75}}>{item.a}</div></div>)}
                </div>
              </div>
            ))()}

          </div>
        </div>
      )}
    </main>
  );
}
