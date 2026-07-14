import { LifecycleBadge, AuthBadge, HealthDot } from './Badges';
import { currentVersion } from '../data/model';
import { ArrowUpCircle } from 'lucide-react';

export default function ConnectorTile({ connector, myVersion, onOpen, onUpdate }) {
  const latest = currentVersion(connector);
  const isUpToDate = myVersion.version === latest.version;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(connector)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(connector); }}
      className="text-left border border-[#d0d7de] rounded-xl p-4 bg-[#f6f8fa] hover:border-cyan-500/40 hover:bg-[#eaeef2] transition-colors group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{connector.icon}</span>
          <div>
            <p className="text-sm font-medium text-[#1f2328]">{connector.name}</p>
            <p className="text-[10px] text-[#6e7781]">{connector.category} · v{myVersion.version}</p>
          </div>
        </div>
        <HealthDot health={connector.health} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <LifecycleBadge stage={myVersion.lifecycleStage} />
        <AuthBadge pattern={connector.authPattern} />
        {connector.creator.type === 'partner' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-indigo-500/10 text-indigo-700 border-indigo-500/30">
            Partner-built
          </span>
        )}
        {isUpToDate ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-[#eaeef2] text-[#6e7781] border-[#d8dee4] ml-auto">
            Up to date
          </span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(connector); }}
            className="text-[10px] px-1.5 py-0.5 rounded border bg-cyan-500/10 text-[#0969da] border-cyan-500/30 hover:bg-cyan-500/20 ml-auto flex items-center gap-1"
            title={`Update to v${latest.version}`}
          >
            <ArrowUpCircle size={10} /> Update to v{latest.version}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-[#6e7781]">Scan success</span>
          <span className="text-[#1f2328]">{connector.metrics.scanSuccessRatePct}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6e7781]">Adoption</span>
          <span className="text-[#1f2328]">{connector.metrics.adoptionPct}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6e7781]">Time-to-first-scan</span>
          <span className="text-[#1f2328]">{connector.metrics.timeToFirstScanMinutes}m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6e7781]">Classification</span>
          <span className="text-[#1f2328]">
            {connector.metrics.classificationCompletenessPct == null ? 'Metadata only' : `${connector.metrics.classificationCompletenessPct}%`}
          </span>
        </div>
      </div>

      <p className="text-[10px] text-[#0969da]/0 group-hover:text-[#0969da]/80 mt-2 transition-colors">
        View pipeline &amp; AI copilot →
      </p>
    </div>
  );
}
