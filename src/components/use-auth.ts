import { useState, useEffect } from "react";
import { useLocalStorage } from "./hooks/use-local-storage";
import { ApiCredentials } from "@/lib/api";

interface AuthState {
  identifier: string | undefined;
  isLoading: boolean;
  hasApiCredentials: boolean;
  isApiAuthenticated: boolean;
  apiCredentials?: ApiCredentials;
}

async function checkBlueskyAuth() {
  const { getStoredCredentials } = await import("@/lib/bluesky");
  const creds = await getStoredCredentials();
  return creds?.identifier;
}

async function checkApiCredentials() {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/auth/check`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.status === 200;
  } catch (error) {
    console.error("Failed to check API credentials:", error);
    return false;
  }
}

export function useAuth() {
  const [credentials] = useLocalStorage<ApiCredentials>("apiCredentials");
  const [authState, setAuthState] = useState<AuthState>({
    identifier: undefined,
    isLoading: true,
    hasApiCredentials: true,
    isApiAuthenticated: false,
    apiCredentials: credentials,
  });

  useEffect(() => {
    const checkAuth = async () => {
      if (import.meta.env.VITE_STORAGE_MODE === "remote") {
        const [identifier, hasServerCreds, isLocallyAuthenticated] =
          await Promise.all([
            checkBlueskyAuth(),
            checkApiCredentials(),
            credentials ? true : false,
          ]);

        setAuthState({
          identifier,
          isLoading: false,
          hasApiCredentials: hasServerCreds,
          isApiAuthenticated: isLocallyAuthenticated,
          apiCredentials: credentials,
        });
      } else {
        const identifier = await checkBlueskyAuth();
        setAuthState({
          identifier,
          isLoading: false,
          hasApiCredentials: true,
          isApiAuthenticated: true,
        });
      }
    };

    checkAuth();
  }, [credentials]);

  const updateIdentifier = (newIdentifier: string | undefined) => {
    setAuthState((prev) => ({ ...prev, identifier: newIdentifier }));
  };

  const updateApiAuth = (isAuthenticated: boolean) => {
    setAuthState((prev) => ({ ...prev, isApiAuthenticated: isAuthenticated }));
  };

  return {
    ...authState,
    updateIdentifier,
    updateApiAuth,
  };
}
