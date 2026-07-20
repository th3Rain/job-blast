import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user";
import { FUNNEL_STAGES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getCurrentUser();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [appliedToday, apps, totalListings, totalMatches, actedCount, followUps] =
    await Promise.all([
      prisma.application.count({
        where: { userId: user.id, status: { not: "skipped" }, appliedAt: { gte: startOfToday } },
      }),
      prisma.application.findMany({
        where: { userId: user.id, status: { not: "skipped" } },
        select: { status: true },
      }),
      prisma.jobListing.count(),
      prisma.match.count({ where: { userId: user.id } }),
      prisma.application.count({
        where: {
          userId: user.id,
          status: { in: ["applied", "approved", "responded", "interview", "rejected", "offer", "skipped"] },
        },
      }),
      prisma.application.findMany({
        where: { userId: user.id, status: "applied", followUpDate: { lte: new Date() } },
        include: { jobListing: { select: { title: true, company: true } } },
        orderBy: { followUpDate: "asc" },
        take: 10,
      }),
    ]);

  const statusCounts: Record<string, number> = {};
  for (const a of apps) statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
  const totalApplied = apps.length;
  const queueRemaining = Math.max(0, totalMatches - actedCount);
  const goalPct = Math.min(100, Math.round((appliedToday / user.dailyGoal) * 100));

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <span className="text-sm text-neutral-500">{user.email}</span>
      </div>

      <section className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-semibold">Today&apos;s goal</h2>
          <span className="text-sm text-neutral-500">
            <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{appliedToday}</span>{" "}
            / {user.dailyGoal} applications
          </span>
        </div>
        <div className="h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${goalPct}%` }} />
        </div>
        <div className="mt-4">
          <Link
            href="/review"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 text-sm font-medium transition-colors"
          >
            Review queue →
            <span className="rounded-full bg-indigo-400/40 px-2 py-0.5 text-xs">{queueRemaining} waiting</span>
          </Link>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Funnel</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {FUNNEL_STAGES.map((stage) => (
            <div
              key={stage}
              className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900"
            >
              <div className="text-2xl font-bold">{statusCounts[stage] ?? 0}</div>
              <div className="text-xs uppercase tracking-wide text-neutral-500 mt-1 capitalize">{stage}</div>
            </div>
          ))}
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900">
            <div className="text-2xl font-bold text-rose-500">{statusCounts["rejected"] ?? 0}</div>
            <div className="text-xs uppercase tracking-wide text-neutral-500 mt-1">Rejected</div>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <Stat label="Listings ingested" value={totalListings} />
        <Stat label="Total applied" value={totalApplied} />
        <Stat label="Follow-ups due" value={followUps.length} accent={followUps.length > 0} />
      </section>

      {followUps.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Follow-ups due (no response after 7 days)</h2>
          <ul className="space-y-2">
            {followUps.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-amber-300/60 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 text-sm flex justify-between"
              >
                <span>
                  <span className="font-medium">{f.jobListing.title}</span>
                  <span className="text-neutral-500"> · {f.jobListing.company}</span>
                </span>
                <span className="text-amber-600 dark:text-amber-400">
                  since {f.followUpDate?.toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900">
      <div className={`text-2xl font-bold ${accent ? "text-amber-500" : ""}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-neutral-500 mt-1">{label}</div>
    </div>
  );
}
