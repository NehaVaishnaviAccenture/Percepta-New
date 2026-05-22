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
    <div className="apActionsCard">
      <div className="apActionsCardHeader"><span className="apActionsCardIcon">!</span><span className="apActionsCardTitle">Priority Actions Implementable</span></div>
      <div className="apActionsCardSubtitle">Each action is specific, buildable, and mapped to a workstream deliverable.</div>
      {loading?<div className="apActionsLoading"><div className="apActionsLoadingSpinner"/>Generating...</div>
      :actions.length===0?<div className="apActionsEmpty">Generating recommendations... if this persists, try re-running the analysis.</div>
      :<table className="apActionsTable">
        <thead><tr>{['PRIORITY','SEGMENT','TYPE','ACTION TO TAKE','DELIVERABLE'].map(h=><th key={h} className="apActionsTableHeader">{h}</th>)}</tr></thead>
        <tbody>{actions.map((a:any,i:number)=>{const s=ps(a.priority);return<tr key={i} className="apActionsTableRow" style={{background:i%2===0?'#FAFAFA':'white'}}><td className="apActionsCellNoWrap"><span className="apPriorityBadge" style={{background:s.bg,color:s.color}}>{a.priority}</span></td><td className="apActionsCell"><span className="apActionSegment">{a.segment}</span></td><td className="apActionsCellNoWrap"><span className="apActionType">{a.type}</span></td><td className="apActionsCellAction"><span className="apActionText">{a.action}</span></td><td className="apActionsCellNoWrap"><span className="apActionDeliverable">{a.deliverable}</span></td></tr>;})}</tbody>
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
      <div className="apSectionTitle">Segment Coverage Analysis</div>
      <div className="apSectionSubtitle">Which audience segments is your brand winning vs. losing in AI responses?</div>
      <div className="apSegmentGrid">{segments.map((s:any,i:number)=><div key={i} className="apSegmentCard" style={{background:s.bg,border:`1px solid ${s.border}`}}><div className="apSegmentCardHeader"><span className="apSegmentName" style={{color:s.color}}>{s.name}</span><span className="apSegmentStatusPill" style={{background:s.status==='Winning'?'#D1FAE5':s.status==='Emerging'?'#FEF3C7':'#FEE2E2',color:s.color}}>{s.status}</span></div><div className="apSegmentProgressTrack" style={{background:s.status==='Winning'?'#D1FAE5':s.status==='Emerging'?'#FEF3C7':'#FEE2E2'}}><div className="apSegmentProgressFill" style={{background:s.color,width:`${Math.min(s.score,100)}%`}}/></div><div className="apSegmentMeta">Score: <strong style={{color:s.color}}>{s.score}</strong> &nbsp; . &nbsp; Dominated by: {s.dominated}</div></div>)}</div>
      <div className="apHealthHeader"><span>!</span><span className="apHealthTitle">GEO Health Summary</span></div>
      <div className="apSectionSubtitle">Based on how your brand performed across AI queries.</div>
      <div className="apHealthGrid">
        <div id="action-plan-strengths-card" className="apStrengthsCard"><div className="apStrengthsCardTitle">What is Working Well</div><ul className="apHealthList">{(result.strengths_list||[]).slice(0,3).map((s:string,i:number)=><li key={i} className="apHealthListItem"><span className="apStrengthsMarker">+</span><span>{s}</span></li>)}</ul></div>
        <div id="action-plan-improvements-card" className="apImprovementsCard"><div className="apImprovementsCardTitle">What Needs Improvement</div><ul className="apHealthList">{(result.improvements_list||[]).slice(0,3).map((w:string,i:number)=><li key={i} className="apHealthListItem"><span className="apImprovementsMarker">-</span><span>{w}</span></li>)}</ul></div>
      </div>
      {result.recommendations&&<div className="apRecommendationsCard"><div className="apRecommendationsTitle">Recommendations</div><MarkdownText text={result.recommendations}/></div>}
      <PriorityActionsTable result={result} resultComps={resultComps} cachedActions={cachedActions} setCachedActions={setCachedActions} actionsLoading={actionsLoading} setActionsLoading={setActionsLoading}/>
    </div>
  );
}
