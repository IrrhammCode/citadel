/**
 * DeFi Yield Optimization System
 * Monitors and optimizes yield across DeFi protocols.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DeFiProtocol {
  name: string;
  chain: string;
  apy: number;
  tvl: number;
  riskLevel: "low" | "medium" | "high";
}

export interface YieldOpportunity {
  protocol: string;
  token: string;
  apy: number;
  riskScore: number;
  recommendation: string;
}

export interface YieldPosition {
  protocol: string;
  amount: number;
  entryApy: number;
  currentApy: number;
  pnl: number;
}

export interface YieldHistoryEntry {
  date: string;
  protocol: string;
  apy: number;
  tvl: number;
}

export interface YieldSummary {
  totalPositions: number;
  totalValue: number;
  averageApy: number;
  totalPnl: number;
  bestPosition: YieldPosition | null;
}

// ─── Supported Protocols ─────────────────────────────────────────────────────

const SUPPORTED_PROTOCOLS: DeFiProtocol[] = [
  {
    name: "AAVE",
    chain: "Ethereum",
    apy: 4.2,
    tvl: 12_500_000_000,
    riskLevel: "low",
  },
  {
    name: "Compound",
    chain: "Ethereum",
    apy: 3.8,
    tvl: 8_200_000_000,
    riskLevel: "low",
  },
  {
    name: "Uniswap",
    chain: "Ethereum",
    apy: 12.5,
    tvl: 5_800_000_000,
    riskLevel: "medium",
  },
];

// ─── In-memory state (replace with DB in production) ─────────────────────────

const positions: YieldPosition[] = [
  {
    protocol: "AAVE",
    amount: 50_000,
    entryApy: 3.9,
    currentApy: 4.2,
    pnl: 525,
  },
  {
    protocol: "Compound",
    amount: 25_000,
    entryApy: 4.1,
    currentApy: 3.8,
    pnl: -187.5,
  },
  {
    protocol: "Uniswap",
    amount: 15_000,
    entryApy: 14.0,
    currentApy: 12.5,
    pnl: 375,
  },
];

// ─── Functions ───────────────────────────────────────────────────────────────

/** Get supported DeFi protocols. */
export function getProtocols(): DeFiProtocol[] {
  return SUPPORTED_PROTOCOLS;
}

/** Scan available yield opportunities across supported protocols. */
export function scanYieldOpportunities(): YieldOpportunity[] {
  const tokens = ["USDC", "ETH", "WBTC", "DAI", "USDT"];
  const opportunities: YieldOpportunity[] = [];

  for (const protocol of SUPPORTED_PROTOCOLS) {
    for (const token of tokens) {
      // Vary APY slightly per token to simulate real data
      const tokenModifier = token === "ETH" ? 1.2 : token === "WBTC" ? 0.9 : 1.0;
      const apy = Math.round(protocol.apy * tokenModifier * 100) / 100;
      const riskScore =
        protocol.riskLevel === "low" ? 0.2 :
        protocol.riskLevel === "medium" ? 0.5 : 0.8;

      let recommendation: string;
      if (apy >= 10) {
        recommendation = "High yield — suitable for risk-tolerant portfolios";
      } else if (apy >= 5) {
        recommendation = "Moderate yield — balanced risk/reward";
      } else {
        recommendation = "Conservative yield — ideal for stable allocation";
      }

      opportunities.push({
        protocol: protocol.name,
        token,
        apy,
        riskScore,
        recommendation,
      });
    }
  }

  // Sort by APY descending
  return opportunities.sort((a, b) => b.apy - a.apy);
}

/** Calculate optimal allocation given a total amount and risk tolerance. */
export function calculateOptimalAllocation(
  totalAmount: number,
  riskTolerance: "conservative" | "moderate" | "aggressive" = "moderate",
): { protocol: string; token: string; allocation: number; expectedApy: number }[] {
  const opportunities = scanYieldOpportunities();

  // Filter by risk tolerance
  const maxRisk =
    riskTolerance === "conservative" ? 0.3 :
    riskTolerance === "moderate" ? 0.6 : 1.0;

  const eligible = opportunities.filter((o) => o.riskScore <= maxRisk);

  if (eligible.length === 0) return [];

  // Simple weighted allocation: distribute across top 3 by APY
  const top = eligible.slice(0, 3);
  const weights =
    riskTolerance === "conservative" ? [0.5, 0.3, 0.2] :
    riskTolerance === "moderate" ? [0.4, 0.35, 0.25] :
    [0.35, 0.35, 0.3];

  return top.map((opp, i) => ({
    protocol: opp.protocol,
    token: opp.token,
    allocation: Math.round(totalAmount * weights[i]),
    expectedApy: opp.apy,
  }));
}

/** Get historical yield data (simulated). */
export function getYieldHistory(
  protocol?: string,
  days: number = 30,
): YieldHistoryEntry[] {
  const history: YieldHistoryEntry[] = [];
  const protocols = protocol
    ? SUPPORTED_PROTOCOLS.filter((p) => p.name === protocol)
    : SUPPORTED_PROTOCOLS;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    for (const p of protocols) {
      // Simulate slight APY fluctuation
      const fluctuation = (Math.sin(i * 0.3) * 0.5 + Math.random() * 0.3 - 0.15);
      const apy = Math.round((p.apy + fluctuation) * 100) / 100;
      const tvl = Math.round(p.tvl * (1 + (Math.random() * 0.02 - 0.01)));

      history.push({ date: dateStr, protocol: p.name, apy, tvl });
    }
  }

  return history;
}

/** Get summary of all yield positions. */
export function getYieldSummary(): YieldSummary {
  if (positions.length === 0) {
    return {
      totalPositions: 0,
      totalValue: 0,
      averageApy: 0,
      totalPnl: 0,
      bestPosition: null,
    };
  }

  const totalValue = positions.reduce((sum, p) => sum + p.amount, 0);
  const averageApy =
    positions.reduce((sum, p) => sum + p.currentApy, 0) / positions.length;
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const bestPosition = positions.reduce((best, p) =>
    p.pnl > (best?.pnl ?? -Infinity) ? p : best,
    null as YieldPosition | null,
  );

  return {
    totalPositions: positions.length,
    totalValue,
    averageApy: Math.round(averageApy * 100) / 100,
    totalPnl,
    bestPosition,
  };
}
