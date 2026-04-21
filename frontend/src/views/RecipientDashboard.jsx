import { useState, useMemo } from "react";
import { formatEth, shortAddress } from "../lib/format";
import ParcelTable from "../components/ParcelTable";

export default function RecipientDashboard({ wallet, relay, tx, relayData }) {
  const [payId, setPayId] = useState("");
  const [confirmId, setConfirmId] = useState("");
  const [disputeId, setDisputeId] = useState("");
  const [actionError, setActionError] = useState("");

  const myParcels = useMemo(() => {
    if (!wallet.address) return [];
    return relayData.parcels.filter(
      (p) => p.recipient?.toLowerCase() === wallet.address.toLowerCase()
    );
  }, [relayData.parcels, wallet.address]);

  const toPay = useMemo(() => {
    return myParcels.filter((p) => p.status === 0);
  }, [myParcels]);

  const inTransit = useMemo(() => {
    return myParcels.filter((p) => p.status === 2);
  }, [myParcels]);

  const completed = useMemo(() => {
    return myParcels.filter((p) => p.status === 3 || p.status === 5);
  }, [myParcels]);

  const handlePay = async (e) => {
    e.preventDefault();
    setActionError("");

    if (!relay || !payId) {
      setActionError("Contrat indisponible ou ID manquant.");
      return;
    }

    const target = relayData.parcels.find((p) => p.id === Number(payId));
    if (!target) {
      setActionError("Aucun colis trouvé pour cet ID.");
      return;
    }

    if (target.status !== 0) {
      setActionError(`Ce colis n'est pas en attente de paiement.`);
      return;
    }

    if (target.recipient?.toLowerCase() !== wallet.address?.toLowerCase()) {
      setActionError(`Vous n'êtes pas le destinataire de ce colis.`);
      return;
    }

    const ok = await tx.runTx(relay.payForParcel(target.id, { value: target.price }));
    if (ok) {
      setPayId("");
      await relayData.refresh();
    } else {
      setActionError(tx.error || "Paiement échoué. Vérifiez votre solde.");
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setActionError("");

    if (!relay || !confirmId) return;

    const target = relayData.parcels.find((p) => p.id === Number(confirmId));
    if (!target) {
      setActionError("Colis introuvable.");
      return;
    }

    if (target.recipient?.toLowerCase() !== wallet.address?.toLowerCase()) {
      setActionError("Vous ne pouvez confirmer que vos propres colis.");
      return;
    }

    const ok = await tx.runTx(relay.confirmDelivery(Number(confirmId)));
    if (ok) {
      setConfirmId("");
      await relayData.refresh();
    } else {
      setActionError(tx.error || "Confirmation échouée.");
    }
  };

  const handleDispute = async (e) => {
    e.preventDefault();
    setActionError("");

    if (!relay || !disputeId) return;

    const target = relayData.parcels.find((p) => p.id === Number(disputeId));
    if (!target) {
      setActionError("Colis introuvable.");
      return;
    }

    if (target.recipient?.toLowerCase() !== wallet.address?.toLowerCase()) {
      setActionError("Vous ne pouvez ouvrir un litige que sur vos colis.");
      return;
    }

    const ok = await tx.runTx(relay.openDispute(Number(disputeId)));
    if (ok) {
      setDisputeId("");
      await relayData.refresh();
    } else {
      setActionError(tx.error || "Ouverture du litige échouée.");
    }
  };

  if (!wallet.isConnected) {
    return (
      <div className="empty-state">
        <h2>Espace Destinataire</h2>
        <p className="empty-copy">Connectez votre wallet pour voir vos colis.</p>
        <button className="connect-btn" onClick={wallet.connect}>
          Connecter Wallet
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Espace Destinataire</h1>
        <p>Payez vos commandes et confirmez leur réception.</p>
      </div>

      <section className="grid two">
        {toPay.length > 0 && (
          <article className="panel panel-priority">
            <h2>Payer un colis</h2>
            <p className="muted">Vous avez {toPay.length} colis en attente de paiement</p>
            <ParcelTable parcels={toPay} compact />
            <form onSubmit={handlePay} className="form">
              <label>
                ID du colis à payer
                <input
                  value={payId}
                  onChange={(e) => setPayId(e.target.value)}
                  placeholder="Ex: 5"
                />
              </label>
              <button type="submit" disabled={tx.loading || !payId}>
                Verrouiller les fonds
              </button>
            </form>
          </article>
        )}

        {inTransit.length > 0 && (
          <article className="panel panel-success">
            <h2>Confirmer la réception</h2>
            <p className="muted">{inTransit.length} colis en cours de livraison</p>
            <ParcelTable parcels={inTransit} compact />
            <form onSubmit={handleConfirm} className="form">
              <label>
                ID du colis reçu
                <input
                  value={confirmId}
                  onChange={(e) => setConfirmId(e.target.value)}
                  placeholder="Ex: 3"
                />
              </label>
              <button type="submit" disabled={tx.loading || !confirmId}>
                J'ai bien reçu ce colis
              </button>
            </form>
          </article>
        )}

        <article className="panel">
          <h2>Ouvrir un litige</h2>
          <p className="muted">Colis perdu, volé ou endommagé</p>
          <form onSubmit={handleDispute} className="form">
            <label>
              ID du colis litigieux
              <input
                value={disputeId}
                onChange={(e) => setDisputeId(e.target.value)}
                placeholder="Ex: 7"
              />
            </label>
            <button type="submit" disabled={tx.loading || !disputeId} className="btn-danger">
              Déclarer un litige
            </button>
          </form>
        </article>

        <article className="panel span-all">
          <h2>Historique de mes colis</h2>
          {myParcels.length === 0 ? (
            <div className="empty-state">
              <p className="empty-copy">
                Vous n'avez pas encore de colis. Attendez qu'un expéditeur vous envoie un colis à l'adresse:
              </p>
              <code className="address-display">{wallet.address}</code>
            </div>
          ) : (
            <ParcelTable parcels={myParcels} />
          )}
        </article>

        {completed.length > 0 && (
          <article className="panel">
            <h2>Livraisons complétées</h2>
            <p className="muted">{completed.length} colis reçus</p>
          </article>
        )}

        {(actionError || tx.error) && (
          <div className="error-banner error-banner-inline span-all">
            {actionError || tx.error}
          </div>
        )}
      </section>
    </>
  );
}
