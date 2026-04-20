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
        <h2>Points porteur</h2>
        <p className="muted">Points totaux : {formatEth(points)}</p>
        <p className="muted">Points disponibles : {formatEth(available)}</p>
        <p className="muted">Points verrouilles : {formatEth(points > available ? points - available : 0n)}</p>
      </article>

      <article className="panel">
        <h2>Accepter un troncon</h2>
        <form className="form" onSubmit={acceptLeg}>
          <label>
            ID du colis
            <input value={acceptId} onChange={(e) => setAcceptId(e.target.value)} required />
          </label>
          <button disabled={!wallet.isConnected || tx.loading}>Accepter</button>
        </form>
      </article>

      <article className="panel">
        <h2>Initier le handoff</h2>
        <form className="form" onSubmit={initiate}>
          <label>
            ID du colis
            <input value={handoffId} onChange={(e) => setHandoffId(e.target.value)} required />
          </label>
          <label>
            Porteur entrant attendu
            <input value={incoming} onChange={(e) => setIncoming(e.target.value)} placeholder="0x..." required />
          </label>
          <label>
            Hash photo (ou texte)
            <input value={initHash} onChange={(e) => setInitHash(e.target.value)} />
          </label>
          <button disabled={!wallet.isConnected || tx.loading}>Initier</button>
        </form>
      </article>

      <article className="panel">
        <h2>Confirmer le handoff</h2>
        <form className="form" onSubmit={acknowledge}>
          <label>
            ID du colis
            <input value={ackId} onChange={(e) => setAckId(e.target.value)} required />
          </label>
          <label>
            Meme hash photo
            <input value={ackHash} onChange={(e) => setAckHash(e.target.value)} />
          </label>
          <button disabled={!wallet.isConnected || tx.loading}>Confirmer</button>
        </form>
      </article>

      <article className="panel span-all">
        <h2>Colis actifs</h2>
        <ParcelTable parcels={inPlay} />
      </article>
    </section>
  );
}
