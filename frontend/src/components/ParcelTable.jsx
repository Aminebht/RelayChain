import { formatCount, formatEth, shortAddress, statusLabel } from "../lib/format";

export default function ParcelTable({ parcels }) {
  if (!parcels || !parcels.length) {
    return (
      <div className="empty-state">
        Aucun colis pour le moment.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <div className="table-meta">{formatCount(parcels.length)} elements</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Expéditeur</th>
            <th>Destinataire</th>
            <th>Prix (ETH)</th>
            <th>Statut</th>
            <th>Tronçon</th>
          </tr>
        </thead>
        <tbody>
          {parcels.map((p) => (
            <tr key={p.id}>
              <td>#{p.id}</td>
              <td>{shortAddress(p.sender)}</td>
              <td>{shortAddress(p.recipient)}</td>
              <td>
                {formatEth(p.price)}
              </td>
              <td>
                <span className={`status status-${p.status}`}>
                  {statusLabel(p.status)}
                </span>
              </td>
              <td>Hop {p.currentHop}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
