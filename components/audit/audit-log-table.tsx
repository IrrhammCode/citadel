"use client";

import { useEffect, useState } from "react";
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
import type { AuditRecord } from "@/types/audit";

export function AuditLogTable() {
  const [records, setRecords] = useState<AuditRecord[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecords(getAuditLog());
  }, []);

  if (records.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-12 text-center"
      >
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="text-zinc-400"
        >
          No audit records yet.
        </motion.p>
        <p className="mt-2 text-sm text-zinc-500">
          Grant a permission and run a spend simulation to populate the log.
        </p>
        <motion.div whileHover={{ x: 4 }} className="mt-4 inline-block">
          <Link
            href="/systems/marketing"
            className="text-sm text-emerald-400 hover:underline"
          >
            Go to Marketing System simulator →
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>System</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Decision</TableHead>
          <TableHead>Reasoning</TableHead>
          <TableHead>Tx</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record, index) => (
            <motion.tr
              key={record.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.35 }}
              whileHover={{ backgroundColor: "rgba(24,24,27,0.5)" }}
              className="border-b border-zinc-800/60 transition-colors hover:bg-zinc-900/50"
            >
              <TableCell className="text-xs text-zinc-400">
                {new Date(record.timestamp).toLocaleString()}
              </TableCell>
              <TableCell>{record.systemName}</TableCell>
              <TableCell>
                {record.spendRequest.amount} {record.spendRequest.token}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    record.verdict.decision === "approved" ? "default" : "destructive"
                  }
                >
                  {record.verdict.decision}
                </Badge>
              </TableCell>
              <TableCell className="max-w-xs truncate text-xs text-zinc-400">
                {record.verdict.reasoning}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {record.txHash ? (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${record.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline"
                  >
                    {record.txHash.slice(0, 8)}...
                  </a>
                ) : (
                  "—"
                )}
              </TableCell>
            </motion.tr>
        ))}
      </TableBody>
    </Table>
  );
}
