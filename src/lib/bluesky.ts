import { BskyAgent, RichText } from "@atproto/api";
import { BlobRefType, PostData } from "@/lib/db/types";
import { fetchUrlMetadata } from "./metadata";
import { ApiCredentials } from "./api";
import { createDatabase, db } from "@/lib/db";

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
        await agent.post(post.data);
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

export const getPostData = async ({
  content,
  url,
  image,
  scheduledAt,
}: {
  scheduledAt: Date;
  content: string;
  url?: string;
  image?: {
    blobRef?: BlobRefType;
    alt?: string;
    localImageId?: number;
  };
}): Promise<PostData> => {
  const credentials = await db()?.getCredentials();
  if (!credentials) throw new Error("No credentials set");

  // Create a RichText instance
  const richText = new RichText({ text: content });
  // Process the text to detect mentions, links, etc.
  await richText.detectFacets(agent);

  const postData: PostData = {
    text: richText.text,
    facets: richText.facets,
    createdAt: scheduledAt.toISOString(),
  };

  if (url) {
    const external = await fetchUrlMetadata(url, agent, credentials);
    postData.embed = {
      $type: "app.bsky.embed.external",
      external,
    };
  } else if (image?.blobRef) {
    postData.embed = {
      $type: "app.bsky.embed.images",
      images: [
        {
          alt: image.alt || "",
          image: image.blobRef,
          localImageId: image.localImageId,
        },
      ],
    };
  }

  return postData;
};
