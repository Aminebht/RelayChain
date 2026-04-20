import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { formatEth } from "../lib/format";
import ParcelTable from "../components/ParcelTable";

export default function PlatformDashboard({ wallet, relay, rep, tx, relayData }) {
  const [topUp, setTopUp] = useState("1");
  const [resolveParcel, setResolveParcel] = useState("");
  const [faultyHop, setFaultyHop] = useState("0");
  const [onboardAddress, setOnboardAddress] = useState("");
  const [actionError, setActionError] = useState("");

  const disputed = useMemo(
    () => relayData.parcels.filter((p) => p.status === 5),
    [relayData.parcels]
  );

  const isOwner = wallet.address && relayData.owner && wallet.address.toLowerCase() === relayData.owner.toLowerCase();

  const handleTopUp = async (e) => {
    e.preventDefault();
    setActionError("");
    if (!relay) {
      setActionError("Contrat indisponible.");
      return;
    }

    const topUpValue = Number(topUp);
    if (!Number.isFinite(topUpValue) || topUpValue <= 0) {
      setActionError("Montant invalide. Utilisez une valeur positive.");
      return;
    }

    const value = BigInt(Math.floor(Number(topUp) * 1e18));
    const ok = await tx.runTx(relay.topUpReserve({ value }));
    if (ok) {
      await relayData.refresh();
      setTopUp("1");
    } else {
      setActionError("Depot echoue. Verifiez le solde du wallet.");
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    setActionError("");
    if (!relay) {
      setActionError("Contrat indisponible.");
      return;
    }
    if (!/^\d+$/.test(resolveParcel) || !/^\d+$/.test(faultyHop)) {
      setActionError("ID colis et hop doivent etre des entiers positifs.");
      return;
    }

    const ok = await tx.runTx(relay.resolveDispute(Number(resolveParcel), Number(faultyHop)));
    if (ok) {
      setResolveParcel("");
      setFaultyHop("0");
      await relayData.refresh();
    } else {
      setActionError("Resolution echouee. Verifiez les valeurs saisies.");
    }
  };

  const handleOnboard = async (e) => {
    e.preventDefault();
    setActionError("");
    if (!rep || !onboardAddress) {
      setActionError("Adresse porteur manquante.");
      return;
    }
    if (!ethers.isAddress(onboardAddress)) {
      setActionError("Adresse porteur invalide.");
      return;
    }

    const ok = await tx.runTx(rep.onboardCarrier(onboardAddress));
    if (ok) {
      setOnboardAddress("");
      await relayData.refresh();
    } else {
      setActionError("Onboarding echoue. Reessayez.");
    }
  };

  if (!isOwner) {
    return (
      <div className="empty-state">
        Accès Restreint.
        <p className="empty-copy">
          Seul le portefeuille administrateur (Owner) peut accéder aux paramètres de la Plateforme.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Administration Plateforme</h1>
        <p>Dashboard de supervision, gestion du fonds de réserve et résolution des litiges.</p>
      </div>

      <section className="grid two">
        <article className="panel span-all">
          <h2>Fonds de Garantie (Trésorerie)</h2>
          <p className="muted">Réserve actuelle: {formatEth(relayData.platformReserve)} ETH</p>
        </article>

        <article className="panel">
          <h2>Alimenter la Réserve</h2>
          <p className="muted">Injection manuelle de liquidités pour couvrir les litiges urgents.</p>
          <form className="form" onSubmit={handleTopUp}>
              <label>
                Montant ETH
                <input value={topUp} onChange={(e) => setTopUp(e.target.value)} inputMode="decimal" maxLength={24} required />
              </label>
            <button disabled={tx.loading}>
              Depot de fonds
            </button>
          </form>
        </article>

        <article className="panel panel-priority">
          <h2>Résolution de Litige</h2>
          <p className="muted text-danger">Dossiers ouverts: {disputed.length}</p>
          <form className="form" onSubmit={handleResolve}>
            <div className="form-row form-row-two">
              <label>
                ID Colis Litigieux
                <input value={resolveParcel} onChange={(e) => setResolveParcel(e.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={12} required />
              </label>
              <label>
                Tronçon Fautif (Hop)
                <input value={faultyHop} onChange={(e) => setFaultyHop(e.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={6} required />
              </label>
            </div>
            <button className="btn-danger" disabled={tx.loading}>
              Rendre le verdict arbitral
            </button>
          </form>
        </article>

        <article className="panel">
          <h2>Onboarder un Porteur (Test)</h2>
          <details className="disclosure">
            <summary>Afficher l'onboarding manuel</summary>
            <p className="muted disclosure-copy">Donne 10 points de départ à un porteur.</p>
            <form className="form" onSubmit={handleOnboard}>
              <label>
                Adresse du porteur
                <input value={onboardAddress} onChange={(e) => setOnboardAddress(e.target.value)} required placeholder="Ex: 0x123..." />
              </label>
              <button disabled={tx.loading}>
                Crediter 10 points
              </button>
            </form>
          </details>
        </article>

        <article className="panel span-all">
          <h2>Colis en Litige Actuellement</h2>
          {actionError && <div className="error-banner error-banner-inline">{actionError}</div>}
          {relayData.loading && (
            <p className="muted" role="status">Chargement des litiges...</p>
          )}
          <ParcelTable parcels={disputed} />
        </article>
      </section>
    </>
  );
}
