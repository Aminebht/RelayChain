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

  useEffect(() => {
    const run = async () => {
      if (!relay || !rep) {
        setEvents([]);
        return;
      }

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
    };

    run();
  }, [relay, rep]);

  return (
    <section className="panel">
      <h2>Journal d'audit</h2>
      <p className="muted">Historique public immuable de RelayEscrow et CarrierReputation.</p>
      {!events.length && <p className="muted">Aucun evenement trouve pour le moment.</p>}
      <div className="log-list">
        {events.map((evt) => (
          <div className="log-item" key={evt.id}>
            <div className="log-head">
              <strong>{evt.name}</strong>
              <span className="muted">#{evt.blockNumber}</span>
              <span className="muted">{evt.source}</span>
              <span className="muted">{shortAddress(evt.tx)}</span>
            </div>
            <code className="log-args">{JSON.stringify(evt.args, (_, value) => (typeof value === "bigint" ? value.toString() : value), 0)}</code>
          </div>
        ))}
      </div>
    </section>
  );
}
