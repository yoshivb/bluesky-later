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
export const convertToBlueskyPost = (scheduledPost: ScheduledPostData, scheduleDate: string) : Record =>
{
  return {
    text: scheduledPost.text,
    facets: scheduledPost.facets,
    labels: scheduledPost.labels ? {
      $type: "com.atproto.label.defs#selfLabels",
      values: [{ val: scheduledPost.labels}]
    } : undefined,
    createdAt: scheduleDate
  }
}