import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Store } from 'lucide-react';
import { useData } from '../context/DataContext';
import { CATEGORIES, platformMetrics, versionForTenant, isLaunchedForTenant, CURRENT_TENANT_ID } from '../data/model';
import MetricsHeader from '../components/MetricsHeader';
import ConnectorTile from '../components/ConnectorTile';
import AvailableTile from '../components/AvailableTile';
import ConfigureModal from '../components/ConfigureModal';
import DataFlowSankey from '../components/DataFlowSankey';

export default function CustomerConsole() {
  const navigate = useNavigate();
  const { connectors, marketplace, versionOverrides, updateToLatest, installFromMarketplace, launches } = useData();
  const [tab, setTab] = useState('installed');
  const [category, setCategory] = useState('all');
  const [configuring, setConfiguring] = useState(null);

  // Installed = connectors this tenant actually runs (a version's tenantIds
  // includes them, or the session-only "update to latest" override applies).
  const installed = useMemo(() => {
    return connectors
      .map((c) => ({ connector: c, myVersion: versionForTenant(c, CURRENT_TENANT_ID, versionOverrides) }))
      .filter((x) => x.myVersion);
  }, [connectors, versionOverrides]);

  const installedIds = useMemo(() => new Set(installed.map((x) => x.connector.id)), [installed]);

  // Available = certified AND launched-to-this-tenant marketplace submissions,
  // not already installed. Certification alone doesn't make it visible —
  // someone still has to launch it (see Marketplace).
  const available = marketplace.filter(
    (s) => s.certStatus === 'certified' && isLaunchedForTenant(launches[s.id], CURRENT_TENANT_ID) && !installedIds.has(s.id)
  );

  // Scoped to this tenant's own installed connectors — not the full fleet —
  // so the KPI tiles and the flow diagram below tell the same story.
  const installedConnectors = useMemo(() => installed.map((x) => x.connector), [installed]);
  const metrics = useMemo(() => platformMetrics(installedConnectors), [installedConnectors]);

  const filteredInstalled = category === 'all' ? installed : installed.filter((x) => x.connector.category === category);
  const filteredAvailable = category === 'all' ? available : available.filter((s) => s.category === category);

  const tabClass = (name) =>
    `flex items-center gap-1.5 text-xs px-3.5 py-2.5 border-b-2 -mb-px transition-colors ${
      tab === name ? 'border-[#0969da] text-[#0969da] font-medium' : 'border-transparent text-[#57606a] hover:text-[#1f2328]'
    }`;

  return (
    <div className="max-w-[1680px] mx-auto px-6 py-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-[#1f2328]">Connector Command Center</h1>
        <p className="text-xs text-[#6e7781] mt-0.5">Meridian Health · Enterprise tenant — connector health, scan status, and classification coverage</p>
      </div>

      <MetricsHeader metrics={metrics} />

      <DataFlowSankey connectors={installedConnectors} />

      <div className="border border-[#d0d7de] rounded-lg bg-white overflow-hidden">
        <div className="flex items-center gap-1 border-b border-[#d0d7de] px-3 bg-[#f6f8fa]">
          <button onClick={() => setTab('installed')} className={tabClass('installed')}>
            <Boxes size={13} /> Installed ({installed.length})
          </button>
          <button onClick={() => setTab('available')} className={tabClass('available')}>
            <Store size={13} /> Available ({available.length})
          </button>
        </div>

        <div className="p-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategory('all')}
              className={`text-[11px] px-2.5 py-1 rounded-full border ${category === 'all' ? 'bg-cyan-500/10 text-[#0969da] border-cyan-500/40' : 'text-[#57606a] border-[#d8dee4] hover:border-[#6e7781]'}`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-[11px] px-2.5 py-1 rounded-full border ${category === cat ? 'bg-cyan-500/10 text-[#0969da] border-cyan-500/40' : 'text-[#57606a] border-[#d8dee4] hover:border-[#6e7781]'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {tab === 'installed' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredInstalled.map(({ connector, myVersion }) => (
                <ConnectorTile
                  key={connector.id}
                  connector={connector}
                  myVersion={myVersion}
                  onOpen={(c) => navigate(`/connector/${c.id}`)}
                  onUpdate={updateToLatest}
                />
              ))}
              {filteredInstalled.length === 0 && (
                <p className="text-xs text-[#6e7781] col-span-full">No installed connectors in this category.</p>
              )}
            </div>
          )}

          {tab === 'available' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAvailable.map((s) => (
                <AvailableTile key={s.id} submission={s} onSelect={setConfiguring} />
              ))}
              {filteredAvailable.length === 0 && (
                <p className="text-xs text-[#6e7781] col-span-full">Nothing new to add in this category.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {configuring && (
        <ConfigureModal
          submission={configuring}
          onInstalled={installFromMarketplace}
          onClose={(connector) => {
            setConfiguring(null);
            if (connector) {
              setTab('installed');
              navigate(`/connector/${connector.id}`);
            }
          }}
        />
      )}
    </div>
  );
}
