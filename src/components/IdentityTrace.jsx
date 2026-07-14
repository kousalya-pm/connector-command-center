import { useState } from 'react';
import { User, Bot, Plug, Database, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';

const HOPS = [
  { icon: User, label: 'Analyst', detail: 'jsuarez@meridianhealth.com · role: DataStewardship-Read' },
  { icon: Bot, label: 'AI Copilot', detail: 'Scoped session token, no elevation — cannot exceed caller\'s grant' },
  { icon: Plug, label: 'Connector', detail: 'Token exchange, per-tenant credential vault, no shared service account' },
  { icon: Database, label: 'Backend System', detail: 'Source system authorizes the original caller\'s identity, not the platform\'s' },
];

const AUDIT_LOG = [
  { time: '09:14:02', actor: 'jsuarez@meridianhealth.com', action: 'Requested classification preview on s3://meridian-claims/2026', result: 'allowed' },
  { time: '09:14:03', actor: 'ai-copilot (on behalf of jsuarez)', action: 'Proposed PII classification rule from 40-row sample', result: 'proposed, pending review' },
  { time: '09:15:47', actor: 'jsuarez@meridianhealth.com', action: 'Approved rule, applied to full scan', result: 'allowed' },
];

export default function IdentityTrace() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[#d0d7de] rounded-lg bg-[#f6f8fa] overflow-hidden">
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-[#d0d7de]">
        <ShieldCheck size={13} className="text-[#1a7f37]" />
        <p className="text-xs font-medium text-[#1f2328]">Identity propagation — no shared service account</p>
        <span className="text-[10px] text-[#6e7781] ml-auto">every hop carries the caller's actual identity</span>
      </div>

      <div className="px-3 py-3 flex items-center gap-1 overflow-x-auto">
        {HOPS.map((h, i) => (
          <div key={h.label} className="flex items-center gap-1 shrink-0">
            <div className="flex flex-col items-center gap-1 min-w-[110px]" title={h.detail}>
              <div className="h-8 w-8 rounded-full border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center text-[#0969da]">
                <h.icon size={14} />
              </div>
              <p className="text-[10px] text-[#1f2328]">{h.label}</p>
            </div>
            {i < HOPS.length - 1 && <div className="w-6 h-px bg-[#d8dee4] mb-4" />}
          </div>
        ))}
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[#57606a] hover:bg-[#eaeef2]/50 border-t border-[#d0d7de]"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Audit trail ({AUDIT_LOG.length} events)
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {AUDIT_LOG.map((e, i) => (
            <div key={i} className="text-[11px] flex gap-2 items-baseline border-t border-[#d8dee4] pt-1.5 first:border-t-0 first:pt-0">
              <span className="text-[#6e7781] font-mono shrink-0">{e.time}</span>
              <span className="text-[#0969da] shrink-0">{e.actor}</span>
              <span className="text-[#57606a] flex-1">{e.action}</span>
              <span className={e.result === 'allowed' ? 'text-[#1a7f37]' : 'text-[#9a6700]'}>{e.result}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
