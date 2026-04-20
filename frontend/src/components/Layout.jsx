import { Link, NavLink } from "react-router-dom";
import { shortAddress } from "../lib/format";
import { useState, useEffect, useMemo } from "react";

const links = [
  { to: "/", label: "Marche" },
  { to: "/sender", label: "Expediteur" },
  { to: "/carrier", label: "Porteur" },
  { to: "/platform", label: "Plateforme" },
  { to: "/audit", label: "Journal" }
];

export default function Layout({ children, wallet, relayData }) {
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
    return relayData.parcels.some(
      (p) => p.carrier?.toLowerCase() === wallet.address.toLowerCase()
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

  const isOwner =
    wallet.address &&
    relayData?.owner &&
    wallet.address.toLowerCase() === relayData.owner.toLowerCase();

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
            Marche
          </NavLink>
          {wallet.isConnected && isExpediteur && (
            <NavLink to="/sender" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Expediteur
            </NavLink>
          )}
          {wallet.isConnected && (
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

        <div className="nav-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            className="theme-switch"
            onClick={toggleDark}
            aria-label="Toggle dark mode"
          />
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
