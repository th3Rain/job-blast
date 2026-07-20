import type { NormalizedListing } from "../types";
import type { JobSource } from "./index";

// HTTP source seam. Adzuna has a free public API (needs ADZUNA_APP_ID +
// ADZUNA_APP_KEY). This is the shape a live, always-on source takes — same
// JobSource contract as the MCP dump, so ingestion is identical. Wired as a
// stub for v1; fill in the fetch when you deploy and want self-serve refresh.
export const adzunaSource: JobSource = {
  name: "adzuna",
  async fetch(): Promise<NormalizedListing[]> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) {
      throw new Error(
        "Adzuna source needs ADZUNA_APP_ID and ADZUNA_APP_KEY. " +
          "Use the `mcp` source for v1, or add keys to .env to enable this."
      );
    }

    // Reference implementation (left unexecuted until keys exist):
    //
    // const url = new URL("https://api.adzuna.com/v1/api/jobs/us/search/1");
    // url.searchParams.set("app_id", appId);
    // url.searchParams.set("app_key", appKey);
    // url.searchParams.set("what", "devops engineer");
    // url.searchParams.set("where", "remote");
    // url.searchParams.set("results_per_page", "50");
    // const res = await fetch(url);
    // const data = await res.json();
    // return data.results.map((j) => ({
    //   source: "adzuna",
    //   sourceJobId: String(j.id),
    //   title: j.title,
    //   company: j.company?.display_name ?? "Unknown",
    //   location: j.location?.display_name ?? "",
    //   isRemote: /remote/i.test(j.location?.display_name ?? ""),
    //   url: j.redirect_url,
    //   description: j.description,
    //   salaryMin: j.salary_min,
    //   salaryMax: j.salary_max,
    //   jobType: j.contract_time,
    //   postedDate: j.created,
    // }));

    return [];
  },
};
