import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Marketplace from "./views/Marketplace";
import SenderDashboard from "./views/SenderDashboard";
import CarrierDashboard from "./views/CarrierDashboard";
import PlatformDashboard from "./views/PlatformDashboard";
import AuditLog from "./views/AuditLog";
import { useWallet } from "./hooks/useWallet";
import { useContracts } from "./hooks/useContracts";
import { useTx } from "./hooks/useTx";
import { useRelayData } from "./hooks/useRelayData";

export default function App() {
  const wallet = useWallet();
  const tx = useTx();
  const { relay, rep } = useContracts(wallet.signer ?? wallet.provider);
  const relayData = useRelayData(relay, wallet.address);

  const sharedProps = {
    wallet,
    relay,
    rep,
    tx,
    relayData
  };

  return (
    <Layout wallet={wallet}>
      <Routes>
        <Route path="/" element={<Marketplace {...sharedProps} />} />
        <Route path="/sender" element={<SenderDashboard {...sharedProps} />} />
        <Route path="/carrier" element={<CarrierDashboard {...sharedProps} />} />
        <Route path="/platform" element={<PlatformDashboard {...sharedProps} />} />
        <Route path="/audit" element={<AuditLog relay={relay} rep={rep} />} />
      </Routes>

      <footer className="tx-footer">
        {tx.loading && <span>Transaction en attente...</span>}
        {!tx.loading && tx.lastHash && <span>Derniere tx : {tx.lastHash}</span>}
        {tx.error && <span className="error-text">{tx.error}</span>}
      </footer>
    </Layout>
  );
}
