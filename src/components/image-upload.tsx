import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, LoaderIcon, Sparkle, X } from "lucide-react";
import { toast } from "sonner";
import { BlobRefType } from "@/lib/db/types";
import { useLocalStorage } from "@/components/hooks/use-local-storage";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { agent, getStoredCredentials } from "@/lib/bluesky";
import { uploadImage } from "@/lib/bluesky-image";
import { generateAltText } from "@/components/generate-alt-text";
import { ImageStore } from "./image-store";

export type ImageData = {
  localImageId?: number;
  type: string;
  alt: string;
  blobRef?: BlobRefType;
};
interface ImageUploadProps {
  onImageSelect: (imageData: ImageData) => void;
  onImageClear: () => void;
  selectedImage?: ImageData;
}

export function ImageUpload({
  onImageSelect,
  onImageClear,
  selectedImage,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAltText, setIsGeneratingAltText] = useState(false);
  const [altText, setAltText] = useState(selectedImage?.alt || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [apiKey] = useLocalStorage("openaiApiKey", "");
  const [systemPrompt] = useLocalStorage("systemPrompt", "");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedImage) {
      setAltText("");
    } else {
      setAltText(selectedImage.alt);
    }
  }, [selectedImage]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const maxSize = 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      toast.error("Image must be less than 1MB");
      return;
    }

    setIsUploading(true);
    try {
      const creds = await getStoredCredentials();
      if (!creds) throw new Error("No credentials set");
      const { type, blobRef } = await uploadImage(file, agent, creds);

      const imageStore = new ImageStore();
      const imageId = await imageStore.saveImage(file);
      const previewImage = await imageStore.getImageAsDataUrl(imageId);
      setPreviewImage(previewImage);

      onImageSelect({
        localImageId: imageId,
        type,
        alt: altText,
        blobRef,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAltTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAltText(e.target.value);
    if (selectedImage && selectedImage.blobRef) {
      onImageSelect({
        ...selectedImage,
        alt: e.target.value,
        type: selectedImage.type || "",
        blobRef: selectedImage.blobRef,
      });
    }
  };

  const handleGenerateAltText = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!selectedImage?.localImageId) return;

      try {
        if (!apiKey) {
          toast.error(
            "OpenAI API key not configured. Please set it in the settings."
          );
          return;
        }

        setIsGeneratingAltText(true);
        const imageStore = new ImageStore();
        const imageBase64 = await imageStore.getImageAsBase64(
          selectedImage.localImageId
        );
        if (imageBase64) {
          const generatedAltText = await generateAltText(
            imageBase64,
            apiKey,
            systemPrompt || undefined
          );
          setAltText(generatedAltText);

          if (selectedImage && selectedImage.blobRef) {
            onImageSelect({
              ...selectedImage,
              alt: generatedAltText,
              type: selectedImage.type || "",
              blobRef: selectedImage.blobRef,
            });
          }
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to generate alt text");
      } finally {
        setIsGeneratingAltText(false);
      }
    },
    [selectedImage, apiKey, systemPrompt, onImageSelect]
  );

  return (
    <div className="space-y-4">
      {!selectedImage ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="flex flex-col items-center">
            <ImagePlus className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">
              {isUploading ? "Uploading..." : "Click to upload an image"}
            </p>
          </div>
          <input
            disabled={isGeneratingAltText || isUploading}
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative">
          <img
            src={previewImage || ""}
            alt={selectedImage.alt}
            className="w-full h-48 object-cover rounded-lg"
          />
          <button
            disabled={isGeneratingAltText || isUploading}
            onClick={onImageClear}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-row items-center justify-center space-x-2">
            <textarea
              disabled={isGeneratingAltText || isUploading}
              value={altText}
              onChange={(e) =>
                handleAltTextChange(
                  e as unknown as React.ChangeEvent<HTMLInputElement>
                )
              }
              placeholder="Add alt text for accessibility. You can also click the AI button to generate alt text."
              className="mt-2 w-full p-2 border disabled:opacity-50 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={5}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  disabled={isGeneratingAltText || isUploading}
                  onClick={handleGenerateAltText}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  {isGeneratingAltText ? (
                    <LoaderIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Sparkle className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Use AI to generate alt text</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
