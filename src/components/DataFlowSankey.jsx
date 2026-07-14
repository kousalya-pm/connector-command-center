import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../data/model';

// One color per connector (not per category) — with only 6 categories and
// 10+ connectors, category-level coloring made adjacent same-category
// ribbons blend into one flat mass. Cycled by sort order, so it stays
// deterministic across renders.
const CONNECTOR_PALETTE = [
  '#0969da', '#1a7f37', '#9a6700', '#8250df', '#bf3989', '#cf222e',
  '#0891b2', '#c2410c', '#4338ca', '#65a30d', '#be185d', '#0f766e',
];

const HEALTH_COLOR = { healthy: '#1a7f37', degraded: '#9a6700', down: '#cf222e' };

function formatCount(v) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return `${Math.round(v)}`;
}

// Stacks a list of {value} items into vertical bands within `totalHeight`,
// enforcing a minimum band height (so a 1%-share connector doesn't vanish).
// The shortfall needed to bump undersized bands up to the floor is reclaimed
// proportionally from every band still above the floor — not dumped onto
// whichever single band happens to be largest, which could otherwise
// collapse a dominant band far below its fair share. Iterates because
// reclaiming can itself push another band under the floor.
function stackBands(items, totalHeight, gap, minHeight) {
  if (items.length === 0) return [];
  const total = items.reduce((acc, i) => acc + i.value, 0) || 1;
  const usable = totalHeight - gap * Math.max(0, items.length - 1);
  let heights = items.map((i) => (i.value / total) * usable);
  const floored = new Array(items.length).fill(false);

  for (let pass = 0; pass < items.length; pass++) {
    let deficit = 0;
    let changed = false;
    heights.forEach((h, i) => {
      if (!floored[i] && h < minHeight) {
        deficit += minHeight - h;
        heights[i] = minHeight;
        floored[i] = true;
        changed = true;
      }
    });
    if (deficit > 0) {
      const eligible = heights.map((_, i) => i).filter((i) => !floored[i]);
      const eligibleTotal = eligible.reduce((acc, i) => acc + heights[i], 0);
      if (eligibleTotal > 0) {
        eligible.forEach((i) => { heights[i] -= deficit * (heights[i] / eligibleTotal); });
      }
    }
    if (!changed) break;
  }

  let y = 0;
  return items.map((item, i) => {
    const h = heights[i];
    const band = { ...item, y0: y, y1: y + h, h };
    y += h + gap;
    return band;
  });
}

// Smooth S-curve stroke (Highcharts-Sankey style) between two points — the
// horizontal control points sit at the midpoint so the curve fully commits
// before bending, rather than a tight cubic that reads as boxy.
function curveLine(x1, y1, x2, y2) {
  const midX = (x1 + x2) / 2;
  return `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`;
}

function ColumnHeader({ x0, x1, y, children }) {
  return (
    <text x={(x0 + x1) / 2} y={y} fontSize="9.5" fontWeight="600" fill="#6e7781" textAnchor="middle" letterSpacing="0.04em">
      {children}
    </text>
  );
}

// A real (not decorative) Sankey mirroring how DSPM/data-catalog pipelines
// actually work (Forcepoint's two-phase scan, Microsoft Purview's Data Map):
// metadata collection is a universal first pass that lands in a metadata
// store for 100% of volume; content classification is a conditional second
// pass, run only for content-eligible connectors, landing in its own store.
// Metadata-only connectors (identity systems) simply have no ribbon past
// the Metadata Index — there's no dead-end annotation needed, the store
// itself is their real destination.
//
// Visual language borrows from Highcharts' Sankey demo: nodes are thin
// color bars (not padded boxes), labels live outside the bar, and ribbons
// are saturated at rest instead of needing hover to read. On hover, a
// single traced line (the connector's own color) runs from its source
// straight through to the Classification stage, then forks along smooth
// curves into Classified/Pending — the flow, not just a brighter band.
export default function DataFlowSankey({ connectors, title }) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState(null);
  const activeId = hoveredId;
  const activeNode = useMemo(() => connectors.find((c) => c.id === activeId) || null, [connectors, activeId]);

  const { leftNodes, classifiedTotal, pendingTotal, totalVolume } = useMemo(() => {
    const ordered = [...connectors].sort((a, b) => {
      const ci = CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
      if (ci !== 0) return ci;
      return (b.metrics.objectsScanned || 0) - (a.metrics.objectsScanned || 0);
    });

    let classifiedTotal = 0;
    let pendingTotal = 0;
    const leftNodes = [];

    ordered.forEach((c, i) => {
      const volume = c.metrics.objectsScanned || 0;
      const color = CONNECTOR_PALETTE[i % CONNECTOR_PALETTE.length];
      let classifiedVol = 0;
      let pendingVol = 0;
      if (c.scanDepth !== 'metadata_only') {
        const pct = (c.metrics.classificationCompletenessPct ?? 0) / 100;
        classifiedVol = volume * pct;
        pendingVol = volume * (1 - pct);
        classifiedTotal += classifiedVol;
        pendingTotal += pendingVol;
      }
      leftNodes.push({ id: c.id, name: c.name, icon: c.icon, category: c.category, health: c.health, scanDepth: c.scanDepth, volume, value: volume, color, classifiedVol, pendingVol });
    });

    const totalVolume = leftNodes.reduce((acc, n) => acc + n.volume, 0);
    return { leftNodes, classifiedTotal, pendingTotal, totalVolume };
  }, [connectors]);

  // Extra top margin for column subtitles that live *above* the bars,
  // clear of the ribbon area — that's what keeps them legible now that
  // ribbons are saturated at rest instead of needing hover to read.
  const bandTop = 64;
  const bandHeight = 390;
  const barW = 16;

  // Source/Classification-Index labels get a reserved margin outside the
  // ribbon flow (left of source bars, right of index bars). Middle-column
  // bars have ribbons on both sides, so their labels move to the header
  // zone above instead of beside them. Generous gutters between columns
  // give the ribbon curves long travel — what makes them read as smooth
  // rather than boxy.
  const labelZoneW = 185;
  const srcX = labelZoneW;
  const discX = srcX + barW + 130;
  const metaX = discX + barW + 140;
  const clsX = metaX + barW + 140;
  const idxX = clsX + barW + 150;
  const viewW = idxX + barW + 260;

  const leftBands = useMemo(
    () => stackBands(leftNodes, bandHeight, 8, 18).map((b) => ({ ...b, y0: b.y0 + bandTop, y1: b.y1 + bandTop })),
    [leftNodes]
  );

  const fullScanBands = leftBands.filter((b) => b.scanDepth !== 'metadata_only');
  const clsY0 = fullScanBands.length ? Math.min(...fullScanBands.map((b) => b.y0)) : bandTop;
  const clsY1 = fullScanBands.length ? Math.max(...fullScanBands.map((b) => b.y1)) : bandTop;
  const clsH = clsY1 - clsY0;

  // Each connector's Classified/Pending fork width is derived directly from
  // its own trunk height (b.h * its classified/pending share), not from a
  // second, independently-proportioned stack — so the two branches always
  // sum back to exactly the trunk width instead of drifting from it.
  const classifiedSub = useMemo(() => {
    let y = clsY0;
    const gap = 2;
    return fullScanBands.map((b) => {
      const h = b.volume > 0 ? b.h * (b.classifiedVol / b.volume) : 0;
      const seg = { id: b.id, color: b.color, y0: y, y1: y + h, h };
      y += h + gap;
      return seg;
    });
  }, [fullScanBands, clsY0]);

  const classifiedEndY = classifiedSub.length ? classifiedSub[classifiedSub.length - 1].y1 : clsY0;

  const pendingSub = useMemo(() => {
    let y = classifiedEndY + 14;
    const gap = 2;
    return fullScanBands.map((b) => {
      const h = b.volume > 0 ? b.h * (b.pendingVol / b.volume) : 0;
      const seg = { id: b.id, color: b.color, y0: y, y1: y + h, h };
      y += h + gap;
      return seg;
    });
  }, [fullScanBands, classifiedEndY]);

  const classifiedBand = classifiedSub.length
    ? { label: 'Classified', color: '#1a7f37', y0: classifiedSub[0].y0, y1: classifiedSub[classifiedSub.length - 1].y1, value: classifiedTotal }
    : null;
  const pendingBand = pendingSub.length
    ? { label: 'Pending classification', color: '#9a6700', y0: pendingSub[0].y0, y1: pendingSub[pendingSub.length - 1].y1, value: pendingTotal }
    : null;
  const outcomeBands = [classifiedBand, pendingBand].filter(Boolean).map((b) => ({ ...b, h: b.y1 - b.y0 }));

  if (totalVolume === 0) {
    return (
      <div className="border border-[#d0d7de] rounded-lg bg-[#f6f8fa] p-3">
        <p className="text-xs text-[#6e7781] py-8 text-center">No scan volume recorded yet.</p>
      </div>
    );
  }

  const nodeOpacity = (connectorId) => (activeId == null || activeId === connectorId ? 1 : 0.3);
  // Every connector's flow is a single traced line, always on — not a
  // filled band that switches to a line on hover. Hover just dims the
  // others and brings the traced one to full strength.
  const lineOpacity = (connectorId) => (activeId == null ? 0.8 : activeId === connectorId ? 0.95 : 0.12);
  const lineHandlers = (connectorId) => ({
    onMouseEnter: () => setHoveredId(connectorId),
    onMouseLeave: () => setHoveredId(null),
    onClick: () => navigate(`/connector/${connectorId}`),
    style: { cursor: 'pointer', transition: 'opacity 120ms ease' },
  });

  return (
    <div className="border border-[#d0d7de] rounded-lg bg-[#f6f8fa] p-3">
      <div className="flex items-start justify-between mb-2 gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1f2328]">{title || 'DataAI Command Graph'}</p>
          <p className="text-[10px] text-[#6e7781]">Unified data intelligence layer across every connected source</p>
        </div>
        <div className="text-right">
          {activeNode ? (
            <p className="text-[11px] text-[#1f2328]">
              <span className="mr-1">{activeNode.icon}</span>
              <span className="font-semibold">{activeNode.name}</span>
              <span className="text-[#6e7781]"> · {activeNode.category} · {formatCount(activeNode.metrics.objectsScanned || 0)} objects
                {activeNode.health !== 'healthy' && <span style={{ color: HEALTH_COLOR[activeNode.health] }}> · {activeNode.health}</span>}
              </span>
            </p>
          ) : (
            <p className="text-[10px] text-[#6e7781]">Hover to trace a connector's flow · click for details</p>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${viewW} 490`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <ColumnHeader x0={0} x1={srcX} y={16}>Source</ColumnHeader>
        <ColumnHeader x0={discX} x1={discX + barW} y={16}>Data Discovery</ColumnHeader>
        <ColumnHeader x0={metaX} x1={metaX + barW} y={16}>Metadata Index</ColumnHeader>
        <ColumnHeader x0={clsX} x1={clsX + barW} y={16}>Classification</ColumnHeader>
        <ColumnHeader x0={idxX} x1={idxX + barW} y={16}>Classification Index</ColumnHeader>

        {/* middle-column subtitles live in the header zone, clear of the ribbon flow */}
        <text x={discX + barW / 2} y={34} fontSize="9" fill="#6e7781" textAnchor="middle">Collect · Catalog</text>
        <text x={metaX + barW / 2} y={34} fontSize="9" fill="#6e7781" textAnchor="middle">100% of connectors</text>
        <text x={metaX + barW / 2} y={47} fontSize="9" fill="#6e7781" textAnchor="middle">{formatCount(totalVolume)} objects</text>
        <text x={clsX + barW / 2} y={34} fontSize="9" fill="#6e7781" textAnchor="middle">Scan · Classify</text>

        {/* data discovery engine — thin bar, name lives in the column header above */}
        <rect x={discX} y={bandTop} width={barW} height={bandHeight} rx="4" fill="#8250df" opacity="0.85" />

        {/* metadata index store — 100% of volume rests here */}
        <rect x={metaX} y={bandTop} width={barW} height={bandHeight} rx="4" fill="#57606a" opacity="0.7" />

        {/* classification engine — only content-eligible connectors reach here */}
        <rect x={clsX} y={clsY0} width={barW} height={clsH} rx="4" fill="#1a7f37" opacity="0.8" />

        {/* classification index store: Classified / Pending */}
        {outcomeBands.map((b) => (
          <g key={`right-${b.label}`} opacity={activeId == null || (b.label === 'Classified' ? classifiedSub : pendingSub).some((s) => s.id === activeId) ? 1 : 0.3} style={{ transition: 'opacity 120ms ease' }}>
            <rect x={idxX} y={b.y0} width={barW} height={b.h} rx="4" fill={b.color} opacity="0.85" />
            <text x={idxX + barW + 10} y={b.y0 + b.h / 2 - 6} fontSize="12" fontWeight="700" fill={b.color}>{b.label}</text>
            <text x={idxX + barW + 10} y={b.y0 + b.h / 2 + 10} fontSize="10" fill="#57606a">
              {formatCount(b.value)} objects · {Math.round((b.value / totalVolume) * 100)}%
            </text>
          </g>
        ))}

        {/* every connector's flow, always on — a single line per connector
            (not a filled band that becomes a line on hover). Straight from
            source through Classification (same y throughout, since nothing
            reorders until the split), then forks along smooth curves into
            Classified/Pending right at the Classification block's edge.
            Stroke width matches the band height at each segment, so it
            carries the same volume-proportional width a ribbon would. */}
        {leftBands.map((b) => {
          const isFullScan = b.scanDepth !== 'metadata_only';
          const clsSeg = classifiedSub.find((s) => s.id === b.id);
          const pndSeg = pendingSub.find((s) => s.id === b.id);
          const midY = (b.y0 + b.y1) / 2;
          return (
            <g key={`trace-${b.id}`} opacity={lineOpacity(b.id)} {...lineHandlers(b.id)}>
              <path
                d={`M${srcX + barW},${midY} L${isFullScan ? clsX + barW : metaX + barW},${midY}`}
                stroke={b.color} strokeWidth={b.h} fill="none" strokeLinecap="butt"
              />
              {isFullScan && clsSeg && (
                <path
                  d={curveLine(clsX + barW, midY, idxX, (clsSeg.y0 + clsSeg.y1) / 2)}
                  stroke={b.color} strokeWidth={clsSeg.h} fill="none" strokeLinecap="butt"
                />
              )}
              {isFullScan && pndSeg && (
                <path
                  d={curveLine(clsX + barW, midY, idxX, (pndSeg.y0 + pndSeg.y1) / 2)}
                  stroke={b.color} strokeWidth={pndSeg.h} fill="none" strokeLinecap="butt"
                />
              )}
            </g>
          );
        })}

        {/* source nodes: thin bar + label outside, one per connector */}
        {leftBands.map((b) => {
          const unhealthy = b.health !== 'healthy';
          const midY = (b.y0 + b.y1) / 2;
          return (
            <g
              key={`left-${b.id}`}
              opacity={nodeOpacity(b.id)}
              style={{ cursor: 'pointer', transition: 'opacity 120ms ease' }}
              onMouseEnter={() => setHoveredId(b.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => navigate(`/connector/${b.id}`)}
            >
              <rect
                x={srcX} y={b.y0} width={barW} height={b.h} rx="3"
                fill={unhealthy ? HEALTH_COLOR[b.health] : b.color}
                opacity={activeId === b.id ? 1 : 0.9}
                stroke={unhealthy ? HEALTH_COLOR[b.health] : b.color}
                strokeOpacity={activeId === b.id ? 1 : 0}
                strokeWidth={2}
              />
              <text x={srcX - 10} y={midY - 2} fontSize="11" fontWeight="600" fill="#1f2328" textAnchor="end">{b.icon} {b.name}</text>
              <text x={srcX - 10} y={midY + 11} fontSize="9" fill="#6e7781" textAnchor="end">
                {formatCount(b.volume)} · {Math.round((b.volume / totalVolume) * 100)}%
                {unhealthy && <tspan fill={HEALTH_COLOR[b.health]}> ⚠ {b.health}</tspan>}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-3 mt-1 text-[10px] text-[#6e7781] flex-wrap">
        <span>Metadata-only connectors (e.g. identity systems) have no ribbon past the Metadata Index — no classification stage for them</span>
        <span>&middot;</span>
        <span className="flex items-center gap-1"><span style={{ color: HEALTH_COLOR.degraded }}>⚠</span> Degraded</span>
        <span className="flex items-center gap-1"><span style={{ color: HEALTH_COLOR.down }}>⚠</span> Down</span>
      </div>
    </div>
  );
}
