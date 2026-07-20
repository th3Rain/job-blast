import { normalizeText } from "./normalize";
import type { Seniority } from "./types";

// Weighted relevance scoring. Each component contributes up to its weight; the
// total is 0-100. Kept as a pure function so it's trivially unit-testable and
// the same logic runs in the ingest-time `score` script and any live re-score.

export const WEIGHTS = {
  title: 45,
  skills: 25,
  seniority: 12,
  location: 10,
  salary: 8,
} as const;

const STOPWORDS = new Set([
  "and", "the", "for", "with", "you", "our", "your", "are", "will", "who",
  "job", "role", "team", "work", "remote", "hybrid", "onsite", "usa", "us",
  "full", "time", "part", "contract", "engineer", "engineers", "senior",
  "junior", "lead", "principal", "staff", "sr", "jr", "i", "ii", "iii",
]);

export type SponsorshipLevel = "stated" | "likely" | "confirm" | "unknown";

export type ScoreProfile = {
  targetRoles: string[];
  targetLocations: string[];
  salaryFloor: number | null;
  excludedCompanies: string[];
  // Skill/keyword tokens derived from the master resume.
  resumeSkills: string[];
  // Preferred seniority bands; defaults to mid/senior if empty.
  desiredSeniority?: Seniority[];
  // When true, sponsorship signal nudges ranking (see scoreListing).
  sponsorshipRequired?: boolean;
};

export type ScoreListing = {
  title: string;
  company: string;
  description?: string;
  location: string;
  isRemote: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  seniority?: Seniority | null;
  sponsorship?: SponsorshipLevel;
};

export type ScoreResult = {
  score: number; // 0-100
  reasons: string[];
};

function tokens(s: string): string[] {
  return normalizeText(s)
    .split(" ")
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// Best token-overlap ratio between the listing title and any target role.
function titleScore(listingTitle: string, targetRoles: string[]): number {
  const titleToks = new Set(tokens(listingTitle));
  if (titleToks.size === 0 || targetRoles.length === 0) return 0;

  let best = 0;
  for (const role of targetRoles) {
    const roleToks = tokens(role);
    if (roleToks.length === 0) continue;
    const matched = roleToks.filter((t) => titleToks.has(t)).length;
    const ratio = matched / roleToks.length;
    if (ratio > best) best = ratio;
  }
  return best; // 0..1
}

export function scoreListing(
  profile: ScoreProfile,
  listing: ScoreListing
): ScoreResult {
  const reasons: string[] = [];

  // Hard exclude: user never wants this company.
  const excluded = profile.excludedCompanies.some(
    (c) => normalizeText(c) === normalizeText(listing.company)
  );
  if (excluded) {
    return { score: 0, reasons: [`Excluded company: ${listing.company}`] };
  }

  // --- Title (45) ---
  const titleRatio = titleScore(listing.title, profile.targetRoles);
  const titlePts = Math.round(titleRatio * WEIGHTS.title);
  if (titleRatio >= 0.99) reasons.push("Title matches a target role");
  else if (titleRatio >= 0.5) reasons.push("Title partially matches a target role");

  // --- Skills / keywords (25) ---
  const skillSet = new Set(profile.resumeSkills.map((s) => s.toLowerCase()));
  const listingToks = new Set([
    ...tokens(listing.title),
    ...tokens(listing.description ?? ""),
  ]);
  const matchedSkills = [...listingToks].filter((t) => skillSet.has(t));
  // Reward up to 5 distinct skill hits for a full component score.
  const skillRatio = Math.min(matchedSkills.length / 5, 1);
  const skillPts = Math.round(skillRatio * WEIGHTS.skills);
  if (matchedSkills.length > 0) {
    reasons.push(`Skill match: ${matchedSkills.slice(0, 5).join(", ")}`);
  }

  // --- Seniority (12) ---
  const desired = profile.desiredSeniority?.length
    ? profile.desiredSeniority
    : (["mid", "senior"] as Seniority[]);
  let seniorityPts = Math.round(WEIGHTS.seniority * 0.5); // neutral default
  if (listing.seniority) {
    if (desired.includes(listing.seniority)) {
      seniorityPts = WEIGHTS.seniority;
      reasons.push(`${cap(listing.seniority)}-level role fits your target`);
    } else if (listing.seniority === "intern") {
      seniorityPts = 0;
      reasons.push("Intern-level (below your target)");
    } else if (listing.seniority === "lead") {
      seniorityPts = Math.round(WEIGHTS.seniority * 0.66);
    } else if (listing.seniority === "junior") {
      seniorityPts = Math.round(WEIGHTS.seniority * 0.5);
    }
  }

  // --- Location / remote (10) ---
  let locationPts = 0;
  const wantsRemote = profile.targetLocations.some((l) => /remote/i.test(l));
  if (listing.isRemote && wantsRemote) {
    locationPts = WEIGHTS.location;
    reasons.push("Remote (matches your preference)");
  } else if (
    profile.targetLocations.some(
      (l) => !/remote/i.test(l) && normalizeText(listing.location).includes(normalizeText(l))
    )
  ) {
    locationPts = WEIGHTS.location;
    reasons.push("Location matches a target location");
  } else if (listing.isRemote) {
    locationPts = Math.round(WEIGHTS.location * 0.6);
  }

  // --- Salary (8) ---
  let salaryPts = Math.round(WEIGHTS.salary * 0.5); // unknown salary: neutral
  if (profile.salaryFloor && (listing.salaryMin || listing.salaryMax)) {
    const top = listing.salaryMax ?? listing.salaryMin ?? 0;
    if (top >= profile.salaryFloor) {
      salaryPts = WEIGHTS.salary;
      reasons.push(`Pay meets your floor (€${profile.salaryFloor.toLocaleString()})`);
    } else {
      salaryPts = 0;
      reasons.push("Pay below your floor");
    }
  }

  // --- Sponsorship nudge (only when the user requires sponsorship) ---
  let sponsorshipAdj = 0;
  if (profile.sponsorshipRequired && listing.sponsorship) {
    if (listing.sponsorship === "stated") {
      sponsorshipAdj = 5;
      reasons.push("Visa sponsorship stated in the listing");
    } else if (listing.sponsorship === "likely") {
      reasons.push("Likely eligible for Ireland's Critical Skills permit");
    } else if (listing.sponsorship === "confirm") {
      reasons.push("Recruiter post — confirm sponsorship directly");
    } else {
      sponsorshipAdj = -8;
      reasons.push("Sponsorship unclear for this role");
    }
  }

  const score = Math.max(
    0,
    Math.min(100, titlePts + skillPts + seniorityPts + locationPts + salaryPts + sponsorshipAdj)
  );
  return { score, reasons };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Extract skill tokens from a master resume: prefer the "Skills" section, fall
// back to the whole document. Returns lowercased distinct tokens.
export function extractResumeSkills(masterResume: string): string[] {
  const lower = masterResume.toLowerCase();
  const skillsIdx = lower.indexOf("## skills");
  let region = masterResume;
  if (skillsIdx >= 0) {
    const after = masterResume.slice(skillsIdx);
    const nextSection = after.indexOf("\n##", 3);
    region = nextSection > 0 ? after.slice(0, nextSection) : after;
  }
  const toks = new Set(tokens(region));
  return [...toks];
}
