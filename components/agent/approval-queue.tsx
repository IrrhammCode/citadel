"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, Loader2, Wallet } from "lucide-react";
import { useAccount, useSignTypedData } from "wagmi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ApprovalRequest } from "@/lib/agent/autonomy";
import { buildApprovalTypedData } from "@/lib/approval/signature";
import { pullFromServer } from "@/lib/store-sync";
import { toast } from "sonner";

export function ApprovalQueue() {
  const { address, isConnected } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [pending, setPending] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/autonomy?type=pending");
      if (res.ok) {
        setPending(await res.json());
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 5000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  async function signDecision(request: ApprovalRequest, action: "approve" | "reject") {
    if (!isConnected || !address) {
      toast.error("Connect your CFO wallet to sign this decision");
      return undefined;
    }

    const typedData = buildApprovalTypedData(request, action);
    const signature = await signTypedDataAsync({
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
    });

    return { signature, signer: address };
  }

  async function handleApprove(id: string) {
    const request = pending.find((r) => r.id === id);
    if (!request) return;

    setLoading(id);
    try {
      let signature: string | undefined;
      let signer: string | undefined;

      try {
        const proof = await signDecision(request, "approve");
        if (!proof) {
          setLoading(null);
          return;
        }
        signature = proof.signature;
        signer = proof.signer;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Wallet signature rejected");
        setLoading(null);
        return;
      }

      const res = await fetch("/api/agent/autonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          id,
          execute: true,
          signature,
          signer,
          approvedBy: signer,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.execution?.executed ? "Signed, approved & executed" : "Signed & approved");
        await pullFromServer();
        fetchPending();
      } else {
        toast.error(data.error || "Approve failed");
      }
    } catch {
      toast.error("Approve failed");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject(id: string) {
    const request = pending.find((r) => r.id === id);
    if (!request) return;

    setLoading(id);
    try {
      let signature: string | undefined;
      let signer: string | undefined;

      try {
        const proof = await signDecision(request, "reject");
        if (!proof) {
          setLoading(null);
          return;
        }
        signature = proof.signature;
        signer = proof.signer;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Wallet signature rejected");
        setLoading(null);
        return;
      }

      const res = await fetch("/api/agent/autonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          id,
          signature,
          signer,
          rejectedBy: signer,
        }),
      });
      if (res.ok) {
        toast.success("Signed & rejected");
        fetchPending();
      } else {
        const data = await res.json();
        toast.error(data.error || "Reject failed");
      }
    } finally {
      setLoading(null);
    }
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 text-center">
        <Clock className="mx-auto h-6 w-6 text-zinc-600" />
        <p className="mt-2 text-sm text-zinc-500">No pending approvals</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!isConnected && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <Wallet className="h-3.5 w-3.5 shrink-0" />
          Connect your CFO wallet — approvals require an EIP-712 signature.
        </div>
      )}
      {pending.map((req) => (
        <motion.div
          key={req.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                {req.systemId}
              </Badge>
              <span className="text-sm font-medium text-zinc-200">{req.description}</span>
            </div>
            {req.amount && (
              <p className="mt-1 text-sm text-zinc-400">
                {req.amount} USDC → {req.recipient?.slice(0, 10)}...
              </p>
            )}
            <p className="mt-1 text-xs text-zinc-500">{req.reasoning}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleApprove(req.id)}
              disabled={loading === req.id || !isConnected}
              title={!isConnected ? "Connect wallet to sign approval" : undefined}
            >
              {loading === req.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Sign & Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReject(req.id)}
              disabled={loading === req.id || !isConnected}
              title={!isConnected ? "Connect wallet to sign rejection" : undefined}
            >
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
