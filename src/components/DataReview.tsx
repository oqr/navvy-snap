import type { FAFSAData } from '../types';

interface DataReviewProps {
  data: FAFSAData;
  onConfirm: () => void;
  onBack: () => void;
}

function Field({ label, value }: { label: string; value: string | number | boolean }) {
  const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value;
  return (
    <div className="flex justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{String(displayValue)}</span>
    </div>
  );
}

function MoneyField({ label, value }: { label: string; value: number }) {
  return <Field label={label} value={`$${value.toLocaleString()}`} />;
}

export function DataReview({ data, onConfirm, onBack }: DataReviewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Review Your Information</h2>
        <p className="text-slate-600 text-sm mb-6">
          Please confirm this information is correct before we run the eligibility screening.
        </p>

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Personal</h3>
            <div className="bg-slate-50 rounded-lg p-4">
              <Field label="Name" value={data.studentName} />
              <Field label="Age" value={data.age} />
              <Field label="Household Size" value={data.householdSize} />
              <Field label="PA Resident" value={data.paResident} />
              <Field label="U.S. Citizen/Eligible Noncitizen" value={data.isUSCitizenOrEligibleNoncitizen} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Enrollment</h3>
            <div className="bg-slate-50 rounded-lg p-4">
              <Field label="Status" value={data.enrollmentStatus} />
              <Field label="Level" value={data.enrollmentLevel} />
              <Field label="FAFSA Dependency" value={data.dependencyStatus} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Financial</h3>
            <div className="bg-slate-50 rounded-lg p-4">
              <MoneyField label="Adjusted Gross Income" value={data.adjustedGrossIncome} />
              <MoneyField label="Untaxed Income" value={data.untaxedIncome} />
              <MoneyField label="Total Income" value={data.totalIncome} />
              <Field label="Student Aid Index (SAI)" value={data.studentAidIndex} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Work & Benefits</h3>
            <div className="bg-slate-50 rounded-lg p-4">
              <Field label="Work Hours/Week" value={data.currentWorkHoursPerWeek} />
              <Field label="Work-Study Eligible" value={data.workStudyEligible} />
              {data.workStudyEligible && <MoneyField label="Work-Study Amount" value={data.workStudyAmount} />}
              <Field label="Receiving TANF" value={data.receivingTANF} />
              <Field label="Receiving Disability Benefits" value={data.receivingDisabilityBenefits} />
            </div>
          </section>

          {data.numberOfDependents > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Dependents</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <Field label="Number of Dependents" value={data.numberOfDependents} />
                <Field label="Child Under 6" value={data.hasChildUnder6} />
                <Field label="Child 6-12" value={data.hasChild6to12} />
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
        >
          Go Back & Edit
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors"
        >
          Looks Good - Check Eligibility
        </button>
      </div>
    </div>
  );
}
