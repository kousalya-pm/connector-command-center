import { ArrowRight } from 'lucide-react';

const STATUS_STYLES = {
  ok: 'border-emerald-500/40 bg-emerald-500/5 text-[#1a7f37]',
  warn: 'border-amber-500/40 bg-amber-500/5 text-[#9a6700]',
  error: 'border-red-500/40 bg-red-500/5 text-[#cf222e]',
};

export default function FlowDiagram({ stages }) {
  return (
    <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
      {stages.map((s, i) => (
        <div key={s.stage} className="flex items-stretch gap-2 shrink-0">
          <div className={`rounded-lg border px-3 py-2.5 min-w-[140px] ${STATUS_STYLES[s.status]}`}>
            <p className="text-xs font-semibold">{s.stage}</p>
            <p className="text-[10px] text-[#57606a] mt-0.5 leading-snug">{s.detail}</p>
          </div>
          {i < stages.length - 1 && (
            <div className="flex items-center text-[#6e7781]">
              <ArrowRight size={14} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
