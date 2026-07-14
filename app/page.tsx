import Link from 'next/link';
import './home.css';

const navItems = [
  { label: 'GEO Hub', href: '/geo-hub' },
  { label: 'Get Support', href: '/get-support' },
];

function TopNav() {
  return (
    <nav id="top-nav" className="topNav">
      <div id="nav-logo" className="navLogo">
        <div id="nav-logo-icon" className="navLogoIcon">
          <svg id="nav-logo-svg" className="navLogoSvg" width="16" height="16" viewBox="0 0 22 22" fill="none">
            <circle cx="9.5" cy="9.5" r="5.5" stroke="white" strokeWidth="1.8" fill="none"/>
            <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M7 9.5 Q8.5 7 9.5 9.5 Q10.5 12 12 9.5" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.9"/>
          </svg>
        </div>
        <span id="nav-brand-name" className="navBrandName">Percepta</span>
      </div>
      <div id="nav-links" className="navLinks">
        {navItems.map(({ label, href }) => (
          <Link key={href} href={href} id={`nav-link-${label.toLowerCase().replace(/\s+/g, '-')}`} className="navLink">
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

const steps = [
  {
    title: 'Enter Your Brand',
    desc: 'Input your brand name, target keywords, and competitor list into the Percepta platform.',
  },
  {
    title: 'AI Engine Scanning',
    desc: 'Percepta queries major AI engines with hundreds of relevant prompts to analyze brand mentions and sentiment.',
  },
  {
    title: 'Score Calculation',
    desc: 'Our proprietary algorithm computes your GEO Score (0–100) based on visibility frequency, sentiment, and positioning.',
  },
  {
    title: 'Actionable Insights',
    desc: 'Receive detailed reports with specific recommendations on how to improve your brand\'s AI visibility.',
  },
];

const bands = [
  { bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46', range: '80–100', label: 'Excellent', desc: 'Well optimized for AI citation' },
  { bg: '#EFF6FF', border: '#93C5FD', color: '#1E40AF', range: '70–79', label: 'Good', desc: 'Minor improvements recommended' },
  { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', range: '45–69', label: 'Needs Work', desc: 'Several issues to address' },
  { bg: '#FFF1F2', border: '#FCA5A5', color: '#991B1B', range: '0–44', label: 'Poor', desc: 'Major optimization needed' },
];

const competitors = [
  'Fragmented metrics with no clear direction',
  'Surface-level visibility tracking',
  'Dashboards that stop at \'what,\' not \'what next\'',
];

const perceptaFeatures = [
  'Unified GEO Score (0–100) to track performance',
  'Competitive benchmarking across key players',
  'Clear attribution of where and why you appear',
  'Pinpoint what\'s limiting your visibility',
  'Actionable recommendations tied to execution',
  'Our team to implement and drive results',
];

export default function Overview() {
  return (
    <>
    <TopNav />
    <main id="main" className="main">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div id="hero" className="hero">
        <div id="hero-badge" className="heroBadge">
          ✦ &nbsp;AI-Powered Brand Intelligence
        </div>
        <div id="hero-headline" className="heroHeadline">
          <span id="hero-headline-prefix" className="heroHeadlinePrefix">How does AI </span>
          <span id="hero-headline-keyword" className="heroHeadlineKeyword">see</span>
          <span id="hero-headline-suffix" className="heroHeadlineSuffix"> your brand</span>
        </div>
        <p id="hero-subtext" className="heroSubtext">
          Enter any brand URL and get a full GEO analysis — frequency, prominence, sentiment, competitor gaps, and exactly what to fix.
        </p>
        <div id="hero-cta" className="heroCta">
          <Link id="hero-cta-primary" className="heroCtaPrimary" href="/geo-hub">
            Get Started &nbsp;→
          </Link>
          <a id="hero-cta-secondary" className="heroCtaSecondary" href="#how">
            See How It Works
          </a>
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <div id="how" className="howSection">
        <div id="how-header" className="howHeader">
          <div id="how-badge" className="howBadge">Process</div>
          <h2 id="how-title" className="howTitle">How Percepta Works</h2>
          <p id="how-desc" className="howDesc">
            From brand input to actionable GEO insights — in four simple steps.
          </p>
        </div>
        <div id="how-steps" className="howSteps">
          {steps.map((s, i) => (
            <div key={i} id={`how-step-${i + 1}`} className="howStep">
              <div id={`how-step-${i + 1}-number`} className="howStepNumber">0{i + 1}</div>
              <div id={`how-step-${i + 1}-title`} className="howStepTitle">{s.title}</div>
              <div id={`how-step-${i + 1}-desc`} className="howStepDesc">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── GEO SCORE ─────────────────────────────────────────────── */}
      <div id="geo-score-section" className="geoScoreSection">
        <div id="geo-score-grid" className="geoScoreGrid">

          <div id="geo-score-content" className="geoScoreContent">
            <div id="geo-score-eyebrow" className="geoScoreEyebrow">The GEO Score</div>
            <h2 id="geo-score-title" className="geoScoreTitle">One Number That<br />Changes Everything</h2>
            <p id="geo-score-desc" className="geoScoreDesc">
              Understand how frequently and positively your brand appears in AI-generated answers, and get clear next steps to improve.
            </p>
          </div>

          <div id="geo-score-card" className="geoScoreCard">
            <div id="geo-score-card-label" className="geoScoreCardLabel">GEO SCORE</div>
            <div id="geo-score-number" className="geoScoreNumber">78</div>
            <div id="geo-score-bar" className="geoScoreBar">
              <div id="geo-score-bar-fill" className="geoScoreBarFill" />
            </div>
            <div id="geo-score-out-of" className="geoScoreOutOf">out of 100</div>
            <span id="geo-score-band-chip" className="geoScoreBandChip">Good</span>
          </div>
        </div>

        {/* Score Bands */}
        <div id="score-bands" className="scoreBands">
          {bands.map((b, i) => (
            <div key={i} id={`score-band-${i + 1}`} className="scoreBandCard" style={{ background: b.bg, border: `1.5px solid ${b.border}`, color: b.color }}>
              <div id={`score-band-${i + 1}-range`} className="scoreBandRange">{b.range}</div>
              <div id={`score-band-${i + 1}-label`} className="scoreBandLabel">{b.label}</div>
              <div id={`score-band-${i + 1}-desc`} className="scoreBandDesc">{b.desc}</div>
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div id="comparison" className="comparison">
          <div id="comparison-header" className="comparisonHeader">
            <div id="comparison-badge" className="comparisonBadge">What You Gain</div>
            <h2 id="comparison-title" className="comparisonTitle">
              Others Give You Data.<br />We Give You a Solution.
            </h2>
            <p id="comparison-desc" className="comparisonDesc">
              Every other GEO tool stops at the dashboard. Percepta combines measurement, strategy, and execution in one place.
            </p>
          </div>

          <div id="comparison-grid" className="comparisonGrid">

            {/* Competitors card */}
            <div id="comparison-competitors" className="comparisonCard comparisonCard--competitors">
              <div id="comparison-competitors-label" className="comparisonCardLabel">Competitors</div>
              <div id="comparison-competitors-list" className="comparisonList">
                {competitors.map((item, i) => (
                  <div key={i} id={`comparison-competitor-${i + 1}`} className="comparisonItem">
                    <span id={`comparison-competitor-${i + 1}-icon`} className="comparisonItemIcon">—</span>
                    <span id={`comparison-competitor-${i + 1}-text`} className="comparisonItemText">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Percepta card */}
            <div id="comparison-percepta" className="comparisonCard comparisonCard--percepta">
              <div id="comparison-percepta-badge" className="comparisonPerceptaBadge">Percepta</div>
              <div id="comparison-percepta-label" className="comparisonCardLabel">Your All-In-One GEO Solution</div>
              <div id="comparison-percepta-list" className="comparisonList">
                {perceptaFeatures.map((item, i) => (
                  <div key={i} id={`comparison-feature-${i + 1}`} className="comparisonItem">
                    <span id={`comparison-feature-${i + 1}-icon`} className="comparisonItemIcon">+</span>
                    <span id={`comparison-feature-${i + 1}-text`} className={`comparisonItemText${i === perceptaFeatures.length - 1 ? ' comparisonItemText--bold' : ''}`}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <div id="cta-section" className="ctaSection">
        <div id="cta-card" className="ctaCard">
          <h2 id="cta-title-1" className="ctaTitle">Ready to Discover Your</h2>
          <h2 id="cta-title-2" className="ctaTitleAccent">GEO Score?</h2>
          <p id="cta-desc" className="ctaDesc">
            Join forward-thinking brands optimizing for the new era of generative search.
          </p>
          <div id="cta-actions" className="ctaActions">
            <Link id="cta-primary" className="ctaPrimary" href="/geo-hub">
              Launch Percepta &nbsp;→
            </Link>
          </div>
        </div>
      </div>

    </main>
    </>
  );
}
