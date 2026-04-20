import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { parseHashInput, formatEth } from "../lib/format";
import ParcelTable from "../components/ParcelTable";

export default function CarrierDashboard({ wallet, relay, rep, tx, relayData }) {
  const [acceptId, setAcceptId] = useState("");
  const [handoffId, setHandoffId] = useState("");
  const [incoming, setIncoming] = useState("");
  const [initHash, setInitHash] = useState("");
  const [ackId, setAckId] = useState("");
  const [ackHash, setAckHash] = useState("");
  const [points, setPoints] = useState(0n);
  const [available, setAvailable] = useState(0n);
  const [actionError, setActionError] = useState("");

  const inPlay = useMemo(
    () => relayData.parcels.filter((p) => p.status === 1 || p.status === 2 || p.status === 3),
    [relayData.parcels]
  );

  useEffect(() => {
    const loadPoints = async () => {
      if (!wallet.address || !rep || !relay) return;
      const total = await rep.getPoints(wallet.address);
      const free = await relay.pointsAvailable(wallet.address);
      setPoints(total);
      setAvailable(free);
    };
    loadPoints();
  }, [wallet.address, rep, relay, relayData.parcels]);

  const acceptLeg = async (e) => {
    e.preventDefault();
    setActionError("");
    if (!relay || !acceptId) {
      setActionError("Contrat indisponible ou ID manquant.");
      return;
    }
    if (!/^\d+$/.test(acceptId)) {
      setActionError("ID invalide. Utilisez un entier positif.");
      return;
    }

    const ok = await tx.runTx(relay.acceptLeg(Number(acceptId)));
    if (ok) {
      setAcceptId("");
      await relayData.refresh();
    } else {
      setActionError("Impossible d'accepter ce troncon.");
    }
  };

  const initiate = async (e) => {
    e.preventDefault();
    setActionError("");
    if (!relay || !handoffId || !incoming) {
      setActionError("Informations manquantes pour initier le handoff.");
      return;
    }
    if (!/^\d+$/.test(handoffId)) {
      setActionError("ID invalide. Utilisez un entier positif.");
      return;
    }
    if (!ethers.isAddress(incoming)) {
      setActionError("Adresse porteur entrante invalide.");
      return;
    }

    const hash = parseHashInput(initHash);
    const ok = await tx.runTx(relay.initiateHandoff(Number(handoffId), incoming, hash));
    if (ok) {
      setHandoffId("");
      setIncoming("");
      setInitHash("");
      await relayData.refresh();
    } else {
      setActionError("Handoff refuse. Verifiez les valeurs saisies.");
    }
  };

  const acknowledge = async (e) => {
    e.preventDefault();
    setActionError("");
    if (!relay || !ackId) {
      setActionError("Contrat indisponible ou ID manquant.");
      return;
    }
    if (!/^\d+$/.test(ackId)) {
      setActionError("ID invalide. Utilisez un entier positif.");
      return;
    }

    const hash = parseHashInput(ackHash);
    const ok = await tx.runTx(relay.acknowledgeHandoff(Number(ackId), hash));
    if (ok) {
      setAckId("");
      setAckHash("");
      await relayData.refresh();
    } else {
      setActionError("Confirmation de reception echouee.");
    }
  };

  const locked = points > available ? points - available : 0n;

  return (
    <>
      <div className="page-header">
        <h1>Portail Porteur</h1>
        <p>Gérez vos tronçons, accumulez des points et scannez les handoffs.</p>
      </div>

      <section className="grid two">
        <article className="panel span-all">
          <h2>Mes Points de Réputation</h2>
          <p className="muted">
            Total {formatEth(points)} · disponibles {formatEth(available)} · verrouillés {formatEth(locked)}
          </p>
        </article>

        <article className="panel">
          <h2>1. Accepter un Tronçon</h2>
          <p className="muted">Bloquez vos points en garantie pour prendre un colis.</p>
          <form className="form" onSubmit={acceptLeg}>
            <label>
                ID du Colis
                <input value={acceptId} onChange={(e) => setAcceptId(e.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={12} required />
              </label>
            <button disabled={!wallet.isConnected || tx.loading}>
              Accepter la mission
            </button>
          </form>
        </article>

        <article className="panel panel-priority">
          <h2>2. Transmettre le Colis</h2>
          <p className="muted">Vous avez le colis. Scannez le porteur suivant et générez le hash.</p>
          <form className="form" onSubmit={initiate}>
            <div className="form-row form-row-two">
              <label>
                ID du Colis
                    <input value={handoffId} onChange={(e) => setHandoffId(e.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={12} required />
                  </label>
                  <label>
                    Porteur Entrant (0x...)
                    <input value={incoming} onChange={(e) => setIncoming(e.target.value)} required />
                  </label>
            </div>
            <label>
              Hash Photo (Preuve État)
              <input value={initHash} onChange={(e) => setInitHash(e.target.value)} placeholder="0x..." />
            </label>
            <button disabled={!wallet.isConnected || tx.loading}>
              Initier handoff
            </button>
          </form>

          <details className="disclosure">
            <summary>Confirmer une reception</summary>
            <div className="disclosure-body">
              <p className="muted disclosure-copy">Validez le hash pour confirmer la reception.</p>
              <form className="form" onSubmit={acknowledge}>
                <div className="form-row form-row-2-3">
                  <label>
                    ID du Colis
                    <input value={ackId} onChange={(e) => setAckId(e.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={12} required />
                  </label>
                  <label>
                    Même Hash (Validé)
                    <input value={ackHash} onChange={(e) => setAckHash(e.target.value)} placeholder="0x..." />
                  </label>
                </div>
                <button disabled={!wallet.isConnected || tx.loading}>
                  Confirmer la reception
                </button>
              </form>
            </div>
          </details>

          {actionError && <div className="error-banner error-banner-inline">{actionError}</div>}
          {!wallet.isConnected && (
            <div className="error-banner error-banner-inline" role="status">
              Connectez votre wallet pour executer ces actions.
            </div>
          )}
        </article>

        <article className="panel span-all">
          <h2>Colis Actifs en Transit</h2>
          <ParcelTable parcels={inPlay} />
        </article>
      </section>
    </>
  );
}
