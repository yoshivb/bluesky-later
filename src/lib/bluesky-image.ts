import { BskyAgent } from "@atproto/api";
import { Credentials } from "./db/types";

export async function uploadImage(
  file: File,
  agent: BskyAgent,
  creds: Credentials
) {
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
