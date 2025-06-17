import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Image,
  Link,
  PenIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useLocalStorage } from "./hooks/use-local-storage";
import { Post } from "@/lib/db/types";
import { db } from "@/lib/db";
import { Button } from "./ui/button";
import { ImageStore } from "./image-store";

export function PostsList({
  EmptyComponent,
  type = "scheduled",
}: {
  EmptyComponent?: React.ReactNode;
  type?: "scheduled" | "published";
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [lastUpdated, setLastUpdated] = useLocalStorage("lastUpdated");
  const [toEditPost, setToEditPost, clearToEditPost] =
    useLocalStorage<Post>("toEditPost");

  const fetchPosts = useCallback(async () => {
    const fetchedPosts =
      type === "scheduled"
        ? await db()?.getScheduledPosts()
        : await db()?.getPublishedPosts();
    setPosts(
      fetchedPosts
        ? fetchedPosts.sort(
            (a, b) =>
              new Date(a.scheduledFor).getTime() -
              new Date(b.scheduledFor).getTime()
          )
        : []
    );
  }, [type]);

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(() => fetchPosts(), 60000);
    return () => clearInterval(interval);
  }, [fetchPosts, lastUpdated]);

  const clearScheduledPosts = useCallback(async () => {
    if (window.confirm("Are you sure you want to clear all scheduled posts?")) {
      await Promise.all(
        posts.map((post) => post.id && db()?.deletePost(post.id))
      );
      clearToEditPost();
      await fetchPosts();
      setLastUpdated(new Date().toISOString());
    }
  }, [fetchPosts, posts, setLastUpdated, clearToEditPost]);

  const deletePost = useCallback(
    async (id: number) => {
      if (window.confirm("Are you sure you want to delete this post?")) {
        await db()?.deletePost(id);
        await fetchPosts();
        setLastUpdated(new Date().toISOString());
      }
    },
    [fetchPosts, setLastUpdated]
  );

  if (!posts) return null;

  return (
    <div className={cn("mx-auto p-6 relative")}>
      {toEditPost && (
        <div className="absolute inset-0 p-2 py-8 bg-white bg-opacity-60 backdrop-filter backdrop-blur-sm flex flex-col items-center justify-start">
          <Button
            onClick={() => {
              clearToEditPost();
            }}
          >
            Cancel editing
          </Button>
        </div>
      )}
      <div className="flex items-center justify-end mb-6">
        <button
          disabled={!!toEditPost}
          onClick={clearScheduledPosts}
          className={cn(
            "text-sm text-red-600 hover:text-red-700",
            posts.length === 0 && "hidden"
          )}
        >
          Clear All
        </button>
      </div>

      <div className="space-y-4">
        {posts.map((post) => {
          if (!post.data) return null;
          const firstImage = post.data.embed?.images?.[0]?.localImageId;
          const websiteImage = post.data.embed?.external?.websiteImageLocalId;
          const imageId = firstImage || websiteImage;
          const imageAlt = post.data.embed?.images?.[0]?.alt;

          return (
            <div
              key={post.id}
              className="bg-white p-4 rounded-lg shadow border border-gray-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-gray-900 mb-2">{post.data.text}</p>

                  {imageId && (
                    <div className="mb-2 space-y-2">
                      <Suspense fallback="...">
                        <PostImage
                          imageId={imageId}
                          alt={imageAlt}
                          className="w-32 h-32 object-cover rounded-lg"
                          key={imageId}
                        />
                      </Suspense>
                      {imageAlt ? (
                        <p className="text-sm text-gray-400">
                          <strong>Alt text:</strong> {imageAlt}
                        </p>
                      ) : null}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>
                      Scheduled for{" "}
                      {post.scheduledTimezone
                        ? formatInTimeZone(
                            post.scheduledFor,
                            post.scheduledTimezone,
                            "MMM d, yyyy h:mm a"
                          )
                        : format(post.scheduledFor, "MMM d, yyyy h:mm a")}
                      {post.scheduledTimezone ? (
                        <>
                          {" "}
                          <span className="ml-1">
                            ({post.scheduledTimezone})
                          </span>
                        </>
                      ) : null}
                    </span>
                    {firstImage && (
                      <>
                        <span className="mx-1">•</span>
                        <Image className="h-4 w-4" />
                        <span>Has image</span>
                      </>
                    )}
                    {websiteImage && imageId && (
                      <>
                        <span className="mx-1">•</span>
                        <Link className="h-4 w-4" />
                        <span>Social card</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {post.status === "pending" && (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  )}
                  {post.status !== "published" && (
                    <button
                      disabled={!!toEditPost}
                      onClick={() => {
                        setToEditPost(post);
                      }}
                    >
                      <PenIcon className="h-5 w-5 text-gray-400" />
                    </button>
                  )}
                  {post.status === "published" && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {post.status === "failed" && (
                    <div className="relative group">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      {post.error && (
                        <div className="absolute right-0 w-48 bg-white p-2 rounded shadow-lg hidden group-hover:block text-sm text-red-600">
                          {post.error}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    disabled={!!toEditPost}
                    onClick={() => post.id && deletePost(post.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {posts.length === 0 && EmptyComponent}
      </div>
    </div>
  );
}

const PostImage = ({
  imageId,
  alt,
  className,
}: {
  imageId: number;
  alt?: string;
  className?: string;
}) => {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      const imageStore = new ImageStore();
      const imageData = await imageStore.getImageAsDataUrl(imageId);
      setImage(imageData);
    };

    fetchImage();
  }, [imageId]);

  if (!image) return null;

  return <img src={image} alt={alt} className={className} />;
};

export const NoItemsComponent = ({
  type,
}: {
  type: "scheduled" | "published";
}) => {
  return <p className="text-center text-gray-500">No posts {type} yet</p>;
};

export const ScheduledPosts = () => {
  return (
    <PostsList
      type="scheduled"
      EmptyComponent={<NoItemsComponent type="scheduled" />}
    />
  );
};

export const PublishedPosts = () => {
  return (
    <PostsList
      type="published"
      EmptyComponent={<NoItemsComponent type="published" />}
    />
  );
};
