"use client";

import { createConfig, http } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { sepolia } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [metaMask()],
  transports: {
    [sepolia.id]: http(),
  },
  ssr: true,
});
