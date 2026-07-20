import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { FUNNEL_STAGES } from "@/lib/types";

// GET /api/dashboard -> daily-goal progress, funnel counts, follow-ups due, queue size.
export async function GET() {
  const user = await getCurrentUser();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [appliedToday, allApps, totalListings, followUps] = await Promise.all([
    prisma.application.count({
      where: { userId: user.id, status: { not: "skipped" }, appliedAt: { gte: startOfToday } },
    }),
    prisma.application.findMany({
      where: { userId: user.id, status: { not: "skipped" } },
      select: { status: true },
    }),
    prisma.jobListing.count(),
    prisma.application.findMany({
      where: {
        userId: user.id,
        status: "applied",
        followUpDate: { lte: new Date() },
      },
      include: { jobListing: { select: { title: true, company: true } } },
      orderBy: { followUpDate: "asc" },
    }),
  ]);

  // Funnel: count applications at or beyond each stage (applied >= all,
  // responded/interview/offer are progressive).
  const statusCounts: Record<string, number> = {};
  for (const a of allApps) statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;

  const funnel = FUNNEL_STAGES.map((stage) => ({
    stage,
    count: statusCounts[stage] ?? 0,
  }));
  const totalApplied = allApps.filter((a) => a.status !== "queued").length;

  return NextResponse.json({
    dailyGoal: user.dailyGoal,
    appliedToday,
    totalApplied,
    funnel,
    statusCounts,
    totalListings,
    followUps: followUps.map((f) => ({
      id: f.id,
      title: f.jobListing.title,
      company: f.jobListing.company,
      followUpDate: f.followUpDate,
    })),
  });
}
