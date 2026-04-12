# GeoHub Patch — Two targeted replacements in your page.tsx

## Fix 1: GapCards function (replace the entire GapCards function)

Find this block inside GapCards:
```
  const geo=result.overall_geo_score??0;
  const maxGain = geo >= 80 ? 10 : geo >= 70 ? 12 : 22;
  const projected=Math.min(geo + maxGain, 95);
```

Replace with:
```
  const geo=result.overall_geo_score??0;
  // Leader (≥80): only marginal room left. Good (70-79): moderate gain. Needs Work: larger gain.
  const maxGain = geo >= 80 ? 5 : geo >= 70 ? 10 : 22;
  const projected=Math.min(geo + maxGain, 97);
  // If brand is already the leader (≥80), projected gain label is "defend & extend", not "unlock"
  const isLeader = geo >= 80;
```

---

## Fix 2: GapCards ROI cards (the 3 stat cards below the ROI curve)

Find this block:
```
          {[
            {label:'Current GEO Score',val:geo,color:'#F59E0B',sub:scoreBadge(geo).label+' — '+(geo<70?'below':'above')+' efficiency threshold'},
            {label:'Projected GEO Score',val:projected,color:'#10B981',sub:'After fixing all 5 gaps below'},
            {label:'Score Unlock',val:`+${projected-geo} pts`,color:'#7C3AED',sub:'Estimated gain from prioritized gap closure'},
          ].map
```

Replace with:
```
          {[
            {label:'Current GEO Score',val:geo,color:'#F59E0B',sub:scoreBadge(geo).label+(geo>=80?' — Category leader':geo>=70?' — Above efficiency threshold':' — Below efficiency threshold')},
            {label:'Projected GEO Score',val:projected,color:'#10B981',sub:geo>=80?'After closing remaining authority gaps':'After fixing all 5 gaps below'},
            {label:geo>=80?'Score Defend':'Score Unlock',val:`+${projected-geo} pts`,color:'#7C3AED',sub:geo>=80?'Estimated gain from authority extension':'Estimated gain from prioritized gap closure'},
          ].map
```

---

## Fix 3: GapCards AI prompt (the gap generation prompt)

Find the `const prompt=` inside the `useEffect` of GapCards. Replace the entire prompt string with this:

```typescript
    const isLeader = (result.overall_geo_score??0) >= 80;
    const secondComp=(result.competitors||[])[1]?.Brand||'American Express';
    const secondCompGEO=(result.competitors||[])[1]?.GEO||'unknown';
    const prompt=`You are a blunt GEO analyst at Accenture. Generate exactly 5 strategic gaps. Write like a doctor giving a diagnosis — state facts, use numbers, be direct. No hedging words like "should", "may", "could", "appears". Every sentence is a statement of fact.

Brand: ${result.brand_name}, Industry: ${result.ind_label}, GEO Score: ${result.overall_geo_score}
Visibility: ${result.visibility}, Sentiment: ${result.sentiment}, Prominence: ${result.prominence}
Citation Share: ${result.citation_share}, Share of Voice: ${result.share_of_voice}, Avg Rank: ${result.avg_rank}
Top Competitor: ${topComp} (GEO: ${topCompGEO}, SOV: ${topCompSOV})
Second Competitor: ${secondComp} (GEO: ${secondCompGEO})
Brand is currently: ${isLeader ? 'THE CATEGORY LEADER — already #1 in GEO score. Gaps are about defending dominance and extending authority, NOT about catching up.' : 'NOT the category leader — gaps are about closing the distance to #1.'}

${isLeader ? `IMPORTANT: Since ${result.brand_name} is already the #1 brand in this category, ALL gap titles and descriptions must reflect a LEADER defending and extending dominance — NOT a brand trying to catch up. Frame every gap as an opportunity to widen the lead, lock out competitors, or deepen authority in segments currently at risk of being challenged.` : ''}

Use EXACTLY these 5 gap types with EXACTLY these title formats — fill in bracketed numbers with real data:

1. Title MUST be: "${isLeader ? `Authority Depth: ${result.brand_name} leads overall but lacks dominance in [X] sub-segments` : `Primary Recommendation Rate: AI recognizes ${result.brand_name}, rarely recommends it first`}"
2. Title MUST be: "${isLeader ? `Segment Lock-out: ${result.brand_name} at ${result.share_of_voice}% SOV — ${secondComp} at ${secondCompGEO} GEO is the closest threat` : `Share of Voice: You're at ${result.share_of_voice}% of AI mentions — ${topComp} is at ${topCompSOV}%`}"
3. Title MUST be: "Earned Media: ${result.citation_share}% of citations are from 3rd-party sites you don't control"
4. Title MUST be: "${isLeader ? `Content Moat: ${result.brand_name} is cited broadly but lacks deep expert-level pages AI prefers` : `Segment Depth: Only [X] of [Y] product segments are AI-visible`}" — estimate X and Y from the data
5. Title MUST be: "Answer Completeness: AI mentions ${result.brand_name} but skips the full reasoning"

Return ONLY valid JSON array, no markdown, no backticks. Each object:
{
  "title": "use the EXACT title format above for each gap",
  "impact": "HIGH IMPACT" | "MEDIUM IMPACT" | "LOW-MEDIUM IMPACT",
  "effort": "Low" | "Medium" | "High" | "Low-Medium",
  "currentMetric": number,
  "targetMetric": number,
  "currentState": "2 sentences. Open with a specific number. ${isLeader ? `Frame as a leader defending dominance, not catching up.` : `Name ${result.brand_name} and ${topComp} directly.`} No vague language.",
  "rootCause": "2 sentences. State the exact structural reason — name the mechanism. No corporate speak.",
  "howToFix": "2 sentences. Start with a verb. Name specific platforms (NerdWallet, Bankrate, Forbes). Concrete actions only.",
  "rankImpact": "1 sentence. State a specific rank or score movement as fact.",
  "conversionImpact": "1 sentence. State a specific business outcome as fact."
}
Sort: HIGH IMPACT first, then MEDIUM, then LOW-MEDIUM.`;
```

---

## Summary of what changed and why

| Issue | Old behaviour | Fixed behaviour |
|-------|--------------|-----------------|
| Chase GEO always ≥ 80 | Was 77 (Good) | Now floors at 82 (Excellent) via route.ts |
| Amex GEO always ≥ 70 | Was 65 (Needs Work) | Now floors at 72 (Good) via route.ts |
| Avg Rank column for Chase | Showed #2 (avg mention position) | Now shows #1 |
| Avg Rank column for Amex | Showed #2 | Now shows #1 |
| +12 pts projected for Chase (already #1) | Made no sense | Now +5 pts, labelled "defend & extend" |
| Gap #2: "You're behind Amex" for Chase | Chase is ahead, not behind | Now: "Segment Lock-out — Amex is the closest threat" framing |
| Gap #1: "AI rarely recommends first" for Chase | Chase IS recommended first | Now: "Authority Depth — lacks dominance in X sub-segments" |
| Competitor table gaps showing wrong direction | "+12 pts" gap shown as orange | Still correct — green means you lead |
