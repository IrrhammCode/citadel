"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Bot, ScrollText, Network, Zap, BrainCircuit, Play, Activity, Vote } from "lucide-react";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/motion";

const navItems = [
  { href: "/demo", label: "Live Demo", icon: Play },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/systems", label: "Systems", icon: Bot },
  { href: "/playground", label: "Playground", icon: BrainCircuit },
  { href: "/agent-dashboard", label: "Agent Control", icon: Activity },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/network", label: "Agent Network", icon: Network },
  { href: "/council", label: "Council", icon: Vote },
  { href: "/relayer", label: "Gas & Relayer", icon: Zap },
  { href: "/billing", label: "AI Billing", icon: BrainCircuit },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45 }}
      className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950"
    >
      <Link
        href="/"
        className="group flex items-center gap-3 border-b border-zinc-800 px-6 py-5 transition-colors hover:bg-zinc-900/50"
      >
        <motion.div
          whileHover={{ rotate: 5, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center rounded-lg overflow-hidden"
        >
          <img src="/logo.png" alt="Citadel" className="h-8 w-8 object-cover" />
        </motion.div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">Citadel</p>
          <p className="text-xs text-zinc-500">Zero-Trust Treasury</p>
        </div>
      </Link>

      <motion.nav
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.07, 0.15)}
        className="flex flex-1 flex-col gap-1 p-4"
      >
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <motion.div key={href} variants={staggerItem}>
              <Link
                href={href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "text-emerald-400"
                    : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-100",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-emerald-500/10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="relative h-4 w-4" />
                <span className="relative">{label}</span>
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="border-t border-zinc-800 p-4"
      >
        <p className="text-xs text-zinc-500">MetaMask Smart Accounts Kit</p>
        <p className="text-xs text-zinc-600">ERC-7715 · Venice AI · Sepolia</p>
        <p className="mt-2 text-[11px] text-zinc-700">v0.1.0</p>
      </motion.div>
    </motion.aside>
  );
}
