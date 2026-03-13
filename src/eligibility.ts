import type { FAFSAData, EligibilityResult, StudentExemption, IncomeTestResult } from './types';

// PA SNAP Income Limits (FY2026: Oct 2025 - Sep 2026)
// PA uses Broad-Based Categorical Eligibility (BBCE):
//   Gross monthly income: 200% of Federal Poverty Level (higher than federal 130%)
//   Net monthly income: 100% of Federal Poverty Level
// Source: https://www.pa.gov/agencies/dhs/resources/snap/snap-income-limits
const GROSS_INCOME_LIMITS: Record<number, number> = {
  1: 2610,
  2: 3526,
  3: 4442,
  4: 5360,
  5: 6276,
  6: 7192,
  7: 8110,
  8: 9026,
};

const NET_INCOME_LIMITS: Record<number, number> = {
  1: 1305,
  2: 1763,
  3: 2221,
  4: 2680,
  5: 3138,
  6: 3596,
  7: 4055,
  8: 4513,
};

// For households > 8, add per additional member
const GROSS_PER_ADDITIONAL = 918;
const NET_PER_ADDITIONAL = 459;

function getIncomeLimit(householdSize: number, limits: Record<number, number>, perAdditional: number): number {
  if (householdSize <= 8) return limits[householdSize] || limits[1];
  return limits[8] + (householdSize - 8) * perAdditional;
}

// Standard deduction (FY2026): $209 for households of 1-3
const STANDARD_DEDUCTION: Record<number, number> = {
  1: 209,
  2: 209,
  3: 209,
  4: 220,
  5: 257,
  6: 295,
};

function getStandardDeduction(householdSize: number): number {
  if (householdSize <= 3) return 209;
  return STANDARD_DEDUCTION[householdSize] || 295;
}

// Check student exemptions per federal SNAP rules (7 CFR 273.5)
// PA follows federal student exemption rules
function checkStudentExemptions(data: FAFSAData): StudentExemption[] {
  const exemptions: StudentExemption[] = [];

  // Exemption 1: Working 20+ hours per week
  exemptions.push({
    type: 'work-20hrs',
    description: 'Working at least 20 hours per week',
    met: data.currentWorkHoursPerWeek >= 20,
  });

  // Exemption 2: Participating in federal or state work-study
  // Note: approval alone is sufficient -- does not need to have started yet
  exemptions.push({
    type: 'work-study',
    description: 'Approved for federal or state work-study for the current term',
    met: data.workStudyEligible,
  });

  // Exemption 3: Caring for a child under 6
  exemptions.push({
    type: 'child-under-6',
    description: 'Responsible for the care of a dependent child under age 6',
    met: data.hasChildUnder6,
  });

  // Exemption 4: Caring for a child 6-11 without adequate childcare
  exemptions.push({
    type: 'child-6-12',
    description: 'Responsible for a child age 6-11 and lacking adequate childcare to attend school and work 20+ hrs/week',
    met: data.hasChild6to12 && data.currentWorkHoursPerWeek < 20,
  });

  // Exemption 5: Single parent enrolled full-time with child under 12
  exemptions.push({
    type: 'single-parent-fulltime',
    description: 'Single parent enrolled full-time caring for a child under 12',
    met: data.enrollmentStatus === 'full-time' && data.numberOfDependents > 0 && (data.hasChildUnder6 || data.hasChild6to12),
  });

  // Exemption 6: Receiving TANF
  exemptions.push({
    type: 'tanf',
    description: 'Receiving Temporary Assistance for Needy Families (TANF) benefits',
    met: data.receivingTANF,
  });

  // Exemption 7: Not enrolled more than half-time
  exemptions.push({
    type: 'less-than-half-time',
    description: 'Enrolled less than half-time (student restriction does not apply)',
    met: data.enrollmentStatus === 'less-than-half-time',
  });

  // Exemption 8: Receiving disability benefits
  exemptions.push({
    type: 'disability',
    description: 'Receiving disability-based benefits (SSI, SSDI, etc.)',
    met: data.receivingDisabilityBenefits,
  });

  // Exemption 9: Age (under 18 or 50+)
  exemptions.push({
    type: 'age',
    description: 'Under age 18 or age 50 or older',
    met: data.age < 18 || data.age >= 50,
  });

  return exemptions;
}

function checkIncomeEligibility(data: FAFSAData): IncomeTestResult {
  // Estimate monthly income from annual FAFSA data
  // For students, use THEIR income (not parents'), as SNAP household is the student's
  const annualIncome = data.adjustedGrossIncome + data.untaxedIncome;
  const grossMonthlyIncome = Math.round(annualIncome / 12);

  // Simplified net income calculation
  // Net = gross - standard deduction - 20% earned income deduction
  const standardDeduction = getStandardDeduction(data.householdSize);
  const earnedIncomeDeduction = Math.round(grossMonthlyIncome * 0.20);
  const netMonthlyIncome = Math.max(0, grossMonthlyIncome - standardDeduction - earnedIncomeDeduction);

  const grossIncomeLimit = getIncomeLimit(data.householdSize, GROSS_INCOME_LIMITS, GROSS_PER_ADDITIONAL);
  const netIncomeLimit = getIncomeLimit(data.householdSize, NET_INCOME_LIMITS, NET_PER_ADDITIONAL);

  return {
    grossMonthlyIncome,
    grossIncomeLimit,
    netMonthlyIncome,
    netIncomeLimit,
    passesGross: grossMonthlyIncome <= grossIncomeLimit,
    passesNet: netMonthlyIncome <= netIncomeLimit,
  };
}

export function determineEligibility(data: FAFSAData): EligibilityResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Step 1: Basic eligibility checks
  if (!data.isUSCitizenOrEligibleNoncitizen) {
    return {
      status: 'likely-ineligible',
      studentExemption: null,
      incomeTest: checkIncomeEligibility(data),
      reasons: ['SNAP requires U.S. citizenship or eligible noncitizen status.'],
      nextSteps: ['Check with your school\'s financial aid office about other food assistance programs that may be available to you.'],
      warnings: [],
    };
  }

  if (!data.paResident) {
    return {
      status: 'likely-ineligible',
      studentExemption: null,
      incomeTest: checkIncomeEligibility(data),
      reasons: ['You must be a Pennsylvania resident to apply for PA SNAP benefits.'],
      nextSteps: ['Check the SNAP program in your home state.'],
      warnings: [],
    };
  }

  // Step 2: Student exemption check
  const exemptions = checkStudentExemptions(data);
  const metExemptions = exemptions.filter(e => e.met);
  const primaryExemption = metExemptions.length > 0 ? metExemptions[0] : null;

  // Students enrolled at least half-time need an exemption
  const needsExemption = data.enrollmentStatus !== 'less-than-half-time';

  if (needsExemption && metExemptions.length === 0) {
    reasons.push(
      'As a student enrolled at least half-time, you need to meet at least one exemption to qualify for SNAP. Based on the information provided, you do not currently meet any student exemptions.'
    );

    // Suggest possible paths
    const suggestions: string[] = [];
    if (!data.workStudyEligible) {
      suggestions.push('Ask your financial aid office about work-study eligibility -- this is the most common student exemption. You only need to be approved, not yet working.');
    }
    if (data.currentWorkHoursPerWeek < 20 && data.currentWorkHoursPerWeek > 0) {
      suggestions.push(`You currently work ${data.currentWorkHoursPerWeek} hours/week. If you can increase to 20 hours, you would meet the work exemption.`);
    }

    return {
      status: 'likely-ineligible',
      studentExemption: null,
      incomeTest: checkIncomeEligibility(data),
      reasons,
      nextSteps: suggestions.length > 0
        ? suggestions
        : ['Talk to your school\'s financial aid office about work-study options or other student exemptions.'],
      warnings: ['This is a preliminary screening. Your county assistance office makes the final determination and may consider factors not captured here.'],
    };
  }

  if (needsExemption && primaryExemption) {
    reasons.push(`You meet the student exemption: "${primaryExemption.description}".`);
    if (metExemptions.length > 1) {
      reasons.push(`You also meet ${metExemptions.length - 1} additional exemption(s), which strengthens your case.`);
    }
  }

  if (!needsExemption) {
    reasons.push('As a less-than-half-time student, the student enrollment restriction does not apply to you.');
  }

  // Step 3: Income test
  // PA uses BBCE: gross limit is 200% FPL (more generous than federal 130%)
  const incomeTest = checkIncomeEligibility(data);

  if (!incomeTest.passesGross) {
    reasons.push(
      `Your estimated gross monthly income ($${incomeTest.grossMonthlyIncome.toLocaleString()}) exceeds Pennsylvania's limit for a household of ${data.householdSize} ($${incomeTest.grossIncomeLimit.toLocaleString()}/month at 200% FPL).`
    );
    warnings.push(
      'Income from FAFSA is an annual estimate. Your actual monthly income may differ -- the county office will verify your current income.'
    );

    return {
      status: 'likely-ineligible',
      studentExemption: primaryExemption,
      incomeTest,
      reasons,
      nextSteps: [
        'If your current income is lower than what was reported on your FAFSA, you may still qualify. Apply and provide current income documentation.',
        'Contact your county assistance office to discuss your situation.',
      ],
      warnings,
    };
  }

  if (!incomeTest.passesNet) {
    reasons.push(
      `Your estimated net monthly income ($${incomeTest.netMonthlyIncome.toLocaleString()}) is close to or exceeds the limit ($${incomeTest.netIncomeLimit.toLocaleString()}/month). Additional deductions may help.`
    );
    warnings.push('You may have additional deductions (shelter costs, childcare, medical expenses) that could lower your net income below the limit.');

    return {
      status: 'needs-review',
      studentExemption: primaryExemption,
      incomeTest,
      reasons,
      nextSteps: [
        'Apply for SNAP -- you may qualify once all deductions are considered.',
        'Gather documentation of your monthly expenses (rent, utilities, childcare).',
        'Apply online at compass.dhs.pa.gov or contact your county assistance office.',
      ],
      warnings,
    };
  }

  // Passes both tests
  reasons.push(
    `Your estimated gross monthly income ($${incomeTest.grossMonthlyIncome.toLocaleString()}) is within Pennsylvania's limit ($${incomeTest.grossIncomeLimit.toLocaleString()}/month) for a household of ${data.householdSize}.`
  );
  reasons.push(
    'Pennsylvania has no asset limit for most SNAP applicants, so savings and vehicle values do not affect your eligibility.'
  );

  return {
    status: 'likely-eligible',
    studentExemption: primaryExemption,
    incomeTest,
    reasons,
    nextSteps: [
      'Apply online at COMPASS (compass.dhs.pa.gov) -- Pennsylvania\'s benefits portal. Available 24/7.',
      'You can also apply in person at your county assistance office.',
      'Gather required documents: photo ID, proof of income (pay stubs), proof of PA residency, Social Security number.',
      'You will also need proof of shelter costs (lease, rent receipts, utility bills) -- PA requires this as of February 2026.',
      'If approved for work-study, bring your financial aid award letter as proof of your student exemption.',
      'After applying, DHS will schedule a phone interview (typically within 2 business days).',
      'You will receive a determination within 30 days (or 7 days if you qualify for expedited benefits).',
    ],
    warnings: [
      'This is a preliminary screening based on your FAFSA data. The county assistance office will make the official determination.',
      'Your actual eligibility depends on your current monthly income, which may differ from FAFSA-reported annual income.',
    ],
  };
}
