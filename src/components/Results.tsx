import { useState, useCallback } from 'react';
import type { FAFSAData, EligibilityResult } from '../types';
import { determineEligibility } from '../eligibility';
import { generateWhatIf } from '../llm';

interface ResultsProps {
  data: FAFSAData;
  result: EligibilityResult | null;
  guidance: string;
  isLoading: boolean;
  apiKey: string;
  onStartOver: () => void;
}

const STATUS_CONFIG = {
  'likely-eligible': {
    label: 'Likely Eligible',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
    badge: 'bg-emerald-600',
    icon: '\u2713',
  },
  'likely-ineligible': {
    label: 'Likely Not Eligible',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    badge: 'bg-red-500',
    icon: '\u2717',
  },
  'needs-review': {
    label: 'Needs Further Review',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    badge: 'bg-amber-500',
    icon: '?',
  },
};

interface WhatIfScenario {
  id: string;
  label: string;
  description: string;
  apply: (data: FAFSAData) => FAFSAData;
  relevant: (data: FAFSAData, result: EligibilityResult) => boolean;
}

const SCENARIOS: WhatIfScenario[] = [
  {
    id: 'work-study',
    label: 'I get work-study',
    description: 'you became eligible for federal work-study',
    apply: (d) => ({ ...d, workStudyEligible: true, workStudyAmount: 3000 }),
    relevant: (d) => !d.workStudyEligible,
  },
  {
    id: 'work-20hrs',
    label: 'I work 20+ hrs/week',
    description: 'you started working at least 20 hours per week',
    apply: (d) => ({ ...d, currentWorkHoursPerWeek: 20 }),
    relevant: (d) => d.currentWorkHoursPerWeek < 20,
  },
  {
    id: 'half-time',
    label: 'I drop to half-time',
    description: 'you enrolled half-time instead of full-time',
    apply: (d) => ({ ...d, enrollmentStatus: 'half-time' as const }),
    relevant: (d) => d.enrollmentStatus === 'full-time',
  },
  {
    id: 'less-than-half',
    label: 'I drop below half-time',
    description: 'you enrolled less than half-time',
    apply: (d) => ({ ...d, enrollmentStatus: 'less-than-half-time' as const }),
    relevant: (d) => d.enrollmentStatus !== 'less-than-half-time',
  },
];

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n## (.*)/g, '<h3 class="text-base font-semibold text-slate-900 mt-4 mb-2">$1</h3>')
    .replace(/\n### (.*)/g, '<h4 class="text-sm font-semibold text-slate-700 mt-3 mb-1">$1</h4>')
    .replace(/\n(\d+)\. /g, '<br/><span class="font-medium text-emerald-700">$1.</span> ')
    .replace(/\n- /g, '<br/>&bull; ')
    .replace(/\n---\n/g, '<hr class="my-3 border-slate-200"/>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export function Results({ data, result, guidance, isLoading, apiKey, onStartOver }: ResultsProps) {
  const [whatIfResult, setWhatIfResult] = useState<string | null>(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const handleWhatIf = useCallback(async (scenario: WhatIfScenario) => {
    if (!result || !data) return;
    setWhatIfLoading(true);
    setActiveScenario(scenario.id);
    setWhatIfResult(null);

    const modifiedData = scenario.apply(data);
    const newResult = determineEligibility(modifiedData);
    const explanation = await generateWhatIf(data, result, newResult, scenario.description, apiKey);
    setWhatIfResult(explanation);
    setWhatIfLoading(false);
  }, [data, result, apiKey]);

  const toggleStep = (index: number) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full" />
        <p className="text-slate-500 mt-4 text-sm">Running eligibility screening...</p>
      </div>
    );
  }

  const config = STATUS_CONFIG[result.status];
  const relevantScenarios = SCENARIOS.filter(s => s.relevant(data, result));

  return (
    <div className="space-y-6">
      {/* Status badge */}
      <div className={`rounded-xl border-2 ${config.border} ${config.bg} p-6 text-center`}>
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${config.badge} text-white text-xl font-bold mb-3`}>
          {config.icon}
        </div>
        <h2 className={`text-2xl font-bold ${config.text}`}>{config.label}</h2>
        <p className="text-sm text-slate-600 mt-2">Based on your FAFSA data for PA SNAP</p>
      </div>

      {/* Key factors */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-3">Key Factors</h3>
        <ul className="space-y-2">
          {result.reasons.map((reason, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-700">
              <span className="text-slate-400 mt-0.5 shrink-0">&bull;</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
        {result.warnings.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs font-semibold text-amber-700 mb-1">Important Notes</p>
            {result.warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-600 mt-1">{w}</p>
            ))}
          </div>
        )}
      </div>

      {/* Income breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-3">Income Breakdown</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500">Gross Monthly Income (est.)</span>
              <span className="font-medium text-slate-900">${result.incomeTest.grossMonthlyIncome.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${result.incomeTest.passesGross ? 'bg-emerald-500' : 'bg-red-400'}`}
                style={{ width: `${Math.min(100, (result.incomeTest.grossMonthlyIncome / result.incomeTest.grossIncomeLimit) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Limit: ${result.incomeTest.grossIncomeLimit.toLocaleString()}/mo for household of {data.householdSize}
            </p>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500">Net Monthly Income (est.)</span>
              <span className="font-medium text-slate-900">${result.incomeTest.netMonthlyIncome.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${result.incomeTest.passesNet ? 'bg-emerald-500' : 'bg-red-400'}`}
                style={{ width: `${Math.min(100, (result.incomeTest.netMonthlyIncome / result.incomeTest.netIncomeLimit) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Limit: ${result.incomeTest.netIncomeLimit.toLocaleString()}/mo (after standard deductions)
            </p>
          </div>
        </div>
      </div>

      {/* AI Guidance */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-base font-semibold text-slate-900">Your Personalized Guide</h3>
          {apiKey && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">AI-powered</span>}
        </div>
        {isLoading ? (
          <div className="flex items-center gap-3 py-4">
            <div className="animate-spin w-5 h-5 border-2 border-emerald-200 border-t-emerald-600 rounded-full" />
            <span className="text-sm text-slate-500">Generating personalized guidance...</span>
          </div>
        ) : (
          <div
            className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(guidance) }}
          />
        )}
      </div>

      {/* Next steps checklist */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-3">Your Action Checklist</h3>
        <ul className="space-y-2">
          {result.nextSteps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <button
                onClick={() => toggleStep(i)}
                className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  checkedSteps.has(i)
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-slate-300 hover:border-emerald-400'
                }`}
                aria-label={`Mark step ${i + 1} as ${checkedSteps.has(i) ? 'incomplete' : 'complete'}`}
              >
                {checkedSteps.has(i) && <span className="text-xs">{'\u2713'}</span>}
              </button>
              <span className={`text-sm ${checkedSteps.has(i) ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {step}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* What-If Scenarios */}
      {relevantScenarios.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-2">What If...?</h3>
          <p className="text-sm text-slate-500 mb-4">
            Explore how changes to your situation could affect your eligibility.
          </p>
          <div className="flex flex-wrap gap-2 mb-4">
            {relevantScenarios.map(scenario => (
              <button
                key={scenario.id}
                onClick={() => handleWhatIf(scenario)}
                disabled={whatIfLoading}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeScenario === scenario.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                } ${whatIfLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {scenario.label}
              </button>
            ))}
          </div>
          {whatIfLoading && (
            <div className="flex items-center gap-3 py-3">
              <div className="animate-spin w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full" />
              <span className="text-sm text-slate-500">Analyzing scenario...</span>
            </div>
          )}
          {whatIfResult && !whatIfLoading && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div
                className="text-sm text-blue-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(whatIfResult) }}
              />
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-slate-100 rounded-xl p-4 text-center">
        <p className="text-xs text-slate-500">
          <strong>Disclaimer:</strong> This screening tool provides a preliminary assessment based on publicly available PA SNAP eligibility rules and your self-reported FAFSA data. It is NOT an official eligibility determination. Only your county assistance office can make an official determination. AI-generated guidance is for informational purposes only and should not be relied upon as legal or financial advice.
        </p>
      </div>

      <button
        onClick={onStartOver}
        className="w-full py-3 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
      >
        Start Over
      </button>
    </div>
  );
}
