"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { StoragePanel } from "./storage-panel";
import { ViewFilter } from "./view-filter";
import { Mark } from "../mark";

const items = [
  { href: "/drop", label: "drop" },
  { href: "/view", label: "view" },
  { href: "/gallery", label: "gallery" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// The workspace header: the menu centered at the top (the current page gets the accent color
// and a caret). On the /view list a row of file-type filters sits under it and the storage
// panel to its right. Both are separate landmarks, so the menu itself never changes size.
export function WorkspaceNav() {
  const pathname = usePathname();
  const onViewList = pathname === "/view";

  return (
    <header className="workspace-header">
      <nav className="workspace-nav" aria-label="workspace">
        <ul>
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
                <Mark className="workspace-nav-caret" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {onViewList && (
        <Suspense fallback={null}>
          <ViewFilter />
        </Suspense>
      )}
      {onViewList && <StoragePanel />}
    </header>
  );
}
