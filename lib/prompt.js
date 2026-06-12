// JSON shape we ask the model to return. Kept flat and ATS-friendly.
export const RESUME_SCHEMA_HINT = `{
  "name": "the candidate's actual full name, or \\"\\" if it cannot be determined",
  "contact": { "email": "", "phone": "", "location": "", "linkedin": "", "website": "" },
  "summary": "2-4 sentence professional summary tailored to the job.",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company",
      "location": "City, ST",
      "dates": "Mon YYYY – Mon YYYY",
      "bullets": ["Achievement-oriented bullet with metrics", "..."]
    }
  ],
  "education": [
    { "degree": "Degree", "institution": "School", "location": "", "dates": "YYYY", "details": "" }
  ],
  "certifications": ["cert1"],
  "matchedKeywords": ["keywords from the JD now present in the resume"],
  "changeNotes": "Short bullet-style summary of what you changed and why, for the candidate."
}`;

export function tailorPrompt(resumeText, jobDescription, additionalInstructions = '') {
  const extraBlock = additionalInstructions
    ? `\n=== ADDITIONAL INSTRUCTIONS FROM THE CANDIDATE ===
Follow these instructions in addition to the job description. They take priority where they conflict with general tailoring choices, but they NEVER override the rule against fabricating information.
${additionalInstructions}\n`
    : '';

  return `You are an expert resume writer and ATS (Applicant Tracking System) optimization specialist.

Your task: rewrite the candidate's resume so it is tailored to the target job description and optimized to pass ATS screening, WITHOUT inventing false information.

STRICT RULES:
- Do NOT fabricate employers, job titles, dates, degrees, or metrics that aren't supported by the original resume. You may rephrase and re-emphasize, but never lie.
- Naturally incorporate important keywords, skills, and terminology from the job description where the candidate genuinely has relevant experience.
- Rewrite experience bullets to be achievement-oriented (action verb + what you did + measurable impact). Keep any real numbers from the original; do not invent new numbers.
- Use standard, ATS-safe section names. No tables, columns, graphics, or special characters.
- Reorder skills and bullets to surface the most JD-relevant items first.
- Keep it concise and truthful. If the original lacks contact details, leave those fields as empty strings.
- Never insert placeholder text (e.g. "Full Name", "Job Title", "Company"). If a value cannot be genuinely extracted from the resume, use an empty string "" (or an empty array) instead.
- "matchedKeywords" must list JD keywords/skills that are now genuinely reflected in the resume.

Return ONLY valid JSON matching exactly this structure (no markdown, no commentary):
${RESUME_SCHEMA_HINT}

=== ORIGINAL RESUME ===
${resumeText}

=== TARGET JOB DESCRIPTION ===
${jobDescription}
${extraBlock}`;
}
