import { useEffect, useMemo, useState } from "react";
import { formatEth } from "../lib/format";
import ParcelTable from "../components/ParcelTable";

export default function PlatformDashboard({ wallet, relay, rep, tx, relayData }) {
  const [topUp, setTopUp] = useState("1");
  const [resolveParcel, setResolveParcel] = useState("");
  const [faultyHop, setFaultyHop] = useState("0");
  const [monthCount, setMonthCount] = useState(0n);
  const [onboardAddress, setOnboardAddress] = useState("");

  const monthIndex = Math.floor(Date.now() / 1000 / (28 * 24 * 60 * 60)); // v2.1 = 4 weeks sync
  const disputed = useMemo(
    () => relayData.parcels.filter((p) => p.status === 5),
    [relayData.parcels]
  );

  const isOwner = wallet.address && relayData.owner && wallet.address.toLowerCase() === relayData.owner.toLowerCase();

  useEffect(() => {
    const loadMonthly = async () => {
      if (!relay || !wallet.address) return;
      try {
        const count = await relay.monthlyDisputeCount(wallet.address, monthIndex);
        setMonthCount(count);
      } catch {
        setMonthCount(0n);
      }
    };
    loadMonthly();
  }, [relay, wallet.address, monthIndex, relayData.parcels]);

  const handleTopUp = async (e) => {
    e.preventDefault();
    if (!relay) return;
    const value = BigInt(Math.floor(Number(topUp) * 1e18));
    const ok = await tx.runTx(relay.topUpReserve({ value }));
    if (ok) {
      await relayData.refresh();
      setTopUp("1");
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!relay) return;
    const ok = await tx.runTx(relay.resolveDispute(Number(resolveParcel), Number(faultyHop)));
    if (ok) {
      setResolveParcel("");
      setFaultyHop("0");
      await relayData.refresh();
    }
  };

  const handleOnboard = async (e) => {
    e.preventDefault();
    if (!rep || !onboardAddress) return;
    const ok = await tx.runTx(rep.onboardCarrier(onboardAddress));
    if (ok) {
        setOnboardAddress("");
        await relayData.refresh();
    }
  };

  if (!isOwner) {
    return (
      <div className="empty-state">
        <span>🔒</span>
        Accès Restreint.
        <p style={{ marginTop: "12px", color: "var(--text-secondary)" }}>
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
          <div className="stat-row" style={{ gridTemplateColumns: "1fr", marginTop: "16px", marginBottom: "0" }}>
            <div className="stat-card" style={{ borderColor: "var(--brand-dim)", background: "var(--brand-soft)" }}>
              <span className="stat-value" style={{ color: "var(--brand)" }}>
                {formatEth(relayData.platformReserve)} ETH
              </span>
              <span className="stat-label">Réserve Accumulée</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <h2>Alimenter la Réserve</h2>
          <p className="muted">Injection manuelle de liquidités pour couvrir les litiges urgents.</p>
          <form className="form" onSubmit={handleTopUp}>
            <label>
              Montant ETH
              <input value={topUp} onChange={(e) => setTopUp(e.target.value)} required />
            </label>
            <button disabled={tx.loading} style={{ marginTop: "8px" }}>
              💰 Dépôt de Fonds
            </button>
          </form>
        </article>

        <article className="panel">
          <h2>Résolution de Litige</h2>
          <div className="info-box" style={{ marginBottom: "16px", background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.2)", borderLeftColor: "var(--accent-red)" }}>
            <span style={{ color: "var(--accent-red)", fontWeight: 600 }}>Dossiers ouverts: {disputed.length}</span>
            <br/>Analysez les Hash photos avant de trancher. Le porteur perdra ses points.
          </div>
          <form className="form" onSubmit={handleResolve}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label>
                ID Colis Litigieux
                <input value={resolveParcel} onChange={(e) => setResolveParcel(e.target.value)} required />
              </label>
              <label>
                Tronçon Fautif (Hop)
                <input value={faultyHop} onChange={(e) => setFaultyHop(e.target.value)} required />
              </label>
            </div>
            <button className="btn-danger" disabled={tx.loading} style={{ marginTop: "8px" }}>
              ⚖️ Rendre le Verdict Arbitral
            </button>
          </form>
        </article>

        <article className="panel">
          <h2>Onboarder un Porteur (Test)</h2>
          <p className="muted">Donne 10 points de départ à un porteur pour lui permettre de commencer à travailler.</p>
          <form className="form" onSubmit={handleOnboard}>
            <label>
              Adresse du porteur
              <input value={onboardAddress} onChange={(e) => setOnboardAddress(e.target.value)} required placeholder="Ex: 0x123..." />
            </label>
            <button disabled={tx.loading} style={{ marginTop: "8px" }}>
              🚀 Créditer 10 Points
            </button>
          </form>
        </article>

        <article className="panel span-all">
          <h2>Colis en Litige Actuellement</h2>
          <ParcelTable parcels={disputed} />
        </article>
      </section>
    </>
  );
}
