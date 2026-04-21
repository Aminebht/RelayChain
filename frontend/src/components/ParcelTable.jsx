import { formatCount, formatEth, shortAddress, statusLabel } from "../lib/format";

export default function ParcelTable({ parcels, onAccept, isConnected, isLoading, compact }) {
  if (!parcels || !parcels.length) {
    return (
      <div className="empty-state">
        Aucun colis pour le moment.
      </div>
    );
  }

  if (compact) {
    return (
      <div className="compact-parcel-list">
      {parcels.map((p) => (
        <div key={p.id} className="compact-parcel-item">
          <div className="compact-parcel-header">
            <span className="compact-parcel-id">#{p.id}</span>
            <span className={`status status-${p.status}`}>{statusLabel(p.status)}</span>
          </div>
          <div className="compact-parcel-details">
            <span>{formatEth(p.price)} ETH</span>
            <span>{p.pickupLocation || "-"} → {p.dropoffLocation || "-"}</span>
          </div>
        </div>
      ))}
    </div>
    );
  }

  const canAccept = (p) => {
    return p.status === 1 && (!p.carrier || p.carrier === "0x0000000000000000000000000000000000000000");
  };

  const acceptStatus = (p) => {
    if (p.status === 0) return "En attente paiement";
    if (p.status === 1 && p.carrier && p.carrier !== "0x0000000000000000000000000000000000000000") return "Déjà pris";
    return null;
  };

  return (
    <div className="table-wrap">
      <div className="table-meta">{formatCount(parcels.length)} elements</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Expéditeur</th>
            <th>Destinataire</th>
            <th>Départ</th>
            <th>Destination</th>
            <th>Livreur</th>
            <th>Prix (ETH)</th>
            <th>Statut</th>
            {onAccept && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {parcels.map((p) => (
            <tr key={p.id}>
              <td>#{p.id}</td>
              <td>{shortAddress(p.sender)}</td>
              <td>{shortAddress(p.recipient)}</td>
              <td>{p.pickupLocation || "-"}</td>
              <td>{p.dropoffLocation || "-"}</td>
              <td>{p.carrier ? shortAddress(p.carrier) : "-"}</td>
              <td>
                {formatEth(p.price)}
              </td>
              <td>
                <span className={`status status-${p.status}`}>
                  {statusLabel(p.status)}
                </span>
              </td>
              {onAccept && (
                <td>
                  {canAccept(p) ? (
                    <button
                      className="btn-sm"
                      onClick={() => onAccept(p.id)}
                      disabled={!isConnected || isLoading}
                    >
                      {isLoading ? "..." : "Accepter"}
                    </button>
                  ) : (
                    <span className="muted">{acceptStatus(p) || "-"}</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
