import { useState, type FormEvent } from "react";

interface Props {
  onSubmit: (symbol: string) => void;
  loading: boolean;
}

export function SymbolForm({ onSubmit, loading }: Props) {
  const [value, setValue] = useState("AAPL");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const symbol = value.trim().toUpperCase();
    if (symbol) onSubmit(symbol);
  }

  return (
    <form className="symbol-form" onSubmit={handleSubmit}>
      <label htmlFor="symbol">Stock symbol</label>
      <input
        id="symbol"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="e.g. AAPL"
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" disabled={loading || value.trim() === ""}>
        {loading ? "Loading…" : "Get data"}
      </button>
    </form>
  );
}
