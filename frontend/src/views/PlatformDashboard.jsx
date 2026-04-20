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
        <h2>Platform Dashboard</h2>
        <p className="muted">Only platform owner can execute reserve/dispute admin actions.</p>
      </section>
    );
  }

  return (
    <section className="grid two">
      <article className="panel">
        <h2>Reserve</h2>
        <p className="muted">Current reserve: {formatEth(relayData.platformReserve)}</p>
        <form className="form" onSubmit={handleTopUp}>
          <label>
            Top-up ETH
            <input value={topUp} onChange={(e) => setTopUp(e.target.value)} required />
          </label>
          <button disabled={tx.loading}>Top Up</button>
        </form>
      </article>

      <article className="panel">
        <h2>Resolve Dispute</h2>
        <form className="form" onSubmit={handleResolve}>
          <label>
            Parcel ID
            <input value={resolveParcel} onChange={(e) => setResolveParcel(e.target.value)} required />
          </label>
          <label>
            Faulty hop
            <input value={faultyHop} onChange={(e) => setFaultyHop(e.target.value)} required />
          </label>
          <button disabled={tx.loading}>Resolve</button>
        </form>
        <p className="muted">Disputed parcels: {disputed.length}</p>
        <p className="muted">My monthly disputes (read): {monthCount.toString()}</p>
      </article>
    </section>
  );
}
