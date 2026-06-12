"use client";

import type { KnowledgeItem } from "@/lib/agent/knowledge";

/** Persist a knowledge item to the server store (for agent cycles) */
export async function persistKnowledgeToServer(
  item: Pick<KnowledgeItem, "id" | "systemId" | "type" | "title" | "content" | "extractedRules">,
): Promise<boolean> {
  try {
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        systemId: item.systemId,
        type: item.type,
        title: item.title,
        content: item.content,
        extractedRules: item.extractedRules,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function removeKnowledgeFromServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/knowledge?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch {
    return false;
  }
}
