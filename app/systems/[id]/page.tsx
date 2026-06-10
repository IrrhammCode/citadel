"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SpendRequestForm } from "@/components/audit/spend-request-form";
import { useSystems } from "@/hooks/useSystems";
import { Button } from "@/components/ui/button";

export default function SystemSimulatorPage() {
  const params = useParams<{ id: string }>();
  const { systems, loaded } = useSystems();
  const system = systems.find((s) => s.id === params.id);

  if (!loaded) return null;

  if (!system) {
    return (
      <AppShell title="System not found">
        <div className="text-center">
          <p className="text-zinc-400">This autonomous system does not exist.</p>
          <Button className="mt-4" asChild>
            <Link href="/systems">Back to Systems</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={system.name}
      description="Autonomous spend simulator with Venice AI compliance firewall."
    >
      <SpendRequestForm system={system} />
    </AppShell>
  );
}
