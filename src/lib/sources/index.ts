import type { NormalizedListing } from "../types";
import { mcpDumpSource } from "./mcpDump";
import { indeedSource } from "./indeed";
import { adzunaSource } from "./adzuna";

// A JobSource turns some upstream feed into normalized listings. Every source —
// the MCP dump today, Adzuna/Greenhouse/Lever over HTTP tomorrow — implements
// this same shape, so ingestion and the rest of the app never change.
export type JobSource = {
  name: string;
  fetch: () => Promise<NormalizedListing[]>;
};

const SOURCES: Record<string, JobSource> = {
  mcp: mcpDumpSource,
  indeed: indeedSource,
  adzuna: adzunaSource,
};

export function getSource(name: string): JobSource {
  const src = SOURCES[name];
  if (!src) {
    throw new Error(
      `Unknown job source "${name}". Available: ${Object.keys(SOURCES).join(", ")}`
    );
  }
  return src;
}
