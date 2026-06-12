import type { CitadelStore } from "@/lib/server/store-types";

export type StoreLoadResult = {
  store: CitadelStore;
  version: number;
};

export type StoreSaveResult = { version: number } | "conflict";

export type StoreBackend = {
  name: "postgres" | "file";
  load(): Promise<StoreLoadResult>;
  save(store: CitadelStore, expectedVersion: number): Promise<StoreSaveResult>;
};
