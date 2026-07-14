import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'openai/gpt-5.4';
const BATCH_SIZE = 75;

// ─── AI CALL ───────────────────────────────────────────────────────────────
async function callAI(
  messages: { role: string; content: string }[],
  temperature = 0.1,
  max_tokens = 1500
): Promise<string> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://perceptageo.com',
        'X-Title': 'Percepta',
      },
      body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch {
    return '';
  }
}

// ─── HTML HELPERS (no cheerio — pure regex) ────────────────────────────────
function extractTag(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

function extractMeta(html: string, name: string): string {
  const m =
    html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i'));
  return m ? m[1].trim() : '';
}

function extractHeadings(html: string, max = 20): string[] {
  const matches = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)];
  return matches
    .slice(0, max)
    .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
}

function extractBodyText(html: string, maxChars = 4000): string {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.slice(0, maxChars);
}

function extractInternalLinks(html: string, baseUrl: string, max = 15): { url: string; path: string; label: string }[] {
  const matches = [...html.matchAll(/href=["'](\/?[a-zA-Z0-9/_\-\.]+)["']/g)];
  const seen = new Set<string>();
  const links: { url: string; path: string; label: string }[] = [];
  for (const m of matches) {
    if (links.length >= max) break;
    const href = m[1];
    if (href.startsWith('/') && href.length > 1 && !seen.has(href)) {
      seen.add(href);
      const label =
        href
          .replace(/^\//, '')
          .replace(/-/g, ' ')
          .replace(/\//g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Page';
      try {
        links.push({ url: new URL(href, baseUrl).toString(), path: href, label });
      } catch {}
    }
  }
  return links;
}

// ─── PAGE FETCH ────────────────────────────────────────────────────────────
async function fetchPageContent(url: string) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const title = extractTag(html, 'title');
    const metaDesc = extractMeta(html, 'description');
    const headings = extractHeadings(html);
    const bodyText = extractBodyText(html);
    const hasSchema = html.includes('application/ld+json');
    const hasAuthor = /class=["'][^"']*(?:author|byline)[^"']*["']/i.test(html);
    const wordCount = bodyText.split(/\s+/).length;
    const domain = new URL(url).hostname.replace('www.', '');
    const urlPath = new URL(url).pathname; // CRITICAL — captures /credit-cards, /savings etc
    const internalLinks = extractInternalLinks(html, url);
    return {
      ok: true,
      url,
      domain,
      urlPath,
      title,
      metaDesc,
      headings,
      bodyText,
      hasSchema,
      hasAuthor,
      wordCount,
      internalLinks,
    };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ─── BRAND DISCOVERY — URL-PATH AWARE, no hardcoding ─────────────────────
async function discoverBrand(pageData: any, url: string): Promise<{
  brand: string;
  industry: string;
  industryKey: string;
  lob: string;
  personas: string[];
  competitors: string[];
  competitorUrls: Record<string, string>;
  categories: string[];
}> {
  const urlPath = (pageData.urlPath || '/').replace(/\//g, ' ').trim();
  const pageText = [
    `URL path: ${pageData.urlPath || '/'}`,
    `Page title: ${pageData.title || ''}`,
    `Meta description: ${pageData.metaDesc || ''}`,
    ...(pageData.headings || []).slice(0, 12),
    (pageData.bodyText || '').slice(0, 2000),
  ]
    .join('\n')
    .trim();

  // KEY FIX: We pass the URL path explicitly so citi.com vs citi.com/credit-cards are different
  const prompt = `You are a brand intelligence analyst. Analyze this SPECIFIC webpage URL and content.
The URL path is critical — it tells you exactly which product/service to analyze.

Full URL: ${url}
URL path: "${pageData.urlPath || '/'}"

Page content:
${pageText.slice(0, 2500)}

Return ONLY valid JSON, no markdown:
{
  "brand_name": "parent company brand only (e.g. Citi, Chase, Nike — never a product name)",
  "industry": "precise industry for THIS URL path (e.g. if path=/credit-cards return 'Consumer Credit Cards', if path=/ for a bank return 'Retail Banking', if path=/savings return 'Savings Accounts')",
  "industry_key": "snake_case e.g. credit_cards, retail_banking, savings_accounts, auto_loans",
  "lob": "exact product line shown on THIS page (e.g. 'Citi Credit Cards', 'Chase Savings Account', 'Nike Running Shoes') — be very specific to the URL",
  "personas": [
    "5 distinct buyer personas who would visit THIS specific URL. Format: 'Age/situation — specific need'. E.g. '28yo recent grad with no credit — wants to build credit score'"
  ],
  "competitors": ["12 direct competitors for THIS specific product — same product category, same target consumer"],
  "competitor_urls": {"BrandName": "domain.com"},
  "categories": ["12 specific consumer intent categories for THIS product. E.g. for credit cards: Cash Back, Travel Rewards, Balance Transfer, No Annual Fee, Student Cards, Business Cards, Secured Cards, Dining Rewards, Gas Rewards, Hotel Cards, Luxury Cards, Retail Co-Brand"]
}

CRITICAL RULES:
- brand_name = parent brand (Citi, Chase, Bank of America) NOT product (Citi Double Cash)
- lob = specific product shown on this PAGE, very specific
- industry and categories must match the URL path, not the homepage
- If URL is just the homepage with no path, analyze the brand's PRIMARY known product
- competitors must be direct alternatives for THIS product specifically`;

  try {
    const raw = await callAI([{ role: 'user', content: prompt }], 0.1, 1000);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return {
      brand: parsed.brand_name || new URL(url).hostname.replace('www.', '').split('.')[0],
      industry: parsed.industry || 'Consumer Products',
      industryKey: parsed.industry_key || 'general',
      lob: parsed.lob || '',
      personas: parsed.personas || [],
      competitors: parsed.competitors || [],
      competitorUrls: parsed.competitor_urls || {},
      categories: parsed.categories || ['General', 'Features', 'Pricing', 'Comparison', 'Reviews'],
    };
  } catch {
    const domain = new URL(url).hostname.replace('www.', '').split('.')[0];
    return {
      brand: domain.charAt(0).toUpperCase() + domain.slice(1),
      industry: 'Consumer Products',
      industryKey: 'general',
      lob: '',
      personas: [],
      competitors: [],
      competitorUrls: {},
      categories: ['General', 'Features', 'Pricing', 'Comparison', 'Reviews'],
    };
  }
}

// ─── QUERY GENERATION — PERSONA × STAGE × INTENT MATRIX ──────────────────
// This is the core engine. We generate queries in batches of 25 per AI call
// so the AI never gets overwhelmed and always returns the exact count asked.
// Total = sum of all batch returns = exactly MAX_QUERIES.

const JOURNEY_STAGES = [
  { stage: 'Awareness', desc: 'just learning this product exists, broad questions', weight: 0.15 },
  { stage: 'Consideration', desc: 'comparing options, narrowing down', weight: 0.30 },
  { stage: 'Decision', desc: 'ready to choose, specific feature questions', weight: 0.30 },
  { stage: 'Validation', desc: 'double-checking their choice, reviews, is it worth it', weight: 0.15 },
  { stage: 'Usage/Advocacy', desc: 'already have it or helping others choose', weight: 0.10 },
];

const INTENT_TEMPLATES = [
  'best [product] for [persona_need]',
  'how to choose [product] when [situation]',
  'is [product type] worth it for [persona_need]',
  '[feature A] vs [feature B] — which matters more',
  'what do financial experts recommend for [persona_need]',
  'I [problem/situation], what [product] should I get',
  'which [product] is best for [budget/constraint]',
  'pros and cons of [product type] for [use case]',
  'what to look for in [product] as a [persona descriptor]',
  'how does [product] work and is it right for me',
];

async function generateQueriesForBatch(
  industry: string,
  lob: string,
  categories: string[],
  personas: string[],
  stage: { stage: string; desc: string },
  count: number,
  batchIndex: number
): Promise<{ category: string; query: string; stage: string; persona: string }[]> {
  // Pick personas for this batch (rotate through them)
  const personaCount = personas.length || 3;
  const batchPersonas = personas.length > 0
    ? personas.slice(batchIndex % personaCount, (batchIndex % personaCount) + 3).concat(personas.slice(0, Math.max(0, 3 - (personas.length - batchIndex % personaCount))))
    : ['everyday consumer looking for the best option', 'budget-conscious shopper comparing options', 'experienced user wanting the most value'];

  // Pick categories for this batch (rotate)
  const batchCats = categories.length > 0
    ? [...categories].sort(() => (batchIndex * 7 + 3) % 5 - 2).slice(0, Math.min(6, categories.length))
    : categories;

  const prompt = `You are a consumer research expert generating AI search queries for scoring brand visibility.

Product being analyzed: ${lob || industry}
Journey stage: ${stage.stage} — ${stage.desc}

Personas for this batch:
${batchPersonas.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Categories to cover: ${batchCats.join(', ')}

Generate EXACTLY ${count} realistic questions a real consumer would type into an AI assistant (ChatGPT, Perplexity, Claude) during the ${stage.stage} stage of researching ${lob || industry}.

Intent patterns to use (mix them):
${INTENT_TEMPLATES.slice(0, 7).map((t, i) => `${i + 1}. ${t}`).join('\n')}

STRICT RULES:
- ZERO brand names or company names in ANY query (no "Chase", no "Citi", no "Apple", nothing)
- Each query must sound like a real human typed it — natural language, not formal
- Include specific details: dollar amounts, time constraints, life situations, demographics
- Different personas should produce different vocabulary and concerns
- Spread across the ${batchCats.length} categories

Return ONLY a valid JSON array, no markdown, no explanation:
[{"category":"CategoryName","query":"the full question text","stage":"${stage.stage}","persona":"brief persona descriptor"}]
EXACTLY ${count} items. No more, no less.`;

  try {
    const raw = await callAI([{ role: 'user', content: prompt }], 0.4, 2000);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, count);
  } catch {
    return [];
  }
}

async function generateAllQueries(
  industry: string,
  lob: string,
  categories: string[],
  personas: string[],
  totalCount: number
): Promise<{ category: string; query: string; stage: string; persona: string }[]> {
  // Split total queries across journey stages by their weights
  const stageCounts = JOURNEY_STAGES.map((s) => ({
    ...s,
    count: Math.round(totalCount * s.weight),
  }));

  // Fix rounding so total = exactly totalCount
  const roundedTotal = stageCounts.reduce((sum, s) => sum + s.count, 0);
  const diff = totalCount - roundedTotal;
  stageCounts[1].count += diff; // add remainder to Consideration (highest weight stage)

  // Each stage gets broken into sub-batches of max 25 to guarantee AI returns exact count
  const SUB_BATCH = 25;
  const allBatchJobs: { stage: typeof JOURNEY_STAGES[0]; count: number; batchIndex: number }[] = [];

  stageCounts.forEach((stage) => {
    let remaining = stage.count;
    let bi = 0;
    while (remaining > 0) {
      const chunk = Math.min(remaining, SUB_BATCH);
      allBatchJobs.push({ stage, count: chunk, batchIndex: bi++ });
      remaining -= chunk;
    }
  });

  // Fire ALL sub-batches in parallel
  const results = await Promise.all(
    allBatchJobs.map((job) =>
      generateQueriesForBatch(industry, lob, categories, personas, job.stage, job.count, job.batchIndex)
    )
  );

  const allQueries = results.flat();

  // If AI returned fewer than expected (rare), top up with fallback
  if (allQueries.length < totalCount) {
    const fallbackTemplates = [
      (c: string, i: number) => ({ category: c, query: `What is the best ${c.toLowerCase()} option for someone on a budget?`, stage: 'Consideration', persona: 'budget shopper' }),
      (c: string, i: number) => ({ category: c, query: `How do I choose the right ${c.toLowerCase()} for my situation?`, stage: 'Decision', persona: 'first-time buyer' }),
      (c: string, i: number) => ({ category: c, query: `Is a ${c.toLowerCase()} worth it for an average person?`, stage: 'Validation', persona: 'skeptical consumer' }),
      (c: string, i: number) => ({ category: c, query: `What do experts recommend when picking ${c.toLowerCase()}?`, stage: 'Awareness', persona: 'research-driven shopper' }),
      (c: string, i: number) => ({ category: c, query: `What are the most important features in ${c.toLowerCase()}?`, stage: 'Consideration', persona: 'detail-oriented buyer' }),
    ];
    let fi = 0;
    while (allQueries.length < totalCount) {
      const cat = categories[fi % categories.length];
      const templateIdx = Math.floor(fi / categories.length) % fallbackTemplates.length;
      allQueries.push(fallbackTemplates[templateIdx](cat, fi));
      fi++;
    }
  }

  return allQueries.slice(0, totalCount);
}

// ─── BUILD BRAND ALIASES ───────────────────────────────────────────────────
function buildAliases(brand: string): string[] {
  const bl = brand.toLowerCase();
  const aliases = new Set<string>();
  aliases.add(bl);
  aliases.add(bl.replace(/\s+/g, ''));
  aliases.add(bl.replace(/\s+/g, '-'));
  aliases.add(bl.replace(/[^a-z0-9]/gi, '').toLowerCase());
  bl.split(/[\s'\-\.&]+/)
    .filter((w) => w.length > 2)
    .forEach((w) => aliases.add(w));
  return Array.from(aliases).filter((a) => a.length > 2);
}

// ─── BRAND POSITION IN RESPONSE ───────────────────────────────────────────
function getBrandPosition(text: string, aliases: string[]): number {
  const tl = text.toLowerCase();
  let firstIndex = Infinity;
  aliases.forEach((a) => {
    const idx = tl.indexOf(a.toLowerCase());
    if (idx >= 0 && idx < firstIndex) firstIndex = idx;
  });
  if (firstIndex === Infinity) return 0;

  const before = text.slice(0, firstIndex);
  const titleCaseMatches = before.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  const stopWords = new Set(['The', 'This', 'That', 'These', 'Those', 'When', 'Where', 'What', 'Which', 'How', 'Why', 'For', 'And', 'But', 'Or', 'In', 'On', 'At', 'To', 'Of', 'With', 'As', 'By', 'From', 'An', 'If', 'It', 'Its', 'Are', 'Is', 'Be', 'Was', 'Were', 'Has', 'Have', 'Had', 'Here', 'Some', 'Many', 'Most', 'More', 'Such', 'Each']);
  const brandsBefore = titleCaseMatches.filter((w) => !stopWords.has(w)).length;
  return brandsBefore + 1;
}

// ─── CORE SCORE COMPUTATION — pure math, no hardcoding ────────────────────
function computeScores(
  brand: string,
  aliases: string[],
  allQA: any[],
  competitors: string[]
): {
  visibility: number;
  prominence: number;
  sentiment: number;
  citationShare: number;
  shareOfVoice: number;
  geo: number;
  avgRank: string;
  mentionCount: number;
  totalCount: number;
} {
  const validQA = allQA.filter(Boolean);
  const total = validQA.length || 1;

  // VISIBILITY — mention rate
  const mentionedQA = validQA.filter((qa) =>
    aliases.some((a) => (qa.a || '').toLowerCase().includes(a.toLowerCase()))
  );
  const mentionCount = mentionedQA.length;
  const visibility = Math.round((mentionCount / total) * 100);

  // PROMINENCE — average position, scaled to 0-100
  const positions = mentionedQA
    .map((qa) => getBrandPosition(qa.a || '', aliases))
    .filter((p) => p > 0);
  const avgPos =
    positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : 0;
  const prominence =
    mentionCount > 0
      ? Math.round(Math.max(5, Math.min(95, 100 - (avgPos - 1) * 18)))
      : 0;

  // SENTIMENT — positive/negative word ratio in brand-containing sentences
  const posWords = ['best', 'top', 'recommended', 'leading', 'excellent', 'great', 'trusted', 'popular', 'ideal', 'perfect', 'outstanding', 'superior', 'preferred', 'reliable', 'strong', 'impressive', 'generous', 'competitive', 'solid', 'standout'];
  const negWords = ['worst', 'poor', 'bad', 'avoid', 'expensive', 'weak', 'limited', 'disappointing', 'inferior', 'mediocre', 'unreliable', 'overpriced', 'problematic', 'lacking', 'outdated', 'complicated', 'confusing'];
  let posCount = 0;
  let negCount = 0;

  mentionedQA.forEach((qa) => {
    const sentences = (qa.a || '')
      .toLowerCase()
      .split(/[.!?]/)
      .filter((s: string) => aliases.some((a) => s.includes(a.toLowerCase())));
    sentences.forEach((s: string) => {
      posWords.forEach((w) => { if (s.includes(w)) posCount++; });
      negWords.forEach((w) => { if (s.includes(w)) negCount++; });
    });
  });

  const sentimentBase = mentionCount > 0 ? 50 : 0;
  const sentimentAdj =
    posCount + negCount > 0
      ? Math.round(((posCount - negCount) / (posCount + negCount)) * 35)
      : 0;
  const sentiment = Math.round(
    Math.max(0, Math.min(100, sentimentBase + sentimentAdj + prominence * 0.08))
  );

  // CITATION SHARE — weighted by position
  const citationWeight = positions.reduce((sum, p) => sum + 1 / p, 0);
  const maxPossibleWeight = total;
  const citationShare = Math.round(Math.min(95, (citationWeight / maxPossibleWeight) * 100 * 2.5));

  // SHARE OF VOICE — brand vs all competitors
  const brandCount = mentionCount;
  const competitorCounts = competitors.map((comp) => {
    const cl = comp.toLowerCase();
    const compWords = cl.split(/[\s'\-\.&]+/).filter((w: string) => w.length > 3);
    return validQA.filter((qa) => {
      const t = (qa.a || '').toLowerCase();
      return compWords.some((w: string) => t.includes(w)) || t.includes(cl);
    }).length;
  });
  const totalAllMentions = brandCount + competitorCounts.reduce((a, b) => a + b, 0);
  const shareOfVoice =
    totalAllMentions > 0 ? Math.round((brandCount / totalAllMentions) * 100) : 0;

  // GEO SCORE — weighted composite
  const geo = Math.round(
    visibility * 0.30 +
    sentiment * 0.20 +
    prominence * 0.20 +
    citationShare * 0.15 +
    shareOfVoice * 0.15
  );

  const avgRank = positions.length > 0 ? `#${Math.round(avgPos)}` : 'N/A';

  return { visibility, prominence, sentiment, citationShare, shareOfVoice, geo, avgRank, mentionCount, totalCount: total };
}

// ─── COMPETITOR SCORING — same logic, same responses ──────────────────────
function scoreCompetitor(compName: string, compUrl: string, allQA: any[], allCompetitors: string[]): any {
  const aliases = buildAliases(compName);
  const scores = computeScores(compName, aliases, allQA, allCompetitors.filter((c) => c !== compName));
  return {
    Brand: compName,
    URL: compUrl || `${compName.toLowerCase().replace(/\s+/g, '')}.com`,
    GEO: scores.geo,
    Vis: scores.visibility,
    Cit: scores.citationShare,
    Sen: scores.sentiment,
    Sov: scores.shareOfVoice,
    Prom: scores.prominence,
    Rank: scores.avgRank,
  };
}

// ─── QUERY CLUSTER ANALYSIS ───────────────────────────────────────────────
function buildQueryClusters(allQA: any[], aliases: string[], competitors: string[]): any[] {
  const categories = [...new Set(allQA.filter(Boolean).map((qa) => qa.category).filter(Boolean))];

  return categories.map((cat) => {
    const catRows = allQA.filter((qa) => qa && qa.category === cat);
    const mentioned = catRows.filter((qa) =>
      aliases.some((a) => (qa.a || '').toLowerCase().includes(a.toLowerCase()))
    ).length;
    const winRate = catRows.length > 0 ? Math.round((mentioned / catRows.length) * 100) : 0;

    const compCounts: Record<string, number> = {};
    catRows.forEach((qa) => {
      const t = (qa.a || '').toLowerCase();
      competitors.forEach((c) => {
        const cl = c.toLowerCase();
        if (t.includes(cl) && !aliases.some((a) => cl.includes(a))) {
          compCounts[c] = (compCounts[c] || 0) + 1;
        }
      });
    });
    const topCompetitor = Object.entries(compCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    // Stage breakdown
    const stageBreakdown: Record<string, { total: number; mentioned: number }> = {};
    catRows.forEach((qa) => {
      const s = qa.stage || 'Consideration';
      if (!stageBreakdown[s]) stageBreakdown[s] = { total: 0, mentioned: 0 };
      stageBreakdown[s].total++;
      if (aliases.some((a) => (qa.a || '').toLowerCase().includes(a.toLowerCase()))) {
        stageBreakdown[s].mentioned++;
      }
    });

    return {
      category: cat,
      total: catRows.length,
      mentioned,
      winRate,
      topCompetitor,
      dailySearches: 0,
      related: [],
      stageBreakdown,
    };
  });
}

// ─── EXTRACT CITED DOMAINS FROM RESPONSES ─────────────────────────────────
function extractCitedDomains(allQA: any[], brandDomain: string): any[] {
  const domainCounts: Record<string, number> = {};
  const knownSources = [
    'nerdwallet', 'bankrate', 'reddit', 'wikipedia', 'forbes', 'cnbc', 'investopedia',
    'creditkarma', 'thepointsguy', 'wallethub', 'thebalance', 'money', 'consumerreports',
    'businessinsider', 'motleyfool', 'wsj', 'marketwatch', 'bloomberg', 'cnet', 'pcmag',
    'techradar', 'edmunds', 'caranddriver', 'motortrend', 'tripadvisor', 'yelp', 'experian',
    'equifax', 'transunion', 'lendingtree', 'nerdwallet', 'magnifymoney',
  ];

  allQA.filter(Boolean).forEach((qa) => {
    const text = (qa.a || '').toLowerCase();
    knownSources.forEach((source) => {
      if (text.includes(source)) {
        const domain = source + '.com';
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }
    });
    const urlMatches = text.matchAll(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g);
    for (const match of urlMatches) {
      const d = match[1].toLowerCase();
      if (d.length > 4 && !d.includes('example') && !d.includes('yourdomain')) {
        domainCounts[d] = (domainCounts[d] || 0) + 1;
      }
    }
  });

  const brandDomainClean = brandDomain.replace('www.', '');
  if (!domainCounts[brandDomainClean]) domainCounts[brandDomainClean] = 1;

  const total = Object.values(domainCounts).reduce((a, b) => a + b, 1);

  return Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map((entry, i) => ({
      rank: i + 1,
      domain: entry[0],
      citation_share: Math.round((entry[1] / total) * 100 * 3),
      top_pages: [],
      category:
        entry[0] === brandDomainClean
          ? 'Owned Media'
          : ['reddit', 'twitter', 'youtube', 'facebook', 'linkedin'].some((s) => entry[0].includes(s))
          ? 'Social'
          : ['wikipedia', 'gov', 'edu', 'consumerreports', 'fdic', 'ftc'].some((s) => entry[0].includes(s))
          ? 'Institution'
          : 'Earned Media',
    }));
}

// ─── MAIN POST HANDLER ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url, promptCount } = await req.json();
    const MAX_QUERIES = Math.min(Math.max(promptCount || 300, 50), 1000);

    // STEP 1: Fetch page
    const pageData = await fetchPageContent(url);
    if (!pageData.ok) {
      return NextResponse.json({ error: (pageData as any).error }, { status: 400 });
    }

    // STEP 2: Discover brand + industry — URL-path aware
    const discovery = await discoverBrand(pageData, url);
    const { brand, industry, industryKey, lob, personas, competitors, competitorUrls, categories } = discovery;
    const aliases = buildAliases(brand);

    // STEP 3: Generate ALL queries using persona×stage×intent matrix + citations + trending IN PARALLEL
    // Query generation is now batched internally — never asks AI for more than 25 at once
    const [queries, citationsPromptRaw, trendingRaw] = await Promise.all([
      generateAllQueries(industry, lob, categories, personas, MAX_QUERIES),
      callAI(
        [{
          role: 'user',
          content: `List 10 real domains that AI models (ChatGPT, Perplexity, Claude) cite when answering questions about ${lob || industry} in the USA.
The brand being analyzed is ${brand} (domain: ${(pageData as any).domain}).
Return ONLY valid JSON array, no markdown:
[{"rank":1,"domain":"example.com","category":"Earned Media","citation_share":4.2,"top_pages":["/best-cards"]}]
Categories: Social, Institution, Earned Media, Owned Media, Other.
First item must be ${(pageData as any).domain} as Owned Media.
Exactly 10 items. Be realistic with citation_share (owned 5-15%, earned 2-5%, others 1-3%).`,
        }],
        0.1, 800
      ),
      callAI(
        [{
          role: 'user',
          content: `List 10 high-intent questions consumers are actively asking AI models right now about ${lob || industry} in the USA.
No brand names in the queries.
Return ONLY valid JSON array, no markdown:
[{"query":"...","trend":"Rising","opportunity":"High","category":"${categories[0] || 'General'}","estimated_daily_searches":8200}]
Exactly 10 items. Mix: 6 High opportunity, 3 Medium, 1 Low. Trend values: Rising, Peak, Stable, Declining.`,
        }],
        0.3, 800
      ),
    ]);

    // STEP 4: Run ALL query batches in parallel — core scoring engine
    // allQA is pre-sized to MAX_QUERIES so index writes are safe
    const allQA: any[] = new Array(MAX_QUERIES).fill(null);
    const batches: { category: string; query: string; stage: string; persona: string }[][] = [];
    for (let i = 0; i < queries.length; i += BATCH_SIZE) {
      batches.push(queries.slice(i, i + BATCH_SIZE));
    }

    await Promise.all(
      batches.map(async (batch, batchIdx) => {
        const ql = batch.map((q, j) => `Q${j + 1}: ${q.query}`).join('\n\n');
        const labels = batch.map((_, j) => `A${j + 1}: [answer]`).join('\n');

        const prompt = `You are a knowledgeable, balanced consumer advisor. Answer each question directly and specifically.
Always name real brands. Be accurate and comprehensive. Do NOT favour any single brand.
Give each question a full, helpful answer (2-4 sentences minimum).

${ql}

Respond with EXACTLY this format:
${labels}`;

        let bt = '';
        try {
          bt = await callAI([{ role: 'user', content: prompt }], 0.1, 1500);
        } catch {}

        batch.forEach((q, j) => {
          const marker = `A${j + 1}:`;
          const nextMarker = `A${j + 2}:`;
          let ans = '';
          if (bt.includes(marker)) {
            const s = bt.indexOf(marker) + marker.length;
            const e = bt.includes(nextMarker) ? bt.indexOf(nextMarker) : bt.length;
            ans = bt.slice(s, e).trim();
          }
          allQA[batchIdx * BATCH_SIZE + j] = {
            category: q.category,
            stage: q.stage,
            persona: q.persona,
            q: q.query,
            a: ans || '',
          };
        });
      })
    );

    // Fill any remaining nulls
    for (let i = 0; i < allQA.length; i++) {
      if (!allQA[i]) {
        allQA[i] = {
          category: queries[i]?.category || '',
          stage: queries[i]?.stage || '',
          persona: queries[i]?.persona || '',
          q: queries[i]?.query || '',
          a: '',
        };
      }
    }

    // STEP 5: Compute all scores from real data
    const scores = computeScores(brand, aliases, allQA, competitors);

    // STEP 6: Score every competitor using same logic on same responses
    const competitorScores = competitors
      .filter((c) => c.toLowerCase() !== brand.toLowerCase())
      .map((c) => scoreCompetitor(c, competitorUrls[c] || '', allQA, competitors))
      .sort((a, b) => b.GEO - a.GEO);

    // STEP 7: Build response detail
    const responsesDetail = allQA.filter(Boolean).map((qa: any) => ({
      category: qa.category,
      stage: qa.stage,
      persona: qa.persona,
      query: qa.q,
      mentioned: aliases.some((a) => (qa.a || '').toLowerCase().includes(a.toLowerCase())),
      response_preview: qa.a || '',
      position: getBrandPosition(qa.a || '', aliases),
      winner_brand: (() => {
        let winnerBrand = '';
        let winnerPos = Infinity;
        const brandPos = getBrandPosition(qa.a || '', aliases);
        competitors.slice(0, 15).forEach((comp) => {
          const compAliases = buildAliases(comp);
          const compPos = getBrandPosition(qa.a || '', compAliases);
          if (compPos > 0 && compPos < winnerPos && (brandPos === 0 || compPos < brandPos)) {
            winnerPos = compPos;
            winnerBrand = comp;
          }
        });
        return winnerBrand || null;
      })(),
    }));

    // STEP 8: Build query clusters (now includes stage breakdown)
    const queryClusters = buildQueryClusters(allQA, aliases, competitors);

    // STEP 9: Citation sources
    const citationSources = (() => {
      try {
        const fromAI = JSON.parse(citationsPromptRaw.replace(/```json|```/g, '').trim());
        return fromAI;
      } catch {
        return extractCitedDomains(allQA, (pageData as any).domain || '');
      }
    })();

    // STEP 10: Trending queries
    const trendingQueries = (() => {
      try {
        return JSON.parse(trendingRaw.replace(/```json|```/g, '').trim());
      } catch {
        return [];
      }
    })();

    // STEP 11: AI insights from real computed data
    const topCats = queryClusters
      .filter((c) => c.winRate > 0)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 3)
      .map((c) => c.category);
    const missingCats = queryClusters
      .filter((c) => c.winRate === 0)
      .slice(0, 3)
      .map((c) => c.category);
    const topComp = competitorScores.length > 0 ? competitorScores[0].Brand : 'competitors';

    // Stage win rates for insights
    const stageWinRates = JOURNEY_STAGES.map((s) => {
      const stageQA = allQA.filter((qa) => qa && qa.stage === s.stage);
      const stageMentioned = stageQA.filter((qa) =>
        aliases.some((a) => (qa.a || '').toLowerCase().includes(a.toLowerCase()))
      ).length;
      return {
        stage: s.stage,
        winRate: stageQA.length > 0 ? Math.round((stageMentioned / stageQA.length) * 100) : 0,
        total: stageQA.length,
      };
    });

    const insightsPrompt = `You are a GEO strategist. Analyze this brand's AI visibility data and return ONLY valid JSON, no markdown.

Brand: ${brand}
Product: ${lob || industry}
GEO Score: ${scores.geo}/100
Total queries: ${scores.totalCount} (across ${JOURNEY_STAGES.length} journey stages)
Brand appeared in: ${scores.mentionCount} responses (${scores.visibility}% visibility)
Avg position when mentioned: ${scores.avgRank}
Sentiment score: ${scores.sentiment}/100
Prominence score: ${scores.prominence}/100
Share of Voice: ${scores.shareOfVoice}%

Journey stage performance:
${stageWinRates.map((s) => `- ${s.stage}: ${s.winRate}% win rate (${s.total} queries)`).join('\n')}

Top performing categories: ${topCats.join(', ') || 'none'}
Missing categories (0% win): ${missingCats.join(', ') || 'none'}
Top competitor by GEO score: ${topComp}

Return:
{
  "strengths": ["3 specific data-backed strengths referencing actual scores and stages"],
  "improvements": ["5 specific gaps referencing actual scores, stages, and categories"],
  "actions": [
    {"priority":"High","action":"specific implementable action tied to real gap"},
    {"priority":"High","action":"specific implementable action tied to real gap"},
    {"priority":"Medium","action":"specific implementable action"},
    {"priority":"Medium","action":"specific implementable action"},
    {"priority":"Low","action":"specific implementable action"}
  ]
}`;

    let insights = { strengths: [] as string[], improvements: [] as string[], actions: [] as any[] };
    try {
      const insightsRaw = await callAI([{ role: 'user', content: insightsPrompt }], 0.2, 1200);
      insights = JSON.parse(insightsRaw.replace(/```json|```/g, '').trim());
    } catch {}

    // STEP 12: Targeted clusters (brand-specific product deep-dive)
    let targetedClusters: any[] = [];
    try {
      const brandFamePrompt = `You are a brand research expert. Return ONLY valid JSON, no markdown.

What specific products or features is "${brand}" genuinely well-known for in ${lob || industry}?
Only include areas where ${brand} has real established market reputation.

Return exactly:
{"knownFor":[{"product":"product name","queries":["10 consumer questions"]}]}

Rules:
- Maximum 4 products, 10 queries each
- ZERO brand names in any query — absolutely no "${brand}", no competitor names
- Queries must be generic consumer questions a real person would type into an AI
- Good: "which credit card gives the best cash back on groceries"
- Bad: "which Citi card is best for cash back" — REJECTED`;

      const fameRaw = await callAI([{ role: 'user', content: brandFamePrompt }], 0.2, 1200);
      const fameData = JSON.parse(fameRaw.replace(/```json|```/g, '').trim());
      const knownFor: { product: string; queries: string[] }[] = fameData.knownFor || [];

      if (knownFor.length > 0) {
        const brandLower = brand.toLowerCase();
        const brandWords = brandLower.split(/\s+/).filter((w: string) => w.length > 4);
        const isClean = (q: string) => {
          const ql = q.toLowerCase();
          if (ql.includes(brandLower)) return false;
          if (brandWords.some((w: string) => ql.includes(w))) return false;
          return true;
        };

        const flatQ: { product: string; query: string }[] = [];
        knownFor.forEach((k) =>
          k.queries.slice(0, 10).filter(isClean).forEach((q) =>
            flatQ.push({ product: k.product, query: q })
          )
        );

        const TBATCH = 10;
        const allTargetedQA: any[] = [];
        const tbatches: { product: string; query: string }[][] = [];
        for (let i = 0; i < flatQ.length; i += TBATCH) {
          tbatches.push(flatQ.slice(i, i + TBATCH));
        }

        await Promise.all(
          tbatches.map(async (batch) => {
            const ql = batch.map((q, j) => `Q${j + 1}: ${q.query}`).join('\n\n');
            const labels = batch.map((_, j) => `A${j + 1}: [answer]`).join('\n');
            const p = `Answer each question directly. Name real specific brands. Be balanced and accurate.\n\n${ql}\n\nRespond EXACTLY:\n${labels}`;
            let bt = '';
            try { bt = await callAI([{ role: 'user', content: p }], 0.1, 1200); } catch {}
            batch.forEach((item, j) => {
              const mk = `A${j + 1}:`;
              const nm = `A${j + 2}:`;
              let ans = '';
              if (bt.includes(mk)) {
                const s = bt.indexOf(mk) + mk.length;
                const e = bt.includes(nm) ? bt.indexOf(nm) : bt.length;
                ans = bt.slice(s, e).trim();
              }
              const mentioned = aliases.some((a) => (ans || '').toLowerCase().includes(a.toLowerCase()));
              const position = getBrandPosition(ans || '', aliases);
              allTargetedQA.push({ product: item.product, query: item.query, ans, mentioned, position });
            });
          })
        );

        const pMap: Record<string, any[]> = {};
        allTargetedQA.forEach((qa) => {
          if (!pMap[qa.product]) pMap[qa.product] = [];
          pMap[qa.product].push(qa);
        });

        targetedClusters = Object.entries(pMap)
          .map(([product, rows]) => {
            const total = rows.length;
            const mentioned = rows.filter((r) => r.mentioned).length;
            const winRate = total > 0 ? Math.round((mentioned / total) * 100) : 0;
            const posArr = rows.map((r) => (r.position > 0 ? r.position : 5));
            const avgPos2 = posArr.reduce((a, b) => a + b, 0) / posArr.length;
            const prominence2 = Math.round(Math.max(5, Math.min(95, 100 - (avgPos2 - 1) * 18)));
            const cc: Record<string, number> = {};
            rows.forEach((r) => {
              const t = (r.ans || '').toLowerCase();
              competitors.forEach((c) => {
                if (t.includes(c.toLowerCase()) && c.toLowerCase() !== brand.toLowerCase())
                  cc[c] = (cc[c] || 0) + 1;
              });
            });
            const topComp2 = Object.entries(cc).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
            return {
              product,
              total,
              mentioned,
              winRate,
              prominence: prominence2,
              avgRank: posArr.length > 0 ? `#${Math.round(avgPos2)}` : 'N/A',
              topCompetitor: topComp2,
              responses: rows.map((r) => ({
                query: r.query,
                mentioned: r.mentioned,
                position: r.position,
                response_preview: r.ans,
              })),
            };
          })
          .sort((a, b) => b.winRate - a.winRate);
      }
    } catch {}

    // ─── RETURN — no hardcoded overrides anywhere ─────────────────────────
    return NextResponse.json({
      brand_name: brand,
      industry,
      ind_key: industryKey,
      lob,
      ind_label: industry,

      visibility: scores.visibility,
      sentiment: scores.sentiment,
      prominence: scores.prominence,
      citation_share: scores.citationShare,
      share_of_voice: scores.shareOfVoice,
      overall_geo_score: scores.geo,
      avg_rank: scores.avgRank,

      responses_with_brand: scores.mentionCount,
      total_responses: scores.totalCount,

      personas,
      stage_win_rates: stageWinRates,

      responses_detail: responsesDetail,
      query_clusters: queryClusters,
      targeted_clusters: targetedClusters,
      competitors: competitorScores,

      citation_sources: citationSources,
      trending_queries: trendingQueries,

      strengths_list: insights.strengths || [],
      improvements_list: insights.improvements || [],
      actions: insights.actions || [],

      internal_links: (pageData as any).internalLinks || [],
      domain: (pageData as any).domain || '',
      page_url: url,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
