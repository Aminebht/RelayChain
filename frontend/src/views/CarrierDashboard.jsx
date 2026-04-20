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
      if (!wallet.address || !rep || !relay) {
        return;
      }
      const total = await rep.getPoints(wallet.address);
      const free = await relay.pointsAvailable(wallet.address);
      setPoints(total);
      setAvailable(free);
    };
    loadPoints();
  }, [wallet.address, rep, relay, relayData.parcels]);

  const acceptLeg = async (e) => {
    e.preventDefault();
    if (!relay || !acceptId) {
      return;
    }
    const ok = await tx.runTx(relay.acceptLeg(Number(acceptId)));
    if (ok) {
      setAcceptId("");
      await relayData.refresh();
    }
  };

  const initiate = async (e) => {
    e.preventDefault();
    if (!relay || !handoffId || !incoming) {
      return;
    }
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
    if (!relay || !ackId) {
      return;
    }
    const hash = parseHashInput(ackHash);
    const ok = await tx.runTx(relay.acknowledgeHandoff(Number(ackId), hash));
    if (ok) {
      setAckId("");
      setAckHash("");
      await relayData.refresh();
    }
  };

  return (
    <section className="grid two">
      <article className="panel">
        <h2>Carrier Points</h2>
        <p className="muted">Total points: {formatEth(points)}</p>
        <p className="muted">Available points: {formatEth(available)}</p>
        <p className="muted">Locked points: {formatEth(points > available ? points - available : 0n)}</p>
      </article>

      <article className="panel">
        <h2>Accept Leg</h2>
        <form className="form" onSubmit={acceptLeg}>
          <label>
            Parcel ID
            <input value={acceptId} onChange={(e) => setAcceptId(e.target.value)} required />
          </label>
          <button disabled={!wallet.isConnected || tx.loading}>Accept</button>
        </form>
      </article>

      <article className="panel">
        <h2>Initiate Handoff</h2>
        <form className="form" onSubmit={initiate}>
          <label>
            Parcel ID
            <input value={handoffId} onChange={(e) => setHandoffId(e.target.value)} required />
          </label>
          <label>
            Expected incoming
            <input value={incoming} onChange={(e) => setIncoming(e.target.value)} placeholder="0x..." required />
          </label>
          <label>
            Photo hash (or text)
            <input value={initHash} onChange={(e) => setInitHash(e.target.value)} />
          </label>
          <button disabled={!wallet.isConnected || tx.loading}>Initiate</button>
        </form>
      </article>

      <article className="panel">
        <h2>Acknowledge Handoff</h2>
        <form className="form" onSubmit={acknowledge}>
          <label>
            Parcel ID
            <input value={ackId} onChange={(e) => setAckId(e.target.value)} required />
          </label>
          <label>
            Same photo hash
            <input value={ackHash} onChange={(e) => setAckHash(e.target.value)} />
          </label>
          <button disabled={!wallet.isConnected || tx.loading}>Acknowledge</button>
        </form>
      </article>

      <article className="panel span-all">
        <h2>Active Parcels</h2>
        <ParcelTable parcels={inPlay} />
      </article>
    </section>
  );
}
