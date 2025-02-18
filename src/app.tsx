import { useEffect, lazy, Suspense, useState } from "react";
import { PostScheduler } from "@/components/post-scheduler";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/footer";
import { useAuth } from "@/components/use-auth";
import { MenuIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { db } from "@/lib/db";
import { PostsTabs } from "./components/stateful-tabs";

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
const SettingsForm = lazy(() =>
  import("@/components/settings-form").then((comp) => ({
    default: comp.SettingsForm,
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
    updateHasApiCreds,
    updateIsApiAuthenticated,
    apiCredentials,
  } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (import.meta.env.VITE_STORAGE_MODE !== "remote") {
      let worker: Worker | null = null;

      if (identifier) {
        worker = new Worker(new URL("./workers/scheduler.ts", import.meta.url));
        worker.postMessage({
          type: "start",
          apiCredentials,
        });
      }

      return () => {
        if (worker) {
          worker.postMessage("stop");
          worker.terminate();
        }
      };
    }
  }, [identifier, apiCredentials]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (import.meta.env.VITE_STORAGE_MODE === "remote" && !hasApiCredentials) {
    return (
      <div className="relative">
        <Suspense fallback={<LoadingSpinner />}>
          <SetupForm onSuccess={() => updateHasApiCreds(true)} />
        </Suspense>
        <Toaster />
      </div>
    );
  }

  if (import.meta.env.VITE_STORAGE_MODE === "remote" && !isApiAuthenticated) {
    return (
      <div className="relative">
        <Suspense fallback={<LoadingSpinner />}>
          <ApiLoginForm onSuccess={() => updateIsApiAuthenticated(true)} />
        </Suspense>
        <Toaster />
      </div>
    );
  }

  if (!identifier) {
    return (
      <div className="relative">
        <Suspense fallback={<LoadingSpinner />}>
          <LoginForm onSuccess={updateIdentifier} />
        </Suspense>
        <Toaster />
      </div>
    );
  }

  const handleLogout = async () => {
    await db()?.deleteCredentials();
    updateIdentifier(undefined);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-muted">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Bluesky Later</h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hover:bg-gray-100 p-2 rounded-md">
                  <MenuIcon className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-white p-2 border border-gray-100">
                <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  Logout (@{identifier})
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="px-6 lg:px-8 mb-8">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-0 sm:grid sm:grid-cols-2 gap-2">
            <div className="w-full">
              <PostScheduler />
            </div>
            <div className="w-full">
              <PostsTabs />
            </div>
          </div>
        </main>
        <Toaster />
        <Footer />
      </div>
      <Suspense fallback={null}>
        <SettingsForm open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      </Suspense>
    </TooltipProvider>
  );
}

export default App;
