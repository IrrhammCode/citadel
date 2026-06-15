"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-[--border-default] bg-[--canvas]">
      {/* Brand */}
      <Link
        href="/"
        className="flex items-center gap-3 border-b border-[--border-default] px-5 py-4 transition-colors hover:bg-white/[0.02]"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[--border-emerald] bg-[--brand-glow] p-1.5">
          <img src="/logo.svg" alt="Citadel" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-[--text-primary]">
            Citadel
          </p>
          <p className="truncate text-[10px] tracking-wider text-[--text-tertiary] uppercase">
            Treasury Platform
          </p>
        </div>
      </Link>

      {/* Grouped navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.15em] text-zinc-600 uppercase">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-[--brand-glow] font-medium text-[--brand-primary]"
                            : "text-[--text-secondary] hover:bg-white/[0.03] hover:text-[--text-primary]",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            active ? "text-[--brand-primary]" : "text-[--text-tertiary]",
                          )}
                        />
                        <span className="truncate">{label}</span>
                        {active && (
                          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[--brand-primary]" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[--border-default] px-5 py-4">
        <p className="text-[10px] text-[--text-muted]">Sepolia · ERC-7715 · Venice AI</p>
      </div>
    </aside>
  );
}
