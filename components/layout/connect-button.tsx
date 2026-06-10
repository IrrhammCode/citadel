"use client";

import { motion } from "framer-motion";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3"
      >
        <motion.div
          layout
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300"
        >
          {address.slice(0, 6)}...{address.slice(-4)}
        </motion.div>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button variant="outline" size="sm" onClick={() => disconnect()}>
            Disconnect
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
      <Button
        onClick={() => connect({ connector: injected() })}
        disabled={isPending}
      >
        <motion.div
          animate={isPending ? { rotate: 360 } : {}}
          transition={isPending ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
        >
          <Wallet className="h-4 w-4" />
        </motion.div>
        {isPending ? "Connecting..." : "Connect MetaMask"}
      </Button>
    </motion.div>
  );
}
