import Link from 'next/link';

const steps = [
  { title: 'Enter Your Brand', desc: 'Input your brand name, keywords, and competitor list.' },
  { title: 'AI Engine Scanning', desc: 'Percepta queries AI engines with hundreds of prompts to analyze mentions.' },
  { title: 'Score Calculation', desc: 'Our algorithm computes your GEO Score based on visibility, sentiment, and positioning.' },
  { title: 'Actionable Insights', desc: 'Receive detailed reports with specific recommendations.' },
];

const bands = [
  { bg: '#ECFDF5', border: '#6EE7B7', color: '#065F46', range: '80–100', label: 'Excellent', desc: 'Well optimized for AI citation' },
  { bg: '#EFF6FF', border: '#93C5FD', color: '#1E40AF', range: '70–79', label: 'Good', desc: 'Minor improvements recommended' },
  { bg: '#FFFBEB', border: '#FCD34D', color: '#92400E', range: '45–69', label: 'Needs Work', desc: 'Several issues to address' },
  { bg: '#FFF1F2', border: '#FCA5A5', color: '#991B1B', range: '0–44', label: 'Poor', desc: 'Major optimization needed' },
];

export default function Overview() {
  return (
    <main>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(170deg,#fff 55%,#F3EEFF 100%)', padding: '52px 40px 40px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          border: '1px solid #DDD6FE', borderRadius: 50, padding: '8px 22px',
          fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.1em',
          color: '#7C3AED', textTransform: 'uppercase', marginBottom: 44,
          background: 'rgba(255,255,255,0.9)',
        }}>
          ✦ &nbsp;AI-Powered Brand Intelligence &nbsp;·&nbsp; Powered by Accenture
        </div>
        <div style={{ fontSize: '4.6rem', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-3px', marginBottom: 28 }}>
          <span style={{ color: '#111827' }}>Your Brand&apos;s </span>
          <span style={{ color: '#7C3AED' }}>GEO</span>
          <span style={{ color: '#111827' }}> Score</span>
        </div>
        <p style={{ fontSize: '1.05rem', color: '#6B7280', maxWidth: 860, margin: '0 auto 36px', lineHeight: 1.7 }}>
          The Percepta GEO Score measures how often and favorably your brand is cited in AI-generated responses.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/geo-hub" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#7C3AED', color: 'white', border: 'none',
            borderRadius: 50, padding: '18px 36px', fontSize: '1.05rem',
            fontWeight: 700, textDecoration: 'none',
          }}>
            Get Your GEO Score &nbsp;→
          </Link>
          <a href="#how" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'white', color: '#111827', border: '1.5px solid #D1D5DB',
            borderRadius: 50, padding: '18px 36px', fontSize: '1.05rem',
            fontWeight: 600, textDecoration: 'none',
          }}>
            See How It Works
          </a>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div id="how" style={{ background: '#F9F9FC', padding: '80px 40px', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-block', background: '#EDE9FE', color: '#7C3AED', borderRadius: 50, padding: '4px 14px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Process</div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#111827', margin: '10px 0 14px' }}>How Percepta Works</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 40, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 22, left: 'calc(25% + 20px)', width: 'calc(75% - 40px)', height: 1, background: '#E5E7EB', zIndex: 0 }} />
          {steps.map((s, i) => (
            <div key={i} style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#EDE9FE', lineHeight: 1, marginBottom: 24 }}>0{i + 1}</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: '0.84rem', color: '#6B7280', lineHeight: 1.7 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* GEO SCORE SECTION */}
      <div style={{ background: 'white', padding: '80px 40px', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', marginBottom: 56 }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '.12em', color: '#7C3AED', textTransform: 'uppercase', marginBottom: 14 }}>The GEO Score</div>
            <h2 style={{ fontSize: '2.6rem', fontWeight: 900, color: '#111827', margin: '0 0 20px', lineHeight: 1.1 }}>One Number That<br />Changes Everything</h2>
            <p style={{ fontSize: '0.95rem', color: '#6B7280', lineHeight: 1.8, margin: 0 }}>Your GEO Score distills complex AI citation data into a single, actionable metric.</p>
          </div>
          <div style={{ background: 'white', borderRadius: 20, padding: '44px 40px', boxShadow: '0 8px 40px rgba(124,58,237,0.13)', border: '1px solid #F0EBFF', textAlign: 'center' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '.14em', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 18 }}>GEO SCORE</div>
            <div style={{ fontSize: '5.5rem', fontWeight: 900, color: '#7C3AED', lineHeight: 1, marginBottom: 20 }}>78</div>
            <div style={{ background: '#F3F4F6', borderRadius: 50, height: 6, width: '100%', marginBottom: 10, overflow: 'hidden' }}>
              <div style={{ background: '#7C3AED', height: 6, borderRadius: 50, width: '78%' }} />
            </div>
            <div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: 20 }}>out of 100</div>
            <span style={{ background: '#EDE9FE', color: '#7C3AED', borderRadius: 50, padding: '6px 22px', fontSize: '0.84rem', fontWeight: 700 }}>Good</span>
          </div>
        </div>

        {/* Score Bands */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
          {bands.map((b, i) => (
            <div key={i} style={{ background: b.bg, borderRadius: 14, padding: '28px 24px', textAlign: 'center', border: `1.5px solid ${b.border}` }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: b.color, marginBottom: 4 }}>{b.range}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: b.color, marginBottom: 4 }}>{b.label}</div>
              <div style={{ fontSize: '0.78rem', color: b.color }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: 'white', padding: '80px 40px', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ background: 'linear-gradient(135deg,#F8F5FF 0%,#EDE9FE 45%,#F3EEFF 100%)', border: '1.5px solid #C4B5FD', borderRadius: 28, padding: '52px 60px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 900, color: '#111827', margin: '0 0 4px', lineHeight: 1.1 }}>Ready to Discover Your</h2>
          <h2 style={{ fontSize: '3rem', fontWeight: 900, color: '#7C3AED', margin: '0 0 28px', lineHeight: 1.1 }}>GEO Score?</h2>
          <div style={{ marginTop: 40 }}>
            <Link href="/geo-hub" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#7C3AED', color: 'white', border: 'none',
              borderRadius: 50, padding: '18px 44px', fontSize: '1.05rem',
              fontWeight: 700, textDecoration: 'none', marginTop: 36,
            }}>
              Launch Percepta &nbsp;→
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}