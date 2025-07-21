import { BskyAgent } from "@atproto/api";
import { BlobRefType, ScheduledPostData } from "@/lib/db/types";
import { ApiCredentials } from "./api";
import { createDatabase, db } from "@/lib/db";
import { Record } from "@atproto/api/dist/client/types/app/bsky/feed/post";
import { Image } from "@atproto/api/dist/client/types/app/bsky/embed/images";
import { uploadImage } from "./bluesky-image";

export const agent = new BskyAgent({
  service: "https://bsky.social",
});

export async function getStoredCredentials() {
  const creds = await db()?.getCredentials();
  return creds;
}

export async function login(identifier: string, password: string) {
  await agent.login({ identifier, password });
  await db()?.setCredentials({ identifier, password });
}

export async function checkScheduledPosts(workerCredentials?: ApiCredentials) {
  const workerDb = workerCredentials ? createDatabase(workerCredentials) : db();
  const pendingPosts = await workerDb?.getPostsToSend();

  if (!pendingPosts) return;

  const creds = await workerDb?.getCredentials();
  if (!creds) return;

  try {
    await agent.login({
      identifier: creds.identifier,
      password: creds.password,
    });

    for (const post of pendingPosts) {
      try {
        let bskyPost = convertToBlueskyPost(post.data, post.scheduledFor);

        if(post.data.embed)
        {
          let embedImages : (Omit<Image, "image"> & {image: BlobRefType})[] = [];
          for(const scheduledImage of post.data.embed)
          {
            const image = await db()?.getImage(scheduledImage.name);
            if(!image)
            {
              throw new Error("Failed to retrieve scheduled image!");
            }

            const bskyImage = await uploadImage(image, agent, creds);
            embedImages.push({
              image: bskyImage.blobRef.toJSON(),
              alt: scheduledImage.alt || "",
              aspectRatio: bskyImage.aspectRatio,
            })
          }
          
          bskyPost.embed = {
            $type: "app.bsky.embed.images",
            images: embedImages
          };
        }

        await agent.post(bskyPost);
        await db()?.updatePost(post.id!, { status: "published" });
      } catch (error: unknown) {
        console.error("Post creation error:", error);
        await db()?.updatePost(post.id!, { status: "published" });
      }
    }
  } catch (error: unknown) {
    console.error("Failed to process scheduled posts:", error);
  }
}

const convertToBlueskyPost = (scheduledPost: ScheduledPostData, scheduleDate: Date) : Record =>
{
  return {
    text: scheduledPost.text,
    facets: scheduledPost.facets,
    labels: scheduledPost.labels ? {
      $type: "com.atproto.label.defs#selfLabels",
      values: [{ val: scheduledPost.labels}]
    } : undefined,
    createdAt: scheduleDate.toISOString()
  }
}