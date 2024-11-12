import { BskyAgent } from "@atproto/api";
import { uploadImage } from "./bluesky-image";
import { BlobRefType, Credentials } from "./db/types";

interface WebsiteData {
  lang: string;
  author: string;
  title: string;
  publisher: string;
  image?: string;
  url: string;
  description: string;
  date: string;
}

export async function fetchUrlMetadata(
  url: string,
  agent: BskyAgent,
  creds: Credentials
) {
  try {
    const metadataFetcherResponse = await fetch(
      `${import.meta.env.VITE_METADATA_FETCHER_URL}${url}`
    );
    const metadataFetcherResponseJson =
      (await metadataFetcherResponse.json()) as WebsiteData;

    if (!metadataFetcherResponseJson) {
      throw new Error("Failed to fetch metadata");
    }

    const { title, description, image } = metadataFetcherResponseJson;

    let websiteImage: BlobRefType | undefined = undefined;
    let websiteImageLocalUrl: string | undefined = undefined;
    try {
      if (image) {
        const proxyUrl = `${import.meta.env.VITE_IMAGE_PROXY_URL}${image}`;
        const imageResponse = await fetch(proxyUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }
        const imageBlob = await imageResponse.blob();
        const file = new File([imageBlob], `preview.${imageBlob.type}`, {
          type: imageBlob.type,
        });
        const uploadResult = await uploadImage(file, agent, creds);
        websiteImage = uploadResult.blobRef;
        websiteImageLocalUrl = URL.createObjectURL(file);
      }
    } catch (error) {
      console.error("Failed to fetch image:", error);
    }

    return {
      uri: url,
      title: title || url,
      description: description || "",
      thumb: websiteImage,
      websiteImageLocalUrl,
    };
  } catch (error) {
    console.error("Error fetching metadata:", error);
    return {
      uri: url,
      title: url,
      description: "",
      thumb: undefined,
      websiteImageLocalUrl: undefined,
    };
  }
}
