import { Link, NavLink } from "react-router-dom";
import { shortAddress, formatEth } from "../lib/format";
import { useState, useEffect, useMemo } from "react";

export default function Layout({ children, wallet, relayData, userBalance, isOwner }) {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("relaychain-theme") === "dark" || false;
  });

  const isExpediteur = useMemo(() => {
    if (!wallet.address || !relayData?.parcels) return false;
    return relayData.parcels.some(
      (p) => p.sender?.toLowerCase() === wallet.address.toLowerCase()
    );
  }, [relayData.parcels, wallet.address]);

  const isPorteur = useMemo(() => {
    if (!wallet.address || !relayData?.parcels) return false;
    const hasDelivered = relayData.parcels.some(
      (p) => p.carrier?.toLowerCase() === wallet.address.toLowerCase()
    );
    return hasDelivered;
  }, [relayData.parcels, wallet.address]);

  const isDestinataire = useMemo(() => {
    if (!wallet.address || !relayData?.parcels) return false;
    return relayData.parcels.some(
      (p) => p.recipient?.toLowerCase() === wallet.address.toLowerCase()
    );
  }, [relayData.parcels, wallet.address]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("relaychain-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("relaychain-theme", "light");
    }
  }, [isDark]);

  const toggleDark = () => setIsDark((d) => !d);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-name">
            Relay<span>Chain</span>
          </span>
        </Link>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Accueil
          </NavLink>
          <NavLink to="/marketplace" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Marché
          </NavLink>
          {wallet.isConnected && isExpediteur && (
            <NavLink to="/sender" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Expéditeur
            </NavLink>
          )}
          {wallet.isConnected && isDestinataire && (
            <NavLink to="/recipient" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Destinataire
            </NavLink>
          )}
          {wallet.isConnected && isPorteur && (
            <NavLink to="/carrier" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Porteur
            </NavLink>
          )}
          {isOwner && (
            <NavLink to="/platform" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Plateforme
            </NavLink>
          )}
          <NavLink to="/audit" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Journal
          </NavLink>
        </nav>

        <div className="nav-actions">
          <button
            className="theme-switch"
            onClick={toggleDark}
            aria-label="Toggle dark mode"
          />
          {wallet.isConnected && isOwner && (
            <span className="badge badge-reserve" title="Reserve de la plateforme">
              Reserve: {formatEth(relayData.platformReserve)}
            </span>
          )}
          {wallet.isConnected && (
            <span className="badge badge-balance" title="Votre solde ETH">
              {formatEth(userBalance.balance)}
            </span>
          )}
          <button className="connect-btn" onClick={wallet.connect}>
            {wallet.isConnected ? shortAddress(wallet.address) : "Connecter Wallet"}
          </button>
        </div>
      </header>

      <main className="main">{children}</main>

      {wallet.error && (
        <div className="error-banner">Erreur: {wallet.error}</div>
      )}
    </div>
  );
}
