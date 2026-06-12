import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Bot,
  ScrollText,
  BrainCircuit,
  Play,
  Activity,
  UserPlus,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

/** Production navigation — core pipeline only */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "flow",
    label: "Core Flow",
    items: [
      {
        href: "/register-agent",
        label: "1. Register Agent",
        icon: UserPlus,
        description: "Register agent + grant ERC-7715 permission",
      },
      {
        href: "/agent-dashboard",
        label: "2. Run Agent",
        icon: Activity,
        description: "Start autonomous cycles — observe, think, audit, execute",
      },
      {
        href: "/dashboard",
        label: "3. Monitor & Results",
        icon: LayoutDashboard,
        description: "Real-time activity feed, stats, and treasury overview",
      },
      {
        href: "/audit-log",
        label: "4. Audit Log",
        icon: ScrollText,
        description: "Complete history of Venice AI decisions",
      },
    ],
  },
  {
    id: "treasury",
    label: "Treasury",
    items: [
      {
        href: "/systems",
        label: "Systems",
        icon: Bot,
        description: "Manage all autonomous agents",
      },
      {
        href: "/billing",
        label: "Venice Billing",
        icon: BrainCircuit,
        description: "Inference usage & x402 balance",
      },
    ],
  },
  {
    id: "demo",
    label: "Demo",
    items: [
      {
        href: "/demo",
        label: "Live Demo",
        icon: Play,
        description: "Orchestrated production pipeline",
      },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function getNavItemForPath(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
