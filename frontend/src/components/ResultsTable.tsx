import type { DailyAggregate } from "../types";

const price = (n: number) =>
  n.toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

export function ResultsTable({ rows }: { rows: DailyAggregate[] }) {
  return (
    <div className="table-scroll">
      <table className="results-table">
        <thead>
          <tr>
            <th>Day</th>
            <th className="num">Low average</th>
            <th className="num">High average</th>
            <th className="num">Volume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.day}>
              <td>{row.day}</td>
              <td className="num">{price(row.lowAverage)}</td>
              <td className="num">{price(row.highAverage)}</td>
              <td className="num">{row.volume.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
