import { ShieldCheck, MapPin } from 'lucide-react';
import { sampleForConnector } from '../data/samples';
import { classificationFindingsForConnector, regulatoryFrameworksForFindings } from '../data/model';

const RISK_STYLES = {
  elevated: 'text-[#cf222e] border-red-500/30 bg-red-500/10',
  moderate: 'text-[#9a6700] border-amber-500/30 bg-amber-500/10',
  low: 'text-[#1a7f37] border-emerald-500/30 bg-emerald-500/10',
  minimal: 'text-[#57606a] border-[#d8dee4] bg-[#eaeef2]',
};

// Reads the connector's real classification history (accepted rules,
// persisted as "Classification rule added" lifecycle events) plus the AI
// Copilot's currently-proposed rule for anything not yet accepted, and
// interprets both in compliance terms — the same classification output
// AICopilotPanel already produces, just answering "so what does this mean"
// instead of stopping at "here's what we found."
export default function ComplianceRiskPanel({ connector, tenant, events }) {
  const historical = classificationFindingsForConnector(events, connector.id, tenant.id);
  const { suggestedRule } = sampleForConnector(connector.id);

  const findings = [...historical];
  const alreadyAccepted = historical.some((f) => f.label.toLowerCase() === suggestedRule.classification.toLowerCase());
  if (connector.scanDepth !== 'metadata_only' && suggestedRule.classification !== 'Unclassified' && !alreadyAccepted) {
    findings.push({ label: suggestedRule.classification, status: 'ai-proposed', policy: suggestedRule.policy });
  }

  const { frameworks, riskLevel } = regulatoryFrameworksForFindings(findings, tenant.region, connector.scanDepth, connector.health);

  const acceptedFinding = findings.find((f) => f.status === 'accepted');
  const proposedFinding = findings.find((f) => f.status === 'ai-proposed');

  return (
    <div className="border border-[#d0d7de] rounded-lg bg-[#f6f8fa] overflow-hidden">
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-[#d0d7de]">
        <ShieldCheck size={13} className="text-[#8250df]" />
        <p className="text-xs font-medium text-[#1f2328]">Compliance &amp; Risk</p>
        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border capitalize ${RISK_STYLES[riskLevel]}`}>
          {riskLevel} risk
        </span>
      </div>

      <div className="p-3 space-y-3">
        <div className="flex items-center gap-1.5 text-[11px] text-[#57606a]">
          <MapPin size={11} /> Data residency:{' '}
          <span className="text-[#1f2328] font-medium">{tenant.region}</span>
        </div>

        <div>
          <p className="text-[10px] text-[#57606a] uppercase tracking-wider mb-1.5">Classification findings</p>
          {findings.length === 0 ? (
            <p className="text-[11px] text-[#57606a]">No sensitive data classified for this connector yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {findings.map((f) => (
                <span
                  key={f.label + f.status}
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${
                    f.status === 'accepted'
                      ? 'bg-emerald-500/10 text-[#1a7f37] border-emerald-500/30'
                      : 'bg-purple-500/10 text-[#8250df] border-purple-500/30'
                  }`}
                >
                  {f.label}{f.status === 'ai-proposed' && ' · AI-proposed'}
                </span>
              ))}
            </div>
          )}
        </div>

        {frameworks.length > 0 && (
          <div>
            <p className="text-[10px] text-[#57606a] uppercase tracking-wider mb-1.5">Regulatory frameworks triggered</p>
            <div className="flex flex-wrap gap-1.5">
              {frameworks.map((f) => (
                <span
                  key={f.framework}
                  title={`Triggered by: ${f.reasons.join(', ')}`}
                  className="text-[10px] px-1.5 py-0.5 rounded border bg-[#eaeef2] text-[#1f2328] border-[#d8dee4]"
                >
                  {f.framework}
                </span>
              ))}
            </div>
          </div>
        )}

        {(acceptedFinding || proposedFinding) && (
          <div>
            <p className="text-[10px] text-[#57606a] uppercase tracking-wider mb-1">
              {acceptedFinding ? 'Active handling policy' : 'Proposed handling policy'}
            </p>
            <p className="text-[11px] text-[#1f2328] font-mono">{suggestedRule.policy}</p>
          </div>
        )}
      </div>
    </div>
  );
}
