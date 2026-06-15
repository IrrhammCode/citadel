"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Shield,
  Bot,
  Sparkles,
  Lock,
  ArrowRight,
  CheckCircle2,
  Zap,
  UserPlus,
  Activity,
  ScrollText,
  AlertTriangle,
} from "lucide-react";
import { LandingCta } from "@/components/landing/landing-cta";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/premium/glass-card";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";

const HeroScene = dynamic(
  () => import("@/components/3d/hero-scene").then((m) => m.HeroScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-[--border-default] bg-[--canvas-elevated]/60">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[--border-emerald] border-t-[--brand-primary]" />
      </div>
    ),
  },
);

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it Works" },
  { href: "#features", label: "Features" },
  { href: "#get-started", label: "Get Started" },
];

const features = [
  {
    icon: UserPlus,
    title: "Register Agent",
    description:
      "Unified wizard: identity, mandate, Venice policy, and ERC-7715 grant in one flow.",
  },
  {
    icon: Sparkles,
    title: "Venice AI Core Intelligence",
    description:
      "Permissionless reasoning, risk analysis, report generation, and conversational CFO insights — all powered by Venice across text, logic, and visual outputs.",
  },
  {
    icon: Zap,
    title: "Delegated Execution",
    description:
      "ERC-7715 session accounts execute on-chain only after Venice approval.",
  },
];

const flowSteps = [
  {
    step: "1",
    icon: UserPlus,
    title: "Register Agent",
    body: "CFO registers the agent, sets budget & KPIs, and grants permission via MetaMask.",
    href: "/register-agent",
  },
  {
    step: "2",
    icon: Activity,
    title: "Run Agent",
    body: "Autonomous agent: observe → Venice think → audit gate → execute.",
    href: "/agent-dashboard",
  },
  {
    step: "3",
    icon: Bot,
    title: "Results Delivered",
    body: "Activity feed, audit log, and reports flow into the CFO dashboard.",
    href: "/dashboard",
  },
  {
    step: "4",
    icon: ScrollText,
    title: "Venice Audit Trail",
    body: "Every decision is recorded with reasoning, confidence scores, and flags.",
    href: "/audit-log",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050508]">
      <header className="sticky top-0 z-30 border-b border-[--border-default] bg-[--canvas]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[--border-emerald] bg-[--brand-glow] p-1">
              <img src="/logo.svg" alt="Citadel" className="h-full w-full object-contain" />
            </div>
            <span className="font-display text-lg font-semibold text-[--text-primary]">Citadel</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm text-zinc-500 transition-colors hover:text-zinc-200">
                {link.label}
              </a>
            ))}
          </nav>
          <LandingCta size="sm" />
        </div>
      </header>

      <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 text-center backdrop-blur-md">
        <p className="mx-auto flex max-w-4xl items-center justify-center gap-2 text-sm text-amber-200/90">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            <strong>Notice:</strong> The default Venice AI API key has run out of credits. Please use the <strong>Bring Your Own Key (BYOK)</strong> feature in Settings to set your own Venice AI API key.
          </span>
        </p>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <FadeIn>
            <Badge variant="approved" className="mb-5">
              MetaMask Smart Accounts × Venice AI × 1Shot
            </Badge>
            <h1 className="font-display text-4xl leading-tight font-medium text-[--text-primary] md:text-5xl lg:text-6xl">
              Autonomous agents.
              <br />
              <span className="text-gradient-emerald">Powered by Venice intelligence.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-[--text-secondary]">
              Register agent → autonomous cycle (observe → Venice think → audit gate → execute) → results in dashboard.
              Fail-closed. Zero trust by default.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LandingCta size="lg" />
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-[--border-default] px-5 py-2.5 text-sm text-[--text-secondary] transition-colors hover:border-[--border-emerald] hover:text-[--text-primary]"
              >
                View the workflow
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[--brand-glow] to-[rgba(16,185,129,0.03)] blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-[--border-default] bg-[--canvas-elevated]/60">
                <HeroScene className="h-[300px] w-full md:h-[380px]" />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-[--border-default] bg-[--canvas-elevated]/30 py-20">
        <div className="mx-auto max-w-[1280px] px-6">
          <FadeIn className="mb-12 text-center">
            <p className="text-xs tracking-[0.2em] text-[--text-tertiary] uppercase">Secure Pipeline</p>
            <h2 className="font-display mt-2 text-3xl font-medium text-[--text-primary]">
              Register → Run → Deliver
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-[--text-secondary]">
              Fail-closed vault flow. Every step audited by Venice AI. No bypass.
            </p>
          </FadeIn>

          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.08}>
            {flowSteps.map(({ step, icon: Icon, title, body, href }) => (
              <StaggerItem key={step}>
                <Link href={href}>
                  <GlassCard tilt={false} className="group h-full p-6 transition-colors hover:border-[--border-emerald]">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[--border-emerald] bg-[--brand-glow] text-sm font-semibold text-[--brand-primary]">
                        {step}
                      </div>
                      <Icon className="h-5 w-5 text-[--brand-primary] opacity-70 group-hover:opacity-100" />
                    </div>
                    <h3 className="font-medium text-[--text-primary] group-hover:text-[--brand-primary] transition-colors">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[--text-secondary]">{body}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs text-[--text-muted] group-hover:text-[--brand-primary]">
                      Start <ArrowRight className="h-3 w-3" />
                    </span>
                  </GlassCard>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="mx-auto max-w-[1280px] px-6">
          <FadeIn className="mb-12">
            <p className="text-xs tracking-[0.2em] text-[--text-tertiary] uppercase">Core Capabilities</p>
            <h2 className="font-display mt-2 text-3xl font-medium text-[--text-primary]">Venice AI + Autonomous Agents + MetaMask Permissions</h2>
          </FadeIn>
          <Stagger className="grid gap-5 md:grid-cols-3" stagger={0.1}>
            {features.map(({ icon: Icon, title, description }) => (
              <StaggerItem key={title}>
                <GlassCard className="h-full p-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="font-medium text-zinc-100">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p>
                </GlassCard>
              </StaggerItem>
            ))}
          </Stagger>
          <FadeIn className="mt-10">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {["ERC-7715 permissions", "Venice fail-closed audit", "Real-time activity feed", "x402 observability"].map((item) => (
                <span key={item} className="flex items-center gap-2 text-sm text-zinc-500">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500/70" />
                  {item}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <section id="get-started" className="border-t border-[--border-default] py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <FadeIn>
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[--border-emerald] bg-[--brand-glow]">
              <Bot className="h-6 w-6 text-[--brand-primary]" />
            </div>
            <h2 className="font-display text-3xl font-medium text-[--text-primary]">Start with Register Agent</h2>
            <p className="mt-3 text-sm text-[--text-secondary]">
              Connect MetaMask, define agent mandate + Venice policy, grant ERC-7715 permission. Then run autonomous cycles.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <LandingCta size="lg" />
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-5 py-2.5 text-sm text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              >
                <Lock className="h-4 w-4" />
                View Live Demo
              </Link>
            </div>
            <p className="mt-4 text-[11px] text-zinc-600">MetaMask + ERC-7715 · Sepolia testnet</p>
          </FadeIn>
        </div>
      </section>

      <footer className="border-t border-[--border-default] py-8">
        <div className="mx-auto max-w-[1280px] px-6 text-center">
          <p className="text-xs text-[--text-muted]">Citadel · Zero-Trust Corporate Treasury · Vault-grade security</p>
        </div>
      </footer>
    </div>
  );
}
