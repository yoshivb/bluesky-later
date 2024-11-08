let intervalId: NodeJS.Timeout | null = null;

self.onmessage = (e) => {
  if (e.data === "start") {
    intervalId = setInterval(async () => {
      // Import needs to be dynamic in workers
      const { checkScheduledPosts } = await import("../lib/bluesky");
      await checkScheduledPosts();
    }, 60000);
  } else if (e.data === "stop") {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};
