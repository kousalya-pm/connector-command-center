import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useData } from '../context/DataContext';
import { currentVersion, tenantsOnVersion } from '../data/model';
import { LifecycleBadge, CertTierBadge, HealthDot } from '../components/Badges';

const TIER_META = {
  Enterprise: 'text-[#8250df] border-purple-500/30 bg-purple-500/10',
  'Mid-Market': 'text-[#0969da] border-cyan-500/30 bg-cyan-500/10',
};

// text-left by default so headers match the (left-aligned) text/badge cells
// beneath them — only the numeric columns override to text-right.
const TH_CLASS = 'px-3 py-2 text-[10px] font-medium text-[#57606a] uppercase tracking-wider text-left';
const INNER_TH_CLASS = 'px-3 py-1.5 text-[9.5px] font-medium text-[#57606a] uppercase tracking-wider text-left';

function ConnectorTableRow({ connector, tenants, expanded, onToggle }) {
  const version = currentVersion(connector);
  const totalCustomers = new Set(connector.versions.flatMap((v) => v.tenantIds)).size;

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-[#eaeef2]/60 border-b border-[#d8dee4] last:border-b-0 transition-colors"
      >
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {expanded ? <ChevronDown size={13} className="text-[#6e7781] shrink-0" /> : <ChevronRight size={13} className="text-[#6e7781] shrink-0" />}
            <span className="text-base shrink-0">{connector.icon}</span>
            <span className="text-xs font-medium text-[#1f2328] truncate">{connector.name}</span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-[11px] text-[#57606a] whitespace-nowrap">{connector.category}</td>
        <td className="px-3 py-2.5 text-[11px] font-mono text-[#1f2328] whitespace-nowrap">v{version.version}</td>
        <td className="px-3 py-2.5"><LifecycleBadge stage={version.lifecycleStage} /></td>
        <td className="px-3 py-2.5"><CertTierBadge tier={connector.certTier} short /></td>
        <td className="px-3 py-2.5"><HealthDot health={connector.health} /></td>
        <td className="px-3 py-2.5 text-[11px] text-[#57606a] text-right">{connector.versions.length}</td>
        <td className="px-3 py-2.5 text-[11px] text-[#57606a] text-right">{totalCustomers}</td>
        <td className="px-3 py-2.5 text-[11px] text-[#1f2328] text-right whitespace-nowrap">{version.adoptionPct}%</td>
        <td className="px-3 py-2.5 text-[11px] text-[#1f2328] text-right whitespace-nowrap">{version.scanSuccessRatePct}%</td>
      </tr>
      {expanded && (
        <tr className="border-b border-[#d8dee4]">
          <td colSpan={10} className="bg-white px-3 pb-3 pt-2">
            <div className="border border-[#d8dee4] rounded-md overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f6f8fa] border-b border-[#d8dee4]">
                  <th className={INNER_TH_CLASS}>Version</th>
                  <th className={INNER_TH_CLASS}>Lifecycle</th>
                  <th className={INNER_TH_CLASS}>Released</th>
                  <th className={`${INNER_TH_CLASS} text-right`}>Adoption</th>
                  <th className={`${INNER_TH_CLASS} text-right`}>Scan success</th>
                  <th className={INNER_TH_CLASS}>Customers</th>
                </tr>
              </thead>
              <tbody>
                {connector.versions.map((v) => {
                  const versionTenants = tenantsOnVersion(v, tenants);
                  return (
                    <tr key={v.version} className="border-b border-[#d8dee4] last:border-b-0">
                      <td className="px-3 py-2 text-[11px] font-mono text-[#1f2328] whitespace-nowrap">v{v.version}</td>
                      <td className="px-3 py-2"><LifecycleBadge stage={v.lifecycleStage} /></td>
                      <td className="px-3 py-2 text-[11px] text-[#6e7781] whitespace-nowrap">{v.releaseDate}</td>
                      <td className="px-3 py-2 text-[11px] text-[#1f2328] text-right whitespace-nowrap">{v.adoptionPct}%</td>
                      <td className="px-3 py-2 text-[11px] text-[#1f2328] text-right whitespace-nowrap">{v.scanSuccessRatePct}%</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {versionTenants.length === 0 && <span className="text-[10px] text-[#6e7781]">No customers on this version</span>}
                          {versionTenants.map((t) => (
                            <span
                              key={t.id}
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${TIER_META[t.tier]}`}
                              title={`${t.tier} · ${t.region}`}
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function OpsConsole() {
  const { connectors, tenants } = useData();
  const [expandedId, setExpandedId] = useState(null);

  const topByAdoption = [...connectors].sort((a, b) => b.metrics.adoptionPct - a.metrics.adoptionPct).slice(0, 5);
  const lowestSuccess = [...connectors].sort((a, b) => a.metrics.scanSuccessRatePct - b.metrics.scanSuccessRatePct).slice(0, 3);

  return (
    <div className="max-w-[1680px] mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[#1f2328]">Acme Corp — Connector Platform Ops</h1>
        <p className="text-xs text-[#6e7781] mt-0.5">
          Cross-tenant connector governance: version-level adoption, usage-driven prioritization
        </p>
      </div>

      {/* Usage analytics -> roadmap prioritization */}
      <section className="grid md:grid-cols-2 gap-4">
        <div>
          <h2 className="text-xs font-medium text-[#1f2328] uppercase tracking-wider mb-2">Top connectors by adoption</h2>
          <div className="border border-[#d0d7de] rounded-lg bg-[#f6f8fa] divide-y divide-[#d8dee4]">
            {topByAdoption.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2 text-[11px]">
                <span className="text-[#1f2328]">{c.icon} {c.name}</span>
                <span className="text-[#0969da]">{c.metrics.adoptionPct}%</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xs font-medium text-[#1f2328] uppercase tracking-wider mb-2">Lowest scan success — roadmap flags</h2>
          <div className="border border-[#d0d7de] rounded-lg bg-[#f6f8fa] divide-y divide-[#d8dee4]">
            {lowestSuccess.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-[#1f2328]">{c.icon} {c.name}</span>
                  <LifecycleBadge stage={currentVersion(c).lifecycleStage} />
                </div>
                <span className="text-[#cf222e]">{c.metrics.scanSuccessRatePct}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Connector -> version -> customer drill-down */}
      <section>
        <h2 className="text-xs font-medium text-[#1f2328] uppercase tracking-wider mb-2">
          Connector version adoption — drill down to customers
        </h2>
        <div className="border border-[#d0d7de] rounded-lg bg-[#f6f8fa] overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#eaeef2] border-b border-[#d0d7de]">
                <th className={TH_CLASS}>Connector</th>
                <th className={TH_CLASS}>Category</th>
                <th className={TH_CLASS}>Version</th>
                <th className={TH_CLASS}>Lifecycle</th>
                <th className={TH_CLASS}>Internal Tier</th>
                <th className={TH_CLASS}>Health</th>
                <th className={`${TH_CLASS} text-right`}>Versions</th>
                <th className={`${TH_CLASS} text-right`}>Customers</th>
                <th className={`${TH_CLASS} text-right`}>Adoption</th>
                <th className={`${TH_CLASS} text-right`}>Scan success</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {connectors.map((c) => (
                <ConnectorTableRow
                  key={c.id}
                  connector={c}
                  tenants={tenants}
                  expanded={expandedId === c.id}
                  onToggle={() => setExpandedId((id) => (id === c.id ? null : c.id))}
                />
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <p className="text-[10px] text-[#6e7781]">
        Real-time visibility into connector performance, usage patterns, and customer needs — feeding data-driven roadmap decisions.
      </p>
    </div>
  );
}
