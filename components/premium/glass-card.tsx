"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  tilt?: boolean;
  glow?: "emerald" | "gold" | "none";
};

export function GlassCard({
  children,
  className,
  tilt = true,
  glow = "emerald",
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), {
    stiffness: 300,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), {
    stiffness: 300,
    damping: 30,
  });

  function handleMouse(e: MouseEvent<HTMLDivElement>) {
    if (!tilt || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleLeave() {
    x.set(0);
    y.set(0);
  }

  const glowClass = {
    emerald: "shadow-[--shadow-glow] hover:shadow-[0_0_28px_rgba(16,185,129,0.18)]",
    gold: "shadow-[0_0_24px_rgba(201,169,98,0.06)] hover:shadow-[0_0_32px_rgba(201,169,98,0.1)]", // legacy only
    none: "",
  }[glow];

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={tilt ? { rotateX, rotateY, transformPerspective: 1000 } : undefined}
      className={cn(
        "premium-glass relative overflow-hidden rounded-2xl transition-shadow duration-500",
        glowClass,
        className,
      )}
    >
      <div className="premium-glass-shine pointer-events-none absolute inset-0" />
      {children}
    </motion.div>
  );
}
