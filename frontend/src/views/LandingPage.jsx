import { Link } from "react-router-dom";
import { useMemo } from "react";
import { formatEth } from "../lib/format";

export default function LandingPage({ wallet, relayData }) {
  const stats = useMemo(() => {
    const posted = relayData.parcels.filter((p) => p.status === 0).length;
    const inTransit = relayData.parcels.filter((p) => p.status === 2).length;
    const delivered = relayData.parcels.filter((p) => p.status === 3).length;
    return { posted, inTransit, delivered, total: relayData.parcels.length };
  }, [relayData.parcels]);

  return (
    <div className="landing-container">
      <section className="landing-hero">
        <h1 className="landing-title">
          Livraison <span className="accent">décentralisée</span>
        </h1>
        <p className="landing-subtitle">
          Expédiez et recevez des colis avec une garantie blockchain.
          <br />
          Paiement sécurisé, traçabilité totale, sans intermédiaire.
        </p>

        <div className="role-selector">
          <Link to="/marketplace" className="role-card role-primary">
            
            <h3>Je veux expédier</h3>
            <p>Publier un colis et être payé à la livraison</p>
            <span className="role-cta">Expédier un colis →</span>
          </Link>

          <Link to="/recipient" className="role-card role-secondary">
            <h3>Je veux recevoir</h3>
            <p>Suivre ma commande et confirmer la réception</p>
            <span className="role-cta">Recevoir un colis</span>
          </Link>

          <Link to="/carrier" className="role-card role-tertiary">
            <h3>Je veux livrer</h3>
            <p>Devenir porteur et gagner des points</p>
            <span className="role-cta">Devenir livreur</span>
          </Link>
        </div>

        {!wallet.isConnected && (
          <div className="landing-connect-prompt">
            <p className="muted">Connectez votre wallet pour commencer</p>
            <button className="connect-btn-large" onClick={wallet.connect}>
              Connecter MetaMask
            </button>
          </div>
        )}
      </section>

      <section className="landing-stats">
        <div className="stat-item">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Colis total</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.posted}</span>
          <span className="stat-label">En attente</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.inTransit}</span>
          <span className="stat-label">En livraison</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.delivered}</span>
          <span className="stat-label">Livrés</span>
        </div>
        
      </section>

      <section className="landing-how-it-works">
        <h2>Comment ça marche</h2>
        <div className="steps-grid">
          <div className="step">
            <span className="step-number">1</span>
            <h4>L'expéditeur publie</h4>
            <p>Crée un colis avec prix, départ et destination</p>
          </div>
          <div className="step">
            <span className="step-number">2</span>
            <h4>Le destinataire paie</h4>
            <p>Les fonds sont bloqués dans le smart contract</p>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <h4>Le porteur livre</h4>
            <p>Un livreur accepte et transporte le colis</p>
          </div>
          <div className="step">
            <span className="step-number">4</span>
            <h4>La blockchain libère</h4>
            <p>Paiement automatique à la confirmation</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <Link to="/audit" className="audit-link">
          Consulter le journal public d'audit
        </Link>
      </footer>
    </div>
  );
}
