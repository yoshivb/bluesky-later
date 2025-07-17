import { RichText } from "@atproto/api";
import { AspectRatio } from "@atproto/api/dist/client/types/app/bsky/embed/images";

export interface Post {
  id?: number;
  scheduledFor: Date; // UTC
  status: "pending" | "published" | "failed";
  error?: string;
  createdAt: Date;
  data: PostData;
  scheduledTimezone?: string;
  repostDates?: Date[];
}

export interface RepostData {
  id?: number;
  scheduledFor: Date;
  uri: string;
  cid: string;
  postData?: PostData
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

export type PostData = {
  text: string;
  facets?: RichText["facets"];
  createdAt: string;
  labels?: {
    $type: string,
    values: {val: Exclude<LabelOptionType, undefined>}[]
  };
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
      aspectRatio: AspectRatio
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
