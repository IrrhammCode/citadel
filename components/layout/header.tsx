"use client";

import { ConnectButton } from "@/components/layout/connect-button";

export function Header({ title, description }: { title: string; description?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/50 px-8 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        )}
      </div>
      <ConnectButton />
    </header>
  );
}
