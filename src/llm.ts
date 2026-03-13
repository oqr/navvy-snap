import type { FAFSAData, EligibilityResult } from './types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
  error?: { message: string };
}

function buildPrompt(data: FAFSAData, result: EligibilityResult): string {
  return `You are a friendly, knowledgeable benefits navigator helping a college student in Pennsylvania understand their SNAP (food assistance) eligibility screening results. Your tone should be warm, clear, and encouraging -- like a helpful advisor at the financial aid office.

IMPORTANT RULES:
- You are explaining a PRELIMINARY SCREENING result, NOT making an official determination.
- Always remind the student that the county assistance office makes the final decision.
- Never guarantee eligibility or benefit amounts.
- Use simple, jargon-free language. Explain any policy terms in plain English.
- Be encouraging even if the student appears ineligible -- suggest alternative paths.
- Do NOT ask the student for more information. Work only with what's provided.
- Keep your response concise (under 400 words).

STUDENT PROFILE:
- Name: ${data.studentName}
- Age: ${data.age}
- Enrollment: ${data.enrollmentStatus} ${data.enrollmentLevel} student
- Dependency status: ${data.dependencyStatus}
- Household size: ${data.householdSize}
- Work-study eligible: ${data.workStudyEligible ? 'Yes' : 'No'}
- Current work hours/week: ${data.currentWorkHoursPerWeek}
- Has child under 6: ${data.hasChildUnder6 ? 'Yes' : 'No'}
- Receiving TANF: ${data.receivingTANF ? 'Yes' : 'No'}
- PA resident: ${data.paResident ? 'Yes' : 'No'}

SCREENING RESULT:
- Status: ${result.status}
- Student exemption met: ${result.studentExemption ? result.studentExemption.description : 'None identified'}
- Estimated gross monthly income: $${result.incomeTest.grossMonthlyIncome}
- Gross income limit: $${result.incomeTest.grossIncomeLimit}/month
- Passes gross income test: ${result.incomeTest.passesGross ? 'Yes' : 'No'}
- Estimated net monthly income: $${result.incomeTest.netMonthlyIncome}
- Net income limit: $${result.incomeTest.netIncomeLimit}/month
- Passes net income test: ${result.incomeTest.passesNet ? 'Yes' : 'No'}

REASONS: ${result.reasons.join(' ')}

Please provide:
1. A brief, personalized summary of their screening result (2-3 sentences, address them by first name)
2. A clear explanation of WHY they got this result (what factors mattered most)
3. Their specific next steps as a numbered list (3-5 concrete actions)
4. If there are ways they might improve their eligibility (e.g., getting work-study, increasing work hours), mention those as "Things to explore"

Format your response in clear sections with headers. Use **bold** for emphasis on key points.`;
}

export async function generateGuidance(
  data: FAFSAData,
  result: EligibilityResult,
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    return getFallbackGuidance(data, result);
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: buildPrompt(data, result) }],
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 800,
        },
      }),
    });

    const json: GeminiResponse = await response.json();

    if (json.error) {
      console.error('Gemini API error:', json.error.message);
      return getFallbackGuidance(data, result);
    }

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return getFallbackGuidance(data, result);
    }

    return text;
  } catch (error) {
    console.error('LLM request failed:', error);
    return getFallbackGuidance(data, result);
  }
}

// Deterministic fallback if LLM is unavailable
function getFallbackGuidance(data: FAFSAData, result: EligibilityResult): string {
  const firstName = data.studentName.split(' ')[0];
  const statusLabel = result.status === 'likely-eligible'
    ? 'likely eligible'
    : result.status === 'likely-ineligible'
      ? 'likely not eligible based on this screening'
      : 'in a gray area that needs further review';

  let guidance = `## Your Screening Result\n\n`;
  guidance += `**${firstName}**, based on the information from your FAFSA, you appear to be **${statusLabel}** for SNAP benefits in Pennsylvania.\n\n`;

  guidance += `## Why?\n\n`;
  for (const reason of result.reasons) {
    guidance += `- ${reason}\n`;
  }

  if (result.warnings.length > 0) {
    guidance += `\n**Keep in mind:**\n`;
    for (const warning of result.warnings) {
      guidance += `- ${warning}\n`;
    }
  }

  guidance += `\n## Your Next Steps\n\n`;
  result.nextSteps.forEach((step, i) => {
    guidance += `${i + 1}. ${step}\n`;
  });

  guidance += `\n---\n*This is a preliminary screening, not an official determination. Your county assistance office will make the final decision based on your complete application.*`;

  return guidance;
}

export async function generateWhatIf(
  data: FAFSAData,
  originalResult: EligibilityResult,
  scenarioResult: EligibilityResult,
  scenarioDescription: string,
  apiKey: string,
): Promise<string> {
  if (!apiKey) {
    const changed = originalResult.status !== scenarioResult.status;
    if (changed) {
      return `**If ${scenarioDescription}**, your screening result would change from **${originalResult.status}** to **${scenarioResult.status}**.\n\n${scenarioResult.reasons.join(' ')}`;
    }
    return `**If ${scenarioDescription}**, your screening result would remain **${scenarioResult.status}**. The change alone does not affect your eligibility in this scenario.`;
  }

  const prompt = `You are a benefits navigator. A student just used a "What If" scenario tool. Briefly explain (under 150 words) how the change affects their SNAP eligibility.

Original result: ${originalResult.status}
New result: ${scenarioResult.status}
Scenario: ${scenarioDescription}
Original reasons: ${originalResult.reasons.join(' ')}
New reasons: ${scenarioResult.reasons.join(' ')}

Be concise, encouraging, and use the student's first name (${data.studentName.split(' ')[0]}).`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300 },
      }),
    });

    const json: GeminiResponse = await response.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || `If ${scenarioDescription}, your result changes to: ${scenarioResult.status}.`;
  } catch {
    return `If ${scenarioDescription}, your result changes to: ${scenarioResult.status}.`;
  }
}
