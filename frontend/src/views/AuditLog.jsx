import { useEffect, useState } from "react";
import { shortAddress } from "../lib/format";

const relayEventNames = [
  "ParcelPosted",
  "ParcelPaid",
  "LegAccepted",
  "HandoffInitiated",
  "HandoffConfirmed",
  "DeliveryConfirmed",
  "PaymentReleased",
  "DisputeOpened",
  "DisputeResolved",
  "PartialRefund",
  "RefundClaimed",
  "ReserveToppedUp",
  "TimeoutTriggered"
];

const repEventNames = ["PointsAdded", "PointsDeducted", "CarrierOnboarded"];

function normalize(eventName, logs, contractTag) {
  return logs.map((entry) => ({
    id: `${contractTag}-${eventName}-${entry.transactionHash}-${entry.index}`,
    blockNumber: Number(entry.blockNumber),
    tx: entry.transactionHash,
    source: contractTag,
    name: eventName,
    args: entry.args
  }));
}

export default function AuditLog({ relay, rep }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!relay || !rep) {
        setEvents([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const all = [];
        for (const name of relayEventNames) {
          const filter = relay.filters[name]();
          const logs = await relay.queryFilter(filter, -3000);
          all.push(...normalize(name, logs, "relay"));
        }

        for (const name of repEventNames) {
          const filter = rep.filters[name]();
          const logs = await rep.queryFilter(filter, -3000);
          all.push(...normalize(name, logs, "reputation"));
        }

        all.sort((a, b) => b.blockNumber - a.blockNumber);
        setEvents(all.slice(0, 120));
      } catch (e) {
        console.error("Audit log error:", e);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [relay, rep]);

  return (
    <>
      <div className="page-header">
        <h1>Journal d'Audit Crypto</h1>
        <p>Preuves cryptographiques extraites directement des events Solidity On-Chain.</p>
      </div>

      <section className="panel" style={{ padding: "0", overflow: "hidden" }}>
        
        {loading && (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--brand)" }}>
            <span className="spinner" style={{ display: "inline-block", marginRight: "10px" }}></span>
            Synchronisation avec le Nœud Ethereum...
          </div>
        )}

        {!loading && !events.length && (
          <div className="empty-state">
            <span>📡</span>
            Aucun événement immuable détecté dans les 3000 derniers blocs.
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="log-list" style={{ gap: 0 }}>
            {events.map((evt, idx) => (
              <div 
                className="log-item" 
                key={evt.id} 
                style={{ 
                  borderRadius: 0, 
                  borderLeft: "none", borderRight: "none", borderTop: "none",
                  borderBottom: idx === events.length - 1 ? "none" : "1px solid var(--border)",
                  background: "transparent"
                }}
              >
                <div className="log-head">
                  <span className="badge" style={{ 
                    background: evt.source === "relay" ? "rgba(79,156,249,0.1)" : "rgba(139,92,246,0.1)",
                    borderColor: evt.source === "relay" ? "rgba(79,156,249,0.3)" : "rgba(139,92,246,0.3)",
                    color: evt.source === "relay" ? "var(--accent-blue)" : "var(--accent-purple)",
                  }}>
                    {evt.source.toUpperCase()}
                  </span>
                  <strong>{evt.name}</strong>
                  <span className="muted">Block {evt.blockNumber}</span>
                  <span className="muted" style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>
                    Tx: {shortAddress(evt.tx)}
                  </span>
                </div>
                <div className="log-args">
                  {JSON.stringify(evt.args, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
