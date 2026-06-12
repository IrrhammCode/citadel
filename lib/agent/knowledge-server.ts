import "server-only";
import type { KnowledgeItem } from "@/lib/agent/knowledge";
import { getServerStore, saveServerStore } from "@/lib/server/store";

/** Server-side knowledge rules for agent prompts */
export function getServerKnowledgeForAgent(systemId: string): string[] {
  const items = getServerStore().knowledge.filter((i) => i.systemId === systemId);
  const rules: string[] = [];

  for (const item of items) {
    rules.push(...item.extractedRules);
    if (item.type === "document" || item.type === "url") {
      rules.push(`[${item.title}] ${item.content.slice(0, 200)}...`);
    }
  }

  return [...new Set(rules)];
}

export function getServerKnowledgeItems(systemId?: string): KnowledgeItem[] {
  const items = getServerStore().knowledge;
  return systemId ? items.filter((i) => i.systemId === systemId) : items;
}

export function appendServerKnowledge(
  item: Omit<KnowledgeItem, "id" | "metadata"> & { id?: string },
): KnowledgeItem {
  const store = getServerStore();
  const full: KnowledgeItem = {
    ...item,
    id: item.id ?? crypto.randomUUID(),
    metadata: { uploadedAt: Date.now() },
  };
  store.knowledge = [
    full,
    ...store.knowledge.filter((k) => k.id !== full.id),
  ].slice(0, 500);
  saveServerStore(store);
  return full;
}

export function removeServerKnowledge(id: string): boolean {
  const store = getServerStore();
  const before = store.knowledge.length;
  store.knowledge = store.knowledge.filter((k) => k.id !== id);
  if (store.knowledge.length === before) return false;
  saveServerStore(store);
  return true;
}
