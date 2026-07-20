import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

const ACTED = new Set(["approved", "applied", "responded", "interview", "rejected", "offer", "skipped"]);

// GET /api/queue -> ranked review queue: highest-scoring listings the user has
// not yet acted on. Supports filters via query params:
//   minScore, source, remote=true, minSalary, seniority, q (keyword),
//   sponsorship (stated|sponsored|any), location, limit
export async function GET(req: Request) {
  const user = await getCurrentUser();
  const p = new URL(req.url).searchParams;
  const limit = Number(p.get("limit") ?? 100);
  const minScore = Number(p.get("minScore") ?? 0);
  const source = p.get("source") ?? "all";
  const remoteOnly = p.get("remote") === "true";
  const minSalary = Number(p.get("minSalary") ?? 0);
  const seniority = p.get("seniority") ?? "any";
  const q = (p.get("q") ?? "").trim().toLowerCase();
  const sponsorship = p.get("sponsorship") ?? "any";
  const location = (p.get("location") ?? "").trim().toLowerCase();

  const matches = await prisma.match.findMany({
    where: { userId: user.id },
    orderBy: { relevanceScore: "desc" },
    include: {
      jobListing: { include: { applications: { where: { userId: user.id } } } },
    },
  });

  const queue = matches
    .filter((m) => {
      const app = m.jobListing.applications[0];
      if (app && ACTED.has(app.status)) return false;

      const l = m.jobListing;
      if (m.relevanceScore < minScore) return false;
      if (source !== "all" && l.source !== source) return false;
      if (remoteOnly && !l.isRemote) return false;
      if (seniority !== "any" && l.seniority !== seniority) return false;
      if (minSalary > 0) {
        const top = l.salaryMax ?? l.salaryMin ?? 0;
        if (top < minSalary) return false; // excludes unknown-salary too
      }
      if (sponsorship === "stated" && l.sponsorship !== "stated") return false;
      if (sponsorship === "sponsored" && !["stated", "likely"].includes(l.sponsorship)) return false;
      if (location && !l.location.toLowerCase().includes(location)) return false;
      if (q) {
        const hay = `${l.title} ${l.company} ${l.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .slice(0, limit)
    .map((m) => ({
      matchId: m.id,
      score: m.relevanceScore,
      reasons: JSON.parse(m.reasons) as string[],
      listing: {
        id: m.jobListing.id,
        title: m.jobListing.title,
        company: m.jobListing.company,
        location: m.jobListing.location,
        isRemote: m.jobListing.isRemote,
        url: m.jobListing.url,
        description: m.jobListing.description,
        salaryMin: m.jobListing.salaryMin,
        salaryMax: m.jobListing.salaryMax,
        jobType: m.jobListing.jobType,
        seniority: m.jobListing.seniority,
        postedDate: m.jobListing.postedDate,
        source: m.jobListing.source,
        sponsorship: m.jobListing.sponsorship,
        sponsorshipNote: m.jobListing.sponsorshipNote,
        country: m.jobListing.country,
      },
    }));

  return NextResponse.json({ queue, total: queue.length });
}
