import { useCallback, useEffect, useState } from "react";
import { threadService, type Thread } from "@/services/threadService";
import { useAuthContext } from "@/context/AuthContext";

// ── Hook ─────────────────────────────────────────────────────

export interface UseThreadsReturn {
  threads: Thread[];
  isLoading: boolean;
  /** Create a new thread and return it */
  createThread: (title?: string) => Thread;
  /** Rename a thread */
  renameThread: (id: string, title: string) => void;
  /** Delete a thread */
  deleteThread: (id: string) => void;
  /** Force refresh the list */
  refresh: () => void;
}

export function useThreads(): UseThreadsReturn {
  const { user } = useAuthContext();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) { setThreads([]); setIsLoading(false); return; }
    const localThreads = threadService.listThreads(user.id);
    setThreads(localThreads);
    setIsLoading(false);

    // Fetch from SQLite database
    fetch(`/api/threads?userId=${encodeURIComponent(user.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((remoteThreads) => {
        if (Array.isArray(remoteThreads) && remoteThreads.length > 0) {
          // Merge remote threads
          const mergedMap = new Map<string, Thread>();
          for (const t of remoteThreads) mergedMap.set(t.id, t);
          for (const t of localThreads) {
            if (!mergedMap.has(t.id)) mergedMap.set(t.id, t);
          }
          const merged = Array.from(mergedMap.values()).sort((a, b) =>
            b.updatedAt.localeCompare(a.updatedAt)
          );
          setThreads(merged);
        }
      })
      .catch((err) => console.warn("[useThreads] Failed fetching from SQLite API:", err));
  }, [user]);

  useEffect(() => {
    load();
    // Refresh when another part of the app writes to localStorage (e.g. ChatWindow saves messages)
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("academi_")) load();
    };
    const onCustomUpdate = () => load();

    window.addEventListener("storage", onStorage);
    window.addEventListener("academi_threads_updated", onCustomUpdate);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("academi_threads_updated", onCustomUpdate);
    };
  }, [load]);

  const createThread = useCallback(
    (title?: string): Thread => {
      if (!user) throw new Error("Not authenticated");
      const thread = threadService.createThread(user.id, title);
      setThreads(threadService.listThreads(user.id));
      return thread;
    },
    [user],
  );

  const renameThread = useCallback(
    (id: string, title: string) => {
      if (!user) return;
      threadService.renameThread(id, title);
      setThreads(threadService.listThreads(user.id));
    },
    [user],
  );

  const deleteThread = useCallback(
    (id: string) => {
      if (!user) return;
      threadService.deleteThread(id);
      setThreads(threadService.listThreads(user.id));
    },
    [user],
  );

  const refresh = useCallback(() => {
    if (!user) return;
    setThreads(threadService.listThreads(user.id));
  }, [user]);

  return { threads, isLoading, createThread, renameThread, deleteThread, refresh };
}
