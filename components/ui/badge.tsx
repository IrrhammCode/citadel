import * as React from "react";
import { cn } from "@/lib/utils";

const badgeClassMap: Record<string, string> = {
  default: "badge-approved border-[--border-emerald] bg-[rgba(16,185,129,0.15)] text-[--brand-primary]",
  approved: "badge-approved border-[--border-emerald] bg-[rgba(16,185,129,0.15)] text-[--brand-primary]",
  blocked: "badge-blocked border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.15)] text-[#ef4444]",
  pending: "badge-pending border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.15)] text-[#f59e0b]",
  gold: "border-[rgba(201,169,98,0.25)] bg-[rgba(201,169,98,0.08)] text-[#c9a962]",
  secondary: "border-[--border-default] bg-[--canvas-elevated] text-[--text-secondary]",
  destructive: "border-red-500/25 bg-red-500/10 text-red-400",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-400",
  outline: "border-[--border-default] text-[--text-secondary]",
  active: "border-[--status-active]/30 bg-[rgba(59,130,246,0.12)] text-[--status-active]",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeClassMap;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const classes = badgeClassMap[variant] || badgeClassMap.default;
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide transition-colors",
        classes,
        className
      )}
      {...props}
    />
  );
}

export { Badge };
