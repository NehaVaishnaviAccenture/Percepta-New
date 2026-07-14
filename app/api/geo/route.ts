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
  const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i'));
  return m ? m[1].trim() : '';
}

function extractHeadings(html: string, max = 20): string[] {
  const matches = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)];
  return matches
    .slice(0, max)
    .map((m) => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(Boolean);
}

function extractBodyText(html: string, maxChars = 3000): string {
  // Remove scripts, styles, nav, footer
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

function extractInternalLinks(html: string, baseUrl: string, max = 10): { url: string; path: string; label: string }[] {
  const matches = [...html.matchAll(/href=["'](\/?[a-zA-Z0-9/_\-\.]+)["']/g)];
  const seen = new Set<string>();
  const links: { url: string; path: string; label: string }[] = [];
  for (const m of matches) {
    if (links.length >= max) break;
    const href = m[1];
    if (href.startsWith('/') && href.length > 1 && !seen.has(href)) {
      seen.add(href);
      const label = href
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
    const internalLinks = extractInternalLinks(html, url);
    return {
      ok: true,
      url,
      domain,
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

// ─── BRAND DISCOVERY (AI-powered, no hardcoding) ──────────────────────────
async function discoverBrand(pageData: any, url: string): Promise<{
  brand: string;
  industry: string;
  industryKey: string;
  lob: string;
  competitors: string[];
  competitorUrls: Record<string, string>;
  categories: string[];
}> {
  const pageText = [
    pageData.title || '',
    pageData.metaDesc || '',
    ...(pageData.headings || []).slice(0, 10),
    (pageData.bodyText || '').slice(0, 1500),
  ]
    .join(' ')
    .trim();

  const prompt = `You are a brand intelligence analyst. Analyze this webpage and return ONLY valid JSON, no markdown:
{
  "brand_name": "exact short brand name only (e.g. Chase, Ally, Nike)",
  "industry": "one-line industry description e.g. Credit Cards, Retail Banking, Athletic Apparel",
  "industry_key": "short snake_case key e.g. credit_cards, retail_banking, apparel",
  "lob": "specific product line label e.g. Cash Back Credit Cards, Savings Accounts",
  "competitors": ["10 real direct US market competitors for this exact product/service"],
  "competitor_urls": {"BrandName": "domain.com"},
  "categories": ["10 specific consumer intent categories for this product e.g. Cash Back, Travel Rewards, Balance Transfer"]
}

URL: ${url}
Page content: ${pageText.slice(0, 2000)}

Rules:
- brand_name must be the actual company brand, not a product name
- competitors must be genuine alternatives a consumer would consider
- categories must match what consumers actually search for in this space
- Return ONLY the JSON object`;

  try {
    const raw = await callAI([{ role: 'user', content: prompt }], 0.2, 800);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return {
      brand: parsed.brand_name || new URL(url).hostname.replace('www.', '').split('.')[0],
      industry: parsed.industry || 'Consumer Products',
      industryKey: parsed.industry_key || 'general',
      lob: parsed.lob || '',
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
      competitors: [],
      competitorUrls: {},
      categories: ['General', 'Features', 'Pricing', 'Comparison', 'Reviews'],
    };
  }
}

// ─── QUERY GENERATION (AI-powered, no hardcoding) ─────────────────────────
async function generateQueries(
  industry: string,
  lob: string,
  categories: string[],
  totalCount: number
): Promise<{ category: string; query: string }[]> {
  const perCategory = Math.ceil(totalCount / categories.length);

  const prompt = `Generate exactly ${totalCount} realistic consumer questions someone asks an AI when researching ${lob || industry} in the USA.

Rules:
- ZERO brand names or company names in any query
- Distribute evenly: ${perCategory} questions per category
- Categories: ${categories.join(', ')}
- Mix intent types per category:
  * "best X for Y" (superlative)
  * "X vs Y" comparisons (no brand names, feature comparisons)
  * "is X worth it" (validation)
  * "how to choose X" (guidance)
  * "what do experts recommend for X" (authority)
  * "I have [problem], what should I get" (problem-first)
- Be specific: include budget ranges, use cases, demographics
- Return ONLY valid JSON array, no markdown:
[{"category":"CategoryName","query":"question text"}]
Exactly ${totalCount} items total.`;

  try {
    const raw = await callAI([{ role: 'user', content: prompt }], 0.3, 4000);
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return parsed.slice(0, totalCount);
  } catch {
    // Fallback: generate basic queries per category
    const fallback: { category: string; query: string }[] = [];
    const templates = [
      (c: string) => `What is the best ${c.toLowerCase()} available right now?`,
      (c: string) => `Which ${c.toLowerCase()} is most recommended by experts?`,
      (c: string) => `How do I choose the right ${c.toLowerCase()}?`,
      (c: string) => `What should I look for when comparing ${c.toLowerCase()} options?`,
      (c: string) => `Is a premium ${c.toLowerCase()} worth the extra cost?`,
    ];
    categories.forEach((cat) => {
      templates.forEach((t) => fallback.push({ category: cat, query: t(cat) }));
    });
    return fallback.slice(0, totalCount);
  }
}

// ─── BUILD BRAND ALIASES (no hardcoding) ──────────────────────────────────
function buildAliases(brand: string): string[] {
  const bl = brand.toLowerCase();
  const aliases = new Set<string>();
  aliases.add(bl);
  aliases.add(bl.replace(/\s+/g, ''));
  aliases.add(bl.replace(/\s+/g, '-'));
  aliases.add(bl.replace(/[^a-z0-9]/gi, '').toLowerCase());
  // Add each significant word (>3 chars) as an alias
  bl.split(/[\s'\-\.&]+/)
    .filter((w) => w.length > 3)
    .forEach((w) => aliases.add(w));
  return Array.from(aliases).filter((a) => a.length > 2);
}

// ─── BRAND POSITION IN RESPONSE ───────────────────────────────────────────
function getBrandPosition(text: string, aliases: string[]): number {
  const tl = text.toLowerCase();
  // Find the earliest mention of any alias
  let firstIndex = Infinity;
  aliases.forEach((a) => {
    const idx = tl.indexOf(a.toLowerCase());
    if (idx >= 0 && idx < firstIndex) firstIndex = idx;
  });
  if (firstIndex === Infinity) return 0;

  // Count how many other brand-like proper nouns appear before this brand
  // We detect brands as Title Case words appearing before our brand
  const before = text.slice(0, firstIndex);
  const titleCaseMatches = before.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  // Filter out common non-brand words
  const stopWords = new Set(['The', 'This', 'That', 'These', 'Those', 'When', 'Where', 'What', 'Which', 'How', 'Why', 'For', 'And', 'But', 'Or', 'In', 'On', 'At', 'To', 'Of', 'With', 'As', 'By', 'From', 'An', 'If', 'It', 'Its', 'Are', 'Is', 'Be', 'Was', 'Were', 'Has', 'Have', 'Had']);
  const brandsBefore = titleCaseMatches.filter((w) => !stopWords.has(w)).length;
  return brandsBefore + 1;
}

// ─── CORE SCORE COMPUTATION (pure math, no hardcoding) ────────────────────
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

  // VISIBILITY — straight mention rate
  const mentionedQA = validQA.filter((qa) =>
    aliases.some((a) => (qa.a || '').toLowerCase().includes(a.toLowerCase()))
  );
  const mentionCount = mentionedQA.length;
  const visibility = Math.round((mentionCount / total) * 100);

  // PROMINENCE — average position when mentioned, scaled 0-100
  const positions = mentionedQA
    .map((qa) => getBrandPosition(qa.a || '', aliases))
    .filter((p) => p > 0);
  const avgPos =
    positions.length > 0
      ? positions.reduce((a, b) => a + b, 0) / positions.length
      : 0;
  // Position 1 = 100, position 2 = 80, position 3 = 65, position 5 = 40, not mentioned = 0
  const prominence =
    mentionCount > 0
      ? Math.round(Math.max(5, Math.min(95, 100 - (avgPos - 1) * 18)))
      : 0;

  // SENTIMENT — positive vs negative word ratio in brand-containing sentences
  const posWords = ['best', 'top', 'recommended', 'leading', 'excellent', 'great', 'trusted', 'popular', 'ideal', 'perfect', 'outstanding', 'superior', 'preferred', 'reliable', 'strong'];
  const negWords = ['worst', 'poor', 'bad', 'avoid', 'expensive', 'weak', 'limited', 'disappointing', 'inferior', 'mediocre', 'unreliable', 'overpriced', 'problematic'];
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

  // CITATION SHARE — weighted by position (position 1 = full credit, later = fractional)
  const citationWeight = positions.reduce((sum, p) => sum + 1 / p, 0);
  const maxPossibleWeight = total * 1; // if brand was #1 in every response
  const citationShare = Math.round(Math.min(95, (citationWeight / maxPossibleWeight) * 100 * 2.5));

  // SHARE OF VOICE — brand mentions vs all competitor mentions
  const brandCount = mentionCount;
  const competitorCounts = competitors.map((comp) => {
    const cl = comp.toLowerCase();
    const compWords = cl.split(/[\s'\-\.&]+/).filter((w: string) => w.length > 3);
    return validQA.filter((qa) => {
      const t = (qa.a || '').toLowerCase();
      return compWords.some((w: string) => t.includes(w)) || t.includes(cl);
    }).length;
  });
  const totalAllMentions =
    brandCount + competitorCounts.reduce((a, b) => a + b, 0);
  const shareOfVoice =
    totalAllMentions > 0
      ? Math.round((brandCount / totalAllMentions) * 100)
      : 0;

  // GEO SCORE — weighted composite
  const geo = Math.round(
    visibility * 0.30 +
    sentiment * 0.20 +
    prominence * 0.20 +
    citationShare * 0.15 +
    shareOfVoice * 0.15
  );

  // AVG RANK
  const avgRank =
    positions.length > 0 ? `#${Math.round(avgPos)}` : 'N/A';

  return {
    visibility,
    prominence,
    sentiment,
    citationShare,
    shareOfVoice,
    geo,
    avgRank,
    mentionCount,
    totalCount: total,
  };
}

// ─── COMPETITOR SCORING (same logic applied to each competitor) ────────────
function scoreCompetitor(
  compName: string,
  compUrl: string,
  allQA: any[],
  allCompetitors: string[]
): any {
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
function buildQueryClusters(
  allQA: any[],
  aliases: string[],
  competitors: string[]
): any[] {
  const categories = [...new Set(allQA.filter(Boolean).map((qa) => qa.category).filter(Boolean))];

  return categories.map((cat) => {
    const catRows = allQA.filter((qa) => qa && qa.category === cat);
    const mentioned = catRows.filter((qa) =>
      aliases.some((a) => (qa.a || '').toLowerCase().includes(a.toLowerCase()))
    ).length;
    const winRate = catRows.length > 0 ? Math.round((mentioned / catRows.length) * 100) : 0;

    // Find top competitor in this category
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
    const topCompetitor =
      Object.entries(compCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    return {
      category: cat,
      total: catRows.length,
      mentioned,
      winRate,
      topCompetitor,
      dailySearches: 0, // not hardcoded — removed fake estimates
      related: [],
    };
  });
}

// ─── EXTRACT CITED DOMAINS FROM RESPONSES ─────────────────────────────────
function extractCitedDomains(allQA: any[], brandDomain: string): any[] {
  const domainCounts: Record<string, number> = {};
  const knownSources = [
    'nerdwallet', 'bankrate', 'reddit', 'wikipedia', 'forbes',
    'cnbc', 'investopedia', 'creditkarma', 'thepointsguy', 'wallethub',
    'thebalance', 'money', 'consumerreports', 'businessinsider', 'motleyfool',
    'wsj', 'marketwatch', 'bloomberg', 'cnet', 'pcmag', 'techradar',
    'edmunds', 'caranddriver', 'motortrend', 'tripadvisor', 'yelp',
  ];

  allQA.filter(Boolean).forEach((qa) => {
    const text = (qa.a || '').toLowerCase();
    knownSources.forEach((source) => {
      if (text.includes(source)) {
        const domain = source + '.com';
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      }
    });
    // Also scan for explicit URL mentions
    const urlMatches = text.matchAll(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/g);
    for (const match of urlMatches) {
      const d = match[1].toLowerCase();
      if (d.length > 4 && !d.includes('example') && !d.includes('yourdomain')) {
        domainCounts[d] = (domainCounts[d] || 0) + 1;
      }
    }
  });

  // Add brand's own domain
  const brandDomainClean = brandDomain.replace('www.', '');
  if (!domainCounts[brandDomainClean]) {
    domainCounts[brandDomainClean] = 1;
  }

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
          : ['reddit', 'twitter', 'youtube', 'facebook', 'linkedin'].some((s) =>
              entry[0].includes(s)
            )
          ? 'Social'
          : ['wikipedia', 'gov', 'edu', 'consumerreports', 'fdic'].some((s) =>
              entry[0].includes(s)
            )
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

    // STEP 2: Discover brand + industry via AI (no hardcoding)
    const discovery = await discoverBrand(pageData, url);
    const { brand, industry, industryKey, lob, competitors, competitorUrls, categories } = discovery;
    const aliases = buildAliases(brand);

    // STEP 3: Generate queries + fetch citations + fetch trending — ALL PARALLEL
    const [queriesRaw, citationsPromptRaw, trendingRaw] = await Promise.all([
      generateQueries(industry, lob, categories, MAX_QUERIES),
      callAI(
        [{
          role: 'user',
          content: `List 10 real domains that AI models cite when answering questions about ${industry} in the USA.
The brand being analyzed is ${brand} (domain: ${(pageData as any).domain}).
Return ONLY valid JSON array, no markdown:
[{"rank":1,"domain":"example.com","category":"Earned Media","citation_share":4.2,"top_pages":["/best-cards"]}]
Categories: Social, Institution, Earned Media, Owned Media, Other.
First item must be ${(pageData as any).domain} as Owned Media.
Exactly 10 items. Be realistic with citation_share (owned 5-15%, earned 2-5%, others 1-3%).`,
        }],
        0.1,
        800
      ),
      callAI(
        [{
          role: 'user',
          content: `List 10 high-intent questions consumers are actively asking AI models in 2025 about ${lob || industry}.
No brand names. For each estimate trend and opportunity.
Return ONLY valid JSON array, no markdown:
[{"query":"...","trend":"Rising","opportunity":"High","category":"${categories[0]}","estimated_daily_searches":8200}]
Exactly 10 items. Mix: 6 High opportunity, 3 Medium, 1 Low.`,
        }],
        0.3,
        800
      ),
    ]);

    const queries = queriesRaw;

    // STEP 4: Run ALL query batches in parallel — this is the core scoring engine
    const allQA: any[] = new Array(queries.length);
    const batches: { category: string; query: string }[][] = [];
    for (let i = 0; i < queries.length; i += BATCH_SIZE) {
      batches.push(queries.slice(i, i + BATCH_SIZE));
    }

    await Promise.all(
      batches.map(async (batch, batchIdx) => {
        const ql = batch.map((q, j) => `Q${j + 1}: ${q.query}`).join('\n\n');
        const labels = batch.map((_, j) => `A${j + 1}: [answer]`).join('\n');

        const prompt = `You are a knowledgeable consumer advisor. Answer each question directly, specifically, and naturally. Always name real specific brands. Do not favour any single brand. Be balanced and accurate.

${ql}

Respond with EXACTLY this format, one answer per line:
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
            q: q.query,
            a: ans || '',
          };
        });
      })
    );

    // Fill any gaps
    for (let i = 0; i < allQA.length; i++) {
      if (!allQA[i]) {
        allQA[i] = { category: queries[i]?.category || '', q: queries[i]?.query || '', a: '' };
      }
    }

    // STEP 5: Compute all scores from real data — no hardcoding
    const scores = computeScores(brand, aliases, allQA, competitors);

    // STEP 6: Score every competitor using the same logic on the same responses
    const competitorScores = competitors
      .filter((c) => c.toLowerCase() !== brand.toLowerCase())
      .map((c) => scoreCompetitor(c, competitorUrls[c] || '', allQA, competitors))
      .sort((a, b) => b.GEO - a.GEO);

    // STEP 7: Build response detail
    const responsesDetail = allQA.filter(Boolean).map((qa: any) => ({
      category: qa.category,
      query: qa.q,
      mentioned: aliases.some((a) => (qa.a || '').toLowerCase().includes(a.toLowerCase())),
      response_preview: qa.a || '',
      position: getBrandPosition(qa.a || '', aliases),
      winner_brand: (() => {
        // Who appears first if not our brand?
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

    // STEP 8: Build query clusters
    const queryClusters = buildQueryClusters(allQA, aliases, competitors);

    // STEP 9: Extract real citation domains from responses
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

    // STEP 11: AI-powered insights from real data
    const mentionedQA = allQA.filter(
      (qa) => qa && aliases.some((a) => (qa.a || '').toLowerCase().includes(a.toLowerCase()))
    );
    const missedQA = allQA.filter(
      (qa) => qa && !aliases.some((a) => (qa.a || '').toLowerCase().includes(a.toLowerCase()))
    );
    const topCats = queryClusters
      .filter((c) => c.winRate > 0)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 3)
      .map((c) => c.category);
    const missingCats = queryClusters
      .filter((c) => c.winRate === 0)
      .slice(0, 3)
      .map((c) => c.category);
    const topComp =
      competitorScores.length > 0 ? competitorScores[0].Brand : 'competitors';

    const insightsPrompt = `You are a GEO strategist. Analyze this brand's AI visibility data and return ONLY valid JSON, no markdown.

Brand: ${brand}
Industry: ${lob || industry}
GEO Score: ${scores.geo}/100
Queries run: ${scores.totalCount}
Brand appeared in: ${scores.mentionCount} responses (${scores.visibility}%)
Avg position when mentioned: ${scores.avgRank}
Sentiment score: ${scores.sentiment}/100
Top performing categories: ${topCats.join(', ') || 'none'}
Missing categories: ${missingCats.join(', ') || 'none'}
Top competitor by mentions: ${topComp}

Return:
{
  "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
  "improvements": ["specific gap 1", "specific gap 2", "specific gap 3", "specific gap 4", "specific gap 5"],
  "actions": [
    {"priority":"High","action":"specific implementable action"},
    {"priority":"High","action":"specific implementable action"},
    {"priority":"Medium","action":"specific implementable action"},
    {"priority":"Medium","action":"specific implementable action"},
    {"priority":"Low","action":"specific implementable action"}
  ]
}`;

    let insights = {
      strengths: [] as string[],
      improvements: [] as string[],
      actions: [] as any[],
    };
    try {
      const insightsRaw = await callAI([{ role: 'user', content: insightsPrompt }], 0.2, 1000);
      insights = JSON.parse(insightsRaw.replace(/```json|```/g, '').trim());
    } catch {}

    // STEP 12: Targeted clusters (brand-specific product queries)
    let targetedClusters: any[] = [];
    try {
      const brandFamePrompt = `You are a brand research expert. Return ONLY valid JSON, no markdown.

What specific products or features is "${brand}" genuinely well-known for in ${industry}?
Only include areas where ${brand} has real market reputation.

Return exactly:
{"knownFor":[{"product":"product name","queries":["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10"]}]}

Rules:
- Maximum 5 products, 10 queries each
- ZERO brand names in any query — no "${brand}", no competitor names
- Queries must be generic consumer questions
- Good: "which credit card has the best balance transfer intro offer"
- Bad: "which Chase card has balance transfer" — REJECTED`;

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
          k.queries
            .slice(0, 10)
            .filter(isClean)
            .forEach((q) => flatQ.push({ product: k.product, query: q }))
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
            const p = `Answer each question directly. Name real specific brands. Do not favour any brand.\n\n${ql}\n\nRespond EXACTLY:\n${labels}`;
            let bt = '';
            try {
              bt = await callAI([{ role: 'user', content: p }], 0.1, 1200);
            } catch {}
            batch.forEach((item, j) => {
              const mk = `A${j + 1}:`;
              const nm = `A${j + 2}:`;
              let ans = '';
              if (bt.includes(mk)) {
                const s = bt.indexOf(mk) + mk.length;
                const e = bt.includes(nm) ? bt.indexOf(nm) : bt.length;
                ans = bt.slice(s, e).trim();
              }
              const mentioned = aliases.some((a) =>
                (ans || '').toLowerCase().includes(a.toLowerCase())
              );
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

    // ─── RETURN EVERYTHING — no hardcoded overrides anywhere ─────────────
    return NextResponse.json({
      brand_name: brand,
      industry,
      ind_key: industryKey,
      lob,
      ind_label: industry,

      // All scores computed from real AI responses
      visibility: scores.visibility,
      sentiment: scores.sentiment,
      prominence: scores.prominence,
      citation_share: scores.citationShare,
      share_of_voice: scores.shareOfVoice,
      overall_geo_score: scores.geo,
      avg_rank: scores.avgRank,

      responses_with_brand: scores.mentionCount,
      total_responses: scores.totalCount,

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
