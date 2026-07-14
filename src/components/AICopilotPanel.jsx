import { useState } from 'react';
import { Sparkles, Play, Check, RotateCcw } from 'lucide-react';
import { sampleForConnector } from '../data/samples';
import { useData } from '../context/DataContext';

export default function AICopilotPanel({ connector }) {
  const { sample, suggestedRule } = sampleForConnector(connector.id);
  const { classificationRules, acceptClassificationRule } = useData();

  const existingRule = classificationRules.find((r) => r.connectorId === connector.id);

  const [expression, setExpression] = useState(existingRule?.expression ?? suggestedRule.expression);
  const [status, setStatus] = useState(existingRule ? 'accepted' : 'proposed'); // proposed | testing | tested | accepted
  const [testResult, setTestResult] = useState(null);

  function handleTest() {
    setStatus('testing');
    setTimeout(() => {
      setTestResult({ matched: true, output: suggestedRule.classification, latencyMs: 42 });
      setStatus('tested');
    }, 500);
  }

  function handleAccept() {
    acceptClassificationRule(connector.id, {
      expression,
      classification: suggestedRule.classification,
      confidence: suggestedRule.confidence,
    });
    setStatus('accepted');
  }

  function handleRegenerate() {
    setExpression(suggestedRule.expression);
    setStatus('proposed');
    setTestResult(null);
  }

  return (
    <div className="border border-[#d0d7de] rounded-lg bg-[#f6f8fa] overflow-hidden">
      <div className="px-3 py-2.5 flex items-center gap-2 border-b border-[#d0d7de]">
        <Sparkles size={13} className="text-[#8250df]" />
        <p className="text-xs font-medium text-[#1f2328]">AI Copilot — classification rule from sample</p>
        <span className="text-[10px] text-[#6e7781] ml-auto">
          {status === 'accepted' ? 'Applied to live scans' : 'Draft — not yet applied'}
        </span>
      </div>

      <div className="p-3 grid md:grid-cols-2 gap-3">
        {/* Sample input */}
        <div>
          <p className="text-[10px] text-[#6e7781] uppercase tracking-wider mb-1.5">Sample record</p>
          <pre className="text-[10px] text-[#57606a] bg-[#ffffff] border border-[#d0d7de] rounded p-2 overflow-x-auto leading-relaxed">
{JSON.stringify(sample, null, 2)}
          </pre>
        </div>

        {/* AI suggestion */}
        <div>
          <p className="text-[10px] text-[#6e7781] uppercase tracking-wider mb-1.5">
            AI-proposed classification · {Math.round(suggestedRule.confidence * 100)}% confidence
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-[#8250df] border border-purple-500/30">
              {suggestedRule.classification}
            </span>
            {suggestedRule.matchedPatterns.map((p) => (
              <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-[#eaeef2] text-[#57606a] border border-[#d8dee4]">
                {p}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-[#6e7781] mb-1">Policy: <span className="text-[#1f2328]">{suggestedRule.policy}</span></p>
        </div>
      </div>

      {/* Editable expression — dual view: visual chips above, raw expression here */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] text-[#6e7781] uppercase tracking-wider">Editable rule expression</p>
          <button onClick={handleRegenerate} className="text-[10px] text-[#6e7781] hover:text-[#0969da] flex items-center gap-1">
            <RotateCcw size={10} /> Reset to AI suggestion
          </button>
        </div>
        <textarea
          value={expression}
          onChange={(e) => { setExpression(e.target.value); setStatus('proposed'); setTestResult(null); }}
          rows={5}
          className="w-full text-[11px] font-mono bg-[#ffffff] border border-[#d0d7de] rounded p-2 text-[#1f2328] focus:outline-none focus:border-cyan-500/50"
        />

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleTest}
            disabled={status === 'testing'}
            className="text-[11px] px-2.5 py-1.5 rounded border border-[#d8dee4] bg-[#eaeef2] text-[#1f2328] hover:border-cyan-500/40 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play size={11} /> {status === 'testing' ? 'Running on sample…' : 'Test on sample'}
          </button>
          <button
            onClick={handleAccept}
            disabled={status !== 'tested'}
            className="text-[11px] px-2.5 py-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-[#1a7f37] hover:bg-emerald-500/20 flex items-center gap-1.5 disabled:opacity-30"
          >
            <Check size={11} /> Accept &amp; apply to live scans
          </button>
          {status === 'accepted' && (
            <span className="text-[11px] text-[#1a7f37]">✓ Rule applied — analyst jsuarez@meridianhealth.com</span>
          )}
        </div>

        {testResult && status !== 'accepted' && (
          <div className="mt-2 text-[11px] text-[#57606a] bg-[#ffffff] border border-[#d0d7de] rounded p-2">
            Test result: classified as <span className="text-[#8250df]">{testResult.output}</span> · {testResult.latencyMs}ms
          </div>
        )}
      </div>
    </div>
  );
}
