import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { formatCount, toWei, formatEth } from "../lib/format";
import ParcelTable from "../components/ParcelTable";

export default function Marketplace({ wallet, relay, tx, relayData }) {
  const [recipient, setRecipient] = useState("");
  const [price, setPrice] = useState("0.1");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
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
          <h2>Informations</h2>
          <p className="muted">Comment fonctionne RelayChain</p>
          
          <div className="info-box">
            <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "8px" }}>
              {posted.length} colis disponibles
            </strong>
            <p className="muted" style={{ fontSize: "14px", marginBottom: "16px" }}>
              Les destinataires peuvent payer et suivre leurs colis depuis l'espace Destinataire.
            </p>
          </div>

          <div className="info-section">
            <h4 style={{ marginBottom: "8px", marginTop: "16px" }}>Pour les expéditeurs</h4>
            <p className="muted" style={{ fontSize: "14px" }}>
              Créez un colis avec un destinataire et un prix. Recevez 95% du montant à la livraison.
            </p>
          </div>

          <div className="info-section">
            <h4 style={{ marginBottom: "8px", marginTop: "16px" }}>Pour les destinataires</h4>
            <p className="muted" style={{ fontSize: "14px" }}>
              <a href="/recipient" style={{ color: "var(--accent)" }}>Accédez à l'espace Destinataire →</a>
            </p>
          </div>

          <div className="info-section">
            <h4 style={{ marginBottom: "8px", marginTop: "16px" }}>Pour les porteurs</h4>
            <p className="muted" style={{ fontSize: "14px" }}>
              <a href="/carrier" style={{ color: "var(--accent)" }}>Devenez livreur →</a>
            </p>
          </div>
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
