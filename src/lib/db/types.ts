import { RichText } from "@atproto/api";
import { Record } from "@atproto/api/dist/client/types/app/bsky/feed/post";

export interface Post {
  id?: number;
  scheduledFor: Date; // UTC
  status: "pending" | "published" | "failed";
  error?: string;
  createdAt: Date;
  data: ScheduledPostData;
  scheduledTimezone?: string;
  repostDates?: Date[];
}

export interface RepostData {
  id?: number;
  scheduledFor: Date;
  uri: string;
  cid: string;
  postData?: Record
}

export type BlobRefType = {
  $type: string;
  ref: {
    $link: string;
  };
  mimeType: string;
  size: number;
};

export const LabelOptions = [
  {key: undefined, label: "None", tooltip: undefined},
  {key: "nudity", label: "Nudity", tooltip: "Artistic or non-erotic nudity."},
  {key: "sexual", label: "Sexual", tooltip: "Pictures meant for adults."},
  {key: "porn", label: "Porn", tooltip: "Sexual activity or erotic nudity."},
  {key: "graphic-media", label: "Graphic Media", tooltip: "Media that contains violence / gore"}] as const;
export const LabelOptionsKeys = LabelOptions.map((pair) => pair.key);
export type LabelOptionType = typeof LabelOptionsKeys[number];

export type ScheduledImageData = {
  name: string;
  alt?: string;
}

export type ScheduledPostData = {
  text: string;
  facets?: RichText["facets"];
  labels?: LabelOptionType;
  embed?: Array<ScheduledImageData>
}

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

  getImage(name: string): Promise<Blob|undefined>;
  uploadImage(file: File): Promise<{imageName: string}>;

  getScheduledReposts(): Promise<RepostData[]>;
  getRepostsToSend(): Promise<RepostData[]>;
  getPublishedReposts(): Promise<RepostData[]>;
  getAllReposts(): Promise<RepostData[]>;
  createRepost(repost: RepostData): Promise<RepostData>;
  updateRepost(id: number, repost: Partial<RepostData>): Promise<void>;
  deleteRepost(id: number): Promise<void>;

  getCredentials(): Promise<Credentials | null>;
  setCredentials(creds: Omit<Credentials, "id">): Promise<void>;
  deleteCredentials(): Promise<void>;
}
