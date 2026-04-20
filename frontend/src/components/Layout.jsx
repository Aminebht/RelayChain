import { Link, NavLink } from "react-router-dom";
import { shortAddress } from "../lib/format";

const links = [
  { to: "/", label: "Marketplace" },
  { to: "/sender", label: "Sender" },
  { to: "/carrier", label: "Carrier" },
  { to: "/platform", label: "Platform" },
  { to: "/audit", label: "Audit" }
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
          {wallet.isConnected ? shortAddress(wallet.address) : "Connect"}
        </button>
      </header>
      <main className="main">{children}</main>
      {wallet.error && <div className="error-banner">{wallet.error}</div>}
    </div>
  );
}
