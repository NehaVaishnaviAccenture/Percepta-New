import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL        = 'openai/gpt-5.4';
const ANSWER_BATCH = 20;  // 20 Qs × ~150 tokens/answer = ~3000 tokens — safe ceiling
const QUERY_BATCH  = 20;  // 20 queries per generation call — reliable JSON return

// ─── AI CALL ──────────────────────────────────────────────────────────────
// Signature: (messages, temperature, max_tokens, retries)
// max_tokens is ALWAYS passed explicitly — never rely on default
async function callAI(
  messages    : { role: string; content: string }[],
  temperature = 0.1,
  max_tokens  = 1500,
  retries     = 2
): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization : `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://perceptageo.com',
          'X-Title'     : 'Percepta',
        },
        body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens }),
      });
      const data    = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (content.length > 0) return content;
    } catch {
      if (attempt === retries) return '';
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  return '';
}

// ─── HTML HELPERS ──────────────────────────────────────────────────────────
function extractTag(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}
function extractMeta(html: string, name: string): string {
  const a = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'));
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i'));
  return (a || b)?.[1]?.trim() || '';
}
function extractHeadings(html: string, max = 20): string[] {
  return [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .slice(0, max)
    .map((m: RegExpMatchArray) => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
}
function extractBodyText(html: string, maxChars = 4000): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}
function extractInternalLinks(html: string, baseUrl: string, max = 12): { url: string; path: string; label: string }[] {
  const seen  = new Set<string>();
  const links : { url: string; path: string; label: string }[] = [];
  for (const m of html.matchAll(/href=["'](\/?[a-zA-Z0-9/_\-\.]+)["']/g)) {
    if (links.length >= max) break;
    const href = m[1];
    if (href.startsWith('/') && href.length > 1 && !seen.has(href)) {
      seen.add(href);
      const label = href.replace(/^\//, '').replace(/-/g, ' ').replace(/\//g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Page';
      try { links.push({ url: new URL(href, baseUrl).toString(), path: href, label }); } catch {}
    }
  }
  return links;
}

// ─── FETCH PAGE ─────────────────────────────────────────────────────────────
async function fetchPage(url: string) {
  try {
    const res     = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
    const html    = await res.text();
    const domain  = new URL(url).hostname.replace('www.', '');
    const urlPath = new URL(url).pathname;
    return {
      ok: true, url, domain, urlPath,
      title        : extractTag(html, 'title'),
      metaDesc     : extractMeta(html, 'description'),
      headings     : extractHeadings(html),
      bodyText     : extractBodyText(html),
      hasSchema    : html.includes('application/ld+json'),
      wordCount    : extractBodyText(html).split(/\s+/).length,
      internalLinks: extractInternalLinks(html, url),
    };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ─── BRAND DISCOVERY ────────────────────────────────────────────────────────
async function discoverBrand(page: any, url: string) {
  const pageText = [
    `Full URL: ${url}`,
    `URL path: ${page.urlPath || '/'}`,
    `Title: ${page.title || ''}`,
    `Meta: ${page.metaDesc || ''}`,
    ...((page.headings || []).slice(0, 12) as string[]),
    (page.bodyText || '').slice(0, 2000),
  ].join('\n');

  const raw = await callAI([{ role: 'user', content:
`You are a brand intelligence analyst. Read this webpage and return ONLY valid JSON — no markdown.

${pageText}

Return exactly:
{
  "brand_name": "parent company brand (Citi, Chase, Nike) — never a product name",
  "industry": "precise industry for THIS URL path — /credit-cards = Consumer Credit Cards, / for a bank = Retail Banking",
  "industry_key": "snake_case e.g. credit_cards, retail_banking",
  "lob": "exact product on THIS page — specific to URL path",
  "personas": ["5 distinct buyer personas. Format: 'Descriptor — specific need'"],
  "competitors": ["10 direct competitors for THIS specific product"],
  "competitor_urls": {"BrandName": "domain.com"},
  "categories": ["10 specific consumer intent categories for THIS product"]
}
brand_name = parent brand only. industry + categories must match URL path, not homepage.` }],
    0.1, 1200); // explicit max_tokens

  try {
    const p = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return {
      brand         : (p.brand_name || new URL(url).hostname.replace('www.', '').split('.')[0]) as string,
      industry      : (p.industry        || 'Consumer Products') as string,
      industryKey   : (p.industry_key    || 'general') as string,
      lob           : (p.lob             || '') as string,
      personas      : ((p.personas       || []) as string[]).slice(0, 5),
      competitors   : ((p.competitors    || []) as string[]).slice(0, 10),
      competitorUrls: (p.competitor_urls || {}) as Record<string, string>,
      categories    : ((p.categories     || []) as string[]).slice(0, 10),
    };
  } catch {
    const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
    return {
      brand: domain.charAt(0).toUpperCase() + domain.slice(1),
      industry: 'Consumer Products', industryKey: 'general', lob: '',
      personas: [] as string[], competitors: [] as string[],
      competitorUrls: {} as Record<string, string>, categories: [] as string[],
    };
  }
}

// ─── QUERY GENERATION ────────────────────────────────────────────────────────
// Persona × Stage × Intent matrix — fully AI-generated, zero hardcoding.
// Max 20 per AI call so JSON return is always complete.
// All calls fire in parallel.
// Queries are framed to force brand-naming answers.

const STAGES = [
  { name: 'Awareness',     pct: 0.15, desc: 'just discovering this product category exists' },
  { name: 'Consideration', pct: 0.30, desc: 'comparing options, wants specific brand recommendations' },
  { name: 'Decision',      pct: 0.30, desc: 'ready to choose, needs the definitive answer' },
  { name: 'Validation',    pct: 0.15, desc: 'double-checking a choice, looking for real reviews' },
  { name: 'Advocacy',      pct: 0.10, desc: 'helping someone else choose, or maximising value' },
];

async function generateChunk(
  lob      : string,
  industry : string,
  cats     : string[],
  personas : string[],
  stage    : typeof STAGES[0],
  count    : number,
  chunkIdx : number
): Promise<{ category: string; query: string; stage: string; persona: string }[]> {
  if (count <= 0) return [];

  const p4 = personas.length > 0
    ? [...personas.slice(chunkIdx % Math.max(personas.length, 1)), ...personas].slice(0, 4)
    : ['everyday consumer', 'budget-focused buyer', 'experienced user', 'first-time buyer'];

  const offset = (chunkIdx * 3) % Math.max(cats.length, 1);
  const c5 = cats.length > 0 ? [...cats.slice(offset), ...cats].slice(0, 5) : ['General'];

  const raw = await callAI([{ role: 'user', content:
`Generate EXACTLY ${count} realistic questions a consumer types into ChatGPT when researching ${lob || industry}.

Journey stage: ${stage.name} (${stage.desc})
Personas: ${p4.slice(0, 3).join(' | ')}
Categories to cover: ${c5.join(', ')}

Rules:
- NO brand or company names in any query
- Each question must naturally lead to brand recommendations in the answer
- Include specific details: spend amounts, credit scores, life situations
- Conversational tone, like a real person typed it

Examples of good queries:
"which credit card gives the best cash back for someone spending $700/month on groceries and gas"
"what bank do financial experts recommend for a high-yield savings account with no minimum balance"
"which cards are worth it for someone with a 780 credit score who travels 4 times a year"

Return ONLY a JSON array:
[{"category":"CategoryName","query":"the question","stage":"${stage.name}","persona":"brief descriptor"}]
Return exactly ${count} items, no more, no less.` }],
    0.4,
    Math.max(2000, count * 130),
    2
  );

  // Robust extraction — handles JSON wrapped in text, markdown, or explanation
  try {
    // Try direct parse first
    const cleaned = raw.replace(/```json|```/g, '').trim();
    // Extract just the JSON array even if there's text before/after
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return [];
    const parsed = JSON.parse(arrayMatch[0]);
    if (!Array.isArray(parsed)) return [];
    // Filter out any item missing required fields
    const valid = parsed.filter((item: any) =>
      item && typeof item.query === 'string' && item.query.length > 10
    );
    return valid.slice(0, count);
  } catch {
    return [];
  }
}

async function generateQueries(
  lob      : string,
  industry : string,
  cats     : string[],
  personas : string[],
  total    : number
): Promise<{ category: string; query: string; stage: string; persona: string }[]> {

  const stageCounts = STAGES.map((s: typeof STAGES[0]) => ({ ...s, count: Math.round(total * s.pct) }));
  // Fix rounding — Consideration absorbs remainder
  const diff = total - stageCounts.reduce((sum: number, s: any) => sum + s.count, 0);
  stageCounts[1].count += diff;

  // Split into chunks of QUERY_BATCH max
  const jobs: { stage: typeof STAGES[0]; count: number; chunkIdx: number }[] = [];
  stageCounts.forEach((s: any) => {
    let rem = s.count, ci = 0;
    while (rem > 0) {
      jobs.push({ stage: s, count: Math.min(rem, QUERY_BATCH), chunkIdx: ci++ });
      rem -= QUERY_BATCH;
    }
  });

  // All chunks fire in parallel
  const results = await Promise.all(
    jobs.map((j: any) => generateChunk(lob, industry, cats, personas, j.stage, j.count, j.chunkIdx))
  );

  const all = results.flat();

  // Fallback padding — only if AI generation failed for some chunks
  // These are brand-inviting and specific, not generic templates
  if (all.length < total) {
    const productLabel = lob || industry || 'this product';
    const fallbackPool = [
      `Which ${productLabel} is most recommended by financial experts right now?`,
      `What is the highest rated ${productLabel} for someone with excellent credit?`,
      `Which company offers the best ${productLabel} with no annual fee?`,
      `What ${productLabel} do most consumers switch to when they want better rewards?`,
      `Which ${productLabel} consistently ranks #1 in independent reviews?`,
      `What ${productLabel} is best for someone who wants everything in one place?`,
      `Which ${productLabel} gives the most value for someone spending $1000/month?`,
      `What ${productLabel} do wealth managers recommend for high earners?`,
      `Which ${productLabel} has the best customer satisfaction ratings?`,
      `What is the most popular ${productLabel} among consumers with 750+ credit scores?`,
    ];
    let fi = 0;
    while (all.length < total) {
      const cat = cats[fi % Math.max(cats.length, 1)] || 'General';
      const st  = STAGES[fi % STAGES.length];
      all.push({
        category: cat,
        query   : fallbackPool[fi % fallbackPool.length],
        stage   : st.name,
        persona : 'general consumer',
      });
      fi++;
    }
  }

  return all.slice(0, total);
}

// ─── BUILD ALIASES ──────────────────────────────────────────────────────────
// BUG FIX: minimum word length raised from 2 to 5 chars for split words
// "express" was matching "expressly", "expression" etc — false positives
function buildAliases(brand: string): string[] {
  const bl  = brand.toLowerCase().trim();
  const set = new Set<string>([bl, bl.replace(/\s+/g, ''), bl.replace(/\s+/g, '-'), bl.replace(/[^a-z0-9]/gi, '')]);
  // Only add individual words if they're long enough to be unambiguous (≥5 chars)
  bl.split(/[\s'\-\.&]+/).filter((w: string) => w.length >= 5).forEach((w: string) => set.add(w));
  return [...set].filter((a: string) => a.length >= 3);
}

// ─── BRAND POSITION ─────────────────────────────────────────────────────────
// Counts how many distinct brand-like proper nouns appear before ours.
// BUG FIX: "American Express" — full brand name found first, before="" so position=1 correctly.
// Short words filtered from proper noun detection to reduce false positives.
function getBrandPosition(text: string, aliases: string[]): number {
  if (!text) return 0;
  const tl = text.toLowerCase();

  let firstIdx = Infinity;
  for (const a of aliases) {
    const idx = tl.indexOf(a);
    if (idx >= 0 && idx < firstIdx) firstIdx = idx;
  }
  if (firstIdx === Infinity) return 0;

  const before    = text.slice(0, firstIdx);
  const stopWords = new Set([
    'The','This','That','These','Those','When','Where','What','Which','How','Why',
    'For','And','But','Or','In','On','At','To','Of','With','As','By','From','An',
    'If','It','Its','Are','Is','Be','Was','Were','Has','Have','Had','Here','Some',
    'Many','Most','More','Such','Each','Both','Also','Very','Just','About','After',
    'Before','Between','During','Since','Without','Within','Along','Across','Behind',
    'Beyond','Plus','Except','Up','Out','Around','Down','Off','Above','Below',
  ]);
  // Only count Title Case words 4+ chars as brands (avoids "In", "On", "The" etc)
  const properNouns = (before.match(/\b[A-Z][a-z]{3,}(?:\s+[A-Z][a-z]{2,})*/g) || [])
    .filter((w: string) => !stopWords.has(w));
  return properNouns.length + 1;
}

// ─── PARSE ANSWERS ───────────────────────────────────────────────────────────
// Robust two-pass parser.
// Pass 1: marker-based (A1:, A2:, ...)
// Pass 2: line-split fallback if pass 1 fills < 50%
function parseAnswers(raw: string, count: number): string[] {
  const answers: string[] = new Array(count).fill('');

  // Pass 1: find each A{n}: marker
  for (let j = 0; j < count; j++) {
    const marker     = `A${j + 1}:`;
    const nextMarker = `A${j + 2}:`;
    if (!raw.includes(marker)) continue;
    const start  = raw.indexOf(marker) + marker.length;
    const hasNext = j + 1 < count && raw.indexOf(nextMarker) > start;
    const end    = hasNext ? raw.indexOf(nextMarker) : raw.length;
    answers[j]   = raw.slice(start, end).trim();
  }

  // Pass 2: line-split fallback
  const filled = answers.filter((a: string) => a.length > 15).length;
  if (filled < count * 0.5) {
    const lines = raw.split('\n')
      .map((l: string) => l.replace(/^A\d+:\s*/, '').trim())
      .filter((l: string) => l.length > 15);
    for (let j = 0; j < count && j < lines.length; j++) {
      if (!answers[j] || answers[j].length < 15) answers[j] = lines[j];
    }
  }

  return answers;
}

// ─── SCORE COMPUTATION ───────────────────────────────────────────────────────
//
// VISIBILITY     = % of answered queries mentioning the brand
// PROMINENCE     = scaled from avg position (pos1→100, pos2→82, pos3→64, pos4→46, pos5→28)
// SENTIMENT      = positive vs negative word ratio in brand sentences, base 50
// CITATION SHARE = sum(1/pos) across mentions, scaled relative to visibility
//                  BUG FIX: scaled to visibility range so it's proportional not always tiny
// SHARE OF VOICE = brand-mentioned responses / all responses mentioning any brand (Set-based)
//                  BUG FIX: Set prevents one response with 5 brands inflating denominator 5×
// GEO SCORE      = Vis×0.30 + Sen×0.20 + Prom×0.20 + Cit×0.15 + SOV×0.15
//
function computeScores(brand: string, aliases: string[], qa: any[], competitors: string[]) {
  const answered     = qa.filter((r: any) => r && (r.a || '').trim().length > 15);
  const total        = answered.length || 1;

  // VISIBILITY
  const mentioned    = answered.filter((r: any) => aliases.some((a: string) => (r.a || '').toLowerCase().includes(a)));
  const mentionCount = mentioned.length;
  const visibility   = Math.round((mentionCount / total) * 100);

  // PROMINENCE
  const positions = mentioned
    .map((r: any) => getBrandPosition(r.a || '', aliases))
    .filter((p: number) => p > 0);
  const avgPos    = positions.length > 0 ? positions.reduce((a: number, b: number) => a + b, 0) / positions.length : 0;
  const prominence = mentionCount > 0 ? Math.round(Math.max(10, Math.min(95, 100 - (avgPos - 1) * 18))) : 0;

  // SENTIMENT
  const POS = ['best','top','recommended','leading','excellent','great','trusted','popular',
    'ideal','perfect','outstanding','superior','preferred','reliable','strong','impressive',
    'generous','competitive','solid','standout','exceptional','renowned','well-known','award'];
  const NEG = ['worst','poor','bad','avoid','expensive','weak','limited','disappointing',
    'inferior','mediocre','unreliable','overpriced','problematic','lacking','outdated',
    'complicated','confusing','frustrating','hidden fees','complaints','issues'];
  let pos = 0, neg = 0;
  mentioned.forEach((r: any) => {
    (r.a || '').toLowerCase().split(/[.!?]+/)
      .filter((s: string) => aliases.some((a: string) => s.includes(a)))
      .forEach((s: string) => {
        POS.forEach((w: string) => { if (s.includes(w)) pos++; });
        NEG.forEach((w: string) => { if (s.includes(w)) neg++; });
      });
  });
  const sentimentBase = mentionCount > 0 ? 50 : 0;
  const sentimentAdj  = (pos + neg) > 0 ? Math.round(((pos - neg) / (pos + neg)) * 35) : 0;
  const sentiment     = Math.round(Math.max(0, Math.min(100, sentimentBase + sentimentAdj + prominence * 0.08)));

  // CITATION SHARE
  // citWeight = sum of 1/position for each mention
  // Scale: if brand has 50% visibility and avg pos 3, citWeight ≈ 50×(1/3) = 16.7
  // Relative to max possible (visibility% if all at pos 1): 16.7/50 = 0.33 → 33 out of 50 max
  // So citation share sits proportionally within the visibility range — makes sense
  const citWeight     = positions.reduce((sum: number, p: number) => sum + 1 / p, 0);
  const maxCitWeight  = mentionCount > 0 ? mentionCount : 1; // best case: all mentioned at #1
  const citationShare = Math.round(Math.min(95, (citWeight / maxCitWeight) * visibility));

  // SHARE OF VOICE — Set-based to prevent denominator inflation
  const topComps              = (competitors as string[]).slice(0, 8);
  const brandMentionedSet     = new Set<number>();
  const anyBrandMentionedSet  = new Set<number>();
  answered.forEach((r: any, i: number) => {
    const t = (r.a || '').toLowerCase();
    if (aliases.some((a: string) => t.includes(a))) {
      brandMentionedSet.add(i);
      anyBrandMentionedSet.add(i);
    }
    topComps.forEach((comp: string) => {
      const ca = buildAliases(comp);
      if (ca.some((a: string) => t.includes(a))) anyBrandMentionedSet.add(i);
    });
  });
  const sovDenominator = anyBrandMentionedSet.size || 1;
  const shareOfVoice   = Math.round((brandMentionedSet.size / sovDenominator) * 100);

  // GEO SCORE
  const geo = Math.round(
    visibility    * 0.30 +
    sentiment     * 0.20 +
    prominence    * 0.20 +
    citationShare * 0.15 +
    shareOfVoice  * 0.15
  );

  return {
    visibility, prominence, sentiment, citationShare, shareOfVoice, geo,
    avgRank     : positions.length > 0 ? `#${Math.round(avgPos)}` : 'N/A',
    mentionCount,
    totalCount  : answered.length,
  };
}

// ─── COMPETITOR SCORING — same function, same responses ────────────────────
function scoreCompetitor(name: string, compUrl: string, qa: any[], allComps: string[]) {
  const aliases = buildAliases(name);
  const s       = computeScores(name, aliases, qa, (allComps as string[]).filter((c: string) => c !== name));
  return {
    Brand: name,
    URL  : compUrl || `${name.toLowerCase().replace(/\s+/g, '')}.com`,
    GEO  : s.geo, Vis: s.visibility, Cit: s.citationShare,
    Sen  : s.sentiment, Sov: s.shareOfVoice, Prom: s.prominence, Rank: s.avgRank,
  };
}

// ─── QUERY CLUSTERS ─────────────────────────────────────────────────────────
function buildClusters(qa: any[], aliases: string[], competitors: string[]) {
  const cats = [...new Set(qa.filter(Boolean).map((r: any) => r.category).filter(Boolean))] as string[];

  return cats.map((cat: string) => {
    const rows     = qa.filter((r: any) => r && r.category === cat);
    const answered = rows.filter((r: any) => (r.a || '').trim().length > 15);
    const hits     = answered.filter((r: any) => aliases.some((a: string) => (r.a || '').toLowerCase().includes(a)));
    const winRate  = answered.length > 0 ? Math.round((hits.length / answered.length) * 100) : 0;

    const compCounts: Record<string, number> = {};
    answered.forEach((r: any) => {
      const t = (r.a || '').toLowerCase();
      (competitors as string[]).forEach((c: string) => {
        const ca = buildAliases(c);
        if (ca.some((a: string) => t.includes(a)) && !aliases.some((a: string) => t.includes(a) && c.toLowerCase().includes(a)))
          compCounts[c] = (compCounts[c] || 0) + 1;
      });
    });
    const topCompetitor = Object.entries(compCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    const stageBreakdown: Record<string, { total: number; mentioned: number }> = {};
    rows.forEach((r: any) => {
      const s = r.stage || 'Consideration';
      if (!stageBreakdown[s]) stageBreakdown[s] = { total: 0, mentioned: 0 };
      stageBreakdown[s].total++;
      if (aliases.some((a: string) => (r.a || '').toLowerCase().includes(a))) stageBreakdown[s].mentioned++;
    });

    return { category: cat, total: answered.length, mentioned: hits.length, winRate, topCompetitor, dailySearches: 0, related: [], stageBreakdown };
  });
}

// ─── EXTRACT CITATIONS from real AI responses ───────────────────────────────
function extractCitations(qa: any[], brandDomain: string) {
  const counts: Record<string, number> = {};
  const sources = ['nerdwallet','bankrate','reddit','wikipedia','forbes','cnbc','investopedia',
    'creditkarma','thepointsguy','wallethub','consumerreports','businessinsider','motleyfool',
    'wsj','marketwatch','bloomberg','cnet','edmunds','caranddriver','motortrend','experian','lendingtree'];

  qa.filter(Boolean).forEach((r: any) => {
    const t = (r.a || '').toLowerCase();
    sources.forEach((src: string) => {
      if (t.includes(src)) counts[src + '.com'] = (counts[src + '.com'] || 0) + 1;
    });
    for (const m of t.matchAll(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.[a-z]{2,})/g)) {
      const d = m[1];
      if (d.length > 4 && !d.includes('example')) counts[d] = (counts[d] || 0) + 1;
    }
  });

  const clean = brandDomain.replace('www.', '');
  if (!counts[clean]) counts[clean] = 1;
  const total = Object.values(counts).reduce((a: number, b: number) => a + b, 1);

  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map((e, i) => ({
      rank: i + 1, domain: e[0],
      citation_share: Math.round((e[1] / total) * 100),
      top_pages: [],
      category: e[0] === clean ? 'Owned Media'
        : ['reddit','twitter','youtube','facebook','linkedin'].some((s: string) => e[0].includes(s)) ? 'Social'
        : ['wikipedia','gov','edu','consumerreports','fdic','ftc'].some((s: string) => e[0].includes(s)) ? 'Institution'
        : 'Earned Media',
    }));
}

// ─── MAIN POST HANDLER ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url, promptCount } = await req.json();
    const MAX = Math.min(Math.max(promptCount || 300, 50), 1000);

    // 1. Fetch page
    const page = await fetchPage(url);
    if (!page.ok) return NextResponse.json({ error: (page as any).error }, { status: 400 });

    // 2. Discover brand, industry, competitors, personas — URL-path aware
    const d = await discoverBrand(page, url);
    const { brand, industry, industryKey, lob, personas, competitors, competitorUrls, categories } = d;
    const aliases = buildAliases(brand);

    // 3. Generate queries + citations + trending — all parallel
    // generateQueries fires many sub-calls internally, all in parallel
    const [queries, citRaw, trendRaw] = await Promise.all([

      generateQueries(lob, industry, categories, personas, MAX),

      callAI([{ role: 'user', content:
`List 10 real domains AI models cite for ${lob || industry} questions in the USA.
Brand: ${brand} (domain: ${(page as any).domain}).
Return ONLY valid JSON:
[{"rank":1,"domain":"example.com","category":"Earned Media","citation_share":4.2,"top_pages":[]}]
Categories: Social, Institution, Earned Media, Owned Media, Other.
First entry = ${(page as any).domain} as Owned Media. Exactly 10 items.` }],
        0.1, 900),

      callAI([{ role: 'user', content:
`List 10 high-intent questions consumers ask AI about ${lob || industry} in the USA right now. No brand names.
Return ONLY valid JSON:
[{"query":"...","trend":"Rising","opportunity":"High","category":"${categories[0] || 'General'}","estimated_daily_searches":8200}]
Exactly 10 items. trend: Rising/Peak/Stable/Declining. opportunity: High/Medium/Low.` }],
        0.3, 900),
    ]);

    // 4. Answer all queries — parallel batches of ANSWER_BATCH
    // max_tokens = 4000 for answer calls — 20 answers × ~150 tokens = ~3000, fits comfortably
    const allQA: any[] = new Array(queries.length).fill(null);
    const batches: typeof queries[] = [];
    for (let i = 0; i < queries.length; i += ANSWER_BATCH) {
      batches.push(queries.slice(i, i + ANSWER_BATCH));
    }

    await Promise.all(
      batches.map(async (batch, bi) => {
        const ql     = batch.map((q, j) => `Q${j + 1}: ${q.query}`).join('\n\n');
        const labels = batch.map((_, j) => `A${j + 1}:`).join('\n');

        const prompt =
`You are a knowledgeable, balanced consumer advisor for ${lob || industry}.

RULES:
- Name specific real brands in EVERY answer — never be generic
- Name 2-4 brands per answer where applicable
- Be accurate and balanced — don't favour one brand
- Keep each answer to 1-3 sentences — concise and specific

${ql}

Respond with this exact format:
${labels}`;

        // BUG FIX: explicit max_tokens=4000, retries=2
        const raw     = await callAI([{ role: 'user', content: prompt }], 0.3, 4000, 2);
        const answers = parseAnswers(raw, batch.length);

        batch.forEach((q, j) => {
          allQA[bi * ANSWER_BATCH + j] = {
            category: q.category, stage: q.stage, persona: q.persona,
            q: q.query, a: answers[j] || '',
          };
        });
      })
    );

    // Fill nulls from any failed batches
    for (let i = 0; i < allQA.length; i++) {
      if (!allQA[i]) allQA[i] = {
        category: queries[i]?.category || '', stage: queries[i]?.stage || '',
        persona: queries[i]?.persona || '', q: queries[i]?.query || '', a: '',
      };
    }

    // 5. Score brand
    const scores = computeScores(brand, aliases, allQA, competitors);

    // 6. Score every competitor — identical function, identical response pool
    const competitorScores = (competitors as string[])
      .filter((c: string) => c.toLowerCase() !== brand.toLowerCase())
      .map((c: string) => scoreCompetitor(c, competitorUrls[c] || '', allQA, competitors))
      .sort((a, b) => b.GEO - a.GEO);

    // 7. Response detail
    const responsesDetail = allQA.filter(Boolean).map((r: any) => ({
      category: r.category, stage: r.stage, persona: r.persona, query: r.q,
      mentioned       : aliases.some((a: string) => (r.a || '').toLowerCase().includes(a)),
      response_preview: r.a || '',
      position        : getBrandPosition(r.a || '', aliases),
      winner_brand    : (() => {
        let winner = '', winPos = Infinity;
        const brandPos = getBrandPosition(r.a || '', aliases);
        (competitors as string[]).slice(0, 12).forEach((c: string) => {
          const ca  = buildAliases(c);
          const pos = getBrandPosition(r.a || '', ca);
          if (pos > 0 && pos < winPos && (brandPos === 0 || pos < brandPos)) { winPos = pos; winner = c; }
        });
        return winner || null;
      })(),
    }));

    // 8. Clusters
    const queryClusters = buildClusters(allQA, aliases, competitors);

    // 9. Stage win rates
    const stageWinRates = STAGES.map((s: typeof STAGES[0]) => {
      const rows     = allQA.filter((r: any) => r && r.stage === s.name);
      const answered = rows.filter((r: any) => (r.a || '').trim().length > 15);
      const hits     = answered.filter((r: any) => aliases.some((a: string) => (r.a || '').toLowerCase().includes(a)));
      return { stage: s.name, winRate: answered.length > 0 ? Math.round((hits.length / answered.length) * 100) : 0, total: answered.length };
    });

    // 10. Citations
    const citationSources = (() => {
      try { return JSON.parse(citRaw.replace(/```json|```/g, '').trim()); }
      catch { return extractCitations(allQA, (page as any).domain || ''); }
    })();

    // 11. Trending
    const trendingQueries = (() => {
      try { return JSON.parse(trendRaw.replace(/```json|```/g, '').trim()); }
      catch { return []; }
    })();

    // 12. Insights from real data
    const topCats   = [...queryClusters].sort((a, b) => b.winRate - a.winRate).slice(0, 3).map((c: any) => c.category);
    const missCats  = queryClusters.filter((c: any) => c.winRate === 0).slice(0, 3).map((c: any) => c.category);
    const topComp   = competitorScores[0]?.Brand || 'competitors';
    const bestStage = [...stageWinRates].sort((a, b) => b.winRate - a.winRate)[0];
    const worstStage= [...stageWinRates].sort((a, b) => a.winRate - b.winRate)[0];

    let insights = { strengths: [] as string[], improvements: [] as string[], actions: [] as any[] };
    try {
      const iRaw = await callAI([{ role: 'user', content:
`GEO strategist. Return ONLY valid JSON.
Brand: ${brand} | Product: ${lob || industry}
GEO: ${scores.geo}/100 | Visibility: ${scores.visibility}% (${scores.mentionCount}/${scores.totalCount})
Prominence: ${scores.prominence} (${scores.avgRank}) | Sentiment: ${scores.sentiment} | Citation: ${scores.citationShare} | SOV: ${scores.shareOfVoice}%
Best stage: ${bestStage?.stage} ${bestStage?.winRate}% | Worst: ${worstStage?.stage} ${worstStage?.winRate}%
Top cats: ${topCats.join(', ')||'none'} | Missing: ${missCats.join(', ')||'none'} | Top competitor: ${topComp}
Return: {"strengths":["3 specific strengths"],"improvements":["5 specific gaps"],"actions":[{"priority":"High","action":"action"},{"priority":"High","action":"action"},{"priority":"Medium","action":"action"},{"priority":"Medium","action":"action"},{"priority":"Low","action":"action"}]}` }],
        0.2, 1200);
      insights = JSON.parse(iRaw.replace(/```json|```/g, '').trim());
    } catch {}

    // 13. Targeted clusters
    let targetedClusters: any[] = [];
    try {
      const fRaw = await callAI([{ role: 'user', content:
`What specific products/features is "${brand}" genuinely known for in ${lob || industry}?
Only real established reputation areas.
Return ONLY valid JSON:
{"knownFor":[{"product":"name","queries":["10 brand-inviting questions, NO brand names"]}]}
Max 3 products, 10 queries each.` }],
        0.2, 1200);

      const fame     = JSON.parse(fRaw.replace(/```json|```/g, '').trim());
      const knownFor : { product: string; queries: string[] }[] = fame.knownFor || [];

      if (knownFor.length > 0) {
        const bl   = brand.toLowerCase();
        const bw   = bl.split(/\s+/).filter((w: string) => w.length > 4);
        const safe = (q: string) => {
          const ql = q.toLowerCase();
          return !ql.includes(bl) && !bw.some((w: string) => ql.includes(w));
        };

        const flat: { product: string; query: string }[] = [];
        knownFor.forEach((k: any) => k.queries.slice(0, 10).filter(safe).forEach((q: string) =>
          flat.push({ product: k.product, query: q })
        ));

        const tBatches: typeof flat[] = [];
        for (let i = 0; i < flat.length; i += 10) tBatches.push(flat.slice(i, i + 10));

        const tAllQA: any[] = [];
        await Promise.all(tBatches.map(async (batch) => {
          const ql      = batch.map((q, j) => `Q${j + 1}: ${q.query}`).join('\n\n');
          const labels  = batch.map((_, j) => `A${j + 1}:`).join('\n');
          const r2      = await callAI([{ role: 'user', content:
            `Answer each question naming real brands. Be balanced.\n\n${ql}\n\nFormat:\n${labels}` }],
            0.3, 2000, 2);
          const answers = parseAnswers(r2, batch.length);
          batch.forEach((item, j) => {
            const ans = answers[j] || '';
            tAllQA.push({ product: item.product, query: item.query, ans,
              mentioned: aliases.some((a: string) => ans.toLowerCase().includes(a)),
              position : getBrandPosition(ans, aliases) });
          });
        }));

        const pMap: Record<string, any[]> = {};
        tAllQA.forEach((r: any) => { (pMap[r.product] = pMap[r.product] || []).push(r); });

        targetedClusters = Object.entries(pMap).map(([product, rows]) => {
          const total2 = rows.length;
          const hits2  = rows.filter((r: any) => r.mentioned).length;
          const posArr = rows.map((r: any) => r.position > 0 ? r.position : 5);
          const avgP2  = posArr.reduce((a: number, b: number) => a + b, 0) / posArr.length;
          const cc: Record<string, number> = {};
          rows.forEach((r: any) => {
            const t = (r.ans || '').toLowerCase();
            (competitors as string[]).forEach((c: string) => {
              if (t.includes(c.toLowerCase()) && c.toLowerCase() !== bl) cc[c] = (cc[c] || 0) + 1;
            });
          });
          return {
            product, total: total2, mentioned: hits2,
            winRate      : total2 > 0 ? Math.round((hits2 / total2) * 100) : 0,
            prominence   : Math.round(Math.max(5, Math.min(95, 100 - (avgP2 - 1) * 18))),
            avgRank      : `#${Math.round(avgP2)}`,
            topCompetitor: Object.entries(cc).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
            responses    : rows.map((r: any) => ({ query: r.query, mentioned: r.mentioned, position: r.position, response_preview: r.ans })),
          };
        }).sort((a, b) => b.winRate - a.winRate);
      }
    } catch {}

    return NextResponse.json({
      brand_name: brand, industry, ind_key: industryKey, lob, ind_label: industry,
      visibility          : scores.visibility,
      sentiment           : scores.sentiment,
      prominence          : scores.prominence,
      citation_share      : scores.citationShare,
      share_of_voice      : scores.shareOfVoice,
      overall_geo_score   : scores.geo,
      avg_rank            : scores.avgRank,
      responses_with_brand: scores.mentionCount,
      total_responses     : scores.totalCount,
      personas, stage_win_rates: stageWinRates,
      responses_detail    : responsesDetail,
      query_clusters      : queryClusters,
      targeted_clusters   : targetedClusters,
      competitors         : competitorScores,
      citation_sources    : citationSources,
      trending_queries    : trendingQueries,
      strengths_list      : insights.strengths   || [],
      improvements_list   : insights.improvements || [],
      actions             : insights.actions      || [],
      internal_links      : (page as any).internalLinks || [],
      domain              : (page as any).domain  || '',
      page_url            : url,
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
