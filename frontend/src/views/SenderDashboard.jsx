import { useMemo, useState } from "react";
import { formatEth } from "../lib/format";
import ParcelTable from "../components/ParcelTable";

export default function SenderDashboard({ wallet, relay, tx, relayData }) {
  const [disputeId, setDisputeId] = useState("");

  const mine = useMemo(() => {
    if (!wallet.address) return [];
    return relayData.parcels.filter(
      (p) => p.sender.toLowerCase() === wallet.address.toLowerCase()
    );
  }, [relayData.parcels, wallet.address]);

  const handleOpenDispute = async (e) => {
    e.preventDefault();
    if (!relay || !disputeId) return;
    const ok = await tx.runTx(relay.openDispute(Number(disputeId)));
    if (ok) {
      setDisputeId("");
      await relayData.refresh();
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Espace Expéditeur</h1>
        <p>Suivez vos envois et gérez les litiges potentiels.</p>
      </div>

      <section className="grid two">
        <article className="panel">
          <h2>Aperçu</h2>
          <div className="stat-row" style={{ gridTemplateColumns: "1fr 1fr", marginTop: "16px", marginBottom: 0 }}>
            <div className="stat-card">
              <span className="stat-value">{mine.length}</span>
              <span className="stat-label">Colis Envoyés</span>
            </div>
            <div className="stat-card">
              <span className="stat-value" style={{ color: "var(--accent-orange)" }}>
                {formatEth(relayData.pendingRefund)}
              </span>
              <span className="stat-label">Dette en Attente</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <h2>Ouvrir un Litige</h2>
          <div className="info-box" style={{ marginBottom: "16px" }}>
            En théorie, c'est au destinataire d'ouvrir le litige sur la blockchain. Utile ici si vous contrôlez les deux comptes.
          </div>
          <form onSubmit={handleOpenDispute} className="form">
            <label>
              ID du Colis
              <input 
                value={disputeId} 
                onChange={(e) => setDisputeId(e.target.value)} 
                placeholder="Ex: 1"
                required 
              />
            </label>
            <button className="btn-danger" disabled={!wallet.isConnected || tx.loading}>
              ⚠️ Déclarer un Litige
            </button>
          </form>
        </article>

        <article className="panel span-all">
          <h2>Mes Colis</h2>
          <ParcelTable parcels={mine} />
        </article>
      </section>
    </>
  );
}
