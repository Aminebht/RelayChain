import { formatEth, shortAddress, statusLabel } from "../lib/format";

export default function ParcelTable({ parcels }) {
  if (!parcels.length) {
    return <p className="muted">Aucun colis pour le moment.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Expediteur</th>
            <th>Destinataire</th>
            <th>Prix</th>
            <th>Statut</th>
            <th>Troncon</th>
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
