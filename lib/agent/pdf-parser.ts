// ─── PDF Parser ─────────────────────────────────────────────
// Extract text and rules from PDF documents

export type ParsedDocument = {
  title: string;
  content: string;
  pages: {
    pageNumber: number;
    content: string;
  }[];
  extractedRules: string[];
  metadata: {
    pageCount: number;
    fileSize: number;
    parsedAt: number;
  };
};

// ─── Parse PDF File ─────────────────────────────────────────

export async function parsePDF(file: File): Promise<ParsedDocument> {
  // Read file as ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Extract text using simple PDF text extraction
  // Note: For production, use pdf.js or similar library
  const content = extractTextFromPDF(uint8Array);
  const pages = splitIntoPages(content);
  const extractedRules = extractRules(content);

  return {
    title: extractTitle(file.name, content),
    content,
    pages,
    extractedRules,
    metadata: {
      pageCount: pages.length,
      fileSize: file.size,
      parsedAt: Date.now(),
    },
  };
}

// ─── Extract Text from PDF ──────────────────────────────────

function extractTextFromPDF(data: Uint8Array): string {
  // Simple PDF text extraction
  // Look for text streams in PDF
  const textChunks: string[] = [];
  const decoder = new TextDecoder("utf-8");
  const text = decoder.decode(data);

  // Find text between BT and ET markers (PDF text objects)
  const btRegex = /BT\s([\s\S]*?)\sET/g;
  let match;

  while ((match = btRegex.exec(text)) !== null) {
    const textBlock = match[1];

    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;

    while ((tjMatch = tjRegex.exec(textBlock)) !== null) {
      textChunks.push(tjMatch[1]);
    }

    // Handle TJ arrays
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    let tjArrayMatch;

    while ((tjArrayMatch = tjArrayRegex.exec(textBlock)) !== null) {
      const arrayContent = tjArrayMatch[1];
      const stringRegex = /\(([^)]*)\)/g;
      let stringMatch;

      while ((stringMatch = stringRegex.exec(arrayContent)) !== null) {
        textChunks.push(stringMatch[1]);
      }
    }
  }

  // If no text found with BT/ET, try direct string extraction
  if (textChunks.length === 0) {
    const stringRegex = /\(([^\)]{3,})\)\s*Tj/g;
    let stringMatch;

    while ((stringMatch = stringRegex.exec(text)) !== null) {
      textChunks.push(stringMatch[1]);
    }
  }

  // Clean up extracted text
  return textChunks
    .join(" ")
    .replace(/\\\\/g, "\\")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Split into Pages ───────────────────────────────────────

function splitIntoPages(content: string): { pageNumber: number; content: string }[] {
  // Simple page splitting by form feed or page markers
  const pageBreaks = content.split(/\f|\n\s*Page\s+\d+/i);

  if (pageBreaks.length <= 1) {
    // No page breaks found, treat as single page
    return [{ pageNumber: 1, content }];
  }

  return pageBreaks.map((pageContent, index) => ({
    pageNumber: index + 1,
    content: pageContent.trim(),
  }));
}

// ─── Extract Title ──────────────────────────────────────────

function extractTitle(filename: string, content: string): string {
  // Try to find title from content
  const lines = content.split("\n").filter((line) => line.trim());

  // Look for common title patterns
  for (const line of lines.slice(0, 10)) {
    const trimmed = line.trim();

    // Skip common headers
    if (trimmed.match(/^(page|chapter|section|table of contents)/i)) continue;

    // Check if line looks like a title
    if (
      trimmed.length > 3 &&
      trimmed.length < 100 &&
      !trimmed.match(/^\d+$/) &&
      !trimmed.match(/^[^\w]/)
    ) {
      return trimmed;
    }
  }

  // Fallback to filename
  return filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ");
}

// ─── Extract Rules ──────────────────────────────────────────

function extractRules(content: string): string[] {
  const rules: string[] = [];
  const lines = content.split("\n");

  const rulePatterns = [
    /must\s+not/i,
    /must\s+always/i,
    /shall\s+not/i,
    /shall\s+always/i,
    /should\s+not/i,
    /should\s+always/i,
    /do\s+not/i,
    /always\s+/i,
    /never\s+/i,
    /required:/i,
    /prohibited:/i,
    /limit:/i,
    /maximum:/i,
    /minimum:/i,
    /rule:/i,
    /policy:/i,
    /guideline:/i,
    /\\d+\\.\s+/, // Numbered list items
    /^[-•]\\s+/, // Bullet points
  ];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) continue;

    // Check for rule patterns
    const isRule = rulePatterns.some((pattern) => pattern.test(trimmed));

    if (isRule && trimmed.length > 10) {
      rules.push(trimmed);
    }
  }

  return rules;
}

// ─── Parse Text File ────────────────────────────────────────

export async function parseTextFile(file: File): Promise<ParsedDocument> {
  const content = await file.text();
  const pages = splitIntoPages(content);
  const extractedRules = extractRules(content);

  return {
    title: extractTitle(file.name, content),
    content,
    pages,
    extractedRules,
    metadata: {
      pageCount: pages.length,
      fileSize: file.size,
      parsedAt: Date.now(),
    },
  };
}

// ─── Parse Markdown File ────────────────────────────────────

export async function parseMarkdownFile(file: File): Promise<ParsedDocument> {
  const content = await file.text();
  const pages = splitIntoPages(content);

  // Extract rules from markdown
  const rules: string[] = [];
  const lines = content.split("\n");

  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track code blocks
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip code blocks
    if (inCodeBlock) continue;

    // Extract from lists
    if (trimmed.match(/^[-*+]\s+/) || trimmed.match(/^\d+\.\s+/)) {
      const item = trimmed.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, "");
      if (item.length > 10) {
        rules.push(item);
      }
    }

    // Extract from headings with content
    if (trimmed.match(/^#+\s+/)) {
      const heading = trimmed.replace(/^#+\s+/, "");
      if (heading.length > 5) {
        rules.push(`Section: ${heading}`);
      }
    }
  }

  return {
    title: extractTitle(file.name, content),
    content,
    pages,
    extractedRules: rules,
    metadata: {
      pageCount: pages.length,
      fileSize: file.size,
      parsedAt: Date.now(),
    },
  };
}

// ─── Parse File (Auto-detect) ───────────────────────────────

export async function parseFile(file: File): Promise<ParsedDocument> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return parsePDF(file);
    case "txt":
      return parseTextFile(file);
    case "md":
    case "markdown":
      return parseMarkdownFile(file);
    default:
      // Try as text file
      return parseTextFile(file);
  }
}
