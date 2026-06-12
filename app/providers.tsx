"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { Toaster } from "sonner";
import { wagmiConfig } from "@/lib/wagmi";
import { AutoSyncProvider } from "@/components/providers/auto-sync-provider";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AutoSyncProvider>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: "bg-[--canvas-elevated] border border-[--border-default] text-[--text-primary]",
              },
            }}
          />
        </AutoSyncProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
