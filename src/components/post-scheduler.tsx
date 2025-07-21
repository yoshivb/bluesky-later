import React, { useCallback, useState } from "react";
import { Minus, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { format, addHours } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { ImageUpload } from "@/components/image-upload";
import { OfflineInfo } from "@/components/offline-info";
import { useLocalStorage } from "@/components/hooks/use-local-storage";
import { LabelOptionType, LabelOptions, ScheduledImageData } from "@/lib/db/types";
import { db } from "@/lib/db";
import { agent } from "@/lib/bluesky";
import { defaultPresets } from "./ui/date-time-picker-presets";
import { DateTimePicker } from "./ui/date-time-picker";
import { useDynamicPresets } from "./hooks/use-dynamic-presets";
import { TimezoneClock } from "./ui/timezone-clock";
import { RichText } from "@atproto/api/dist/rich-text/rich-text";

export function PostScheduler() {
  const [lastUpdatedRaw, setLastUpdated] = useLocalStorage("lastUpdated");
  const lastUpdated =
    typeof lastUpdatedRaw === "string" ? lastUpdatedRaw : undefined;

  const defaultDate = addHours(new Date(), 1);

  const [content, setContent] = useState("");
  const [scheduledDate, setScheduledDate] = useState(format(defaultDate, "yyyy-MM-dd"));
  const [scheduledTime, setScheduledTime] = useState(format(defaultDate, "HH:mm"));
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [scheduledTimezone, setScheduledTimezone] = useState(browserTimezone);
  const [images, setImages] = useState<ScheduledImageData[]|undefined>();
  const [labels, setLabels] = useState<LabelOptionType>();
  const [isLoading, setIsLoading] = useState(false);
  const dynamicPresets = useDynamicPresets(lastUpdated);

  const [scheduledRepostDates, setScheduledRepostDates] = useState<string[]|undefined>();
  const [scheduledRepostTimes, setScheduledRepostTimes] = useState<string[]|undefined>();

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
      const repostDates = scheduledRepostDates?.map((repostDate, index) => {
        return fromZonedTime(`${repostDate}T${scheduledRepostTimes?.[index]}`, scheduledTimezone);
      })

      if (scheduledFor < new Date()) {
        toast.error("Cannot schedule posts in the past");
        return;
      }

      if(repostDates)
      {
        for(const repostDate of repostDates)
        {
          if (repostDate < new Date()) {
            toast.error("Cannot schedule repost in the past");
            return;
          }
        }
      }

      const richText = new RichText({ text: content });
        // Process the text to detect mentions, links, etc.
      await richText.detectFacets(agent);

      try {
        setIsLoading(true);

        await db()?.createPost({
          data: {
            text: content,
            facets: richText.facets,
            labels: labels,
            embed: images
          },
          scheduledFor,
          scheduledTimezone,
          repostDates,
          status: "pending",
        });

        toast.success("Post scheduled successfully!");
        setContent("");

        const defaultDate = addHours(new Date(), 1);
        setScheduledDate(format(defaultDate, "yyyy-MM-dd"));
        setScheduledTime(format(defaultDate, "HH:mm"));
        setScheduledRepostDates(undefined);
        setScheduledRepostTimes(undefined);
        setImages(undefined);
        setLastUpdated(new Date().toISOString());
        setLabels(undefined);
        setIsLoading(false);
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
      scheduledRepostDates,
      scheduledRepostTimes,
      setLastUpdated
    ]
  );

  return (
    <div className="mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">
        Schedule New Post
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
                selectedImage={images?.[i]}
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

        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reposts
          </label>
          <div className="flex flex-col gap-3">
          {scheduledRepostDates?.map((_, index) => {
           const repostDate = scheduledRepostDates?.[index];
           const repostTime =scheduledRepostTimes?.[index];
           if(repostDate && repostTime)
           {
            return <div className="flex flex-row gap-2">
                <DateTimePicker
                value={{
                  date: repostDate,
                  time: repostTime,
                  timezone: scheduledTimezone,
                }}
                onChange={(val) => {
                  setScheduledRepostDates(scheduledRepostDates.map((date, i) => i === index ? val.date : date));
                  setScheduledRepostTimes(scheduledRepostTimes.map((time, i) => i === index ? val.time : time));
                }}
                presets={[...dynamicPresets, ...defaultPresets]}
                />
                <button
                disabled={isLoading}
                type="button"
                className="text-sm bg-blue-600 aspect-square disabled:bg-blue-400 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                onClick={() => {
                  const newDates = [...scheduledRepostDates];
                  const newTimes = [...scheduledRepostTimes];
                  newDates.splice(index, 1);
                  newTimes.splice(index, 1);
                  setScheduledRepostDates(newDates.length > 0 ? newDates : undefined);
                  setScheduledRepostTimes(newTimes.length > 0 ? newTimes : undefined);
                }}
                >
                  <Minus className="h-5 w-5" />
                </button>
              </div>
            }
          })}
          <button
            disabled={isLoading}
            type="button"
            className="w-full text-sm bg-blue-600 disabled:bg-blue-400 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            onClick={() => {
              let baselineDate = fromZonedTime(`${scheduledDate}T${scheduledTime}`, scheduledTimezone);

              const defaultDate = addHours(baselineDate, 24 * ((scheduledRepostDates?.length ?? 0) + 1));
              const dateToAdd = format(defaultDate, "yyyy-MM-dd");
              const timeToAdd = format(defaultDate, "HH:mm");

              setScheduledRepostDates(scheduledRepostDates ? [...scheduledRepostDates, dateToAdd] : [dateToAdd]);
              setScheduledRepostTimes(scheduledRepostTimes ? [...scheduledRepostTimes, timeToAdd] : [timeToAdd]);
            }}
          >
            <Plus className="h-5 w-5" />
            {isLoading ? "Scheduling..." : "Add Repost"}
          </button>
          </div>
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
