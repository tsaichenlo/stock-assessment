/** One row of the backend's /api/intraday response. Mirrors backend DailyAggregate. */
export interface DailyAggregate {
  day: string; // "YYYY-MM-DD"
  lowAverage: number;
  highAverage: number;
  volume: number;
}
