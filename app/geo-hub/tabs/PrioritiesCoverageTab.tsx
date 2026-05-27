'use client';

import React from 'react';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

export default function PrioritiesCoverageTab({ result, resultComps }: TabProps) {
  const brandNameLower = (result.brand_name || '').toLowerCase();
  const filterDominated = (d: string) =>
    d.split(',').map((s: string) => s.trim())
     .filter((s: string) => !s.toLowerCase().includes(brandNameLower) && !brandNameLower.includes(s.toLowerCase()))
     .join(', ') || 'Top Competitors';

  const rd          = result.responses_detail || [];
  const recClusters = result.query_clusters   || [];
  const topComp1    = resultComps[0]?.Brand   || 'Top Competitor';
  const topComp2    = resultComps[1]?.Brand   || 'Competitor';

  const SEG_DEFS = recClusters.map((c: any) => ({
    name:       c.category,
    cats:       [c.category],
    dominated:  c.topCompetitor || topComp1,
    dominated2: topComp2,
  }));

  const segRate = (cats: string[]) => {
    let rows = rd.filter((r: any) => cats.some(c => (r.category || '') === c));
    if (rows.length === 0) rows = rd.filter((r: any) => cats.some(c => (r.category || '').toLowerCase().includes(c.toLowerCase())));
    if (rows.length === 0) return null;
    return Math.round((rows.filter((r: any) => r.mentioned).length / rows.length) * 100);
  };

  const WIN_THRESHOLD      = 60;
  const EMERGING_THRESHOLD = 30;

  const getClusterRate = (cats: string[]): number | null => {
    for (const cat of cats) {
      const cluster = recClusters.find((c: any) => c.category === cat);
      if (cluster) return cluster.winRate;
      const fuzzy = recClusters.find((c: any) =>
        c.category.toLowerCase().includes(cat.toLowerCase()) ||
        cat.toLowerCase().includes(c.category.toLowerCase())
      );
      if (fuzzy) return fuzzy.winRate;
    }
    return segRate(cats);
  };

  const getClusterComp = (cats: string[]): string => {
    for (const cat of cats) {
      const cluster = recClusters.find((c: any) => c.category === cat);
      if (cluster?.topCompetitor) return cluster.topCompetitor;
    }
    return '';
  };

  const segments = SEG_DEFS.map((def: any) => {
    const rate = getClusterRate(def.cats);
    if (rate === null) return null;
    const isWinning  = rate >= WIN_THRESHOLD;
    const isEmerging = !isWinning && rate >= EMERGING_THRESHOLD;
    const status     = isWinning ? 'Winning' : isEmerging ? 'Emerging' : 'Gap';
    const topComp    = getClusterComp(def.cats);
    return {
      name:      def.name,
      status,
      color:     isWinning ? '#10B981' : isEmerging ? '#F59E0B' : '#EF4444',
      bg:        isWinning ? '#F0FDF4' : isEmerging ? '#FFFBEB' : '#FFF1F2',
      border:    isWinning ? '#6EE7B7' : isEmerging ? '#FCD34D' : '#FCA5A5',
      score:     rate,
      dominated: topComp
        ? filterDominated(topComp)
        : (isWinning ? filterDominated(def.dominated2 || '') : filterDominated(def.dominated || '')),
    };
  }).filter((s: any): s is NonNullable<typeof s> => s !== null);

  return (
    <div id="tab-priorities-coverage">
      <div className="apSectionTitle">Segment Coverage Analysis</div>
      <div className="apSectionSubtitle">Which audience segments is your brand winning vs. losing in AI responses?</div>
      <div className="apSegmentGrid">
        {segments.map((s: any, i: number) => (
          <div key={i} className="apSegmentCard" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <div className="apSegmentCardHeader">
              <span className="apSegmentName" style={{ color: s.color }}>{s.name}</span>
              <span className="apSegmentStatusPill" style={{ background: s.status === 'Winning' ? '#D1FAE5' : s.status === 'Emerging' ? '#FEF3C7' : '#FEE2E2', color: s.color }}>
                {s.status}
              </span>
            </div>
            <div className="apSegmentProgressTrack" style={{ background: s.status === 'Winning' ? '#D1FAE5' : s.status === 'Emerging' ? '#FEF3C7' : '#FEE2E2' }}>
              <div className="apSegmentProgressFill" style={{ background: s.color, width: `${Math.min(s.score, 100)}%` }} />
            </div>
            <div className="apSegmentMeta">
              Score: <strong style={{ color: s.color }}>{s.score}</strong> &nbsp;·&nbsp; Dominated by: {s.dominated}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
