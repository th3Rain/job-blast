import { prisma } from "./prisma";
import type { CoverTemplate } from "./types";

// v1 is a single-user tool. getCurrentUser returns the one seeded user.
// When multi-user lands, this becomes the session lookup — call sites don't change.
export async function getCurrentUser() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    throw new Error("No user found. Run `npm run seed` first.");
  }
  return user;
}

export type ParsedProfile = {
  id: string;
  email: string;
  masterResume: string;
  coverTemplates: CoverTemplate[];
  targetRoles: string[];
  targetLocations: string[];
  salaryFloor: number | null;
  excludedCompanies: string[];
  dailyGoal: number;
};

function parseArray(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function parseProfile(user: {
  id: string;
  email: string;
  masterResume: string;
  coverTemplates: string;
  targetRoles: string;
  targetLocations: string;
  salaryFloor: number | null;
  excludedCompanies: string;
  dailyGoal: number;
}): ParsedProfile {
  let coverTemplates: CoverTemplate[] = [];
  try {
    const v = JSON.parse(user.coverTemplates);
    if (Array.isArray(v)) coverTemplates = v;
  } catch {
    coverTemplates = [];
  }
  return {
    id: user.id,
    email: user.email,
    masterResume: user.masterResume,
    coverTemplates,
    targetRoles: parseArray(user.targetRoles),
    targetLocations: parseArray(user.targetLocations),
    salaryFloor: user.salaryFloor,
    excludedCompanies: parseArray(user.excludedCompanies),
    dailyGoal: user.dailyGoal,
  };
}
