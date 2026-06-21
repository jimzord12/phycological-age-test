"use client";

/**
 * Fetches and caches the public questionnaire from GET /api/v1/questionnaire.
 *
 * The result is cached at module scope so the network request is made at most
 * once per full page load, satisfying the "no network after initial load"
 * requirement (I003 scope).
 */

import { useEffect, useRef, useState } from "react";
import type { QuestionnaireResponse } from "@/app/api/v1/questionnaire/route";

type FetchState =
  | { status: "loading" }
  | { status: "ready"; data: QuestionnaireResponse }
  | { status: "error"; message: string };

// Module-level cache — one fetch per full page load, shared across hook instances.
let moduleCache: QuestionnaireResponse | null = null;

export function useQuestionnaire() {
  const [fetchState, setFetchState] = useState<FetchState>(
    moduleCache ? { status: "ready", data: moduleCache } : { status: "loading" },
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (moduleCache) {
      setFetchState({ status: "ready", data: moduleCache });
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetch("/api/v1/questionnaire", { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<QuestionnaireResponse>;
      })
      .then((data) => {
        moduleCache = data;
        setFetchState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        const message = err instanceof Error ? err.message : "Unknown fetch error";
        setFetchState({ status: "error", message });
      });

    return () => {
      ctrl.abort();
    };
  }, []);

  return {
    questionnaire: fetchState.status === "ready" ? fetchState.data : null,
    isLoading: fetchState.status === "loading",
    isError: fetchState.status === "error",
    error: fetchState.status === "error" ? fetchState.message : null,
  };
}
