# Plan — Intraday Stock Data App

Scope: the assessment's stated requirements only. No architecture beyond what the
requirements need.

## Requirements (from the brief)

**Backend** — Node.js/TypeScript API, self-hosted. One endpoint that:
- takes a stock symbol as a parameter
- queries intraday data for the last month from Yahoo Finance
- groups results by day
- returns `[{ "day", "lowAverage", "highAverage", "volume" }]` in that format/precision

**Frontend** — React. Enter a symbol, view the results as a table and a chart.
Basic error handling for invalid symbols or failed requests.

**Deliverables** — repo, `README.md`, `PROMPT_LOG.md`, notes on manual (non-AI) changes.

## Stack

- Backend: Node 20, TypeScript, Express.
- Frontend: React + Vite + TypeScript, Recharts for the chart.
- No database, no auth, no extra services.

## Backend

### Endpoint

`GET /api/intraday?symbol=TSLA` → `200` with the JSON array.

### Upstream call

```
GET https://query1.finance.yahoo.com/v8/finance/chart/{SYMBOL}?interval=15m&range=1mo
Header: User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

The brief's `curl` omits `range`; `range=1mo` is needed to get a month of data.

### Transform

Yahoo returns parallel arrays: `timestamp[]` and
`indicators.quote[0].{high[], low[], volume[]}`, plus `meta.exchangeTimezoneName`.

1. Skip any index where `high`, `low`, or `volume` is null (Yahoo leaves gaps).
2. Bucket by calendar day in the exchange timezone
   (`Intl.DateTimeFormat('en-CA', { timeZone })` → `YYYY-MM-DD`).
3. Per day: `lowAverage` = mean of lows (4 dp), `highAverage` = mean of highs (4 dp),
   `volume` = sum of volumes.
4. Sort ascending by day.

Rounding: `Math.round((v + Number.EPSILON) * 1e4) / 1e4`.

Interpretation calls (ambiguous in the brief — documented in the README):
- "average" = mean of the 15-minute candle values, not the day's min/max.
- `volume` = daily sum (the example magnitude only works as a total).

### Error handling

- Missing/malformed `symbol` (regex `^[A-Za-z0-9.\-]{1,10}$`) → `400` `{ "error": "..." }`.
- Yahoo 404 / "No data found" → `404`.
- Yahoo unreachable / 5xx / unexpected shape → `502`.
- Upstream `fetch` has a timeout so a hanging Yahoo request doesn't hang ours.
- CORS enabled for the frontend origin.

### Files

```
backend/
  src/
    index.ts        # express app + route + error handling
    yahoo.ts        # fetch + parse Yahoo response
    aggregate.ts    # pure: series -> DailyAggregate[]   (the only non-trivial logic)
  package.json
  tsconfig.json
```

Optional: 2–3 unit tests on `aggregate.ts` from a saved sample response — verifies
the exact precision requirement.

## Frontend

Single screen:

- Symbol input + submit. Trim/uppercase; block empty or malformed before calling.
- On submit: fetch `${VITE_API_BASE_URL}/api/intraday?symbol=...`.
- States: loading, error (invalid symbol / request failed — show the backend's
  message), results.
- Results: a table (day, lowAverage, highAverage, volume) **and** a Recharts line
  chart of the low/high averages over the days.

### Files

```
frontend/
  src/
    main.tsx
    App.tsx              # form + state + results
    api.ts               # fetchIntraday(symbol); throws a readable message per status
    components/
      SymbolForm.tsx
      ResultsTable.tsx
      ResultsChart.tsx
```

`VITE_API_BASE_URL` in `.env` (default `http://localhost:3001`).

## Build order

1. Backend: `yahoo.ts` + `aggregate.ts` + route. Verify with `curl` for TSLA.
2. Error paths: bad symbol, upstream failure.
3. Frontend: form → fetch → table.
4. Chart + loading/error states.
5. `README.md` (run steps for both, interpretation notes) + `PROMPT_LOG.md` +
   manual-changes notes.

## AI collaboration

`.claude/skills/prompt-log/` — a small skill that appends entries to
`PROMPT_LOG.md` in the required format (prompt / why / kept–changed–rejected), so
deliverable #3 is captured as we go rather than reconstructed at the end. This
planning session is excluded from the log.

## Not doing (requirements don't call for it)

Caching, retries/backoff, provider abstraction, structured logging, auth,
Docker/CI, configurable interval/range, monorepo workspaces. Mentioned in the
README as possible next steps.
