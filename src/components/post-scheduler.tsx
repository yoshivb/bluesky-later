import React, { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { format, addHours } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { ImageData, ImageUpload } from "@/components/image-upload";
import { OfflineInfo } from "@/components/offline-info";
import { useLocalStorage } from "@/components/hooks/use-local-storage";
import { LabelOptionType, LabelOptions, Post } from "@/lib/db/types";
import { db } from "@/lib/db";
import { getPostData } from "@/lib/bluesky";
import { defaultPresets } from "./ui/date-time-picker-presets";
import { DateTimePicker } from "./ui/date-time-picker";
import { useDynamicPresets } from "./hooks/use-dynamic-presets";
import { TimezoneClock } from "./ui/timezone-clock";

export function PostScheduler() {
  const [lastUpdatedRaw, setLastUpdated] = useLocalStorage("lastUpdated");
  const lastUpdated =
    typeof lastUpdatedRaw === "string" ? lastUpdatedRaw : undefined;
  const [toEditPost, , clearToEditPost] = useLocalStorage<Post>("toEditPost");

  const defaultDate = addHours(new Date(), 1);

  const [content, setContent] = useState(
    toEditPost ? toEditPost.data.text : ""
  );
  const [scheduledDate, setScheduledDate] = useState(
    toEditPost?.scheduledFor
      ? format(toEditPost.scheduledFor, "yyyy-MM-dd")
      : format(defaultDate, "yyyy-MM-dd")
  );
  const [scheduledTime, setScheduledTime] = useState(
    toEditPost?.scheduledFor
      ? format(toEditPost.scheduledFor, "HH:mm")
      : format(defaultDate, "HH:mm")
  );
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [scheduledTimezone, setScheduledTimezone] = useState(
    toEditPost?.scheduledTimezone || browserTimezone
  );
  const [images, setImages] = useState<ImageData[]|undefined>(
    toEditPost?.data.embed?.images?.map((_image) => { return {..._image, blobRef: _image.image, type: _image.image.mimeType || "", alt: _image.alt || "" }; })
  );
  const [labels, setLabels] = useState<LabelOptionType>(
    toEditPost?.data.labels?.values?.[0]?.val
  )
  const [isLoading, setIsLoading] = useState(false);
  const dynamicPresets = useDynamicPresets(lastUpdated);

  useEffect(() => {
    if (toEditPost) {
      setContent(toEditPost.data.text);
      setScheduledDate(format(toEditPost.scheduledFor, "yyyy-MM-dd"));
      setScheduledTime(format(toEditPost.scheduledFor, "HH:mm"));
      if (toEditPost?.data.embed?.images?.[0]) {
        setImages(toEditPost?.data.embed?.images?.map((_image) => { return {..._image, blobRef: _image.image, type: _image.image.mimeType || "", alt: _image.alt || "" }; }));
      }
    } else {
      setContent("");
      const defaultDate = addHours(new Date(), 1);
      setScheduledDate(format(defaultDate, "yyyy-MM-dd"));
      setScheduledTime(format(defaultDate, "HH:mm"));
      setImages(undefined);
    }
  }, [toEditPost]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!content || !scheduledDate || !scheduledTime || !scheduledTimezone) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Combine date, time, and timezone to get UTC date
      const localDateTime = `${scheduledDate}T${scheduledTime}`;
      const scheduledFor = fromZonedTime(localDateTime, scheduledTimezone);
      const urls = extractUrls(content);
      const firstUrl = urls[0]; // We'll use the first URL found

      if (scheduledFor < new Date()) {
        toast.error("Cannot schedule posts in the past");
        return;
      }

      try {
        setIsLoading(true);
        const postData = await getPostData({
          scheduledAt: scheduledFor,
          content,
          url: firstUrl,
          images,
          labels
        });
        if (toEditPost && toEditPost.id) {
          await db()?.updatePost(toEditPost.id, {
            data: postData,
            scheduledFor,
            scheduledTimezone,
            status: "pending",
          });
        } else {
          await db()?.createPost({
            data: postData,
            scheduledFor,
            scheduledTimezone,
            status: "pending",
          });
        }

        toast.success("Post scheduled successfully!");
        setContent("");

        const defaultDate = addHours(new Date(), 1);
        setScheduledDate(format(defaultDate, "yyyy-MM-dd"));
        setScheduledTime(format(defaultDate, "HH:mm"));
        setImages(undefined);
        setLastUpdated(new Date().toISOString());
        setLabels(undefined);
        setIsLoading(false);
        clearToEditPost();
      } catch (error: unknown) {
        console.log(error);
        toast.error("Failed to schedule post");
        setIsLoading(false);
      }
    },
    [
      content,
      scheduledDate,
      scheduledTime,
      images,
      toEditPost,
      setLastUpdated,
      clearToEditPost,
    ]
  );

  return (
    <div className="mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">
        {toEditPost ? "Edit" : "Schedule New"} Post
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Post Content
          </label>
          <textarea
            disabled={isLoading}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[150px]"
            placeholder="What's on your mind?"
            maxLength={300}
          />
          <p className="text-sm text-gray-500 mt-1">
            {300 - content.length} characters remaining
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Images (optional)
          </label>
          {Array.from({length: Math.min(4, (images?.length ?? 0) + 1)}, (_, i) =>{
              return <ImageUpload
                onImageSelect={(_image) => setImages(images ? [...images, _image] : [_image])}
                onImageClear={() => setImages(undefined)}
                selectedImage={images?.at(i)}
              />;
          })}
        </div>

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Label (optional)
          </label>
          <fieldset className="flex gap-3 mb-2">
            {LabelOptions.map(({key, label}) => {
              return <label className="border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground rounded-full p-2 has-[:checked]:bg-blue-700 has-[:checked]:text-white grow">
                <input className="hidden" type="radio" name="post-label" checked={labels === key} onChange={() => setLabels(key)} />
                <p className="text-center text-sm">{label}</p>
              </label>
            })}
          </fieldset>
          <p className="block text-xs text-gray-500 min-h-4">
            {LabelOptions.find((option) => option.key === labels)?.tooltip ?? ""}
          </p>
        </div>

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date & Time
          </label>
          <DateTimePicker
            value={{
              date: scheduledDate,
              time: scheduledTime,
              timezone: scheduledTimezone,
            }}
            onChange={(val) => {
              setScheduledDate(val.date);
              setScheduledTime(val.time);
              setScheduledTimezone(val.timezone);
            }}
            presets={[...dynamicPresets, ...defaultPresets]}
          />
          <TimezoneClock timezone={scheduledTimezone} className="mt-2" />
        </div>

        <button
          disabled={isLoading}
          type="submit"
          className="w-full bg-blue-600 disabled:bg-blue-400 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Send className="h-5 w-5" />
          {isLoading ? "Scheduling..." : "Schedule Post"}
        </button>
        {import.meta.env.VITE_STORAGE_MODE !== "remote" && <OfflineInfo />}
      </form>
    </div>
  );
}

// In post-scheduler.tsx, add this function before the PostScheduler component
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}
