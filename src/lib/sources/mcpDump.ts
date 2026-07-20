import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NormalizedListing } from "../types";
import type { JobSource } from "./index";

// Salaries above this are treated as bad source data (e.g. a listing reporting
// $217,000,000). Drop rather than trust.
const MAX_SANE_SALARY = 1_000_000;

type RawListing = {
  title: string;
  company: string;
  location: string;
  is_remote?: boolean;
  salary?: { min_annual?: number | null; max_annual?: number | null };
  job_type?: string;
  days_ago?: number;
  job_redirect_url: string;
};

type DumpFile = {
  source?: string;
  listings: RawListing[];
};

function saneSalary(v?: number | null): number | undefined {
  if (typeof v !== "number" || v <= 0 || v > MAX_SANE_SALARY) return undefined;
  return Math.round(v);
}

// Reads listings pulled from the connected MCP job search (written to
// data/mcp-listings.json by re-running the search) and normalizes them.
export const mcpDumpSource: JobSource = {
  name: "mcp",
  async fetch(): Promise<NormalizedListing[]> {
    const file = path.join(process.cwd(), "data", "mcp-listings.json");
    const raw = await readFile(file, "utf8");
    const parsed = JSON.parse(raw) as DumpFile;
    const source = parsed.source ?? "mcp:ziprecruiter";
    const now = Date.now();

    return parsed.listings.map((r) => {
      const postedDate =
        typeof r.days_ago === "number"
          ? new Date(now - r.days_ago * 86_400_000).toISOString()
          : undefined;
      // The feed has no full JD; synthesize a short blurb so the review screen
      // and tailoring have material. A live HTTP source populates the real JD.
      const salaryMin = saneSalary(r.salary?.min_annual);
      const salaryMax = saneSalary(r.salary?.max_annual);
      const description = [
        `${r.title} at ${r.company}.`,
        r.job_type ? `Type: ${r.job_type}.` : "",
        r.location && r.location !== "Location not specified"
          ? `Location: ${r.location}.`
          : r.is_remote
            ? "Remote."
            : "",
      ]
        .filter(Boolean)
        .join(" ");

      return {
        source,
        title: r.title,
        company: r.company,
        location: r.location,
        isRemote: Boolean(r.is_remote),
        url: r.job_redirect_url,
        description,
        salaryMin,
        salaryMax,
        jobType: r.job_type,
        postedDate,
      };
    });
  },
};
