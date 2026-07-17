'use client';
import React from 'react';
import { AppShell } from '../components/AppShell';
import './geo-optimization-services.css';

const deliver = [
  {
    title: 'Agent Ranking Diagnostic (ARD)', bg: '#350052',
    activities: ['Develop representative prompts','Execute multi-run stability testing','Extract agent-generated rankings','Perform power distribution modeling','Build competitor adjacency maps'],
    deliverables: ['AXO Baseline Report','Brand & Product Ranking Index','Power Curve Analysis','Competitor Adjacency Analysis','AXO Baseline Score (v1.0)'],
  },
  {
    title: 'Agent Optimization Plan (AOP)', bg: '#50007D',
    activities: ['Develop LLM-ready content assets','Strengthen product-attribute associations','Optimize content for agent ingestion','Create Content Influence Blueprint'],
    deliverables: ['Agent Optimization Plan','LLM-Ready Content Package','Attribute Reinforcement Strategy','Content Influence Blueprint'],
  },
  {
    title: 'Distribution & Technical Influence (DTI)', bg: '#6B00A8',
    activities: ['Audit tagging and metadata','Identify missing structured data','Improve backlink structure','Identify dormant URLs','Audit schema markup'],
    deliverables: ['Distribution & Technical Influence Report','Metadata Remediation Plan','Backlink & Redirect Strategy','Schema Optimization Guide'],
  },
  {
    title: 'Impact Measurement (Re-Diagnostic)', bg: '#A100FF',
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
    <AppShell breadcrumb="GEO Optimization Services">
    <main id="gs-main" className="gsMain">

      {/* HERO */}
      <section id="gs-hero" className="gsHero">
        <span id="gs-hero-eyebrow" className="gsEyebrow gsHeroEyebrow">GEO Optimization Services</span>
        <h1 id="gs-hero-title" className="gsHeroTitle">
          We&apos;ve Got You Covered
        </h1>
        <p id="gs-hero-body" className="gsHeroBody">From GEO diagnostic to full optimization. Our team handles everything, end to end.</p>
      </section>

      {/* OUR APPROACH */}
      <section id="gs-approach" className="gsApproach">
        <span id="gs-approach-eyebrow" className="gsEyebrow gsApproachEyebrow">Our Approach</span>
        <h2 id="gs-approach-title" className="gsApproachTitle">GEO is No Longer Optional</h2>
        <p id="gs-approach-body" className="gsApproachBody">While search spend rises, its impact is fading as AI agents increasingly shape the decisions search used to influence.</p>
      </section>

      {/* WORKSTREAMS */}
      <section id="gs-workstreams" className="gsWorkstreams">
        <div id="gs-workstreams-grid" className="gsWorkstreamsGrid">

          <div id="gs-workstreams-left" className="gsWorkstreamsLeft">
            {WS_LEFT.map((w, i) => (
              <div key={i} id={`gs-ws-left-${i}`} className="gsWsItem gsWsItemLeft">
                <div className="gsWsLabel"><strong>{w.ws}:</strong></div>
                <div className="gsWsTitle">{w.title}</div>
                <p className="gsWsDesc" dangerouslySetInnerHTML={{ __html: w.desc }} />
              </div>
            ))}
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div id="gs-workstreams-diagram" className="gsWorkstreamsDiagram">
            <img
              id="gs-infinity-img"
              className="gsInfinityImg"
              src="/infinity.png"
              alt="Infinity diagram showing the four workstreams"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>

          <div id="gs-workstreams-right" className="gsWorkstreamsRight">
            {WS_RIGHT.map((w, i) => (
              <div key={i} id={`gs-ws-right-${i}`} className="gsWsItem gsWsItemRight">
                <div className="gsWsLabel"><strong>{w.ws}:</strong></div>
                <div className="gsWsTitle">{w.title}</div>
                <p className="gsWsDesc" dangerouslySetInnerHTML={{ __html: w.desc }} />
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* STATS */}
      <section id="gs-stats" className="gsStats">
        <div id="gs-stats-grid" className="gsStatsGrid">
          <div id="gs-stat-weeks" className="gsStatItem">
            <div className="gsStatNum">6</div>
            <div className="gsStatLabel">Week Engagement</div>
            <div className="gsStatSub">Phase 1</div>
          </div>
          <div className="gsStatDivider" />
          <div id="gs-stat-agents" className="gsStatItem">
            <div className="gsStatPre">Pilot Phase 1</div>
            <div className="gsStatNum">2</div>
            <div className="gsStatLabel">AI Agents</div>
            <div className="gsStatSub">ChatGPT &amp; Gemini</div>
          </div>
          <div className="gsStatDivider" />
          <div id="gs-stat-workstreams" className="gsStatItem">
            <div className="gsStatNum">4</div>
            <div className="gsStatLabel">Workstreams</div>
            <div className="gsStatSub">End to end coverage</div>
          </div>
        </div>
      </section>

      {/* DELIVERABLES */}
      <section id="gs-deliverables" className="gsDeliverables">
        <div id="gs-deliverables-header" className="gsDeliverablesHeader">
          <span id="gs-deliverables-eyebrow" className="gsEyebrow gsDeliverablesEyebrow">Deliverables</span>
          <h2 id="gs-deliverables-title" className="gsDeliverablesTitle">Activities and What We Deliver</h2>
        </div>

        <div id="gs-deliver-headers" className="gsDeliverHeaders">
          {deliver.map((d, i) => (
            <div key={i} id={`gs-deliver-header-${i}`} className="gsDeliverHeader" style={{ background: d.bg }}>
              <div className="gsDeliverWsLabel">Workstream 0{i+1}</div>
              <div className="gsDeliverWsTitle">{d.title}</div>
            </div>
          ))}
        </div>

        <div id="gs-deliver-activities" className="gsDeliverActivities">
          {deliver.map((d, i) => (
            <div key={i} id={`gs-activities-${i}`} className="gsActivitiesCard">
              <div className="gsActivitiesCardTitle">Activities</div>
              <ul className="gsActivitiesList">
                {d.activities.map((a, j) => <li key={j} className="gsActivitiesItem">{a}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div id="gs-deliver-outputs" className="gsDeliverOutputs">
          {deliver.map((d, i) => (
            <div key={i} id={`gs-outputs-${i}`} className="gsOutputsCard">
              <div className="gsOutputsCardTitle">Deliverables</div>
              <ul className="gsOutputsList">
                {d.deliverables.map((dl, j) => <li key={j} className="gsOutputsItem">{dl}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* PILOT OPTIONS */}
      <section id="gs-pilots" className="gsPilots">
        <div id="gs-pilots-header" className="gsPilotsHeader">
          <span id="gs-pilots-eyebrow" className="gsEyebrow gsPilotsEyebrow">Explore Offers</span>
          <h2 id="gs-pilots-title" className="gsPilotsTitle">Choose Your Pilot Program</h2>
        </div>
        <div id="gs-pilots-grid" className="gsPilotsGrid">
          {options.map((opt, i) => (
            <div key={i} id={`gs-pilot-${i}`} className={`gsPilotCard${opt.recommended ? ' gsPilotCard--recommended' : ''}`}>
              {opt.recommended && (
                <div className="gsPilotRecommendedBadge">Recommended</div>
              )}
              <div className="gsPilotNum">{opt.num}</div>
              <div className="gsPilotWeeks">{opt.weeks}</div>
              <div className="gsPilotWeeksLabel">Week Engagement</div>
              <div className="gsPilotDivider" />
              <div className="gsPilotItems">
                {opt.items.map((item, j) => (
                  <div key={j} className="gsPilotItem">
                    <span className="gsPilotItemMark">+</span>{item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* GET IN CONTACT */}
      <section id="gs-contact" className="gsResults">
        <div id="gs-results-grid" className="gsResultsGrid">
          <div id="gs-results-copy" className="gsResultsCopy">
            <span id="gs-results-eyebrow" className="gsEyebrow gsResultsEyebrow">Get In Contact</span>
            <h2 id="gs-results-title" className="gsResultsTitle">Want to Know More?</h2>
            <p id="gs-results-body" className="gsResultsBody">We've got you covered.</p>
          </div>
        </div>
      </section>

      {/* PROVEN RESULTS */}
      {/* <section id="gs-results" className="gsResults">
        <div id="gs-results-grid" className="gsResultsGrid">
          <div id="gs-results-copy" className="gsResultsCopy">
            <span id="gs-results-eyebrow" className="gsEyebrow gsResultsEyebrow">Proven Results</span>
            <h2 id="gs-results-title" className="gsResultsTitle">Validated Impact Across<br />10+ Client Engagements</h2>
            <p id="gs-results-body" className="gsResultsBody">Across retail, travel, financial services, and hospitality, Percepta has consistently delivered measurable improvements.</p>
          </div>
          <div id="gs-stats-cards" className="gsStatsCards">
            {stats.map((s, i) => (
              <div key={i} id={`gs-stat-card-${i}`} className="gsStatCard">
                <div className="gsStatCardVal">{s.val}</div>
                <div className="gsStatCardLabel">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

    </main>
    </AppShell>
  );
}
