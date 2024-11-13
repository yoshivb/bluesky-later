import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocalStorage } from "./hooks/use-local-storage";
import { ApiCredentials } from "@/lib/api";
import { getStoredCredentials } from "@/lib/bluesky";

interface AuthState {
  identifier: string | undefined;
  isLoading: boolean;
  hasApiCredentials: boolean;
  isApiAuthenticated: boolean;
  apiCredentials?: ApiCredentials;
}

async function checkBlueskyAuth() {
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
  const [apiCredentials] = useLocalStorage<ApiCredentials>("apiCredentials");
  const [authState, setAuthState] = useState<AuthState>({
    identifier: undefined,
    isLoading: true,
    hasApiCredentials: true,
    isApiAuthenticated: false,
    apiCredentials,
  });

  useEffect(() => {
    const checkAuth = async () => {
      if (import.meta.env.VITE_STORAGE_MODE === "remote") {
        const [identifier, hasServerCreds, isLocallyAuthenticated] =
          await Promise.all([
            apiCredentials ? checkBlueskyAuth() : undefined,
            checkApiCredentials(),
            apiCredentials ? true : false,
          ]);

        setAuthState({
          identifier,
          isLoading: false,
          hasApiCredentials: hasServerCreds,
          isApiAuthenticated: isLocallyAuthenticated,
          apiCredentials,
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
  }, [apiCredentials]);

  const updateIdentifier = useCallback((newIdentifier: string | undefined) => {
    setAuthState((prev) => ({ ...prev, identifier: newIdentifier }));
  }, []);

  const updateApiAuth = useCallback((isAuthenticated: boolean) => {
    setAuthState((prev) => ({ ...prev, isApiAuthenticated: isAuthenticated }));
  }, []);

  return useMemo(() => {
    return {
      ...authState,
      updateIdentifier,
      updateApiAuth,
    };
  }, [authState, updateIdentifier, updateApiAuth]);
}
