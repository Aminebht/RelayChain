import { useEffect, useState } from "react";
import { shortAddress } from "../lib/format";

const relayEventNames = [
  "ParcelPosted",
  "ParcelPaid",
  "ParcelAccepted",
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
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!relay || !rep) {
        if (active) {
          setEvents([]);
          setError("");
          setLoading(false);
        }
        return;
      }

      try {
        if (active) {
          setLoading(true);
          setError("");
        }

        const all = [];
        for (const name of relayEventNames) {
          const filterFn = relay.filters[name];
          if (!filterFn) continue;
          const filter = filterFn();
          const logs = await relay.queryFilter(filter, -3000);
          all.push(...normalize(name, logs, "relay"));
        }

        for (const name of repEventNames) {
          const filterFn = rep.filters[name];
          if (!filterFn) continue;
          const filter = filterFn();
          const logs = await rep.queryFilter(filter, -3000);
          all.push(...normalize(name, logs, "reputation"));
        }

        all.sort((a, b) => b.blockNumber - a.blockNumber);
        if (active) {
          setEvents(all.slice(0, 120));
        }
      } catch (e) {
        console.error("Audit log error:", e);
        if (active) {
          setError((e?.shortMessage || e?.message || "Journal temporairement indisponible.").slice(0, 280));
          setEvents([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      active = false;
    };
  }, [relay, rep, reloadKey]);

  const retry = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <>
      <div className="page-header">
        <h1>Journal d'Audit Crypto</h1>
        <p>Preuves cryptographiques extraites directement des events Solidity On-Chain.</p>
      </div>

      <section className="panel panel-edge">
        {loading && (
          <div className="loading-block">
            <span className="spinner spinner-inline"></span>
            Synchronisation avec le Nœud Ethereum...
          </div>
        )}

        {!loading && !events.length && (
          <div className="empty-state">
            {error ? `Echec de chargement: ${error}` : "Aucun événement immuable détecté dans les 3000 derniers blocs."}
            {error && (
              <button type="button" className="link-btn retry-btn" onClick={retry}>
                Reessayer
              </button>
            )}
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="log-list">
            {events.map((evt, idx) => (
              <div className={idx === events.length - 1 ? "log-item log-item-last" : "log-item"} key={evt.id}>
                <div className="log-head">
                  <span className={evt.source === "relay" ? "badge badge-relay" : "badge badge-reputation"}>
                    {evt.source.toUpperCase()}
                  </span>
                  <strong>{evt.name}</strong>
                  <span className="muted">Block {evt.blockNumber}</span>
                  <span className="muted tx-inline">
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
