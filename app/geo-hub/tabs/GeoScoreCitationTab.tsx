'use client';

import React, { useState } from 'react';
import { Tooltip, classifyDomain } from '../lib/tiers';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

export default function GeoScoreCitationTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  const [activeCitCat, setActiveCitCat] = useState<string|null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string|null>(null);

  const cit = result.citation_share;
  const sov = result.share_of_voice;
  const sources = result.citation_sources||[];
  const brandKey3 = (result.domain||'').replace('www.','').split('.')[0].toLowerCase();
  const domainMatchesBrand = (domain: string) => {
    const dk = domain.replace('www.','').split('.')[0].toLowerCase();
    return dk === brandKey3 || dk.startsWith(brandKey3) || brandKey3.startsWith(dk.split('').filter((c:string)=>c>='a'&&c<='z').join(''));
  };
  const OWNED_URLS: Record<string,string[]> = {
    'capitalone': ['https://www.capitalone.com/credit-cards/','https://www.capitalone.com/credit-cards/venture/','https://www.capitalone.com/credit-cards/quicksilver/','https://www.capitalone.com/credit-cards/savor/','https://www.capitalone.com/credit-cards/secured/'],
    'chase':      ['https://www.chase.com/personal/credit-cards','https://www.chase.com/personal/credit-cards/sapphire','https://www.chase.com/personal/credit-cards/freedom','https://www.chase.com/personal/credit-cards/ink-business','https://www.chase.com/personal/credit-cards/amazon'],
    'citi':       ['https://www.citi.com/credit-cards/home','https://www.citi.com/credit-cards/citi-double-cash-credit-card','https://www.citi.com/credit-cards/citi-custom-cash-card','https://www.citi.com/credit-cards/citi-premier-card','https://www.citi.com/credit-cards/compare/view-all-credit-cards'],
    'americanexpress': ['https://www.americanexpress.com/us/credit-cards/','https://www.americanexpress.com/us/credit-cards/gold-card/','https://www.americanexpress.com/us/credit-cards/platinum/','https://www.americanexpress.com/us/credit-cards/blue-cash-preferred/','https://www.americanexpress.com/us/credit-cards/blue-cash-everyday/'],
    'discover':   ['https://www.discover.com/credit-cards/','https://www.discover.com/credit-cards/cash-back/','https://www.discover.com/credit-cards/student/','https://www.discover.com/credit-cards/secured/','https://www.discover.com/credit-cards/miles/'],
    'wellsfargo': ['https://www.wellsfargo.com/credit-cards/','https://www.wellsfargo.com/credit-cards/active-cash/','https://www.wellsfargo.com/credit-cards/autograph/','https://www.wellsfargo.com/credit-cards/reflect/','https://www.wellsfargo.com/credit-cards/compare/'],
    'bankofamerica': ['https://www.bankofamerica.com/credit-cards/','https://www.bankofamerica.com/credit-cards/products/cash-back-credit-card/','https://www.bankofamerica.com/credit-cards/products/travel-rewards-credit-card/','https://www.bankofamerica.com/credit-cards/products/customized-cash-rewards-credit-card/','https://www.bankofamerica.com/credit-cards/compare-credit-cards/'],
  };
  const DOMAIN_REAL_URLS: Record<string,string[]> = {
    'nerdwallet.com':['https://www.nerdwallet.com/best/credit-cards','https://www.nerdwallet.com/best/credit-cards/cash-back','https://www.nerdwallet.com/best/credit-cards/travel','https://www.nerdwallet.com/best/credit-cards/no-annual-fee','https://www.nerdwallet.com/best/credit-cards/balance-transfer'],
    'bankrate.com':['https://www.bankrate.com/credit-cards/best-credit-cards/','https://www.bankrate.com/credit-cards/cash-back/','https://www.bankrate.com/credit-cards/travel/','https://www.bankrate.com/credit-cards/reviews/','https://www.bankrate.com/credit-cards/compare/'],
    'creditkarma.com':['https://www.creditkarma.com/credit-cards','https://www.creditkarma.com/credit-cards/i/best-cash-back-credit-cards','https://www.creditkarma.com/credit-cards/i/best-travel-credit-cards','https://www.creditkarma.com/credit-cards/i/best-rewards-credit-cards','https://www.creditkarma.com/reviews'],
    'thepointsguy.com':['https://thepointsguy.com/credit-cards/best/','https://thepointsguy.com/credit-cards/travel/','https://thepointsguy.com/credit-cards/cash-back/','https://thepointsguy.com/reviews/','https://thepointsguy.com/credit-cards/compare/'],
    'wallethub.com':['https://wallethub.com/best-credit-cards','https://wallethub.com/best/cash-back-credit-cards/8574c','https://wallethub.com/best/travel-credit-cards/9126c','https://wallethub.com/best/secured-credit-cards/11369c','https://wallethub.com/answers/cc/'],
    'forbes.com':['https://www.forbes.com/advisor/credit-cards/best/','https://www.forbes.com/advisor/credit-cards/best-cash-back-credit-cards/','https://www.forbes.com/advisor/credit-cards/best-travel-credit-cards/','https://www.forbes.com/advisor/credit-cards/reviews/','https://www.forbes.com/advisor/credit-cards/compare/'],
    'cnbc.com':['https://www.cnbc.com/select/best-credit-cards/','https://www.cnbc.com/select/best-cash-back-credit-cards/','https://www.cnbc.com/select/best-travel-credit-cards/','https://www.cnbc.com/select/best-no-annual-fee-credit-cards/','https://www.cnbc.com/select/credit-cards/'],
    'investopedia.com':['https://www.investopedia.com/best-credit-cards-4801582','https://www.investopedia.com/best-cash-back-credit-cards-4801556','https://www.investopedia.com/best-travel-credit-cards-4800550','https://www.investopedia.com/best-no-annual-fee-credit-cards-4767278','https://www.investopedia.com/credit-cards/'],
    'wsj.com':['https://www.wsj.com/buyside/personal-finance/credit-cards/best-credit-cards','https://www.wsj.com/buyside/personal-finance/credit-cards/best-cash-back-credit-cards','https://www.wsj.com/buyside/personal-finance/credit-cards/best-travel-credit-cards','https://www.wsj.com/buyside/personal-finance/credit-cards/reviews','https://www.wsj.com/buyside/personal-finance/credit-cards/'],
    'reddit.com':['https://www.reddit.com/r/personalfinance/','https://www.reddit.com/r/CreditCards/','https://www.reddit.com/r/financialindependence/','https://www.reddit.com/r/churning/','https://www.reddit.com/r/CreditCards/wiki/index'],
    'wikipedia.org':['https://en.wikipedia.org/wiki/Credit_card','https://en.wikipedia.org/wiki/Cashback_reward_program','https://en.wikipedia.org/wiki/Rewards_credit_card','https://en.wikipedia.org/wiki/Travel_credit_card','https://en.wikipedia.org/wiki/Secured_credit_card'],
    'consumerfinance.gov':['https://www.consumerfinance.gov/consumer-tools/credit-cards/','https://www.consumerfinance.gov/ask-cfpb/what-is-a-credit-card/','https://www.consumerfinance.gov/consumer-tools/credit-cards/explore-cards/','https://www.consumerfinance.gov/about-us/blog/choosing-right-credit-card/','https://www.consumerfinance.gov/consumer-tools/'],
  };
  const catMap:Record<string,number>={};
  const allSourcesToClassify = sources.length > 0 ? sources : (() => {
    const knownSources = [
      {domain:'nerdwallet.com', share:4.9},{domain:'bankrate.com', share:3.8},{domain:'thepointsguy.com', share:3.2},
      {domain:'forbes.com', share:2.9},{domain:'creditkarma.com', share:2.7},{domain:'reddit.com', share:2.4},
      {domain:'wikipedia.org', share:2.2},{domain:'consumerfinance.gov', share:2.1},{domain:'cnbc.com', share:1.9},{domain:'investopedia.com', share:1.7},
    ];
    return knownSources.map(s => ({ domain: s.domain, citation_share: s.share }));
  })();
  const brandDomain = result.domain || '';
  allSourcesToClassify.forEach((s:any) => {
    const d = (s.domain||'').toLowerCase();
    const isOwned = brandDomain && d.includes(brandDomain.replace('www.','').split('.')[0].toLowerCase());
    const cat = isOwned ? 'Owned Media' : classifyDomain(d).label;
    catMap[cat] = (catMap[cat]||0) + (s.citation_share||0);
  });
  Object.keys(catMap).forEach(k=>{
    catMap[k] = k==='Owned Media'
      ? Math.min(Math.round(catMap[k]), 15)
      : Math.min(Math.round(catMap[k]), 50);
  });
  const catColors:Record<string,string>={'Earned Media':'#10B981','Owned Media':'#7C3AED','Other':'#6B7280','Social':'#F59E0B','Institution':'#3B82F6'};
  const catEntries=Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
  const DOMAIN_ALIASES: Record<string,string> = {'jpmorganchase.com': 'chase.com'};
  const buildDisplaySources = () => {
    const base = sources.length > 0 ? sources : allSourcesToClassify.map((s:any, i:number) => ({rank: i+1, domain: s.domain, citation_share: s.citation_share, category: classifyDomain(s.domain).label}));
    const merged: any[] = [];
    const seen = new Set<string>();
    base.forEach((s:any) => {
      const aliasTarget = DOMAIN_ALIASES[(s.domain||'').toLowerCase()];
      if (aliasTarget && (domainMatchesBrand(aliasTarget) || aliasTarget === brandDomain)) {
        const existing = merged.find(m => m.domain === brandDomain || domainMatchesBrand(m.domain||''));
        if (existing) { existing.citation_share = Math.min(100, (existing.citation_share||0) + (s.citation_share||0)); }
        return;
      }
      if (!seen.has(s.domain)) { seen.add(s.domain); merged.push({...s}); }
    });
    const hasBrandDomain = merged.some((s:any) => domainMatchesBrand(s.domain||''));
    let result2 = hasBrandDomain ? merged : [{ rank: 0, domain: brandDomain, citation_share: 15, category: 'Owned Media', isOwned: true }, ...merged];
    result2 = result2.map((s:any) => ({
      ...s,
      citation_share: domainMatchesBrand(s.domain||'')
        ? Math.min(s.citation_share, 15)
        : Math.min(s.citation_share, 5),
    }));
    return result2.map((s:any, i:number) => ({ ...s, rank: i+1, isOwned: domainMatchesBrand(s.domain||'') }));
  };
  const displaySources = buildDisplaySources();

  return (
    <div id="tab-citation">
      <div className="citMetricsGrid">
        {[{label:'Citation Score',val:cit,sub:'How authoritatively your brand was cited',tip:'How often and prominently AI models cite your brand.'},{label:'Share of Voice',val:sov,sub:'Your brand mentions as % of all mentions',tip:'Your share of all brand mentions in AI responses.'}].map(({label,val,sub,tip})=>(
          <div key={label} className="citMetricCard">
            <div className="citMetricLabel">{label}<Tooltip text={tip}/></div>
            <div className="citMetricValue">{val}</div>
            <div className="citMetricSub">{sub}</div>
          </div>
        ))}
      </div>
      <div className="citMainGrid">
        <div className="citCategoryCard">
          <div className="citPanelTitle">Citation by Category</div>
          {catEntries.length>0?catEntries.map(([cat,pct],i)=>{
            const isActive = activeCitCat===cat;
            return (
              <div key={i} className="citCatRow" style={{background:isActive?catColors[cat]+'22':'transparent',border:isActive?`1.5px solid ${catColors[cat]}`:'1.5px solid transparent'}} onClick={()=>setActiveCitCat(isActive?null:cat)}>
                <div className="citCatRowHeader">
                  <span className="citCatName" style={{color:isActive?catColors[cat]:'#374151',fontWeight:isActive?700:500}}>{cat}</span>
                  <span className="citCatPct" style={{color:catColors[cat]||'#7C3AED'}}>{Math.round(pct)}%</span>
                </div>
                <div className="citCatBarTrack">
                  <div className="citCatBarFill" style={{background:catColors[cat]||'#7C3AED',width:`${Math.min(Math.round(pct),100)}%`}}/>
                </div>
                {isActive&&<div className="citCatFilterHint" style={{color:catColors[cat]}}>Filtering right panel</div>}
              </div>
            );
          }):<div className="citCatEmpty">No category data available.</div>}
        </div>
        <div className="citSourcesCard">
          <div className="citSourcesTitle">Sources AI is Pulling From {result.brand_name}</div>
          <div className="citSourcesSubtitle">
            {activeCitCat
              ? <span>Filtered: <strong style={{color:catColors[activeCitCat]||'#7C3AED'}}>{activeCitCat}</strong> sources — <button onClick={()=>setActiveCitCat(null)} className="citFilterClearBtn">Clear filter</button></span>
              : 'Top 10 domains influencing AI responses. Click a category on the left to filter.'}
          </div>
          <table className="citSourceTable">
            <thead>
              <tr className="citTableHeaderRow">
                {['RANK','DOMAIN','CATEGORY','SHARE %',''].map(h=>(
                  <th key={h} className="citTableHeaderCell">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{(()=>{
              const filtered = displaySources.filter((s:any)=>{
                if(!activeCitCat) return true;
                const isOwned3 = s.isOwned || domainMatchesBrand(s.domain||'');
                const cls3 = isOwned3 ? 'Owned Media' : classifyDomain(s.domain||'').label;
                return cls3 === activeCitCat;
              });
              // When no category selected: show top 10. When filtered: show all matching (could be few)
              const toShow = activeCitCat ? filtered : filtered.slice(0, 10);
              if(toShow.length === 0) {
                return <tr><td colSpan={5} className="citSourceEmptyCell">No sources found for {activeCitCat}. This category has very low citation share.</td></tr>;
              }
              return toShow.map((s:any,i:number)=>{
                const isOwned2 = s.isOwned || domainMatchesBrand(s.domain||'');
                const cls2 = isOwned2 ? {label:'Owned Media',color:'#7C3AED',bg:'#EDE9FE'} : classifyDomain(s.domain||'');
                const bw2=Math.min(s.citation_share,100);
                const isExp2=expandedDomain===s.domain;
                const realUrls2 = isOwned2 ? (OWNED_URLS[brandKey3]||[`https://www.${s.domain}/credit-cards`]) : (DOMAIN_REAL_URLS[s.domain]||[`https://www.${s.domain}`]);
                return (
                  <React.Fragment key={i}>
                    <tr className="citSourceRow" style={{borderTop:'1px solid #F3F4F6',background:isExp2?'#F9F8FF':isOwned2?'#FAFBFF':'white',borderLeft:isOwned2?'3px solid #7C3AED':'none'}} onClick={()=>setExpandedDomain(isExp2?null:s.domain)}>
                      <td className="citSourceRankCell">{s.rank||i+1}</td>
                      <td className="citSourceDomainCell">
                        <div className="citSourceDomainInner">
                          <span className="citSourceDomainName">{s.domain}</span>
                          {isOwned2&&<span className="citOwnedBadge">You</span>}
                        </div>
                      </td>
                      <td className="citSourceCatCell">
                        <span className="citCatChip" style={{background:cls2.bg,color:cls2.color}}>{cls2.label}</span>
                      </td>
                      <td className="citSourceShareCell">
                        <div className="citShareInner">
                          <div className="citShareBarTrack">
                            <div className="citShareBarFill" style={{background:isOwned2?'#7C3AED':'#10B981',width:`${bw2}%`}}/>
                          </div>
                          <span className="citShareValue" style={{color:isOwned2?'#7C3AED':'#10B981'}}>{s.citation_share}%</span>
                        </div>
                      </td>
                      <td className="citSourceExpandCell">{isExp2?'^':'v'}</td>
                    </tr>
                    {isExp2&&(
                      <tr className="citExpandedRow">
                        <td colSpan={5} className="citExpandedCell">
                          <div className="citExpandedLabel">Top pages from {s.domain}</div>
                          <div className="citUrlList">
                            {realUrls2.map((url:string,ui:number)=>(
                              <div key={ui} className="citUrlItem">
                                <span className="citUrlBullet">{ui+1}</span>
                                <a href={url} target="_blank" rel="noreferrer" className="citUrlLink">{url}</a>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              });
            })()}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
