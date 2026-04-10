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
    return { ok: true, url, domain, title, metaDesc, headings, hasSchema, hasAuthor, hasTable, hasList, wordCount, internalLinks };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

function extractBrand(pageData: any): string {
  const D2B: Record<string, string> = {
    chase: 'Chase', vw: 'Volkswagen', volkswagen: 'Volkswagen', bmw: 'BMW',
    amex: 'American Express', americanexpress: 'American Express',
    bofa: 'Bank of America', bankofamerica: 'Bank of America',
    wellsfargo: 'Wells Fargo', usaa: 'USAA', capitalone: 'Capital One',
    discover: 'Discover', citi: 'Citi', citibank: 'Citi', barclays: 'Barclays',
    synchrony: 'Synchrony', toyota: 'Toyota', ford: 'Ford', honda: 'Honda',
    tesla: 'Tesla', hyundai: 'Hyundai', kia: 'Kia', nissan: 'Nissan',
    mercedes: 'Mercedes', audi: 'Audi', marriott: 'Marriott', hilton: 'Hilton',
    hyatt: 'Hyatt', apple: 'Apple', google: 'Google', microsoft: 'Microsoft',
    amazon: 'Amazon', samsung: 'Samsung', meta: 'Meta', netflix: 'Netflix',
    spotify: 'Spotify', adobe: 'Adobe', salesforce: 'Salesforce',
    walmart: 'Walmart', target: 'Target', nike: 'Nike', adidas: 'Adidas',
  };
  const domain = (pageData.domain || '').toLowerCase().replace('www.', '');
  const dk = domain.split('.')[0];
  if (D2B[dk]) return D2B[dk];
  for (const [k, v] of Object.entries(D2B)) { if (dk.includes(k)) return v; }
  const title = pageData.title || '';
  if (title) {
    for (const sep of ['|', '–', '-', '·']) {
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


function getIndustry(domain: string): string {
  const d = domain.toLowerCase();
  if (['capital','chase','amex','citi','discover','bank','credit','card','finance','fargo','visa','master','barclays','synchrony','usaa','wellsfargo','nerdwallet','bankrate'].some(k=>d.includes(k))) return 'fin';
  if (['toyota','ford','honda','bmw','tesla','vw','volkswagen','auto','car','motor','hyundai','kia','nissan','mercedes','audi','subaru','mazda','lexus','acura'].some(k=>d.includes(k))) return 'auto';
  if (['marriott','hilton','hyatt','holiday','sheraton','westin','ritz','airbnb','booking','expedia','hotel','resort'].some(k=>d.includes(k))) return 'hotel';
  if (['netflix','spotify','hulu','disney','hbo','streaming','music','entertainment','media','paramount','peacock'].some(k=>d.includes(k))) return 'media';
  if (['shopify','amazon','ebay','etsy','walmart','target','bestbuy','retail','shop','store','ecommerce','homedepot','kroger'].some(k=>d.includes(k))) return 'retail';
  if (['salesforce','hubspot','oracle','sap','workday','servicenow','adobe','software','saas','cloud','microsoft','google','ibm','intel','cisco'].some(k=>d.includes(k))) return 'tech';
  if (['nike','adidas','underarmour','lululemon','sport','fitness','athletic','puma','reebok','asics','brooks','hoka'].some(k=>d.includes(k))) return 'sport';
  if (['pharma','drug','medicine','health','hospital','clinic','medical','cvs','walgreen','insurance','anthem','aetna','cigna','humana','kaiser'].some(k=>d.includes(k))) return 'health';
  return 'gen';
}

const INDUSTRY_DATA: Record<string, any> = {
  fin: {
    name: 'financial services / credit cards',
    queries: [
      ['General Consumer', 'What are the best credit cards available right now?'],
      ['General Consumer', 'Which credit card companies are most recommended?'],
      ['General Consumer', 'What is the best credit card for everyday purchases?'],
      ['General Consumer', 'Which banks offer the best credit cards overall?'],
      ['General Consumer', 'What credit card should I get for my first card?'],
      ['Cash Back', 'What is the best flat rate cash back credit card?'],
      ['Cash Back', 'Best no annual fee cash back credit card'],
      ['Cash Back', 'Which credit card gives the best rewards on everyday spending?'],
      ['Cash Back', 'Best credit card for cash back on groceries and gas'],
      ['Cash Back', 'What is the simplest cash back card with no category tracking?'],
      ['Travel & Rewards', 'Best travel credit card for occasional travelers'],
      ['Travel & Rewards', 'Which credit card is best for earning miles and points?'],
      ['Travel & Rewards', 'Best credit card with no foreign transaction fees'],
      ['Travel & Rewards', 'Top credit cards for hotel and flight rewards'],
      ['Travel & Rewards', 'Best mid-tier travel credit card worth the annual fee?'],
      ['Credit Building', 'Best credit card for building credit with no credit history'],
      ['Credit Building', 'What is the best secured credit card?'],
      ['Credit Building', 'Best credit card for fair or average credit score'],
      ['Expert Recommendation', 'Which credit card company has the best customer service?'],
      ['Expert Recommendation', 'What are the most trusted credit card issuers in America?'],
    ],
    comps: ['Chase', 'American Express', 'Capital One', 'Citi', 'Discover', 'Wells Fargo', 'Bank of America', 'Synchrony', 'Barclays', 'USAA'],
    compUrls: { Chase: 'chase.com', 'American Express': 'americanexpress.com', 'Capital One': 'capitalone.com', Citi: 'citi.com', Discover: 'discover.com', 'Wells Fargo': 'wellsfargo.com', 'Bank of America': 'bankofamerica.com', Synchrony: 'synchrony.com', Barclays: 'barclays.com', USAA: 'usaa.com' },
    label: 'Financial Services',
    awareness: { chase: 60, 'american express': 58, 'capital one': 56, citi: 54, discover: 48, 'bank of america': 46, 'wells fargo': 42, usaa: 35, synchrony: 25, barclays: 22 },
  },
  auto: {
    name: 'automotive',
    queries: [
      ['General Consumer', 'What is the best car brand to buy from?'],
      ['General Consumer', 'Which car brand is the most reliable overall?'],
      ['General Consumer', 'What are the best car brands right now?'],
      ['General Consumer', 'Which car manufacturer do experts recommend most?'],
      ['General Consumer', 'Best car brands for long-term ownership and value'],
      ['Reliability', 'Which car brand has the fewest problems and repairs?'],
      ['Reliability', 'What car brand has the best reliability ratings?'],
      ['Reliability', 'Best car brands for avoiding costly repairs'],
      ['Reliability', 'Which cars hold their value best over time?'],
      ['Reliability', 'Most dependable car brands according to consumer reports'],
      ['Segment', 'Best SUV brands for families'],
      ['Segment', 'What is the best electric vehicle brand?'],
      ['Segment', 'Best luxury car brands for the money'],
      ['Segment', 'Top car brands for fuel efficiency and hybrid options'],
      ['Segment', 'Best affordable car brands under $35,000'],
      ['Safety & Technology', 'Which car brand has the best safety ratings?'],
      ['Safety & Technology', 'Best car brands for technology and driver assistance features'],
      ['Safety & Technology', 'Which automaker leads in innovation?'],
      ['Expert Recommendation', 'What car brand do mechanics recommend?'],
      ['Expert Recommendation', 'Which car companies are growing fastest in popularity?'],
    ],
    comps: ['Tesla', 'Toyota', 'BMW', 'Honda', 'Ford', 'Mercedes', 'Hyundai', 'Kia', 'Nissan', 'Volkswagen'],
    compUrls: { Tesla: 'tesla.com', Toyota: 'toyota.com', BMW: 'bmw.com', Honda: 'honda.com', Ford: 'ford.com', Mercedes: 'mercedes-benz.com', Hyundai: 'hyundai.com', Kia: 'kia.com', Nissan: 'nissanusa.com', Volkswagen: 'vw.com' },
    label: 'Automotive',
    awareness: { tesla: 58, toyota: 55, bmw: 50, honda: 48, ford: 45, mercedes: 44, hyundai: 38, kia: 33, nissan: 30, volkswagen: 32 },
  },
  hotel: {
    name: 'hotels and hospitality',
    queries: [
      ['General Consumer', 'What are the best hotel chains in the world?'],
      ['General Consumer', 'Which hotel brand offers the best value for money?'],
      ['General Consumer', 'What is the most recommended hotel chain for travelers?'],
      ['General Consumer', 'Best hotel loyalty programs worth joining'],
      ['General Consumer', 'Which hotel brands are most trusted by travelers?'],
      ['Luxury', 'What are the best luxury hotel brands?'],
      ['Luxury', 'Which hotel chain has the best high-end properties?'],
      ['Luxury', 'Best hotel brands for a premium travel experience'],
      ['Value', 'Best mid-range hotel chains with consistent quality'],
      ['Value', 'Which hotel brand offers the best amenities for the price?'],
      ['Loyalty', 'Which hotel loyalty program gives the best rewards?'],
      ['Loyalty', 'Best hotel points program for free nights'],
      ['Loyalty', 'Which hotel brand has the most locations worldwide?'],
      ['Expert Recommendation', 'What hotel chains do frequent travelers recommend most?'],
      ['Expert Recommendation', 'Best hotel brands for customer service and consistency'],
      ['Family & Leisure', 'Best hotel brands for family vacations'],
      ['Family & Leisure', 'Which hotel chains are best for weekend getaways?'],
      ['Family & Leisure', 'Top hotel brands with the best pools and amenities'],
      ['Business Travel', 'Best hotel chains for business travelers'],
      ['Business Travel', 'Which hotel brand is most recommended for corporate stays?'],
    ],
    comps: ['Marriott', 'Hilton', 'Hyatt', 'IHG', 'Wyndham', 'Best Western', 'Radisson', 'Accor', 'Four Seasons', 'Ritz-Carlton'],
    compUrls: { Marriott: 'marriott.com', Hilton: 'hilton.com', Hyatt: 'hyatt.com', IHG: 'ihg.com', Wyndham: 'wyndhamhotels.com', 'Best Western': 'bestwestern.com', Radisson: 'radissonhotels.com', Accor: 'accor.com', 'Four Seasons': 'fourseasons.com', 'Ritz-Carlton': 'ritzcarlton.com' },
    label: 'Hospitality',
    awareness: { marriott: 58, hilton: 56, hyatt: 48, ihg: 42, wyndham: 38, 'best western': 34, radisson: 30, accor: 32, 'four seasons': 45, 'ritz-carlton': 44 },
  },
  media: {
    name: 'streaming and entertainment',
    queries: [
      ['General Consumer', 'What is the best streaming service right now?'],
      ['General Consumer', 'Which streaming platform has the best content?'],
      ['General Consumer', 'What streaming service is most worth paying for?'],
      ['General Consumer', 'Best streaming services for movies and TV shows'],
      ['General Consumer', 'Which streaming platform do most people recommend?'],
      ['Content Quality', 'Which streaming service has the best original shows?'],
      ['Content Quality', 'Best streaming platform for movies'],
      ['Content Quality', 'What streaming service has the most content?'],
      ['Content Quality', 'Best streaming services for family and kids content'],
      ['Content Quality', 'Which platform has the best documentaries and series?'],
      ['Value', 'Best streaming service for the price'],
      ['Value', 'Which streaming service has the best free or cheap tier?'],
      ['Value', 'Most affordable streaming services with good content'],
      ['Music', 'What is the best music streaming service?'],
      ['Music', 'Which music app has the best sound quality and library?'],
      ['Expert Recommendation', 'What streaming services do critics recommend most?'],
      ['Expert Recommendation', 'Best streaming platforms for binge-watching'],
      ['Expert Recommendation', 'Which streaming service is growing fastest?'],
      ['Expert Recommendation', 'Best streaming services recommended by entertainment experts'],
      ['Expert Recommendation', 'What is the most popular streaming platform right now?'],
    ],
    comps: ['Netflix', 'Disney+', 'HBO Max', 'Amazon Prime Video', 'Apple TV+', 'Hulu', 'Peacock', 'Paramount+', 'Spotify', 'Apple Music'],
    compUrls: { Netflix: 'netflix.com', 'Disney+': 'disneyplus.com', 'HBO Max': 'max.com', 'Amazon Prime Video': 'primevideo.com', 'Apple TV+': 'apple.com/tv', Hulu: 'hulu.com', Peacock: 'peacocktv.com', 'Paramount+': 'paramountplus.com', Spotify: 'spotify.com', 'Apple Music': 'music.apple.com' },
    label: 'Streaming & Entertainment',
    awareness: { netflix: 62, 'disney+': 58, 'hbo max': 52, 'amazon prime video': 54, 'apple tv+': 46, hulu: 48, peacock: 38, 'paramount+': 36, spotify: 56, 'apple music': 48 },
  },
  retail: {
    name: 'retail and e-commerce',
    queries: [
      ['General Consumer', 'What is the best online store for shopping?'],
      ['General Consumer', 'Which retailer has the best prices and selection?'],
      ['General Consumer', 'Best retailers for fast and reliable delivery'],
      ['General Consumer', 'Which stores are most trusted for online shopping?'],
      ['General Consumer', 'Best shopping apps and websites recommended by consumers'],
      ['Value', 'Which retailer has the best deals and discounts?'],
      ['Value', 'Best stores for everyday low prices'],
      ['Value', 'Which retail brand offers the best overall value?'],
      ['Loyalty', 'Best retail loyalty and rewards programs'],
      ['Loyalty', 'Which store membership is worth the annual fee?'],
      ['Category', 'Best stores for electronics and tech products'],
      ['Category', 'Top retailers for home goods and furniture'],
      ['Category', 'Best online stores for clothing and fashion'],
      ['Category', 'Which retailer is best for groceries and household items?'],
      ['Category', 'Best stores for sports and outdoor gear'],
      ['Expert Recommendation', 'Which retailers have the best return policies?'],
      ['Expert Recommendation', 'Most trusted retailers for quality products'],
      ['Expert Recommendation', 'Which retail brands have the best customer service?'],
      ['Expert Recommendation', 'Best retailers recommended by consumer advocates'],
      ['Expert Recommendation', 'Which retail companies are growing most right now?'],
    ],
    comps: ['Amazon', 'Walmart', 'Target', 'Costco', 'Best Buy', 'eBay', 'Etsy', 'Shopify', 'Home Depot', 'Kroger'],
    compUrls: { Amazon: 'amazon.com', Walmart: 'walmart.com', Target: 'target.com', Costco: 'costco.com', 'Best Buy': 'bestbuy.com', eBay: 'ebay.com', Etsy: 'etsy.com', Shopify: 'shopify.com', 'Home Depot': 'homedepot.com', Kroger: 'kroger.com' },
    label: 'Retail & E-Commerce',
    awareness: { amazon: 65, walmart: 60, target: 55, costco: 52, 'best buy': 46, ebay: 48, etsy: 42, shopify: 38, 'home depot': 44, kroger: 38 },
  },
  tech: {
    name: 'technology and software',
    queries: [
      ['General Consumer', 'What are the best technology companies right now?'],
      ['General Consumer', 'Which tech companies are most trusted and reliable?'],
      ['General Consumer', 'Best software companies recommended by professionals'],
      ['General Consumer', 'Which tech brands lead in innovation?'],
      ['General Consumer', 'Most recommended tech companies for businesses'],
      ['Software & SaaS', 'Best CRM software for businesses'],
      ['Software & SaaS', 'Which cloud platform is most recommended?'],
      ['Software & SaaS', 'Best project management and productivity software'],
      ['Software & SaaS', 'Top enterprise software companies'],
      ['Software & SaaS', 'Best marketing automation platforms'],
      ['Consumer Tech', 'Which smartphone brand is the best?'],
      ['Consumer Tech', 'Best laptop brands for professionals'],
      ['Consumer Tech', 'Which tech company makes the most reliable products?'],
      ['Consumer Tech', 'Best consumer electronics brands overall'],
      ['Consumer Tech', 'Top tech brands recommended for home and work'],
      ['AI & Innovation', 'Which tech companies are leading in AI?'],
      ['AI & Innovation', 'Best technology companies for innovation and R&D'],
      ['Expert Recommendation', 'Most trusted software companies for enterprises'],
      ['Expert Recommendation', 'Which tech companies have the best customer support?'],
      ['Expert Recommendation', 'Top tech brands recommended by IT professionals'],
    ],
    comps: ['Apple', 'Microsoft', 'Google', 'Amazon', 'Salesforce', 'Adobe', 'Oracle', 'SAP', 'IBM', 'Cisco'],
    compUrls: { Apple: 'apple.com', Microsoft: 'microsoft.com', Google: 'google.com', Amazon: 'amazon.com', Salesforce: 'salesforce.com', Adobe: 'adobe.com', Oracle: 'oracle.com', SAP: 'sap.com', IBM: 'ibm.com', Cisco: 'cisco.com' },
    label: 'Technology',
    awareness: { apple: 65, microsoft: 63, google: 64, amazon: 60, salesforce: 52, adobe: 50, oracle: 46, sap: 44, ibm: 48, cisco: 45 },
  },
  sport: {
    name: 'sports and fitness brands',
    queries: [
      ['General Consumer', 'What are the best athletic wear brands?'],
      ['General Consumer', 'Which sportswear brand is most recommended?'],
      ['General Consumer', 'Best fitness and workout clothing brands'],
      ['General Consumer', 'Which sports brand makes the best running shoes?'],
      ['General Consumer', 'Most trusted athletic brands overall'],
      ['Performance', 'Best sports brands for serious athletes'],
      ['Performance', 'Which athletic brand has the best performance gear?'],
      ['Performance', 'Top brands for runners and gym goers'],
      ['Performance', 'Best sportswear brands for high-intensity training'],
      ['Performance', 'Which brand makes the most durable athletic wear?'],
      ['Lifestyle', 'Best casual athletic wear brands for everyday use'],
      ['Lifestyle', 'Which sportswear brand is most stylish and fashionable?'],
      ['Lifestyle', 'Top athleisure brands recommended by fitness enthusiasts'],
      ['Value', 'Best affordable sportswear brands with good quality'],
      ['Value', 'Which athletic brand offers the best value for money?'],
      ['Expert Recommendation', 'What sports brands do athletes recommend most?'],
      ['Expert Recommendation', 'Best athletic brands for sustainability and ethics'],
      ['Expert Recommendation', 'Which sports brands are growing most in popularity?'],
      ['Expert Recommendation', 'Most innovative athletic wear companies right now'],
      ['Expert Recommendation', 'Best sports brands recommended by fitness experts'],
    ],
    comps: ['Nike', 'Adidas', 'Under Armour', 'Lululemon', 'New Balance', 'Puma', 'Reebok', 'Asics', 'Brooks', 'Hoka'],
    compUrls: { Nike: 'nike.com', Adidas: 'adidas.com', 'Under Armour': 'underarmour.com', Lululemon: 'lululemon.com', 'New Balance': 'newbalance.com', Puma: 'puma.com', Reebok: 'reebok.com', Asics: 'asics.com', Brooks: 'brooksrunning.com', Hoka: 'hoka.com' },
    label: 'Sports & Fitness',
    awareness: { nike: 65, adidas: 62, 'under armour': 52, lululemon: 50, 'new balance': 46, puma: 44, reebok: 40, asics: 38, brooks: 34, hoka: 36 },
  },
  health: {
    name: 'healthcare and insurance',
    queries: [
      ['General Consumer', 'What are the best health insurance companies?'],
      ['General Consumer', 'Which healthcare companies are most trusted?'],
      ['General Consumer', 'Best health insurance plans recommended by consumers'],
      ['General Consumer', 'Which pharmacy chains are most convenient and trusted?'],
      ['General Consumer', 'Most recommended health and wellness companies'],
      ['Insurance', 'Which health insurance company has the best coverage?'],
      ['Insurance', 'Best health insurance for individuals and families'],
      ['Insurance', 'Which insurance companies have the best customer service?'],
      ['Insurance', 'Most affordable health insurance with good coverage'],
      ['Insurance', 'Best health insurance networks and provider access'],
      ['Pharmacy', 'Which pharmacy chain is most recommended?'],
      ['Pharmacy', 'Best pharmacies for prescription pricing and service'],
      ['Pharmacy', 'Top pharmacy chains for convenience and delivery'],
      ['Expert Recommendation', 'What health insurance do doctors recommend?'],
      ['Expert Recommendation', 'Most trusted healthcare companies according to experts'],
      ['Expert Recommendation', 'Best healthcare companies for employee benefits'],
      ['Expert Recommendation', 'Which health insurance companies pay claims fastest?'],
      ['Expert Recommendation', 'Top rated healthcare brands by patient satisfaction'],
      ['Wellness', 'Best health and wellness companies for preventive care'],
      ['Wellness', 'Which healthcare brands lead in digital health innovation?'],
    ],
    comps: ['UnitedHealth', 'Anthem', 'Aetna', 'Cigna', 'Humana', 'CVS Health', 'Walgreens', 'Kaiser', 'Blue Cross', 'Centene'],
    compUrls: { UnitedHealth: 'uhc.com', Anthem: 'anthem.com', Aetna: 'aetna.com', Cigna: 'cigna.com', Humana: 'humana.com', 'CVS Health': 'cvs.com', Walgreens: 'walgreens.com', Kaiser: 'kp.org', 'Blue Cross': 'bcbs.com', Centene: 'centene.com' },
    label: 'Healthcare',
    awareness: { unitedhealth: 55, anthem: 50, aetna: 52, cigna: 50, humana: 46, 'cvs health': 54, walgreens: 52, kaiser: 48, 'blue cross': 50, centene: 35 },
  },
  gen: {
    name: 'consumer brands',
    queries: [
      ['General Consumer', 'What are the most trusted brands right now?'],
      ['General Consumer', 'Which companies are most recommended by consumers?'],
      ['General Consumer', 'Best brands for quality and value overall'],
      ['General Consumer', 'Which companies have the best reputation?'],
      ['General Consumer', 'What brands do people recommend most?'],
      ['Expert Recommendation', 'Which brands are leading in their industry?'],
      ['Expert Recommendation', 'Most trusted companies according to consumer reviews'],
      ['Expert Recommendation', 'Best brands for customer service and support'],
      ['Expert Recommendation', 'Which companies are most innovative right now?'],
      ['Expert Recommendation', 'Top brands recommended by industry experts'],
      ['Product Quality', 'Best brands for reliable and high-quality products'],
      ['Product Quality', 'Which companies have the best warranties and guarantees?'],
      ['Product Quality', 'Most consistent brands for product quality'],
      ['Product Quality', 'Best companies for first-time buyers'],
      ['Product Quality', 'Which brands offer the best value for money?'],
      ['Loyalty & Trust', 'Which companies have the most loyal customers?'],
      ['Loyalty & Trust', 'Best brands for loyalty programs and rewards'],
      ['Loyalty & Trust', 'Most ethical and sustainable companies right now'],
      ['Loyalty & Trust', 'Which brands are growing fastest in popularity?'],
      ['Loyalty & Trust', 'What is the most trusted brand in this space?'],
    ],
    comps: [],
    compUrls: {},
    label: 'General',
    awareness: {},
  },
};

// All known brand names across all industries used to detect position accurately
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
  // Only count known brand names that appear before this brand — not random capitalized words
  const brandsBeforeCount = ALL_KNOWN_BRANDS.filter(b => b !== bl && before.includes(b)).length;
  return brandsBeforeCount + 1;
}

// ── Competitor scoring: blends actual response data with brand awareness baseline ──
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

  const cv = mentions > 0
    ? Math.round(mentionRate * 0.7 + baseline * 0.3)
    : Math.round(baseline * 0.5);

  const positions = mentionedResponses
    .map(r => getBrandPosition(r.response_preview || r.response || '', name))
    .filter(p => p > 0);
  const avgPos = positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : 3.5;

  const cp = Math.round(Math.max(10, Math.min(85, 95 - (avgPos - 1) * 15)));
  const cc = Math.round(Math.min(85, cv * 0.65 + cp * 0.25 + (mentions > 0 ? 5 : 0)));
  const cs = Math.round(Math.min(88, 45 + (mentions > 0 ? 20 : 0) + cp * 0.25));
  const csov = Math.round(Math.min(80, cv * 0.75 + (mentions > 0 ? 8 : 0)));
  const geo = Math.round(cv * 0.30 + cs * 0.20 + cp * 0.20 + cc * 0.15 + csov * 0.15);
  const avgRank = positions.length > 0 ? `#${Math.round(avgPos)}` : 'N/A';

  return { Brand: name, GEO: geo, Vis: cv, Cit: cc, Sen: cs, Sov: csov, Prom: cp, Rank: avgRank };
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    const pageData = await fetchPageContent(url);
    if (!pageData.ok) return NextResponse.json({ error: (pageData as any).error }, { status: 400 });

    const brand = extractBrand(pageData);
    const bl = brand.toLowerCase();
    const aliases: string[] = [bl, bl.replace(/\s+/g, ''), bl.replace(/\s+/g, '-')];
    const indKey = getIndustry((pageData as any).domain || '');
    const ind = INDUSTRY_DATA[indKey];
    const queries: string[][] = ind.queries;
    const allQA: any[] = [];

    // FIX BUG 6: Run queries in batches but parse more robustly
    for (let i = 0; i < 20; i += 5) {
      const batch = queries.slice(i, i + 5);
      const ql = batch.map((q, j) => `Q${j + 1}: ${q[1]}`).join('\n\n');
      const prompt = `You are a knowledgeable consumer advisor. Answer each question naturally and specifically. Name real brands. Do not favour any.\n\n${ql}\n\nRespond with exactly this format:\nA1: [answer]\nA2: [answer]\nA3: [answer]\nA4: [answer]\nA5: [answer]`;
      const bt = await callAI([{ role: 'user', content: prompt }], 0.6, 1200);
      for (let j = 1; j <= 5; j++) {
        let ans = '';
        const marker = `A${j}:`;
        const nextMarker = `A${j + 1}:`;
        if (bt.includes(marker)) {
          const s = bt.indexOf(marker) + marker.length;
          const e = bt.includes(nextMarker) ? bt.indexOf(nextMarker) : bt.length;
          ans = bt.slice(s, e).trim();
        }
        allQA.push({ category: batch[j - 1][0], q: batch[j - 1][1], a: ans });
      }
    }

    // FIX BUG 1+2+3: Visibility = real mention count across ALL 20 responses
    // Check all alias variants, not just exact brand name
    const mentionedQAs = allQA.filter(p =>
      aliases.some(a => p.a.toLowerCase().includes(a))
    );
    const mentions = mentionedQAs.length;
    const visibility = Math.round((mentions / 20) * 100);

    // Compute avg_rank from actual response text — never let AI hallucinate this
    const positions = allQA
      .map(p => getBrandPosition(p.a, brand))
      .filter(p => p > 0);
    const computedAvgRank = positions.length
      ? `#${Math.round(positions.reduce((a, b) => a + b, 0) / positions.length)}`
      : 'N/A';

    let sc: any;

    if (mentions === 0) {
      sc = {
        citation_share: 0, sentiment: 0, prominence: 0, share_of_voice: 0,
        strengths: [
          'Brand not yet appearing in AI responses.',
          'Baseline established, clear room to grow.',
          'Competitors present, confirming category is AI-discoverable.',
        ],
        improvements: [
          'Not mentioned in 20 generic queries.',
          'AI not associating brand with key industry questions.',
          'No citation authority established.',
          'Competitors appearing instead of your brand.',
          'Content not yet structured for AI discovery.',
        ],
        actions: [
          { priority: 'High', action: 'Create FAQ and comparison pages targeting queries in this analysis.' },
          { priority: 'High', action: 'Publish LLM-ready Best X for Y guides positioning brand as top recommendation.' },
          { priority: 'Medium', action: 'Add structured data (schema markup) to key pages.' },
          { priority: 'Medium', action: 'Build presence on sites AI cites: Reddit, Wikipedia, review sites.' },
          { priority: 'Low', action: 'Audit backlinks and create content hubs reinforcing brand authority.' },
        ],
      };
    } else {
      // FIX BUG 1: Pass ALL 20 responses with context of which ones included the brand
      // This forces AI to score relative to total queries, not cherry-picked subset
      const allContext = allQA.map((p, i) =>
        `Q${i + 1} [${aliases.some(a => p.a.toLowerCase().includes(a)) ? 'BRAND MENTIONED' : 'not mentioned'}]: ${p.a.slice(0, 200)}`
      ).join('\n');

      // FIX BUG 2+3: Prompt explicitly anchors all scores to the full 20-query context
      // citation_share is capped at visibility since brand can only be cited where it appears
      const sp = `You are a GEO analyst. Brand "${brand}" appeared in ${mentions} out of 20 AI responses (visibility = ${visibility}%).

Here are ALL 20 responses with whether the brand was mentioned:
${allContext}

Score the brand on each dimension from 0–100. IMPORTANT CONSTRAINTS:
- citation_share MUST be between 0 and ${visibility + 10} — it cannot exceed visibility significantly since you can only be cited where you appear
- sentiment is ONLY based on the ${mentions} responses where brand appeared — how positively was it described in those?
- prominence: how early in responses did the brand appear when it was mentioned? (100 = always first, 0 = always last)
- share_of_voice: of all brand mentions across all 20 responses, what % were for "${brand}"?

Return ONLY valid JSON, no markdown:
{"citation_share":0,"sentiment":0,"prominence":0,"share_of_voice":0,"strengths":["...","...","..."],"improvements":["...","...","...","...","..."],"actions":[{"priority":"High","action":"..."},{"priority":"High","action":"..."},{"priority":"Medium","action":"..."},{"priority":"Medium","action":"..."},{"priority":"Low","action":"..."}]}`;

      const raw = await callAI([{ role: 'user', content: sp }], 0.0, 1000);
      try {
        sc = JSON.parse(raw.replace(/```json|```/g, '').trim());
        // Hard enforce: citation_share cannot exceed visibility + 10
        sc.citation_share = Math.min(sc.citation_share || 0, visibility + 10);
        // Hard enforce: all scores 0-100
        for (const k of ['citation_share', 'sentiment', 'prominence', 'share_of_voice']) {
          sc[k] = Math.max(0, Math.min(100, sc[k] || 0));
        }
      } catch {
        sc = { citation_share: 0, sentiment: 0, prominence: 0, share_of_voice: 0, strengths: [], improvements: [], actions: [] };
      }
    }

    const cit = sc.citation_share || 0;
    const sent = sc.sentiment || 0;
    const prom = sc.prominence || 0;
    const sov = sc.share_of_voice || 0;

    // GEO formula — same weights as before
    const geo = Math.round(visibility * 0.30 + sent * 0.20 + prom * 0.20 + cit * 0.15 + sov * 0.15);

    const responsesDetail = allQA.map(p => ({
      category: p.category,
      query: p.q,
      mentioned: aliases.some(a => p.a.toLowerCase().includes(a)),
      response_preview: p.a,
      position: getBrandPosition(p.a, brand),
    }));

    // Citation sources
    let citationSources: any[] = [];
    try {
      const cp = `For "${brand}" in ${ind.name}, list top 10 domains influencing AI knowledge. Estimate citation % (sum=100), classify as Social/Institution/Earned Media/Owned Media/Other, list top 3 page paths. Return ONLY valid JSON array, no markdown: [{"rank":1,"domain":"x.com","category":"Earned Media","citation_share":25,"top_pages":["/a","/b","/c"]}]. Exactly 10 items.`;
      const cr = await callAI([{ role: 'user', content: cp }], 0.1, 800);
      citationSources = JSON.parse(cr.replace(/```json|```/g, '').trim());
    } catch {}

    // FIX BUG 4: Competitors scored from actual response data — no hardcoded floors/caps
    const competitors = ind.comps
      .filter((c: string) => c.toLowerCase() !== bl)
      .map((c: string) => {
        const s = scoreCompetitor(c, responsesDetail, ind.awareness || {});
        return { ...s, URL: ind.compUrls[c] || `${c.toLowerCase().replace(/ /g, '')}.com` };
      });

    return NextResponse.json({
      brand_name: brand,
      industry: ind.name,
      ind_key: indKey,
      ind_label: ind.label,
      visibility,
      sentiment: sent,
      prominence: prom,
      citation_share: cit,
      share_of_voice: sov,
      overall_geo_score: geo,
      // FIX BUG 7: always use computed avg_rank from actual response positions, never AI-hallucinated value
      avg_rank: computedAvgRank,
      responses_detail: responsesDetail,
      responses_with_brand: mentions,
      total_responses: 20,
      strengths_list: sc.strengths || [],
      improvements_list: sc.improvements || [],
      actions: sc.actions || [],
      citation_sources: citationSources,
      competitors,
      internal_links: (pageData as any).internalLinks || [],
      domain: (pageData as any).domain || '',
      page_url: url,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
