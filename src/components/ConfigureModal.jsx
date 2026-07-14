import { useEffect, useRef, useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { AUTH_PATTERNS } from '../data/model';

const STEPS = ['Authenticate', 'Scope', 'Review & Add'];

function AuthStep({ authPattern, value, onChange }) {
  const meta = AUTH_PATTERNS[authPattern];

  if (authPattern === 'oauth2') {
    return (
      <div className="space-y-2">
        <p className="text-xs text-[#57606a]">{meta.hint}</p>
        <button
          onClick={() => onChange({ connected: true })}
          className={`w-full text-sm px-3 py-2.5 rounded-lg border transition-colors ${
            value.connected
              ? 'border-emerald-500/40 bg-emerald-500/10 text-[#1a7f37]'
              : 'border-cyan-500/40 bg-cyan-500/10 text-[#0969da] hover:bg-cyan-500/20'
          }`}
        >
          {value.connected ? '✓ Connected via OAuth' : 'Connect with OAuth 2.0'}
        </button>
      </div>
    );
  }

  if (authPattern === 'certificate') {
    return (
      <div className="space-y-2">
        <p className="text-xs text-[#57606a]">{meta.hint}</p>
        <button
          onClick={() => onChange({ connected: true })}
          className={`w-full text-sm px-3 py-2.5 rounded-lg border transition-colors ${
            value.connected
              ? 'border-emerald-500/40 bg-emerald-500/10 text-[#1a7f37]'
              : 'border-cyan-500/40 bg-cyan-500/10 text-[#0969da] hover:bg-cyan-500/20'
          }`}
        >
          {value.connected ? '✓ Certificate uploaded' : 'Upload mTLS certificate'}
        </button>
      </div>
    );
  }

  const label = authPattern === 'api_key' ? 'API key' : 'Service account role ARN';
  const placeholder = authPattern === 'api_key' ? 'sk_live_••••••••••••' : 'arn:aws:iam::••••••••:role/scan-role';
  return (
    <div className="space-y-2">
      <p className="text-xs text-[#57606a]">{meta.hint}</p>
      <label className="block text-[10px] text-[#6e7781] uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={value.credential || ''}
        onChange={(e) => onChange({ credential: e.target.value })}
        placeholder={placeholder}
        className="w-full text-sm bg-[#ffffff] border border-[#d0d7de] rounded-lg px-3 py-2 text-[#1f2328] focus:outline-none focus:border-cyan-500/50 font-mono"
      />
    </div>
  );
}

function ScopeStep({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] text-[#6e7781] uppercase tracking-wider mb-1">Scan scope</label>
        <input
          type="text"
          value={value.scope || ''}
          onChange={(e) => onChange({ ...value, scope: e.target.value })}
          placeholder="e.g. all-buckets, /Finance/**, workspace:acme"
          className="w-full text-sm bg-[#ffffff] border border-[#d0d7de] rounded-lg px-3 py-2 text-[#1f2328] focus:outline-none focus:border-cyan-500/50 font-mono"
        />
      </div>
      <div>
        <label className="block text-[10px] text-[#6e7781] uppercase tracking-wider mb-1">Scan frequency</label>
        <select
          value={value.frequency || 'daily'}
          onChange={(e) => onChange({ ...value, frequency: e.target.value })}
          className="w-full text-sm bg-[#ffffff] border border-[#d0d7de] rounded-lg px-3 py-2 text-[#1f2328] focus:outline-none focus:border-cyan-500/50"
        >
          <option value="hourly">Hourly (incremental)</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>
      <p className="text-[10px] text-[#6e7781]">Least-privilege scope only — the connector cannot read outside what's listed here.</p>
    </div>
  );
}

function ReviewStep({ submission, auth, scope, status, elapsed, result }) {
  return (
    <div className="space-y-3">
      {status === 'idle' && (
        <div className="text-xs space-y-1.5">
          <div className="flex justify-between"><span className="text-[#6e7781]">Connector</span><span className="text-[#1f2328]">{submission.name}</span></div>
          <div className="flex justify-between"><span className="text-[#6e7781]">Auth</span><span className="text-[#1f2328]">{AUTH_PATTERNS[submission.authPattern].label} {auth.connected ? '· connected' : auth.credential ? '· credential set' : ''}</span></div>
          <div className="flex justify-between"><span className="text-[#6e7781]">Scope</span><span className="text-[#1f2328] font-mono">{scope.scope || '(none)'}</span></div>
          <div className="flex justify-between"><span className="text-[#6e7781]">Frequency</span><span className="text-[#1f2328]">{scope.frequency || 'daily'}</span></div>
        </div>
      )}
      {status !== 'idle' && status !== 'done' && (
        <div className="flex items-center gap-2 text-xs text-[#9a6700]">
          <Loader2 size={13} className="animate-spin" />
          {status === 'validating' && 'Validating credentials…'}
          {status === 'scanning' && `Running first scan… ${elapsed}s`}
        </div>
      )}
      {status === 'done' && (
        <div className="text-xs text-[#1a7f37] flex items-center gap-2">
          <Check size={13} />
          Scan succeeded in {elapsed}s — {result.objectsScanned.toLocaleString()} objects scanned, {result.classificationCompletenessPct}% classified
        </div>
      )}
    </div>
  );
}

export default function ConfigureModal({ submission, onClose, onInstalled }) {
  const [step, setStep] = useState(0);
  const [auth, setAuth] = useState({});
  const [scope, setScope] = useState({ frequency: 'daily' });
  const [status, setStatus] = useState('idle'); // idle | validating | scanning | done
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const authValid = submission.authPattern === 'oauth2' || submission.authPattern === 'certificate'
    ? !!auth.connected
    : !!auth.credential;

  function runInstall() {
    setStatus('validating');
    setTimeout(() => {
      setStatus('scanning');
      const start = Date.now();
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 200);
      setTimeout(() => {
        clearInterval(intervalRef.current);
        const finalResult = {
          objectsScanned: Math.floor(1000 + Math.random() * 20000),
          classificationCompletenessPct: Math.floor(70 + Math.random() * 25),
        };
        setResult(finalResult);
        setStatus('done');
      }, 2200);
    }, 900);
  }

  function handleDone() {
    const connector = onInstalled(submission, {
      timeToFirstScanMinutes: +(Math.max(elapsed, 1) / 60).toFixed(2),
      classificationCompletenessPct: result.classificationCompletenessPct,
      objectsScanned: result.objectsScanned,
    });
    onClose(connector);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-[#ffffff] border border-[#d0d7de] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#d0d7de]">
          <span className="text-lg">{submission.icon}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#1f2328]">Add {submission.name}</p>
            <p className="text-[10px] text-[#6e7781]">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>
          </div>
          <button onClick={() => onClose(null)} className="text-[#6e7781] hover:text-[#1f2328]">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4">
          {step === 0 && <AuthStep authPattern={submission.authPattern} value={auth} onChange={(v) => setAuth((p) => ({ ...p, ...v }))} />}
          {step === 1 && <ScopeStep value={scope} onChange={setScope} />}
          {step === 2 && <ReviewStep submission={submission} auth={auth} scope={scope} status={status} elapsed={elapsed} result={result} />}
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-[#d0d7de]">
          {step > 0 && status === 'idle' && (
            <button onClick={() => setStep((s) => s - 1)} className="text-xs px-3 py-1.5 rounded-md border border-[#d8dee4] text-[#57606a] hover:border-[#6e7781]">
              Back
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {step < 2 && (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 0 && !authValid}
                className="text-xs px-3 py-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 text-[#0969da] hover:bg-cyan-500/20 disabled:opacity-30"
              >
                Next
              </button>
            )}
            {step === 2 && status === 'idle' && (
              <button
                onClick={runInstall}
                disabled={!scope.scope}
                className="text-xs px-3 py-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-[#1a7f37] hover:bg-emerald-500/20 disabled:opacity-30"
              >
                Add connector
              </button>
            )}
            {step === 2 && status === 'done' && (
              <button onClick={handleDone} className="text-xs px-3 py-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-[#1a7f37] hover:bg-emerald-500/20">
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
