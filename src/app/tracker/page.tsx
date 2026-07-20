"use client";

import { useEffect, useState } from "react";
import { APPLICATION_STATUSES } from "@/lib/types";

type App = {
  id: string;
  status: string;
  notes: string;
  appliedAt: string | null;
  followUpDate: string | null;
  resumeVersion: string | null;
  coverVersion: string | null;
  jobListing: { title: string; company: string; url: string };
};

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  responded: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  interview: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  offer: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  rejected: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

export default function TrackerPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<App | null>(null);

  useEffect(() => {
    fetch("/api/applications")
      .then((r) => r.json())
      .then((d) => setApps(d.applications ?? []))
      .finally(() => setLoading(false));
  }, []);

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (d.application) {
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...d.application } : a)));
    }
  };

  if (loading) return <p className="text-neutral-500">Loading applications…</p>;

  const counts: Record<string, number> = {};
  for (const a of apps) counts[a.status] = (counts[a.status] ?? 0) + 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Application tracker</h1>
        <div className="flex gap-2 text-xs">
          {APPLICATION_STATUSES.map((s) => (
            <span key={s} className={`rounded-full px-2 py-0.5 ${STATUS_COLORS[s]}`}>
              {s} {counts[s] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {apps.length === 0 ? (
        <p className="text-neutral-500">
          No applications yet. Head to <a href="/review" className="text-indigo-500 hover:underline">Review</a> and approve some.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 dark:bg-neutral-900 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Applied</th>
                <th className="px-4 py-2">Follow-up</th>
                <th className="px-4 py-2">Notes</th>
                <th className="px-4 py-2">Docs</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => {
                const overdue =
                  a.status === "applied" && a.followUpDate && new Date(a.followUpDate) <= new Date();
                return (
                  <tr key={a.id} className="border-t border-neutral-200 dark:border-neutral-800 align-top">
                    <td className="px-4 py-3">
                      <a href={a.jobListing.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-indigo-500">
                        {a.jobListing.title}
                      </a>
                      <div className="text-neutral-500 text-xs">{a.jobListing.company}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={a.status}
                        onChange={(e) => patch(a.id, { status: e.target.value })}
                        className={`rounded-md px-2 py-1 text-xs font-medium ${STATUS_COLORS[a.status] ?? ""} bg-transparent border border-neutral-300 dark:border-neutral-700`}
                      >
                        {APPLICATION_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">
                      {a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <span className={overdue ? "text-amber-500 font-medium" : "text-neutral-500"}>
                        {a.followUpDate ? new Date(a.followUpDate).toLocaleDateString() : "—"}
                        {overdue ? " ⚠" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[180px]">
                      <input
                        defaultValue={a.notes}
                        onBlur={(e) => e.target.value !== a.notes && patch(a.id, { notes: e.target.value })}
                        placeholder="Add a note…"
                        className="w-full bg-transparent border-b border-transparent focus:border-neutral-400 text-xs py-0.5 outline-none"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {a.resumeVersion || a.coverVersion ? (
                        <button onClick={() => setViewing(a)} className="text-xs text-indigo-500 hover:underline">
                          view
                        </button>
                      ) : (
                        <span className="text-neutral-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-20"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Documents used — {viewing.jobListing.title}
              </h2>
              <button onClick={() => setViewing(null)} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">✕</button>
            </div>
            <p className="text-xs text-neutral-500">Exact versions captured when you clicked Approve &amp; Open.</p>
            <div>
              <h3 className="text-xs font-semibold uppercase text-neutral-500 mb-1">Resume</h3>
              <pre className="text-xs font-mono bg-neutral-50 dark:bg-neutral-950 rounded-md p-3 whitespace-pre-wrap">{viewing.resumeVersion || "—"}</pre>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase text-neutral-500 mb-1">Cover letter</h3>
              <pre className="text-xs bg-neutral-50 dark:bg-neutral-950 rounded-md p-3 whitespace-pre-wrap">{viewing.coverVersion || "—"}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
