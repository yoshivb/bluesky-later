import Dexie, { type Table } from "dexie";

export interface Post {
  id?: number;
  content: string;
  scheduledFor: Date;
  status: "pending" | "published" | "failed";
  error?: string;
  createdAt: Date;
  image?: {
    url: string;
    type: string;
    alt?: string;
    blobRef?: {
      $type: string;
      ref: {
        $link: string;
      };
      mimeType: string;
      size: number;
    };
  };
}

export class BlueSkyDB extends Dexie {
  posts!: Table<Post>;
  credentials!: Table<{
    id: number;
    identifier: string;
    password: string;
  }>;

  constructor() {
    super("blueSkyDB");
    this.version(1).stores({
      posts: "++id, scheduledFor, status",
      credentials: "++id, identifier",
    });
  }
}

export const db = new BlueSkyDB();
