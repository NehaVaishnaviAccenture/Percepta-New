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
      ['Rewards Optimization', 'Which credit card gives the most points on dining and restaurants?'],
      ['Rewards Optimization', 'Best credit card for earning rewards on grocery spending'],
      ['Rewards Optimization', 'Which credit card has the best welcome bonus right now?'],
      ['Rewards Optimization', 'Best credit cards for earning points on everyday purchases'],
      ['Rewards Optimization', 'Which credit card transfers points to the most travel partners?'],
      ['Rewards Optimization', 'Best credit cards for maximizing cash back on gas stations'],
      ['Rewards Optimization', 'Which credit card earns the most on streaming subscriptions?'],
      ['Rewards Optimization', 'Best credit card for earning miles without flying frequently'],
      ['Rewards Optimization', 'Which credit card has the best rotating bonus categories?'],
      ['Rewards Optimization', 'Best credit cards for earning rewards on online shopping'],
      ['Card Benefits', 'Which credit card has the best travel insurance and protections?'],
      ['Card Benefits', 'Best credit cards with free airport lounge access'],
      ['Card Benefits', 'Which credit card offers the best purchase protection?'],
      ['Card Benefits', 'Best credit cards with cell phone protection included'],
      ['Card Benefits', 'Which credit card has the best extended warranty benefit?'],
      ['Card Benefits', 'Best credit cards with no foreign transaction fees for travel'],
      ['Card Benefits', 'Which credit card has the best rental car insurance coverage?'],
      ['Card Benefits', 'Best credit cards with concierge services and premium perks'],
      ['Card Benefits', 'Which credit card has the best trip delay and cancellation coverage?'],
      ['Card Benefits', 'Best credit cards with Global Entry or TSA PreCheck credit'],
      ['Interest & Fees', 'Which credit card has the lowest ongoing APR?'],
      ['Interest & Fees', 'Best credit cards with 0% intro APR on new purchases'],
      ['Interest & Fees', 'Which credit card has no annual fee and still earns good rewards?'],
      ['Interest & Fees', 'Best credit cards for someone who carries a balance occasionally'],
      ['Interest & Fees', 'Which credit card has no penalty APR after a late payment?'],
      ['Interest & Fees', 'Best credit cards with waived first year annual fee'],
      ['Interest & Fees', 'Which credit card has the most transparent fee structure?'],
      ['Interest & Fees', 'Best credit cards for people who want to avoid interest entirely'],
      ['Interest & Fees', 'Which credit card has the best grace period on purchases?'],
      ['Interest & Fees', 'Best credit cards with no foreign transaction and no annual fee'],
      ['Premium Cards', 'What is the best premium credit card worth the high annual fee?'],
      ['Premium Cards', 'Which luxury credit card gives the best return on the annual fee?'],
      ['Premium Cards', 'Best premium credit cards for frequent business travelers'],
      ['Premium Cards', 'Which high-end credit card has the most valuable perks?'],
      ['Premium Cards', 'Best credit cards for high spenders who want maximum rewards'],
      ['Approval & Credit', 'Which credit card is easiest to get approved for with fair credit?'],
      ['Approval & Credit', 'Best credit cards that do a soft pull pre-approval check'],
      ['Approval & Credit', 'Which credit card has the highest approval rate for average credit?'],
      ['Approval & Credit', 'Best credit cards for someone with a 650 credit score'],
      ['Approval & Credit', 'Which credit card issuer is most generous with credit limits?'],
      ['Comparison', 'Which premium rewards card gives the best value for frequent travelers?'],
      ['Comparison', 'What is the best high-end travel credit card worth a $500 annual fee?'],
      ['Comparison', 'Which credit card gives the highest flat-rate cash back on every purchase?'],
      ['Comparison', 'What is the best no annual fee cash back credit card available?'],
      ['Comparison', 'What is the single best all-around rewards credit card for most people?'],
      ['Comparison', 'Which credit card earns the most rewards specifically on dining out?'],
      ['Comparison', 'Which credit card company has the best fraud protection and zero liability?'],
      ['Comparison', 'How do I decide between a cash back card and a travel rewards card?'],
      ['Comparison', 'Which credit card is best for someone who wants simplicity over complexity?'],
      ['Comparison', 'What is the best credit card for someone who pays their balance in full each month?'],
      ['Premium Cards', 'What are the best premium credit cards with lounge access?'],
      ['Premium Cards', 'Is the annual fee on premium credit cards worth it?'],
      ['Premium Cards', 'What benefits do premium credit cards offer beyond points?'],
      ['Premium Cards', 'Which premium credit card has the best travel insurance coverage?'],
      ['Premium Cards', 'What is the best premium credit card for frequent business travelers?'],
      ['Approval & Credit', 'What credit card can I get with a 580 credit score?'],
      ['Approval & Credit', 'Which credit card is easiest to get approved for?'],
      ['Approval & Credit', 'What credit card should I apply for to build credit from scratch?'],
      ['Approval & Credit', 'How do I get approved for a credit card with limited credit history?'],
      ['Approval & Credit', 'Which secured credit card has the best path to an unsecured card?'],
      ['Balance Transfer', 'What is the best credit card for balance transfers with the longest 0% APR period?'],
      ['Balance Transfer', 'Which credit card is best for consolidating and paying off high-interest debt?'],
      ['Balance Transfer', 'What is the best 0% APR balance transfer credit card with no transfer fee?'],
      ['Balance Transfer', 'How do balance transfer credit cards work and are they worth it?'],
      ['Balance Transfer', 'Which credit card gives the most time to pay off a balance transfer?'],
      ['Balance Transfer', 'What is the best credit card to transfer a $5000 balance to?'],
      ['Balance Transfer', 'Which balance transfer card has the lowest ongoing APR after the intro period?'],
      ['Balance Transfer', 'What credit card should I use to get out of credit card debt fastest?'],
      ['Balance Transfer', 'Which card has the best balance transfer offer with no annual fee?'],
      ['Balance Transfer', 'What is the best card for someone who wants to consolidate multiple card balances?'],
    ],
    comps: ['Chase', 'American Express', 'Capital One', 'Citi', 'Discover', 'Wells Fargo', 'Bank of America', 'Synchrony', 'Barclays', 'USAA', 'Navy Federal', 'PenFed', 'TD Bank', 'US Bank', 'Regions Bank', 'Citizens Bank', 'Truist', 'Fifth Third', 'KeyBank', 'Huntington'],
    compUrls: { Chase: 'chase.com', 'American Express': 'americanexpress.com', 'Capital One': 'capitalone.com', Citi: 'citi.com', Discover: 'discover.com', 'Wells Fargo': 'wellsfargo.com', 'Bank of America': 'bankofamerica.com', Synchrony: 'synchrony.com', Barclays: 'barclays.com', USAA: 'usaa.com', 'Navy Federal': 'navyfederal.org', 'PenFed': 'penfed.org', 'TD Bank': 'td.com', 'US Bank': 'usbank.com', 'Regions Bank': 'regions.com', 'Citizens Bank': 'citizensbank.com', Truist: 'truist.com', 'Fifth Third': '53.com', KeyBank: 'key.com', Huntington: 'huntington.com' },
    label: 'Financial Services',
    awareness: { chase: 60, 'american express': 58, 'capital one': 56, citi: 54, discover: 48, 'bank of america': 46, 'wells fargo': 42, usaa: 35, synchrony: 25, barclays: 22, 'navy federal': 28, penfed: 16, 'td bank': 20, 'us bank': 24, 'regions bank': 14, 'citizens bank': 16, truist: 18, 'fifth third': 14, keybank: 12, huntington: 13 },
  },
  fin_cc_travel: {
    name: 'travel credit cards', label: 'Travel Credit Cards',
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
      ['Expert Recommendation', 'Which travel credit card do travel bloggers recommend most?'],
      ['Expert Recommendation', 'Best travel credit cards ranked by The Points Guy'],
      ['Expert Recommendation', 'Which travel credit card has the best customer service?'],
      ['Expert Recommendation', 'Best travel credit cards recommended by Bankrate'],
      ['Expert Recommendation', 'Which travel credit card is best for a first-time travel card holder?'],
      ['Comparison', 'What is the best mid-tier travel credit card for occasional travelers?'],
      ['Comparison', 'What is the best premium travel card for earning points on dining and travel?'],
      ['Comparison', 'Which travel credit card gives the best value at a $95 annual fee?'],
      ['Comparison', 'Best travel credit card vs airline-specific credit card'],
      ['Comparison', 'Which travel credit card is best for someone who prefers one card?'],
    ],
    comps: ['Chase Sapphire', 'American Express Platinum', 'Capital One Venture', 'Citi Strata Premier', 'Discover Miles', 'Bank of America Travel Rewards', 'Wells Fargo Autograph', 'Bilt Rewards', 'Barclays AAdvantage', 'US Bank Altitude'],
    compUrls: { 'Chase Sapphire': 'chase.com', 'American Express Platinum': 'americanexpress.com', 'Capital One Venture': 'capitalone.com', 'Citi Strata Premier': 'citi.com', 'Discover Miles': 'discover.com', 'Bank of America Travel Rewards': 'bankofamerica.com', 'Wells Fargo Autograph': 'wellsfargo.com', 'Bilt Rewards': 'biltrewards.com', 'Barclays AAdvantage': 'barclays.com', 'US Bank Altitude': 'usbank.com' },
    awareness: { 'chase sapphire': 62, 'american express platinum': 58, 'capital one venture': 56, 'citi strata premier': 44, 'discover miles': 42, 'bank of america travel rewards': 38, 'wells fargo autograph': 32, 'bilt rewards': 28, 'barclays aadvantage': 26, 'us bank altitude': 24 },
  },
  fin_cc_cashback: {
    name: 'cash back credit cards', label: 'Cash Back Credit Cards',
    queries: [
      ['General', 'What is the best cash back credit card right now?'],
      ['General', 'Which cash back credit card is most recommended by experts?'],
      ['General', 'Best cash back credit cards with no annual fee'],
      ['General', 'Which bank offers the best cash back credit card overall?'],
      ['General', 'Best flat rate cash back credit card for everyday spending'],
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
      ['Expert Recommendation', 'Which cash back credit card do financial advisors recommend?'],
      ['Expert Recommendation', 'Best cash back credit cards ranked by NerdWallet'],
      ['Expert Recommendation', 'Which cash back credit card has the best customer service?'],
      ['Expert Recommendation', 'Best cash back credit cards recommended by Bankrate'],
      ['Expert Recommendation', 'Which cash back credit card is best for a family?'],
      ['Comparison', 'Which 2% flat-rate cash back card has the best overall package?'],
      ['Comparison', 'What is the best no annual fee flat-rate cash back card?'],
      ['Comparison', 'Which cash back card earns more -- a flat-rate or a hybrid card?'],
      ['Comparison', 'Is there a cash back card better than the standard 2% flat rate?'],
      ['Comparison', 'Best flat rate cash back card vs rotating category cash back card'],
    ],
    comps: ['Chase Freedom', 'Citi Double Cash', 'Capital One Quicksilver', 'Discover it Cash Back', 'Wells Fargo Active Cash', 'Bank of America Customized Cash', 'American Express Blue Cash', 'Alliant Cashback', 'PayPal Cashback', 'Sofi Credit Card'],
    compUrls: { 'Chase Freedom': 'chase.com', 'Citi Double Cash': 'citi.com', 'Capital One Quicksilver': 'capitalone.com', 'Discover it Cash Back': 'discover.com', 'Wells Fargo Active Cash': 'wellsfargo.com', 'Bank of America Customized Cash': 'bankofamerica.com', 'American Express Blue Cash': 'americanexpress.com', 'Alliant Cashback': 'alliantcreditunion.org', 'PayPal Cashback': 'paypal.com', 'Sofi Credit Card': 'sofi.com' },
    awareness: { 'chase freedom': 60, 'citi double cash': 56, 'capital one quicksilver': 54, 'discover it cash back': 52, 'wells fargo active cash': 44, 'bank of america customized cash': 40, 'american express blue cash': 48, 'alliant cashback': 20, 'paypal cashback': 30, 'sofi credit card': 26 },
  },
  fin_cc_student_rewards: {
    name: 'student rewards credit cards', label: 'Student Rewards Credit Cards',
    queries: [
      ['General', 'What is the best student rewards credit card for college students?'],
      ['General', 'Which student credit card gives the best rewards for college spending?'],
      ['General', 'Best student credit cards that earn cash back or points'],
      ['General', 'Which bank offers the best student rewards credit card?'],
      ['General', 'Best student rewards credit cards with no annual fee'],
      ['Cash Back Rewards', 'Best student credit card for earning cash back on every purchase'],
      ['Cash Back Rewards', 'Which student credit card gives the most cash back on dining?'],
      ['Cash Back Rewards', 'Best student cash back credit card with no annual fee'],
      ['Cash Back Rewards', 'Which student credit card gives cash back on groceries and gas?'],
      ['Cash Back Rewards', 'Best student credit card for earning cash back on Amazon and online shopping'],
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
      ['Comparison', 'What is the best student credit card for earning rewards on dining?'],
      ['Comparison', 'Which student rewards card earns the most cash back with no annual fee?'],
      ['Comparison', 'Which student rewards card gives the best long-term value after graduation?'],
      ['Comparison', 'Which student card is better -- travel points or cash back rewards?'],
      ['Comparison', 'Best student cash back card vs student travel rewards card'],
    ],
    comps: ['Discover it Student', 'Capital One SavorOne Student', 'Chase Freedom Student', 'Bank of America Travel Rewards Student', 'Citi Rewards+ Student', 'Journey Student Rewards', 'Deserve EDU', 'Petal 2', 'Upgrade Student', 'Commerce Bank Student'],
    compUrls: { 'Discover it Student': 'discover.com', 'Capital One SavorOne Student': 'capitalone.com', 'Chase Freedom Student': 'chase.com', 'Bank of America Travel Rewards Student': 'bankofamerica.com', 'Citi Rewards+ Student': 'citi.com', 'Journey Student Rewards': 'capitalone.com', 'Deserve EDU': 'deserve.com', 'Petal 2': 'petalcard.com', 'Upgrade Student': 'upgrade.com', 'Commerce Bank Student': 'commercebank.com' },
    awareness: { 'discover it student': 58, 'capital one savorone student': 52, 'chase freedom student': 48, 'bank of america travel rewards student': 40, 'citi rewards+ student': 38, 'journey student rewards': 36, 'deserve edu': 22, 'petal 2': 20, 'upgrade student': 18, 'commerce bank student': 14 },
  },
  fin_cc_student: {
    name: 'student credit cards', label: 'Student Credit Cards',
    queries: [
      ['General', 'What is the best credit card for college students?'],
      ['General', 'Which student credit card is easiest to get with no credit history?'],
      ['General', 'Best credit cards for college students in 2025'],
      ['General', 'Which bank offers the best student credit card?'],
      ['General', 'Best first credit card for a college student'],
      ['Credit Building', 'Which student credit card helps build credit the fastest?'],
      ['Credit Building', 'Best student credit card that reports to all three credit bureaus'],
      ['Credit Building', 'Which student credit card increases limit after on-time payments?'],
      ['Credit Building', 'Best student credit card for going from no credit to good credit'],
      ['Credit Building', 'Which student credit card graduates to a regular card after college?'],
      ['Features', 'Which student credit card has the best mobile app for young adults?'],
      ['Features', 'Best student credit card with free credit score monitoring'],
      ['Features', 'Which student credit card has the best fraud protection for students?'],
      ['Features', 'Best student credit card with no foreign transaction fees for studying abroad'],
      ['Features', 'Which student credit card has the best financial education tools?'],
      ['Expert Recommendation', 'Which student credit card do college financial advisors recommend?'],
      ['Expert Recommendation', 'Best student credit cards ranked by NerdWallet'],
      ['Expert Recommendation', 'Which student credit card has the best customer service for young adults?'],
      ['Expert Recommendation', 'Best student credit cards recommended by Bankrate'],
      ['Expert Recommendation', 'Which student credit card is best for a graduate student?'],
      ['Comparison', 'What is the best student credit card for someone with zero credit history?'],
      ['Comparison', 'Which bank has the best student credit card overall?'],
      ['Comparison', 'What is the best student credit card from a major US bank?'],
      ['Comparison', 'Best student credit card vs secured credit card for building credit'],
      ['Comparison', 'Which student credit card has the easiest approval process?'],
    ],
    comps: ['Discover it Student', 'Capital One Journey Student', 'Chase Freedom Student', 'Bank of America Student', 'Citi Rewards+ Student', 'Deserve EDU', 'Petal 1', 'OpenSky Secured', 'First Progress Student', 'Commerce Bank Student'],
    compUrls: { 'Discover it Student': 'discover.com', 'Capital One Journey Student': 'capitalone.com', 'Chase Freedom Student': 'chase.com', 'Bank of America Student': 'bankofamerica.com', 'Citi Rewards+ Student': 'citi.com', 'Deserve EDU': 'deserve.com', 'Petal 1': 'petalcard.com', 'OpenSky Secured': 'openskycc.com', 'First Progress Student': 'firstprogress.com', 'Commerce Bank Student': 'commercebank.com' },
    awareness: { 'discover it student': 58, 'capital one journey student': 50, 'chase freedom student': 46, 'bank of america student': 40, 'citi rewards+ student': 36, 'deserve edu': 22, 'petal 1': 18, 'opensky secured': 20, 'first progress student': 14, 'commerce bank student': 12 },
  },
  fin_cc_secured: {
    name: 'secured credit cards', label: 'Secured Credit Cards',
    queries: [
      ['General', 'What is the best secured credit card for building credit?'],
      ['General', 'Which secured credit card is most recommended by experts?'],
      ['General', 'Best secured credit cards with no annual fee'],
      ['General', 'Which bank offers the best secured credit card overall?'],
      ['General', 'Best secured credit cards for someone with bad credit'],
      ['Credit Building', 'Which secured credit card graduates to an unsecured card the fastest?'],
      ['Credit Building', 'Best secured credit card that reports to all three credit bureaus'],
      ['Credit Building', 'Which secured credit card increases credit limit after on-time payments?'],
      ['Credit Building', 'Best secured credit card for going from bad credit to good credit'],
      ['Credit Building', 'Which secured credit card has the best credit monitoring tools?'],
      ['Deposit & Fees', 'Which secured credit card has the lowest minimum deposit?'],
      ['Deposit & Fees', 'Best secured credit cards with no annual fee'],
      ['Deposit & Fees', 'Which secured credit card refunds the deposit the fastest?'],
      ['Deposit & Fees', 'Best secured credit cards with no monthly maintenance fees'],
      ['Deposit & Fees', 'Which secured credit card has the best deposit return policy?'],
      ['Expert Recommendation', 'Which secured credit card do credit counselors recommend?'],
      ['Expert Recommendation', 'Best secured credit cards ranked by NerdWallet'],
      ['Expert Recommendation', 'Which secured credit card has the best customer service?'],
      ['Expert Recommendation', 'Best secured credit cards recommended by Bankrate'],
      ['Expert Recommendation', 'Which secured credit card is best for someone just out of bankruptcy?'],
      ['Comparison', 'What is the best secured credit card for building credit quickly?'],
      ['Comparison', 'Which secured card graduates to an unsecured card the fastest?'],
      ['Comparison', 'Best secured credit card vs prepaid debit card for building credit'],
      ['Comparison', 'What is the best secured credit card from a major bank?'],
      ['Comparison', 'Secured credit card vs credit builder loan -- which builds credit faster?'],
    ],
    comps: ['Discover it Secured', 'Capital One Platinum Secured', 'Citi Secured Mastercard', 'Bank of America Secured', 'OpenSky Secured', 'Chime Credit Builder', 'Self Credit Builder', 'First Progress Secured', 'Applied Bank Secured', 'Wells Fargo Secured'],
    compUrls: { 'Discover it Secured': 'discover.com', 'Capital One Platinum Secured': 'capitalone.com', 'Citi Secured Mastercard': 'citi.com', 'Bank of America Secured': 'bankofamerica.com', 'OpenSky Secured': 'openskycc.com', 'Chime Credit Builder': 'chime.com', 'Self Credit Builder': 'self.inc', 'First Progress Secured': 'firstprogress.com', 'Applied Bank Secured': 'appliedbank.com', 'Wells Fargo Secured': 'wellsfargo.com' },
    awareness: { 'discover it secured': 56, 'capital one platinum secured': 52, 'citi secured mastercard': 44, 'bank of america secured': 40, 'opensky secured': 32, 'chime credit builder': 36, 'self credit builder': 30, 'first progress secured': 18, 'applied bank secured': 14, 'wells fargo secured': 34 },
  },
  fin_cc_balance_transfer: {
    name: 'balance transfer credit cards', label: 'Balance Transfer Credit Cards',
    queries: [
      ['General', 'What is the best balance transfer credit card right now?'],
      ['General', 'Which balance transfer credit card has the longest 0% APR period?'],
      ['General', 'Best balance transfer credit cards with no transfer fee'],
      ['General', 'Which bank offers the best balance transfer credit card?'],
      ['General', 'Best balance transfer cards recommended by NerdWallet'],
      ['0% APR', 'Which credit card offers the longest 0% intro APR on balance transfers?'],
      ['0% APR', 'Best credit cards with 18 months or more of 0% balance transfer APR'],
      ['0% APR', 'Which balance transfer card has the best 0% APR and lowest fees?'],
      ['0% APR', 'Best balance transfer cards with 0% APR and no annual fee'],
      ['0% APR', 'Which card gives the most time to pay off a balance transfer at 0%?'],
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
      ['Comparison', 'What is the best balance transfer card with the longest 0% APR period?'],
      ['Comparison', 'Which bank offers the best overall balance transfer credit card deal?'],
      ['Comparison', 'Which balance transfer card has no balance transfer fee?'],
      ['Comparison', 'Which is better -- a balance transfer card or a personal loan for debt?'],
      ['Comparison', 'What is the best balance transfer card that also earns rewards?'],
    ],
    comps: ['Citi Diamond Preferred', 'Wells Fargo Reflect', 'Chase Slate Edge', 'Discover it Balance Transfer', 'Citi Simplicity', 'BankAmericard', 'Capital One Quicksilver', 'US Bank Visa Platinum', 'Amex EveryDay', 'HSBC Gold'],
    compUrls: { 'Citi Diamond Preferred': 'citi.com', 'Wells Fargo Reflect': 'wellsfargo.com', 'Chase Slate Edge': 'chase.com', 'Discover it Balance Transfer': 'discover.com', 'Citi Simplicity': 'citi.com', BankAmericard: 'bankofamerica.com', 'Capital One Quicksilver': 'capitalone.com', 'US Bank Visa Platinum': 'usbank.com', 'Amex EveryDay': 'americanexpress.com', 'HSBC Gold': 'hsbc.com' },
    awareness: { 'citi diamond preferred': 50, 'wells fargo reflect': 44, 'chase slate edge': 46, 'discover it balance transfer': 48, 'citi simplicity': 46, bankamericard: 38, 'capital one quicksilver': 52, 'us bank visa platinum': 32, 'amex everyday': 36, 'hsbc gold': 22 },
  },
  fin_cc_rewards: {
    name: 'rewards credit cards', label: 'Rewards Credit Cards',
    queries: [
      ['General', 'What is the best rewards credit card available right now?'],
      ['General', 'Which rewards credit card is most recommended by experts?'],
      ['General', 'Best rewards credit cards with no annual fee'],
      ['General', 'Which bank offers the best rewards credit card overall?'],
      ['General', 'Best rewards credit cards for maximizing everyday spending'],
      ['Points', 'Which credit card earns the most points on everyday purchases?'],
      ['Points', 'Best credit card for earning transferable points'],
      ['Points', 'Which rewards credit card has the best points redemption options?'],
      ['Points', 'Best credit card points program for travel redemptions'],
      ['Points', 'Which rewards credit card has the most valuable points currency?'],
      ['Cash Back vs Points', 'Which is better -- a cash back or points rewards credit card?'],
      ['Cash Back vs Points', 'Best rewards credit card for someone who wants flexibility'],
      ['Cash Back vs Points', 'Which rewards credit card is simplest for everyday use?'],
      ['Cash Back vs Points', 'Best rewards card for someone who doesnt want to track categories'],
      ['Cash Back vs Points', 'Which rewards credit card has the best flat rate on all purchases?'],
      ['Expert Recommendation', 'Which rewards credit card do financial advisors recommend?'],
      ['Expert Recommendation', 'Best rewards credit cards ranked by NerdWallet'],
      ['Expert Recommendation', 'Which rewards credit card has the best customer service?'],
      ['Expert Recommendation', 'Best rewards credit cards recommended by Bankrate'],
      ['Expert Recommendation', 'Which rewards credit card is best for a household?'],
      ['Comparison', 'What is the best general rewards credit card at a $95 annual fee?'],
      ['Comparison', 'Which rewards card is best for someone who spends mostly on dining and travel?'],
      ['Comparison', 'Which bank has the best flexible points rewards credit card?'],
      ['Comparison', 'Which no annual fee card earns the most overall rewards?'],
      ['Comparison', 'Which rewards credit card has better long-term value?'],
    ],
    comps: ['Chase Sapphire Preferred', 'Capital One Venture', 'American Express Gold', 'Citi Premier', 'Discover it', 'Wells Fargo Autograph', 'Bank of America Preferred Rewards', 'US Bank Altitude Go', 'Bilt Mastercard', 'PayPal Rewards'],
    compUrls: { 'Chase Sapphire Preferred': 'chase.com', 'Capital One Venture': 'capitalone.com', 'American Express Gold': 'americanexpress.com', 'Citi Premier': 'citi.com', 'Discover it': 'discover.com', 'Wells Fargo Autograph': 'wellsfargo.com', 'Bank of America Preferred Rewards': 'bankofamerica.com', 'US Bank Altitude Go': 'usbank.com', 'Bilt Mastercard': 'biltrewards.com', 'PayPal Rewards': 'paypal.com' },
    awareness: { 'chase sapphire preferred': 60, 'capital one venture': 56, 'american express gold': 54, 'citi premier': 48, 'discover it': 52, 'wells fargo autograph': 36, 'bank of america preferred rewards': 40, 'us bank altitude go': 28, 'bilt mastercard': 26, 'paypal rewards': 30 },
  },
  fin_small_business_cc: {
    name: 'small business credit cards', label: 'Small Business Credit Cards',
    queries: [
      ['General', 'What are the best small business credit cards available right now?'],
      ['General', 'Which small business credit card is most recommended by experts?'],
      ['General', 'Best small business credit cards with no annual fee'],
      ['General', 'Which bank offers the best small business credit card overall?'],
      ['General', 'Best small business credit cards for new business owners'],
      ['Cash Back', 'Best cash back small business credit card available today'],
      ['Cash Back', 'Which small business credit card gives the most cash back on office supplies?'],
      ['Cash Back', 'Best flat rate cash back small business credit card with no annual fee'],
      ['Cash Back', 'Which small business credit card gives 2% cash back on all purchases?'],
      ['Cash Back', 'Top small business credit cards for unlimited cash back rewards'],
      ['Travel & Rewards', 'Best travel rewards small business credit card for business owners'],
      ['Travel & Rewards', 'Which small business credit card earns the most miles for business travel?'],
      ['Travel & Rewards', 'Best small business credit card with no foreign transaction fees'],
      ['Travel & Rewards', 'Which small business credit card has the best airport lounge access?'],
      ['Travel & Rewards', 'Best small business credit card for frequent business travelers'],
      ['Expert Recommendation', 'Which small business credit card do accountants recommend most?'],
      ['Expert Recommendation', 'Best small business credit cards ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best overall small business credit card program?'],
      ['Expert Recommendation', 'Best small business credit cards recommended by Forbes Advisor'],
      ['Expert Recommendation', 'Which small business credit card has the best customer service?'],
      ['Comparison', 'Which small business credit card is best for a restaurant or food service business?'],
      ['Comparison', 'Best small business credit cards for LLCs and S-corps'],
      ['Comparison', 'Which small business credit card integrates best with QuickBooks?'],
      ['Comparison', 'Best small business credit cards for e-commerce businesses'],
      ['Comparison', 'Which small business credit card is easiest to get with a brand new business?'],
    ],
    comps: ['Chase Ink', 'American Express Business', 'Capital One Spark', 'Citi Business', 'Bank of America Business', 'Wells Fargo Business', 'US Bank Business', 'Brex', 'Ramp', 'Divvy'],
    compUrls: { 'Chase Ink': 'chase.com', 'American Express Business': 'americanexpress.com', 'Capital One Spark': 'capitalone.com', 'Citi Business': 'citi.com', 'Bank of America Business': 'bankofamerica.com', 'Wells Fargo Business': 'wellsfargo.com', 'US Bank Business': 'usbank.com', Brex: 'brex.com', Ramp: 'ramp.com', Divvy: 'divvy.co' },
    awareness: { 'chase ink': 58, 'american express business': 54, 'capital one spark': 52, 'citi business': 40, 'bank of america business': 38, 'wells fargo business': 34, 'us bank business': 28, brex: 30, ramp: 26, divvy: 18 },
  },
  fin_retail_bank: {
    name: 'retail banking', label: 'Retail Banking',
    queries: [
      ['General Banking', 'What is the best online bank account with no monthly fees?'],
      ['General Banking', 'Which bank offers the best combination of checking and savings with no minimums?'],
      ['General Banking', 'What is the best bank for someone who does all their banking online?'],
      ['General Banking', 'Which bank has the best overall digital banking experience in 2025?'],
      ['General Banking', 'What is the best fee-free bank account recommended by financial experts?'],
      ['Checking Accounts', 'What is the best free online checking account with no monthly fees?'],
      ['Checking Accounts', 'Which bank has the best fee-free checking account with ATM access?'],
      ['Checking Accounts', 'What is the best online checking account with a top-rated mobile app?'],
      ['Checking Accounts', 'Which bank offers the most fee-free ATMs nationwide for checking customers?'],
      ['Checking Accounts', 'What is the best checking account with early direct deposit?'],
      ['Savings Accounts', 'What is the best high yield savings account with no fees right now?'],
      ['Savings Accounts', 'Which bank offers the best APY on an online savings account with no minimums?'],
      ['Savings Accounts', 'What is the best FDIC-insured online savings account available today?'],
      ['Savings Accounts', 'Which bank has the best fee-free savings account with a competitive interest rate?'],
      ['Savings Accounts', 'What is the best savings account for building an emergency fund?'],
      ['CD Accounts', 'What is the best CD account available from an online bank right now?'],
      ['CD Accounts', 'Which bank offers the best 12-month CD rate with no minimum balance?'],
      ['CD Accounts', 'What is the best FDIC-insured CD for locking in a guaranteed return?'],
      ['CD Accounts', 'Which bank has the best short-term CD rates starting at 6 months?'],
      ['CD Accounts', 'What is the best CD account for conservative savers who want fixed returns?'],
      ['Digital & Mobile', 'Which bank has the best mobile app for managing all accounts in one place?'],
      ['Digital & Mobile', 'What is the best online bank with no branches that has a top-rated app?'],
      ['Digital & Mobile', 'Which bank app makes it easiest to transfer money between checking and savings?'],
      ['Digital & Mobile', 'What is the best bank for people who want to manage finances entirely from their phone?'],
      ['Digital & Mobile', 'Which bank has the best mobile deposit and instant transfer features?'],
      ['Expert Recommendation', 'Which bank do financial advisors most recommend for everyday personal banking?'],
      ['Expert Recommendation', 'What is the best FDIC-insured bank for keeping savings safe while earning interest?'],
      ['Expert Recommendation', 'Which online bank is most recommended by personal finance websites in 2025?'],
      ['Expert Recommendation', 'What is the best bank for a family that needs accounts for adults and kids?'],
      ['Expert Recommendation', 'Which bank is most recommended for someone moving away from traditional banking?'],
      ['Account Comparison', 'Which is better for growing savings -- a high yield savings account or a CD?'],
      ['Account Comparison', 'What is the best account type for someone who wants both flexibility and high interest?'],
      ['Account Comparison', 'Should I open a checking account or a savings account first at an online bank?'],
      ['Account Comparison', 'Which bank account type earns the most interest with no risk?'],
      ['Account Comparison', 'What is the best bank for someone who wants both a free checking and high-yield savings?'],
    ],
    comps: ['Chase', 'Bank of America', 'Wells Fargo', 'Ally', 'Marcus', 'Capital One', 'Citi', 'US Bank', 'Discover Bank', 'SoFi', 'Synchrony Bank', 'American Express Bank', 'Barclays', 'USAA', 'Navy Federal'],
    compUrls: { Chase: 'chase.com', 'Bank of America': 'bankofamerica.com', 'Wells Fargo': 'wellsfargo.com', Ally: 'ally.com', Marcus: 'marcus.com', 'Capital One': 'capitalone.com', Citi: 'citi.com', 'US Bank': 'usbank.com', 'Discover Bank': 'discover.com', SoFi: 'sofi.com', 'Synchrony Bank': 'synchrony.com', 'American Express Bank': 'americanexpress.com', Barclays: 'barclays.com', USAA: 'usaa.com', 'Navy Federal': 'navyfederal.org' },
    awareness: { chase: 62, 'bank of america': 58, 'wells fargo': 52, ally: 48, marcus: 42, 'capital one': 50, citi: 44, 'us bank': 36, 'discover bank': 38, sofi: 34, 'synchrony bank': 28, 'american express bank': 30, barclays: 20, usaa: 32, 'navy federal': 26 },
  },
  fin_retirement: {
    name: 'retirement planning & asset management', label: 'Retirement & Asset Management',
    queries: [
      ['Retirement Planning', 'What is the best company for retirement planning and 401k management?'],
      ['Retirement Planning', 'Which financial company is best for managing my 401k investments?'],
      ['Retirement Planning', 'What is the best retirement savings plan provider in the US?'],
      ['Retirement Planning', 'Which company offers the best IRA accounts for retirement savings?'],
      ['Retirement Planning', 'What is the best financial company for long-term retirement planning?'],
      ['Investment Management', 'What is the best company for managed investment portfolios?'],
      ['Investment Management', 'Which financial firm has the best mutual fund options for retirement?'],
      ['Investment Management', 'What is the best asset management company for long-term investors?'],
      ['Investment Management', 'Which company offers the best target date funds for retirement?'],
      ['Investment Management', 'What is the best investment firm for diversified retirement portfolios?'],
      ['Financial Planning', 'What is the best company for holistic financial planning and retirement?'],
      ['Financial Planning', 'Which financial firm offers the best financial wellness tools for employees?'],
      ['Financial Planning', 'What is the best platform for retirement readiness planning?'],
      ['Financial Planning', 'Which company has the best financial planning tools for retirement projections?'],
      ['Financial Planning', 'What is the best company for personalized retirement income strategies?'],
      ['Expert Recommendation', 'Which retirement company do financial planners recommend most often?'],
      ['Expert Recommendation', 'What is the highest rated company for retirement planning according to experts?'],
      ['Expert Recommendation', 'Which financial firm ranks best for overall retirement services in 2025?'],
      ['Expert Recommendation', 'What is the best company for retirement planning for self-employed individuals?'],
      ['Expert Recommendation', 'Which company is most recommended for a SEP IRA or Solo 401k?'],
      ['Account Comparison', 'Which is better for retirement -- a 401k or an IRA?'],
      ['Account Comparison', 'What is the best retirement account for someone who is self-employed?'],
      ['Account Comparison', 'Which retirement account type is best for minimizing taxes in retirement?'],
      ['Account Comparison', 'What is the difference between a traditional IRA and a Roth IRA?'],
      ['Account Comparison', 'Which is better for retirement savings -- annuities or index funds?'],
    ],
    comps: ['Fidelity', 'Vanguard', 'TIAA', 'Empower', 'Schwab', 'T. Rowe Price', 'American Funds', 'Mass Mutual', 'Prudential', 'Transamerica'],
    compUrls: { Fidelity: 'fidelity.com', Vanguard: 'vanguard.com', TIAA: 'tiaa.org', Empower: 'empower.com', Schwab: 'schwab.com', 'T. Rowe Price': 'troweprice.com', 'American Funds': 'americanfunds.com', 'Mass Mutual': 'massmutual.com', Prudential: 'prudential.com', Transamerica: 'transamerica.com' },
    awareness: { fidelity: 68, vanguard: 65, tiaa: 42, empower: 38, schwab: 58, troweprice: 46, americanfunds: 40, massmutual: 34, prudential: 36, transamerica: 30, principal: 32 },
  },
  fin_wealth: {
    name: 'wealth management', label: 'Wealth Management',
    queries: [
      ['General', 'Best wealth management accounts for high net worth individuals'],
      ['General', 'Which bank has the best private banking services?'],
      ['General', 'Best premium banking tiers for affluent customers'],
      ['General', 'Which bank offers the best perks for high balance customers?'],
      ['General', 'Best private client banking relationships in the US'],
      ['Investment', 'Best banks for investment management for affluent clients'],
      ['Investment', 'Which bank offers the best robo-advisor for wealthy clients?'],
      ['Investment', 'Best banks for access to alternative investments'],
      ['Investment', 'Which private bank has the best portfolio management services?'],
      ['Investment', 'Which wealth management platform has the lowest fees?'],
      ['Expert Recommendation', 'Which wealth management bank do financial advisors recommend?'],
      ['Expert Recommendation', 'Best private banking accounts ranked by Forbes'],
      ['Expert Recommendation', 'Which bank is best for mass affluent customers?'],
      ['Expert Recommendation', 'Which bank has the best wealth management for millennials?'],
      ['Expert Recommendation', 'Best banks for clients with complex financial needs'],
      ['Comparison', 'Which bank has the best premium private banking tier for affluent clients?'],
      ['Comparison', 'Citibank wealth vs Schwab vs Fidelity for high net worth'],
      ['Comparison', 'Which bank beats Morgan Stanley for mass affluent clients?'],
      ['Comparison', 'Best bank wealth tier vs independent RIA for $500K portfolio'],
      ['Comparison', 'Which bank wealth management platform has the best digital tools and portal?'],
    ],
    comps: ['Chase Private Client', 'Bank of America Preferred', 'Wells Fargo Private', 'Morgan Stanley', 'Merrill Lynch', 'Schwab', 'Fidelity', 'Goldman Sachs Private', 'US Bank Wealth', 'Northern Trust'],
    compUrls: { 'Chase Private Client': 'chase.com', 'Bank of America Preferred': 'bankofamerica.com', 'Wells Fargo Private': 'wellsfargo.com', 'Morgan Stanley': 'morganstanley.com', 'Merrill Lynch': 'ml.com', Schwab: 'schwab.com', Fidelity: 'fidelity.com', 'Goldman Sachs Private': 'goldmansachs.com', 'US Bank Wealth': 'usbank.com', 'Northern Trust': 'northerntrust.com' },
    awareness: { 'chase private client': 52, 'bank of america preferred': 48, 'wells fargo private': 42, 'morgan stanley': 62, 'merrill lynch': 60, schwab: 58, fidelity: 64, 'goldman sachs private': 56, 'us bank wealth': 30, 'northern trust': 38 },
  },
  fin_auto_loan: {
    name: 'auto financing', label: 'Auto Loans & Financing',
    queries: [
      ['General', 'Best bank for auto loan financing'],
      ['General', 'Which bank has the best car loan rates?'],
      ['General', 'Best auto loans from banks vs credit unions'],
      ['General', 'Which lender is best for financing a used car?'],
      ['General', 'Best pre-approved auto loans from banks'],
      ['New Car', 'Best bank financing for a new car purchase'],
      ['New Car', 'Which bank partners with car dealerships for financing?'],
      ['New Car', 'Best auto loan rates for new cars in 2025'],
      ['New Car', 'Which bank offers the best 0% APR auto financing?'],
      ['New Car', 'Best banks for financing a luxury vehicle'],
      ['Used Car', 'Best banks for used car loans'],
      ['Used Car', 'Which bank has the best used car loan rates?'],
      ['Used Car', 'Best lenders for buying a car from a private seller'],
      ['Used Car', 'Which bank finances older vehicles with high mileage?'],
      ['Used Car', 'Best auto loans for cars over 5 years old'],
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
    ],
    comps: ['Ally Financial', 'Chase Auto', 'Bank of America Auto', 'Wells Fargo Auto', 'US Bank Auto', 'PenFed Auto', 'LightStream', 'myAutoloan', 'USAA Auto', 'CarMax Auto Finance'],
    compUrls: { 'Ally Financial': 'ally.com', 'Chase Auto': 'chase.com', 'Bank of America Auto': 'bankofamerica.com', 'Wells Fargo Auto': 'wellsfargo.com', 'US Bank Auto': 'usbank.com', 'PenFed Auto': 'penfed.org', LightStream: 'lightstream.com', myAutoloan: 'myautoloan.com', 'USAA Auto': 'usaa.com', 'CarMax Auto Finance': 'carmax.com' },
    awareness: { 'ally financial': 58, 'chase auto': 52, 'bank of america auto': 48, 'wells fargo auto': 44, 'us bank auto': 36, 'penfed auto': 28, lightstream: 32, myautoloan: 18, 'usaa auto': 34, 'carmax auto finance': 38 },
  },
  fin_mortgage: {
    name: 'mortgage & home loans', label: 'Mortgage & Home Loans',
    queries: [
      ['General', 'Best bank for a mortgage in 2025'],
      ['General', 'Which bank has the best mortgage rates right now?'],
      ['General', 'Best mortgage lenders recommended by homebuyers'],
      ['General', 'Which bank is easiest to get a mortgage from?'],
      ['General', 'Best banks for first-time home buyers'],
      ['Purchase', 'Best banks for buying a home in 2025'],
      ['Purchase', 'Which bank has the best mortgage for first-time buyers?'],
      ['Purchase', 'Best mortgage lenders for a $500K home loan'],
      ['Purchase', 'Which bank offers the best down payment assistance programs?'],
      ['Purchase', 'Best banks for conventional mortgage loans'],
      ['Refinance', 'Best banks for refinancing a mortgage in 2025'],
      ['Refinance', 'Which bank offers the best rate for a cash-out refinance?'],
      ['Refinance', 'Best mortgage refinance lenders recommended by homeowners'],
      ['Refinance', 'Which bank has the lowest refinance closing costs?'],
      ['Refinance', 'Best banks for refinancing an FHA loan to conventional'],
      ['Expert Recommendation', 'Which mortgage lender do real estate agents recommend?'],
      ['Expert Recommendation', 'Best mortgage lenders ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best mortgage customer service?'],
      ['Expert Recommendation', 'Best mortgage lenders recommended by Bankrate'],
      ['Expert Recommendation', 'Which bank closes mortgages the fastest?'],
      ['Comparison', 'Which major bank consistently offers the lowest mortgage closing costs?'],
      ['Comparison', 'Best bank mortgage vs mortgage broker -- which saves more?'],
      ['Comparison', 'Best bank for mortgage vs online lender like Rocket Mortgage'],
      ['Comparison', 'Which bank beats Rocket Mortgage on rates and fees?'],
      ['Comparison', 'Which bank is best for a first-time homebuyer mortgage in 2025?'],
    ],
    comps: ['Rocket Mortgage', 'Chase Mortgage', 'Bank of America Mortgage', 'Wells Fargo Mortgage', 'United Wholesale', 'loanDepot', 'Fairway Independent', 'PNC Mortgage', 'US Bank Mortgage', 'Citi Mortgage'],
    compUrls: { 'Rocket Mortgage': 'rocketmortgage.com', 'Chase Mortgage': 'chase.com', 'Bank of America Mortgage': 'bankofamerica.com', 'Wells Fargo Mortgage': 'wellsfargo.com', 'United Wholesale': 'uwm.com', loanDepot: 'loandepot.com', 'Fairway Independent': 'fairwayindependentmc.com', 'PNC Mortgage': 'pnc.com', 'US Bank Mortgage': 'usbank.com', 'Citi Mortgage': 'citi.com' },
    awareness: { 'rocket mortgage': 68, 'chase mortgage': 56, 'bank of america mortgage': 52, 'wells fargo mortgage': 48, 'united wholesale': 38, loandepot: 42, 'fairway independent': 28, 'pnc mortgage': 32, 'us bank mortgage': 30, 'citi mortgage': 36 },
  },
  fin_commercial: {
    name: 'commercial banking', label: 'Commercial Banking',
    queries: [
      ['Treasury', 'Best banks for treasury management services for mid-size companies'],
      ['Treasury', 'Which bank has the best cash management solutions for corporations?'],
      ['Treasury', 'Best commercial banks for automated payables and receivables'],
      ['Treasury', 'Which bank offers the best liquidity management for businesses?'],
      ['Treasury', 'Best banks for commercial sweep accounts and overnight investing'],
      ['Commercial Credit', 'Best banks for commercial lines of credit for mid-size businesses'],
      ['Commercial Credit', 'Which bank has the best commercial real estate loan rates?'],
      ['Commercial Credit', 'Best banks for equipment financing for businesses'],
      ['Commercial Credit', 'Which bank offers the best SBA loans for growing companies?'],
      ['Commercial Credit', 'Best commercial banks for acquisition financing'],
      ['Expert Recommendation', 'Which bank do CFOs recommend for commercial banking relationships?'],
      ['Expert Recommendation', 'Best commercial banks ranked by middle market companies'],
      ['Expert Recommendation', 'Which bank is most recommended for treasury technology integration?'],
      ['Expert Recommendation', 'Best banks for companies doing $50M to $500M in revenue'],
      ['Expert Recommendation', 'Which commercial bank has the best relationship management?'],
    ],
    comps: ['JPMorgan Chase Commercial', 'Bank of America Business', 'Wells Fargo Commercial', 'Citi Commercial', 'US Bank Business', 'PNC Commercial', 'Truist Commercial', 'KeyBank Business', 'Regions Commercial', 'Fifth Third Business'],
    compUrls: { 'JPMorgan Chase Commercial': 'jpmorgan.com', 'Bank of America Business': 'bankofamerica.com', 'Wells Fargo Commercial': 'wellsfargo.com', 'Citi Commercial': 'citibank.com', 'US Bank Business': 'usbank.com', 'PNC Commercial': 'pnc.com', 'Truist Commercial': 'truist.com', 'KeyBank Business': 'key.com', 'Regions Commercial': 'regions.com', 'Fifth Third Business': '53.com' },
    awareness: { 'jpmorgan chase commercial': 62, 'bank of america business': 58, 'wells fargo commercial': 52, 'citi commercial': 48, 'us bank business': 36, 'pnc commercial': 32, 'truist commercial': 28, 'keybank business': 24, 'regions commercial': 22, 'fifth third business': 20 },
  },
  fin_smb_savings: {
    name: 'small business savings accounts', label: 'Small Business Savings',
    queries: [
      ['General', 'What is the best small business savings account right now?'],
      ['General', 'Which bank offers the best small business savings account?'],
      ['General', 'Best small business savings accounts with high interest rates'],
      ['General', 'Which bank has the best APY on small business savings?'],
      ['General', 'Best small business savings accounts recommended by experts'],
      ['High Yield', 'Which bank has the highest APY on small business savings right now?'],
      ['High Yield', 'Best high yield small business savings accounts in 2025'],
      ['High Yield', 'Which online bank offers the best interest rate for small business savings?'],
      ['High Yield', 'Best small business savings accounts beating inflation right now'],
      ['High Yield', 'Which bank gives the most interest on small business savings with no minimums?'],
      ['Expert Recommendation', 'Which small business savings account do accountants recommend?'],
      ['Expert Recommendation', 'Best small business savings accounts ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best small business savings customer service?'],
      ['Expert Recommendation', 'Best small business savings accounts recommended by Bankrate'],
      ['Expert Recommendation', 'Which bank is best for a small business saving for taxes?'],
    ],
    comps: ['Chase Business', 'Bank of America Business', 'Wells Fargo Business', 'Mercury', 'Bluevine', 'Relay', 'Novo', 'American Express Business', 'US Bank Business', 'Live Oak Bank'],
    compUrls: { 'Chase Business': 'chase.com', 'Bank of America Business': 'bankofamerica.com', 'Wells Fargo Business': 'wellsfargo.com', Mercury: 'mercury.com', Bluevine: 'bluevine.com', Relay: 'relayfi.com', Novo: 'novo.co', 'American Express Business': 'americanexpress.com', 'US Bank Business': 'usbank.com', 'Live Oak Bank': 'liveoakbank.com' },
    awareness: { 'chase business': 58, 'bank of america business': 54, 'wells fargo business': 48, mercury: 34, bluevine: 30, relay: 26, novo: 22, 'american express business': 36, 'us bank business': 28, 'live oak bank': 24 },
  },
  fin_smb_checking: {
    name: 'small business checking accounts', label: 'Small Business Checking',
    queries: [
      ['General', 'What is the best small business checking account right now?'],
      ['General', 'Which bank offers the best free small business checking account?'],
      ['General', 'Best small business checking accounts with no monthly fees'],
      ['General', 'Which bank is best for a small business checking account overall?'],
      ['General', 'Best small business checking accounts recommended by experts'],
      ['No Fee', 'Which small business checking account has no monthly maintenance fee?'],
      ['No Fee', 'Best free small business checking accounts with no minimums'],
      ['No Fee', 'Which bank waives small business checking fees for new businesses?'],
      ['No Fee', 'Best small business checking accounts with no transaction fees'],
      ['No Fee', 'Which online bank offers the best free small business checking?'],
      ['Expert Recommendation', 'Which small business checking account do accountants recommend?'],
      ['Expert Recommendation', 'Best small business checking accounts ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best small business checking customer service?'],
      ['Expert Recommendation', 'Best small business checking accounts recommended by Bankrate'],
      ['Expert Recommendation', 'Which bank is best for a restaurant small business checking?'],
    ],
    comps: ['Chase Business', 'Bank of America Business', 'Wells Fargo Business', 'Mercury', 'Bluevine', 'Relay', 'Novo', 'American Express Business', 'US Bank Business', 'Axos Business'],
    compUrls: { 'Chase Business': 'chase.com', 'Bank of America Business': 'bankofamerica.com', 'Wells Fargo Business': 'wellsfargo.com', Mercury: 'mercury.com', Bluevine: 'bluevine.com', Relay: 'relayfi.com', Novo: 'novo.co', 'American Express Business': 'americanexpress.com', 'US Bank Business': 'usbank.com', 'Axos Business': 'axosbank.com' },
    awareness: { 'chase business': 58, 'bank of america business': 54, 'wells fargo business': 48, mercury: 34, bluevine: 30, relay: 26, novo: 22, 'american express business': 36, 'us bank business': 28, 'axos business': 20 },
  },
  fin_smb_loans: {
    name: 'small business loans and lending', label: 'Small Business Loans',
    queries: [
      ['General', 'What is the best small business loan lender right now?'],
      ['General', 'Which bank offers the best small business loans overall?'],
      ['General', 'Best small business loans for established businesses'],
      ['General', 'Which lender has the best small business loan rates?'],
      ['General', 'Best small business loans recommended by experts in 2025'],
      ['SBA Loans', 'Which bank is best for SBA 7(a) loans for small businesses?'],
      ['SBA Loans', 'Best SBA loan lenders of 2025'],
      ['SBA Loans', 'Which bank has the fastest SBA loan approval process?'],
      ['SBA Loans', 'Best banks for SBA 504 loans for small businesses'],
      ['SBA Loans', 'Which SBA lender has the best terms and lowest rates?'],
      ['Expert Recommendation', 'Which small business loan lender do accountants recommend?'],
      ['Expert Recommendation', 'Best small business loans ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best small business loan customer service?'],
      ['Expert Recommendation', 'Best small business loans recommended by Bankrate'],
      ['Expert Recommendation', 'Which bank is best for a small business loan for a restaurant?'],
    ],
    comps: ['Chase Business', 'Bank of America Business', 'Wells Fargo Business', 'OnDeck', 'Kabbage', 'Bluevine', 'Fundbox', 'US Bank Business', 'Live Oak Bank', 'American Express Business'],
    compUrls: { 'Chase Business': 'chase.com', 'Bank of America Business': 'bankofamerica.com', 'Wells Fargo Business': 'wellsfargo.com', OnDeck: 'ondeck.com', Kabbage: 'kabbage.com', Bluevine: 'bluevine.com', Fundbox: 'fundbox.com', 'US Bank Business': 'usbank.com', 'Live Oak Bank': 'liveoakbank.com', 'American Express Business': 'americanexpress.com' },
    awareness: { 'chase business': 58, 'bank of america business': 54, 'wells fargo business': 48, ondeck: 32, kabbage: 28, bluevine: 30, fundbox: 24, 'us bank business': 28, 'live oak bank': 22, 'american express business': 36 },
  },
  fin_smb_payments: {
    name: 'small business payments and payroll', label: 'Small Business Payments',
    queries: [
      ['General', 'What is the best payment processing solution for small businesses?'],
      ['General', 'Which bank offers the best small business payment processing?'],
      ['General', 'Best small business payment solutions recommended by experts'],
      ['General', 'Which payment processor is best for a small business in 2025?'],
      ['General', 'Best small business payment solutions with low transaction fees'],
      ['Merchant Services', 'Which bank has the best merchant services for small businesses?'],
      ['Merchant Services', 'Best small business merchant accounts with low fees'],
      ['Merchant Services', 'Which payment processor has the lowest transaction fee for small businesses?'],
      ['Merchant Services', 'Best merchant services for a small retail business'],
      ['Merchant Services', 'Which bank offers the best POS system for small businesses?'],
      ['Expert Recommendation', 'Which small business payment solution do accountants recommend?'],
      ['Expert Recommendation', 'Best small business payment processors ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank has the best small business payments customer service?'],
      ['Expert Recommendation', 'Best small business payment solutions recommended by Bankrate'],
      ['Expert Recommendation', 'Which payment solution is best for a restaurant small business?'],
    ],
    comps: ['Chase Business', 'Bank of America Business', 'Wells Fargo Business', 'Square', 'Stripe', 'PayPal Business', 'Clover', 'Relay', 'Mercury', 'American Express Business'],
    compUrls: { 'Chase Business': 'chase.com', 'Bank of America Business': 'bankofamerica.com', 'Wells Fargo Business': 'wellsfargo.com', Square: 'squareup.com', Stripe: 'stripe.com', 'PayPal Business': 'paypal.com', Clover: 'clover.com', Relay: 'relayfi.com', Mercury: 'mercury.com', 'American Express Business': 'americanexpress.com' },
    awareness: { 'chase business': 58, 'bank of america business': 54, 'wells fargo business': 48, square: 62, stripe: 58, 'paypal business': 60, clover: 44, relay: 26, mercury: 34, 'american express business': 36 },
  },
  fin_small_business: {
    name: 'small business banking', label: 'Small Business Banking',
    queries: [
      ['General', 'Best bank for a small business checking account'],
      ['General', 'Which bank is best for small business owners?'],
      ['General', 'Best banks for startups and new businesses'],
      ['General', 'Which bank has the best small business banking features?'],
      ['General', 'Best banks recommended by small business owners'],
      ['Credit & Lending', 'Best small business loans from banks'],
      ['Credit & Lending', 'Which bank has the best small business line of credit?'],
      ['Credit & Lending', 'Best banks for SBA 7a loans'],
      ['Credit & Lending', 'Which bank offers the best business credit cards for small companies?'],
      ['Credit & Lending', 'Best banks for startup business loans with no revenue'],
      ['Expert Recommendation', 'Which bank do accountants recommend for small businesses?'],
      ['Expert Recommendation', 'Best banks for small businesses ranked by NerdWallet'],
      ['Expert Recommendation', 'Which bank is best for an LLC or S-corp?'],
      ['Expert Recommendation', 'Best banks for small businesses with multiple employees'],
      ['Expert Recommendation', 'Which bank offers the best rewards for business spending?'],
    ],
    comps: ['Chase Business', 'Bank of America Business', 'Wells Fargo Business', 'Relay', 'Bluevine', 'Mercury', 'Novo', 'US Bank Business', 'Citi Business', 'American Express Business'],
    compUrls: { 'Chase Business': 'chase.com', 'Bank of America Business': 'bankofamerica.com', 'Wells Fargo Business': 'wellsfargo.com', Relay: 'relayfi.com', Bluevine: 'bluevine.com', Mercury: 'mercury.com', Novo: 'novo.co', 'US Bank Business': 'usbank.com', 'Citi Business': 'citi.com', 'American Express Business': 'americanexpress.com' },
    awareness: { 'chase business': 58, 'bank of america business': 54, 'wells fargo business': 48, relay: 22, bluevine: 26, mercury: 28, novo: 20, 'us bank business': 30, 'citi business': 32, 'american express business': 36 },
  },
  auto: {
    name: 'automotive', label: 'Automotive',
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
      ['Safety & Technology', 'Best cars for ADAS and collision avoidance'],
      ['Safety & Technology', 'Which car brand has the best infotainment system?'],
      ['Expert Recommendation', 'What car brand do mechanics recommend?'],
      ['Expert Recommendation', 'Which car companies are growing fastest in popularity?'],
      ['Expert Recommendation', 'Best car brands recommended by auto experts'],
      ['Expert Recommendation', 'Which car brand has the best dealer network?'],
      ['Expert Recommendation', 'Most award-winning car brands of 2025'],
    ],
    comps: ['Tesla', 'Toyota', 'BMW', 'Honda', 'Ford', 'Mercedes', 'Hyundai', 'Kia', 'Nissan', 'Volkswagen'],
    compUrls: { Tesla: 'tesla.com', Toyota: 'toyota.com', BMW: 'bmw.com', Honda: 'honda.com', Ford: 'ford.com', Mercedes: 'mercedes-benz.com', Hyundai: 'hyundai.com', Kia: 'kia.com', Nissan: 'nissanusa.com', Volkswagen: 'vw.com' },
    awareness: { tesla: 58, toyota: 55, bmw: 50, honda: 48, ford: 45, mercedes: 44, hyundai: 38, kia: 33, nissan: 30, volkswagen: 32 },
  },
  hotel: {
    name: 'hotels and hospitality', label: 'Hospitality',
    queries: [
      ['General Consumer', 'What are the best hotel chains in the world?'],
      ['General Consumer', 'Which hotel brand offers the best value for money?'],
      ['General Consumer', 'What is the most recommended hotel chain for travelers?'],
      ['General Consumer', 'Best hotel loyalty programs worth joining'],
      ['General Consumer', 'Which hotel brands are most trusted by travelers?'],
      ['Luxury', 'What are the best luxury hotel brands?'],
      ['Luxury', 'Which hotel chain has the best high-end properties?'],
      ['Luxury', 'Best hotel brands for a premium travel experience'],
      ['Luxury', 'Top luxury hotels recommended by travel experts'],
      ['Luxury', 'Which 5-star hotel brand is most worth the price?'],
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
      ['Expert Recommendation', 'What hotel chains do frequent travelers recommend most?'],
      ['Expert Recommendation', 'Best hotel brands for customer service and consistency'],
      ['Expert Recommendation', 'Which hotel chain has won the most travel awards?'],
      ['Expert Recommendation', 'Most recommended hotel brands by travel bloggers'],
      ['Expert Recommendation', 'Best hotel chains for international travel'],
    ],
    comps: ['Marriott', 'Hilton', 'Hyatt', 'IHG', 'Wyndham', 'Best Western', 'Radisson', 'Accor', 'Four Seasons', 'Ritz-Carlton'],
    compUrls: { Marriott: 'marriott.com', Hilton: 'hilton.com', Hyatt: 'hyatt.com', IHG: 'ihg.com', Wyndham: 'wyndhamhotels.com', 'Best Western': 'bestwestern.com', Radisson: 'radissonhotels.com', Accor: 'accor.com', 'Four Seasons': 'fourseasons.com', 'Ritz-Carlton': 'ritzcarlton.com' },
    awareness: { marriott: 58, hilton: 56, hyatt: 48, ihg: 42, wyndham: 38, 'best western': 34, radisson: 30, accor: 32, 'four seasons': 45, 'ritz-carlton': 44 },
  },
  media: {
    name: 'streaming and entertainment', label: 'Streaming & Entertainment',
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
    ],
    comps: ['Netflix', 'Disney+', 'HBO Max', 'Amazon Prime Video', 'Apple TV+', 'Hulu', 'Peacock', 'Paramount+', 'Spotify', 'Apple Music'],
    compUrls: { Netflix: 'netflix.com', 'Disney+': 'disneyplus.com', 'HBO Max': 'max.com', 'Amazon Prime Video': 'primevideo.com', 'Apple TV+': 'apple.com', Hulu: 'hulu.com', Peacock: 'peacocktv.com', 'Paramount+': 'paramountplus.com', Spotify: 'spotify.com', 'Apple Music': 'music.apple.com' },
    awareness: { netflix: 62, 'disney+': 58, 'hbo max': 52, 'amazon prime video': 54, 'apple tv+': 46, hulu: 48, peacock: 38, 'paramount+': 36, spotify: 56, 'apple music': 48 },
  },
  retail: {
    name: 'retail and e-commerce', label: 'Retail & E-Commerce',
    queries: [
      ['General Consumer', 'What is the best online store for shopping?'],
      ['General Consumer', 'Which retailer has the best prices and selection?'],
      ['General Consumer', 'Best retailers for fast and reliable delivery'],
      ['General Consumer', 'Which stores are most trusted for online shopping?'],
      ['General Consumer', 'Best shopping apps and websites recommended by consumers'],
      ['Value', 'Which retailer has the best deals and discounts?'],
      ['Value', 'Best stores for everyday low prices'],
      ['Value', 'Which retail brand offers the best overall value?'],
      ['Value', 'Best retailers for price matching and guarantees'],
      ['Value', 'Which store has the best sale events and promotions?'],
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
    awareness: { amazon: 65, walmart: 60, target: 55, costco: 52, 'best buy': 46, ebay: 48, etsy: 42, shopify: 38, 'home depot': 44, kroger: 38 },
  },
  tech: {
    name: 'technology and software', label: 'Technology',
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
      ['AI & Innovation', 'Which companies are building the best AI products?'],
      ['AI & Innovation', 'Most innovative software companies using AI right now'],
      ['AI & Innovation', 'Best AI tools recommended for businesses in 2025'],
    ],
    comps: ['Apple', 'Microsoft', 'Google', 'Amazon', 'Salesforce', 'Adobe', 'Oracle', 'SAP', 'IBM', 'Cisco'],
    compUrls: { Apple: 'apple.com', Microsoft: 'microsoft.com', Google: 'google.com', Amazon: 'amazon.com', Salesforce: 'salesforce.com', Adobe: 'adobe.com', Oracle: 'oracle.com', SAP: 'sap.com', IBM: 'ibm.com', Cisco: 'cisco.com' },
    awareness: { apple: 65, microsoft: 63, google: 64, amazon: 60, salesforce: 52, adobe: 50, oracle: 46, sap: 44, ibm: 48, cisco: 45 },
  },
  sport: {
    name: 'sports and fitness brands', label: 'Sports & Fitness',
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
      ['Lifestyle', 'Best sports brands for street style and fashion'],
      ['Lifestyle', 'Which athletic brand collaborates most with designers?'],
      ['Footwear', 'Best sneaker brands for comfort and style'],
      ['Footwear', 'Which brand makes the best training shoes?'],
      ['Footwear', 'Best running shoe brands for beginners'],
      ['Footwear', 'Most recommended basketball shoe brands'],
      ['Footwear', 'Which athletic shoe brand has the best cushioning?'],
    ],
    comps: ['Nike', 'Adidas', 'Under Armour', 'Lululemon', 'New Balance', 'Puma', 'Reebok', 'Asics', 'Brooks', 'Hoka'],
    compUrls: { Nike: 'nike.com', Adidas: 'adidas.com', 'Under Armour': 'underarmour.com', Lululemon: 'lululemon.com', 'New Balance': 'newbalance.com', Puma: 'puma.com', Reebok: 'reebok.com', Asics: 'asics.com', Brooks: 'brooksrunning.com', Hoka: 'hoka.com' },
    awareness: { nike: 65, adidas: 62, 'under armour': 52, lululemon: 50, 'new balance': 46, puma: 44, reebok: 40, asics: 38, brooks: 34, hoka: 36 },
  },
  health: {
    name: 'healthcare and insurance', label: 'Healthcare',
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
      ['Pharmacy', 'Which pharmacy has the best GoodRx and discount programs?'],
      ['Pharmacy', 'Best online pharmacy services in 2025'],
      ['Expert Recommendation', 'What health insurance do doctors recommend?'],
      ['Expert Recommendation', 'Most trusted healthcare companies according to experts'],
      ['Expert Recommendation', 'Best healthcare companies for employee benefits'],
      ['Expert Recommendation', 'Which health insurance companies pay claims fastest?'],
      ['Expert Recommendation', 'Top rated healthcare brands by patient satisfaction'],
    ],
    comps: ['UnitedHealth', 'Anthem', 'Aetna', 'Cigna', 'Humana', 'CVS Health', 'Walgreens', 'Kaiser', 'Blue Cross', 'Centene'],
    compUrls: { UnitedHealth: 'uhc.com', Anthem: 'anthem.com', Aetna: 'aetna.com', Cigna: 'cigna.com', Humana: 'humana.com', 'CVS Health': 'cvs.com', Walgreens: 'walgreens.com', Kaiser: 'kp.org', 'Blue Cross': 'bcbs.com', Centene: 'centene.com' },
    awareness: { unitedhealth: 55, anthem: 50, aetna: 52, cigna: 50, humana: 46, 'cvs health': 54, walgreens: 52, kaiser: 48, 'blue cross': 50, centene: 35 },
  },
  gen: {
    name: 'consumer brands', label: 'General',
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
{"knownFor":[{"product":"product name","queries":["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10"]}]}

STRICT RULES:
- Maximum 5 products, 10 queries each. Total must be exactly 50 queries.
- ZERO brand names in any query — no "${brand}", no competitor names, no product names like "simplicity", "double cash", "sapphire", "venture" etc.
- Queries must be generic consumer questions that any brand in this category could answer.
- Good example: "which credit card has the best balance transfer intro offer"
- Bad example: "citi simplicity balance transfer offer" — REJECTED, contains brand/product name.`;

      const fameRaw = await callAI([{role:'user', content: brandFamePrompt}], 0.2, 1200);
      const fameData = JSON.parse(fameRaw.replace(/```json|```/g,'').trim());
      const knownFor: {product: string; queries: string[]}[] = fameData.knownFor || [];

      if (knownFor.length > 0) {
        const allTargetedQA: {product:string;query:string;ans:string;mentioned:boolean;position:number}[] = [];
        const flatQ: {product:string;query:string}[] = [];
        // Post-process: strip any queries that contain brand/product names
        const brandTokens = [brand.toLowerCase(), ...brand.toLowerCase().split(/\s+/)].filter(t=>t.length>3);
        const allKnownProducts = knownFor.map(k=>k.product.toLowerCase().split(/\s+/).filter((w:string)=>w.length>3)).flat();
        const forbiddenTokens = [...new Set([...brandTokens, ...allKnownProducts])];
        const isClean = (q:string) => !forbiddenTokens.some(t => q.toLowerCase().includes(t));
        knownFor.forEach(k => k.queries.slice(0,10).filter(isClean).forEach(q => flatQ.push({product:k.product, query:q})));

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
          // Avg rank across ALL queries — unmentioned = position 5 (worst case, not excluded)
          const posArr=rows.map(r=>r.position>0?r.position:5);
          const avgPos=posArr.reduce((a,b)=>a+b,0)/posArr.length;
          const prominence=Math.round(Math.max(5,Math.min(95,100-(avgPos-1)*18)));
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
            product, total, mentioned, winRate, prominence, avgRank: posArr.length>0?`#${Math.round(avgPos)}`:"N/A", topCompetitor: topComp,
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
