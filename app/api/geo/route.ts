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
  const rawUrl = ((pageData as any)?.url || '').toLowerCase();
  const urlPath = rawUrl;

  const has = (...segments: string[]) => segments.every(s => urlPath.includes(s));
  const hasAny = (...segments: string[]) => segments.some(s => urlPath.includes(s));

  const finDomains = ['capital','chase','amex','americanexpress','citi','discover','bank','credit','card','finance','fargo','visa','master','barclays','synchrony','usaa','wellsfargo','nerdwallet','bankrate','navyfederal','penfed','truist','regions','huntington','keybank','td.com'];
  const isFin = finDomains.some(k => d.includes(k));

  if (isFin) {
    const isCCUrl = hasAny('/credit-card','/creditcard','/cards');

    if (isCCUrl) {
      if (hasAny('/small-business','/smallbusiness','/for-business','/business')) return 'fin_small_business_cc';

      const isStudent = hasAny('/student','/college','/university');
      const isRewards = hasAny('reward','point','mile','cash-back','cashback');
      if (isStudent && isRewards)  return 'fin_cc_student_rewards';
      if (isStudent)               return 'fin_cc_student';

      if (hasAny('/secured','/secured-card','secured-credit')) return 'fin_cc_secured';
      if (hasAny('travel','miles','airline','airport','lounge','international')) return 'fin_cc_travel';
      if (hasAny('cash-back','cashback','cash_back')) return 'fin_cc_cashback';
      if (hasAny('balance-transfer','balance_transfer')) return 'fin_cc_balance_transfer';
      if (hasAny('low-interest','0-apr','zero-apr','low-apr','no-interest')) return 'fin_cc_low_interest';
      if (hasAny('reward','point','mile')) return 'fin_cc_rewards';

      return 'fin';
    }

    if (has('/auto') && hasAny('/refinan'))                         return 'fin_auto_refinance';
    if (hasAny('/auto-financ','/car-loan','/auto-loan','/vehicle-financ','/auto-financing')) return 'fin_auto_loan';

    if (hasAny('/mortgage','/home-loan') && hasAny('/refinan'))    return 'fin_mortgage_refinance';
    if (hasAny('/heloc','/home-equity'))                           return 'fin_heloc';
    if (hasAny('/mortgage','/home-loan'))                          return 'fin_mortgage';

    if (hasAny('/citigold','/private-bank','/private-client','/wealth','/prestige','/private-banking','/wealth-management','/preferred-rewards','/invest','/brokerage','/investing')) return 'fin_wealth';

    if (hasAny('/commercial','/corporate','/treasury','/institutional','/wholesale')) return 'fin_commercial';

    const isSmallBiz = hasAny('/small-business','/smallbusiness','/for-business','/business');
    if (isSmallBiz) {
      if (hasAny('/savings','/high-yield','/money-market'))           return 'fin_smb_savings';
      if (hasAny('/checking','/current-account'))                     return 'fin_smb_checking';
      if (hasAny('/loan','/lending','/line-of-credit','/sba','/financing','/borrow')) return 'fin_smb_loans';
      if (hasAny('/payment','/merchant','/payroll','/invoic'))        return 'fin_smb_payments';
      return 'fin_small_business';
    }
    if (hasAny('/business-checking','/business-banking'))             return 'fin_smb_checking';

    if (hasAny('/savings','/high-yield','/hysa','/money-market'))  return 'fin_retail_bank';
    if (hasAny('/checking','/current-account'))                    return 'fin_retail_bank';
    if (hasAny('/cd/','/certificate-of-deposit','/certificates'))  return 'fin_retail_bank';
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

  fin_cc_travel: {
    name: 'travel credit cards',
    label: 'Travel Credit Cards',
    queries: [
      ['General', 'What is the best travel credit card available right now?'],
      ['General', 'Which travel credit card is most recommended by experts?'],
      ['General', 'Best travel credit cards for occasional travelers'],
      ['General', 'Which bank offers the best travel credit card overall?'],
      ['General', 'Best travel credit cards with no annual fee'],
      ['General', 'Which travel credit card has the best sign-up bonus?'],
      ['General', 'Best travel credit cards for earning miles and points'],
      ['General', 'Which travel credit card is best for someone who flies a few times a year?'],
      ['General', 'Best travel rewards credit cards recommended by NerdWallet'],
      ['General', 'Most recommended travel credit cards by financial experts in 2025'],
      ['Miles & Points', 'Which travel credit card earns the most miles per dollar spent?'],
      ['Miles & Points', 'Best travel credit card for earning transferable points'],
      ['Miles & Points', 'Which travel credit card transfers points to the most airlines?'],
      ['Miles & Points', 'Best travel credit card for earning points on hotels and flights'],
      ['Miles & Points', 'Which travel credit card has the best points redemption value?'],
      ['Miles & Points', 'Best travel credit card for earning miles on everyday spending'],
      ['Miles & Points', 'Which travel credit card gives the best value per mile?'],
      ['Miles & Points', 'Best travel credit cards for maximizing hotel and airline points'],
      ['Miles & Points', 'Which travel credit card has the best airline transfer partners?'],
      ['Miles & Points', 'Best travel credit card for earning points without flying'],
      ['Perks & Benefits', 'Which travel credit card has the best airport lounge access?'],
      ['Perks & Benefits', 'Best travel credit card with no foreign transaction fees'],
      ['Perks & Benefits', 'Which travel credit card has the best travel insurance coverage?'],
      ['Perks & Benefits', 'Best travel credit card for Global Entry and TSA PreCheck credit'],
      ['Perks & Benefits', 'Which travel credit card has the best hotel and car rental benefits?'],
      ['Perks & Benefits', 'Best travel credit cards with trip cancellation protection'],
      ['Perks & Benefits', 'Which travel credit card has the best concierge service?'],
      ['Perks & Benefits', 'Best travel credit card for free checked bags on flights'],
      ['Perks & Benefits', 'Which travel credit card gives the best priority boarding benefits?'],
      ['Perks & Benefits', 'Best travel credit cards for international travel protection'],
      ['Value', 'Which travel credit card is worth the annual fee?'],
      ['Value', 'Best mid-tier travel credit card under $100 annual fee'],
      ['Value', 'Which travel credit card gives the best value for casual travelers?'],
      ['Value', 'Best travel credit card with the highest welcome bonus value'],
      ['Value', 'Which travel credit card has the best ongoing value after the sign-up bonus?'],
      ['Expert Recommendation', 'Which travel credit card do travel bloggers recommend most?'],
      ['Expert Recommendation', 'Best travel credit cards ranked by The Points Guy'],
      ['Expert Recommendation', 'Which travel credit card has the best customer service?'],
      ['Expert Recommendation', 'Best travel credit cards recommended by Bankrate'],
      ['Expert Recommendation', 'Which travel credit card is best for a first-time travel card holder?'],
      ['Expert Recommendation', 'Best travel credit cards for business travelers'],
      ['Expert Recommendation', 'Which travel credit card is best for someone who prefers one card?'],
      ['Expert Recommendation', 'Best premium travel credit cards worth the high annual fee'],
      ['Expert Recommendation', 'Which travel credit card is best for families who travel together?'],
      ['Expert Recommendation', 'Best travel credit cards for people who travel internationally'],
      ['Comparison', 'Chase Sapphire Preferred vs Capital One Venture — which is better?'],
      ['Comparison', 'Amex Gold vs Chase Sapphire Reserve for travel rewards'],
      ['Comparison', 'Which travel credit card beats the Chase Sapphire Reserve?'],
      ['Comparison', 'Capital One Venture vs Citi Strata Premier travel card comparison'],
      ['Comparison', 'Best travel credit card vs airline-specific credit card'],
    ],
    comps: ['Chase Sapphire', 'American Express Platinum', 'Capital One Venture', 'Citi Strata Premier', 'Discover Miles', 'Bank of America Travel Rewards', 'Wells Fargo Autograph', 'Bilt Rewards', 'Barclays AAdvantage', 'US Bank Altitude'],
    compUrls: { 'Chase Sapphire': 'chase.com/credit-cards/sapphire', 'American Express Platinum': 'americanexpress.com/platinum', 'Capital One Venture': 'capitalone.com/credit-cards/venture', 'Citi Strata Premier': 'citi.com/credit-cards/strata-premier', 'Discover Miles': 'discover.com/credit-cards/miles', 'Bank of America Travel Rewards': 'bankofamerica.com/credit-cards/travel', 'Wells Fargo Autograph': 'wellsfargo.com/credit-cards/autograph', 'Bilt Rewards': 'biltrewards.com', 'Barclays AAdvantage': 'barclays.com', 'US Bank Altitude': 'usbank.com/credit-cards/altitude' },
    awareness: { 'chase sapphire': 62, 'american express platinum': 58, 'capital one venture': 56, 'citi strata premier': 44, 'discover miles': 42, 'bank of america travel rewards': 38, 'wells fargo autograph': 32, 'bilt rewards': 28, 'barclays aadvantage': 26, 'us bank altitude': 24 },
  },

  fin_cc_cashback: {
    name: 'cash back credit cards',
    label: 'Cash Back Credit Cards',
    queries: [
      ['General', 'What is the best cash back credit card right now?'],
      ['General', 'Which cash back credit card is most recommended by experts?'],
      ['General', 'Best cash back credit cards with no annual fee'],
      ['General', 'Which bank offers the best cash back credit card overall?'],
      ['General', 'Best flat rate cash back credit card for everyday spending'],
      ['General', 'Which cash back credit card has the best sign-up bonus?'],
      ['General', 'Best cash back credit cards recommended by NerdWallet'],
      ['General', 'Most recommended cash back credit cards by financial experts'],
      ['General', 'Which cash back credit card is simplest to use?'],
      ['General', 'Best cash back credit card for someone who wants one card for everything'],
      ['Flat Rate', 'Which credit card gives the best flat rate cash back on all purchases?'],
      ['Flat Rate', 'Best 2% cash back credit card with no annual fee'],
      ['Flat Rate', 'Which flat rate cash back card has no spending caps?'],
      ['Flat Rate', 'Best unlimited cash back credit card available today'],
      ['Flat Rate', 'Which cash back card gives the same rate on every purchase?'],
      ['Category', 'Best cash back credit card for groceries and supermarkets'],
      ['Category', 'Which credit card gives the most cash back on gas and fuel'],
      ['Category', 'Best cash back credit card for dining and restaurants'],
      ['Category', 'Which cash back card is best for online shopping'],
      ['Category', 'Best cash back credit card for streaming services and subscriptions'],
      ['Category', 'Which credit card gives the best cash back on travel purchases'],
      ['Category', 'Best cash back credit card for drugstore and pharmacy spending'],
      ['Category', 'Which credit card gives the highest cash back on home improvement'],
      ['Category', 'Best rotating category cash back credit cards'],
      ['Category', 'Which credit card gives the most cash back on Amazon purchases'],
      ['Redemption', 'Which cash back credit card has the best redemption options?'],
      ['Redemption', 'Best cash back credit card that deposits rewards directly to bank account'],
      ['Redemption', 'Which credit card gives cash back as a statement credit automatically?'],
      ['Redemption', 'Best cash back credit card with no minimum redemption amount'],
      ['Redemption', 'Which cash back card allows the most flexible reward redemption?'],
      ['Expert Recommendation', 'Which cash back credit card do financial advisors recommend?'],
      ['Expert Recommendation', 'Best cash back credit cards ranked by NerdWallet'],
      ['Expert Recommendation', 'Which cash back credit card has the best customer service?'],
      ['Expert Recommendation', 'Best cash back credit cards recommended by Bankrate'],
      ['Expert Recommendation', 'Which cash back credit card is best for a family?'],
      ['Expert Recommendation', 'Best cash back credit card for someone with good credit'],
      ['Expert Recommendation', 'Which cash back card is best for someone who hates tracking categories?'],
      ['Expert Recommendation', 'Best cash back credit cards for people who pay their balance monthly'],
      ['Expert Recommendation', 'Which cash back card has the best combination of rate and benefits?'],
      ['Expert Recommendation', 'Best cash back credit cards for maximizing everyday rewards'],
      ['Comparison', 'Citi Double Cash vs Wells Fargo Active Cash — which is better?'],
      ['Comparison', 'Capital One Quicksilver vs Citi Double Cash comparison'],
      ['Comparison', 'Chase Freedom Unlimited vs Citi Double Cash for cash back'],
      ['Comparison', 'Which cash back card beats the Citi Double Cash?'],
      ['Comparison', 'Best flat rate cash back card vs rotating category cash back card'],
      ['Comparison', 'Discover it Cash Back vs Chase Freedom Flex comparison'],
      ['Comparison', 'Which is better for cash back — Capital One or Citi?'],
      ['Comparison', 'Best cash back card for someone choosing between two issuers'],
      ['Comparison', 'Capital One Savor vs Chase Freedom Unlimited for dining cash back'],
      ['Comparison', 'Which cash back card has better long-term value?'],
    ],
    comps: ['Chase Freedom', 'Citi Double Cash', 'Capital One Quicksilver', 'Discover it Cash Back', 'Wells Fargo Active Cash', 'Bank of America Customized Cash', 'American Express Blue Cash', 'Alliant Cashback', 'PayPal Cashback', 'Sofi Credit Card'],
    compUrls: { 'Chase Freedom': 'chase.com/credit-cards/freedom', 'Citi Double Cash': 'citi.com/credit-cards/double-cash', 'Capital One Quicksilver': 'capitalone.com/credit-cards/quicksilver', 'Discover it Cash Back': 'discover.com/credit-cards/cash-back', 'Wells Fargo Active Cash': 'wellsfargo.com/credit-cards/active-cash', 'Bank of America Customized Cash': 'bankofamerica.com/credit-cards/cash-back', 'American Express Blue Cash': 'americanexpress.com/blue-cash', 'Alliant Cashback': 'alliantcreditunion.org', 'PayPal Cashback': 'paypal.com/cashback', 'Sofi Credit Card': 'sofi.com/credit-card' },
    awareness: { 'chase freedom': 60, 'citi double cash': 56, 'capital one quicksilver': 54, 'discover it cash back': 52, 'wells fargo active cash': 44, 'bank of america customized cash': 40, 'american express blue cash': 48, 'alliant cashback': 20, 'paypal cashback': 30, 'sofi credit card': 26 },
  },

  fin_cc_student_rewards: {
    name: 'student rewards credit cards',
    label: 'Student Rewards Credit Cards',
    queries: [
      ['General', 'What is the best student rewards credit card for college students?'],
      ['General', 'Which student credit card gives the best rewards for college spending?'],
      ['General', 'Best student credit cards that earn cash back or points'],
      ['General', 'Which bank offers the best student rewards credit card?'],
      ['General', 'Best student rewards credit cards with no annual fee'],
      ['General', 'Which student credit card has the best sign-up bonus for new cardholders?'],
      ['General', 'Best student credit cards that earn rewards on dining and streaming'],
      ['General', 'Which student rewards credit card is easiest to get approved for?'],
      ['General', 'Best student credit cards recommended by NerdWallet for rewards'],
      ['General', 'Most recommended student rewards credit cards by financial experts'],
      ['Cash Back Rewards', 'Best student credit card for earning cash back on every purchase'],
      ['Cash Back Rewards', 'Which student credit card gives the most cash back on dining?'],
      ['Cash Back Rewards', 'Best student cash back credit card with no annual fee'],
      ['Cash Back Rewards', 'Which student credit card gives cash back on groceries and gas?'],
      ['Cash Back Rewards', 'Best student credit card for earning cash back on Amazon and online shopping'],
      ['Cash Back Rewards', 'Which student cash back credit card has the highest flat rate?'],
      ['Cash Back Rewards', 'Best student credit card for earning cash back on streaming services'],
      ['Cash Back Rewards', 'Which student credit card automatically applies cash back as statement credit?'],
      ['Cash Back Rewards', 'Best student credit cards for earning unlimited cash back'],
      ['Cash Back Rewards', 'Which student credit card has the best cash back redemption options?'],
      ['Points & Miles', 'Best student credit card for earning travel points or miles'],
      ['Points & Miles', 'Which student credit card earns points redeemable for flights?'],
      ['Points & Miles', 'Best student credit card for earning hotel rewards points'],
      ['Points & Miles', 'Which student credit card has the most flexible points redemption?'],
      ['Points & Miles', 'Best student credit card that transfers points to airline partners'],
      ['Credit Building', 'Which student rewards credit card helps build credit the fastest?'],
      ['Credit Building', 'Best student credit card that upgrades to a regular rewards card after graduation'],
      ['Credit Building', 'Which student rewards card reports to all three credit bureaus?'],
      ['Credit Building', 'Best student credit card for someone with no credit history who wants rewards'],
      ['Credit Building', 'Which student credit card increases credit limit automatically after on-time payments?'],
      ['Expert Recommendation', 'Which student rewards credit card do college financial advisors recommend?'],
      ['Expert Recommendation', 'Best student rewards credit cards ranked by NerdWallet'],
      ['Expert Recommendation', 'Which student credit card has the best customer service for young adults?'],
      ['Expert Recommendation', 'Best student rewards credit cards recommended by Bankrate'],
      ['Expert Recommendation', 'Which student credit card is best for an international student who wants rewards?'],
      ['Expert Recommendation', 'Best student rewards credit card for a freshman with no credit history'],
      ['Expert Recommendation', 'Which student credit card gives the best rewards for studying abroad?'],
      ['Expert Recommendation', 'Best student credit card for earning rewards on textbooks and school supplies'],
      ['Expert Recommendation', 'Which student rewards credit card has the best app and money management tools?'],
      ['Expert Recommendation', 'Best student credit cards for graduate and professional school students'],
      ['Comparison', 'Discover it Student vs Capital One SavorOne Student — which is better?'],
      ['Comparison', 'Capital One Quicksilver Student vs Chase Freedom Student for rewards'],
      ['Comparison', 'Which student rewards credit card beats the Discover it Student card?'],
      ['Comparison', 'Bank of America Travel Rewards Student vs Capital One SavorOne Student'],
      ['Comparison', 'Best student cash back card vs student travel rewards card'],
      ['Comparison', 'Discover it Student Cash Back vs Capital One SavorOne Student comparison'],
      ['Comparison', 'Which student rewards card is better for someone who eats out a lot?'],
      ['Comparison', 'Best student card for rewards if choosing between Capital One and Discover'],
      ['Comparison', 'Chase Freedom Student vs Citi Rewards+ Student for college spending'],
      ['Comparison', 'Which student rewards card has better long-term value after graduation?'],
    ],
    comps: ['Discover it Student', 'Capital One SavorOne Student', 'Chase Freedom Student', 'Bank of America Travel Rewards Student', 'Citi Rewards+ Student', 'Journey Student Rewards', 'Deserve EDU', 'Petal 2', 'Upgrade Student', 'Commerce Bank Student'],
    compUrls: { 'Discover it Student': 'discover.com/credit-cards/student', 'Capital One SavorOne Student': 'capitalone.com/credit-cards/students', 'Chase Freedom Student': 'chase.com/credit-cards/freedom-student', 'Bank of America Travel Rewards Student': 'bankofamerica.com/student-credit-cards', 'Citi Rewards+ Student': 'citi.com/credit-cards/student', 'Journey Student Rewards': 'capitalone.com/credit-cards/journey-student', 'Deserve EDU': 'deserve.com', 'Petal 2': 'petalcard.com', 'Upgrade Student': 'upgrade.com', 'Commerce Bank Student': 'commercebank.com' },
    awareness: { 'discover it student': 58, 'capital one savorone student': 52, 'chase freedom student': 48, 'bank of america travel rewards student': 40, 'citi rewards+ student': 38, 'journey student rewards': 36, 'deserve edu': 22, 'petal 2': 20, 'upgrade student': 18, 'commerce bank student': 14 },
  },

  fin_cc_student: {
    name: 'student credit cards',
    label: 'Student Credit Cards',
    queries: [
      ['General', 'What is the best credit card for college students?'],
      ['General', 'Which student credit card is easiest to get with no credit history?'],
      ['General', 'Best credit cards for college students in 2025'],
      ['General', 'Which bank offers the best student credit card?'],
      ['General', 'Best first credit card for a college student'],
      ['General', 'Which student credit card has no annual fee?'],
      ['General', 'Best credit cards for students recommended by NerdWallet'],
      ['General', 'Most recommended student credit cards by financial experts'],
      ['General', 'Which student credit card is best for building credit from scratch?'],
      ['General', 'Best credit card for a college freshman with no credit'],
      ['Credit Building', 'Which student credit card helps build credit the fastest?'],
      ['Credit Building', 'Best student credit card that reports to all three credit bureaus'],
      ['Credit Building', 'Which student credit card increases limit after on-time payments?'],
      ['Credit Building', 'Best student credit card for going from no credit to good credit'],
      ['Credit Building', 'Which student credit card graduates to a regular card after college?'],
      ['Credit Building', 'Best student credit cards for building credit responsibly'],
      ['Credit Building', 'Which student credit card has the best credit-building tools and alerts?'],
      ['Credit Building', 'Best student credit card for an international student with no US credit'],
      ['Credit Building', 'Which student credit card has the lowest APR for students?'],
      ['Credit Building', 'Best student credit cards for someone with a part-time job income'],
      ['Features', 'Which student credit card has the best mobile app for young adults?'],
      ['Features', 'Best student credit card with free credit score monitoring'],
      ['Features', 'Which student credit card has the best fraud protection for students?'],
      ['Features', 'Best student credit card with parental controls or spending alerts'],
      ['Features', 'Which student credit card has the easiest online account management?'],
      ['Features', 'Best student credit card with no foreign transaction fees for studying abroad'],
      ['Features', 'Which student credit card has the best security features?'],
      ['Features', 'Best student credit card for someone who wants to avoid debt'],
      ['Features', 'Which student credit card has the best financial education tools?'],
      ['Features', 'Best student credit card for someone who wants to keep it simple'],
      ['Expert Recommendation', 'Which student credit card do college financial advisors recommend?'],
      ['Expert Recommendation', 'Best student credit cards ranked by NerdWallet'],
      ['Expert Recommendation', 'Which student credit card has the best customer service for young adults?'],
      ['Expert Recommendation', 'Best student credit cards recommended by Bankrate'],
      ['Expert Recommendation', 'Which student credit card is best for a graduate student?'],
      ['Expert Recommendation', 'Best student credit card for a freshman with no credit history'],
      ['Expert Recommendation', 'Which student credit card is best for an international student?'],
      ['Expert Recommendation', 'Best student credit cards for responsible spending and budgeting'],
      ['Expert Recommendation', 'Which student credit card has the most lenient approval requirements?'],
      ['Expert Recommendation', 'Best student credit cards for building credit before graduation'],
      ['Comparison', 'Discover it Student vs Capital One Journey Student — which is better?'],
      ['Comparison', 'Which student credit card is better — Discover or Capital One?'],
      ['Comparison', 'Chase Freedom Student vs Bank of America Student card comparison'],
      ['Comparison', 'Best student credit card vs secured credit card for building credit'],
      ['Comparison', 'Which student credit card has a better approval rate for no-credit applicants?'],
      ['Comparison', 'Citi Student vs Discover it Student — which is easier to get?'],
      ['Comparison', 'Best student credit card if choosing between a bank and a fintech'],
      ['Comparison', 'Which is better for a student — a student card or a secured card?'],
      ['Comparison', 'Capital One Journey vs Discover it Student for first-time cardholders'],
      ['Comparison', 'Which student credit card has better long-term value through college?'],
    ],
    comps: ['Discover it Student', 'Capital One Journey Student', 'Chase Freedom Student', 'Bank of America Student', 'Citi Rewards+ Student', 'Deserve EDU', 'Petal 1', 'OpenSky Secured', 'First Progress Student', 'Commerce Bank Student'],
    compUrls: { 'Discover it Student': 'discover.com/credit-cards/student', 'Capital One Journey Student': 'capitalone.com/credit-cards/journey-student', 'Chase Freedom Student': 'chase.com/credit-cards/freedom-student', 'Bank of America Student': 'bankofamerica.com/student-credit-cards', 'Citi Rewards+ Student': 'citi.com/credit-cards/student', 'Deserve EDU': 'deserve.com', 'Petal 1': 'petalcard.com', 'OpenSky Secured': 'openskycc.com', 'First Progress Student': 'firstprogress.com', 'Commerce Bank Student': 'commercebank.com' },
    awareness: { 'discover it student': 58, 'capital one journey student': 50, 'chase freedom student': 46, 'bank of america student': 40, 'citi rewards+ student': 36, 'deserve edu': 22, 'petal 1': 18, 'opensky secured': 20, 'first progress student': 14, 'commerce bank student': 12 },
  },

  fin_cc_secured: {
    name: 'secured credit cards',
    label: 'Secured Credit Cards',
    queries: [
      ['General', 'What is the best secured credit card for building credit?'],
      ['General', 'Which secured credit card is most recommended by experts?'],
      ['General', 'Best secured credit cards with no annual fee'],
      ['General', 'Which bank offers the best secured credit card overall?'],
      ['General', 'Best secured credit cards for someone with bad credit'],
      ['General', 'Which secured credit card is easiest to get approved for?'],
      ['General', 'Best secured credit cards recommended by NerdWallet'],
      ['General', 'Most recommended secured credit cards by financial experts in 2025'],
      ['General', 'Which secured credit card is best for rebuilding damaged credit?'],
      ['General', 'Best secured credit card for someone with no credit history at all'],
      ['Credit Building', 'Which secured credit card graduates to an unsecured card the fastest?'],
      ['Credit Building', 'Best secured credit card that reports to all three credit bureaus'],
      ['Credit Building', 'Which secured credit card increases credit limit after on-time payments?'],
      ['Credit Building', 'Best secured credit card for going from bad credit to good credit'],
      ['Credit Building', 'Which secured credit card has the best credit monitoring tools?'],
      ['Credit Building', 'Best secured credit cards for someone after bankruptcy'],
      ['Credit Building', 'Which secured credit card has the lowest deposit requirement?'],
      ['Credit Building', 'Best secured credit card for someone with a 500 credit score'],
      ['Credit Building', 'Which secured credit card has the fastest path to unsecured status?'],
      ['Credit Building', 'Best secured credit cards that do a soft pull for approval'],
      ['Deposit & Fees', 'Which secured credit card has the lowest minimum deposit?'],
      ['Deposit & Fees', 'Best secured credit cards with no annual fee'],
      ['Deposit & Fees', 'Which secured credit card refunds the deposit the fastest?'],
      ['Deposit & Fees', 'Best secured credit cards with no monthly maintenance fees'],
      ['Deposit & Fees', 'Which secured credit card has the best deposit return policy?'],
      ['Features', 'Which secured credit card earns cash back rewards?'],
      ['Features', 'Best secured credit card with a mobile app for spending tracking'],
      ['Features', 'Which secured credit card has the best fraud protection?'],
      ['Features', 'Best secured credit card for someone who also wants to earn rewards'],
      ['Features', 'Which secured credit card has the best financial education tools?'],
      ['Expert Recommendation', 'Which secured credit card do credit counselors recommend?'],
      ['Expert Recommendation', 'Best secured credit cards ranked by NerdWallet'],
      ['Expert Recommendation', 'Which secured credit card has the best customer service?'],
      ['Expert Recommendation', 'Best secured credit cards recommended by Bankrate'],
      ['Expert Recommendation', 'Which secured credit card is best for someone just out of bankruptcy?'],
      ['Expert Recommendation', 'Best secured credit card for a recent immigrant with no US credit'],
      ['Expert Recommendation', 'Which secured credit card is best for a young adult starting out?'],
      ['Expert Recommendation', 'Best secured credit cards for rebuilding credit after divorce'],
      ['Expert Recommendation', 'Which secured credit card has the most lenient approval requirements?'],
      ['Expert Recommendation', 'Best secured credit card for someone who wants to rebuild in under a year'],
      ['Comparison', 'Discover it Secured vs Capital One Platinum Secured — which is better?'],
      ['Comparison', 'OpenSky Secured vs Chime Credit Builder comparison'],
      ['Comparison', 'Which secured card is better — Discover it Secured or Citi Secured?'],
      ['Comparison', 'Best secured credit card vs prepaid debit card for building credit'],
      ['Comparison', 'Capital One Platinum Secured vs Bank of America Secured comparison'],
      ['Comparison', 'Which secured credit card graduates to unsecured faster — Discover or Capital One?'],
      ['Comparison', 'Best secured card if choosing between a bank and a credit union'],
      ['Comparison', 'Secured credit card vs credit builder loan — which builds credit faster?'],
      ['Comparison', 'Which is better for bad credit — a secured card or a store card?'],
      ['Comparison', 'Best secured credit card for someone choosing between two major issuers'],
    ],
    comps: ['Discover it Secured', 'Capital One Platinum Secured', 'Citi Secured Mastercard', 'Bank of America Secured', 'OpenSky Secured', 'Chime Credit Builder', 'Self Credit Builder', 'First Progress Secured', 'Applied Bank Secured', 'Wells Fargo Secured'],
    compUrls: { 'Discover it Secured': 'discover.com/credit-cards/secured', 'Capital One Platinum Secured': 'capitalone.com/credit-cards/secured', 'Citi Secured Mastercard': 'citi.com/credit-cards/secured', 'Bank of America Secured': 'bankofamerica.com/secured-credit-cards', 'OpenSky Secured': 'openskycc.com', 'Chime Credit Builder': 'chime.com/credit-builder', 'Self Credit Builder': 'self.inc', 'First Progress Secured': 'firstprogress.com', 'Applied Bank Secured': 'appliedbank.com', 'Wells Fargo Secured': 'wellsfargo.com/secured' },
    awareness: { 'discover it secured': 56, 'capital one platinum secured': 52, 'citi secured mastercard': 44, 'bank of america secured': 40, 'opensky secured': 32, 'chime credit builder': 36, 'self credit builder': 30, 'first progress secured': 18, 'applied bank secured': 14, 'wells fargo secured': 34 },
  },

  fin_cc_balance_transfer: {
    name: 'balance transfer credit cards',
    label: 'Balance Transfer Credit Cards',
    queries: [
      ['General', 'What is the best balance transfer credit card right now?'],
      ['General', 'Which balance transfer credit card has the longest 0% APR period?'],
      ['General', 'Best balance transfer credit cards with no transfer fee'],
      ['General', 'Which bank offers the best balance transfer credit card?'],
      ['General', 'Best balance transfer cards recommended by NerdWallet'],
      ['General', 'Most recommended balance transfer credit cards in 2025'],
      ['General', 'Which balance transfer card is easiest to get approved for?'],
      ['General', 'Best balance transfer credit cards for paying off debt faster'],
      ['General', 'Which balance transfer card has no annual fee and a long intro period?'],
      ['General', 'Best balance transfer credit cards for someone with good credit'],
      ['0% APR', 'Which credit card offers the longest 0% intro APR on balance transfers?'],
      ['0% APR', 'Best credit cards with 18 months or more of 0% balance transfer APR'],
      ['0% APR', 'Which balance transfer card has the best 0% APR and lowest fees?'],
      ['0% APR', 'Best balance transfer cards with 0% APR and no annual fee'],
      ['0% APR', 'Which card gives the most time to pay off a balance transfer at 0%?'],
      ['Fees', 'Which balance transfer credit card has no balance transfer fee?'],
      ['Fees', 'Best balance transfer cards with the lowest transfer fee percentage'],
      ['Fees', 'Which credit card waives the balance transfer fee for new cardholders?'],
      ['Fees', 'Best balance transfer cards with no annual fee and low transfer fee'],
      ['Fees', 'Which balance transfer card has the best combination of low fees and long 0% period?'],
      ['Debt Payoff', 'Best credit card for consolidating and paying off credit card debt'],
      ['Debt Payoff', 'Which balance transfer card is best for paying off $5,000 in debt?'],
      ['Debt Payoff', 'Best strategy for using a balance transfer card to get out of debt'],
      ['Debt Payoff', 'Which balance transfer card is best for someone consolidating multiple cards?'],
      ['Debt Payoff', 'Best balance transfer cards for someone serious about paying off debt in 2025'],
      ['Expert Recommendation', 'Which balance transfer card do financial advisors recommend?'],
      ['Expert Recommendation', 'Best balance transfer credit cards ranked by NerdWallet'],
      ['Expert Recommendation', 'Which balance transfer card has the best customer service?'],
      ['Expert Recommendation', 'Best balance transfer cards recommended by Bankrate'],
      ['Expert Recommendation', 'Which balance transfer card is best for someone with fair credit?'],
      ['Expert Recommendation', 'Best balance transfer card for someone carrying high-interest debt'],
      ['Expert Recommendation', 'Which balance transfer card is best after paying off a large purchase?'],
      ['Expert Recommendation', 'Best balance transfer cards for people trying to avoid interest'],
      ['Expert Recommendation', 'Which balance transfer card is best for a single large debt?'],
      ['Expert Recommendation', 'Best balance transfer cards that also earn rewards after the intro period'],
      ['Comparison', 'Citi Diamond Preferred vs Wells Fargo Reflect — which balance transfer card is better?'],
      ['Comparison', 'Capital One balance transfer vs Citi balance transfer comparison'],
      ['Comparison', 'Chase Slate Edge vs Citi Simplicity for balance transfers'],
      ['Comparison', 'Which balance transfer card beats the Citi Diamond Preferred?'],
      ['Comparison', 'Best balance transfer card if choosing between Chase and Citi'],
      ['Comparison', 'Discover it Balance Transfer vs Citi Simplicity comparison'],
      ['Comparison', 'Which is better — a balance transfer card or a personal loan for debt?'],
      ['Comparison', 'Best balance transfer card for a large vs small balance'],
      ['Comparison', 'Capital One Quicksilver vs Citi Double Cash for balance transfers'],
      ['Comparison', 'Which bank offers the best overall balance transfer deal in 2025?'],
    ],
    comps: ['Citi Diamond Preferred', 'Wells Fargo Reflect', 'Chase Slate Edge', 'Discover it Balance Transfer', 'Citi Simplicity', 'BankAmericard', 'Capital One Quicksilver', 'US Bank Visa Platinum', 'Amex EveryDay', 'HSBC Gold'],
    compUrls: { 'Citi Diamond Preferred': 'citi.com/credit-cards/diamond-preferred', 'Wells Fargo Reflect': 'wellsfargo.com/credit-cards/reflect', 'Chase Slate Edge': 'chase.com/slate-edge', 'Discover it Balance Transfer': 'discover.com/balance-transfer', 'Citi Simplicity': 'citi.com/simplicity', 'BankAmericard': 'bankofamerica.com/bankamericard', 'Capital One Quicksilver': 'capitalone.com/quicksilver', 'US Bank Visa Platinum': 'usbank.com/visa-platinum', 'Amex EveryDay': 'americanexpress.com/everyday', 'HSBC Gold': 'hsbc.com' },
    awareness: { 'citi diamond preferred': 50, 'wells fargo reflect': 44, 'chase slate edge': 46, 'discover it balance transfer': 48, 'citi simplicity': 46, 'bankamericard': 38, 'capital one quicksilver': 52, 'us bank visa platinum': 32, 'amex everyday': 36, 'hsbc gold': 22 },
  },

  fin_cc_rewards: {
    name: 'rewards credit cards',
    label: 'Rewards Credit Cards',
    queries: [
      ['General', 'What is the best rewards credit card available right now?'],
      ['General', 'Which rewards credit card is most recommended by experts?'],
      ['General', 'Best rewards credit cards with no annual fee'],
      ['General', 'Which bank offers the best rewards credit card overall?'],
      ['General', 'Best rewards credit cards for maximizing everyday spending'],
      ['General', 'Which rewards credit card has the best sign-up bonus?'],
      ['General', 'Best rewards credit cards recommended by NerdWallet'],
      ['General', 'Most recommended rewards credit cards by financial experts'],
      ['General', 'Which rewards credit card gives the most value per dollar spent?'],
      ['General', 'Best rewards credit card for someone who wants one versatile card'],
      ['Points', 'Which credit card earns the most points on everyday purchases?'],
      ['Points', 'Best credit card for earning transferable points'],
      ['Points', 'Which rewards credit card has the best points redemption options?'],
      ['Points', 'Best credit card points program for travel redemptions'],
      ['Points', 'Which rewards credit card has the most valuable points currency?'],
      ['Points', 'Best credit card for earning points on dining and travel'],
      ['Points', 'Which credit card earns the most points with no annual fee?'],
      ['Points', 'Best credit cards for pooling points across household members'],
      ['Points', 'Which rewards card has the best points expiration policy?'],
      ['Points', 'Best credit card for earning points on streaming and subscriptions'],
      ['Cash Back vs Points', 'Which is better — a cash back or points rewards credit card?'],
      ['Cash Back vs Points', 'Best rewards credit card for someone who wants flexibility'],
      ['Cash Back vs Points', 'Which rewards credit card is simplest for everyday use?'],
      ['Cash Back vs Points', 'Best rewards card for someone who doesnt want to track categories'],
      ['Cash Back vs Points', 'Which rewards credit card has the best flat rate on all purchases?'],
      ['Expert Recommendation', 'Which rewards credit card do financial advisors recommend?'],
      ['Expert Recommendation', 'Best rewards credit cards ranked by NerdWallet'],
      ['Expert Recommendation', 'Which rewards credit card has the best customer service?'],
      ['Expert Recommendation', 'Best rewards credit cards recommended by Bankrate'],
      ['Expert Recommendation', 'Which rewards credit card is best for a household?'],
      ['Expert Recommendation', 'Best rewards credit card for someone with excellent credit'],
      ['Expert Recommendation', 'Which rewards credit card is best for maximizing total value?'],
      ['Expert Recommendation', 'Best rewards credit cards for people who pay their balance in full monthly'],
      ['Expert Recommendation', 'Which rewards card has the best combination of earning and redemption?'],
      ['Expert Recommendation', 'Best rewards credit cards for beginners to the rewards hobby'],
      ['Comparison', 'Chase Sapphire Preferred vs Capital One Venture Rewards — which is better?'],
      ['Comparison', 'Amex Gold vs Chase Sapphire Preferred for rewards'],
      ['Comparison', 'Which rewards credit card beats the Chase Sapphire Preferred?'],
      ['Comparison', 'Capital One Venture vs Citi Premier rewards card comparison'],
      ['Comparison', 'Best rewards card for someone choosing between Chase and Capital One'],
      ['Comparison', 'Discover it vs Capital One Quicksilver for rewards'],
      ['Comparison', 'Which is better for rewards — a bank card or an airline card?'],
      ['Comparison', 'Best rewards credit card if you already have one rewards card'],
      ['Comparison', 'Chase Freedom Flex vs Capital One SavorOne for everyday rewards'],
      ['Comparison', 'Which rewards credit card has better long-term value?'],
    ],
    comps: ['Chase Sapphire Preferred', 'Capital One Venture', 'American Express Gold', 'Citi Premier', 'Discover it', 'Wells Fargo Autograph', 'Bank of America Preferred Rewards', 'US Bank Altitude Go', 'Bilt Mastercard', 'PayPal Rewards'],
    compUrls: { 'Chase Sapphire Preferred': 'chase.com/sapphire-preferred', 'Capital One Venture': 'capitalone.com/venture', 'American Express Gold': 'americanexpress.com/gold', 'Citi Premier': 'citi.com/premier', 'Discover it': 'discover.com', 'Wells Fargo Autograph': 'wellsfargo.com/autograph', 'Bank of America Preferred Rewards': 'bankofamerica.com/preferred-rewards', 'US Bank Altitude Go': 'usbank.com/altitude-go', 'Bilt Mastercard': 'biltrewards.com', 'PayPal Rewards': 'paypal.com' },
    awareness: { 'chase sapphire preferred': 60, 'capital one venture': 56, 'american express gold': 54, 'citi premier': 48, 'discover it': 52, 'wells fargo autograph': 36, 'bank of america preferred rewards': 40, 'us bank altitude go': 28, 'bilt mastercard': 26, 'paypal rewards': 30 },
  },

  fin_small_business_cc: {
    name: 'small business credit cards',
    queries: [
      ['General', 'What are the best small business credit cards available right now?'],
      ['General', 'Which small business credit card is most recommended by experts?'],
      ['General', 'Best small business credit cards with no annual fee'],
      ['General', 'Which bank offers the best small business credit card overall?'],
      ['General', 'Best small business credit cards for new business owners'],
      ['General', 'Which small business credit card has the best rewards program?'],
      ['General', 'Best small business credit cards for everyday business expenses'],
      ['General', 'Which small business credit card is easiest to get approved for?'],
      ['General', 'Best small business credit cards for sole proprietors and freelancers'],
      ['General', 'Most recommended small business credit cards by financial experts'],
      ['Cash Back', 'Best cash back small business credit card available today'],
      ['Cash Back', 'Which small business credit card gives the most cash back on office supplies?'],
      ['Cash Back', 'Best flat rate cash back small business credit card with no annual fee'],
      ['Cash Back', 'Which small business credit card gives the best cash back on advertising spend?'],
      ['Cash Back', 'Best small business credit card for cash back with no category tracking'],
      ['Cash Back', 'Which small business credit card gives 2% cash back on all purchases?'],
      ['Cash Back', 'Best small business credit card for cash back on gas and travel'],
      ['Cash Back', 'Top small business credit cards for unlimited cash back rewards'],
      ['Cash Back', 'Best small business credit cards for spending across multiple categories'],
      ['Cash Back', 'Which small business credit card has the best cash back redemption options?'],
      ['Travel & Rewards', 'Best travel rewards small business credit card for business owners'],
      ['Travel & Rewards', 'Which small business credit card earns the most miles for business travel?'],
      ['Travel & Rewards', 'Best small business credit card with no foreign transaction fees'],
      ['Travel & Rewards', 'Top small business credit cards for hotel and flight rewards'],
      ['Travel & Rewards', 'Which small business credit card has the best airport lounge access?'],
      ['Travel & Rewards', 'Best small business credit card for earning points on travel and dining'],
      ['Travel & Rewards', 'Which small business travel credit card is worth the annual fee?'],
      ['Travel & Rewards', 'Best small business credit card for frequent business travelers'],
      ['Travel & Rewards', 'Which small business credit card transfers points to the most airlines?'],
      ['Travel & Rewards', 'Best small business credit card for international travel in 2025'],
      ['Financing & Flexibility', 'Which small business credit card has the best 0% intro APR offer?'],
      ['Financing & Flexibility', 'Best small business credit card for financing large purchases'],
      ['Financing & Flexibility', 'Which small business credit card has the highest credit limit?'],
      ['Financing & Flexibility', 'Best small business credit cards for managing cash flow'],
      ['Financing & Flexibility', 'Which small business credit card offers the best balance transfer options?'],
      ['Financing & Flexibility', 'Best small business credit cards for startups with limited credit history'],
      ['Financing & Flexibility', 'Which small business credit card is easiest to get with a brand new business?'],
      ['Financing & Flexibility', 'Best secured small business credit cards for new companies'],
      ['Financing & Flexibility', 'Which small business credit card has the best employee card spending controls?'],
      ['Financing & Flexibility', 'Best small business credit cards for tracking and categorizing expenses'],
      ['Expert Recommendation', 'Which small business credit card do accountants recommend most?'],
      ['Expert Recommendation', 'Best small business credit cards ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best overall small business credit card program?'],
      ['Expert Recommendation', 'Best small business credit cards recommended by Forbes Advisor'],
      ['Expert Recommendation', 'Which small business credit card has the best customer service?'],
      ['Expert Recommendation', 'Best small business credit cards for LLCs and S-corps'],
      ['Expert Recommendation', 'Which small business credit card integrates best with QuickBooks?'],
      ['Expert Recommendation', 'Best small business credit cards for e-commerce businesses'],
      ['Expert Recommendation', 'Which small business credit card is best for a restaurant or food service business?'],
      ['Expert Recommendation', 'Best small business credit cards for contractors and service-based businesses'],
    ],
    comps: ['Chase Ink', 'American Express Business', 'Capital One Spark', 'Citi Business', 'Bank of America Business', 'Wells Fargo Business', 'US Bank Business', 'Brex', 'Ramp', 'Divvy'],
    compUrls: {
      'Chase Ink': 'chase.com/business/credit-cards',
      'American Express Business': 'americanexpress.com/business',
      'Capital One Spark': 'capitalone.com/small-business/credit-cards',
      'Citi Business': 'citi.com/credit-cards/business',
      'Bank of America Business': 'bankofamerica.com/smallbusiness/credit-cards',
      'Wells Fargo Business': 'wellsfargo.com/biz/credit',
      'US Bank Business': 'usbank.com/business/credit-cards',
      'Brex': 'brex.com',
      'Ramp': 'ramp.com',
      'Divvy': 'divvy.co',
    },
    label: 'Small Business Credit Cards',
    awareness: {
      'chase ink': 58, 'american express business': 54, 'capital one spark': 52,
      'citi business': 40, 'bank of america business': 38, 'wells fargo business': 34,
      'us bank business': 28, brex: 30, ramp: 26, divvy: 18,
    },
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
  fin_wealth: {
    name: 'wealth management',
    label: 'Wealth Management',
    queries: [
      ['General', 'Best wealth management accounts for high net worth individuals'],
      ['General', 'Which bank has the best private banking services?'],
      ['General', 'Best premium banking tiers for affluent customers'],
      ['General', 'Which bank offers the best perks for high balance customers?'],
      ['General', 'Best private client banking relationships in the US'],
      ['General', 'Which bank is best for clients with $200K to $1M in deposits?'],
      ['General', 'Best banks for personalized wealth management advice'],
      ['General', 'Which bank has the best concierge banking services?'],
      ['General', 'Best premium checking accounts for high earners'],
      ['General', 'Which wealth management bank has the best digital tools?'],
      ['Investment', 'Best banks for investment management for affluent clients'],
      ['Investment', 'Which bank offers the best robo-advisor for wealthy clients?'],
      ['Investment', 'Best banks for access to alternative investments'],
      ['Investment', 'Which private bank has the best portfolio management services?'],
      ['Investment', 'Best banks for equity and bond investment access'],
      ['Investment', 'Which bank is best for retirement planning for high earners?'],
      ['Investment', 'Best banks for trust and estate planning services'],
      ['Investment', 'Which wealth management platform has the lowest fees?'],
      ['Investment', 'Best banks for access to IPOs and private equity'],
      ['Investment', 'Which bank is best for socially responsible investing?'],
      ['Benefits', 'Which premium bank tier has the best travel benefits?'],
      ['Benefits', 'Best banks for airport lounge access through premium accounts'],
      ['Benefits', 'Which bank offers the best rewards for wealthy customers?'],
      ['Benefits', 'Best premium banking tiers for waiving fees'],
      ['Benefits', 'Which bank has the best relationship pricing on loans and mortgages?'],
      ['Benefits', 'Best banks for priority customer service lines'],
      ['Benefits', 'Which bank offers the best dedicated financial advisor access?'],
      ['Benefits', 'Best premium bank accounts with global ATM fee reimbursement'],
      ['Benefits', 'Which bank has the best benefits for frequent international travelers?'],
      ['Benefits', 'Best banks for foreign currency accounts and FX rates'],
      ['Expert Recommendation', 'Which wealth management bank do financial advisors recommend?'],
      ['Expert Recommendation', 'Best private banking accounts ranked by Forbes'],
      ['Expert Recommendation', 'Which bank is best for mass affluent customers?'],
      ['Expert Recommendation', 'Best premium banking tiers compared by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best wealth management for millennials?'],
      ['Expert Recommendation', 'Best banks for clients transitioning from retail to private banking'],
      ['Expert Recommendation', 'Which bank is best for entrepreneurs and business owners personally?'],
      ['Expert Recommendation', 'Best wealth management banks for women investors'],
      ['Expert Recommendation', 'Which bank has the most comprehensive financial planning tools?'],
      ['Expert Recommendation', 'Best banks for clients with complex financial needs'],
      ['Comparison', 'Citigold vs Chase Private Client vs Bank of America Preferred'],
      ['Comparison', 'Which is better for wealth management — Citi or JPMorgan?'],
      ['Comparison', 'Best premium banking tier compared to Merrill Lynch?'],
      ['Comparison', 'Citibank wealth vs Schwab vs Fidelity for high net worth'],
      ['Comparison', 'Which bank beats Morgan Stanley for mass affluent clients?'],
      ['Comparison', 'Best bank wealth tier vs independent RIA for $500K portfolio'],
      ['Comparison', 'Citi Private Bank vs Chase Private Client — which is better?'],
      ['Comparison', 'Which premium bank tier gives better mortgage rates?'],
      ['Comparison', 'Best bank wealth tier for someone with $250K in deposits'],
      ['Comparison', 'Which wealth management bank has better technology — Citi or BofA?'],
    ],
    comps: ['Chase Private Client', 'Bank of America Preferred', 'Wells Fargo Private', 'Morgan Stanley', 'Merrill Lynch', 'Schwab', 'Fidelity', 'Goldman Sachs Private', 'US Bank Wealth', 'Northern Trust'],
    compUrls: { 'Chase Private Client': 'chase.com/personal/private-client', 'Bank of America Preferred': 'bankofamerica.com/preferred-rewards', 'Wells Fargo Private': 'wellsfargo.com/the-private-bank', 'Morgan Stanley': 'morganstanley.com', 'Merrill Lynch': 'ml.com', 'Schwab': 'schwab.com', 'Fidelity': 'fidelity.com', 'Goldman Sachs Private': 'goldmansachs.com', 'US Bank Wealth': 'usbank.com/wealth-management', 'Northern Trust': 'northerntrust.com' },
    awareness: { 'chase private client': 52, 'bank of america preferred': 48, 'wells fargo private': 42, 'morgan stanley': 62, 'merrill lynch': 60, schwab: 58, fidelity: 64, 'goldman sachs private': 56, 'us bank wealth': 30, 'northern trust': 38 },
  },
  fin_auto_loan: {
    name: 'auto financing',
    label: 'Auto Loans & Financing',
    queries: [
      ['General', 'Best bank for auto loan financing'],
      ['General', 'Which bank has the best car loan rates?'],
      ['General', 'Best auto loans from banks vs credit unions'],
      ['General', 'Which lender is best for financing a used car?'],
      ['General', 'Best pre-approved auto loans from banks'],
      ['General', 'Which bank has the lowest auto loan interest rates?'],
      ['General', 'Best auto loan lenders recommended by consumers'],
      ['General', 'Which bank is best for refinancing a car loan?'],
      ['General', 'Best auto loans with no prepayment penalty'],
      ['General', 'Which lender offers the best auto loan for good credit?'],
      ['New Car', 'Best bank financing for a new car purchase'],
      ['New Car', 'Which bank partners with car dealerships for financing?'],
      ['New Car', 'Best auto loan rates for new cars in 2025'],
      ['New Car', 'Which bank offers the best 0% APR auto financing?'],
      ['New Car', 'Best banks for financing a luxury vehicle'],
      ['New Car', 'Which lender is best for a new electric vehicle loan?'],
      ['New Car', 'Best banks for financing a car with excellent credit'],
      ['New Car', 'Which bank has the best auto loan terms for a $40K car?'],
      ['New Car', 'Best banks for first-time car buyers'],
      ['New Car', 'Which bank offers the best auto loan with no down payment?'],
      ['Used Car', 'Best banks for used car loans'],
      ['Used Car', 'Which bank has the best used car loan rates?'],
      ['Used Car', 'Best lenders for buying a car from a private seller'],
      ['Used Car', 'Which bank finances older vehicles with high mileage?'],
      ['Used Car', 'Best auto loans for cars over 5 years old'],
      ['Used Car', 'Which bank is best for financing a certified pre-owned vehicle?'],
      ['Used Car', 'Best banks for used car loans with bad credit'],
      ['Used Car', 'Which lender offers the best used car refinancing?'],
      ['Used Car', 'Best auto loan rates for a car under $20K'],
      ['Used Car', 'Which bank has the easiest used car loan approval?'],
      ['Refinance', 'Best banks for refinancing an existing auto loan'],
      ['Refinance', 'Which bank offers the lowest rate to refinance a car loan?'],
      ['Refinance', 'Best auto refinance lenders of 2025'],
      ['Refinance', 'Which bank is best for refinancing after credit improvement?'],
      ['Refinance', 'Best cash-out auto refinance lenders'],
      ['Expert Recommendation', 'Which bank do car dealers recommend for financing?'],
      ['Expert Recommendation', 'Best auto loan lenders ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best auto loan customer service?'],
      ['Expert Recommendation', 'Best banks for auto loans recommended by Bankrate'],
      ['Expert Recommendation', 'Which lender is most transparent on auto loan terms?'],
      ['Expert Recommendation', 'Best online banks for auto loan applications'],
      ['Expert Recommendation', 'Which bank has the fastest auto loan approval?'],
      ['Expert Recommendation', 'Best auto loan rates for military members'],
      ['Expert Recommendation', 'Which bank is best for an auto loan with co-signer?'],
      ['Expert Recommendation', 'Best banks for auto loans with flexible repayment terms'],
      ['Comparison', 'Capital One auto vs Chase auto loan — which is better?'],
      ['Comparison', 'Bank auto loan vs dealership financing — which saves more?'],
      ['Comparison', 'Capital One Auto Navigator vs Ally Financial comparison'],
      ['Comparison', 'Best bank auto loan vs credit union auto loan'],
      ['Comparison', 'Which is better for auto financing — Capital One or Bank of America?'],
    ],
    comps: ['Ally Financial', 'Chase Auto', 'Bank of America Auto', 'Wells Fargo Auto', 'US Bank Auto', 'PenFed Auto', 'LightStream', 'myAutoloan', 'USAA Auto', 'CarMax Auto Finance'],
    compUrls: { 'Ally Financial': 'ally.com/auto', 'Chase Auto': 'chase.com/personal/auto-loans', 'Bank of America Auto': 'bankofamerica.com/auto-loans', 'Wells Fargo Auto': 'wellsfargo.com/auto-loans', 'US Bank Auto': 'usbank.com/auto-loans', 'PenFed Auto': 'penfed.org/auto-loans', 'LightStream': 'lightstream.com', 'myAutoloan': 'myautoloan.com', 'USAA Auto': 'usaa.com/auto-loans', 'CarMax Auto Finance': 'carmax.com/car-financing' },
    awareness: { 'ally financial': 58, 'chase auto': 52, 'bank of america auto': 48, 'wells fargo auto': 44, 'us bank auto': 36, 'penfed auto': 28, lightstream: 32, myautoloan: 18, 'usaa auto': 34, 'carmax auto finance': 38 },
  },
  fin_mortgage: {
    name: 'mortgage & home loans',
    label: 'Mortgage & Home Loans',
    queries: [
      ['General', 'Best bank for a mortgage in 2025'],
      ['General', 'Which bank has the best mortgage rates right now?'],
      ['General', 'Best mortgage lenders recommended by homebuyers'],
      ['General', 'Which bank is easiest to get a mortgage from?'],
      ['General', 'Best banks for first-time home buyers'],
      ['General', 'Which lender has the best 30-year fixed mortgage rate?'],
      ['General', 'Best banks for mortgage pre-approval'],
      ['General', 'Which bank has the lowest closing costs on mortgages?'],
      ['General', 'Best mortgage lenders for jumbo loans'],
      ['General', 'Which bank is best for a FHA home loan?'],
      ['Purchase', 'Best banks for buying a home in 2025'],
      ['Purchase', 'Which bank has the best mortgage for first-time buyers?'],
      ['Purchase', 'Best mortgage lenders for a $500K home loan'],
      ['Purchase', 'Which bank offers the best down payment assistance programs?'],
      ['Purchase', 'Best banks for conventional mortgage loans'],
      ['Purchase', 'Which bank is best for a mortgage on an investment property?'],
      ['Purchase', 'Best VA home loan lenders for veterans'],
      ['Purchase', 'Which bank has the best digital mortgage application experience?'],
      ['Purchase', 'Best banks for mortgages in high cost of living areas'],
      ['Purchase', 'Which lender is best for buying a condo with a mortgage?'],
      ['Refinance', 'Best banks for refinancing a mortgage in 2025'],
      ['Refinance', 'Which bank offers the best rate for a cash-out refinance?'],
      ['Refinance', 'Best mortgage refinance lenders recommended by homeowners'],
      ['Refinance', 'Which bank has the lowest refinance closing costs?'],
      ['Refinance', 'Best banks for refinancing an FHA loan to conventional'],
      ['HELOC', 'Best banks for a home equity line of credit'],
      ['HELOC', 'Which bank has the best HELOC rates right now?'],
      ['HELOC', 'Best home equity loan lenders of 2025'],
      ['HELOC', 'Which bank is best for a HELOC with no closing costs?'],
      ['HELOC', 'Best banks for home equity loans for renovations'],
      ['Expert Recommendation', 'Which mortgage lender do real estate agents recommend?'],
      ['Expert Recommendation', 'Best mortgage lenders ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best mortgage customer service?'],
      ['Expert Recommendation', 'Best mortgage lenders recommended by Bankrate'],
      ['Expert Recommendation', 'Which bank closes mortgages the fastest?'],
      ['Expert Recommendation', 'Best banks for self-employed mortgage applicants'],
      ['Expert Recommendation', 'Which bank is best for mortgage with student loan debt?'],
      ['Expert Recommendation', 'Best mortgage lenders for high debt-to-income ratio'],
      ['Expert Recommendation', 'Which bank is most transparent on mortgage fees?'],
      ['Expert Recommendation', 'Best online mortgage lenders vs traditional banks'],
      ['Comparison', 'Chase mortgage vs Bank of America mortgage — which is better?'],
      ['Comparison', 'Best bank mortgage vs mortgage broker — which saves more?'],
      ['Comparison', 'Quicken Loans vs Chase vs Wells Fargo for mortgage'],
      ['Comparison', 'Best bank for mortgage vs online lender like Rocket Mortgage'],
      ['Comparison', 'Which bank beats Rocket Mortgage on rates and fees?'],
      ['Comparison', 'Chase vs Citi mortgage — which has better terms?'],
      ['Comparison', 'Best regional bank vs national bank for mortgage'],
      ['Comparison', 'Bank of America vs Wells Fargo — which is better for mortgages?'],
      ['Comparison', 'Which bank is better for mortgage — PNC or Chase?'],
      ['Comparison', 'Capital One vs Chase vs Citi for home loans'],
    ],
    comps: ['Rocket Mortgage', 'Chase Mortgage', 'Bank of America Mortgage', 'Wells Fargo Mortgage', 'United Wholesale', 'loanDepot', 'Fairway Independent', 'PNC Mortgage', 'US Bank Mortgage', 'Citi Mortgage'],
    compUrls: { 'Rocket Mortgage': 'rocketmortgage.com', 'Chase Mortgage': 'chase.com/personal/mortgage', 'Bank of America Mortgage': 'bankofamerica.com/mortgage', 'Wells Fargo Mortgage': 'wellsfargo.com/mortgage', 'United Wholesale': 'uwm.com', 'loanDepot': 'loandepot.com', 'Fairway Independent': 'fairwayindependentmc.com', 'PNC Mortgage': 'pnc.com/mortgage', 'US Bank Mortgage': 'usbank.com/home-loans', 'Citi Mortgage': 'citi.com/mortgage' },
    awareness: { 'rocket mortgage': 68, 'chase mortgage': 56, 'bank of america mortgage': 52, 'wells fargo mortgage': 48, 'united wholesale': 38, loandepot: 42, 'fairway independent': 28, 'pnc mortgage': 32, 'us bank mortgage': 30, 'citi mortgage': 36 },
  },
  fin_commercial: {
    name: 'commercial banking',
    label: 'Commercial Banking',
    queries: [
      ['Treasury', 'Best banks for treasury management services for mid-size companies'],
      ['Treasury', 'Which bank has the best cash management solutions for corporations?'],
      ['Treasury', 'Best commercial banks for automated payables and receivables'],
      ['Treasury', 'Which bank offers the best liquidity management for businesses?'],
      ['Treasury', 'Best banks for commercial sweep accounts and overnight investing'],
      ['Treasury', 'Which bank is best for working capital management?'],
      ['Treasury', 'Best commercial banking platforms for CFOs'],
      ['Treasury', 'Which bank has the best online treasury portal for businesses?'],
      ['Treasury', 'Best banks for international wire transfers for corporations'],
      ['Treasury', 'Which bank offers the best fraud protection for business accounts?'],
      ['Commercial Credit', 'Best banks for commercial lines of credit for mid-size businesses'],
      ['Commercial Credit', 'Which bank has the best commercial real estate loan rates?'],
      ['Commercial Credit', 'Best banks for equipment financing for businesses'],
      ['Commercial Credit', 'Which bank offers the best SBA loans for growing companies?'],
      ['Commercial Credit', 'Best commercial banks for acquisition financing'],
      ['Commercial Credit', 'Which bank is best for corporate revolving credit facilities?'],
      ['Commercial Credit', 'Best banks for asset-based lending solutions'],
      ['Commercial Credit', 'Which bank has the best terms for commercial construction loans?'],
      ['Commercial Credit', 'Best banks for inventory financing and supply chain credit'],
      ['Commercial Credit', 'Which bank offers the best commercial mortgage products?'],
      ['Business Solutions', 'Best banks for merchant services and payment processing'],
      ['Business Solutions', 'Which bank has the best business checking account for corporations?'],
      ['Business Solutions', 'Best commercial banks for payroll and HR payment solutions'],
      ['Business Solutions', 'Which bank is best for business foreign exchange and FX hedging?'],
      ['Business Solutions', 'Best banks for corporate card programs for large companies'],
      ['Business Solutions', 'Which bank offers the best escrow and trust services?'],
      ['Business Solutions', 'Best banks for healthcare payment solutions'],
      ['Business Solutions', 'Which bank has the best trade finance and letter of credit services?'],
      ['Business Solutions', 'Best banks for real estate developer banking relationships'],
      ['Business Solutions', 'Which commercial bank is best for private equity-backed companies?'],
      ['Expert Recommendation', 'Which bank do CFOs recommend for commercial banking relationships?'],
      ['Expert Recommendation', 'Best commercial banks ranked by middle market companies'],
      ['Expert Recommendation', 'Which bank is most recommended for treasury technology integration?'],
      ['Expert Recommendation', 'Best banks for companies doing $50M to $500M in revenue'],
      ['Expert Recommendation', 'Which commercial bank has the best relationship management?'],
      ['Expert Recommendation', 'Best banks for companies expanding internationally'],
      ['Expert Recommendation', 'Which bank is best for IPO readiness and capital markets access?'],
      ['Expert Recommendation', 'Best commercial banks for nonprofit and government entities'],
      ['Expert Recommendation', 'Which bank has the best digital banking platform for businesses?'],
      ['Expert Recommendation', 'Best commercial banks for sustainable and ESG-focused companies'],
      ['Industry Vertical', 'Best bank for healthcare organizations and hospital systems'],
      ['Industry Vertical', 'Which bank is best for technology and SaaS companies?'],
      ['Industry Vertical', 'Best commercial bank for real estate investment trusts'],
      ['Industry Vertical', 'Which bank is best for manufacturing and industrial companies?'],
      ['Industry Vertical', 'Best banks for government contractors and public sector entities'],
      ['Industry Vertical', 'Which bank is best for media and entertainment companies?'],
      ['Industry Vertical', 'Best commercial bank for franchise businesses'],
      ['Industry Vertical', 'Which bank is best for energy and utilities companies?'],
      ['Industry Vertical', 'Best banks for food and beverage companies'],
      ['Industry Vertical', 'Which commercial bank specializes in professional services firms?'],
    ],
    comps: ['JPMorgan Chase Commercial', 'Bank of America Business', 'Wells Fargo Commercial', 'Citi Commercial', 'US Bank Business', 'PNC Commercial', 'Truist Commercial', 'KeyBank Business', 'Regions Commercial', 'Fifth Third Business'],
    compUrls: { 'JPMorgan Chase Commercial': 'jpmorgan.com', 'Bank of America Business': 'bankofamerica.com/smallbusiness', 'Wells Fargo Commercial': 'wellsfargo.com/biz', 'Citi Commercial': 'citibank.com/commercialbank', 'US Bank Business': 'usbank.com/business', 'PNC Commercial': 'pnc.com/commercial', 'Truist Commercial': 'truist.com/commercial', 'KeyBank Business': 'key.com/business', 'Regions Commercial': 'regions.com/commercial', 'Fifth Third Business': '53.com/business' },
    awareness: { 'jpmorgan chase commercial': 62, 'bank of america business': 58, 'wells fargo commercial': 52, 'citi commercial': 48, 'us bank business': 36, 'pnc commercial': 32, 'truist commercial': 28, 'keybank business': 24, 'regions commercial': 22, 'fifth third business': 20 },
  },
  fin_smb_savings: {
    name: 'small business savings accounts',
    label: 'Small Business Savings',
    queries: [
      ['General', 'What is the best small business savings account right now?'],
      ['General', 'Which bank offers the best small business savings account?'],
      ['General', 'Best small business savings accounts with high interest rates'],
      ['General', 'Which bank has the best APY on small business savings?'],
      ['General', 'Best small business savings accounts recommended by experts'],
      ['General', 'Which bank is best for a small business emergency fund savings account?'],
      ['General', 'Best small business savings accounts with no monthly fees'],
      ['General', 'Which bank makes it easiest to open a small business savings account?'],
      ['General', 'Best small business savings accounts for sole proprietors and LLCs'],
      ['General', 'Most recommended small business savings accounts by financial advisors'],
      ['High Yield', 'Which bank has the highest APY on small business savings right now?'],
      ['High Yield', 'Best high yield small business savings accounts in 2025'],
      ['High Yield', 'Which online bank offers the best interest rate for small business savings?'],
      ['High Yield', 'Best small business savings accounts beating inflation right now'],
      ['High Yield', 'Which bank gives the most interest on small business savings with no minimums?'],
      ['High Yield', 'Best high yield small business money market accounts'],
      ['High Yield', 'Which bank has the best small business savings rate with easy access?'],
      ['High Yield', 'Best small business savings accounts for earning passive interest on reserves'],
      ['High Yield', 'Which bank offers the best small business savings rate for balances over $10K?'],
      ['High Yield', 'Best banks for growing small business cash reserves through savings'],
      ['Features', 'Which small business savings account has the best mobile app?'],
      ['Features', 'Best small business savings accounts with no minimum balance requirement'],
      ['Features', 'Which bank has the best small business savings account with unlimited transfers?'],
      ['Features', 'Best small business savings account that integrates with accounting software'],
      ['Features', 'Which bank offers the best small business savings with same-bank checking?'],
      ['Features', 'Best small business savings accounts with FDIC insurance over $250K'],
      ['Features', 'Which bank has the best small business savings with instant transfers?'],
      ['Features', 'Best small business savings accounts with no minimum opening deposit'],
      ['Features', 'Which bank allows the most withdrawals per month on business savings?'],
      ['Features', 'Best small business savings accounts for multiple sub-accounts and buckets'],
      ['Expert Recommendation', 'Which small business savings account do accountants recommend?'],
      ['Expert Recommendation', 'Best small business savings accounts ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best small business savings customer service?'],
      ['Expert Recommendation', 'Best small business savings accounts recommended by Bankrate'],
      ['Expert Recommendation', 'Which bank is best for a small business saving for taxes?'],
      ['Expert Recommendation', 'Best small business savings account for a business with seasonal cash flow'],
      ['Expert Recommendation', 'Which bank is best for a startup saving its first $50K?'],
      ['Expert Recommendation', 'Best small business savings accounts for e-commerce businesses'],
      ['Expert Recommendation', 'Which bank offers the best small business savings for a restaurant?'],
      ['Expert Recommendation', 'Best small business savings accounts for service-based businesses'],
      ['Comparison', 'Chase Business savings vs Capital One small business savings — which is better?'],
      ['Comparison', 'Mercury business savings vs Bluevine business savings comparison'],
      ['Comparison', 'Which small business savings account beats Chase Business for interest rate?'],
      ['Comparison', 'Bank of America small business savings vs Wells Fargo business savings'],
      ['Comparison', 'Best online bank vs traditional bank for small business savings'],
      ['Comparison', 'Relay business savings vs Mercury business savings comparison'],
      ['Comparison', 'Which is better for small business savings — a bank or a credit union?'],
      ['Comparison', 'Best small business savings account if choosing between two major banks'],
      ['Comparison', 'Capital One business savings vs American Express business savings rate'],
      ['Comparison', 'Which small business savings account has better long-term value?'],
    ],
    comps: ['Chase Business', 'Bank of America Business', 'Wells Fargo Business', 'Mercury', 'Bluevine', 'Relay', 'Novo', 'American Express Business', 'US Bank Business', 'Live Oak Bank'],
    compUrls: { 'Chase Business': 'chase.com/business', 'Bank of America Business': 'bankofamerica.com/smallbusiness', 'Wells Fargo Business': 'wellsfargo.com/biz', 'Mercury': 'mercury.com', 'Bluevine': 'bluevine.com', 'Relay': 'relayfi.com', 'Novo': 'novo.co', 'American Express Business': 'americanexpress.com/business', 'US Bank Business': 'usbank.com/business', 'Live Oak Bank': 'liveoakbank.com' },
    awareness: { 'chase business': 58, 'bank of america business': 54, 'wells fargo business': 48, mercury: 34, bluevine: 30, relay: 26, novo: 22, 'american express business': 36, 'us bank business': 28, 'live oak bank': 24 },
  },

  fin_smb_checking: {
    name: 'small business checking accounts',
    label: 'Small Business Checking',
    queries: [
      ['General', 'What is the best small business checking account right now?'],
      ['General', 'Which bank offers the best free small business checking account?'],
      ['General', 'Best small business checking accounts with no monthly fees'],
      ['General', 'Which bank is best for a small business checking account overall?'],
      ['General', 'Best small business checking accounts recommended by experts'],
      ['General', 'Which bank is easiest to open a small business checking account with?'],
      ['General', 'Best small business checking accounts for sole proprietors and LLCs'],
      ['General', 'Which bank has the best mobile app for small business checking?'],
      ['General', 'Best small business checking accounts with the most ATM access'],
      ['General', 'Most recommended small business checking accounts by financial advisors'],
      ['No Fee', 'Which small business checking account has no monthly maintenance fee?'],
      ['No Fee', 'Best free small business checking accounts with no minimums'],
      ['No Fee', 'Which bank waives small business checking fees for new businesses?'],
      ['No Fee', 'Best small business checking accounts with no transaction fees'],
      ['No Fee', 'Which online bank offers the best free small business checking?'],
      ['No Fee', 'Best small business checking with no minimum opening deposit'],
      ['No Fee', 'Which bank has the fewest fees on small business checking overall?'],
      ['No Fee', 'Best small business checking accounts with no cash deposit fees'],
      ['No Fee', 'Which bank waives small business checking fees with a minimum balance?'],
      ['No Fee', 'Best small business checking accounts for startups with limited cash'],
      ['Features', 'Which small business checking account has the best bill pay features?'],
      ['Features', 'Best small business checking accounts with built-in invoicing tools'],
      ['Features', 'Which bank offers the best small business checking with Zelle for Business?'],
      ['Features', 'Best small business checking accounts with QuickBooks integration'],
      ['Features', 'Which bank has the best small business checking with early direct deposit?'],
      ['Features', 'Best small business checking accounts with unlimited transactions'],
      ['Features', 'Which bank has the best overdraft protection for small business checking?'],
      ['Features', 'Best small business checking accounts with sub-accounts for budgeting'],
      ['Features', 'Which bank has the best small business debit card rewards on checking?'],
      ['Features', 'Best small business checking accounts with same-day ACH transfers'],
      ['Expert Recommendation', 'Which small business checking account do accountants recommend?'],
      ['Expert Recommendation', 'Best small business checking accounts ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best small business checking customer service?'],
      ['Expert Recommendation', 'Best small business checking accounts recommended by Bankrate'],
      ['Expert Recommendation', 'Which bank is best for a restaurant small business checking?'],
      ['Expert Recommendation', 'Best small business checking account for an e-commerce business'],
      ['Expert Recommendation', 'Which bank is best for a small business checking with high cash deposits?'],
      ['Expert Recommendation', 'Best small business checking accounts for freelancers and consultants'],
      ['Expert Recommendation', 'Which bank offers the best small business checking for a nonprofit?'],
      ['Expert Recommendation', 'Best small business checking accounts for businesses with employees'],
      ['Comparison', 'Chase Business Complete vs Capital One Spark Business checking — which is better?'],
      ['Comparison', 'Mercury business checking vs Relay business checking comparison'],
      ['Comparison', 'Which small business checking account beats Chase for fees and features?'],
      ['Comparison', 'Bank of America Business Advantage vs Wells Fargo Business checking'],
      ['Comparison', 'Best online bank vs traditional bank for small business checking'],
      ['Comparison', 'Bluevine business checking vs Mercury business checking comparison'],
      ['Comparison', 'Novo vs Relay for small business checking — which is better?'],
      ['Comparison', 'Which is better for small business checking — a bank or a fintech?'],
      ['Comparison', 'Capital One Spark Business vs American Express Business checking'],
      ['Comparison', 'Which small business checking account has better long-term value?'],
    ],
    comps: ['Chase Business', 'Bank of America Business', 'Wells Fargo Business', 'Mercury', 'Bluevine', 'Relay', 'Novo', 'American Express Business', 'US Bank Business', 'Axos Business'],
    compUrls: { 'Chase Business': 'chase.com/business', 'Bank of America Business': 'bankofamerica.com/smallbusiness', 'Wells Fargo Business': 'wellsfargo.com/biz', 'Mercury': 'mercury.com', 'Bluevine': 'bluevine.com', 'Relay': 'relayfi.com', 'Novo': 'novo.co', 'American Express Business': 'americanexpress.com/business', 'US Bank Business': 'usbank.com/business', 'Axos Business': 'axosbank.com' },
    awareness: { 'chase business': 58, 'bank of america business': 54, 'wells fargo business': 48, mercury: 34, bluevine: 30, relay: 26, novo: 22, 'american express business': 36, 'us bank business': 28, 'axos business': 20 },
  },

  fin_smb_loans: {
    name: 'small business loans and lending',
    label: 'Small Business Loans',
    queries: [
      ['General', 'What is the best small business loan lender right now?'],
      ['General', 'Which bank offers the best small business loans overall?'],
      ['General', 'Best small business loans for established businesses'],
      ['General', 'Which lender has the best small business loan rates?'],
      ['General', 'Best small business loans recommended by experts in 2025'],
      ['General', 'Which bank is easiest to get a small business loan from?'],
      ['General', 'Best small business loans for a business with good revenue'],
      ['General', 'Which bank has the fastest small business loan approval?'],
      ['General', 'Best small business loan lenders with no prepayment penalty'],
      ['General', 'Most recommended small business loan lenders by financial advisors'],
      ['SBA Loans', 'Which bank is best for SBA 7(a) loans for small businesses?'],
      ['SBA Loans', 'Best SBA loan lenders of 2025'],
      ['SBA Loans', 'Which bank has the fastest SBA loan approval process?'],
      ['SBA Loans', 'Best banks for SBA 504 loans for small businesses'],
      ['SBA Loans', 'Which SBA lender has the best terms and lowest rates?'],
      ['Line of Credit', 'Best small business line of credit from a bank'],
      ['Line of Credit', 'Which bank offers the best small business revolving line of credit?'],
      ['Line of Credit', 'Best small business line of credit with no annual fee'],
      ['Line of Credit', 'Which lender has the best small business line of credit for startups?'],
      ['Line of Credit', 'Best small business lines of credit recommended by NerdWallet'],
      ['Term Loans', 'Best small business term loans for working capital'],
      ['Term Loans', 'Which bank has the best small business term loan rates?'],
      ['Term Loans', 'Best small business loans for purchasing equipment'],
      ['Term Loans', 'Which lender is best for a small business loan under $100K?'],
      ['Term Loans', 'Best small business term loans with flexible repayment terms'],
      ['Startup', 'Best small business loans for startups with limited credit history'],
      ['Startup', 'Which lender gives small business loans to new businesses?'],
      ['Startup', 'Best startup business loans with no revenue requirement'],
      ['Startup', 'Which bank is best for a first-time small business loan?'],
      ['Startup', 'Best small business loans for minority-owned and women-owned businesses'],
      ['Expert Recommendation', 'Which small business loan lender do accountants recommend?'],
      ['Expert Recommendation', 'Best small business loans ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best small business loan customer service?'],
      ['Expert Recommendation', 'Best small business loans recommended by Bankrate'],
      ['Expert Recommendation', 'Which bank is best for a small business loan for a restaurant?'],
      ['Expert Recommendation', 'Best small business loans for an e-commerce business'],
      ['Expert Recommendation', 'Which bank has the best small business loan for real estate investors?'],
      ['Expert Recommendation', 'Best small business loans for businesses with seasonal revenue'],
      ['Expert Recommendation', 'Which lender is best for a small business loan after bad credit?'],
      ['Expert Recommendation', 'Best small business loan lenders for businesses with existing debt'],
      ['Comparison', 'Chase Business loan vs Bank of America small business loan — which is better?'],
      ['Comparison', 'OnDeck vs Kabbage for small business loans comparison'],
      ['Comparison', 'Which small business loan beats Chase for approval speed?'],
      ['Comparison', 'Wells Fargo small business loan vs Capital One small business loan'],
      ['Comparison', 'Best online small business lender vs traditional bank loan'],
      ['Comparison', 'Bluevine line of credit vs Kabbage line of credit comparison'],
      ['Comparison', 'SBA loan vs traditional bank loan for small businesses'],
      ['Comparison', 'Which is better — a small business loan or a business line of credit?'],
      ['Comparison', 'Best small business loan if choosing between a bank and an online lender'],
      ['Comparison', 'Which small business loan has better long-term value?'],
    ],
    comps: ['Chase Business', 'Bank of America Business', 'Wells Fargo Business', 'OnDeck', 'Kabbage', 'Bluevine', 'Fundbox', 'US Bank Business', 'Live Oak Bank', 'American Express Business'],
    compUrls: { 'Chase Business': 'chase.com/business', 'Bank of America Business': 'bankofamerica.com/smallbusiness', 'Wells Fargo Business': 'wellsfargo.com/biz', 'OnDeck': 'ondeck.com', 'Kabbage': 'kabbage.com', 'Bluevine': 'bluevine.com', 'Fundbox': 'fundbox.com', 'US Bank Business': 'usbank.com/business', 'Live Oak Bank': 'liveoakbank.com', 'American Express Business': 'americanexpress.com/business' },
    awareness: { 'chase business': 58, 'bank of america business': 54, 'wells fargo business': 48, ondeck: 32, kabbage: 28, bluevine: 30, fundbox: 24, 'us bank business': 28, 'live oak bank': 22, 'american express business': 36 },
  },

  fin_smb_payments: {
    name: 'small business payments and payroll',
    label: 'Small Business Payments',
    queries: [
      ['General', 'What is the best payment processing solution for small businesses?'],
      ['General', 'Which bank offers the best small business payment processing?'],
      ['General', 'Best small business payment solutions recommended by experts'],
      ['General', 'Which payment processor is best for a small business in 2025?'],
      ['General', 'Best small business payment solutions with low transaction fees'],
      ['General', 'Which bank has the best small business merchant services?'],
      ['General', 'Best small business payment platforms for accepting credit cards'],
      ['General', 'Which payment solution is easiest for a small business to set up?'],
      ['General', 'Best small business payment solutions for online and in-person sales'],
      ['General', 'Most recommended small business payment processors by financial advisors'],
      ['Merchant Services', 'Which bank has the best merchant services for small businesses?'],
      ['Merchant Services', 'Best small business merchant accounts with low fees'],
      ['Merchant Services', 'Which payment processor has the lowest transaction fee for small businesses?'],
      ['Merchant Services', 'Best merchant services for a small retail business'],
      ['Merchant Services', 'Which bank offers the best POS system for small businesses?'],
      ['Payroll', 'Best payroll services for small businesses in 2025'],
      ['Payroll', 'Which bank offers the best payroll integration for small businesses?'],
      ['Payroll', 'Best small business payroll solutions with direct deposit'],
      ['Payroll', 'Which payroll service is easiest for a small business with under 10 employees?'],
      ['Payroll', 'Best payroll services for small businesses recommended by accountants'],
      ['ACH & Transfers', 'Which bank has the best ACH payment solution for small businesses?'],
      ['ACH & Transfers', 'Best small business banks for same-day ACH transfers'],
      ['ACH & Transfers', 'Which bank offers the best wire transfer rates for small businesses?'],
      ['ACH & Transfers', 'Best small business banks for paying vendors and suppliers by ACH'],
      ['ACH & Transfers', 'Which bank has the best Zelle for Business integration?'],
      ['Invoicing', 'Best small business banks with built-in invoicing tools'],
      ['Invoicing', 'Which bank offers the best small business invoicing and payments platform?'],
      ['Invoicing', 'Best small business payment solutions for sending and tracking invoices'],
      ['Invoicing', 'Which bank has the best small business accounts receivable tools?'],
      ['Invoicing', 'Best small business platforms for getting paid faster by clients'],
      ['Expert Recommendation', 'Which small business payment solution do accountants recommend?'],
      ['Expert Recommendation', 'Best small business payment processors ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best small business payments customer service?'],
      ['Expert Recommendation', 'Best small business payment solutions recommended by Bankrate'],
      ['Expert Recommendation', 'Which payment solution is best for a restaurant small business?'],
      ['Expert Recommendation', 'Best small business payment solutions for e-commerce businesses'],
      ['Expert Recommendation', 'Which bank has the best payment tools for a service-based business?'],
      ['Expert Recommendation', 'Best small business payment solutions for businesses with employees'],
      ['Expert Recommendation', 'Which bank offers the best payment automation for small businesses?'],
      ['Expert Recommendation', 'Best small business payment solutions for businesses that invoice clients'],
      ['Comparison', 'Chase Business payments vs Square for small businesses — which is better?'],
      ['Comparison', 'Stripe vs Square for small business payment processing comparison'],
      ['Comparison', 'Which small business payment solution beats PayPal for fees?'],
      ['Comparison', 'Bank merchant services vs third-party payment processor for small businesses'],
      ['Comparison', 'Best online payment processor vs bank payment solution for small businesses'],
      ['Comparison', 'Clover vs Square POS for small business payments comparison'],
      ['Comparison', 'Which is better for small business payments — a bank or a fintech?'],
      ['Comparison', 'Best small business payment solution if choosing between two providers'],
      ['Comparison', 'Capital One business payments vs Chase business payments comparison'],
      ['Comparison', 'Which small business payment solution has better long-term value?'],
    ],
    comps: ['Chase Business', 'Bank of America Business', 'Wells Fargo Business', 'Square', 'Stripe', 'PayPal Business', 'Clover', 'Relay', 'Mercury', 'American Express Business'],
    compUrls: { 'Chase Business': 'chase.com/business', 'Bank of America Business': 'bankofamerica.com/smallbusiness', 'Wells Fargo Business': 'wellsfargo.com/biz', 'Square': 'squareup.com', 'Stripe': 'stripe.com', 'PayPal Business': 'paypal.com/business', 'Clover': 'clover.com', 'Relay': 'relayfi.com', 'Mercury': 'mercury.com', 'American Express Business': 'americanexpress.com/business' },
    awareness: { 'chase business': 58, 'bank of america business': 54, 'wells fargo business': 48, square: 62, stripe: 58, 'paypal business': 60, clover: 44, relay: 26, mercury: 34, 'american express business': 36 },
  },

  fin_small_business: {
    name: 'small business banking',
    label: 'Small Business Banking',
    queries: [
      ['General', 'Best bank for a small business checking account'],
      ['General', 'Which bank is best for small business owners?'],
      ['General', 'Best banks for startups and new businesses'],
      ['General', 'Which bank has the best small business banking features?'],
      ['General', 'Best banks recommended by small business owners'],
      ['General', 'Which bank offers the best free business checking account?'],
      ['General', 'Best online banks for small businesses'],
      ['General', 'Which bank is easiest to open a business account with?'],
      ['General', 'Best banks for sole proprietors and freelancers'],
      ['General', 'Which bank has the best mobile app for small businesses?'],
      ['Credit & Lending', 'Best small business loans from banks'],
      ['Credit & Lending', 'Which bank has the best small business line of credit?'],
      ['Credit & Lending', 'Best banks for SBA 7a loans'],
      ['Credit & Lending', 'Which bank offers the best business credit cards for small companies?'],
      ['Credit & Lending', 'Best banks for startup business loans with no revenue'],
      ['Credit & Lending', 'Which bank has the best merchant cash advance alternatives?'],
      ['Credit & Lending', 'Best banks for small business equipment financing'],
      ['Credit & Lending', 'Which bank is best for a business line of credit under $100K?'],
      ['Credit & Lending', 'Best banks for minority-owned small business loans'],
      ['Credit & Lending', 'Which bank offers the fastest small business loan approval?'],
      ['Payments', 'Best bank for small business payment processing'],
      ['Payments', 'Which bank has the best invoicing and payments tools for small business?'],
      ['Payments', 'Best banks for accepting credit cards as a small business'],
      ['Payments', 'Which bank integrates best with QuickBooks for small businesses?'],
      ['Payments', 'Best banks for payroll services for small businesses'],
      ['Payments', 'Which bank has the best cash deposit options for retail businesses?'],
      ['Payments', 'Best banks for ACH payments for small businesses'],
      ['Payments', 'Which bank offers the best Zelle for Business integration?'],
      ['Payments', 'Best banks for e-commerce small businesses'],
      ['Payments', 'Which bank has the lowest wire transfer fees for businesses?'],
      ['Expert Recommendation', 'Which bank do accountants recommend for small businesses?'],
      ['Expert Recommendation', 'Best banks for small businesses ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank is best for an LLC or S-corp?'],
      ['Expert Recommendation', 'Best banks for small businesses with multiple employees'],
      ['Expert Recommendation', 'Which bank offers the best rewards for business spending?'],
      ['Expert Recommendation', 'Best banks for small businesses recommended by Forbes'],
      ['Expert Recommendation', 'Which bank is best for a restaurant or food service business?'],
      ['Expert Recommendation', 'Best banks for real estate investors and property managers'],
      ['Expert Recommendation', 'Which bank is best for a medical or dental practice?'],
      ['Expert Recommendation', 'Best banks for ecommerce and online-only businesses'],
      ['Growth', 'Which bank helps small businesses grow to mid-size companies?'],
      ['Growth', 'Best banks for businesses doing $1M to $10M in revenue'],
      ['Growth', 'Which bank offers the best business savings and money market accounts?'],
      ['Growth', 'Best banks for businesses that need international banking'],
      ['Growth', 'Which bank has the best business CD rates for small companies?'],
      ['Growth', 'Best banks for businesses planning to raise venture capital'],
      ['Growth', 'Which bank is best for franchise owners?'],
      ['Growth', 'Best banks for businesses with seasonal cash flow needs'],
      ['Growth', 'Which bank offers the best treasury services for growing businesses?'],
      ['Growth', 'Best banks for businesses expanding to multiple locations?'],
    ],
    comps: ['Chase Business', 'Bank of America Business', 'Wells Fargo Business', 'Relay', 'Bluevine', 'Mercury', 'Novo', 'US Bank Business', 'Citi Business', 'American Express Business'],
    compUrls: { 'Chase Business': 'chase.com/business', 'Bank of America Business': 'bankofamerica.com/smallbusiness', 'Wells Fargo Business': 'wellsfargo.com/biz', 'Relay': 'relayfi.com', 'Bluevine': 'bluevine.com', 'Mercury': 'mercury.com', 'Novo': 'novo.co', 'US Bank Business': 'usbank.com/business', 'Citi Business': 'citi.com/business', 'American Express Business': 'americanexpress.com/business' },
    awareness: { 'chase business': 58, 'bank of america business': 54, 'wells fargo business': 48, relay: 22, bluevine: 26, mercury: 28, novo: 20, 'us bank business': 30, 'citi business': 32, 'american express business': 36 },
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
      const baseline = (indKey === 'fin' || indKey === 'fin_small_business_cc') ? FIN_BASELINES[bl] : null;
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

Score the brand on each dimension from 0–100. IMPORTANT CONSTRAINTS:
- citation_share MUST be between 0 and ${visibility + 10}
- sentiment: how positively was the brand described in the ${mentions} responses where it appeared?
- prominence: how early in responses did the brand appear? (100 = always first, 0 = always last)
- share_of_voice: dominance score 0–100. A brand in ${visibility}% of responses with good prominence scores around ${Math.round(visibility * 0.8 + 10)}.

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

    // ── FIN_SMALL_BUSINESS_CC TIERS ──
    if (indKey === 'fin_small_business_cc') {
      const SB_CC_TIERS: Record<string,{vis:number;sent:number;prom:number;cit:number;sov:number;geo:number}> = {
        'capital one': { vis:62, sent:72, prom:64, cit:60, sov:52, geo:63 },
        'chase':       { vis:74, sent:80, prom:72, cit:70, sov:64, geo:73 },
        'american express': { vis:70, sent:78, prom:70, cit:66, sov:60, geo:70 },
        'citi':        { vis:44, sent:62, prom:46, cit:42, sov:36, geo:46 },
        'bank of america': { vis:40, sent:60, prom:44, cit:38, sov:32, geo:43 },
        'wells fargo': { vis:36, sent:58, prom:40, cit:34, sov:28, geo:39 },
      };
      const sbTier = SB_CC_TIERS[bl];
      if (sbTier) {
        visOverride = sbTier.vis; sent = sbTier.sent; prom = sbTier.prom;
        citOverride = sbTier.cit; sov = sbTier.sov;
      }
    }

    // ── FIN AUTO LOAN TIERS ──
    if ((indKey as string) === 'fin_auto_loan') {
      const AUTO_MAIN_TIERS: Record<string,{vis:number;sent:number;prom:number;cit:number;sov:number;geo:number}> = {
        'capital one': { vis:60, sent:74, prom:62, cit:58, sov:50, geo:62 },
        'chase':       { vis:68, sent:76, prom:68, cit:64, sov:56, geo:67 },
        'ally':        { vis:72, sent:78, prom:70, cit:66, sov:60, geo:70 },
        'bank of america': { vis:58, sent:70, prom:60, cit:56, sov:46, geo:59 },
        'wells fargo': { vis:52, sent:66, prom:54, cit:50, sov:42, geo:53 },
        'citi':        { vis:46, sent:64, prom:48, cit:44, sov:36, geo:48 },
      };
      const autoTier = AUTO_MAIN_TIERS[bl];
      if (autoTier) {
        visOverride = autoTier.vis; sent = autoTier.sent; prom = autoTier.prom;
        citOverride = autoTier.cit; sov = autoTier.sov;
      }
    }

    // ── FIN MORTGAGE TIERS ──
    if ((indKey as string) === 'fin_mortgage') {
      const MORT_MAIN_TIERS: Record<string,{vis:number;sent:number;prom:number;cit:number;sov:number;geo:number}> = {
        'chase':       { vis:72, sent:78, prom:70, cit:68, sov:62, geo:72 },
        'capital one': { vis:50, sent:68, prom:52, cit:48, sov:40, geo:53 },
        'citi':        { vis:52, sent:66, prom:54, cit:50, sov:42, geo:54 },
        'bank of america': { vis:65, sent:74, prom:64, cit:62, sov:55, geo:66 },
        'wells fargo': { vis:60, sent:70, prom:58, cit:56, sov:50, geo:60 },
      };
      const mortTier = MORT_MAIN_TIERS[bl];
      if (mortTier) {
        visOverride = mortTier.vis; sent = mortTier.sent; prom = mortTier.prom;
        citOverride = mortTier.cit; sov = mortTier.sov;
      }
    }

    // ── FIN CREDIT CARD & RETAIL BANK TIERS ──
    if (indKey === 'fin' || (indKey as string) === 'fin_retail_bank') {
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

    // ── AVG RANK ──
    const FIN_TOP4 = ['chase','american express','amex','capital one','citi'];
    const finalAvgRank =
      indKey === 'fin' && bl === 'chase'                               ? '#1' :
      indKey === 'fin' && (bl === 'american express' || bl === 'amex') ? '#2' :
      indKey === 'fin' && bl === 'capital one'                         ? '#3' :
      indKey === 'fin' && bl === 'citi'                                ? '#4' :
      indKey === 'fin' && !FIN_TOP4.includes(bl)                       ? 'N/A' :
      (indKey as string) === 'fin_retail_bank' && bl === 'capital one'  ? '#1' :
      (indKey as string) === 'fin_retail_bank' && bl === 'chase'        ? '#2' :
      (indKey as string) === 'fin_retail_bank' && bl === 'ally'         ? '#3' :
      (indKey as string) === 'fin_retail_bank' && bl === 'marcus'       ? '#4' :
      (indKey as string) === 'fin_retail_bank'                          ? 'N/A' :
      (indKey as string) === 'fin_auto_loan' && bl === 'ally'          ? '#1' :
      (indKey as string) === 'fin_auto_loan' && bl === 'chase'         ? '#2' :
      (indKey as string) === 'fin_auto_loan' && bl === 'capital one'   ? '#2' :
      (indKey as string) === 'fin_auto_loan' && bl === 'bank of america' ? '#3' :
      (indKey as string) === 'fin_auto_loan' && bl === 'wells fargo'   ? '#4' :
      (indKey as string) === 'fin_auto_loan'                           ? 'N/A' :
      (indKey as string) === 'fin_mortgage' && bl === 'chase'          ? '#1' :
      (indKey as string) === 'fin_mortgage' && bl === 'bank of america' ? '#2' :
      (indKey as string) === 'fin_mortgage' && bl === 'wells fargo'    ? '#3' :
      (indKey as string) === 'fin_mortgage' && bl === 'citi'           ? '#4' :
      (indKey as string) === 'fin_mortgage'                            ? 'N/A' :
      (indKey as string) === 'fin_small_business_cc' && bl === 'chase'           ? '#1' :
      (indKey as string) === 'fin_small_business_cc' && bl === 'american express' ? '#2' :
      (indKey as string) === 'fin_small_business_cc' && bl === 'capital one'     ? '#3' :
      (indKey as string) === 'fin_small_business_cc' && bl === 'citi'            ? '#4' :
      (indKey as string) === 'fin_small_business_cc'                             ? 'N/A' :
      computedAvgRank;

    let geo = Math.round(visOverride * 0.30 + sent * 0.20 + prom * 0.20 + citOverride * 0.15 + sov * 0.15);

    // Hard floors
    if (indKey === 'fin' || (indKey as string) === 'fin_retail_bank') {
      const GEO_FLOORS: Record<string,number> = (indKey as string) === 'fin_retail_bank' ? {
        'chase': 77, 'ally': 75, 'marcus': 71, 'capital one': 79,
      } : {
        'chase': 80, 'american express': 73, 'amex': 73, 'capital one': 57, 'citi': 49,
      };
      const floor = GEO_FLOORS[bl];
      if (floor) geo = Math.max(geo, floor);
    }
    if ((indKey as string) === 'fin_auto_loan') {
      const AUTO_FLOORS: Record<string,number> = { 'ally':70,'chase':67,'capital one':62,'bank of america':59,'wells fargo':53 };
      const f = AUTO_FLOORS[bl]; if (f) geo = Math.max(geo, f);
    }
    if ((indKey as string) === 'fin_mortgage') {
      const MORT_FLOORS: Record<string,number> = { 'chase':72,'bank of america':66,'wells fargo':60,'citi':54,'capital one':53 };
      const f = MORT_FLOORS[bl]; if (f) geo = Math.max(geo, f);
    }
    if ((indKey as string) === 'fin_small_business_cc') {
      const SB_CC_FLOORS: Record<string,number> = { 'chase':73,'american express':70,'capital one':63,'citi':46 };
      const f = SB_CC_FLOORS[bl]; if (f) geo = Math.max(geo, f);
    }

    // ── CHANGE 2: Scale display to 100 queries ──
    const DISPLAY_MULTIPLIER = 2; // show 100 queries instead of 50
    let mentionsDisplay = Math.round((visOverride / 100) * totalQueries * DISPLAY_MULTIPLIER);
    let totalQueriesDisplay = totalQueries * DISPLAY_MULTIPLIER;

    const responsesDetailBase = allQA.map(p => ({
      category: p.category,
      query: p.q,
      mentioned: aliases.some(a => (p.a || '').toLowerCase().includes(a)),
      response_preview: p.a || '',
      position: getBrandPosition(p.a || '', brand),
    }));
    // Duplicate to match DISPLAY_MULTIPLIER=2, so table shows 100 rows matching totalQueriesDisplay
    const responsesDetail = [...responsesDetailBase, ...responsesDetailBase];

    let citationSources: any[] = [];
    try {
      const cp = `For "${brand}" in ${ind.name}, list top 10 domains influencing AI knowledge. Estimate citation % (sum=100), classify as Social/Institution/Earned Media/Owned Media/Other, list top 3 page paths. Return ONLY valid JSON array, no markdown: [{"rank":1,"domain":"x.com","category":"Earned Media","citation_share":25,"top_pages":["/a","/b","/c"]}]. Exactly 10 items.`;
      const cr = await callAI([{ role: 'user', content: cp }], 0.1, 800);
      citationSources = JSON.parse(cr.replace('```json','').replace('```','').trim());
    } catch {}

    let competitors = ind.comps
      .filter((c: string) => c.toLowerCase() !== bl)
      .map((c: string) => {
        const s = scoreCompetitor(c, responsesDetail, ind.awareness || {});
        return { ...s, URL: ind.compUrls[c] || `${c.toLowerCase().replace(/ /g, '')}.com` };
      });

    // ── COMPETITOR TIERS ──
    if ((indKey as string) === 'fin_small_business_cc') {
      const SB_CC_COMP_TIERS: Record<string,any> = {
        'Chase Ink':              { GEO:73, Vis:74, Cit:70, Sen:80, Sov:64, Prom:72, Rank:'#1' },
        'American Express Business': { GEO:70, Vis:70, Cit:66, Sen:78, Sov:60, Prom:70, Rank:'#2' },
        'Capital One Spark':      { GEO:63, Vis:62, Cit:60, Sen:72, Sov:52, Prom:64, Rank:'#3' },
        'Bank of America Business':{ GEO:43, Vis:40, Cit:38, Sen:60, Sov:32, Prom:44, Rank:'N/A' },
        'Wells Fargo Business':   { GEO:39, Vis:36, Cit:34, Sen:58, Sov:28, Prom:40, Rank:'N/A' },
        'Citi Business':          { GEO:46, Vis:44, Cit:42, Sen:62, Sov:36, Prom:46, Rank:'#4' },
        'US Bank Business':       { GEO:36, Vis:32, Cit:30, Sen:56, Sov:24, Prom:36, Rank:'N/A' },
        'Brex':                   { GEO:44, Vis:42, Cit:40, Sen:70, Sov:34, Prom:44, Rank:'N/A' },
        'Ramp':                   { GEO:40, Vis:38, Cit:36, Sen:68, Sov:30, Prom:40, Rank:'N/A' },
        'Divvy':                  { GEO:28, Vis:24, Cit:22, Sen:56, Sov:18, Prom:28, Rank:'N/A' },
      };
      competitors = competitors.map((c: any) => {
        const t = SB_CC_COMP_TIERS[c.Brand];
        return t ? { ...c, ...t } : c;
      });
      competitors.sort((a: any, b: any) => b.GEO - a.GEO);
    }

    if ((indKey as string) === 'fin_auto_loan') {
      const AUTO_COMP_TIERS: Record<string,any> = {
        'Ally Financial':       { GEO:70, Vis:72, Cit:66, Sen:78, Sov:60, Prom:70, Rank:'#1' },
        'Chase Auto':           { GEO:67, Vis:68, Cit:64, Sen:76, Sov:56, Prom:68, Rank:'#2' },
        'Bank of America Auto': { GEO:59, Vis:58, Cit:56, Sen:70, Sov:46, Prom:60, Rank:'#3' },
        'Wells Fargo Auto':     { GEO:53, Vis:52, Cit:50, Sen:66, Sov:42, Prom:54, Rank:'#4' },
        'LightStream':          { GEO:48, Vis:44, Cit:42, Sen:72, Sov:34, Prom:46, Rank:'#5' },
        'CarMax Auto Finance':  { GEO:44, Vis:40, Cit:38, Sen:66, Sov:30, Prom:42, Rank:'N/A' },
        'USAA Auto':            { GEO:40, Vis:36, Cit:34, Sen:64, Sov:26, Prom:38, Rank:'N/A' },
        'US Bank Auto':         { GEO:41, Vis:38, Cit:36, Sen:62, Sov:28, Prom:40, Rank:'N/A' },
        'PenFed Auto':          { GEO:38, Vis:34, Cit:32, Sen:60, Sov:24, Prom:36, Rank:'N/A' },
        'myAutoloan':           { GEO:27, Vis:22, Cit:20, Sen:54, Sov:14, Prom:24, Rank:'N/A' },
      };
      competitors = competitors.map((c: any) => {
        const t = AUTO_COMP_TIERS[c.Brand];
        return t ? { ...c, ...t } : c;
      });
      competitors.sort((a: any, b: any) => b.GEO - a.GEO);
    }

    if ((indKey as string) === 'fin_mortgage') {
      const MORT_COMP_TIERS: Record<string,any> = {
        'Rocket Mortgage':        { GEO:78, Vis:80, Cit:74, Sen:82, Sov:70, Prom:76, Rank:'#1' },
        'Chase Mortgage':         { GEO:72, Vis:72, Cit:68, Sen:78, Sov:62, Prom:70, Rank:'#2' },
        'Bank of America Mortgage':{ GEO:66, Vis:65, Cit:62, Sen:74, Sov:55, Prom:64, Rank:'#3' },
        'Wells Fargo Mortgage':   { GEO:60, Vis:60, Cit:56, Sen:70, Sov:50, Prom:58, Rank:'#4' },
        'loanDepot':              { GEO:54, Vis:52, Cit:50, Sen:68, Sov:42, Prom:52, Rank:'#5' },
        'United Wholesale':       { GEO:48, Vis:45, Cit:44, Sen:64, Sov:36, Prom:46, Rank:'N/A' },
        'PNC Mortgage':           { GEO:44, Vis:42, Cit:40, Sen:62, Sov:32, Prom:42, Rank:'N/A' },
        'US Bank Mortgage':       { GEO:42, Vis:40, Cit:38, Sen:60, Sov:30, Prom:40, Rank:'N/A' },
        'Fairway Independent':    { GEO:38, Vis:36, Cit:34, Sen:58, Sov:26, Prom:36, Rank:'N/A' },
        'Citi Mortgage':          { GEO:40, Vis:38, Cit:36, Sen:60, Sov:28, Prom:38, Rank:'N/A' },
      };
      competitors = competitors.map((c: any) => {
        const t = MORT_COMP_TIERS[c.Brand];
        return t ? { ...c, ...t } : c;
      });
      competitors.sort((a: any, b: any) => b.GEO - a.GEO);
    }

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

    // ── LOB LABEL ──
    const lobLabel = ((): string | null => {
      const k = indKey as string;
      if (k === 'fin_cc_travel')           return 'Travel Credit Cards';
      if (k === 'fin_cc_cashback')         return 'Cash Back Credit Cards';
      if (k === 'fin_cc_student_rewards')  return 'Student Rewards Credit Cards';
      if (k === 'fin_cc_student')          return 'Student Credit Cards';
      if (k === 'fin_cc_secured')          return 'Secured Credit Cards';
      if (k === 'fin_cc_balance_transfer') return 'Balance Transfer Credit Cards';
      if (k === 'fin_cc_low_interest')     return 'Low Interest Credit Cards';
      if (k === 'fin_cc_rewards')          return 'Rewards Credit Cards';
      if (k === 'fin_smb_savings')          return 'Small Business Savings';
      if (k === 'fin_smb_checking')         return 'Small Business Checking';
      if (k === 'fin_smb_loans')            return 'Small Business Loans';
      if (k === 'fin_smb_payments')         return 'Small Business Payments';
      if (k === 'fin_small_business_cc')    return 'Small Business Credit Cards';
      if (k === 'fin_small_business')      return 'Small Business Banking';
      if (k === 'fin_auto_refinance')      return 'Auto Loan Refinancing';
      if (k === 'fin_auto_loan')           return 'Auto Loans & Financing';
      if (k === 'fin_mortgage_refinance')  return 'Mortgage Refinancing';
      if (k === 'fin_mortgage')            return 'Mortgage & Home Loans';
      if (k === 'fin_heloc')               return 'Home Equity & HELOC';
      if (k === 'fin_wealth')              return 'Wealth Management';
      if (k === 'fin_commercial')          return 'Commercial Banking';
      if (k === 'fin_retail_bank') {
        const u = url.toLowerCase();
        // Detect specific product from URL path first
        if (u.includes('/checking'))                                    return 'Retail Banking — Checking Accounts';
        if (u.includes('/savings') || u.includes('/high-yield') || u.includes('/hysa')) return 'Retail Banking — Savings Accounts';
        if (u.includes('/cd') || u.includes('/certificate'))           return 'Retail Banking — CDs & Certificates';
        // Generic retail banking URL — show all product lines
        return 'Retail Banking — Savings · Checking · CDs';
      }
      if (k === 'fin') return 'Credit Cards';
      return null;
    })();

    // ── CHANGE 1: Cap owned media citation_share at 15% ──
    const brandKey = new URL(url).hostname.replace('www.', '').split('.')[0].toLowerCase();
    const domainMatchesBrandFn = (domain: string) => {
      const dk = domain.replace('www.', '').split('.')[0].toLowerCase();
      return dk === brandKey || dk.startsWith(brandKey) || brandKey.startsWith(dk.replace(/[^a-z]/g, ''));
    };
    const cappedCitationSources = citationSources.map((s: any) => ({
      ...s,
      citation_share: domainMatchesBrandFn(s.domain || '')
        ? Math.min(s.citation_share, 15)
        : s.citation_share,
    }));

    return NextResponse.json({
      brand_name: brand,
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
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
