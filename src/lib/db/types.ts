import { RichText } from "@atproto/api";

export interface Post {
  id?: number;
  scheduledFor: Date; // UTC
  status: "pending" | "published" | "failed";
  error?: string;
  createdAt: Date;
  data: PostData;
  scheduledTimezone?: string;
}

export type BlobRefType = {
  $type: string;
  ref: {
    $link: string;
  };
  mimeType: string;
  size: number;
};

export type PostData = {
  text: string;
  facets?: RichText["facets"];
  createdAt: string;
  embed?: {
    $type: string;
    images?: Array<{
      alt?: string;
      localImageId?: number;
      image: {
        $type: string;
        ref: {
          $link: string;
        };
        mimeType: string;
        size: number;
      };
    }>;
    external?: {
      uri: string;
      title: string;
      description: string;
      thumb?: BlobRefType;
      websiteImageLocalId?: number;
    };
  };
};

export interface Credentials {
  id: number;
  identifier: string;
  password: string;
}

export interface DatabaseInterface {
  getScheduledPosts(): Promise<Post[]>;
  getPostsToSend(): Promise<Post[]>;
  getPublishedPosts(): Promise<Post[]>;
  getAllPosts(): Promise<Post[]>;
  createPost(post: Omit<Post, "id" | "createdAt">): Promise<Post>;
  updatePost(id: number, post: Partial<Post>): Promise<void>;
  deletePost(id: number): Promise<void>;
  getCredentials(): Promise<Credentials | null>;
  setCredentials(creds: Omit<Credentials, "id">): Promise<void>;
  deleteCredentials(): Promise<void>;
}
