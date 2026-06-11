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
          Grant a permission and run a spend simulation to populate the log.
        </p>
        <motion.div whileHover={{ x: 4 }} className="mt-4 inline-block">
          <Link
            href="/systems/marketing"
            className="text-sm text-emerald-400 hover:underline"
          >
            Go to Marketing Agent →
          </Link>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#111118]">
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow className="border-b border-zinc-800 hover:bg-transparent">
            <TableHead className="text-[11px] uppercase tracking-wider text-zinc-500">
              Time
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-zinc-500">
              System
            </TableHead>
            <TableHead className="text-right text-[11px] uppercase tracking-wider text-zinc-500">
              Amount
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-zinc-500">
              Decision
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-zinc-500">
              Reasoning
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-zinc-500">
              Tx
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => {
            const isApproved = record.verdict.decision === "approved";
            return (
              <motion.tr
                key={record.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
                className={`
                  border-b border-[#1e1e22] transition-colors
                  hover:bg-zinc-900/50
                  ${isApproved ? "bg-emerald-500/[0.03]" : "bg-red-500/[0.03]"}
                `}
              >
                <TableCell className="whitespace-nowrap text-xs text-zinc-400">
                  {new Date(record.timestamp).toLocaleString()}
                </TableCell>
                <TableCell className="font-mono text-[13px] text-zinc-300">
                  {record.systemName}
                </TableCell>
                <TableCell className="text-right font-mono text-[13px] text-zinc-200">
                  {record.spendRequest.amount} {record.spendRequest.token}
                </TableCell>
                <TableCell>
                  <span
                    className={`
                      inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5
                      text-[11px] font-medium uppercase tracking-wide
                      ${isApproved
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-red-500/15 text-red-400 border border-red-500/30"
                      }
                    `}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${isApproved ? "bg-emerald-400" : "bg-red-400"}`}
                    />
                    {record.verdict.decision}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs truncate text-xs text-zinc-500">
                  {record.verdict.reasoning}
                </TableCell>
                <TableCell className="font-mono text-[13px]">
                  {record.txHash ? (
                    <a
                      href={`https://sepolia.etherscan.io/tx/${record.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      {record.txHash.slice(0, 8)}…
                    </a>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </TableCell>
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
