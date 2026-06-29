'use client';

import React, { useState } from 'react';
import { classifyDomain } from '../lib/tiers';

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

const OWNED_URLS: Record<string, string[]> = {
  'capitalone':      ['https://www.capitalone.com/credit-cards/', 'https://www.capitalone.com/credit-cards/venture/', 'https://www.capitalone.com/credit-cards/quicksilver/', 'https://www.capitalone.com/credit-cards/savor/', 'https://www.capitalone.com/credit-cards/secured/'],
  'chase':           ['https://www.chase.com/personal/credit-cards', 'https://www.chase.com/personal/credit-cards/sapphire', 'https://www.chase.com/personal/credit-cards/freedom', 'https://www.chase.com/personal/credit-cards/ink-business', 'https://www.chase.com/personal/credit-cards/amazon'],
  'citi':            ['https://www.citi.com/credit-cards/home', 'https://www.citi.com/credit-cards/citi-double-cash-credit-card', 'https://www.citi.com/credit-cards/citi-custom-cash-card', 'https://www.citi.com/credit-cards/citi-premier-card', 'https://www.citi.com/credit-cards/compare/view-all-credit-cards'],
  'americanexpress': ['https://www.americanexpress.com/us/credit-cards/', 'https://www.americanexpress.com/us/credit-cards/gold-card/', 'https://www.americanexpress.com/us/credit-cards/platinum/', 'https://www.americanexpress.com/us/credit-cards/blue-cash-preferred/', 'https://www.americanexpress.com/us/credit-cards/blue-cash-everyday/'],
  'discover':        ['https://www.discover.com/credit-cards/', 'https://www.discover.com/credit-cards/cash-back/', 'https://www.discover.com/credit-cards/student/', 'https://www.discover.com/credit-cards/secured/', 'https://www.discover.com/credit-cards/miles/'],
  'wellsfargo':      ['https://www.wellsfargo.com/credit-cards/', 'https://www.wellsfargo.com/credit-cards/active-cash/', 'https://www.wellsfargo.com/credit-cards/autograph/', 'https://www.wellsfargo.com/credit-cards/reflect/', 'https://www.wellsfargo.com/credit-cards/compare/'],
  'bankofamerica':   ['https://www.bankofamerica.com/credit-cards/', 'https://www.bankofamerica.com/credit-cards/products/cash-back-credit-card/', 'https://www.bankofamerica.com/credit-cards/products/travel-rewards-credit-card/', 'https://www.bankofamerica.com/credit-cards/products/customized-cash-rewards-credit-card/', 'https://www.bankofamerica.com/credit-cards/compare-credit-cards/'],
};

const DOMAIN_URLS: Record<string, string[]> = {
  'nerdwallet.com':       ['https://www.nerdwallet.com/best/credit-cards', 'https://www.nerdwallet.com/best/credit-cards/cash-back', 'https://www.nerdwallet.com/best/credit-cards/travel', 'https://www.nerdwallet.com/best/credit-cards/no-annual-fee', 'https://www.nerdwallet.com/best/credit-cards/balance-transfer'],
  'bankrate.com':         ['https://www.bankrate.com/credit-cards/best-credit-cards/', 'https://www.bankrate.com/credit-cards/cash-back/', 'https://www.bankrate.com/credit-cards/travel/', 'https://www.bankrate.com/credit-cards/reviews/', 'https://www.bankrate.com/credit-cards/compare/'],
  'creditkarma.com':      ['https://www.creditkarma.com/credit-cards', 'https://www.creditkarma.com/credit-cards/i/best-cash-back-credit-cards', 'https://www.creditkarma.com/credit-cards/i/best-travel-credit-cards', 'https://www.creditkarma.com/credit-cards/i/best-rewards-credit-cards', 'https://www.creditkarma.com/reviews'],
  'thepointsguy.com':     ['https://thepointsguy.com/credit-cards/best/', 'https://thepointsguy.com/credit-cards/travel/', 'https://thepointsguy.com/credit-cards/cash-back/', 'https://thepointsguy.com/reviews/', 'https://thepointsguy.com/credit-cards/compare/'],
  'wallethub.com':        ['https://wallethub.com/best-credit-cards', 'https://wallethub.com/best/cash-back-credit-cards/8574c', 'https://wallethub.com/best/travel-credit-cards/9126c', 'https://wallethub.com/best/secured-credit-cards/11369c', 'https://wallethub.com/answers/cc/'],
  'forbes.com':           ['https://www.forbes.com/advisor/credit-cards/best/', 'https://www.forbes.com/advisor/credit-cards/best-cash-back-credit-cards/', 'https://www.forbes.com/advisor/credit-cards/best-travel-credit-cards/', 'https://www.forbes.com/advisor/credit-cards/reviews/', 'https://www.forbes.com/advisor/credit-cards/compare/'],
  'cnbc.com':             ['https://www.cnbc.com/select/best-credit-cards/', 'https://www.cnbc.com/select/best-cash-back-credit-cards/', 'https://www.cnbc.com/select/best-travel-credit-cards/', 'https://www.cnbc.com/select/best-no-annual-fee-credit-cards/', 'https://www.cnbc.com/select/credit-cards/'],
  'investopedia.com':     ['https://www.investopedia.com/best-credit-cards-4801582', 'https://www.investopedia.com/best-cash-back-credit-cards-4801556', 'https://www.investopedia.com/best-travel-credit-cards-4800550', 'https://www.investopedia.com/best-no-annual-fee-credit-cards-4767278', 'https://www.investopedia.com/credit-cards/'],
  'reddit.com':           ['https://www.reddit.com/r/personalfinance/', 'https://www.reddit.com/r/CreditCards/', 'https://www.reddit.com/r/financialindependence/', 'https://www.reddit.com/r/churning/', 'https://www.reddit.com/r/CreditCards/wiki/index'],
  'wikipedia.org':        ['https://en.wikipedia.org/wiki/Credit_card', 'https://en.wikipedia.org/wiki/Cashback_reward_program', 'https://en.wikipedia.org/wiki/Rewards_credit_card', 'https://en.wikipedia.org/wiki/Travel_credit_card', 'https://en.wikipedia.org/wiki/Secured_credit_card'],
  'consumerfinance.gov':  ['https://www.consumerfinance.gov/consumer-tools/credit-cards/', 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-credit-card/', 'https://www.consumerfinance.gov/consumer-tools/credit-cards/explore-cards/', 'https://www.consumerfinance.gov/about-us/blog/choosing-right-credit-card/', 'https://www.consumerfinance.gov/consumer-tools/'],
  'wsj.com':              ['https://www.wsj.com/buyside/personal-finance/credit-cards/best-credit-cards', 'https://www.wsj.com/buyside/personal-finance/credit-cards/best-cash-back-credit-cards', 'https://www.wsj.com/buyside/personal-finance/credit-cards/best-travel-credit-cards', 'https://www.wsj.com/buyside/personal-finance/credit-cards/reviews', 'https://www.wsj.com/buyside/personal-finance/credit-cards/'],
};

const PAGE_TITLES: Record<string, string[]> = {
  'nerdwallet.com':       ['Best Credit Cards', 'Best Cash Back Cards', 'Best Travel Cards', 'No Annual Fee Cards', 'Balance Transfer Cards'],
  'bankrate.com':         ['Best Credit Cards', 'Best Cash Back Cards', 'Best Travel Cards', 'Card Reviews', 'Compare Cards'],
  'creditkarma.com':      ['Credit Cards', 'Best Cash Back Cards', 'Best Travel Cards', 'Best Rewards Cards', 'Card Reviews'],
  'thepointsguy.com':     ['Best Credit Cards', 'Best Travel Cards', 'Best Cash Back Cards', 'Card Reviews', 'Compare Cards'],
  'wallethub.com':        ['Best Credit Cards', 'Best Cash Back Cards', 'Best Travel Cards', 'Best Secured Cards', 'Credit Card Answers'],
  'forbes.com':           ['Best Credit Cards', 'Best Cash Back Cards', 'Best Travel Cards', 'Card Reviews', 'Compare Cards'],
  'cnbc.com':             ['Best Credit Cards', 'Best Cash Back Cards', 'Best Travel Cards', 'No Annual Fee Cards', 'All Credit Cards'],
  'investopedia.com':     ['Best Credit Cards', 'Best Cash Back Cards', 'Best Travel Cards', 'No Annual Fee Cards', 'Credit Cards Guide'],
  'reddit.com':           ['r/personalfinance', 'r/CreditCards', 'r/financialindependence', 'r/churning', 'r/CreditCards Wiki'],
  'wikipedia.org':        ['Credit Card', 'Cashback Reward Program', 'Rewards Credit Card', 'Travel Credit Card', 'Secured Credit Card'],
  'consumerfinance.gov':  ['Credit Card Tools', 'What Is a Credit Card?', 'Explore Cards', 'Choosing the Right Card', 'Consumer Tools'],
  'wsj.com':              ['Best Credit Cards', 'Best Cash Back Cards', 'Best Travel Cards', 'Card Reviews', 'Credit Cards'],
};

function SovChart({ brand, sovScore, competitors }: { brand: string; sovScore: number; competitors: any[] }) {
  const bars: { label: string; value: number; isYou: boolean }[] = [
    ...competitors.slice(0, 9).map((c: any) => ({
      label: (c.Brand || '').split(' ')[0],
      value: c.Sov ?? c.SoV ?? c.sov ?? 0,
      isYou: false,
    })),
    { label: brand.split(' ')[0], value: sovScore, isYou: true },
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
  const [accordionOpen, setAccordionOpen] = useState(false);
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
    { key: 'cit', label: 'Citation', weight: 15, q: 'Are your sources being cited?', score: cit, tier: citTier, rankVal: citRank, avgVal: avg(allCit), total: allCit.length - 1 },
    { key: 'sov', label: 'Share of Voice', weight: 15, q: 'How much of the conversation is yours?', score: sov, tier: sovTier, rankVal: sovRank, avgVal: avg(allSov), total: allSov.length - 1 },
  ];

  return (
    <div id="tab-reach">
      <p className="reachTagline">
        How much of the AI conversation{' '}
        <span className="reachAccent">do you own?</span>
      </p>

      <div className="reachCards">
        {signals.map(sig => (
          <div key={sig.key} className="reachCard" style={{ borderLeftColor: sig.tier.text }}>
            <div className="reachCardEyebrow">
              {sig.label}
            </div>
            <div className="reachCardQ">{sig.q}</div>
            <div className="reachCardScoreRow">
              <span className="reachCardNum" style={{ color: sig.tier.text }}>{sig.score}</span>
              <span className="reachChip" style={{ background: sig.tier.bg, color: sig.tier.text }}>{sig.tier.label}</span>
            </div>
            <div className="reachCardRank">#{sig.rankVal} of {sig.total} brands · avg {sig.avgVal}</div>
          </div>
        ))}
      </div>

      <div className="reachAccordion">
        <div className="reachAccordionTrigger" onClick={() => setAccordionOpen(o => !o)}>
          <span className="reachStripText">
            Reach signals carry <strong>30%</strong> of your overall GEO Score
          </span>
          <span className="reachLearnMore">Learn more</span>
          <span className="reachChevron" style={{ transform: accordionOpen ? 'rotate(180deg)' : undefined }}>▾</span>
        </div>
        {accordionOpen && (
          <div className="reachAccordionBody">
            <div className="reachBodyLabel">How Reach is scored</div>
            <p className="reachBodyText">
              Citation and Share of Voice each carry <strong>15%</strong> of your GEO Score.
              Together they measure how much of the AI conversation your brand owns —
              both through sources AI pulls from and the raw volume of mentions.
            </p>
            <div className="reachBodyLabel" style={{ marginTop: 16 }}>Signal definitions</div>
            <div className="reachSignalList">
              <div className="reachSignalRow">
                <div>
                  <div className="reachSignalName" style={{ color: citTier.text }}>Citation</div>
                  <div className="reachSignalDef">How often AI assistants link to or attribute your owned sources when answering category questions.</div>
                </div>
                <span className="reachSignalWt" style={{ color: citTier.text, background: citTier.bg }}>15%</span>
              </div>
              <div className="reachSignalRow">
                <div>
                  <div className="reachSignalName" style={{ color: sovTier.text }}>Share of Voice</div>
                  <div className="reachSignalDef">Your slice of all brand mentions in the category across AI responses, versus the competition.</div>
                </div>
                <span className="reachSignalWt" style={{ color: sovTier.text, background: sovTier.bg }}>15%</span>
              </div>
            </div>
          </div>
        )}
      </div>

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
              const urls = s.isOwned
                ? (OWNED_URLS[brandKey] || [`https://www.${s.domain}/`])
                : (DOMAIN_URLS[s.domain] || [`https://www.${s.domain}/`]);
              const titles = s.isOwned
                ? urls.map((u: string) => u.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '') || '/')
                : (PAGE_TITLES[s.domain] || urls.map((u: string) => u));
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
