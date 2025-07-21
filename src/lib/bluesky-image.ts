import { BskyAgent } from "@atproto/api";
import { Credentials } from "./db/types";
import { AspectRatio } from "@atproto/api/dist/client/types/app/bsky/embed/images";

function getImageDimensions(file: Blob) {
  return new Promise (function (resolved: (value: AspectRatio) => void, rejected) {

    let reader = new FileReader();
    reader.onload = (ev) => {
      if(!ev.target)
      {
        rejected();
        return;
      }
      var i = new Image()

      i.onload = function(){
        resolved({width: i.width, height: i.height})
      };
      i.onerror = rejected

      i.src = ev.target.result as string;
    };
    reader.onerror = rejected;
    reader.readAsDataURL(file);
  })
}

export async function uploadImage(
  file: Blob,
  agent: BskyAgent,
  creds: Credentials
) {
  await agent.login({ identifier: creds.identifier, password: creds.password });

  const buffer = await file.arrayBuffer();
  const aspectRatio = await getImageDimensions(file);
  const uint8Array = new Uint8Array(buffer);
  const response = await agent.uploadBlob(uint8Array, {
    encoding: file.type,
  });

  // Structure the blob reference with $link
  return {
    blobRef: response.data.blob,
    aspectRatio
  };
}
