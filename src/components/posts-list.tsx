import { format } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useLocalStorage } from "./hooks/use-local-storage";
import { Post } from "@/lib/db/types";
import { db } from "@/lib/db";
import { Record } from "@atproto/api/dist/client/types/app/bsky/feed/post";

type PostOrRepost = {
  scheduledPost?: Post;
  publishedPost?: Record;
  scheduledFor: Date;
  isRepost: boolean;
};

export function PostsList({
  EmptyComponent,
  type = "scheduled",
}: {
  EmptyComponent?: React.ReactNode;
  type?: "scheduled" | "published";
}) {
  const [posts, setPosts] = useState<PostOrRepost[]>([]);
  const [lastUpdated, setLastUpdated] = useLocalStorage("lastUpdated");

  const fetchPosts = useCallback(async () => {
    let AllFetchedPosts : PostOrRepost[] = [];

    const fetchedPosts =
      type === "scheduled"
        ? await db()?.getScheduledPosts()
        : await db()?.getPublishedPosts();
    if(fetchedPosts)
    {
      AllFetchedPosts = AllFetchedPosts.concat(fetchedPosts.map((post)=>{
        return {
          scheduledPost: post,
          scheduledFor: post.scheduledFor,
          isRepost: false
        }
      }));
      if(type === "scheduled")
      {
        for(const fetchedPost of fetchedPosts)
        {
          if(fetchedPost.repostDates)
          {
            for(const repostDate of fetchedPost.repostDates)
            {
              AllFetchedPosts.push({
                scheduledPost: fetchedPost,
                scheduledFor: repostDate,
                isRepost: true
            } as PostOrRepost)
            }
          }
        }
      }
    }
      
    const fetchedReposts = type === "scheduled"
        ? await db()?.getScheduledReposts()
        : await db()?.getPublishedReposts();
    if(fetchedReposts && fetchedReposts.length > 0)
    {
      const finalReposts = fetchedReposts.map((repost) => {
        if(repost.postData)
        {
          return {
            publishedPost: repost.postData,
            scheduledFor: repost.scheduledFor,
            isRepost: true
          } as PostOrRepost;
        }
      }).filter((post) => post !== undefined);

      AllFetchedPosts = AllFetchedPosts.concat(finalReposts);
    }
    AllFetchedPosts.sort(
      (a, b) => {
        if(type === "scheduled")
        {
          return new Date(a.scheduledFor).getTime() -
          new Date(b.scheduledFor).getTime()
        }
        else
        {
          return new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime()
        }
    });
    setPosts(
      AllFetchedPosts
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
        posts.map((post) => { 
          if(!post.isRepost && post.scheduledPost?.id)
          {
            return db()?.deletePost(post.scheduledPost.id);
          }
        })
      );
      await fetchPosts();
      setLastUpdated(new Date().toISOString());
    }
  }, [fetchPosts, posts, setLastUpdated]);

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
      <div className="flex items-center justify-end mb-6">
        <button
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
          if (!post.scheduledPost && !post.publishedPost) return null;

          const scheduledImage = post.scheduledPost?.data.embed?.[0];
          const postedImage = undefined; // Todo fetch this info somehow
          const postText = post.scheduledPost?.data.text ?? post.publishedPost?.text;

          return (
            <div
              className="bg-white p-4 rounded-lg shadow border border-gray-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-gray-900 mb-2">{postText}</p>
                  {scheduledImage && (
                    <div className="mb-2 space-y-2">
                      <Suspense fallback="...">
                        <ScheduledPostImage
                          imageName={scheduledImage.name}
                          alt={scheduledImage.alt}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </Suspense>
                      {scheduledImage.alt ? (
                        <p className="text-sm text-gray-400">
                          <strong>Alt text:</strong> {scheduledImage.alt}
                        </p>
                      ) : null}
                    </div>
                  )}
                  {/* {postedImage && (
                    <div className="mb-2 space-y-2">
                      <Suspense fallback="...">
                        <img
                          src={postedImage.image.ref}
                          alt={postedImage.alt}
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </Suspense>
                      {postedImage.alt ? (
                        <p className="text-sm text-gray-400">
                          <strong>Alt text:</strong> {postedImage.alt}
                        </p>
                      ) : null}
                    </div>
                  )} */}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>
                      Scheduled for{" "}
                      {format(post.scheduledFor, "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {post.isRepost && (
                    <p className="text-sm text-gray-500">Repost</p>
                  )}
                  {post.scheduledPost && post.scheduledPost.status === "pending" && (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  )}
                  {post.scheduledPost && post.scheduledPost.status === "published" && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {post.scheduledPost && post.scheduledPost.status === "failed" && (
                    <div className="relative group">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      {post.scheduledPost.error && (
                        <div className="absolute right-0 w-48 bg-white p-2 rounded shadow-lg hidden group-hover:block text-sm text-red-600">
                          {post.scheduledPost.error}
                        </div>
                      )}
                    </div>
                  )}
                  {post.scheduledPost && post.scheduledPost.id && (<button
                    onClick={() => post.scheduledPost?.id && deletePost(post.scheduledPost.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>)}
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

const ScheduledPostImage = ({
  imageName,
  alt,
  className,
}: {
  imageName: string;
  alt?: string;
  className?: string;
}) => {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchImage = async () => {
      const imageFile = await db()?.getImage(imageName);
      if(imageFile)
      {
        setImage(URL.createObjectURL(imageFile));
      }
    };

    fetchImage();
  }, [imageName]);

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
