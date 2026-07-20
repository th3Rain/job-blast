import { PrismaClient } from "@prisma/client";
import { getSource } from "../src/lib/sources";
import { dedupKey, inferSeniority, detectSponsorship } from "../src/lib/normalize";
import type { NormalizedListing } from "../src/lib/types";

const prisma = new PrismaClient();

// Ingest: pull normalized listings from a JobSource, dedup, and upsert into the
// DB. Re-running is the v1 "daily refresh". Usage: `npm run ingest [sourceName]`
async function main() {
  const sourceName = process.argv[2] ?? "mcp";
  const source = getSource(sourceName);

  console.log(`Fetching from source "${source.name}"...`);
  const listings = await source.fetch();
  console.log(`Fetched ${listings.length} listings.`);

  let created = 0;
  let refreshed = 0;
  let skippedDup = 0;
  const seenKeys = new Set<string>();

  for (const l of listings) {
    const key = dedupKey(l.company, l.title);

    // Collapse duplicates within this batch (aggregators re-list the same job).
    if (seenKeys.has(key)) {
      skippedDup++;
      continue;
    }
    seenKeys.add(key);

    // Collapse against listings already in the DB from a previous run.
    const existing = await prisma.jobListing.findFirst({ where: { dedupKey: key } });
    if (existing) {
      await prisma.jobListing.update({
        where: { id: existing.id },
        data: { fetchedAt: new Date() },
      });
      refreshed++;
      continue;
    }

    await createListing(l, key);
    created++;
  }

  console.log(
    `Done. created=${created} refreshed=${refreshed} skippedDuplicate=${skippedDup}`
  );
  console.log("Next: run `npm run score` to rank the queue against your profile.");
}

async function createListing(l: NormalizedListing, key: string) {
  const sponsorship = detectSponsorship(l.title, l.description ?? "", l.company);
  await prisma.jobListing.create({
    data: {
      source: l.source,
      sourceJobId: l.sourceJobId,
      title: l.title,
      company: l.company,
      location: l.location,
      isRemote: l.isRemote,
      url: l.url,
      description: l.description ?? "",
      salaryMin: l.salaryMin,
      salaryMax: l.salaryMax,
      jobType: l.jobType,
      country: l.country,
      seniority: inferSeniority(l.title),
      sponsorship: sponsorship.level,
      sponsorshipNote: sponsorship.note,
      postedDate: l.postedDate ? new Date(l.postedDate) : undefined,
      dedupKey: key,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
