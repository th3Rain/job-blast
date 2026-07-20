import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, parseProfile } from "@/lib/user";
import { tailorApplication } from "@/lib/tailor";

// POST { jobListingId, tone? } -> tailored resume + cover letter + original (for diff).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const profile = parseProfile(user);
  const { jobListingId, tone } = await req.json();

  const listing = await prisma.jobListing.findUnique({ where: { id: jobListingId } });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const salaryRange =
    listing.salaryMin || listing.salaryMax
      ? `$${(listing.salaryMin ?? listing.salaryMax)?.toLocaleString()}${
          listing.salaryMax && listing.salaryMin ? `–$${listing.salaryMax.toLocaleString()}` : ""
        }`
      : undefined;

  const result = await tailorApplication({
    masterResume: profile.masterResume,
    coverTemplates: profile.coverTemplates,
    jobTitle: listing.title,
    company: listing.company,
    jobDescription: listing.description,
    salaryRange,
    tone,
  });

  return NextResponse.json({
    ...result,
    originalResume: profile.masterResume,
  });
}
