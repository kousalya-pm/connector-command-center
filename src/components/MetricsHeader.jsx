const METRIC_META = [
  { key: 'avgScanSuccessRatePct', label: 'Scan Success Rate', suffix: '%', accent: 'text-[#1a7f37]' },
  { key: 'avgTimeToFirstScanMinutes', label: 'Time-to-First-Scan', suffix: ' min', accent: 'text-[#9a6700]' },
  { key: 'avgClassificationCompletenessPct', label: 'Classification Completeness', suffix: '%', accent: 'text-[#8250df]' },
];

export default function MetricsHeader({ metrics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {METRIC_META.map((m) => (
        <div key={m.key} className="border border-[#d0d7de] rounded-lg p-3 bg-[#f6f8fa]">
          <p className="text-[10px] text-[#6e7781] uppercase tracking-wider mb-1">{m.label}</p>
          <p className={`text-2xl font-semibold ${m.accent}`}>
            {metrics[m.key]}
            <span className="text-sm text-[#6e7781] font-normal">{m.suffix}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
