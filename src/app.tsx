import { useEffect, useState } from "react";
import { LoginForm } from "./components/login-form";
import { PostScheduler } from "./components/post-scheduler";
import { ScheduledPosts } from "./components/scheduled-posts";
import { getStoredCredentials, checkScheduledPosts } from "./lib/bluesky";
import { Toaster } from "react-hot-toast";
import { db } from "./lib/db";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [identifier, setIdentifier] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const creds = await getStoredCredentials();
      if (creds && creds.identifier) {
        setIdentifier(creds.identifier);
      }
      setIsAuthenticated(!!creds);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(checkScheduledPosts, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginForm onSuccess={() => setIsAuthenticated(true)} />
        <Toaster position="top-right" />
      </>
    );
  }

  const handleLogout = async () => {
    await db.credentials.clear(); // Clear credentials from the database
    setIsAuthenticated(false); // Update authenticated state
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Bluesky Post Scheduler
          </h1>
          <button className="hover:underline text-sm" onClick={handleLogout}>
            Logout (@{identifier})
          </button>
        </div>
      </header>

      <main className=":px-6 lg:px-8">
        <div className="max-w-7xl  mx-auto px-4 py-6 sm:px-0 sm:grid sm:grid-cols-2 gap-2">
          <div className="w-full">
            <PostScheduler />
          </div>
          <div className="w-full">
            <ScheduledPosts />
          </div>
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
