import { useSyncExternalStore, useCallback } from "react";
import superjson from "superjson";

export const useLocalStorage = <T>(key: string, initialValue?: T) => {
  type StorageWrapper =
    | {
        type: "value";
        value: T;
      }
    | {
        type: "cleared";
      };

  // One-time migration of legacy data
  const migrateData = useCallback(() => {
    const data = localStorage.getItem(key);
    if (!data) return;

    try {
      // Try parsing as superjson first
      const parsed = superjson.parse(data);
      // Skip if already in wrapper format
      if (parsed && typeof parsed === "object" && "type" in parsed) {
        return;
      }
      // Migrate legacy data to wrapper format
      const wrapper: StorageWrapper = {
        type: "value",
        value: parsed as T,
      };
      localStorage.setItem(key, superjson.stringify(wrapper));
    } catch {
      // If can't parse as superjson, try as plain value
      const wrapper: StorageWrapper = {
        type: "value",
        value: data as T,
      };
      localStorage.setItem(key, superjson.stringify(wrapper));
    }
  }, [key]);

  // Run migration once when hook is initialized
  migrateData();

  const getSnapshot = useCallback(() => {
    const data = localStorage.getItem(key);
    if (!data) {
      return initialValue;
    }
    try {
      const parsed = superjson.parse(data) as StorageWrapper;
      if (parsed.type === "cleared") {
        return undefined;
      }
      return parsed.value;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const getServerSnapshot = useCallback(() => initialValue, [initialValue]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const onStorageEvent = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail.key === key) {
          onChange();
        }
      };
      window.addEventListener("storage", onChange);
      window.addEventListener(
        "local-storage-change",
        onStorageEvent as EventListener
      );
      return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(
          "local-storage-change",
          onStorageEvent as EventListener
        );
      };
    },
    [key]
  );

  const data = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setData = useCallback(
    (value: T) => {
      const wrapper: StorageWrapper = {
        type: "value",
        value,
      };
      localStorage.setItem(key, superjson.stringify(wrapper));
      window.dispatchEvent(
        new CustomEvent("local-storage-change", { detail: { key } })
      );
    },
    [key]
  );

  const clearData = useCallback(() => {
    const wrapper: StorageWrapper = {
      type: "cleared",
    };
    localStorage.setItem(key, superjson.stringify(wrapper));
    window.dispatchEvent(
      new CustomEvent("local-storage-change", { detail: { key } })
    );
  }, [key]);

  return [data, setData, clearData] as const;
};
