"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Bot,
  Sparkles,
  Lock,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { LandingCta } from "@/components/landing/landing-cta";
import { Badge } from "@/components/ui/badge";
import { FadeIn, Stagger, StaggerItem, PulseGlow } from "@/components/motion/motion";
import { fadeLeft, scaleIn } from "@/lib/motion";

const features = [
  {
    icon: Lock,
    title: "Granular Permissions",
    description:
      "Issue scoped ERC-7715 Advanced Permissions via MetaMask. Set daily spend limits, expiry, and justification — all in one human-readable approval.",
  },
  {
    icon: Sparkles,
    title: "Venice AI Firewall",
    description:
      "Every spend request is audited in real-time by a private Venice AI model. Approve or block with structured reasoning before a single wei moves.",
  },
  {
    icon: Zap,
    title: "Gasless Execution",
    description:
      "Approved transactions execute via ERC-7710 delegation. Session accounts redeem permissions on behalf of your treasury — no manual signing per spend.",
  },
];

const flowSteps = [
  { step: "01", title: "CFO grants permission", body: "MetaMask Advanced Permissions popup with scoped USDC limits." },
  { step: "02", title: "Agent requests spend", body: "Autonomous system submits vendor payment with memo and context." },
  { step: "03", title: "Venice audits", body: "Private AI compliance check — policy, limits, anomalies, injection." },
  { step: "04", title: "Execute or block", body: "Approved spends redeem on-chain. Blocked spends halt with reasoning." },
];

const stack = ["MetaMask Smart Accounts Kit", "ERC-7715", "ERC-7710", "Venice AI", "Sepolia"];

const heroStats = [
  { label: "Permission scope", value: "10 USDC / day", status: "ERC-7715" },
  { label: "Venice verdict", value: "Approved", status: "92% confidence" },
  { label: "Execution", value: "Delegated", status: "Gasless" },
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f]">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        <PulseGlow className="-left-32 top-0 h-[500px] w-[500px] bg-emerald-600/10 blur-[120px]" />
        <PulseGlow className="-right-32 top-1/3 h-[400px] w-[400px] bg-emerald-500/5 blur-[100px]" />
        <motion.div
          className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-zinc-800/20 blur-[80px]"
          animate={{ opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
          animate={{ backgroundPosition: ["0px 0px", "64px 64px"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Nav */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 border-b border-zinc-800/60 bg-[#0a0a0f]/80 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="group flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="flex items-center justify-center rounded-lg overflow-hidden"
            >
              <img src="/logo.png" alt="Citadel" className="h-8 w-8 object-cover" />
            </motion.div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Citadel</p>
              <p className="text-xs text-zinc-500">Zero-Trust Treasury</p>
            </div>
          </Link>
          <Stagger className="hidden items-center gap-2 sm:flex" stagger={0.06}>
            {stack.slice(0, 3).map((tag) => (
              <StaggerItem key={tag}>
                <Badge variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-20 md:pt-28">
        {/* Emerald radial glow behind hero */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "700px",
            height: "500px",
            background:
              "radial-gradient(ellipse at center, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <FadeIn className="max-w-3xl relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Badge variant="default" className="mb-6">
              MetaMask Smart Accounts Kit Hackathon
            </Badge>
          </motion.div>
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-zinc-50 md:text-6xl">
            Corporate treasury,{" "}
            <motion.span
              className="inline-block bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              zero trust
            </motion.span>{" "}
            by design.
          </h1>
          <motion.p
            className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Citadel lets CFOs issue granular on-chain permissions to autonomous
            systems. Every spending attempt is audited by Venice AI before
            execution — so agents move fast, but never outside policy.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <LandingCta size="lg" />
            <motion.div whileHover={{ x: 4 }}>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                See how it works
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>
        </FadeIn>

        <FadeIn delay={0.2} variants={scaleIn} className="mt-16">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm md:p-8">
            <Stagger className="grid gap-4 md:grid-cols-3" stagger={0.12}>
              {heroStats.map((item) => (
                <StaggerItem key={item.label}>
                  <motion.div
                    whileHover={{ y: -6, borderColor: "rgba(16,185,129,0.2)" }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 transition-colors duration-200"
                  >
                    <p className="text-xs uppercase tracking-wider text-zinc-500">
                      {item.label}
                    </p>
                    <motion.p
                      className="mt-2 text-xl font-semibold text-zinc-100"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {item.value}
                    </motion.p>
                    <p className="mt-1 text-xs text-emerald-400">{item.status}</p>
                  </motion.div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </FadeIn>
      </section>

      {/* Features */}
      <section className="relative z-10 border-t border-zinc-800/60 bg-zinc-950/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-100">
              Built for autonomous finance
            </h2>
            <p className="mt-4 text-zinc-400">
              Three layers of control: wallet-native permissions, AI compliance,
              and delegated execution.
            </p>
          </FadeIn>
          <Stagger className="grid gap-6 md:grid-cols-3" stagger={0.1}>
            {features.map(({ icon: Icon, title, description }) => (
              <StaggerItem key={title}>
                <motion.div
                  whileHover={{ y: -6, borderColor: "rgba(39,39,42,0.9)" }}
                  className="h-full rounded-xl border border-zinc-800 bg-zinc-900/30 p-6"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10"
                  >
                    <Icon className="h-5 w-5 text-emerald-400" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {description}
                  </p>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative z-10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <FadeIn className="mb-12 flex items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-100">
                How Citadel works
              </h2>
              <p className="mt-4 text-zinc-400">
                From permission grant to on-chain execution in four steps.
              </p>
            </div>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="hidden md:block"
            >
              <Bot className="h-12 w-12 text-zinc-700" />
            </motion.div>
          </FadeIn>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.1}>
            {flowSteps.map(({ step, title, body }) => (
              <StaggerItem key={step}>
                <motion.div
                  whileHover={{ scale: 1.02, y: -4 }}
                  className="relative rounded-xl border border-zinc-800 bg-zinc-900/20 p-5"
                >
                  <motion.span
                    className="font-mono text-xs text-emerald-500"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                  >
                    {step}
                  </motion.span>
                  <h3 className="mt-2 font-semibold text-zinc-100">{title}</h3>
                  <p className="mt-2 text-sm text-zinc-400">{body}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Trust signals */}
      <section className="relative z-10 border-t border-zinc-800/60 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <Stagger
            className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
            stagger={0.08}
          >
            {[
              "Signer-agnostic wallets",
              "Private AI inference",
              "Non-custodial delegations",
              "Real-time audit trail",
            ].map((item) => (
              <StaggerItem key={item}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-2 text-sm text-zinc-400"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {item}
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-zinc-800/60 bg-gradient-to-b from-transparent to-emerald-950/20 py-24">
        <FadeIn variants={scaleIn} className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100">
            Ready to secure your treasury?
          </h2>
          <p className="mt-4 text-zinc-400">
            Connect your MetaMask wallet to enter the CFO dashboard, grant
            Advanced Permissions, and run live compliance audits.
          </p>
          <motion.div
            className="mt-8 flex justify-center"
            whileInView={{ scale: [0.95, 1] }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <LandingCta size="lg" />
          </motion.div>
          <p className="mt-4 text-xs text-zinc-600">
            Requires MetaMask with ERC-7715 support · Sepolia testnet
          </p>
        </FadeIn>
      </section>

      {/* Footer */}
      <FadeIn variants={fadeLeft}>
        <footer className="relative z-10 border-t border-zinc-800/60 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
            <p className="text-xs text-zinc-600">
              Citadel · MetaMask Smart Accounts Kit × Venice AI Hackathon
            </p>
            <Stagger className="flex flex-wrap justify-center gap-2" stagger={0.05}>
              {stack.map((tag) => (
                <StaggerItem key={tag}>
                  <Badge variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </footer>
      </FadeIn>
    </div>
  );
}
