import { useMemo, useState } from "react";
import { formatEth } from "../lib/format";
import ParcelTable from "../components/ParcelTable";

export default function SenderDashboard({ wallet, relay, tx, relayData }) {
  const [disputeId, setDisputeId] = useState("");
  const [disputeError, setDisputeError] = useState("");

  const mine = useMemo(() => {
    if (!wallet.address) return [];
    return relayData.parcels.filter(
      (p) => p.sender.toLowerCase() === wallet.address.toLowerCase()
    );
  }, [relayData.parcels, wallet.address]);

  const handleOpenDispute = async (e) => {
    e.preventDefault();
    setDisputeError("");

    if (!relay || !disputeId) {
      setDisputeError("Contrat indisponible ou ID manquant.");
      return;
    }

    if (!/^\d+$/.test(disputeId)) {
      setDisputeError("ID invalide. Utilisez un entier positif.");
      return;
    }

    const ok = await tx.runTx(() => relay.openDispute(Number(disputeId)));
    if (ok) {
      setDisputeId("");
      await relayData.refresh();
    } else {
      setDisputeError("Ouverture du litige echouee. Reessayez.");
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
          <p className="muted">
            {mine.length} colis envoyés · dette en attente {formatEth(relayData.pendingRefund)}
          </p>
        </article>

        <article className="panel panel-priority">
          <h2>Ouvrir un Litige</h2>
          <p className="muted">Action de secours si vous gérez les deux comptes.</p>
          <form onSubmit={handleOpenDispute} className="form">
            <label>
              ID du Colis
              <input 
                value={disputeId} 
                onChange={(e) => setDisputeId(e.target.value)} 
                placeholder="Ex: 1"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={12}
                required 
              />
            </label>
            <button className="btn-danger" disabled={!wallet.isConnected || tx.loading}>
              Declarer un litige
            </button>
          </form>
          {disputeError && <div className="error-banner error-banner-inline">{disputeError}</div>}
        </article>

        <article className="panel span-all">
          <h2>Mes Colis</h2>
          {relayData.loading && (
            <p className="muted" role="status">Chargement des colis...</p>
          )}
          {!relayData.loading && mine.length === 0 ? (
            <div className="empty-state">
              Vous n'avez envoyé aucun colis. 
              <br/>
              Rendez-vous sur le <a href="/">Marché</a> pour publier votre première expédition !
            </div>
          ) : (
            <ParcelTable parcels={mine} />
          )}
        </article>
      </section>
    </>
  );
}
