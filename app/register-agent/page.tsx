"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { RegisterAgentWizard } from "@/components/agent/register-agent-wizard";
import { PipelineGuide } from "@/components/flow/pipeline-guide";
import { FadeIn } from "@/components/motion/motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function RegisterAgentPage() {
  const router = useRouter();

  return (
    <AppShell
      title="Register Agent"
      description="Step 1 — Define your agent, set policy, and grant ERC-7715 permission."
    >
      <FadeIn>
        <div className="mb-8">
          <PipelineGuide compact />
        </div>

        <div className="mx-auto max-w-2xl space-y-6">
          <RegisterAgentWizard
            onComplete={() => {
              router.push("/agent-dashboard");
            }}
          />

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-center">
            <p className="text-sm text-zinc-500">
              After activation, proceed to Agent Control to run the first cycle.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link href="/agent-dashboard">
                Go to Agent Control
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </FadeIn>
    </AppShell>
  );
}
