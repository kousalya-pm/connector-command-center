import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, LineController, Tooltip } from 'chart.js';
import { dailyVolumeSeries, milestonesForConnectorAndTenant, DEMO_NOW } from '../data/model';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, LineController, Tooltip);

const STATUS_COLOR = { ok: '#1a7f37', error: '#cf222e', in_progress: '#9a6700' };
const STATUS_LABEL = { ok: 'Succeeded', error: 'Failed', in_progress: 'In progress' };
const MILESTONE_LEGEND = [
  { label: 'Added', color: '#0969da' },
  { label: 'First scan', color: '#8250df' },
  { label: 'Updated', color: '#1a7f37' },
  { label: 'Rule added', color: '#bf3989' },
];

function formatCount(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v;
}

export default function DailyVolumeChart({ events, tenantId, connectorId, title }) {
  const [range, setRange] = useState(30);

  const series = useMemo(
    () => dailyVolumeSeries(events, tenantId, connectorId),
    [events, tenantId, connectorId]
  );

  const milestones = useMemo(
    () => milestonesForConnectorAndTenant(events, connectorId, tenantId),
    [events, connectorId, tenantId]
  );

  const filtered = useMemo(() => {
    const cutoff = new Date(DEMO_NOW.getTime() - range * 86400000);
    return series.filter((s) => new Date(s.timestamp) >= cutoff);
  }, [series, range]);

  const labels = filtered.map((s) => s.date);
  const milestoneByDate = useMemo(
    () => Object.fromEntries(milestones.filter((m) => labels.includes(m.dateKey)).map((m) => [m.dateKey, m])),
    [milestones, labels]
  );

  const maxVolume = Math.max(1, ...filtered.map((s) => s.volume));
  // Failed runs have zero recorded volume — give them a small visible sentinel
  // height instead of an invisible zero-height bar, so incidents don't disappear.
  const displayValues = filtered.map((s) => (s.status === 'error' ? maxVolume * 0.05 : s.volume));

  // Milestones ride just above the tallest bar as a second dataset — reusing
  // the exact same Tooltip that already works reliably for the bars, instead
  // of a separate annotation-plugin hover system (which never fired here).
  const milestoneY = maxVolume * 1.1;
  const milestoneData = labels.map((date) => (milestoneByDate[date] ? milestoneY : null));

  const data = {
    labels,
    datasets: [
      {
        type: 'bar',
        data: displayValues,
        backgroundColor: filtered.map((s) => STATUS_COLOR[s.status]),
        borderRadius: 3,
        maxBarThickness: 28,
      },
      {
        type: 'line',
        showLine: false,
        data: milestoneData,
        pointRadius: labels.map((date) => (milestoneByDate[date] ? 6 : 0)),
        pointHoverRadius: labels.map((date) => (milestoneByDate[date] ? 8 : 0)),
        pointBackgroundColor: labels.map((date) => milestoneByDate[date]?.color ?? 'transparent'),
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    // Exact hit-testing — a bar and a milestone point never share the same
    // pixel (milestones sit above the tallest bar), so this keeps each
    // element's tooltip scoped to only itself.
    interaction: { mode: 'point', intersect: true },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#ffffff',
        borderColor: '#d0d7de',
        borderWidth: 1,
        titleColor: '#1f2328',
        bodyColor: '#57606a',
        padding: 8,
        callbacks: {
          title: (items) => filtered[items[0].dataIndex]?.fullDate,
          label: (ctx) => {
            if (ctx.datasetIndex === 1) {
              const date = labels[ctx.dataIndex];
              return milestoneByDate[date]?.labels ?? [];
            }
            const s = filtered[ctx.dataIndex];
            if (s.status === 'error') return `Failed — ${s.errorDetail || 'no objects collected'}`;
            return `${STATUS_LABEL[s.status]} · ${s.volume.toLocaleString()} objects`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#d0d7de' },
        ticks: { color: '#6e7781', font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
        border: { color: '#d0d7de' },
      },
      y: {
        grid: { color: '#d0d7de' },
        ticks: { color: '#6e7781', font: { size: 10 }, callback: formatCount },
        border: { color: '#d0d7de' },
        beginAtZero: true,
        max: maxVolume * 1.25,
      },
    },
  };

  return (
    <div className="border border-[#d0d7de] rounded-lg bg-[#f6f8fa] p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-[#6e7781] uppercase tracking-wider">{title || 'Objects scanned per run'}</p>
        <div className="flex gap-1">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`text-[10px] px-2 py-0.5 rounded border ${
                range === d ? 'bg-cyan-500/10 text-[#0969da] border-cyan-500/40' : 'text-[#6e7781] border-[#d8dee4] hover:border-[#6e7781]'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-[#6e7781] py-8 text-center">No runs in this window.</p>
      ) : (
        <div style={{ height: 175 }}>
          <Bar data={data} options={options} />
        </div>
      )}

      <div className="flex items-center gap-3 mt-2 text-[10px] text-[#6e7781] flex-wrap">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Succeeded</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> Failed</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> In progress</span>
        <span className="text-[#6e7781]">·</span>
        {MILESTONE_LEGEND.map((m) => (
          <span key={m.label} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: m.color }} /> {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
