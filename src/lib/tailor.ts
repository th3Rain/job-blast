import Anthropic from "@anthropic-ai/sdk";
import type { CoverTemplate } from "./types";

// Model is overridable so you can trade quality for cost/latency at 50 apps/day
// (e.g. JOBBLAST_TAILOR_MODEL=claude-haiku-4-5). Defaults to the most capable Opus.
const MODEL = process.env.JOBBLAST_TAILOR_MODEL || "claude-opus-4-8";

export type TailorInput = {
  masterResume: string;
  coverTemplates: CoverTemplate[];
  jobTitle: string;
  company: string;
  jobDescription: string;
  salaryRange?: string;
  tone?: string; // preferred cover-letter tone name
};

export type TailorResult = {
  resume: string; // tailored resume (reordered/reworded bullets)
  coverLetter: string; // JD-specific cover letter
  emphasizedKeywords: string[];
  engine: "claude" | "template";
  model?: string;
};

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    tailoredResume: { type: "string" },
    coverLetter: { type: "string" },
    emphasizedKeywords: { type: "array", items: { type: "string" } },
  },
  required: ["tailoredResume", "coverLetter", "emphasizedKeywords"],
  additionalProperties: false,
} as const;

const SYSTEM = `You are a resume-tailoring assistant for a high-volume job search.
Given a candidate's master resume and a specific job description, you:
1. Reorder and reword the resume's bullets to surface the experience and keywords
   most relevant to THIS job, so it survives ATS keyword screening.
2. Draft a short, specific cover letter (<200 words) in the requested tone.

Hard rules:
- NEVER invent experience, employers, titles, dates, degrees, or skills the
  candidate does not already have in the master resume. Only reorder, reword,
  and re-emphasize what is truly there.
- Keep the resume's factual structure (same companies, dates, education, certs).
- Mirror the job description's terminology where the candidate genuinely matches it.
- Return only the requested JSON.`;

// Choose the cover template matching the requested tone, else the first one.
function pickTemplate(templates: CoverTemplate[], tone?: string): CoverTemplate | undefined {
  if (templates.length === 0) return undefined;
  if (tone) {
    const match = templates.find((t) => t.tone === tone || t.name === tone);
    if (match) return match;
  }
  return templates[0];
}

// Deterministic fallback used when ANTHROPIC_API_KEY is not set, so the whole
// review loop still works end-to-end. Reorders the resume's skill line to lead
// with JD-matched skills and fills the cover template.
export function tailorWithTemplate(input: TailorInput): TailorResult {
  const jdText = `${input.jobTitle} ${input.jobDescription}`.toLowerCase();

  // Find which of the resume's skills the JD mentions, to surface them.
  const skillLineMatch = input.masterResume.match(/##\s*Skills\s*\n([^#]+)/i);
  const skills = skillLineMatch
    ? skillLineMatch[1]
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const matched = skills.filter((s) => jdText.includes(s.toLowerCase().split(" ")[0]));

  let resume = input.masterResume;
  if (matched.length > 0 && skillLineMatch) {
    // Reorder the skills line to lead with matched skills.
    const reordered = [
      ...matched,
      ...skills.filter((s) => !matched.includes(s)),
    ].join(", ");
    const banner = `> Tailored for ${input.jobTitle} at ${input.company} — leading with: ${matched
      .slice(0, 6)
      .join(", ")}.\n\n`;
    resume = banner + input.masterResume.replace(skillLineMatch[1], ` ${reordered}\n`);
  }

  const template = pickTemplate(input.coverTemplates, input.tone);
  const coverLetter = (template?.body ?? "Dear {{company}} team,\n\nI'm excited to apply for the {{role}} role.\n\nBest,\nOyem Prince")
    .replaceAll("{{company}}", input.company)
    .replaceAll("{{role}}", input.jobTitle);

  return {
    resume,
    coverLetter,
    emphasizedKeywords: matched.slice(0, 8),
    engine: "template",
  };
}

// Tailor with Claude when a key is present; otherwise fall back to the template.
export async function tailorApplication(input: TailorInput): Promise<TailorResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return tailorWithTemplate(input);
  }

  const template = pickTemplate(input.coverTemplates, input.tone);
  const client = new Anthropic();

  const userContent = `MASTER RESUME:
${input.masterResume}

JOB:
- Title: ${input.jobTitle}
- Company: ${input.company}
- Salary: ${input.salaryRange ?? "not specified"}
- Description: ${input.jobDescription || "(no full description available; tailor from the title and company)"}

COVER LETTER TONE: ${input.tone ?? template?.tone ?? "professional"}
COVER LETTER TEMPLATE (adapt, keep the voice):
${template?.body ?? "(no template — write a concise professional cover letter)"}

Produce the tailored resume and cover letter as JSON.`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
      messages: [{ role: "user", content: userContent }],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("No text block in response");
    const parsed = JSON.parse(text.text) as {
      tailoredResume: string;
      coverLetter: string;
      emphasizedKeywords: string[];
    };

    return {
      resume: parsed.tailoredResume,
      coverLetter: parsed.coverLetter,
      emphasizedKeywords: parsed.emphasizedKeywords ?? [],
      engine: "claude",
      model: response.model,
    };
  } catch (err) {
    // If the API call fails, degrade gracefully rather than break the loop.
    console.error("Claude tailoring failed, falling back to template:", err);
    return tailorWithTemplate(input);
  }
}
