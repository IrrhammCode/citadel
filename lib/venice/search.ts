/**
 * Venice Web Search — Check vendor legitimacy via web search
 * Uses Venice's privacy-preserving web search
 */
import OpenAI from "openai";

/**
 * Search for vendor information using Venice Web Search
 */
export async function searchVendor(vendorAddress: string, vendorName?: string): Promise<{
  found: boolean;
  riskLevel: "low" | "medium" | "high";
  summary: string;
  sources: string[];
}> {
  const walletKey = process.env.X402_WALLET_KEY;
  const apiKey = process.env.VENICE_API_KEY;

  if (!walletKey && !apiKey) {
    return { found: false, riskLevel: "medium", summary: "Web search not available", sources: [] };
  }

  const client = new OpenAI({
    apiKey: apiKey || "x402",
    baseURL: "https://api.venice.ai/api/v1",
  });

  const query = vendorName
    ? `"${vendorName}" company crypto blockchain legitimacy`
    : `ethereum address ${vendorAddress} scam fraud legitimate`;

  try {
    const response = await client.chat.completions.create({
      model: process.env.VENICE_MODEL ?? "llama-3.3-70b",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You are a vendor risk analyst. Search for information about this vendor/address and assess risk.
Respond with JSON:
{
  "found": true/false,
  "riskLevel": "low" | "medium" | "high",
  "summary": "what you found",
  "sources": ["url1", "url2"]
}

Be conservative. If no information found, risk is "high".`,
        },
        {
          role: "user",
          content: `Search for: ${query}

Vendor address: ${vendorAddress}
${vendorName ? `Vendor name: ${vendorName}` : ""}`,
        },
      ],
    } as never);

    const content = (response as unknown as { choices: Array<{ message: { content: string } }> }).choices[0]?.message?.content;
    if (!content) return { found: false, riskLevel: "high", summary: "No response from Venice", sources: [] };

    try {
      return JSON.parse(content);
    } catch {
      return { found: false, riskLevel: "medium", summary: content.slice(0, 200), sources: [] };
    }
  } catch (error) {
    return { found: false, riskLevel: "medium", summary: "Web search failed", sources: [] };
  }
}

/**
 * Check if an address is known to be suspicious
 */
export async function checkAddressReputation(address: string): Promise<{
  isKnown: boolean;
  reputation: "good" | "neutral" | "suspicious" | "malicious";
  details: string;
}> {
  const result = await searchVendor(address);

  if (!result.found) {
    return { isKnown: false, reputation: "neutral", details: "No information found" };
  }

  if (result.riskLevel === "high") {
    return { isKnown: true, reputation: "suspicious", details: result.summary };
  }

  if (result.riskLevel === "low") {
    return { isKnown: true, reputation: "good", details: result.summary };
  }

  return { isKnown: true, reputation: "neutral", details: result.summary };
}
