import Link from 'next/link';

const deliver = [
  {
    title: 'Agent Ranking Diagnostic (ARD)', bg: '#1E1B5E',
    activities: ['Develop representative prompts','Execute multi-run stability testing','Extract agent-generated rankings','Perform power distribution modeling','Build competitor adjacency maps'],
    deliverables: ['AXO Baseline Report','Brand & Product Ranking Index','Power Curve Analysis','Competitor Adjacency Analysis','AXO Baseline Score (v1.0)'],
  },
  {
    title: 'Agent Optimization Plan (AOP)', bg: '#2D2A70',
    activities: ['Develop LLM-ready content assets','Strengthen product-attribute associations','Optimize content for agent ingestion','Create Content Influence Blueprint'],
    deliverables: ['Agent Optimization Plan','LLM-Ready Content Package','Attribute Reinforcement Strategy','Content Influence Blueprint'],
  },
  {
    title: 'Distribution & Technical Influence (DTI)', bg: '#3D3A8A',
    activities: ['Audit tagging and metadata','Identify missing structured data','Improve backlink structure','Identify dormant URLs','Audit schema markup'],
    deliverables: ['Distribution & Technical Influence Report','Metadata Remediation Plan','Backlink & Redirect Strategy','Schema Optimization Guide'],
  },
  {
    title: 'Impact Measurement (Re-Diagnostic)', bg: '#5B21B6',
    activities: ['Re-test all prompts','Measure semantic drift and ranking changes','Recompute AXO Score'],
    deliverables: ['AXO Impact Report','Before/After Ranking Comparison','Updated AXO Score (v2.0)','Recommendations for ongoing improvement'],
  },
];

const WS_LEFT = [
  { ws: 'Workstream 1', title: 'Agent Ranking Diagnostic (ARD)', desc: 'Establish the <strong>baseline ranking performance</strong> of AI agents comparing your brand to competitive offerings.' },
  { ws: 'Workstream 4', title: 'Impact Measurement (Re-Diagnostic)', desc: 'Re-perform the diagnostic to <strong>Re-measure performance</strong> and quantify improvements.' },
];

const WS_RIGHT = [
  { ws: 'Workstream 3', title: 'Distribution and Technical Influence Layer (DTI)', desc: 'Pinpoint and <strong>propose specific technical and distribution improvements</strong> to maximize LLM ingestion.' },
  { ws: 'Workstream 2', title: 'Agent Optimization Plan (AOP)', desc: '<strong>Design and deploy a specific optimization strategy</strong> aimed at elevating agent recognition of your brand.' },
];

const stats = [
  { val: '10+', label: 'Successful Clients' },
  { val: '4X', label: 'Higher Conversion' },
  { val: '15%', label: 'Citation Growth' },
  { val: '68%', label: 'Longer Sessions' },
];

const options = [
  { num: 'Option 1', weeks: 6, recommended: false, items: ['Agent Ranking Diagnostic (ARD)','Agent Optimization Plan (AOP)'] },
  { num: 'Option 2', weeks: 7, recommended: true, items: ['Agent Ranking Diagnostic (ARD)','Agent Optimization Plan (AOP)','Impact Measurement (Re-Diagnostic)'] },
  { num: 'Option 3', weeks: 7, recommended: false, items: ['Agent Ranking Diagnostic (ARD)','Agent Optimization Plan (AOP)','Distribution and Technical Influence (DTI)','Impact Measurement (Re-Diagnostic)'] },
];

export default function GetSupport() {
  return (
    <main>
      {/* HERO */}
      <div style={{ background: '#7C3AED', padding: '56px 40px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.12em', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', marginBottom: 10 }}>Accenture GEO Services</div>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 900, color: 'white', margin: '0 0 14px', letterSpacing: '-1px' }}>We&apos;ve Got You Covered</h1>
        <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.82)', maxWidth: 500, margin: '0 auto', lineHeight: 1.8 }}>From GEO diagnostic to full optimization. Accenture&apos;s team handles everything, end to end.</p>
      </div>

      {/* OUR APPROACH */}
      <div style={{ background: 'white', padding: '56px 40px 0', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: '#EDE9FE', color: '#7C3AED', borderRadius: 50, padding: '4px 14px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Our Approach</div>
        <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#111827', margin: '10px 0 10px' }}>GEO is No Longer Optional</h2>
        <p style={{ fontSize: '0.92rem', color: '#6B7280', margin: '0 auto 40px', maxWidth: 680, lineHeight: 1.7 }}>While search spend rises, its impact is fading as AI agents increasingly shape the decisions search used to influence.</p>
      </div>

      {/* INFINITY + WORKSTREAMS — fixed with <img> tag instead of next/image */}
      <div style={{ background: 'white', padding: '0 40px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            {WS_LEFT.map((w, i) => (
              <div key={i} style={{ padding: '0 20px 0 0', marginBottom: 36 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827', marginBottom: 3 }}><strong>{w.ws}:</strong></div>
                <div style={{ fontSize: '0.88rem', fontStyle: 'italic', color: '#374151', marginBottom: 10 }}>{w.title}</div>
                <p style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.7, margin: 0 }} dangerouslySetInnerHTML={{ __html: w.desc }} />
              </div>
            ))}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img
              src="/infinity.png"
              alt="Infinity diagram showing the four workstreams"
              style={{ width: '100%', maxWidth: 400, height: 'auto', display: 'block' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <div>
            {WS_RIGHT.map((w, i) => (
              <div key={i} style={{ padding: '0 0 0 20px', marginBottom: 36 }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827', marginBottom: 3 }}><strong>{w.ws}:</strong></div>
                <div style={{ fontSize: '0.88rem', fontStyle: 'italic', color: '#374151', marginBottom: 10 }}>{w.title}</div>
                <p style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.7, margin: 0 }} dangerouslySetInnerHTML={{ __html: w.desc }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ background: 'white', padding: '32px 40px 40px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 0, borderTop: '1px dashed #D1D5DB', paddingTop: 32 }}>
          <div style={{ textAlign: 'center', padding: '0 20px' }}>
            <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#111827', lineHeight: 1 }}>6</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: 6 }}>Week Engagement</div>
            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: 3 }}>Phase 1</div>
          </div>
          <div style={{ background: '#E5E7EB' }} />
          <div style={{ textAlign: 'center', padding: '0 20px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Pilot Phase 1</div>
            <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#111827', lineHeight: 1 }}>2</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: 6 }}>AI Agents</div>
            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: 3 }}>ChatGPT &amp; Gemini</div>
          </div>
          <div style={{ background: '#E5E7EB' }} />
          <div style={{ textAlign: 'center', padding: '0 20px' }}>
            <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#111827', lineHeight: 1 }}>4</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginTop: 6 }}>Workstreams</div>
            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: 3 }}>End to end coverage</div>
          </div>
        </div>
      </div>

      {/* DELIVERABLES */}
      <div style={{ background: '#F9F9FC', padding: '48px 40px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-block', background: '#EDE9FE', color: '#7C3AED', borderRadius: 50, padding: '4px 14px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Deliverables</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827', margin: '8px 0 0' }}>Activities and What We Deliver</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 3, marginBottom: 12 }}>
          {deliver.map((d, i) => (
            <div key={i} style={{ background: d.bg, padding: '18px 20px', borderRadius: i===0?'8px 0 0 0':i===3?'0 8px 0 0':0 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.65)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.07em' }}>Workstream 0{i+1}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white', lineHeight: 1.35 }}>{d.title}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          {deliver.map((d, i) => (
            <div key={i} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 8, padding: 18 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', borderBottom: '1px solid #F3F4F6', paddingBottom: 8, marginBottom: 12, textAlign: 'center' }}>Activities</div>
              <ul style={{ listStyleType: 'disc', paddingLeft: 16, margin: 0, fontSize: '0.78rem', color: '#374151', lineHeight: 1.75 }}>
                {d.activities.map((a, j) => <li key={j}>{a}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          {deliver.map((d, i) => (
            <div key={i} style={{ background: '#EEEAF8', border: '1px solid #DDD6FE', borderRadius: 8, padding: 18 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', borderBottom: '1px solid #DDD6FE', paddingBottom: 8, marginBottom: 12, textAlign: 'center' }}>Deliverables</div>
              <ul style={{ listStyleType: 'disc', paddingLeft: 16, margin: 0, fontSize: '0.78rem', color: '#374151', lineHeight: 1.75 }}>
                {d.deliverables.map((dl, j) => <li key={j}>{dl}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* PILOT OPTIONS */}
      <div style={{ background: 'white', padding: '48px 40px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-block', background: '#EDE9FE', color: '#7C3AED', borderRadius: 50, padding: '4px 14px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Explore Offers</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827', margin: '8px 0 6px' }}>Choose Your Pilot Program</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28 }}>
          {options.map((opt, i) => (
            <div key={i} style={{ border: opt.recommended?'2px solid #7C3AED':'1px solid #E5E7EB', borderRadius: 16, padding: '36px 32px', position: 'relative', background: opt.recommended?'#FAFBFF':'white' }}>
              {opt.recommended && (
                <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#7C3AED', color: 'white', borderRadius: 50, padding: '3px 16px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>Recommended</div>
              )}
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: opt.recommended?'#7C3AED':'#9CA3AF', marginBottom: 10 }}>{opt.num}</div>
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#111827', lineHeight: 1, marginBottom: 2 }}>{opt.weeks}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#374151', marginBottom: 28 }}>Week Engagement</div>
              <div style={{ height: 1, background: opt.recommended?'#E5E7EB':'#F3F4F6', marginBottom: 24 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {opt.items.map((item, j) => (
                  <div key={j} style={{ display: 'flex', gap: 10, fontSize: '0.86rem', color: '#374151' }}>
                    <span style={{ color: '#7C3AED', fontWeight: 700 }}>+</span>{item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PROVEN RESULTS */}
      <div style={{ background: '#7C3AED', padding: '56px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '.12em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 10 }}>Proven Results</div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', margin: '0 0 14px', lineHeight: 1.25 }}>Validated Impact Across<br />10+ Client Engagements</h2>
            <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.8, margin: 0 }}>Across retail, travel, financial services, and hospitality, Percepta has consistently delivered measurable improvements.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {stats.map((s, i) => (
              <div key={i} style={{ border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'white' }}>{s.val}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginTop: 5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
