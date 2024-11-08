import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, Clock, Image } from "lucide-react";

export function ScheduledPosts() {
  const posts = useLiveQuery(() =>
    db.posts.orderBy("scheduledFor").reverse().toArray()
  );

  const clearScheduledPosts = async () => {
    await db.posts.clear(); // Clear all posts from the database
  };

  if (!posts) return null;

  return (
    <div className="mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Scheduled Posts</h2>
        <button onClick={clearScheduledPosts} className="text-sm">
          Clear All
        </button>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-white p-4 rounded-lg shadow border border-gray-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-gray-900 mb-2">{post.content}</p>
                {post.image && (
                  <div className="mb-2">
                    <img
                      src={post.image.url}
                      alt={post.image.alt}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>
                    Scheduled for{" "}
                    {format(post.scheduledFor, "MMM d, yyyy h:mm a")}
                  </span>
                  {post.image && (
                    <>
                      <span className="mx-1">•</span>
                      <Image className="h-4 w-4" />
                      <span>Has image</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                {post.status === "pending" && (
                  <Clock className="h-5 w-5 text-yellow-500" />
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
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <p className="text-center text-gray-500">No posts scheduled yet</p>
        )}
      </div>
    </div>
  );
}
