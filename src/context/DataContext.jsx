import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadData } from '../data/loadData';
import { CURRENT_TENANT_ID, currentVersion, DEMO_NOW } from '../data/model';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [base, setBase] = useState({ connectors: [], tenants: [], marketplace: [], events: [], loading: true, error: null });

  // Session-only state — there's no backend to persist to, so "installing"
  // a marketplace connector or "updating" to latest only lives for this
  // browser session, same fidelity as the AI Copilot's Accept & apply.
  const [addedConnectors, setAddedConnectors] = useState([]);
  const [versionOverrides, setVersionOverrides] = useState({});
  const [sessionEvents, setSessionEvents] = useState([]);
  const [classificationRules, setClassificationRules] = useState([]);
  // Marketplace release state — certified is a technical gate, launch is the
  // separate business decision of whether (and to whom) it's actually live.
  // { [submissionId]: { scope: 'all' | 'selected', tenantIds: string[] } }
  // Seeded with a couple of examples of each release state out of the box —
  // Zendesk/SAP ERP/DynamoDB stay unlaunched so there's still a live demo
  // path through the Launch buttons on the Marketplace page.
  const [launches, setLaunches] = useState({
    okta: { scope: 'all', tenantIds: [] },
    redshift: { scope: 'selected', tenantIds: ['meridian-health', 'northwind'] },
  });

  useEffect(() => {
    let cancelled = false;
    loadData()
      .then(({ connectors, tenants, marketplace, events }) => {
        if (!cancelled) setBase({ connectors, tenants, marketplace, events, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setBase((s) => ({ ...s, loading: false, error }));
      });
    return () => { cancelled = true; };
  }, []);

  function updateToLatest(connector) {
    const latest = currentVersion(connector);
    setVersionOverrides((prev) => ({ ...prev, [connector.id]: latest.version }));
    setSessionEvents((prev) => [...prev, {
      connectorId: connector.id,
      tenantId: CURRENT_TENANT_ID,
      runId: null,
      timestamp: DEMO_NOW.toISOString(),
      stage: null,
      phase: 'event',
      detail: `Updated to v${latest.version}`,
    }]);
  }

  // Persists an accepted AI Copilot classification rule for a connector, and
  // logs it as a lifecycle event so it shows up on the Activity Timeline and
  // as a chart annotation — the same milestone machinery as Added/Updated.
  function acceptClassificationRule(connectorId, rule) {
    const acceptedAt = DEMO_NOW.toISOString();
    setClassificationRules((prev) => [
      ...prev.filter((r) => r.connectorId !== connectorId), // one active rule per connector for now
      { connectorId, tenantId: CURRENT_TENANT_ID, ...rule, acceptedAt },
    ]);
    setSessionEvents((prev) => [...prev, {
      connectorId,
      tenantId: CURRENT_TENANT_ID,
      runId: null,
      timestamp: acceptedAt,
      stage: null,
      phase: 'event',
      detail: `Classification rule added — ${rule.classification} (${Math.round(rule.confidence * 100)}% confidence)`,
    }]);
  }

  // Synthesizes a connector record from a certified marketplace submission +
  // the wizard's config answers, installed for the current tenant only.
  function installFromMarketplace(submission, config) {
    const today = DEMO_NOW.toISOString().slice(0, 10);
    const newConnector = {
      id: submission.id,
      name: submission.name,
      icon: submission.icon,
      category: submission.category,
      deploymentModel: 'cloud',
      certTier: 2,
      authPattern: submission.authPattern,
      health: 'healthy',
      scanDepth: 'full',
      creator: submission.creator,
      metrics: {
        adoptionPct: 100,
        scanSuccessRatePct: 100,
        timeToFirstScanMinutes: config.timeToFirstScanMinutes ?? 1,
        classificationCompletenessPct: config.classificationCompletenessPct ?? 0,
        objectsScanned: config.objectsScanned ?? 0,
      },
      versions: [{
        version: '1.0.0',
        releaseDate: today,
        lifecycleStage: 'ga',
        adoptionPct: 100,
        scanSuccessRatePct: 100,
        tenantIds: [CURRENT_TENANT_ID],
      }],
    };
    setAddedConnectors((prev) => [...prev, newConnector]);

    // Synthesize a matching timeline: added, then one completed run through
    // all four stages, using the same second-by-second story the wizard
    // just simulated on screen.
    const now = DEMO_NOW.getTime();
    const at = (offsetMs) => new Date(now + offsetMs).toISOString();
    const runId = `${submission.id}-run1`;
    setSessionEvents((prev) => [...prev, {
      connectorId: submission.id, tenantId: CURRENT_TENANT_ID, runId: null,
      timestamp: at(0), stage: null, phase: 'event', detail: 'Connector added',
    }, {
      connectorId: submission.id, tenantId: CURRENT_TENANT_ID, runId,
      timestamp: at(1000), stage: 'Collect', phase: 'started', detail: 'Authenticating',
    }, {
      connectorId: submission.id, tenantId: CURRENT_TENANT_ID, runId,
      timestamp: at(2000), stage: 'Collect', phase: 'completed', detail: 'Credentials validated',
    }, {
      connectorId: submission.id, tenantId: CURRENT_TENANT_ID, runId,
      timestamp: at(2500), stage: 'Scan', phase: 'started', detail: 'Initial scan',
    }, {
      connectorId: submission.id, tenantId: CURRENT_TENANT_ID, runId,
      timestamp: at(4000), stage: 'Scan', phase: 'completed', detail: `${config.objectsScanned?.toLocaleString() ?? 0} objects scanned`,
    }, {
      connectorId: submission.id, tenantId: CURRENT_TENANT_ID, runId,
      timestamp: at(4500), stage: 'Classify', phase: 'started', detail: 'AI-assisted classification',
    }, {
      connectorId: submission.id, tenantId: CURRENT_TENANT_ID, runId,
      timestamp: at(5500), stage: 'Classify', phase: 'completed', detail: `${config.classificationCompletenessPct ?? 0}% classification completeness`,
    }, {
      connectorId: submission.id, tenantId: CURRENT_TENANT_ID, runId,
      timestamp: at(6000), stage: 'Route', phase: 'started', detail: 'Writing to Command Graph',
    }, {
      connectorId: submission.id, tenantId: CURRENT_TENANT_ID, runId,
      timestamp: at(6500), stage: 'Route', phase: 'completed', detail: 'Routed successfully',
    }]);

    return newConnector;
  }

  // Release actions — separate from certification. A submission can be
  // certified for a while before anyone decides to actually launch it, and
  // a launch can start scoped to specific tenants before going fully GA.
  function launchToAll(submissionId) {
    setLaunches((prev) => ({ ...prev, [submissionId]: { scope: 'all', tenantIds: [] } }));
  }

  function launchToSelected(submissionId, tenantIds) {
    setLaunches((prev) => ({ ...prev, [submissionId]: { scope: 'selected', tenantIds } }));
  }

  function expandToAll(submissionId) {
    launchToAll(submissionId);
  }

  const connectors = useMemo(
    () => [...base.connectors, ...addedConnectors],
    [base.connectors, addedConnectors]
  );

  const events = useMemo(
    () => [...base.events, ...sessionEvents],
    [base.events, sessionEvents]
  );

  const value = {
    ...base,
    connectors,
    events,
    versionOverrides,
    updateToLatest,
    installFromMarketplace,
    classificationRules,
    acceptClassificationRule,
    launches,
    launchToAll,
    launchToSelected,
    expandToAll,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
