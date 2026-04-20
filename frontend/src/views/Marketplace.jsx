import { useMemo, useState } from "react";
import { toWei, formatEth } from "../lib/format";
import ParcelTable from "../components/ParcelTable";

export default function Marketplace({ wallet, relay, tx, relayData }) {
  const [recipient, setRecipient] = useState("");
  const [price, setPrice] = useState("1");
  const [payId, setPayId] = useState("");

  const posted = useMemo(
    () => relayData.parcels.filter((p) => p.status === 0),
    [relayData.parcels]
  );

  const handlePost = async (e) => {
    e.preventDefault();
    if (!relay) {
      return;
    }
    const ok = await tx.runTx(relay.postParcel(recipient, toWei(price)));
    if (ok) {
      setRecipient("");
      setPrice("1");
      await relayData.refresh();
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!relay || !payId) {
      return;
    }

    const target = relayData.parcels.find((p) => p.id === Number(payId));
    if (!target) {
      return;
    }

    const ok = await tx.runTx(relay.payForParcel(target.id, { value: target.price }));
    if (ok) {
      setPayId("");
      await relayData.refresh();
    }
  };

  return (
    <section className="grid two">
      <article className="panel">
        <h2>Create Parcel</h2>
        <p className="muted">Sender posts a parcel with recipient and price.</p>
        <form onSubmit={handlePost} className="form">
          <label>
            Recipient
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x..." required />
          </label>
          <label>
            Price (ETH)
            <input value={price} onChange={(e) => setPrice(e.target.value)} required />
          </label>
          <button disabled={!wallet.isConnected || tx.loading}>Post Parcel</button>
        </form>
      </article>

      <article className="panel">
        <h2>Pay Parcel</h2>
        <p className="muted">Recipient pays exact escrow amount.</p>
        <form onSubmit={handlePay} className="form">
          <label>
            Parcel ID
            <input value={payId} onChange={(e) => setPayId(e.target.value)} placeholder="1" required />
          </label>
          <button disabled={!wallet.isConnected || tx.loading}>Pay</button>
        </form>
        <p className="muted">Open posted parcels: {posted.length}</p>
      </article>

      <article className="panel span-all">
        <h2>Parcels</h2>
        <p className="muted">Reserve: {formatEth(relayData.platformReserve)}</p>
        <ParcelTable parcels={relayData.parcels} />
      </article>
    </section>
  );
}
