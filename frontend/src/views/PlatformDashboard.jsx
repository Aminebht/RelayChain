import { useEffect, useMemo, useState } from "react";
import { formatEth } from "../lib/format";

export default function PlatformDashboard({ wallet, relay, tx, relayData }) {
  const [topUp, setTopUp] = useState("1");
  const [resolveParcel, setResolveParcel] = useState("");
  const [faultyHop, setFaultyHop] = useState("0");
  const [monthCount, setMonthCount] = useState(0n);

  const monthIndex = Math.floor(Date.now() / 1000 / (30 * 24 * 60 * 60));
  const disputed = useMemo(
    () => relayData.parcels.filter((p) => p.status === 5),
    [relayData.parcels]
  );

  const isOwner = wallet.address && relayData.owner && wallet.address.toLowerCase() === relayData.owner.toLowerCase();

  useEffect(() => {
    const loadMonthly = async () => {
      if (!relay || !wallet.address) {
        return;
      }
      const count = await relay.monthlyDisputeCount(wallet.address, monthIndex);
      setMonthCount(count);
    };
    loadMonthly();
  }, [relay, wallet.address, monthIndex, relayData.parcels]);

  const handleTopUp = async (e) => {
    e.preventDefault();
    if (!relay) {
      return;
    }
    const value = BigInt(Math.floor(Number(topUp) * 1e18));
    const ok = await tx.runTx(relay.topUpReserve({ value }));
    if (ok) {
      await relayData.refresh();
    }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!relay) {
      return;
    }
    const ok = await tx.runTx(relay.resolveDispute(Number(resolveParcel), Number(faultyHop)));
    if (ok) {
      setResolveParcel("");
      setFaultyHop("0");
      await relayData.refresh();
    }
  };

  if (!isOwner) {
    return (
      <section className="panel">
        <h2>Tableau de bord plateforme</h2>
        <p className="muted">Seul le proprietaire de la plateforme peut executer les actions admin reserve/litige.</p>
      </section>
    );
  }

  return (
    <section className="grid two">
      <article className="panel">
        <h2>Reserve</h2>
        <p className="muted">Reserve actuelle : {formatEth(relayData.platformReserve)}</p>
        <form className="form" onSubmit={handleTopUp}>
          <label>
            Recharger en ETH
            <input value={topUp} onChange={(e) => setTopUp(e.target.value)} required />
          </label>
          <button disabled={tx.loading}>Recharger</button>
        </form>
      </article>

      <article className="panel">
        <h2>Resoudre un litige</h2>
        <form className="form" onSubmit={handleResolve}>
          <label>
            ID du colis
            <input value={resolveParcel} onChange={(e) => setResolveParcel(e.target.value)} required />
          </label>
          <label>
            Troncon fautif
            <input value={faultyHop} onChange={(e) => setFaultyHop(e.target.value)} required />
          </label>
          <button disabled={tx.loading}>Resoudre</button>
        </form>
        <p className="muted">Colis en litige : {disputed.length}</p>
        <p className="muted">Mes litiges mensuels (lecture) : {monthCount.toString()}</p>
      </article>
    </section>
  );
}
