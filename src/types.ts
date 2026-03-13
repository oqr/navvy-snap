// FAFSA/ISIR data fields relevant to SNAP eligibility
export interface FAFSAData {
  // Student info
  studentName: string;
  age: number;
  isUSCitizenOrEligibleNoncitizen: boolean;

  // Financial
  adjustedGrossIncome: number; // Student's AGI
  parentAGI: number | null; // Parent AGI (if dependent)
  untaxedIncome: number;
  totalIncome: number; // Computed: AGI + untaxed
  studentAidIndex: number; // SAI (replaced EFC)

  // Enrollment
  enrollmentStatus: 'full-time' | 'half-time' | 'less-than-half-time';
  enrollmentLevel: 'undergraduate' | 'graduate';

  // Household
  householdSize: number;
  dependencyStatus: 'dependent' | 'independent';
  numberOfDependents: number; // Children or dependents the student supports
  hasChildUnder6: boolean;
  hasChild6to12: boolean;

  // Work & benefits
  workStudyEligible: boolean;
  workStudyAmount: number;
  currentWorkHoursPerWeek: number;
  receivingTANF: boolean;
  receivingDisabilityBenefits: boolean;

  // PA-specific
  paResident: boolean;
}

export type EligibilityStatus = 'likely-eligible' | 'likely-ineligible' | 'needs-review';

export interface EligibilityResult {
  status: EligibilityStatus;
  studentExemption: StudentExemption | null;
  incomeTest: IncomeTestResult;
  reasons: string[];
  nextSteps: string[];
  warnings: string[];
}

export interface StudentExemption {
  type: string;
  description: string;
  met: boolean;
}

export interface IncomeTestResult {
  grossMonthlyIncome: number;
  grossIncomeLimit: number;
  netMonthlyIncome: number;
  netIncomeLimit: number;
  passesGross: boolean;
  passesNet: boolean;
}

export type AppStep = 'input' | 'review' | 'results';

// Sample FAFSA profiles for demo purposes
export interface SampleProfile {
  name: string;
  description: string;
  data: FAFSAData;
}
