import { useState } from "react";
import { fetchIntraday } from "./api";
import type { DailyAggregate } from "./types";
import { SymbolForm } from "./components/SymbolForm";
import { ResultsTable } from "./components/ResultsTable";
import { ResultsChart } from "./components/ResultsChart";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success"; symbol: string; rows: DailyAggregate[] };

export default function App() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(symbol: string) {
    setStatus({ kind: "loading" });
    try {
      const rows = await fetchIntraday(symbol);
      if (rows.length === 0) {
        setStatus({
          kind: "error",
          message: `No intraday data returned for ${symbol}.`,
        });
        return;
      }
      setStatus({ kind: "success", symbol, rows });
    } catch (error) {
      setStatus({ kind: "error", message: (error as Error).message });
    }
  }

  return (
    <main className="app">
      <header>
        <h1>Intraday stock data</h1>
        <p className="subtitle">
          Last month of 15-minute bars from Yahoo Finance, grouped by day.
        </p>
      </header>

      <SymbolForm
        onSubmit={handleSubmit}
        loading={status.kind === "loading"}
      />

      {status.kind === "error" && (
        <p className="error" role="alert">
          {status.message}
        </p>
      )}

      {status.kind === "success" && (
        <section className="results">
          <h2>
            {status.symbol} &mdash; {status.rows.length} trading days
          </h2>
          <ResultsChart rows={status.rows} />
          <ResultsTable rows={status.rows} />
        </section>
      )}
    </main>
  );
}
