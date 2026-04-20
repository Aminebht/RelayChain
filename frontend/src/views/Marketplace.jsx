import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { toWei, formatEth } from "../lib/format";
import ParcelTable from "../components/ParcelTable";

export default function Marketplace({ wallet, relay, tx, relayData }) {
  const [recipient, setRecipient] = useState("");
  const [price, setPrice] = useState("1");
  const [payId, setPayId] = useState("");
  const [formError, setFormError] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const posted = useMemo(
    () => relayData.parcels.filter((p) => p.status === 0),
    [relayData.parcels]
  );

  const loadAccounts = async () => {
    if (!wallet.provider) {
      setAccounts([]);
      return;
    }

    try {
      setLoadingAccounts(true);
      const list = await wallet.provider.send("eth_accounts", []);
      const unique = Array.from(new Set((list || []).map((a) => a.toLowerCase()))).map(
        (a) => ethers.getAddress(a)
      );
      setAccounts(unique);
    } catch {
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [wallet.provider, wallet.address]);

  const handlePost = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!relay) {
      setFormError("Contrat RelayEscrow indisponible. Verifiez l'adresse deployee.");
      return;
    }

    const recipientValue = recipient.trim();
    if (!ethers.isAddress(recipientValue)) {
      setFormError("Adresse destinataire invalide. Utilisez une adresse 0x... valide.");
      return;
    }

    let priceWei;
    try {
      priceWei = toWei(price);
      if (priceWei <= 0n) {
        setFormError("Le prix doit etre superieur a 0.");
        return;
      }
    } catch {
      setFormError("Prix invalide. Exemple attendu : 0.1 ou 1");
      return;
    }

    const ok = await tx.runTx(relay.postParcel(recipientValue, priceWei));
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
        <h2>Creer un colis</h2>
        <p className="muted">L'expediteur publie un colis avec destinataire et prix.</p>
        <form onSubmit={handlePost} className="form">
          <label>
            Destinataire
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x..." required />
          </label>
          <label>
            Comptes MetaMask detectes
            <select
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={!wallet.isConnected || loadingAccounts || !accounts.length}
            >
              <option value="">Selectionner un compte...</option>
              {accounts.map((account) => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={loadAccounts}
            disabled={!wallet.isConnected || loadingAccounts}
          >
            {loadingAccounts ? "Chargement des comptes..." : "Actualiser les comptes"}
          </button>
          {!accounts.length && wallet.isConnected && (
            <p className="muted">Aucun compte expose. Dans MetaMask, autorisez plusieurs comptes pour ce site.</p>
          )}
          <label>
            Prix (ETH)
            <input value={price} onChange={(e) => setPrice(e.target.value)} required />
          </label>
          <button disabled={!wallet.isConnected || tx.loading}>Publier le colis</button>
        </form>
        {formError && <p className="error-text">{formError}</p>}
      </article>

      <article className="panel">
        <h2>Payer un colis</h2>
        <p className="muted">Le destinataire paie le montant exact de l'escrow.</p>
        <form onSubmit={handlePay} className="form">
          <label>
            ID du colis
            <input value={payId} onChange={(e) => setPayId(e.target.value)} placeholder="1" required />
          </label>
          <button disabled={!wallet.isConnected || tx.loading}>Payer</button>
        </form>
        <p className="muted">Colis publies ouverts : {posted.length}</p>
      </article>

      <article className="panel span-all">
        <h2>Colis</h2>
        <p className="muted">Reserve : {formatEth(relayData.platformReserve)}</p>
        <ParcelTable parcels={relayData.parcels} />
      </article>
    </section>
  );
}
