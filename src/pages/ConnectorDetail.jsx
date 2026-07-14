import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpCircle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { pipelineForConnector, currentVersion, versionForTenant, cumulativeVolumeSeries, CURRENT_TENANT_ID } from '../data/model';

function formatObjectCount(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return `${v}`;
}
import { LifecycleBadge, AuthBadge, CertTierBadge, HealthDot } from '../components/Badges';
import FlowDiagram from '../components/FlowDiagram';
import IdentityTrace from '../components/IdentityTrace';
import AICopilotPanel from '../components/AICopilotPanel';
import ComplianceRiskPanel from '../components/ComplianceRiskPanel';
import TimelineFeed from '../components/TimelineFeed';
import DailyVolumeChart from '../components/DailyVolumeChart';

export default function ConnectorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { connectors, tenants, events, versionOverrides, updateToLatest } = useData();
  const connector = connectors.find((c) => c.id === id);

  if (!connector) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-sm text-[#57606a]">
        Connector not found. <button onClick={() => navigate('/')} className="text-[#0969da] underline">Back to console</button>
      </div>
    );
  }

  const stages = pipelineForConnector(connector);
  const version = currentVersion(connector);
  const myVersion = versionForTenant(connector, CURRENT_TENANT_ID, versionOverrides);
  const myTenant = tenants.find((t) => t.id === CURRENT_TENANT_ID);
  const volumeSeries = cumulativeVolumeSeries(events, CURRENT_TENANT_ID, connector.id);
  const totalScanned = volumeSeries.length ? volumeSeries[volumeSeries.length - 1].cumulativeVolume : 0;
  const isUpToDate = myVersion && myVersion.version === version.version;

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs text-[#57606a] hover:text-[#0969da]">
        <ArrowLeft size={13} /> Back to console
      </button>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{connector.icon}</span>
          <div>
            <h1 className="text-lg font-semibold text-[#1f2328]">{connector.name}</h1>
            <p className="text-xs text-[#6e7781]">{connector.category} · v{version.version} · {connector.deploymentModel}</p>
          </div>
        </div>
        <HealthDot health={connector.health} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <LifecycleBadge stage={version.lifecycleStage} />
        <AuthBadge pattern={connector.authPattern} />
        <CertTierBadge tier={connector.certTier} />
        {connector.creator.type === 'partner' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-indigo-500/10 text-indigo-700 border-indigo-500/30">
            Certified Partner: {connector.creator.name}
          </span>
        )}
        {connector.creator.type === 'customer' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-amber-500/10 text-[#9a6700] border-amber-500/30">
            Customer-built
          </span>
        )}

        {myVersion ? (
          isUpToDate ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-[#eaeef2] text-[#6e7781] border-[#d8dee4] ml-auto">
              Up to date
            </span>
          ) : (
            <button
              onClick={() => updateToLatest(connector)}
              className="text-[10px] px-1.5 py-0.5 rounded border bg-cyan-500/10 text-[#0969da] border-cyan-500/30 hover:bg-cyan-500/20 ml-auto flex items-center gap-1"
              title={`Update to v${version.version}`}
            >
              <ArrowUpCircle size={10} /> Update to v{version.version}
            </button>
          )
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-[#eaeef2] text-[#6e7781] border-[#d8dee4] ml-auto">
            Not deployed for {myTenant.name}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Scan success rate', `${connector.metrics.scanSuccessRatePct}%`],
          ['Cumulative objects scanned', formatObjectCount(totalScanned)],
          ['Time-to-first-scan', `${connector.metrics.timeToFirstScanMinutes} min`],
          ['Classification completeness', connector.metrics.classificationCompletenessPct == null ? 'N/A · metadata only' : `${connector.metrics.classificationCompletenessPct}%`],
        ].map(([label, value]) => (
          <div key={label} className="border border-[#d0d7de] rounded-lg p-2.5 bg-[#f6f8fa]">
            <p className="text-[10px] text-[#6e7781] uppercase tracking-wider">{label}</p>
            <p className="text-base text-[#1f2328] font-medium mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-[10px] text-[#6e7781] uppercase tracking-wider mb-1.5">Scan pipeline</p>
        <FlowDiagram stages={stages} />
      </div>

      <DailyVolumeChart
        events={events}
        tenantId={CURRENT_TENANT_ID}
        connectorId={connector.id}
        title={`${connector.name} — objects scanned per run (non-cumulative)`}
      />

      <div>
        <p className="text-[10px] text-[#6e7781] uppercase tracking-wider mb-1.5">Activity timeline</p>
        <TimelineFeed connector={connector} tenantId={CURRENT_TENANT_ID} events={events} />
      </div>

      <IdentityTrace />

      <AICopilotPanel connector={connector} />

      <ComplianceRiskPanel connector={connector} tenant={myTenant} events={events} />
    </div>
  );
}
