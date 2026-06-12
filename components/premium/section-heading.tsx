"use client";

import { FadeIn } from "@/components/motion/motion";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <FadeIn
      className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      {eyebrow && (
        <p className="font-display mb-3 text-sm tracking-[0.2em] text-[--text-tertiary] uppercase">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-3xl font-medium tracking-tight text-zinc-50 md:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-zinc-400">{description}</p>
      )}
    </FadeIn>
  );
}
