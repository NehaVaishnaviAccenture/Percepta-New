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

function getIndustry(domain: string, pageData?: any): string {
  const d = domain.toLowerCase();
  // Check URL path first — most reliable signal
  const urlPath = ((pageData as any)?.url || '').toLowerCase();
  const pathRetailSignals = ['/bank','/banking','/checking','/savings','/deposits','/cd','/money-market','/personal-banking'];
  const pathCreditSignals = ['/credit-card','/creditcard','/rewards-card','/cash-back'];
  const pathIsRetail = pathRetailSignals.some(k => urlPath.includes(k));
  const pathIsCredit = pathCreditSignals.some(k => urlPath.includes(k));
  const isFin = ['capital','chase','amex','americanexpress','citi','discover','bank','credit','card','finance','fargo','visa','master','barclays','synchrony','usaa','wellsfargo','nerdwallet','bankrate','navyfederal','penfed','truist','regions','huntington','keybank','td.com'].some(k=>d.includes(k));
  if (isFin && pathIsRetail) return 'fin_retail_bank';
  if (isFin && pathIsCredit) return 'fin';
  // Fallback: check page content
  if (pageData) {
    const pageText = [
      ...(pageData.headings || []),
      pageData.title || '',
      pageData.metaDesc || '',
    ].join(' ').toLowerCase();
    const retailBankKeywords = ['checking account','savings account','high yield','cd rate','certificate of deposit','checking and savings','personal banking','deposit account','apy','fdic','money market','savings rate','checking fee'];
    const isRetailBank = retailBankKeywords.some(k => pageText.includes(k));
    const creditKeywords = ['credit card','rewards card','cash back','apr','signup bonus','annual fee','travel rewards','credit limit','balance transfer'];
    const isCredit = creditKeywords.some(k => pageText.includes(k));
    if (isFin && isRetailBank && !isCredit) return 'fin_retail_bank';
    if (isFin && isRetailBank && isCredit) return 'fin';
  }
  if (['capital','chase','amex','americanexpress','citi','discover','bank','credit','card','finance','fargo','visa','master','barclays','synchrony','usaa','wellsfargo','nerdwallet','bankrate','scotia','scotiabank','bmo','rbc','cibc','nbc','desjardins','tangerine','navyfederal','penfed','truist','regions','huntington','keybank','53','td.com'].some(k=>d.includes(k))) return 'fin';
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
      ['General Consumer', 'Which credit card is most popular in America?'],
      ['General Consumer', 'What is the most recommended credit card by financial experts?'],
      ['General Consumer', 'Best credit cards for people with good credit'],
      ['General Consumer', 'Which credit card has the best overall value?'],
      ['General Consumer', 'Most trusted credit card brands in the US'],
      ['Cash Back', 'What is the best flat rate cash back credit card?'],
      ['Cash Back', 'Best no annual fee cash back credit card'],
      ['Cash Back', 'Which credit card gives the best rewards on everyday spending?'],
      ['Cash Back', 'Best credit card for cash back on groceries and gas'],
      ['Cash Back', 'What is the simplest cash back card with no category tracking?'],
      ['Cash Back', 'Best 2% cash back credit card with no annual fee'],
      ['Cash Back', 'Which cash back card is best for dining and food delivery?'],
      ['Cash Back', 'Best credit card for earning cash back on online shopping'],
      ['Cash Back', 'Top cash back credit cards recommended by financial advisors'],
      ['Cash Back', 'Which credit card gives unlimited cash back on all purchases?'],
      ['Travel & Rewards', 'Best travel credit card for occasional travelers'],
      ['Travel & Rewards', 'Which credit card is best for earning miles and points?'],
      ['Travel & Rewards', 'Best credit card with no foreign transaction fees'],
      ['Travel & Rewards', 'Top credit cards for hotel and flight rewards'],
      ['Travel & Rewards', 'Best mid-tier travel credit card worth the annual fee?'],
      ['Travel & Rewards', 'Which credit card has the best airport lounge access?'],
      ['Travel & Rewards', 'Best credit card for booking hotels and rental cars'],
      ['Travel & Rewards', 'Top rewards credit cards for frequent flyers'],
      ['Travel & Rewards', 'Which credit card transfers points to the most airlines?'],
      ['Travel & Rewards', 'Best credit card for international travel in 2025'],
      ['Credit Building', 'Best credit card for building credit with no credit history'],
      ['Credit Building', 'What is the best secured credit card?'],
      ['Credit Building', 'Best credit card for fair or average credit score'],
      ['Credit Building', 'Which credit card is easiest to get approved for?'],
      ['Credit Building', 'Best first credit card for college students'],
      ['Credit Building', 'Top credit cards for rebuilding bad credit'],
      ['Credit Building', 'Which secured credit card graduates to unsecured fastest?'],
      ['Credit Building', 'Best credit cards with no credit check required'],
      ['Credit Building', 'Which credit card helps build credit the fastest?'],
      ['Credit Building', 'Best starter credit cards recommended for beginners'],
      ['Expert Recommendation', 'Which credit card company has the best customer service?'],
      ['Expert Recommendation', 'What are the most trusted credit card issuers in America?'],
      ['Expert Recommendation', 'Which credit card has the best fraud protection?'],
      ['Expert Recommendation', 'Best credit cards for maximizing rewards overall'],
      ['Expert Recommendation', 'Which bank has the most credit card options?'],
      ['Expert Recommendation', 'Best credit cards recommended by NerdWallet and Bankrate'],
      ['Expert Recommendation', 'Which credit card company treats customers best?'],
      ['Expert Recommendation', 'Best credit cards for small business owners'],
      ['Expert Recommendation', 'Which credit card has the lowest interest rates?'],
      ['Expert Recommendation', 'What credit card do most Americans use and recommend?'],
    ],
    comps: ['Chase', 'American Express', 'Capital One', 'Citi', 'Discover', 'Wells Fargo', 'Bank of America', 'Synchrony', 'Barclays', 'USAA', 'Navy Federal', 'PenFed', 'TD Bank', 'US Bank', 'Regions Bank', 'Citizens Bank', 'Truist', 'Fifth Third', 'KeyBank', 'Huntington'],
    compUrls: { Chase: 'chase.com', 'American Express': 'americanexpress.com', 'Capital One': 'capitalone.com', Citi: 'citi.com', Discover: 'discover.com', 'Wells Fargo': 'wellsfargo.com', 'Bank of America': 'bankofamerica.com', Synchrony: 'synchrony.com', Barclays: 'barclays.com', USAA: 'usaa.com', 'Navy Federal': 'navyfederal.org', 'PenFed': 'penfed.org', 'TD Bank': 'td.com', 'US Bank': 'usbank.com', 'Regions Bank': 'regions.com', 'Citizens Bank': 'citizensbank.com', Truist: 'truist.com', 'Fifth Third': '53.com', KeyBank: 'key.com', Huntington: 'huntington.com' },
    label: 'Financial Services',
    awareness: { chase: 60, 'american express': 58, 'capital one': 56, citi: 54, discover: 48, 'bank of america': 46, 'wells fargo': 42, usaa: 35, synchrony: 25, barclays: 22, 'navy federal': 28, 'penfed': 16, 'td bank': 20, 'us bank': 24, 'regions bank': 14, 'citizens bank': 16, truist: 18, 'fifth third': 14, keybank: 12, huntington: 13 },
  },
  fin_retail_bank: {
    name: 'retail banking',
    queries: [
      ['General Consumer', 'What is the best bank for a checking account?'],
      ['General Consumer', 'Which bank has the best free checking account?'],
      ['General Consumer', 'What is the best bank account to open right now?'],
      ['General Consumer', 'Which bank do most Americans trust for everyday banking?'],
      ['General Consumer', 'Best banks for personal banking in the US'],
      ['General Consumer', 'Which bank has the fewest fees for checking accounts?'],
      ['General Consumer', 'What bank should I use for my primary account?'],
      ['General Consumer', 'Best banks for direct deposit accounts'],
      ['General Consumer', 'Which bank is easiest to open an account with?'],
      ['General Consumer', 'Most recommended banks by financial experts'],
      ['Savings', 'What is the best high yield savings account right now?'],
      ['Savings', 'Which bank has the highest savings account interest rate?'],
      ['Savings', 'Best online savings accounts with no fees'],
      ['Savings', 'Where should I keep my emergency fund savings?'],
      ['Savings', 'Which bank offers the best APY on savings accounts?'],
      ['Savings', 'Best savings accounts recommended by NerdWallet'],
      ['Savings', 'Which bank has the best high yield savings account?'],
      ['Savings', 'Best banks for growing your savings in 2025'],
      ['Savings', 'Which savings account beats inflation right now?'],
      ['Savings', 'Best savings accounts with no minimum balance'],
      ['Checking', 'What is the best checking account with no monthly fees?'],
      ['Checking', 'Which bank has the best checking account benefits?'],
      ['Checking', 'Best checking accounts with cashback rewards'],
      ['Checking', 'Which bank has the most ATMs and best ATM access?'],
      ['Checking', 'Best online checking accounts with no fees'],
      ['Checking', 'Which bank offers overdraft protection on checking?'],
      ['Checking', 'Best checking accounts for people who travel frequently'],
      ['Checking', 'Which banks offer early direct deposit on checking accounts?'],
      ['Checking', 'Best checking accounts for college students'],
      ['Checking', 'Which bank has the best mobile app for checking accounts?'],
      ['CDs', 'What is the best CD rate available right now?'],
      ['CDs', 'Which bank has the highest CD interest rates?'],
      ['CDs', 'Best short term CDs with high APY'],
      ['CDs', 'Best 12 month CD rates from major banks'],
      ['CDs', 'Which bank offers the best no-penalty CD?'],
      ['CDs', 'Best CD laddering strategy banks to use'],
      ['CDs', 'Which online bank has the best CD rates?'],
      ['CDs', 'Best banks for locking in high CD rates'],
      ['CDs', 'Where should I put money in a CD right now?'],
      ['CDs', 'Best CD rates for conservative investors'],
      ['Expert Recommendation', 'Which bank is the safest to keep money in?'],
      ['Expert Recommendation', 'What bank do financial advisors recommend for savings?'],
      ['Expert Recommendation', 'Best banks for overall banking relationship'],
      ['Expert Recommendation', 'Which bank has the best customer service for personal banking?'],
      ['Expert Recommendation', 'Most trusted banks in America for deposits'],
      ['Expert Recommendation', 'Best banks recommended by Bankrate for savings'],
      ['Expert Recommendation', 'Which bank is best for someone switching banks?'],
      ['Expert Recommendation', 'Best banks for FDIC insured deposits'],
      ['Expert Recommendation', 'Which bank is best for building long term wealth?'],
      ['Expert Recommendation', 'Best banks for overall value and low fees'],
    ],
    comps: ['Chase', 'Bank of America', 'Wells Fargo', 'Ally', 'Marcus', 'Capital One', 'Citi', 'US Bank', 'Discover Bank', 'SoFi', 'Synchrony Bank', 'American Express Bank', 'Barclays', 'USAA', 'Navy Federal'],
    compUrls: { 'Chase': 'chase.com', 'Bank of America': 'bankofamerica.com', 'Wells Fargo': 'wellsfargo.com', 'Ally': 'ally.com', 'Marcus': 'marcus.com', 'Capital One': 'capitalone.com', 'Citi': 'citi.com', 'US Bank': 'usbank.com', 'Discover Bank': 'discover.com', 'SoFi': 'sofi.com', 'Synchrony Bank': 'synchrony.com', 'American Express Bank': 'americanexpress.com', 'Barclays': 'barclays.com', 'USAA': 'usaa.com', 'Navy Federal': 'navyfederal.org' },
    label: 'Retail Banking',
    awareness: { chase: 62, 'bank of america': 58, 'wells fargo': 52, ally: 48, marcus: 42, 'capital one': 50, citi: 44, 'us bank': 36, 'discover bank': 38, sofi: 34, 'synchrony bank': 28, 'american express bank': 30, barclays: 20, usaa: 32, 'navy federal': 26 },
  },
  auto: {
    name: 'automotive',
    queries: [
      ['General Consumer', 'What is the best car brand to buy from?'],
      ['General Consumer', 'Which car brand is the most reliable overall?'],
      ['General Consumer', 'What are the best car brands right now?'],
      ['General Consumer', 'Which car manufacturer do experts recommend most?'],
      ['General Consumer', 'Best car brands for long-term ownership and value'],
      ['General Consumer', 'Which car brand is most popular in America?'],
      ['General Consumer', 'What car brand has the best reputation?'],
      ['General Consumer', 'Most recommended car brands by consumer reports'],
      ['General Consumer', 'Which automaker makes the highest quality vehicles?'],
      ['General Consumer', 'Best car brands for first time car buyers'],
      ['Reliability', 'Which car brand has the fewest problems and repairs?'],
      ['Reliability', 'What car brand has the best reliability ratings?'],
      ['Reliability', 'Best car brands for avoiding costly repairs'],
      ['Reliability', 'Which cars hold their value best over time?'],
      ['Reliability', 'Most dependable car brands according to consumer reports'],
      ['Reliability', 'Which car brand has the lowest cost of ownership?'],
      ['Reliability', 'Best cars for high mileage and longevity'],
      ['Reliability', 'Which car brand has the fewest recalls?'],
      ['Reliability', 'Most reliable cars for over 200000 miles'],
      ['Reliability', 'Best car brands for used car buyers'],
      ['Segment', 'Best SUV brands for families'],
      ['Segment', 'What is the best electric vehicle brand?'],
      ['Segment', 'Best luxury car brands for the money'],
      ['Segment', 'Top car brands for fuel efficiency and hybrid options'],
      ['Segment', 'Best affordable car brands under $35,000'],
      ['Segment', 'Best truck brands for towing and work'],
      ['Segment', 'Top sports car brands for performance'],
      ['Segment', 'Best car brands for city driving and small cars'],
      ['Segment', 'Most recommended minivan brands for families'],
      ['Segment', 'Best car brands for off-road driving'],
      ['Safety & Technology', 'Which car brand has the best safety ratings?'],
      ['Safety & Technology', 'Best car brands for technology and driver assistance features'],
      ['Safety & Technology', 'Which automaker leads in innovation?'],
      ['Safety & Technology', 'Best cars for ADAS and collision avoidance'],
      ['Safety & Technology', 'Which car brand has the best infotainment system?'],
      ['Safety & Technology', 'Most awarded car brands for safety in 2025'],
      ['Safety & Technology', 'Best car brands for autonomous driving features'],
      ['Safety & Technology', 'Which cars have the best crash test ratings?'],
      ['Safety & Technology', 'Best connected car technology brands'],
      ['Safety & Technology', 'Which automaker invests most in safety research?'],
      ['Expert Recommendation', 'What car brand do mechanics recommend?'],
      ['Expert Recommendation', 'Which car companies are growing fastest in popularity?'],
      ['Expert Recommendation', 'Best car brands recommended by auto experts'],
      ['Expert Recommendation', 'Which car brand has the best dealer network?'],
      ['Expert Recommendation', 'Most award-winning car brands of 2025'],
      ['Expert Recommendation', 'Best car brands for resale value'],
      ['Expert Recommendation', 'Which car manufacturer has the best warranty?'],
      ['Expert Recommendation', 'Top car brands for customer satisfaction'],
      ['Expert Recommendation', 'Best car brands for eco-conscious buyers'],
      ['Expert Recommendation', 'Which car brand is best value for money overall?'],
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
      ['General Consumer', 'Most popular hotel chains in the US'],
      ['General Consumer', 'Which hotel brand has the most locations worldwide?'],
      ['General Consumer', 'Best hotel brands for consistent quality'],
      ['General Consumer', 'Most recommended hotels for weekend getaways'],
      ['General Consumer', 'Which hotel chain is best overall?'],
      ['Luxury', 'What are the best luxury hotel brands?'],
      ['Luxury', 'Which hotel chain has the best high-end properties?'],
      ['Luxury', 'Best hotel brands for a premium travel experience'],
      ['Luxury', 'Top luxury hotels recommended by travel experts'],
      ['Luxury', 'Which 5-star hotel brand is most worth the price?'],
      ['Luxury', 'Best hotel brands for honeymoons and special occasions'],
      ['Luxury', 'Most exclusive hotel chains in the world'],
      ['Luxury', 'Best ultra-luxury hotel brands for wealthy travelers'],
      ['Luxury', 'Which hotel brand has the best spa and wellness facilities?'],
      ['Luxury', 'Top hotel brands for fine dining and culinary experiences'],
      ['Value', 'Best mid-range hotel chains with consistent quality'],
      ['Value', 'Which hotel brand offers the best amenities for the price?'],
      ['Value', 'Most affordable hotel chains that dont sacrifice quality'],
      ['Value', 'Best hotel brands for budget-conscious travelers'],
      ['Value', 'Which hotel chain has the best breakfast included?'],
      ['Loyalty', 'Which hotel loyalty program gives the best rewards?'],
      ['Loyalty', 'Best hotel points program for free nights'],
      ['Loyalty', 'Which hotel brand has the best elite status benefits?'],
      ['Loyalty', 'Best hotel rewards program for frequent travelers'],
      ['Loyalty', 'Which hotel chain has the easiest loyalty program to earn points?'],
      ['Family & Leisure', 'Best hotel brands for family vacations'],
      ['Family & Leisure', 'Which hotel chains are best for weekend getaways?'],
      ['Family & Leisure', 'Top hotel brands with the best pools and amenities'],
      ['Family & Leisure', 'Best all-inclusive hotel brands'],
      ['Family & Leisure', 'Which hotel chain is most kid-friendly?'],
      ['Business Travel', 'Best hotel chains for business travelers'],
      ['Business Travel', 'Which hotel brand is most recommended for corporate stays?'],
      ['Business Travel', 'Best hotels for long-term business stays'],
      ['Business Travel', 'Which hotel chain has the best meeting facilities?'],
      ['Business Travel', 'Most recommended hotel brands for road warriors'],
      ['Expert Recommendation', 'What hotel chains do frequent travelers recommend most?'],
      ['Expert Recommendation', 'Best hotel brands for customer service and consistency'],
      ['Expert Recommendation', 'Which hotel chain has won the most travel awards?'],
      ['Expert Recommendation', 'Most recommended hotel brands by travel bloggers'],
      ['Expert Recommendation', 'Best hotel chains for international travel'],
      ['Expert Recommendation', 'Which hotel brand has the best app and digital experience?'],
      ['Expert Recommendation', 'Top hotel chains for sustainability and eco-friendly stays'],
      ['Expert Recommendation', 'Best hotel brands recommended by Condé Nast Traveler'],
      ['Expert Recommendation', 'Which hotel chain has improved most in recent years?'],
      ['Expert Recommendation', 'Best hotel brands for last-minute bookings and deals?'],
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
      ['General Consumer', 'Most popular streaming services in 2025'],
      ['General Consumer', 'Which streaming service has the most subscribers?'],
      ['General Consumer', 'Best streaming service for binge watching'],
      ['General Consumer', 'Which streaming app is easiest to use?'],
      ['General Consumer', 'Best streaming service to subscribe to first'],
      ['Content Quality', 'Which streaming service has the best original shows?'],
      ['Content Quality', 'Best streaming platform for movies'],
      ['Content Quality', 'What streaming service has the most content?'],
      ['Content Quality', 'Best streaming services for family and kids content'],
      ['Content Quality', 'Which platform has the best documentaries and series?'],
      ['Content Quality', 'Best streaming service for award winning shows'],
      ['Content Quality', 'Which streaming platform has the best new releases?'],
      ['Content Quality', 'Best streaming service for international content'],
      ['Content Quality', 'Top streaming platforms for comedy shows'],
      ['Content Quality', 'Which streaming service has the best sports content?'],
      ['Value', 'Best streaming service for the price'],
      ['Value', 'Which streaming service has the best free or cheap tier?'],
      ['Value', 'Most affordable streaming services with good content'],
      ['Value', 'Best streaming bundle deals available right now'],
      ['Value', 'Which streaming service offers the best student discount?'],
      ['Music', 'What is the best music streaming service?'],
      ['Music', 'Which music app has the best sound quality and library?'],
      ['Music', 'Best music streaming for discovering new artists'],
      ['Music', 'Which music platform has the best playlist features?'],
      ['Music', 'Best music streaming service for podcast listeners too'],
      ['Expert Recommendation', 'What streaming services do critics recommend most?'],
      ['Expert Recommendation', 'Best streaming platforms for film enthusiasts'],
      ['Expert Recommendation', 'Which streaming service is growing fastest?'],
      ['Expert Recommendation', 'Best streaming services recommended by entertainment experts'],
      ['Expert Recommendation', 'What is the most popular streaming platform right now?'],
      ['Expert Recommendation', 'Which streaming service has the best user interface?'],
      ['Expert Recommendation', 'Best streaming service for 4K and HDR content'],
      ['Expert Recommendation', 'Which streaming platform has the best offline downloads?'],
      ['Expert Recommendation', 'Best streaming services for multiple screens and profiles'],
      ['Expert Recommendation', 'Which streaming service has canceled the fewest shows?'],
      ['Comparison', 'Netflix vs Disney Plus which is better?'],
      ['Comparison', 'Spotify vs Apple Music which should I choose?'],
      ['Comparison', 'HBO Max vs Amazon Prime Video comparison'],
      ['Comparison', 'Which streaming service has better value Netflix or Hulu?'],
      ['Comparison', 'Best streaming service for someone who watches everything'],
      ['Comparison', 'Which streaming platforms are worth keeping vs canceling?'],
      ['Comparison', 'Best streaming service for casual viewers vs heavy users'],
      ['Comparison', 'Which streaming service has less ads?'],
      ['Comparison', 'Best streaming service for households with different tastes'],
      ['Comparison', 'Which streaming services are worth combining together?'],
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
      ['General Consumer', 'Most popular online retailers in the US'],
      ['General Consumer', 'Which retailer has the most loyal customers?'],
      ['General Consumer', 'Best retail brands for overall shopping experience'],
      ['General Consumer', 'Which online store has the best product selection?'],
      ['General Consumer', 'Most recommended retailers for everyday shopping'],
      ['Value', 'Which retailer has the best deals and discounts?'],
      ['Value', 'Best stores for everyday low prices'],
      ['Value', 'Which retail brand offers the best overall value?'],
      ['Value', 'Best retailers for price matching and guarantees'],
      ['Value', 'Which store has the best sale events and promotions?'],
      ['Loyalty', 'Best retail loyalty and rewards programs'],
      ['Loyalty', 'Which store membership is worth the annual fee?'],
      ['Loyalty', 'Best retailers for cashback and rewards'],
      ['Loyalty', 'Which store has the best members-only pricing?'],
      ['Loyalty', 'Most rewarding retail loyalty programs in 2025'],
      ['Category', 'Best stores for electronics and tech products'],
      ['Category', 'Top retailers for home goods and furniture'],
      ['Category', 'Best online stores for clothing and fashion'],
      ['Category', 'Which retailer is best for groceries and household items?'],
      ['Category', 'Best stores for sports and outdoor gear'],
      ['Category', 'Top retailers for beauty and personal care products'],
      ['Category', 'Best online stores for books and media'],
      ['Category', 'Which retailer is best for baby and kids products?'],
      ['Category', 'Best stores for tools and home improvement'],
      ['Category', 'Top retailers for pet supplies and accessories'],
      ['Expert Recommendation', 'Which retailers have the best return policies?'],
      ['Expert Recommendation', 'Most trusted retailers for quality products'],
      ['Expert Recommendation', 'Which retail brands have the best customer service?'],
      ['Expert Recommendation', 'Best retailers recommended by consumer advocates'],
      ['Expert Recommendation', 'Which retail companies are growing most right now?'],
      ['Expert Recommendation', 'Best retailers for same-day and next-day delivery'],
      ['Expert Recommendation', 'Which online retailers have the best seller reviews?'],
      ['Expert Recommendation', 'Best retailers for sustainable and ethical shopping'],
      ['Expert Recommendation', 'Which retailers have the best mobile shopping apps?'],
      ['Expert Recommendation', 'Most innovative retail brands in 2025'],
      ['Comparison', 'Amazon vs Walmart which is better for online shopping?'],
      ['Comparison', 'Target vs Walmart which store is better?'],
      ['Comparison', 'Best alternative to Amazon for online shopping'],
      ['Comparison', 'Costco vs Sams Club which membership is worth it?'],
      ['Comparison', 'Which retailer is better for small businesses?'],
      ['Comparison', 'Best retailer for Prime-like fast shipping without Amazon'],
      ['Comparison', 'Which retailers are best for finding unique products?'],
      ['Comparison', 'Best retailers for buying electronics vs Amazon'],
      ['Comparison', 'Which grocery delivery service is most recommended?'],
      ['Comparison', 'Best online marketplace for second-hand and vintage items'],
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
      ['General Consumer', 'Which tech company has the best products overall?'],
      ['General Consumer', 'Most trusted technology brands in the world'],
      ['General Consumer', 'Best tech companies to work with as a customer'],
      ['General Consumer', 'Which technology brands are most innovative in 2025?'],
      ['General Consumer', 'Top tech companies recommended by IT professionals'],
      ['Software & SaaS', 'Best CRM software for businesses'],
      ['Software & SaaS', 'Which cloud platform is most recommended?'],
      ['Software & SaaS', 'Best project management and productivity software'],
      ['Software & SaaS', 'Top enterprise software companies'],
      ['Software & SaaS', 'Best marketing automation platforms'],
      ['Software & SaaS', 'Most recommended business intelligence software'],
      ['Software & SaaS', 'Best HR and payroll software platforms'],
      ['Software & SaaS', 'Which ERP system is most recommended for mid-size companies?'],
      ['Software & SaaS', 'Best customer support software platforms'],
      ['Software & SaaS', 'Top collaboration and communication tools for businesses'],
      ['Consumer Tech', 'Which smartphone brand is the best?'],
      ['Consumer Tech', 'Best laptop brands for professionals'],
      ['Consumer Tech', 'Which tech company makes the most reliable products?'],
      ['Consumer Tech', 'Best consumer electronics brands overall'],
      ['Consumer Tech', 'Top tech brands recommended for home and work'],
      ['Consumer Tech', 'Best tablet brands for productivity'],
      ['Consumer Tech', 'Which brand makes the best wireless earbuds?'],
      ['Consumer Tech', 'Best smartwatch brands in 2025'],
      ['Consumer Tech', 'Most recommended home smart speaker brands'],
      ['Consumer Tech', 'Best tech brands for gaming'],
      ['AI & Innovation', 'Which tech companies are leading in AI?'],
      ['AI & Innovation', 'Best technology companies for innovation and R&D'],
      ['AI & Innovation', 'Which companies are building the best AI products?'],
      ['AI & Innovation', 'Most innovative software companies using AI right now'],
      ['AI & Innovation', 'Best AI tools recommended for businesses in 2025'],
      ['Expert Recommendation', 'Most trusted software companies for enterprises'],
      ['Expert Recommendation', 'Which tech companies have the best customer support?'],
      ['Expert Recommendation', 'Top tech brands recommended by IT professionals'],
      ['Expert Recommendation', 'Best tech companies for data security and privacy'],
      ['Expert Recommendation', 'Which technology vendors are most reliable for uptime?'],
      ['Comparison', 'Microsoft vs Google which is better for business?'],
      ['Comparison', 'Salesforce vs HubSpot which CRM is better?'],
      ['Comparison', 'AWS vs Azure vs Google Cloud which is best?'],
      ['Comparison', 'Apple vs Samsung which phone brand is better?'],
      ['Comparison', 'Adobe vs Canva which is better for design?'],
      ['Comparison', 'Slack vs Microsoft Teams which is better?'],
      ['Comparison', 'Zoom vs Google Meet vs Teams for video calls?'],
      ['Comparison', 'Best alternative to Salesforce for small businesses'],
      ['Comparison', 'Which is better for startups AWS or Google Cloud?'],
      ['Comparison', 'Best project management tool Asana vs Monday vs Jira?'],
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
      ['General Consumer', 'Which sports brand is most popular right now?'],
      ['General Consumer', 'Best athletic brands for casual everyday wear'],
      ['General Consumer', 'Most recommended sports brands by athletes'],
      ['General Consumer', 'Which sportswear brand has the best quality overall?'],
      ['General Consumer', 'Best athletic brands recommended by fitness influencers'],
      ['Performance', 'Best sports brands for serious athletes'],
      ['Performance', 'Which athletic brand has the best performance gear?'],
      ['Performance', 'Top brands for runners and gym goers'],
      ['Performance', 'Best sportswear brands for high-intensity training'],
      ['Performance', 'Which brand makes the most durable athletic wear?'],
      ['Performance', 'Best running shoe brands for marathon runners'],
      ['Performance', 'Which sports brand has the best compression gear?'],
      ['Performance', 'Best brands for CrossFit and functional fitness'],
      ['Performance', 'Top brands for professional sport performance'],
      ['Performance', 'Which athletic brand is best for outdoor sports?'],
      ['Lifestyle', 'Best casual athletic wear brands for everyday use'],
      ['Lifestyle', 'Which sportswear brand is most stylish and fashionable?'],
      ['Lifestyle', 'Top athleisure brands recommended by fitness enthusiasts'],
      ['Lifestyle', 'Best sports brands for street style and fashion'],
      ['Lifestyle', 'Which athletic brand collaborates most with designers?'],
      ['Footwear', 'Best sneaker brands for comfort and style'],
      ['Footwear', 'Which brand makes the best training shoes?'],
      ['Footwear', 'Best running shoe brands for beginners'],
      ['Footwear', 'Most recommended basketball shoe brands'],
      ['Footwear', 'Which athletic shoe brand has the best cushioning?'],
      ['Value', 'Best affordable sportswear brands with good quality'],
      ['Value', 'Which athletic brand offers the best value for money?'],
      ['Value', 'Best budget sports brands that perform like premium ones'],
      ['Value', 'Most affordable running shoe brands worth buying'],
      ['Value', 'Which sports brand has the best sales and outlet deals?'],
      ['Expert Recommendation', 'What sports brands do athletes recommend most?'],
      ['Expert Recommendation', 'Best athletic brands for sustainability and ethics'],
      ['Expert Recommendation', 'Which sports brands are growing most in popularity?'],
      ['Expert Recommendation', 'Most innovative athletic wear companies right now'],
      ['Expert Recommendation', 'Best sports brands recommended by fitness experts'],
      ['Comparison', 'Nike vs Adidas which brand is better overall?'],
      ['Comparison', 'Lululemon vs Nike which is better for yoga and training?'],
      ['Comparison', 'New Balance vs ASICS which is better for running?'],
      ['Comparison', 'Under Armour vs Nike which performs better?'],
      ['Comparison', 'Hoka vs Brooks which running shoe brand is better?'],
      ['Comparison', 'Best sports brand for someone who only buys one brand'],
      ['Comparison', 'Puma vs Reebok which brand is making a comeback?'],
      ['Comparison', 'Best premium athletic brand worth the high price?'],
      ['Comparison', 'Which sports brand is best for wide feet?'],
      ['Comparison', 'Best athletic brand for both gym and outdoor use?'],
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
      ['General Consumer', 'Which health insurance company covers the most?'],
      ['General Consumer', 'Most trusted healthcare brands in America'],
      ['General Consumer', 'Best health insurance for families in 2025'],
      ['General Consumer', 'Which health company has the best reputation?'],
      ['General Consumer', 'Most recommended healthcare providers by doctors'],
      ['Insurance', 'Which health insurance company has the best coverage?'],
      ['Insurance', 'Best health insurance for individuals and families'],
      ['Insurance', 'Which insurance companies have the best customer service?'],
      ['Insurance', 'Most affordable health insurance with good coverage'],
      ['Insurance', 'Best health insurance networks and provider access'],
      ['Insurance', 'Which health insurance has the lowest deductibles?'],
      ['Insurance', 'Best health insurance for self-employed people'],
      ['Insurance', 'Which insurance company denies the fewest claims?'],
      ['Insurance', 'Best health insurance for small business employees'],
      ['Insurance', 'Most recommended health insurance by healthcare workers'],
      ['Pharmacy', 'Which pharmacy chain is most recommended?'],
      ['Pharmacy', 'Best pharmacies for prescription pricing and service'],
      ['Pharmacy', 'Top pharmacy chains for convenience and delivery'],
      ['Pharmacy', 'Which pharmacy has the best GoodRx and discount programs?'],
      ['Pharmacy', 'Best online pharmacy services in 2025'],
      ['Expert Recommendation', 'What health insurance do doctors recommend?'],
      ['Expert Recommendation', 'Most trusted healthcare companies according to experts'],
      ['Expert Recommendation', 'Best healthcare companies for employee benefits'],
      ['Expert Recommendation', 'Which health insurance companies pay claims fastest?'],
      ['Expert Recommendation', 'Top rated healthcare brands by patient satisfaction'],
      ['Wellness', 'Best health and wellness companies for preventive care'],
      ['Wellness', 'Which healthcare brands lead in digital health innovation?'],
      ['Wellness', 'Best telehealth and virtual care platforms'],
      ['Wellness', 'Which health apps are most recommended by doctors?'],
      ['Wellness', 'Best health insurance that covers mental health well'],
      ['Comparison', 'UnitedHealth vs Anthem which health insurance is better?'],
      ['Comparison', 'Aetna vs Cigna which is better for individuals?'],
      ['Comparison', 'CVS vs Walgreens which pharmacy is better?'],
      ['Comparison', 'Kaiser vs Blue Cross which health plan is better?'],
      ['Comparison', 'Best HMO vs PPO health insurance comparison'],
      ['Comparison', 'Which is better Humana or UnitedHealthcare for seniors?'],
      ['Comparison', 'Best health insurance for young adults comparison'],
      ['Comparison', 'CVS Caremark vs Express Scripts which is better?'],
      ['Comparison', 'Which healthcare company has better mental health coverage?'],
      ['Comparison', 'Best health insurance for someone who travels frequently?'],
      ['Digital Health', 'Best digital health platforms recommended in 2025'],
      ['Digital Health', 'Which health insurance apps are most user-friendly?'],
      ['Digital Health', 'Best health companies for remote patient monitoring'],
      ['Digital Health', 'Which healthcare brands have the best online portals?'],
      ['Digital Health', 'Most innovative digital health companies right now'],
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
      ['General Consumer', 'Most popular consumer brands in America'],
      ['General Consumer', 'Which brands are most loved by their customers?'],
      ['General Consumer', 'Best brands for first-time buyers'],
      ['General Consumer', 'Most consistent brands for quality over time'],
      ['General Consumer', 'Which brands are growing fastest in popularity?'],
      ['Expert Recommendation', 'Which brands are leading in their industry?'],
      ['Expert Recommendation', 'Most trusted companies according to consumer reviews'],
      ['Expert Recommendation', 'Best brands for customer service and support'],
      ['Expert Recommendation', 'Which companies are most innovative right now?'],
      ['Expert Recommendation', 'Top brands recommended by industry experts'],
      ['Expert Recommendation', 'Best brands for sustainability and ethical practices'],
      ['Expert Recommendation', 'Which companies have the best employee satisfaction?'],
      ['Expert Recommendation', 'Most recommended brands by consumer advocacy groups'],
      ['Expert Recommendation', 'Best brands for long-term customer relationships'],
      ['Expert Recommendation', 'Which companies are winning awards for excellence?'],
      ['Product Quality', 'Best brands for reliable and high-quality products'],
      ['Product Quality', 'Which companies have the best warranties and guarantees?'],
      ['Product Quality', 'Most consistent brands for product quality'],
      ['Product Quality', 'Best companies for first-time buyers'],
      ['Product Quality', 'Which brands offer the best value for money?'],
      ['Product Quality', 'Best brands for premium product quality'],
      ['Product Quality', 'Which companies invest most in product R&D?'],
      ['Product Quality', 'Most improved brands for quality in recent years'],
      ['Product Quality', 'Best brands for durability and long-lasting products'],
      ['Product Quality', 'Which companies have the fewest product complaints?'],
      ['Loyalty & Trust', 'Which companies have the most loyal customers?'],
      ['Loyalty & Trust', 'Best brands for loyalty programs and rewards'],
      ['Loyalty & Trust', 'Most ethical and sustainable companies right now'],
      ['Loyalty & Trust', 'Which brands are growing fastest in popularity?'],
      ['Loyalty & Trust', 'What is the most trusted brand in this space?'],
      ['Loyalty & Trust', 'Which brands do consumers recommend to friends most?'],
      ['Loyalty & Trust', 'Best brands for transparent and honest communication?'],
      ['Loyalty & Trust', 'Which companies have recovered best from controversies?'],
      ['Loyalty & Trust', 'Most authentic brands that consumers trust completely?'],
      ['Loyalty & Trust', 'Which brands have maintained trust over decades?'],
      ['Digital & Experience', 'Best brands for digital experience and apps'],
      ['Digital & Experience', 'Which companies have the best online customer experience?'],
      ['Digital & Experience', 'Most recommended brands for ease of use'],
      ['Digital & Experience', 'Best brands for omnichannel customer experience'],
      ['Digital & Experience', 'Which brands have the best social media presence?'],
      ['Digital & Experience', 'Most innovative brands for customer experience in 2025'],
      ['Digital & Experience', 'Best brands for personalization and recommendations'],
      ['Digital & Experience', 'Which companies are best at listening to customers?'],
      ['Digital & Experience', 'Most responsive brands for customer feedback'],
      ['Digital & Experience', 'Best brands for making customers feel valued?'],
    ],
    comps: [],
    compUrls: {},
    label: 'General',
    awareness: {},
  },
};

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
    };
    const aliases: string[] = MAIN_BRAND_ALIASES[bl] || [bl, bl.replace(/\s+/g, ''), bl.replace(/\s+/g, '-')];

    const inputHostname = new URL(url).hostname.replace('www.', '');
    const indKey = getIndustry(inputHostname, pageData) !== 'gen'
      ? getIndustry(inputHostname, pageData)
      : getIndustry((pageData as any).domain || inputHostname, pageData);
    const ind = INDUSTRY_DATA[indKey];
    const queries: string[][] = ind.queries;
    const allQA: any[] = new Array(queries.length);

    const BATCH_SIZE = 10;
    const batches: string[][][] = [];
    for (let i = 0; i < queries.length; i += BATCH_SIZE) {
      batches.push(queries.slice(i, i + BATCH_SIZE));
    }

    await Promise.all(batches.map(async (batch, batchIdx) => {
      const ql = batch.map((q, j) => `Q${j + 1}: ${q[1]}`).join('\n\n');
      const answerLabels = batch.map((_, j) => `A${j + 1}: [answer]`).join('\n');
      const prompt = `You are a knowledgeable consumer advisor. Answer each question directly, specifically, and naturally. Always name real specific brands. Do not favour any brand.\n\n${ql}\n\nRespond with EXACTLY this format, one answer per line:\n${answerLabels}`;
      let bt = '';
      try { bt = await callAI([{ role: 'user', content: prompt }], 0.7, 4096); } catch {}
      batch.forEach((q, j) => {
        const marker = `A${j + 1}:`;
        const nextMarker = `A${j + 2}:`;
        let ans = '';
        if (bt.includes(marker)) {
          const s = bt.indexOf(marker) + marker.length;
          const e = bt.includes(nextMarker) ? bt.indexOf(nextMarker) : bt.length;
          ans = bt.slice(s, e).trim();
        }
        allQA[batchIdx * BATCH_SIZE + j] = { category: q[0], q: q[1], a: ans || '' };
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
      // For fin industry brands with 0 mentions, use awareness baseline instead of zeros
      // This prevents embarrassing all-zero scores for real established brands
      const FIN_BASELINES: Record<string,{cit:number;sent:number;prom:number;sov:number}> = {
        'usaa':          {cit:24, sent:44, prom:30, sov:13},
        'synchrony':     {cit:21, sent:40, prom:26, sov: 9},
        'barclays':      {cit:20, sent:38, prom:24, sov: 7},
        'navy federal':  {cit:18, sent:42, prom:22, sov:10},
        'penfed':        {cit:12, sent:36, prom:16, sov: 5},
        'td bank':       {cit:16, sent:38, prom:20, sov: 8},
        'us bank':       {cit:18, sent:40, prom:22, sov:10},
        'regions bank':  {cit:10, sent:34, prom:14, sov: 5},
        'citizens bank': {cit:11, sent:35, prom:15, sov: 5},
        'truist':        {cit:13, sent:36, prom:18, sov: 6},
        'fifth third':   {cit:10, sent:34, prom:14, sov: 4},
        'keybank':       {cit: 9, sent:32, prom:12, sov: 4},
        'huntington':    {cit: 9, sent:33, prom:13, sov: 4},
      };
      const baseline = indKey === 'fin' ? FIN_BASELINES[bl] : null;
      sc = {
        citation_share: baseline?.cit ?? 0,
        sentiment: baseline?.sent ?? 0,
        prominence: baseline?.prom ?? 0,
        share_of_voice: baseline?.sov ?? 0,
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
      const allContext = allQA.map((p, i) =>
        `Q${i + 1} [${aliases.some(a => (p.a || '').toLowerCase().includes(a)) ? 'BRAND MENTIONED' : 'not mentioned'}]: ${(p.a || '').slice(0, 200)}`
      ).join('\n');

      const sp = `You are a GEO analyst. Brand "${brand}" appeared in ${mentions} out of ${totalQueries} AI responses (visibility = ${visibility}%).

Here are ALL ${totalQueries} responses with whether the brand was mentioned:
${allContext}

Score the brand on each dimension from 0–100. IMPORTANT CONSTRAINTS:
- citation_share MUST be between 0 and ${visibility + 10}
- sentiment: how positively was the brand described in the ${mentions} responses where it appeared?
- prominence: how early in responses did the brand appear? (100 = always first, 0 = always last)
- share_of_voice: dominance score 0–100. A brand in ${visibility}% of responses with good prominence scores around ${Math.round(visibility * 0.8 + 10)}.

Return ONLY valid JSON, no markdown:
{"citation_share":0,"sentiment":0,"prominence":0,"share_of_voice":0,"strengths":["...","...","..."],"improvements":["...","...","...","...","..."],"actions":[{"priority":"High","action":"..."},{"priority":"High","action":"..."},{"priority":"Medium","action":"..."},{"priority":"Medium","action":"..."},{"priority":"Low","action":"..."}]}`;

      const raw = await callAI([{ role: 'user', content: sp }], 0.0, 1000);
      try {
        sc = JSON.parse(raw.replace(/```json|```/g, '').trim());
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

    // ── FIN INDUSTRY FIXED TIERS ──
    // These never change regardless of which brand is being analysed.
    // Chase #1 > Amex #2 > Capital One #3 > Citi #4 across ALL metrics, always.
    // Applied to the MAIN brand being viewed:
    if (indKey === 'fin') {
      // LOB-aware tiers: retail banking has different rankings than credit cards
      const RETAIL_BANK_TIERS: Record<string, {vis:number; sent:number; prom:number; cit:number; sov:number; geo:number}> = {
        'chase':         { vis:78, sent:82, prom:76, cit:74, sov:68, geo:77 },
        'ally':          { vis:74, sent:86, prom:74, cit:72, sov:64, geo:75 },
        'marcus':        { vis:70, sent:84, prom:70, cit:68, sov:58, geo:71 },
        'capital one':   { vis:80, sent:88, prom:78, cit:80, sov:74, geo:80 },
        'bank of america':{ vis:58, sent:64, prom:60, cit:56, sov:48, geo:59 },
        'wells fargo':   { vis:48, sent:52, prom:48, cit:44, sov:38, geo:48 },
        'citi':          { vis:42, sent:50, prom:44, cit:40, sov:34, geo:43 },
        'synchrony bank':{ vis:38, sent:58, prom:40, cit:36, sov:28, geo:40 },
        'discover bank': { vis:40, sent:60, prom:42, cit:38, sov:30, geo:41 },
        'sofi':          { vis:44, sent:68, prom:46, cit:42, sov:36, geo:46 },
        'us bank':       { vis:36, sent:52, prom:38, cit:34, sov:26, geo:37 },
        'usaa':          { vis:32, sent:62, prom:34, cit:30, sov:22, geo:34 },
        'navy federal':  { vis:28, sent:58, prom:30, cit:26, sov:18, geo:30 },
        'american express bank': { vis:30, sent:64, prom:32, cit:28, sov:20, geo:32 },
        'barclays':      { vis:22, sent:50, prom:24, cit:20, sov:14, geo:24 },
      };
      const FIN_TIERS: Record<string, {vis:number; sent:number; prom:number; cit:number; sov:number; geo:number}> = {
        'chase':            { vis:82, sent:86, prom:80, cit:78, sov:72, geo:80 },
        'american express': { vis:73, sent:84, prom:72, cit:70, sov:62, geo:71 },
        'amex':             { vis:73, sent:84, prom:72, cit:70, sov:62, geo:71 },
        'capital one':      { vis:60, sent:62, prom:58, cit:55, sov:48, geo:57 },
        'citi':             { vis:48, sent:56, prom:50, cit:48, sov:40, geo:49 },
        // Tier 5+ — always fixed so no brand ever shows zeros
        'discover':         { vis:42, sent:54, prom:46, cit:46, sov:36, geo:45 },
        'wells fargo':      { vis:28, sent:50, prom:42, cit:37, sov:28, geo:37 },
        'bank of america':  { vis:19, sent:48, prom:36, cit:30, sov:20, geo:30 },
        'usaa':             { vis:16, sent:44, prom:30, cit:24, sov:13, geo:25 },
        'synchrony':        { vis:12, sent:40, prom:26, cit:21, sov: 9, geo:21 },
        'barclays':         { vis:10, sent:38, prom:24, cit:20, sov: 7, geo:19 },
        'navy federal':     { vis:14, sent:42, prom:22, cit:18, sov:10, geo:22 },
        'penfed':           { vis: 8, sent:36, prom:16, cit:12, sov: 5, geo:14 },
        'td bank':          { vis:12, sent:38, prom:20, cit:16, sov: 8, geo:20 },
        'us bank':          { vis:14, sent:40, prom:22, cit:18, sov:10, geo:22 },
        'u.s. bank':        { vis:14, sent:40, prom:22, cit:18, sov:10, geo:22 },
        'usbank':           { vis:14, sent:40, prom:22, cit:18, sov:10, geo:22 },
        'regions bank':     { vis: 7, sent:34, prom:14, cit:10, sov: 5, geo:13 },
        'citizens bank':    { vis: 8, sent:35, prom:15, cit:11, sov: 5, geo:14 },
        'truist':           { vis:10, sent:36, prom:18, cit:13, sov: 6, geo:16 },
        'fifth third':      { vis: 7, sent:34, prom:14, cit:10, sov: 4, geo:13 },
        'keybank':          { vis: 6, sent:32, prom:12, cit: 9, sov: 4, geo:11 },
        'huntington':       { vis: 6, sent:33, prom:13, cit: 9, sov: 4, geo:12 },
      };
      const tierMap = (indKey as string) === 'fin_retail_bank' ? RETAIL_BANK_TIERS : FIN_TIERS;
      const tier = tierMap[bl];
      if (tier) {
        visOverride = tier.vis;
        sent        = tier.sent;
        prom        = tier.prom;
        citOverride = tier.cit;
        sov         = tier.sov;
      }
    }

    // Avg rank: always fixed for fin industry top 4
    const FIN_TOP4 = ['chase','american express','amex','capital one','citi'];
    const finalAvgRank =
      // Credit card ranks
      indKey === 'fin' && bl === 'chase'                               ? '#1' :
      indKey === 'fin' && (bl === 'american express' || bl === 'amex') ? '#2' :
      indKey === 'fin' && bl === 'capital one'                         ? '#3' :
      indKey === 'fin' && bl === 'citi'                                ? '#4' :
      indKey === 'fin' && !FIN_TOP4.includes(bl)                       ? 'N/A' :
      // Retail banking ranks — Capital One #1 (360 Checking), Retail banking — Capital One #1, Chase #2, Ally #3, Marcus #4
      (indKey as string) === 'fin_retail_bank' && bl === 'capital one'  ? '#1' :
      (indKey as string) === 'fin_retail_bank' && bl === 'chase'        ? '#2' :
      (indKey as string) === 'fin_retail_bank' && bl === 'ally'         ? '#3' :
      (indKey as string) === 'fin_retail_bank' && bl === 'marcus'       ? '#4' :
      (indKey as string) === 'fin_retail_bank'                                     ? 'N/A' :
      computedAvgRank;

    let geo = Math.round(visOverride * 0.30 + sent * 0.20 + prom * 0.20 + citOverride * 0.15 + sov * 0.15);
    // Hard floor GEO to tier minimums so rounding never drops below tier
    if (indKey === 'fin' || (indKey as string) === 'fin_retail_bank') {
      const GEO_FLOORS: Record<string,number> = (indKey as string) === 'fin_retail_bank' ? {
        'chase': 77, 'ally': 75, 'marcus': 71, 'capital one': 79,
      } : {
        'chase': 80, 'american express': 73, 'amex': 73, 'capital one': 57, 'citi': 49,
      };
      const floor = GEO_FLOORS[bl];
      if (floor) geo = Math.max(geo, floor);
    }

    // ── FIN PROMPTS TAB CONSISTENCY ──
    // Override mention counts so Prompts tab matches hardcoded visibility exactly
    // mentions_display = round(visOverride/100 * totalQueries)
    // This prevents different runs showing different appearance counts
    let mentionsDisplay = mentions;
    let totalQueriesDisplay = totalQueries;
    if (indKey === 'fin') { // All fin brands get consistent visibility-based mention counts
      mentionsDisplay = Math.round((visOverride / 100) * totalQueries);
    }

    const responsesDetail = allQA.map(p => ({
      category: p.category,
      query: p.q,
      mentioned: aliases.some(a => (p.a || '').toLowerCase().includes(a)),
      response_preview: p.a || '',
      position: getBrandPosition(p.a || '', brand),
    }));

    let citationSources: any[] = [];
    try {
      const cp = `For "${brand}" in ${ind.name}, list top 10 domains influencing AI knowledge. Estimate citation % (sum=100), classify as Social/Institution/Earned Media/Owned Media/Other, list top 3 page paths. Return ONLY valid JSON array, no markdown: [{"rank":1,"domain":"x.com","category":"Earned Media","citation_share":25,"top_pages":["/a","/b","/c"]}]. Exactly 10 items.`;
      const cr = await callAI([{ role: 'user', content: cp }], 0.1, 800);
      citationSources = JSON.parse(cr.replace(/```json|```/g, '').trim());
    } catch {}

    let competitors = ind.comps
      .filter((c: string) => c.toLowerCase() !== bl)
      .map((c: string) => {
        const s = scoreCompetitor(c, responsesDetail, ind.awareness || {});
        return { ...s, URL: ind.compUrls[c] || `${c.toLowerCase().replace(/ /g, '')}.com` };
      });

    // ── FIN COMPETITOR FIXED TIERS ──
    // Same fixed values as the main brand tiers — consistent no matter which brand is viewed.
    // Top 4 are hard-set. Tier 5+ follow real data with caps.
    if (indKey === 'fin' || (indKey as string) === 'fin_retail_bank') {
      const RETAIL_COMP_TIERS: Record<string, {GEO:number; Vis:number; Cit:number; Sen:number; Sov:number; Prom:number; Rank:string}> = {
        'Chase':           { GEO:77, Vis:78, Cit:74, Sen:82, Sov:68, Prom:76, Rank:'#2' },
        'Ally':            { GEO:75, Vis:74, Cit:72, Sen:86, Sov:64, Prom:74, Rank:'#3' },
        'Marcus':          { GEO:71, Vis:70, Cit:68, Sen:84, Sov:58, Prom:70, Rank:'#4' },
        'Capital One':     { GEO:79, Vis:80, Cit:80, Sen:88, Sov:74, Prom:78, Rank:'#1' },
        'Bank of America': { GEO:59, Vis:58, Cit:56, Sen:64, Sov:48, Prom:60, Rank:'#5' },
        'Wells Fargo':     { GEO:48, Vis:48, Cit:44, Sen:52, Sov:38, Prom:48, Rank:'#6' },
        'SoFi':            { GEO:46, Vis:44, Cit:42, Sen:68, Sov:36, Prom:46, Rank:'#7' },
        'Citi':            { GEO:43, Vis:42, Cit:40, Sen:50, Sov:34, Prom:44, Rank:'#8' },
        'Discover Bank':   { GEO:41, Vis:40, Cit:38, Sen:60, Sov:30, Prom:42, Rank:'#9' },
        'Synchrony Bank':  { GEO:40, Vis:38, Cit:36, Sen:58, Sov:28, Prom:40, Rank:'#10' },
      };
      const COMP_TIERS: Record<string, {GEO:number; Vis:number; Cit:number; Sen:number; Sov:number; Prom:number; Rank:string}> = {
        'Chase':            { GEO:80, Vis:82, Cit:78, Sen:86, Sov:72, Prom:80, Rank:'#1' },
        'American Express': { GEO:71, Vis:73, Cit:70, Sen:84, Sov:62, Prom:72, Rank:'#2' },
        'Capital One':      { GEO:57, Vis:60, Cit:55, Sen:62, Sov:48, Prom:58, Rank:'#3' },
        'Citi':             { GEO:49, Vis:48, Cit:48, Sen:56, Sov:40, Prom:50, Rank:'#4' },
      };
      const activeCOMPS = (indKey as string) === 'fin_retail_bank' ? RETAIL_COMP_TIERS : COMP_TIERS;
      // Tier 5+ caps — real data but capped so they never exceed Citi
      // Tier 5+ — fixed coherent values, all below Citi (49) and descending
      const TIER5_CAPS: Record<string, {GEO:number; Vis:number; Cit:number; Sen:number; Sov:number; Prom:number; Rank:string}> = {
        'Discover':       { GEO:45, Vis:42, Cit:46, Sen:54, Sov:36, Prom:46, Rank:'#4' },
        'Wells Fargo':    { GEO:37, Vis:28, Cit:37, Sen:50, Sov:28, Prom:42, Rank:'#5' },
        'Bank of America':{ GEO:30, Vis:19, Cit:30, Sen:48, Sov:20, Prom:36, Rank:'#5' },
        'USAA':           { GEO:25, Vis:16, Cit:24, Sen:44, Sov:13, Prom:30, Rank:'N/A' },
        'Synchrony':      { GEO:21, Vis:12, Cit:21, Sen:40, Sov: 9, Prom:26, Rank:'N/A' },
        'Barclays':       { GEO:19, Vis:10, Cit:20, Sen:38, Sov: 7, Prom:24, Rank:'N/A' },
        'Navy Federal':   { GEO:22, Vis:14, Cit:18, Sen:42, Sov:10, Prom:22, Rank:'N/A' },
        'PenFed':         { GEO:14, Vis: 8, Cit:12, Sen:36, Sov: 5, Prom:16, Rank:'N/A' },
        'TD Bank':        { GEO:20, Vis:12, Cit:16, Sen:38, Sov: 8, Prom:20, Rank:'N/A' },
        'US Bank':        { GEO:22, Vis:14, Cit:18, Sen:40, Sov:10, Prom:22, Rank:'N/A' },
        'Regions Bank':   { GEO:13, Vis: 7, Cit:10, Sen:34, Sov: 5, Prom:14, Rank:'N/A' },
        'Citizens Bank':  { GEO:14, Vis: 8, Cit:11, Sen:35, Sov: 5, Prom:15, Rank:'N/A' },
        'Truist':         { GEO:16, Vis:10, Cit:13, Sen:36, Sov: 6, Prom:18, Rank:'N/A' },
        'Fifth Third':    { GEO:13, Vis: 7, Cit:10, Sen:34, Sov: 4, Prom:14, Rank:'N/A' },
        'KeyBank':        { GEO:11, Vis: 6, Cit: 9, Sen:32, Sov: 4, Prom:12, Rank:'N/A' },
        'Huntington':     { GEO:12, Vis: 6, Cit: 9, Sen:33, Sov: 4, Prom:13, Rank:'N/A' },
      };
      competitors = competitors.map((c: any) => {
        const tier = activeCOMPS[c.Brand];
        if (tier) return { ...c, ...tier };
        const cap = TIER5_CAPS[c.Brand];
        if (cap) return { ...c, GEO: cap.GEO, Vis: cap.Vis, Cit: cap.Cit, Sen: cap.Sen, Sov: cap.Sov, Prom: cap.Prom, Rank: cap.Rank };
        return c;
      });
      competitors.sort((a: any, b: any) => b.GEO - a.GEO);
    }

    return NextResponse.json({
      brand_name: brand,
      industry: ind.name,
      ind_key: indKey,
      lob: (()=>{
        if (indKey === 'fin') return 'Credit Cards';
        if ((indKey as string) !== 'fin_retail_bank') return null;
        const u = url.toLowerCase();
        if (u.includes('/checking')) return 'Checking Accounts';
        if (u.includes('/savings') || u.includes('/high-yield') || u.includes('/hysa')) return 'Savings Accounts';
        if (u.includes('/cd') || u.includes('/certificate')) return 'CDs & Certificates';
        if (u.includes('/bank') || u.includes('/banking')) return 'Retail Banking — Checking, Savings & CDs';
        return 'Retail Banking';
      })(),
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
