import OpenAI from "openai";

export const systemPrompt =
  "You are a helpful assistant that generates concise and descriptive alt text for images. Focus on the main elements and context of the image.";
export const defaultPrompt = "Generate a concise alt text for this image.";

export async function generateAltText(
  imageUrl: string,
  apiKey: string,
  prompt = defaultPrompt
): Promise<string> {
  try {
    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const base64Image = await blobToBase64(blob);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
      max_tokens: 100,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("Failed to generate alt text");
    return content;
  } catch (error) {
    console.error("Error generating alt text:", error);
    throw error;
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
