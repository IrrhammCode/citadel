"use client";

import { useState } from "react";
import { AlertTriangle, OctagonX, ShieldOff, Trash2, Square } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pullFromServer } from "@/lib/store-sync";

type Props = {
  systemId: string;
  systemName: string;
  isCustom: boolean;
  hasPermission: boolean;
};

export function AgentLifecyclePanel({ systemId, systemName, isCustom, hasPermission }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function runAction(action: "stop" | "emergency_stop" | "revoke_permission" | "remove") {
    const labels = {
      stop: "stop the agent loop",
      emergency_stop: "activate emergency stop",
      revoke_permission: "revoke permission",
      remove: "remove this agent",
    };
    if (!window.confirm(`${labels[action]} for ${systemName}?`)) return;

    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch("/api/agent/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId, action }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      await pullFromServer();
      setMessage("Done — refresh if UI does not update.");
      window.location.reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base">Agent Lifecycle</CardTitle>
        <CardDescription>Stop, revoke, or remove this agent from the treasury.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!!busy}
          onClick={() => runAction("stop")}
        >
          <Square className="h-3.5 w-3.5" />
          {busy === "stop" ? "Stopping…" : "Stop Loop"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-amber-500/40 text-amber-400"
          disabled={!!busy}
          onClick={() => runAction("emergency_stop")}
        >
          <OctagonX className="h-3.5 w-3.5" />
          {busy === "emergency_stop" ? "Stopping…" : "Emergency Stop"}
        </Button>
        {hasPermission && (
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/40 text-red-400"
            disabled={!!busy}
            onClick={() => runAction("revoke_permission")}
          >
            <ShieldOff className="h-3.5 w-3.5" />
            {busy === "revoke_permission" ? "Revoking…" : "Revoke Permission"}
          </Button>
        )}
        {isCustom && (
          <Button
            variant="destructive"
            size="sm"
            disabled={!!busy}
            onClick={() => runAction("remove")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {busy === "remove" ? "Removing…" : "Remove Agent"}
          </Button>
        )}
        {!hasPermission && !isCustom && (
          <p className="flex w-full items-center gap-2 text-xs text-zinc-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            Built-in template — grant permission via Register Agent or revoke after grant.
          </p>
        )}
        {message && <p className="w-full text-xs text-zinc-400">{message}</p>}
      </CardContent>
    </Card>
  );
}
