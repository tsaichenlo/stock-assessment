# Prompt Log

A record of the AI collaboration behind this project. The work was done as a
guided build with Claude: exploring the upstream API, then implementing the
backend in layers, then the frontend.

Prompts below are lightly edited for readability. Where the exchange was a long
back-and-forth (API exploration, choosing options), it is summarised into one
entry. Throughout, AI output was verified before being kept — see the
"kept / changed / rejected" notes.

---

## 1. Understand the task and how to inspect an unfamiliar API

**Prompt** (with the assessment PDF attached):
> How do you do this, what is the typical flow? First, how do you test API
> endpoints and see their shape? I'm a complete beginner and trying to learn.

**Why:** Before writing code I wanted the end-to-end shape of the task and a
repeatable way to inspect the Yahoo endpoint the brief points at.

**Kept:**
- The workflow: `curl` → pretty-print (`jq` or `python3 -m json.tool`) → walk the
  JSON from the outside in, one key/array at a time.
- The observation that the brief's `curl` (only `interval=15m`) returns a single
  day, so a range parameter is needed.
- The "parallel arrays" insight — Yahoo returns `timestamp[]` and
  `quote[0].{low,high,volume}[]`, not a list of bar objects.

**Changed / rejected:** Nothing. This was orientation, not code.

---

## 2. Don't take the AI's API knowledge on faith

**Prompt:**
> I only know the `curl` from the assessment doc. How did you even get `range`
> and `.chart.result`? It's unintuitive for me.

**Why:** The AI had used a parameter and a JSON path that weren't in the brief. I
wanted the discovery method so I could confirm them myself rather than trust them.

**Kept:**
- The technique of sending a deliberately invalid value (`range=banana`) and
  reading `validRanges` back from the response. I ran this against the live
  endpoint and confirmed `1mo` is valid.
- The method of deriving `.chart.result[0].indicators.quote[0]` by reading the
  pretty-printed response top-down (`{` = pick a key, `[` = pick an index).

**Changed / rejected:** Nothing — both were reproduced directly against the API.

---

## 3. Confirm the transform before committing to it

**Prompt:**
> Okay now what? I printed
> `curl ... | jq '.chart.result[0].indicators.quote[0] | keys'`

**Why:** I had the raw shape and wanted the next concrete step toward the required
output.

**Kept:** The 5-step transform — zip the parallel arrays, skip `null` bars, bucket
by calendar day *in the exchange timezone*, group, then mean(low)/mean(high)/
sum(volume) rounded to 4 dp. Before trusting it, I had the AI run a throwaway
Python version against live AAPL data and checked the numbers matched the
required format and precision.

**Changed / rejected:** Nothing. The Python proof was scratch only — the real
implementation is the Node/TypeScript backend.

---

## 4. Pick the backend stack

**Prompt:** (answering the AI's question) — chose **Node.js + TypeScript** over
C# / .NET 8.

**Why:** Same language as the React frontend, least context-switching, fastest
path to a running endpoint.

---

## 5. Assess the existing half-started work

**Prompt:**
> Look at `~/stock-assessment`.

**Why:** Two folders had been started (`stock-assessment` with a bare Express
skeleton, `stock-intraday-assessment` with only a `PLAN.md`). I wanted an
assessment of both and a recommendation.

**Kept:** Consolidate into one repo — move the `.git` from `backend/` up to the
project root (the brief wants one repo with backend + frontend + docs), move
`PLAN.md` in, add a `.gitignore`, and make the first commit (nothing had been
committed yet).

**Changed:** Of the options offered, chose "merge into `stock-assessment`" rather
than starting a fresh folder.

---

## 6. Implement the fetch and the transform

**Prompt:**
> Implement layer 2 and 3.

**Why:** I understood the fetch and transform from the walkthrough and wanted them
written as real modules.

**Kept:**
- `yahoo.ts` — the only file that knows Yahoo's URL/shape; typed `IntradaySeries`;
  a 10s `AbortSignal.timeout`; typed `SymbolNotFoundError` / `UpstreamError` so
  status-code mapping is trivial later.
- `aggregate.ts` — a pure function (no I/O), `Intl.DateTimeFormat('en-CA', {
  timeZone })` for the day bucket, `Number.EPSILON` rounding to avoid float drift.
- Verified: `GET /api/intraday?symbol=AAPL` output was byte-identical to the
  Python proof from step 3.

**Changed / rejected:** Nothing.

---

## 7. Add error handling and hardening

**Prompt:**
> Go.  (green-lighting the scoped "Layer 4": validation, error mapping, CORS, config)

**Why:** The endpoint worked but a bad symbol returned a 500. The brief asks for
error handling for invalid symbols and failed requests.

**Kept:**
- A single central Express error handler mapping `SymbolNotFoundError` → `404`,
  `UpstreamError` → `502`, everything else → `500` + a server-side log.
- `SYMBOL_RE` guard rejecting missing/malformed input with `400` before any
  network call; a catch-all `404` for unknown routes.
- `cors()` locked to `config.corsOrigin`; `config.ts` reading `PORT` /
  `CORS_ORIGIN` from env with local defaults; `.env.example` committed.
- Verified every path with `curl` (valid, unknown symbol, bad format, missing
  param, unknown route, health).

**Changed / rejected:** Nothing.

---

## 8. Build the frontend

**Prompt:**
> Front end.

**Why:** The backend was functionally complete; time for the UI the brief
requires (enter a symbol, view results, basic error handling).

**Kept:**
- React + Vite + TypeScript scaffold; Recharts line chart of the low/high
  averages; a data table.
- `api.ts` as the only backend-aware module — it forwards the backend's
  `{ error }` text per status and gives a distinct "is the backend running?"
  message on a network failure.
- `App.tsx` as a discriminated-union state machine (`idle | loading | error |
  success`) rather than separate booleans; an empty result array is treated as an
  error.
- `SymbolForm` as a controlled component that trims/uppercases and disables while
  loading.

**Changed (by hand, outside AI):** The Recharts tooltip `formatter` — the AI's
first version typed the argument as `number`, which does not satisfy Recharts 3's
`ValueType`. Replaced with a `typeof value === "number"` guard so the production
build type-checks. Also deleted the Vite starter files (`App.css`, `src/assets/`)
that nothing referenced.

**Rejected:** Nothing else.

---

## 9. Documentation

**Prompt:**
> Write the README and PROMPT_LOG.

**Why:** Deliverables #2 and #3.

**Kept:** `README.md` (setup/run for both packages, env vars, API reference, the
transform explanation, interpretation decisions, manual-changes section, next
steps) and this file. Both were reviewed against the actual code before keeping —
e.g. confirming ports, script names, and the regex in `server.ts`.

---

## Notes on the collaboration

- AI claims about the external API were reproduced against the live endpoint
  before being relied on (steps 2, 3).
- The non-trivial logic (`aggregate.ts`) was validated against real data twice —
  once as a scratch Python proof, once as the real endpoint's output — against
  the exact format and precision in the brief.
- Every backend error path was `curl`-tested rather than assumed.
- One type error in AI-generated frontend code was found and fixed manually
  (step 8).
