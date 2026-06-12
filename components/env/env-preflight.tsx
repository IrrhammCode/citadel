"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type PreflightData = {
  ready: boolean;
  checks: {
    venice: {
      configured: boolean;
      healthy: boolean;
      authMethod: string;
      model: string;
      latencyMs: number;
    };
    sessionAccount: { configured: boolean; address: string | null };
    rpc: { configured: boolean; url: string };
    database?: { configured: boolean; healthy: boolean; backend: string };
    redis?: { configured: boolean; healthy: boolean };
    apiSecret?: { configured: boolean };
  };
};

export function EnvPreflight({ compact }: { compact?: boolean }) {
  const [data, setData] = useState<PreflightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/env/preflight")
      .then((r) => r.json())
      .then((d) => {
        setData(d as PreflightData);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Preflight failed"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking environment...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400">
        <XCircle className="h-4 w-4" />
        Preflight failed: {error ?? "unknown"}
      </div>
    );
  }

  const items = [
    {
      label: "Venice AI",
      ok: data.checks.venice.configured && data.checks.venice.healthy,
      detail: data.checks.venice.configured
        ? `${data.checks.venice.authMethod} · ${data.checks.venice.latencyMs}ms`
        : "VENICE_API_KEY or X402_WALLET_KEY",
    },
    {
      label: "Session Account",
      ok: data.checks.sessionAccount.configured,
      detail: data.checks.sessionAccount.address
        ? `${data.checks.sessionAccount.address.slice(0, 6)}…${data.checks.sessionAccount.address.slice(-4)}`
        : "SESSION_ACCOUNT_PRIVATE_KEY",
    },
    {
      label: "Postgres",
      ok: !data.checks.database?.configured || (data.checks.database.configured && data.checks.database.healthy),
      detail: data.checks.database?.configured
        ? `${data.checks.database.backend} · ${data.checks.database.healthy ? "connected" : "down"}`
        : "DATABASE_URL (required in production)",
    },
    {
      label: "Redis",
      ok: !data.checks.redis?.configured || (data.checks.redis.configured && data.checks.redis.healthy),
      detail: data.checks.redis?.configured
        ? data.checks.redis.healthy ? "connected" : "down"
        : "REDIS_URL (required in production)",
    },
    {
      label: "API Secret",
      ok: data.checks.apiSecret?.configured ?? false,
      detail: data.checks.apiSecret?.configured ? "configured" : "CITADEL_API_SECRET",
    },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={data.ready ? "default" : "destructive"}>
          {data.ready ? "Production Ready" : "Setup Required"}
        </Badge>
        {items.map((item) => (
          <Badge key={item.label} variant="outline" className={item.ok ? "border-emerald-500/40" : "border-red-500/40"}>
            {item.ok ? <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" /> : <XCircle className="h-3 w-3 mr-1 text-red-400" />}
            {item.label}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <Card className={data.ready ? "border-emerald-500/20" : "border-amber-500/20"}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          {data.ready ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          )}
          <span className="font-medium text-sm">
            {data.ready ? "Production infrastructure ready" : "Production setup incomplete"}
          </span>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                {item.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                )}
                <span className="text-zinc-200">{item.label}</span>
              </div>
              <span className="text-zinc-500 text-xs text-right truncate max-w-[60%]">{item.detail}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
