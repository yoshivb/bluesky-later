import type { DatabaseInterface } from "./types";
import { LocalDB } from "./local";
import { RemoteDB } from "./remote";
import { ApiCredentials } from "../api";
import superjson from "superjson";
import { StorageWrapper } from "@/components/hooks/use-local-storage";

let _db: RemoteDB | LocalDB | null = null;

export function createDatabase(
  credentials?: ApiCredentials
): DatabaseInterface | null {
  if (import.meta.env.VITE_STORAGE_MODE === "remote") {
    if (_db) {
      return _db;
    }
    let credentialsToUse = credentials;
    if (!credentials) {
      const apiCredentialsLocalStorage = localStorage.getItem("apiCredentials");
      if (apiCredentialsLocalStorage) {
        const parsed = superjson.parse(
          apiCredentialsLocalStorage
        ) as StorageWrapper<ApiCredentials>;
        if (parsed.type === "value") {
          credentialsToUse = parsed.value;
        }
      } else {
        return null;
      }
    }
    _db = new RemoteDB(credentialsToUse);
    return _db;
  }
  if (_db) {
    return _db;
  }
  _db = new LocalDB();
  return _db;
}

export const db = () => createDatabase();

// Re-export types
export type { Post, Credentials } from "./types";
