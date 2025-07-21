import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { ImageStore } from "./image-store";
import { db } from "@/lib/db";
import { ScheduledImageData } from "@/lib/db/types";

interface ImageUploadProps {
  onImageSelect: (imageData: ScheduledImageData) => void;
  onImageClear: () => void;
  selectedImage?: ScheduledImageData;
}

export function ImageUpload({
  onImageSelect,
  onImageClear,
  selectedImage,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [altText, setAltText] = useState(selectedImage?.alt);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedImage) {
      setAltText(undefined);
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
      const imageData = await db()?.uploadImage(file);

      if(!imageData)
      {
        throw new Error("Image upload failed!");
      }

      const imageStore = new ImageStore();
      const imageId = await imageStore.saveImage(file);
      const previewImage = await imageStore.getImageAsDataUrl(imageId);
      onImageSelect({
        alt: altText,
        name: imageData.imageName
      });
      setPreviewImage(previewImage);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAltTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAltText(e.target.value);
    if (selectedImage && selectedImage.name) {
      onImageSelect({
        alt: e.target.value,
        name: selectedImage.name,
      });
    }
  };

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
            disabled={isUploading}
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
            className="w-full aspect-square object-contain rounded-lg"
          />
          <button
            disabled={isUploading}
            onClick={onImageClear}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-row items-center justify-center space-x-2">
            <textarea
              disabled={isUploading}
              value={altText}
              onChange={(e) =>
                handleAltTextChange(
                  e as unknown as React.ChangeEvent<HTMLInputElement>
                )
              }
              placeholder="Add alt text for accessibility."
              className="mt-2 w-full p-2 border disabled:opacity-50 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={5}
            />
          </div>
        </div>
      )}
    </div>
  );
}
