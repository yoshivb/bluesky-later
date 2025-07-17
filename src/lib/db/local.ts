import Dexie, { type Table } from "dexie";
import type { DatabaseInterface, Post, Credentials, RepostData } from "./types";

class BlueSkyDB extends Dexie {
  posts!: Table<Post>;
  reposts!: Table<RepostData>;
  credentials!: Table<{
    id: number;
    identifier: string;
    password: string;
  }>;

  constructor() {
    super("blueSkyDB");
    this.version(2).stores({
      posts: "++id, scheduledFor, status, data",
      credentials: "++id, identifier",
    });
  }
}

export class LocalDB implements DatabaseInterface {
  private db: BlueSkyDB;

  constructor() {
    this.db = new BlueSkyDB();
  }

  async getPostsToSend(): Promise<Post[]> {
    return this.db.posts
      .where("status")
      .equals("pending")
      .and((post) => new Date(post.scheduledFor) <= new Date())
      .toArray();
  }

  async getScheduledPosts(): Promise<Post[]> {
    return this.db.posts
      .where("status")
      .equals("pending")
      .and((post) => new Date(post.scheduledFor) > new Date())
      .toArray();
  }

  async getPublishedPosts(): Promise<Post[]> {
    return this.db.posts.where("status").equals("published").toArray();
  }

  async getAllPosts(): Promise<Post[]> {
    return this.db.posts.toArray();
  }

  async createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
    const id = await this.db.posts.add({
      ...post,
      createdAt: new Date(),
    });
    return this.db.posts.get(id) as Promise<Post>;
  }

  async updatePost(id: number, post: Partial<Post>): Promise<void> {
    await this.db.posts.update(id, post);
  }

  async deletePost(id: number): Promise<void> {
    await this.db.posts.delete(id);
  }

  async getRepostsToSend(): Promise<RepostData[]> {
    return this.db.reposts
      .where("status")
      .equals("pending")
      .and((repost) => new Date(repost.scheduledFor) <= new Date())
      .toArray();
  }

  async getScheduledReposts(): Promise<RepostData[]> {
    return this.db.reposts
      .where("status")
      .equals("pending")
      .and((repost) => new Date(repost.scheduledFor) > new Date())
      .toArray();
  }

  async getPublishedReposts(): Promise<RepostData[]> {
    return this.db.reposts.where("status").equals("published").toArray();
  }

  async getAllReposts(): Promise<RepostData[]> {
    return this.db.reposts.toArray();
  }

  async createRepost(repost: RepostData): Promise<RepostData> {
    const id = await this.db.reposts.add(repost);
    return this.db.reposts.get(id) as Promise<RepostData>;
  }

  async updateRepost(id: number, repost: Partial<RepostData>): Promise<void> {
    await this.db.reposts.update(id, repost);
  }
  
  async deleteRepost(id: number): Promise<void> {
    await this.db.reposts.delete(id);
  }

  async getCredentials(): Promise<Credentials | null> {
    const creds = await this.db.credentials.toCollection().first();
    return creds || null;
  }

  async setCredentials(creds: Omit<Credentials, "id">): Promise<void> {
    await this.db.credentials.clear();
    await this.db.credentials.add({
      ...creds,
      id: 1,
    });
  }

  async deleteCredentials(): Promise<void> {
    await this.db.credentials.clear();
  }
}
