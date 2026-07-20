// Shared domain types used across the app.

export type Seniority = "intern" | "junior" | "mid" | "senior" | "lead";

export type ApplicationStatus =
  | "queued"
  | "approved"
  | "applied"
  | "responded"
  | "interview"
  | "rejected"
  | "offer"
  | "skipped";

// Statuses shown as columns in the tracker pipeline (skipped is a queue-management
// state, not a funnel stage, so it's excluded here).
export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "applied",
  "responded",
  "interview",
  "offer",
  "rejected",
];

// The funnel order shown in the dashboard.
export const FUNNEL_STAGES: ApplicationStatus[] = [
  "applied",
  "responded",
  "interview",
  "offer",
];

export type CoverTemplate = {
  name: string;
  tone: string; // e.g. "professional", "warm", "direct"
  body: string; // may contain {{company}} / {{role}} placeholders
};

// A source-agnostic normalized listing produced by any JobSource adapter.
export type NormalizedListing = {
  source: string;
  sourceJobId?: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  url: string;
  description?: string;
  salaryMin?: number;
  salaryMax?: number;
  jobType?: string;
  country?: string; // ISO-2, e.g. "IE"
  postedDate?: string; // ISO
};
