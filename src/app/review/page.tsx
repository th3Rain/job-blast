"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lineDiff } from "@/lib/diff";

type Listing = {
  id: string;
  title: string;
  company: string;
  location: string;
  isRemote: boolean;
  url: string;
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  jobType: string | null;
  seniority: string | null;
  source: string;
  sponsorship: string;
  sponsorshipNote: string;
  country: string | null;
};

type QueueItem = { matchId: string; score: number; reasons: string[]; listing: Listing };

type Filters = {
  source: string;
  minScore: string;
  sponsorship: string;
  remote: boolean;
  seniority: string;
  minSalary: string;
  q: string;
  location: string;
};

const DEFAULT_FILTERS: Filters = {
  source: "all",
  minScore: "0",
  sponsorship: "any",
  remote: false,
  seniority: "any",
  minSalary: "0",
  q: "",
  location: "",
};

const SPONSORSHIP_STYLES: Record<string, string> = {
  stated: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  likely: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  confirm: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  unknown: "bg-neutral-500/15 text-neutral-500",
};

const SPONSORSHIP_LABEL: Record<string, string> = {
  stated: "sponsorship stated",
  likely: "sponsorship likely",
  confirm: "confirm sponsorship",
  unknown: "sponsorship unclear",
};

type Tailored = {
  resume: string;
  coverLetter: string;
  emphasizedKeywords: string[];
  engine: "claude" | "template";
  originalResume: string;
  listingId: string; // which listing this tailoring is for
};

function salaryText(l: Listing): string | null {
  if (!l.salaryMin && !l.salaryMax) return null;
  const fmt = (n: number) => `€${(n / 1000).toFixed(0)}k`;
  if (l.salaryMin && l.salaryMax) return `${fmt(l.salaryMin)}–${fmt(l.salaryMax)}`;
  return fmt((l.salaryMin ?? l.salaryMax)!);
}

export default function ReviewPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [tailored, setTailored] = useState<Tailored | null>(null);
  const [editedResume, setEditedResume] = useState("");
  const [editedCover, setEditedCover] = useState("");
  const [tone, setTone] = useState("professional");
  const [showDiff, setShowDiff] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);

  const current = queue[index];
  const editingRef = useRef(false);
  // Derived loading state — avoids a synchronous setState in the tailoring effect.
  const tailoring = !!current && tailored?.listingId !== current.listing.id;

  // Load / reload the queue whenever filters change (debounced for text inputs).
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.source !== "all") params.set("source", filters.source);
    if (filters.minScore !== "0") params.set("minScore", filters.minScore);
    if (filters.sponsorship !== "any") params.set("sponsorship", filters.sponsorship);
    if (filters.remote) params.set("remote", "true");
    if (filters.seniority !== "any") params.set("seniority", filters.seniority);
    if (filters.minSalary !== "0") params.set("minSalary", filters.minSalary);
    if (filters.q) params.set("q", filters.q);
    if (filters.location) params.set("location", filters.location);

    const t = setTimeout(() => {
      setLoadingQueue(true);
      fetch(`/api/queue?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => {
          setQueue(d.queue ?? []);
          setIndex(0);
        })
        .finally(() => setLoadingQueue(false));
    }, 250);
    return () => clearTimeout(t);
  }, [filters]);

  // Tailor whenever the current listing (or tone) changes. All state updates
  // happen in async callbacks, so the effect never sets state synchronously.
  useEffect(() => {
    if (!current) return;
    const id = current.listing.id;
    let cancelled = false;
    fetch("/api/tailor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobListingId: id, tone }),
    })
      .then((r) => r.json())
      .then((d: Omit<Tailored, "listingId">) => {
        if (cancelled) return;
        setTailored({ ...d, listingId: id });
        setEditedResume(d.resume);
        setEditedCover(d.coverLetter);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.listing.id, tone]);

  const showFlash = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1800);
  };

  const advance = useCallback(() => {
    // Remove current item; index stays pointing at the next one.
    setQueue((q) => q.filter((_, i) => i !== index));
    setIndex((i) => Math.max(0, Math.min(i, queue.length - 2)));
  }, [index, queue.length]);

  const skip = useCallback(async () => {
    if (!current) return;
    await fetch("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobListingId: current.listing.id, action: "skip" }),
    });
    showFlash("Skipped");
    advance();
  }, [current, advance]);

  const approveAndOpen = useCallback(async () => {
    if (!current) return;
    const bundle = `RESUME\n======\n${editedResume}\n\n\nCOVER LETTER\n============\n${editedCover}`;
    try {
      await navigator.clipboard.writeText(bundle);
    } catch {
      /* clipboard may be blocked; proceed anyway */
    }
    window.open(current.listing.url, "_blank", "noopener");
    await fetch("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jobListingId: current.listing.id,
        action: "approve",
        resumeVersion: editedResume,
        coverVersion: editedCover,
      }),
    });
    showFlash("Applied — docs copied to clipboard, application page opened");
    advance();
  }, [current, editedResume, editedCover, advance]);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, queue.length - 1)), [queue.length]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  // Keyboard shortcuts (disabled while typing in a textarea/input).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (editingRef.current || tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (e.key === "a" || e.key === "A") { e.preventDefault(); approveAndOpen(); }
      else if (e.key === "s" || e.key === "S") { e.preventDefault(); skip(); }
      else if (e.key === "j" || e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "k" || e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "d" || e.key === "D") { e.preventDefault(); setShowDiff((s) => !s); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [approveAndOpen, skip, next, prev]);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Review</h1>
        <div className="text-sm text-neutral-500">
          {loadingQueue ? "loading…" : `${queue.length ? index + 1 : 0} / ${queue.length} in queue`}
        </div>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />

      {flash && (
        <div className="rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-4 py-2 text-sm">
          {flash}
        </div>
      )}

      {loadingQueue ? (
        <p className="text-neutral-500 py-10 text-center">Loading queue…</p>
      ) : !current ? (
        <div className="text-center py-16">
          <p className="text-lg font-medium">No matches for these filters</p>
          <p className="text-neutral-500 mt-2 text-sm">
            Loosen the filters above, or run{" "}
            <code className="font-mono">npm run ingest indeed &amp;&amp; npm run score</code> to pull more.
          </p>
        </div>
      ) : (
        (() => {
          const l = current.listing;
          const sal = salaryText(l);
          return (
            <>
              <div className="grid lg:grid-cols-2 gap-4">
        {/* Left: the job */}
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{l.title}</h2>
              <p className="text-neutral-500">
                {l.company} · {l.isRemote ? "Remote" : l.location}
              </p>
            </div>
            <ScoreBadge score={current.score} />
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 ${SPONSORSHIP_STYLES[l.sponsorship] ?? SPONSORSHIP_STYLES.unknown}`}
              title={l.sponsorshipNote || "No sponsorship signal"}
            >
              {SPONSORSHIP_LABEL[l.sponsorship] ?? l.sponsorship}
            </span>
            {sal && <Chip>{sal}</Chip>}
            {l.jobType && <Chip>{l.jobType}</Chip>}
            {l.seniority && <Chip>{l.seniority}</Chip>}
            <Chip>{l.source}</Chip>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase text-neutral-500 mb-1">Why this matched</h3>
            <ul className="text-sm space-y-1">
              {current.reasons.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-indigo-500">•</span> {r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase text-neutral-500 mb-1">Description</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">{l.description}</p>
          </div>
          <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline break-all">
            {l.url}
          </a>
        </section>

        {/* Right: tailored docs */}
        <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Tailored documents</h2>
            <div className="flex items-center gap-2">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1"
              >
                <option value="professional">Professional</option>
                <option value="direct">Direct</option>
                <option value="warm">Warm</option>
              </select>
              {tailored && (
                <span
                  className={`text-xs rounded-full px-2 py-0.5 ${
                    tailored.engine === "claude"
                      ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                      : "bg-neutral-500/15 text-neutral-500"
                  }`}
                  title={tailored.engine === "claude" ? "Tailored by Claude" : "Template fallback (set ANTHROPIC_API_KEY for Claude)"}
                >
                  {tailored.engine === "claude" ? "Claude" : "template"}
                </span>
              )}
            </div>
          </div>

          {tailoring && <p className="text-sm text-neutral-500">Tailoring…</p>}

          {tailored && !tailoring && (
            <>
              {tailored.emphasizedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tailored.emphasizedKeywords.map((k) => (
                    <span key={k} className="text-xs rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5">
                      {k}
                    </span>
                  ))}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold uppercase text-neutral-500">Resume</h3>
                  <button
                    onClick={() => setShowDiff((s) => !s)}
                    className="text-xs text-indigo-500 hover:underline"
                  >
                    {showDiff ? "Edit" : "Show diff"} <span className="text-neutral-400">(d)</span>
                  </button>
                </div>
                {showDiff ? (
                  <DiffView original={tailored.originalResume} tailored={editedResume} />
                ) : (
                  <textarea
                    value={editedResume}
                    onChange={(e) => setEditedResume(e.target.value)}
                    onFocus={() => (editingRef.current = true)}
                    onBlur={() => (editingRef.current = false)}
                    className="w-full h-56 text-xs font-mono rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 p-2"
                  />
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase text-neutral-500 mb-1">Cover letter</h3>
                <textarea
                  value={editedCover}
                  onChange={(e) => setEditedCover(e.target.value)}
                  onFocus={() => (editingRef.current = true)}
                  onBlur={() => (editingRef.current = false)}
                  className="w-full h-40 text-sm rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 p-2"
                />
              </div>
            </>
          )}
        </section>
      </div>

      {/* Action bar */}
      <div className="sticky bottom-4 flex items-center justify-center gap-3">
        <div className="flex items-center gap-3 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur px-4 py-2 shadow-lg">
          <button onClick={prev} className="px-3 py-1.5 text-sm rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Previous (k)">←</button>
          <button
            onClick={skip}
            className="px-4 py-1.5 text-sm rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 font-medium"
            title="Skip (s)"
          >
            Skip <kbd className="text-neutral-400">s</kbd>
          </button>
          <button
            onClick={approveAndOpen}
            className="px-5 py-1.5 text-sm rounded-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold"
            title="Approve & Open (a)"
          >
            Approve &amp; Open <kbd className="text-indigo-200">a</kbd>
          </button>
          <button onClick={next} className="px-3 py-1.5 text-sm rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Next (j)">→</button>
        </div>
      </div>
            </>
          );
        })()
      )}
    </div>
  );
}

function FilterBar({
  filters,
  setFilters,
  onReset,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onReset: () => void;
}) {
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const sel = "text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1.5";
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
      <input
        value={filters.q}
        onChange={(e) => set({ q: e.target.value })}
        placeholder="Search title, company, skills…"
        className={`${sel} flex-1 min-w-[180px]`}
      />
      <select value={filters.sponsorship} onChange={(e) => set({ sponsorship: e.target.value })} className={sel} title="Sponsorship">
        <option value="any">Any sponsorship</option>
        <option value="sponsored">Sponsorship stated/likely</option>
        <option value="stated">Sponsorship stated only</option>
      </select>
      <select value={filters.source} onChange={(e) => set({ source: e.target.value })} className={sel} title="Source">
        <option value="all">All sources</option>
        <option value="indeed">Indeed</option>
        <option value="mcp">ZipRecruiter</option>
      </select>
      <select value={filters.seniority} onChange={(e) => set({ seniority: e.target.value })} className={sel} title="Seniority">
        <option value="any">Any level</option>
        <option value="junior">Junior</option>
        <option value="mid">Mid</option>
        <option value="senior">Senior</option>
        <option value="lead">Lead/Principal</option>
      </select>
      <select value={filters.minScore} onChange={(e) => set({ minScore: e.target.value })} className={sel} title="Minimum match score">
        <option value="0">Any score</option>
        <option value="50">50+ match</option>
        <option value="70">70+ match</option>
        <option value="85">85+ match</option>
      </select>
      <select value={filters.minSalary} onChange={(e) => set({ minSalary: e.target.value })} className={sel} title="Minimum salary (excludes unlisted)">
        <option value="0">Any salary</option>
        <option value="60000">€60k+</option>
        <option value="80000">€80k+</option>
        <option value="100000">€100k+</option>
      </select>
      <input
        value={filters.location}
        onChange={(e) => set({ location: e.target.value })}
        placeholder="Location"
        className={`${sel} w-28`}
      />
      <label className="flex items-center gap-1.5 text-xs px-1">
        <input type="checkbox" checked={filters.remote} onChange={(e) => set({ remote: e.target.checked })} />
        Remote
      </label>
      {!isDefault && (
        <button onClick={onReset} className="text-xs text-indigo-500 hover:underline px-1">
          Clear filters
        </button>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-emerald-500" : score >= 45 ? "bg-amber-500" : "bg-neutral-400";
  return (
    <div className={`shrink-0 ${color} text-white rounded-lg w-14 h-14 flex flex-col items-center justify-center`}>
      <span className="text-lg font-bold leading-none">{score}</span>
      <span className="text-[10px] uppercase opacity-80">match</span>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-neutral-600 dark:text-neutral-300">
      {children}
    </span>
  );
}

function DiffView({ original, tailored }: { original: string; tailored: string }) {
  const diff = lineDiff(original, tailored);
  return (
    <div className="h-56 overflow-auto text-xs font-mono rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 p-2 space-y-0.5">
      {diff.map((d, i) => (
        <div
          key={i}
          className={
            d.type === "add"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : d.type === "del"
                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 line-through opacity-70"
                : "text-neutral-600 dark:text-neutral-400"
          }
        >
          <span className="select-none opacity-50 mr-1">{d.type === "add" ? "+" : d.type === "del" ? "−" : " "}</span>
          {d.text || " "}
        </div>
      ))}
    </div>
  );
}
