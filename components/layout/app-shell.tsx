"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@/components/layout/connect-button";
import { Sidebar } from "@/components/layout/sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageContainer } from "@/components/layout/page-container";
import { getNavItemForPath } from "@/lib/navigation";
import { usePathname } from "next/navigation";

function LoadingVault() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[--canvas]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[--border-emerald] border-t-[--brand-primary]" />
        <p className="mt-4 text-xs tracking-wider text-[--text-muted] uppercase">
          Memuat vault...
        </p>
      </div>
    </div>
  );
}

export function AppShell({
  title,
  description,
  children,
  wide,
  actions,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  wide?: boolean;
  actions?: React.ReactNode;
}) {
  const { isConnected, isConnecting, isReconnecting } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  const navItem = getNavItemForPath(pathname);
  const pageTitle = title ?? navItem?.label ?? "Citadel";
  const pageDescription = description ?? navItem?.description;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isConnected && !isConnecting && !isReconnecting) {
      router.push("/");
    }
  }, [mounted, isConnected, isConnecting, isReconnecting, router]);

  if (!mounted || (!isConnected && !isConnecting && !isReconnecting)) {
    return <LoadingVault />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[--canvas]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — exact 64px per spec */}
        <header className="shrink-0 border-b border-[--border-default] bg-[--canvas]/90 backdrop-blur-md h-16">
          <div className="flex h-16 items-center justify-between gap-4 px-6">
            <div className="min-w-0 flex-1">
              <Breadcrumbs />
              <h1 className="mt-0.5 truncate font-display text-xl font-medium text-[--text-primary]">
                {pageTitle}
              </h1>
              {pageDescription && (
                <p className="mt-0.5 hidden truncate text-sm text-[--text-secondary] sm:block">
                  {pageDescription}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {actions}
              <ConnectButton />
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <PageContainer size={wide ? "wide" : "default"}>
            {children}
          </PageContainer>
        </main>
      </div>
    </div>
  );
}
