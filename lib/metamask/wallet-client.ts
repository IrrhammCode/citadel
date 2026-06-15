"use client";

import { createWalletClient, custom } from "viem";
import {
  erc7715ProviderActions,
  erc7710WalletActions,
  type Erc7715Client,
  type Erc7710WalletClient,
} from "@metamask/smart-accounts-kit/actions";
import { CHAIN } from "@/lib/constants";

export type MetaMaskWalletClient = ReturnType<typeof createMetaMaskWalletClient>;

/**
 * Creates a MetaMask-backed wallet client with ERC-7715 and ERC-7710 actions.
 * Uses the currently selected MetaMask account from the provider.
 */
export function createMetaMaskWalletClient(account?: `0x${string}`) {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not available");
  }

  return createWalletClient({
    chain: CHAIN,
    transport: custom(window.ethereum),
    account,
  })
    .extend(erc7715ProviderActions())
    .extend(erc7710WalletActions()) as Erc7715Client & Erc7710WalletClient;
}
