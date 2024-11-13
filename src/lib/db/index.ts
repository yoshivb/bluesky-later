import type { DatabaseInterface } from "./types";
import { LocalDB } from "./local";
import { RemoteDB } from "./remote";
import { ApiCredentials } from "../api";

let _db: RemoteDB | LocalDB | null = null;

export function createDatabase(
  credentials?: ApiCredentials
): DatabaseInterface | null {
  if (import.meta.env.VITE_STORAGE_MODE === "remote") {
    if (!credentials) {
      return null;
    }
    if (_db) {
      return _db;
    }
    _db = new RemoteDB(credentials);
    return _db;
  }
  if (_db) {
    return _db;
  }
  _db = new LocalDB();
  return _db;
}

export const db = createDatabase();

// Re-export types
export type { Post, Credentials } from "./types";
