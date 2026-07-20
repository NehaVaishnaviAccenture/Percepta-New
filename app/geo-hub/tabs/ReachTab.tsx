'use client';

import React, { useState } from 'react';
import { classifyDomain } from '../lib/tiers';
import { GeoExplainer } from './GeoExplainer';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

function sigTier(s: number) {
  if (s >= 80) return { label: 'Authority',   text: '#007653', bg: '#D1FAE5' };
  if (s >= 70) return { label: 'Leader',       text: '#043BCC', bg: '#DBEAFE' };
  if (s >= 56) return { label: 'Competitive',  text: '#996E00', bg: '#FEF3C7' };
  if (s >= 45) return { label: 'Emerging',     text: '#B15F00', bg: '#FFF0E0' };
  return               { label: 'Fragmented',  text: '#B7002F', bg: '#FFE4EC' };
}


function SovChart({ brand, sovScore, competitors }: { brand: string; sovScore: number; competitors: any[] }) {
  const bars: { label: string; value: number; isYou: boolean }[] = [
    ...competitors.slice(0, 9).map((c: any) => ({
      label: c.Brand || '',
      value: c.Sov ?? c.SoV ?? c.sov ?? 0,
      isYou: false,
    })),
    { label: brand, value: sovScore, isYou: true },
  ].sort((a, b) => b.value - a.value);

  const maxVal = Math.max(...bars.map(b => b.value), 1);

  return (
    <div className="reachSovChart">
      <div className="reachSovEyebrow">SHARE OF VOICE — WHO OWNS THE CONVERSATION</div>
      <div className="reachSovBars">
        {bars.map((b, i) => (
          <div key={i} className="reachSovBar">
            <div className="reachSovBarTrack">
              <div
                className="reachSovBarFill"
                style={{
                  height: `${Math.round((b.value / maxVal) * 100)}%`,
                  background: b.isYou ? '#A100FF' : '#D1D5DB',
                }}
              />
            </div>
            <span className="reachSovBarPct" style={{ color: b.isYou ? '#A100FF' : '#6B7280' }}>
              {b.value}%
            </span>
            <div className="reachSovBarLabel" style={{ fontWeight: b.isYou ? 700 : 400, color: b.isYou ? '#A100FF' : '#6B7280' }}>
              {b.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReachTab({ result, resultComps }: TabProps) {
  const [activeCat, setActiveCat] = useState<string>('all');
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);

  const cit = result.citation_share ?? 0;
  const sov = result.share_of_voice ?? 0;
  const citTier = sigTier(cit);
  const sovTier = sigTier(sov);

  const allCit = [cit, ...resultComps.map((c: any) => c.Cit ?? c.cit ?? 0)];
  const allSov = [sov, ...resultComps.map((c: any) => c.Sov ?? c.SoV ?? c.sov ?? 0)];
  const rank = (myVal: number, all: number[]) => [...all].sort((a, b) => b - a).indexOf(myVal) + 1;
  const avg  = (all: number[]) => Math.round(all.reduce((s, v) => s + v, 0) / all.length);

  const citRank = rank(cit, allCit);
  const sovRank = rank(sov, allSov);

  const brandKey = (result.domain || '').replace('www.', '').split('.')[0].toLowerCase();
  const domainMatchesBrand = (domain: string) => {
    const dk = domain.replace('www.', '').split('.')[0].toLowerCase();
    return dk === brandKey || dk.startsWith(brandKey) || brandKey.startsWith(dk);
  };

  const rawSources = result.citation_sources || [];
  const fallbackSources = [
    { domain: 'nerdwallet.com', citation_share: 4.9 },
    { domain: 'bankrate.com', citation_share: 3.8 },
    { domain: 'thepointsguy.com', citation_share: 3.2 },
    { domain: 'forbes.com', citation_share: 2.9 },
    { domain: 'creditkarma.com', citation_share: 2.7 },
    { domain: 'reddit.com', citation_share: 2.4 },
    { domain: 'wikipedia.org', citation_share: 2.2 },
    { domain: 'consumerfinance.gov', citation_share: 2.1 },
    { domain: 'cnbc.com', citation_share: 1.9 },
    { domain: 'investopedia.com', citation_share: 1.7 },
  ];
  const baseSources = rawSources.length > 0 ? rawSources : fallbackSources;
  const hasBrand = baseSources.some((s: any) => domainMatchesBrand(s.domain || ''));
  const allSources: any[] = hasBrand
    ? baseSources
    : [{ domain: result.domain || '', citation_share: 15, isOwned: true }, ...baseSources];

  const displaySources = allSources
    .map((s: any, i: number) => ({
      ...s,
      rank: i,
      isOwned: s.isOwned || domainMatchesBrand(s.domain || ''),
    }))
    .slice(0, 11)
    .map((s, i) => ({ ...s, rank: s.isOwned ? 0 : i }));

  const getCat = (s: any): string => {
    if (s.isOwned) return 'owned';
    const label = classifyDomain(s.domain || '').label.toLowerCase();
    if (label.includes('social')) return 'social';
    if (label.includes('institution') || label.includes('government') || label.includes('edu')) return 'institution';
    return 'earned';
  };

  const catLabel: Record<string, string> = {
    owned: 'Owned media',
    earned: 'Earned media',
    social: 'Social media',
    institution: 'Institution',
  };

  const catColor = (cat: string, s: any) => {
    const cls = classifyDomain(s.domain || '');
    if (s.isOwned) return { text: '#996E00', bg: '#FEF3C7' };
    if (cat === 'social') return { text: '#B15F00', bg: '#FFF0E0' };
    if (cat === 'institution') return { text: '#043BCC', bg: '#DBEAFE' };
    return { text: cls.color || '#007653', bg: cls.bg || '#D1FAE5' };
  };

  const filteredSources = activeCat === 'all'
    ? displaySources
    : displaySources.filter(s => getCat(s) === activeCat);

  const signals = [
    { key: 'cit', label: 'Citation', weight: 15, q: 'How often AI uses your website or content as a source.', score: cit, tier: citTier, rankVal: citRank, avgVal: avg(allCit), total: allCit.length - 1 },
    { key: 'sov', label: 'Share of Voice', weight: 15, q: 'How much your brand is mentioned compared to competitors.', score: sov, tier: sovTier, rankVal: sovRank, avgVal: avg(allSov), total: allSov.length - 1 },
  ];

  return (
    <div id="tab-reach">
      <p className="reachTagline">
        How much of the AI conversation{' '}
        <span className="reachAccent">do you own?</span>
      </p>

      <div className="reachCards">
        {signals.map(sig => (
          <div key={sig.key} id="reachCard" className="aiPresCard" style={{ borderLeftColor: sig.tier.text }}>
            <div id="reachCardEyebrow" className="aiPresCardEyebrow">
              {sig.label}
            </div>
            <div id="reachCardQ" className="aiPresCardQ">{sig.q}</div>
            <div id="reachCardScoreRow" className="aiPresCardScoreRow">
              <span id="reachCardNum" className="aiPresCardNum" style={{ color: sig.tier.text }}>{sig.score}</span>
              <span id="reachChip" className="aiPresChip" style={{ background: sig.tier.bg, color: sig.tier.text }}>{sig.tier.label}</span>
            </div>
            <div id="reachCardRank" className="aiPresCardRank">#{sig.rankVal} of {sig.total} brands · avg {sig.avgVal}</div>
          </div>
        ))}
      </div>

      <GeoExplainer
        onSignalsClick={() => {}}
        label={<>Reach signals carry <strong>30%</strong> of your overall GEO Score</>}
        hint=""
        signalTiers={{
          citation: { text: citTier.text, bg: citTier.bg },
          sov:      { text: sovTier.text, bg: sovTier.bg },
        }}
      />

      <div className="reachSection">
        <SovChart brand={result.brand_name} sovScore={sov} competitors={resultComps} />
      </div>

      <div className="reachSection">
        <div className="reachSourcesCard">
          <div className="reachSourcesEyebrow">CITATION SOURCES — WHAT&apos;S DRIVING YOUR PRESENCE</div>
          <p className="reachSourcesSub">
            Top 10 domains influencing AI responses. Click a filter above to narrow by category.
          </p>
          <div className="reachChipFilters">
            {(['all', 'owned', 'earned', 'social', 'institution'] as const).map(cat => (
              <button
                key={cat}
                className={`reachCF${activeCat === cat ? ' reachCF--active' : ''}`}
                onClick={() => setActiveCat(cat)}
              >
                {cat === 'all' ? 'All sources' : catLabel[cat]}
              </button>
            ))}
          </div>

          <div className="reachSrcList">
            {filteredSources.length === 0 && (
              <div className="reachSrcEmpty">No sources in this category.</div>
            )}
            {filteredSources.map((s, i) => {
              const cat = getCat(s);
              const cc = catColor(cat, s);
              const isExp = expandedDomain === s.domain;
              const urls = [`https://www.${s.domain}/`];
              const titles = urls.map((u: string) => u);
              const share = Math.min(s.citation_share ?? 5, s.isOwned ? 15 : 5);
              const barW = Math.round((share / 15) * 100);

              return (
                <React.Fragment key={s.domain}>
                  <div
                    className="reachSrcRow"
                    style={{ borderLeft: s.isOwned ? `3px solid ${cc.text}` : undefined, cursor: 'pointer' }}
                    onClick={() => setExpandedDomain(isExp ? null : s.domain)}
                  >
                    <span className="reachSrcRank" style={{ color: s.isOwned ? cc.text : undefined }}>
                      {s.isOwned ? '—' : i + (activeCat === 'all' ? 0 : 0)}
                    </span>
                    <div className="reachSrcInfo">
                      <div className="reachSrcName" style={{ color: s.isOwned ? cc.text : undefined }}>{s.domain}</div>
                      <span className="reachSrcBadge" style={{ background: cc.bg, color: cc.text }}>
                        {catLabel[cat]}
                      </span>
                    </div>
                    <div className="reachSrcRight">
                      <div className="reachSrcBarTrack">
                        <div className="reachSrcBarFill" style={{ width: `${barW}%`, background: s.isOwned ? cc.text : '#10B981' }} />
                      </div>
                      <span className="reachSrcPct" style={{ color: s.isOwned ? cc.text : '#10B981' }}>{share}%</span>
                      <span className="reachSrcTog" style={{ transform: isExp ? 'rotate(180deg)' : undefined }}>▾</span>
                    </div>
                  </div>
                  {isExp && (
                    <div className="reachSrcExpand">
                      {urls.map((url: string, ui: number) => (
                        <a key={ui} href={url} target="_blank" rel="noreferrer" className="reachExpandRow">
                          <span className="reachExpandNum">{ui + 1}</span>
                          <div className="reachExpandText">
                            <div className="reachExpandTitle">{titles[ui] || url}</div>
                            <div className="reachExpandUrl">{url}</div>
                          </div>
                          <span className="reachExpandIcon">↗</span>
                        </a>
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
