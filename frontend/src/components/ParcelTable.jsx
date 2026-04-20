import { formatEth, shortAddress, statusLabel } from "../lib/format";

const STATUS_ICONS = ["📌","💳","🚚","⏳","✅","⚠️","↩️"];

export default function ParcelTable({ parcels }) {
  if (!parcels || !parcels.length) {
    return (
      <div className="empty-state">
        <span>📭</span>
        Aucun colis pour le moment.
      </div>
    );
  }

  return (
    <div className="table-wrap">
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
              <td>
                <span className="mono">#{p.id}</span>
              </td>
              <td>
                <span className="mono">{shortAddress(p.sender)}</span>
              </td>
              <td>
                <span className="mono">{shortAddress(p.recipient)}</span>
              </td>
              <td style={{ color: "var(--brand)", fontWeight: 600 }}>
                {formatEth(p.price)}
              </td>
              <td>
                <span className={`status status-${p.status}`}>
                  {STATUS_ICONS[p.status] ?? "?"} {statusLabel(p.status)}
                </span>
              </td>
              <td style={{ color: "var(--text-secondary)" }}>
                Hop {p.currentHop}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
