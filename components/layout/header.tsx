"use client";

import { ConnectButton } from "@/components/layout/connect-button";

export function Header({ title, description }: { title: string; description?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-[--border-default] bg-[--canvas]/60 px-8 py-6 backdrop-blur">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[--text-primary]">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-[--text-secondary]">{description}</p>
        )}
      </div>
      <ConnectButton />
    </header>
  );
}
