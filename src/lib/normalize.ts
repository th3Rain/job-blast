import type { Seniority } from "./types";

// Normalize a string for fuzzy comparison: lowercase, strip punctuation,
// collapse whitespace, and drop common company suffixes.
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(inc|llc|ltd|corp|co|company|technologies|technology|group|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Fuzzy dedup key: normalized company + core title. Two aggregator re-lists of
// the same job collapse to the same key. Seniority words are kept because a
// "Senior X" and "X" at the same company are genuinely different roles.
export function dedupKey(company: string, title: string): string {
  const c = normalizeText(company);
  const t = normalizeText(title)
    // drop noise words that vary between re-lists
    .replace(/\b(remote|hybrid|onsite|contract|fulltime|full time|part time|urgent|hiring)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${c}::${t}`;
}

export type SponsorshipLevel = "stated" | "likely" | "confirm" | "unknown";
export type SponsorshipSignal = { level: SponsorshipLevel; note: string };

// Recruiters/agencies commonly reposting roles — sponsorship must be confirmed
// with the actual employer, so we don't claim "likely" for these.
const RECRUITERS = [
  "cpl", "celtic careers", "total talent", "xanadu", "clark recruitment",
  "robert walters", "hadfield green", "direct path", "esp global",
  "morgan mckinley", "sigmar", "reperio", "harvey nash", "cpl resources",
];

// Titles on Ireland's Critical Skills Occupations List (ICT/engineering) — these
// generally qualify for a Critical Skills Employment Permit (salary permitting).
const CRITICAL_SKILLS = [
  "devops", "sre", "site reliability", "platform engineer", "cloud engineer",
  "cloud architect", "kubernetes", "security engineer", "software engineer",
  "architect", "data engineer", "infrastructure engineer", "backend engineer",
  "systems engineer", "solutions engineer",
];

// Indeed rarely states sponsorship explicitly, so this is a best-effort signal,
// not a guarantee. "stated" = the listing says so; "likely" = a tech role that
// is typically eligible for Ireland's Critical Skills permit; "confirm" = posted
// via a recruiter, so verify directly; "unknown" = not a clear tech role.
export function detectSponsorship(
  title: string,
  description: string,
  company: string
): SponsorshipSignal {
  const text = `${title}\n${description}`.toLowerCase();
  if (
    /\b(visa sponsor|sponsorship|work permit|critical skills? (permit|employment)|relocation (assistance|package|support)|stamp\s?[124]|right to work (provided|supported)|we sponsor)\b/.test(
      text
    )
  ) {
    return { level: "stated", note: "Sponsorship / visa explicitly mentioned in the listing" };
  }
  const co = normalizeText(company);
  if (RECRUITERS.some((r) => co.includes(normalizeText(r)))) {
    return { level: "confirm", note: "Posted via a recruiter — confirm sponsorship with the employer" };
  }
  const t = title.toLowerCase();
  if (CRITICAL_SKILLS.some((k) => t.includes(k))) {
    return {
      level: "likely",
      note: "Tech role typically eligible for Ireland's Critical Skills Employment Permit",
    };
  }
  return { level: "unknown", note: "" };
}

// Infer a seniority band from a job title.
export function inferSeniority(title: string): Seniority | null {
  const t = title.toLowerCase();
  if (/\b(intern|internship)\b/.test(t)) return "intern";
  if (/\b(principal|staff|lead|head|director|vp|architect)\b/.test(t)) return "lead";
  if (/\b(sr\.?|senior|snr)\b/.test(t)) return "senior";
  if (/\b(jr\.?|junior|entry|associate|graduate|new grad)\b/.test(t)) return "junior";
  return "mid";
}
