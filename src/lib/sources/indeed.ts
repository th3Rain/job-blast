import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NormalizedListing } from "../types";
import type { JobSource } from "./index";

type RawIndeed = {
  sourceJobId?: string;
  title: string;
  company: string;
  location: string;
  is_remote?: boolean;
  job_type?: string;
  posted?: string; // ISO date
  salary_min?: number;
  salary_max?: number;
  url: string;
  description?: string;
};

type DumpFile = {
  source?: string;
  country?: string;
  listings: RawIndeed[];
};

// Reads Ireland listings pulled from the connected Indeed MCP tool
// (search_jobs + get_job_details, written to data/indeed-listings.json) and
// normalizes them. Sponsorship is detected downstream in ingest.
export const indeedSource: JobSource = {
  name: "indeed",
  async fetch(): Promise<NormalizedListing[]> {
    const file = path.join(process.cwd(), "data", "indeed-listings.json");
    const parsed = JSON.parse(await readFile(file, "utf8")) as DumpFile;
    const source = parsed.source ?? "indeed";
    const country = parsed.country ?? "IE";

    return parsed.listings.map((r) => ({
      source,
      sourceJobId: r.sourceJobId,
      title: r.title,
      company: r.company,
      location: r.location,
      isRemote: Boolean(r.is_remote) || /remote/i.test(r.location),
      url: r.url,
      description: r.description ?? "",
      salaryMin: r.salary_min,
      salaryMax: r.salary_max,
      jobType: r.job_type,
      country,
      postedDate: r.posted ? new Date(r.posted).toISOString() : undefined,
    }));
  },
};
