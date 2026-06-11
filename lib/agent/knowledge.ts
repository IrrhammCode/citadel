// ─── Knowledge System ───────────────────────────────────────
// Agent bisa "belajar" dari PDF, text, URL, dan rules

export type KnowledgeItem = {
  id: string;
  systemId: string;
  type: "document" | "text" | "url" | "rule";
  title: string;
  content: string;
  extractedRules: string[];
  metadata: {
    uploadedAt: number;
    fileSize?: number;
    source?: string;
  };
};

export type KnowledgeStore = {
  items: KnowledgeItem[];
  lastUpdated: number;
};

// ─── Storage ────────────────────────────────────────────────

const STORAGE_KEY = "citadel_knowledge";

function getStore(): KnowledgeStore {
  if (typeof window === "undefined") return { items: [], lastUpdated: 0 };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { items: [], lastUpdated: 0 };
  return JSON.parse(raw);
}

function saveStore(store: KnowledgeStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("knowledge_updated"));
}

// ─── Add Knowledge ──────────────────────────────────────────

export function addKnowledge(item: Omit<KnowledgeItem, "id" | "metadata">): KnowledgeItem {
  const store = getStore();
  const newItem: KnowledgeItem = {
    ...item,
    id: crypto.randomUUID(),
    metadata: {
      uploadedAt: Date.now(),
    },
  };

  store.items.push(newItem);
  store.lastUpdated = Date.now();
  saveStore(store);

  return newItem;
}

export function addDocumentKnowledge(
  systemId: string,
  title: string,
  content: string,
  extractedRules: string[],
  fileSize?: number,
): KnowledgeItem {
  return addKnowledge({
    systemId,
    type: "document",
    title,
    content,
    extractedRules,
  });
}

export function addTextKnowledge(
  systemId: string,
  title: string,
  content: string,
): KnowledgeItem {
  // Auto-extract rules from text
  const rules = extractRulesFromText(content);

  return addKnowledge({
    systemId,
    type: "text",
    title,
    content,
    extractedRules: rules,
  });
}

export function addUrlKnowledge(
  systemId: string,
  title: string,
  url: string,
  content: string,
): KnowledgeItem {
  const rules = extractRulesFromText(content);

  return addKnowledge({
    systemId,
    type: "url",
    title,
    content: `[Source: ${url}]\n\n${content}`,
    extractedRules: rules,
  });
}

export function addRuleKnowledge(
  systemId: string,
  rule: string,
): KnowledgeItem {
  return addKnowledge({
    systemId,
    type: "rule",
    title: `Rule: ${rule.slice(0, 50)}...`,
    content: rule,
    extractedRules: [rule],
  });
}

// ─── Get Knowledge ──────────────────────────────────────────

export function getKnowledgeForAgent(systemId: string): string[] {
  const store = getStore();
  const agentKnowledge = store.items.filter((item) => item.systemId === systemId);

  // Combine all rules
  const allRules: string[] = [];

  for (const item of agentKnowledge) {
    // Add extracted rules
    allRules.push(...item.extractedRules);

    // Add content summary for documents
    if (item.type === "document" || item.type === "url") {
      allRules.push(`[${item.title}] ${item.content.slice(0, 200)}...`);
    }
  }

  return [...new Set(allRules)]; // Deduplicate
}

export function getKnowledgeItems(systemId: string): KnowledgeItem[] {
  const store = getStore();
  return store.items.filter((item) => item.systemId === systemId);
}

export function getAllKnowledge(): KnowledgeItem[] {
  return getStore().items;
}

// ─── Remove Knowledge ───────────────────────────────────────

export function removeKnowledge(id: string) {
  const store = getStore();
  store.items = store.items.filter((item) => item.id !== id);
  store.lastUpdated = Date.now();
  saveStore(store);
}

export function clearKnowledgeForAgent(systemId: string) {
  const store = getStore();
  store.items = store.items.filter((item) => item.systemId !== systemId);
  store.lastUpdated = Date.now();
  saveStore(store);
}

// ─── Extract Rules ──────────────────────────────────────────

function extractRulesFromText(text: string): string[] {
  const rules: string[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Detect rule patterns
    const isRule =
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ") ||
      trimmed.startsWith("• ") ||
      trimmed.match(/^\d+\.\s/) ||
      trimmed.toLowerCase().includes("must") ||
      trimmed.toLowerCase().includes("should") ||
      trimmed.toLowerCase().includes("always") ||
      trimmed.toLowerCase().includes("never") ||
      trimmed.toLowerCase().includes("limit") ||
      trimmed.toLowerCase().includes("maximum") ||
      trimmed.toLowerCase().includes("minimum") ||
      trimmed.toLowerCase().includes("required") ||
      trimmed.toLowerCase().includes("prohibited");

    if (isRule) {
      rules.push(trimmed);
    }
  }

  return rules;
}

// ─── Parse Document ─────────────────────────────────────────

export function parseDocumentContent(content: string): {
  title: string;
  sections: { heading: string; content: string }[];
  rules: string[];
} {
  const lines = content.split("\n");
  let title = "Untitled Document";
  const sections: { heading: string; content: string }[] = [];
  let currentSection: { heading: string; content: string } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect title (first # heading)
    if (trimmed.startsWith("# ") && title === "Untitled Document") {
      title = trimmed.slice(2);
      continue;
    }

    // Detect section headings
    if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        heading: trimmed.replace(/^#+\s*/, ""),
        content: "",
      };
      continue;
    }

    // Add to current section
    if (currentSection) {
      currentSection.content += line + "\n";
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // Extract rules from all content
  const rules = extractRulesFromText(content);

  return { title, sections, rules };
}

// ─── Import from File ───────────────────────────────────────

export async function importFromFile(
  systemId: string,
  file: File,
): Promise<KnowledgeItem> {
  const content = await readFileContent(file);
  const parsed = parseDocumentContent(content);

  return addDocumentKnowledge(
    systemId,
    parsed.title,
    content,
    parsed.rules,
    file.size,
  );
}

async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// ─── Import from URL ────────────────────────────────────────

export async function importFromUrl(
  systemId: string,
  url: string,
): Promise<KnowledgeItem> {
  // In production, this would fetch the URL content
  // For now, create a placeholder
  const content = `[Content from ${url}]\n\nThis is a placeholder for URL content. In production, this would fetch and parse the actual webpage.`;

  return addUrlKnowledge(
    systemId,
    `Import from ${new URL(url).hostname}`,
    url,
    content,
  );
}
