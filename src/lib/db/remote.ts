import { parseISO } from "date-fns";
import type { DatabaseInterface, Post, Credentials, RepostData } from "./types";
import { ApiCredentials, makeAuthenticatedRequest } from "../api";

export class RemoteDB implements DatabaseInterface {
  private apiUrl: string;
  private apiCredentials?: ApiCredentials;

  constructor(credentials?: ApiCredentials) {
    this.apiUrl = import.meta.env.VITE_API_URL;
    this.apiCredentials = credentials;
  }

  private async fetchApi(endpoint: string, options?: RequestInit) {
    const response = await makeAuthenticatedRequest(
      `${this.apiUrl}/api${endpoint}`,
      options,
      this.apiCredentials || undefined // You'll need to add this as a class property
    );
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }
    return response.json();
  }

  deserializePost = (post: Record<string, unknown>) => {
    return {
      ...post,
      scheduledFor: parseISO(post.scheduled_for as string),
      repostDates: (post.repost_dates as string[]|undefined)?.map((date) => parseISO(date))
    };
  };

  async getPendingPosts(): Promise<Post[]> {
    return this.fetchApi("/posts/pending").then((posts) =>
      posts.map(this.deserializePost)
    );
  }

  async getPublishedPosts(): Promise<Post[]> {
    return this.fetchApi("/posts/published").then((posts) =>
      posts.map(this.deserializePost)
    );
  }

  async getScheduledPosts(): Promise<Post[]> {
    return this.fetchApi("/posts/scheduled").then((posts) =>
      posts.map(this.deserializePost)
    );
  }

  async getPostsToSend(): Promise<Post[]> {
    return this.fetchApi("/posts/to-send").then((posts) =>
      posts.map(this.deserializePost)
    );
  }

  async getAllPosts(): Promise<Post[]> {
    return this.fetchApi("/posts").then((posts) => {
      return posts.map(this.deserializePost);
    });
  }

  async createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post> {
    return this.fetchApi("/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
  }

  async updatePost(id: number, post: Partial<Post>): Promise<void> {
    await this.fetchApi(`/posts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
  }

  async deletePost(id: number): Promise<void> {
    await this.fetchApi(`/posts/${id}`, {
      method: "DELETE",
    });
  }


  async getPublishedReposts(): Promise<RepostData[]> {
    return this.fetchApi("/reposts/published").then((reposts) =>
      reposts.map(this.deserializePost)
    );
  }

  async getScheduledReposts(): Promise<RepostData[]> {
    return this.fetchApi("/reposts/scheduled").then((reposts) =>
      reposts.map(this.deserializePost)
    );
  }

  async getRepostsToSend(): Promise<RepostData[]> {
    return this.fetchApi("/reposts/to-send").then((reposts) =>
      reposts.map(this.deserializePost)
    );
  }

  async getAllReposts(): Promise<RepostData[]> {
    return this.fetchApi("/reposts").then((reposts) => {
      return reposts.map(this.deserializePost);
    });
  }

  async createRepost(repost: RepostData): Promise<RepostData> {
    return this.fetchApi("/reposts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(repost),
    });
  }

  async updateRepost(id: number, repost: Partial<RepostData>): Promise<void> {
    await this.fetchApi(`/reposts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(repost),
    });
  }

  async deleteRepost(id: number): Promise<void> {
    await this.fetchApi(`/reposts/${id}`, {
      method: "DELETE",
    });
  }

  async getCredentials(): Promise<Credentials | null> {
    try {
      return await this.fetchApi("/credentials");
    } catch (error: unknown) {
      console.log(error);
      return null;
    }
  }

  async setCredentials(creds: Omit<Credentials, "id">): Promise<void> {
    await this.fetchApi("/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(creds),
    });
  }

  async deleteCredentials(): Promise<void> {
    await this.fetchApi("/credentials", {
      method: "DELETE",
    });
  }
}
