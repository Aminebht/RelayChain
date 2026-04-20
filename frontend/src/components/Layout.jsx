import { Link, NavLink } from "react-router-dom";
import { shortAddress } from "../lib/format";

const links = [
  { to: "/",         label: "Marché",      icon: "🛒" },
  { to: "/sender",   label: "Expéditeur",  icon: "📦" },
  { to: "/carrier",  label: "Porteur",     icon: "🚀" },
  { to: "/platform", label: "Plateforme",  icon: "🛡️" },
  { to: "/audit",    label: "Journal",     icon: "📋" },
];

export default function Layout({ children, wallet }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <div className="brand-icon">⛓</div>
          <span className="brand-name">
            Relay<span>Chain</span>
          </span>
        </Link>

        <nav className="nav">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button className="connect-btn" onClick={wallet.connect}>
          {wallet.isConnected ? shortAddress(wallet.address) : "Connecter Wallet"}
        </button>
      </header>

      <main className="main">{children}</main>

      {wallet.error && (
        <div className="error-banner">⚠️ {wallet.error}</div>
      )}
    </div>
  );
}
