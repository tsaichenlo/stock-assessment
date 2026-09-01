import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { config } from "./config.js";
import {
  fetchIntraday,
  SymbolNotFoundError,
  UpstreamError,
} from "./yahoo.js";
import { aggregateByDay } from "./aggregate.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));

// Tickers are short: letters, digits, and '.'/'-' for classes like BRK-B.
const SYMBOL_RE = /^[A-Za-z0-9.-]{1,10}$/;

// Liveness probe.
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Main endpoint: a month of 15-minute bars from Yahoo, grouped by day.
app.get("/api/intraday", async (req, res) => {
  const symbol = String(req.query.symbol ?? "").trim().toUpperCase();

  if (!SYMBOL_RE.test(symbol)) {
    res.status(400).json({
      error:
        "Provide a 'symbol' query parameter: 1–10 characters, letters/digits/'.'/'-'.",
    });
    return;
  }

  // Express 5 forwards a rejected promise here to the error handler below.
  const series = await fetchIntraday(symbol);
  res.json(aggregateByDay(series));
});

// Unknown route.
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Central error handler. Domain errors -> meaningful status codes;
// anything else is a bug -> 500 and a server-side log.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SymbolNotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }
  if (err instanceof UpstreamError) {
    res.status(502).json({ error: err.message });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
});
