import { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, Circle, Tag, ChevronDown, ChevronRight, History } from 'lucide-react';
import { eventsForConnectorAndTenant, groupEventsIntoRuns, stagesForRun, STAGE_ORDER, runDurationMinutes } from '../data/model';

const STAGE_STATUS_STYLE = {
  ok: 'border-emerald-500/40 bg-emerald-500/5 text-[#1a7f37]',
  error: 'border-red-500/40 bg-red-500/5 text-[#cf222e]',
  in_progress: 'border-amber-500/40 bg-amber-500/5 text-[#9a6700]',
};

const RUN_STATUS_DOT = {
  ok: 'bg-emerald-400',
  error: 'bg-red-400',
  in_progress: 'bg-amber-400 animate-pulse',
};

function formatTime(ts) {
  return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function RunItem({ run, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const stages = useMemo(() => stagesForRun(run), [run]);
  const durationMin = useMemo(() => runDurationMinutes(run), [run]);

  return (
    <div className="border border-[#d0d7de] rounded-lg bg-[#f6f8fa] overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#eaeef2]/50">
        {open ? <ChevronDown size={12} className="text-[#6e7781]" /> : <ChevronRight size={12} className="text-[#6e7781]" />}
        <span className={`h-2 w-2 rounded-full shrink-0 ${RUN_STATUS_DOT[run.status]}`} />
        <span className="text-xs text-[#1f2328]">Scan run</span>
        <span className="text-[10px] text-[#6e7781] font-mono">{formatTime(run.startedAt)}</span>
        <span className="ml-auto text-[10px]">
          {run.status === 'error' && <span className="text-[#cf222e]">Failed</span>}
          {run.status === 'ok' && <span className="text-[#6e7781]">{durationMin} min</span>}
          {run.status === 'in_progress' && <span className="text-[#9a6700]">In progress</span>}
        </span>
      </button>

      {open && (
        <div className="border-t border-[#d0d7de] px-3 py-2 space-y-1.5">
          {stages.map((s) => (
            <div key={s.stage} className={`flex items-center gap-2 text-[11px] rounded border px-2 py-1.5 ${STAGE_STATUS_STYLE[s.status]}`}>
              {s.status === 'ok' ? <CheckCircle2 size={12} /> : s.status === 'error' ? <XCircle size={12} /> : <Circle size={12} />}
              <span className="font-medium w-14 shrink-0">{s.stage}</span>
              <span className="flex-1 text-[#57606a] truncate">{s.detail}</span>
              <span className="text-[10px] text-[#6e7781] font-mono shrink-0">
                {formatTime(s.startedAt)}{s.endedAt ? ` → ${formatTime(s.endedAt)}` : ''}
              </span>
            </div>
          ))}
          {run.status === 'error' && stages.length < STAGE_ORDER.length && (
            <p className="text-[10px] text-[#6e7781] pl-1">
              {STAGE_ORDER.slice(stages.length).join(', ')} did not run — blocked by the failure above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function TimelineFeed({ connector, tenantId, events }) {
  const scoped = useMemo(() => eventsForConnectorAndTenant(events, connector.id, tenantId), [events, connector.id, tenantId]);
  const { runs, lifecycle } = useMemo(() => groupEventsIntoRuns(scoped), [scoped]);
  const [showAllRuns, setShowAllRuns] = useState(false);

  const items = useMemo(() => {
    const lifecycleItems = lifecycle.map((e) => ({ type: 'lifecycle', timestamp: e.timestamp, event: e }));
    const runItems = runs.map((r) => ({ type: 'run', timestamp: r.startedAt, run: r }));
    return [...lifecycleItems, ...runItems].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [lifecycle, runs]);

  const lastRunId = runs[runs.length - 1]?.runId;
  const previousRunsCount = Math.max(0, runs.length - 1);

  // By default, collapse every run except the latest into a single
  // "show previous runs" toggle — the lifecycle events still show in full.
  const renderItems = useMemo(() => {
    let toggleInserted = false;
    return items.reduce((acc, item) => {
      const isPreviousRun = item.type === 'run' && item.run.runId !== lastRunId;
      if (isPreviousRun) {
        if (!toggleInserted) {
          acc.push({ type: 'toggle' });
          toggleInserted = true;
        }
        if (showAllRuns) acc.push(item);
        return acc;
      }
      acc.push(item);
      return acc;
    }, []);
  }, [items, lastRunId, showAllRuns]);

  if (items.length === 0) {
    return <p className="text-xs text-[#6e7781]">No activity yet for this tenant.</p>;
  }

  return (
    <div className="space-y-2">
      {renderItems.map((item, i) => {
        if (item.type === 'toggle') {
          return (
            <button
              key="toggle"
              onClick={() => setShowAllRuns((v) => !v)}
              className="w-full flex items-center gap-2 text-[11px] text-[#6e7781] hover:text-[#0969da] pl-1 py-1"
            >
              <History size={12} className="shrink-0" />
              {showAllRuns ? 'Hide previous runs' : `Show ${previousRunsCount} previous run${previousRunsCount === 1 ? '' : 's'}`}
            </button>
          );
        }
        if (item.type === 'lifecycle') {
          return (
            <div key={i} className="flex items-center gap-2 text-[11px] text-[#57606a] pl-1">
              <Tag size={11} className="text-[#6e7781] shrink-0" />
              <span className="text-[10px] text-[#6e7781] font-mono shrink-0">{formatTime(item.event.timestamp)}</span>
              <span>{item.event.detail}</span>
              {!item.event.tenantId && <span className="text-[10px] text-[#6e7781]">· platform-wide</span>}
            </div>
          );
        }
        return <RunItem key={item.run.runId} run={item.run} defaultOpen={item.run.runId === lastRunId} />;
      })}
    </div>
  );
}
