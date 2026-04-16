========================================================
CHANGE 1 — route.ts: Cap owned media citation_share at 15%
========================================================

FIND (in the buildDisplaySources / citation section near end of POST handler):
  const hasBrandDomain = merged.some((s:any) => domainMatchesBrand(s.domain||''));
  let result2 = hasBrandDomain ? merged : [{ rank: 0, domain: brandDomain, citation_share: 15, category: 'Owned Media', isOwned: true }, ...merged];
  return result2.map((s:any, i:number) => ({ ...s, rank: i+1, isOwned: domainMatchesBrand(s.domain||'') }));

REPLACE WITH:
  const hasBrandDomain = merged.some((s:any) => domainMatchesBrand(s.domain||''));
  let result2 = hasBrandDomain ? merged : [{ rank: 0, domain: brandDomain, citation_share: 15, category: 'Owned Media', isOwned: true }, ...merged];
  // Cap owned media citation share at 15%
  result2 = result2.map((s:any) => ({
    ...s,
    citation_share: domainMatchesBrand(s.domain||'') ? Math.min(s.citation_share, 15) : s.citation_share,
  }));
  return result2.map((s:any, i:number) => ({ ...s, rank: i+1, isOwned: domainMatchesBrand(s.domain||'') }));


========================================================
CHANGE 2 — route.ts: Double total queries display to 100
========================================================

FIND (near end of POST handler, just before return NextResponse.json):
    // Prompts tab display consistency
    let mentionsDisplay = mentions;
    let totalQueriesDisplay = totalQueries;
    if (indKey === 'fin' || indKey === 'fin_small_business_cc') {
      mentionsDisplay = Math.round((visOverride / 100) * totalQueries);
    }

REPLACE WITH:
    // Prompts tab display consistency — scale to 100 queries
    const DISPLAY_MULTIPLIER = 2; // show 100 queries instead of 50
    let mentionsDisplay = Math.round((visOverride / 100) * totalQueries * DISPLAY_MULTIPLIER);
    let totalQueriesDisplay = totalQueries * DISPLAY_MULTIPLIER;
