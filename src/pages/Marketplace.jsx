import { useState } from 'react';
import { ChevronDown, ChevronRight, CircleDot, CheckCircle2, XCircle, Circle, Rocket } from 'lucide-react';
import { useData } from '../context/DataContext';
import { CERT_STATUSES, GATE_STATUSES, CREATOR_TYPE_LABEL } from '../data/model';

const CREATOR_BADGE_STYLE = {
  acme: 'text-[#57606a] border-[#d8dee4] bg-[#eaeef2]',
  partner: 'text-indigo-700 border-indigo-500/30 bg-indigo-500/10',
  customer: 'text-[#9a6700] border-amber-500/30 bg-amber-500/10',
};

const GATE_ICON = {
  pending: Circle,
  in_progress: CircleDot,
  passed: CheckCircle2,
  failed: XCircle,
};

function CreatorLabel({ creator, tenants }) {
  const tenant = creator.tenantId ? tenants.find((t) => t.id === creator.tenantId) : null;
  const label = creator.type === 'customer' ? (tenant?.name || creator.name) : creator.name;
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CREATOR_BADGE_STYLE[creator.type]}`}>
      {CREATOR_TYPE_LABEL[creator.type]}{creator.type !== 'acme' ? `: ${label}` : ''}
    </span>
  );
}

// Release is a separate decision from certification — a submission can pass
// every gate and still sit unlaunched, or launch to a hand-picked subset of
// tenants first (a staged rollout) before going fully GA.
function ReleaseSection({ submission, tenants, launch, onLaunchToAll, onLaunchToSelected, onExpandToAll }) {
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState([]);

  if (launch?.scope === 'all') {
    return (
      <div className="mt-2.5 pt-2.5 border-t border-[#d8dee4] flex items-center gap-2">
        <Rocket size={13} className="text-[#1a7f37]" />
        <span className="text-[11px] text-[#1a7f37] font-medium">Live — available to all customers</span>
      </div>
    );
  }

  if (launch?.scope === 'selected') {
    const names = launch.tenantIds.map((id) => tenants.find((t) => t.id === id)?.name).filter(Boolean);
    return (
      <div className="mt-2.5 pt-2.5 border-t border-[#d8dee4]">
        <div className="flex items-center gap-2 flex-wrap">
          <Rocket size={13} className="text-[#9a6700]" />
          <span className="text-[11px] text-[#9a6700] font-medium">
            Live for {launch.tenantIds.length} of {tenants.length} customers: {names.join(', ')}
          </span>
          <button
            onClick={onExpandToAll}
            className="text-[10px] px-2 py-0.5 rounded border bg-cyan-500/10 text-[#0969da] border-cyan-500/40 hover:bg-cyan-500/20 ml-auto"
          >
            Expand to all customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2.5 pt-2.5 border-t border-[#d8dee4]">
      <p className="text-[10px] text-[#6e7781] uppercase tracking-wider mb-1.5">Release</p>
      {!picking ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onLaunchToAll}
            className="text-[11px] px-2.5 py-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-[#1a7f37] hover:bg-emerald-500/20 flex items-center gap-1.5"
          >
            <Rocket size={11} /> Launch to all customers
          </button>
          <button
            onClick={() => setPicking(true)}
            className="text-[11px] px-2.5 py-1.5 rounded border border-[#d8dee4] text-[#57606a] hover:border-[#afb8c1]"
          >
            Launch to selected customers
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {tenants.map((t) => (
              <label key={t.id} className="flex items-center gap-1.5 text-[11px] text-[#1f2328] border border-[#d8dee4] rounded px-2 py-1 bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(t.id)}
                  onChange={() => setSelected((prev) => (prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]))}
                />
                {t.name}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onLaunchToSelected(selected); setPicking(false); }}
              disabled={selected.length === 0}
              className="text-[11px] px-2.5 py-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-[#1a7f37] hover:bg-emerald-500/20 disabled:opacity-40 flex items-center gap-1.5"
            >
              <Rocket size={11} /> Launch to {selected.length || ''} selected
            </button>
            <button
              onClick={() => { setPicking(false); setSelected([]); }}
              className="text-[11px] px-2.5 py-1.5 rounded border border-[#d8dee4] text-[#57606a] hover:border-[#afb8c1]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionCard({ submission, tenants, defaultOpen, launch, onLaunchToAll, onLaunchToSelected, onExpandToAll }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const statusMeta = CERT_STATUSES[submission.certStatus];

  return (
    <div className="border border-[#d0d7de] rounded-lg bg-[#f6f8fa] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#eaeef2]/50 transition-colors"
      >
        {open ? <ChevronDown size={13} className="text-[#6e7781] shrink-0" /> : <ChevronRight size={13} className="text-[#6e7781] shrink-0" />}
        <span className="text-base shrink-0">{submission.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-medium text-[#1f2328]">{submission.name}</p>
            <CreatorLabel creator={submission.creator} tenants={tenants} />
            {submission.certStatus === 'certified' && launch && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border text-[#1a7f37] border-emerald-500/30 bg-emerald-500/10 flex items-center gap-1">
                <Rocket size={9} /> {launch.scope === 'all' ? 'Live' : 'Limited launch'}
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#6e7781] mt-0.5">
            {submission.category} · submitted {submission.submittedDate}{submission.reviewer ? ` · reviewer ${submission.reviewer}` : ''}
          </p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${statusMeta.color}`}>{statusMeta.label}</span>
      </button>

      {open && (
        <div className="border-t border-[#d0d7de] px-3 pb-3 pt-2.5">
          <p className="text-[10px] text-[#6e7781] uppercase tracking-wider mb-1.5">Certification gates</p>
          <div className="space-y-1.5">
            {submission.gates.map((g) => {
              const gateMeta = GATE_STATUSES[g.status];
              const Icon = GATE_ICON[g.status];
              return (
                <div key={g.name} className="flex items-center gap-2 text-[11px]">
                  <Icon size={13} className={gateMeta.color} />
                  <span className="text-[#1f2328] flex-1">{g.name}</span>
                  <span className={gateMeta.color}>{gateMeta.label}</span>
                </div>
              );
            })}
          </div>

          {submission.certStatus === 'certified' && (
            <ReleaseSection
              submission={submission}
              tenants={tenants}
              launch={launch}
              onLaunchToAll={onLaunchToAll}
              onLaunchToSelected={onLaunchToSelected}
              onExpandToAll={onExpandToAll}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function Marketplace() {
  const { marketplace, tenants, launches, launchToAll, launchToSelected, expandToAll } = useData();
  const [filter, setFilter] = useState('all');

  const counts = Object.keys(CERT_STATUSES).reduce((acc, status) => {
    acc[status] = marketplace.filter((s) => s.certStatus === status).length;
    return acc;
  }, {});

  const filtered = filter === 'all' ? marketplace : marketplace.filter((s) => s.certStatus === filter);

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-[#1f2328]">Connector Marketplace</h1>
        <p className="text-xs text-[#6e7781] mt-0.5">
          Acme, partner, and customer-built connectors moving through the technical certification program. Certification is the technical gate — launching is the separate decision of whether, and to whom, it goes live.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(CERT_STATUSES).map(([status, meta]) => (
          <button
            key={status}
            onClick={() => setFilter(filter === status ? 'all' : status)}
            className={`text-left border rounded-lg p-3 bg-[#f6f8fa] transition-colors ${filter === status ? 'border-cyan-500/50' : 'border-[#d0d7de] hover:border-[#afb8c1]'}`}
          >
            <p className={`text-[10px] px-1.5 py-0.5 rounded-full border inline-block ${meta.color}`}>{meta.label}</p>
            <p className="text-2xl font-semibold text-[#1f2328] mt-2">{counts[status] || 0}</p>
            <p className="text-[10px] text-[#6e7781]">submission{counts[status] === 1 ? '' : 's'}</p>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((s, i) => (
          <SubmissionCard
            key={s.id}
            submission={s}
            tenants={tenants}
            defaultOpen={i === 0}
            launch={launches[s.id]}
            onLaunchToAll={() => launchToAll(s.id)}
            onLaunchToSelected={(tenantIds) => launchToSelected(s.id, tenantIds)}
            onExpandToAll={() => expandToAll(s.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-[#6e7781]">No submissions in this status.</p>
        )}
      </div>
    </div>
  );
}
