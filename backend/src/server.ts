import express from "express";
import { fetchIntraday } from "./yahoo.js";
import { aggregateByDay } from "./aggregate.js";

const app = express();
const PORT = 3000;

// Liveness probe.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Layers 2 + 3: fetch a month of 15-minute bars from Yahoo, then group by day.
// (Error handling is Layer 4 — a bad symbol currently 500s.)
app.get("/api/intraday", async (req, res) => {
  const symbol = String(req.query.symbol ?? "").trim().toUpperCase();
  const series = await fetchIntraday(symbol);
  const daily = aggregateByDay(series);
  res.json(daily);
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
