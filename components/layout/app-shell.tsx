"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { ConnectButton } from "@/components/layout/connect-button";
import { Sidebar } from "@/components/layout/sidebar";
import { fadeUp } from "@/lib/motion";

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { isConnected, isConnecting, isReconnecting } = useAccount();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isConnected && !isConnecting && !isReconnecting) {
      router.push("/");
    }
  }, [mounted, isConnected, isConnecting, isReconnecting, router]);

  // Prevent flash of content before Wagmi initializes or redirects
  if (!mounted || (!isConnected && !isConnecting && !isReconnecting)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="h-8 w-8 animate-pulse rounded-full bg-emerald-500/20" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="border-b border-zinc-800 bg-zinc-950/50 px-8 py-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <motion.h1
                className="text-2xl font-semibold tracking-tight text-zinc-100"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {title}
              </motion.h1>
              {description && (
                <motion.p
                  className="mt-1 text-sm text-zinc-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {description}
                </motion.p>
              )}
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
            >
              <ConnectButton />
            </motion.div>
          </div>
        </motion.div>
        <main className="flex-1 overflow-auto p-8">
          <motion.div
            key={title}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
