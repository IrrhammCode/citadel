"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { getNavItemForPath } from "@/lib/navigation";

export function Breadcrumbs() {
  const pathname = usePathname();
  const current = getNavItemForPath(pathname);

  if (pathname === "/") return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[--text-tertiary]">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 transition-colors hover:text-[--text-secondary]"
      >
        <Home className="h-3 w-3" />
        <span className="hidden sm:inline">Home</span>
      </Link>
      {current && (
        <>
          <ChevronRight className="h-3 w-3 text-[--text-muted]" />
          <span className="font-medium text-[--text-secondary]">{current.label}</span>
        </>
      )}
    </nav>
  );
}
