import Papa from 'papaparse';

async function fetchCsv(path) {
  const res = await fetch(path);
  const text = await res.text();
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: true });
  return data;
}

function buildCreator(row) {
  return {
    type: row.creator_type,
    name: row.creator_name,
    tenantId: row.creator_tenant_id || null,
  };
}

// Loads the normalized CSV tables from public/data/ and joins them back into
// the nested shape components consume: connectors[].versions[].tenantIds,
// connectors[].creator, connectors[].metrics, marketplace[].gates.
export async function loadData() {
  const [connectorRows, versionRows, versionTenantRows, tenants, marketplaceRows, gateRows, eventRows] = await Promise.all([
    fetchCsv('/data/connectors.csv'),
    fetchCsv('/data/connector_versions.csv'),
    fetchCsv('/data/version_tenants.csv'),
    fetchCsv('/data/tenants.csv'),
    fetchCsv('/data/marketplace_submissions.csv'),
    fetchCsv('/data/marketplace_gates.csv'),
    fetchCsv('/data/connector_events.csv'),
  ]);

  const connectors = connectorRows.map((row) => {
    const versions = versionRows
      .filter((v) => v.connector_id === row.id)
      .map((v) => ({
        version: String(v.version),
        releaseDate: v.releaseDate,
        lifecycleStage: v.lifecycleStage,
        adoptionPct: v.adoptionPct,
        scanSuccessRatePct: v.scanSuccessRatePct,
        tenantIds: versionTenantRows
          .filter((vt) => vt.connector_id === row.id && String(vt.version) === String(v.version))
          .map((vt) => vt.tenant_id),
      }))
      // newest release first
      .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

    return {
      id: row.id,
      name: row.name,
      icon: row.icon,
      category: row.category,
      deploymentModel: row.deploymentModel,
      certTier: row.certTier,
      authPattern: row.authPattern,
      health: row.health,
      scanDepth: row.scanDepth || 'full',
      creator: buildCreator(row),
      metrics: {
        adoptionPct: row.adoptionPct,
        scanSuccessRatePct: row.scanSuccessRatePct,
        timeToFirstScanMinutes: row.timeToFirstScanMinutes,
        classificationCompletenessPct: row.classificationCompletenessPct === '' ? null : row.classificationCompletenessPct,
        objectsScanned: row.objectsScanned,
      },
      versions,
    };
  });

  const marketplace = marketplaceRows.map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    category: row.category,
    authPattern: row.authPattern,
    creator: buildCreator(row),
    certStatus: row.certStatus,
    submittedDate: row.submittedDate,
    reviewer: row.reviewer || null,
    gates: gateRows
      .filter((g) => g.submission_id === row.id)
      .map((g) => ({ name: g.gate_name, status: g.status })),
  }));

  const events = eventRows.map((row) => ({
    connectorId: row.connector_id,
    tenantId: row.tenant_id || null,
    runId: row.run_id || null,
    timestamp: row.timestamp,
    stage: row.stage || null,
    phase: row.phase,
    detail: row.detail,
    volume: row.volume === '' || row.volume == null ? null : Number(row.volume),
  }));

  return { connectors, tenants, marketplace, events };
}
