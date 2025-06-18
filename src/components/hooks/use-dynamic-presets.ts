import { useEffect, useState, useCallback } from "react";
import { addMinutes, addHours } from "date-fns";
import { db } from "@/lib/db";
import type { DateTimePreset } from "../ui/date-time-picker";

export const useDynamicPresets = (lastUpdated?: string): DateTimePreset[] => {
  const [presets, setPresets] = useState<DateTimePreset[]>([]);

  const fetchPresets = useCallback(async () => {
    const scheduledPosts = await db()?.getScheduledPosts();
    if (!scheduledPosts || scheduledPosts.length === 0) {
      setPresets([]);
      return;
    }
    // Find the post with the latest scheduledFor date
    const lastPost = scheduledPosts.reduce((latest, post) => {
      return new Date(post.scheduledFor) > new Date(latest.scheduledFor)
        ? post
        : latest;
    }, scheduledPosts[0]);
    const baseDate = new Date(lastPost.scheduledFor);
    const lastPostTimezone =
      lastPost.scheduledTimezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    setPresets([
      {
        label: "5 minutes after the last pending post",
        getValue: () => addMinutes(baseDate, 5),
        getTimezone: () => lastPostTimezone,
      },
      {
        label: "10 minutes after the last pending post",
        getValue: () => addMinutes(baseDate, 10),
        getTimezone: () => lastPostTimezone,
      },
      {
        label: "30 minutes after the last pending post",
        getValue: () => addMinutes(baseDate, 30),
        getTimezone: () => lastPostTimezone,
      },
      {
        label: "1 hour after the last pending post",
        getValue: () => addHours(baseDate, 1),
        getTimezone: () => lastPostTimezone,
      },
    ]);
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets, lastUpdated]);

  return presets;
};
