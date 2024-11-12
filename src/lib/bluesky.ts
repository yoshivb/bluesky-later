import { BskyAgent, RichText } from "@atproto/api";
import { BlobRefType, PostData } from "@/lib/db/types";
import { fetchUrlMetadata } from "./metadata";

const db = async () => await import("@/lib/db").then((mod) => mod.db);

export const agent = new BskyAgent({
  service: "https://bsky.social",
});

export async function getStoredCredentials() {
  const creds = await (await db()).getCredentials();
  return creds;
}

export async function login(identifier: string, password: string) {
  await agent.login({ identifier, password });
  await (await db()).setCredentials({ identifier, password });
}

export async function checkScheduledPosts(workerCredentials?: string) {
  const workerDb = workerCredentials
    ? await (async () => {
        const { createDatabase } = await import("@/lib/db");
        return createDatabase(workerCredentials);
      })()
    : await db();
  const pendingPosts = await workerDb.getPendingPosts();

  const creds = await workerDb.getCredentials();
  if (!creds) return;

  try {
    await agent.login({
      identifier: creds.identifier,
      password: creds.password,
    });

    for (const post of pendingPosts) {
      try {
        await agent.post(post.data);
        await (await db()).updatePost(post.id!, { status: "published" });
      } catch (error: unknown) {
        console.error("Post creation error:", error);
        await (await db()).updatePost(post.id!, { status: "published" });
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
}: {
  content: string;
  url?: string;
  image?: {
    blobRef?: BlobRefType;
    alt?: string;
    url?: string;
  };
}): Promise<PostData> => {
  const credentials = await (await db()).getCredentials();
  if (!credentials) throw new Error("No credentials set");

  // Create a RichText instance
  const richText = new RichText({ text: content });
  // Process the text to detect mentions, links, etc.
  await richText.detectFacets(agent);

  const postData: PostData = {
    text: richText.text,
    facets: richText.facets,
    createdAt: new Date().toISOString(),
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
          localUrl: image.url,
        },
      ],
    };
  }

  return postData;
};
