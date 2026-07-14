import { AUTH_PATTERNS, CERT_TIERS } from '../data/model';

const LIFECYCLE_STYLES = {
  alpha: 'bg-purple-500/10 text-[#8250df] border-purple-500/30',
  beta: 'bg-amber-500/10 text-[#9a6700] border-amber-500/30',
  ga: 'bg-emerald-500/10 text-[#1a7f37] border-emerald-500/30',
  deprecated: 'bg-red-500/10 text-[#cf222e] border-red-500/30',
};

export function LifecycleBadge({ stage }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide ${LIFECYCLE_STYLES[stage]}`}>
      {stage}
    </span>
  );
}

export function AuthBadge({ pattern }) {
  const meta = AUTH_PATTERNS[pattern];
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded border bg-cyan-500/10 text-[#0969da] border-cyan-500/30"
      title={meta.hint}
    >
      {meta.label}
    </span>
  );
}

export function CertTierBadge({ tier, short = false }) {
  const meta = CERT_TIERS[tier];
  const riskColor =
    meta.risk === 'low' ? 'text-[#1a7f37] border-emerald-500/30 bg-emerald-500/10' :
    meta.risk === 'medium' ? 'text-[#9a6700] border-amber-500/30 bg-amber-500/10' :
    'text-[#cf222e] border-red-500/30 bg-red-500/10';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${riskColor}`} title={`Release cadence: ${meta.cadence}`}>
      {short ? `Tier ${tier}` : meta.label}
    </span>
  );
}

const HEALTH_STYLES = {
  healthy: { dot: 'bg-emerald-400', label: 'Healthy', text: 'text-[#1a7f37]' },
  degraded: { dot: 'bg-amber-400', label: 'Degraded', text: 'text-[#9a6700]' },
  down: { dot: 'bg-red-400', label: 'Down', text: 'text-[#cf222e]' },
};

export function HealthDot({ health }) {
  const meta = HEALTH_STYLES[health];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] ${meta.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} ${health === 'healthy' ? 'animate-pulse' : ''}`} />
      {meta.label}
    </span>
  );
}
