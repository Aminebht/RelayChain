import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { formatCount, toWei, formatEth, shortAddress } from "../lib/format";
import ParcelTable from "../components/ParcelTable";

async function getBalance(provider, address) {
  if (!provider || !address) return 0n;
  try {
    return await provider.getBalance(address);
  } catch {
    return 0n;
  }
}

export default function Marketplace({ wallet, relay, tx, relayData }) {
  const [recipient, setRecipient] = useState("");
  const [price, setPrice] = useState("0.1");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [payId, setPayId] = useState("");
  const [completeId, setCompleteId] = useState("");
  const [disputeId, setDisputeId] = useState("");
  const [formError, setFormError] = useState("");
  const [payError, setPayError] = useState("");
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
      setFormError("Contrat RelayEscrow indisponible. Vérifiez l'adresse déployée.");
      return;
    }

    const recipientValue = recipient.trim();
    if (!ethers.isAddress(recipientValue)) {
      setFormError("Adresse destinataire invalide. Utilisez une adresse 0x... valide.");
      return;
    }

    const pickupValue = pickupLocation.trim();
    if (!pickupValue) {
      setFormError("Lieu de depart requis.");
      return;
    }

    const dropoffValue = dropoffLocation.trim();
    if (!dropoffValue) {
      setFormError("Lieu de destination requis.");
      return;
    }

    let priceWei;
    try {
      priceWei = toWei(price);
      if (priceWei <= 0n) {
        setFormError("Le prix doit être supérieur à 0.");
        return;
      }
    } catch {
      setFormError("Prix invalide. Exemple attendu : 0.1 ou 1");
      return;
    }

    const ok = await tx.runTx(relay.postParcel(recipientValue, priceWei, pickupValue, dropoffValue));
    if (ok) {
      setRecipient("");
      setPrice("0.1");
      setPickupLocation("");
      setDropoffLocation("");
      await relayData.refresh();
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setPayError("");

    if (!relay || !payId) {
      setPayError("Contrat indisponible ou ID manquant.");
      return;
    }

    if (!/^\d+$/.test(payId)) {
      setPayError("ID invalide. Utilisez un entier positif.");
      return;
    }

    const target = relayData.parcels.find((p) => p.id === Number(payId));
    if (!target) {
      setPayError("Aucun colis trouve pour cet ID.");
      return;
    }

    if (target.status !== 0) {
      setPayError(`Statut invalide. Ce colis est "${["Publie", "Paye", "En transit", "Livre", "En litige", "Rembourse"][target.status]}" et ne peut plus etre paye.`);
      return;
    }

    if (!wallet.address) {
      setPayError("Connectez votre wallet d'abord.");
      return;
    }

    if (target.recipient?.toLowerCase() !== wallet.address.toLowerCase()) {
      setPayError(`Seul le destinataire (${shortAddress(target.recipient)}) peut payer ce colis.`);
      return;
    }

    console.log("Paying for parcel:", {
      id: target.id,
      price: target.price.toString(),
      sender: target.sender,
      recipient: target.recipient,
      status: target.status,
      wallet: wallet.address
    });

    const balance = await getBalance(wallet.provider, wallet.address);
    if (balance < target.price) {
      setPayError(`Solde insuffisant. Vous avez ${formatEth(balance)} mais le colis coûte ${formatEth(target.price)}.`);
      return;
    }

    const ok = await tx.runTx(relay.payForParcel(target.id, { value: target.price }));
    if (ok) {
      setPayId("");
      await relayData.refresh();
    } else {
      setPayError("Paiement echoue. Verifiez le montant et reessayez.");
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    if (!relay || !completeId) return;
    const ok = await tx.runTx(relay.confirmDelivery(Number(completeId)));
    if (ok) {
      setCompleteId("");
      await relayData.refresh();
    }
  };

  const handleDispute = async (e) => {
    e.preventDefault();
    if (!relay || !disputeId) return;
    const ok = await tx.runTx(relay.openDispute(Number(disputeId)));
    if (ok) {
      setDisputeId("");
      await relayData.refresh();
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Marché Public</h1>
        <p>Explorez les colis publiés et sécurisez votre achat sur la blockchain.</p>
      </div>
      <section className="grid two">
        <article className="panel span-all panel-priority">
          <div className="panel-head">
            <h2>Colis Disponibles</h2>
            <div className="meta-note">
              {formatCount(posted.length)} colis en attente d'expédition
            </div>
          </div>
          {posted.length === 0 ? (
            <div className="empty-state">
              Aucun colis en attente. Soyez le premier à expédier un colis sur RelayChain !
            </div>
          ) : (
            <ParcelTable parcels={posted} />
          )}
        </article>

        <article className="panel">
          <h2>Créer un Colis</h2>
          <p className="muted">Initialisez un colis avec son destinataire et sa valeur.</p>
          <form onSubmit={handlePost} className="form">
            <label>
              Lieu de depart (Expediteur)
              <input
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="Ex: Tunis, Lac 2"
                required
              />
            </label>

            <label>
              Lieu de destination (Destinataire)
              <input
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                placeholder="Ex: Ariana"
                required
              />
            </label>

            <label>
              Destinataire
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Ex: 0x123..."
                required
              />
            </label>

            <details className="disclosure">
              <summary>Utiliser un compte local</summary>
              <div className="disclosure-body">
                <button
                  type="button"
                  onClick={loadAccounts}
                  className="link-btn"
                >
                  {loadingAccounts ? "Chargement..." : "Actualiser la liste"}
                </button>
                <label>
                  Comptes locaux
                  <select
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    disabled={!wallet.isConnected || loadingAccounts || !accounts.length}
                  >
                    <option value="">Sélectionner une adresse locale...</option>
                    {accounts.slice(0, 50).map((account) => (
                      <option key={account} value={account}>{account}</option>
                    ))}
                  </select>
                </label>
                {accounts.length > 50 && (
                  <p className="muted disclosure-copy">
                    Liste tronquee a 50 comptes pour eviter la surcharge d'affichage.
                  </p>
                )}
              </div>
            </details>

            <label>
              Prix (ETH)
              <div className="input-with-suffix">
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                <span className="input-suffix">ETH</span>
              </div>
            </label>

            <button disabled={!wallet.isConnected || tx.loading}>
              Publier le colis
            </button>
          </form>
          {formError && <div className="error-banner error-banner-inline">{formError}</div>}
        </article>

        <article className="panel">
          <h2>Actions Destinataire</h2>
          <p className="muted">Sécurisez l'achat ou confirmez la réception finale.</p>
          
          <div className="info-box" style={{ marginBottom: "16px" }}>
            <strong style={{ color: "var(--text-primary)" }}>{posted.length}</strong> colis en attente de paiement.
          </div>

          <form onSubmit={handlePay} className="form" style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid var(--border)"}}>
            <label>
              1. Payer le Colis (Créer la garantie)
              <input 
                value={payId} 
                onChange={(e) => setPayId(e.target.value)} 
                placeholder="Ex: 1" 
              />
            </label>
            <button type="submit" disabled={!wallet.isConnected || tx.loading || !payId} style={{ marginTop: "8px" }}>
              Verrouiller les Fonds
            </button>
          </form>

          <form onSubmit={handleComplete} className="form" style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid var(--border)"}}>
            <label>
              2. Confirmer la Réception (Fin)
              <input 
                value={completeId} 
                onChange={(e) => setCompleteId(e.target.value)} 
                placeholder="Ex: 1" 
              />
            </label>
            <button type="submit" disabled={!wallet.isConnected || tx.loading || !completeId} style={{ marginTop: "8px" }}>
              J'ai bien reçu ce colis
            </button>
          </form>

          <form onSubmit={handleDispute} className="form">
            <label>
              3. Déclarer un Litige (Colis perdu/volé)
              <input 
                value={disputeId} 
                onChange={(e) => setDisputeId(e.target.value)} 
                placeholder="Ex: 1" 
              />
            </label>
            <button type="submit" disabled={!wallet.isConnected || tx.loading || !disputeId} className="btn-danger" style={{ marginTop: "8px" }}>
              ⚠️ Bloquer le Colis
            </button>
          </form>
          {payError && <div className="error-banner error-banner-inline">{payError}</div>}
        </article>

        <article className="panel span-all">
          <div className="panel-head">
            <h2>Historique du Marché</h2>
            <div className="meta-note">
              Réserve Plateforme: {formatEth(relayData.platformReserve)} ETH
            </div>
          </div>
          {relayData.loading && (
            <p className="muted" role="status">Chargement des colis...</p>
          )}
          <ParcelTable parcels={relayData.parcels} />
        </article>
      </section>
    </>
  );
}
