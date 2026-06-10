"use client";

import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { StoredPermission } from "@/types/permission";

export function PermissionCard({ permission }: { permission: StoredPermission }) {
  // eslint-disable-next-line react-hooks/purity
  const expired = permission.expiry * 1000 < Date.now();

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
            >
              <Shield className="h-4 w-4 text-emerald-400" />
            </motion.div>
            <CardTitle className="text-base">{permission.systemName}</CardTitle>
          </div>
          <Badge variant={expired ? "destructive" : "default"}>
            {expired ? "Expired" : "Active"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-400">
          <p>
            <span className="text-zinc-500">Daily limit:</span>{" "}
            {permission.maxDailySpend} USDC
          </p>
          <p>
            <span className="text-zinc-500">Expires:</span>{" "}
            {new Date(permission.expiry * 1000).toLocaleString()}
          </p>
          <p>
            <span className="text-zinc-500">Session:</span>{" "}
            <span className="font-mono text-xs text-zinc-300">
              {permission.sessionAddress.slice(0, 10)}...
            </span>
          </p>
          <p className="text-xs italic text-zinc-500">{permission.justification}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
