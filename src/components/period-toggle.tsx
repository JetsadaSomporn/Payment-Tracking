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
    <div className="period-toggle">
      {periods.map((p) => (
        <button
          key={p.key}
          onClick={() => setPeriod(p.key)}
          className={`period-btn${current === p.key ? " is-active" : ""}`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
