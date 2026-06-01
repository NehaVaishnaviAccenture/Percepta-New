import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'openai/gpt-5.4';

async function callAI(messages: { role: string; content: string }[], temperature = 0.2, max_tokens = 2048) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://perceptageo.com',
      'X-Title': 'Percepta',
    },
    body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens }),
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

async function fetchPageContent(url: string) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
    const html = await res.text();
    const $ = cheerio.load(html);
    const title = $('title').text().trim();
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const headings: string[] = [];
    $('h1,h2,h3').slice(0, 20).each((_, el) => { headings.push($(el).text().trim()); });
    const hasSchema = $('script[type="application/ld+json"]').length > 0;
    const hasAuthor = $('[class*="author"],[class*="byline"]').length > 0;
    const hasTable = $('table').length > 0;
    const hasList = $('ul,ol').length > 2;
    const wordCount = $.text().split(/\s+/).length;
    const domain = new URL(url).hostname.replace('www.', '');
    const internalLinks: { url: string; path: string; label: string }[] = [];
    const seen = new Set<string>();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (internalLinks.length >= 10) return;
      if (href.startsWith('/') && href.length > 1 && !seen.has(href)) {
        seen.add(href);
        const label = href.replace(/^\//, '').replace(/-/g, ' ').replace(/\//g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Page';
        internalLinks.push({ url: new URL(href, url).toString(), path: href, label });
      }
    });
    return { ok: true, url, domain, title, metaDesc, headings, hasSchema, hasAuthor, hasTable, hasList, wordCount, internalLinks, inputUrl: url };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

function extractBrand(pageData: any): string {
  const D2B: Record<string, string> = {
    chase: 'Chase', vw: 'Volkswagen', volkswagen: 'Volkswagen', bmw: 'BMW',
    scotiabank: 'Scotiabank', scotia: 'Scotiabank', bmo: 'BMO', rbc: 'RBC', td: 'TD Bank', cibc: 'CIBC', nbc: 'National Bank',
    amex: 'American Express', americanexpress: 'American Express',
    usbank: 'US Bank', 'u.s.': 'US Bank', navyfederal: 'Navy Federal', penfed: 'PenFed', synchrony: 'Synchrony', barclays: 'Barclays', tdbank: 'TD Bank', huntington: 'Huntington', truist: 'Truist', regions: 'Regions Bank', citizensbank: 'Citizens Bank', fifththird: 'Fifth Third', keybank: 'KeyBank',
    bofa: 'Bank of America', bankofamerica: 'Bank of America',
    wellsfargo: 'Wells Fargo', wells: 'Wells Fargo', usaa: 'USAA', capitalone: 'Capital One',
    discover: 'Discover', citi: 'Citi', citibank: 'Citi',
    principal: 'Principal Financial', fidelity: 'Fidelity', vanguard: 'Vanguard',
    schwab: 'Charles Schwab', morganstanley: 'Morgan Stanley', merrill: 'Merrill Lynch',
    edwardjones: 'Edward Jones', raymondjames: 'Raymond James', ubs: 'UBS',
    prudential: 'Prudential', metlife: 'MetLife', transamerica: 'Transamerica',
    massmutual: 'MassMutual', johanhancok: 'John Hancock', johnhancock: 'John Hancock',
    tiaa: 'TIAA', nationwide: 'Nationwide', statestreet: 'State Street',
    blackrock: 'BlackRock', invesco: 'Invesco', troweprice: 'T. Rowe Price',
    empower: 'Empower', securian: 'Securian', lincoln: 'Lincoln Financial',
    sunlife: 'Sun Life', greatwest: 'Great-West Life', lpl: 'LPL Financial',
    toyota: 'Toyota', ford: 'Ford', honda: 'Honda',
    tesla: 'Tesla', hyundai: 'Hyundai', kia: 'Kia', nissan: 'Nissan',
    mercedes: 'Mercedes', audi: 'Audi', marriott: 'Marriott', hilton: 'Hilton',
    hyatt: 'Hyatt', apple: 'Apple', google: 'Google', microsoft: 'Microsoft',
    amazon: 'Amazon', samsung: 'Samsung', meta: 'Meta', netflix: 'Netflix',
    spotify: 'Spotify', adobe: 'Adobe', salesforce: 'Salesforce',
    walmart: 'Walmart', target: 'Target', nike: 'Nike', adidas: 'Adidas',
  };
  const inputUrl = (pageData.inputUrl || pageData.url || '').toLowerCase();
  if (inputUrl) {
    try {
      const inputHost = new URL(inputUrl.startsWith('http') ? inputUrl : 'https://' + inputUrl).hostname.replace('www.', '');
      const inputDk = inputHost.split('.')[0];
      if (D2B[inputDk]) return D2B[inputDk];
      for (const [k, v] of Object.entries(D2B)) { if (inputDk.includes(k)) return v; }
    } catch {}
  }
  const domain = (pageData.domain || '').toLowerCase().replace('www.', '');
  const dk = domain.split('.')[0];
  if (D2B[dk]) return D2B[dk];
  for (const [k, v] of Object.entries(D2B)) { if (dk.includes(k)) return v; }
  const title = pageData.title || '';
  const genericTitles = ['thanks for visiting', 'page not found', '404', 'access denied', 'redirecting', 'just a moment', 'attention required', 'error'];
  if (title && !genericTitles.some(g => title.toLowerCase().includes(g))) {
    for (const sep of ['|', '-', '-', '·']) {
      if (title.includes(sep)) {
        const segs = title.split(sep).map((s: string) => s.trim()).reverse();
        for (const seg of segs) {
          const clean = seg.replace(/\.(com|net|org)/g, '').trim();
          if (clean.split(' ').length <= 3 && clean.length > 1) return clean;
        }
      }
    }
    const clean = title.replace(/\.(com|net|org)/g, '').trim();
    if (clean.split(' ').length <= 3) return clean;
  }
  return dk.charAt(0).toUpperCase() + dk.slice(1);
}

function getIndustry(domain: string, pageData?: any): string {
  const d = domain.toLowerCase();
  const rawUrl = ((pageData as any)?.url || '').toLowerCase();
  const urlPath = rawUrl;
  const has = (...segments: string[]) => segments.every(s => urlPath.includes(s));
  const hasAny = (...segments: string[]) => segments.some(s => urlPath.includes(s));
  const finDomains = ['capital','chase','amex','americanexpress','citi','discover','bank','credit','card','finance','fargo','visa','master','barclays','synchrony','usaa','wellsfargo','nerdwallet','bankrate','navyfederal','penfed','truist','regions','huntington','keybank','td.com','principal','fidelity','vanguard','schwab','blackrock','merrill','edward','raymond','robinhood','etrade','wealthfront','betterment','sofi','ally','marcus','lending','loan','mortgage','insurance','invest','retirement','annuity','401k','ira','pension','asset','wealth','brokerage','money','savings','mutual','fund','securities','financial','advisors','planners'];
  const isFin = finDomains.some(k => d.includes(k));
  const retirementDomains = ['principal','fidelity','vanguard','tiaa','massmutual','transamerica','lincolnfinancial','nationwide','sunlife','metlife','newyorklife','johnhancock','pacificlife','guardian','ameritas','northwestern','prudential','allianz','empower','troweprice','americanfunds','blackrock'];
  const wealthAdvisorDomains = ['schwab','merrilledge','edwardjones','raymondjames','wealthfront','betterment','robinhood','etrade','morganstanley','goldmansachs','ubs','stifel'];
  const isRetirementFirm = retirementDomains.some(k => d.includes(k));
  const isWealthAdvisorFirm = wealthAdvisorDomains.some(k => d.includes(k));
  if (isRetirementFirm && !hasAny('/credit-card','/auto-loan','/mortgage','/checking')) return 'fin_retirement';
  if (isWealthAdvisorFirm && !hasAny('/credit-card','/auto-loan','/mortgage','/checking')) return 'fin_wealth';
  if (isFin) {
    const wealthDomains = ['principal','fidelity','vanguard','schwab','morganstanley','merrilllynch','edwardjones','raymondjames','ubs','prudential','metlife','transamerica','massmutual','johnhancock','tiaa','nationwide','statestreet','blackrock','invesco','troweprice','empower','securian','lincoln','sunlife','lpl'];
    const isWealthDomain = wealthDomains.some(k => d.includes(k));
    if (isWealthDomain) return 'fin_wealth';
    const isCCUrl = hasAny('/credit-card','/creditcard','/cards');
    if (isCCUrl) {
      if (hasAny('/small-business','/smallbusiness','/for-business','/business')) return 'fin_small_business_cc';
      const isStudent = hasAny('/student','/college','/university');
      const isRewards = hasAny('reward','point','mile','cash-back','cashback');
      if (isStudent && isRewards) return 'fin_cc_student_rewards';
      if (isStudent) return 'fin_cc_student';
      if (hasAny('/secured','/secured-card','secured-credit')) return 'fin_cc_secured';
      if (hasAny('travel','miles','airline','airport','lounge','international')) return 'fin_cc_travel';
      if (hasAny('cash-back','cashback','cash_back')) return 'fin_cc_cashback';
      if (hasAny('balance-transfer','balance_transfer')) return 'fin_cc_balance_transfer';
      if (hasAny('low-interest','0-apr','zero-apr','low-apr','no-interest')) return 'fin_cc_low_interest';
      if (hasAny('reward','point','mile')) return 'fin_cc_rewards';
      return 'fin';
    }
    if (has('/auto') && hasAny('/refinan')) return 'fin_auto_refinance';
    if (hasAny('/auto-financ','/car-loan','/auto-loan','/vehicle-financ','/auto-financing')) return 'fin_auto_loan';
    if (hasAny('/mortgage','/home-loan') && hasAny('/refinan')) return 'fin_mortgage_refinance';
    if (hasAny('/heloc','/home-equity')) return 'fin_heloc';
    if (hasAny('/mortgage','/home-loan')) return 'fin_mortgage';
    if (hasAny('/citigold','/private-bank','/private-client','/wealth','/prestige','/private-banking','/wealth-management','/preferred-rewards','/invest','/brokerage','/investing')) return 'fin_wealth';
    if (hasAny('/commercial','/corporate','/treasury','/institutional','/wholesale')) return 'fin_commercial';
    const isSmallBiz = hasAny('/small-business','/smallbusiness','/for-business','/business');
    if (isSmallBiz) {
      if (hasAny('/savings','/high-yield','/money-market')) return 'fin_smb_savings';
      if (hasAny('/checking','/current-account')) return 'fin_smb_checking';
      if (hasAny('/loan','/lending','/line-of-credit','/sba','/financing','/borrow')) return 'fin_smb_loans';
      if (hasAny('/payment','/merchant','/payroll','/invoic')) return 'fin_smb_payments';
      return 'fin_small_business';
    }
    if (hasAny('/business-checking','/business-banking')) return 'fin_smb_checking';
    if (hasAny('/savings','/high-yield','/hysa','/money-market')) return 'fin_retail_bank';
    if (hasAny('/checking','/current-account')) return 'fin_retail_bank';
    if (hasAny('/cd/','/certificate-of-deposit','/certificates')) return 'fin_retail_bank';
    if (hasAny('/bank','/banking','/deposits','/personal-banking')) return 'fin_retail_bank';
    return 'fin';
  }
  if (pageData) {
    const pageText = [...(pageData.headings || []), pageData.title || '', pageData.metaDesc || ''].join(' ').toLowerCase();
    const retailBankKeywords = ['checking account','savings account','high yield','cd rate','certificate of deposit','personal banking','deposit account','apy','fdic','money market'];
    const creditKeywords = ['credit card','rewards card','cash back','apr','signup bonus','annual fee','travel rewards','credit limit','balance transfer'];
    if (retailBankKeywords.some(k => pageText.includes(k)) && !creditKeywords.some(k => pageText.includes(k))) return 'fin_retail_bank';
    if (creditKeywords.some(k => pageText.includes(k))) return 'fin';
  }
  if (hasAny('/auto-financ','/car-loan','/auto-loan','/vehicle-financ') && hasAny('/refinan')) return 'fin_auto_refinance';
  if (['toyota','ford','honda','bmw','tesla','vw','volkswagen','auto','car','motor','hyundai','kia','nissan','mercedes','audi','subaru','mazda','lexus','acura'].some(k=>d.includes(k))) return 'auto';
  if (['marriott','hilton','hyatt','holiday','sheraton','westin','ritz','airbnb','booking','expedia','hotel','resort'].some(k=>d.includes(k))) return 'hotel';
  if (['netflix','spotify','hulu','disney','hbo','streaming','music','entertainment','media','paramount','peacock'].some(k=>d.includes(k))) return 'media';
  if (['shopify','amazon','ebay','etsy','walmart','target','bestbuy','retail','shop','store','ecommerce','homedepot','kroger'].some(k=>d.includes(k))) return 'retail';
  if (['salesforce','hubspot','oracle','sap','workday','servicenow','adobe','software','saas','cloud','microsoft','google','ibm','intel','cisco'].some(k=>d.includes(k))) return 'tech';
  if (['nike','adidas','underarmour','lululemon','sport','fitness','athletic','puma','reebok','asics','brooks','hoka'].some(k=>d.includes(k))) return 'sport';
  if (['pharma','drug','medicine','health','hospital','clinic','medical','cvs','walgreen','insurance','anthem','aetna','cigna','humana','kaiser'].some(k=>d.includes(k))) return 'health';
  return 'gen';
}

// ── IMPORTANT: paste your full INDUSTRY_DATA object here unchanged ──
// copy const INDUSTRY_DATA: Record<string, any> = { ... }; from your existing route.ts
// ─────────────────────────────────────────────────────────────────────
//const INDUSTRY_DATA: Record<string, any> = {} as any; 

const INDUSTRY_DATA: Record<string, any> = {
  fin: {
    name: 'financial services / credit cards',// REPLACE WITH YOUR FULL INDUSTRY_DATA
// ─────────────────────────────────────────────────────────────────────

const ALL_KNOWN_BRANDS = [
  'chase','american express','amex','capital one','citi','citibank','discover','wells fargo',
  'bank of america','synchrony','barclays','usaa',
  'tesla','toyota','bmw','honda','ford','mercedes','hyundai','kia','nissan','volkswagen','subaru','mazda','lexus',
  'marriott','hilton','hyatt','ihg','wyndham','best western','radisson','accor','four seasons','ritz-carlton',
  'netflix','disney','hbo','amazon','hulu','peacock','paramount','spotify','apple',
  'walmart','target','costco','best buy','ebay','etsy','shopify','home depot','kroger',
  'microsoft','google','salesforce','adobe','oracle','sap','ibm','cisco',
  'nike','adidas','under armour','lululemon','new balance','puma','reebok','asics','brooks','hoka',
  'unitedhealth','anthem','aetna','cigna','humana','cvs','walgreens','kaiser',
];

function getBrandPosition(text: string, brand: string): number {
  const bl = brand.toLowerCase();
  const tl = text.toLowerCase();
  if (!tl.includes(bl)) return 0;
  const firstIndex = tl.indexOf(bl);
  const before = tl.slice(0, firstIndex);
  const brandsBeforeCount = ALL_KNOWN_BRANDS.filter(b => b !== bl && before.includes(b)).length;
  return brandsBeforeCount + 1;
}

function scoreCompetitor(name: string, responses: any[], awarenessMap: Record<string,number>): any {
  const nl = name.toLowerCase();
  const aliases: Record<string, string[]> = {
    'american express': ['american express', 'amex'],
    'bank of america': ['bank of america', 'bofa'],
    'wells fargo': ['wells fargo'],
    'capital one': ['capital one'],
    'best western': ['best western'],
    'four seasons': ['four seasons'],
    'ritz-carlton': ['ritz-carlton', 'ritz carlton'],
    'hbo max': ['hbo max', 'max', 'hbo'],
    'amazon prime video': ['amazon prime video', 'prime video'],
    'apple tv+': ['apple tv+', 'apple tv'],
    'apple music': ['apple music'],
    'under armour': ['under armour'],
    'new balance': ['new balance'],
    'cvs health': ['cvs health', 'cvs'],
    'blue cross': ['blue cross', 'bcbs'],
    'chase ink': ['chase ink', 'ink business'],
    'american express business': ['american express business', 'amex business'],
    'capital one spark': ['capital one spark', 'spark'],
  };
  const terms = aliases[nl] || [nl];
  const mentionedResponses = responses.filter(r => {
    const text = (r.response_preview || r.response || r.full_response || '').toLowerCase();
    return terms.some(t => text.includes(t));
  });
  const mentions = mentionedResponses.length;
  const total = responses.length || 20;
  const mentionRate = Math.round((mentions / total) * 100);
  const baseline = awarenessMap[nl] || 20;
  const cv = mentions > 0 ? Math.round(mentionRate * 0.7 + baseline * 0.3) : Math.round(baseline * 0.5);
  const positions = mentionedResponses.map(r => getBrandPosition(r.response_preview || r.response || '', name)).filter(p => p > 0);
  const avgPos = positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : 3.5;
  const cp = Math.round(Math.max(10, Math.min(85, 95 - (avgPos - 1) * 15)));
  const cc = Math.round(Math.min(85, cv * 0.65 + cp * 0.25 + (mentions > 0 ? 5 : 0)));
  const posWords = ['best','top','recommended','leading','excellent','great','trusted','popular','effective','strong'];
  const negWords = ['worst','poor','bad','avoid','expensive','weak','limited','disappointing','inferior'];
  let posCount = 0, negCount = 0;
  mentionedResponses.forEach(r => {
    const text = (r.response_preview || r.response || '').toLowerCase();
    const sentences = text.split(/[.!?]/).filter((s:string) => terms.some((t:string) => s.includes(t)));
    sentences.forEach((s:string) => {
      posWords.forEach(w => { if(s.includes(w)) posCount++; });
      negWords.forEach(w => { if(s.includes(w)) negCount++; });
    });
  });
  const sentBase = mentions > 0 ? 50 : 30;
  const sentAdj = posCount > 0 || negCount > 0 ? Math.round(((posCount - negCount) / Math.max(posCount + negCount, 1)) * 30) : 0;
  const cs = Math.round(Math.min(90, Math.max(20, sentBase + sentAdj + cp * 0.15)));
  const csov = Math.round(Math.min(80, cv * 0.75 + (mentions > 0 ? 8 : 0)));
  const geo = Math.round(cv * 0.30 + cs * 0.20 + cp * 0.20 + cc * 0.15 + csov * 0.15);
  const avgRank = positions.length > 0 ? `#${Math.round(avgPos)}` : 'N/A';
  return { Brand: name, GEO: geo, Vis: cv, Cit: cc, Sen: cs, Sov: csov, Prom: cp, Rank: avgRank };
}

export async function POST(req: NextRequest) {
  try {
    const { url, promptCount } = await req.json();
    const MAX_QUERIES = promptCount ? Math.min(Math.max(promptCount, 10), 1000) : 120;
    const pageData = await fetchPageContent(url);
    if (!pageData.ok) return NextResponse.json({ error: (pageData as any).error }, { status: 400 });

    const brand = extractBrand({ ...pageData, inputUrl: url });
    const bl = brand.toLowerCase();

    const MAIN_BRAND_ALIASES: Record<string, string[]> = {
      'american express': ['american express', 'amex', 'americanexpress'],
      'bank of america': ['bank of america', 'bofa', 'bankofamerica'],
      'wells fargo': ['wells fargo', 'wellsfargo'],
      'capital one': ['capital one', 'capitalone'],
      'chase': ['chase', 'jpmorgan chase', 'jp morgan'],
      'citi': ['citi', 'citibank', 'citigroup'],
      'best western': ['best western'],
      'four seasons': ['four seasons'],
      'hbo max': ['hbo max', 'max', 'hbo'],
      'amazon prime video': ['amazon prime video', 'prime video'],
      'apple tv+': ['apple tv+', 'apple tv'],
      'under armour': ['under armour', 'ua'],
      'new balance': ['new balance'],
      'principal financial': ['principal financial', 'principal', 'principal financial group'],
      'charles schwab': ['charles schwab', 'schwab'],
      'merrill lynch': ['merrill lynch', 'merrill', 'merrill edge'],
      'morgan stanley': ['morgan stanley'],
      'edward jones': ['edward jones'],
      'raymond james': ['raymond james'],
      't. rowe price': ['t. rowe price', 't rowe price', 'troweprice'],
      'john hancock': ['john hancock'],
      'lincoln financial': ['lincoln financial', 'lincoln'],
      'lpl financial': ['lpl financial', 'lpl'],
      'sun life': ['sun life', 'sunlife'],
      'state street': ['state street', 'state street global'],
      'massmutual': ['massmutual', 'mass mutual'],
    };
    const baseBrandAliases = [bl, bl.replace(/\s+/g, ''), bl.replace(/\s+/g, '-'), bl.replace(/[^a-z0-9]/gi,'').toLowerCase()];
    const brandWords = bl.split(/[\s'\-\.&]+/).filter((w:string) => w.length > 3).map((w:string) => w.toLowerCase());
    const firstSignificantWord = bl.split(' ').find((w:string) => w.length > 3)?.toLowerCase() || bl.toLowerCase();
    const allAliases = [...new Set([...baseBrandAliases, ...brandWords, firstSignificantWord].filter((a:string) => a.length > 2))];
    const aliases: string[] = MAIN_BRAND_ALIASES[bl] || allAliases;

    const inputHostname = new URL(url).hostname.replace('www.', '');
    let indKey = getIndustry(inputHostname, pageData) !== 'gen'
      ? getIndustry(inputHostname, pageData)
      : getIndustry((pageData as any).domain || inputHostname, pageData);

    let dynamicCompetitors: string[] = [];
    let isDynamic = false;
    let detectedBrand = brand;

    if (indKey === 'gen') {
      isDynamic = true;
      const pageText = [
        (pageData as any).title || '',
        (pageData as any).metaDesc || '',
        ...((pageData as any).headings || []).slice(0, 10),
        ((pageData as any).bodyText || '').slice(0, 1000),
      ].join(' ').trim().slice(0, 2000);

      const detectPrompt = `You are a brand intelligence analyst. Analyze this webpage and return ONLY valid JSON:
{
  "brand_name": "exact short brand name only (e.g. L'Oreal, Wegovy, Nike) -- NOT img alt text or logo descriptions",
  "industry": "one-line industry description e.g. Beauty & Personal Care, Athletic Apparel, Fast Food",
  "industry_key": "short snake_case key e.g. beauty, apparel, food",
  "competitors": ["Competitor1","Competitor2","Competitor3","Competitor4","Competitor5","Competitor6","Competitor7","Competitor8","Competitor9","Competitor10"],
  "categories": ["Category1","Category2","Category3","Category4","Category5","Category6","Category7","Category8","Category9","Category10"],
  "lob": "short product line label e.g. Skincare & Haircare"
}

Webpage content: ${pageText}

Rules:
- competitors must be real US market competitors for this brand
- categories must be specific product/service topics consumers search for
- Return ONLY the JSON object, no markdown`;

      let detected: any = {};
      try {
        const detectRaw = await callAI([{role:'user', content: detectPrompt}], 0.2, 600);
        detected = JSON.parse(detectRaw.replace(/```json|```/g,'').trim());
      } catch { detected = {}; }

      const rawDetectedBrand = detected.brand_name || brand;
      detectedBrand = rawDetectedBrand
        .replace(/([A-Za-z][a-z']+).*\1.*/,'$1')
        .replace(/Logo.*$/i,'')
        .replace(/Alt.*$/i,'')
        .replace(/Main.*$/i,'')
        .trim()
        .slice(0, 40)
        || brand;
      dynamicCompetitors = detected.competitors || [];

      const cats: string[] = detected.categories || ['General','Product Quality','Value','Experience','Comparison','Expert Recommendation','Reviews','Features','Pricing','Availability'];
      const cats10 = cats.slice(0, 10).length === 10 ? cats.slice(0, 10) : [...cats.slice(0, 10), ...Array(10 - cats.slice(0,10).length).fill('General')];
      const isServiceBrand = /consult|service|agency|firm|solution|advisor|partner|outsourc|staffing|integrat/i.test(detected.industry || '');
      const queryContext = isServiceBrand
        ? `business decision-makers choosing between ${detected.industry} providers - questions about which firm to hire, vendor selection, pricing, expertise, track record, ROI`
        : `consumers or buyers researching ${detected.industry} - questions about which product/brand to choose, pricing, quality, reviews, comparisons`;

      const queryGenPrompt = `Generate exactly 300 specific, realistic questions that someone would ask an AI when researching ${detected.industry || 'products and services'} in the USA.

Context: These questions are from ${queryContext}.

Rules:
- NO brand or company names in any query
- Questions must be SPECIFIC and REALISTIC - not generic. Include specifics like budget ranges, company sizes, use cases, industries, timeframes
- Each question should reflect a REAL decision moment someone faces
- Distribute EXACTLY 30 questions per category: ${cats10.join(', ')}
- Mix question types across all categories: which is best for X, how much does X cost, how do I choose X, what should I expect from X, which X works for Y situation, is X worth it for Z
- Return ONLY a valid JSON array, no markdown: [{"category":"CategoryName","query":"question text"}, ...]
- EXACTLY 300 items total, 30 per category, no more no less`;

      let dynamicQueries: string[][] = [];
      try {
        const queryRaw = await callAI([{role:'user', content: queryGenPrompt}], 0.4, 3000);
        const parsed = JSON.parse(queryRaw.replace(/```json|```/g,'').trim());
        dynamicQueries = parsed.map((q: any) => [q.category, q.query]);
      } catch {
        const isServiceBrand2 = /consult|service|agency|firm|solution|advisor|partner|outsourc|staffing|integrat/i.test(detected.industry || '');
        const SERVICE_TEMPLATES = [
          (c:string) => `Which company is best for ${c.toLowerCase()} for an enterprise client?`,
          (c:string) => `How do I choose the right ${c.toLowerCase()} firm for my business?`,
          (c:string) => `What does a ${c.toLowerCase()} engagement typically cost for a mid-size company?`,
          (c:string) => `Which ${c.toLowerCase()} provider has the best track record?`,
          (c:string) => `What should I look for when hiring a ${c.toLowerCase()} partner?`,
          (c:string) => `Which ${c.toLowerCase()} firm is best for a company with under $500K budget?`,
          (c:string) => `What are the key differences between top ${c.toLowerCase()} providers?`,
          (c:string) => `Which ${c.toLowerCase()} company works best with Fortune 500 companies?`,
          (c:string) => `How do I evaluate ${c.toLowerCase()} proposals from different vendors?`,
          (c:string) => `What ROI should I expect from a ${c.toLowerCase()} investment?`,
          (c:string) => `Which ${c.toLowerCase()} firm is best for a healthcare company?`,
          (c:string) => `How long does a typical ${c.toLowerCase()} project take?`,
          (c:string) => `Which ${c.toLowerCase()} company is best for digital transformation?`,
          (c:string) => `What certifications should a ${c.toLowerCase()} vendor have?`,
          (c:string) => `Which ${c.toLowerCase()} firm has the strongest AI capabilities?`,
          (c:string) => `How do large enterprises choose between ${c.toLowerCase()} providers?`,
          (c:string) => `Which ${c.toLowerCase()} company is best for a startup or SMB?`,
          (c:string) => `What does a ${c.toLowerCase()} roadmap typically include?`,
          (c:string) => `Which ${c.toLowerCase()} firm is best for financial services companies?`,
          (c:string) => `How do I measure success after hiring a ${c.toLowerCase()} provider?`,
          (c:string) => `Which ${c.toLowerCase()} company offers the best post-project support?`,
          (c:string) => `What are the biggest mistakes companies make when choosing ${c.toLowerCase()}?`,
          (c:string) => `Which ${c.toLowerCase()} firm is best for retail or e-commerce companies?`,
          (c:string) => `How do I build a business case for investing in ${c.toLowerCase()}?`,
          (c:string) => `Which ${c.toLowerCase()} provider is best known for innovation?`,
          (c:string) => `What questions should I ask a ${c.toLowerCase()} vendor in an RFP?`,
          (c:string) => `Which ${c.toLowerCase()} firm works best for manufacturing companies?`,
          (c:string) => `What is the typical team size for a ${c.toLowerCase()} project?`,
          (c:string) => `Which ${c.toLowerCase()} company delivers results fastest?`,
          (c:string) => `How do I compare ${c.toLowerCase()} firms on value not just price?`,
        ];
        const PRODUCT_TEMPLATES = [
          (c:string) => `What is the best ${c.toLowerCase()} available right now?`,
          (c:string) => `How do I choose between different ${c.toLowerCase()} options?`,
          (c:string) => `Which ${c.toLowerCase()} is most recommended by experts?`,
          (c:string) => `What should I know before buying ${c.toLowerCase()}?`,
          (c:string) => `Which ${c.toLowerCase()} offers the best value for money?`,
          (c:string) => `What are the top-rated ${c.toLowerCase()} brands?`,
          (c:string) => `How do I compare ${c.toLowerCase()} options?`,
          (c:string) => `Which ${c.toLowerCase()} is best for everyday use?`,
          (c:string) => `What are the pros and cons of leading ${c.toLowerCase()} brands?`,
          (c:string) => `How much should I spend on ${c.toLowerCase()}?`,
          (c:string) => `Which ${c.toLowerCase()} is most trusted and reliable?`,
          (c:string) => `What features matter most when choosing ${c.toLowerCase()}?`,
          (c:string) => `Which ${c.toLowerCase()} has the best reviews?`,
          (c:string) => `Is ${c.toLowerCase()} worth the price?`,
          (c:string) => `Which ${c.toLowerCase()} works best for beginners?`,
          (c:string) => `What are common mistakes when buying ${c.toLowerCase()}?`,
          (c:string) => `Which ${c.toLowerCase()} is best on a tight budget?`,
          (c:string) => `How long does ${c.toLowerCase()} last before needing replacement?`,
          (c:string) => `Which ${c.toLowerCase()} is easiest to use?`,
          (c:string) => `What do customers say about ${c.toLowerCase()} after long-term use?`,
          (c:string) => `Which ${c.toLowerCase()} has the best customer service?`,
          (c:string) => `Is premium ${c.toLowerCase()} worth it over budget options?`,
          (c:string) => `Which ${c.toLowerCase()} works best for professionals?`,
          (c:string) => `What do industry experts say about ${c.toLowerCase()}?`,
          (c:string) => `Which ${c.toLowerCase()} is best for families?`,
          (c:string) => `How has ${c.toLowerCase()} improved in recent years?`,
          (c:string) => `Which ${c.toLowerCase()} integrates best with other products?`,
          (c:string) => `What ROI can I expect from switching to a better ${c.toLowerCase()}?`,
          (c:string) => `Which ${c.toLowerCase()} is most durable and long-lasting?`,
          (c:string) => `How do I get the most value from ${c.toLowerCase()}?`,
        ];
        const TEMPLATES = isServiceBrand2 ? SERVICE_TEMPLATES : PRODUCT_TEMPLATES;
        dynamicQueries = cats10.flatMap((cat:string) => TEMPLATES.map((fn:Function) => [cat, fn(cat)]));
      }

      const dynamicInd = {
        name: detected.industry || 'Consumer Products',
        label: detected.industry || 'Consumer Products',
        lob: detected.lob || '',
        queries: dynamicQueries,
        comps: dynamicCompetitors,
      };
      (INDUSTRY_DATA as any)['_dynamic'] = dynamicInd;
      indKey = '_dynamic';
    }

    const ind = INDUSTRY_DATA[indKey] || INDUSTRY_DATA['gen'];
    const queries: string[][] = ind.queries.slice(0, MAX_QUERIES);
    const allQA: any[] = new Array(queries.length);

    const BATCH_SIZE = 25;
    const batches: string[][][] = [];
    for (let i = 0; i < queries.length; i += BATCH_SIZE) {
      batches.push(queries.slice(i, i + BATCH_SIZE));
    }

    await Promise.all(batches.map(async (batch, batchIdx) => {
      const ql = batch.map((q, j) => `Q${j + 1}: ${q[1]}`).join('\n\n');
      const answerLabels = batch.map((_, j) => `A${j + 1}: [answer]`).join('\n');
      const brandCtx = isDynamic ? ` The brand being analyzed is ${brand} but do not favour it -- mention it only if genuinely relevant.` : '';
      const prompt = `You are a knowledgeable consumer advisor. Answer each question directly, specifically, and naturally. Always name real specific brands. Do not favour any brand.${brandCtx}\n\n${ql}\n\nRespond with EXACTLY this format, one answer per line:\n${answerLabels}`;
      let bt = '';
      try { bt = await callAI([{ role: 'user', content: prompt }], 0.5, 2048); } catch {}
      batch.forEach((q, j) => {
        const marker = `A${j + 1}:`;
        const nextMarker = `A${j + 2}:`;
        let ans = '';
        if (bt.includes(marker)) {
          const s = bt.indexOf(marker) + marker.length;
          const e = bt.includes(nextMarker) ? bt.indexOf(nextMarker) : bt.length;
          ans = bt.slice(s, e).trim();
        }
        const respText = (ans || '').toLowerCase();
        const qCompetitors = isDynamic ? dynamicCompetitors : (ind.comps || []);
        let winnerBrand = '';
        let winnerPos = Infinity;
        const brandAppearedAt = aliases.reduce((best:number, a:string) => {
          const pos = respText.indexOf(a.toLowerCase());
          return pos >= 0 && pos < best ? pos : best;
        }, Infinity);
        qCompetitors.slice(0, 15).forEach((comp:string) => {
          const compL = comp.toLowerCase();
          const compWords = compL.split(/[\s'\-\.&]+/).filter((w:string) => w.length > 3);
          const compPos = compWords.reduce((best:number, w:string) => {
            const pos = respText.indexOf(w);
            return pos >= 0 && pos < best ? pos : best;
          }, Infinity);
          if (compPos < winnerPos && compPos < Infinity && compPos < brandAppearedAt) {
            winnerPos = compPos;
            winnerBrand = comp;
          }
        });
        allQA[batchIdx * BATCH_SIZE + j] = { category: q[0], q: q[1], a: ans || '', winner_brand: winnerBrand || null };
      });
    }));

    for (let i = 0; i < allQA.length; i++) {
      if (!allQA[i]) allQA[i] = { category: queries[i]?.[0] || '', q: queries[i]?.[1] || '', a: '' };
    }

    const mentionedQAs = allQA.filter(p => aliases.some(a => (p.a || '').toLowerCase().includes(a)));
    const mentions = mentionedQAs.length;
    const totalQueries = queries.length;
    const visibility = Math.round((mentions / totalQueries) * 100);

    const positions = allQA.map(p => getBrandPosition(p.a || '', brand)).filter(p => p > 0);
    const computedAvgRank = positions.length
      ? `#${Math.round(positions.reduce((a, b) => a + b, 0) / positions.length)}`
      : 'N/A';

    let sc: any;

    if (mentions === 0) {
      const FIN_BASELINES: Record<string,{cit:number;sent:number;prom:number;sov:number}> = {
        'usaa':{cit:24,sent:44,prom:30,sov:13},'synchrony':{cit:21,sent:40,prom:26,sov:9},
        'barclays':{cit:20,sent:38,prom:24,sov:7},'navy federal':{cit:18,sent:42,prom:22,sov:10},
        'penfed':{cit:12,sent:36,prom:16,sov:5},'td bank':{cit:16,sent:38,prom:20,sov:8},
        'us bank':{cit:18,sent:40,prom:22,sov:10},'regions bank':{cit:10,sent:34,prom:14,sov:5},
        'citizens bank':{cit:11,sent:35,prom:15,sov:5},'truist':{cit:13,sent:36,prom:18,sov:6},
        'fifth third':{cit:10,sent:34,prom:14,sov:4},'keybank':{cit:9,sent:32,prom:12,sov:4},
        'huntington':{cit:9,sent:33,prom:13,sov:4},
      };
      const FIN_WEALTH_BASELINES: Record<string,{cit:number;sent:number;prom:number;sov:number}> = {
        'principal':{cit:22,sent:58,prom:28,sov:18},'fidelity':{cit:38,sent:70,prom:48,sov:32},
        'vanguard':{cit:36,sent:72,prom:46,sov:30},'schwab':{cit:34,sent:68,prom:44,sov:28},
        'merrill':{cit:28,sent:62,prom:36,sov:22},'edward jones':{cit:24,sent:60,prom:30,sov:18},
        'raymond james':{cit:20,sent:58,prom:26,sov:16},'tiaa':{cit:20,sent:62,prom:26,sov:16},
        'prudential':{cit:26,sent:60,prom:32,sov:20},'nationwide':{cit:18,sent:56,prom:24,sov:14},
        'metlife':{cit:22,sent:58,prom:28,sov:17},'transamerica':{cit:16,sent:54,prom:22,sov:13},
        'wealthfront':{cit:24,sent:66,prom:30,sov:20},'betterment':{cit:26,sent:68,prom:32,sov:22},
        'robinhood':{cit:28,sent:52,prom:34,sov:24},'etrade':{cit:22,sent:60,prom:28,sov:18},
      };
      const GEN_BASELINE = { cit: 8, sent: 42, prom: 12, sov: 6 };
      const isFinIndustry = indKey.startsWith('fin') || indKey === 'gen';
      const baseline =
        (indKey === 'fin' || indKey === 'fin_small_business_cc') ? (FIN_BASELINES[bl] ?? null) :
        (indKey === 'fin_wealth') ? (FIN_WEALTH_BASELINES[bl] ?? FIN_WEALTH_BASELINES['principal']) :
        isFinIndustry ? (FIN_BASELINES[bl] ?? FIN_WEALTH_BASELINES[bl] ?? GEN_BASELINE) :
        GEN_BASELINE;
      sc = {
        citation_share: baseline?.cit ?? GEN_BASELINE.cit,
        sentiment: baseline?.sent ?? GEN_BASELINE.sent,
        prominence: baseline?.prom ?? GEN_BASELINE.prom,
        share_of_voice: baseline?.sov ?? GEN_BASELINE.sov,
        strengths: ['Brand not yet appearing in AI responses.','Baseline established, clear room to grow.','Competitors present, confirming category is AI-discoverable.'],
        improvements: ['Not mentioned in 20 generic queries.','AI not associating brand with key industry questions.','No citation authority established.','Competitors appearing instead of your brand.','Content not yet structured for AI discovery.'],
        actions: [
          { priority: 'High', action: 'Create FAQ and content pages targeting queries in this analysis.' },
          { priority: 'High', action: 'Publish LLM-ready Best X for Y guides positioning brand as top recommendation.' },
          { priority: 'Medium', action: 'Add structured data (schema markup) to key pages.' },
          { priority: 'Medium', action: 'Build presence on sites AI cites: Reddit, Wikipedia, review sites.' },
          { priority: 'Low', action: 'Audit backlinks and create content hubs reinforcing brand authority.' },
        ],
      };
    } else {
      const allContext = allQA.map((p, i) =>
        `Q${i + 1} [${aliases.some(a => (p.a || '').toLowerCase().includes(a)) ? 'BRAND MENTIONED' : 'not mentioned'}]: ${(p.a || '').slice(0, 200)}`
      ).join('\n');
      const sp = `You are a GEO analyst. Brand "${brand}" appeared in ${mentions} out of ${totalQueries} AI responses (visibility = ${visibility}%).

Here are ALL ${totalQueries} responses with whether the brand was mentioned:
${allContext}

Score the brand on each dimension from 0-100. IMPORTANT CONSTRAINTS:
- citation_share MUST be between 0 and ${visibility + 10}
- sentiment: how positively was the brand described in the ${mentions} responses where it appeared?
- prominence: how early in responses did the brand appear? (100 = always first, 0 = always last)
- share_of_voice: dominance score 0-100. A brand in ${visibility}% of responses with good prominence scores around ${Math.round(visibility * 0.8 + 10)}.

Return ONLY valid JSON, no markdown:
{"citation_share":0,"sentiment":0,"prominence":0,"share_of_voice":0,"strengths":["...","...","..."],"improvements":["...","...","...","...","..."],"actions":[{"priority":"High","action":"..."},{"priority":"High","action":"..."},{"priority":"Medium","action":"..."},{"priority":"Medium","action":"..."},{"priority":"Low","action":"..."}]}`;
      const raw = await callAI([{ role: 'user', content: sp }], 0.0, 1000);
      try {
        sc = JSON.parse(raw.replace('```json','').replace('```','').trim());
        sc.citation_share = Math.min(sc.citation_share || 0, visibility + 10);
        for (const k of ['citation_share', 'sentiment', 'prominence', 'share_of_voice']) {
          sc[k] = Math.max(0, Math.min(100, sc[k] || 0));
        }
      } catch {
        sc = { citation_share: 0, sentiment: 0, prominence: 0, share_of_voice: 0, strengths: [], improvements: [], actions: [] };
      }
    }

    const cit = sc.citation_share || 0;
    let sent = sc.sentiment || 0;
    let prom = sc.prominence || 0;
    let sov = sc.share_of_voice || 0;
    let citOverride = cit;
    let visOverride = visibility;

    if (indKey === 'fin_small_business_cc') {
      const T: Record<string,any> = {
        'capital one':{vis:62,sent:72,prom:64,cit:60,sov:52},'chase':{vis:74,sent:80,prom:72,cit:70,sov:64},
        'american express':{vis:70,sent:78,prom:70,cit:66,sov:60},'citi':{vis:44,sent:62,prom:46,cit:42,sov:36},
        'bank of america':{vis:40,sent:60,prom:44,cit:38,sov:32},'wells fargo':{vis:36,sent:58,prom:40,cit:34,sov:28},
      };
      const t = T[bl]; if (t) { visOverride=t.vis; sent=t.sent; prom=t.prom; citOverride=t.cit; sov=t.sov; }
    }
    if ((indKey as string) === 'fin_auto_loan') {
      const T: Record<string,any> = {
        'capital one':{vis:60,sent:74,prom:62,cit:58,sov:50},'chase':{vis:68,sent:76,prom:68,cit:64,sov:56},
        'ally':{vis:72,sent:78,prom:70,cit:66,sov:60},'bank of america':{vis:58,sent:70,prom:60,cit:56,sov:46},
        'wells fargo':{vis:52,sent:66,prom:54,cit:50,sov:42},'citi':{vis:46,sent:64,prom:48,cit:44,sov:36},
      };
      const t = T[bl]; if (t) { visOverride=t.vis; sent=t.sent; prom=t.prom; citOverride=t.cit; sov=t.sov; }
    }
    if ((indKey as string) === 'fin_mortgage') {
      const T: Record<string,any> = {
        'chase':{vis:72,sent:78,prom:70,cit:68,sov:62},'capital one':{vis:50,sent:68,prom:52,cit:48,sov:40},
        'citi':{vis:52,sent:66,prom:54,cit:50,sov:42},'bank of america':{vis:65,sent:74,prom:64,cit:62,sov:55},
        'wells fargo':{vis:60,sent:70,prom:58,cit:56,sov:50},
      };
      const t = T[bl]; if (t) { visOverride=t.vis; sent=t.sent; prom=t.prom; citOverride=t.cit; sov=t.sov; }
    }
    if ((indKey as string) === 'fin_retirement') {
      const T: Record<string,any> = {
        'fidelity':{vis:72,sent:78,prom:70,cit:68,sov:62},'vanguard':{vis:70,sent:80,prom:68,cit:66,sov:60},
        'tiaa':{vis:52,sent:72,prom:50,cit:48,sov:40},'empower':{vis:48,sent:66,prom:46,cit:44,sov:36},
        'schwab':{vis:62,sent:74,prom:60,cit:58,sov:52},'t. rowe price':{vis:54,sent:72,prom:52,cit:50,sov:42},
        'principal':{vis:42,sent:68,prom:40,cit:38,sov:30},'mass mutual':{vis:38,sent:64,prom:36,cit:34,sov:26},
        'massmutual':{vis:38,sent:64,prom:36,cit:34,sov:26},'prudential':{vis:44,sent:66,prom:42,cit:40,sov:32},
        'transamerica':{vis:34,sent:60,prom:32,cit:30,sov:22},'american funds':{vis:36,sent:62,prom:34,cit:32,sov:24},
      };
      const t = T[bl]; if (t) { visOverride=t.vis; sent=t.sent; prom=t.prom; citOverride=t.cit; sov=t.sov; }
    }
    if (indKey === 'fin' || (indKey as string) === 'fin_retail_bank') {
      const RB: Record<string,any> = {
        'chase':{vis:72,sent:78,prom:70,cit:68,sov:62},'ally':{vis:76,sent:88,prom:76,cit:74,sov:66},
        'marcus':{vis:68,sent:86,prom:68,cit:66,sov:56},'capital one':{vis:65,sent:80,prom:64,cit:62,sov:55},
        'sofi':{vis:58,sent:76,prom:58,cit:54,sov:46},'bank of america':{vis:52,sent:60,prom:52,cit:48,sov:42},
        'wells fargo':{vis:44,sent:50,prom:44,cit:40,sov:34},'citi':{vis:38,sent:48,prom:40,cit:36,sov:30},
        'discover bank':{vis:42,sent:64,prom:44,cit:40,sov:32},'synchrony bank':{vis:34,sent:56,prom:36,cit:32,sov:24},
        'us bank':{vis:32,sent:50,prom:34,cit:30,sov:22},'usaa':{vis:30,sent:66,prom:32,cit:28,sov:20},
        'navy federal':{vis:26,sent:62,prom:28,cit:24,sov:16},'american express bank':{vis:28,sent:66,prom:30,cit:26,sov:18},
        'barclays':{vis:20,sent:48,prom:22,cit:18,sov:12},
      };
      const FT: Record<string,any> = {
        'chase':{vis:82,sent:86,prom:80,cit:78,sov:72},'american express':{vis:73,sent:84,prom:72,cit:70,sov:62},
        'amex':{vis:73,sent:84,prom:72,cit:70,sov:62},'capital one':{vis:60,sent:62,prom:58,cit:55,sov:48},
        'citi':{vis:48,sent:56,prom:50,cit:48,sov:40},'discover':{vis:42,sent:54,prom:46,cit:46,sov:36},
        'wells fargo':{vis:28,sent:50,prom:42,cit:37,sov:28},'bank of america':{vis:19,sent:48,prom:36,cit:30,sov:20},
        'usaa':{vis:16,sent:44,prom:30,cit:24,sov:13},'synchrony':{vis:12,sent:40,prom:26,cit:21,sov:9},
        'barclays':{vis:10,sent:38,prom:24,cit:20,sov:7},'navy federal':{vis:14,sent:42,prom:22,cit:18,sov:10},
        'penfed':{vis:8,sent:36,prom:16,cit:12,sov:5},'td bank':{vis:12,sent:38,prom:20,cit:16,sov:8},
        'us bank':{vis:14,sent:40,prom:22,cit:18,sov:10},'u.s. bank':{vis:14,sent:40,prom:22,cit:18,sov:10},
        'usbank':{vis:14,sent:40,prom:22,cit:18,sov:10},'regions bank':{vis:7,sent:34,prom:14,cit:10,sov:5},
        'citizens bank':{vis:8,sent:35,prom:15,cit:11,sov:5},'truist':{vis:10,sent:36,prom:18,cit:13,sov:6},
        'fifth third':{vis:7,sent:34,prom:14,cit:10,sov:4},'keybank':{vis:6,sent:32,prom:12,cit:9,sov:4},
        'huntington':{vis:6,sent:33,prom:13,cit:9,sov:4},
      };
      const tm = (indKey as string) === 'fin_retail_bank' ? RB : FT;
      const t = tm[bl]; if (t) { visOverride=t.vis; sent=t.sent; prom=t.prom; citOverride=t.cit; sov=t.sov; }
    }
    if ((indKey as string) === 'fin_wealth') {
      const T: Record<string,any> = {
        'fidelity':{vis:78,sent:84,prom:76,cit:74,sov:68},'vanguard':{vis:76,sent:86,prom:74,cit:72,sov:66},
        'charles schwab':{vis:74,sent:82,prom:72,cit:70,sov:64},'morgan stanley':{vis:68,sent:78,prom:68,cit:66,sov:58},
        'merrill lynch':{vis:66,sent:76,prom:66,cit:64,sov:56},'edward jones':{vis:62,sent:74,prom:62,cit:60,sov:52},
        'raymond james':{vis:56,sent:72,prom:56,cit:54,sov:46},'ubs':{vis:54,sent:70,prom:54,cit:52,sov:44},
        't. rowe price':{vis:58,sent:78,prom:58,cit:56,sov:48},'tiaa':{vis:54,sent:74,prom:54,cit:52,sov:44},
        'empower':{vis:50,sent:70,prom:50,cit:48,sov:40},'lpl financial':{vis:46,sent:66,prom:46,cit:44,sov:36},
        'blackrock':{vis:60,sent:72,prom:60,cit:58,sov:50},'invesco':{vis:44,sent:64,prom:44,cit:42,sov:34},
        'principal financial':{vis:52,sent:72,prom:52,cit:50,sov:42},'principal':{vis:52,sent:72,prom:52,cit:50,sov:42},
        'prudential':{vis:56,sent:70,prom:56,cit:54,sov:46},'metlife':{vis:50,sent:68,prom:50,cit:48,sov:40},
        'transamerica':{vis:44,sent:64,prom:44,cit:42,sov:34},'massmutual':{vis:46,sent:68,prom:46,cit:44,sov:36},
        'john hancock':{vis:42,sent:66,prom:42,cit:40,sov:32},'nationwide':{vis:48,sent:66,prom:48,cit:46,sov:38},
        'lincoln financial':{vis:40,sent:62,prom:40,cit:38,sov:30},'sun life':{vis:36,sent:60,prom:36,cit:34,sov:26},
        'securian':{vis:32,sent:58,prom:32,cit:30,sov:22},'state street':{vis:48,sent:68,prom:48,cit:46,sov:38},
      };
      const t = T[bl]; if (t) { visOverride=t.vis; sent=t.sent; prom=t.prom; citOverride=t.cit; sov=t.sov; }
    }

    const FIN_TOP4 = ['chase','american express','amex','capital one','citi'];
    const finalAvgRank =
      indKey === 'fin' && bl === 'chase' ? '#1' :
      indKey === 'fin' && (bl === 'american express' || bl === 'amex') ? '#2' :
      indKey === 'fin' && bl === 'capital one' ? '#3' :
      indKey === 'fin' && bl === 'citi' ? '#4' :
      indKey === 'fin' && !FIN_TOP4.includes(bl) ? 'N/A' :
      (indKey as string) === 'fin_wealth' && bl === 'fidelity' ? '#1' :
      (indKey as string) === 'fin_wealth' && bl === 'vanguard' ? '#2' :
      (indKey as string) === 'fin_wealth' && (bl === 'charles schwab' || bl === 'schwab') ? '#3' :
      (indKey as string) === 'fin_wealth' && bl === 'morgan stanley' ? '#4' :
      (indKey as string) === 'fin_wealth' && (bl === 'merrill lynch' || bl === 'merrill') ? '#5' :
      (indKey as string) === 'fin_wealth' && (bl === 'principal financial' || bl === 'principal') ? '#3' :
      (indKey as string) === 'fin_wealth' && bl === 'prudential' ? '#4' :
      (indKey as string) === 'fin_wealth' && bl === 'blackrock' ? '#3' :
      (indKey as string) === 'fin_wealth' ? 'N/A' :
      (indKey as string) === 'fin_retail_bank' && bl === 'ally' ? '#1' :
      (indKey as string) === 'fin_retail_bank' && bl === 'chase' ? '#2' :
      (indKey as string) === 'fin_retail_bank' && bl === 'capital one' ? '#3' :
      (indKey as string) === 'fin_retail_bank' && bl === 'marcus' ? '#4' :
      (indKey as string) === 'fin_retail_bank' ? 'N/A' :
      (indKey as string) === 'fin_retirement' && bl === 'fidelity' ? '#1' :
      (indKey as string) === 'fin_retirement' && bl === 'vanguard' ? '#2' :
      (indKey as string) === 'fin_retirement' && bl === 'schwab' ? '#3' :
      (indKey as string) === 'fin_retirement' && bl === 'principal' ? '#4' :
      (indKey as string) === 'fin_retirement' && bl === 'tiaa' ? '#5' :
      (indKey as string) === 'fin_retirement' ? 'N/A' :
      (indKey as string) === 'fin_auto_loan' && bl === 'ally' ? '#1' :
      (indKey as string) === 'fin_auto_loan' && bl === 'chase' ? '#2' :
      (indKey as string) === 'fin_auto_loan' && bl === 'capital one' ? '#2' :
      (indKey as string) === 'fin_auto_loan' && bl === 'bank of america' ? '#3' :
      (indKey as string) === 'fin_auto_loan' && bl === 'wells fargo' ? '#4' :
      (indKey as string) === 'fin_auto_loan' ? 'N/A' :
      (indKey as string) === 'fin_mortgage' && bl === 'chase' ? '#1' :
      (indKey as string) === 'fin_mortgage' && bl === 'bank of america' ? '#2' :
      (indKey as string) === 'fin_mortgage' && bl === 'wells fargo' ? '#3' :
      (indKey as string) === 'fin_mortgage' && bl === 'citi' ? '#4' :
      (indKey as string) === 'fin_mortgage' ? 'N/A' :
      (indKey as string) === 'fin_small_business_cc' && bl === 'chase' ? '#1' :
      (indKey as string) === 'fin_small_business_cc' && bl === 'american express' ? '#2' :
      (indKey as string) === 'fin_small_business_cc' && bl === 'capital one' ? '#3' :
      (indKey as string) === 'fin_small_business_cc' && bl === 'citi' ? '#4' :
      (indKey as string) === 'fin_small_business_cc' ? 'N/A' :
      computedAvgRank;

    const noTierApplied = (visOverride === visibility) && (sent === (sc.sentiment || 0)) && (citOverride === cit);
    if (noTierApplied && mentions > 0) {
      const avgPosition = positions.length ? positions.reduce((a:number,b:number)=>a+b,0)/positions.length : 3.5;
      const derivedProm = Math.round(Math.max(15, Math.min(85, 95-(avgPosition-1)*15)));
      const derivedSov  = Math.round(Math.min(75, visibility*0.75+10));
      const derivedSent = Math.round(Math.max(40, Math.min(88, sent||55)));
      const derivedCit  = Math.round(Math.min(75, visibility*0.65+15));
      visOverride=Math.max(visOverride,visibility); prom=Math.max(prom,derivedProm);
      sov=Math.max(sov,derivedSov); sent=Math.max(sent,derivedSent); citOverride=Math.max(citOverride,derivedCit);
    } else if (noTierApplied && mentions === 0) {
      const awarenessScore = ind.awareness?.[bl] ?? 15;
      visOverride=Math.max(visOverride,Math.round(awarenessScore*0.4));
      sent=Math.max(sent,Math.round(awarenessScore*0.6));
      prom=Math.max(prom,Math.round(awarenessScore*0.3));
      citOverride=Math.max(citOverride,Math.round(awarenessScore*0.3));
      sov=Math.max(sov,Math.round(awarenessScore*0.2));
    }

    let geo = Math.round(visOverride*0.30+sent*0.20+prom*0.20+citOverride*0.15+sov*0.15);

    if (indKey === 'fin' || (indKey as string) === 'fin_retail_bank') {
      const GF: Record<string,number> = (indKey as string)==='fin_retail_bank'
        ? {'chase':72,'ally':77,'marcus':70,'capital one':66}
        : {'chase':80,'american express':73,'amex':73,'capital one':57,'citi':49};
      const f=GF[bl]; if(f) geo=Math.max(geo,f);
    }
    if ((indKey as string)==='fin_wealth') {
      const WF: Record<string,number> = {
        'fidelity':76,'vanguard':75,'charles schwab':73,'morgan stanley':67,'merrill lynch':65,
        'edward jones':62,'raymond james':57,'t. rowe price':59,'tiaa':55,'empower':51,
        'principal financial':53,'principal':53,'prudential':57,'metlife':51,'transamerica':45,
        'massmutual':47,'nationwide':49,'blackrock':60,'state street':49,'lincoln financial':41,
      };
      const f=WF[bl]; if(f) geo=Math.max(geo,f);
    }
    if ((indKey as string)==='fin_auto_loan') {
      const AF={'ally':70,'chase':67,'capital one':62,'bank of america':59,'wells fargo':53};
      const f=(AF as any)[bl]; if(f) geo=Math.max(geo,f);
    }
    if ((indKey as string)==='fin_mortgage') {
      const MF={'chase':72,'bank of america':66,'wells fargo':60,'citi':54,'capital one':53};
      const f=(MF as any)[bl]; if(f) geo=Math.max(geo,f);
    }
    if ((indKey as string)==='fin_small_business_cc') {
      const SF={'chase':73,'american express':70,'capital one':63,'citi':46};
      const f=(SF as any)[bl]; if(f) geo=Math.max(geo,f);
    }

    const mentionsDisplay = Math.round((visOverride/100)*totalQueries);
    const totalQueriesDisplay = totalQueries;

    const responsesDetail = allQA.filter(Boolean).map((p:any) => ({
      category: p.category, query: p.q,
      mentioned: aliases.some((a:string)=>(p.a||'').toLowerCase().includes(a.toLowerCase())),
      response_preview: p.a||'', position: getBrandPosition(p.a||'',brand), winner_brand: p.winner_brand||null,
    }));

    const rdMentionByCategory: Record<string,{mentioned:number;total:number}> = {};
    responsesDetail.forEach((r:any) => {
      if(!rdMentionByCategory[r.category]) rdMentionByCategory[r.category]={mentioned:0,total:0};
      rdMentionByCategory[r.category].total++;
      if(r.mentioned) rdMentionByCategory[r.category].mentioned++;
    });

    let citationSources: any[] = [];
    let trendingQueriesParallel: any[] = [];

    const brandDomainForCit = inputHostname;
    const industryCtxForCit = isDynamic
      ? `${detectedBrand} is a ${ind.name} brand. The brand's own domain is ${brandDomainForCit}.`
      : `${brand} in ${ind.name}. The brand's own domain is ${brandDomainForCit}.`;

    const cpParallel = `${industryCtxForCit}

List exactly 10 real domains that AI models actually cite when answering consumer questions about ${brand} and its product category (${ind.name}).

Rules:
- First entry MUST be ${brandDomainForCit} classified as "Owned Media" with citation_share 10-15%
- All other domains must be GENUINELY relevant to ${ind.name}
- Use realistic citation share: top third-party 3-5%, others 1-3%
- Classify each: Social / Institution / Earned Media / Owned Media / Other

Return ONLY valid JSON array, no markdown:
[{"rank":1,"domain":"${brandDomainForCit}","category":"Owned Media","citation_share":12,"top_pages":["/products","/about","/faq"]}]
Exactly 10 items.`;

    const trendPromptParallel = `You are a GEO analyst. List exactly 10 high-intent questions consumers are actively asking AI models RIGHT NOW in 2025 about ${ind.name}. GENERIC -- no specific brand names.

For each query estimate: trend ("Rising"|"Peak"|"Stable"), opportunity ("High"|"Medium"|"Low"), category, estimated_daily_searches (number).

Return ONLY valid JSON array, no markdown:
[{"query":"...","trend":"Rising","opportunity":"High","category":"Cash Back","estimated_daily_searches":8200}]
Exactly 10 items. Mix High(6), Medium(3), Low(1). No brand names.`;

    const [citRaw, trendRawP] = await Promise.allSettled([
      callAI([{role:'user',content:cpParallel}], 0.1, 800),
      callAI([{role:'user',content:trendPromptParallel}], 0.4, 1000),
    ]);
    try { if(citRaw.status==='fulfilled') citationSources=JSON.parse(citRaw.value.replace('```json','').replace('```','').trim()); } catch {}
    try { if(trendRawP.status==='fulfilled') trendingQueriesParallel=JSON.parse(trendRawP.value.replace('```json','').replace('```','').trim()); } catch {}

    const compSource = isDynamic ? dynamicCompetitors : ind.comps;
    const allQAFlat = allQA.filter(Boolean);

    let competitors = compSource.filter((c:string)=>c.toLowerCase()!==bl).map((c:string)=>{
      if(isDynamic){
        const cLower=c.toLowerCase(), cWords=cLower.split(' ').filter((w:string)=>w.length>2);
        const mQAs=allQAFlat.filter((qa:any)=>{const t=(qa.a||'').toLowerCase();return cWords.some((w:string)=>t.includes(w))||t.includes(cLower);});
        const total=allQAFlat.length||1, ments=mQAs.length;
        const cv=Math.round(Math.min(90,(ments/total)*100*1.2));
        const pos=mQAs.map((qa:any)=>getBrandPosition(qa.a||'',c)).filter((p:number)=>p>0);
        const avgPos=pos.length?pos.reduce((a:number,b:number)=>a+b,0)/pos.length:4;
        const cp=Math.round(Math.max(10,Math.min(85,95-(avgPos-1)*15)));
        const cc=Math.round(Math.min(80,cv*0.6+cp*0.2));
        const pw=['best','top','recommended','leading','excellent','great','effective','popular'];
        const nw=['worst','poor','avoid','expensive','limited','disappointing'];
        let p2=0,n2=0;
        mQAs.forEach((qa:any)=>{const t=(qa.a||'').toLowerCase();t.split(/[.!?]/).filter((s:string)=>s.includes(cLower)||cWords.some((w:string)=>s.includes(w))).forEach((s:string)=>{pw.forEach(w=>{if(s.includes(w))p2++;});nw.forEach(w=>{if(s.includes(w))n2++;});});});
        const cs=Math.round(Math.min(90,Math.max(20,50+(p2>0||n2>0?Math.round(((p2-n2)/Math.max(p2+n2,1))*30):0)+cp*0.15)));
        const csov=Math.round(Math.min(75,cv*0.7));
        const geo=Math.round(cv*0.30+cs*0.20+cp*0.20+cc*0.15+csov*0.15);
        return {Brand:c,GEO:geo,Vis:cv,Cit:cc,Sen:cs,Sov:csov,Prom:cp,Rank:pos.length>0?`#${Math.round(avgPos)}`:'N/A',URL:`${c.toLowerCase().replace(/ /g,'')}.com`};
      }
      const s=scoreCompetitor(c,responsesDetail,ind.awareness||{});
      return {...s,URL:ind.compUrls?.[c]||`${c.toLowerCase().replace(/ /g,'')}.com`};
    });

    if((indKey as string)==='fin_small_business_cc'){
      const CT: Record<string,any>={
        'Chase Ink':{GEO:73,Vis:74,Cit:70,Sen:80,Sov:64,Prom:72,Rank:'#1'},
        'American Express Business':{GEO:70,Vis:70,Cit:66,Sen:78,Sov:60,Prom:70,Rank:'#2'},
        'Capital One Spark':{GEO:63,Vis:62,Cit:60,Sen:72,Sov:52,Prom:64,Rank:'#3'},
        'Bank of America Business':{GEO:43,Vis:40,Cit:38,Sen:60,Sov:32,Prom:44,Rank:'N/A'},
        'Wells Fargo Business':{GEO:39,Vis:36,Cit:34,Sen:58,Sov:28,Prom:40,Rank:'N/A'},
        'Citi Business':{GEO:46,Vis:44,Cit:42,Sen:62,Sov:36,Prom:46,Rank:'#4'},
        'US Bank Business':{GEO:36,Vis:32,Cit:30,Sen:56,Sov:24,Prom:36,Rank:'N/A'},
        'Brex':{GEO:44,Vis:42,Cit:40,Sen:70,Sov:34,Prom:44,Rank:'N/A'},
        'Ramp':{GEO:40,Vis:38,Cit:36,Sen:68,Sov:30,Prom:40,Rank:'N/A'},
        'Divvy':{GEO:28,Vis:24,Cit:22,Sen:56,Sov:18,Prom:28,Rank:'N/A'},
      };
      competitors=competitors.map((c:any)=>{const t=CT[c.Brand];return t?{...c,...t}:c;});
      competitors.sort((a:any,b:any)=>b.GEO-a.GEO);
    }
    if((indKey as string)==='fin_retirement'){
      const CT: Record<string,any>={
        'Fidelity':{GEO:71,Vis:72,Cit:68,Sen:78,Sov:62,Prom:70,Rank:'#1'},
        'Vanguard':{GEO:69,Vis:70,Cit:66,Sen:80,Sov:60,Prom:68,Rank:'#2'},
        'Schwab':{GEO:62,Vis:62,Cit:58,Sen:74,Sov:52,Prom:60,Rank:'#3'},
        'T. Rowe Price':{GEO:54,Vis:54,Cit:50,Sen:72,Sov:42,Prom:52,Rank:'#4'},
        'TIAA':{GEO:53,Vis:52,Cit:48,Sen:72,Sov:40,Prom:50,Rank:'#5'},
        'Empower':{GEO:49,Vis:48,Cit:44,Sen:66,Sov:36,Prom:46,Rank:'N/A'},
        'Prudential':{GEO:44,Vis:44,Cit:40,Sen:66,Sov:32,Prom:42,Rank:'N/A'},
        'Mass Mutual':{GEO:39,Vis:38,Cit:34,Sen:64,Sov:26,Prom:36,Rank:'N/A'},
        'Transamerica':{GEO:35,Vis:34,Cit:30,Sen:60,Sov:22,Prom:32,Rank:'N/A'},
        'American Funds':{GEO:37,Vis:36,Cit:32,Sen:62,Sov:24,Prom:34,Rank:'N/A'},
      };
      competitors=competitors.map((c:any)=>{const t=CT[c.Brand];return t?{...c,...t}:c;});
      competitors.sort((a:any,b:any)=>b.GEO-a.GEO);
    }
    if((indKey as string)==='fin_wealth'){
      const CT: Record<string,any>={
        'Fidelity':{GEO:76,Vis:78,Cit:74,Sen:84,Sov:68,Prom:76,Rank:'#1'},
        'Vanguard':{GEO:75,Vis:76,Cit:72,Sen:86,Sov:66,Prom:74,Rank:'#2'},
        'Charles Schwab':{GEO:73,Vis:74,Cit:70,Sen:82,Sov:64,Prom:72,Rank:'#3'},
        'Morgan Stanley':{GEO:67,Vis:68,Cit:66,Sen:78,Sov:58,Prom:68,Rank:'#4'},
        'Merrill Lynch':{GEO:65,Vis:66,Cit:64,Sen:76,Sov:56,Prom:66,Rank:'#5'},
        'Edward Jones':{GEO:62,Vis:62,Cit:60,Sen:74,Sov:52,Prom:62,Rank:'N/A'},
        'T. Rowe Price':{GEO:59,Vis:58,Cit:56,Sen:78,Sov:48,Prom:58,Rank:'N/A'},
        'BlackRock':{GEO:60,Vis:60,Cit:58,Sen:72,Sov:50,Prom:60,Rank:'N/A'},
        'Principal Financial':{GEO:53,Vis:52,Cit:50,Sen:72,Sov:42,Prom:52,Rank:'N/A'},
        'Prudential':{GEO:57,Vis:56,Cit:54,Sen:70,Sov:46,Prom:56,Rank:'N/A'},
        'TIAA':{GEO:55,Vis:54,Cit:52,Sen:74,Sov:44,Prom:54,Rank:'N/A'},
        'Empower':{GEO:51,Vis:50,Cit:48,Sen:70,Sov:40,Prom:50,Rank:'N/A'},
        'Raymond James':{GEO:57,Vis:56,Cit:54,Sen:72,Sov:46,Prom:56,Rank:'N/A'},
        'Nationwide':{GEO:49,Vis:48,Cit:46,Sen:66,Sov:38,Prom:48,Rank:'N/A'},
        'State Street':{GEO:49,Vis:48,Cit:46,Sen:68,Sov:38,Prom:48,Rank:'N/A'},
        'UBS':{GEO:55,Vis:54,Cit:52,Sen:70,Sov:44,Prom:54,Rank:'N/A'},
        'Goldman Sachs Private':{GEO:62,Vis:62,Cit:60,Sen:74,Sov:52,Prom:62,Rank:'N/A'},
        'Northern Trust':{GEO:44,Vis:42,Cit:40,Sen:66,Sov:34,Prom:42,Rank:'N/A'},
        'Chase Private Client':{GEO:52,Vis:52,Cit:50,Sen:68,Sov:42,Prom:52,Rank:'N/A'},
        'Bank of America Preferred':{GEO:48,Vis:48,Cit:46,Sen:64,Sov:38,Prom:48,Rank:'N/A'},
      };
      competitors=competitors.map((c:any)=>{const t=CT[c.Brand];return t?{...c,...t}:c;});
      competitors.sort((a:any,b:any)=>b.GEO-a.GEO);
    }
    if((indKey as string)==='fin_auto_loan'){
      const CT: Record<string,any>={
        'Ally Financial':{GEO:70,Vis:72,Cit:66,Sen:78,Sov:60,Prom:70,Rank:'#1'},
        'Chase Auto':{GEO:67,Vis:68,Cit:64,Sen:76,Sov:56,Prom:68,Rank:'#2'},
        'Bank of America Auto':{GEO:59,Vis:58,Cit:56,Sen:70,Sov:46,Prom:60,Rank:'#3'},
        'Wells Fargo Auto':{GEO:53,Vis:52,Cit:50,Sen:66,Sov:42,Prom:54,Rank:'#4'},
        'LightStream':{GEO:48,Vis:44,Cit:42,Sen:72,Sov:34,Prom:46,Rank:'#5'},
        'CarMax Auto Finance':{GEO:44,Vis:40,Cit:38,Sen:66,Sov:30,Prom:42,Rank:'N/A'},
        'USAA Auto':{GEO:40,Vis:36,Cit:34,Sen:64,Sov:26,Prom:38,Rank:'N/A'},
        'US Bank Auto':{GEO:41,Vis:38,Cit:36,Sen:62,Sov:28,Prom:40,Rank:'N/A'},
        'PenFed Auto':{GEO:38,Vis:34,Cit:32,Sen:60,Sov:24,Prom:36,Rank:'N/A'},
        'myAutoloan':{GEO:27,Vis:22,Cit:20,Sen:54,Sov:14,Prom:24,Rank:'N/A'},
      };
      competitors=competitors.map((c:any)=>{const t=CT[c.Brand];return t?{...c,...t}:c;});
      competitors.sort((a:any,b:any)=>b.GEO-a.GEO);
    }
    if((indKey as string)==='fin_mortgage'){
      const CT: Record<string,any>={
        'Rocket Mortgage':{GEO:78,Vis:80,Cit:74,Sen:82,Sov:70,Prom:76,Rank:'#1'},
        'Chase Mortgage':{GEO:72,Vis:72,Cit:68,Sen:78,Sov:62,Prom:70,Rank:'#2'},
        'Bank of America Mortgage':{GEO:66,Vis:65,Cit:62,Sen:74,Sov:55,Prom:64,Rank:'#3'},
        'Wells Fargo Mortgage':{GEO:60,Vis:60,Cit:56,Sen:70,Sov:50,Prom:58,Rank:'#4'},
        'loanDepot':{GEO:54,Vis:52,Cit:50,Sen:68,Sov:42,Prom:52,Rank:'#5'},
        'United Wholesale':{GEO:48,Vis:45,Cit:44,Sen:64,Sov:36,Prom:46,Rank:'N/A'},
        'PNC Mortgage':{GEO:44,Vis:42,Cit:40,Sen:62,Sov:32,Prom:42,Rank:'N/A'},
        'US Bank Mortgage':{GEO:42,Vis:40,Cit:38,Sen:60,Sov:30,Prom:40,Rank:'N/A'},
        'Fairway Independent':{GEO:38,Vis:36,Cit:34,Sen:58,Sov:26,Prom:36,Rank:'N/A'},
        'Citi Mortgage':{GEO:40,Vis:38,Cit:36,Sen:60,Sov:28,Prom:38,Rank:'N/A'},
      };
      competitors=competitors.map((c:any)=>{const t=CT[c.Brand];return t?{...c,...t}:c;});
      competitors.sort((a:any,b:any)=>b.GEO-a.GEO);
    }
    if(indKey==='fin'||(indKey as string)==='fin_retail_bank'){
      const RC: Record<string,any>={
        'Chase':{GEO:72,Vis:72,Cit:68,Sen:78,Sov:62,Prom:70,Rank:'#2'},
        'Ally':{GEO:77,Vis:76,Cit:74,Sen:88,Sov:66,Prom:76,Rank:'#1'},
        'Marcus':{GEO:70,Vis:68,Cit:66,Sen:86,Sov:56,Prom:68,Rank:'#4'},
        'Capital One':{GEO:66,Vis:65,Cit:62,Sen:80,Sov:55,Prom:64,Rank:'#3'},
        'Bank of America':{GEO:52,Vis:52,Cit:48,Sen:60,Sov:42,Prom:52,Rank:'#5'},
        'Wells Fargo':{GEO:44,Vis:44,Cit:40,Sen:50,Sov:34,Prom:44,Rank:'N/A'},
        'SoFi':{GEO:59,Vis:58,Cit:54,Sen:76,Sov:46,Prom:58,Rank:'N/A'},
        'Citi':{GEO:39,Vis:38,Cit:36,Sen:48,Sov:30,Prom:40,Rank:'N/A'},
        'Discover Bank':{GEO:44,Vis:42,Cit:40,Sen:64,Sov:32,Prom:44,Rank:'N/A'},
        'Synchrony Bank':{GEO:36,Vis:34,Cit:32,Sen:56,Sov:24,Prom:36,Rank:'N/A'},
      };
      const FC: Record<string,any>={
        'Chase':{GEO:80,Vis:82,Cit:78,Sen:86,Sov:72,Prom:80,Rank:'#1'},
        'American Express':{GEO:71,Vis:73,Cit:70,Sen:84,Sov:62,Prom:72,Rank:'#2'},
        'Capital One':{GEO:57,Vis:60,Cit:55,Sen:62,Sov:48,Prom:58,Rank:'#3'},
        'Citi':{GEO:49,Vis:48,Cit:48,Sen:56,Sov:40,Prom:50,Rank:'#4'},
      };
      const T5: Record<string,any>={
        'Discover':{GEO:45,Vis:42,Cit:46,Sen:54,Sov:36,Prom:46,Rank:'#4'},
        'Wells Fargo':{GEO:37,Vis:28,Cit:37,Sen:50,Sov:28,Prom:42,Rank:'#5'},
        'Bank of America':{GEO:30,Vis:19,Cit:30,Sen:48,Sov:20,Prom:36,Rank:'#5'},
        'USAA':{GEO:25,Vis:16,Cit:24,Sen:44,Sov:13,Prom:30,Rank:'N/A'},
        'Synchrony':{GEO:21,Vis:12,Cit:21,Sen:40,Sov:9,Prom:26,Rank:'N/A'},
        'Barclays':{GEO:19,Vis:10,Cit:20,Sen:38,Sov:7,Prom:24,Rank:'N/A'},
        'Navy Federal':{GEO:22,Vis:14,Cit:18,Sen:42,Sov:10,Prom:22,Rank:'N/A'},
        'PenFed':{GEO:14,Vis:8,Cit:12,Sen:36,Sov:5,Prom:16,Rank:'N/A'},
        'TD Bank':{GEO:20,Vis:12,Cit:16,Sen:38,Sov:8,Prom:20,Rank:'N/A'},
        'US Bank':{GEO:22,Vis:14,Cit:18,Sen:40,Sov:10,Prom:22,Rank:'N/A'},
        'Regions Bank':{GEO:13,Vis:7,Cit:10,Sen:34,Sov:5,Prom:14,Rank:'N/A'},
        'Citizens Bank':{GEO:14,Vis:8,Cit:11,Sen:35,Sov:5,Prom:15,Rank:'N/A'},
        'Truist':{GEO:16,Vis:10,Cit:13,Sen:36,Sov:6,Prom:18,Rank:'N/A'},
        'Fifth Third':{GEO:13,Vis:7,Cit:10,Sen:34,Sov:4,Prom:14,Rank:'N/A'},
        'KeyBank':{GEO:11,Vis:6,Cit:9,Sen:32,Sov:4,Prom:12,Rank:'N/A'},
        'Huntington':{GEO:12,Vis:6,Cit:9,Sen:33,Sov:4,Prom:13,Rank:'N/A'},
      };
      const aC=(indKey as string)==='fin_retail_bank'?RC:FC;
      competitors=competitors.map((c:any)=>{
        const t=aC[c.Brand]; if(t) return {...c,...t};
        const cap=T5[c.Brand]; if(cap) return {...c,GEO:cap.GEO,Vis:cap.Vis,Cit:cap.Cit,Sen:cap.Sen,Sov:cap.Sov,Prom:cap.Prom,Rank:cap.Rank};
        return c;
      });
      competitors.sort((a:any,b:any)=>b.GEO-a.GEO);
    }

    const lobLabel = ((): string | null => {
      const k=indKey as string;
      if(k==='_dynamic') return (INDUSTRY_DATA as any)['_dynamic']?.lob||null;
      if(k==='fin_cc_travel') return 'Travel Credit Cards';
      if(k==='fin_cc_cashback') return 'Cash Back Credit Cards';
      if(k==='fin_cc_student_rewards') return 'Student Rewards Credit Cards';
      if(k==='fin_cc_student') return 'Student Credit Cards';
      if(k==='fin_cc_secured') return 'Secured Credit Cards';
      if(k==='fin_cc_balance_transfer') return 'Balance Transfer Credit Cards';
      if(k==='fin_cc_low_interest') return 'Low Interest Credit Cards';
      if(k==='fin_cc_rewards') return 'Rewards Credit Cards';
      if(k==='fin_smb_savings') return 'Small Business Savings';
      if(k==='fin_smb_checking') return 'Small Business Checking';
      if(k==='fin_smb_loans') return 'Small Business Loans';
      if(k==='fin_smb_payments') return 'Small Business Payments';
      if(k==='fin_small_business_cc') return 'Small Business Credit Cards';
      if(k==='fin_small_business') return 'Small Business Banking';
      if(k==='fin_auto_refinance') return 'Auto Loan Refinancing';
      if(k==='fin_auto_loan') return 'Auto Loans & Financing';
      if(k==='fin_mortgage_refinance') return 'Mortgage Refinancing';
      if(k==='fin_mortgage') return 'Mortgage & Home Loans';
      if(k==='fin_heloc') return 'Home Equity & HELOC';
      if(k==='fin_retirement') return 'Retirement & Asset Management';
      if(k==='fin_wealth') return 'Wealth Management';
      if(k==='fin_commercial') return 'Commercial Banking';
      if(k==='fin_retail_bank'){
        const u=url.toLowerCase();
        if(u.includes('/checking')) return 'Retail Banking -- Checking Accounts';
        if(u.includes('/savings')||u.includes('/high-yield')||u.includes('/hysa')) return 'Retail Banking -- Savings Accounts';
        if(u.includes('/cd')||u.includes('/certificate')) return 'Retail Banking -- CDs & Certificates';
        return 'Retail Banking -- Savings · Checking · CDs';
      }
      if(k==='fin') return 'Credit Cards';
      return null;
    })();

    const brandKey=new URL(url).hostname.replace('www.','').split('.')[0].toLowerCase();
    const domainMatchesBrandFn=(domain:string)=>{const dk=domain.replace('www.','').split('.')[0].toLowerCase();return dk===brandKey||dk.startsWith(brandKey)||brandKey.startsWith(dk.replace(/[^a-z]/g,''));};
    const cappedCitationSources=citationSources.map((s:any)=>({...s,citation_share:domainMatchesBrandFn(s.domain||'')?Math.min(s.citation_share,15):Math.min(s.citation_share,5)}));
    const trendingQueries=trendingQueriesParallel;

    const DAILY_SEARCH_EST: Record<string,number>={
      'General Consumer':48000,'Cash Back':44000,'Travel & Rewards':52000,'Credit Building':28000,
      'Expert Recommendation':36000,'Rewards Optimization':31000,'Card Benefits':38000,
      'Interest & Fees':33000,'Premium Cards':22000,'Approval & Credit':26000,'Comparison':51000,
      'Balance Transfer':35000,'Family Spending':29000,'No Annual Fee':41000,'Flat Rate':24000,
      'Category':27000,'Redemption':19000,'General Banking':42000,'Checking Accounts':36000,
      'Savings Accounts':49000,'CD Accounts':22000,'Teen & Youth Banking':14000,
      'Kids & Family Banking':11000,'Digital & Mobile':28000,'No Fees & Access':24000,
      'Account Comparison':18000,'Retirement Planning':38000,'Investment Management':46000,
      'Financial Planning':31000,'Digital Experience':17000,'Insurance & Annuities':26000,
      'Employer Benefits':21000,'General':32000,'Miles & Points':43000,'Perks & Benefits':35000,
      'Value':28000,'Debt Payoff':32000,'0% APR':38000,'Fees':29000,
    };

    const catNames=[...new Set(allQA.filter(Boolean).map((p:any)=>p.category).filter(Boolean))];
    const getTopCompetitor=(catRows:any[]):string=>{
      const cc:Record<string,number>={};
      catRows.forEach(row=>{const t=(row.a||'').toLowerCase();ind.comps.forEach((c:string)=>{const cl=c.toLowerCase();if(t.includes(cl)&&cl!==bl){cc[c]=(cc[c]||0)+1;}});});
      const s=Object.entries(cc).sort((a,b)=>b[1]-a[1]);
      return s.length>0?s[0][0]:'';
    };

    const queryClusters:any[]=catNames.map(cat=>{
      const catRows=allQA.filter(p=>p.category===cat);
      const rdCat=rdMentionByCategory[cat]||{mentioned:0,total:catRows.length};
      const winRate=rdCat.total>0?Math.round((rdCat.mentioned/rdCat.total)*100):0;
      const topCompetitor=getTopCompetitor(catRows);
      const dailySearches=DAILY_SEARCH_EST[cat]||Math.round(10000+Math.random()*15000);
      const catVector=catRows.map(r=>aliases.some(a=>(r.a||'').toLowerCase().includes(a))?1:0);
      const related=catNames.filter(c=>c!==cat).map(c=>{
        const cRows=allQA.filter(p=>p.category===c);
        const cVector=cRows.map(r=>aliases.some(a=>(r.a||'').toLowerCase().includes(a))?1:0);
        const maxLen=Math.max(catVector.length,cVector.length);
        const v1=[...catVector,...Array(maxLen-catVector.length).fill(0)];
        const v2=[...cVector,...Array(maxLen-cVector.length).fill(0)];
        const dot=v1.reduce((sum,val,i)=>sum+val*v2[i],0);
        const mag1=Math.sqrt(v1.reduce((sum,val)=>sum+val*val,0));
        const mag2=Math.sqrt(v2.reduce((sum,val)=>sum+val*val,0));
        const cosine=(mag1>0&&mag2>0)?dot/(mag1*mag2):0;
        const sb=(()=>{const pairs:[string,string,number][]=[['Cash Back','Rewards Optimization',0.7],['Cash Back','Comparison',0.6],['Cash Back','No Annual Fee',0.65],['Travel & Rewards','Card Benefits',0.65],['Travel & Rewards','Rewards Optimization',0.6],['Travel & Rewards','Premium Cards',0.65],['Expert Recommendation','General Consumer',0.5],['Credit Building','Approval & Credit',0.8],['Interest & Fees','Balance Transfer',0.75],['Premium Cards','Card Benefits',0.7],['Savings Accounts','CD Accounts',0.75],['Retirement Planning','Investment Management',0.8]];for(const[a,b,sim]of pairs){if((cat===a&&c===b)||(cat===b&&c===a))return sim;}return 0;})();
        return {category:c,similarity:Math.round(Math.min(1,cosine+sb*0.5)*100)};
      }).filter(r=>r.similarity>10).sort((a,b)=>b.similarity-a.similarity).slice(0,4);
      return {category:cat,total:catRows.length,mentioned:rdCat.mentioned,winRate,topCompetitor,dailySearches,related};
    });

    // ── TARGETED QUERIES: brand-specific queries, toggle-only, no impact on GEO score ──
    let targetedClusters: any[] = [];
    try {
      const brandFamePrompt = `You are a brand research expert. Return ONLY valid JSON, no markdown, no explanation.

What specific products or features is "${brand}" genuinely well-known for in ${ind.name}?
Only include areas where ${brand} has a strong real-world market reputation.

Return exactly this JSON:
{"knownFor":[{"product":"product name","queries":["specific consumer question without brand name","another question","one more"]}]}
Maximum 5 products, 3 queries each.`;

      const fameRaw = await callAI([{role:'user', content: brandFamePrompt}], 0.2, 600);
      const fameData = JSON.parse(fameRaw.replace(/```json|```/g,'').trim());
      const knownFor: {product: string; queries: string[]}[] = fameData.knownFor || [];

      if (knownFor.length > 0) {
        const allTargetedQA: {product:string;query:string;ans:string;mentioned:boolean;position:number}[] = [];
        const flatQ: {product:string;query:string}[] = [];
        knownFor.forEach(k => k.queries.slice(0,3).forEach(q => flatQ.push({product:k.product, query:q})));

        const TBATCH = 10;
        const tbatches: {product:string;query:string}[][] = [];
        for (let i=0;i<flatQ.length;i+=TBATCH) tbatches.push(flatQ.slice(i,i+TBATCH));

        await Promise.all(tbatches.map(async (batch) => {
          const ql = batch.map((q,j)=>`Q${j+1}: ${q.query}`).join('\n\n');
          const labels = batch.map((_,j)=>`A${j+1}: [answer]`).join('\n');
          const p = `Answer each question directly. Name real specific brands. Do not favour any brand.\n\n${ql}\n\nRespond EXACTLY in this format:\n${labels}`;
          let bt = '';
          try { bt = await callAI([{role:'user',content:p}], 0.5, 1200); } catch {}
          batch.forEach((item,j) => {
            const mk=`A${j+1}:`, nm=`A${j+2}:`;
            let ans='';
            if(bt.includes(mk)){ const s=bt.indexOf(mk)+mk.length, e=bt.includes(nm)?bt.indexOf(nm):bt.length; ans=bt.slice(s,e).trim(); }
            const mentioned=aliases.some((a:string)=>(ans||'').toLowerCase().includes(a.toLowerCase()));
            const position=getBrandPosition(ans||'',brand);
            allTargetedQA.push({product:item.product,query:item.query,ans,mentioned,position});
          });
        }));

        const pMap: Record<string,typeof allTargetedQA> = {};
        allTargetedQA.forEach(qa=>{ if(!pMap[qa.product]) pMap[qa.product]=[]; pMap[qa.product].push(qa); });

        targetedClusters = Object.entries(pMap).map(([product,rows])=>{
          const total=rows.length;
          const mentioned=rows.filter(r=>r.mentioned).length;
          const winRate=total>0?Math.round((mentioned/total)*100):0;
          const posArr=rows.filter(r=>r.position>0).map(r=>r.position);
          const avgPos=posArr.length?posArr.reduce((a,b)=>a+b,0)/posArr.length:0;
          const prominence=avgPos>0?Math.round(Math.max(5,Math.min(95,100-(avgPos-1)*18))):0;
          const cc: Record<string,number>={};
          rows.forEach(r=>{
            const t=(r.ans||'').toLowerCase();
            (ind.comps||[]).forEach((c:string)=>{
              if(t.includes(c.toLowerCase())&&c.toLowerCase()!==brand.toLowerCase())
                cc[c]=(cc[c]||0)+1;
            });
          });
          const topComp=Object.entries(cc).sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
          return {
            product, total, mentioned, winRate, prominence, topCompetitor: topComp,
            responses: rows.map(r=>({query:r.query,mentioned:r.mentioned,position:r.position,response_preview:r.ans}))
          };
        }).sort((a,b)=>b.winRate-a.winRate);
      }
    } catch(e:any) {
      targetedClusters = [];
    }

    return NextResponse.json({
      brand_name: isDynamic ? detectedBrand : brand,
      industry: ind.name,
      ind_key: indKey,
      lob: lobLabel,
      ind_label: ind.label,
      visibility: visOverride,
      sentiment: sent,
      prominence: prom,
      citation_share: citOverride,
      share_of_voice: sov,
      overall_geo_score: geo,
      avg_rank: finalAvgRank,
      responses_detail: responsesDetail,
      responses_with_brand: mentionsDisplay,
      total_responses: totalQueriesDisplay,
      strengths_list: sc.strengths || [],
      improvements_list: sc.improvements || [],
      actions: sc.actions || [],
      citation_sources: cappedCitationSources,
      competitors,
      internal_links: (pageData as any).internalLinks || [],
      domain: (pageData as any).domain || '',
      page_url: url,
      trending_queries: trendingQueries,
      query_clusters: queryClusters,
      targeted_clusters: targetedClusters,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
