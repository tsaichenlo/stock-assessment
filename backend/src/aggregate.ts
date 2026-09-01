// Pure transform: raw 15-minute bars -> one row per day, in the shape the
// assessment requires. No I/O here, so it is trivial to unit-test.

import type { IntradaySeries } from "./yahoo.js";

export interface DailyAggregate {
  day: string; // "YYYY-MM-DD" in the exchange's timezone
  lowAverage: number; // mean of the 15-min low values that day, 4 dp
  highAverage: number; // mean of the 15-min high values that day, 4 dp
  volume: number; // sum of the 15-min volumes that day
}

/** Round to 4 decimal places without binary-float drift (e.g. 1.00005 -> 1.0001). */
function round4(value: number): number {
  return Math.round((value + Number.EPSILON) * 1e4) / 1e4;
}

/**
 * Bucket key for a bar: its calendar date in the exchange's local time.
 * A 09:45 ET bar belongs to that trading day even though in UTC it may be the
 * next date. 'en-CA' formats as YYYY-MM-DD.
 */
function marketDay(unixSeconds: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(unixSeconds * 1000));
}

export function aggregateByDay(series: IntradaySeries): DailyAggregate[] {
  const buckets = new Map<
    string,
    { lows: number[]; highs: number[]; volume: number }
  >();

  for (let i = 0; i < series.timestamps.length; i++) {
    const low = series.low[i];
    const high = series.high[i];
    const vol = series.volume[i];

    // Yahoo leaves gaps as null (e.g. a bar with no trades). Skip incomplete bars.
    if (low == null || high == null || vol == null) continue;

    const day = marketDay(series.timestamps[i], series.timeZone);
    let bucket = buckets.get(day);
    if (!bucket) {
      bucket = { lows: [], highs: [], volume: 0 };
      buckets.set(day, bucket);
    }
    bucket.lows.push(low);
    bucket.highs.push(high);
    bucket.volume += vol;
  }

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

  return [...buckets.entries()]
    .map(([day, b]) => ({
      day,
      lowAverage: round4(mean(b.lows)),
      highAverage: round4(mean(b.highs)),
      volume: b.volume,
    }))
    .sort((a, b) => a.day.localeCompare(b.day)); // ascending by date
}
