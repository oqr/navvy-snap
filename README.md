# SNAP Navigator

A proof-of-concept web application that helps Pennsylvania college students understand their SNAP (food assistance) eligibility using data from their FAFSA.

## Setup

```bash
# Clone and install
git clone https://github.com/oqr/navvy-snap.git
cd navvy-snap
npm install

# Run development server
npm run dev
```

The app runs at `http://localhost:5173`. No environment variables required for the basic screener.

**Optional: AI-powered guidance**
To enable personalized AI guidance, get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/) and enter it in the app's settings panel. The screener works fully without it -- you just get standard (non-personalized) explanations instead.

## The "Why"

The student benefits gap is not primarily a data problem -- it is a clarity problem. Students have the financial data (via FAFSA), and the eligibility rules exist in policy documents. What is missing is the bridge between the two.

SNAP Navigator is a **guided eligibility screener** that:

1. **Takes FAFSA data as input** (structured fields that map directly to ISIR data)
2. **Runs deterministic eligibility logic** against PA SNAP rules -- income tests, student exemption checks, household size thresholds
3. **Uses an LLM to translate the result into plain-language guidance** -- not to determine eligibility, but to explain it in a way a stressed 20-year-old can understand and act on
4. **Offers "What If" scenarios** so students can explore how changes (getting work-study, increasing work hours) would affect their eligibility

The core design principle: **the computer should handle the policy logic; the AI should handle the human explanation.** This keeps the high-stakes determination deterministic and auditable while using AI where it adds genuine value -- making bureaucratic processes feel approachable.

The target user is a student who just received their FAFSA data, has heard they might qualify for food assistance, but does not know where to start. SNAP Navigator meets them there and gives them a clear yes/no/maybe with concrete next steps.

## The "How"

### Architecture

```
React SPA (Vite + TypeScript + Tailwind CSS)
|
|-- DataInput component
|   |-- Sample profiles (5 pre-built student scenarios)
|   |-- Manual entry form (maps to FAFSA/ISIR fields)
|
|-- Eligibility Engine (pure TypeScript, deterministic)
|   |-- PA SNAP income thresholds (gross 200% FPL via BBCE, net 100% FPL)
|   |-- Student exemption checker (7 CFR 273.5)
|   |-- Standard deductions, earned income deduction
|   |-- Returns: status + reasons + next steps + warnings
|
|-- LLM Layer (Gemini 2.0 Flash via API)
|   |-- Generates plain-language guidance from eligibility result
|   |-- Generates "What If" scenario explanations
|   |-- Constrained prompts (temperature 0.1, output cap)
|   |-- Graceful fallback to deterministic guidance if API unavailable
|
|-- Results View
    |-- Eligibility badge (likely-eligible / likely-ineligible / needs-review)
    |-- Income breakdown with visual progress bars
    |-- AI-generated personalized guide
    |-- Interactive action checklist
    |-- "What If" scenario explorer
```

### Key Technical Decisions

- **Deterministic eligibility, AI explanation.** The eligibility engine is pure TypeScript with no LLM involvement. This makes the core determination testable, auditable, and consistent. The LLM only generates human-friendly explanations of already-determined results.

- **Gemini 2.0 Flash.** Free tier, fast, good enough for structured guidance generation. Temperature set to 0.1 for consistency.

- **Graceful degradation.** The app works fully without an API key. The LLM is additive, not required. If the API fails, a deterministic fallback generates standard guidance.

- **Sample profiles over file upload.** For a POC, pre-built student profiles demonstrate the range of outcomes (eligible, ineligible, edge case, no exemption) without requiring real FAFSA data. Manual entry is also available.

- **Single-page, three-step flow.** Input -> Review -> Results. No routing library needed. The review step reduces errors and builds trust.

## Tradeoffs & Next Steps

### Cut for time

- **No FAFSA PDF parsing.** A production version would use OCR/document intelligence to extract fields from uploaded ISIR PDFs. For the POC, users select sample profiles or enter data manually.
- **Simplified income calculation.** Real SNAP eligibility considers more deductions (shelter, childcare, medical). The POC uses standard and earned income deductions only.
- **SNAP only.** Medicaid eligibility screening would be a natural extension but uses different rules.
- **No persistence.** Results are not saved between sessions.
- **No multilingual support.** A real deployment would need Spanish and other languages common in PA student populations.
- **Limited accessibility testing.** Semantic HTML and ARIA labels are in place, but no screen reader testing was done.

### For a real-world pilot (FERPA/SOC II)

- **Server-side LLM calls.** Never send FAFSA data directly from the browser to a third-party API. Route through a backend that strips PII before constructing the LLM prompt.
- **No PII in LLM prompts.** Replace names with "the student," strip SSN/DOB entirely. The eligibility result (not the raw data) is what the LLM needs.
- **Encryption at rest and in transit.** All student data encrypted, TLS everywhere.
- **Audit logging.** Every eligibility determination logged with timestamp, inputs, and result -- without storing raw PII longer than necessary.
- **Data retention policy.** Define and enforce how long screening data is kept. Ideally, ephemeral (not stored after the session).
- **SOC II Type 2 compliance.** Required for any system handling student financial data at scale. This means formal security controls, access management, and regular audits.
- **Human review loop.** Edge cases ("needs-review") should route to a trained benefits counselor, not just show a disclaimer.
- **Integration with COMPASS.** PA's benefits portal could receive pre-filled application data to reduce re-entry burden.

## Responsible AI

### How the LLM is used (and not used)

The LLM **never determines eligibility**. The eligibility engine is pure deterministic TypeScript that evaluates income thresholds and student exemptions against codified PA SNAP rules. The LLM's role is strictly to:

1. Translate the eligibility result into plain-language, personalized guidance
2. Explain "What If" scenario differences in conversational terms

This separation is the single most important architectural decision. In a regulatory context, the determination must be auditable, reproducible, and explainable without AI. The AI layer is additive.

### Risks and mitigations

| Risk | Mitigation |
|------|-----------|
| **LLM generates inaccurate policy information** | LLM prompt is tightly constrained to explain only the already-determined result. It receives the status and reasons, not raw policy text to interpret. |
| **Students over-rely on the tool** | Every screen includes a disclaimer. The LLM prompt instructs it to always note this is preliminary. |
| **LLM produces confident-sounding wrong advice** | Temperature set to 0.1. Output capped at 800 tokens. Prompt explicitly instructs "say you are not sure rather than guess." |
| **API unavailable or returns garbage** | Deterministic fallback generates standard guidance. The app never shows an empty or broken result. |
| **PII exposure to LLM provider** | In production: strip all PII before sending to LLM. In this POC: API calls happen client-side with user-provided key; no server storage. |

### How to assess whether the system works

- **Eligibility accuracy:** Compare determinations against a manually curated set of test cases with known-correct outcomes. The 5 sample profiles are a start. Expand to 50+ covering edge cases.
- **Guidance quality:** Human review of LLM outputs for accuracy, tone, and actionability. Flag any instance where the LLM contradicts the deterministic result.
- **User testing:** Watch students use the tool. Do they understand the result? Do they know what to do next? Do they feel more confident about applying?
- **Conversion tracking:** In a real deployment, track how many screened-as-eligible students actually apply for SNAP. That is the metric that matters.

## AI Tooling

This project was built with **Claude Code** (Anthropic's CLI coding assistant). Here is how it affected the workflow:

**What it did well:**
- Scaffolded the project structure and boilerplate quickly
- Generated the eligibility engine logic from policy descriptions
- Built out the full component tree with consistent Tailwind styling
- Wrote the LLM integration layer including prompt engineering and fallback logic

**What required human judgment:**
- Architectural decisions (deterministic eligibility vs. AI, what the LLM should and should not do)
- Policy research and validation of eligibility rules
- UX flow design (three-step process, sample profiles, "What If" scenarios)
- Prompt engineering strategy (what context to give the LLM, what to withhold)
- This README and all design rationale

**How it affected workflow:**
Using AI-assisted coding compressed the implementation phase significantly, allowing more time for the design thinking and policy research that differentiate this submission. The risk is over-reliance on generated code without understanding it -- I mitigated this by reviewing every generated function, testing edge cases manually, and making architectural decisions before generating code.

The meta-observation: the same principle applied to the app (AI augments human judgment, does not replace it) also applied to building it.

## Tech Stack

- **React 19** + TypeScript + Vite 8
- **Tailwind CSS v4** for styling
- **Gemini 2.0 Flash** (free tier) for AI-powered guidance
- No additional runtime dependencies
