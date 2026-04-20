import { useMemo, useState } from "react";
import { formatEth } from "../lib/format";
import ParcelTable from "../components/ParcelTable";

export default function SenderDashboard({ wallet, relay, tx, relayData }) {
  const [disputeId, setDisputeId] = useState("");

  const mine = useMemo(() => {
    if (!wallet.address) {
      return [];
    }
    return relayData.parcels.filter(
      (p) => p.sender.toLowerCase() === wallet.address.toLowerCase()
    );
  }, [relayData.parcels, wallet.address]);

  const handleOpenDispute = async (e) => {
    e.preventDefault();
    if (!relay || !disputeId) {
      return;
    }
    const ok = await tx.runTx(relay.openDispute(Number(disputeId)));
    if (ok) {
      setDisputeId("");
      await relayData.refresh();
    }
  };

  return (
    <section className="grid two">
      <article className="panel">
        <h2>Resume expediteur</h2>
        <p className="muted">Colis publies : {mine.length}</p>
        <p className="muted">Dette de remboursement en attente : {formatEth(relayData.pendingRefund)}</p>
      </article>

      <article className="panel">
        <h2>Ouvrir un litige</h2>
        <p className="muted">En v2.1, le litige est ouvert par le destinataire on-chain ; utile si expediteur et destinataire sont le meme compte en demo.</p>
        <form onSubmit={handleOpenDispute} className="form">
          <label>
            ID du colis
            <input value={disputeId} onChange={(e) => setDisputeId(e.target.value)} required />
          </label>
          <button disabled={!wallet.isConnected || tx.loading}>Ouvrir le litige</button>
        </form>
      </article>

      <article className="panel span-all">
        <h2>Mes colis</h2>
        <ParcelTable parcels={mine} />
      </article>
    </section>
  );
}
