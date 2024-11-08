import { BskyAgent } from "@atproto/api";
import { db } from "./db";

export const agent = new BskyAgent({
  service: "https://bsky.social",
});

export async function getStoredCredentials() {
  const creds = await db.credentials.toArray();
  return creds[0];
}

export async function login(identifier: string, password: string) {
  await agent.login({ identifier, password });
  await db.credentials.clear();
  await db.credentials.add({
    identifier,
    password,
    id: 0,
  });
}

export async function uploadImage(file: File) {
  const creds = await getStoredCredentials();
  if (!creds) throw new Error("Not authenticated");

  await agent.login({ identifier: creds.identifier, password: creds.password });

  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);
  const response = await agent.uploadBlob(uint8Array, {
    encoding: file.type,
  });

  // Structure the blob reference with $link
  return {
    blobRef: {
      $type: "blob",
      ref: {
        $link: response.data.blob.ref.toString(), // Convert the ref to the correct $link format
      },
      mimeType: response.data.blob.mimeType,
      size: response.data.blob.size,
    },
    type: file.type,
    url: URL.createObjectURL(file), // Add this for local preview
  };
}

export type UploadImageResult = Awaited<ReturnType<typeof uploadImage>>;
export type BlobRefType = UploadImageResult["blobRef"];

export async function checkScheduledPosts() {
  const now = new Date();
  const pendingPosts = await db.posts
    .where("status")
    .equals("pending")
    .and((post) => post.scheduledFor <= now)
    .toArray();

  const creds = await getStoredCredentials();
  if (!creds) return;

  try {
    await agent.login({
      identifier: creds.identifier,
      password: creds.password,
    });

    for (const post of pendingPosts) {
      try {
        const postData: {
          text: string;
          createdAt: string;
          embed?: {
            $type: string;
            images: Array<{
              alt: string;
              image: {
                $type: string;
                ref: {
                  $link: string;
                };
                mimeType: string;
                size: number;
              };
            }>;
          };
        } = {
          text: post.content,
          createdAt: new Date().toISOString(),
        };

        if (post.image?.blobRef) {
          postData.embed = {
            $type: "app.bsky.embed.images",
            images: [
              {
                alt: post.image.alt || "",
                image: post.image.blobRef,
              },
            ],
          };
        }

        await agent.post(postData);
        await db.posts.update(post.id!, { status: "published" });
      } catch (error: unknown) {
        console.error("Post creation error:", error);
        await db.posts.update(post.id!, {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error: unknown) {
    console.error("Failed to process scheduled posts:", error);
  }
}
