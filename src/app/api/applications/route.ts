import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";

const FOLLOW_UP_DAYS = 7;

// GET /api/applications -> all applications with their listing (for the tracker).
export async function GET() {
  const user = await getCurrentUser();
  const apps = await prisma.application.findMany({
    where: { userId: user.id, status: { not: "skipped" } },
    orderBy: { lastUpdated: "desc" },
    include: { jobListing: true },
  });
  return NextResponse.json({ applications: apps });
}

// POST /api/applications
//   { jobListingId, action: "skip" }
//   { jobListingId, action: "approve", resumeVersion, coverVersion }
// "approve" = Approve & Open: log the application as Applied with the exact
// documents used, and set a follow-up date.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const { jobListingId, action, resumeVersion, coverVersion } = await req.json();

  const listing = await prisma.jobListing.findUnique({ where: { id: jobListingId } });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  if (action === "skip") {
    const app = await prisma.application.upsert({
      where: { userId_jobListingId: { userId: user.id, jobListingId } },
      update: { status: "skipped" },
      create: { userId: user.id, jobListingId, status: "skipped" },
    });
    return NextResponse.json({ application: app });
  }

  if (action === "approve") {
    const now = new Date();
    const followUp = new Date(now.getTime() + FOLLOW_UP_DAYS * 86_400_000);
    const app = await prisma.application.upsert({
      where: { userId_jobListingId: { userId: user.id, jobListingId } },
      update: {
        status: "applied",
        resumeVersion: resumeVersion ?? null,
        coverVersion: coverVersion ?? null,
        appliedAt: now,
        followUpDate: followUp,
      },
      create: {
        userId: user.id,
        jobListingId,
        status: "applied",
        resumeVersion: resumeVersion ?? null,
        coverVersion: coverVersion ?? null,
        appliedAt: now,
        followUpDate: followUp,
      },
    });
    return NextResponse.json({ application: app, applyUrl: listing.url });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
