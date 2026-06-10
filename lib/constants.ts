import { sepolia } from "viem/chains";

export const CHAIN = sepolia;
export const CHAIN_ID = sepolia.id;

// USDC on Sepolia per MetaMask Smart Accounts Kit docs
export const USDC_ADDRESS =
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const;

export const USDC_DECIMALS = 6;

// Pre-configured vendor addresses (Sepolia testnet)
export const DEFAULT_VENDOR_ADDRESS =
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;

// Suspicious address for risk assessment testing
export const SUSPICIOUS_ADDRESS =
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const;
