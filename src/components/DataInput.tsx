import { useState } from 'react';
import type { FAFSAData } from '../types';
import { sampleProfiles } from '../sampleProfiles';

interface DataInputProps {
  onSubmit: (data: FAFSAData) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

const defaultData: FAFSAData = {
  studentName: '',
  age: 20,
  isUSCitizenOrEligibleNoncitizen: true,
  adjustedGrossIncome: 0,
  parentAGI: null,
  untaxedIncome: 0,
  totalIncome: 0,
  studentAidIndex: 0,
  enrollmentStatus: 'full-time',
  enrollmentLevel: 'undergraduate',
  householdSize: 1,
  dependencyStatus: 'dependent',
  numberOfDependents: 0,
  hasChildUnder6: false,
  hasChild6to12: false,
  workStudyEligible: false,
  workStudyAmount: 0,
  currentWorkHoursPerWeek: 0,
  receivingTANF: false,
  receivingDisabilityBenefits: false,
  paResident: true,
};

export function DataInput({ onSubmit, apiKey, onApiKeyChange }: DataInputProps) {
  const [data, setData] = useState<FAFSAData>(defaultData);
  const [mode, setMode] = useState<'sample' | 'manual'>('sample');
  const [showApiKey, setShowApiKey] = useState(false);

  const update = <K extends keyof FAFSAData>(field: K, value: FAFSAData[K]) => {
    setData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'adjustedGrossIncome' || field === 'untaxedIncome'
        ? { totalIncome: (field === 'adjustedGrossIncome' ? value as number : prev.adjustedGrossIncome) + (field === 'untaxedIncome' ? value as number : prev.untaxedIncome) }
        : {}),
    }));
  };

  const handleSampleSelect = (profile: typeof sampleProfiles[0]) => {
    setData(profile.data);
  };

  const canSubmit = data.studentName.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Check Your SNAP Eligibility</h2>
        <p className="text-slate-600 text-sm mb-6">
          We'll use your FAFSA information to screen whether you may qualify for SNAP food assistance in Pennsylvania. Choose a sample profile to see how it works, or enter your own data.
        </p>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('sample')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'sample' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Use Sample Profile
          </button>
          <button
            onClick={() => { setMode('manual'); setData(defaultData); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'manual' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Enter My Info
          </button>
        </div>

        {mode === 'sample' ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 mb-3">Select a student profile to see how the screener works:</p>
            {sampleProfiles.map((profile) => (
              <button
                key={profile.name}
                onClick={() => handleSampleSelect(profile)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  data.studentName === profile.data.studentName
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-medium text-slate-900">{profile.name}</div>
                <div className="text-sm text-slate-500 mt-1">{profile.description}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Personal Info */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700 mb-3">Personal Information</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="studentName" className="block text-sm text-slate-600 mb-1">Full Name</label>
                  <input
                    id="studentName"
                    type="text"
                    value={data.studentName}
                    onChange={e => update('studentName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="age" className="block text-sm text-slate-600 mb-1">Age</label>
                  <input
                    id="age"
                    type="number"
                    value={data.age}
                    onChange={e => update('age', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min={16}
                    max={99}
                  />
                </div>
                <div>
                  <label htmlFor="householdSize" className="block text-sm text-slate-600 mb-1">Household Size</label>
                  <input
                    id="householdSize"
                    type="number"
                    value={data.householdSize}
                    onChange={e => update('householdSize', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min={1}
                    max={20}
                  />
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input
                    id="paResident"
                    type="checkbox"
                    checked={data.paResident}
                    onChange={e => update('paResident', e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="paResident" className="text-sm text-slate-600">Pennsylvania resident</label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="citizen"
                    type="checkbox"
                    checked={data.isUSCitizenOrEligibleNoncitizen}
                    onChange={e => update('isUSCitizenOrEligibleNoncitizen', e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="citizen" className="text-sm text-slate-600">U.S. citizen or eligible noncitizen</label>
                </div>
              </div>
            </fieldset>

            {/* Enrollment */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700 mb-3">Enrollment</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="enrollmentStatus" className="block text-sm text-slate-600 mb-1">Enrollment Status</label>
                  <select
                    id="enrollmentStatus"
                    value={data.enrollmentStatus}
                    onChange={e => update('enrollmentStatus', e.target.value as FAFSAData['enrollmentStatus'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="half-time">Half-time</option>
                    <option value="less-than-half-time">Less than half-time</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="enrollmentLevel" className="block text-sm text-slate-600 mb-1">Level</label>
                  <select
                    id="enrollmentLevel"
                    value={data.enrollmentLevel}
                    onChange={e => update('enrollmentLevel', e.target.value as FAFSAData['enrollmentLevel'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="undergraduate">Undergraduate</option>
                    <option value="graduate">Graduate</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dependencyStatus" className="block text-sm text-slate-600 mb-1">FAFSA Dependency</label>
                  <select
                    id="dependencyStatus"
                    value={data.dependencyStatus}
                    onChange={e => update('dependencyStatus', e.target.value as FAFSAData['dependencyStatus'])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="dependent">Dependent</option>
                    <option value="independent">Independent</option>
                  </select>
                </div>
              </div>
            </fieldset>

            {/* Financial */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700 mb-3">Financial Information (from FAFSA)</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="agi" className="block text-sm text-slate-600 mb-1">Your Adjusted Gross Income (annual)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                    <input
                      id="agi"
                      type="number"
                      value={data.adjustedGrossIncome}
                      onChange={e => update('adjustedGrossIncome', parseInt(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      min={0}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="untaxedIncome" className="block text-sm text-slate-600 mb-1">Untaxed Income (annual)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                    <input
                      id="untaxedIncome"
                      type="number"
                      value={data.untaxedIncome}
                      onChange={e => update('untaxedIncome', parseInt(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      min={0}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="sai" className="block text-sm text-slate-600 mb-1">Student Aid Index (SAI)</label>
                  <input
                    id="sai"
                    type="number"
                    value={data.studentAidIndex}
                    onChange={e => update('studentAidIndex', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>
            </fieldset>

            {/* Work & Benefits */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700 mb-3">Work & Benefits</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="workHours" className="block text-sm text-slate-600 mb-1">Current Work Hours/Week</label>
                  <input
                    id="workHours"
                    type="number"
                    value={data.currentWorkHoursPerWeek}
                    onChange={e => update('currentWorkHoursPerWeek', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min={0}
                    max={80}
                  />
                </div>
                <div>
                  <label htmlFor="workStudyAmount" className="block text-sm text-slate-600 mb-1">Work-Study Award Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                    <input
                      id="workStudyAmount"
                      type="number"
                      value={data.workStudyAmount}
                      onChange={e => {
                        const amt = parseInt(e.target.value) || 0;
                        setData(prev => ({ ...prev, workStudyAmount: amt, workStudyEligible: amt > 0 }));
                      }}
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      min={0}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">From your financial aid award letter. Enter 0 if none.</p>
                </div>
                <div className="space-y-3 col-span-full">
                  <div className="flex items-center gap-3">
                    <input
                      id="workStudy"
                      type="checkbox"
                      checked={data.workStudyEligible}
                      onChange={e => update('workStudyEligible', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="workStudy" className="text-sm text-slate-600">Approved for federal/state work-study</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="tanf"
                      type="checkbox"
                      checked={data.receivingTANF}
                      onChange={e => update('receivingTANF', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="tanf" className="text-sm text-slate-600">Receiving TANF (cash assistance)</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="disability"
                      type="checkbox"
                      checked={data.receivingDisabilityBenefits}
                      onChange={e => update('receivingDisabilityBenefits', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="disability" className="text-sm text-slate-600">Receiving disability benefits (SSI, SSDI)</label>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Dependents */}
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700 mb-3">Dependents</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="numDependents" className="block text-sm text-slate-600 mb-1">Number of dependents you support</label>
                  <input
                    id="numDependents"
                    type="number"
                    value={data.numberOfDependents}
                    onChange={e => update('numberOfDependents', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min={0}
                    max={10}
                  />
                </div>
                <div className="space-y-3 pt-5">
                  <div className="flex items-center gap-3">
                    <input
                      id="childUnder6"
                      type="checkbox"
                      checked={data.hasChildUnder6}
                      onChange={e => update('hasChildUnder6', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="childUnder6" className="text-sm text-slate-600">Have a child under 6</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="child6to12"
                      type="checkbox"
                      checked={data.hasChild6to12}
                      onChange={e => update('hasChild6to12', e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor="child6to12" className="text-sm text-slate-600">Have a child ages 6-12</label>
                  </div>
                </div>
              </div>
            </fieldset>
          </div>
        )}
      </div>

      {/* API Key (collapsible) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <button
          onClick={() => setShowApiKey(!showApiKey)}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <span className={`transition-transform ${showApiKey ? 'rotate-90' : ''}`}>&#9654;</span>
          AI-Powered Guidance (Optional)
        </button>
        {showApiKey && (
          <div className="mt-4">
            <p className="text-sm text-slate-500 mb-3">
              Add a Gemini API key to get personalized, plain-language guidance about your results. Without it, you'll still get the full eligibility screening -- just with standard (non-personalized) explanations.
            </p>
            <label htmlFor="apiKey" className="block text-sm text-slate-600 mb-1">Gemini API Key</label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={e => onApiKeyChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="AIza..."
            />
            <p className="text-xs text-slate-400 mt-1">
              Free at aistudio.google.com. Your key is stored locally and never sent to our servers.
            </p>
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={() => canSubmit && onSubmit(data)}
        disabled={!canSubmit}
        className={`w-full py-3 rounded-xl text-white font-medium text-sm transition-colors ${
          canSubmit
            ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
            : 'bg-slate-300 cursor-not-allowed'
        }`}
      >
        Screen My Eligibility
      </button>
    </div>
  );
}
