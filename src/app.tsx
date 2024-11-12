import { useEffect, lazy, Suspense } from "react";
import { PostScheduler } from "@/components/post-scheduler";
import { ScheduledPosts } from "@/components/scheduled-posts";
import { Toaster } from "react-hot-toast";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/use-auth";

const ApiLoginForm = lazy(() =>
  import("@/components/api-login-form").then((comp) => ({
    default: comp.ApiLoginForm,
  }))
);
const LoginForm = lazy(() =>
  import("@/components/login-form").then((comp) => ({
    default: comp.LoginForm,
  }))
);
const SetupForm = lazy(() =>
  import("@/components/setup-form").then((comp) => ({
    default: comp.SetupForm,
  }))
);

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

function App() {
  const {
    identifier,
    isLoading,
    hasApiCredentials,
    isApiAuthenticated,
    updateIdentifier,
    updateApiAuth,
  } = useAuth();

  useEffect(() => {
    if (import.meta.env.VITE_STORAGE_MODE !== "remote") {
      let worker: Worker | null = null;

      if (identifier) {
        worker = new Worker(new URL("./workers/scheduler.ts", import.meta.url));
        const credentials = localStorage.getItem("apiCredentials");
        worker.postMessage({
          type: "start",
          credentials,
        });
      }

      return () => {
        if (worker) {
          worker.postMessage("stop");
          worker.terminate();
        }
      };
    }
  }, [identifier]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (import.meta.env.VITE_STORAGE_MODE === "remote" && !hasApiCredentials) {
    return (
      <div className="relative">
        <Suspense fallback={<LoadingSpinner />}>
          <SetupForm onSuccess={() => updateApiAuth(true)} />
        </Suspense>
        <Toaster position="top-right" />
      </div>
    );
  }

  if (import.meta.env.VITE_STORAGE_MODE === "remote" && !isApiAuthenticated) {
    return (
      <div className="relative">
        <Suspense fallback={<LoadingSpinner />}>
          <ApiLoginForm onSuccess={() => updateApiAuth(true)} />
        </Suspense>
        <Toaster position="top-right" />
      </div>
    );
  }

  if (!identifier) {
    return (
      <div className="relative">
        <Suspense fallback={<LoadingSpinner />}>
          <LoginForm onSuccess={updateIdentifier} />
        </Suspense>
        <Toaster position="top-right" />
      </div>
    );
  }

  const handleLogout = async () => {
    const { db } = await import("@/lib/db");
    await db.deleteCredentials();
    updateIdentifier(undefined);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Bluesky Later</h1>
          <button className="hover:underline text-sm" onClick={handleLogout}>
            Logout (@{identifier})
          </button>
        </div>
      </header>

      <main className="px-6 lg:px-8 mb-8">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-0 sm:grid sm:grid-cols-2 gap-2">
          <div className="w-full">
            <PostScheduler />
          </div>
          <div className="w-full">
            <ScheduledPosts />
          </div>
        </div>
      </main>
      <Toaster position="top-right" />
      <Footer />
    </div>
  );
}

export default App;
