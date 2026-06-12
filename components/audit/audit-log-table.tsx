"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getAuditLog } from "@/lib/storage";
import { fetchServerStore, pullFromServer } from "@/lib/store-sync";
import type { AuditRecord } from "@/types/audit";

export function AuditLogTable() {
  const [records, setRecords] = useState<AuditRecord[]>([]);

  const refresh = useCallback(async () => {
    const server = await fetchServerStore();
    if (server?.auditLog?.length) {
      setRecords(server.auditLog);
      return;
    }
    await pullFromServer().catch(() => {});
    setRecords(getAuditLog());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    const onSync = () => refresh();
    window.addEventListener("citadel_synced", onSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("citadel_synced", onSync);
    };
  }, [refresh]);

  if (records.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-zinc-800 bg-[#111118] p-12 text-center"
      >
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="text-zinc-400"
        >
          No audit records yet.
        </motion.p>
        <p className="mt-2 text-sm text-zinc-500">
          Run an agent cycle or submit a spend request to populate the audit log.
        </p>
        <Link href="/agent-dashboard" className="mt-4 inline-block text-sm text-emerald-400 hover:underline">
          Go to Agent Control →
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Recipient</TableHead>
            <TableHead>Verdict</TableHead>
            <TableHead>Confidence</TableHead>
            <TableHead>Tx</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="text-xs text-zinc-500 whitespace-nowrap">
                {new Date(record.timestamp).toLocaleString()}
              </TableCell>
              <TableCell className="font-medium text-zinc-200">
                {record.systemName}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {record.spendRequest.amount} USDC
              </TableCell>
              <TableCell className="font-mono text-xs text-zinc-400">
                {record.spendRequest.recipient.slice(0, 10)}...
              </TableCell>
              <TableCell>
                <Badge
                  variant={record.verdict.decision === "approved" ? "default" : "destructive"}
                >
                  {record.verdict.decision}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-zinc-400">
                {(record.verdict.confidence * 100).toFixed(0)}%
              </TableCell>
              <TableCell className="font-mono text-xs text-zinc-500">
                {record.txHash ? `${record.txHash.slice(0, 10)}...` : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
