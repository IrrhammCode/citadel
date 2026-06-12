"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPermissions } from "@/lib/storage";

type LandingCtaProps = {
  size?: "default" | "lg" | "sm";
  variant?: "primary" | "outline";
};

function getPostConnectPath(): string {
  if (typeof window === "undefined") return "/register-agent";
  const hasPermission = getPermissions().length > 0;
  return hasPermission ? "/dashboard" : "/register-agent";
}

export function LandingCta({ size = "default", variant = "primary" }: LandingCtaProps) {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { connect, isPending } = useConnect();

  function navigateAfterConnect() {
    router.push(getPostConnectPath());
  }

  function handleConnect() {
    connect({ connector: injected() }, { onSuccess: navigateAfterConnect });
  }

  const content = isConnected ? (
    <>
      {getPermissions().length > 0 ? "Buka Dashboard" : "Register Agent"}
      <ArrowRight className="h-4 w-4" />
    </>
  ) : (
    <>
      <Wallet className="h-4 w-4" />
      {isPending ? "Authenticating..." : "Connect Wallet"}
      {!isPending && <ArrowRight className="h-4 w-4" />}
    </>
  );

  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      animate={
        isPending
          ? {
              boxShadow: [
                "0 0 0px rgba(16,185,129,0)",
                "0 0 26px rgba(16,185,129,0.28)",
                "0 0 0px rgba(16,185,129,0)",
              ],
            }
          : {}
      }
      transition={isPending ? { duration: 1.4, repeat: Infinity } : { duration: 0.25 }}
    >
      <Button
        size={size === "lg" ? "lg" : size === "sm" ? "sm" : "default"}
        variant={variant === "outline" ? "outline" : "default"}
        onClick={isConnected ? navigateAfterConnect : handleConnect}
        disabled={isPending}
      >
        {content}
      </Button>
    </motion.div>
  );
}
