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
    setThreads(threadService.listThreads(user.id));
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
    // Refresh when another part of the app writes to localStorage (e.g. ChatWindow saves messages)
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("academi_")) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
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
