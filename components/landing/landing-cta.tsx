"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

type LandingCtaProps = {
  size?: "default" | "lg";
  variant?: "primary" | "outline";
};

export function LandingCta({ size = "default", variant = "primary" }: LandingCtaProps) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { connect, isPending } = useConnect();

  function handleConnect() {
    connect(
      { connector: injected() },
      {
        onSuccess: () => router.push("/dashboard"),
      },
    );
  }

  const content = isConnected ? (
    <>
      Enter Dashboard
      <ArrowRight className="h-4 w-4" />
    </>
  ) : (
    <>
      <Wallet className="h-4 w-4" />
      {isPending ? "Connecting..." : "Connect Wallet"}
      {!isPending && <ArrowRight className="h-4 w-4" />}
    </>
  );

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      animate={
        isPending
          ? { boxShadow: ["0 0 0px rgba(16,185,129,0)", "0 0 20px rgba(16,185,129,0.3)", "0 0 0px rgba(16,185,129,0)"] }
          : {}
      }
      transition={isPending ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
    >
      <Button
        size={size === "lg" ? "lg" : "default"}
        variant={variant === "outline" ? "outline" : "default"}
        onClick={isConnected ? () => router.push("/dashboard") : handleConnect}
        disabled={isPending}
      >
        {content}
      </Button>
    </motion.div>
  );
}
