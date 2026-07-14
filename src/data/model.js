// Schema/enum constants and pure helper functions over the loaded dataset.
// Actual entity data (connectors, versions, tenants) lives in CSV files under
// public/data/ and is loaded + joined by loadData.js — nothing here is mock data.

export const CATEGORIES = [
  'Cloud Object Store',
  'Data Warehouse',
  'SaaS Collaboration',
  'Database',
  'Identity',
  'On-Prem File System',
];

export const LIFECYCLE_STAGES = ['alpha', 'beta', 'ga', 'deprecated'];

export const AUTH_PATTERNS = {
  oauth2: { label: 'OAuth 2.0', hint: 'Delegated user consent, refresh-token rotation' },
  api_key: { label: 'API Key', hint: 'Static credential, per-tenant scoped key' },
  service_account: { label: 'Service Account', hint: 'IAM role binding, no shared secret' },
  certificate: { label: 'Certificate', hint: 'mTLS client cert, per-deployment issued' },
};

// Cert tiers mirror the 4-tier connector classification model:
// 1 = parser-only change (fast/low-risk cadence)
// 2 = schema change
// 3 = auth/API change
// 4 = framework-level change (dedicated cycle, full regression)
export const CERT_TIERS = {
  1: { label: 'Tier 1 · Parser', cadence: 'Weekly', risk: 'low' },
  2: { label: 'Tier 2 · Schema', cadence: 'Bi-weekly', risk: 'low' },
  3: { label: 'Tier 3 · Auth/API', cadence: 'Monthly', risk: 'medium' },
  4: { label: 'Tier 4 · Framework', cadence: 'Quarterly', risk: 'high' },
};

// The tenant whose seat the Customer Console is logged in as.
export const CURRENT_TENANT_ID = 'meridian-health';

// Marketplace certification pipeline — certification is the technical gate
// (schema, auth, security, docs). Being certified doesn't make a connector
// visible to customers on its own; see launches / isLaunchedForTenant below
// for the separate release decision.
export const CERT_STATUSES = {
  pending: { label: 'Pending', color: 'text-[#57606a] border-[#d8dee4] bg-[#eaeef2]' },
  in_review: { label: 'In Review', color: 'text-[#9a6700] border-amber-500/30 bg-amber-500/10' },
  certified: { label: 'Certified', color: 'text-[#1a7f37] border-emerald-500/30 bg-emerald-500/10' },
  rejected: { label: 'Rejected', color: 'text-[#cf222e] border-red-500/30 bg-red-500/10' },
};

// A certified submission only becomes installable for a tenant once someone
// launches it — either to everyone, or to a hand-picked subset of tenants
// first (a staged rollout). `launch` is the { scope, tenantIds } record from
// DataContext's session-only `launches` map, or undefined if never launched.
export function isLaunchedForTenant(launch, tenantId) {
  if (!launch) return false;
  if (launch.scope === 'all') return true;
  return launch.tenantIds.includes(tenantId);
}

export const GATE_STATUSES = {
  pending: { label: 'Pending', color: 'text-[#6e7781]' },
  in_progress: { label: 'In progress', color: 'text-[#9a6700]' },
  passed: { label: 'Passed', color: 'text-[#1a7f37]' },
  failed: { label: 'Failed', color: 'text-[#cf222e]' },
};

export const CREATOR_TYPE_LABEL = {
  acme: 'Acme Corp',
  partner: 'Partner',
  customer: 'Customer-built',
};

// Convenience accessors — every component reads "current version" through
// these rather than assuming versions[0], so re-ordering is safe.
export function currentVersion(connector) {
  return connector.versions[0];
}

// Internal-only accessor (Ops Console): which tenant objects run a given version.
export function tenantsOnVersion(version, tenants) {
  return version.tenantIds.map((id) => tenants.find((t) => t.id === id)).filter(Boolean);
}

// Customer-safe accessor (Customer Console): which version the logged-in
// tenant is on for a connector, without exposing any other tenant's data.
// `overrides` is a session-only { [connectorId]: version } map used to
// simulate an in-place "Update to latest" action (no backend to persist to).
export function versionForTenant(connector, tenantId, overrides = {}) {
  if (overrides[connector.id]) {
    return connector.versions.find((v) => v.version === overrides[connector.id]) || currentVersion(connector);
  }
  return connector.versions.find((v) => v.tenantIds.includes(tenantId)) || null;
}

// Pipeline stages shown in the per-connector flow diagram / detail view.
// Stage names match the DataAI Command Graph Sankey (see DataFlowSankey):
// Collect/Catalog feed Data Discovery, Scan/Classify feed Classification —
// and each pipeline ends by landing in the matching index, not a single
// generic "graph ingest" step. Metadata-only connectors (e.g. identity
// systems) have no content to classify — they index users/groups/
// entitlements and land in the Metadata Index directly, with no
// Classification stage.
export function pipelineForConnector(connector) {
  const collectStage = { stage: 'Collect', detail: `Auth via ${AUTH_PATTERNS[connector.authPattern].label}`, status: connector.health === 'down' ? 'error' : 'ok' };

  if (connector.scanDepth === 'metadata_only') {
    return [
      collectStage,
      { stage: 'Catalog', detail: 'Users, groups, and entitlements indexed', status: connector.health === 'degraded' ? 'warn' : connector.health === 'down' ? 'error' : 'ok' },
      { stage: 'Route', detail: 'Metadata Index ingest', status: 'ok' },
    ];
  }

  return [
    collectStage,
    { stage: 'Scan', detail: 'Orchestrated scan job, incremental + full modes', status: connector.health === 'degraded' ? 'warn' : connector.health === 'down' ? 'error' : 'ok' },
    { stage: 'Classification', detail: 'AI-assisted classification, editable rule set', status: connector.metrics.classificationCompletenessPct < 85 ? 'warn' : 'ok' },
    { stage: 'Route', detail: 'Classification Index ingest', status: 'ok' },
  ];
}

export const STAGE_ORDER = ['Collect', 'Scan', 'Classify', 'Route'];

// Customer-safe accessor: events for one connector, scoped to this tenant's
// own runs/actions plus platform-wide events (tenantId === null, e.g. a
// version release notice) — never another tenant's runs or actions.
export function eventsForConnectorAndTenant(events, connectorId, tenantId) {
  return events
    .filter((e) => e.connectorId === connectorId && (e.tenantId === tenantId || e.tenantId === null))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

// Splits an already-scoped event list into { runs, lifecycle }. Each run
// groups its Collect/Scan/Classify/Route entries and derives an overall
// status — 'error' if any stage errored (which also blocks later stages
// from ever running), 'ok' if Route completed, else 'in_progress'.
export function groupEventsIntoRuns(events) {
  const runMap = new Map();
  const lifecycle = [];

  for (const e of events) {
    if (!e.runId) {
      lifecycle.push(e);
      continue;
    }
    if (!runMap.has(e.runId)) runMap.set(e.runId, { runId: e.runId, entries: [] });
    runMap.get(e.runId).entries.push(e);
  }

  const runs = [...runMap.values()]
    .map((run) => {
      const startedAt = run.entries[0]?.timestamp;
      const hasError = run.entries.some((e) => e.phase === 'error');
      const routeCompleted = run.entries.some((e) => e.stage === 'Route' && e.phase === 'completed');
      const status = hasError ? 'error' : routeCompleted ? 'ok' : 'in_progress';
      return { ...run, startedAt, status };
    })
    .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

  return { runs, lifecycle };
}

// Per-stage box data for one run — stops after the first errored stage,
// since a failure blocks everything downstream in that run.
export function stagesForRun(run) {
  const boxes = [];
  for (const stage of STAGE_ORDER) {
    const started = run.entries.find((e) => e.stage === stage && e.phase === 'started');
    const completed = run.entries.find((e) => e.stage === stage && e.phase === 'completed');
    const error = run.entries.find((e) => e.stage === stage && e.phase === 'error');
    if (!started && !completed && !error) break; // never reached — upstream stage failed or run incomplete
    boxes.push({
      stage,
      status: error ? 'error' : completed ? 'ok' : 'in_progress',
      startedAt: started?.timestamp,
      endedAt: (completed || error)?.timestamp,
      detail: (error || completed || started)?.detail,
    });
    if (error) break;
  }
  return boxes;
}

// Anchors "last 7 / 30 days" windows to the dataset's own narrative date
// rather than the real wall clock, since the seed data is dated ~2026-07-11.
export const DEMO_NOW = new Date('2026-07-11T23:59:59');

export function runDurationMinutes(run) {
  const stages = stagesForRun(run);
  const last = stages[stages.length - 1];
  if (!last) return 0;
  const end = last.endedAt || last.startedAt;
  return Math.max(1, Math.round((new Date(end) - new Date(run.startedAt)) / 60000));
}

// Cumulative volume scanned over time for one tenant — pass `connectorId` to
// scope to a single connector, or omit it to aggregate across every
// connector that tenant runs (the fleet-wide "customer" view). Built off the
// Collect-completion events (where the object/row/message count is recorded),
// just summed differently.
export function cumulativeVolumeSeries(events, tenantId, connectorId = null) {
  const scoped = events
    .filter((e) =>
      e.tenantId === tenantId &&
      e.stage === 'Collect' &&
      e.phase === 'completed' &&
      e.volume != null &&
      (connectorId ? e.connectorId === connectorId : true)
    )
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  let running = 0;
  return scoped.map((e) => {
    running += e.volume;
    const date = new Date(e.timestamp);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      fullDate: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      timestamp: e.timestamp,
      volume: e.volume,
      cumulativeVolume: running,
      connectorId: e.connectorId,
    };
  });
}

// Per-run (non-cumulative) volume for one connector — the diagnostic
// counterpart to cumulativeVolumeSeries. A failed run has no Collect-
// completed event, so it naturally has no volume; callers should render
// that as a distinct "failed" marker rather than a silent zero.
export function dailyVolumeSeries(events, tenantId, connectorId) {
  const scoped = eventsForConnectorAndTenant(events, connectorId, tenantId);
  const { runs } = groupEventsIntoRuns(scoped);

  return runs.map((run) => {
    const collectCompleted = run.entries.find((e) => e.stage === 'Collect' && e.phase === 'completed');
    const errorEntry = run.entries.find((e) => e.phase === 'error');
    const date = new Date(run.startedAt);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      fullDate: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      timestamp: run.startedAt,
      volume: collectCompleted?.volume ?? 0,
      status: run.status,
      errorDetail: errorEntry?.detail ?? null,
    };
  });
}

// Lifecycle milestones (Added, First scan, Updated, Released) for annotating
// charts — same lifecycle events the text timeline already shows, just
// classified by type so a chart can pick a color/label per kind and merge
// same-day milestones into one marker.
const MILESTONE_TYPES = [
  { type: 'added', test: (d) => d === 'Connector added', color: '#0969da' },
  { type: 'first_scan', test: (d) => d === 'First scan completed', color: '#8250df' },
  { type: 'updated', test: (d) => d.startsWith('Updated to'), color: '#1a7f37' },
  { type: 'rule_added', test: (d) => d.startsWith('Classification rule added'), color: '#bf3989' },
  { type: 'released', test: (d) => /released/i.test(d), color: '#6e7781' },
];

export function milestonesForConnectorAndTenant(events, connectorId, tenantId) {
  const scoped = eventsForConnectorAndTenant(events, connectorId, tenantId).filter(
    (e) => !e.runId && e.phase === 'event'
  );

  const byDate = new Map();
  for (const e of scoped) {
    const date = new Date(e.timestamp);
    const dateKey = `${date.getMonth() + 1}/${date.getDate()}`;
    const meta = MILESTONE_TYPES.find((m) => m.test(e.detail)) || { type: 'other', color: '#6e7781' };
    if (!byDate.has(dateKey)) byDate.set(dateKey, { dateKey, labels: [], color: meta.color });
    byDate.get(dateKey).labels.push(e.detail);
  }
  return [...byDate.values()];
}

// Real (accepted) classification findings for a connector — parsed from the
// same "Classification rule added" lifecycle events the milestone chart and
// activity timeline already read, just stripped down to the label the AI
// assigned (e.g. "PII detected") without the confidence-score suffix.
export function classificationFindingsForConnector(events, connectorId, tenantId) {
  return eventsForConnectorAndTenant(events, connectorId, tenantId)
    .filter((e) => !e.runId && e.phase === 'event' && e.detail.startsWith('Classification rule added'))
    .map((e) => ({
      label: e.detail.replace(/^Classification rule added — /, '').replace(/\s*\(\d+% confidence\)$/, ''),
      status: 'accepted',
    }));
}

// Illustrative regulatory-framework mapping (not legal guidance) — mirrors
// Veeam's own Compliance pillar ("100+ regulatory framework mappings").
// Content-based frameworks come from what was classified; privacy
// frameworks come from where the tenant's data resides.
const CONTENT_FRAMEWORK_RULES = [
  { test: (l) => /phi|health|diagnosis/i.test(l), frameworks: ['HIPAA'] },
  { test: (l) => /financial|payment|card/i.test(l), frameworks: ['GLBA', 'PCI-DSS'] },
  { test: (l) => /contract|confidential|legal/i.test(l), frameworks: ['Legal Hold'] },
];

const REGION_PRIVACY_FRAMEWORKS = {
  'US-East': ['CCPA'],
  'US-West': ['CCPA'],
  'EU-West': ['GDPR'],
  'APAC': ['PDPA'],
};

// Turns a list of classification findings (+ tenant region + scan depth)
// into the regulatory frameworks they trigger and a plain-language risk
// level. `findings` is [{ label, status: 'accepted' | 'ai-proposed' }].
export function regulatoryFrameworksForFindings(findings, region, scanDepth, health) {
  const frameworkMap = new Map(); // framework -> Set(reasons)
  const addFramework = (framework, reason) => {
    if (!frameworkMap.has(framework)) frameworkMap.set(framework, new Set());
    frameworkMap.get(framework).add(reason);
  };

  for (const f of findings) {
    for (const rule of CONTENT_FRAMEWORK_RULES) {
      if (rule.test(f.label)) rule.frameworks.forEach((fw) => addFramework(fw, f.label));
    }
  }

  const hasPII = findings.some((f) => /pii|personal|phi/i.test(f.label));
  if (hasPII && region) {
    (REGION_PRIVACY_FRAMEWORKS[region] || []).forEach((fw) => addFramework(fw, `${region} residency`));
  }

  if (scanDepth === 'metadata_only') {
    addFramework('SOC 2 (Access Controls)', 'Identity & entitlement metadata');
  }

  const frameworks = [...frameworkMap.entries()].map(([framework, reasons]) => ({ framework, reasons: [...reasons] }));

  const hasSensitive = findings.some((f) => /phi|financial/i.test(f.label));
  const riskLevel =
    health !== 'healthy' && (hasSensitive || hasPII) ? 'elevated' :
    hasSensitive ? 'moderate' :
    findings.length > 0 || scanDepth === 'metadata_only' ? 'low' :
    'minimal';

  return { frameworks, riskLevel };
}

export function platformMetrics(connectors) {
  const n = connectors.length;
  const sum = (fn) => connectors.reduce((acc, c) => acc + fn(c), 0);
  // Metadata-only connectors (classificationCompletenessPct === null) don't
  // classify content at all, so they're excluded from this average rather
  // than silently counted as 0.
  const classified = connectors.filter((c) => c.metrics.classificationCompletenessPct != null);
  return {
    connectorCount: n,
    avgAdoptionPct: Math.round(sum((c) => c.metrics.adoptionPct) / n),
    avgScanSuccessRatePct: +(sum((c) => c.metrics.scanSuccessRatePct) / n).toFixed(1),
    avgTimeToFirstScanMinutes: +(sum((c) => c.metrics.timeToFirstScanMinutes) / n).toFixed(1),
    avgClassificationCompletenessPct: Math.round(
      classified.reduce((acc, c) => acc + c.metrics.classificationCompletenessPct, 0) / classified.length
    ),
  };
}
