import { formatEth, shortAddress, statusLabel } from "../lib/format";

export default function ParcelTable({ parcels }) {
  if (!parcels.length) {
    return <p className="muted">No parcels yet.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Sender</th>
            <th>Recipient</th>
            <th>Price</th>
            <th>Status</th>
            <th>Hop</th>
          </tr>
        </thead>
        <tbody>
          {parcels.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{shortAddress(p.sender)}</td>
              <td>{shortAddress(p.recipient)}</td>
              <td>{formatEth(p.price)}</td>
              <td>
                <span className={`status s-${p.status}`}>{statusLabel(p.status)}</span>
              </td>
              <td>{p.currentHop}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
