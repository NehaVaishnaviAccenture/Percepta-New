import Link from 'next/link';

const navItems = [
  { label: 'About', href: '/' },
  { label: 'GEO Hub', href: '/geo-hub' },
  { label: 'Get Support', href: '/get-support' },
];

function TopNav() {
  return (
    <nav id="top-nav" className="topNav" style={{
      background: 'white',
      borderBottom: 'none',
      padding: '14px 40px',
      position: 'sticky',
      top: 0,
      zIndex: 999,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    }}>
      <div id="nav-logo" className="navLogo" style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
        <div id="nav-logo-icon" className="navLogoIcon" style={{ width: 30, height: 30, borderRadius: 7, background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg id="nav-logo-svg" className="navLogoSvg" width="16" height="16" viewBox="0 0 22 22" fill="none">
            <circle cx="9.5" cy="9.5" r="5.5" stroke="white" strokeWidth="1.8" fill="none"/>
            <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M7 9.5 Q8.5 7 9.5 9.5 Q10.5 12 12 9.5" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.9"/>
          </svg>
        </div>
        <span id="nav-brand-name" className="navBrandName" style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>Percepta</span>
      </div>
      <div id="nav-links" className="navLinks" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {navItems.map(({ label, href }) => (
          <Link key={href} href={href} id={`nav-link-${label.toLowerCase().replace(/\s+/g, '-')}`} className="navLink" style={{ color: '#6B7280', borderRadius: 8, fontWeight: 500, fontSize: '0.88rem', padding: '8px 48px', textDecoration: 'none' }}>
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
  'Accenture team to implement and drive results',
];

export default function Overview() {
  return (
    <>
    <TopNav />
    <main id="main" className="main">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <div id="hero" className="hero" style={{ background: 'linear-gradient(170deg,#fff 55%,#F3EEFF 100%)', padding: '52px 40px 40px', textAlign: 'center' }}>
        <div id="hero-badge" className="heroBadge" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          border: '1px solid #DDD6FE', borderRadius: 50, padding: '8px 22px',
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.1em',
          color: '#7C3AED', textTransform: 'uppercase', marginBottom: 44,
          background: 'rgba(255,255,255,0.9)',
        }}>
          ✦ &nbsp;AI-Powered Brand Intelligence &nbsp;·&nbsp; Powered by Accenture
        </div>
        <div id="hero-headline" className="heroHeadline" style={{ fontSize: '4.6rem', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-3px', marginBottom: 20 }}>
          <span id="hero-headline-prefix" className="heroHeadlinePrefix" style={{ color: '#111827' }}>How does AI </span>
          <span id="hero-headline-keyword" className="heroHeadlineKeyword" style={{ color: '#7C3AED' }}>see</span>
          <span id="hero-headline-suffix" className="heroHeadlineSuffix" style={{ color: '#111827' }}> your brand?</span>
        </div>
        <p id="hero-subtext" className="heroSubtext" style={{ fontSize: '1.1rem', color: '#9CA3AF', maxWidth: 620, margin: '0 auto 36px', lineHeight: 1.75, fontWeight: 400 }}>
          Enter any brand URL and get a full GEO analysis — frequency, prominence, sentiment, competitor gaps, and exactly what to fix.
        </p>
        <div id="hero-cta" className="heroCta" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link id="hero-cta-primary" className="heroCtaPrimary" href="/geo-hub" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#7C3AED', color: 'white', border: 'none',
            borderRadius: 50, padding: '18px 36px', fontSize: '1.05rem',
            fontWeight: 700, textDecoration: 'none',
          }}>
            Get Started &nbsp;→
          </Link>
          <a id="hero-cta-secondary" className="heroCtaSecondary" href="#how" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'white', color: '#111827', border: '1.5px solid #D1D5DB',
            borderRadius: 50, padding: '18px 36px', fontSize: '1.05rem',
            fontWeight: 600, textDecoration: 'none',
          }}>
            See How It Works
          </a>
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <div id="how" className="howSection" style={{ background: '#F9F9FC', padding: '80px 40px', borderTop: '1px solid #E5E7EB' }}>
        <div id="how-header" className="howHeader" style={{ textAlign: 'center', marginBottom: 64 }}>
          <div id="how-badge" className="howBadge" style={{ display: 'inline-block', background: '#EDE9FE', color: '#7C3AED', borderRadius: 50, padding: '4px 14px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Process</div>
          <h2 id="how-title" className="howTitle" style={{ fontSize: '2.2rem', fontWeight: 900, color: '#111827', margin: '10px 0 10px' }}>How Percepta Works</h2>
          <p id="how-desc" className="howDesc" style={{ fontSize: '1rem', color: '#9CA3AF', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            From brand input to actionable GEO insights — in four simple steps.
          </p>
        </div>
        <div id="how-steps" className="howSteps" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 40, position: 'relative' }}>
          <div id="how-connector" className="howConnector" style={{ position: 'absolute', top: 22, left: 'calc(25% + 20px)', width: 'calc(75% - 40px)', height: 1, background: '#E5E7EB', zIndex: 0 }} />
          {steps.map((s, i) => (
            <div key={i} id={`how-step-${i + 1}`} className="howStep" style={{ position: 'relative', zIndex: 1 }}>
              <div id={`how-step-${i + 1}-number`} className="howStepNumber" style={{ fontSize: '3.2rem', fontWeight: 900, color: '#EDE9FE', lineHeight: 1, marginBottom: 24 }}>0{i + 1}</div>
              <div id={`how-step-${i + 1}-title`} className="howStepTitle" style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', marginBottom: 8 }}>{s.title}</div>
              <div id={`how-step-${i + 1}-desc`} className="howStepDesc" style={{ fontSize: '0.84rem', color: '#6B7280', lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── GEO SCORE ─────────────────────────────────────────────── */}
      <div id="geo-score-section" className="geoScoreSection" style={{ background: 'white', padding: '80px 40px', borderTop: '1px solid #E5E7EB' }}>
        <div id="geo-score-grid" className="geoScoreGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', marginBottom: 56 }}>

          <div id="geo-score-content" className="geoScoreContent">
            <div id="geo-score-eyebrow" className="geoScoreEyebrow" style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '.12em', color: '#7C3AED', textTransform: 'uppercase', marginBottom: 14 }}>The GEO Score</div>
            <h2 id="geo-score-title" className="geoScoreTitle" style={{ fontSize: '2.6rem', fontWeight: 900, color: '#111827', margin: '0 0 16px', lineHeight: 1.1 }}>One Number That<br />Changes Everything</h2>
            <p id="geo-score-desc" className="geoScoreDesc" style={{ fontSize: '1rem', color: '#9CA3AF', lineHeight: 1.8, margin: '0 0 12px', fontWeight: 400 }}>
              Understand how frequently and positively your brand appears in AI-generated answers, and get clear next steps to improve.
            </p>
          </div>

          <div id="geo-score-card" className="geoScoreCard" style={{ background: 'white', borderRadius: 20, padding: '44px 40px', boxShadow: '0 8px 40px rgba(124,58,237,0.13)', border: '1px solid #F0EBFF', textAlign: 'center' }}>
            <div id="geo-score-card-label" className="geoScoreCardLabel" style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '.14em', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 18 }}>GEO SCORE</div>
            <div id="geo-score-number" className="geoScoreNumber" style={{ fontSize: '5.5rem', fontWeight: 900, color: '#7C3AED', lineHeight: 1, marginBottom: 20 }}>78</div>
            <div id="geo-score-bar" className="geoScoreBar" style={{ background: '#F3F4F6', borderRadius: 50, height: 6, width: '100%', marginBottom: 10, overflow: 'hidden' }}>
              <div id="geo-score-bar-fill" className="geoScoreBarFill" style={{ background: '#7C3AED', height: 6, borderRadius: 50, width: '78%' }} />
            </div>
            <div id="geo-score-out-of" className="geoScoreOutOf" style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: 20 }}>out of 100</div>
            <span id="geo-score-band-chip" className="geoScoreBandChip" style={{ background: '#EDE9FE', color: '#7C3AED', borderRadius: 50, padding: '6px 22px', fontSize: '0.84rem', fontWeight: 700 }}>Good</span>
          </div>
        </div>

        {/* Score Bands */}
        <div id="score-bands" className="scoreBands" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 64 }}>
          {bands.map((b, i) => (
            <div key={i} id={`score-band-${i + 1}`} className="scoreBandCard" style={{ background: b.bg, borderRadius: 14, padding: '28px 24px', textAlign: 'center', border: `1.5px solid ${b.border}` }}>
              <div id={`score-band-${i + 1}-range`} className="scoreBandRange" style={{ fontSize: '0.82rem', fontWeight: 700, color: b.color, marginBottom: 4 }}>{b.range}</div>
              <div id={`score-band-${i + 1}-label`} className="scoreBandLabel" style={{ fontSize: '1.3rem', fontWeight: 900, color: b.color, marginBottom: 4 }}>{b.label}</div>
              <div id={`score-band-${i + 1}-desc`} className="scoreBandDesc" style={{ fontSize: '0.78rem', color: b.color }}>{b.desc}</div>
            </div>
          ))}
        </div>

        {/* Comparison */}
        <div id="comparison" className="comparison" style={{ borderTop: '1px solid #E5E7EB', paddingTop: 40 }}>
          <div id="comparison-header" className="comparisonHeader" style={{ textAlign: 'center', marginBottom: 36 }}>
            <div id="comparison-badge" className="comparisonBadge" style={{ display: 'inline-block', background: '#EDE9FE', color: '#7C3AED', borderRadius: 50, padding: '4px 14px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 16 }}>What You Gain</div>
            <h2 id="comparison-title" className="comparisonTitle" style={{ fontSize: '3rem', fontWeight: 900, color: '#111827', margin: '0 0 16px', lineHeight: 1.15 }}>
              Others Give You Data.<br />We Give You a Solution.
            </h2>
            <p id="comparison-desc" className="comparisonDesc" style={{ fontSize: '1rem', color: '#9CA3AF', maxWidth: 520, margin: '0 auto', lineHeight: 1.7, fontWeight: 400 }}>
              Every other GEO tool stops at the dashboard. Percepta combines measurement, strategy, and execution in one place.
            </p>
          </div>

          <div id="comparison-grid" className="comparisonGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900, margin: '0 auto' }}>

            {/* Competitors card */}
            <div id="comparison-competitors" className="comparisonCard comparisonCard--competitors" style={{ background: '#F9FAFB', borderRadius: 16, border: '1px solid #E5E7EB', padding: '36px 32px' }}>
              <div id="comparison-competitors-label" className="comparisonCardLabel" style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '.12em', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 24 }}>Competitors</div>
              <div id="comparison-competitors-list" className="comparisonList" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {competitors.map((item, i) => (
                  <div key={i} id={`comparison-competitor-${i + 1}`} className="comparisonItem" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span id={`comparison-competitor-${i + 1}-icon`} className="comparisonItemIcon" style={{ color: '#9CA3AF', fontSize: '1.1rem', flexShrink: 0 }}>—</span>
                    <span id={`comparison-competitor-${i + 1}-text`} className="comparisonItemText" style={{ fontSize: '0.88rem', color: '#9CA3AF' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Percepta card */}
            <div id="comparison-percepta" className="comparisonCard comparisonCard--percepta" style={{ background: 'white', borderRadius: 16, border: '2px solid #7C3AED', padding: '36px 32px', position: 'relative' }}>
              <div id="comparison-percepta-badge" className="comparisonPerceptaBadge" style={{ position: 'absolute', top: -14, left: 24, background: '#7C3AED', color: 'white', borderRadius: 50, padding: '4px 18px', fontSize: '0.75rem', fontWeight: 700 }}>Percepta by Accenture</div>
              <div id="comparison-percepta-label" className="comparisonCardLabel" style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '.12em', color: '#7C3AED', textTransform: 'uppercase', marginBottom: 24, marginTop: 8 }}>Your All-In-One GEO Solution</div>
              <div id="comparison-percepta-list" className="comparisonList" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {perceptaFeatures.map((item, i) => (
                  <div key={i} id={`comparison-feature-${i + 1}`} className="comparisonItem" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span id={`comparison-feature-${i + 1}-icon`} className="comparisonItemIcon" style={{ color: '#7C3AED', fontSize: '1.1rem', fontWeight: 700, flexShrink: 0, lineHeight: 1.4 }}>+</span>
                    <span id={`comparison-feature-${i + 1}-text`} className="comparisonItemText" style={{ fontSize: '0.88rem', color: '#111827', lineHeight: 1.5, fontWeight: i === perceptaFeatures.length - 1 ? 700 : 400 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <div id="cta-section" className="ctaSection" style={{ background: 'white', padding: '40px 40px', borderTop: '1px solid #E5E7EB' }}>
        <div id="cta-card" className="ctaCard" style={{ background: 'linear-gradient(135deg,#F8F5FF 0%,#EDE9FE 45%,#F3EEFF 100%)', border: '1.5px solid #C4B5FD', borderRadius: 28, padding: '36px 60px', textAlign: 'center' }}>
          <h2 id="cta-title-1" className="ctaTitle" style={{ fontSize: '3rem', fontWeight: 900, color: '#111827', margin: '0 0 4px', lineHeight: 1.1 }}>Ready to Discover Your</h2>
          <h2 id="cta-title-2" className="ctaTitleAccent" style={{ fontSize: '3rem', fontWeight: 900, color: '#7C3AED', margin: '0 0 20px', lineHeight: 1.1 }}>GEO Score?</h2>
          <p id="cta-desc" className="ctaDesc" style={{ fontSize: '1rem', color: '#9CA3AF', maxWidth: 480, margin: '0 auto 4px', lineHeight: 1.7, fontWeight: 400 }}>
            Join forward-thinking brands optimizing for the new era of generative search — backed by Accenture.
          </p>
          <div id="cta-actions" className="ctaActions" style={{ marginTop: 24 }}>
            <Link id="cta-primary" className="ctaPrimary" href="/geo-hub" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#7C3AED', color: 'white', border: 'none',
              borderRadius: 50, padding: '18px 44px', fontSize: '1.05rem',
              fontWeight: 700, textDecoration: 'none', marginTop: 16,
            }}>
              Launch Percepta &nbsp;→
            </Link>
          </div>
        </div>
      </div>

    </main>
    </>
  );
}
