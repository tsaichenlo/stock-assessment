// Owns all knowledge of the Yahoo Finance chart API.
// If the data provider ever changes, this is the only file that should need to.

const BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

/** The slice of Yahoo's response we actually use. */
export interface IntradaySeries {
  /** IANA name, e.g. "America/New_York" — needed to bucket bars by market day. */
  timeZone: string;
  /** Unix seconds, one entry per 15-minute bar. */
  timestamps: number[];
  low: (number | null)[];
  high: (number | null)[];
  volume: (number | null)[];
}

/** Thrown when Yahoo says the symbol is unknown / delisted. */
export class SymbolNotFoundError extends Error {}
/** Thrown when Yahoo is unreachable or answers with something we can't parse. */
export class UpstreamError extends Error {}

export async function fetchIntraday(symbol: string): Promise<IntradaySeries> {
  const url = `${BASE}/${encodeURIComponent(symbol)}?interval=15m&range=1mo`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      // Don't let a hanging Yahoo request hang ours forever.
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new UpstreamError(`Could not reach Yahoo: ${(err as Error).message}`);
  }

  let body: any;
  try {
    body = await res.json();
  } catch {
    throw new UpstreamError("Yahoo did not return valid JSON");
  }

  // Yahoo signals an unknown symbol with an error object (and HTTP 404).
  const yahooError = body?.chart?.error;
  if (yahooError) {
    if (yahooError.code === "Not Found") {
      throw new SymbolNotFoundError(
        yahooError.description ?? `Unknown symbol '${symbol}'`,
      );
    }
    throw new UpstreamError(yahooError.description ?? "Yahoo returned an error");
  }

  if (!res.ok) {
    throw new UpstreamError(`Yahoo responded with HTTP ${res.status}`);
  }

  const result = body?.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  if (
    !result ||
    !quote ||
    !Array.isArray(result.timestamp) ||
    !Array.isArray(quote.low) ||
    !Array.isArray(quote.high) ||
    !Array.isArray(quote.volume)
  ) {
    throw new UpstreamError("Unexpected response shape from Yahoo");
  }

  return {
    timeZone: result.meta?.exchangeTimezoneName ?? "America/New_York",
    timestamps: result.timestamp,
    low: quote.low,
    high: quote.high,
    volume: quote.volume,
  };
}
