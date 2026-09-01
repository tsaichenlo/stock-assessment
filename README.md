# Intraday Stock Data

A small full-stack app that fetches the last month of 15-minute intraday bars for a
stock symbol from Yahoo Finance, groups them by trading day, and shows the result
as a chart and a table.

```
React + Vite (5173)  ──►  Node/Express API (3000)  ──►  Yahoo Finance chart API
```

The browser never calls Yahoo directly — the backend owns that call, reshapes the
response, and is the only thing the frontend talks to.

---

## Requirements

- **Node.js 20.19+** (or 22.12+) — needed by Vite 8; the backend uses the built-in
  `fetch` and `AbortSignal.timeout`.
- npm (ships with Node).
- Network access to `query1.finance.yahoo.com`.

## Setup & run (local)

Two terminals. Start the backend first.

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Serves on `http://localhost:3000`. Quick check:

```bash
curl "http://localhost:3000/api/intraday?symbol=AAPL"
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, enter a symbol (e.g. `AAPL`, `MSFT`, `TSLA`), and
submit. Enter an invalid symbol (e.g. `FAKE`) to see the error state.

### Production build

```bash
cd backend  && npm run build && npm start      # tsc -> dist/, then node dist/server.js
cd frontend && npm run build && npm run preview # tsc + vite build -> dist/, static preview
```

## Configuration

All settings have working defaults; no `.env` file is required for local use.
Copy `.env.example` to `.env` in either package to override.

| Package  | Variable             | Default                  | Purpose                                  |
| -------- | -------------------- | ------------------------ | ---------------------------------------- |
| backend  | `PORT`               | `3000`                   | API listen port                         |
| backend  | `CORS_ORIGIN`        | `http://localhost:5173`  | Browser origin allowed to call the API  |
| frontend | `VITE_API_BASE_URL`  | `http://localhost:3000`  | Backend base URL the frontend calls     |

If you change the backend `PORT`, update the frontend `VITE_API_BASE_URL` to match
(and the backend `CORS_ORIGIN` if you move the frontend).

---

## API

### `GET /api/intraday?symbol=<SYMBOL>`

Returns one object per trading day in the last month, oldest first.

```json
[
  { "day": "2026-08-03", "lowAverage": 304.9158, "highAverage": 306.3284, "volume": 60172855 }
]
```

| Field         | Meaning                                                              |
| ------------- | ------------------------------------------------------------------- |
| `day`         | Calendar date in the **exchange's** timezone, `YYYY-MM-DD`         |
| `lowAverage`  | Mean of that day's 15-minute *low* values, 4 decimal places        |
| `highAverage` | Mean of that day's 15-minute *high* values, 4 decimal places       |
| `volume`      | Sum of that day's 15-minute volumes                                |

| Status | When                                                                 |
| ------ | ------------------------------------------------------------------- |
| `200`  | Success                                                            |
| `400`  | Missing / malformed `symbol` (must match `^[A-Za-z0-9.-]{1,10}$`)  |
| `404`  | Yahoo has no data for the symbol (unknown / delisted)              |
| `502`  | Yahoo unreachable, timed out, or returned an unparseable response  |
| `500`  | Unexpected server error                                            |

Error responses are `{ "error": "<human-readable message>" }`.

### `GET /health`

`{ "status": "ok" }` — liveness probe.

---

## How the backend gets and shapes the data

**Upstream call** (`backend/src/yahoo.ts`):

```
GET https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?interval=15m&range=1mo
Header: User-Agent: Mozilla/5.0 ...
```

- `range=1mo` is added — the brief's example `curl` has only `interval=15m`, which
  returns a single day. `1mo` is one of Yahoo's documented `validRanges`.
- The `User-Agent` header is required; Yahoo blocks the default client string.
- A 10-second timeout (`AbortSignal.timeout`) prevents a hung upstream request from
  hanging ours.

Yahoo returns **parallel arrays** — `timestamp[]` plus
`indicators.quote[0].{low[], high[], volume[]}`, all the same length — not a list of
bar objects.

**Transform** (`backend/src/aggregate.ts`, a pure function):

1. Walk the arrays by index, assembling each 15-minute bar.
2. Skip any bar where `low`, `high`, or `volume` is `null` (Yahoo leaves gaps).
3. Bucket each bar by its calendar date **in the exchange timezone**
   (`Intl.DateTimeFormat('en-CA', { timeZone })`). A 09:45 ET bar belongs to that
   trading day even when it is a different date in UTC.
4. Per day: `lowAverage` = mean of lows, `highAverage` = mean of highs,
   `volume` = sum of volumes.
5. Round the averages to 4 dp (`Math.round((v + Number.EPSILON) * 1e4) / 1e4` to
   avoid binary-float drift). Sort ascending by `day`.

### Interpretation decisions (the brief is ambiguous here)

- **"average" = mean of the 15-minute candle values**, not the day's single
  min/max. `lowAverage` averages the `low` of each 15-minute candle.
- **`volume` is the daily sum.** The example value's magnitude (~49M) only makes
  sense as a total, not an average.
- **"last month" = Yahoo's `range=1mo`** (a rolling ~21 trading days), rather than
  a strict calendar-month `period1`/`period2` window.

---

## Project structure

```
stock-assessment/
├── README.md
├── PROMPT_LOG.md            AI prompts used, and what was kept / changed / rejected
├── PLAN.md                  scope and design notes written before implementation
├── backend/
│   └── src/
│       ├── server.ts        Express app: routing, symbol validation, error handler
│       ├── yahoo.ts         Yahoo fetch + typed IntradaySeries + typed error classes
│       ├── aggregate.ts     pure transform: IntradaySeries -> DailyAggregate[]
│       └── config.ts        env-driven settings with local defaults
└── frontend/
    └── src/
        ├── api.ts           fetchIntraday(); maps HTTP status -> readable error
        ├── App.tsx          idle / loading / error / success state machine
        ├── types.ts         DailyAggregate (mirrors the backend row)
        └── components/
            ├── SymbolForm.tsx
            ├── ResultsChart.tsx   Recharts line chart of low/high averages
            └── ResultsTable.tsx
```

**Separation of concerns:** `yahoo.ts` is the only file that knows Yahoo's URL and
response shape; `aggregate.ts` is pure and has no I/O; `server.ts` only does HTTP.
On the frontend, `api.ts` is the only module that knows the backend exists —
components take plain props.

---

## Manual changes made outside of AI

- **`ResultsChart.tsx` tooltip formatter** — the AI's first version typed the
  formatter arg as `number`, which fails against Recharts 3's `ValueType`. Changed
  by hand to a `typeof value === "number"` guard so `npm run build` passes.
- **Backend port** — kept the app on `3000` throughout; `PLAN.md` had mentioned
  `3001`. Adjusted the plan's value rather than the code, since everything was
  already built and tested against `3000`.
- **`package.json` (`backend`)** — set `"type": "module"` and added `build` /
  `start` scripts; the AI-generated `tsconfig.json` already targeted ES modules,
  so the two needed to agree.
- Removed the Vite starter cruft (`App.css`, `src/assets/`) that the scaffold
  created and nothing uses.

---

## Known limitations / next steps

Deliberately out of scope for this MVP (noted here as the likely growth path):

- **Tests.** `aggregate.ts` is pure and should have unit tests asserting the exact
  precision against a saved sample Yahoo response; `yahoo.ts` error mapping should
  be covered with mocked responses.
- **Caching** of Yahoo responses (they change slowly) to cut latency and upstream
  load.
- **Retry with backoff** on transient Yahoo `5xx` / network errors.
- **Provider abstraction** — an interface behind `yahoo.ts` so the data source can
  be swapped without touching the route or the transform.
- **Structured logging** and a request id instead of `console.error`.
- **Containerisation / CI** for reproducible builds and deploys.
- The frontend bundle includes all of Recharts (~560 kB pre-gzip). Fine for an
  MVP; code-splitting or a lighter chart lib would help a real deployment.
