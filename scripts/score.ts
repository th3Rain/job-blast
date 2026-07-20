import { PrismaClient } from "@prisma/client";
import {
  scoreListing,
  extractResumeSkills,
  type ScoreProfile,
  type SponsorshipLevel,
} from "../src/lib/scoring";
import type { Seniority } from "../src/lib/types";

const prisma = new PrismaClient();

// Score every listing against the user's profile and upsert Match rows.
// Re-run after ingestion or whenever the profile changes.
async function main() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("No user. Run `npm run seed` first.");

  const profile: ScoreProfile = {
    targetRoles: JSON.parse(user.targetRoles),
    targetLocations: JSON.parse(user.targetLocations),
    salaryFloor: user.salaryFloor,
    excludedCompanies: JSON.parse(user.excludedCompanies),
    resumeSkills: extractResumeSkills(user.masterResume),
    desiredSeniority: ["mid", "senior", "lead"],
    sponsorshipRequired: user.sponsorshipRequired,
  };

  const listings = await prisma.jobListing.findMany();
  let scored = 0;

  for (const l of listings) {
    const { score, reasons } = scoreListing(profile, {
      title: l.title,
      company: l.company,
      description: l.description,
      location: l.location,
      isRemote: l.isRemote,
      salaryMin: l.salaryMin,
      salaryMax: l.salaryMax,
      seniority: (l.seniority as Seniority | null) ?? undefined,
      sponsorship: l.sponsorship as SponsorshipLevel,
    });

    await prisma.match.upsert({
      where: { userId_jobListingId: { userId: user.id, jobListingId: l.id } },
      update: { relevanceScore: score, reasons: JSON.stringify(reasons) },
      create: {
        userId: user.id,
        jobListingId: l.id,
        relevanceScore: score,
        reasons: JSON.stringify(reasons),
      },
    });
    scored++;
  }

  const top = await prisma.match.findMany({
    where: { userId: user.id },
    orderBy: { relevanceScore: "desc" },
    take: 5,
    include: { jobListing: true },
  });

  console.log(`Scored ${scored} listings. Top matches:`);
  for (const m of top) {
    console.log(`  ${m.relevanceScore}  ${m.jobListing.title} @ ${m.jobListing.company}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
