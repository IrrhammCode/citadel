"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMetaMaskWalletClient } from "@/lib/metamask/wallet-client";
import { CHAIN_ID, USDC_ADDRESS } from "@/lib/constants";
import { savePermission } from "@/lib/storage";
import type { StoredPermission } from "@/types/permission";

type Props = {
  systemId: string;
  systemName: string;
  existingPermission?: StoredPermission;
  onGranted: () => void;
};

export function GrantPermissionModal({
  systemId,
  systemName,
  existingPermission,
  onGranted,
}: Props) {
  const { address, isConnected } = useAccount();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [maxDailySpend, setMaxDailySpend] = useState("10");
  const [expiryDays, setExpiryDays] = useState("7");
  const [justification, setJustification] = useState(
    `Authorize ${systemName} to spend USDC within defined treasury limits.`,
  );

  async function handleGrant() {
    if (!isConnected || !address) {
      toast.error("Connect MetaMask first");
      return;
    }

    setLoading(true);
    try {
      const sessionRes = await fetch("/api/session-address");
      if (!sessionRes.ok) {
        throw new Error("Session account not configured on server");
      }
      const { address: sessionAddress } = (await sessionRes.json()) as {
        address: string;
      };

      const walletClient = createMetaMaskWalletClient();

      // Pre-flight: verify wallet supports ERC-7715
      const supported = await walletClient.getSupportedExecutionPermissions();
      if (!supported || Object.keys(supported).length === 0) {
        throw new Error(
          "MetaMask does not support Advanced Permissions. Update MetaMask to the latest version.",
        );
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const expiry = currentTime + Number(expiryDays) * 86400;

      // Triggers MetaMask Advanced Permissions popup (ERC-7715)
      const grantedPermissions = await walletClient.requestExecutionPermissions([
        {
          chainId: CHAIN_ID,
          expiry,
          to: sessionAddress as `0x${string}`,
          permission: {
            type: "erc20-token-periodic",
            data: {
              tokenAddress: USDC_ADDRESS,
              periodAmount: parseUnits(maxDailySpend, 6),
              periodDuration: 86400,
              justification,
            },
            isAdjustmentAllowed: true,
          },
        },
      ]);

      const stored: StoredPermission = {
        id: crypto.randomUUID(),
        systemId,
        systemName,
        maxDailySpend,
        expiry,
        justification,
        grantedAt: Date.now(),
        sessionAddress,
        grantedPermissions,
      };

      savePermission(stored);
      onGranted();
      setOpen(false);
      toast.success(`Permission granted to ${systemName}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to grant permission";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={existingPermission ? "outline" : "default"}>
          <Shield className="h-3 w-3" />
          {existingPermission ? "Re-grant" : "Grant Permission"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant Advanced Permission</DialogTitle>
          <DialogDescription>
            Request ERC-7715 scoped execution rights for {systemName}. MetaMask
            will show a human-readable approval screen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="maxDailySpend">Max daily spend (USDC)</Label>
            <Input
              id="maxDailySpend"
              type="number"
              min="1"
              value={maxDailySpend}
              onChange={(e) => setMaxDailySpend(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiryDays">Permission duration (days)</Label>
            <Input
              id="expiryDays"
              type="number"
              min="1"
              max="30"
              value={expiryDays}
              onChange={(e) => setExpiryDays(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="justification">Justification</Label>
            <Input
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleGrant} disabled={loading || !isConnected}>
            {loading ? "Awaiting MetaMask..." : "Request Permission"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
