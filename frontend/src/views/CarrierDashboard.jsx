import { useEffect, useMemo, useState } from "react";
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
    if (!relay || !acceptId) return;
    const ok = await tx.runTx(relay.acceptLeg(Number(acceptId)));
    if (ok) {
      setAcceptId("");
      await relayData.refresh();
    }
  };

  const initiate = async (e) => {
    e.preventDefault();
    if (!relay || !handoffId || !incoming) return;
    const hash = parseHashInput(initHash);
    const ok = await tx.runTx(relay.initiateHandoff(Number(handoffId), incoming, hash));
    if (ok) {
      setHandoffId("");
      setIncoming("");
      setInitHash("");
      await relayData.refresh();
    }
  };

  const acknowledge = async (e) => {
    e.preventDefault();
    if (!relay || !ackId) return;
    const hash = parseHashInput(ackHash);
    const ok = await tx.runTx(relay.acknowledgeHandoff(Number(ackId), hash));
    if (ok) {
      setAckId("");
      setAckHash("");
      await relayData.refresh();
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
          <div className="stat-row">
            <div className="stat-card">
              <span className="stat-value" style={{ color: "var(--brand)" }}>{formatEth(points)}</span>
              <span className="stat-label">Points Totaux</span>
            </div>
            <div className="stat-card">
              <span className="stat-value" style={{ color: "var(--accent-blue)" }}>{formatEth(available)}</span>
              <span className="stat-label">Disponibles</span>
            </div>
            <div className="stat-card">
              <span className="stat-value" style={{ color: "var(--text-muted)" }}>{formatEth(locked)}</span>
              <span className="stat-label">Verrouillés (Colis pris)</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <h2>1. Accepter un Tronçon</h2>
          <p className="muted">Bloquez vos points en garantie pour prendre un colis.</p>
          <form className="form" onSubmit={acceptLeg}>
            <label>
              ID du Colis
              <input value={acceptId} onChange={(e) => setAcceptId(e.target.value)} required />
            </label>
            <button disabled={!wallet.isConnected || tx.loading} style={{ marginTop: "8px" }}>
              🤝 Accepter la Mission
            </button>
          </form>
        </article>

        <article className="panel">
          <h2>2. Transmettre le Colis</h2>
          <p className="muted">Vous avez le colis. Scannez le porteur suivant et générez le hash.</p>
          <form className="form" onSubmit={initiate}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label>
                ID du Colis
                <input value={handoffId} onChange={(e) => setHandoffId(e.target.value)} required />
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
            <button disabled={!wallet.isConnected || tx.loading} style={{ marginTop: "8px" }}>
              📷 Initier Handoff
            </button>
          </form>
        </article>

        <article className="panel span-all">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <h2>3. Recevoir le Colis</h2>
              <p className="muted">Confirmez que vous avez bien vérifié l'état physique du colis et validez le transfert en approuvant le Hash ci-contre.</p>
            </div>
            <form className="form" onSubmit={acknowledge}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                <label>
                  ID du Colis
                  <input value={ackId} onChange={(e) => setAckId(e.target.value)} required />
                </label>
                <label>
                  Même Hash (Validé)
                  <input value={ackHash} onChange={(e) => setAckHash(e.target.value)} placeholder="0x..." />
                </label>
              </div>
              <button disabled={!wallet.isConnected || tx.loading} style={{ marginTop: "8px" }}>
                ✅ Confirmer la Réception
              </button>
            </form>
          </div>
        </article>

        <article className="panel span-all">
          <h2>Colis Actifs en Transit</h2>
          <ParcelTable parcels={inPlay} />
        </article>
      </section>
    </>
  );
}
