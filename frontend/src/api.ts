import type { DailyAggregate } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

/**
 * Calls the backend and returns the daily rows.
 * Throws an Error whose message is safe to show the user.
 */
export async function fetchIntraday(symbol: string): Promise<DailyAggregate[]> {
  let res: Response;
  try {
    res = await fetch(
      `${BASE_URL}/api/intraday?symbol=${encodeURIComponent(symbol)}`,
    );
  } catch {
    throw new Error("Could not reach the API. Is the backend running?");
  }

  if (!res.ok) {
    // The backend sends { "error": "..." } for 400/404/502. Prefer that text.
    let message = `Request failed (HTTP ${res.status}).`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* non-JSON body: keep the generic message */
    }
    throw new Error(message);
  }

  return (await res.json()) as DailyAggregate[];
}
