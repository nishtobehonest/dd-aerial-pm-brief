import React, { useState } from 'react';
import {
  AlertTriangle, Zap, Target, Map, Radio, CheckCircle, Info,
  TrendingUp, Activity, BookOpen, ExternalLink, LayoutDashboard, ArrowRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ScatterChart, Scatter, ZAxis, ReferenceLine, Cell
} from 'recharts';
import data from './data.json';

// ─── TAB CONFIG ───────────────────────────────────────────────────────────────

const TABS = [
  { label: 'Summary', icon: LayoutDashboard },
  { label: 'Hardware Ecosystem Plan', icon: Map },
  { label: 'Customer Discovery & Roadmap', icon: Radio },
  { label: 'Market Opportunity', icon: TrendingUp },
  { label: 'Regulatory Timeline', icon: Activity },
  { label: 'References', icon: BookOpen },
];

// ─── DERIVED DATA FROM data.json ─────────────────────────────────────────────

const parseRegDate = (s) => {
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) return +m[1] + (+m[2] - 1) / 12;
  const y = s.match(/^(\d{4})/);
  if (y) return +y[1];
  return 2025;
};

const REG_TYPE_COLORS = { Positive: '#10b981', Risk: '#ef4444', Mixed: '#f59e0b', Pending: '#8b5cf6' };
const RELEVANCE_COLORS = { 'Very High': '#059669', 'High': '#2563eb', 'Medium': '#d97706', 'Low-Medium': '#94a3b8', 'Low': '#cbd5e1' };

const hwPlatforms = data.hardware_ecosystem.platforms;
const PLATFORM_CHART_DATA = hwPlatforms.map(p => ({
  name: p.name.length > 20 ? p.name.slice(0, 19) + '…' : p.name,
  fullName: p.name,
  support: p.dd_support_score,
  density: p.enterprise_density_score,
  ndaa: p.ndaa_compliant,
  bvlos: p.bvlos_eligible,
  supportLevel: p.dd_support_level,
}));

const CAP_GAP_DATA = (() => {
  const counts = hwPlatforms.reduce((acc, p) => {
    acc[p.dd_support_level] = (acc[p.dd_support_level] || 0) + 1;
    return acc;
  }, {});
  return [{ name: 'Platforms', Full: counts['Full'] || 0, Partnership: counts['Partnership'] || 0, 'Processing Only': counts['Processing Only'] || 0 }];
})();

const REG_EVENTS_DATA = data.regulatory_timeline.events.map(e => ({
  x: parseRegDate(e.date),
  y: e.risk_score,
  type: e.type,
  event: e.event,
  dd_impact: e.dd_impact,
  date_display: e.date_display,
  detail: e.detail,
  risk_level: e.risk_level,
  id: e.id,
}));

const compPlatforms = data.competitive_landscape.platforms;
const fm = data.competitive_landscape.feature_matrix;
const FM_PLATFORM_IDS = Object.keys(fm.scores);
const idToName = compPlatforms.reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {});
const COMP_SCATTER_DD = compPlatforms
  .filter(p => p.id === 'dronedeploy' && p.pricing_monthly_low != null)
  .map(p => ({ price: p.pricing_monthly_low, breadth: p.feature_breadth_score, size: p.g2_review_count || 50, name: p.name, g2: p.g2_rating, reviews: p.g2_review_count, strength: p.key_strength }));
const COMP_SCATTER_OTHER = compPlatforms
  .filter(p => p.id !== 'dronedeploy' && p.pricing_monthly_low != null)
  .map(p => ({ price: p.pricing_monthly_low, breadth: p.feature_breadth_score, size: p.g2_review_count || 50, name: p.name, g2: p.g2_rating, reviews: p.g2_review_count, strength: p.key_strength }));

const swByYear = data.market_sizing.commercial_software_services.data
  .reduce((a, d) => { a[d.year] = d.value_bn; return a; }, {});
const MARKET_CHART_DATA = data.market_sizing.total_market.data.map(d => ({
  year: d.year.toString(),
  total: d.value_bn,
  software: swByYear[d.year] || null,
}));
const VERTICAL_DATA = [...data.market_sizing.by_vertical.data].sort((a, b) => b.share_pct - a.share_pct);

// ─── TOOLTIP COMPONENTS ───────────────────────────────────────────────────────

const PlatformTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{d.fullName}</div>
      <div>DD Support: <strong>{d.supportLevel}</strong> ({d.support}/3)</div>
      <div>Enterprise Density: <strong>{d.density}/5</strong></div>
      <div>NDAA: <span style={{ color: d.ndaa ? '#059669' : '#dc2626' }}>{d.ndaa ? 'Compliant ✓' : 'Non-compliant ✗'}</span></div>
      <div>BVLOS Eligible: {d.bvlos ? 'Yes' : 'No'}</div>
    </div>
  );
};

const RegTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="chart-tooltip" style={{ maxWidth: 280 }}>
      <div className="chart-tooltip-title">{d.date_display}</div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.event}</div>
      <div style={{ fontSize: 11 }}><strong>DD Impact:</strong> {d.dd_impact}</div>
    </div>
  );
};

const CompTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="chart-tooltip" style={{ maxWidth: 260 }}>
      <div className="chart-tooltip-title">{d.name}</div>
      <div>Starting price: ${d.price}/mo</div>
      <div>Feature breadth: {d.breadth}/9</div>
      <div>G2: {d.g2 ? `${d.g2}★ (${d.reviews} reviews)` : 'N/A'}</div>
      {d.strength && <div style={{ marginTop: 4, fontSize: 11, color: '#64748b' }}>{d.strength}</div>}
    </div>
  );
};

const MarketTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      {payload.filter(p => p.value != null).map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: <strong>${p.value}B</strong></div>
      ))}
    </div>
  );
};

const VerticalTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      <div>Market share: <strong>{payload[0]?.value}%</strong></div>
      {d?.dd_relevance && <div>DD relevance: <strong>{d.dd_relevance}</strong></div>}
      {d?.cagr_note && <div style={{ fontSize: 11, marginTop: 4 }}>{d.cagr_note}</div>}
    </div>
  );
};

// ─── TAB 0: SUMMARY ──────────────────────────────────────────────────────────

const Summary = ({ onTab }) => (
  <div className="tab-content">
    <div className="section-header">
      <span className="section-tag">PRE-DISCOVERY · 5 TABS · 29 SOURCES</span>
      <h2 className="section-title">DroneDeploy Aerial PM — Pre-Discovery Brief</h2>
      <p className="section-framing">
        A structured hypothesis brief built entirely from public sources: product release notes, regulatory filings, third-party reviews, and market data. This is what I would walk into discovery to validate — not a 90-day plan.
      </p>
    </div>

    {/* Who this is */}
    <div className="content-block">
      <div className="block-label">ABOUT THIS BRIEF</div>
      <div className="summary-about-grid">
        <div className="summary-about-card">
          <div className="summary-about-label">AUTHOR</div>
          <div className="summary-about-value">Nishchay Vishwanath</div>
          <div className="summary-about-sub">Cornell MEM '26 · Product Management</div>
        </div>
        <div className="summary-about-card">
          <div className="summary-about-label">SCOPE</div>
          <div className="summary-about-value">DroneDeploy Aerial Platform</div>
          <div className="summary-about-sub">Hardware ecosystem, customer discovery, market sizing, regulatory risk</div>
        </div>
        <div className="summary-about-card">
          <div className="summary-about-label">SOURCES</div>
          <div className="summary-about-value">29 Public Sources</div>
          <div className="summary-about-sub">Release notes, G2 reviews, FAA filings, analyst reports</div>
        </div>
        <div className="summary-about-card">
          <div className="summary-about-label">DATE</div>
          <div className="summary-about-value">March 2026</div>
          <div className="summary-about-sub">Pre-discovery · All data publicly available</div>
        </div>
      </div>
    </div>

    {/* The core argument */}
    <div className="content-block">
      <div className="block-label">THE CORE ARGUMENT</div>
      <div className="summary-argument">
        <p>DroneDeploy's three strategic bets — hardware-agnostic capture, docked BVLOS at scale, and AI agents that reason — are mutually reinforcing when the system works. The Aerial platform is where they break or hold.</p>
        <p>The problem: all three bets currently depend on DJI, which holds ~70% of global commercial drone market share and is the <em>only</em> platform with native flight planning in DroneDeploy. That dependency is under simultaneous pressure from three directions: Part 108 rulemaking that could restrict DJI from BVLOS, a June 2025 Executive Order that structurally favors US-manufactured platforms, and import friction that kept DJI's Mavic 4 Pro off the US market entirely in 2025.</p>
        <p>The three hypotheses below are what I believe need to be tested first — in that order — and what discovery would confirm or kill.</p>
      </div>
    </div>

    {/* 3 hypotheses */}
    <div className="content-block">
      <div className="block-label">THREE HYPOTHESES · ORDERED BY URGENCY</div>
      <div className="summary-hyp-list">
        <div className="summary-hyp">
          <div className="summary-hyp-header">
            <span className="hypothesis-tag">H1</span>
            <span className="summary-hyp-title">The DJI dependency is a near-term business risk, not a regulatory footnote</span>
            <button className="summary-hyp-link" onClick={() => onTab(1)}>Hardware tab <ArrowRight size={12} /></button>
          </div>
          <p className="summary-hyp-body">DroneDeploy's native flight integration is 100% DJI. All NDAA-compliant alternatives (Skydio, Wingtra, Parrot) are processing-only. Federal and government-funded customers with NDAA requirements have no unified flight management option today — and Part 108 could remove DJI from BVLOS entirely. The gap between install-base reality and regulatory trajectory is where churn lives.</p>
          <div className="summary-hyp-signal">
            <span className="summary-signal-label">DISCOVERY CONFIRMED:</span> 2 customers actively evaluating platform switches. One energy company has 8 Skydio X10s sitting unused because DroneDeploy can't fly them.
          </div>
        </div>

        <div className="summary-hyp">
          <div className="summary-hyp-header">
            <span className="hypothesis-tag">H2</span>
            <span className="summary-hyp-title">Skydio X10 is the highest-ROI first native flight integration beyond DJI</span>
            <button className="summary-hyp-link" onClick={() => onTab(1)}>Hardware tab <ArrowRight size={12} /></button>
          </div>
          <p className="summary-hyp-body">Among NDAA-compliant platforms, Skydio has the highest enterprise density in the DroneDeploy install base. An existing processing SDK lowers integration complexity. The X10 is BVLOS-eligible, autonomous flight-capable, and deployed across the same verticals (construction, energy, infrastructure) where DJI is currently used. Wingtra is the right second integration (survey/mining); Parrot is third. Skydio is first because it addresses the broadest need with the lowest ramp.</p>
          <div className="summary-hyp-signal">
            <span className="summary-signal-label">ROADMAP DECISION:</span> Skydio X10 elevated to P0 for native flight integration. Processing-only posture maintained for all other non-DJI platforms pending Part 108 clarity.
          </div>
        </div>

        <div className="summary-hyp">
          <div className="summary-hyp-header">
            <span className="hypothesis-tag">H3</span>
            <span className="summary-hyp-title">The Aerial Pro adoption barrier is a workflow communication problem, not a pricing problem</span>
            <button className="summary-hyp-link" onClick={() => onTab(2)}>Discovery tab <ArrowRight size={12} /></button>
          </div>
          <p className="summary-hyp-body">Aerial Pro is the data quality layer that enables Progress AI, Safety AI, and Inspection AI to reason reliably. But there is no in-workflow signal that communicates this. Customers see "premium mapping tier" — not "AI enablement." DroneDeploy's pricing ($329–$599/mo vs Pix4D's $59–$299/mo) makes pricing an intuitive hypothesis, but discovery confirmed it's a framing problem: customers don't understand the quality–AI link until after the fact.</p>
          <div className="summary-hyp-signal">
            <span className="summary-signal-label">DISCOVERY CONFIRMED:</span> 2 customers didn't know their data quality limited AI agent reliability. "I didn't realize my maps weren't good enough for AI. Nobody told me that."
          </div>
        </div>
      </div>
    </div>

    {/* Key numbers */}
    <div className="content-block">
      <div className="block-label">KEY NUMBERS</div>
      <div className="summary-stats-grid">
        <div className="summary-stat">
          <div className="summary-stat-value">~70%</div>
          <div className="summary-stat-label">DJI global commercial drone market share</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value">6 of 8</div>
          <div className="summary-stat-label">NDAA-compliant platforms limited to processing-only in DD</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value">$65.1B</div>
          <div className="summary-stat-label">Total drone market 2025 · 12.5% CAGR through 2030</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value">24%</div>
          <div className="summary-stat-label">Software/services segment CAGR 2026–2035</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value">PAUSED</div>
          <div className="summary-stat-label">Part 108 rulemaking · FAA administrative issues</div>
        </div>
        <div className="summary-stat">
          <div className="summary-stat-value">190+</div>
          <div className="summary-stat-label">BVLOS Part 107 waivers issued through Oct 2024</div>
        </div>
      </div>
    </div>

    {/* Tab navigator */}
    <div className="content-block">
      <div className="block-label">WHAT'S IN EACH TAB</div>
      <div className="summary-nav-grid">
        {[
          { tab: 1, icon: Map, label: 'Hardware Ecosystem Plan', desc: '8 platforms evaluated. DJI dependency risk, NDAA compliance gap, Skydio X10 hypothesis, regulatory timeline, and 2 platform hypotheses with discovery validation questions.' },
          { tab: 2, icon: Radio, label: 'Customer Discovery & Roadmap', desc: '6 simulated discovery sessions across 3 themes — hardware transition, BVLOS reliability, Aerial Pro adoption. Roadmap decisions derived from each finding.' },
          { tab: 3, icon: TrendingUp, label: 'Market Opportunity', desc: '$65B total drone market with software/services growing at 24% CAGR. Vertical breakdown with DroneDeploy relevance scoring.' },
          { tab: 4, icon: Activity, label: 'Regulatory Timeline', desc: 'FAA BVLOS waiver, Part 108 rulemaking pause, June 2025 Executive Order, NDAA covered list risk. Risk/opportunity scored over time.' },
          { tab: 5, icon: BookOpen, label: 'References', desc: '29 public sources cited and linked — DroneDeploy release notes, FAA filings, G2 reviews, analyst reports, trade press.' },
        ].map(({ tab, icon: Icon, label, desc }) => (
          <button key={tab} className="summary-nav-card" onClick={() => onTab(tab)}>
            <div className="summary-nav-header">
              <Icon size={14} />
              <span className="summary-nav-label">{label}</span>
              <ArrowRight size={12} className="summary-nav-arrow" />
            </div>
            <p className="summary-nav-desc">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  </div>
);

// ─── TAB 1: HARDWARE ECOSYSTEM PLAN ─────────────────────────────────────────

const HardwarePlan = () => (
  <div className="tab-content">
    <div className="section-header">
      <span className="section-tag">PRE-DISCOVERY · HARDWARE</span>
      <h2 className="section-title">Hardware Ecosystem Plan</h2>
      <p className="section-framing">
        Where each platform stands today on support, compliance, and autonomous operations eligibility — and the hypotheses I would walk into discovery to validate.
      </p>
    </div>

    {/* Strategic Context */}
    <div className="content-block">
      <div className="block-label">STRATEGIC CONTEXT</div>
      <div className="strategic-bets">
        <div className="strategic-bet">
          <div className="strategic-bet-num">01</div>
          <div className="strategic-bet-text">Hardware-agnostic reality capture OS</div>
        </div>
        <div className="strategic-bet">
          <div className="strategic-bet-num">02</div>
          <div className="strategic-bet-text">Docked drone &amp; BVLOS operations at scale</div>
        </div>
        <div className="strategic-bet">
          <div className="strategic-bet-num">03</div>
          <div className="strategic-bet-text">AI agents that reason, not just process</div>
        </div>
      </div>
      <div className="cpo-quote">
        <div className="hypothesis-section-label" style={{ marginBottom: '6px' }}>WHAT THESE BETS REQUIRE</div>
        <p className="cpo-framing">These bets are reinforcing when the system works — and brittle when one layer fails. The aerial roadmap is where that reliability is built or broken. The hypotheses below are structured around what needs to be true for all three bets to hold.</p>
      </div>
    </div>

    {/* Ecosystem Table */}
    <div className="content-block">
      <div className="block-label">PLATFORM LANDSCAPE — 8 PLATFORMS EVALUATED</div>
      <div className="hw-table-wrap">
        <table className="hw-table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Category</th>
              <th>DD Support</th>
              <th>NDAA</th>
              <th>BVLOS</th>
              <th>Enterprise Density</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['DJI Matrice 350/300', 'Multirotor', 'Full flight + processing', false, true, 'Very High', true],
              ['DJI Dock 2 / Dock 3', 'Dock', 'Full flight + processing', false, true, 'High', true],
              ['DJI Mini 4 Pro', 'Multirotor', 'Full flight (GA Oct 2025)', false, false, 'Growing', false],
              ['Skydio X10', 'Multirotor', 'Processing only ⚠', true, true, 'Medium', false],
              ['Wingtra One', 'Fixed-wing VTOL', 'Processing only', true, true, 'Medium (survey/mining)', false],
              ['Parrot ANAFI USA', 'Multirotor', 'Processing only', true, false, 'Low–Medium', false],
              ['Autel EVO II', 'Multirotor', 'Processing only', false, false, 'Low', false],
              ['Anzu Robotics', 'Dock (in dev)', 'Partnership', true, false, 'Early Stage', false],
            ].map(([platform, category, support, ndaa, bvlos, density, isDominant]) => (
              <tr key={platform} className={isDominant ? 'row-dominant' : ''}>
                <td className="platform-name">
                  {platform}
                  {isDominant && <span className="dominant-tag">DOMINANT</span>}
                </td>
                <td className="text-secondary">{category}</td>
                <td className={support.includes('⚠') ? 'support-gap' : ''}>{support.replace(' ⚠', '')}{support.includes('⚠') && <span className="gap-badge">GAP</span>}</td>
                <td>
                  <span className={ndaa ? 'badge badge-green' : 'badge badge-red'}>
                    {ndaa ? 'Compliant' : 'Non-compliant'}
                  </span>
                </td>
                <td>
                  <span className={bvlos ? 'badge badge-blue' : 'badge badge-dim'}>
                    {bvlos ? 'Eligible' : 'Not eligible'}
                  </span>
                </td>
                <td className="text-secondary">{density}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* Regulatory Timeline */}
    <div className="content-block">
      <div className="block-label">REGULATORY TIMELINE</div>
      <div className="timeline">
        {[
          {
            date: 'Feb 2025',
            event: 'FAA BVLOS Nationwide Waiver',
            detail: 'DroneDeploy granted first national-scale BVLOS waiver via ArgenTech Solutions partnership. Applies to DJI fleet. Non-DJI platforms must seek separate coverage.',
            type: 'positive',
          },
          {
            date: 'Jun 2025',
            event: 'Executive Order — US Drone Dominance',
            detail: 'Prioritized US-manufactured drones; accelerated BVLOS processing for compliant platforms. Structural tailwind for Skydio, Wingtra, Parrot. Direct headwind for DJI-dependent programs.',
            type: 'watch',
          },
          {
            date: 'Oct 2025',
            event: 'Part 108 NPRM Comment Period Closes',
            detail: 'As proposed, would restrict DJI from BVLOS unless a complex international manufacturer–FAA agreement is reached. DroneDeploy lobbied against the rule, recognizing the exposure.',
            type: 'risk',
          },
          {
            date: 'Oct 2025 – Present',
            event: 'Part 108 Rulemaking Paused',
            detail: 'FAA administrative issues stalled the rulemaking. Customers still face 90–120 day Part 107 one-off waiver process with no scalable national framework in sight. Active operational pain point.',
            type: 'watch',
          },
          {
            date: '2025 Ongoing',
            event: 'DJI Mavic 4 Pro Absent from US Market',
            detail: 'Import tensions kept DJI\'s flagship consumer-to-enterprise product off the US market. DJI holds ~70% of global commercial drone market, but the regulatory trajectory is actively hostile to BVLOS expansion.',
            type: 'risk',
          },
          {
            date: 'Mar 2026',
            event: 'Part 108 Final Rule Expected',
            detail: 'Would replace one-off 90–120 day Part 107 waivers with a scalable national framework. As proposed, restricts DJI from BVLOS unless a complex international manufacturer–FAA agreement is reached. DroneDeploy is engaged in the rulemaking process.',
            type: 'risk',
          },
          {
            date: 'TBD 2026',
            event: 'NDAA Covered List — Potential Autel Addition',
            detail: 'Autel Robotics flagged in pending legislation. If added, removes it as a non-DJI fallback for price-sensitive NDAA customers. Low enterprise density today limits immediate impact.',
            type: 'watch',
          },
        ].map(({ date, event, detail, type }) => (
          <div key={date} className={`timeline-item timeline-${type}`}>
            <div className="timeline-date">{date}</div>
            <div className="timeline-body">
              <div className="timeline-event">{event}</div>
              <div className="timeline-detail">{detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Callouts */}
    <div className="callout-row">
      <div className="callout callout-amber">
        <AlertTriangle size={16} />
        <div>
          <div className="callout-label">KEY RISK</div>
          <div>
            DJI holds ~70% of commercial drone market and is the only platform with native flight planning in DroneDeploy.
            All NDAA-compliant alternatives are processing-only — federal and government-funded customers have no unified flight management option today.
            If Part 108 restricts DJI from BVLOS operations, our autonomous ops program is largely grounded until a compliant alternative is integrated.
          </div>
        </div>
      </div>
      <div className="callout callout-green">
        <CheckCircle size={16} />
        <div>
          <div className="callout-label">UPDATED PLAN — 2 DECISIONS</div>
          <div>
            <strong>(1) Skydio X10 elevated to P0</strong> for native flight integration — highest NDAA-compliant enterprise density, BVLOS eligible, active churn risk confirmed in discovery.
            &nbsp;<strong>(2) Processing-only posture maintained</strong> for all other non-DJI platforms until Part 108 provides regulatory clarity on BVLOS eligibility for compliant hardware.
          </div>
        </div>
      </div>
    </div>

    {/* ── DATA LAYER ── */}
    <div className="data-divider">
      <div className="data-divider-line" />
      <span className="data-divider-label">DATA LAYER — SOURCE: DRONEDEPLOY RESEARCH DATASET 2026</span>
      <div className="data-divider-line" />
    </div>

    <div className="content-block">
      <div className="block-label">PLATFORM SUPPORT MATRIX — DD INTEGRATION DEPTH VS ENTERPRISE DENSITY (SCORED 1–5)</div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={PLATFORM_CHART_DATA} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} tickCount={6} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150} />
            <Tooltip content={<PlatformTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)', paddingTop: 8 }} />
            <Bar dataKey="support" name="DD Support Score (max 3)" fill="#2563eb" radius={[0, 3, 3, 0]} maxBarSize={12} />
            <Bar dataKey="density" name="Enterprise Density Score (max 5)" fill="#0e7490" radius={[0, 3, 3, 0]} maxBarSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footnote">
        NDAA-compliant: {PLATFORM_CHART_DATA.filter(p => p.ndaa).map(p => p.fullName.split(' ').slice(0, 2).join(' ')).join(', ')} ·{' '}
        Non-compliant: {PLATFORM_CHART_DATA.filter(p => !p.ndaa).map(p => p.fullName.split(' ').slice(0, 2).join(' ')).join(', ')}
      </div>
    </div>

    <div className="content-block">
      <div className="block-label">CAPABILITY GAP — DISTRIBUTION OF DD SUPPORT LEVELS ACROSS 8 EVALUATED PLATFORMS</div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={CAP_GAP_DATA} layout="vertical" margin={{ left: 8, right: 24, top: 12, bottom: 12 }}>
            <XAxis type="number" domain={[0, 8]} hide />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip formatter={(v, name) => [`${v} platforms (${Math.round(v / 8 * 100)}%)`, name]} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
            <Bar dataKey="Full" name="Full (flight + processing)" stackId="a" fill="#059669" radius={[3, 0, 0, 3]} />
            <Bar dataKey="Partnership" name="Partnership" stackId="a" fill="#d97706" />
            <Bar dataKey="Processing Only" name="Processing Only" stackId="a" fill="#dc2626" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footnote">
        Only 2 of 8 platforms support native flight planning in DroneDeploy · All 6 NDAA-compliant alternatives are processing-only
      </div>
    </div>

    <div className="content-block">
      <div className="block-label">REGULATORY RISK SCORE BY EVENT (1 = HIGH RISK → 5 = HIGH OPPORTUNITY) · HOVER FOR DETAIL</div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart margin={{ left: 16, right: 32, top: 16, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="x" type="number" domain={[2019.5, 2027]} tickCount={8} tickFormatter={(v) => Math.round(v).toString()} tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
            <YAxis dataKey="y" type="number" domain={[0, 6]} tick={{ fontSize: 11 }} tickCount={7} />
            <ReferenceLine y={3} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Neutral', position: 'insideRight', fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip content={<RegTooltip />} />
            {Object.entries(REG_TYPE_COLORS).map(([type, color]) => (
              <Scatter
                key={type}
                name={type}
                data={REG_EVENTS_DATA.filter(e => e.type === type)}
                fill={color}
                fillOpacity={0.85}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} verticalAlign="top" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footnote">Full regulatory event detail in the Regulatory Timeline tab</div>
    </div>

    {/* Hypothesis 1 */}
    <div className="hypothesis-block">
      <div>
        <div className="hypothesis-tag">HYPOTHESIS 1</div>
        <div className="hypothesis-title">The DJI dependency is a near-term business risk, not a regulatory footnote</div>
      </div>
      <p className="hypothesis-body">
        DJI currently holds approximately 70% of the global commercial drone market. DroneDeploy's Aerial platform is deeply optimized for DJI hardware: only DJI drones support native flight planning; all NDAA-compliant alternatives (Skydio, Wingtra, Parrot) are limited to processing integrations only. Three converging signals make this a near-term risk: Part 108 would restrict DJI from BVLOS; the June 2025 Executive Order creates a structural tailwind for US-manufactured platforms DJI cannot benefit from; and the DJI Mavic 4 Pro's absence from the US market in 2025 shows hardware availability risk is not hypothetical. For enterprise customers on federal or government-funded projects, NDAA compliance is already mandatory — these customers cannot use DJI on constrained projects.
      </p>
      <div className="hypothesis-core">
        DroneDeploy's hardware moat is built on DJI dominance at precisely the moment when regulatory momentum, procurement policy, and import risk are all moving against DJI. The gap between install-base reality and regulatory trajectory is where churn lives.
      </div>
      <div>
        <div className="hypothesis-section-label">WHAT I WOULD GO INTO DISCOVERY TO VALIDATE</div>
        <ul className="hypothesis-qs">
          <li>What share of the top-50 enterprise accounts are running federal or government-funded projects that require NDAA-compliant hardware today?</li>
          <li>How many of those customers are managing split workflows (DroneDeploy for DJI + a separate platform for NDAA hardware)?</li>
          <li>Have any accounts expressed intent to consolidate platforms away from DroneDeploy because of the hardware gap?</li>
          <li>What is the actual churn signal in accounts with mixed fleets — is renewal rate lower, NPS lower, or CSM escalation rate higher?</li>
        </ul>
      </div>
      <div className="hypothesis-change">
        <strong>What would change my mind:</strong> If internal telemetry shows fewer than 10% of enterprise accounts have NDAA-constrained projects, or that customers with mixed fleets show no differentiated churn signal, the urgency weakens significantly. DJI's dominance in the private sector means non-federal customers may not feel this pressure for years.
      </div>
    </div>

    {/* Hypothesis 2 */}
    <div className="hypothesis-block">
      <div>
        <div className="hypothesis-tag">HYPOTHESIS 2</div>
        <div className="hypothesis-title">Skydio X10 is the highest-ROI first native flight integration beyond DJI</div>
      </div>
      <p className="hypothesis-body">
        Among all NDAA-compliant drone platforms, Skydio has the highest enterprise density in the DroneDeploy install base. DroneDeploy already supports Skydio for processing integrations, meaning there is an existing SDK relationship and customer onboarding path to build on. The Skydio X10 is BVLOS-eligible, directly addressing the federal customer gap in H1. The competitive case for Skydio over Wingtra and Parrot: broader deployment across construction, energy, and infrastructure verticals (vs. Wingtra's survey/mining concentration); autonomous flight and obstacle avoidance suitable for the same workflows where DJI is currently deployed; and the processing integration already exists — native flight support is an extension, not a new partnership from scratch.
      </p>
      <div className="hypothesis-core">
        Wingtra is the right second integration (strong in mining and large-area survey). Parrot is the right third (lower density, more limited BVLOS). Skydio is the right first because it addresses the broadest enterprise need with the lowest integration ramp.
      </div>
      <div>
        <div className="hypothesis-section-label">WHAT I WOULD GO INTO DISCOVERY TO VALIDATE</div>
        <ul className="hypothesis-qs">
          <li>What drone models are the top-50 enterprise accounts actually flying today — not what's on the contract, but what's in the air?</li>
          <li>Among accounts with Skydio hardware, are they using DroneDeploy for processing only, or have they built a separate flight workflow entirely?</li>
          <li>What is the primary reason Skydio customers haven't consolidated onto DroneDeploy for flight — missing feature, lack of awareness, or active preference for another tool?</li>
          <li>What does the Skydio SDK access currently look like — is there an existing commercial agreement that makes flight integration technically feasible in the near term?</li>
        </ul>
      </div>
      <div className="hypothesis-change">
        <strong>What would change my mind:</strong> If discovery reveals that Wingtra has higher enterprise density than Skydio in the current install base, or that the Skydio SDK agreement has blockers that push timeline beyond 12 months, Wingtra moves up. The hypothesis holds directionally — the first native non-DJI flight integration is the right priority — but the specific platform choice is what discovery tests.
      </div>
    </div>
  </div>
);

// ─── TAB 2: CUSTOMER DISCOVERY & ROADMAP ─────────────────────────────────────

const DiscoveryRoadmap = () => (
  <div className="tab-content">
    <div className="section-header">
      <span className="section-tag">6 SESSIONS · 3 THEMES</span>
      <h2 className="section-title">Customer Discovery &amp; Adjusted Roadmap</h2>
      <p className="section-framing">
        Sessions across hardware transition, mission reliability, and Aerial Pro adoption — findings turned directly into roadmap decisions.
      </p>
    </div>

    {/* Discovery Cards */}
    <div className="content-block">
      <div className="block-label">DISCOVERY FINDINGS</div>
      <div className="discovery-grid">

        <div className="discovery-card">
          <div className="discovery-card-header">
            <span className="discovery-tag discovery-tag-red">CHURN RISK</span>
            <div className="discovery-theme">A — Hardware Transition</div>
            <div className="discovery-meta">2 sessions · Construction firm + Energy infrastructure</div>
          </div>
          <blockquote className="discovery-quote">"I shouldn't need two platforms for one program."</blockquote>
          <div className="discovery-findings-list">
            <div className="discovery-finding">
              <Zap size={13} className="finding-icon" />
              <span>Large construction firm managing two parallel workflows — DroneDeploy for DJI on private sites, a custom tool for Skydio X10 on federal contracts requiring NDAA compliance.</span>
            </div>
            <div className="discovery-finding">
              <Zap size={13} className="finding-icon" />
              <span>Energy company has 8 Skydio X10s sitting unused in a closet. Bought them for NDAA compliance. Now evaluating a full platform switch rather than maintain the split indefinitely.</span>
            </div>
          </div>
          <div className="discovery-change">
            <strong>Roadmap implication:</strong> Hardware gap is not theoretical — it is active churn risk. Skydio X10 native flight integration is the highest-priority non-DJI investment.
          </div>
        </div>

        <div className="discovery-card">
          <div className="discovery-card-header">
            <span className="discovery-tag discovery-tag-amber">TRUST DEFICIT</span>
            <div className="discovery-theme">B — BVLOS / Dock Reliability</div>
            <div className="discovery-meta">2 sessions · Data center construction + Industrial inspection</div>
          </div>
          <blockquote className="discovery-quote">"Flying blind about being blind."</blockquote>
          <div className="discovery-findings-list">
            <div className="discovery-finding">
              <Zap size={13} className="finding-icon" />
              <span>Data center site discovered a failed dock mission the next morning when a supervisor noticed the progress map hadn't updated. No alert, no notification. Silent failure.</span>
            </div>
            <div className="discovery-finding">
              <Zap size={13} className="finding-icon" />
              <span>Inspection company spends 20–30 min/day manually checking flight logs per site. Built the workaround themselves because they don't trust that failures surface automatically.</span>
            </div>
          </div>
          <div className="discovery-change">
            <strong>Roadmap implication:</strong> Failure visibility is a first-class product gap, not a log entry. Proactive notification layer for dock mission status before any new dock features ship.
          </div>
        </div>

        <div className="discovery-card">
          <div className="discovery-card-header">
            <span className="discovery-tag discovery-tag-blue">FRAMING GAP</span>
            <div className="discovery-theme">C — Aerial Pro Adoption</div>
            <div className="discovery-meta">2 sessions · Mid-size contractor + Mining operator</div>
          </div>
          <blockquote className="discovery-quote">"I didn't realize my maps weren't good enough for AI. Nobody told me that."</blockquote>
          <div className="discovery-findings-list">
            <div className="discovery-finding">
              <Zap size={13} className="finding-icon" />
              <span>Contractor saw a demo of Progress AI and Safety AI, wants them — but hasn't upgraded. The link between data capture quality and AI agent reliability was invisible until we explained it.</span>
            </div>
            <div className="discovery-finding">
              <Zap size={13} className="finding-icon" />
              <span>Mining operator already on Aerial Pro but struggling to justify the cost internally. Procurement sees "premium mapping tier" — not "AI enablement." A framing problem, not a pricing problem.</span>
            </div>
          </div>
          <div className="discovery-change">
            <strong>Roadmap implication:</strong> This is a workflow communication problem, not a pricing problem. In-workflow AI readiness signal + reposition Aerial Pro as "AI-Ready Capture."
          </div>
        </div>

      </div>
    </div>

    {/* Synthesis Bar */}
    <div className="content-block">
      <div className="block-label">CROSS-SESSION THEMES</div>
      <div className="synthesis-bar">
        <div className="synthesis-pill">
          <span className="synthesis-number">01</span>
          <span>The hardware gap is already causing active churn — not just friction. Customers are voting with their wallets.</span>
        </div>
        <div className="synthesis-pill">
          <span className="synthesis-number">02</span>
          <span>Silent failures are eroding trust in automated operations faster than the failures themselves.</span>
        </div>
        <div className="synthesis-pill">
          <span className="synthesis-number">03</span>
          <span>The Aerial Pro adoption barrier is entirely solvable with product and language decisions — no new pricing required.</span>
        </div>
      </div>
    </div>

    {/* Hypothesis 3 */}
    <div className="hypothesis-block">
      <div>
        <div className="hypothesis-tag">HYPOTHESIS 3</div>
        <div className="hypothesis-title">The Aerial Pro adoption barrier is a workflow communication problem, not a pricing problem</div>
      </div>
      <p className="hypothesis-body">
        Aerial Pro is DroneDeploy's premium processing tier: 4x finer detail, 2x faster processing, automatic GCP tagging, and advanced earthworks analysis. Critically, Aerial Pro is also the data quality layer that enables Progress AI, Safety AI, and Inspection AI to reason reliably. A customer on standard Aerial produces data that may not meet the accuracy threshold for AI agent outputs to be trustworthy — but there is no in-workflow signal that communicates this gap. DroneDeploy pricing is cited as a friction point ($329–$599/month vs. Pix4D's $59–$299/month), making pricing an intuitive hypothesis. But pricing is a symptom, not the cause. G2 reviews (98 reviews, 4.5/5) cite ease of use as the top strength but flag output reliability as a recurring concern — a communication problem, not a processing speed problem.
      </p>
      <div className="hypothesis-core">
        The question is not "what price would make customers upgrade to Aerial Pro?" The question is "at what point in the workflow should customers learn that their current data quality limits what their AI agents can do?" Those are different problems with different solutions.
      </div>
      <div>
        <div className="hypothesis-section-label">WHAT I WOULD GO INTO DISCOVERY TO VALIDATE</div>
        <ul className="hypothesis-qs">
          <li>At what point in the customer journey do customers first realize there is a connection between data quality and AI agent reliability?</li>
          <li>For customers who have seen Aerial Pro demoed but not upgraded: was the primary objection cost, internal approval friction, or lack of perceived urgency?</li>
          <li>For customers who have upgraded to Aerial Pro: what was the trigger? Was it an AI output quality issue, a proactive suggestion from a CSM, or something else?</li>
          <li>Is there a pricing tier or package structure that would unlock Aerial Pro adoption — or do those customers simply not prioritize survey-grade data yet?</li>
        </ul>
      </div>
      <div className="hypothesis-change">
        <strong>What would change my mind:</strong> If discovery consistently surfaces that customers understand the AI reliability connection but choose not to upgrade because of price, then pricing is the real barrier and a restructuring conversation is warranted. The hypothesis specifically predicts that most customers do not understand the connection at all — which is an easier and faster problem to solve than price.
      </div>
    </div>

    {/* Discovery Framework */}
    <div className="content-block">
      <div className="block-label">DISCOVERY FRAMEWORK — SESSION PLAN</div>
      <div className="hw-table-wrap">
        <table className="hw-table discovery-framework-table">
          <thead>
            <tr>
              <th>Session Focus</th>
              <th>Hypotheses to Validate</th>
              <th>What Would Change My Mind</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="framework-session-title">Hardware transition (H1, H2)</div>
                <div className="framework-session-meta">2 sessions · Enterprise customers with mixed DJI + NDAA-constrained fleets</div>
              </td>
              <td className="text-secondary">Confirm split-workflow pain is real and active. Identify which NDAA platform has highest demand for native flight support.</td>
              <td className="text-secondary">Low or no split-workflow pain. No expressed intent to consolidate. Skydio not the dominant NDAA platform in install base.</td>
            </tr>
            <tr>
              <td>
                <div className="framework-session-title">BVLOS &amp; dock reliability (H1)</div>
                <div className="framework-session-meta">1–2 sessions · Customers running active docked drone programs</div>
              </td>
              <td className="text-secondary">Understand how mission failures are currently discovered. Confirm or deny that silent failure is an active pain point.</td>
              <td className="text-secondary">Customers report existing failure communication as adequate. No manual workarounds in use.</td>
            </tr>
            <tr>
              <td>
                <div className="framework-session-title">Aerial Pro adoption (H3)</div>
                <div className="framework-session-meta">2 sessions · Mix of standard Aerial users and Aerial Pro users</div>
              </td>
              <td className="text-secondary">Test whether adoption barrier is communication/awareness or pricing. Map the moment customers first connect data quality to AI reliability.</td>
              <td className="text-secondary">Customers consistently cite price as the primary barrier despite understanding the AI reliability connection.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    {/* Adjusted Roadmap */}
    <div className="content-block">
      <div className="block-label">ADJUSTED ROADMAP — 6-MONTH RECOMMENDATIONS</div>
      <div className="reco-grid">
        <div className="reco-card reco-card-primary">
          <div className="reco-number">01</div>
          <div className="reco-platform-tag">NEW PLATFORM</div>
          <div className="reco-title">Skydio X10 Native Flight Integration</div>
          <div className="reco-body">
            Full mission creation, automated flight execution, in-flight telemetry, and post-flight log integration — parity with DJI Matrice for core mission types.
          </div>
          <div className="reco-rationale">
            <div className="reco-rationale-title">WHY THIS</div>
            <ul>
              <li>Highest NDAA-compliant enterprise density in current install base</li>
              <li>Active churn risk confirmed: 2 sessions, customers evaluating platform switches</li>
              <li>Existing processing SDK — lower integration complexity vs. starting from zero</li>
              <li>BVLOS eligible — extends autonomous ops capability to compliant hardware</li>
            </ul>
          </div>
          <div className="reco-metric">
            <Target size={13} />
            <span>Success: X10s moved from processing-only → active flight planning within 90 days of launch; reduction in split-workflow support tickets</span>
          </div>
        </div>

        <div className="reco-card reco-card-secondary">
          <div className="reco-number">02</div>
          <div className="reco-platform-tag">AERIAL PRO</div>
          <div className="reco-title">In-Workflow AI Readiness Indicator</div>
          <div className="reco-body">
            Persistent data quality score visible in the mapping workflow — shows which AI agents the current data meets thresholds for (green / yellow / red per agent) and a clear Aerial Pro upgrade path with the accuracy improvement quantified.
          </div>
          <div className="reco-rationale">
            <div className="reco-rationale-title">WHY THIS</div>
            <ul>
              <li>#1 adoption barrier is invisible: customers don't know their data is below AI agent thresholds</li>
              <li>2 customers confirmed they didn't understand the quality–AI link until after the fact</li>
              <li>Removes friction before Progress AI, Safety AI, Inspection AI runs on substandard data</li>
              <li>Repositions Aerial Pro as "AI-Ready Capture" — also resolves internal budget friction</li>
            </ul>
          </div>
          <div className="reco-metric">
            <Target size={13} />
            <span>Success: Aerial Pro upgrade conversion rate from in-workflow prompt; reduction in AI output quality support tickets</span>
          </div>
        </div>
      </div>
    </div>

    {/* Deprioritization */}
    <div className="content-block">
      <div className="block-label">EXPLICITLY NOT THIS CYCLE</div>
      <div className="depriolist">
        {[
          { item: 'Autel native flight integration', reason: 'No enterprise demand signal in any discovery session' },
          { item: 'Parrot ANAFI USA native flight', reason: 'Low enterprise density; limited BVLOS eligibility' },
          { item: 'Aerial Pro pricing restructure', reason: 'Discovery confirmed pricing is not the primary adoption barrier' },
          { item: 'New AI agent features', reason: 'Existing agents are only as good as upstream data — fix the data layer first' },
        ].map(({ item, reason }) => (
          <div key={item} className="deprio-row">
            <div className="deprio-item">{item}</div>
            <div className="deprio-reason">{reason}</div>
          </div>
        ))}
      </div>
    </div>

    {/* What This Is Not */}
    <div className="content-block">
      <div className="block-label">LIMITS OF THIS ANALYSIS</div>
      <div className="callout callout-amber limits-callout">
        <AlertTriangle size={16} />
        <div>
          <div className="callout-label">WHAT THIS IS NOT</div>
          <p>This analysis was built entirely from public sources: product release notes, regulatory filings, third-party reviews, and published data. It reflects the quality of reasoning possible without internal access — not a substitute for it.</p>
          <p style={{ marginTop: '8px' }}>The hypotheses above are held with appropriate confidence, not certainty. A real 90-day plan requires: internal telemetry on mission success rates by hardware type; NPS and churn data segmented by fleet composition; CSM escalation logs; and direct customer session data. None of that exists in this document because none of it is publicly available.</p>
          <p style={{ marginTop: '8px' }}><strong>What I am confident in:</strong> the structure of the problems, the regulatory timeline, and the framework for testing these hypotheses through discovery. The specific conclusions — Skydio first, communication over pricing, DJI risk as near-term — are calibrated priors, not decisions. Discovery is what converts priors into roadmap.</p>
        </div>
      </div>
    </div>
    {/* ── COMPETITIVE ANALYSIS DATA ── */}
    <div className="data-divider">
      <div className="data-divider-line" />
      <span className="data-divider-label">COMPETITIVE ANALYSIS — DATA LAYER</span>
      <div className="data-divider-line" />
    </div>

    <div className="content-block">
      <div className="block-label">PRICING VS FEATURE BREADTH — BUBBLE SIZE = G2 REVIEW COUNT (MARKET PRESENCE PROXY)</div>
      <div className="callout callout-blue" style={{ marginBottom: 0, padding: '10px 14px' }}>
        <Info size={13} />
        <span>DroneDeploy leads on feature breadth but carries premium pricing. Pix4D undercuts significantly on price. Hover bubbles for details.</span>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 16, right: 32, bottom: 40, left: 48 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="price" type="number" name="Starting Price" domain={[0, 700]} tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} label={{ value: 'Starting Price ($/mo)', position: 'insideBottom', offset: -16, fontSize: 11 }} />
            <YAxis dataKey="breadth" type="number" name="Feature Breadth" domain={[0, 10]} tick={{ fontSize: 11 }} label={{ value: 'Feature Breadth (0–9)', angle: -90, position: 'insideLeft', offset: 16, fontSize: 11 }} />
            <ZAxis dataKey="size" range={[200, 800]} />
            <Tooltip content={<CompTooltip />} />
            <Scatter name="Competitors" data={COMP_SCATTER_OTHER} fill="#94a3b8" fillOpacity={0.65} />
            <Scatter name="DroneDeploy" data={COMP_SCATTER_DD} fill="#2563eb" fillOpacity={0.9} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} verticalAlign="top" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className="content-block">
      <div className="block-label">FEATURE CAPABILITY MATRIX — {fm.features.length} FEATURES × {FM_PLATFORM_IDS.length} PLATFORMS</div>
      <div className="fm-legend">
        <span className="fm-legend-item" style={{ color: '#166534', background: '#dcfce7' }}>Full</span>
        <span className="fm-legend-item" style={{ color: '#713f12', background: '#fef9c3' }}>Partial</span>
        <span className="fm-legend-item" style={{ color: '#991b1b', background: '#fef2f2' }}>Limited</span>
      </div>
      <div className="fm-wrap">
        <table className="fm-table">
          <thead>
            <tr>
              <th className="fm-feature-head">Feature</th>
              {FM_PLATFORM_IDS.map(id => (
                <th key={id} className={id === 'dronedeploy' ? 'fm-dd-head' : 'fm-plat-head'}>{idToName[id] || id}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fm.features.map((feature, fi) => (
              <tr key={feature}>
                <td className="fm-feature-cell">{feature}</td>
                {FM_PLATFORM_IDS.map(id => {
                  const score = fm.scores[id]?.[fi] ?? 0;
                  const bg = score === 3 ? '#dcfce7' : score === 2 ? '#fef9c3' : '#fef2f2';
                  const col = score === 3 ? '#166534' : score === 2 ? '#713f12' : '#991b1b';
                  const lbl = score === 3 ? 'Full' : score === 2 ? 'Partial' : 'Limited';
                  return (
                    <td key={id} className={id === 'dronedeploy' ? 'fm-dd-cell' : 'fm-score-cell'} style={{ background: bg, color: col }}>
                      {lbl}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="chart-footnote">Sources: G2 platform reviews, Pix4D/DroneDeploy comparison pages, vendor documentation</div>
    </div>
  </div>
);

// ─── TAB 3: MARKET OPPORTUNITY ────────────────────────────────────────────────

const MarketOpportunity = () => (
  <div className="tab-content">
    <div className="section-header">
      <span className="section-tag">MARKET SIZING · DATA-DRIVEN · SOURCE: 2026 RESEARCH DATASET</span>
      <h2 className="section-title">Market Opportunity</h2>
      <p className="section-framing">
        Total addressable market trajectory and vertical breakdown — $65B+ drone market growing at 12–13% CAGR, with the software/services layer growing at 24%.
      </p>
    </div>

    <div className="stat-cards-row">
      <div className="stat-card">
        <div className="stat-value">$65.1B</div>
        <div className="stat-label">Total Drone Market 2025</div>
        <div className="stat-note">up from $34.7B in 2022</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">12.5%</div>
        <div className="stat-label">Market CAGR 2025–2030</div>
        <div className="stat-note">consensus across major analysts</div>
      </div>
      <div className="stat-card stat-card-highlight">
        <div className="stat-value">24%</div>
        <div className="stat-label">Software/Services CAGR 2026–2035</div>
        <div className="stat-note">DD's addressable software layer</div>
      </div>
    </div>

    <div className="content-block">
      <div className="block-label">MARKET GROWTH TRAJECTORY — TOTAL MARKET VS SOFTWARE/SERVICES SEGMENT ($B)</div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={MARKET_CHART_DATA} margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="year" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}B`} />
            <Tooltip content={<MarketTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
            <Area type="monotone" dataKey="total" name="Total Drone Market" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={2} connectNulls />
            <Area type="monotone" dataKey="software" name="Software/Services Segment" stroke="#0891b2" fill="#0891b2" fillOpacity={0.18} strokeWidth={2} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footnote">Sources: Grand View Research, Skyquest, Nextmsc, Precedence Research · Software/services segment is most relevant to DroneDeploy TAM</div>
    </div>

    <div className="content-block">
      <div className="block-label">MARKET SHARE BY VERTICAL — % REVENUE SHARE, 2025 ESTIMATE · COLOR = DD RELEVANCE</div>
      <div className="relevance-legend">
        {Object.entries(RELEVANCE_COLORS).map(([k, v]) => (
          <span key={k} className="relevance-legend-item">
            <span style={{ display: 'inline-block', width: 10, height: 10, background: v, borderRadius: 2 }} />
            {k}
          </span>
        ))}
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={VERTICAL_DATA} layout="vertical" margin={{ left: 8, right: 56, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="vertical" tick={{ fontSize: 11 }} width={160} />
            <Tooltip content={<VerticalTooltip />} />
            <Bar dataKey="share_pct" name="Market Share %" radius={[0, 3, 3, 0]} maxBarSize={20}>
              {VERTICAL_DATA.map((entry) => (
                <Cell key={entry.vertical} fill={RELEVANCE_COLORS[entry.dd_relevance] || '#94a3b8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footnote">Sources: Technavio Commercial Drone Market, Mordor Intelligence, Persistence Market Research · Hover bars for detail</div>
    </div>
  </div>
);

// ─── TAB 4: REGULATORY TIMELINE ───────────────────────────────────────────────

const RegulatoryTimeline = () => (
  <div className="tab-content">
    <div className="section-header">
      <span className="section-tag">REGULATORY · RISK &amp; OPPORTUNITY ANALYSIS</span>
      <h2 className="section-title">Regulatory Timeline</h2>
      <p className="section-framing">
        Key FAA regulatory events and their DroneDeploy impact — from BVLOS waivers to Part 108 uncertainty. Regulatory trajectory is both the biggest opportunity and near-term risk.
      </p>
    </div>

    <div className="callout callout-amber">
      <AlertTriangle size={16} />
      <div>
        <div className="callout-label">REGULATORY ARGUMENT</div>
        <div>Regulatory trajectory is both the biggest near-term opportunity (nationwide BVLOS waiver, autonomous dock at scale) and biggest risk (Part 108 could ground DJI from BVLOS, removing the platform that powers 100% of DroneDeploy's native flight operations).</div>
      </div>
    </div>

    <div className="stat-cards-row">
      <div className="stat-card stat-card-risk">
        <div className="stat-value">~70%</div>
        <div className="stat-label">DJI Global Market Share</div>
        <div className="stat-note">Primary flight platform for DD · NDAA non-compliant</div>
      </div>
      <div className="stat-card stat-card-positive">
        <div className="stat-value">190+</div>
        <div className="stat-label">BVLOS Waivers Issued</div>
        <div className="stat-note">FAA Part 107 waivers through Oct 2024</div>
      </div>
      <div className="stat-card stat-card-watch">
        <div className="stat-value">PAUSED</div>
        <div className="stat-label">Part 108 Rulemaking</div>
        <div className="stat-note">FAA administrative pause · Final rule TBD</div>
      </div>
    </div>

    <div className="content-block">
      <div className="block-label">REGULATORY EVENTS — RISK/OPPORTUNITY SCORE OVER TIME (1 = HIGH RISK · 5 = HIGH OPPORTUNITY)</div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
        {Object.entries(REG_TYPE_COLORS).map(([type, color]) => (
          <span key={type} style={{ fontSize: 11, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {type}
          </span>
        ))}
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ left: 32, right: 32, top: 16, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="x" type="number" domain={[2019.5, 2027]} tickCount={8} tickFormatter={(v) => Math.round(v).toString()} tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} label={{ value: 'Year', position: 'insideBottom', offset: -12, fontSize: 11 }} />
            <YAxis dataKey="y" type="number" domain={[0, 6]} tick={{ fontSize: 11 }} tickCount={7} label={{ value: 'Score', angle: -90, position: 'insideLeft', fontSize: 10 }} />
            <ReferenceLine y={3} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Neutral', position: 'insideRight', fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip content={<RegTooltip />} />
            {Object.entries(REG_TYPE_COLORS).map(([type, color]) => (
              <Scatter
                key={type}
                name={type}
                data={REG_EVENTS_DATA.filter(e => e.type === type)}
                fill={color}
                fillOpacity={0.85}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} verticalAlign="top" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footnote">Hover dots for event detail · Higher score = positive for DroneDeploy · Reference line at 3 = neutral</div>
    </div>

    <div className="content-block">
      <div className="block-label">EVENT DETAIL — ALL REGULATORY EVENTS SORTED BY DATE</div>
      <div className="timeline">
        {[...REG_EVENTS_DATA].sort((a, b) => a.x - b.x).map((e, i) => (
          <div key={i} className={`timeline-item timeline-${e.type.toLowerCase()}`}>
            <div className="timeline-date">{e.date_display}</div>
            <div className="timeline-body">
              <div className="timeline-event" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {e.event}
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 3, background: REG_TYPE_COLORS[e.type] + '22', color: REG_TYPE_COLORS[e.type], fontWeight: 600, whiteSpace: 'nowrap' }}>{e.type.toUpperCase()}</span>
              </div>
              <div className="timeline-detail">{e.detail}</div>
              {e.dd_impact && <div className="timeline-detail" style={{ marginTop: 4, fontStyle: 'italic' }}>DD Impact: {e.dd_impact}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── TAB 5: REFERENCES ───────────────────────────────────────────────────────

const REF_GROUPS = [
  { prefix: 'Primary — Government', label: 'Government & Regulatory' },
  { prefix: 'Primary',              label: 'DroneDeploy Sources' },
  { prefix: 'Secondary — Trade Press', label: 'Trade Press' },
  { prefix: 'Secondary — Platform Review', label: 'Platform Reviews' },
  { prefix: 'Secondary — User Reviews', label: 'User Reviews' },
  { prefix: 'Secondary — Competitive', label: 'Competitive Intelligence' },
  { prefix: 'Secondary — Competitor', label: 'Competitor Comparisons' },
  { prefix: 'Secondary — Industry', label: 'Industry Guides & Analysis' },
  { prefix: 'Market Research',      label: 'Market Research' },
  { prefix: 'Internal',             label: 'Internal Research' },
];

const References = () => {
  const sourcesMap = (data.references || {}).sources || {};
  const allRefs = Object.entries(sourcesMap).map(([id, ref]) => ({ id, ...ref }));

  // Each ref goes into the first matching prefix group only
  const assigned = new Set();
  const groups = REF_GROUPS.map(({ prefix, label }) => {
    const items = allRefs.filter(r => !assigned.has(r.id) && r.type && r.type.startsWith(prefix));
    items.forEach(r => assigned.add(r.id));
    return { label, items };
  }).filter(g => g.items.length > 0);

  // Catch any unmatched refs
  const matched = new Set(groups.flatMap(g => g.items.map(r => r.id)));
  const unmatched = allRefs.filter(r => !matched.has(r.id));
  if (unmatched.length) groups.push({ label: 'Other', items: unmatched });

  return (
    <div className="tab-content">
      <div className="section-header">
        <span className="section-tag">{allRefs.length} SOURCES · PUBLIC DATA ONLY</span>
        <h2 className="section-title">Research References</h2>
        <p className="section-desc">All sources used to construct this analysis, derived entirely from publicly available information.</p>
      </div>
      {groups.map(({ label, items }) => (
        <div key={label} className="content-block">
          <div className="block-label">{label}</div>
          <div className="ref-list">
            {items.map(ref => (
              <div key={ref.id} className="ref-row">
                <div className="ref-main">
                  {ref.url ? (
                    <a className="ref-title" href={ref.url} target="_blank" rel="noreferrer">
                      {ref.title}
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="ref-title ref-no-link">{ref.title}</span>
                  )}
                  <span className="ref-meta">{ref.publisher}{ref.date ? ` · ${ref.date}` : ''}</span>
                </div>
                <span className="ref-id">{ref.id}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg-primary: #f5f5f4;
          --bg-secondary: #ffffff;
          --bg-card: #f8f8f7;
          --accent-blue: #2563eb;
          --accent-amber: #d97706;
          --accent-green: #059669;
          --accent-red: #dc2626;
          --text-primary: #0f172a;
          --text-secondary: #64748b;
          --border: #e4e4e7;
          --font-mono: 'DM Mono', monospace;
          --font-body: 'Inter', sans-serif;
        }

        body {
          background: var(--bg-primary);
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 14px;
          line-height: 1.6;
          min-height: 100vh;
        }

        .app-bg {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ── HEADER ── */
        .app-header {
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          padding: 0 32px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-title {
          font-family: var(--font-mono);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          letter-spacing: -0.2px;
        }
        .header-meta {
          font-size: 12px;
          color: var(--text-secondary);
        }

        /* ── TAB BAR ── */
        .tab-bar {
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          padding: 0 32px;
          display: flex;
          gap: 0;
          position: sticky;
          top: 52px;
          z-index: 99;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .tab-bar::-webkit-scrollbar { display: none; }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 14px 18px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: 13px;
          font-family: var(--font-body);
          color: var(--text-secondary);
          transition: color 0.15s, border-color 0.15s;
          white-space: nowrap;
        }
        .tab-btn:hover { color: var(--text-primary); }
        .tab-btn.active {
          color: var(--accent-blue);
          border-bottom-color: var(--accent-blue);
          font-weight: 500;
        }
        .tab-num {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
          opacity: 0.6;
        }
        .tab-btn.active .tab-num { opacity: 1; color: var(--accent-blue); }

        /* ── DISCLAIMER BANNER ── */
        .disclaimer-banner {
          background: #fffbeb;
          border-bottom: 1px solid #fde68a;
          padding: 10px 32px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 12.5px;
          color: #78350f;
          line-height: 1.55;
        }
        .disclaimer-banner svg { flex-shrink: 0; margin-top: 1px; color: var(--accent-amber); }
        .disclaimer-label {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5px;
          color: #92400e;
          margin-right: 10px;
          white-space: nowrap;
          flex-shrink: 0;
          padding-top: 1px;
        }

        /* ── MAIN ── */
        .main-content {
          flex: 1;
          max-width: 1040px;
          width: 100%;
          margin: 0 auto;
          padding: 40px 32px 80px;
        }

        .tab-content {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        /* ── SECTION HEADER ── */
        .section-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .section-tag {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 500;
          color: var(--accent-blue);
          letter-spacing: 0.5px;
        }
        .section-title {
          font-size: 22px;
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.3px;
        }
        .section-framing {
          font-size: 14px;
          color: var(--text-secondary);
          max-width: 680px;
          line-height: 1.65;
        }

        /* ── CONTENT BLOCK ── */
        .content-block {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .block-label {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border);
        }

        /* ── STRATEGIC CONTEXT ── */
        .strategic-bets {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .strategic-bet {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .strategic-bet-num {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 500;
          color: var(--accent-blue);
        }
        .strategic-bet-text {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.4;
        }
        .cpo-quote {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-left: 3px solid var(--accent-blue);
          border-radius: 0 8px 8px 0;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .cpo-quote p {
          font-size: 14px;
          font-style: italic;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.5;
        }
        .cpo-quote cite {
          font-family: var(--font-mono);
          font-size: 11px;
          font-style: normal;
          color: var(--accent-blue);
        }
        .cpo-framing {
          font-size: 13px !important;
          font-style: normal !important;
          font-weight: 400 !important;
          color: #1e3a8a !important;
          margin-top: 4px;
        }

        /* ── HARDWARE TABLE ── */
        .hw-table-wrap {
          overflow-x: auto;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
        }
        .hw-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .hw-table th {
          text-align: left;
          padding: 10px 14px;
          font-weight: 500;
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border);
          background: var(--bg-card);
          white-space: nowrap;
        }
        .hw-table td {
          padding: 11px 14px;
          border-top: 1px solid var(--border);
          vertical-align: middle;
        }
        .hw-table tr:first-child td { border-top: none; }
        .hw-table tbody tr:hover { background: var(--bg-card); }
        .row-dominant td { background: #fffbeb; }
        .row-dominant:hover td { background: #fef3c7; }
        .platform-name {
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dominant-tag {
          font-family: var(--font-mono);
          font-size: 9px;
          background: #fbbf24;
          color: #78350f;
          padding: 2px 5px;
          border-radius: 3px;
          font-weight: 500;
          letter-spacing: 0.3px;
        }
        .support-gap { color: var(--text-secondary); }
        .gap-badge {
          font-family: var(--font-mono);
          font-size: 9px;
          background: #fef2f2;
          color: var(--accent-red);
          border: 1px solid #fecaca;
          padding: 2px 5px;
          border-radius: 3px;
          margin-left: 6px;
          font-weight: 500;
        }
        .text-secondary { color: var(--text-secondary); }

        /* ── BADGES ── */
        .badge {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          padding: 3px 7px;
          border-radius: 4px;
          white-space: nowrap;
        }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-red { background: #fef2f2; color: #991b1b; }
        .badge-blue { background: #eff6ff; color: #1e40af; }
        .badge-dim { background: var(--bg-card); color: var(--text-secondary); }

        /* ── REGULATORY TIMELINE ── */
        .timeline {
          display: flex;
          flex-direction: column;
          gap: 0;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        .timeline-item {
          display: flex;
          gap: 16px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          border-left: 3px solid transparent;
        }
        .timeline-item:last-child { border-bottom: none; }
        .timeline-positive { border-left-color: var(--accent-green); }
        .timeline-watch { border-left-color: var(--accent-amber); }
        .timeline-risk { border-left-color: var(--accent-red); }
        .timeline-date {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          white-space: nowrap;
          padding-top: 2px;
          min-width: 96px;
        }
        .timeline-body { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
        .timeline-event {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .timeline-detail {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.55;
        }

        /* ── CALLOUTS ── */
        .callout-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .callout {
          display: flex;
          gap: 12px;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid;
          font-size: 13px;
          line-height: 1.55;
          align-items: flex-start;
        }
        .callout svg { flex-shrink: 0; margin-top: 2px; }
        .callout-amber {
          background: #fffbeb;
          border-color: #fde68a;
          color: #78350f;
        }
        .callout-amber svg { color: var(--accent-amber); }
        .callout-green {
          background: #f0fdf4;
          border-color: #bbf7d0;
          color: #14532d;
        }
        .callout-green svg { color: var(--accent-green); }
        .callout-blue {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #1e3a8a;
        }
        .callout-blue svg { color: var(--accent-blue); }
        .callout-label {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
          opacity: 0.7;
        }
        .limits-callout { align-items: flex-start; }

        /* ── HYPOTHESIS BLOCKS ── */
        .hypothesis-block {
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 24px;
          background: var(--bg-secondary);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .hypothesis-tag {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          color: var(--accent-blue);
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .hypothesis-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
        }
        .hypothesis-body {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.65;
        }
        .hypothesis-core {
          background: #eff6ff;
          border-left: 3px solid var(--accent-blue);
          padding: 12px 16px;
          font-style: italic;
          font-size: 13px;
          color: var(--text-primary);
          border-radius: 0 4px 4px 0;
          line-height: 1.6;
        }
        .hypothesis-section-label {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .hypothesis-qs {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 0;
        }
        .hypothesis-qs li {
          padding-left: 18px;
          position: relative;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.55;
        }
        .hypothesis-qs li::before {
          content: '→';
          position: absolute;
          left: 0;
          color: var(--accent-blue);
          font-size: 12px;
        }
        .hypothesis-change {
          font-size: 13px;
          color: var(--text-secondary);
          padding: 12px 14px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 6px;
          line-height: 1.6;
        }

        /* ── DISCOVERY CARDS ── */
        .discovery-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .discovery-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .discovery-card-header {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .discovery-tag {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          padding: 2px 7px;
          border-radius: 3px;
          letter-spacing: 0.3px;
          width: fit-content;
        }
        .discovery-tag-red { background: #fef2f2; color: var(--accent-red); border: 1px solid #fecaca; }
        .discovery-tag-amber { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
        .discovery-tag-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .discovery-theme {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .discovery-meta {
          font-size: 11px;
          color: var(--text-secondary);
        }
        .discovery-quote {
          font-size: 13px;
          font-style: italic;
          color: var(--text-primary);
          border-left: 3px solid var(--border);
          padding-left: 12px;
          line-height: 1.55;
        }
        .discovery-findings-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .discovery-finding {
          display: flex;
          gap: 8px;
          font-size: 12.5px;
          color: var(--text-secondary);
          line-height: 1.5;
          align-items: flex-start;
        }
        .finding-icon {
          flex-shrink: 0;
          margin-top: 3px;
          color: var(--accent-blue);
        }
        .discovery-change {
          font-size: 12.5px;
          color: var(--text-primary);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 10px 12px;
          line-height: 1.5;
        }

        /* ── SYNTHESIS BAR ── */
        .synthesis-bar {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .synthesis-pill {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px 16px;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.55;
        }
        .synthesis-number {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 500;
          color: var(--accent-blue);
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 4px;
          padding: 2px 7px;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* ── DISCOVERY FRAMEWORK TABLE ── */
        .discovery-framework-table th { white-space: normal; }
        .discovery-framework-table td { font-size: 12.5px; line-height: 1.55; vertical-align: top; }
        .framework-session-title {
          font-weight: 600;
          font-size: 13px;
          color: var(--text-primary);
          margin-bottom: 3px;
        }
        .framework-session-meta {
          font-size: 11.5px;
          color: var(--text-secondary);
        }

        /* ── ROADMAP RECOMMENDATION CARDS ── */
        .reco-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .reco-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .reco-card-primary { border-top: 3px solid var(--accent-blue); }
        .reco-card-secondary { border-top: 3px solid var(--accent-green); }
        .reco-number {
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 500;
          color: var(--border);
          line-height: 1;
        }
        .reco-platform-tag {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
        }
        .reco-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
        }
        .reco-body {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
        }
        .reco-rationale {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .reco-rationale-title {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.5px;
        }
        .reco-rationale ul {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 0;
        }
        .reco-rationale li {
          font-size: 12.5px;
          color: var(--text-secondary);
          padding-left: 14px;
          position: relative;
          line-height: 1.5;
        }
        .reco-rationale li::before {
          content: '—';
          position: absolute;
          left: 0;
          color: var(--border);
        }
        .reco-metric {
          display: flex;
          align-items: flex-start;
          gap: 7px;
          font-size: 12px;
          color: var(--text-secondary);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 10px 12px;
          line-height: 1.5;
        }
        .reco-metric svg { flex-shrink: 0; margin-top: 2px; color: var(--accent-blue); }

        /* ── DEPRIORITIZATION LIST ── */
        .depriolist {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        .deprio-row {
          display: flex;
          align-items: baseline;
          gap: 24px;
          padding: 13px 18px;
          border-bottom: 1px solid var(--border);
        }
        .deprio-row:last-child { border-bottom: none; }
        .deprio-item {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          text-decoration: line-through;
          text-decoration-color: var(--border);
          white-space: nowrap;
          min-width: 260px;
        }
        .deprio-reason {
          font-size: 12.5px;
          color: var(--text-secondary);
          opacity: 0.7;
          line-height: 1.5;
        }

        /* ── FOOTER ── */
        .app-footer {
          border-top: 1px solid var(--border);
          background: var(--bg-secondary);
          padding: 32px 32px 24px;
          flex-shrink: 0;
        }
        .footer-limits-label {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }
        .footer-limits-card {
          background: rgba(245, 158, 11, 0.06);
          border: 1px solid rgba(245, 158, 11, 0.25);
          border-radius: 6px;
          padding: 16px 20px;
          margin-bottom: 16px;
        }
        .footer-limits-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.08em;
          color: #b45309;
          margin-bottom: 10px;
        }
        .footer-limits-body {
          font-family: var(--font-body);
          font-size: 13px;
          color: #92400e;
          line-height: 1.65;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .footer-limits-body strong {
          color: #78350f;
        }
        .footer-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-secondary);
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          /* Layout */
          .app-header, .main-content, .app-footer, .disclaimer-banner { padding-left: 16px; padding-right: 16px; }
          .main-content { padding-top: 24px; padding-bottom: 60px; }

          /* Header */
          .app-header { height: auto; min-height: 48px; padding-top: 10px; padding-bottom: 10px; flex-wrap: wrap; gap: 2px; }
          .header-meta { display: none; }
          .header-title { font-size: 12px; }

          /* Tab bar */
          .tab-bar { padding: 0 8px; top: 48px; }
          .tab-btn { padding: 11px 10px; font-size: 12px; gap: 5px; white-space: nowrap; }
          .tab-btn svg { display: none; }

          /* Section typography */
          .section-title { font-size: 18px; }
          .section-framing { font-size: 13px; }

          /* Grids → single column */
          .callout-row, .discovery-grid, .reco-grid, .strategic-bets { grid-template-columns: 1fr; }
          .stat-cards-row { grid-template-columns: 1fr 1fr; }

          /* Tables */
          .hw-table { font-size: 11.5px; }
          .hw-table th, .hw-table td { padding: 8px 10px; }
          .fm-table { font-size: 10px; }
          .relevance-legend { gap: 8px; }

          /* Deprioritization list */
          .deprio-row { flex-direction: column; gap: 4px; }
          .deprio-item { min-width: unset; white-space: normal; }

          /* Timeline */
          .timeline-item { flex-direction: column; gap: 6px; }
          .timeline-date { min-width: unset; }

          /* Footer */
          .footer-meta { flex-direction: column; gap: 4px; }
          .app-footer { padding-top: 24px; padding-bottom: 20px; }
        }

        @media (max-width: 480px) {
          .stat-cards-row { grid-template-columns: 1fr; }
          .tab-btn { padding: 10px 9px; font-size: 11.5px; }
        }

        /* ── DATA DIVIDER ── */
        .data-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 8px 0;
        }
        .data-divider-line {
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .data-divider-label {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          color: var(--text-secondary);
          letter-spacing: 0.8px;
          white-space: nowrap;
          opacity: 0.6;
        }

        /* ── CHART WRAPPER ── */
        .chart-wrap {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px 4px;
        }
        .chart-footnote {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-secondary);
          opacity: 0.7;
          line-height: 1.5;
        }

        /* ── CHART TOOLTIP ── */
        .chart-tooltip {
          background: white;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 12px;
          line-height: 1.55;
          color: var(--text-primary);
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          max-width: 300px;
        }
        .chart-tooltip-title {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 6px;
          letter-spacing: 0.3px;
        }

        /* ── STAT CARDS ── */
        .stat-cards-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .stat-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .stat-card-highlight { border-top: 3px solid var(--accent-blue); }
        .stat-card-risk { border-top: 3px solid var(--accent-red); }
        .stat-card-positive { border-top: 3px solid var(--accent-green); }
        .stat-card-watch { border-top: 3px solid var(--accent-amber); }
        .stat-value {
          font-family: var(--font-mono);
          font-size: 26px;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1;
        }
        .stat-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-top: 6px;
        }
        .stat-note {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        /* ── FEATURE MATRIX ── */
        .fm-legend {
          display: flex;
          gap: 10px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .fm-legend-item {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 3px;
          letter-spacing: 0.3px;
        }
        .fm-wrap {
          overflow-x: auto;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
        }
        .fm-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .fm-feature-head {
          text-align: left;
          padding: 10px 14px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border);
          background: var(--bg-card);
          white-space: nowrap;
          min-width: 180px;
        }
        .fm-plat-head {
          text-align: center;
          padding: 8px 10px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border);
          background: var(--bg-card);
          white-space: nowrap;
        }
        .fm-dd-head {
          text-align: center;
          padding: 8px 10px;
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 500;
          color: var(--accent-blue);
          border-bottom: 1px solid var(--border);
          background: #eff6ff;
          white-space: nowrap;
        }
        .fm-feature-cell {
          padding: 9px 14px;
          font-size: 12px;
          color: var(--text-secondary);
          border-top: 1px solid var(--border);
          white-space: nowrap;
        }
        .fm-score-cell {
          padding: 7px 10px;
          border-top: 1px solid var(--border);
          text-align: center;
          font-size: 10px;
          font-family: var(--font-mono);
          font-weight: 500;
          white-space: nowrap;
        }
        .fm-dd-cell {
          padding: 7px 10px;
          border-top: 1px solid var(--border);
          text-align: center;
          font-size: 10px;
          font-family: var(--font-mono);
          font-weight: 500;
          white-space: nowrap;
        }

        /* ── RELEVANCE LEGEND ── */
        .relevance-legend {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .relevance-legend-item {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 5px;
        }

        /* ── ADDITIONAL TIMELINE TYPES ── */
        .timeline-mixed { border-left-color: var(--accent-amber); }
        .timeline-pending { border-left-color: #8b5cf6; }

        /* ── SUMMARY ── */
        .summary-about-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 768px) { .summary-about-grid { grid-template-columns: 1fr 1fr; } }
        .summary-about-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 14px 16px;
        }
        .summary-about-label {
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.08em;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        .summary-about-value {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 3px;
        }
        .summary-about-sub {
          font-size: 11.5px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .summary-argument {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 13.5px;
          color: var(--text-primary);
          line-height: 1.7;
          max-width: 860px;
        }
        .summary-argument p { margin: 0; }
        .summary-argument em { color: var(--accent-amber); font-style: normal; font-weight: 500; }
        .summary-hyp-list { display: flex; flex-direction: column; gap: 0; }
        .summary-hyp {
          padding: 20px 0;
          border-bottom: 1px solid var(--border);
        }
        .summary-hyp:last-child { border-bottom: none; }
        .summary-hyp-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .summary-hyp-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          flex: 1;
        }
        .summary-hyp-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--accent-blue);
          background: none;
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 4px 9px;
          cursor: pointer;
          white-space: nowrap;
          transition: border-color 0.15s;
        }
        .summary-hyp-link:hover { border-color: var(--accent-blue); }
        .summary-hyp-body {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.65;
          margin: 0 0 10px 0;
          max-width: 860px;
        }
        .summary-hyp-signal {
          font-size: 12px;
          color: var(--accent-green);
          font-family: var(--font-mono);
          background: rgba(16, 185, 129, 0.07);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 4px;
          padding: 8px 12px;
          display: inline-block;
        }
        .summary-signal-label { font-weight: 600; margin-right: 6px; }
        .summary-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        @media (max-width: 768px) { .summary-stats-grid { grid-template-columns: 1fr 1fr; } }
        .summary-stat {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 16px;
        }
        .summary-stat-value {
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 600;
          color: var(--accent-blue);
          margin-bottom: 6px;
        }
        .summary-stat-label {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .summary-nav-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (max-width: 768px) { .summary-nav-grid { grid-template-columns: 1fr; } }
        .summary-nav-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 14px 16px;
          text-align: left;
          cursor: pointer;
          transition: border-color 0.15s;
        }
        .summary-nav-card:hover { border-color: var(--accent-blue); }
        .summary-nav-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          color: var(--accent-blue);
        }
        .summary-nav-label {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-primary);
          font-weight: 500;
          flex: 1;
        }
        .summary-nav-arrow { color: var(--text-secondary); }
        .summary-nav-desc {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        /* ── REFERENCES ── */
        .ref-list { display: flex; flex-direction: column; }
        .ref-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border);
        }
        .ref-row:last-child { border-bottom: none; }
        .ref-main { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
        .ref-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--accent-blue);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          text-decoration: none;
          line-height: 1.4;
        }
        .ref-title:hover { text-decoration: underline; }
        .ref-no-link { color: var(--text-primary); }
        .ref-meta {
          font-size: 11.5px;
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }
        .ref-id {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-secondary);
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 2px 6px;
          white-space: nowrap;
          flex-shrink: 0;
          align-self: center;
        }
      `}</style>

      <div className="app-bg">
        {/* Header */}
        <header className="app-header">
          <span className="header-title">Pre-Discovery Hypothesis Brief · DroneDeploy</span>
          <span className="header-meta">Nishchay Vishwanath · Cornell '26</span>
        </header>

        {/* Tab Bar */}
        <nav className="tab-bar">
          {TABS.map(({ label, icon: Icon }, i) => (
            <button
              key={i}
              className={`tab-btn${activeTab === i ? ' active' : ''}`}
              onClick={() => setActiveTab(i)}
            >
              <span className="tab-num">0{i + 1}</span>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>

        {/* Honesty Disclaimer Banner */}
        <div className="disclaimer-banner">
          <Info size={14} />
          <span className="disclaimer-label">PURPOSE &amp; HONESTY DISCLAIMER</span>
          <span>This is not a 90-day plan. A credible 90-day plan requires internal telemetry, customer session data, and engineering context not yet available. What follows is a set of cited, structured hypotheses — derived entirely from public sources, product release history, and regulatory filings. These hypotheses are what I would walk into discovery to validate or kill. Where I am wrong, I expect the data to correct me.</span>
        </div>

        {/* Main Content */}
        <main className="main-content">
          {activeTab === 0 && <Summary onTab={setActiveTab} />}
          {activeTab === 1 && <HardwarePlan />}
          {activeTab === 2 && <DiscoveryRoadmap />}
          {activeTab === 3 && <MarketOpportunity />}
          {activeTab === 4 && <RegulatoryTimeline />}
          {activeTab === 5 && <References />}
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <div className="footer-limits-label">LIMITS OF THIS ANALYSIS</div>
          <div className="footer-limits-card">
            <div className="footer-limits-title">
              <AlertTriangle size={13} />
              WHAT THIS IS NOT
            </div>
            <div className="footer-limits-body">
              <p>This analysis was built entirely from public sources: product release notes, regulatory filings, third-party reviews, and published data. It reflects the quality of reasoning possible without internal access — not a substitute for it.</p>
              <p>The hypotheses above are held with appropriate confidence, not certainty. A real 90-day plan requires: internal telemetry on mission success rates by hardware type; NPS and churn data segmented by fleet composition; CSM escalation logs; and direct customer session data. None of that exists in this document because none of it is publicly available.</p>
              <p><strong>What I am confident in:</strong> the structure of the problems, the regulatory timeline, and the framework for testing these hypotheses through discovery. The specific conclusions — Skydio first, communication over pricing, DJI risk as near-term — are calibrated priors, not decisions. Discovery is what converts priors into roadmap.</p>
            </div>
          </div>
          <div className="footer-meta">
            <span>DRONEDEPLOY · AERIAL PM · Q1 2026</span>
          </div>
        </footer>
      </div>
    </>
  );
}
