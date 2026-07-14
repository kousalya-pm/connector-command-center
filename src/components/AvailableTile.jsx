import { AuthBadge } from './Badges';
import { CREATOR_TYPE_LABEL } from '../data/model';

const CREATOR_BADGE_STYLE = {
  acme: 'text-[#57606a] border-[#d8dee4] bg-[#eaeef2]',
  partner: 'text-indigo-700 border-indigo-500/30 bg-indigo-500/10',
  customer: 'text-[#9a6700] border-amber-500/30 bg-amber-500/10',
};

export default function AvailableTile({ submission, onSelect }) {
  const { creator } = submission;
  return (
    <button
      onClick={() => onSelect(submission)}
      className="text-left border border-[#d0d7de] rounded-xl p-4 bg-[#f6f8fa] hover:border-cyan-500/40 hover:bg-[#eaeef2] transition-colors group"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{submission.icon}</span>
        <div>
          <p className="text-sm font-medium text-[#1f2328]">{submission.name}</p>
          <p className="text-[10px] text-[#6e7781]">{submission.category}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <AuthBadge pattern={submission.authPattern} />
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CREATOR_BADGE_STYLE[creator.type]}`}>
          {CREATOR_TYPE_LABEL[creator.type]}{creator.type !== 'acme' ? `: ${creator.name}` : ''}
        </span>
      </div>

      <p className="text-[10px] text-[#0969da] opacity-0 group-hover:opacity-100 transition-opacity">
        + Add to Meridian Health →
      </p>
    </button>
  );
}
