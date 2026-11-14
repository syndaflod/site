"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FILTERS, parseFilter } from "@/lib/format";

// Row of file types under the menu on /view; "todos" clears the filter.
export function ViewFilter() {
  const active = parseFilter(useSearchParams().get("tipo"));

  return (
    <nav className="view-filter" aria-label="filtrar por tipo">
      <ul>
        {FILTERS.map((filter) => (
          <li key={filter.value}>
            <Link
              href={filter.value === "all" ? "/view" : `/view?tipo=${filter.value}`}
              aria-current={active === filter.value ? "true" : undefined}
              scroll={false}
            >
              {filter.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
