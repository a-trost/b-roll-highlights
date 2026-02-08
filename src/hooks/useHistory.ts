import { useState, useRef, useCallback } from "react";

interface UseHistoryOptions {
  maxSize?: number;
  debounceMs?: number;
}

interface UseHistoryReturn<T> {
  state: T;
  setState: (value: T | ((prev: T) => T)) => void;
  push: (value: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useHistory<T>(
  initial: T,
  opts?: UseHistoryOptions
): UseHistoryReturn<T> {
  const maxSize = opts?.maxSize ?? 50;
  const debounceMs = opts?.debounceMs ?? 500;

  const [current, setCurrent] = useState<T>(initial);
  const historyRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the value that will be committed as the "before" snapshot when debounce fires
  const pendingBaseRef = useRef<T | null>(null);

  const setState = useCallback(
    (value: T | ((prev: T) => T)) => {
      setCurrent((prev) => (typeof value === "function" ? (value as (prev: T) => T)(prev) : value));
    },
    []
  );

  const push = useCallback(
    (value: T | ((prev: T) => T)) => {
      setCurrent((prev) => {
        const next = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;

        // Capture the base state before this burst of changes
        if (pendingBaseRef.current === null) {
          pendingBaseRef.current = prev;
        }

        // Reset debounce timer
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
          // Commit the base state to history
          const base = pendingBaseRef.current;
          if (base !== null) {
            historyRef.current = [...historyRef.current.slice(-(maxSize - 1)), base];
          }
          futureRef.current = [];
          pendingBaseRef.current = null;
          timerRef.current = null;
        }, debounceMs);

        return next;
      });
    },
    [maxSize, debounceMs]
  );

  const undo = useCallback(() => {
    // If there's a pending debounce, flush it first
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const base = pendingBaseRef.current;
      if (base !== null) {
        historyRef.current = [...historyRef.current.slice(-(maxSize - 1)), base];
      }
      futureRef.current = [];
      pendingBaseRef.current = null;
    }

    if (historyRef.current.length === 0) return;

    setCurrent((prev) => {
      const history = historyRef.current;
      const previous = history[history.length - 1];
      historyRef.current = history.slice(0, -1);
      futureRef.current = [prev, ...futureRef.current];
      return previous;
    });
  }, [maxSize]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    setCurrent((prev) => {
      const future = futureRef.current;
      const next = future[0];
      futureRef.current = future.slice(1);
      historyRef.current = [...historyRef.current, prev];
      return next;
    });
  }, []);

  const canUndo = historyRef.current.length > 0 || pendingBaseRef.current !== null;
  const canRedo = futureRef.current.length > 0;

  return { state: current, setState, push, undo, redo, canUndo, canRedo };
}
