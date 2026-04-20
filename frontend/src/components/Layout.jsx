import { Link, NavLink } from "react-router-dom";
import { shortAddress } from "../lib/format";

const links = [
  { to: "/", label: "Marche" },
  { to: "/sender", label: "Expediteur" },
  { to: "/carrier", label: "Porteur" },
  { to: "/platform", label: "Plateforme" },
  { to: "/audit", label: "Journal" }
];

export default function Layout({ children, wallet }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">RelayChain v2.1</Link>
        <nav className="nav">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button className="connect-btn" onClick={wallet.connect}>
          {wallet.isConnected ? shortAddress(wallet.address) : "Connecter"}
        </button>
      </header>
      <main className="main">{children}</main>
      {wallet.error && <div className="error-banner">{wallet.error}</div>}
    </div>
  );
}
