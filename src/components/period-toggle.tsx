"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

const periods = [
  { key: "day", label: "วันนี้" },
  { key: "week", label: "สัปดาห์" },
  { key: "month", label: "เดือน" },
  { key: "all", label: "ทั้งหมด" },
] as const;

export default function PeriodToggle() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const current = searchParams.get("period") ?? "day";

  const setPeriod = (p: string) => {
    const params = new URLSearchParams(searchParams);
    if (p === "day") params.delete("period");
    else params.set("period", p);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5">
      {periods.map((p) => (
        <button
          key={p.key}
          onClick={() => setPeriod(p.key)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            current === p.key
              ? "bg-white/10 text-white"
              : "text-white/30 hover:text-white/60"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
