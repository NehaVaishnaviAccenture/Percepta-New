'use client';

import React, { useState } from 'react';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

function PriorityActionsTable({ result, resultComps, cachedActions, setCachedActions, actionsLoading, setActionsLoading }: {
  result: any; resultComps: any[]; cachedActions: any[] | null;
  setCachedActions: (a: any[]) => void; actionsLoading: boolean; setActionsLoading: (b: boolean) => void;
}) {
  const actions = cachedActions || [];
  const loading = actionsLoading;

  React.useEffect(() => {
    if (cachedActions !== null) return;
    setActionsLoading(true);
    const prompt = `You are a GEO strategist. Generate a JSON array of 5-7 specific implementable priority actions for this brand.
Brand: ${result.brand_name}, Industry: ${result.ind_label}, GEO Score: ${result.overall_geo_score}
Competitors: ${resultComps.map((c: any) => c.Brand).join(', ')}
IMPORTANT: Do NOT suggest comparison pages against competitors -- banks never publish pages comparing themselves to rivals.
Return ONLY valid JSON array, no markdown. Each object: {"priority":"High"|"Medium"|"Low","segment":"audience segment","type":"Content Page"|"Owned Content Optimization"|"FAQ Build"|"Structured Content"|"Citation Push"|"PR / Earned Media","action":"specific 1-3 sentence action","deliverable":"Workstream 01 -- ARD"|"Workstream 02 -- AOP"|"Workstream 03 -- DT1"}
Order: High first, then Medium, then Low.`;
    fetch('/api/prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) })
      .then(r => r.json())
      .then(data => {
        const raw2 = data.response || '';
        const cl2 = raw2.replace('```json', '').replace('```', '').trim();
        setCachedActions(JSON.parse(cl2));
      })
      .catch(() => setCachedActions([]))
      .finally(() => setActionsLoading(false));
  }, []);

  const ps = (p: string) =>
    p === 'High'   ? { color: '#EF4444', bg: '#FEE2E2' } :
    p === 'Medium' ? { color: '#92400E', bg: '#FEF3C7' } :
                     { color: '#065F46', bg: '#D1FAE5' };

  return (
    <div className="apActionsCard">
      <div className="apActionsCardHeader">
        <span className="apActionsCardIcon">!</span>
        <span className="apActionsCardTitle">Priority Actions Implementable</span>
      </div>
      <div className="apActionsCardSubtitle">Each action is specific, buildable, and mapped to a workstream deliverable.</div>
      {loading
        ? <div className="apActionsLoading"><div className="apActionsLoadingSpinner" />Generating...</div>
        : actions.length === 0
          ? <div className="apActionsEmpty">Generating recommendations... if this persists, try re-running the analysis.</div>
          : <table className="apActionsTable">
              <thead>
                <tr>{['PRIORITY', 'SEGMENT', 'TYPE', 'ACTION TO TAKE', 'DELIVERABLE'].map(h => <th key={h} className="apActionsTableHeader">{h}</th>)}</tr>
              </thead>
              <tbody>
                {actions.map((a: any, i: number) => {
                  const s = ps(a.priority);
                  return (
                    <tr key={i} className="apActionsTableRow" style={{ background: i % 2 === 0 ? '#FAFAFA' : 'white' }}>
                      <td className="apActionsCellNoWrap"><span className="apPriorityBadge" style={{ background: s.bg, color: s.color }}>{a.priority}</span></td>
                      <td className="apActionsCell"><span className="apActionSegment">{a.segment}</span></td>
                      <td className="apActionsCellNoWrap"><span className="apActionType">{a.type}</span></td>
                      <td className="apActionsCellAction"><span className="apActionText">{a.action}</span></td>
                      <td className="apActionsCellNoWrap"><span className="apActionDeliverable">{a.deliverable}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
      }
    </div>
  );
}

export default function PrioritiesPlaybookTab({ result, resultComps }: TabProps) {
  const [cachedActions, setCachedActions] = useState<any[] | null>(null);
  const [actionsLoading, setActionsLoading] = useState(false);

  return (
    <div id="tab-priorities-playbook">
      <PriorityActionsTable
        result={result}
        resultComps={resultComps}
        cachedActions={cachedActions}
        setCachedActions={setCachedActions}
        actionsLoading={actionsLoading}
        setActionsLoading={setActionsLoading}
      />
    </div>
  );
}
