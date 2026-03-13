import { useState, useCallback } from 'react';
import type { FAFSAData, EligibilityResult, AppStep } from './types';
import { determineEligibility } from './eligibility';
import { generateGuidance } from './llm';
import { DataInput } from './components/DataInput';
import { DataReview } from './components/DataReview';
import { Results } from './components/Results';

function App() {
  const [step, setStep] = useState<AppStep>('input');
  const [fafsaData, setFafsaData] = useState<FAFSAData | null>(null);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [llmGuidance, setLlmGuidance] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('navvy-gemini-key') || '';
    } catch {
      return '';
    }
  });

  const handleApiKeyChange = useCallback((key: string) => {
    setApiKey(key);
    try {
      localStorage.setItem('navvy-gemini-key', key);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const handleDataSubmit = useCallback((data: FAFSAData) => {
    setFafsaData(data);
    setStep('review');
  }, []);

  const handleConfirmData = useCallback(async () => {
    if (!fafsaData) return;

    setIsLoading(true);
    setStep('results');

    // Step 1: Deterministic eligibility check
    const result = determineEligibility(fafsaData);
    setEligibilityResult(result);

    // Step 2: LLM-generated guidance (non-blocking -- shows results immediately)
    const guidance = await generateGuidance(fafsaData, result, apiKey);
    setLlmGuidance(guidance);

    setIsLoading(false);
  }, [fafsaData, apiKey]);

  const handleStartOver = useCallback(() => {
    setStep('input');
    setFafsaData(null);
    setEligibilityResult(null);
    setLlmGuidance('');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">SNAP Navigator</h1>
          </div>
          <div className="text-sm text-slate-500">
            PA Benefits Screener
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex">
            {(['input', 'review', 'results'] as AppStep[]).map((s, i) => (
              <div key={s} className="flex-1 flex items-center">
                <div className={`flex items-center gap-2 py-3 text-sm font-medium ${
                  step === s ? 'text-emerald-700' : i < ['input', 'review', 'results'].indexOf(step) ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s ? 'bg-emerald-600 text-white' : i < ['input', 'review', 'results'].indexOf(step) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'
                  }`}>{i + 1}</span>
                  <span className="hidden sm:inline">{s === 'input' ? 'Your Info' : s === 'review' ? 'Review' : 'Results'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {step === 'input' && (
          <DataInput
            onSubmit={handleDataSubmit}
            apiKey={apiKey}
            onApiKeyChange={handleApiKeyChange}
          />
        )}

        {step === 'review' && fafsaData && (
          <DataReview
            data={fafsaData}
            onConfirm={handleConfirmData}
            onBack={() => setStep('input')}
          />
        )}

        {step === 'results' && fafsaData && (
          <Results
            data={fafsaData}
            result={eligibilityResult}
            guidance={llmGuidance}
            isLoading={isLoading}
            apiKey={apiKey}
            onStartOver={handleStartOver}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 text-center text-xs text-slate-400">
          <p>This is a screening tool, not an official eligibility determination.</p>
          <p className="mt-1">Your county assistance office makes the final decision. No personal data is stored or transmitted beyond the AI summary feature.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
