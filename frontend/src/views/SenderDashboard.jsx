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
        <h2>Sender Summary</h2>
        <p className="muted">Parcels posted: {mine.length}</p>
        <p className="muted">Pending refund debt: {formatEth(relayData.pendingRefund)}</p>
      </article>

      <article className="panel">
        <h2>Open Dispute</h2>
        <p className="muted">Recipient opens dispute on-chain in v2.1; this is useful when sender is recipient in tests/demo accounts.</p>
        <form onSubmit={handleOpenDispute} className="form">
          <label>
            Parcel ID
            <input value={disputeId} onChange={(e) => setDisputeId(e.target.value)} required />
          </label>
          <button disabled={!wallet.isConnected || tx.loading}>Open Dispute</button>
        </form>
      </article>

      <article className="panel span-all">
        <h2>My Parcels</h2>
        <ParcelTable parcels={mine} />
      </article>
    </section>
  );
}
