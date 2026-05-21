'use client';

import React, { useState, useEffect } from 'react';
import { MarkdownText } from '../lib/tiers';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

function PriorityActionsTable({ result, resultComps, cachedActions, setCachedActions, actionsLoading, setActionsLoading }: { result:any; resultComps:any[]; cachedActions:any[]|null; setCachedActions:(a:any[])=>void; actionsLoading:boolean; setActionsLoading:(b:boolean)=>void }) {
  const actions = cachedActions || [];
  const loading = actionsLoading;
  useEffect(()=>{
    if(cachedActions!==null)return;
    setActionsLoading(true);
    const prompt=`You are a GEO strategist. Generate a JSON array of 5-7 specific implementable priority actions for this brand.
Brand: ${result.brand_name}, Industry: ${result.ind_label}, GEO Score: ${result.overall_geo_score}
Competitors: ${(resultComps).map((c:any)=>c.Brand).join(', ')}
IMPORTANT: Do NOT suggest comparison pages against competitors -- banks never publish pages comparing themselves to rivals.
Return ONLY valid JSON array, no markdown. Each object: {"priority":"High"|"Medium"|"Low","segment":"audience segment","type":"Content Page"|"Owned Content Optimization"|"FAQ Build"|"Structured Content"|"Citation Push"|"PR / Earned Media","action":"specific 1-3 sentence action","deliverable":"Workstream 01 -- ARD"|"Workstream 02 -- AOP"|"Workstream 03 -- DT1"}
Order: High first, then Medium, then Low.`;
    fetch('/api/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt})}).then(r=>r.json()).then(data=>{const raw2=data.response||'';let cl2=raw2.replace('```json','').replace('```','').trim();setCachedActions(JSON.parse(cl2));}).catch(()=>setCachedActions([])).finally(()=>setActionsLoading(false));
  },[]);
  const ps=(p:string)=>p==='High'?{color:'#EF4444',bg:'#FEE2E2'}:p==='Medium'?{color:'#92400E',bg:'#FEF3C7'}:{color:'#065F46',bg:'#D1FAE5'};
  return (
    <div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:'28px 28px 24px'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}><span style={{color:'#F59E0B',fontSize:'1.1rem'}}>!</span><span style={{fontSize:'1.1rem',fontWeight:800,color:'#111827'}}>Priority Actions Implementable</span></div>
      <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:24}}>Each action is specific, buildable, and mapped to a workstream deliverable.</div>
      {loading?<div style={{display:'flex',alignItems:'center',gap:10,padding:'24px 0',color:'#9CA3AF',fontSize:'0.85rem'}}><div style={{width:16,height:16,border:'2px solid #DDD6FE',borderTopColor:'#7C3AED',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>Generating...<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
      :actions.length===0?<div style={{fontSize:'0.84rem',color:'#9CA3AF',padding:'12px 0'}}>Generating recommendations... if this persists, try re-running the analysis.</div>
      :<table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr>{['PRIORITY','SEGMENT','TYPE','ACTION TO TAKE','DELIVERABLE'].map(h=><th key={h} style={{padding:'8px 16px 12px',textAlign:'left',fontSize:'0.65rem',color:'#9CA3AF',fontWeight:600,letterSpacing:'.08em',borderBottom:'1px solid #F3F4F6'}}>{h}</th>)}</tr></thead>
        <tbody>{actions.map((a:any,i:number)=>{const s=ps(a.priority);return<tr key={i} style={{borderBottom:'1px solid #F3F4F6',background:i%2===0?'#FAFAFA':'white'}}><td style={{padding:'18px 16px',verticalAlign:'top',whiteSpace:'nowrap' as const}}><span style={{background:s.bg,color:s.color,borderRadius:50,padding:'3px 12px',fontSize:'0.75rem',fontWeight:700}}>{a.priority}</span></td><td style={{padding:'18px 16px',verticalAlign:'top'}}><span style={{fontSize:'0.84rem',fontWeight:600,color:'#7C3AED'}}>{a.segment}</span></td><td style={{padding:'18px 16px',verticalAlign:'top',whiteSpace:'nowrap' as const}}><span style={{fontSize:'0.82rem',color:'#374151'}}>{a.type}</span></td><td style={{padding:'18px 16px',verticalAlign:'top',maxWidth:420}}><span style={{fontSize:'0.84rem',color:'#374151',lineHeight:1.65}}>{a.action}</span></td><td style={{padding:'18px 16px',verticalAlign:'top',whiteSpace:'nowrap' as const}}><span style={{fontSize:'0.84rem',fontWeight:700,color:'#7C3AED'}}>{a.deliverable}</span></td></tr>;})}</tbody>
      </table>}
    </div>
  );
}

export default function ActionPlanTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  const [cachedActions, setCachedActions] = useState<any[]|null>(null);
  const [actionsLoading, setActionsLoading] = useState(false);

  const geo=result.overall_geo_score,fin=result.ind_key==='fin';
  const brandNameLower = (result.brand_name||'').toLowerCase();
  const filterDominated = (d:string) => d.split(',').map((s:string)=>s.trim()).filter((s:string)=>!s.toLowerCase().includes(brandNameLower)&&!brandNameLower.includes(s.toLowerCase())).join(', ')||'Top Competitors';
  const rd = result.responses_detail || [];
  const recClusters = result.query_clusters || [];
  const topComp1 = (resultComps)[0]?.Brand || 'Top Competitor';
  const topComp2 = (resultComps)[1]?.Brand || 'Competitor';
  const SEG_DEFS = recClusters.map((c:any) => ({
    name: c.category,
    cats: [c.category],
    dominated: c.topCompetitor || topComp1,
    dominated2: topComp2,
  }));
  const segRate = (cats: string[]) => {
    let rows = rd.filter((r:any) => cats.some(c => (r.category||'') === c));
    if (rows.length === 0) rows = rd.filter((r:any) => cats.some(c => (r.category||'').toLowerCase().includes(c.toLowerCase())));
    if (rows.length === 0) return null;
    const mentioned = rows.filter((r:any) => r.mentioned).length;
    return Math.round((mentioned / rows.length) * 100);
  };
  const WIN_THRESHOLD = 60;
  const EMERGING_THRESHOLD = 30;
  const getClusterRate = (cats: string[]): number | null => {
    for (const cat of cats) {
      const cluster = recClusters.find((c:any) => c.category === cat);
      if (cluster) return cluster.winRate;
      const fuzzy = recClusters.find((c:any) =>
        c.category.toLowerCase().includes(cat.toLowerCase()) ||
        cat.toLowerCase().includes(c.category.toLowerCase())
      );
      if (fuzzy) return fuzzy.winRate;
    }
    return segRate(cats);
  };
  const getClusterComp = (cats: string[]): string => {
    for (const cat of cats) {
      const cluster = recClusters.find((c:any) => c.category === cat);
      if (cluster?.topCompetitor) return cluster.topCompetitor;
    }
    return '';
  };
  const segments = SEG_DEFS.map((def:any) => {
    const rate = getClusterRate(def.cats);
    if (rate === null) return null;
    const isWinning = rate >= WIN_THRESHOLD;
    const isEmerging = !isWinning && rate >= EMERGING_THRESHOLD;
    const status = isWinning ? 'Winning' : isEmerging ? 'Emerging' : 'Gap';
    const topComp = getClusterComp(def.cats);
    return {
      name: def.name,
      status,
      color: isWinning ? '#10B981' : isEmerging ? '#F59E0B' : '#EF4444',
      bg: isWinning ? '#F0FDF4' : isEmerging ? '#FFFBEB' : '#FFF1F2',
      border: isWinning ? '#6EE7B7' : isEmerging ? '#FCD34D' : '#FCA5A5',
      score: rate,
      dominated: topComp
        ? filterDominated(topComp)
        : (isWinning ? filterDominated(def.dominated2||'') : filterDominated(def.dominated||'')),
    };
  }).filter((s: any): s is NonNullable<typeof s> => s !== null);
  return (
    <div id="tab-action-plan">
      <div style={{fontSize:'1.1rem',fontWeight:700,color:'#111827',marginBottom:4}}>Segment Coverage Analysis</div>
      <div style={{fontSize:'0.8rem',color:'#9CA3AF',marginBottom:14}}>Which audience segments is your brand winning vs. losing in AI responses?</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:24}}>{segments.map((s:any,i:number)=><div key={i} style={{background:s.bg,borderRadius:14,border:`1px solid ${s.border}`,padding:'16px 18px'}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><span style={{fontSize:'0.88rem',fontWeight:700,color:s.color}}>{s.name}</span><span style={{background:s.status==='Winning'?'#D1FAE5':s.status==='Emerging'?'#FEF3C7':'#FEE2E2',color:s.color,borderRadius:50,padding:'2px 10px',fontSize:'0.7rem',fontWeight:700}}>{s.status}</span></div><div style={{background:s.status==='Winning'?'#D1FAE5':s.status==='Emerging'?'#FEF3C7':'#FEE2E2',borderRadius:50,height:4,marginBottom:7,overflow:'hidden'}}><div style={{background:s.color,height:4,borderRadius:50,width:`${Math.min(s.score,100)}%`}}/></div><div style={{fontSize:'0.75rem',color:'#6B7280'}}>Score: <strong style={{color:s.color}}>{s.score}</strong> &nbsp; . &nbsp; Dominated by: {s.dominated}</div></div>)}</div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}><span>!</span><span style={{fontSize:'1.05rem',fontWeight:700,color:'#111827'}}>GEO Health Summary</span></div>
      <div style={{fontSize:'0.78rem',color:'#9CA3AF',marginBottom:14}}>Based on how your brand performed across AI queries.</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:24}}>
        <div id="action-plan-strengths-card" style={{background:'#F0FDF4',borderRadius:14,border:'1px solid #6EE7B7',padding:22}}><div style={{fontSize:'1rem',fontWeight:700,color:'#065F46',marginBottom:12}}>What is Working Well</div><ul style={{listStyle:'none',padding:0,margin:0}}>{(result.strengths_list||[]).slice(0,3).map((s:string,i:number)=><li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#10B981',fontWeight:700,flexShrink:0}}>+</span><span>{s}</span></li>)}</ul></div>
        <div id="action-plan-improvements-card" style={{background:'#FFF1F2',borderRadius:14,border:'1px solid #FCA5A5',padding:22}}><div style={{fontSize:'1rem',fontWeight:700,color:'#991B1B',marginBottom:12}}>What Needs Improvement</div><ul style={{listStyle:'none',padding:0,margin:0}}>{(result.improvements_list||[]).slice(0,3).map((w:string,i:number)=><li key={i} style={{display:'flex',gap:10,marginBottom:10,fontSize:'0.84rem',color:'#374151'}}><span style={{color:'#EF4444',fontWeight:700,flexShrink:0}}>-</span><span>{w}</span></li>)}</ul></div>
      </div>
      {result.recommendations&&<div style={{background:'white',borderRadius:14,border:'1px solid #E5E7EB',padding:24,marginBottom:24}}><div style={{fontSize:'1rem',fontWeight:700,color:'#111827',marginBottom:14}}>Recommendations</div><MarkdownText text={result.recommendations}/></div>}
      <PriorityActionsTable result={result} resultComps={resultComps} cachedActions={cachedActions} setCachedActions={setCachedActions} actionsLoading={actionsLoading} setActionsLoading={setActionsLoading}/>
    </div>
  );
}
